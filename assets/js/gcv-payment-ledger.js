/* gcv-payment-ledger.js — Admin → Financeiro → Transações (Pix Sicoob, Mercado Pago, Stripe) */
(function () {
  "use strict";

  var GATEWAY = { sicoob: "Pix Sicoob", openpix: "Pix OpenPix", manual: "Pix manual", mercadopago: "Mercado Pago", stripe: "Stripe" };
  var METHOD = { pix: "Pix", card_br: "Cartão nacional", card_intl: "Cartão internacional" };
  var STATUS = {
    PENDING: "Aguardando", PAID: "Pago", REFUNDED: "Estornado", PARTIALLY_REFUNDED: "Estorno parcial",
    CHARGEBACK: "Contestação", FAILED: "Recusado", CANCELLED: "Cancelado",
  };
  var MONEY = {
    IN_GATEWAY: "Na plataforma", AVAILABLE: "Liberado na plataforma", IN_TRANSIT: "A caminho do Sicoob", IN_SICOOB: "No Sicoob",
  };
  var PAYOUT = { PAYOUT_PENDING: "A repassar", PAYOUT_PAID: "Repassado", PAYOUT_REVIEW: "Em revisão", PAYOUT_BLOCKED: "Bloqueado" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function brl(c) {
    if (c == null || c === "") return "—";
    var n = Number(c) / 100;
    return "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function charged(r) {
    var v = (Number(r.charge_minor) || 0) / 100;
    if (String(r.currency).toUpperCase() === "USD") return "US$ " + v.toFixed(2);
    return "R$ " + v.toFixed(2).replace(".", ",");
  }
  function dt(s) {
    if (!s) return "—";
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    return m ? m[3] + "/" + m[2] + " " + m[4] + ":" + m[5] : String(s).slice(0, 10);
  }
  function xhr(method, url, body, cb) {
    var x = new XMLHttpRequest();
    x.open(method, url);
    if (body) x.setRequestHeader("Content-Type", "application/json");
    x.onload = function () {
      var res = {};
      try { res = JSON.parse(x.responseText); } catch (e) { /* noop */ }
      cb(res);
    };
    x.onerror = function () { cb({}); };
    x.send(body ? JSON.stringify(body) : null);
  }
  function opts(map, all) {
    var html = '<option value="">' + all + "</option>";
    Object.keys(map).forEach(function (k) { html += '<option value="' + k + '">' + esc(map[k]) + "</option>"; });
    return html;
  }

  function mount(root, fromDefault, toDefault) {
    if (!root) return;
    root.innerHTML =
      '<h2 style="margin:2rem 0 0.25rem;">Transações de pagamento</h2>' +
      '<p style="margin:0 0 1rem;color:#64748b;font-size:0.9rem;">Cada pagamento recebido: quanto o cliente pagou, a taxa da plataforma, o líquido, onde o dinheiro está e se o guia já recebeu.</p>' +
      '<div class="gcv-dash-field-row" style="flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">De</label><input class="gcv-dash-input" id="ptx-from" type="date" value="' + esc(fromDefault) + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Até</label><input class="gcv-dash-input" id="ptx-to" type="date" value="' + esc(toDefault) + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Plataforma</label><select class="gcv-dash-select" id="ptx-gateway">' + opts(GATEWAY, "Todas") + "</select></div>" +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Status</label><select class="gcv-dash-select" id="ptx-status">' + opts(STATUS, "Todos") + "</select></div>" +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Dinheiro</label><select class="gcv-dash-select" id="ptx-money">' + opts(MONEY, "Qualquer") + "</select></div>" +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Busca</label><input class="gcv-dash-input" id="ptx-q" placeholder="Reserva, cliente, ID" /></div>' +
      '<div class="gcv-dash-field" style="align-self:flex-end;"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="ptx-apply">Filtrar</button></div>' +
      '<div class="gcv-dash-field" style="align-self:flex-end;"><a class="gcv-dash-btn" id="ptx-csv" href="#">Exportar CSV</a></div>' +
      "</div>" +
      '<div id="ptx-stats"></div>' +
      '<div id="ptx-mp" style="margin:1rem 0;"></div>' +
      '<div id="ptx-table"></div>' +
      '<div id="ptx-settlements"></div>';

    function qs() {
      var p = new URLSearchParams();
      p.set("from", document.getElementById("ptx-from").value || "");
      p.set("to", document.getElementById("ptx-to").value || "");
      var g = document.getElementById("ptx-gateway").value;
      var s = document.getElementById("ptx-status").value;
      var m = document.getElementById("ptx-money").value;
      var q = document.getElementById("ptx-q").value.trim();
      if (g) p.set("gateway", g);
      if (s) p.set("status", s);
      if (m) p.set("settlement_status", m);
      if (q) p.set("q", q);
      return p.toString();
    }

    function stat(label, value, hint) {
      return '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">' + esc(label) + '</div><div class="gcv-dash-stat__value">' + value + "</div>" +
        (hint ? '<div style="font-size:0.75rem;color:#64748b;margin-top:2px;">' + esc(hint) + "</div>" : "") + "</div>";
    }

    function renderMp(mp) {
      var box = document.getElementById("ptx-mp");
      var cents = (mp && mp.cents) || 0;
      if (!cents) { box.innerHTML = ""; return; }
      box.innerHTML =
        '<div class="gcv-dash-alert gcv-dash-alert--info" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">' +
        "<span><strong>" + brl(cents) + "</strong> liberado no Mercado Pago (" + (mp.count || 0) + " venda(s)) aguardando ir para o Sicoob. " +
        "Quando a transferência chega no Sicoob o sistema reconhece sozinho; se não reconhecer, registre aqui.</span>" +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" id="ptx-mp-register">Registrar transferência</button>' +
        "</div>" +
        '<div id="ptx-mp-form" hidden style="margin-top:0.75rem;padding:1rem;border:1px solid #e2e8f0;border-radius:8px;">' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor que chegou no Sicoob (R$)</label><input class="gcv-dash-input" id="ptx-mp-amount" type="number" step="0.01" value="' + (cents / 100).toFixed(2) + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Data</label><input class="gcv-dash-input" id="ptx-mp-date" type="date" value="' + new Date().toISOString().slice(0, 10) + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">EndToEndId / comprovante</label><input class="gcv-dash-input" id="ptx-mp-ref" /></div>' +
        "</div>" +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="ptx-mp-save">Salvar</button>' +
        '<span id="ptx-mp-msg" style="margin-left:0.75rem;"></span></div>';
      document.getElementById("ptx-mp-register").onclick = function () {
        document.getElementById("ptx-mp-form").hidden = false;
      };
      document.getElementById("ptx-mp-save").onclick = function () {
        var msg = document.getElementById("ptx-mp-msg");
        msg.textContent = "Salvando…";
        xhr("POST", "/api/admin/payment-ledger.php", {
          action: "register_mp_transfer",
          amount: document.getElementById("ptx-mp-amount").value,
          arrived_at: document.getElementById("ptx-mp-date").value + " 12:00:00",
          ref: document.getElementById("ptx-mp-ref").value.trim(),
        }, function (r) {
          if (!r || !r.ok) { msg.textContent = (r && r.error) || "Erro ao salvar"; return; }
          msg.textContent = "Registrado: " + (r.data.attached || 0) + " venda(s) ligadas.";
          refresh();
        });
      };
    }

    function renderTable(rows) {
      var el = document.getElementById("ptx-table");
      if (!rows.length) {
        el.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma transação no período.</div>';
        return;
      }
      el.innerHTML =
        '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr>' +
        "<th>Data</th><th>Reserva</th><th>Cliente / passeio</th><th>Forma</th><th>Cobrado</th><th>Pix base</th><th>Acréscimo</th>" +
        "<th>Taxa</th><th>Líquido</th><th>Status</th><th>Dinheiro</th><th>Guia</th></tr></thead><tbody>" +
        rows.map(function (r) {
          var inst = Number(r.installments) > 1 ? " · " + r.installments + "x" : "";
          var feeEst = r.fee_source === "estimate" && r.fee_cents != null ? ' <span title="Estimativa — taxa real ainda não informada pela plataforma">≈</span>' : "";
          var review = Number(r.price_review) === 1 ? ' <span class="gcv-badge gcv-badge--warning" title="Preço não conferido no servidor">revisar preço</span>' : "";
          var guide = r.guide_name
            ? esc(r.guide_name) + "<br><small>" + brl(r.guide_amount_cents) + " · " + esc(PAYOUT[r.payout_status] || r.payout_status || "") + (r.guide_paid_at ? " " + dt(r.guide_paid_at) : "") + "</small>"
            : "—";
          return "<tr>" +
            "<td>" + dt(r.paid_at || r.created_at) + "</td>" +
            "<td><strong>" + esc(r.reservation_id) + "</strong>" + review + "</td>" +
            "<td>" + esc(r.tourist_name || "—") + "<br><small>" + esc(r.excursion_title || "") + "</small></td>" +
            "<td>" + esc(GATEWAY[r.gateway] || r.gateway) + "<br><small>" + esc(METHOD[r.method] || r.method) + inst + "</small></td>" +
            "<td>" + charged(r) + (r.fx_rate ? "<br><small>câmbio " + Number(r.fx_rate).toFixed(4) + "</small>" : "") + "</td>" +
            "<td>" + brl(r.base_cents) + "</td>" +
            "<td>" + brl(r.surcharge_cents) + "</td>" +
            "<td>" + brl(r.fee_cents) + feeEst + "</td>" +
            "<td><strong>" + brl(r.net_cents) + "</strong></td>" +
            "<td>" + esc(STATUS[r.status] || r.status) + (Number(r.refunded_cents) > 0 ? "<br><small>−" + brl(r.refunded_cents) + "</small>" : "") + "</td>" +
            "<td>" + esc(MONEY[r.settlement_status] || r.settlement_status) +
              (r.available_at && r.settlement_status !== "IN_SICOOB" ? "<br><small>libera " + dt(r.available_at) + "</small>" : "") +
              (r.settled_at && r.settlement_status === "IN_SICOOB" ? "<br><small>" + dt(r.settled_at) + "</small>" : "") + "</td>" +
            "<td>" + guide + "</td>" +
            "</tr>";
        }).join("") +
        "</tbody></table></div>";
    }

    function renderSettlements(list) {
      var el = document.getElementById("ptx-settlements");
      if (!list || !list.length) { el.innerHTML = ""; return; }
      var st = { PENDING: "Agendado", IN_TRANSIT: "A caminho", PAID: "Chegou", FAILED: "Falhou", CANCELLED: "Cancelado" };
      el.innerHTML = '<h3 style="margin:1.5rem 0 0.5rem;">Repasses das plataformas para o Sicoob</h3>' +
        '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr><th>Plataforma</th><th>Valor</th><th>Status</th><th>Previsto</th><th>Chegou</th><th>Ref.</th></tr></thead><tbody>' +
        list.map(function (s) {
          return "<tr><td>" + esc(GATEWAY[s.gateway] || s.gateway) + "</td><td>" + brl(s.amount_cents) + "</td><td>" + esc(st[s.status] || s.status) +
            "</td><td>" + esc(s.expected_at || "—") + "</td><td>" + dt(s.arrived_at) + "</td><td><small>" + esc(s.external_id) + "</small></td></tr>";
        }).join("") + "</tbody></table></div>";
    }

    function refresh() {
      var q = qs();
      document.getElementById("ptx-csv").href = "/api/admin/payment-ledger.php?export=csv&" + q;
      document.getElementById("ptx-stats").innerHTML = "Carregando…";
      xhr("GET", "/api/admin/payment-ledger.php?" + q, null, function (res) {
        if (!res || !res.ok) {
          document.getElementById("ptx-stats").innerHTML = '<div class="gcv-dash-alert">Erro ao carregar transações.</div>';
          return;
        }
        var d = res.data || {};
        var t = (d.summary && d.summary.totals) || {};
        var by = (d.summary && d.summary.by_gateway) || {};
        var gp = (d.summary && d.summary.guide_payouts) || {};
        var gwLine = Object.keys(by).map(function (g) {
          return (GATEWAY[g] || g) + ": " + brl(by[g].net_cents);
        }).join(" · ");
        document.getElementById("ptx-stats").innerHTML =
          '<div class="gcv-dash-stats">' +
          stat("Recebido (bruto)", brl(t.gross_cents || 0), (t.count || 0) + " pagamento(s)") +
          stat("Acréscimos de cartão", brl(t.surcharge_cents || 0), "o que os clientes pagaram a mais que o Pix") +
          stat("Taxas das plataformas", brl(t.fee_cents || 0), t.gross_cents ? ((t.fee_cents / t.gross_cents) * 100).toFixed(1).replace(".", ",") + "% do bruto" : "") +
          stat("Líquido", brl(t.net_cents || 0), gwLine) +
          stat("Ainda nas plataformas", brl(t.pending_settlement_cents || 0), "a caminho do Sicoob") +
          stat("Estornos", brl(t.refunded_cents || 0), "") +
          stat("Guias — já repassado", brl(gp.paid_cents || 0), "") +
          stat("Guias — a repassar", brl(gp.pending_cents || 0), "") +
          "</div>";
        renderMp(d.mp_available);
        renderTable(d.rows || []);
        renderSettlements(d.settlements || []);
      });
    }

    document.getElementById("ptx-apply").onclick = refresh;
    refresh();
  }

  window.GcvPaymentLedger = { mount: mount };
})();

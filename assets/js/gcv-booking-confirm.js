/* gcv-booking-confirm.js — Reservas para o guia confirmar (cartão só é cobrado com quórum + guia) */
(function () {
  "use strict";

  var LIFE = { confirmada: "Quórum atingido", em_formacao: "Em formação (sem quórum)", cancelada: "Cancelada", concluida: "Concluída" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dt(s) {
    var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    return m ? m[3] + "/" + m[2] + " " + m[4] + "h" + m[5] : "—";
  }
  function xhr(method, url, body, cb) {
    var x = new XMLHttpRequest();
    x.open(method, url);
    if (body) x.setRequestHeader("Content-Type", "application/json");
    x.onload = function () {
      var r = {};
      try { r = JSON.parse(x.responseText); } catch (e) { /* noop */ }
      cb(r);
    };
    x.onerror = function () { cb({}); };
    x.send(body ? JSON.stringify(body) : null);
  }

  /**
   * @param {HTMLElement} root
   * @param {"mine"|"all"} scope  all = admin (todos os guias, confirma em nome do guia)
   */
  function mount(root, scope) {
    if (!root) return;
    var all = scope === "all";
    root.innerHTML =
      (all ? '<h2 style="margin:2rem 0 0.25rem;">Reservas para confirmar</h2>' : "") +
      '<p style="margin:0 0 1rem;color:#64748b;font-size:0.9rem;">' +
      (all
        ? "Reservas pagas com cartão só são cobradas quando o passeio atinge o quórum e o guia confirma. Você pode confirmar em nome do guia."
        : "Confirme cada reserva dos seus passeios. Reservas no cartão só são cobradas depois da sua confirmação e do quórum atingido. Sem confirmação até 12h antes da saída, o cartão do cliente é liberado e nada é cobrado.") +
      "</p>" +
      '<div id="gbc-list">Carregando…</div>';

    function load() {
      xhr("GET", "/api/guides/booking-confirmations.php" + (all ? "?scope=all" : ""), null, function (res) {
        var el = root.querySelector("#gbc-list");
        if (!res || !res.ok) {
          el.innerHTML = '<div class="gcv-dash-alert">Erro ao carregar reservas.</div>';
          return;
        }
        var rows = (res.data && res.data.rows) || [];
        if (!rows.length) {
          el.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma reserva aguardando confirmação.</div>';
          return;
        }
        el.innerHTML =
          '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr>' +
          "<th>Saída</th><th>Passeio</th><th>Cliente</th><th>Pessoas</th><th>Pagamento</th><th>Grupo</th>" + (all ? "<th>Guia</th>" : "") + "<th></th></tr></thead><tbody>" +
          rows.map(function (r) {
            var pay = r.payment_kind === "card" ? "Cartão (reservado)" : "Pix (pago)";
            var action = r.guide_confirmed_at
              ? '<span class="gcv-badge gcv-badge--success">Confirmada</span>'
              : '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--primary" data-gbc-confirm="' + esc(r.id) + '">Confirmar</button>';
            return "<tr><td>" + dt(r.starts_at) + "</td><td>" + esc(r.title || "—") + "<br><small>" + esc(r.reservation_id) + "</small></td>" +
              "<td>" + esc(r.tourist_name || "—") + (r.tourist_phone ? "<br><small>" + esc(r.tourist_phone) + "</small>" : "") + "</td>" +
              "<td>" + esc(r.people) + "</td><td>" + pay + "</td><td>" + esc(LIFE[r.lifecycle] || (r.lifecycle ? r.lifecycle : "Privativo")) + "</td>" +
              (all ? "<td>" + esc(r.guide_name || "—") + "</td>" : "") + "<td>" + action + "</td></tr>";
          }).join("") +
          "</tbody></table></div>";
        el.querySelectorAll("[data-gbc-confirm]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (all && !window.confirm("Confirmar esta reserva em nome do guia?")) return;
            btn.disabled = true;
            btn.textContent = "Confirmando…";
            xhr("POST", "/api/guides/booking-confirmations.php", { trip_id: parseInt(btn.getAttribute("data-gbc-confirm"), 10) }, function (r) {
              if (!r || !r.ok) {
                btn.disabled = false;
                btn.textContent = "Confirmar";
                window.alert((r && r.error) || "Não foi possível confirmar.");
                return;
              }
              load();
            });
          });
        });
      });
    }
    load();
  }

  window.GcvBookingConfirm = { mount: mount };
})();

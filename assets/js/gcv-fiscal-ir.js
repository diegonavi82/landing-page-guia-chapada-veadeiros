/* gcv-fiscal-ir.js — Informe de rendimentos (admin e guia) */
(function (global) {
  "use strict";

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function brl(cents) {
    var n = Number(cents) || 0;
    var neg = n < 0;
    var abs = Math.abs(n) / 100;
    var text = abs.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-R$ " : "R$ ") + text;
  }

  function when(value) {
    var m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m) return "—";
    return m[3] + "/" + m[2] + "/" + m[1] + (m[4] ? " " + m[4] + ":" + m[5] : "");
  }

  function xhr(method, url, body, cb) {
    var x = new XMLHttpRequest();
    x.open(method, url);
    if (body) x.setRequestHeader("Content-Type", "application/json");
    x.onload = function () {
      var res = {};
      try { res = JSON.parse(x.responseText); } catch (e) { res = { ok: false, error: "Resposta inválida" }; }
      cb(res);
    };
    x.onerror = function () { cb({ ok: false, error: "Falha de rede" }); };
    x.send(body ? JSON.stringify(body) : null);
  }

  function moneyClass(cents) {
    return (Number(cents) || 0) < 0 ? "gcv-ir-neg" : "";
  }

  function openPrint(title, bodyHtml) {
    var win = global.open("", "_blank", "noopener,width=900,height=720");
    if (!win) return;
    win.document.write(
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>" + esc(title) + "</title>" +
      "<style>body{font-family:Georgia,serif;color:#14261c;margin:32px;}" +
      "h1{font-size:22px;margin:0 0 4px;} h2{font-size:16px;margin:22px 0 8px;}" +
      "p{margin:4px 0;line-height:1.45;} table{width:100%;border-collapse:collapse;margin-top:8px;}" +
      "th,td{border-bottom:1px solid #d5ddd8;text-align:left;padding:6px 8px;font-size:13px;vertical-align:top;}" +
      "th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#3d5c4c;}" +
      ".right{text-align:right;} .muted{color:#5c6f64;} .total{font-weight:700;}</style></head><body>" +
      bodyHtml +
      "<script>window.onload=function(){window.print();}<\/script></body></html>"
    );
    win.document.close();
  }

  function lineRows(lines, withPlatform) {
    if (!lines || !lines.length) {
      return "<tr><td colspan=\"" + (withPlatform ? 7 : 4) + "\">Nenhum depósito neste ano. Total recebido: R$ 0,00.</td></tr>";
    }
    return lines.map(function (line) {
      var cells =
        "<td>" + esc(when(line.paid_at)) + "</td>" +
        "<td>" + esc(line.origin_label || "") +
        (line.reservation_id ? "<div class=\"muted\">" + esc(line.reservation_id) + "</div>" : "") +
        "<div>" + esc(line.title || "") + "</div></td>" +
        "<td>" + esc(line.document_label || "Sem documento") + "</td>";
      if (withPlatform) {
        cells += "<td class=\"right\">" + esc(brl(line.client_cents)) + "</td>" +
          "<td class=\"right " + moneyClass(line.platform_cents) + "\">" + esc(brl(line.platform_cents)) + "</td>";
      }
      cells += "<td class=\"right\">" + esc(brl(line.guide_cents)) + "</td>";
      return "<tr>" + cells + "</tr>";
    }).join("");
  }

  function mountAdmin() {
    var root = document.getElementById("admin-ir-root");
    if (!root) return;
    if (!root._irBound) {
      root._irBound = true;
      root.addEventListener("click", onAdminClick);
      root.addEventListener("change", onAdminChange);
      root.addEventListener("input", onAdminInput);
    }
    root.innerHTML = "<p class=\"gcv-ir-note\">Carregando o ano…</p>";
    loadAdmin(gcv_fiscal_now_year_guess());
  }

  function gcv_fiscal_now_year_guess() {
    return new Date().getFullYear();
  }

  function loadAdmin(year) {
    var root = document.getElementById("admin-ir-root");
    if (!root) return;
    xhr("GET", "/api/admin/fiscal-ir.php?year=" + encodeURIComponent(year), null, function (res) {
      if (!res || !res.ok) {
        root.innerHTML = "<div class=\"gcv-dash-alert gcv-dash-alert--warning\">" + esc((res && res.error) || "Erro ao carregar") + "</div>";
        return;
      }
      var flash = root._irFlash || "";
      root._irFlash = "";
      root._irData = res.data || {};
      renderAdmin(root, root._irData);
      if (flash) showAdminMsg(flash, true);
    });
  }

  function showAdminMsg(text, ok) {
    var msg = document.getElementById("gcv-ir-msg");
    if (!msg) return;
    msg.hidden = false;
    msg.className = "gcv-dash-alert " + (ok ? "gcv-dash-alert--info" : "gcv-dash-alert--warning");
    msg.textContent = text;
  }

  function renderAdmin(root, data) {
    var company = data.company || {};
    var years = data.years || [data.year];
    var current = gcv_fiscal_now_year_guess();
    var options = years.map(function (y) {
      var suffix = Number(y) === current ? " · em andamento" : "";
      return "<option value=\"" + y + "\"" + (Number(y) === Number(data.year) ? " selected" : "") + ">" + esc(String(y) + suffix) + "</option>";
    }).join("");
    var providers = data.providers || [];
    var rows = providers.map(function (p, index) {
      var q = (p.name + " " + (p.document_label || "") + " " + (p.cpf || "") + " " + (p.cnpj || "") + " " + (p.email || "")).toLowerCase();
      return "<tr class=\"gcv-ir-row" + (p.zero ? " gcv-ir-zero" : "") + "\" data-ir-toggle=\"" + index + "\" data-q=\"" + esc(q) + "\">" +
        "<td><strong>" + esc(p.name || "Prestador") + "</strong>" +
        (p.email ? "<div class=\"gcv-cms-muted\">" + esc(p.email) + "</div>" : "") + "</td>" +
        "<td>" + esc(p.document_label || "Sem CPF/CNPJ") + "</td>" +
        "<td class=\"right\">" + p.deposits + "</td>" +
        "<td class=\"right\">" + esc(brl(p.client_cents)) + "</td>" +
        "<td class=\"right " + moneyClass(p.platform_cents) + "\">" + esc(brl(p.platform_cents)) + "</td>" +
        "<td class=\"right\"><strong>" + esc(brl(p.guide_cents)) + "</strong></td>" +
        "</tr>" +
        "<tr class=\"gcv-ir-detail\" data-ir-detail=\"" + index + "\" hidden><td colspan=\"6\">" + detailBlock(p) + "</td></tr>";
    }).join("");

    var pending = data.pending || [];
    var pendingRows = pending.map(function (p) {
      return "<tr><td>" + esc(when(p.when)) + "</td><td>" + esc(p.guide_name || "") +
        "<div class=\"gcv-cms-muted\">CPF previsto: " + esc(p.document_label || "não cadastrado") + "</div></td>" +
        "<td>" + esc(p.reservation_id || "") + "<div>" + esc(p.title || "") + "</div></td>" +
        "<td class=\"right\">" + esc(brl(p.client_cents)) + "</td>" +
        "<td class=\"right\">" + esc(brl(p.platform_cents)) + "</td>" +
        "<td class=\"right\">" + esc(brl(p.guide_cents)) + "</td></tr>";
    }).join("");

    root.innerHTML =
      "<div class=\"gcv-ir-bar\">" +
      "<div class=\"gcv-dash-field\"><label class=\"gcv-dash-label\" for=\"gcv-ir-year\">Ano-calendário</label>" +
      "<select class=\"gcv-dash-select\" id=\"gcv-ir-year\">" + options + "</select></div>" +
      "<div class=\"gcv-dash-field\"><label class=\"gcv-dash-label\" for=\"gcv-ir-q\">Buscar prestador</label>" +
      "<input class=\"gcv-dash-input\" id=\"gcv-ir-q\" placeholder=\"Nome ou CPF\" /></div>" +
      "<a class=\"gcv-dash-btn\" href=\"/api/admin/fiscal-ir.php?export=csv&amp;year=" + encodeURIComponent(data.year) + "\">Baixar CSV</a>" +
      "<button type=\"button\" class=\"gcv-dash-btn\" id=\"gcv-ir-print\">Imprimir resumo</button>" +
      "<button type=\"button\" class=\"gcv-dash-btn gcv-dash-btn--primary\" id=\"gcv-ir-send\"" + (data.closed ? "" : " disabled") + ">" +
      (data.closed ? "Enviar informes de " + data.year : "Envio na virada do ano") + "</button>" +
      "</div>" +
      "<p class=\"gcv-ir-note\">" + (data.closed
        ? "Ano fechado. Cada guia deste ano já pode imprimir o informe, mesmo com total R$ 0,00."
        : "Ano em andamento. O Pix novo grava o CPF de quem recebe. Em janeiro o informe deste ano segue para cada guia.") +
      " Informes já enviados: <strong>" + (data.notices_sent || 0) + "</strong>.</p>" +
      "<div id=\"gcv-ir-msg\" class=\"gcv-dash-alert\" hidden></div>" +
      "<div class=\"gcv-dash-stats\">" +
      stat("Clientes (vendas com Pix)", company.client_cents) +
      stat("Plataforma", company.platform_cents) +
      stat("Prestadores", company.guide_cents) +
      stat("Pagamentos avulsos", company.manual_cents) +
      stat("Ainda sem Pix", company.pending_guide_cents) +
      "</div>" +
      "<p class=\"gcv-ir-note\">Nas vendas, o valor do cliente fecha em plataforma + guia. O pagamento avulso entra só no prestador. O acréscimo do cartão continua no menu Financeiro.</p>" +
      "<h3 class=\"gcv-dash-card__title\">Prestadores · " + providers.length + "</h3>" +
      "<div class=\"gcv-dash-table-wrap\"><table class=\"gcv-dash-table\"><thead><tr>" +
      "<th>Prestador</th><th>CPF/CNPJ do Pix</th><th>Depósitos</th><th>Cliente</th><th>Plataforma</th><th>Guia</th>" +
      "</tr></thead><tbody id=\"gcv-ir-providers\">" +
      (rows || "<tr><td colspan=\"6\">Nenhum guia neste ano.</td></tr>") +
      "</tbody></table></div>" +
      "<h3 class=\"gcv-dash-card__title\">Ainda sem Pix ao guia · " + pending.length + "</h3>" +
      "<p class=\"gcv-ir-note\">O vínculo oficial grava quando o Pix do guia é emitido. Até lá o documento abaixo é o do perfil, só como previsão.</p>" +
      "<div class=\"gcv-dash-table-wrap\"><table class=\"gcv-dash-table\"><thead><tr>" +
      "<th>Previsto</th><th>Guia</th><th>Reserva</th><th>Cliente</th><th>Plataforma</th><th>Guia</th>" +
      "</tr></thead><tbody>" +
      (pendingRows || "<tr><td colspan=\"6\">Nenhuma venda paga aguardando depósito.</td></tr>") +
      "</tbody></table></div>";
  }

  function stat(label, cents) {
    return "<div class=\"gcv-dash-stat\"><div class=\"gcv-dash-stat__label\">" + esc(label) +
      "</div><div class=\"gcv-dash-stat__value " + moneyClass(cents) + "\">" + esc(brl(cents)) + "</div></div>";
  }

  function detailBlock(provider) {
    var lines = provider.lines || [];
    if (!lines.length) {
      return "<p class=\"gcv-ir-note\">Nenhum depósito da plataforma neste ano. Total do prestador: R$ 0,00.</p>";
    }
    var body = lines.map(function (line) {
      return "<tr><td>" + esc(when(line.paid_at)) + "</td>" +
        "<td>" + esc(line.origin_label || "") +
        (line.reservation_id ? "<div class=\"gcv-cms-muted\">" + esc(line.reservation_id) + "</div>" : "") +
        "<div>" + esc(line.title || "") + "</div>" +
        (line.end_to_end ? "<div class=\"gcv-cms-muted\">" + esc(line.end_to_end) + "</div>" : "") + "</td>" +
        "<td class=\"right\">" + esc(brl(line.client_cents)) + "</td>" +
        "<td class=\"right " + moneyClass(line.platform_cents) + "\">" + esc(brl(line.platform_cents)) + "</td>" +
        "<td class=\"right\">" + esc(brl(line.guide_cents)) + "</td>" +
        "<td><form class=\"gcv-ir-fix\" data-source=\"" + esc(line.source) + "\" data-payout=\"" + line.payout_id + "\">" +
        "<input class=\"gcv-dash-input\" name=\"cpf\" placeholder=\"CPF\" value=\"" + esc(line.cpf || "") + "\" />" +
        "<input class=\"gcv-dash-input\" name=\"cnpj\" placeholder=\"CNPJ\" value=\"" + esc(line.cnpj || "") + "\" />" +
        "<input class=\"gcv-dash-input\" name=\"reason\" placeholder=\"Motivo da correção\" />" +
        "<button type=\"button\" class=\"gcv-dash-btn gcv-dash-btn--sm\" data-ir-save=\"1\">Corrigir documento</button>" +
        "</form></td></tr>";
    }).join("");
    return "<table class=\"gcv-dash-table\"><thead><tr><th>Pix</th><th>Origem</th><th>Cliente</th><th>Plataforma</th><th>Guia</th><th>Documento vinculado</th></tr></thead><tbody>" +
      body + "</tbody></table>";
  }

  function onAdminChange(ev) {
    if (ev.target && ev.target.id === "gcv-ir-year") {
      loadAdmin(parseInt(ev.target.value, 10));
    }
  }

  function onAdminInput(ev) {
    if (!ev.target || ev.target.id !== "gcv-ir-q") return;
    var q = String(ev.target.value || "").toLowerCase().trim();
    document.querySelectorAll("#gcv-ir-providers [data-q]").forEach(function (row) {
      var show = !q || String(row.getAttribute("data-q") || "").indexOf(q) >= 0;
      row.hidden = !show;
      var detail = row.nextElementSibling;
      if (detail && detail.hasAttribute("data-ir-detail") && !show) detail.hidden = true;
    });
  }

  function onAdminClick(ev) {
    var toggle = ev.target.closest("[data-ir-toggle]");
    if (toggle && !ev.target.closest("button, input, a, form")) {
      var detail = toggle.nextElementSibling;
      if (detail && detail.hasAttribute("data-ir-detail")) {
        detail.hidden = !detail.hidden;
        toggle.classList.toggle("is-open", !detail.hidden);
      }
      return;
    }
    if (ev.target && ev.target.id === "gcv-ir-print") {
      printAdmin();
      return;
    }
    if (ev.target && ev.target.id === "gcv-ir-send") {
      sendNotices();
      return;
    }
    var save = ev.target.closest("[data-ir-save]");
    if (save) {
      var form = save.closest("form");
      if (!form) return;
      save.disabled = true;
      xhr("POST", "/api/admin/fiscal-ir.php", {
        action: "correct",
        source: form.getAttribute("data-source"),
        payout_id: parseInt(form.getAttribute("data-payout"), 10),
        cpf: form.querySelector("[name=cpf]").value,
        cnpj: form.querySelector("[name=cnpj]").value,
        reason: form.querySelector("[name=reason]").value,
      }, function (res) {
        save.disabled = false;
        var root = document.getElementById("admin-ir-root");
        if (!res || !res.ok) {
          showAdminMsg((res && res.error) || "Erro", false);
          return;
        }
        if (root) {
          root._irFlash = (res.data && res.data.message) || "Documento atualizado";
          loadAdmin(root._irData ? root._irData.year : gcv_fiscal_now_year_guess());
        }
      });
    }
  }

  function sendNotices() {
    var root = document.getElementById("admin-ir-root");
    var data = root && root._irData;
    if (!data || !data.closed) return;
    var btn = document.getElementById("gcv-ir-send");
    if (btn) btn.disabled = true;
    xhr("POST", "/api/admin/fiscal-ir.php", { action: "send_notices", year: data.year }, function (res) {
      if (btn) btn.disabled = false;
      var msg = document.getElementById("gcv-ir-msg");
      if (!msg) return;
      msg.hidden = false;
      if (!res || !res.ok) {
        msg.className = "gcv-dash-alert gcv-dash-alert--warning";
        msg.textContent = (res && res.error) || "Erro ao enviar";
        return;
      }
      var d = res.data || {};
      var root = document.getElementById("admin-ir-root");
      if (root) {
        root._irFlash = "Enviados agora: " + (d.sent || 0) + ". Já tinham recebido: " + (d.skipped || 0) + ". Falhas: " + (d.failed || 0) + ".";
        loadAdmin(data.year);
      }
    });
  }

  function printAdmin() {
    var root = document.getElementById("admin-ir-root");
    var data = root && root._irData;
    if (!data) return;
    var payer = data.payer || {};
    var company = data.company || {};
    var blocks = (data.providers || []).map(function (p) {
      return "<h2>" + esc(p.name || "Prestador") + " · " + esc(p.document_label || "Sem documento") + "</h2>" +
        "<p>Cliente " + esc(brl(p.client_cents)) + " · Plataforma " + esc(brl(p.platform_cents)) +
        " · Guia " + esc(brl(p.guide_cents)) + "</p>" +
        "<table><thead><tr><th>Pix</th><th>Origem</th><th>Documento</th><th>Cliente</th><th>Plataforma</th><th>Guia</th></tr></thead><tbody>" +
        lineRows(p.lines, true) + "</tbody></table>";
    }).join("");
    openPrint("Imposto de renda " + data.year,
      "<h1>Imposto de renda " + data.year + "</h1>" +
      "<p>" + esc(payer.name || "") + " · CNPJ " + esc(payer.cnpj_label || "") + "</p>" +
      "<p>Clientes " + esc(brl(company.client_cents)) + " · Plataforma " + esc(brl(company.platform_cents)) +
      " · Prestadores " + esc(brl(company.guide_cents)) + " · Avulsos " + esc(brl(company.manual_cents)) + "</p>" +
      blocks
    );
  }

  function mountGuide(root) {
    if (!root) return;
    root.innerHTML = "<p class=\"gcv-ir-note\">Carregando o informe…</p>";
    if (!root._irBound) {
      root._irBound = true;
      root.addEventListener("change", function (ev) {
        if (ev.target && ev.target.id === "gcv-guide-ir-year") {
          loadGuide(root, parseInt(ev.target.value, 10));
        }
      });
      root.addEventListener("click", function (ev) {
        if (ev.target && ev.target.id === "gcv-guide-ir-print") printGuide(root);
      });
    }
    loadGuide(root, null);
  }

  function loadGuide(root, year) {
    var url = "/api/guides/fiscal-ir.php";
    if (year) url += "?year=" + encodeURIComponent(year);
    xhr("GET", url, null, function (res) {
      if (!res || !res.ok) {
        root.innerHTML = "<div class=\"gcv-dash-alert gcv-dash-alert--warning\">" + esc((res && res.error) || "Erro ao carregar o informe") + "</div>";
        return;
      }
      root._irData = res.data || {};
      renderGuide(root, root._irData);
    });
  }

  function renderGuide(root, data) {
    var guide = data.guide || {};
    var years = data.years || [];
    var options = years.map(function (item) {
      var y = item.year;
      var suffix = item.closed ? "" : " · em andamento";
      var amount = " · " + brl(item.guide_cents || 0);
      return "<option value=\"" + y + "\"" + (y === data.year ? " selected" : "") + ">" + y + suffix + amount + "</option>";
    }).join("");
    var docs = data.documents || [];
    var docText = docs.length
      ? docs.join(", ")
      : (guide.document_label || "CPF ainda não cadastrado");
    var lead = data.zero
      ? "Nenhum depósito da plataforma em " + data.year + ". Total recebido: R$ 0,00."
      : "A plataforma depositou " + brl(data.guide_cents) + " em " + data.year + ".";
    root.innerHTML =
      "<article class=\"gcv-ir-card\">" +
      "<div class=\"gcv-ir-bar\">" +
      "<div><h3 class=\"gcv-dash-card__title\" style=\"margin:0;\">Informe de rendimentos</h3>" +
      "<p class=\"gcv-ir-note\" style=\"margin-top:0.35rem;\">" + esc(lead) + "</p></div>" +
      "<div class=\"gcv-dash-field\"><label class=\"gcv-dash-label\" for=\"gcv-guide-ir-year\">Ano</label>" +
      "<select class=\"gcv-dash-select\" id=\"gcv-guide-ir-year\">" + options + "</select></div>" +
      "<a class=\"gcv-dash-btn\" href=\"/api/guides/fiscal-ir.php?export=csv&amp;year=" + encodeURIComponent(data.year) + "\">Baixar CSV</a>" +
      "<button type=\"button\" class=\"gcv-dash-btn gcv-dash-btn--primary\" id=\"gcv-guide-ir-print\">Imprimir informe</button>" +
      "</div>" +
      "<p class=\"gcv-ir-note\">Documento " + (data.zero ? "cadastrado" : "dos depósitos") + ": <strong>" + esc(docText) + "</strong>." +
      (data.closed ? " Ano fechado, pronto para a declaração." : " Este ano ainda está em andamento.") + "</p>" +
      "<div class=\"gcv-dash-table-wrap\"><table class=\"gcv-dash-table\"><thead><tr>" +
      "<th>Pix</th><th>Passeio</th><th>Documento</th><th>Recebido</th></tr></thead><tbody>" +
      lineRows(data.lines, false) +
      "</tbody></table></div></article>";
  }

  function printGuide(root) {
    var data = root && root._irData;
    if (!data) return;
    var payer = data.payer || {};
    var guide = data.guide || {};
    var docs = (data.documents && data.documents.length) ? data.documents.join(", ") : (guide.document_label || "não cadastrado");
    openPrint("Informe de rendimentos " + data.year,
      "<h1>Informe de rendimentos</h1>" +
      "<p>Ano-calendário <strong>" + data.year + "</strong>" + (data.closed ? "" : " · em andamento") + "</p>" +
      "<p>Fonte pagadora: <strong>" + esc(payer.name || "") + "</strong><br>CNPJ " + esc(payer.cnpj_label || "") + "</p>" +
      "<p>Beneficiário: <strong>" + esc(guide.name || "") + "</strong><br>Documento: " + esc(docs) + "</p>" +
      "<p class=\"total\">Total depositado via Pix: " + esc(brl(data.guide_cents)) + "</p>" +
      "<p class=\"muted\">Valores recebidos pela prestação de serviço de guiamento. O informe lista os depósitos da plataforma na conta do beneficiário.</p>" +
      "<table><thead><tr><th>Data</th><th>Descrição</th><th>Documento</th><th>Valor</th></tr></thead><tbody>" +
      lineRows(data.lines, false) + "</tbody></table>"
    );
  }

  global.GcvFiscalIr = {
    mountAdmin: mountAdmin,
    mountGuide: mountGuide,
  };
}(window));

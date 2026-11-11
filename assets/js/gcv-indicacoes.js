(function () {
  "use strict";

  var COPY = {
    pt: {
      title: "Indicações",
      loading: "Carregando…",
      fail: "Não foi possível carregar agora.",
      lead: "Indique um telefone com DDI ou um e-mail. Quando o primeiro passeio pago for concluído, você ganha 1 ponto e o cashback do tarifário.",
      phone: "Telefone",
      email: "E-mail",
      either: "Informe o telefone ou o e-mail.",
      emailInvalid: "E-mail inválido.",
      arrive: "Chegada (opcional)",
      leave: "Volta (opcional)",
      send: "Enviar convite",
      sending: "Enviando…",
      sent: "Convite enviado no WhatsApp.",
      sentEmail: "Convite enviado por e-mail.",
      sentBoth: "Convite enviado no WhatsApp e por e-mail.",
      manual: "O WhatsApp da agência não enviou. Mande você mesmo:",
      manualEmail: "O e-mail não saiu. Envie este link:",
      wa: "Abrir WhatsApp",
      balance: "Saldo",
      points: "Pontos",
      place: "Posição",
      none: "—",
      list: "Convites",
      empty: "Nenhuma indicação ainda.",
      rank: "Ranking da campanha",
      rankEmpty: "Ainda não há pontos.",
      withdraw: "Sacar no Pix",
      pix: "Chave Pix",
      amount: "Valor em reais (vazio saca tudo)",
      ask: "Pedir saque",
      asked: "Saque pedido. Ele fica pendente até o pagamento.",
      status: {
        sent: "Enviado",
        pending_email: "Aguardando e-mail",
        linked: "Aguardando o passeio",
        rewarded: "Concluída",
        nao_conta: "Não conta"
      },
      adminTitle: "Saques da campanha",
      who: "Quem pediu",
      value: "Valor",
      key: "Chave",
      state: "Situação",
      when: "Pedido",
      paid: "Pago",
      reject: "Recusar",
      pending: "Pendente",
      paidState: "Pago",
      rejected: "Recusado",
      noWd: "Nenhum saque.",
      you: "você"
    },
    en: {
      title: "Referrals",
      loading: "Loading…",
      fail: "Could not load this right now.",
      lead: "Refer a phone number with country code, or an email. When their first paid tour is completed, you earn 1 point and the cashback set in the price list.",
      phone: "Phone",
      email: "Email",
      either: "Enter a phone number or an email.",
      emailInvalid: "Invalid email.",
      arrive: "Arrival (optional)",
      leave: "Return (optional)",
      send: "Send invite",
      sending: "Sending…",
      sent: "Invite sent on WhatsApp.",
      sentEmail: "Invite sent by email.",
      sentBoth: "Invite sent on WhatsApp and by email.",
      manual: "The agency WhatsApp did not send it. Send it yourself:",
      manualEmail: "The email did not go out. Send this link:",
      wa: "Open WhatsApp",
      balance: "Balance",
      points: "Points",
      place: "Rank",
      none: "—",
      list: "Invites",
      empty: "No referrals yet.",
      rank: "Campaign ranking",
      rankEmpty: "No points yet.",
      withdraw: "Withdraw with Pix",
      pix: "Pix key",
      amount: "Amount in reais (empty withdraws all)",
      ask: "Request withdrawal",
      asked: "Withdrawal requested. It stays pending until it is paid.",
      status: {
        sent: "Sent",
        pending_email: "Waiting for email",
        linked: "Waiting for the tour",
        rewarded: "Completed",
        nao_conta: "Does not count"
      },
      adminTitle: "Campaign withdrawals",
      who: "Requested by",
      value: "Amount",
      key: "Key",
      state: "Status",
      when: "Requested",
      paid: "Paid",
      reject: "Reject",
      pending: "Pending",
      paidState: "Paid",
      rejected: "Rejected",
      noWd: "No withdrawals.",
      you: "you"
    },
    es: {
      title: "Indicaciones",
      loading: "Cargando…",
      fail: "No se pudo cargar ahora.",
      lead: "Indica un teléfono con código de país, o un correo. Cuando se concluya su primer paseo pago, ganas 1 punto y el cashback del tarifario.",
      phone: "Teléfono",
      email: "Correo",
      either: "Indica el teléfono o el correo.",
      emailInvalid: "Correo inválido.",
      arrive: "Llegada (opcional)",
      leave: "Vuelta (opcional)",
      send: "Enviar invitación",
      sending: "Enviando…",
      sent: "Invitación enviada por WhatsApp.",
      sentEmail: "Invitación enviada por correo.",
      sentBoth: "Invitación enviada por WhatsApp y por correo.",
      manual: "El WhatsApp de la agencia no la envió. Mándala tú:",
      manualEmail: "El correo no salió. Envía este enlace:",
      wa: "Abrir WhatsApp",
      balance: "Saldo",
      points: "Puntos",
      place: "Puesto",
      none: "—",
      list: "Invitaciones",
      empty: "Todavía no hay indicaciones.",
      rank: "Ranking de la campaña",
      rankEmpty: "Todavía no hay puntos.",
      withdraw: "Retirar por Pix",
      pix: "Clave Pix",
      amount: "Valor en reales (vacío retira todo)",
      ask: "Pedir retiro",
      asked: "Retiro pedido. Queda pendiente hasta el pago.",
      status: {
        sent: "Enviado",
        pending_email: "Esperando el correo",
        linked: "Esperando el paseo",
        rewarded: "Concluida",
        nao_conta: "No cuenta"
      },
      adminTitle: "Retiros de la campaña",
      who: "Quién pidió",
      value: "Valor",
      key: "Clave",
      state: "Estado",
      when: "Pedido",
      paid: "Pagado",
      reject: "Rechazar",
      pending: "Pendiente",
      paidState: "Pagado",
      rejected: "Rechazado",
      noWd: "Ningún retiro.",
      you: "tú"
    }
  };

  var uiLang = "pt";
  var flash = null;

  function t(key) {
    var pack = COPY[uiLang] || COPY.pt;
    return pack[key] != null ? pack[key] : COPY.pt[key];
  }

  function money(cents, loc) {
    var n = (Number(cents) || 0) / 100;
    var locale = loc === "en" ? "en-US" : loc === "es" ? "es-ES" : "pt-BR";
    try {
      return n.toLocaleString(locale, { style: "currency", currency: "BRL" });
    } catch (err) {
      return "R$ " + n.toFixed(2);
    }
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function phoneMask(phone) {
    var d = String(phone || "").replace(/\D/g, "");
    if (d.indexOf("55") === 0 && (d.length === 12 || d.length === 13)) {
      d = d.slice(2);
      if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
      if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    }
    if (d.length > 8) return "+" + d;
    return phone || "";
  }

  function contactLabel(item) {
    var bits = [];
    if (item.phone) bits.push(phoneMask(item.phone));
    if (item.email) bits.push(item.email);
    return bits.join(" · ");
  }

  function statusLabel(status) {
    var map = t("status") || {};
    return map[status] || status;
  }

  function post(url, body, method) {
    return fetch(url, {
      method: method || "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (res) { return res.json(); });
  }

  function paint(data) {
    var root = document.getElementById("gcv-ind-root");
    if (!root) return;
    uiLang = data.lang === "en" || data.lang === "es" ? data.lang : "pt";
    var title = document.getElementById("gcv-ind-title");
    if (title) title.textContent = t("title");
    var items = data.referrals || [];
    var rows = items.length
      ? items.map(function (item) {
          var when = item.date_from ? (item.date_from + (item.date_to && item.date_to !== item.date_from ? " → " + item.date_to : "")) : "";
          return '<article class="gcv-ind__row"><strong>' + esc(contactLabel(item)) + '</strong><span>' + esc(statusLabel(item.status)) + (when ? " · " + esc(when) : "") + '</span></article>';
        }).join("")
      : '<p class="gcv-ind__note">' + esc(t("empty")) + "</p>";
    var rank = data.ranking || [];
    var rankHtml = rank.length
      ? "<ol class=\"gcv-ind__rank\">" + rank.map(function (row) {
          return '<li class="' + (row.mine ? "is-mine" : "") + '">' + esc(row.position) + ". " + esc(row.name) + " · " + esc(row.points) + (row.mine ? " (" + esc(t("you")) + ")" : "") + "</li>";
        }).join("") + "</ol>"
      : '<p class="gcv-ind__note">' + esc(t("rankEmpty")) + "</p>";
    root.innerHTML =
      '<p class="gcv-ind__note">' + esc(t("lead")) + "</p>" +
      '<div class="gcv-ind__cards">' +
        '<div class="gcv-ind__card"><span>' + esc(t("balance")) + '</span><strong>' + esc(money(data.balance_cents, uiLang)) + "</strong></div>" +
        '<div class="gcv-ind__card"><span>' + esc(t("points")) + "</span><strong>" + esc(data.points || 0) + "</strong></div>" +
        '<div class="gcv-ind__card"><span>' + esc(t("place")) + "</span><strong>" + esc(data.position || t("none")) + "</strong></div>" +
      "</div>" +
      '<form class="gcv-dash-form" id="gcv-ind-form">' +
        '<div class="gcv-dash-field"><span class="gcv-dash-label">' + esc(t("phone")) + '</span><div id="gcv-ind-phone-wrap"></div></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label" for="gcv-ind-email">' + esc(t("email")) + '</label><input class="gcv-dash-input" id="gcv-ind-email" name="email" type="email" autocomplete="email" /></div>' +
        '<p class="gcv-ind__note">' + esc(t("either")) + "</p>" +
        '<div class="gcv-dash-field-row">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label" for="gcv-ind-from">' + esc(t("arrive")) + '</label><input class="gcv-dash-input" id="gcv-ind-from" name="date_from" type="date" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label" for="gcv-ind-to">' + esc(t("leave")) + '</label><input class="gcv-dash-input" id="gcv-ind-to" name="date_to" type="date" /></div>' +
        "</div>" +
        '<button class="gcv-dash-btn gcv-dash-btn--primary" type="submit">' + esc(t("send")) + "</button>" +
        '<p class="gcv-ind__note" id="gcv-ind-msg" hidden></p>' +
      "</form>" +
      "<h3>" + esc(t("list")) + '</h3><div class="gcv-ind__list">' + rows + "</div>" +
      "<h3>" + esc(t("rank")) + "</h3>" + rankHtml +
      "<h3>" + esc(t("withdraw")) + "</h3>" +
      '<form class="gcv-dash-form" id="gcv-ind-saque">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label" for="gcv-ind-pix">' + esc(t("pix")) + '</label><input class="gcv-dash-input" id="gcv-ind-pix" name="pix_key" required /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label" for="gcv-ind-valor">' + esc(t("amount")) + '</label><input class="gcv-dash-input" id="gcv-ind-valor" name="amount" inputmode="decimal" /></div>' +
        '<button class="gcv-dash-btn" type="submit">' + esc(t("ask")) + "</button>" +
        '<p class="gcv-ind__note" id="gcv-ind-saque-msg" hidden></p>' +
      "</form>";

    function bindIndDate(id) {
      var input = document.getElementById(id);
      if (!input || typeof window.gcvBindDatePicker !== "function") return;
      window.gcvBindDatePicker(input, {
        min: typeof window.gcvTodayIso === "function" ? window.gcvTodayIso() : ""
      });
      var btn = input.parentNode && input.parentNode.querySelector(".gcv-datepicker__btn");
      if (!btn) return;
      btn.id = id + "-btn";
      var label = document.querySelector('label[for="' + id + '"]');
      if (label) label.setAttribute("for", btn.id);
    }
    bindIndDate("gcv-ind-from");
    bindIndDate("gcv-ind-to");
    var fromDate = document.getElementById("gcv-ind-from");
    var toDate = document.getElementById("gcv-ind-to");
    if (fromDate && toDate) {
      fromDate.addEventListener("change", function () {
        if (fromDate.value) toDate.min = fromDate.value;
        if (toDate.value && fromDate.value && toDate.value < fromDate.value) {
          toDate.value = fromDate.value;
          toDate.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }

    var phoneCtl = null;
    var phoneWrap = document.getElementById("gcv-ind-phone-wrap");
    if (phoneWrap && window.GcvDashRoles && typeof window.GcvDashRoles.bindDashPhone === "function") {
      phoneCtl = window.GcvDashRoles.bindDashPhone(phoneWrap, "gcv-ind", "br", "");
      var phoneInput = document.getElementById("gcv-ind-phone");
      if (phoneInput) phoneInput.removeAttribute("required");
    }

    var form = document.getElementById("gcv-ind-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var btn = form.querySelector('button[type="submit"]');
        var msg = document.getElementById("gcv-ind-msg");
        var emailEl = document.getElementById("gcv-ind-email");
        var email = emailEl ? String(emailEl.value || "").trim() : "";
        var digits = phoneCtl ? phoneCtl.getPhoneDigits() : "";
        function showMsg(text) {
          if (!msg) return;
          msg.hidden = false;
          msg.textContent = text;
        }
        if (!digits && !email) {
          showMsg(t("either"));
          return;
        }
        if (digits && phoneCtl) {
          var issue = phoneCtl.validate();
          if (issue) {
            showMsg(issue);
            return;
          }
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showMsg(t("emailInvalid"));
          return;
        }
        if (btn) { btn.disabled = true; btn.textContent = t("sending"); }
        post("/api/indicacoes.php", {
          action: "criar",
          phone: digits,
          phone_ddi: phoneCtl ? phoneCtl.getDial() : "+55",
          phone_iso: phoneCtl ? phoneCtl.getIso() : "br",
          email: email,
          date_from: form.date_from.value,
          date_to: form.date_to.value
        }).then(function (res) {
          if (btn) { btn.disabled = false; btn.textContent = t("send"); }
          if (!res.ok) {
            showMsg(res.error || t("fail"));
            return;
          }
          var data = res.data || {};
          var parts = [];
          if (data.phone && data.sent === false && data.wa_url) {
            parts.push(esc(t("manual")) + ' <a class="gcv-ind__wa" href="' + esc(data.wa_url) + '" target="_blank" rel="noopener">' + esc(t("wa")) + "</a>");
          }
          if (data.email && data.email_sent === false && data.link) {
            parts.push(esc(t("manualEmail")) + " " + esc(data.link));
          }
          if (parts.length) {
            flash = { invite: { html: parts.join("<br>") } };
          } else if (data.phone && data.email) {
            flash = { invite: { text: t("sentBoth") } };
          } else if (data.email) {
            flash = { invite: { text: t("sentEmail") } };
          } else {
            flash = { invite: { text: t("sent") } };
          }
          open();
        }).catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = t("send"); }
          showMsg(t("fail"));
        });
      });
    }

    if (flash && flash.invite) {
      var inviteMsg = document.getElementById("gcv-ind-msg");
      if (inviteMsg) {
        inviteMsg.hidden = false;
        if (flash.invite.html) inviteMsg.innerHTML = flash.invite.html;
        else inviteMsg.textContent = flash.invite.text || "";
      }
    }
    if (flash && flash.withdraw) {
      var withdrawMsg = document.getElementById("gcv-ind-saque-msg");
      if (withdrawMsg) {
        withdrawMsg.hidden = false;
        withdrawMsg.textContent = flash.withdraw;
      }
    }
    flash = null;

    var saque = document.getElementById("gcv-ind-saque");
    if (saque) {
      saque.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var msg = document.getElementById("gcv-ind-saque-msg");
        var raw = String(saque.amount.value || "").trim();
        var cents = 0;
        if (raw !== "") {
          var normalized = raw.indexOf(",") >= 0 ? raw.replace(/\./g, "").replace(",", ".") : raw;
          cents = Math.round(Number(normalized) * 100);
        }
        if (raw !== "" && (!isFinite(cents) || cents < 1)) {
          if (msg) { msg.hidden = false; msg.textContent = t("fail"); }
          return;
        }
        post("/api/indicacoes.php", {
          action: "sacar",
          pix_key: saque.pix_key.value,
          amount_cents: cents
        }).then(function (res) {
          if (!res.ok) {
            if (msg) { msg.hidden = false; msg.textContent = res.error || t("fail"); }
            return;
          }
          flash = { withdraw: t("asked") };
          open();
        }).catch(function () {
          if (msg) { msg.hidden = false; msg.textContent = t("fail"); }
        });
      });
    }
  }

  function open() {
    var root = document.getElementById("gcv-ind-root");
    if (!root) return;
    root.innerHTML = '<p class="gcv-ind__note">' + esc(t("loading")) + "</p>";
    fetch("/api/indicacoes.php", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        if (!body.ok) {
          root.innerHTML = '<p class="gcv-ind__note">' + esc(body.error || t("fail")) + "</p>";
          return;
        }
        paint(body.data || {});
      })
      .catch(function () {
        root.innerHTML = '<p class="gcv-ind__note">' + esc(t("fail")) + "</p>";
      });
  }

  function adminState(status) {
    if (status === "paid") return t("paidState");
    if (status === "rejected") return t("rejected");
    return t("pending");
  }

  function openAdmin() {
    var root = document.getElementById("admin-saques-root");
    if (!root) return;
    uiLang = "pt";
    root.innerHTML = '<p class="gcv-ind__note">' + esc(t("loading")) + "</p>";
    fetch("/api/admin/indicacoes.php", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        if (!body.ok) {
          root.innerHTML = '<p class="gcv-ind__note">' + esc(body.error || t("fail")) + "</p>";
          return;
        }
        var data = body.data || {};
        var rows = data.withdrawals || [];
        var table = rows.length
          ? '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr><th>' + esc(t("who")) + "</th><th>" + esc(t("value")) + "</th><th>" + esc(t("key")) + "</th><th>" + esc(t("state")) + "</th><th></th></tr></thead><tbody>" +
            rows.map(function (row) {
              var actions = row.status === "pending"
                ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-wd="' + esc(row.id) + '" data-st="paid">' + esc(t("paid")) + '</button> <button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-wd="' + esc(row.id) + '" data-st="rejected">' + esc(t("reject")) + "</button>"
                : "";
              return "<tr><td>" + esc(row.name) + "<br><small>" + esc(row.email) + "</small></td><td>" + esc(money(row.amount_cents, "pt")) + "</td><td>" + esc(row.pix_key) + "</td><td>" + esc(adminState(row.status)) + "</td><td>" + actions + "</td></tr>";
            }).join("") +
            "</tbody></table></div>"
          : '<p class="gcv-ind__note">' + esc(t("noWd")) + "</p>";
        var rank = data.ranking || [];
        var rankHtml = rank.length
          ? "<ol class=\"gcv-ind__rank\">" + rank.map(function (row) {
              return "<li>" + esc(row.position) + ". " + esc(row.name) + " · " + esc(row.points) + "</li>";
            }).join("") + "</ol>"
          : '<p class="gcv-ind__note">' + esc(t("rankEmpty")) + "</p>";
        root.innerHTML = table + "<h3>" + esc(t("rank")) + "</h3>" + rankHtml;
        root.querySelectorAll("[data-wd]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            btn.disabled = true;
            post("/api/admin/indicacoes.php", { id: Number(btn.getAttribute("data-wd")), status: btn.getAttribute("data-st") }, "PUT")
              .then(function () { openAdmin(); })
              .catch(function () { openAdmin(); });
          });
        });
      })
      .catch(function () {
        root.innerHTML = '<p class="gcv-ind__note">' + esc(t("fail")) + "</p>";
      });
  }

  window.GcvIndicacoes = { open: open, openAdmin: openAdmin };
})();

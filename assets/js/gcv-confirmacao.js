/**
 * Página confirmacao.html — exibe resumo da reserva Pix confirmada.
 */
(function () {
  "use strict";

  var STRINGS = {
    pt: {
      missing: "Reserva não informada.",
      loadError: "Não foi possível carregar a reserva.",
      pendingTitle: "Pagamento ainda não confirmado",
      pendingSubtitle: "Aguardando a confirmação do seu banco. Isso pode levar alguns instantes.",
      code: "Código",
      status: "Status",
      pendingNote:
        "Se você acabou de gerar o Pix, aguarde a confirmação do banco ou consulte sua reserva.",
      confirmedTitle: "Pagamento confirmado!",
      confirmedSubtitle: "Sua reserva foi registrada com sucesso. Guarde o comprovante para o dia do passeio.",
      confirmedStatus: "Confirmada",
      amount: "Valor pago",
      trips: "Passeios reservados",
      person: "pessoa(s)",
      email: "E-mail",
      phone: "Telefone / WhatsApp",
      note: "Guarde o comprovante do seu banco. Entraremos em contato se necessário.",
      backExc: "Voltar às excursões",
      lookup: "Consultar reserva",
      fetchError: "Erro ao carregar confirmação.",
      loading: "Carregando confirmação…",
      voucherHint: "Abra seu comprovante com QR para apresentar ao guia no dia do passeio.",
    },
    en: {
      missing: "No reservation specified.",
      loadError: "Could not load the reservation.",
      pendingTitle: "Payment not confirmed yet",
      pendingSubtitle: "Waiting for your bank to confirm. This may take a few moments.",
      code: "Code",
      status: "Status",
      pendingNote:
        "If you just generated the Pix, wait for bank confirmation or look up your reservation.",
      confirmedTitle: "Payment confirmed!",
      confirmedSubtitle: "Your reservation was registered successfully. Keep your voucher for tour day.",
      confirmedStatus: "Confirmed",
      amount: "Amount paid",
      trips: "Reserved tours",
      person: "person(s)",
      email: "Email",
      phone: "Phone / WhatsApp",
      note: "Keep your bank receipt. We will contact you if needed.",
      backExc: "Back to tours",
      lookup: "Look up reservation",
      fetchError: "Error loading confirmation.",
      loading: "Loading confirmation…",
      voucherHint: "Open your voucher with QR code to show your guide on tour day.",
    },
    es: {
      missing: "Reserva no indicada.",
      loadError: "No se pudo cargar la reserva.",
      pendingTitle: "Pago aún no confirmado",
      pendingSubtitle: "Esperando la confirmación del banco. Puede tardar unos instantes.",
      code: "Código",
      status: "Estado",
      pendingNote:
        "Si acaba de generar el Pix, espere la confirmación del banco o consulte su reserva.",
      confirmedTitle: "¡Pago confirmado!",
      confirmedSubtitle: "Su reserva fue registrada con éxito. Guarde el comprobante para el día del paseo.",
      confirmedStatus: "Confirmada",
      amount: "Valor pagado",
      trips: "Paseos reservados",
      person: "persona(s)",
      email: "Correo",
      phone: "Teléfono / WhatsApp",
      note: "Guarde el comprobante del banco. Le contactaremos si es necesario.",
      backExc: "Volver a las excursiones",
      lookup: "Consultar reserva",
      fetchError: "Error al cargar la confirmación.",
      loading: "Cargando confirmación…",
      voucherHint: "Abra su comprobante con QR para presentarlo al guía el día del paseo.",
    },
  };

  function detectLocale() {
    var p = window.location.pathname || "";
    if (p.indexOf("/en/") >= 0) return "en";
    if (p.indexOf("/es/") >= 0) return "es";
    return "pt";
  }

  function s(key) {
    var loc = detectLocale();
    var pack = STRINGS[loc] || STRINGS.pt;
    return pack[key] || STRINGS.pt[key] || "";
  }

  function homeExcUrl() {
    var loc = detectLocale();
    if (loc === "pt") return "index.html#excursoes-junho";
    return "../index.html#excursoes-junho";
  }

  function consultarUrl(id) {
    var loc = detectLocale();
    var base = loc === "pt" ? "consultar-reserva.html" : "../" + loc + "/consultar-reserva.html";
    if (loc !== "pt" && window.location.pathname.indexOf("/" + loc + "/") >= 0) {
      base = "consultar-reserva.html";
    }
    return base + "?id=" + encodeURIComponent(id);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatAmount(amount) {
    if (window.GcvPixReceipt && typeof window.GcvPixReceipt.formatBrl === "function") {
      return window.GcvPixReceipt.formatBrl(amount);
    }
    var v = Number(amount);
    if (!Number.isFinite(v)) v = 0;
    return "R$ " + v.toFixed(2).replace(".", ",");
  }

  function rsVoucher(loc, key) {
    if (window.GcvReservaVoucher && typeof window.GcvReservaVoucher.rs === "function") {
      return window.GcvReservaVoucher.rs(loc, key);
    }
    return "";
  }

  function loadingHtml() {
    return (
      '<div class="gcv-confirmacao-loading" role="status" aria-live="polite">' +
      '<div class="gcv-confirmacao-loading__spinner" aria-hidden="true"></div>' +
      "<p>" +
      escapeHtml(s("loading")) +
      "</p></div>"
    );
  }

  function actionsHtml(id) {
    return (
      '<div class="gcv-confirmacao-actions">' +
      '<a class="gcv-confirmacao-btn gcv-confirmacao-btn--primary" href="' +
      escapeHtml(consultarUrl(id)) +
      '">' +
      escapeHtml(s("lookup")) +
      "</a>" +
      '<a class="gcv-confirmacao-btn gcv-confirmacao-btn--ghost" href="' +
      escapeHtml(homeExcUrl()) +
      '">' +
      escapeHtml(s("backExc")) +
      "</a></div>"
    );
  }

  function metaItem(label, value, extraClass) {
    return (
      '<div class="gcv-confirmacao-meta__item' +
      (extraClass ? " " + extraClass : "") +
      '">' +
      '<span class="gcv-confirmacao-meta__label">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="gcv-confirmacao-meta__value">' +
      value +
      "</span></div>"
    );
  }

  function tripsHtml(trips) {
    if (!trips || !trips.length) return "";
    var html =
      '<div class="gcv-confirmacao-trips">' +
      '<h2 class="gcv-confirmacao-trips__title">' +
      escapeHtml(s("trips")) +
      '</h2><ul class="gcv-confirmacao-trips__list">';
    trips.forEach(function (t) {
      var line = [t.dateLabel || t.dateShort, t.destino, t.qty ? t.qty + " " + s("person") : ""]
        .filter(Boolean)
        .join(" · ");
      html +=
        '<li class="gcv-confirmacao-trips__item">' +
        '<span class="gcv-confirmacao-trips__dot" aria-hidden="true"></span>' +
        "<span>" +
        escapeHtml(line) +
        "</span></li>";
    });
    html += "</ul></div>";
    return html;
  }

  function voucherCtaHtml(voucherData, loc) {
    if (!voucherData || !voucherData.code) return "";
    return (
      '<div class="gcv-confirmacao-voucher">' +
      '<div class="gcv-confirmacao-voucher__text">' +
      "<strong>" +
      escapeHtml(rsVoucher(loc, "found") || "Reserva encontrada.") +
      "</strong>" +
      "<span>" +
      escapeHtml(s("voucherHint")) +
      "</span></div>" +
      '<button type="button" class="gcv-confirmacao-voucher__btn" data-gcv-open-voucher="' +
      escapeHtml(voucherData.code) +
      '">' +
      '<span class="gcv-confirmacao-voucher__btn-icon" aria-hidden="true">📄</span> ' +
      escapeHtml(rsVoucher(loc, "openVoucher") || "Ver comprovante") +
      "</button></div>"
    );
  }

  function errorCard(title, message, id) {
    var html =
      '<article class="gcv-confirmacao-card gcv-confirmacao-card--error">' +
      '<header class="gcv-confirmacao-card__head">' +
      '<span class="gcv-confirmacao-card__icon" aria-hidden="true">!</span>' +
      "<h1 class=\"gcv-confirmacao-card__title\">" +
      escapeHtml(title) +
      "</h1>" +
      '<p class="gcv-confirmacao-card__subtitle">' +
      escapeHtml(message) +
      "</p></header>";
    if (id) html += actionsHtml(id);
    html += "</article>";
    return html;
  }

  function pendingCard(id, status) {
    return (
      '<article class="gcv-confirmacao-card gcv-confirmacao-card--pending">' +
      '<header class="gcv-confirmacao-card__head">' +
      '<span class="gcv-confirmacao-card__icon" aria-hidden="true">⏳</span>' +
      "<h1 class=\"gcv-confirmacao-card__title\">" +
      escapeHtml(s("pendingTitle")) +
      "</h1>" +
      '<p class="gcv-confirmacao-card__subtitle">' +
      escapeHtml(s("pendingSubtitle")) +
      "</p></header>" +
      '<div class="gcv-confirmacao-meta">' +
      metaItem(
        s("code"),
        '<span class="gcv-confirmacao-meta__value--code">' + escapeHtml(id) + "</span>",
      ) +
      metaItem(
        s("status"),
        '<span class="gcv-confirmacao-meta__badge gcv-confirmacao-meta__badge--pending">' +
          escapeHtml(status || "PENDING") +
          "</span>",
      ) +
      "</div>" +
      '<p class="gcv-confirmacao-note">' +
      escapeHtml(s("pendingNote")) +
      "</p>" +
      actionsHtml(id) +
      "</article>"
    );
  }

  function successCard(id, data, voucherData, trips) {
    var loc = detectLocale();
    var amount = voucherData && voucherData.amount != null ? voucherData.amount : data.amount;
    var displayTrips =
      voucherData && Array.isArray(voucherData.trips) && voucherData.trips.length
        ? voucherData.trips
        : trips;

    var html =
      '<article class="gcv-confirmacao-card gcv-confirmacao-card--success">' +
      '<header class="gcv-confirmacao-card__head">' +
      '<span class="gcv-confirmacao-card__icon" aria-hidden="true">✓</span>' +
      "<h1 class=\"gcv-confirmacao-card__title\">" +
      escapeHtml(s("confirmedTitle")) +
      "</h1>" +
      '<p class="gcv-confirmacao-card__subtitle">' +
      escapeHtml(s("confirmedSubtitle")) +
      "</p></header>" +
      '<div class="gcv-confirmacao-meta">' +
      metaItem(
        s("code"),
        '<span class="gcv-confirmacao-meta__value--code">' + escapeHtml(id) + "</span>",
      ) +
      metaItem(
        s("status"),
        '<span class="gcv-confirmacao-meta__badge gcv-confirmacao-meta__badge--paid">' +
          escapeHtml(s("confirmedStatus")) +
          "</span>",
      );

    if (amount != null) {
      html += metaItem(
        s("amount"),
        '<span class="gcv-confirmacao-meta__value--amount">' + escapeHtml(formatAmount(amount)) + "</span>",
        "gcv-confirmacao-meta__item--wide",
      );
    }

    var buyerEmail =
      (voucherData && voucherData.email) ||
      data.email ||
      "";
    var buyerPhone =
      (voucherData && (voucherData.phone || voucherData.telefone)) ||
      data.phone ||
      data.telefone ||
      "";
    if (buyerEmail) {
      html += metaItem(s("email"), escapeHtml(buyerEmail), "gcv-confirmacao-meta__item--wide");
    }
    if (buyerPhone) {
      html += metaItem(s("phone"), escapeHtml(buyerPhone), "gcv-confirmacao-meta__item--wide");
    }

    html += "</div>" + voucherCtaHtml(voucherData, loc) + tripsHtml(displayTrips);
    html +=
      '<p class="gcv-confirmacao-note">' +
      escapeHtml(s("note")) +
      "</p>" +
      actionsHtml(id) +
      "</article>";
    return html;
  }

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id") || params.get("reservation_id") || "";
  var root = document.getElementById("gcv-confirmacao");
  if (!root) return;

  if (!id) {
    root.innerHTML = errorCard(s("missing"), s("missing"), "");
    return;
  }

  root.innerHTML = loadingHtml();

  if (window.GcvPixReceipt && typeof window.GcvPixReceipt.saveReservationCode === "function") {
    window.GcvPixReceipt.saveReservationCode(id);
  }

  var api =
    (window.location.pathname.indexOf("/en/") >= 0 || window.location.pathname.indexOf("/es/") >= 0
      ? "../api/"
      : "/api/") + "check_pix_status.php?reservation_id=" + encodeURIComponent(id);

  fetch(api, { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (!data || !data.success) {
        root.innerHTML = errorCard(s("loadError"), s("loadError"), id);
        return;
      }
      var status = String(data.status || "").toUpperCase();
      var trips = Array.isArray(data.trips) ? data.trips : [];
      if (status !== "PAID") {
        root.innerHTML = pendingCard(id, status);
        return;
      }
      if (window.GcvExcBookings && typeof window.GcvExcBookings.recordTripsForReservation === "function") {
        window.GcvExcBookings.recordTripsForReservation(
          id,
          trips.map(function (t) {
            return { cartId: t.cartId, qty: t.qty };
          }),
        );
      }
      var loc = detectLocale();
      var voucherData =
        window.GcvReservaVoucher && typeof window.GcvReservaVoucher.normalizeFromPixStatus === "function"
          ? window.GcvReservaVoucher.normalizeFromPixStatus(data, id, loc)
          : null;

      root.innerHTML = successCard(id, data, voucherData, trips);

      if (voucherData && window.GcvReservaVoucher) {
        if (typeof window.GcvReservaVoucher.bindInlineButtons === "function") {
          window.GcvReservaVoucher.bindInlineButtons(root, loc, function () {
            return voucherData;
          });
        }
        if (typeof window.GcvReservaVoucher.openModal === "function") {
          window.GcvReservaVoucher.openModal(voucherData, loc);
        }
      }
    })
    .catch(function () {
      root.innerHTML = errorCard(s("fetchError"), s("fetchError"), id);
    });
})();

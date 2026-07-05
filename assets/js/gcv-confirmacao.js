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
      code: "Código",
      status: "Status",
      pendingNote:
        "Se você acabou de gerar o Pix, aguarde a confirmação do banco ou consulte sua reserva.",
      confirmedTitle: "Pagamento confirmado!",
      confirmedStatus: "Confirmada",
      amount: "Valor",
      trips: "Passeios",
      person: "pessoa(s)",
      note: "Guarde o comprovante do seu banco. Entraremos em contato se necessário.",
      backExc: "← Voltar às excursões",
      lookup: "Consultar reserva",
      fetchError: "Erro ao carregar confirmação.",
    },
    en: {
      missing: "No reservation specified.",
      loadError: "Could not load the reservation.",
      pendingTitle: "Payment not confirmed yet",
      code: "Code",
      status: "Status",
      pendingNote:
        "If you just generated the Pix, wait for bank confirmation or look up your reservation.",
      confirmedTitle: "Payment confirmed!",
      confirmedStatus: "Confirmed",
      amount: "Amount",
      trips: "Tours",
      person: "person(s)",
      note: "Keep your bank receipt. We will contact you if needed.",
      backExc: "← Back to tours",
      lookup: "Look up reservation",
      fetchError: "Error loading confirmation.",
    },
    es: {
      missing: "Reserva no indicada.",
      loadError: "No se pudo cargar la reserva.",
      pendingTitle: "Pago aún no confirmado",
      code: "Código",
      status: "Estado",
      pendingNote:
        "Si acaba de generar el Pix, espere la confirmación del banco o consulte su reserva.",
      confirmedTitle: "¡Pago confirmado!",
      confirmedStatus: "Confirmada",
      amount: "Valor",
      trips: "Paseos",
      person: "persona(s)",
      note: "Guarde el comprobante del banco. Le contactaremos si es necesario.",
      backExc: "← Volver a las excursiones",
      lookup: "Consultar reserva",
      fetchError: "Error al cargar la confirmación.",
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

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id") || params.get("reservation_id") || "";
  var root = document.getElementById("gcv-confirmacao");
  if (!root || !id) {
    if (root) root.innerHTML = "<p>" + escapeHtml(s("missing")) + "</p>";
    return;
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
        root.innerHTML = "<p>" + escapeHtml(s("loadError")) + "</p>";
        return;
      }
      var status = String(data.status || "").toUpperCase();
      var trips = Array.isArray(data.trips) ? data.trips : [];
      if (status !== "PAID") {
        root.innerHTML =
          '<div class="gcv-confirmacao__hero">' +
          '<p class="gcv-confirmacao__icon" aria-hidden="true">⏳</p>' +
          "<h1>" +
          escapeHtml(s("pendingTitle")) +
          "</h1>" +
          "<p>" +
          escapeHtml(s("code")) +
          ": <strong>" +
          escapeHtml(id) +
          "</strong></p>" +
          "<p>" +
          escapeHtml(s("status")) +
          ": <strong>" +
          escapeHtml(status || "PENDING") +
          "</strong></p>" +
          '<p class="gcv-confirmacao__note">' +
          escapeHtml(s("pendingNote")) +
          "</p>" +
          '<p><a href="' +
          escapeHtml(consultarUrl(id)) +
          '">' +
          escapeHtml(s("lookup")) +
          "</a> · " +
          '<a href="' +
          escapeHtml(homeExcUrl()) +
          '">' +
          escapeHtml(s("backExc")) +
          "</a></p></div>";
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
          ? window.GcvReservaVoucher.normalizeFromPixStatus(data, id)
          : null;

      var html =
        '<div class="gcv-confirmacao__hero">' +
        '<p class="gcv-confirmacao__icon" aria-hidden="true">✅</p>' +
        "<h1>" +
        escapeHtml(s("confirmedTitle")) +
        "</h1>";
      if (voucherData && window.GcvReservaVoucher && typeof window.GcvReservaVoucher.inlineSummaryHtml === "function") {
        html += window.GcvReservaVoucher.inlineSummaryHtml(voucherData, loc);
      } else {
        html +=
          "<p>" +
          escapeHtml(s("code")) +
          ": <strong>" +
          escapeHtml(id) +
          "</strong></p>" +
          "<p>" +
          escapeHtml(s("status")) +
          ": <strong>" +
          escapeHtml(s("confirmedStatus")) +
          "</strong></p>";
        if (data.amount != null) {
          html +=
            "<p>" +
            escapeHtml(s("amount")) +
            ": <strong>R$ " +
            Number(data.amount).toFixed(2).replace(".", ",") +
            "</strong></p>";
        }
      }
      html += "</div>";
      if (!voucherData && trips.length) {
        html += "<h2>" + escapeHtml(s("trips")) + "</h2><ul class=\"gcv-confirmacao__list\">";
        trips.forEach(function (t) {
          html +=
            "<li>" +
            escapeHtml(
              [t.dateLabel || t.dateShort, t.destino, t.qty ? t.qty + " " + s("person") : ""]
                .filter(Boolean)
                .join(" · "),
            ) +
            "</li>";
        });
        html += "</ul>";
      }
      html +=
        '<p class="gcv-confirmacao__note">' +
        escapeHtml(s("note")) +
        "</p>" +
        '<p><a href="' +
        escapeHtml(consultarUrl(id)) +
        '">' +
        escapeHtml(s("lookup")) +
        "</a> · " +
        '<a href="' +
        escapeHtml(homeExcUrl()) +
        '">' +
        escapeHtml(s("backExc")) +
        "</a></p>";
      root.innerHTML = html;

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
      root.innerHTML = "<p>" + escapeHtml(s("fetchError")) + "</p>";
    });
})();

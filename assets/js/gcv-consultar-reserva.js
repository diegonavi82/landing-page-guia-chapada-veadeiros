/**
 * Consulta de reserva Pix — widget reutilizável (home + consultar-reserva.html).
 */
(function () {
  "use strict";

  var WHATSAPP_PHONE = "5562982506891";
  var WHATSAPP_DISPLAY = "+55 62 98250-6891";

  var STRINGS = {
    pt: {
      statusPENDING: "Aguardando pagamento",
      statusPAID: "Pagamento confirmado",
      statusEXPIRED: "Pix expirado",
      notFound: "Reserva não encontrada. Verifique o código e tente novamente.",
      emailMismatch: "E-mail não confere com esta reserva.",
      error: "Não foi possível consultar. Tente novamente.",
      serviceError: "Serviço indisponível. Recarregue a página ou tente em instantes.",
      recoverSent: "Código enviado por e-mail.",
      recoverNotFound:
        "Não há reserva para este e-mail. Envie seu comprovante de pagamento para {{link}} para receber informações de sua reserva.",
      recoverError: "Não foi possível enviar agora. Tente novamente.",
      recoverToggle: "Não sei meu código — enviar por e-mail",
      recoverBack: "Tenho o código",
      tripsTitle: "Passeios",
      amount: "Valor total",
      code: "Código",
      status: "Status",
      viewConfirm: "Ver página de confirmação",
      backExc: "← Voltar às excursões",
      person: "pessoa",
      people: "pessoas",
    },
    en: {
      statusPENDING: "Awaiting payment",
      statusPAID: "Payment confirmed",
      statusEXPIRED: "Pix expired",
      notFound: "Reservation not found. Check the code and try again.",
      emailMismatch: "Email does not match this reservation.",
      error: "Could not look up the reservation. Please try again.",
      serviceError: "Service unavailable. Reload the page or try again shortly.",
      recoverSent: "Code sent by email.",
      recoverNotFound:
        "There is no reservation for this email. Send your payment receipt to {{link}} to receive your reservation details.",
      recoverError: "Could not send right now. Please try again.",
      recoverToggle: "I don't know my code — email it to me",
      recoverBack: "I have the code",
      tripsTitle: "Tours",
      amount: "Total",
      code: "Code",
      status: "Status",
      viewConfirm: "Open confirmation page",
      backExc: "← Back to tours",
      person: "person",
      people: "people",
    },
    es: {
      statusPENDING: "Esperando pago",
      statusPAID: "Pago confirmado",
      statusEXPIRED: "Pix expirado",
      notFound: "Reserva no encontrada. Verifique el código e intente de nuevo.",
      emailMismatch: "El correo no coincide con esta reserva.",
      error: "No se pudo consultar. Inténtelo de nuevo.",
      serviceError: "Servicio no disponible. Recargue la página o intente de nuevo.",
      recoverSent: "Código enviado por correo.",
      recoverNotFound:
        "No hay reserva para este correo. Envíe su comprobante de pago a {{link}} para recibir información de su reserva.",
      recoverError: "No se pudo enviar ahora. Inténtelo de nuevo.",
      recoverToggle: "No sé mi código — enviar por correo",
      recoverBack: "Tengo el código",
      tripsTitle: "Paseos",
      amount: "Valor total",
      code: "Código",
      status: "Estado",
      viewConfirm: "Ver página de confirmación",
      backExc: "← Volver a las excursiones",
      person: "persona",
      people: "personas",
    },
  };

  function detectLocale() {
    var p = window.location.pathname || "";
    if (p.indexOf("/en/") >= 0) return "en";
    if (p.indexOf("/es/") >= 0) return "es";
    return "pt";
  }

  function s(loc, key) {
    var pack = STRINGS[loc] || STRINGS.pt;
    return pack[key] || STRINGS.pt[key] || "";
  }

  function recoverNotFoundHtml(loc) {
    var waText =
      loc === "en"
        ? "Hello! I would like to send my payment receipt for my reservation."
        : loc === "es"
          ? "¡Hola! Quiero enviar mi comprobante de pago de mi reserva."
          : "Olá! Gostaria de enviar o comprovante de pagamento da minha reserva.";
    var waHref = "https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodeURIComponent(waText);
    var link =
      '<a href="' +
      escapeHtml(waHref) +
      '" rel="noopener noreferrer" target="_blank">' +
      escapeHtml(WHATSAPP_DISPLAY) +
      "</a>";
    return String(s(loc, "recoverNotFound")).replace("{{link}}", link);
  }

  function apiBase() {
    if (window.location.pathname.indexOf("/en/") >= 0 || window.location.pathname.indexOf("/es/") >= 0) {
      return "../api/";
    }
    return "/api/";
  }

  function lookupApiUrl() {
    return apiBase() + "excursao-reserva/lookup.php";
  }

  function recoverApiUrl() {
    return apiBase() + "excursao-reserva/recover-by-email.php";
  }

  function confirmUrl(id, loc) {
    var base = loc === "pt" ? "confirmacao.html" : "../" + loc + "/confirmacao.html";
    if (loc !== "pt" && window.location.pathname.indexOf("/" + loc + "/") >= 0) {
      base = "confirmacao.html";
    }
    return base + "?id=" + encodeURIComponent(id);
  }

  function homeExcUrl(loc) {
    if (loc === "pt") return "index.html#excursoes-junho";
    return "../index.html#excursoes-junho";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusLabel(loc, status) {
    var st = String(status || "").toUpperCase();
    if (st === "PAID") return s(loc, "statusPAID");
    if (st === "EXPIRED") return s(loc, "statusEXPIRED");
    return s(loc, "statusPENDING");
  }

  function statusIcon(status) {
    var st = String(status || "").toUpperCase();
    if (st === "PAID") return "✅";
    if (st === "EXPIRED") return "⏱";
    return "⏳";
  }

  function formatBrl(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = 0;
    return "R$ " + v.toFixed(2).replace(".", ",");
  }

  function saveCodeToStorage(code, email) {
    if (!window.GcvPixReceipt || typeof window.GcvPixReceipt.saveReservationCode !== "function") return;
    window.GcvPixReceipt.saveReservationCode(code, email ? { email: email } : undefined);
  }

  function bindCodeAutosave(codeInput, emailInput) {
    if (!codeInput || codeInput._gcvCodeAutosaveBound) return;
    codeInput._gcvCodeAutosaveBound = true;
    codeInput.addEventListener("input", function () {
      var v = String(codeInput.value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "");
      if (codeInput.value !== v) codeInput.value = v;
    });
    codeInput.addEventListener("blur", function () {
      var code = codeInput.value;
      var email = emailInput ? String(emailInput.value || "").trim() : "";
      if (window.GcvPixReceipt && window.GcvPixReceipt.isValidReservationCode(code)) {
        saveCodeToStorage(code, email);
      }
    });
  }

  function prefillLookupForm(lookupForm, preCode, preEmail) {
    var codeInput = lookupForm.querySelector('[name="code"]');
    var emailInput = lookupForm.querySelector('[name="email"]');
    var code = preCode ? String(preCode).toUpperCase() : "";
    if (codeInput && code) codeInput.value = code;

    var email = preEmail ? String(preEmail).trim() : "";
    if (!email && code && window.GcvPixReceipt && typeof window.GcvPixReceipt.getSavedEmailForCode === "function") {
      email = window.GcvPixReceipt.getSavedEmailForCode(code);
    }
    if (!email && window.GcvPixReceipt && typeof window.GcvPixReceipt.readSavedEmail === "function") {
      email = window.GcvPixReceipt.readSavedEmail();
    }
    if (emailInput && email) emailInput.value = email;
  }

  function renderResult(data, loc) {
    var status = String(data.status || "PENDING").toUpperCase();
    var trips = Array.isArray(data.trips) ? data.trips : [];
    var html =
      '<div class="gcv-reserva-result gcv-reserva-result--' +
      escapeHtml(status.toLowerCase()) +
      '">' +
      '<div class="gcv-reserva-result__hero">' +
      '<p class="gcv-reserva-result__icon" aria-hidden="true">' +
      statusIcon(status) +
      "</p>" +
      "<h2>" +
      escapeHtml(statusLabel(loc, status)) +
      "</h2>" +
      "<p><strong>" +
      escapeHtml(s(loc, "code")) +
      ":</strong> " +
      escapeHtml(data.reservation_id || "") +
      "</p>";

    if (data.amount != null) {
      html +=
        "<p><strong>" +
        escapeHtml(s(loc, "amount")) +
        ":</strong> " +
        escapeHtml(formatBrl(data.amount)) +
        "</p>";
    }

    html += "</div>";

    if (trips.length) {
      html += '<h3 class="gcv-reserva-result__subtitle">' + escapeHtml(s(loc, "tripsTitle")) + "</h3>";
      html += '<ul class="gcv-reserva-result__list">';
      trips.forEach(function (t) {
        var qty = parseInt(String(t.qty), 10) || 1;
        var qtyLabel = qty === 1 ? s(loc, "person") : s(loc, "people");
        html +=
          "<li>" +
          escapeHtml(
            [t.dateLabel || t.dateShort, t.destino, t.embarque ? "Embarque: " + t.embarque : "", qty + " " + qtyLabel]
              .filter(Boolean)
              .join(" · "),
          ) +
          "</li>";
      });
      html += "</ul>";
    }

    html +=
      '<p class="gcv-reserva-result__actions">' +
      '<a class="gcv-reserva-btn" href="' +
      escapeHtml(confirmUrl(data.reservation_id, loc)) +
      '">' +
      escapeHtml(s(loc, "viewConfirm")) +
      "</a> " +
      '<a class="gcv-reserva-link" href="' +
      escapeHtml(homeExcUrl(loc)) +
      '">' +
      escapeHtml(s(loc, "backExc")) +
      "</a></p></div>";

    return html;
  }

  function setRecoverMode(root, loc, showRecover) {
    var lookupForm = root.querySelector("[data-gcv-reserva-form-lookup]");
    var recoverForm = root.querySelector("[data-gcv-reserva-form-recover]");
    var toggleBtn = root.querySelector("[data-gcv-reserva-toggle-recover]");
    if (lookupForm) lookupForm.hidden = !!showRecover;
    if (recoverForm) recoverForm.hidden = !showRecover;
    if (toggleBtn) {
      toggleBtn.textContent = showRecover ? s(loc, "recoverBack") : s(loc, "recoverToggle");
      toggleBtn.setAttribute("aria-expanded", showRecover ? "true" : "false");
    }
    root.classList.toggle("gcv-reserva-lookup--recover", !!showRecover);
  }

  var lastLookupByRoot = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function storeLookupResult(root, body) {
    if (lastLookupByRoot) lastLookupByRoot.set(root, body);
    else root._gcvLastLookup = body;
  }

  function getLookupResult(root, code) {
    var body = lastLookupByRoot ? lastLookupByRoot.get(root) : root._gcvLastLookup;
    if (!body) return null;
    if (code && String(body.reservation_id || "").toUpperCase() !== String(code).toUpperCase()) return null;
    return body;
  }

  function openVoucherPopup(body, loc) {
    if (!window.GcvReservaVoucher || typeof window.GcvReservaVoucher.openModal !== "function") return;
    var data = window.GcvReservaVoucher.normalizeFromLookup(body, loc);
    if (data) window.GcvReservaVoucher.openModal(data, loc);
  }

  function performLookup(root, lookupForm, loc, code, email) {
    var result = root.querySelector("[data-gcv-reserva-result]");
    code = String(code || "")
      .trim()
      .toUpperCase();
    email = String(email || "").trim();
    if (window.GcvPixReceipt && window.GcvPixReceipt.isValidReservationCode(code)) {
      saveCodeToStorage(code, email);
    }
    var submitBtn = lookupForm.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    if (result) result.innerHTML = '<p class="gcv-reserva-loading">…</p>';

    return fetch(lookupApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ reservation_id: code, email: email }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
      })
      .then(function (pack) {
        var body = pack.body || {};
        if (body.ok) {
          saveCodeToStorage(code, email);
          if (window.GcvExcBookings && typeof window.GcvExcBookings.recordTripsForReservation === "function") {
            window.GcvExcBookings.recordTripsForReservation(
              body.reservation_id,
              (body.trips || []).map(function (t) {
                return { cartId: t.cartId, qty: t.qty };
              }),
            );
          }
          storeLookupResult(root, body);
          if (result) {
            if (window.GcvReservaVoucher && typeof window.GcvReservaVoucher.inlineSummaryHtml === "function") {
              result.innerHTML = window.GcvReservaVoucher.inlineSummaryHtml(
                window.GcvReservaVoucher.normalizeFromLookup(body, loc),
                loc,
              );
            } else {
              result.innerHTML = renderResult(body, loc);
            }
          }
          openVoucherPopup(body, loc);
          return;
        }
        var msg = s(loc, "error");
        if (pack.status === 404 || body.message === "Not found") msg = s(loc, "notFound");
        else if (pack.status === 403 || body.message === "Email does not match this reservation") {
          msg = s(loc, "emailMismatch");
        } else if (body.message === "Invalid reservation code") msg = s(loc, "notFound");
        else if (body.error && String(body.error).indexOf("implementado") >= 0) {
          msg = s(loc, "serviceError");
        }
        if (result) {
          result.innerHTML = '<p class="gcv-reserva-error" role="alert">' + escapeHtml(msg) + "</p>";
        }
      })
      .catch(function () {
        if (result) {
          result.innerHTML =
            '<p class="gcv-reserva-error" role="alert">' + escapeHtml(s(loc, "error")) + "</p>";
        }
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  }

  function stripAutoLookupParams() {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete("email");
      url.searchParams.delete("auto");
      var qs = url.searchParams.toString();
      window.history.replaceState({}, "", url.pathname + (qs ? "?" + qs : "") + url.hash);
    } catch (_err) {
      /* ignore */
    }
  }

  function initWidget(root) {
    if (!root || root._gcvReservaBound) return;
    root._gcvReservaBound = true;

    var loc = root.getAttribute("data-locale") || detectLocale();
    if (loc !== "en" && loc !== "es") loc = "pt";

    var lookupForm = root.querySelector("[data-gcv-reserva-form-lookup]");
    var recoverForm = root.querySelector("[data-gcv-reserva-form-recover]");
    var toggleBtn = root.querySelector("[data-gcv-reserva-toggle-recover]");
    var result = root.querySelector("[data-gcv-reserva-result]");

    if (window.GcvReservaVoucher && typeof window.GcvReservaVoucher.bindInlineButtons === "function") {
      window.GcvReservaVoucher.bindInlineButtons(root, loc, function (code) {
        var body = getLookupResult(root, code);
        return body && window.GcvReservaVoucher.normalizeFromLookup(body, loc);
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        var showingRecover = !root.classList.contains("gcv-reserva-lookup--recover");
        setRecoverMode(root, loc, showingRecover);
        if (result) result.innerHTML = "";
      });
    }

    if (lookupForm) {
      var codeField = lookupForm.querySelector('[name="code"]');
      var emailField = lookupForm.querySelector('[name="email"]');
      bindCodeAutosave(codeField, emailField);
    }

    if (lookupForm) {
      lookupForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var codeInput = lookupForm.querySelector('[name="code"]');
        var emailInput = lookupForm.querySelector('[name="email"]');
        performLookup(
          root,
          lookupForm,
          loc,
          codeInput ? codeInput.value : "",
          emailInput ? emailInput.value : "",
        );
      });
    }

    if (recoverForm) {
      recoverForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var emailInput = recoverForm.querySelector('[name="email"]');
        var email = emailInput ? String(emailInput.value || "").trim() : "";
        var submitBtn = recoverForm.querySelector('[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        if (result) result.innerHTML = '<p class="gcv-reserva-loading">…</p>';

        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var timeoutId = null;
        if (controller) {
          timeoutId = window.setTimeout(function () {
            try {
              controller.abort();
            } catch (_err) {
              /* ignore */
            }
          }, 20000);
        }

        fetch(recoverApiUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: email, locale: loc }),
          signal: controller ? controller.signal : undefined,
        })
          .then(function (res) {
            return res.json().then(function (body) {
              return { ok: res.ok, body: body };
            });
          })
          .then(function (pack) {
            if (pack.ok && pack.body && pack.body.ok) {
              if (result) {
                if (pack.body.found === true) {
                  if (email && window.GcvPixReceipt && typeof window.GcvPixReceipt.saveEmail === "function") {
                    window.GcvPixReceipt.saveEmail(email);
                  }
                  result.innerHTML =
                    '<p class="gcv-reserva-result gcv-reserva-result--sent">' +
                    escapeHtml(s(loc, "recoverSent")) +
                    "</p>";
                  return;
                }
                result.innerHTML =
                  '<p class="gcv-reserva-error" role="alert">' + recoverNotFoundHtml(loc) + "</p>";
              }
              return;
            }
            if (result) {
              result.innerHTML =
                '<p class="gcv-reserva-error" role="alert">' + escapeHtml(s(loc, "recoverError")) + "</p>";
            }
          })
          .catch(function () {
            if (result) {
              result.innerHTML =
                '<p class="gcv-reserva-error" role="alert">' + escapeHtml(s(loc, "recoverError")) + "</p>";
            }
          })
          .finally(function () {
            if (timeoutId) window.clearTimeout(timeoutId);
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    }

    var params = new URLSearchParams(window.location.search);
    var preCode = params.get("id") || params.get("code") || "";
    var preEmail = params.get("email") || "";
    if (lookupForm) {
      prefillLookupForm(lookupForm, preCode, preEmail);
      if (preCode && preEmail) {
        performLookup(root, lookupForm, loc, preCode, preEmail);
        stripAutoLookupParams();
      }
    }
  }

  function initAll() {
    document.querySelectorAll("[data-gcv-reserva-lookup]").forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

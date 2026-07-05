/**
 * Lista de espera — avise-me quando abrir vaga em passeio lotado.
 */
(function (global) {
  "use strict";

  var STORAGE_EMAIL = "gcv-receipt-email";
  var STORAGE_WAITLIST = "gcv-exc-waitlist-local";
  var _vagasSnapshot = null;
  var _snapshotReady = false;

  var STRINGS = {
    pt: {
      waitlistBtn: "Avise-me se abrir vaga",
      modalTitle: "Avise-me se abrir vaga",
      modalLead: "Informe seu e-mail. Se houver desistência ou liberar vaga, avisamos na hora.",
      emailLabel: "Seu e-mail",
      emailPlaceholder: "seu@email.com",
      submit: "Quero ser avisado",
      close: "Fechar",
      sending: "Salvando…",
      success: "Pronto! Avisaremos em {{email}} se abrir vaga.",
      error: "Não foi possível salvar. Tente novamente.",
      invalidEmail: "Informe um e-mail válido.",
    },
    en: {
      waitlistBtn: "Notify me if a spot opens",
      modalTitle: "Notify me if a spot opens",
      modalLead: "Enter your email. If someone cancels or a spot opens, we'll let you know.",
      emailLabel: "Your email",
      emailPlaceholder: "you@email.com",
      submit: "Notify me",
      close: "Close",
      sending: "Saving…",
      success: "Done! We'll email {{email}} if a spot opens.",
      error: "Could not save. Please try again.",
      invalidEmail: "Enter a valid email.",
    },
    es: {
      waitlistBtn: "Avísame si se libera plaza",
      modalTitle: "Avísame si se libera plaza",
      modalLead: "Indica tu correo. Si hay desistencia o se libera plaza, te avisamos.",
      emailLabel: "Tu correo",
      emailPlaceholder: "tu@correo.com",
      submit: "Quiero aviso",
      close: "Cerrar",
      sending: "Guardando…",
      success: "¡Listo! Te avisaremos en {{email}} si se libera plaza.",
      error: "No se pudo guardar. Inténtalo de nuevo.",
      invalidEmail: "Indica un correo válido.",
    },
  };

  function rs(locale, key) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    return (STRINGS[loc] && STRINGS[loc][key]) || STRINGS.pt[key] || key;
  }

  function tpl(str, vars) {
    return String(str || "").replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars && vars[k] != null ? String(vars[k]) : "";
    });
  }

  function apiUrl(path) {
    var base = "/api/";
    if (global.location.pathname.indexOf("/en/") >= 0 || global.location.pathname.indexOf("/es/") >= 0) {
      base = "../api/";
    }
    return base + path.replace(/^\//, "");
  }

  function readSavedEmail() {
    try {
      return global.localStorage.getItem(STORAGE_EMAIL) || "";
    } catch (err) {
      return "";
    }
  }

  function saveEmail(email) {
    try {
      global.localStorage.setItem(STORAGE_EMAIL, email);
    } catch (err) {
      /* */
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function ensureModal() {
    var modal = document.getElementById("gcv-waitlist-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "gcv-waitlist-modal";
    modal.className = "gcv-waitlist-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "gcv-waitlist-modal-title");
    modal.innerHTML =
      '<button type="button" class="gcv-waitlist-modal__backdrop" data-gcv-waitlist-close aria-label=""></button>' +
      '<div class="gcv-waitlist-modal__panel">' +
      '<button type="button" class="gcv-waitlist-modal__close" data-gcv-waitlist-close aria-label="">×</button>' +
      '<p class="gcv-waitlist-modal__icon" aria-hidden="true"><i class="ti ti-bell-ringing"></i></p>' +
      '<h2 id="gcv-waitlist-modal-title" class="gcv-waitlist-modal__title"></h2>' +
      '<p class="gcv-waitlist-modal__lead"></p>' +
      '<p class="gcv-waitlist-modal__trip" hidden></p>' +
      '<label class="gcv-waitlist-modal__label" for="gcv-waitlist-email"></label>' +
      '<input type="email" class="gcv-waitlist-modal__email" id="gcv-waitlist-email" autocomplete="email" inputmode="email" />' +
      '<button type="button" class="gcv-waitlist-modal__submit" data-gcv-waitlist-submit></button>' +
      '<p class="gcv-waitlist-modal__status" id="gcv-waitlist-status" hidden></p>' +
      "</div>";
    document.body.appendChild(modal);

    if (!modal._gcvWaitlistBound) {
      modal._gcvWaitlistBound = true;
      modal.addEventListener("click", function (e) {
        if (e.target.closest("[data-gcv-waitlist-close]")) {
          closeModal(modal);
          return;
        }
        if (e.target.closest("[data-gcv-waitlist-submit]")) {
          submitModal(modal);
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
          closeModal(modal);
        }
      });
    }

    return modal;
  }

  function applyModalStrings(modal, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    modal._gcvWaitlistLocale = loc;
    var title = modal.querySelector(".gcv-waitlist-modal__title");
    var lead = modal.querySelector(".gcv-waitlist-modal__lead");
    var label = modal.querySelector(".gcv-waitlist-modal__label");
    var input = modal.querySelector("#gcv-waitlist-email");
    var submit = modal.querySelector("[data-gcv-waitlist-submit]");
    var closeBtns = modal.querySelectorAll("[data-gcv-waitlist-close]");
    if (title) title.textContent = rs(loc, "modalTitle");
    if (lead) lead.textContent = rs(loc, "modalLead");
    if (label) label.textContent = rs(loc, "emailLabel");
    if (input) input.placeholder = rs(loc, "emailPlaceholder");
    if (submit) submit.textContent = rs(loc, "submit");
    closeBtns.forEach(function (btn) {
      btn.setAttribute("aria-label", rs(loc, "close"));
    });
  }

  function setStatus(modal, text, kind) {
    var el = modal.querySelector("#gcv-waitlist-status");
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.classList.remove("gcv-waitlist-modal__status--ok", "gcv-waitlist-modal__status--err");
    if (kind === "ok") el.classList.add("gcv-waitlist-modal__status--ok");
    if (kind === "err") el.classList.add("gcv-waitlist-modal__status--err");
  }

  function openModal(trip) {
    var modal = ensureModal();
    var loc = (trip && trip.locale) || "pt";
    applyModalStrings(modal, loc);
    modal._gcvWaitlistTrip = trip || {};
    modal._gcvWaitlistTrigger = trip && trip.trigger;

    var tripEl = modal.querySelector(".gcv-waitlist-modal__trip");
    if (tripEl) {
      var line = [trip.dateLabel, trip.destino].filter(Boolean).join(" · ");
      if (line) {
        tripEl.textContent = line;
        tripEl.hidden = false;
      } else {
        tripEl.hidden = true;
        tripEl.textContent = "";
      }
    }

    var input = modal.querySelector("#gcv-waitlist-email");
    if (input) {
      input.value = readSavedEmail();
      setStatus(modal, "", "");
    }

    modal.hidden = false;
    modal.classList.add("is-open");
    document.documentElement.classList.add("gcv-waitlist-modal-open");
    if (input && typeof input.focus === "function") {
      global.setTimeout(function () {
        input.focus();
      }, 50);
    }
  }

  function closeModal(modal) {
    if (!modal) modal = document.getElementById("gcv-waitlist-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove("is-open");
    document.documentElement.classList.remove("gcv-waitlist-modal-open");
    var trigger = modal._gcvWaitlistTrigger;
    if (trigger && typeof trigger.focus === "function") {
      try {
        trigger.focus();
      } catch (err) {
        /* */
      }
    }
    modal._gcvWaitlistTrigger = null;
  }

  function saveWaitlistLocal(cartId, entry) {
    if (!cartId || !entry || !entry.email) return false;
    try {
      var all = JSON.parse(global.localStorage.getItem(STORAGE_WAITLIST) || "{}");
      if (!all || typeof all !== "object") all = {};
      var rows = Array.isArray(all[cartId]) ? all[cartId] : [];
      var email = String(entry.email).trim().toLowerCase();
      if (!rows.some(function (r) {
        return r && String(r.email || "").toLowerCase() === email;
      })) {
        rows.push({
          email: email,
          locale: entry.locale || "pt",
          destino: entry.destino || "",
          date_label: entry.date_label || "",
          date_iso: entry.date_iso || "",
          created_at: new Date().toISOString(),
        });
      }
      all[cartId] = rows;
      global.localStorage.setItem(STORAGE_WAITLIST, JSON.stringify(all));
      return true;
    } catch (err) {
      return false;
    }
  }

  function registerWaitlist(payload) {
    return global
      .fetch(apiUrl("excursao-waitlist/register.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload || {}),
      })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return { ok: false };
          })
          .then(function (data) {
            if (data && data.ok) {
              return { ok: true, source: "api" };
            }
            if (saveWaitlistLocal(String((payload && payload.cart_id) || ""), payload || {})) {
              return { ok: true, source: "local" };
            }
            return { ok: false, message: (data && data.message) || "" };
          });
      })
      .catch(function () {
        if (saveWaitlistLocal(String((payload && payload.cart_id) || ""), payload || {})) {
          return { ok: true, source: "local" };
        }
        return { ok: false };
      });
  }

  function notifyWaitlistOpen(cartId, vagasAvailable) {
    if (!cartId || vagasAvailable < 1) return Promise.resolve();
    return global
      .fetch(apiUrl("excursao-waitlist/notify.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ cart_id: cartId, vagas_available: vagasAvailable }),
      })
      .catch(function () {
        /* silencioso */
      });
  }

  function submitModal(modal) {
    var trip = modal._gcvWaitlistTrip || {};
    var loc = modal._gcvWaitlistLocale || "pt";
    var input = modal.querySelector("#gcv-waitlist-email");
    var submit = modal.querySelector("[data-gcv-waitlist-submit]");
    var email = input ? String(input.value || "").trim() : "";

    if (!isValidEmail(email)) {
      setStatus(modal, rs(loc, "invalidEmail"), "err");
      if (input && typeof input.focus === "function") input.focus();
      return;
    }

    saveEmail(email);
    setStatus(modal, rs(loc, "sending"), "");
    if (submit) submit.disabled = true;

    registerWaitlist({
      email: email,
      cart_id: trip.cartId,
      locale: loc,
      destino: trip.destino || "",
      date_label: trip.dateLabel || "",
      date_iso: trip.dateIso || "",
    })
      .then(function (result) {
        if (result && result.ok) {
          setStatus(modal, tpl(rs(loc, "success"), { email: email }), "ok");
          global.setTimeout(function () {
            closeModal(modal);
          }, 1800);
        } else {
          setStatus(modal, rs(loc, "error"), "err");
        }
      })
      .finally(function () {
        if (submit) submit.disabled = false;
      });
  }

  function checkRowsForOpenedSpots(rows, cartIdFn, vagasFn) {
    var map = {};
    (rows || []).forEach(function (e) {
      if (!e || typeof cartIdFn !== "function" || typeof vagasFn !== "function") return;
      var id = cartIdFn(e);
      if (id) map[id] = Math.max(0, vagasFn(e));
    });

    if (!_snapshotReady) {
      _vagasSnapshot = map;
      _snapshotReady = true;
      return;
    }

    var prev = _vagasSnapshot || {};
    Object.keys(map).forEach(function (cartId) {
      var was = prev[cartId];
      var now = map[cartId];
      if (was === 0 && now > 0) {
        notifyWaitlistOpen(cartId, now);
      }
    });
    _vagasSnapshot = map;
  }

  global.GcvExcWaitlist = {
    STRINGS: STRINGS,
    rs: rs,
    openModal: openModal,
    closeModal: closeModal,
    registerWaitlist: registerWaitlist,
    notifyWaitlistOpen: notifyWaitlistOpen,
    checkRowsForOpenedSpots: checkRowsForOpenedSpots,
    isValidEmail: isValidEmail,
  };
})(typeof window !== "undefined" ? window : globalThis);

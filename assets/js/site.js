(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function initHeroCarousel() {
    try {
      bootHeroCarousel();
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error("[gcv-hero]", err);
    }
  }

  function bootHeroCarousel() {
    var root = document.querySelector("[data-gcv-hero]");
    if (!root) return;

    var slides = root.querySelectorAll("[data-gcv-hero-slide]");
    var dots = root.querySelectorAll("[data-gcv-hero-dot]");
    var n = slides.length;
    if (!n) return;

    var idx = 0;
    var timer = null;
    var bgTimer = null;
    var AUTO_MS = 10000;
    var reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function slideDuration(i) {
      var el = slides[i];
      if (!el) return AUTO_MS;
      var custom = parseInt(el.getAttribute("data-gcv-hero-duration"), 10);
      return custom > 0 ? custom : AUTO_MS;
    }

    function restartPetzenAnim(slide) {
      if (!slide || !slide.classList.contains("gcv-hero__slide--petzen")) return;
      var anims = slide.querySelectorAll(".gcv-petzen__anim");
      anims.forEach(function (el) {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
    }

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (bgTimer) {
        clearTimeout(bgTimer);
        bgTimer = null;
      }
    }

    function resetSlideBgs(slide) {
      var pics = slide.querySelectorAll("[data-gcv-hero-bg]");
      pics.forEach(function (p, i) {
        p.classList.toggle("is-on", i === 0);
      });
    }

    function scheduleBgSwap(slide, duration) {
      var pics = slide.querySelectorAll("[data-gcv-hero-bg]");
      if (pics.length < 2 || reduceMotion) return;
      var half = Math.max(900, Math.floor(duration / pics.length));
      bgTimer = setTimeout(function () {
        pics.forEach(function (p, i) {
          p.classList.toggle("is-on", i === 1);
        });
      }, half);
    }

    function scheduleNext() {
      clearTimer();
      if (n < 2 || reduceMotion) return;
      timer = setTimeout(function () {
        show(idx + 1);
      }, slideDuration(idx));
    }

    function show(next) {
      idx = ((next % n) + n) % n;
      slides.forEach(function (s, j) {
        var active = j === idx;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
        resetSlideBgs(s);
        if (active) restartPetzenAnim(s);
      });
      scheduleBgSwap(slides[idx], slideDuration(idx));
      dots.forEach(function (d, j) {
        d.classList.toggle("is-active", j === idx);
        d.setAttribute("aria-selected", j === idx ? "true" : "false");
      });
      root.setAttribute("aria-label", "Destaque " + (idx + 1) + " de " + n);
      scheduleNext();
    }

    show(0);

    var prev = root.querySelector("[data-gcv-hero-prev]");
    var nextBtn = root.querySelector("[data-gcv-hero-next]");
    if (prev) prev.addEventListener("click", function () { show(idx - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { show(idx + 1); });

    dots.forEach(function (d, j) {
      d.addEventListener("click", function () { show(j); });
    });

    var drag = { id: -1, startX: 0, locked: false };
    var TH = 52;
    var LOCK = 14;

    function onUp(e) {
      if (drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.startX;
      try {
        root.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* */
      }
      var wasLocked = drag.locked;
      drag = { id: -1, startX: 0, locked: false };
      if (wasLocked && Math.abs(dx) >= TH) {
        show(dx < 0 ? idx + 1 : idx - 1);
      }
    }

    root.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest("button, a")) return;
      drag = { id: e.pointerId, startX: e.clientX, locked: false };
      try {
        root.setPointerCapture(e.pointerId);
      } catch (err) {
        /* */
      }
    });

    root.addEventListener("pointermove", function (e) {
      if (drag.id !== e.pointerId) return;
      if (!drag.locked && Math.abs(e.clientX - drag.startX) >= LOCK) drag.locked = true;
    });

    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimer();
      else scheduleNext();
    });
  }

  function initMapLightbox() {
    var lb = document.getElementById("gcv-map-lightbox");
    if (!lb) return;

    var openers = document.querySelectorAll("[data-gcv-map-open]");
    var closers = lb.querySelectorAll("[data-gcv-map-close]");

    function open() {
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function close() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    openers.forEach(function (b) {
      b.addEventListener("click", open);
    });
    closers.forEach(function (b) {
      b.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("is-open")) close();
    });
  }

  function initPhotoGalleryLightbox() {
    function showSlide(lb, idx) {
      var section = lb.closest("[data-gcv-attract-gallery]");
      if (!section) return;
      var tiles = section.querySelectorAll("[data-gcv-gallery-open]");
      var n = tiles.length;
      if (!n) return;
      idx = ((idx % n) + n) % n;
      lb.setAttribute("data-gcv-slide-idx", String(idx));
      var tile = tiles[idx];
      var src = tile.getAttribute("data-gcv-src") || "";
      var alt = tile.getAttribute("data-gcv-alt") || "";
      var caption = tile.getAttribute("data-gcv-caption") || "";
      var img = lb.querySelector("[data-gcv-photo-img]");
      var cap = lb.querySelector("[data-gcv-photo-caption]");
      var idxEl = lb.querySelector("[data-gcv-photo-idx]");
      var totalEl = lb.querySelector("[data-gcv-photo-total]");
      if (img) {
        img.src = src;
        img.alt = alt;
      }
      if (cap) {
        if (caption) {
          cap.textContent = caption;
          cap.hidden = false;
        } else {
          cap.textContent = "";
          cap.hidden = true;
        }
      }
      if (idxEl) idxEl.textContent = String(idx + 1);
      if (totalEl) totalEl.textContent = String(n);
    }

    function closeLb(lb) {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    document.addEventListener("keydown", function (e) {
      var openLb = document.querySelector(".gcv-photo-lightbox.is-open");
      if (!openLb) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeLb(openLb);
      } else if (e.key === "ArrowLeft") {
        var prevBtn = openLb.querySelector("[data-gcv-photo-prev]");
        if (prevBtn && prevBtn.offsetParent !== null) {
          e.preventDefault();
          var cur = parseInt(openLb.getAttribute("data-gcv-slide-idx") || "0", 10);
          showSlide(openLb, cur - 1);
        }
      } else if (e.key === "ArrowRight") {
        var nextBtn = openLb.querySelector("[data-gcv-photo-next]");
        if (nextBtn && nextBtn.offsetParent !== null) {
          e.preventDefault();
          var cur2 = parseInt(openLb.getAttribute("data-gcv-slide-idx") || "0", 10);
          showSlide(openLb, cur2 + 1);
        }
      }
    });

    document.querySelectorAll("[data-gcv-attract-gallery]").forEach(function (section) {
      var lb = section.querySelector("[data-gcv-photo-lightbox]");
      var tiles = section.querySelectorAll("[data-gcv-gallery-open]");
      if (!lb || !tiles.length) return;

      var n = tiles.length;
      var prev = lb.querySelector("[data-gcv-photo-prev]");
      var nextBtn = lb.querySelector("[data-gcv-photo-next]");
      if (n <= 1) {
        if (prev) prev.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
      }

      tiles.forEach(function (tile, i) {
        tile.addEventListener("click", function () {
          showSlide(lb, i);
          lb.classList.add("is-open");
          lb.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
        });
      });

      lb.querySelectorAll("[data-gcv-photo-close]").forEach(function (b) {
        b.addEventListener("click", function () {
          closeLb(lb);
        });
      });

      if (prev) {
        prev.addEventListener("click", function (e) {
          e.stopPropagation();
          var cur = parseInt(lb.getAttribute("data-gcv-slide-idx") || "0", 10);
          showSlide(lb, cur - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          var cur = parseInt(lb.getAttribute("data-gcv-slide-idx") || "0", 10);
          showSlide(lb, cur + 1);
        });
      }
    });
  }

  function initContactForm() {
    var form = document.getElementById("gcv-contact-form");
    if (!form) return;

    var endpoint = form.getAttribute("data-endpoint") || "";
    var locale = form.getAttribute("data-locale") || "pt";
    var acceptLanguage = form.getAttribute("data-accept-language") || "pt-BR,pt;q=0.9";
    var errPrefix = form.getAttribute("data-error-prefix") || "";
    var waPhone = (form.getAttribute("data-whatsapp-phone") || "").replace(/\D/g, "");
    var contactEmail = (form.getAttribute("data-contact-email") || "").trim();

    var sent = document.getElementById("gcv-contact-sent");
    var errEl = document.getElementById("gcv-contact-error");
    var submitBtn = form.querySelector('[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.getAttribute("data-label-submit") || "" : "";
    var submitSending = submitBtn ? submitBtn.getAttribute("data-label-sending") || "" : "";

    var sentDefaults = { title: "", line: "", thanks: "" };
    if (sent) {
      var st = sent.querySelector(".gcv-contact-sent__title");
      var sl = sent.querySelector(".gcv-contact-sent__line");
      var sth = sent.querySelector(".gcv-contact-sent__thanks");
      if (st) sentDefaults.title = st.textContent;
      if (sl) sentDefaults.line = sl.textContent;
      if (sth) sentDefaults.thanks = sth.textContent;
    }

    var bodyLabels = {
      pt: { nome: "Nome", tipo: "Assunto", email: "E-mail", tel: "WhatsApp / telefone", msg: "Mensagem" },
      en: { nome: "Name", tipo: "Subject", email: "Email", tel: "WhatsApp / phone", msg: "Message" },
      es: { nome: "Nombre", tipo: "Asunto", email: "Correo", tel: "WhatsApp / teléfono", msg: "Mensaje" },
    };

    var subjPrefix = {
      pt: "Contato — site",
      en: "Contact — website",
      es: "Contacto — web",
    };

    function selectOrcamento() {
      var tipo = document.getElementById("contato-tipo");
      if (!tipo) return;
      for (var i = 0; i < tipo.options.length; i++) {
        if (tipo.options[i].value === "orcamento") {
          tipo.selectedIndex = i;
          break;
        }
      }
    }

    function setLoading(on) {
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.textContent = on ? submitSending : submitLabel;
    }

    function showError(msg) {
      if (!errEl) return;
      errEl.textContent = msg || "";
      errEl.hidden = !msg;
    }

    function resolveLocale() {
      if (locale === "en") return "en";
      if (locale === "es") return "es";
      return "pt";
    }

    function tipoLabel(payloadTipo) {
      var sel = form.querySelector("#contato-tipo");
      if (!sel) return payloadTipo || "";
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === payloadTipo) return sel.options[i].textContent || payloadTipo || "";
      }
      return payloadTipo || "";
    }

    function buildPlainBody(L, payload, tLabel) {
      var lines = [];
      lines.push(L.nome + ": " + payload.nome);
      lines.push(L.tipo + ": " + tLabel);
      if (payload.email) lines.push(L.email + ": " + payload.email);
      if (payload.telefone) lines.push(L.tel + ": " + payload.telefone);
      lines.push("");
      lines.push(L.msg + ":");
      lines.push(payload.mensagem || "");
      return lines.join("\n");
    }

    function clipForMailto(s, maxLen) {
      if (s.length <= maxLen) return s;
      return s.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
    }

    /** Abre WhatsApp e mailto na mesma ação do utilizador (com pequeno atraso entre os dois para evitar bloqueio). */
    function openDualChannels(payload) {
      if (!waPhone || !contactEmail) return false;
      var loc = resolveLocale();
      var L = bodyLabels[loc] || bodyLabels.pt;
      var tLabel = tipoLabel(payload.tipo);
      var body = clipForMailto(buildPlainBody(L, payload, tLabel), 3500);
      var subjectRaw = clipForMailto(
        (subjPrefix[loc] || subjPrefix.pt) + ": " + tLabel + " · " + (payload.nome || "").slice(0, 120),
        220,
      );
      var mailtoHref =
        "mailto:" +
        contactEmail +
        "?subject=" +
        encodeURIComponent(subjectRaw) +
        "&body=" +
        encodeURIComponent(body);

      var waText = "*" + (subjPrefix[loc] || subjPrefix.pt) + "*\n\n" + body;
      var waHref =
        "https://wa.me/" +
        encodeURIComponent(waPhone) +
        "?text=" +
        encodeURIComponent(waText).replace(/'/g, "%27");

      function navigate(href, sameTab) {
        var a = document.createElement("a");
        a.href = href;
        if (!sameTab) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      navigate(waHref, false);
      setTimeout(function () {
        navigate(mailtoHref, true);
      }, 400);
      return true;
    }

    function applySentTexts(mode) {
      if (!sent) return;
      var st = sent.querySelector(".gcv-contact-sent__title");
      var sl = sent.querySelector(".gcv-contact-sent__line");
      var sth = sent.querySelector(".gcv-contact-sent__thanks");
      if (mode === "dual") {
        var dt = form.getAttribute("data-dual-success-title") || "";
        var dl = form.getAttribute("data-dual-success-line") || "";
        var dth = form.getAttribute("data-dual-success-thanks") || "";
        if (st) st.textContent = dt || sentDefaults.title;
        if (sl) sl.textContent = dl || sentDefaults.line;
        if (sth) sth.textContent = dth || sentDefaults.thanks;
      } else {
        if (st) st.textContent = sentDefaults.title;
        if (sl) sl.textContent = sentDefaults.line;
        if (sth) sth.textContent = sentDefaults.thanks;
      }
    }

    function showSentPanel(mode) {
      applySentTexts(mode || "api");
      form.hidden = true;
      if (sent) sent.hidden = false;
    }

    function backToForm() {
      if (sent) sent.hidden = true;
      form.hidden = false;
      form.reset();
      selectOrcamento();
      showError("");
      applySentTexts("api");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showError("");

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var fd = new FormData(form);
      var payload = {
        nome: String(fd.get("nome") || "").trim(),
        tipo: String(fd.get("tipo") || ""),
        mensagem: String(fd.get("mensagem") || "").trim(),
      };
      var em = String(fd.get("email") || "").trim();
      var tel = String(fd.get("telefone") || "").trim();
      if (em) payload.email = em;
      if (tel) payload.telefone = tel;

      var provider = String(form.getAttribute("data-contact-provider") || "")
        .trim()
        .toLowerCase();
      var web3Key = String(form.getAttribute("data-web3forms-access-key") || "").trim();
      var useWeb3Forms = provider === "web3forms" && !!web3Key;

      var url =
        endpoint + (endpoint.indexOf("?") >= 0 ? "&" : "?") + "locale=" + encodeURIComponent(locale);

      var fromFile = window.location.protocol === "file:";
      var skipApi =
        !useWeb3Forms &&
        (form.getAttribute("data-skip-contact-api") === "true" || fromFile || !(endpoint || "").trim());

      function finishDual() {
        if (!openDualChannels(payload)) {
          var locf = locale;
          showError(
            locf === "en"
              ? "Could not open channels (missing WhatsApp/email on the page)."
              : locf === "es"
                ? "No se pudieron abrir los canales (faltan WhatsApp/email en la página)."
                : "Não foi possível abrir WhatsApp e e-mail — dados de contato em falta na página.",
          );
          setLoading(false);
          return;
        }
        form.reset();
        selectOrcamento();
        showError("");
        showSentPanel("dual");
        setLoading(false);
      }

      /** Grava no MySQL via API PHP (Hostinger) sem bloquear o envio principal. */
      function saveToDatabase(payload) {
        if (!(endpoint || "").trim() || fromFile) return Promise.resolve();
        var dbUrl =
          endpoint + (endpoint.indexOf("?") >= 0 ? "&" : "?") + "locale=" + encodeURIComponent(locale);
        return fetch(dbUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Accept-Language": acceptLanguage,
          },
          body: JSON.stringify(payload),
        }).catch(function () {});
      }

      /** Web3Forms — https://docs.web3forms.com/ (ideal para HTML estático + envio por e-mail). */
      function submitWeb3Forms() {
        var locW = resolveLocale();
        var tLb = tipoLabel(payload.tipo);
        var fieldLabels = {
          pt: { assunto: "Assunto", idioma: "Idioma" },
          en: { assunto: "Subject", idioma: "Language" },
          es: { assunto: "Asunto", idioma: "Idioma" },
        };
        var fL = fieldLabels[locW] || fieldLabels.pt;
        var subjLine = clipForMailto(
          "[Guia Chapada Veadeiros] " + tLb + " — " + (payload.nome || "").slice(0, 120),
          220,
        );
        /** @type {Record<string,string|boolean>} */
        var w3 = {
          access_key: web3Key,
          name: payload.nome,
          subject: subjLine,
          message: payload.mensagem || "",
        };
        w3[fL.assunto] = tLb;
        if (payload.email) {
          w3.email = payload.email;
          w3.replyto = payload.email;
        }
        if (payload.telefone) w3.phone = payload.telefone;
        var langTag = locale === "en" ? "en" : locale === "es" ? "es-419" : "pt-BR";
        w3[fL.idioma] = langTag;

        return fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(w3),
        })
          .then(function (res) {
            return res
              .json()
              .catch(function () {
                return {};
              })
              .then(function (bj) {
                var okBiz = !!(bj && bj.success === true);
                if (okBiz) return;

                /** @type {string} */
                var detail =
                  (bj && typeof bj.message === "string" && bj.message) ||
                  (bj && bj.body && typeof bj.body.message === "string" && bj.body.message) ||
                  String(res.status);
                var dot = /\.$/.test(String(detail)) ? "" : ".";
                throw new Error(errPrefix + detail + dot);
              });
          });
      }

      if (useWeb3Forms) {
        setLoading(true);
        submitWeb3Forms()
          .then(function () {
            return saveToDatabase(payload).then(function () {
              form.reset();
              selectOrcamento();
              showError("");
              showSentPanel("api");
            });
          })
          .catch(function (err) {
            var msg = err && err.message ? String(err.message) : "";
            if (!msg) {
              var locf = resolveLocale();
              msg =
                locf === "en"
                  ? errPrefix + "Please try again or email us at " + contactEmail + "."
                  : locf === "es"
                    ? errPrefix + "Inténtalo de nuevo o escríbenos a " + contactEmail + "."
                    : errPrefix + "Tente novamente ou escreva para " + contactEmail + ".";
            }
            showError(msg);
          })
          .finally(function () {
            setLoading(false);
          });
        return;
      }

      if (skipApi) {
        setLoading(true);
        finishDual();
        return;
      }

      setLoading(true);

      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Language": acceptLanguage,
        },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (body) {
              if (!res.ok) {
                var detail = String(res.status);
                if (body && typeof body === "object") {
                  if (
                    body.error === "ValidationError" &&
                    body.details &&
                    body.details.fieldErrors
                  ) {
                    var fe = body.details.fieldErrors;
                    var keys = Object.keys(fe);
                    for (var k = 0; k < keys.length; k++) {
                      var arr = fe[keys[k]];
                      if (arr && arr[0]) {
                        detail = arr[0];
                        break;
                      }
                    }
                  } else if (typeof body.message === "string" && body.message.length) {
                    detail = body.message;
                  }
                }
                var endErr = /\.$/.test(String(detail)) ? "" : ".";
                throw new Error(errPrefix + detail + endErr);
              }
              return body;
            });
        })
        .then(function () {
          form.reset();
          selectOrcamento();
          showError("");
          showSentPanel("api");
        })
        .catch(function () {
          showError("");
          finishDual();
        })
        .finally(function () {
          setLoading(false);
        });
    });

    var clearBtn = document.getElementById("gcv-contact-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        form.reset();
        selectOrcamento();
        showError("");
      });
    }

    var sentReset = document.getElementById("gcv-contact-sent-reset");
    if (sentReset) {
      sentReset.addEventListener("click", backToForm);
    }
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function initInstagramRandomGrid() {
    var grid = document.querySelector("[data-gcv-instagram-grid][data-gcv-instagram-random]");
    if (!grid) return;

    var poolUrl = grid.getAttribute("data-gcv-instagram-pool");
    if (!poolUrl) return;

    var countDesktop = parseInt(grid.getAttribute("data-gcv-instagram-count") || "16", 10);
    if (!countDesktop || countDesktop < 1) countDesktop = 16;
    var countMobile = parseInt(grid.getAttribute("data-gcv-instagram-count-mobile") || "9", 10);
    if (!countMobile || countMobile < 1) countMobile = 9;

    var openLabel = grid.getAttribute("data-gcv-instagram-open-label") || "Abrir no Instagram";
    var assetBase = grid.getAttribute("data-gcv-instagram-asset-base") || "./assets/img/";
    var instagramIcon =
      '<svg class="gcv-instagram-logo" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';

    fetch(poolUrl, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("pool " + res.status);
        return res.json();
      })
      .then(function (data) {
        var posts = Array.isArray(data) ? data : data && Array.isArray(data.posts) ? data.posts : [];
        if (posts.length < 1) return;

        var picked = shuffleArray(posts.slice()).slice(0, Math.min(countDesktop, posts.length));
        var html = picked
          .map(function (p) {
            var permalink = String(p.permalink || p.url || "").trim();
            var image = String(p.image || p.imageRel || "").trim().replace(/^\//, "");
            var alt = String(p.alt || p.caption || "").trim() || "Publicação no Instagram — Guia Chapada Veadeiros";
            if (!permalink || !image) return "";
            var imgSrc = assetBase + image;
            return (
              '<li class="gcv-instagram-grid__cell">' +
              '<a class="gcv-instagram-grid__link" href="' +
              permalink +
              '" target="_blank" rel="noopener noreferrer" aria-label="' +
              openLabel +
              '">' +
              '<img class="gcv-instagram-grid__img" src="' +
              imgSrc +
              '" alt="' +
              alt.replace(/"/g, "&quot;") +
              '" width="400" height="400" loading="lazy" decoding="async" />' +
              '<span class="gcv-instagram-grid__shade" aria-hidden="true">' +
              instagramIcon +
              "</span>" +
              "</a></li>"
            );
          })
          .filter(Boolean)
          .join("");

        if (!html) return;
        grid.innerHTML = html;
        grid.setAttribute("data-gcv-instagram-ready", "1");
      })
      .catch(function (err) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[gcv-instagram]", err);
        }
      });
  }

  function resolvePublicAssetUrl(url) {
    if (!url) return "";
    try {
      return new URL(url, document.baseURI || window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  function initNavSearch() {
    var wrap = document.querySelector("[data-gcv-search]");
    if (!wrap) return;

    var btn = wrap.querySelector(".nav-search");
    var panel = wrap.querySelector(".nav-search-panel");
    var input = wrap.querySelector(".nav-search-input");
    var results = wrap.querySelector(".nav-search-results");
    var indexUrl = resolvePublicAssetUrl(wrap.getAttribute("data-search-index") || "");
    var locale = wrap.getAttribute("data-locale") || "pt";
    var pageOut = wrap.getAttribute("data-page-out") || "index.html";
    var noResultsText = wrap.getAttribute("data-no-results") || "Nenhuma página encontrada";

    if (!btn || !panel || !input || !results || !indexUrl) return;

    var indexData = null;
    var indexLoading = null;
    var indexLoadFailed = false;

    function loadIndex() {
      if (indexData) return Promise.resolve(indexData);
      if (indexLoadFailed) return Promise.resolve([]);
      if (indexLoading) return indexLoading;
      indexLoading = fetch(indexUrl, { credentials: "omit", cache: "default" })
        .then(function (res) {
          if (!res.ok) throw new Error("search index " + res.status);
          return res.json();
        })
        .then(function (data) {
          indexData = data && data[locale] ? data[locale] : [];
          return indexData;
        })
        .catch(function (err) {
          indexLoading = null;
          indexLoadFailed = true;
          if (typeof console !== "undefined" && console.warn) console.warn("[gcv-search]", err);
          return [];
        });
      return indexLoading;
    }

    function norm(s) {
      return String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }

    function relBetweenPaths(fromRel, toRel) {
      var fromDir = fromRel.indexOf("/") >= 0 ? fromRel.slice(0, fromRel.lastIndexOf("/")) : "";
      var fromSegs = fromDir ? fromDir.split("/") : [];
      var toSegs = toRel.split("/");
      var i = 0;
      while (i < fromSegs.length && i < toSegs.length && fromSegs[i] === toSegs[i]) i++;
      var ups = fromSegs.length - i;
      var out = [];
      for (var u = 0; u < ups; u++) out.push("..");
      for (var j = i; j < toSegs.length; j++) out.push(toSegs[j]);
      return out.length ? out.join("/") : "./";
    }

    function outRelPathLoc(loc, pathKey) {
      if (!pathKey) return loc === "pt" ? "index.html" : loc + "/index.html";
      return loc === "pt" ? pathKey : loc + "/" + pathKey;
    }

    function hrefFor(entry) {
      return relBetweenPaths(pageOut, outRelPathLoc(locale, entry.pathKey || ""));
    }

    function setOpen(open) {
      wrap.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
      if (open) {
        loadIndex().then(function () {
          input.focus();
        });
      } else {
        input.value = "";
        results.innerHTML = "";
      }
    }

    function escapeHtml(s) {
      return String(s || "").replace(/</g, "&lt;");
    }

    function snippetForQuery(text, terms) {
      var src = String(text || "").replace(/\s+/g, " ").trim();
      if (!src) return "";

      var hitAt = -1;
      var hitLen = 0;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        if (!term) continue;
        var re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        var match = src.match(re);
        if (match && match.index !== undefined && (hitAt === -1 || match.index < hitAt)) {
          hitAt = match.index;
          hitLen = match[0].length;
        }
      }

      if (hitAt === -1) {
        return src.length > 130 ? src.slice(0, 127) + "…" : src;
      }

      var start = Math.max(0, hitAt - 45);
      var end = Math.min(src.length, hitAt + hitLen + 85);
      var chunk = src.slice(start, end);
      if (start > 0) chunk = "…" + chunk;
      if (end < src.length) chunk = chunk + "…";
      return chunk;
    }

    function renderResults(items, terms) {
      if (!items.length) {
        results.innerHTML =
          '<li class="nav-search-empty" role="presentation">' + escapeHtml(noResultsText) + "</li>";
        return;
      }
      results.innerHTML = items
        .slice(0, 8)
        .map(function (entry) {
          var href = hrefFor(entry);
          var source = entry.body || entry.desc || entry.text || "";
          var subtitle = snippetForQuery(source, terms);
          return (
            '<li role="option">' +
            '<a class="nav-search-result" href="' +
            href.replace(/"/g, "&quot;") +
            '">' +
            '<span class="nav-search-result__title">' +
            escapeHtml(entry.title) +
            "</span>" +
            (subtitle ? '<span class="nav-search-result__hint">' + escapeHtml(subtitle) + "</span>" : "") +
            "</a></li>"
          );
        })
        .join("");
    }

    function search(q) {
      var query = norm(q.trim());
      if (!query) {
        results.innerHTML = "";
        return;
      }
      loadIndex().then(function (entries) {
        if (indexLoadFailed) {
          results.innerHTML =
            '<li class="nav-search-empty" role="presentation">Busca temporariamente indisponível. Recarregue a página.</li>';
          return;
        }
        var terms = query.split(/\s+/).filter(Boolean);
        var matches = entries.filter(function (entry) {
          var hay = norm(entry.text || entry.title || "");
          return terms.every(function (term) {
            return hay.indexOf(term) >= 0;
          });
        });
        matches.sort(function (a, b) {
          var aTitle = terms.some(function (term) {
            return norm(a.title).indexOf(term) >= 0;
          })
            ? 0
            : 1;
          var bTitle = terms.some(function (term) {
            return norm(b.title).indexOf(term) >= 0;
          })
            ? 0
            : 1;
          if (aTitle !== bTitle) return aTitle - bTitle;
          return String(a.title || "").localeCompare(String(b.title || ""));
        });
        renderResults(matches, terms);
      });
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!wrap.classList.contains("is-open"));
    });

    input.addEventListener("input", function () {
      search(input.value);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        setOpen(false);
        btn.focus();
      } else if (e.key === "Enter") {
        var first = results.querySelector(".nav-search-result");
        if (first) window.location.href = first.getAttribute("href");
      }
    });

    document.addEventListener("click", function (e) {
      if (!wrap.classList.contains("is-open")) return;
      if (!wrap.contains(e.target)) setOpen(false);
    });
  }

  function initHomeReviews() {
    var section = document.querySelector("[data-gcv-reviews]");
    if (!section) return;

    var grid = section.querySelector("[data-gcv-reviews-grid]");
    var poolEl = document.getElementById("gcv-reviews-pool");
    if (!grid || !poolEl) return;

    var pool;
    try {
      pool = JSON.parse(poolEl.textContent || "{}");
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error("[gcv-reviews]", err);
      return;
    }

    var reviews = Array.isArray(pool.reviews) ? pool.reviews.slice() : [];
    if (!reviews.length) return;

    var exclude = Array.isArray(pool.excludeNames) ? pool.excludeNames : ["Alan Braz"];
    reviews = reviews.filter(function (r) {
      var stars = Number(r.stars || r.rating || 0);
      if (stars !== 5) return false;
      var name = String(r.name || "").trim();
      if (!name || !String(r.quote || "").trim()) return false;
      return !exclude.some(function (n) {
        return new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(name);
      });
    });
    if (!reviews.length) return;

    var guideNames = [
      "Diego Navi Marques Carvalho",
      "Diego Navi",
      "Martina Motlová",
      "Martina Motlova",
      "Gyovanna Torres",
      "Felipe Camargo",
      "Gyovanna",
      "Martina",
      "Diego",
      "Felipe",
    ].sort(function (a, b) {
      return b.length - a.length;
    });

    function redactGuides(text) {
      var out = String(text || "");
      guideNames.forEach(function (name) {
        var re = new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
        out = out.replace(re, function (m) {
          return m.charAt(0).toUpperCase() + "...";
        });
      });
      return out;
    }

    var count = parseInt(section.getAttribute("data-gcv-reviews-count") || "3", 10);
    if (!count || count < 1) count = 3;
    count = Math.min(count, reviews.length);

    var label = section.getAttribute("data-gcv-reviews-label") || "Google review · 5 stars";
    var assetBase = section.getAttribute("data-gcv-reviews-asset-base") || "./assets/img/";

    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function pickRandom(list, n) {
      var copy = list.slice();
      var out = [];
      for (var i = 0; i < n && copy.length; i++) {
        var idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    }

    function cardHtml(r) {
      var quote = redactGuides(String(r.quote || "").trim());
      var img = r.image ? String(r.image).trim() : "";
      var tour = r.tour ? String(r.tour).trim() : "";
      var avatar = img
        ? '<div class="gcv-review-card__avatar"><img src="' +
          escapeHtml(assetBase + img) +
          '" alt="" width="80" height="80" loading="lazy" decoding="async" /></div>'
        : '<div class="gcv-review-card__avatar gcv-review-card__avatar--fallback" aria-hidden="true">' +
          escapeHtml(String(r.name || "?").charAt(0)) +
          "</div>";
      return (
        '<article class="gcv-review-card">' +
        '<div class="gcv-review-card__head">' +
        avatar +
        '<div class="gcv-review-card__meta">' +
        '<p class="gcv-review-card__stars" aria-hidden="true">★★★★★</p>' +
        "<h3 class=\"gcv-review-card__name\">" +
        escapeHtml(r.name) +
        "</h3>" +
        '<p class="gcv-review-card__city">' +
        escapeHtml(label) +
        "</p>" +
        (tour ? '<p class="gcv-review-card__tour">' + escapeHtml(tour) + "</p>" : "") +
        "</div></div>" +
        '<blockquote class="gcv-review-card__quote"><span class="gcv-review-card__quo">“</span>' +
        escapeHtml(quote) +
        '<span class="gcv-review-card__quo">”</span></blockquote></article>'
      );
    }

    var picked = pickRandom(reviews, count);
    grid.innerHTML = picked.map(cardHtml).join("\n");
  }

  function initPasseiosPublicos() {
    // Preço por atrativo ainda não está definido. Só a próxima saída pode ir para o carrinho.
    return;
    if (!/\/atrativos\//.test(window.location.pathname)) return;
    var file = window.location.pathname.split("/").pop() || "";
    var slug = file.replace(/\.html$/, "");
    if (!slug) return;
    var lang = window.location.pathname.indexOf("/en/") >= 0 ? "en" : (window.location.pathname.indexOf("/es/") >= 0 ? "es" : "pt");
    var copy = passeioCopy(lang);
    fetch("/api/passeios.php?slug=" + encodeURIComponent(slug))
      .then(function (res) { return res.json(); })
      .then(function (payload) {
        if (!payload || !payload.ok || !payload.data || !payload.data.tarifa) return;
        var data = payload.data;
        var box = document.createElement("section");
        box.className = "gcv-passeios";
        box.innerHTML = passeioBuilderHtml(copy, data);
        var title = document.querySelector(".gcv-detail-title");
        var related = document.querySelector(".gcv-related");
        if (title && title.parentNode) title.parentNode.insertBefore(box, title.nextSibling);
        else if (related && related.parentNode) related.parentNode.insertBefore(box, related);
        else (document.querySelector("main") || document.body).appendChild(box);
        bindPasseioBuilder(box, copy, data);
      })
      .catch(function () {});
  }

  function passeioCopy(lang) {
    var all = {
      pt: {
        title: "Meu roteiro",
        hint: "",
        date: "Data",
        people: "Pessoas",
        city: "Saindo de qual cidade?",
        mode: "Modalidade",
        group: "Excursão",
        private: "Privativo",
        transport: "Transporte",
        withRide: "Com translado",
        withoutRide: "Sem translado",
        from: "De",
        person: "pessoa",
        peopleWord: "pessoas",
        guideLead: "Reserve um lugar para o guia. Ele vai no carro de vocês.",
        guideRest: "Com {people}, o grupo precisa de {cars}.",
        car: "carro",
        cars: "carros",
        duration: "Duração",
        durationOf: "Duração de",
        hourExact: "hs",
        total: "Total",
        add: "Adicionar ao carrinho",
        addedBtn: "Adicionado",
        fail: "Não entrou no carrinho. Escolha uma data futura.",
        sameDay: "Você já escolheu um passeio para este dia. Remova-o para escolher outro.",
        max: "O roteiro tem no máximo 3 atrativos.",
        sameDayTitle: "Adicione no mesmo dia",
        sameDayHint: "Até {n} atrativos no mesmo dia, num só passeio.",
        only: "Só {name}",
        needMore: "Este atrativo só vai junto com mais um. Escolha o outro para fechar o passeio.",
        perPerson: "por pessoa",
        leaving: "saindo de",
        noPrice: "Este passeio ainda não está à venda.",
        dayTaken: "Você já tem um passeio no carrinho nesta data. Escolha outra data.",
      },
      en: {
        title: "My itinerary",
        hint: "",
        date: "Date",
        people: "People",
        city: "Leaving from which city?",
        mode: "Type",
        group: "Group",
        private: "Private",
        transport: "Transport",
        withRide: "With transfer",
        withoutRide: "Without transfer",
        from: "From",
        person: "person",
        peopleWord: "people",
        guideLead: "Save a seat for the guide. They ride in your car.",
        guideRest: "With {people}, the group needs {cars}.",
        car: "car",
        cars: "cars",
        duration: "Duration",
        durationOf: "Duration of",
        hourExact: "h",
        total: "Total",
        add: "Add to cart",
        addedBtn: "Added",
        fail: "It was not added. Pick a future date.",
        sameDay: "You already chose a tour for this day. Remove it to pick another.",
        max: "An itinerary has at most 3 places.",
        sameDayTitle: "Add on the same day",
        sameDayHint: "Up to {n} places on the same day, in one tour.",
        only: "Only {name}",
        needMore: "This place only goes together with one more. Pick the other one to complete the tour.",
        perPerson: "per person",
        leaving: "leaving from",
        noPrice: "This tour is not on sale yet.",
        dayTaken: "You already have a tour in your cart on this date. Pick another date.",
      },
      es: {
        title: "Mi itinerario",
        hint: "",
        date: "Fecha",
        people: "Personas",
        city: "¿Saliendo de qué ciudad?",
        mode: "Modalidad",
        group: "En grupo",
        private: "Privado",
        transport: "Transporte",
        withRide: "Con traslado",
        withoutRide: "Sin traslado",
        from: "Desde",
        person: "persona",
        peopleWord: "personas",
        guideLead: "Reserva un lugar para el guía. Va en el carro de ustedes.",
        guideRest: "Con {people}, el grupo necesita {cars}.",
        car: "coche",
        cars: "coches",
        duration: "Duración",
        durationOf: "Duración de",
        hourExact: " h",
        total: "Total",
        add: "Agregar al carrito",
        addedBtn: "Añadido",
        fail: "No se agregó. Elige una fecha futura.",
        sameDay: "Ya elegiste un paseo para este día. Quítalo para elegir otro.",
        max: "El itinerario tiene como máximo 3 lugares.",
        sameDayTitle: "Agrega el mismo día",
        sameDayHint: "Hasta {n} lugares el mismo día, en un solo paseo.",
        only: "Solo {name}",
        needMore: "Este lugar solo va junto con uno más. Elige el otro para cerrar el paseo.",
        perPerson: "por persona",
        leaving: "saliendo de",
        noPrice: "Este paseo aún no está a la venta.",
        dayTaken: "Ya tienes un paseo en el carrito en esta fecha. Elige otra fecha.",
      },
    };
    return all[lang] || all.pt;
  }

  function passeioHoras(minutos, copy) {
    minutos = parseInt(minutos, 10) || 0;
    if (!minutos) return "";
    var h = Math.floor(minutos / 60);
    var m = minutos % 60;
    var exact = (copy && copy.hourExact) || "hs";
    if (!h) return m + " min";
    if (!m) return h + exact;
    if (exact === "hs") return h + "h" + (m < 10 ? "0" : "") + m;
    if (exact === "h") return h + "h " + m + "min";
    return h + " h " + m + " min";
  }

  function passeioReais(cents) {
    return "R$ " + String(Math.round((parseInt(cents, 10) || 0) / 100));
  }

  function passeioAmanha() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function passeioEsc(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function passeioPonto(cidade) {
    var key = String(cidade || "").toLowerCase();
    if (key.indexOf("jorge") >= 0) return "Café com Brigadeiro";
    if (key.indexOf("cavalcante") >= 0) return "Café com Delícias";
    return "Padaria Santa Maria";
  }

  function passeioCidadeKey(cidade) {
    var key = String(cidade || "").toLowerCase();
    if (key.indexOf("jorge") >= 0) return "sao-jorge";
    if (key.indexOf("cavalcante") >= 0) return "cavalcante";
    return "alto-paraiso";
  }

  function passeioPrecoCidade(tarifa, cidade, campo, fallback) {
    var key = passeioCidadeKey(cidade);
    var row = tarifa && tarifa.cidades && tarifa.cidades[key];
    if (row && row[campo] != null && row[campo] !== "") {
      var n = parseInt(row[campo], 10);
      if (isFinite(n)) return n;
    }
    if (tarifa && tarifa[campo] != null && tarifa[campo] !== "") {
      var base = parseInt(tarifa[campo], 10);
      if (isFinite(base)) return base;
    }
    if (fallback) return passeioPrecoCidade(tarifa, cidade, fallback);
    return 0;
  }

  function passeioCidadeCurta(cidade) {
    var key = passeioCidadeKey(cidade);
    if (key === "sao-jorge") return "São Jorge";
    if (key === "cavalcante") return "Cavalcante";
    return "Alto Paraíso";
  }

  function passeioDataBr(iso) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso.split("-").reverse().join("/");
    return iso || "";
  }

  /** Passeios com mais de um atrativo que incluem este (cada um com tarifário próprio). */
  function passeioCombos(data) {
    return (data.related_tours || []).filter(function (tour) {
      return tour && tour.tarifa && (tour.attractions || []).length >= 2;
    }).map(function (tour) {
      var others = (tour.attractions || []).filter(function (p) { return p.slug !== data.slug; });
      return { tour: tour, ids: others.map(function (p) { return String(p.id); }).sort(), parts: others };
    });
  }

  /** Atrativos que podem entrar no mesmo dia (sem repetir). */
  function passeioOpcoes(data) {
    var seen = {};
    var out = [];
    passeioCombos(data).forEach(function (c) {
      c.parts.forEach(function (part) {
        if (seen[part.id]) return;
        seen[part.id] = true;
        out.push(part);
      });
    });
    return out.sort(function (a, b) { return String(a.title_pt).localeCompare(String(b.title_pt), "pt"); });
  }

  function passeioExtras(box) {
    return (box._passeioExtras || []).slice();
  }

  /** Dá para somar este atrativo à escolha atual e ainda fechar um passeio cadastrado? */
  function passeioPodeJuntar(data, extras, id) {
    var want = extras.concat([String(id)]);
    return passeioCombos(data).some(function (c) {
      return want.every(function (x) { return c.ids.indexOf(x) >= 0; });
    });
  }

  function passeioSelecao(box, data) {
    var cidadeEl = box.querySelector("[data-passeio-city]");
    var cidade = cidadeEl ? cidadeEl.value : "";
    var key = passeioCidadeKey(cidade);
    var extras = passeioExtras(box).sort();
    var opcoes = passeioOpcoes(data);
    var extraNames = extras.map(function (id) {
      var part = opcoes.filter(function (p) { return String(p.id) === id; })[0];
      return part ? part.title_pt : "";
    }).filter(Boolean);
    if (!extras.length) {
      return {
        ids: [],
        names: [data.title],
        minutes: (data.duracao_cidades && parseInt(data.duracao_cidades[key], 10)) || parseInt(data.duration_minutes, 10) || 0,
        exclusivo: passeioPrecoCidade(data.tarifa, cidade, "exclusivo_pessoa_cents"),
        excursao: passeioPrecoCidade(data.tarifa, cidade, "excursao_pessoa_cents"),
        exclusivoT: passeioPrecoCidade(data.tarifa, cidade, "exclusivo_transporte_cents", "exclusivo_pessoa_cents"),
        excursaoT: passeioPrecoCidade(data.tarifa, cidade, "excursao_transporte_cents", "excursao_pessoa_cents"),
        quorum: parseInt(data.tarifa && data.tarifa.quorum, 10) || 4,
        incompleto: false,
      };
    }
    var combo = passeioCombos(data).filter(function (c) { return c.ids.join("|") === extras.join("|"); })[0];
    if (!combo) {
      return { ids: extras, names: [data.title].concat(extraNames), minutes: 0, exclusivo: 0, excursao: 0, exclusivoT: 0, excursaoT: 0, incompleto: true };
    }
    var tour = combo.tour;
    return {
      ids: extras,
      tourId: tour.id,
      names: (tour.attractions || []).map(function (p) { return p.title_pt; }),
      minutes: (tour.duracao_cidades && parseInt(tour.duracao_cidades[key], 10)) || parseInt(tour.duration_minutes, 10) || 0,
      exclusivo: passeioPrecoCidade(tour.tarifa, cidade, "exclusivo_pessoa_cents"),
      excursao: passeioPrecoCidade(tour.tarifa, cidade, "excursao_pessoa_cents"),
      exclusivoT: passeioPrecoCidade(tour.tarifa, cidade, "exclusivo_transporte_cents", "exclusivo_pessoa_cents"),
      excursaoT: passeioPrecoCidade(tour.tarifa, cidade, "excursao_transporte_cents", "excursao_pessoa_cents"),
      quorum: parseInt(tour.tarifa && tour.tarifa.quorum, 10) || 4,
      incompleto: false,
    };
  }

  function passeioMostraGuia(modalidade, pessoas, comTranslado) {
    if (comTranslado) return false;
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    if (modalidade === "exclusivo") return true;
    return pessoas === 5 || pessoas === 10;
  }

  function passeioCarros(pessoas) {
    return Math.max(1, Math.ceil((parseInt(pessoas, 10) || 1) / 4));
  }

  function passeioTotalCents(sel, modalidade, pessoas, comTranslado) {
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    var quorum = parseInt(sel && sel.quorum, 10) || 4;
    var unit = modalidade === "exclusivo"
      ? (comTranslado ? sel.exclusivoT : sel.exclusivo)
      : (comTranslado ? sel.excursaoT : sel.excursao);
    if (modalidade === "exclusivo" && pessoas <= quorum) return unit * quorum;
    return unit * pessoas;
  }

  function passeioBuilderHtml(copy, data) {
    var css =
      ".gcv-passeios{--gp-green:#14532d;--gp-green-2:#166534;--gp-line:#dbe7e0;--gp-soft:#f3f8f5;--gp-ink:#0f2a1d;--gp-muted:#5b6b62;margin:1.25rem auto;max-width:460px;padding:0;border:1px solid var(--gp-line);border-radius:16px;background:#fff;box-shadow:0 6px 24px rgba(15,61,46,.08);position:relative;overflow:hidden;color:var(--gp-ink)}" +
      ".gcv-passeios__now{display:flex;align-items:center;gap:.55rem;margin:0;padding:.8rem 1.1rem;font-size:1.05rem;font-weight:800;letter-spacing:.01em;line-height:1.2;color:#fff;background:linear-gradient(135deg,#14532d,#0f766e)}" +
      ".gcv-passeios__now .ti{font-size:1.2rem;line-height:1}" +
      ".gcv-passeios__body{padding:1rem 1.1rem .4rem}" +
      ".gcv-passeios__grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem 1rem}" +
      ".gcv-passeios__field{display:flex;flex-direction:column;gap:.3rem;min-width:0;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--gp-muted)}" +
      ".gcv-passeios__field--wide{grid-column:1 / -1}" +
      ".gcv-passeios__hide{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;border:0!important;padding:0!important;margin:-1px!important}" +
      ".gcv-passeios input,.gcv-passeios select{width:100%;margin:0;padding:.55rem .7rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;box-sizing:border-box;font:inherit;font-size:.95rem;text-transform:none;letter-spacing:0;color:var(--gp-ink)}" +
      ".gcv-passeios__stepper{display:flex;align-items:stretch;height:2.6rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;overflow:hidden}" +
      ".gcv-passeios__stepper button{flex:none;width:2.6rem;border:0;background:var(--gp-soft);color:var(--gp-green);font-size:1.15rem;font-weight:800;cursor:pointer}" +
      ".gcv-passeios__stepper button:hover{background:#e3efe8}.gcv-passeios__stepper button:disabled{opacity:.35;cursor:default}" +
      ".gcv-passeios .gcv-passeios__stepper input{flex:1;min-width:0;border:0;border-radius:0;padding:0;text-align:center;font-weight:800;font-size:1rem;-moz-appearance:textfield}" +
      ".gcv-passeios__stepper input::-webkit-outer-spin-button,.gcv-passeios__stepper input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}" +
      ".gcv-passeios__seg{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--gp-soft);border:1px solid var(--gp-line)}" +
      ".gcv-passeios__seg button{flex:1 1 0;min-width:0;padding:.5rem .4rem;border:0;border-radius:9px;background:transparent;color:var(--gp-muted);font:inherit;font-size:.86rem;font-weight:700;letter-spacing:0;text-transform:none;line-height:1.2;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s}" +
      ".gcv-passeios__seg button:hover{color:var(--gp-green)}" +
      ".gcv-passeios__seg button.is-on{background:#fff;color:var(--gp-green);box-shadow:0 1px 3px rgba(15,61,46,.18),inset 0 0 0 1.5px var(--gp-green)}" +
      ".gcv-passeios__seg button:focus-visible,.gcv-passeios__stepper button:focus-visible,.gcv-passeios__add:focus-visible{outline:2px solid #0f766e;outline-offset:2px}" +
      ".gcv-passeios__summary{display:none;margin:0}" +
      ".gcv-passeios__guide{display:flex;align-items:flex-start;gap:.45rem;margin:.9rem 0 0;padding:.6rem .75rem;border-radius:10px;background:#fef3c7;color:#92400e;font-size:.82rem;line-height:1.4}" +
      ".gcv-passeios__guide[hidden]{display:none}.gcv-passeios__guide .ti{font-size:1.05rem;line-height:1.2;flex:none}" +
      ".gcv-passeios__foot{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:1rem;padding:.85rem 1.1rem;border-top:1px solid var(--gp-line);background:var(--gp-soft)}" +
      ".gcv-passeios__budget{margin:0;display:flex;flex-direction:column;line-height:1.15;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--gp-muted)}" +
      ".gcv-passeios__total-value{color:var(--gp-green);font-size:1.5rem;font-weight:800;letter-spacing:0;text-transform:none}" +
      ".gcv-passeios__actions{display:flex;flex:none}" +
      ".gcv-passeios__add{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;margin:0;padding:.75rem 1.1rem;border:0;border-radius:12px;background:var(--gp-green);color:#fff;font:inherit;font-size:.92rem;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(20,83,45,.25);transition:background .15s,transform .1s}" +
      ".gcv-passeios__add:hover{background:var(--gp-green-2)}.gcv-passeios__add:active{transform:translateY(1px)}" +
      ".gcv-passeios__add.is-added{background:#fff;color:var(--gp-green);box-shadow:inset 0 0 0 2px var(--gp-green)}" +
      ".gcv-passeios__add.is-blocked,.gcv-passeios__add:disabled{opacity:.5;cursor:not-allowed}" +
      ".gcv-passeios [data-passeio-msg]{margin:0;padding:0 1.1rem;font-size:.82rem;color:#b91c1c}.gcv-passeios [data-passeio-msg]:not(:empty){padding:.1rem 1.1rem .8rem}" +
      ".gcv-datepicker{position:relative;width:100%;margin:0}" +
      ".gcv-datepicker__native{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;margin:0!important;padding:0!important;border:0!important}" +
      ".gcv-datepicker__btn{width:100%;height:2.6rem;display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box;padding:.5rem .7rem;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;cursor:pointer;text-align:left}" +
      ".gcv-datepicker__icon{width:18px;height:18px;color:#14532d;flex-shrink:0}" +
      ".gcv-datepicker__pop{position:fixed;z-index:80;width:min(19.5rem,calc(100vw - 1.5rem));background:#fff;border:1px solid #d7ebe3;border-radius:16px;box-shadow:0 18px 48px rgba(15,61,46,.18);padding:.85rem .9rem 1rem;text-transform:none;letter-spacing:0}" +
      ".gcv-datepicker__pop[hidden]{display:none!important}.gcv-datepicker__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem}.gcv-datepicker__month{font-weight:700;color:#14532d}" +
      ".gcv-datepicker__nav{width:32px;height:32px;border:0;border-radius:8px;background:#e8f0ec;color:#14532d;font-size:1.2rem;cursor:pointer}" +
      ".gcv-datepicker__week,.gcv-datepicker__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}.gcv-datepicker__week{margin-bottom:4px;font-size:.68rem;font-weight:700;color:#94a3b8}" +
      ".gcv-datepicker__day{height:34px;border:0;border-radius:9px;background:transparent;font:inherit;cursor:pointer}.gcv-datepicker__day:hover:not(:disabled){background:#e8f0ec}" +
      ".gcv-datepicker__day.is-today{box-shadow:inset 0 0 0 1.5px #14532d;font-weight:700}.gcv-datepicker__day.is-selected{background:#14532d;color:#fff;font-weight:700}.gcv-datepicker__day:disabled{color:#cbd5e1;cursor:default}" +
      "@media(max-width:520px){.gcv-passeios__grid{grid-template-columns:1fr 1fr}.gcv-passeios__seg button{font-size:.8rem;padding:.5rem .25rem;white-space:nowrap}.gcv-passeios__foot{flex-wrap:wrap}.gcv-passeios__actions,.gcv-passeios__add{width:100%}}" +
      "@media(min-width:768px){.gcv-passeios{max-width:none;width:100%;margin-left:0;margin-right:0}.gcv-passeios__grid{grid-template-columns:1fr 1fr 1fr 1fr}.gcv-passeios__field--city{grid-column:span 2}.gcv-passeios__field--date,.gcv-passeios__field--people{grid-column:span 1}.gcv-passeios__field--mode,.gcv-passeios__field--transport{grid-column:span 2}}" +
      ".gcv-passeios__route{padding:1rem 1.1rem .2rem}" +
      ".gcv-passeios__route-name{margin:0;font-size:1.3rem;font-weight:800;line-height:1.25;color:var(--gp-ink)}" +
      ".gcv-passeios__route-name span{color:var(--gp-green)}" +
      ".gcv-passeios__route-meta{display:flex;flex-wrap:wrap;gap:.35rem .9rem;margin:.35rem 0 0;font-size:.86rem;color:var(--gp-muted)}" +
      ".gcv-passeios__route-meta b{color:var(--gp-ink)}" +
      ".gcv-passeios__route-meta .ti{color:var(--gp-green);margin-right:.2rem}" +
      ".gcv-passeios__extras{margin-top:1rem;padding:.85rem .9rem;border:1px dashed #b6d4c4;border-radius:12px;background:var(--gp-soft)}" +
      ".gcv-passeios__extras[hidden]{display:none}" +
      ".gcv-passeios__extras-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem .75rem;margin:0 0 .6rem}" +
      ".gcv-passeios__extras-title{margin:0;font-size:.95rem;font-weight:800;color:var(--gp-ink)}" +
      ".gcv-passeios__extras-hint{margin:0;font-size:.76rem;color:var(--gp-muted)}" +
      ".gcv-passeios__extra-list{display:flex;flex-wrap:wrap;gap:.45rem}" +
      ".gcv-passeios__extra{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .8rem;border:1.5px solid #cfe1d7;border-radius:999px;background:#fff;color:var(--gp-ink);font:inherit;font-size:.88rem;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s,color .15s}" +
      ".gcv-passeios__extra .ti{font-size:1rem;color:var(--gp-green)}" +
      ".gcv-passeios__extra:hover:not(:disabled){border-color:var(--gp-green)}" +
      ".gcv-passeios__extra[aria-pressed=true]{background:var(--gp-green);border-color:var(--gp-green);color:#fff}" +
      ".gcv-passeios__extra[aria-pressed=true] .ti{color:#fff}" +
      ".gcv-passeios__extra:disabled{opacity:.4;cursor:not-allowed}" +
      ".gcv-passeios__note{margin:.6rem 0 0;font-size:.8rem;font-weight:600;color:#b45309}" +
      ".gcv-passeios__note[hidden]{display:none}" +
      ".gcv-passeios__unit{display:block;margin-top:.1rem;font-size:.72rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--gp-muted)}" +
      ".gcv-passeios-slot{height:0}" +
      ".gcv-passeios.is-dock{position:fixed;z-index:45;margin:0;box-sizing:border-box;box-shadow:0 10px 28px rgba(15,61,46,.18)}" +
      ".gcv-passeios.is-dock.is-mini{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;padding:.4rem .6rem;border-radius:12px}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__now,.gcv-passeios.is-dock.is-mini .gcv-passeios__route,.gcv-passeios.is-dock.is-mini .gcv-passeios__body,.gcv-passeios.is-dock.is-mini [data-passeio-msg]{display:none}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__summary{display:block;flex:1 1 16rem;min-width:0;font-size:.78rem;font-weight:700;line-height:1.35;color:#0f3d2e}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__foot{margin:0;padding:0;border:0;background:none;flex-wrap:nowrap}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__budget{flex-direction:row;align-items:baseline;gap:.3rem}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__total-value{font-size:1.05rem}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__actions,.gcv-passeios.is-dock.is-mini .gcv-passeios__add{width:auto}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__add{padding:.45rem .7rem;font-size:.82rem}";
    function seg(name, options) {
      return '<div class="gcv-passeios__seg" role="radiogroup" data-passeio-seg="' + name + '">' +
        options.map(function (o, i) {
          return '<button type="button" role="radio" aria-checked="' + (i === 0 ? "true" : "false") + '" class="' + (i === 0 ? "is-on" : "") + '" data-value="' + passeioEsc(o[0]) + '">' + passeioEsc(o[1]) + "</button>";
        }).join("") + "</div>";
    }
    var cities = ["Alto Paraíso de Goiás", "São Jorge", "Cavalcante"];
    return "<style>" + css + "</style>" +
      '<p class="gcv-passeios__now"><i class="ti ti-map" aria-hidden="true"></i> ' + passeioEsc(copy.title) + "</p>" +
      '<p class="gcv-passeios__summary" data-passeio-summary></p>' +
      '<div class="gcv-passeios__route"><p class="gcv-passeios__route-name" data-passeio-route>' + passeioEsc(data.title) + "</p>" +
      '<p class="gcv-passeios__route-meta" data-passeio-route-meta></p></div>' +
      '<div class="gcv-passeios__body"><div class="gcv-passeios__grid">' +
      '<label class="gcv-passeios__field gcv-passeios__field--date">' + copy.date + '<input type="text" data-passeio-date value="' + passeioAmanha() + '" /></label>' +
      '<div class="gcv-passeios__field gcv-passeios__field--people">' + copy.people +
        '<div class="gcv-passeios__stepper"><button type="button" data-passeio-step="-1" aria-label="−1">−</button>' +
        '<input type="number" min="1" max="15" value="4" inputmode="numeric" aria-label="' + passeioEsc(copy.people) + '" data-passeio-people />' +
        '<button type="button" data-passeio-step="1" aria-label="+1">+</button></div></div>' +
      '<div class="gcv-passeios__field gcv-passeios__field--wide gcv-passeios__field--city">' + copy.city +
        seg("city", cities.map(function (c) { return [c, passeioCidadeCurta(c)]; })) +
        '<select class="gcv-passeios__hide" tabindex="-1" aria-hidden="true" data-passeio-city>' + cities.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
      '<div class="gcv-passeios__field gcv-passeios__field--wide gcv-passeios__field--mode">' + copy.mode +
        seg("mode", [["excursao", copy.group], ["exclusivo", copy.private]]) +
        '<select class="gcv-passeios__hide" tabindex="-1" aria-hidden="true" data-passeio-mode><option value="excursao">' + copy.group + '</option><option value="exclusivo">' + copy.private + "</option></select></div>" +
      '<div class="gcv-passeios__field gcv-passeios__field--wide gcv-passeios__field--transport">' + copy.transport +
        seg("transport", [["0", copy.withoutRide], ["1", copy.withRide]]) +
        '<select class="gcv-passeios__hide" tabindex="-1" aria-hidden="true" data-passeio-transport><option value="0">' + copy.withoutRide + '</option><option value="1">' + copy.withRide + "</option></select></div>" +
      "</div>" +
      '<div class="gcv-passeios__extras" data-passeio-extras hidden>' +
        '<div class="gcv-passeios__extras-head"><p class="gcv-passeios__extras-title">' + passeioEsc(copy.sameDayTitle) + "</p>" +
        '<p class="gcv-passeios__extras-hint">' + passeioEsc(String(copy.sameDayHint).replace("{n}", String(parseInt(data.max_atrativos, 10) || 3))) + "</p></div>" +
        '<div class="gcv-passeios__extra-list" data-passeio-extra-list></div>' +
        '<p class="gcv-passeios__note" data-passeio-need hidden>' + passeioEsc(copy.needMore) + "</p>" +
      "</div>" +
      '<p class="gcv-passeios__guide" data-passeio-guide hidden><i class="ti ti-steering-wheel" aria-hidden="true"></i><span data-passeio-guide-text></span></p>' +
      "</div>" +
      '<div class="gcv-passeios__foot"><p class="gcv-passeios__budget" data-passeio-total></p>' +
      '<div class="gcv-passeios__actions"><button type="button" class="gcv-passeios__add" data-passeio-add aria-pressed="false"><i class="ti ti-shopping-cart" aria-hidden="true"></i> ' + passeioEsc(copy.add) + "</button></div></div>" +
      '<p data-passeio-msg></p>';
  }

  function bindPasseioControls(box) {
    Array.prototype.forEach.call(box.querySelectorAll("[data-passeio-seg]"), function (group) {
      var select = box.querySelector("[data-passeio-" + group.getAttribute("data-passeio-seg") + "]");
      if (!select) return;
      function sync() {
        Array.prototype.forEach.call(group.querySelectorAll("button"), function (b) {
          var on = b.getAttribute("data-value") === select.value;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-checked", on ? "true" : "false");
        });
      }
      group.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-value]");
        if (!b || select.value === b.getAttribute("data-value")) return;
        select.value = b.getAttribute("data-value");
        sync();
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      select.addEventListener("change", sync);
      sync();
    });
    var people = box.querySelector("[data-passeio-people]");
    if (!people) return;
    var min = parseInt(people.min, 10) || 1;
    var max = parseInt(people.max, 10) || 15;
    var steps = box.querySelectorAll("[data-passeio-step]");
    function syncSteps() {
      var v = parseInt(people.value, 10) || min;
      Array.prototype.forEach.call(steps, function (b) {
        var d = parseInt(b.getAttribute("data-passeio-step"), 10);
        b.disabled = d < 0 ? v <= min : v >= max;
      });
    }
    Array.prototype.forEach.call(steps, function (b) {
      b.addEventListener("click", function () {
        var v = parseInt(people.value, 10) || min;
        people.value = Math.min(max, Math.max(min, v + parseInt(b.getAttribute("data-passeio-step"), 10)));
        people.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
    people.addEventListener("change", function () {
      var v = parseInt(people.value, 10);
      if (!v || v < min) people.value = min;
      else if (v > max) people.value = max;
      syncSteps();
    });
    people.addEventListener("input", syncSteps);
    syncSteps();
  }

  function bindPasseioDate(box) {
    var input = box.querySelector("[data-passeio-date]");
    if (!input) return;
    var min = passeioAmanha();
    input.setAttribute("min", min);
    function go() {
      if (window.gcvBindDatePicker) window.gcvBindDatePicker(input, { min: min });
    }
    if (window.gcvBindDatePicker) {
      go();
      return;
    }
    var script = document.createElement("script");
    script.src = "/assets/js/gcv-datepicker.js?v=1.0.3";
    script.onload = go;
    document.head.appendChild(script);
  }

  function bindPasseioBuilder(box, copy, data) {
    function itemInCart(id) {
      var cart = window.GcvExcCart;
      return !!(
        id &&
        cart &&
        typeof cart.items === "function" &&
        cart.items().some(function (it) {
          return it && it.id === id;
        })
      );
    }

    function buildItem() {
      var sel = passeioSelecao(box, data);
      var dateEl = box.querySelector("[data-passeio-date]");
      var date = dateEl ? dateEl.value : "";
      var pessoas = Math.max(1, parseInt(box.querySelector("[data-passeio-people]").value, 10) || 1);
      var modalidade = box.querySelector("[data-passeio-mode]").value;
      var cidade = box.querySelector("[data-passeio-city]").value;
      var comTranslado = box.querySelector("[data-passeio-transport]").value === "1";
      var quando = new Date(date + "T08:00:00");
      if (sel.incompleto) return null;
      if (!date || quando.getTime() <= Date.now()) return null;
      var total = passeioTotalCents(sel, modalidade, pessoas, comTranslado);
      var exclusivoCheio = modalidade === "exclusivo" && pessoas <= 4;
      var unit = modalidade === "exclusivo"
        ? (comTranslado ? sel.exclusivoT : sel.exclusivo)
        : (comTranslado ? sel.excursaoT : sel.excursao);
      return {
        id: "roteiro-" + data.slug + "-" + sel.ids.join("-") + "-" + date + "-" + modalidade + "-" + (comTranslado ? "t" : "s"),
        destino: sel.names.join(" + "),
        destinos: sel.names.slice(),
        dateLabel: date.split("-").reverse().join("/"),
        dateIso: date,
        valorUnit: exclusivoCheio ? Math.round(total / 100) : Math.round(unit / 100),
        qty: exclusivoCheio ? 1 : pessoas,
        pixDesc: sel.names.join(" + ") + " · " + (modalidade === "exclusivo" ? copy.private : copy.group) + " · " + (comTranslado ? copy.withRide : copy.withoutRide),
        maxQty: 15,
        embarque: cidade,
        meetingPoint: passeioPonto(cidade),
        hora: "08:00",
        departureMs: quando.getTime(),
      };
    }

    function paintAddButton() {
      var btn = box.querySelector("[data-passeio-add]");
      if (!btn) return;
      var item = buildItem();
      var cart = window.GcvExcCart;
      var mine = !!(item && itemInCart(item.id));
      var taken = item && cart && typeof cart.occupiedDates === "function" ? cart.occupiedDates()[item.dateIso] : "";
      var blocked = !!(taken && item && taken !== item.id && !mine);
      btn.disabled = false;
      btn.classList.toggle("is-blocked", blocked);
      var msgEl = box.querySelector("[data-passeio-msg]");
      if (msgEl) {
        if (blocked) msgEl.textContent = copy.dayTaken;
        else if (msgEl.textContent === copy.dayTaken) msgEl.textContent = "";
      }
      btn.classList.toggle("is-added", mine);
      btn.setAttribute("aria-pressed", mine ? "true" : "false");
      if (blocked) {
        btn.setAttribute("title", copy.sameDay);
        btn.setAttribute("aria-disabled", "true");
      } else {
        btn.removeAttribute("title");
        btn.removeAttribute("aria-disabled");
      }
      btn.innerHTML = mine
        ? '<i class="ti ti-check" aria-hidden="true"></i> ' + passeioEsc(copy.addedBtn)
        : '<i class="ti ti-shopping-cart" aria-hidden="true"></i> ' + passeioEsc(copy.add);
    }

    function paintSummary() {
      var el = box.querySelector("[data-passeio-summary]");
      if (!el) return;
      var date = box.querySelector("[data-passeio-date]").value;
      var pessoas = Math.max(1, parseInt(box.querySelector("[data-passeio-people]").value, 10) || 1);
      var modalidade = box.querySelector("[data-passeio-mode]").value;
      var cidade = box.querySelector("[data-passeio-city]").value;
      var comTranslado = box.querySelector("[data-passeio-transport]").value === "1";
      var modo = modalidade === "exclusivo" ? copy.private : copy.group;
      var gente = pessoas + " " + (pessoas === 1 ? copy.person : copy.peopleWord);
      el.textContent = [
        passeioDataBr(date),
        passeioSelecao(box, data).names.join(" + "),
        gente + " (" + modo + ")",
        copy.from + " " + passeioCidadeCurta(cidade),
        comTranslado ? copy.withRide : copy.withoutRide,
      ].join(" * ");
    }

    var maxExtras = Math.max(0, (parseInt(data.max_atrativos, 10) || 3) - 1);

    function paintExtras() {
      var wrap = box.querySelector("[data-passeio-extras]");
      var list = box.querySelector("[data-passeio-extra-list]");
      var opcoes = passeioOpcoes(data);
      if (!wrap || !list) return;
      wrap.hidden = !opcoes.length || !maxExtras;
      if (wrap.hidden) return;
      var extras = passeioExtras(box);
      list.innerHTML = opcoes.map(function (part) {
        var id = String(part.id);
        var on = extras.indexOf(id) >= 0;
        var pode = on || (extras.length < maxExtras && passeioPodeJuntar(data, extras, id));
        return '<button type="button" class="gcv-passeios__extra" data-passeio-extra-id="' + passeioEsc(id) + '" aria-pressed="' + (on ? "true" : "false") + '"' + (pode ? "" : " disabled") + ">" +
          '<i class="ti ' + (on ? "ti-check" : "ti-plus") + '" aria-hidden="true"></i>' + passeioEsc(part.title_pt) + "</button>";
      }).join("");
      var need = box.querySelector("[data-passeio-need]");
      if (need) need.hidden = !passeioSelecao(box, data).incompleto;
    }

    function paintRoute(sel, modalidade, comTranslado) {
      var nameEl = box.querySelector("[data-passeio-route]");
      var metaEl = box.querySelector("[data-passeio-route-meta]");
      if (nameEl) {
        nameEl.innerHTML = sel.names.map(function (n, i) {
          return i ? '<span> + </span>' + passeioEsc(n) : passeioEsc(n);
        }).join("");
      }
      if (!metaEl) return;
      if (sel.incompleto) { metaEl.textContent = ""; return; }
      var cidadeEl = box.querySelector("[data-passeio-city]");
      var unit = modalidade === "exclusivo" ? (comTranslado ? sel.exclusivoT : sel.exclusivo) : (comTranslado ? sel.excursaoT : sel.excursao);
      var parts = [];
      if (sel.minutes) {
        parts.push('<span><i class="ti ti-clock" aria-hidden="true"></i>' + passeioEsc(copy.durationOf) + " <b>" + passeioEsc(passeioHoras(sel.minutes, copy)) + "</b> " +
          passeioEsc(copy.leaving) + " " + passeioEsc(passeioCidadeCurta(cidadeEl ? cidadeEl.value : "")) + "</span>");
      }
      parts.push('<span><i class="ti ti-user" aria-hidden="true"></i><b>' + passeioEsc(passeioReais(unit)) + "</b> " + passeioEsc(copy.perPerson) + "</span>");
      metaEl.innerHTML = parts.join("");
    }

    box.addEventListener("click", function (e) {
      var chip = e.target.closest && e.target.closest("[data-passeio-extra-id]");
      if (!chip || chip.disabled) return;
      var id = chip.getAttribute("data-passeio-extra-id");
      var extras = passeioExtras(box);
      var at = extras.indexOf(id);
      if (at >= 0) extras.splice(at, 1);
      else extras.push(id);
      box._passeioExtras = extras;
      paint();
    });

    function paint() {
      var sel = passeioSelecao(box, data);
      var modalidade = box.querySelector("[data-passeio-mode]").value;
      var pessoas = box.querySelector("[data-passeio-people]").value;
      var comTranslado = box.querySelector("[data-passeio-transport]").value === "1";
      var total = passeioTotalCents(sel, modalidade, pessoas, comTranslado);
      paintSummary();
      var guide = box.querySelector("[data-passeio-guide]");
      var guideText = box.querySelector("[data-passeio-guide-text]");
      var nPessoas = Math.max(1, parseInt(pessoas, 10) || 1);
      var mostraGuia = passeioMostraGuia(modalidade, nPessoas, comTranslado);
      if (guide) guide.hidden = !mostraGuia;
      if (guideText) {
        if (!mostraGuia) guideText.textContent = "";
        else {
          var nCarros = passeioCarros(nPessoas);
          var gente = nPessoas + " " + (nPessoas === 1 ? copy.person : copy.peopleWord);
          var frota = nCarros + " " + (nCarros === 1 ? copy.car : copy.cars);
          guideText.textContent = copy.guideLead + " " + copy.guideRest.replace("{people}", gente).replace("{cars}", frota);
        }
      }
      paintExtras();
      paintRoute(sel, modalidade, comTranslado);
      box.querySelector("[data-passeio-total]").innerHTML =
        "<span>" + passeioEsc(copy.total) + "</span>" +
        '<strong class="gcv-passeios__total-value">' + (sel.incompleto ? "—" : passeioEsc(passeioReais(total))) + "</strong>";
      var item = buildItem();
      if (item && itemInCart(item.id) && window.GcvExcCart && typeof window.GcvExcCart.sync === "function") {
        window.GcvExcCart.sync(item);
      }
      paintAddButton();
    }

    ["data-passeio-date", "data-passeio-people", "data-passeio-city", "data-passeio-mode", "data-passeio-transport"].forEach(function (attr) {
      var el = box.querySelector("[" + attr + "]");
      if (el) el.addEventListener("input", paint);
      if (el) el.addEventListener("change", paint);
    });
    box.querySelector("[data-passeio-add]").addEventListener("click", function () {
      var msg = box.querySelector("[data-passeio-msg]");
      if (passeioSelecao(box, data).incompleto) {
        if (msg) msg.textContent = copy.needMore;
        return;
      }
      var item = buildItem();
      if (!item) {
        if (msg) msg.textContent = copy.fail;
        return;
      }
      var addBtn = box.querySelector("[data-passeio-add]");
      if (addBtn && addBtn.classList.contains("is-blocked")) {
        if (msg) msg.textContent = copy.dayTaken;
        if (window.GcvExcCart && typeof window.GcvExcCart.warnSameDay === "function") window.GcvExcCart.warnSameDay();
        return;
      }
      if (msg) msg.textContent = "";
      var cart = window.GcvExcCart;
      if (!cart) return;
      if (itemInCart(item.id)) {
        if (typeof cart.remove === "function") cart.remove(item.id);
      } else if (typeof cart.add === "function") {
        cart.add(item);
      }
      paintAddButton();
    });
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-gcv-cart-remove]")) {
        setTimeout(paintAddButton, 0);
      }
    });
    bindPasseioControls(box);
    bindPasseioDate(box);
    paint();
    bindPasseioDock(box);
  }

  function bindPasseioDock(box) {
    var slot = document.createElement("div");
    slot.className = "gcv-passeios-slot";
    if (box.parentNode) box.parentNode.insertBefore(slot, box);
    var lastY = window.scrollY || 0;
    var restHeight = 0;

    function headerOffset() {
      var header = document.querySelector(".site-header");
      if (!header) return 0;
      var rect = header.getBoundingClientRect();
      return Math.max(0, Math.round(rect.bottom));
    }

    function place(compact) {
      var top = headerOffset();
      if (!box.classList.contains("is-mini")) restHeight = box.offsetHeight;
      if (!restHeight) restHeight = box.offsetHeight;
      slot.style.height = restHeight + "px";
      box.classList.add("is-dock");
      box.classList.toggle("is-mini", !!compact);
      var rect = slot.getBoundingClientRect();
      box.style.top = top + "px";
      box.style.left = Math.round(rect.left) + "px";
      box.style.width = Math.round(rect.width) + "px";
      if (compact) {
        document.querySelectorAll(".gcv-datepicker__pop").forEach(function (pop) {
          pop.hidden = true;
        });
      }
    }

    function release() {
      restHeight = 0;
      slot.style.height = "0px";
      box.classList.remove("is-dock", "is-mini");
      box.style.top = "";
      box.style.left = "";
      box.style.width = "";
    }

    function onScroll() {
      var y = window.scrollY || 0;
      var down = y > lastY + 4;
      var up = y < lastY - 4;
      lastY = y;
      var passed = slot.getBoundingClientRect().top <= headerOffset() + 1;
      if (!passed) {
        release();
        return;
      }
      if (down) place(true);
      else if (up) place(false);
      else if (!box.classList.contains("is-dock")) place(true);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      if (box.classList.contains("is-dock")) place(box.classList.contains("is-mini"));
    });
  }

  initHeroCarousel();
  initInstagramRandomGrid();
  initHomeReviews();
  initMapLightbox();
  initPhotoGalleryLightbox();
  initContactForm();
  try {
    initNavSearch();
  } catch (err) {
    if (typeof console !== "undefined" && console.error) console.error("[gcv-search]", err);
  }
  initPasseiosPublicos();
})();

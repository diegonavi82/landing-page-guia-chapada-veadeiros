(function () {
  var GCV_LANG_KEY = "gcv-site-lang";

  function clientSiteLang() {
    var tag = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    var base = String(tag).toLowerCase().split("-")[0];
    if (base === "pt") return "pt";
    if (base === "es") return "es";
    return "en";
  }

  function pageSiteLang(path) {
    if (path === "/en" || path.indexOf("/en/") === 0) return "en";
    if (path === "/es" || path.indexOf("/es/") === 0) return "es";
    return "pt";
  }

  function bareSitePath(path, have) {
    var bare = path;
    if (have === "en" || have === "es") bare = path.replace(/^\/(en|es)(?=\/|$)/, "") || "/";
    if (!bare || bare === "/") return "/index.html";
    return bare;
  }

  function redirectToClientLang() {
    var path = window.location.pathname || "/";
    if (/^\/(dashboard|admin|api|assets|tools)(\/|$)/.test(path)) return false;
    if (/\.(css|js|mjs|json|xml|php|webp|png|jpe?g|gif|svg|ico|woff2?|map|txt)$/i.test(path)) return false;
    var stored = "";
    try { stored = sessionStorage.getItem(GCV_LANG_KEY) || ""; } catch (err) { stored = ""; }
    var want = stored === "pt" || stored === "en" || stored === "es" ? stored : clientSiteLang();
    var have = pageSiteLang(path);
    if (want === have) return false;
    var bare = bareSitePath(path, have);
    var next = want === "pt" ? bare : "/" + want + bare;
    if (next === path) return false;
    window.location.replace(next + window.location.search + window.location.hash);
    return true;
  }

  if (redirectToClientLang()) return;

  document.addEventListener("click", function (ev) {
    var link = ev.target && ev.target.closest ? ev.target.closest(".lang-switch a") : null;
    if (!link) return;
    var lang = String(link.getAttribute("lang") || link.getAttribute("hreflang") || "").toLowerCase();
    if (lang.indexOf("pt") === 0) lang = "pt";
    else if (lang.indexOf("es") === 0) lang = "es";
    else if (lang.indexOf("en") === 0) lang = "en";
    else return;
    try { sessionStorage.setItem(GCV_LANG_KEY, lang); } catch (err) { /* segue o clique */ }
  });

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

  function showPasseioPreview(lang) {
    if (document.getElementById("gcv-passeio-preview")) return;
    var bar = document.createElement("p");
    bar.id = "gcv-passeio-preview";
    bar.setAttribute("role", "status");
    bar.textContent = lang === "en"
      ? "Preview: only your admin login can see the tours. Visitors cannot."
      : lang === "es"
        ? "Vista previa: solo tu acceso de admin ve los paseos. El público no."
        : "Prévia: só o seu login de admin vê os passeios. O público não vê.";
    bar.style.cssText = "margin:0;padding:8px 16px;background:#1c3a2e;color:#f4efe4;font:600 14px/1.4 system-ui,sans-serif;text-align:center";
    var header = document.querySelector("header");
    if (header) header.insertAdjacentElement("afterend", bar);
    else document.body.prepend(bar);
  }

  function initMenuPasseios() {
    document.querySelectorAll('.nav-main a[href*="passeios.html"]').forEach(function (a) {
      if (a.closest && a.closest(".lang-switch")) return;
      a.remove();
    });
    ["gcv-home-passeios", "proximas-saidas"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    fetch("/api/passeios.php", { headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok || !res.data || res.data.oculto) return;
        var nav = document.querySelector(".nav-main");
        var lang = window.location.pathname.indexOf("/en/") >= 0 ? "en" : (window.location.pathname.indexOf("/es/") >= 0 ? "es" : "pt");
        if (nav) {
          var jaTem = false;
          Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
            if (a.closest && a.closest(".lang-switch")) return;
            if ((a.getAttribute("href") || "").indexOf("passeios.html") >= 0) jaTem = true;
          });
          var atr = null;
          Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
            if (a.closest && a.closest(".lang-switch")) return;
            if (/(^|\/)atrativos\.html$/.test(a.getAttribute("href") || "")) atr = a;
          });
          if (!jaTem && atr) {
            var href = atr.getAttribute("href") || "atrativos.html";
            if (href.indexOf("/en/") >= 0) lang = "en";
            else if (href.indexOf("/es/") >= 0) lang = "es";
            var link = document.createElement("a");
            link.href = href.replace(/atrativos\.html$/, "passeios.html");
            link.textContent = lang === "en" ? "Tours" : lang === "es" ? "Paseos" : "Passeios";
            atr.insertAdjacentElement("afterend", link);
          }
        }
        ["gcv-home-passeios", "proximas-saidas"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.hidden = false;
        });
        if (res.data.preview) showPasseioPreview(lang);
      })
      .catch(function () {});
  }

  function initPasseiosPublicos() {
    if (!/\/atrativos\//.test(window.location.pathname)) return;
    var file = window.location.pathname.split("/").pop() || "";
    var slug = file.replace(/\.html$/, "");
    if (!slug) return;
    var lang = window.location.pathname.indexOf("/en/") >= 0 ? "en" : (window.location.pathname.indexOf("/es/") >= 0 ? "es" : "pt");
    var copy = passeioCopy(lang);
    var saidaId = "";
    try {
      saidaId = new URLSearchParams(window.location.search || "").get("saida") || "";
    } catch (err) {
      saidaId = "";
    }
    function openSaidaPopup(id) {
      function go() {
        if (window.GcvSaidaPopup && typeof window.GcvSaidaPopup.open === "function") window.GcvSaidaPopup.open(id);
      }
      if (window.GcvSaidaPopup) {
        go();
        return;
      }
      var script = document.createElement("script");
      script.src = "/assets/js/excursoes-carousel.js?v=1.1.71";
      script.onload = go;
      document.head.appendChild(script);
    }
    fetch("/api/passeios.php?slug=" + encodeURIComponent(slug))
      .then(function (res) { return res.json(); })
      .then(function (payload) {
        if (!payload || !payload.ok || !payload.data || !payload.data.tarifa || payload.data.tem_passeio === false) return;
        var data = payload.data;
        var cta = document.querySelector(".gcv-detail-cta");
        if (!cta) {
          var sidebar = document.querySelector(".gcv-detail-sidebar");
          var photo = sidebar && sidebar.querySelector(".gcv-detail-main-image");
          if (!sidebar) return;
          cta = document.createElement("div");
          cta.className = "gcv-detail-cta";
          if (photo && photo.nextSibling) sidebar.insertBefore(cta, photo.nextSibling);
          else sidebar.appendChild(cta);
        }
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gcv-detail-roteiro";
        function cartItems() {
          var cart = window.GcvExcCart;
          return cart && typeof cart.items === "function" ? cart.items() : [];
        }
        function matchingItems() {
          var items = cartItems();
          if (data.passeioKey) return items.filter(function (it) { return it && it.passeioKey === data.passeioKey; });
          var prefix = "atrativo:" + (data.slug || slug) + ":";
          return items.filter(function (it) { return it && String(it.passeioKey || "").indexOf(prefix) === 0; });
        }
        function roteiroMark(kind) {
          if (kind === "check") {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 16 16");
            svg.setAttribute("class", "gcv-detail-roteiro__mark");
            svg.setAttribute("aria-hidden", "true");
            var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("fill", "currentColor");
            path.setAttribute("d", "M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z");
            svg.appendChild(path);
            return svg;
          }
          var plus = document.createElement("span");
          plus.className = "gcv-detail-roteiro__plus";
          plus.setAttribute("aria-hidden", "true");
          plus.textContent = "+";
          return plus;
        }
        function paintBtn() {
          if (saidaId) {
            btn.classList.remove("is-added");
            btn.textContent = "";
            btn.appendChild(roteiroMark("plus"));
            btn.appendChild(document.createTextNode(copy.joinTrip));
            return;
          }
          var mine = matchingItems().length > 0;
          btn.classList.toggle("is-added", mine);
          btn.textContent = "";
          btn.appendChild(roteiroMark(mine ? "check" : "plus"));
          btn.appendChild(document.createTextNode(mine ? copy.roteiroAdded : copy.shopAdd));
        }
        paintBtn();
        btn.addEventListener("click", function () {
          if (saidaId) {
            openSaidaPopup(saidaId);
            return;
          }
          var mine = matchingItems();
          var cart = window.GcvExcCart;
          if (mine.length && cart && typeof cart.remove === "function") {
            mine.forEach(function (it) { cart.remove(it.id); });
            paintBtn();
            return;
          }
          if (!window.GcvPasseioDialog) return;
          window.GcvPasseioDialog.open(data, paintBtn);
        });
        cta.textContent = "";
        cta.appendChild(btn);
        cta.classList.add("is-ready");
        document.addEventListener("click", function (e) {
          if (e.target && e.target.closest && e.target.closest("[data-gcv-cart-remove]")) setTimeout(paintBtn, 0);
        });
      })
      .catch(function () {});
  }

  var AVISO_MINIMO_EXCURSAO = 4;
  var AVISO_LUGARES_CARRO = 5;
  var AVISO_PASSAGEIROS_VEICULO = 4;
  var AVISO_TEXTOS = {
    pt: {
      modAlert: "A excursão será publicada em nossa plataforma e será confirmada a partir de 4 inscrições ({faltam}). Até lá, cancele quando quiser. Se não confirmar, devolvemos 100%.",
      modOk: "Seu grupo de {n} pessoas já completa as 4 inscrições mínimas: excursão confirmada! Ela continua publicada em nossa plataforma e outras pessoas poderão participar.",
      modPrivate: "Passeio exclusivo para o seu grupo. Ele não será publicado em nossa plataforma e fica confirmado assim que a reserva for concluída.",
      faltamOne: "faltam {n}",
      faltamMany: "faltam {n}",
      trSeat: "Reserve um lugar para o guia. O guia vai com vocês {onde}, saindo de {cidade}. Com {n} {pessoa}, sobra vaga {ondeVaga}. É só deixar 1 lugar livre para ele.",
      trSeatMany: "Reserve um lugar para o guia. O guia vai com vocês em um dos carros, saindo de {cidade}. Com {n} pessoas em {c} carros de 5 lugares, sobra vaga. É só deixar 1 lugar livre para ele.",
      trSeatCar: "no seu carro",
      trSeatCars: "em um dos carros",
      trSpareOne: "no carro de 5 lugares",
      trSpareMany: "em {c} carros de 5 lugares",
      personOne: "pessoa",
      personMany: "pessoas",
      trFull: "Lembre-se do lugar do guia. Com {n} pessoas, {completo} e não sobra espaço para o guia, que sai junto com vocês de {cidade}. Para o passeio acontecer, é importante ter 1 lugar disponível para ele, seja com mais um carro ou com outra organização do grupo. {bold}",
      trFullOne: "o carro de 5 lugares fica completo",
      trFullMany: "os {c} carros de 5 lugares ficam completos",
      trFullBold: "Sem esse lugar, infelizmente o passeio precisará ser cancelado.",
      trOpen: "Transporte incluso: o veículo com guia (até 4 passageiros + 1 guia), saindo de {cidade}, será publicado em nossa plataforma e depende das mesmas 4 inscrições para confirmar. Vagas abertas para outras pessoas: {livres}.",
      trInOne: "Transporte incluso: 1 veículo com guia, saindo de {cidade}. Cada veículo leva até 4 passageiros + 1 guia.",
      trInMany: "Transporte incluso: {v} veículos, cada um com guia, saindo de {cidade}. Cada veículo leva até 4 passageiros + 1 guia.",
      trFullGroupOne: "O veículo fica completo com o seu grupo.",
      trFullGroup: "Os veículos ficam completos com o seu grupo.",
      trLeftOne: "A vaga restante no último veículo será publicada em nossa plataforma para outras pessoas.",
      trLeftMany: "As {livres} vagas restantes no último veículo serão publicadas em nossa plataforma para outras pessoas.",
      trExOne: "Transporte exclusivo: 1 veículo só para o seu grupo, com até 4 passageiros + 1 guia, saindo de {cidade}.",
      trExMany: "Transporte exclusivo: {v} veículos só para o seu grupo, cada um com até 4 passageiros + 1 guia, saindo de {cidade}.",
    },
    en: {
      modAlert: "The group tour will be listed on our platform and is confirmed from 4 sign-ups ({faltam}). Until then, cancel anytime. If it is not confirmed, we refund 100%.",
      modOk: "Your group of {n} people already meets the minimum of 4 sign-ups: the group tour is confirmed! It stays listed on our platform and other people can join.",
      modPrivate: "A tour exclusive to your group. It will not be listed on our platform and is confirmed as soon as the booking is complete.",
      faltamOne: "1 still needed",
      faltamMany: "{n} still needed",
      trSeat: "Save a seat for the guide. The guide rides with you {onde}, leaving from {cidade}. With {n} {pessoa}, there is a spare seat {ondeVaga}. Just leave 1 seat free for the guide.",
      trSeatMany: "Save a seat for the guide. The guide rides with you in one of the cars, leaving from {cidade}. With {n} people in {c} cars with 5 seats, there is a spare seat. Just leave 1 seat free for the guide.",
      trSeatCar: "in your car",
      trSeatCars: "in one of the cars",
      trSpareOne: "in the 5-seat car",
      trSpareMany: "across {c} cars with 5 seats",
      personOne: "person",
      personMany: "people",
      trFull: "Remember the guide's seat. With {n} people, {completo} and there is no room for the guide, who leaves with you from {cidade}. For the tour to go ahead, it is important to have 1 seat available for the guide, either with one more car or by organizing the group another way. {bold}",
      trFullOne: "the 5-seat car is full",
      trFullMany: "the {c} cars with 5 seats are full",
      trFullBold: "Without that seat, the tour will unfortunately have to be cancelled.",
      trOpen: "Transfer included: the vehicle with a guide (up to 4 passengers + 1 guide), leaving from {cidade}, will be listed on our platform and depends on the same 4 sign-ups to be confirmed. Open seats for other people: {livres}.",
      trInOne: "Transfer included: 1 vehicle with a guide, leaving from {cidade}. Each vehicle takes up to 4 passengers + 1 guide.",
      trInMany: "Transfer included: {v} vehicles, each with a guide, leaving from {cidade}. Each vehicle takes up to 4 passengers + 1 guide.",
      trFullGroupOne: "The vehicle is full with your group.",
      trFullGroup: "The vehicles are full with your group.",
      trLeftOne: "The remaining seat in the last vehicle will be listed on our platform for other people.",
      trLeftMany: "The {livres} remaining seats in the last vehicle will be listed on our platform for other people.",
      trExOne: "Private transfer: 1 vehicle just for your group, with up to 4 passengers + 1 guide, leaving from {cidade}.",
      trExMany: "Private transfer: {v} vehicles just for your group, each with up to 4 passengers + 1 guide, leaving from {cidade}.",
    },
    es: {
      modAlert: "La excursión se publicará en nuestra plataforma y se confirmará a partir de 4 inscripciones ({faltam}). Hasta entonces, cancela cuando quieras. Si no se confirma, devolvemos el 100%.",
      modOk: "Su grupo de {n} personas ya completa las 4 inscripciones mínimas: ¡excursión confirmada! Sigue publicada en nuestra plataforma y otras personas podrán participar.",
      modPrivate: "Paseo exclusivo para su grupo. No se publicará en nuestra plataforma y queda confirmado en cuanto se complete la reserva.",
      faltamOne: "falta {n}",
      faltamMany: "faltan {n}",
      trSeat: "Reserve un lugar para el guía. El guía va con ustedes {onde}, saliendo de {cidade}. Con {n} {pessoa}, sobra un lugar {ondeVaga}. Solo hay que dejar 1 lugar libre para él.",
      trSeatMany: "Reserve un lugar para el guía. El guía va con ustedes en uno de los coches, saliendo de {cidade}. Con {n} personas en {c} coches de 5 plazas, sobra un lugar. Solo hay que dejar 1 lugar libre para él.",
      trSeatCar: "en su coche",
      trSeatCars: "en uno de los coches",
      trSpareOne: "en el coche de 5 plazas",
      trSpareMany: "en {c} coches de 5 plazas",
      personOne: "persona",
      personMany: "personas",
      trFull: "Recuerde el lugar del guía. Con {n} personas, {completo} y no queda espacio para el guía, que sale con ustedes desde {cidade}. Para que el paseo se realice, es importante tener 1 lugar disponible para él, ya sea con un coche más o con otra organización del grupo. {bold}",
      trFullOne: "el coche de 5 plazas queda completo",
      trFullMany: "los {c} coches de 5 plazas quedan completos",
      trFullBold: "Sin ese lugar, lamentablemente el paseo tendrá que cancelarse.",
      trOpen: "Traslado incluido: el vehículo con guía (hasta 4 pasajeros + 1 guía), saliendo de {cidade}, se publicará en nuestra plataforma y depende de las mismas 4 inscripciones para confirmarse. Plazas abiertas para otras personas: {livres}.",
      trInOne: "Traslado incluido: 1 vehículo con guía, saliendo de {cidade}. Cada vehículo lleva hasta 4 pasajeros + 1 guía.",
      trInMany: "Traslado incluido: {v} vehículos, cada uno con guía, saliendo de {cidade}. Cada vehículo lleva hasta 4 pasajeros + 1 guía.",
      trFullGroupOne: "El vehículo queda completo con su grupo.",
      trFullGroup: "Los vehículos quedan completos con su grupo.",
      trLeftOne: "La plaza restante en el último vehículo se publicará en nuestra plataforma para otras personas.",
      trLeftMany: "Las {livres} plazas restantes en el último vehículo se publicarán en nuestra plataforma para otras personas.",
      trExOne: "Traslado exclusivo: 1 vehículo solo para su grupo, con hasta 4 pasajeros + 1 guía, saliendo de {cidade}.",
      trExMany: "Traslado exclusivo: {v} vehículos solo para su grupo, cada uno con hasta 4 pasajeros + 1 guía, saliendo de {cidade}.",
    },
  };

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
        only4x4: "Somente veículos 4x4. Sem translado, o deslocamento é no seu próprio veículo.",
        peopleCap: "Até {n} pessoas neste passeio.",
        from: "De",
        person: "pessoa",
        peopleWord: "pessoas",
        guideLead: "É necessário uma vaga para o guia no seu veículo.",
        modeWait: "Será confirmada a partir de {n} inscrições. Até lá, cancele quando quiser. Se não confirmar, devolvemos 100%.",
        modeOk: "Excursão confirmada com {n} inscrições.",
        modePrivate: "Este passeio é exclusivo para o seu grupo.",
        modeMore: "Saiba mais",
        guideSeatError: "Com {people} pessoas, um carro de 5 lugares deixa o guia sem vaga. Leve {cars} carros e reserve 1 lugar para o guia. Sem essa vaga, o passeio pode ser cancelado.",
        rideCars: "Com {people} pessoas são {cars} carros e {guides} guias. Cada carro leva até 4 pessoas.",
        guideRest: "Com {people}, o grupo precisa de {cars}.",
        car: "carro",
        cars: "carros",
        guides: "guias",
        duration: "Duração",
        durationOf: "Duração de",
        hourExact: "hs",
        total: "Total",
        pixIn: "no PIX",
        cardBr: "Cartão brasileiro {price} em até {n}x de {inst}",
        cardIntl: "Cartão internacional {price}",
        extras: "Guia Local",
        pickLang: "Selecione o idioma",
        bilingual: "Guia bilíngue",
        bilingualHint: "Condutor credenciado que fala inglês ou espanhol",
        bilingualPrice: "+ R$ {price} no total",
        bilingualShort: "guia bilíngue",
        langEn: "Inglês",
        langEs: "Espanhol",
        langBr: "Português",
        chipDuration: "{t} de duração",
        chipLeave: "De {city}",
        chipPerson: "/ pessoa",
        add: "Adicionar ao carrinho",
        roteiroBtn: "Adicionar ao roteiro",
        shopAdd: "Adicionar Passeio",
        joinTrip: "Inscrever-me na Excursão",
        roteiroAdded: "Adicionado",
        close: "Fechar",
        addedBtn: "Adicionado",
        fail: "Não entrou no carrinho. Escolha uma data futura.",
        sameDay: "Você já escolheu um passeio para este dia. Remova-o para escolher outro.",
        max: "O roteiro tem no máximo 3 atrativos.",
        sameDayTitle: "Faça no mesmo dia",
        sameDayHint: "Até {n} atrativos no mesmo dia, num só passeio.",
        only: "Só {name}",
        needMore: "Este atrativo só vai junto com mais um. Escolha o outro para fechar o passeio.",
        perPerson: "por pessoa",
        leaving: "saindo de",
        noCity: "Nenhuma cidade de saída em comum.",
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
        only4x4: "4x4 vehicles only. Without a transfer, you travel in your own vehicle.",
        peopleCap: "Up to {n} people on this tour.",
        from: "From",
        person: "person",
        peopleWord: "people",
        guideLead: "A seat for the guide is required in your vehicle.",
        modeWait: "It will be confirmed from {n} sign-ups. Until then, cancel anytime. If it is not confirmed, we refund 100%.",
        modeOk: "Group tour confirmed with {n} sign-ups.",
        modePrivate: "This tour is exclusive to your group.",
        modeMore: "Learn more",
        guideSeatError: "With {people} people, a 5-seat car leaves no seat for the guide. Bring {cars} cars and keep 1 seat for the guide. Without that seat, the tour may be cancelled.",
        rideCars: "With {people} people that is {cars} cars and {guides} guides. Each car takes up to 4 people.",
        guideRest: "With {people}, the group needs {cars}.",
        car: "car",
        cars: "cars",
        guides: "guides",
        duration: "Duration",
        durationOf: "Duration of",
        hourExact: "h",
        total: "Total",
        pixIn: "with PIX",
        cardBr: "Brazilian card {price} in up to {n}x of {inst}",
        cardIntl: "International card {price}",
        extras: "Local guide",
        pickLang: "Select the language",
        bilingual: "Bilingual guide",
        bilingualHint: "Licensed guide who speaks English or Spanish",
        bilingualPrice: "+ R$ {price} on the total",
        bilingualShort: "bilingual guide",
        langEn: "English",
        langEs: "Spanish",
        langBr: "Portuguese",
        chipDuration: "{t} duration",
        chipLeave: "From {city}",
        chipPerson: "/ person",
        add: "Add to cart",
        roteiroBtn: "Add to itinerary",
        shopAdd: "Add tour",
        joinTrip: "Join this departure",
        roteiroAdded: "Added",
        close: "Close",
        addedBtn: "Added",
        fail: "It was not added. Pick a future date.",
        sameDay: "You already chose a tour for this day. Remove it to pick another.",
        max: "An itinerary has at most 3 places.",
        sameDayTitle: "Do it on the same day",
        sameDayHint: "Up to {n} places on the same day, in one tour.",
        only: "Only {name}",
        needMore: "This place only goes together with one more. Pick the other one to complete the tour.",
        perPerson: "per person",
        leaving: "leaving from",
        noCity: "No departure city in common.",
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
        only4x4: "Solo vehículos 4x4. Sin traslado, el desplazamiento es en su propio vehículo.",
        peopleCap: "Hasta {n} personas en este paseo.",
        from: "Desde",
        person: "persona",
        peopleWord: "personas",
        guideLead: "Se necesita un lugar para el guía en su vehículo.",
        modeWait: "Se confirmará a partir de {n} inscripciones. Hasta entonces, cancela cuando quieras. Si no se confirma, devolvemos el 100%.",
        modeOk: "Excursión confirmada con {n} inscripciones.",
        modePrivate: "Este paseo es exclusivo para su grupo.",
        modeMore: "Saber más",
        guideSeatError: "Con {people} personas, un coche de 5 plazas deja al guía sin lugar. Lleve {cars} coches y reserve 1 lugar para el guía. Sin esa plaza, el paseo puede cancelarse.",
        rideCars: "Con {people} personas son {cars} coches y {guides} guías. Cada coche lleva hasta 4 personas.",
        guideRest: "Con {people}, el grupo necesita {cars}.",
        car: "coche",
        cars: "coches",
        guides: "guías",
        duration: "Duración",
        durationOf: "Duración de",
        hourExact: " h",
        total: "Total",
        pixIn: "con PIX",
        cardBr: "Tarjeta brasileña {price} en hasta {n}x de {inst}",
        cardIntl: "Tarjeta internacional {price}",
        extras: "Guía local",
        pickLang: "Selecciona el idioma",
        bilingual: "Guía bilingüe",
        bilingualHint: "Guía acreditado que habla inglés o español",
        bilingualPrice: "+ R$ {price} en el total",
        bilingualShort: "guía bilingüe",
        langEn: "Inglés",
        langEs: "Español",
        langBr: "Portugués",
        chipDuration: "{t} de duración",
        chipLeave: "De {city}",
        chipPerson: "/ persona",
        add: "Agregar al carrito",
        roteiroBtn: "Añadir al itinerario",
        shopAdd: "Agregar paseo",
        joinTrip: "Inscribirme en la excursión",
        roteiroAdded: "Añadido",
        close: "Cerrar",
        addedBtn: "Añadido",
        fail: "No se agregó. Elige una fecha futura.",
        sameDay: "Ya elegiste un paseo para este día. Quítalo para elegir otro.",
        max: "El itinerario tiene como máximo 3 lugares.",
        sameDayTitle: "Hazlo el mismo día",
        sameDayHint: "Hasta {n} lugares el mismo día, en un solo paseo.",
        only: "Solo {name}",
        needMore: "Este lugar solo va junto con uno más. Elige el otro para cerrar el paseo.",
        perPerson: "por persona",
        leaving: "saliendo de",
        noCity: "Ninguna ciudad de salida en común.",
        noPrice: "Este paseo aún no está a la venta.",
        dayTaken: "Ya tienes un paseo en el carrito en esta fecha. Elige otra fecha.",
      },
    };
    var code = lang === "en" || lang === "es" ? lang : "pt";
    var copy = all[code] || all.pt;
    var avisos = AVISO_TEXTOS[code] || AVISO_TEXTOS.pt;
    Object.keys(avisos).forEach(function (key) { copy[key] = avisos[key]; });
    copy.siteLang = code;
    return copy;
  }

  function passeioHoras(minutos) {
    minutos = parseInt(minutos, 10) || 0;
    if (!minutos) return "";
    var h = Math.round(minutos / 60);
    if (h < 1) h = 1;
    return h + "h";
  }

  function minutosNoMapa(map, key, fallback) {
    if (map && Object.prototype.hasOwnProperty.call(map, key)) return parseInt(map[key], 10) || 0;
    return parseInt(fallback, 10) || 0;
  }

  function passeioReais(cents) {
    var n = parseInt(cents, 10) || 0;
    var sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    var reais = Math.floor(n / 100);
    var cent = n % 100;
    return sign + "R$ " + reais + (cent ? "," + (cent < 10 ? "0" : "") + cent : "");
  }

  function passeioIsoDeData(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  /** Agora em America/Sao_Paulo: data ISO e minutos desde meia-noite. */
  function passeioPartesChapada(nowMs) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    var map = {};
    fmt.formatToParts(new Date(nowMs == null ? Date.now() : nowMs)).forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    var hour = parseInt(map.hour, 10) || 0;
    if (hour === 24) hour = 0;
    return {
      iso: map.year + "-" + map.month + "-" + map.day,
      minutes: hour * 60 + (parseInt(map.minute, 10) || 0),
    };
  }

  function passeioIsoMaisDias(iso, days) {
    var d = new Date(iso + "T12:00:00Z");
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + days);
    var m = String(d.getUTCMonth() + 1).padStart(2, "0");
    var day = String(d.getUTCDate()).padStart(2, "0");
    return d.getUTCFullYear() + "-" + m + "-" + day;
  }

  /**
   * Passeio avulso: antes das 4h20 (Brasília) vale o mesmo dia.
   * A partir das 4h20, só de amanhã em diante. Datas passadas nunca.
   */
  function passeioPisoData(nowMs) {
    var agora = passeioPartesChapada(nowMs);
    if (!agora.iso || agora.iso.indexOf("undefined") >= 0) {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      return passeioIsoDeData(d);
    }
    if (agora.minutes < 4 * 60 + 20) return agora.iso;
    return passeioIsoMaisDias(agora.iso, 1);
  }

  function passeioAmanha() {
    return passeioPisoData();
  }

  function passeioDiaSeguinte(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d.getTime())) return passeioAmanha();
    d.setDate(d.getDate() + 1);
    return passeioIsoDeData(d);
  }

  function passeioItensCarrinho() {
    var cart = window.GcvExcCart;
    return cart && typeof cart.items === "function" ? cart.items() : [];
  }

  /** Datas que já têm outro passeio no carrinho. O próprio roteiro em edição continua livre. */
  function passeioDatasOcupadas(exceptKey) {
    var map = {};
    passeioItensCarrinho().forEach(function (it) {
      if (!it || !it.dateIso) return;
      if (exceptKey && it.passeioKey === exceptKey) return;
      map[String(it.dateIso).slice(0, 10)] = true;
    });
    return map;
  }

  /** Mês do passeio que já está no carrinho, para o calendário abrir nele. */
  function passeioMesIncluido() {
    var iso = "";
    passeioItensCarrinho().forEach(function (it) {
      var d = it && it.dateIso ? String(it.dateIso).slice(0, 10) : "";
      if (d && (!iso || d < iso)) iso = d;
    });
    return iso;
  }

  function passeioChave(data, sel) {
    if (data && data.passeioKey) return String(data.passeioKey);
    var ids = (sel && sel.ids ? sel.ids : []).map(String).slice().sort();
    return "atrativo:" + ((data && data.slug) || "") + ":" + ids.join(",");
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

  var PASSEIO_PRECO_CAMPOS = ["excursao_pessoa_cents", "excursao_transporte_cents", "exclusivo_pessoa_cents", "exclusivo_transporte_cents"];

  function passeioCidadeVende(tarifa, cidade) {
    var key = passeioCidadeKey(cidade);
    var row = tarifa && tarifa.cidades && tarifa.cidades[key];
    if (!row) return false;
    return PASSEIO_PRECO_CAMPOS.some(function (campo) { return (parseInt(row[campo], 10) || 0) > 0; });
  }

  var PASSEIO_CIDADE_ORDEM = ["alto-paraiso", "sao-jorge", "cavalcante"];
  var PASSEIO_CIDADE_ROTULO = {
    "alto-paraiso": ["Alto Paraíso de Goiás", "Alto Paraíso"],
    "sao-jorge": ["São Jorge", "São Jorge"],
    cavalcante: ["Cavalcante", "Cavalcante"],
  };

  function passeioRotuloCidade(key) {
    var pair = PASSEIO_CIDADE_ROTULO[key] || [key, key];
    return { key: key, nome: pair[0], curta: pair[1] };
  }

  /** Lista gravada na experiência. Array vazio é saída nenhuma, não as três cidades. */
  function passeioEmbarquesChaves(source) {
    if (source && Array.isArray(source.embarques)) return source.embarques.slice();
    return null;
  }

  function passeioSaidasLista(source) {
    var chaves = passeioEmbarquesChaves(source);
    if (chaves) {
      return chaves.filter(function (key) { return !!PASSEIO_CIDADE_ROTULO[key]; }).map(passeioRotuloCidade);
    }
    var list = source && source.saidas;
    if (list && list.length) return list;
    var tarifa = source && (source.tarifa || source);
    var cidades = (tarifa && tarifa.cidades) || {};
    return Object.keys(cidades).filter(function (key) {
      return PASSEIO_CIDADE_ROTULO[key] && passeioCidadeVende(tarifa, PASSEIO_CIDADE_ROTULO[key][0]);
    }).map(passeioRotuloCidade);
  }

  function passeioChavesDe(source) {
    var chaves = passeioEmbarquesChaves(source);
    if (chaves) return chaves.filter(function (key) { return !!PASSEIO_CIDADE_ROTULO[key]; });
    return passeioSaidasLista(source).map(function (c) { return c.key || passeioCidadeKey(c.nome); });
  }

  /** Uma experiência: as saídas dela. Várias: só a cidade que está em todas. */
  function passeioCidadesDaEscolha(box, data) {
    var listas = [passeioChavesDe(data)];
    var opcoes = passeioOpcoes(data);
    passeioExtras(box).forEach(function (id) {
      var part = opcoes.filter(function (p) { return String(p.id) === id; })[0];
      if (part) listas.push(passeioChavesDe(part));
    });
    var keys = listas[0].filter(function (key) {
      return listas.every(function (lista) { return lista.indexOf(key) >= 0; });
    });
    keys.sort(function (a, b) { return PASSEIO_CIDADE_ORDEM.indexOf(a) - PASSEIO_CIDADE_ORDEM.indexOf(b); });
    return keys.map(passeioRotuloCidade);
  }

  function passeioPrecoRelacao(tarifa, campo, fallback) {
    if (tarifa && tarifa[campo] != null && tarifa[campo] !== "") {
      var n = parseInt(tarifa[campo], 10);
      if (isFinite(n)) return n;
    }
    if (fallback) return passeioPrecoRelacao(tarifa, fallback);
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

  /** Parceiros do passeio de onde a pessoa veio (?junto=ids), se fecham um combo cadastrado. */
  function passeioJuntoDaUrl(data) {
    var raw = "";
    try {
      raw = new URLSearchParams(window.location.search || "").get("junto") || "";
    } catch (err) {
      raw = "";
    }
    var want = raw.split(",").map(function (s) { return String(s).trim(); }).filter(Boolean).sort();
    if (!want.length) return [];
    var combo = passeioCombos(data).filter(function (c) { return c.ids.join("|") === want.join("|"); })[0];
    return combo ? combo.ids.slice() : [];
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

  function passeioLimitePessoas(lista) {
    var nums = [];
    (lista || []).forEach(function (item) {
      var n = parseInt(item && item.max_participantes, 10);
      if (n >= 4 && n <= 15) nums.push(n);
    });
    if (!nums.length) return { maxPessoas: 15, maxDefinido: false };
    return { maxPessoas: Math.min.apply(null, nums), maxDefinido: true };
  }

  function passeioSelecao(box, data) {
    var saidas = passeioCidadesDaEscolha(box, data);
    var cidadeEl = box.querySelector("[data-passeio-city]");
    var cidade = cidadeEl ? cidadeEl.value : "";
    if (!saidas.some(function (c) { return c.nome === cidade; })) cidade = saidas.length ? saidas[0].nome : "";
    var key = passeioCidadeKey(cidade);
    var extras = passeioExtras(box).sort();
    var opcoes = passeioOpcoes(data);
    var extraNames = extras.map(function (id) {
      var part = opcoes.filter(function (p) { return String(p.id) === id; })[0];
      return part ? part.title_pt : "";
    }).filter(Boolean);
    var semCidade = !saidas.length;
    if (!extras.length) {
      var limiteSolo = passeioLimitePessoas([data]);
      return {
        ids: [],
        names: [data.title],
        minutes: semCidade ? 0 : minutosNoMapa(data.duracao_cidades, key, data.duration_minutes),
        exclusivo: semCidade ? 0 : passeioPrecoCidade(data.tarifa, cidade, "exclusivo_pessoa_cents"),
        excursao: semCidade ? 0 : passeioPrecoCidade(data.tarifa, cidade, "excursao_pessoa_cents"),
        exclusivo5: semCidade ? 0 : passeioPrecoCidade(data.tarifa, cidade, "exclusivo_pessoa_5_cents"),
        excursao5: semCidade ? 0 : passeioPrecoCidade(data.tarifa, cidade, "excursao_pessoa_5_cents"),
        exclusivoT: semCidade ? 0 : passeioPrecoCidade(data.tarifa, cidade, "exclusivo_transporte_cents", "exclusivo_pessoa_cents"),
        excursaoT: semCidade ? 0 : passeioPrecoCidade(data.tarifa, cidade, "excursao_transporte_cents", "excursao_pessoa_cents"),
        quorum: parseInt(data.tarifa && data.tarifa.quorum, 10) || 4,
        incompleto: false,
        semCidade: semCidade,
        somente4x4: !!data.somente_4x4,
        maxPessoas: limiteSolo.maxPessoas,
        maxDefinido: limiteSolo.maxDefinido,
      };
    }
    var combo = passeioCombos(data).filter(function (c) { return c.ids.join("|") === extras.join("|"); })[0];
    if (!combo) {
      var partesIncompletas = extras.map(function (id) {
        return opcoes.filter(function (p) { return String(p.id) === id; })[0];
      }).filter(Boolean);
      var limiteIncompleto = passeioLimitePessoas([data].concat(partesIncompletas));
      return { ids: extras, names: [data.title].concat(extraNames), minutes: 0, exclusivo: 0, excursao: 0, exclusivo5: 0, excursao5: 0, exclusivoT: 0, excursaoT: 0, incompleto: true, semCidade: semCidade, somente4x4: !!data.somente_4x4, maxPessoas: limiteIncompleto.maxPessoas, maxDefinido: limiteIncompleto.maxDefinido };
    }
    var tour = combo.tour;
    var limiteCombo = passeioLimitePessoas([data, tour].concat(tour.attractions || []));
    return {
      ids: extras,
      tourId: tour.id,
      names: (tour.attractions || []).map(function (p) { return p.title_pt; }),
      minutes: semCidade ? 0 : minutosNoMapa(tour.duracao_cidades, key, tour.duration_minutes),
      exclusivo: semCidade ? 0 : passeioPrecoCidade(tour.tarifa, cidade, "exclusivo_pessoa_cents"),
      excursao: semCidade ? 0 : passeioPrecoCidade(tour.tarifa, cidade, "excursao_pessoa_cents"),
      exclusivo5: semCidade ? 0 : passeioPrecoCidade(tour.tarifa, cidade, "exclusivo_pessoa_5_cents"),
      excursao5: semCidade ? 0 : passeioPrecoCidade(tour.tarifa, cidade, "excursao_pessoa_5_cents"),
      exclusivoT: semCidade ? 0 : passeioPrecoCidade(tour.tarifa, cidade, "exclusivo_transporte_cents", "exclusivo_pessoa_cents"),
      excursaoT: semCidade ? 0 : passeioPrecoCidade(tour.tarifa, cidade, "excursao_transporte_cents", "excursao_pessoa_cents"),
      quorum: parseInt(tour.tarifa && tour.tarifa.quorum, 10) || 4,
      incompleto: false,
      semCidade: semCidade,
      somente4x4: !!(data.somente_4x4 || tour.somente_4x4 || (tour.attractions || []).some(function (p) { return p.somente_4x4; })),
      maxPessoas: limiteCombo.maxPessoas,
      maxDefinido: limiteCombo.maxDefinido,
    };
  }

  function passeioMostraGuia(modalidade, pessoas, comTranslado) {
    return !comTranslado;
  }

  function passeioCarros(pessoas) {
    return Math.max(1, Math.ceil((parseInt(pessoas, 10) || 1) / 4));
  }

  var PASSEIO_CARD_BR_PCT = 15;
  var PASSEIO_CARD_INTL_PCT = 25;
  var PASSEIO_CARD_INST = 4;
  var PASSEIO_BILINGUE_CENTS = 4000;

  /**
   * Português soma zero. Outro idioma soma o acréscimo uma vez no total.
   * fixo: centavos (padrão R$ 40). percentual: inteiro sobre o total do passeio.
   */
  function passeioBilingueCents(tarifa, totalCents, ligado) {
    if (!ligado) return 0;
    var tipo = tarifa && tarifa.bilingue_tipo;
    var valor = tarifa && tarifa.bilingue_valor;
    if (tipo !== "percentual" && tipo !== "fixo") {
      var ap = tarifa && tarifa.cidades && tarifa.cidades["alto-paraiso"];
      if (ap && ap.bilingue_tipo === "percentual") {
        tipo = "percentual";
        valor = ap.bilingue_valor;
      } else if (ap && ap.bilingue_valor != null && ap.bilingue_valor !== "") {
        tipo = "fixo";
        valor = ap.bilingue_valor;
      }
    }
    if (tipo === "percentual") {
      var pct = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
      var base = Math.max(0, parseInt(totalCents, 10) || 0);
      return Math.round((base * pct) / 100);
    }
    var cents = valor;
    if ((cents == null || cents === "") && tipo !== "fixo") cents = tarifa && tarifa.bilingue_cents;
    if (tipo === "fixo" && (cents == null || cents === "")) cents = tarifa && tarifa.bilingue_cents;
    if (cents == null || cents === "") return PASSEIO_BILINGUE_CENTS;
    return Math.max(0, parseInt(cents, 10) || 0);
  }

  /** Mesma conta de api/helpers/payments/pricing.php: sobe o percentual e arredonda o centavo para cima. */
  function passeioAcrescimo(baseCents, pct) {
    var base = Math.max(0, parseInt(baseCents, 10) || 0);
    if (!(pct > 0)) return base;
    var factor = Math.round((100 + pct) * 100);
    return Math.floor((base * factor + 9999) / 10000);
  }

  /**
   * O tarifário (já com o idioma) é o PIX.
   * Cartão brasileiro: +15%, em até 4x. Internacional: +25%; o dólar com spread vem da cotação do servidor.
   */
  function passeioPagamento(grossCents) {
    var pix = Math.max(0, parseInt(grossCents, 10) || 0);
    var card = passeioAcrescimo(pix, PASSEIO_CARD_BR_PCT);
    var n = PASSEIO_CARD_INST;
    return {
      pix: pix,
      card: card,
      n: n,
      inst: n > 0 ? Math.ceil(card / n) : card,
      intl: passeioAcrescimo(pix, PASSEIO_CARD_INTL_PCT),
      usd: 0,
    };
  }

  function passeioUsd(cents) {
    return "US$ " + ((parseInt(cents, 10) || 0) / 100).toFixed(2);
  }

  function passeioPessoasCobradas(sel, modalidade, pessoas, comTranslado) {
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    var quorum = parseInt(sel && sel.quorum, 10) || 4;
    if (modalidade === "exclusivo" && comTranslado) return quorum * passeioCarros(pessoas);
    if (modalidade === "exclusivo" && pessoas <= quorum) return quorum;
    return pessoas;
  }

  /**
   * Sem translado, excursão: até 4 pessoas pagam o PAX 4-. Da 5ª em diante,
   * total = 4 × PAX 4- + (pessoas − 4) × PAX 5+. PAX 5+ vazio ainda repete o PAX 4-
   * para não zerar um passeio já publicado.
   * Sem translado, privativo de 1 pessoa até o quórum: quórum × PAX 4- Excursão.
   * Acima do quórum: esse pacote + (pessoas − quórum) × PAX 5+ Privativo.
   * Com translado não há faixa: o preço por pessoa (ou por carro) não muda.
   */
  function passeioPax5(sel, modalidade) {
    var raw = modalidade === "exclusivo" ? sel && sel.exclusivo5 : sel && sel.excursao5;
    var base = modalidade === "exclusivo" ? sel && sel.exclusivo : sel && sel.excursao;
    raw = parseInt(raw, 10) || 0;
    return raw > 0 ? raw : (parseInt(base, 10) || 0);
  }

  function passeioFaixaPartes(sel, modalidade, pessoas, comTranslado) {
    if (comTranslado) return null;
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    var quorum = parseInt(sel && sel.quorum, 10) || 4;
    var exc4 = parseInt(sel && sel.excursao, 10) || 0;
    var exc5raw = parseInt(sel && sel.excursao5, 10) || 0;
    var exc5 = exc5raw > 0 ? exc5raw : exc4;
    var pri5 = passeioPax5(sel, "exclusivo");
    if (modalidade === "exclusivo") {
      if (pessoas <= quorum) return [{ q: quorum, u: exc4 }];
      return [{ q: quorum, u: exc4 }, { q: pessoas - quorum, u: pri5 }];
    }
    if (pessoas <= 4) return [{ q: pessoas, u: exc4 }];
    return [{ q: 4, u: exc4 }, { q: pessoas - 4, u: exc5 }];
  }

  function passeioTotalCents(sel, modalidade, pessoas, comTranslado) {
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    var quorum = parseInt(sel && sel.quorum, 10) || 4;
    if (comTranslado) {
      var unitT = modalidade === "exclusivo" ? sel.exclusivoT : sel.excursaoT;
      if (modalidade === "exclusivo") return unitT * quorum * passeioCarros(pessoas);
      return unitT * pessoas;
    }
    var partes = passeioFaixaPartes(sel, modalidade, pessoas, false) || [];
    var total = 0;
    partes.forEach(function (p) { total += p.q * p.u; });
    return total;
  }

  function avisoPreenche(tpl, map) {
    return String(tpl || "").replace(/\{(\w+)\}/g, function (_, key) {
      return map && map[key] != null ? String(map[key]) : "";
    });
  }

  function avisoPessoas(n) {
    n = parseInt(n, 10);
    if (!n || n < 1) n = 1;
    return n;
  }

  function avisoEhPrivativo(modalidade) {
    return modalidade === "exclusivo" || modalidade === "privativo";
  }

  function avisoComTranslado(transporte) {
    return transporte === "1" || transporte === 1 || transporte === true || transporte === "com";
  }

  function avisoTextosDe(textos) {
    return textos && textos.modAlert ? textos : AVISO_TEXTOS.pt;
  }

  function getAvisoModalidade(n, modalidade, textos) {
    var t = avisoTextosDe(textos);
    n = avisoPessoas(n);
    if (avisoEhPrivativo(modalidade)) {
      return { tipo: "info", texto: t.modPrivate };
    }
    if (n < AVISO_MINIMO_EXCURSAO) {
      var faltamN = AVISO_MINIMO_EXCURSAO - n;
      var faltam = avisoPreenche(t.faltamMany, { n: faltamN });
      return { tipo: "alerta", texto: avisoPreenche(t.modAlert, { n: n, faltam: faltam }) };
    }
    return { tipo: "sucesso", texto: avisoPreenche(t.modOk, { n: n }) };
  }

  function getAvisoTransporte(n, modalidade, transporte, cidade, textos) {
    var t = avisoTextosDe(textos);
    n = avisoPessoas(n);
    cidade = cidade == null ? "" : String(cidade);
    if (!avisoComTranslado(transporte)) {
      var c = Math.ceil(n / AVISO_LUGARES_CARRO);
      if (n % AVISO_LUGARES_CARRO !== 0) {
        if (c > 1 && t.trSeatMany) {
          return {
            tipo: "info",
            texto: avisoPreenche(t.trSeatMany, { cidade: cidade, n: n, c: c }),
          };
        }
        return {
          tipo: "info",
          texto: avisoPreenche(t.trSeat, {
            onde: t.trSeatCar,
            cidade: cidade,
            n: n,
            pessoa: n === 1 ? t.personOne : t.personMany,
            ondeVaga: t.trSpareOne,
          }),
        };
      }
      return {
        tipo: "alerta",
        texto: avisoPreenche(t.trFull, {
          n: n,
          cidade: cidade,
          completo: c === 1 ? t.trFullOne : avisoPreenche(t.trFullMany, { c: c }),
          bold: t.trFullBold,
        }),
      };
    }
    var v = Math.ceil(n / AVISO_PASSAGEIROS_VEICULO);
    var livres = v * AVISO_PASSAGEIROS_VEICULO - n;
    if (avisoEhPrivativo(modalidade)) {
      return {
        tipo: "sucesso",
        texto: v === 1 ? avisoPreenche(t.trExOne, { cidade: cidade }) : avisoPreenche(t.trExMany, { v: v, cidade: cidade }),
      };
    }
    if (n < AVISO_MINIMO_EXCURSAO) {
      return { tipo: "alerta", texto: avisoPreenche(t.trOpen, { cidade: cidade, livres: livres, n: n }) };
    }
    var cabeca = v === 1 ? avisoPreenche(t.trInOne, { cidade: cidade }) : avisoPreenche(t.trInMany, { v: v, cidade: cidade });
    var resto = v === 1 && t.trFullGroupOne ? t.trFullGroupOne : t.trFullGroup;
    if (livres === 1) resto = t.trLeftOne;
    else if (livres > 1) resto = avisoPreenche(t.trLeftMany, { livres: livres });
    return { tipo: "sucesso", texto: cabeca + " " + resto };
  }

  function passeioBuilderHtml(copy, data) {
    var css =
      ".gcv-passeios{--gp-green:#14532d;--gp-green-2:#0f3d2e;--gp-line:#e6eeea;--gp-soft:#f4f7f5;--gp-ink:#0f2a1d;--gp-muted:#64748b;--gp-blue:#2563eb;margin:1.25rem auto;max-width:460px;padding:0;border:1px solid #e7eeea;border-radius:22px;background:#fff;box-shadow:0 10px 32px rgba(15,42,29,.08);position:relative;overflow:hidden;color:var(--gp-ink)}" +
      ".gcv-passeios__now{display:flex;align-items:center;gap:.55rem;margin:0;padding:.9rem 1.15rem .35rem;font-size:.95rem;font-weight:600;letter-spacing:0;line-height:1.2;color:#64748b;background:#fff}" +
      ".gcv-passeios__now .ti{font-size:1.2rem;line-height:1}" +
      ".gcv-passeios__body{padding:1rem 1.1rem .4rem}" +
      ".gcv-passeios__grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem 1rem}" +
      ".gcv-passeios__field{display:flex;flex-direction:column;gap:.3rem;min-width:0;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--gp-muted)}" +
      ".gcv-passeios__field--wide{grid-column:1 / -1}" +
      ".gcv-passeios__hide{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;border:0!important;padding:0!important;margin:-1px!important}" +
      ".gcv-passeios input,.gcv-passeios select{width:100%;margin:0;padding:.55rem .7rem;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-sizing:border-box;font:inherit;font-size:.95rem;text-transform:none;letter-spacing:0;color:var(--gp-ink)}" +
      ".gcv-passeios__stepper{display:flex;align-items:stretch;height:2.7rem;border:1px solid #e2e8f0;border-radius:12px;background:#fff;overflow:hidden}" +
      ".gcv-passeios__stepper button{flex:none;width:2.7rem;border:0;background:#eef6f1;color:var(--gp-green);font-size:1.15rem;font-weight:800;cursor:pointer}" +
      ".gcv-passeios__stepper button:hover{background:#e3efe8}.gcv-passeios__stepper button:disabled{opacity:.35;cursor:default}" +
      ".gcv-passeios .gcv-passeios__stepper input{flex:1;min-width:0;border:0;border-radius:0;padding:0;text-align:center;font-weight:800;font-size:1rem;-moz-appearance:textfield}" +
      ".gcv-passeios__stepper input::-webkit-outer-spin-button,.gcv-passeios__stepper input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}" +
      ".gcv-passeios__seg{display:flex;gap:4px;padding:4px;border-radius:14px;background:#f3f6f4;border:1px solid #e7eeea}" +
      ".gcv-passeios__seg button{flex:1 1 0;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;padding:.55rem .4rem;border:0;border-radius:11px;background:transparent;color:#64748b;font:inherit;font-size:.9rem;font-weight:700;letter-spacing:0;text-transform:none;line-height:1.2;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s}" +
      ".gcv-passeios__ride{width:1.7rem;height:1.15rem;flex:none;background:currentColor;-webkit-mask:url(/assets/img/jeep-icon.png) center / contain no-repeat;mask:url(/assets/img/jeep-icon.png) center / contain no-repeat}" +
      ".gcv-passeios__seg button:hover{color:var(--gp-green)}" +
      ".gcv-passeios__seg button.is-on{background:#16a34a;color:#fff;box-shadow:none}" +
      ".gcv-passeios__seg button.is-on:hover{color:#fff}" +
      ".gcv-passeios__seg button[hidden]{display:none!important}" +
      ".gcv-passeios__seg button:focus-visible,.gcv-passeios__stepper button:focus-visible,.gcv-passeios__add:focus-visible{outline:2px solid #0f766e;outline-offset:2px}" +
      ".gcv-passeios__summary{display:none;margin:0}" +
      ".gcv-passeios__guide,.gcv-passeios__mode-note{display:flex;align-items:flex-start;flex:1;gap:.45rem;margin:.4rem 0 0;padding:.6rem .75rem;border-radius:10px;font-size:.82rem;font-weight:600;line-height:1.45;letter-spacing:0;text-transform:none}" +
      ".gcv-passeios__guide[hidden],.gcv-passeios__mode-note[hidden]{display:none}" +
      ".gcv-passeios__guide .ti,.gcv-passeios__mode-note .ti{font-size:1.05rem;line-height:1.2;flex:none}" +
      ".gcv-passeios__guide.is-alerta,.gcv-passeios__mode-note.is-alerta{background:#fef3c7;color:#92400e}" +
      ".gcv-passeios__guide.is-info,.gcv-passeios__mode-note.is-info{background:#e0f2fe;color:#0c4a6e}" +
      ".gcv-passeios__guide.is-sucesso,.gcv-passeios__mode-note.is-sucesso{background:#dcfce7;color:#14532d}" +
      ".gcv-passeios__guide strong,.gcv-passeios__mode-note strong{font-weight:800}" +
      ".gcv-passeios__cap{margin:.35rem 0 0;font-size:.75rem;font-weight:700;line-height:1.35;color:#92400e}" +
      ".gcv-passeios__cap[hidden]{display:none}" +
      ".gcv-passeios__mode-link{display:inline;margin:0 0 0 .2rem;padding:0;border:0;background:none;color:inherit;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer}" +
      ".gcv-passeios__mode-link:hover{opacity:.8}" +
      ".gcv-passeios__foot{display:flex;align-items:center;justify-content:space-between;gap:.85rem;margin-top:.35rem;padding:.85rem 1.15rem 1.05rem;border-top:1px solid #eef2f0;background:#fff}" +
      ".gcv-passeios__budget{margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:.2rem;min-width:0;line-height:1.2;font-size:.8rem;font-weight:600;letter-spacing:0;text-transform:none;color:#64748b}" +
      ".gcv-passeios__break{font-size:.78rem;font-weight:600;color:#64748b}" +
      ".gcv-passeios__pixline{display:flex;flex-wrap:wrap;align-items:baseline;gap:.28rem .4rem}" +
      ".gcv-passeios__total-value{color:var(--gp-blue);font-size:1.85rem;font-weight:800;letter-spacing:-.03em;line-height:1;text-transform:none}" +
      ".gcv-passeios__pixin{font-size:.95rem;font-weight:800;color:#0f2a1d}" +
      ".gcv-passeios__off{display:inline-flex;align-items:center;padding:.12rem .45rem;border-radius:999px;background:#dcfce7;color:#166534;font-size:.72rem;font-weight:800;letter-spacing:.02em;line-height:1.2}" +
      ".gcv-passeios__cardline{display:block;max-width:28rem;font-size:.8rem;font-weight:600;color:#64748b;line-height:1.35}" +
      ".gcv-passeios__money{color:var(--gp-blue);font-weight:800}" +
      ".gcv-passeios__actions{display:flex;flex:none}" +
      ".gcv-passeios__add{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;margin:0;padding:.8rem 1.15rem;border:0;border-radius:12px;background:#14532d;color:#fff;font:inherit;font-size:.92rem;font-weight:800;cursor:pointer;box-shadow:none;transition:background .15s,transform .1s}" +
      ".gcv-passeios__add:hover{background:#0f3d2e}.gcv-passeios__add:active{transform:translateY(1px)}" +
      ".gcv-passeios__add.is-added{background:#16a34a;color:#fff;box-shadow:none}" +
      ".gcv-passeios__mark{width:1rem;height:1rem;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:1.15rem;font-weight:800;line-height:1}" +
      ".gcv-passeios__add.is-blocked,.gcv-passeios__add:disabled{opacity:.5;cursor:not-allowed}" +
      ".gcv-passeios [data-passeio-msg]{margin:0;padding:0 1.1rem;font-size:.82rem;color:#b91c1c}.gcv-passeios [data-passeio-msg]:not(:empty){padding:.1rem 1.1rem .8rem}" +
      ".gcv-datepicker{position:relative;width:100%;margin:0}" +
      ".gcv-datepicker__native{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;margin:0!important;padding:0!important;border:0!important}" +
      ".gcv-datepicker__btn{width:100%;height:2.7rem;display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box;padding:.5rem .7rem;font:inherit;font-size:.95rem;font-weight:700;letter-spacing:0;text-transform:none;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#0f2a1d;cursor:pointer;text-align:left}" +
      ".gcv-datepicker__icon{width:18px;height:18px;color:#14532d;flex-shrink:0}" +
      ".gcv-datepicker__pop{position:fixed;z-index:80;width:min(19.5rem,calc(100vw - 1.5rem));background:#fff;border:1px solid #d7ebe3;border-radius:16px;box-shadow:0 18px 48px rgba(15,61,46,.18);padding:.85rem .9rem 1rem;text-transform:none;letter-spacing:0}" +
      ".gcv-datepicker__pop[hidden]{display:none!important}.gcv-datepicker__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem}.gcv-datepicker__month{font-weight:700;color:#14532d}" +
      ".gcv-datepicker__nav{width:32px;height:32px;border:0;border-radius:8px;background:#e8f0ec;color:#14532d;font-size:1.2rem;cursor:pointer}" +
      ".gcv-datepicker__week,.gcv-datepicker__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}.gcv-datepicker__week{margin-bottom:4px;font-size:.68rem;font-weight:700;color:#94a3b8}" +
      ".gcv-datepicker__day{height:34px;border:0;border-radius:9px;background:transparent;font:inherit;cursor:pointer}.gcv-datepicker__day:hover:not(:disabled){background:#e8f0ec}" +
      ".gcv-datepicker__day.is-today{box-shadow:inset 0 0 0 1.5px #14532d;font-weight:700}.gcv-datepicker__day.is-selected{background:#14532d;color:#fff;font-weight:700}.gcv-datepicker__day:disabled{color:#cbd5e1;cursor:default}" +
      "@media(max-width:640px){.gcv-passeios__grid{grid-template-columns:1fr 1fr;gap:.65rem .7rem}.gcv-passeios__seg{flex-wrap:wrap}.gcv-passeios__seg button{flex:1 1 6.2rem;font-size:.78rem;padding:.48rem .3rem}.gcv-passeios__foot{flex-direction:column;align-items:stretch}.gcv-passeios__actions,.gcv-passeios__add{width:100%}.gcv-passeios__route{padding:.75rem 1rem .1rem}.gcv-passeios__route-name{font-size:1.25rem}.gcv-passeios__total-value{font-size:1.65rem}.gcv-passeios__body{padding:.75rem 1rem .2rem}}" +
      "@media(min-width:768px){.gcv-passeios{max-width:none;width:100%;margin-left:0;margin-right:0}.gcv-passeios__grid{grid-template-columns:1fr 1fr 1fr 1fr}.gcv-passeios__field--city{grid-column:span 2}.gcv-passeios__field--date,.gcv-passeios__field--people{grid-column:span 1}.gcv-passeios__field--mode,.gcv-passeios__field--transport{grid-column:span 2}}" +
      ".gcv-passeios__route{padding:1rem 1.1rem .2rem}" +
      ".gcv-passeios__route-name{margin:0;font-size:1.55rem;font-weight:800;line-height:1.15;letter-spacing:-.03em;color:#0f2a1d}" +
      ".gcv-passeios__route-name span{color:#14532d}" +
      ".gcv-passeios__chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:.65rem 0 0}" +
      ".gcv-passeios__chip{display:inline-flex;align-items:center;gap:.3rem;margin:0;padding:.28rem .6rem;border-radius:999px;background:#f3faf6;color:#166534;font-size:.78rem;font-weight:700;line-height:1.2}" +
      ".gcv-passeios__chip .ti{font-size:.95rem}" +
      ".gcv-passeios__city-empty{margin:.4rem 0 0;font-size:.78rem;font-weight:700;color:#9a3412}.gcv-passeios__city-empty[hidden]{display:none}" +
      ".gcv-passeios__extras{margin-top:1rem;padding:.85rem .9rem;border:1px dashed #b6d4c4;border-radius:12px;background:#f7fbf8}" +
      ".gcv-passeios__extras[hidden]{display:none}" +
      ".gcv-passeios__extras-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem .75rem;margin:0 0 .6rem}" +
      ".gcv-passeios__extras-title{margin:0 0 .6rem;font-size:.95rem;font-weight:800;color:var(--gp-ink)}" +
      ".gcv-passeios__extras-hint{margin:0;font-size:.76rem;color:var(--gp-muted)}" +
      ".gcv-passeios__extra-list{display:flex;flex-wrap:wrap;gap:.45rem}" +
      ".gcv-passeios__extra{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .8rem;border:1.5px solid #cfe1d7;border-radius:999px;background:#fff;color:#0f2a1d;font:inherit;font-size:.88rem;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s,color .15s}" +
      ".gcv-passeios__extra .ti{font-size:1rem;color:#14532d}" +
      ".gcv-passeios__extra:hover:not(:disabled){border-color:#14532d}" +
      ".gcv-passeios__extra[aria-pressed=true]{background:#14532d;border-color:#14532d;color:#fff}" +
      ".gcv-bi{margin-top:1rem}" +
      ".gcv-bi__label{margin:0 0 .5rem;font-size:1.02rem;font-weight:800;letter-spacing:-.02em;text-transform:none;color:#0f2a1d}" +
      ".gcv-bi__card{border:1px solid #d7ebe3;background:#f4fbf7;border-radius:16px;padding:.75rem .9rem .8rem}" +
      ".gcv-bi__pick{margin:0 0 .65rem;font-size:.98rem;font-weight:800;color:#0f2a1d}" +
      ".gcv-bi__langs{display:flex;flex-wrap:wrap;gap:.45rem}" +
      ".gcv-bi__langs[hidden]{display:none}" +
      ".gcv-bi__lang{display:inline-flex;align-items:center;gap:.35rem;padding:.38rem .75rem;border:1.5px solid #d5e5dc;border-radius:999px;background:#fff;color:#0f2a1d;font:inherit;font-size:.86rem;font-weight:700;cursor:pointer}" +
      ".gcv-bi__flag{width:1.2rem;height:.82rem;flex:none;border-radius:2px;box-shadow:0 0 0 1px rgba(15,42,29,.15);display:block}" +
      ".gcv-bi__lang.is-on{border-color:#14532d;box-shadow:inset 0 0 0 1px #14532d}" +
      ".gcv-bi__lang[hidden]{display:none!important}" +
      ".gcv-passeios__extra[aria-pressed=true] .ti{color:#fff}" +
      ".gcv-passeios__extra:disabled{opacity:.4;cursor:not-allowed}" +
      ".gcv-passeios__note{margin:.6rem 0 0;font-size:.8rem;font-weight:600;color:#b45309}" +
      ".gcv-passeios__note[hidden]{display:none}" +
      ".gcv-passeios__unit{display:block;margin-top:.1rem;font-size:.72rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--gp-muted)}" +
      ".gcv-passeios-slot{height:0}" +
      ".gcv-passeios.is-dock{position:fixed;z-index:45;margin:0;box-sizing:border-box;box-shadow:0 10px 28px rgba(15,61,46,.18)}" +
      ".gcv-passeios.is-dock.is-mini{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;padding:.4rem .6rem;border-radius:12px}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__now,.gcv-passeios.is-dock.is-mini .gcv-passeios__route,.gcv-passeios.is-dock.is-mini .gcv-passeios__body,.gcv-passeios.is-dock.is-mini [data-passeio-msg]{display:none}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__summary{display:block;flex:1 1 16rem;min-width:0;font-size:.78rem;font-weight:700;line-height:1.35;color:#0f2a1d}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__break{display:none}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__foot{margin:0;padding:0;border:0;background:none;flex-wrap:nowrap}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__budget{flex-direction:row;align-items:baseline;gap:.3rem}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__cardline,.gcv-passeios.is-dock.is-mini .gcv-passeios__off{display:none}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__total-value{font-size:1.05rem}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__actions,.gcv-passeios.is-dock.is-mini .gcv-passeios__add{width:auto}" +
      ".gcv-passeios.is-dock.is-mini .gcv-passeios__add{padding:.45rem .7rem;font-size:.82rem}" +
      ".gcv-passeio-modal{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:1rem;overflow:auto;background:rgba(4,10,8,.78)}" +
      ".gcv-passeio-modal[hidden]{display:none!important}" +
      ".gcv-passeio-modal__panel{position:relative;width:min(720px,100%);margin:auto}" +
      ".gcv-passeio-modal__x{position:absolute;top:.7rem;right:.75rem;z-index:3;width:2rem;height:2rem;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#0f2a1d;font-size:1.35rem;line-height:1;cursor:pointer}" +
      ".gcv-passeios.is-modal{overflow:hidden;margin:0;max-width:none;width:100%;max-height:calc(100dvh - 2rem);display:flex;flex-direction:column;background:#fff;border:1px solid #e7eeea;box-shadow:0 24px 60px rgba(8,20,14,.28)}" +
      ".gcv-passeios.is-modal .gcv-passeios__now{padding-right:3rem}" +
      ".gcv-passeios.is-modal .gcv-passeios__body{overflow:auto;min-height:0}" +
      ".gcv-passeios.is-modal .gcv-passeios__foot{position:sticky;bottom:0}" +
      "@media(max-width:767px){.gcv-passeios.is-modal .gcv-passeios__field--mode,.gcv-passeios.is-modal .gcv-passeios__field--transport{grid-column:span 1}}" +
      "@media(max-width:640px){.gcv-passeio-modal{padding:.55rem}.gcv-passeios.is-modal{max-height:calc(100dvh - 1.1rem);border-radius:16px}.gcv-passeios.is-modal .gcv-passeios__field--mode,.gcv-passeios.is-modal .gcv-passeios__field--transport{grid-column:1 / -1}}";
    function seg(name, options) {
      return '<div class="gcv-passeios__seg" role="radiogroup" data-passeio-seg="' + name + '">' +
        options.map(function (o, i) {
          return '<button type="button" role="radio" aria-checked="' + (i === 0 ? "true" : "false") + '" class="' + (i === 0 ? "is-on" : "") + '" data-value="' + passeioEsc(o[0]) + '">' + (o[2] || "") + passeioEsc(o[1]) + "</button>";
        }).join("") + "</div>";
    }
    var saidas = passeioSaidasLista(data);
    var cities = saidas.map(function (c) { return c.nome; });
    var langForeign = copy.siteLang === "en" || copy.siteLang === "es";
    var langStart = langForeign ? copy.siteLang : "pt";
    var brFlag = '<svg class="gcv-bi__flag" viewBox="0 0 19 13" aria-hidden="true"><rect width="19" height="13" fill="#009c3b"/><polygon points="9.5,1.15 17.3,6.5 9.5,11.85 1.7,6.5" fill="#ffdf00"/><circle cx="9.5" cy="6.5" r="2.05" fill="#002776"/></svg>';
    return "<style>" + css + "</style>" +
      '<p class="gcv-passeios__now">' + passeioEsc(copy.title) + "</p>" +
      '<p class="gcv-passeios__summary" data-passeio-summary></p>' +
      '<div class="gcv-passeios__route"><p class="gcv-passeios__route-name" data-passeio-route>' + passeioEsc(data.title) + "</p>" +
      '<p class="gcv-passeios__chips" data-passeio-route-meta></p></div>' +
      '<div class="gcv-passeios__body"><div class="gcv-passeios__grid">' +
      '<label class="gcv-passeios__field gcv-passeios__field--date">' + copy.date + '<input type="text" data-passeio-date value="' + passeioAmanha() + '" /></label>' +
      '<div class="gcv-passeios__field gcv-passeios__field--people">' + copy.people +
        '<div class="gcv-passeios__stepper"><button type="button" data-passeio-step="-1" aria-label="−1">−</button>' +
        '<input type="number" min="1" max="15" value="' + gcvPessoasPrefill() + '" inputmode="numeric" aria-label="' + passeioEsc(copy.people) + '" data-passeio-people />' +
        '<button type="button" data-passeio-step="1" aria-label="+1">+</button></div>' +
        '<p class="gcv-passeios__cap" data-passeio-cap hidden></p></div>' +
      '<div class="gcv-passeios__field gcv-passeios__field--wide gcv-passeios__field--city">' + copy.city +
        seg("city", saidas.map(function (c) { return [c.nome, c.curta || passeioCidadeCurta(c.nome)]; })) +
        '<p class="gcv-passeios__city-empty" data-passeio-city-empty' + (saidas.length ? " hidden" : "") + ">" + passeioEsc(saidas.length ? "" : copy.noCity) + "</p>" +
        '<select class="gcv-passeios__hide" tabindex="-1" aria-hidden="true" data-passeio-city>' + cities.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
      '<div class="gcv-passeios__field gcv-passeios__field--wide gcv-passeios__field--mode">' + copy.mode +
        seg("mode", [["excursao", copy.group], ["exclusivo", copy.private]]) +
        '<select class="gcv-passeios__hide" tabindex="-1" aria-hidden="true" data-passeio-mode><option value="excursao">' + copy.group + '</option><option value="exclusivo">' + copy.private + "</option></select>" +
        '<p class="gcv-passeios__mode-note" data-passeio-mode-note></p></div>' +
      '<div class="gcv-passeios__field gcv-passeios__field--wide gcv-passeios__field--transport">' + copy.transport +
        seg("transport", [["0", copy.withoutRide], ["1", copy.withRide, '<i class="gcv-passeios__ride" aria-hidden="true"></i>']]) +
        '<select class="gcv-passeios__hide" tabindex="-1" aria-hidden="true" data-passeio-transport><option value="0">' + copy.withoutRide + '</option><option value="1">' + copy.withRide + "</option></select>" +
        '<p class="gcv-passeios__guide" data-passeio-guide></p>' +
        '<p class="gcv-passeios__guide" data-passeio-4x4 hidden></p></div>' +
      "</div>" +
      '<div class="gcv-bi">' +
        '<p class="gcv-bi__label">' + passeioEsc(copy.extras) + "</p>" +
        '<div class="gcv-bi__card">' +
          '<p class="gcv-bi__pick">' + passeioEsc(copy.pickLang) + "</p>" +
          '<div class="gcv-bi__langs" data-passeio-bi-langs>' +
            (langForeign ? "" : '<button type="button" class="gcv-bi__lang' + (langStart === "pt" ? " is-on" : "") + '" data-bi-lang="pt">' + brFlag + " " + passeioEsc(copy.langBr) + "</button>") +
            '<button type="button" class="gcv-bi__lang' + (langStart === "en" ? " is-on" : "") + '" data-bi-lang="en"><svg class="gcv-bi__flag" viewBox="0 0 19 13" aria-hidden="true"><rect width="19" height="13" fill="#b22234"/><rect y="1" width="19" height="1" fill="#fff"/><rect y="3" width="19" height="1" fill="#fff"/><rect y="5" width="19" height="1" fill="#fff"/><rect y="7" width="19" height="1" fill="#fff"/><rect y="9" width="19" height="1" fill="#fff"/><rect y="11" width="19" height="1" fill="#fff"/><rect width="8" height="7" fill="#3c3b6e"/></svg> ' + passeioEsc(copy.langEn) + "</button>" +
            '<button type="button" class="gcv-bi__lang' + (langStart === "es" ? " is-on" : "") + '" data-bi-lang="es"><svg class="gcv-bi__flag" viewBox="0 0 19 13" aria-hidden="true"><rect width="19" height="13" fill="#c60b1e"/><rect y="3.25" width="19" height="6.5" fill="#ffc400"/></svg> ' + passeioEsc(copy.langEs) + "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="gcv-passeios__extras" data-passeio-extras hidden>' +
        '<p class="gcv-passeios__extras-title">' + passeioEsc(copy.sameDayTitle) + "</p>" +
        '<div class="gcv-passeios__extra-list" data-passeio-extra-list></div>' +
        '<p class="gcv-passeios__note" data-passeio-need hidden>' + passeioEsc(copy.needMore) + "</p>" +
      "</div>" +
      "</div>" +
      '<div class="gcv-passeios__foot"><p class="gcv-passeios__budget" data-passeio-total></p>' +
      '<div class="gcv-passeios__actions"><button type="button" class="gcv-passeios__add" data-passeio-add aria-pressed="false"><span class="gcv-passeios__mark" aria-hidden="true">+</span> ' + passeioEsc(copy.roteiroBtn) + "</button></div></div>" +
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
    function limite() {
      return parseInt(people.max, 10) || 15;
    }
    var steps = box.querySelectorAll("[data-passeio-step]");
    function syncSteps() {
      var v = parseInt(people.value, 10) || min;
      var max = limite();
      Array.prototype.forEach.call(steps, function (b) {
        var d = parseInt(b.getAttribute("data-passeio-step"), 10);
        b.disabled = d < 0 ? v <= min : v >= max;
      });
    }
    box._syncPeopleSteps = syncSteps;
    Array.prototype.forEach.call(steps, function (b) {
      b.addEventListener("click", function () {
        var v = parseInt(people.value, 10) || min;
        var max = limite();
        people.value = Math.min(max, Math.max(min, v + parseInt(b.getAttribute("data-passeio-step"), 10)));
        people.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
    people.addEventListener("change", function () {
      var v = parseInt(people.value, 10);
      var max = limite();
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
    var opts = box._passeioDateOpts || { min: passeioAmanha() };
    box._passeioDateOpts = opts;
    if (!opts.min) opts.min = passeioAmanha();
    input.setAttribute("min", opts.min);
    if (!input.value || input.value < opts.min) input.value = opts.min;
    function go() {
      if (window.gcvBindDatePicker) window.gcvBindDatePicker(input, opts);
    }
    if (window.gcvBindDatePicker) {
      go();
      return;
    }
    var script = document.createElement("script");
    script.src = "/assets/js/gcv-datepicker.js?v=1.0.5";
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
      if (sel.incompleto || sel.semCidade) return null;
      if (!date || date < passeioPisoData()) return null;
      var total = passeioTotalCents(sel, modalidade, pessoas, comTranslado);
      var cars = passeioCarros(pessoas);
      var exclusivoPacote = modalidade === "exclusivo" && (pessoas <= 4 || comTranslado);
      var bi = passeioBiState();
      var billed = passeioPessoasCobradas(sel, modalidade, pessoas, comTranslado);
      var tarifa = tarifaAtiva();
      var biCents = passeioBilingueCents(tarifa, total, bi.on);
      var pay = passeioPagamento(total + biCents);
      var faixa = comTranslado ? null : {
        excursao4Cents: parseInt(sel.excursao, 10) || 0,
        excursao5Cents: parseInt(sel.excursao5, 10) || 0,
        privativo5Cents: parseInt(sel.exclusivo5, 10) || 0,
        privativo4Cents: parseInt(sel.exclusivo, 10) || 0,
        quorum: parseInt(sel.quorum, 10) || 4,
        modalidade: modalidade,
        bilingueOn: !!bi.on,
        bilingueTipo: (tarifa && tarifa.bilingue_tipo) || "fixo",
        bilingueValor: tarifa && tarifa.bilingue_valor != null && tarifa.bilingue_valor !== "" ? tarifa.bilingue_valor : (tarifa && tarifa.bilingue_cents),
      };
      var qty = faixa ? 1 : (exclusivoPacote ? 1 : billed);
      var pixReais = Math.round(pay.pix / 100);
      var langName = bi.lang === "es" ? copy.langEs : copy.langEn;
      var guiaIdioma = bi.on ? bi.lang : "pt";
      var carrosTxt = comTranslado && cars > 1 ? " · " + cars + " " + (cars === 1 ? copy.car : copy.cars) + " · " + cars + " " + (copy.guides || "guias") : "";
      return {
        id: "roteiro-" + data.slug + "-" + sel.ids.join("-") + "-" + date + "-" + modalidade + "-" + (comTranslado ? "t" : "s") + (bi.on ? "-bi-" + bi.lang : ""),
        destino: sel.names.join(" + "),
        destinos: sel.names.slice(),
        dateLabel: date.split("-").reverse().join("/"),
        dateIso: date,
        valorUnit: faixa ? pixReais : (qty > 1 ? Math.round(pixReais / qty) : pixReais),
        qty: qty,
        faixa: faixa,
        pixDesc: sel.names.join(" + ") + " · " + (modalidade === "exclusivo" ? copy.private : copy.group) + " · " + (comTranslado ? copy.withRide : copy.withoutRide) + carrosTxt + (bi.on ? " · " + copy.bilingual + " (" + langName + ")" : ""),
        maxQty: parseInt(box.querySelector("[data-passeio-people]").max, 10) || 15,
        embarque: cidade,
        meetingPoint: passeioPonto(cidade),
        hora: "08:00",
        departureMs: quando.getTime(),
        passeioKey: passeioChave(data, sel),
        pessoas: pessoas,
        comTransporte: comTranslado,
        guiaIdioma: guiaIdioma,
        modalidade: modalidade,
        carros: cars,
        guias: comTranslado ? cars : 1,
        quorum: sel.quorum || 4,
        vagaGuiaObrigatoria: !comTranslado,
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
        ? '<svg class="gcv-passeios__mark" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z"/></svg> ' + passeioEsc(copy.roteiroAdded)
        : '<span class="gcv-passeios__mark" aria-hidden="true">+</span> ' + passeioEsc(copy.roteiroBtn);
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

    function horasCurta(min) {
      return passeioHoras(min);
    }

    function passeioBiState() {
      var langEl = box.querySelector("[data-bi-lang].is-on");
      var lang = langEl ? langEl.getAttribute("data-bi-lang") : "pt";
      if (copy.siteLang === "en" || copy.siteLang === "es") {
        if (lang !== "en" && lang !== "es") lang = copy.siteLang;
        return { on: true, lang: lang };
      }
      return { on: lang === "en" || lang === "es", lang: lang === "es" ? "es" : "en" };
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
      if (sel.incompleto || sel.semCidade) { metaEl.textContent = ""; return; }
      var cidadeEl = box.querySelector("[data-passeio-city]");
      var unit = modalidade === "exclusivo" ? (comTranslado ? sel.exclusivoT : sel.exclusivo) : (comTranslado ? sel.excursaoT : sel.excursao);
      var bi = passeioBiState();
      var pessoasEl = box.querySelector("[data-passeio-people]");
      var nPessoas = Math.max(1, parseInt(pessoasEl && pessoasEl.value, 10) || 1);
      var billed = passeioPessoasCobradas(sel, modalidade, nPessoas, comTranslado);
      var partesChip = passeioFaixaPartes(sel, modalidade, nPessoas, comTranslado);
      var misto = partesChip && partesChip.length > 1 && partesChip[0].u !== partesChip[1].u;
      var unitShow = unit;
      var totalRota = passeioTotalCents(sel, modalidade, nPessoas, comTranslado);
      if (!comTranslado && partesChip && partesChip.length === 1) {
        unitShow = partesChip[0].u;
        billed = partesChip[0].q;
      }
      if (!misto && bi.on && billed > 0) {
        unitShow = unitShow + Math.round(passeioBilingueCents(tarifaAtiva(), totalRota, true) / billed);
      }
      var chips = [];
      if (sel.minutes) {
        chips.push('<span class="gcv-passeios__chip"><i class="ti ti-clock" aria-hidden="true"></i>' + passeioEsc(String(copy.chipDuration).replace("{t}", horasCurta(sel.minutes))) + "</span>");
      }
      chips.push('<span class="gcv-passeios__chip"><i class="ti ti-map-pin" aria-hidden="true"></i>' + passeioEsc(String(copy.chipLeave).replace("{city}", passeioCidadeCurta(cidadeEl ? cidadeEl.value : ""))) + "</span>");
      var pacotePrivado = modalidade === "exclusivo" && !comTranslado;
      if (misto || pacotePrivado) {
        var somaChip = totalRota + (bi.on ? passeioBilingueCents(tarifaAtiva(), totalRota, true) : 0);
        chips.push('<span class="gcv-passeios__chip">' + passeioEsc(passeioReais(somaChip)) + "</span>");
      } else {
        chips.push('<span class="gcv-passeios__chip">' + passeioEsc(passeioReais(unitShow) + " " + copy.chipPerson) + "</span>");
      }
      metaEl.innerHTML = chips.join("");
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

    function syncDateText(input, iso) {
      var text = input.parentNode && input.parentNode.querySelector(".gcv-datepicker__text");
      if (text && window.gcvFormatIsoBr) {
        text.textContent = window.gcvFormatIsoBr(iso);
        text.classList.remove("is-placeholder");
      }
    }

    function syncDateFloor() {
      var input = box.querySelector("[data-passeio-date]");
      if (!input) return;
      var exceptKey = passeioChave(data, passeioSelecao(box, data));
      var min = passeioPisoData();
      if (!box._passeioDateOpts) box._passeioDateOpts = { min: min };
      box._passeioDateOpts.min = min;
      box._passeioDateOpts.isDisabled = function (iso) {
        return !!passeioDatasOcupadas(exceptKey)[iso];
      };
      box._passeioDateOpts.monthIso = function () {
        return passeioMesIncluido();
      };
      input.min = min;
      if (box._passeioDateOpts) box._passeioDateOpts.beforeOpen = syncDateFloor;
      var next = input.value && input.value < min ? min : input.value;
      var guard = 0;
      while (next && box._passeioDateOpts.isDisabled(next) && guard < 400) {
        next = passeioDiaSeguinte(next);
        guard += 1;
      }
      if (next && next !== input.value) {
        input.value = next;
        syncDateText(input, next);
      }
    }

    function setSeg(name, value) {
      var select = box.querySelector("[data-passeio-" + name + "]");
      var group = box.querySelector('[data-passeio-seg="' + name + '"]');
      if (!select || !group || !value) return;
      select.value = value;
      Array.prototype.forEach.call(group.querySelectorAll("button"), function (b) {
        var on = b.getAttribute("data-value") === select.value;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    }

    function tarifaAtiva() {
      var extras = passeioExtras(box).slice().sort();
      if (!extras.length) return data.tarifa;
      var combo = passeioCombos(data).filter(function (c) { return c.ids.join("|") === extras.join("|"); })[0];
      return combo && combo.tour ? combo.tour.tarifa : data.tarifa;
    }

    function syncTarifaOpcoes() {
      var tarifa = tarifaAtiva();
      var cityGroup = box.querySelector('[data-passeio-seg="city"]');
      var citySel = box.querySelector("[data-passeio-city]");
      if (cityGroup && citySel) {
        var firstCity = "";
        Array.prototype.forEach.call(cityGroup.querySelectorAll("button"), function (b) {
          var ok = passeioCidadeVende(tarifa, b.getAttribute("data-value"));
          b.hidden = !ok;
          if (ok && !firstCity) firstCity = b.getAttribute("data-value");
        });
        var atual = cityGroup.querySelector('button[data-value="' + citySel.value + '"]');
        if (!atual || atual.hidden) setSeg("city", firstCity);
      }
      var cidade = citySel ? citySel.value : "";
      var row = (tarifa && tarifa.cidades && tarifa.cidades[passeioCidadeKey(cidade)]) || {};
      function cents(field) { return parseInt(row[field], 10) || 0; }
      var modes = [
        ["excursao", cents("excursao_pessoa_cents") > 0 || cents("excursao_transporte_cents") > 0],
        ["exclusivo", cents("exclusivo_pessoa_cents") > 0 || cents("exclusivo_transporte_cents") > 0],
      ];
      var modeGroup = box.querySelector('[data-passeio-seg="mode"]');
      var modeSel = box.querySelector("[data-passeio-mode]");
      var firstMode = "";
      if (modeGroup && modeSel) {
        modes.forEach(function (pair) {
          var b = modeGroup.querySelector('button[data-value="' + pair[0] + '"]');
          if (!b) return;
          b.hidden = !pair[1];
          if (pair[1] && !firstMode) firstMode = pair[0];
        });
        var modeBtn = modeGroup.querySelector('button[data-value="' + modeSel.value + '"]');
        if (!modeBtn || modeBtn.hidden) setSeg("mode", firstMode);
      }
      var mode = modeSel ? modeSel.value : "excursao";
      var rides = mode === "exclusivo"
        ? [["0", cents("exclusivo_pessoa_cents") > 0], ["1", cents("exclusivo_transporte_cents") > 0]]
        : [["0", cents("excursao_pessoa_cents") > 0], ["1", cents("excursao_transporte_cents") > 0]];
      var rideGroup = box.querySelector('[data-passeio-seg="transport"]');
      var rideSel = box.querySelector("[data-passeio-transport]");
      var firstRide = "";
      if (rideGroup && rideSel) {
        rides.forEach(function (pair) {
          var b = rideGroup.querySelector('button[data-value="' + pair[0] + '"]');
          if (!b) return;
          b.hidden = !pair[1];
          if (pair[1] && !firstRide) firstRide = pair[0];
        });
        var rideBtn = rideGroup.querySelector('button[data-value="' + rideSel.value + '"]');
        if (!rideBtn || rideBtn.hidden) setSeg("transport", firstRide);
      }
    }

    function passeioComCotacao(pay, base) {
      var q = box._payQuote;
      if (!q || q.base !== base || !q.quotes) return pay;
      var br = q.quotes.card_br;
      var intl = q.quotes.card_intl;
      if (br && br.ok) {
        pay.card = br.total_brl_cents;
        pay.n = br.max_installments || pay.n;
        pay.inst = br.installment_cents || Math.ceil(pay.card / pay.n);
      }
      if (intl && intl.ok) {
        if (intl.total_brl_cents) pay.intl = intl.total_brl_cents;
        if (String(intl.currency || "").toLowerCase() === "usd" && intl.charge_minor) pay.usd = intl.charge_minor;
      }
      return pay;
    }

    function pedirCotacao(base) {
      if (base < 100) return;
      if (box._payQuote && box._payQuote.base === base) return;
      if (box._payQuoteLoading === base) return;
      box._payQuoteLoading = base;
      fetch("/api/payment_quote.php?amount=" + encodeURIComponent((base / 100).toFixed(2)), {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success && res.quotes) {
            box._payQuote = { base: base, quotes: res.quotes, cardsEnabled: res.cards_enabled === true };
            paint();
          }
        })
        .catch(function () {})
        .then(function () {
          if (box._payQuoteLoading === base) box._payQuoteLoading = 0;
        });
    }

    function paintCidades() {
      var saidas = passeioCidadesDaEscolha(box, data);
      var group = box.querySelector('[data-passeio-seg="city"]');
      var select = box.querySelector("[data-passeio-city]");
      var vazio = box.querySelector("[data-passeio-city-empty]");
      if (!group || !select) return;
      var atual = select.value;
      var nomes = saidas.map(function (c) { return c.nome; });
      if (nomes.indexOf(atual) < 0) atual = nomes[0] || "";
      group.innerHTML = saidas.map(function (c) {
        var on = c.nome === atual;
        return '<button type="button" role="radio" aria-checked="' + (on ? "true" : "false") + '" class="' + (on ? "is-on" : "") + '" data-value="' + passeioEsc(c.nome) + '">' + passeioEsc(c.curta || passeioCidadeCurta(c.nome)) + "</button>";
      }).join("");
      group.hidden = !saidas.length;
      select.innerHTML = nomes.map(function (c) { return "<option>" + passeioEsc(c) + "</option>"; }).join("");
      if (atual) select.value = atual;
      if (vazio) {
        vazio.hidden = !!saidas.length;
        vazio.textContent = saidas.length ? "" : copy.noCity;
      }
    }

    function aplicarLimitePessoas(sel) {
      var people = box.querySelector("[data-passeio-people]");
      var note = box.querySelector("[data-passeio-cap]");
      if (!people) return;
      var max = sel && sel.maxPessoas >= 1 ? sel.maxPessoas : 15;
      people.max = String(max);
      var v = parseInt(people.value, 10);
      if (!v || v < 1) people.value = "1";
      else if (v > max) people.value = String(max);
      if (typeof box._syncPeopleSteps === "function") box._syncPeopleSteps();
      if (!note) return;
      if (sel && sel.maxDefinido) {
        note.hidden = false;
        note.textContent = String(copy.peopleCap || "").replace("{n}", String(max));
      } else {
        note.hidden = true;
        note.textContent = "";
      }
    }

    function paint() {
      syncDateFloor();
      syncTarifaOpcoes();
      paintCidades();
      var sel = passeioSelecao(box, data);
      aplicarLimitePessoas(sel);
      var modalidade = box.querySelector("[data-passeio-mode]").value;
      var pessoas = box.querySelector("[data-passeio-people]").value;
      var comTranslado = box.querySelector("[data-passeio-transport]").value === "1";
      var total = passeioTotalCents(sel, modalidade, pessoas, comTranslado);
      var bi = passeioBiState();
      paintSummary();
      var nPessoas = Math.max(1, parseInt(pessoas, 10) || 1);
      var cidadeEl = box.querySelector("[data-passeio-city]");
      var cidadeAviso = passeioCidadeCurta(cidadeEl ? cidadeEl.value : "");
      function paintAviso(el, baseClass, aviso, comLink) {
        if (!el || !aviso) return;
        el.hidden = false;
        el.className = baseClass + " is-" + aviso.tipo;
        el.textContent = "";
        var icon = document.createElement("i");
        icon.className = aviso.tipo === "sucesso" ? "ti ti-check" : "ti ti-info-circle";
        icon.setAttribute("aria-hidden", "true");
        var span = document.createElement("span");
        var texto = aviso.texto || "";
        var bold = copy.trFullBold || "";
        if (bold && texto.slice(-bold.length) === bold) {
          span.appendChild(document.createTextNode(texto.slice(0, -bold.length)));
          var strong = document.createElement("strong");
          strong.textContent = bold;
          span.appendChild(strong);
        } else {
          span.textContent = texto;
        }
        if (comLink && aviso.tipo === "alerta") {
          var notaLink = document.createElement("button");
          notaLink.type = "button";
          notaLink.className = "gcv-passeios__mode-link";
          notaLink.setAttribute("data-gcv-cart-policy-open", "cancel");
          notaLink.textContent = copy.modeMore || "";
          notaLink.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (window.GcvExcCart && typeof window.GcvExcCart.openPolicy === "function") {
              window.GcvExcCart.openPolicy("cancel");
            }
          });
          span.appendChild(document.createTextNode(" "));
          span.appendChild(notaLink);
        }
        el.appendChild(icon);
        el.appendChild(span);
      }
      paintAviso(
        box.querySelector("[data-passeio-mode-note]"),
        "gcv-passeios__mode-note",
        getAvisoModalidade(nPessoas, modalidade, copy),
        true
      );
      paintAviso(
        box.querySelector("[data-passeio-guide]"),
        "gcv-passeios__guide",
        getAvisoTransporte(nPessoas, modalidade, comTranslado ? "1" : "0", cidadeAviso, copy),
        false
      );
      var aviso4 = box.querySelector("[data-passeio-4x4]");
      if (aviso4) {
        if (!comTranslado && sel.somente4x4) {
          paintAviso(aviso4, "gcv-passeios__guide", { tipo: "alerta", texto: copy.only4x4 }, false);
        } else {
          aviso4.hidden = true;
          aviso4.textContent = "";
        }
      }
      paintExtras();
      paintRoute(sel, modalidade, comTranslado);
      var unit = modalidade === "exclusivo" ? (comTranslado ? sel.exclusivoT : sel.exclusivo) : (comTranslado ? sel.excursaoT : sel.excursao);
      var billed = passeioPessoasCobradas(sel, modalidade, nPessoas, comTranslado);
      var biCents = passeioBilingueCents(tarifaAtiva(), total, bi.on);
      var base = total + biCents;
      var pay = passeioComCotacao(passeioPagamento(base), base);
      if (!sel.incompleto) pedirCotacao(base);
      var word = billed === 1 ? copy.person : copy.peopleWord;
      var carsNow = passeioCarros(nPessoas);
      var moneyHtml = function (text) {
        return '<span class="gcv-passeios__money">' + passeioEsc(text) + "</span>";
      };
      var partesPreco = passeioFaixaPartes(sel, modalidade, nPessoas, comTranslado);
      var breakTxt = modalidade === "exclusivo" && comTranslado && carsNow > 1
        ? passeioEsc(carsNow + " " + copy.cars + " × ") + moneyHtml(passeioReais(unit * (parseInt(sel.quorum, 10) || 4)))
        : partesPreco && partesPreco.length
          ? partesPreco.map(function (p) {
              var w = p.q === 1 ? copy.person : copy.peopleWord;
              return passeioEsc(p.q + " " + w + " × ") + moneyHtml(passeioReais(p.u));
            }).join(passeioEsc(" + "))
          : passeioEsc(billed + " " + word + " × ") + moneyHtml(passeioReais(unit));
      if (bi.on) breakTxt += passeioEsc(" + " + copy.bilingualShort + " (") + moneyHtml(passeioReais(biCents)) + ")";
      var fill = function (tpl, map) {
        return String(tpl || "").replace(/\{(\w+)\}/g, function (_, k) {
          var v = map[k] != null ? String(map[k]) : "";
          if (k === "price" || k === "inst") return moneyHtml(v);
          return passeioEsc(v);
        });
      };
      var brTxt = fill(copy.cardBr, { price: passeioReais(pay.card), n: String(pay.n), inst: passeioReais(pay.inst) });
      var intlTxt = fill(copy.cardIntl, { price: pay.usd ? passeioUsd(pay.usd) : passeioReais(pay.intl) });
      var cardsOn = !!(box._payQuote && box._payQuote.base === base && box._payQuote.cardsEnabled === true);
      var cardHtml = cardsOn
        ? '<span class="gcv-passeios__cardline">' + brTxt + "</span>" +
          '<span class="gcv-passeios__cardline">' + intlTxt + "</span>"
        : "";
      var totalEl = box.querySelector("[data-passeio-total]");
      totalEl.innerHTML = sel.incompleto || sel.semCidade
        ? '<strong class="gcv-passeios__total-value">—</strong>'
        : '<span class="gcv-passeios__break">' + breakTxt + "</span>" +
          '<span class="gcv-passeios__pixline"><strong class="gcv-passeios__total-value">' + passeioEsc(passeioReais(pay.pix)) + "</strong>" +
          '<span class="gcv-passeios__pixin">' + passeioEsc(copy.pixIn) + "</span></span>" +
          cardHtml;
      var item = buildItem();
      if (item && itemInCart(item.id) && window.GcvExcCart && typeof window.GcvExcCart.sync === "function") {
        window.GcvExcCart.sync(item);
      }
      paintAddButton();
    }

    Array.prototype.forEach.call(box.querySelectorAll("[data-bi-lang]"), function (btn) {
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(box.querySelectorAll("[data-bi-lang]"), function (other) {
          other.classList.toggle("is-on", other === btn);
        });
        paint();
      });
    });
    ["data-passeio-date", "data-passeio-people", "data-passeio-city", "data-passeio-mode", "data-passeio-transport"].forEach(function (attr) {
      var el = box.querySelector("[" + attr + "]");
      if (el) el.addEventListener("input", paint);
      if (el) el.addEventListener("change", paint);
    });
    box.querySelector("[data-passeio-add]").addEventListener("click", function () {
      var msg = box.querySelector("[data-passeio-msg]");
      var escolha = passeioSelecao(box, data);
      if (escolha.semCidade) {
        if (msg) msg.textContent = copy.noCity;
        return;
      }
      if (escolha.incompleto) {
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
        if (box.classList.contains("is-modal")) closePasseioModal();
      } else if (typeof cart.add === "function") {
        var ok = cart.add(item);
        if (!ok) {
          if (msg) msg.textContent = copy.dayTaken;
          if (typeof cart.warnSameDay === "function") cart.warnSameDay();
        } else if (box.classList.contains("is-modal")) {
          gcvAddPrefsCommit(item);
          closePasseioModal();
          var destino = paginaDePasseios();
          if (destino) {
            window.location.href = destino;
            return;
          }
          paintAddButton();
          if (typeof box._passeioDone === "function") box._passeioDone();
          return;
        }
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
    if (!box.classList.contains("is-modal")) bindPasseioDock(box);
  }

  function gcvAddPrefs() {
    var bag = window.GcvAddPeople || {};
    var n = parseInt(bag.n, 10);
    if (!n || n < 1) n = 1;
    if (n > 15) n = 15;
    return {
      n: n,
      city: String(bag.city || ""),
      mode: bag.mode === "exclusivo" ? "exclusivo" : "excursao",
      transport: bag.transport === "1" ? "1" : "0",
    };
  }

  function gcvPessoasPrefill() {
    return gcvAddPrefs().n;
  }

  function gcvAddPrefsCommit(item) {
    if (!item) return;
    var before = gcvAddPrefs();
    var n = Math.max(1, Math.min(15, parseInt(item.pessoas, 10) || 1));
    window.GcvAddPeople = {
      n: n,
      city: String(item.embarque || ""),
      mode: item.modalidade === "exclusivo" ? "exclusivo" : "excursao",
      transport: item.comTransporte ? "1" : "0",
    };
    if (n !== before.n && typeof window.GcvApplyPeoplePrefill === "function") {
      window.GcvApplyPeoplePrefill();
    }
  }

  function gcvApplyAddPrefs(box) {
    if (!box) return;
    var prefs = gcvAddPrefs();
    function setField(name, value) {
      var sel = box.querySelector("[data-passeio-" + name + "]");
      if (!sel || value == null || value === "") return;
      sel.value = value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    var citySel = box.querySelector("[data-passeio-city]");
    if (citySel && prefs.city) {
      var hasCity = Array.prototype.some.call(citySel.options, function (opt) {
        return opt.value === prefs.city;
      });
      if (hasCity) setField("city", prefs.city);
    }
    setField("mode", prefs.mode);
    setField("transport", prefs.transport);
    var peopleEl = box.querySelector("[data-passeio-people]");
    if (peopleEl) {
      peopleEl.value = String(prefs.n);
      peopleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function paginaDePasseios() {
    var path = window.location.pathname || "";
    if (/\/passeios\.html$/.test(path)) return "";
    if (path.indexOf("/en/") >= 0) return "/en/passeios.html";
    if (path.indexOf("/es/") >= 0) return "/es/passeios.html";
    return "/passeios.html";
  }

  function closePasseioModal() {
    var modal = document.getElementById("gcv-passeio-modal");
    if (modal) modal.hidden = true;
  }

  function openPasseioDialog(data, onDone) {
    if (!data) return;
    var path = window.location.pathname || "";
    var lang = path.indexOf("/en/") >= 0 ? "en" : (path.indexOf("/es/") >= 0 ? "es" : "pt");
    var htmlLang = (document.documentElement.lang || "").slice(0, 2);
    if (htmlLang === "en" || htmlLang === "es") lang = htmlLang;
    var copy = passeioCopy(lang);
    var modal = document.getElementById("gcv-passeio-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "gcv-passeio-modal";
      modal.className = "gcv-passeio-modal";
      modal.hidden = true;
      modal.innerHTML =
        '<div class="gcv-passeio-modal__backdrop" data-passeio-modal-close></div>' +
        '<div class="gcv-passeio-modal__panel" role="dialog" aria-modal="true">' +
        '<button type="button" class="gcv-passeio-modal__x" data-passeio-modal-close>×</button>' +
        '<div data-passeio-modal-body></div></div>';
      modal.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("[data-passeio-modal-close]")) closePasseioModal();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        var policy = document.getElementById("gcv-exc-cart-policy-modal");
        if (policy && policy.classList.contains("is-open")) return;
        closePasseioModal();
      });
      document.body.appendChild(modal);
    }
    var closeBtn = modal.querySelector(".gcv-passeio-modal__x");
    if (closeBtn) closeBtn.setAttribute("aria-label", copy.close || "Fechar");
    var body = modal.querySelector("[data-passeio-modal-body]");
    var box = document.createElement("section");
    box.className = "gcv-passeios is-modal";
    box._passeioDone = onDone;
    var cart = window.GcvExcCart;
    var items = cart && typeof cart.items === "function" ? cart.items() : [];
    var existing = null;
    if (data.passeioKey) {
      existing = items.filter(function (it) { return it && it.passeioKey === data.passeioKey; })[0] || null;
    } else if (data.slug) {
      var prefix = "atrativo:" + data.slug + ":";
      existing = items.filter(function (it) { return it && String(it.passeioKey || "").indexOf(prefix) === 0; })[0] || null;
      if (existing) {
        var tail = String(existing.passeioKey).slice(prefix.length);
        box._passeioExtras = tail ? tail.split(",").filter(Boolean) : [];
      }
    }
    if (!existing) {
      var junto = passeioJuntoDaUrl(data);
      if (junto.length) box._passeioExtras = junto;
    }
    body.innerHTML = "";
    body.appendChild(box);
    box.innerHTML = passeioBuilderHtml(copy, data);
    bindPasseioBuilder(box, copy, data);
    if (!existing) gcvApplyAddPrefs(box);
    if (existing) {
      var dateEl = box.querySelector("[data-passeio-date]");
      var peopleEl = box.querySelector("[data-passeio-people]");
      if (dateEl && existing.dateIso) dateEl.value = existing.dateIso;
      if (peopleEl && existing.pessoas) peopleEl.value = String(existing.pessoas);
      function setField(name, value) {
        var sel = box.querySelector("[data-passeio-" + name + "]");
        if (!sel || value == null || value === "") return;
        sel.value = value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setField("city", existing.embarque);
      setField("mode", /exclusivo/.test(String(existing.id || "")) ? "exclusivo" : "excursao");
      setField("transport", /-t(?:-bi-|$)/.test(String(existing.id || "")) ? "1" : "0");
      var biSaved = /-bi-(en|es)(?:$|-)/.exec(String(existing.id || ""));
      var biWant = biSaved ? biSaved[1] : "pt";
      if ((copy.siteLang === "en" || copy.siteLang === "es") && biWant !== "en" && biWant !== "es") biWant = copy.siteLang;
      Array.prototype.forEach.call(box.querySelectorAll("[data-bi-lang]"), function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-bi-lang") === biWant);
      });
      if (dateEl) dateEl.dispatchEvent(new Event("change", { bubbles: true }));
      if (peopleEl) peopleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    modal.hidden = false;
  }

  window.GcvPasseioDialog = { open: openPasseioDialog, close: closePasseioModal };
  window.GcvPasseioAvisos = { getAvisoModalidade: getAvisoModalidade, getAvisoTransporte: getAvisoTransporte };

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
  initMenuPasseios();
  initPasseiosPublicos();
  initExperienciaPausa();
})();

function initExperienciaPausa() {
  var match = location.pathname.match(/\/atrativos\/([^/]+)\.html$/);
  if (!match) return;
  var slug = decodeURIComponent(match[1]);
  fetch("/api/public/experiencia-venda.php?slug=" + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res || !res.ok || !res.data) return;
      var data = res.data;
      var artigo = document.querySelector(".gcv-detail-page");
      var lang = (document.documentElement.lang || "pt").slice(0, 2);
      var fechado = {
        pt: "Esta experiência está fechada para visitação neste período.",
        en: "This experience is closed to visitors during this period.",
        es: "Esta experiencia está cerrada a visitantes en este período."
      };
      var avisoPadrao = {
        pt: "Atenção: esta experiência tem um aviso neste período.",
        en: "Please note: this experience has a notice during this period.",
        es: "Atención: esta experiencia tiene un aviso en este período."
      };
      if (data.pausa_ativa && artigo) {
        if (data.modo === "ocultar") {
          artigo.innerHTML = '<div class="gcv-detail-inner"><p class="gcv-exp-pausa" style="margin:2rem 1rem;padding:1rem 1.1rem;border:1px solid #d7e3dc;border-radius:14px;background:#f7faf8;color:#0f3d2e;line-height:1.5">' + (fechado[lang] || fechado.pt) + "</p></div>";
        } else {
          var banner = document.createElement("p");
          banner.className = "gcv-exp-aviso";
          banner.textContent = data.mensagem || avisoPadrao[lang] || avisoPadrao.pt;
          banner.setAttribute("style", "margin:0 0 1rem;padding:.9rem 1rem;border-radius:12px;background:#fff4d6;color:#5c4300;line-height:1.45");
          artigo.insertBefore(banner, artigo.firstChild);
        }
      }
      if (data.sem_passeio) {
        document.querySelectorAll(".gcv-detail-cta").forEach(function (el) { el.hidden = true; });
      }
    })
    .catch(function () {});
}

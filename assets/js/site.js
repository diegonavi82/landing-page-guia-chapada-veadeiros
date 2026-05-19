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

    var idx = Math.floor(Math.random() * n);

    function show(next) {
      idx = ((next % n) + n) % n;
      slides.forEach(function (s, j) {
        s.classList.toggle("is-active", j === idx);
        s.setAttribute("aria-hidden", j === idx ? "false" : "true");
      });
      dots.forEach(function (d, j) {
        d.classList.toggle("is-active", j === idx);
        d.setAttribute("aria-selected", j === idx ? "true" : "false");
      });
      root.setAttribute("aria-label", "Destaque " + (idx + 1) + " de " + n);
    }

    show(idx);

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
            form.reset();
            selectOrcamento();
            showError("");
            showSentPanel("api");
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

    var count = parseInt(grid.getAttribute("data-gcv-instagram-count") || "16", 10);
    if (!count || count < 1) count = 16;

    var openLabel = grid.getAttribute("data-gcv-instagram-open-label") || "Abrir no Instagram";
    var assetBase = grid.getAttribute("data-gcv-instagram-asset-base") || "./assets/img/";

    fetch(poolUrl, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("pool " + res.status);
        return res.json();
      })
      .then(function (data) {
        var posts = Array.isArray(data) ? data : data && Array.isArray(data.posts) ? data.posts : [];
        if (posts.length < 1) return;

        var picked = shuffleArray(posts.slice()).slice(0, Math.min(count, posts.length));
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
              '<span class="gcv-instagram-grid__shade" aria-hidden="true"></span>' +
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

  initHeroCarousel();
  initInstagramRandomGrid();
  initMapLightbox();
  initPhotoGalleryLightbox();
  initContactForm();
})();

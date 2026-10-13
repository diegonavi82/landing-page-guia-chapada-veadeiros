/**
 * Carrinho de excursões (localStorage) + painel flutuante.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "gcv-excursao-cart";
  var OPEN_CART_FLAG = "gcv-exc-cart-open";
  /** Excursão: até 1 h antes da saída. Passeio avulso: corte das 4h20 em Brasília. */
  var BOOKING_CUTOFF_MS = 60 * 60 * 1000;
  var PASSEIO_CORTE_MIN = 4 * 60 + 20;
  var _strings = {};
  var _locale = "pt";
  var _onPay = null;
  var _onChange = null;
  var _resolveDepartureMs = null;
  var _autoInited = false;
  var _gapAck = "";
  var _gapSig = "";

  /** Strings mínimas para páginas sem carrossel (pt/en/es). */
  var FALLBACK_STRINGS = {
    pt: {
      cartTitle: "Carrinho",
      cartEmpty: "Seu carrinho está vazio",
      cartCheckout: "Pagamento",
      cartPixFail: "Não foi possível abrir o Pix. Tente de novo.",
      cartBack: "Voltar",
      cartRemove: "Remover",
      cartFabLabel: "Carrinho",
      cartClose: "Fechar carrinho",
      cartSameDayBlocked: "Você já escolheu um passeio para este dia. Remova-o para escolher outro.",
      cartItemsExpired: "Alguns passeios saíram do carrinho porque o embarque já passou ou está muito próximo.",
      cartGapOne: "Você tem 1 dia de intervalo entre o passeio anterior.",
      cartGapMany: "Você tem {n} dias de intervalo entre o passeio anterior.",
      bookTotal: "Total",
      cartCouponLabel: "Cupom",
      cartCouponApply: "Aplicar",
      cartCouponRemove: "Remover",
      cartCouponPh: "Código",
      cartCouponSub: "Subtotal",
      cartCouponOff: "Desconto",
      cartCouponHint: "Um cupom por compra. O desconto sai do valor do Pix, antes do cartão.",
      cartCouponChecking: "Conferindo cupom…",
      bookQtyMinus: "Menos uma pessoa",
      bookQtyPlus: "Mais uma pessoa",
      pixModalClose: "Fechar",
      toastOk: "Entendi",
    },
    en: {
      cartTitle: "Cart",
      cartEmpty: "Your cart is empty",
      cartCheckout: "Payment",
      cartPixFail: "Could not open Pix. Try again.",
      cartBack: "Back",
      cartRemove: "Remove",
      cartFabLabel: "Cart",
      cartClose: "Close cart",
      cartSameDayBlocked: "You already chose a tour for this day. Remove it to pick another.",
      cartItemsExpired: "Some tours left your cart because departure has passed or is too soon.",
      cartGapOne: "You have a 1-day gap since the previous tour.",
      cartGapMany: "You have a {n}-day gap since the previous tour.",
      bookTotal: "Total",
      cartCouponLabel: "Coupon",
      cartCouponApply: "Apply",
      cartCouponRemove: "Remove",
      cartCouponPh: "Code",
      cartCouponSub: "Subtotal",
      cartCouponOff: "Discount",
      cartCouponHint: "One coupon per purchase. The discount comes off the Pix amount, before the card.",
      cartCouponChecking: "Checking coupon…",
      bookQtyMinus: "Remove one person",
      bookQtyPlus: "Add one person",
      pixModalClose: "Close",
      toastOk: "Got it",
    },
    es: {
      cartTitle: "Carrito",
      cartEmpty: "Tu carrito está vacío",
      cartCheckout: "Pago",
      cartPixFail: "No se pudo abrir el Pix. Inténtalo de nuevo.",
      cartBack: "Volver",
      cartRemove: "Quitar",
      cartFabLabel: "Carrito",
      cartClose: "Cerrar carrito",
      cartSameDayBlocked: "Ya elegiste un paseo para este día. Quítalo para elegir otro.",
      cartItemsExpired: "Algunos paseos salieron del carrito porque el embarque ya pasó o está muy cerca.",
      cartGapOne: "Tienes 1 día de intervalo entre el paseo anterior.",
      cartGapMany: "Tienes {n} días de intervalo entre el paseo anterior.",
      bookTotal: "Total",
      cartCouponLabel: "Cupón",
      cartCouponApply: "Aplicar",
      cartCouponRemove: "Quitar",
      cartCouponPh: "Código",
      cartCouponSub: "Subtotal",
      cartCouponOff: "Descuento",
      cartCouponHint: "Un cupón por compra. El descuento sale del valor del Pix, antes de la tarjeta.",
      cartCouponChecking: "Comprobando cupón…",
      bookQtyMinus: "Quitar una persona",
      bookQtyPlus: "Añadir una persona",
      pixModalClose: "Cerrar",
      toastOk: "Entendido",
    },
  };

  function detectPageLocale() {
    var htmlLang = String((document.documentElement && document.documentElement.lang) || "")
      .toLowerCase()
      .slice(0, 2);
    if (htmlLang === "en" || htmlLang === "es") return htmlLang;
    var path = String((global.location && global.location.pathname) || "");
    if (/\/en(\/|$)/.test(path)) return "en";
    if (/\/es(\/|$)/.test(path)) return "es";
    return "pt";
  }

  function loadStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, done) {
    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      if (existing.getAttribute("data-loaded") === "1" || existing.readyState === "complete") {
        done();
        return;
      }
      existing.addEventListener("load", function () { done(); });
      existing.addEventListener("error", function () { done(new Error("script")); });
      return;
    }
    var script = document.createElement("script");
    script.src = src;
    script.onload = function () {
      script.setAttribute("data-loaded", "1");
      done();
    };
    script.onerror = function () { done(new Error("script")); };
    document.head.appendChild(script);
  }

  var _pixLoadWait = null;
  function ensurePixCheckout(done) {
    if (typeof _onPay === "function") {
      done();
      return;
    }
    if (_pixLoadWait) {
      _pixLoadWait.push(done);
      return;
    }
    _pixLoadWait = [done];
    loadStylesheet("/assets/css/excursoes.css?v=1.1.46");
    loadStylesheet("/assets/css/gcv-detail.css?v=1.1.40");
    var scripts = [
      "/assets/js/qrcode.min.js?v=1.1.31",
      "/assets/js/gcv-pix.js?v=1.1.31",
      "/assets/js/gcv-pix-receipt.js?v=1.1.31",
      "/assets/js/gcv-pix-polling.js?v=1.1.31",
      "/assets/js/gcv-confirm.js?v=1.1.31",
      "/assets/js/gcv-exc-bookings.js?v=1.1.31",
      "/assets/js/excursoes-carousel.js?v=1.1.72",
    ];
    var i = 0;
    function next(err) {
      if (err) {
        var failed = _pixLoadWait.slice();
        _pixLoadWait = null;
        failed.forEach(function (fn) { fn(err); });
        return;
      }
      if (i >= scripts.length) {
        var wait = _pixLoadWait.slice();
        _pixLoadWait = null;
        wait.forEach(function (fn) { fn(); });
        return;
      }
      var src = scripts[i++];
      loadScript(src, next);
    }
    next();
  }

  function consumeOpenCartFlag() {
    try {
      if (global.sessionStorage.getItem(OPEN_CART_FLAG) === "1") {
        global.sessionStorage.removeItem(OPEN_CART_FLAG);
        return true;
      }
    } catch (err) {
      /* */
    }
    return false;
  }

  function s(key) {
    var loc = _locale === "en" || _locale === "es" ? _locale : "pt";
    var pack = _strings[loc] || _strings.pt || {};
    if (pack[key]) return pack[key];
    var fallback = FALLBACK_STRINGS[loc] || FALLBACK_STRINGS.pt;
    return fallback[key] || "";
  }

  function policyUi() {
    if (global.GcvExcCartPolicies && typeof global.GcvExcCartPolicies.uiStrings === "function") {
      return global.GcvExcCartPolicies.uiStrings(_locale);
    }
    return {
      agreePrefix: "Li e concordo com a",
      policyCancel: "Política de Cancelamento",
      policySecurity: "Política de Segurança",
      modalClose: "Fechar",
      agreeRequired:
        "Para pagar com Pix, leia e aceite a Política de Cancelamento e a Política de Segurança.",
    };
  }

  function cartPoliciesAccepted(scope) {
    var root =
      scope ||
      document.getElementById("gcv-exc-cart-foot") ||
      document.getElementById("gcv-exc-cart-panel") ||
      document;
    var cancel = root.querySelector('[data-gcv-cart-agree="cancel"]');
    var security = root.querySelector('[data-gcv-cart-agree="security"]');
    return !!(cancel && cancel.checked && security && security.checked);
  }

  function syncCartCheckoutState() {
    var foot = document.getElementById("gcv-exc-cart-foot");
    var checkoutBtn = foot && foot.querySelector("[data-gcv-cart-checkout]");
    if (!checkoutBtn) return;
    var ok = cartPoliciesAccepted(foot);
    checkoutBtn.classList.toggle("is-ready", ok);
    checkoutBtn.setAttribute("aria-disabled", ok ? "false" : "true");
    checkoutBtn.disabled = false;
  }

  function ensurePolicyModal() {
    var modal = document.getElementById("gcv-exc-cart-policy-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "gcv-exc-cart-policy-modal";
    modal.className = "gcv-exc-cart-policy-modal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML =
      '<button type="button" class="gcv-exc-cart-policy-modal__backdrop" data-gcv-cart-policy-close tabindex="-1" aria-hidden="true"></button>' +
      '<div class="gcv-exc-cart-policy-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="gcv-exc-cart-policy-title">' +
      '<div class="gcv-exc-cart-policy-modal__head">' +
      '<h2 id="gcv-exc-cart-policy-title" class="gcv-exc-cart-policy-modal__title"></h2>' +
      '<button type="button" class="gcv-exc-cart-policy-modal__close" data-gcv-cart-policy-close aria-label="">×</button>' +
      "</div>" +
      '<div class="gcv-exc-cart-policy-modal__body" id="gcv-exc-cart-policy-body"></div>' +
      '<div class="gcv-exc-cart-policy-modal__foot">' +
      '<button type="button" class="gcv-exc-cart-policy-modal__done" data-gcv-cart-policy-close></button>' +
      "</div></div>";
    document.body.appendChild(modal);
    return modal;
  }

  function openPolicyModal(type) {
    var modal = ensurePolicyModal();
    var ui = policyUi();
    var titleEl = modal.querySelector("#gcv-exc-cart-policy-title");
    var bodyEl = modal.querySelector("#gcv-exc-cart-policy-body");
    var closeBtn = modal.querySelector(".gcv-exc-cart-policy-modal__close");
    var doneBtn = modal.querySelector(".gcv-exc-cart-policy-modal__done");
    var title =
      global.GcvExcCartPolicies && typeof global.GcvExcCartPolicies.docTitle === "function"
        ? global.GcvExcCartPolicies.docTitle(type, _locale)
        : type === "security"
          ? ui.policySecurity
          : ui.policyCancel;
    var html =
      global.GcvExcCartPolicies && typeof global.GcvExcCartPolicies.renderPolicyHtml === "function"
        ? global.GcvExcCartPolicies.renderPolicyHtml(type, _locale)
        : "";
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html ? '<article class="gcv-exc-policy-doc">' + html + "</article>" : "";
    if (closeBtn) closeBtn.setAttribute("aria-label", ui.modalClose || "Fechar");
    if (doneBtn) doneBtn.textContent = ui.modalClose || "Fechar";
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.documentElement.classList.add("gcv-exc-cart-policy-open");
    if (bodyEl) bodyEl.scrollTop = 0;
  }

  function closePolicyModal() {
    var modal = document.getElementById("gcv-exc-cart-policy-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    document.documentElement.classList.remove("gcv-exc-cart-policy-open");
  }

  function renderPolicyCheckboxLabel(type) {
    var ui = policyUi();
    var linkLabel =
      global.GcvExcCartPolicies && typeof global.GcvExcCartPolicies.policyLinkLabel === "function"
        ? global.GcvExcCartPolicies.policyLinkLabel(type, _locale)
        : type === "security"
          ? ui.policySecurity
          : ui.policyCancel;
    return (
      escapeHtml(ui.agreePrefix) +
      ' <button type="button" class="gcv-exc-cart-policy__link" data-gcv-cart-policy-open="' +
      escapeHtml(type) +
      '">' +
      escapeHtml(linkLabel) +
      "</button>"
    );
  }

  function ensureCartPoliciesBlock(foot) {
    if (!foot || foot.querySelector("#gcv-exc-cart-policies")) return;
    var policies = document.createElement("div");
    policies.id = "gcv-exc-cart-policies";
    policies.className = "gcv-exc-cart-panel__policies";
    policies.innerHTML =
      '<label class="gcv-exc-cart-policy">' +
      '<input type="checkbox" class="gcv-exc-cart-policy__input" data-gcv-cart-agree="cancel" />' +
      '<span class="gcv-exc-cart-policy__text" data-gcv-cart-policy-label="cancel"></span>' +
      "</label>" +
      '<label class="gcv-exc-cart-policy">' +
      '<input type="checkbox" class="gcv-exc-cart-policy__input" data-gcv-cart-agree="security" />' +
      '<span class="gcv-exc-cart-policy__text" data-gcv-cart-policy-label="security"></span>' +
      "</label>";
    var checkout = foot.querySelector("[data-gcv-cart-checkout]");
    if (checkout) foot.insertBefore(policies, checkout);
    else foot.appendChild(policies);
  }

  function departureMsFromItemFields(it) {
    var iso = itemDateIso(it);
    if (!iso) return NaN;
    var match = String((it && it.hora) || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    var hh = match ? parseInt(match[1], 10) : 12;
    var mm = match ? parseInt(match[2], 10) : 0;
    var ms = Date.parse(
      iso +
        "T" +
        String(hh).padStart(2, "0") +
        ":" +
        String(mm).padStart(2, "0") +
        ":00-03:00",
    );
    return Number.isFinite(ms) ? ms : NaN;
  }

  function catalogCartIdFromRow(e) {
    if (!e) return "";
    if (global.GcvExcBookings && typeof global.GcvExcBookings.cartIdFromExcursao === "function") {
      return String(global.GcvExcBookings.cartIdFromExcursao(e) || "")
        .trim()
        .toLowerCase();
    }
    var iso = String(e.dateISO || e.dateIso || "").slice(0, 10);
    var destRaw =
      e.cartSlug ||
      e.destino ||
      (Array.isArray(e.destinos)
        ? e.destinos
            .map(function (d) {
              return d && d.destino;
            })
            .filter(Boolean)
            .join("-")
        : "") ||
      "excursao";
    var dest = String(destRaw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (iso) return iso + "-" + dest;
    return dest;
  }

  function departureMsFromCatalogRow(e) {
    if (!e) return NaN;
    var stored = parseInt(String(e.departureMs), 10);
    if (Number.isFinite(stored)) return stored;
    var iso = String(e.dateISO || e.dateIso || "").slice(0, 10);
    var match = String(e.hora || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    if (!iso || !match) return NaN;
    var ms = Date.parse(
      iso +
        "T" +
        String(match[1]).padStart(2, "0") +
        ":" +
        match[2] +
        ":00-03:00",
    );
    return Number.isFinite(ms) ? ms : NaN;
  }

  /**
   * Catálogo vivo das próximas saídas (mesmo filtro da home).
   * @returns {null|{ ids: Record<string, number> }} null = catálogo ausente
   */
  function readLiveCatalog(nowMs) {
    var el =
      document.getElementById("gcv-exc-cart-catalog") ||
      document.getElementById("gcv-excursoes-payload");
    if (!el || !el.textContent) return null;
    var now = nowMs != null ? nowMs : Date.now();
    try {
      var data = JSON.parse(el.textContent);
      var ids = {};
      var pushRow = function (e) {
        var id = catalogCartIdFromRow(e);
        if (!id) return;
        var dep = departureMsFromCatalogRow(e);
        // Mesma regra da home: só permanece se ainda há tempo para reservar
        if (Number.isFinite(dep) && dep < now + BOOKING_CUTOFF_MS) return;
        ids[id] = Number.isFinite(dep) ? dep : 1;
      };
      if (Array.isArray(data)) {
        data.forEach(pushRow);
      } else if (data && typeof data === "object") {
        // Formato compacto { pt: ["id", ...], en: [...] }
        var loc = _locale === "en" || _locale === "es" ? _locale : "pt";
        var pack = data[loc] != null ? data[loc] : data.pt;
        if (Array.isArray(pack) && pack.length && typeof pack[0] === "string") {
          pack.forEach(function (id) {
            var key = String(id || "")
              .trim()
              .toLowerCase();
            if (key) ids[key] = 1;
          });
          // Inclui todos os locales para o carrinho sobreviver à troca de idioma
          ["pt", "en", "es"].forEach(function (L) {
            (data[L] || []).forEach(function (id) {
              var key = String(id || "")
                .trim()
                .toLowerCase();
              if (key) ids[key] = 1;
            });
          });
        } else {
          ["pt", "en", "es"].forEach(function (L) {
            (data[L] || []).forEach(pushRow);
          });
        }
      }
      return { ids: ids };
    } catch (err) {
      return null;
    }
  }

  function normalizeCartItemId(id) {
    var raw = String(id || "")
      .trim()
      .toLowerCase();
    if (global.GcvExcBookings && typeof global.GcvExcBookings.normalizeCartId === "function") {
      return global.GcvExcBookings.normalizeCartId(raw);
    }
    return raw;
  }

  function itemDepartureMs(it) {
    var stored = parseInt(String(it && it.departureMs), 10);
    if (Number.isFinite(stored)) return stored;
    if (typeof _resolveDepartureMs === "function") {
      var resolved = _resolveDepartureMs(it);
      if (Number.isFinite(resolved)) return resolved;
    }
    // Fallback com dados salvos no item — não depende do carrossel da home
    return departureMsFromItemFields(it);
  }

  function chapadaAgoraPartes(nowMs) {
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
    fmt.formatToParts(new Date(nowMs != null ? nowMs : Date.now())).forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    var hour = parseInt(map.hour, 10) || 0;
    if (hour === 24) hour = 0;
    return {
      iso: map.year + "-" + map.month + "-" + map.day,
      minutes: hour * 60 + (parseInt(map.minute, 10) || 0),
    };
  }

  function isoMaisDias(iso, days) {
    var d = new Date(iso + "T12:00:00Z");
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + days);
    var m = String(d.getUTCMonth() + 1).padStart(2, "0");
    var day = String(d.getUTCDate()).padStart(2, "0");
    return d.getUTCFullYear() + "-" + m + "-" + day;
  }

  /** Antes das 4h20 o passeio avulso pode ser hoje. Depois, só amanhã em diante. */
  function roteiroMinIso(nowMs) {
    var agora = chapadaAgoraPartes(nowMs);
    if (!agora.iso || agora.iso.indexOf("undefined") >= 0) return "";
    if (agora.minutes < PASSEIO_CORTE_MIN) return agora.iso;
    return isoMaisDias(agora.iso, 1);
  }

  function isRoteiroCartItem(it) {
    if (!it) return false;
    if (it.passeioKey) return true;
    return String(it.id || "").indexOf("roteiro-") === 0;
  }

  function isCartItemBookable(it, nowMs) {
    var now = nowMs != null ? nowMs : Date.now();
    if (isRoteiroCartItem(it)) {
      var iso = String((it && it.dateIso) || "").slice(0, 10);
      var min = roteiroMinIso(now);
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !!min && iso >= min;
    }
    var catalog = readLiveCatalog(now);
    var id = normalizeCartItemId(it && it.id);
    // Catálogo vazio (seed sem saídas) ≠ “passeio inválido”: a API live pode ter preenchido o card.
    if (catalog && catalog.ids && !Object.keys(catalog.ids).length) {
      catalog = null;
    }
    // Se o passeio sumiu das próximas saídas, remove do carrinho
    if (catalog && id && !catalog.ids[id]) return false;
    var dep = itemDepartureMs(it);
    if (catalog && id && Number.isFinite(catalog.ids[id]) && catalog.ids[id] > 1) {
      dep = catalog.ids[id];
    }
    if (!Number.isFinite(dep)) {
      // Sem data e sem catálogo: manter. Com catálogo já validado acima.
      return !catalog || !!(catalog.ids && catalog.ids[id]);
    }
    return dep >= now + BOOKING_CUTOFF_MS;
  }

  function purgeExpiredItems(items, nowMs) {
    return (items || []).filter(function (it) {
      return isCartItemBookable(it, nowMs);
    });
  }

  function readStoredItems() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  }

  function loadItems() {
    return sortCartItems(purgeExpiredItems(readStoredItems()));
  }

  function saveItems(items) {
    var purged = sortCartItems(purgeExpiredItems(items || []));
    var sig = purged.map(itemDateIso).filter(Boolean).sort().join(",");
    if (sig !== _gapSig) {
      _gapAck = "";
      _gapSig = sig;
    }
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(purged));
    } catch (err) {
      /* */
    }
    renderCartUi();
    if (typeof _onChange === "function") {
      _onChange(purged);
    }
  }

  function showExpiredCartToast() {
    var msg = s("cartItemsExpired");
    if (!msg) return;
    showCartToast(msg, "warning");
  }

  function purgeExpiredAndPersist(opts) {
    var items = readStoredItems();
    var notExpired = sortCartItems(purgeExpiredItems(items));
    var purged = dropSameDayDuplicates(notExpired);
    var sameDayRemoved = notExpired.length - purged.length;
    if (purged.length === items.length) {
      if (!opts || !opts.skipRender) renderCartUi();
      return 0;
    }
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(purged));
    } catch (err) {
      /* */
    }
    renderCartUi();
    if (sameDayRemoved > 0) showSameDayToast();
    else if (!opts || opts.notify !== false) showExpiredCartToast();
    if (typeof _onChange === "function") {
      _onChange(purged);
    }
    return items.length - purged.length;
  }

  function cartCount(items) {
    items = items || loadItems();
    return items.reduce(function (n, it) {
      if (it && it.faixa) return n + (parseInt(String(it.pessoas), 10) || 1);
      return n + (parseInt(String(it.qty), 10) || 0);
    }, 0);
  }

  /** Sem translado. Privativo até o quórum = quórum × excursão. Devolve reais, já com o guia bilíngue. */
  function faixaBaseCents(faixa, pessoas) {
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    var quorum = parseInt(faixa.quorum, 10) || 4;
    var temExcursao = faixa.excursao4Cents != null && faixa.excursao4Cents !== "";
    if (!temExcursao) {
      var antigo4 = Math.max(0, parseInt(faixa.pax4Cents, 10) || 0);
      var antigo5 = parseInt(faixa.pax5Cents, 10) || 0;
      if (antigo5 <= 0) antigo5 = antigo4;
      if (faixa.modalidade === "exclusivo" && pessoas <= quorum) return antigo4 * quorum;
      return pessoas <= 4 ? antigo4 * pessoas : 4 * antigo4 + (pessoas - 4) * antigo5;
    }
    var exc4 = Math.max(0, parseInt(faixa.excursao4Cents, 10) || 0);
    var exc5 = parseInt(faixa.excursao5Cents, 10) || 0;
    if (exc5 <= 0) exc5 = exc4;
    var pri5 = parseInt(faixa.privativo5Cents, 10) || 0;
    if (pri5 <= 0) pri5 = parseInt(faixa.privativo4Cents, 10) || exc4;
    if (faixa.modalidade === "exclusivo") {
      if (pessoas <= quorum) return exc4 * quorum;
      return exc4 * quorum + (pessoas - quorum) * pri5;
    }
    return pessoas <= 4 ? exc4 * pessoas : 4 * exc4 + (pessoas - 4) * exc5;
  }

  function faixaTotalReais(faixa, pessoas) {
    var base = faixaBaseCents(faixa, pessoas);
    var extra = 0;
    if (faixa.bilingueOn) {
      if (faixa.bilingueTipo === "percentual") {
        var pct = Math.max(0, Math.min(100, parseInt(faixa.bilingueValor, 10) || 0));
        extra = Math.round((base * pct) / 100);
      } else {
        extra = Math.max(0, parseInt(faixa.bilingueValor, 10) || 0);
      }
    }
    return Math.round((base + extra) / 100);
  }

  function faixaPartesReais(faixa, pessoas) {
    pessoas = Math.max(1, parseInt(pessoas, 10) || 1);
    var quorum = parseInt(faixa.quorum, 10) || 4;
    var temExcursao = faixa.excursao4Cents != null && faixa.excursao4Cents !== "";
    if (!temExcursao) {
      var antigo4 = Math.round((parseInt(faixa.pax4Cents, 10) || 0) / 100);
      var antigo5raw = parseInt(faixa.pax5Cents, 10) || 0;
      var antigo5 = antigo5raw > 0 ? Math.round(antigo5raw / 100) : antigo4;
      if (faixa.modalidade === "exclusivo" && pessoas <= quorum) return [{ q: quorum, u: antigo4 }];
      if (pessoas <= 4) return [{ q: pessoas, u: antigo4 }];
      return [{ q: 4, u: antigo4 }, { q: pessoas - 4, u: antigo5 }];
    }
    var exc4 = Math.round((parseInt(faixa.excursao4Cents, 10) || 0) / 100);
    var exc5raw = parseInt(faixa.excursao5Cents, 10) || 0;
    var exc5 = exc5raw > 0 ? Math.round(exc5raw / 100) : exc4;
    var pri5raw = parseInt(faixa.privativo5Cents, 10) || 0;
    var pri5 = pri5raw > 0 ? Math.round(pri5raw / 100) : Math.round((parseInt(faixa.privativo4Cents, 10) || 0) / 100);
    if (faixa.modalidade === "exclusivo") {
      if (pessoas <= quorum) return [{ q: quorum, u: exc4 }];
      return [{ q: quorum, u: exc4 }, { q: pessoas - quorum, u: pri5 }];
    }
    if (pessoas <= 4) return [{ q: pessoas, u: exc4 }];
    return [{ q: 4, u: exc4 }, { q: pessoas - 4, u: exc5 }];
  }

  var MONTH_SLUG = {
    janeiro: 1,
    january: 1,
    fevereiro: 2,
    february: 2,
    marco: 3,
    march: 3,
    abril: 4,
    april: 4,
    maio: 5,
    may: 5,
    junho: 6,
    june: 6,
    julho: 7,
    july: 7,
    agosto: 8,
    august: 8,
    setembro: 9,
    september: 9,
    outubro: 10,
    october: 10,
    novembro: 11,
    november: 11,
    dezembro: 12,
    december: 12,
    enero: 1,
    febrero: 2,
    marzo: 3,
    mayo: 5,
    junio: 6,
    julio: 7,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  function itemDateIso(it) {
    if (!it) return "";
    if (it.dateIso) return String(it.dateIso).slice(0, 10);
    var id = String(it.id || "");
    var canon = id.match(/^(\d{4}-\d{2}-\d{2})-/);
    if (canon) return canon[1];
    var parts = id.match(/^(\d{1,2})-([a-z]+)-/);
    if (!parts) return "";
    var month = MONTH_SLUG[parts[2]];
    if (!month) return "";
    var year = 2026;
    var y = String(it.dateLabel || "").match(/(\d{4})/);
    if (y) year = parseInt(y[1], 10);
    return (
      year +
      "-" +
      String(month).padStart(2, "0") +
      "-" +
      String(parseInt(parts[1], 10)).padStart(2, "0")
    );
  }

  function itemDepartureSortKey(it) {
    var ms = itemDepartureMs(it);
    if (Number.isFinite(ms)) return ms;
    var iso = itemDateIso(it);
    if (!iso) return Number.POSITIVE_INFINITY;
    var match = String(it.hora || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    var hh = match ? parseInt(match[1], 10) : 0;
    var mm = match ? parseInt(match[2], 10) : 0;
    return Date.parse(
      iso +
        "T" +
        String(hh).padStart(2, "0") +
        ":" +
        String(mm).padStart(2, "0") +
        ":00-03:00",
    );
  }

  function sortCartItems(items) {
    return (items || []).slice().sort(function (a, b) {
      return itemDepartureSortKey(a) - itemDepartureSortKey(b);
    });
  }

  function maxGapDays(items) {
    var dates = [];
    (items || []).forEach(function (it) {
      var iso = itemDateIso(it);
      if (iso && dates.indexOf(iso) < 0) dates.push(iso);
    });
    dates.sort();
    var max = 0;
    var i;
    for (i = 1; i < dates.length; i++) {
      var a = new Date(dates[i - 1] + "T12:00:00");
      var b = new Date(dates[i] + "T12:00:00");
      var gap = Math.round((b.getTime() - a.getTime()) / 86400000) - 1;
      if (gap > max) max = gap;
    }
    return max;
  }

  function gapMessage(n) {
    var key = n === 1 ? "cartGapOne" : "cartGapMany";
    return String(s(key) || "").replace("{n}", String(n));
  }

  function hasSameDayConflict(items, item) {
    if (!item) return false;
    var dateIso = itemDateIso(item);
    if (!dateIso) return false;
    return items.some(function (it) {
      return it && it.id !== item.id && itemDateIso(it) === dateIso;
    });
  }

  function cartOccupiedDates(items) {
    var map = {};
    (items || loadItems()).forEach(function (it) {
      var iso = itemDateIso(it);
      if (iso && it && it.id) map[iso] = it.id;
    });
    return map;
  }

  function cartChoiceCount(items) {
    return (items || loadItems()).length;
  }

  function cartTotal(items) {
    items = items || loadItems();
    return items.reduce(function (sum, it) {
      var u = parseInt(String(it.valorUnit), 10) || 0;
      var q = parseInt(String(it.qty), 10) || 0;
      return sum + u * q;
    }, 0);
  }

  function formatBrl(n) {
    return "R$\u00a0" + (parseInt(String(n), 10) || 0);
  }

  var CUPOM_KEY = "gcv-exc-cupom-code";
  var _cupom = null;
  var _cupomReq = 0;

  function cartPeople(items) {
    items = items || loadItems();
    return items.reduce(function (n, it) {
      return n + (parseInt(String(it.pessoas), 10) || parseInt(String(it.qty), 10) || 1);
    }, 0);
  }

  function cartGrossCents(items) {
    return cartTotal(items) * 100;
  }

  function cartCupomSig(items) {
    return String(cartGrossCents(items)) + ":" + String(cartPeople(items));
  }

  function cupomCode() {
    try {
      return String(sessionStorage.getItem(CUPOM_KEY) || "").trim().toUpperCase();
    } catch (e) {
      return "";
    }
  }

  function setCupomCode(code) {
    try {
      if (!code) sessionStorage.removeItem(CUPOM_KEY);
      else sessionStorage.setItem(CUPOM_KEY, String(code).trim().toUpperCase());
    } catch (e) {}
  }

  function cupomOffCents(items) {
    if (!_cupom || !_cupom.ok || _cupom.sig !== cartCupomSig(items)) return 0;
    return parseInt(String(_cupom.desconto_cents), 10) || 0;
  }

  function formatBrlCents(cents) {
    var n = (parseInt(String(cents), 10) || 0) / 100;
    return "R$\u00a0" + n.toFixed(2).replace(".", ",");
  }

  function couponRuleText(c) {
    if (!c) return "";
    var valor = c.modo === "percentual"
      ? (parseInt(String(c.valor), 10) || 0) + "%"
      : formatBrlCents(c.valor);
    var porPessoa = c.tipo === "pessoa" || (c.tipo === "grupo" && c.alcance === "pessoa");
    var loc = _locale === "en" || _locale === "es" ? _locale : "pt";
    if (loc === "en") {
      var en = porPessoa ? valor + " per person" : valor + " off the total";
      if (c.tipo === "grupo") en += ", with more than " + c.minimo_pessoas + " people";
      return en;
    }
    if (loc === "es") {
      var es = porPessoa ? valor + " por persona" : valor + " sobre el total";
      if (c.tipo === "grupo") es += ", con más de " + c.minimo_pessoas + " personas";
      return es;
    }
    var pt = porPessoa ? valor + " por pessoa" : valor + " no total";
    if (c.tipo === "grupo") pt += ", com mais de " + c.minimo_pessoas + " pessoas";
    return pt;
  }

  function injectCouponCss() {
    if (document.getElementById("gcv-cart-cupom-css")) return;
    var style = document.createElement("style");
    style.id = "gcv-cart-cupom-css";
    style.textContent =
      ".gcv-cart-cupom{margin:0 0 .75rem;padding:.75rem;border:1px solid #d1fae5;border-radius:12px;background:#fff}" +
      ".gcv-cart-cupom__label{display:block;margin:0 0 .4rem;font-size:.78rem;font-weight:800;color:#065f46}" +
      ".gcv-cart-cupom__row{display:flex;gap:.4rem}" +
      ".gcv-cart-cupom__row input{flex:1;min-width:0;padding:.55rem .7rem;border:1px solid #cbd5e1;border-radius:10px;font:inherit;font-weight:700;text-transform:uppercase}" +
      ".gcv-cart-cupom__row button{flex:0 0 auto;padding:.55rem .8rem;border:none;border-radius:10px;background:#065f46;color:#fff;font:inherit;font-weight:800;cursor:pointer}" +
      ".gcv-cart-cupom__hint,.gcv-cart-cupom__msg{margin:.45rem 0 0;font-size:.78rem;line-height:1.35;color:#64748b}" +
      ".gcv-cart-cupom__msg.is-err{color:#b91c1c;font-weight:700}" +
      ".gcv-cart-cupom__msg.is-ok{color:#065f46;font-weight:700}" +
      ".gcv-cart-cupom__lines{margin:.55rem 0 0;display:grid;gap:.2rem}" +
      ".gcv-cart-cupom__lines p{display:flex;justify-content:space-between;gap:.75rem;margin:0;font-size:.84rem;color:#334155}" +
      ".gcv-cart-cupom__lines strong{font-weight:800}" +
      ".gcv-cart-cupom__lines .is-off{color:#047857}";
    document.head.appendChild(style);
  }

  function couponBoxHtml() {
    return (
      '<div class="gcv-cart-cupom" data-gcv-cart-cupom>' +
      '<span class="gcv-cart-cupom__label" data-gcv-cart-cupom-label></span>' +
      '<div class="gcv-cart-cupom__row">' +
      '<input type="text" maxlength="24" autocomplete="off" data-gcv-cart-cupom-code />' +
      '<button type="button" data-gcv-cart-cupom-apply></button>' +
      "</div>" +
      '<p class="gcv-cart-cupom__hint" data-gcv-cart-cupom-hint></p>' +
      '<p class="gcv-cart-cupom__msg" data-gcv-cart-cupom-msg hidden></p>' +
      '<div class="gcv-cart-cupom__lines" data-gcv-cart-cupom-lines hidden></div>' +
      "</div>"
    );
  }

  function ensureCouponBlock(foot) {
    injectCouponCss();
    if (foot.querySelector("[data-gcv-cart-cupom]")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = couponBoxHtml();
    var node = wrap.firstChild;
    var total = foot.querySelector(".gcv-exc-cart-panel__total");
    if (total) foot.insertBefore(node, total);
    else foot.insertBefore(node, foot.firstChild);
  }

  function paintCoupon(items) {
    var foot = document.getElementById("gcv-exc-cart-foot");
    if (!foot) return;
    ensureCouponBlock(foot);
    var label = foot.querySelector("[data-gcv-cart-cupom-label]");
    var input = foot.querySelector("[data-gcv-cart-cupom-code]");
    var btn = foot.querySelector("[data-gcv-cart-cupom-apply]");
    var hint = foot.querySelector("[data-gcv-cart-cupom-hint]");
    var msg = foot.querySelector("[data-gcv-cart-cupom-msg]");
    var lines = foot.querySelector("[data-gcv-cart-cupom-lines]");
    var totalVal = foot.querySelector("[data-gcv-cart-total-val]");
    if (label) label.textContent = s("cartCouponLabel");
    if (hint) hint.textContent = s("cartCouponHint");
    if (input && document.activeElement !== input) {
      input.placeholder = s("cartCouponPh");
      if (!input.value) input.value = cupomCode();
    }
    var sig = cartCupomSig(items);
    var applied = !!(_cupom && _cupom.ok && _cupom.sig === sig);
    if (btn) {
      btn.textContent = applied ? s("cartCouponRemove") : s("cartCouponApply");
      btn.setAttribute("data-gcv-cart-cupom-mode", applied ? "remove" : "apply");
    }
    var gross = cartGrossCents(items);
    var off = cupomOffCents(items);
    if (msg) {
      if (_cupom && _cupom.pending && _cupom.sig === sig) {
        msg.hidden = false;
        msg.className = "gcv-cart-cupom__msg";
        msg.textContent = s("cartCouponChecking");
      } else if (_cupom && !_cupom.ok && _cupom.message && _cupom.sig === sig) {
        msg.hidden = false;
        msg.className = "gcv-cart-cupom__msg is-err";
        msg.textContent = _cupom.message;
      } else if (applied) {
        msg.hidden = false;
        msg.className = "gcv-cart-cupom__msg is-ok";
        msg.textContent = couponRuleText(_cupom);
      } else {
        msg.hidden = true;
        msg.textContent = "";
      }
    }
    if (lines) {
      if (off > 0) {
        lines.hidden = false;
        lines.innerHTML =
          "<p><span>" + escapeHtml(s("cartCouponSub")) + "</span><strong>" + escapeHtml(formatBrlCents(gross)) + "</strong></p>" +
          '<p class="is-off"><span>' + escapeHtml(s("cartCouponOff")) + " " + escapeHtml(_cupom.codigo || "") + "</span><strong>− " + escapeHtml(formatBrlCents(off)) + "</strong></p>";
      } else {
        lines.hidden = true;
        lines.innerHTML = "";
      }
    }
    if (totalVal) {
      var due = Math.max(0, gross - off);
      totalVal.textContent = (off > 0 ? formatBrlCents(due) : formatBrl(cartTotal(items))) + " BRL";
    }
  }

  function revalidateCupom(items) {
    var code = cupomCode();
    var sig = cartCupomSig(items);
    if (!code) {
      _cupom = null;
      paintCoupon(items);
      return;
    }
    if (_cupom && _cupom.codigo === code && _cupom.sig === sig) {
      paintCoupon(items);
      return;
    }
    var req = ++_cupomReq;
    _cupom = { pending: true, codigo: code, sig: sig };
    paintCoupon(items);
    fetch("/api/cupom.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo: code,
        pessoas: cartPeople(items),
        total_cents: cartGrossCents(items),
        locale: _locale === "en" || _locale === "es" ? _locale : "pt",
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (req !== _cupomReq) return;
        if (!data || !data.ok) {
          _cupom = {
            ok: false,
            codigo: code,
            sig: sig,
            message: (data && data.message) || s("cartCouponChecking"),
          };
        } else {
          _cupom = {
            ok: true,
            codigo: data.codigo,
            sig: sig,
            desconto_cents: data.desconto_cents,
            tipo: data.tipo,
            modo: data.modo,
            valor: data.valor,
            minimo_pessoas: data.minimo_pessoas,
            alcance: data.alcance,
          };
        }
        paintCoupon(loadItems());
      })
      .catch(function () {
        if (req !== _cupomReq) return;
        _cupom = { ok: false, codigo: code, sig: sig, message: s("cartCouponChecking") };
        paintCoupon(loadItems());
      });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shortDestLabel(it) {
    var dest = String((it && it.destino) || "").trim();
    if (dest) return dest;
    var fromPix = String((it && it.pixDesc) || "").trim();
    if (!fromPix) return "Excursao";
    var dash = fromPix.indexOf(" - ");
    return dash >= 0 ? fromPix.slice(dash + 3).trim() : fromPix;
  }

  function dayPrefix(it) {
    var raw = String((it && it.dateLabel) || "");
    var day = raw.match(/(\d{1,2})/);
    if (!day) return "";
    var month = raw.match(/(?:de\s+)?([a-záàâãéêíóôõúç]+)/i);
    if (!month) return day[1] + "/";
    return day[1] + "/" + month[1].slice(0, 3).toLowerCase() + " ";
  }

  /** Descrição curta para o campo Pix do QR (máx. 73 caracteres). */
  function pixDescShortFromCart(items) {
    if (!items.length) return "";
    var parts = items.map(function (it) {
      var q = parseInt(String(it.qty), 10) || 1;
      var label = dayPrefix(it) + shortDestLabel(it);
      return q > 1 ? label + " x" + q : label;
    });
    var out = "";
    for (var i = 0; i < parts.length; i++) {
      var sep = out ? ", " : "";
      var candidate = out + sep + parts[i];
      if (candidate.length > 73) {
        if (!out) return parts[i].slice(0, 73);
        var remaining = parts.length - i;
        var suffix = remaining > 0 ? " +" + remaining : "";
        var room = Math.max(0, 73 - suffix.length);
        return out.slice(0, room).replace(/[,\s]+$/, "") + suffix;
      }
      out = candidate;
    }
    return out;
  }

  function formatCartHora(hora) {
    var h = String(hora || "").trim();
    if (!h) return "";
    var m = h.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return h;
    var hh = parseInt(m[1], 10);
    if (m[2] === "00") return hh + "h";
    return hh + "h" + m[2];
  }

  function cartItemTitle(it) {
    return [it.dateLabel, it.destino || shortDestLabel(it)].filter(Boolean).join(" · ");
  }

  function cartItemDestinoTitles(it) {
    if (Array.isArray(it && it.destinos) && it.destinos.length) {
      return it.destinos
        .map(function (d) {
          return String(d || "").trim();
        })
        .filter(Boolean);
    }
    var single = shortDestLabel(it);
    return single ? [single] : [];
  }

  function cartItemDateLine(it) {
    return String((it && it.dateLabel) || "").trim();
  }

  function cartItemEmbarqueText(it) {
    var em = String(it.embarque || "").trim();
    var hora = String(it.hora || "").trim() || formatCartHora(it.hora);
    if (!em && !hora) return "";
    return [em, hora].filter(Boolean).join(" ");
  }

  /** Texto plano (PIX / linhas). */
  function cartItemEmbarque(it) {
    return cartItemEmbarqueText(it);
  }

  function cartItemInfoHtml(it) {
    var dateLine = cartItemDateLine(it);
    var titles = cartItemDestinoTitles(it);
    var titlesHtml = titles
      .map(function (t) {
        return '<p class="gcv-exc-cart-item__destino">' + escapeHtml(t) + "</p>";
      })
      .join("");
    var embarque = cartItemEmbarqueText(it);
    return (
      (dateLine
        ? '<p class="gcv-exc-cart-item__date">' + escapeHtml(dateLine) + "</p>"
        : "") +
      (titlesHtml ||
        '<p class="gcv-exc-cart-item__destino">' + escapeHtml(shortDestLabel(it)) + "</p>") +
      (embarque
        ? '<p class="gcv-exc-cart-item__embarque">' +
          '<i class="ti ti-map-pin gcv-exc-cart-item__gps" aria-hidden="true"></i> ' +
          escapeHtml(embarque) +
          "</p>"
        : "")
    );
  }

  function cartMoneyText(it) {
    var suffix = s("cartLineTotal") || "(total)";
    if (it && it.faixa) {
      var pessoas = parseInt(String(it.pessoas), 10) || 1;
      var partes = faixaPartesReais(it.faixa, pessoas);
      var base = 0;
      var pedacos = partes.map(function (p) {
        base += p.q * p.u;
        var word = p.q === 1 ? s("cartSeatOne") || "Pessoa" : s("cartSeatsMany") || "Pessoas";
        return String(p.q) + " " + word + " × " + formatBrl(p.u);
      });
      var total = parseInt(String(it.valorUnit), 10) || faixaTotalReais(it.faixa, pessoas);
      var extra = total - base;
      if (extra > 0) pedacos.push(formatBrl(extra));
      return pedacos.join(" + ") + " = " + formatBrl(total) + " BRL " + suffix;
    }
    var qty = parseInt(String(it.qty), 10) || 0;
    var unit = parseInt(String(it.valorUnit), 10) || 0;
    var seatsWord = qty === 1 ? s("cartSeatOne") || "Pessoa" : s("cartSeatsMany") || "Pessoas";
    return String(qty) + " " + seatsWord + " × " + formatBrl(unit) + " = " + formatBrl(unit * qty) + " BRL " + suffix;
  }

  function cartItemPrice(it) {
    return cartMoneyText(it);
  }

  function cartItemPriceHtml(it) {
    var text = cartMoneyText(it);
    var eq = text.lastIndexOf(" = ");
    if (eq < 0) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, eq + 3)) +
      '<strong class="gcv-exc-cart-item__total">' +
      escapeHtml(text.slice(eq + 3)) +
      "</strong>"
    );
  }

  /** Linhas completas para exibir no modal (sem limite de 73 caracteres). */
  function cartDisplayLines(items) {
    return items.map(function (it) {
      var parts = [cartItemDateLine(it)].concat(cartItemDestinoTitles(it));
      var emb = cartItemEmbarque(it);
      if (emb) parts.push(emb);
      parts.push(cartItemPrice(it));
      return parts.join("\n");
    });
  }

  function guideLangFromItem(it) {
    var code = String((it && it.guiaIdioma) || "").toLowerCase();
    if (code === "pt" || code === "en" || code === "es") return code;
    var id = String((it && it.id) || "");
    var bi = id.match(/-bi-(en|es)$/);
    if (bi) return bi[1];
    if (id.indexOf("roteiro-") === 0) return "pt";
    return "";
  }

  function modeFromItem(it) {
    var mode = String((it && it.modalidade) || "");
    if (mode === "excursao" || mode === "exclusivo") return mode;
    var id = String((it && it.id) || "");
    if (id.indexOf("-exclusivo-") >= 0) return "exclusivo";
    if (id.indexOf("-excursao-") >= 0) return "excursao";
    return "";
  }

  function cartPayDetail(items) {
    return {
      pixDesc: pixDescShortFromCart(items),
      lines: cartDisplayLines(items),
      qty: cartCount(items),
      trips: items.map(function (it) {
        return {
          dateLabel: it.dateLabel || "",
          destino: shortDestLabel(it),
          embarque: it.embarque || "",
          meetingPoint: it.meetingPoint || "",
          meetingLat: it.meetingLat != null ? it.meetingLat : null,
          meetingLng: it.meetingLng != null ? it.meetingLng : null,
          meetingMapsUrl: it.meetingMapsUrl || "",
          hora: it.hora || "",
          qty: parseInt(String(it.qty), 10) || 1,
          pessoas: parseInt(String(it.pessoas), 10) || parseInt(String(it.qty), 10) || 1,
          cartId: it.id || "",
          passeioKey: it.passeioKey || "",
          comTransporte: it.comTransporte === true,
          walkGuideSeatOk: it.walkGuideSeatOk === true,
          valorUnit: parseInt(String(it.valorUnit), 10) || 0,
          guiaIdioma: guideLangFromItem(it),
          modalidade: modeFromItem(it),
          guiaNome: it.guiaNome || "",
          guiaTelefone: it.guiaTelefone || "",
          dateIso: it.dateIso || "",
        };
      }),
      packages: items.map(function (it) {
        return {
          title: cartItemTitle(it),
          dateLabel: it.dateLabel || "",
          destino: it.destino || shortDestLabel(it),
          embarque: it.embarque || "",
          meetingPoint: it.meetingPoint || "",
          meetingLat: it.meetingLat != null ? it.meetingLat : null,
          meetingLng: it.meetingLng != null ? it.meetingLng : null,
          meetingMapsUrl: it.meetingMapsUrl || "",
          hora: it.hora || "",
          qty: parseInt(String(it.qty), 10) || 1,
          cartId: it.id || "",
          valorUnit: parseInt(String(it.valorUnit), 10) || 0,
          // Não envia inclExcl cacheado: o modal regenera no idioma da página.
          inclExcl: null,
          guiaNome: it.guiaNome || "",
          guiaTelefone: it.guiaTelefone || "",
          dateIso: it.dateIso || "",
        };
      }),
    };
  }

  var CART_ICON =
    '<svg class="gcv-exc-cart-float__icon" width="1.15em" height="1.15em" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="9" cy="20" r="1.15" fill="currentColor" stroke="none"></circle>' +
    '<circle cx="18" cy="20" r="1.15" fill="currentColor" stroke="none"></circle>' +
    '<path d="M3 4h2l2.2 11h11.3l1.6-8H7"></path></svg>';

  function createCartTriggerButton(id, variantClass) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gcv-exc-cart-float " + variantClass;
    btn.id = id;
    btn.hidden = true;
    btn.setAttribute("aria-label", "");
    btn.innerHTML =
      CART_ICON +
      '<span class="gcv-exc-cart-float__badge" id="' +
      id +
      '-badge" hidden>0</span>';
    return btn;
  }

  function ensureCartTriggerButtons(root) {
    var panel = root.querySelector("#gcv-exc-cart-panel");
    var insertBeforePanel = function (node) {
      if (panel) root.insertBefore(node, panel);
      else root.appendChild(node);
    };

    var headerBtn = document.getElementById("gcv-exc-cart-float-header");
    if (!headerBtn) {
      var legacy = document.getElementById("gcv-exc-cart-float");
      if (legacy) {
        legacy.id = "gcv-exc-cart-float-header";
        legacy.classList.add("gcv-exc-cart-float--header");
        var legacyBadge = document.getElementById("gcv-exc-cart-float-badge");
        if (legacyBadge) legacyBadge.id = "gcv-exc-cart-float-header-badge";
        headerBtn = legacy;
      } else {
        headerBtn = createCartTriggerButton("gcv-exc-cart-float-header", "gcv-exc-cart-float--header");
        insertBeforePanel(headerBtn);
      }
    }

    if (!document.getElementById("gcv-exc-cart-float-dock")) {
      insertBeforePanel(
        createCartTriggerButton("gcv-exc-cart-float-dock", "gcv-exc-cart-float--dock"),
      );
    }
  }

  function syncCartTriggerBtn(btn, badge, count) {
    if (!btn) return;
    btn.setAttribute(
      "aria-label",
      count > 0 ? s("cartFabAria") + " (" + count + ")" : s("cartFabAria"),
    );
    btn.hidden = count <= 0;
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count <= 0;
    }
  }

  function ensureCartUi() {
    var root = document.getElementById("gcv-exc-cart-root");
    if (root) {
      ensureCartTriggerButtons(root);
      mountCartFabInHeader();
      var fab = document.getElementById("gcv-exc-cart-fab");
      if (fab && !document.getElementById("gcv-exc-cart-fab-total")) {
        var totalSpan = document.createElement("span");
        totalSpan.className = "gcv-exc-cart-fab__total";
        totalSpan.id = "gcv-exc-cart-fab-total";
        totalSpan.hidden = true;
        var badgeEl = fab.querySelector("#gcv-exc-cart-badge");
        fab.insertBefore(totalSpan, badgeEl || null);
      }
      return root;
    }
    root = document.createElement("div");
    root.id = "gcv-exc-cart-root";
    root.className = "gcv-exc-cart-root";
    root.innerHTML =
      '<button type="button" class="gcv-exc-cart-fab" id="gcv-exc-cart-fab" aria-label="" hidden>' +
      CART_ICON +
      '<span class="gcv-exc-cart-fab__label"></span>' +
      '<span class="gcv-exc-cart-fab__total" id="gcv-exc-cart-fab-total" hidden></span>' +
      '<span class="gcv-exc-cart-fab__badge" id="gcv-exc-cart-badge" hidden>0</span>' +
      "</button>" +
      '<div class="gcv-exc-cart-panel" id="gcv-exc-cart-panel" hidden aria-hidden="true">' +
      '<button type="button" class="gcv-exc-cart-panel__backdrop" data-gcv-cart-close aria-label=""></button>' +
      '<div class="gcv-exc-cart-panel__sheet" role="dialog" aria-modal="true" aria-labelledby="gcv-exc-cart-title">' +
      '<div class="gcv-exc-cart-panel__head">' +
      '<h2 id="gcv-exc-cart-title" class="gcv-exc-cart-panel__title"></h2>' +
      '<button type="button" class="gcv-exc-cart-panel__close" data-gcv-cart-close aria-label="">×</button>' +
      "</div>" +
      '<div class="gcv-exc-cart-panel__body" id="gcv-exc-cart-body"></div>' +
      '<div class="gcv-exc-cart-panel__foot" id="gcv-exc-cart-foot" hidden>' +
      couponBoxHtml() +
      '<p class="gcv-exc-cart-panel__total"><span data-gcv-cart-total-label></span> <strong data-gcv-cart-total-val></strong></p>' +
      '<div class="gcv-exc-cart-panel__policies" id="gcv-exc-cart-policies">' +
      '<label class="gcv-exc-cart-policy">' +
      '<input type="checkbox" class="gcv-exc-cart-policy__input" data-gcv-cart-agree="cancel" />' +
      '<span class="gcv-exc-cart-policy__text" data-gcv-cart-policy-label="cancel"></span>' +
      "</label>" +
      '<label class="gcv-exc-cart-policy">' +
      '<input type="checkbox" class="gcv-exc-cart-policy__input" data-gcv-cart-agree="security" />' +
      '<span class="gcv-exc-cart-policy__text" data-gcv-cart-policy-label="security"></span>' +
      "</label></div>" +
      '<p data-gcv-cart-gap hidden style="margin:0 0 .75rem;padding:.7rem .8rem;border-radius:10px;background:#fef3c7;color:#92400e;font-size:.88rem;font-weight:700;line-height:1.4"></p>' +
      '<button type="button" class="gcv-exc-cart-panel__checkout" data-gcv-cart-checkout aria-disabled="true"></button>' +
      '<button type="button" class="gcv-exc-cart-panel__back" data-gcv-cart-close></button>' +
      "</div></div></div>";
    document.body.appendChild(root);
    ensureCartTriggerButtons(root);
    mountCartFabInHeader();
    return root;
  }

  var _cartMountMq = null;

  function ensureHeaderActions(header) {
    var actions = header.querySelector(".header-actions");
    if (actions) return actions;
    actions = document.createElement("div");
    actions.className = "header-actions";
    var toggle = header.querySelector(".nav-toggle");
    var nav = header.querySelector(".nav-main");
    if (toggle) header.insertBefore(actions, toggle);
    else if (nav) header.insertBefore(actions, nav);
    else header.appendChild(actions);
    return actions;
  }

  function mountCartFabInHeader() {
    var btn = document.getElementById("gcv-exc-cart-float-header");
    var fab = document.getElementById("gcv-exc-cart-fab");
    if (fab) fab.hidden = true;
    if (!btn) return;
    var header = document.querySelector(".site-header .header-inner");
    if (!header) return;

    function place() {
      var nav = header.querySelector(".nav-main");
      var toggle = header.querySelector(".nav-toggle");
      var actions = ensureHeaderActions(header);
      var mobile = window.matchMedia("(max-width: 860px)").matches;

      if (mobile) {
        if (toggle && toggle.parentElement !== actions) actions.appendChild(toggle);
        if (btn.parentElement !== actions) actions.insertBefore(btn, toggle || null);
        return;
      }

      if (toggle && toggle.parentElement === actions) {
        if (nav && nav.parentElement === header) header.insertBefore(toggle, nav);
        else header.appendChild(toggle);
      }

      if (nav) {
        var lang = nav.querySelector(".lang-switch");
        if (btn.parentElement !== nav) {
          if (lang) nav.insertBefore(btn, lang);
          else nav.appendChild(btn);
        }
        return;
      }

      if (btn.parentElement !== actions) actions.appendChild(btn);
    }

    place();
    if (!_cartMountMq) {
      _cartMountMq = window.matchMedia("(max-width: 860px)");
      var rebounce = function () {
        place();
      };
      if (_cartMountMq.addEventListener) _cartMountMq.addEventListener("change", rebounce);
      else if (_cartMountMq.addListener) _cartMountMq.addListener(rebounce);
    }
  }

  function bootstrapCartHeaderShell() {
    if (!document.querySelector(".site-header .header-inner")) return;
    var root = ensureCartUi();
    mountCartFabInHeader();
    if (!root._gcvCartBound) renderCartUi();
  }

  function closeCartPanel() {
    var panel = document.getElementById("gcv-exc-cart-panel");
    if (!panel) return;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.classList.remove("is-open");
    document.documentElement.classList.remove("gcv-exc-cart-open");
  }

  function openCartPanel() {
    var panel = document.getElementById("gcv-exc-cart-panel");
    if (!panel) return;
    renderCartUi();
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.classList.add("is-open");
    document.documentElement.classList.add("gcv-exc-cart-open");
  }

  function renderCartUi() {
    var root = ensureCartUi();
    mountCartFabInHeader();
    var items = loadItems();
    var count = cartChoiceCount(items);
    var people = cartCount(items);
    var total = cartTotal(items);
    var fab = document.getElementById("gcv-exc-cart-fab");
    var badge = document.getElementById("gcv-exc-cart-badge");
    var fabLabel = fab ? fab.querySelector(".gcv-exc-cart-fab__label") : null;
    var fabTotal = document.getElementById("gcv-exc-cart-fab-total");
    var body = root.querySelector("#gcv-exc-cart-body");
    var foot = root.querySelector("#gcv-exc-cart-foot");
    var title = root.querySelector("#gcv-exc-cart-title");

    if (fab) {
      fab.hidden = true;
    }
    if (fabLabel) fabLabel.textContent = s("cartFabLabel") || s("cartTitle") || "Carrinho";
    if (fabTotal) {
      fabTotal.textContent = formatBrl(total);
      fabTotal.hidden = true;
    }
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count <= 0;
      badge.setAttribute("title", people > count ? people + " pessoas" : "");
    }
    var floatBtn = document.getElementById("gcv-exc-cart-float-header");
    var floatBadge = document.getElementById("gcv-exc-cart-float-header-badge");
    syncCartTriggerBtn(floatBtn, floatBadge, count);
    syncCartTriggerBtn(
      document.getElementById("gcv-exc-cart-float-dock"),
      document.getElementById("gcv-exc-cart-float-dock-badge"),
      count,
    );
    document.documentElement.classList.toggle("gcv-exc-cart-has-items", count > 0);
    if (title) title.textContent = s("cartTitle");
    var gapNote = root.querySelector("[data-gcv-cart-gap]");
    if (gapNote && !_gapAck) {
      gapNote.hidden = true;
      gapNote.textContent = "";
    }

    root.querySelectorAll("[data-gcv-cart-close]").forEach(function (btn) {
      btn.setAttribute("aria-label", s("pixModalClose") || s("cartClose") || "Fechar");
    });

    if (!body) return;

    if (!items.length) {
      body.innerHTML = '<p class="gcv-exc-cart-panel__empty">' + escapeHtml(s("cartEmpty")) + "</p>";
      if (foot) foot.hidden = true;
      var panel = document.getElementById("gcv-exc-cart-panel");
      if (panel && panel.classList.contains("is-open")) {
        closeCartPanel();
      }
      return;
    }

    body.innerHTML = items
      .map(function (it) {
        var id = escapeHtml(it.id);
        return (
          '<article class="gcv-exc-cart-item" data-cart-id="' +
          id +
          '">' +
          '<div class="gcv-exc-cart-item__info">' +
          cartItemInfoHtml(it) +
          '<p class="gcv-exc-cart-item__meta">' +
          cartItemPriceHtml(it) +
          "</p></div>" +
          '<div class="gcv-exc-cart-item__actions">' +
          '<div class="gcv-excursoes-card__qty gcv-excursoes-card__qty--sm">' +
          '<button type="button" class="gcv-excursoes-card__qty-btn" data-gcv-cart-qty-min data-cart-id="' +
          id +
          '" aria-label="' +
          escapeHtml(s("bookQtyMinus")) +
          '">−</button>' +
          '<span class="gcv-excursoes-card__qty-val">' +
          escapeHtml(String(it.faixa ? (parseInt(String(it.pessoas), 10) || 1) : it.qty)) +
          "</span>" +
          '<button type="button" class="gcv-excursoes-card__qty-btn" data-gcv-cart-qty-plus data-cart-id="' +
          id +
          '" aria-label="' +
          escapeHtml(s("bookQtyPlus")) +
          '">+</button>' +
          "</div>" +
          '<button type="button" class="gcv-exc-cart-item__remove" data-gcv-cart-remove data-cart-id="' +
          id +
          '">' +
          escapeHtml(s("cartRemove")) +
          "</button></div></article>"
        );
      })
      .join("");

    if (foot) {
      foot.hidden = false;
      ensureCartPoliciesBlock(foot);
      if (!foot.querySelector(".gcv-exc-cart-panel__back")) {
        var backEl = document.createElement("button");
        backEl.type = "button";
        backEl.className = "gcv-exc-cart-panel__back";
        backEl.setAttribute("data-gcv-cart-close", "");
        foot.appendChild(backEl);
      }
      var totalLabel = foot.querySelector("[data-gcv-cart-total-label]");
      var totalVal = foot.querySelector("[data-gcv-cart-total-val]");
      var checkoutBtn = foot.querySelector("[data-gcv-cart-checkout]");
      var backBtn = foot.querySelector(".gcv-exc-cart-panel__back");
      var cancelLabel = foot.querySelector('[data-gcv-cart-policy-label="cancel"]');
      var securityLabel = foot.querySelector('[data-gcv-cart-policy-label="security"]');
      if (totalLabel) totalLabel.textContent = s("bookTotal");
      if (totalVal) totalVal.textContent = formatBrl(cartTotal(items)) + " BRL";
      revalidateCupom(items);
      if (checkoutBtn) checkoutBtn.textContent = s("cartCheckout");
      if (backBtn) backBtn.textContent = s("cartBack");
      if (cancelLabel) cancelLabel.innerHTML = renderPolicyCheckboxLabel("cancel");
      if (securityLabel) securityLabel.innerHTML = renderPolicyCheckboxLabel("security");
      syncCartCheckoutState();
    }
  }

  function addItem(item) {
    if (!item || !item.id) return false;
    if (!isCartItemBookable(item)) return false;
    var items = loadItems();
    var max = parseInt(String(item.maxQty), 10) || 10;
    var qty = Math.max(1, Math.min(max, parseInt(String(item.qty), 10) || 1));
    var dateIso = itemDateIso(item);

    if (item.passeioKey) {
      items = items.filter(function (it) {
        return !(it && it.passeioKey === item.passeioKey);
      });
    }
    var existing = items.find(function (it) {
      return it.id === item.id;
    });
    if (hasSameDayConflict(items, item)) {
      return false;
    }
    if (existing) {
      existing.qty = qty;
      existing.valorUnit = item.valorUnit;
      existing.pixDesc = item.pixDesc;
      existing.destino = item.destino;
      existing.dateLabel = item.dateLabel;
      existing.maxQty = max;
      if (item.dateIso) existing.dateIso = item.dateIso;
      if (item.inclExcl) existing.inclExcl = item.inclExcl;
      if (item.embarque) existing.embarque = item.embarque;
      if (item.hora) existing.hora = item.hora;
      if (item.guiaNome) existing.guiaNome = item.guiaNome;
      if (item.guiaTelefone) existing.guiaTelefone = item.guiaTelefone;
      if (item.meetingPoint) existing.meetingPoint = item.meetingPoint;
      if (item.meetingLat != null) existing.meetingLat = item.meetingLat;
      if (item.meetingLng != null) existing.meetingLng = item.meetingLng;
      if (item.meetingMapsUrl) existing.meetingMapsUrl = item.meetingMapsUrl;
      if (item.departureMs) existing.departureMs = item.departureMs;
      if (item.passeioKey) existing.passeioKey = item.passeioKey;
      if (item.pessoas) existing.pessoas = item.pessoas;
      if (item.faixa) {
        existing.faixa = item.faixa;
        existing.qty = 1;
        existing.valorUnit = item.valorUnit;
      } else {
        existing.faixa = null;
      }
      if (item.comTransporte != null) existing.comTransporte = item.comTransporte === true;
      if (item.guiaIdioma) existing.guiaIdioma = item.guiaIdioma;
      if (item.modalidade) existing.modalidade = item.modalidade;
      if (item.carros) existing.carros = item.carros;
      if (item.guias) existing.guias = item.guias;
      if (item.quorum) existing.quorum = item.quorum;
      if (item.vagaGuiaObrigatoria != null) existing.vagaGuiaObrigatoria = item.vagaGuiaObrigatoria === true;
      if (Array.isArray(item.destinos) && item.destinos.length) existing.destinos = item.destinos.slice();
    } else {
      items.push({
        id: item.id,
        destino: item.destino,
        destinos: Array.isArray(item.destinos) ? item.destinos.slice() : undefined,
        dateLabel: item.dateLabel,
        dateIso: dateIso || item.dateIso || "",
        valorUnit: item.valorUnit,
        qty: qty,
        pixDesc: item.pixDesc,
        maxQty: max,
        inclExcl: item.inclExcl || null,
        embarque: item.embarque || "",
        meetingPoint: item.meetingPoint || "",
        meetingLat: item.meetingLat != null ? item.meetingLat : null,
        meetingLng: item.meetingLng != null ? item.meetingLng : null,
        meetingMapsUrl: item.meetingMapsUrl || "",
        hora: item.hora || "",
        departureMs: item.departureMs || null,
        guiaNome: item.guiaNome || "",
        guiaTelefone: item.guiaTelefone || "",
        passeioKey: item.passeioKey || "",
        pessoas: item.pessoas || qty,
        faixa: item.faixa || null,
        comTransporte: item.comTransporte === true,
        guiaIdioma: item.guiaIdioma || "",
        modalidade: item.modalidade || "",
        carros: parseInt(item.carros, 10) || 0,
        guias: parseInt(item.guias, 10) || 0,
        quorum: parseInt(item.quorum, 10) || 0,
        vagaGuiaObrigatoria: item.vagaGuiaObrigatoria === true,
      });
    }
    saveItems(items);
    return true;
  }

  function syncItem(item) {
    if (!item || !item.id) return false;
    var items = loadItems();
    if (!items.some(function (it) {
      return it && it.id === item.id;
    })) {
      return false;
    }
    return addItem(item);
  }

  function updateItemQty(id, qty) {
    var items = loadItems();
    var it = items.find(function (x) {
      return x.id === id;
    });
    if (!it) return;
    var max = parseInt(String(it.maxQty), 10) || 10;
    qty = Math.max(1, Math.min(max, qty));
    if (it.faixa) {
      it.pessoas = qty;
      it.qty = 1;
      it.valorUnit = faixaTotalReais(it.faixa, qty);
    } else {
      it.qty = qty;
    }
    saveItems(items);
  }

  function removeItem(id) {
    saveItems(
      loadItems().filter(function (it) {
        return it.id !== id;
      }),
    );
  }

  function bindCartUi() {
    var root = ensureCartUi();
    if (root._gcvCartBound) return;
    root._gcvCartBound = true;

    document.addEventListener("click", function (e) {
      if (
        e.target.closest("#gcv-exc-cart-fab") ||
        e.target.closest("#gcv-exc-cart-float-header") ||
        e.target.closest("#gcv-exc-cart-float-dock")
      ) {
        e.preventDefault();
        openCartPanel();
        return;
      }
    });

    root.addEventListener("keydown", function (e) {
      var field = e.target.closest("[data-gcv-cart-cupom-code]");
      if (!field || e.key !== "Enter") return;
      e.preventDefault();
      var apply = root.querySelector("[data-gcv-cart-cupom-apply]");
      if (apply) apply.click();
    });

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-gcv-cart-close]")) {
        closeCartPanel();
        return;
      }
      var cupomBtn = e.target.closest("[data-gcv-cart-cupom-apply]");
      if (cupomBtn) {
        e.preventDefault();
        if (cupomBtn.getAttribute("data-gcv-cart-cupom-mode") === "remove") {
          setCupomCode("");
          _cupom = null;
          var clearInput = root.querySelector("[data-gcv-cart-cupom-code]");
          if (clearInput) clearInput.value = "";
          paintCoupon(loadItems());
          return;
        }
        var codeInput = root.querySelector("[data-gcv-cart-cupom-code]");
        var typed = String((codeInput && codeInput.value) || "").trim().toUpperCase();
        if (codeInput) codeInput.value = typed;
        setCupomCode(typed);
        _cupom = null;
        revalidateCupom(loadItems());
        return;
      }
      var policyOpen = e.target.closest("[data-gcv-cart-policy-open]");
      if (policyOpen) {
        e.preventDefault();
        openPolicyModal(policyOpen.getAttribute("data-gcv-cart-policy-open"));
        return;
      }
      var checkout = e.target.closest("[data-gcv-cart-checkout]");
      if (checkout) {
        e.preventDefault();
        e.stopPropagation();
        syncCartCheckoutState();
        if (!cartPoliciesAccepted()) {
          showCartToast(policyUi().agreeRequired, "warning");
          return;
        }
        var items = loadItems();
        if (!items.length) return;
        function continueCheckout() {
          purgeExpiredAndPersist({ notify: true, skipRender: true });
          var fresh = loadItems();
          if (!fresh.length) return;
          var gap = maxGapDays(fresh);
          var gapNote = document.querySelector("[data-gcv-cart-gap]");
          if (gap >= 1) {
            var gapSig = String(gap);
            if (_gapAck !== gapSig) {
              _gapAck = gapSig;
              if (gapNote) {
                gapNote.hidden = false;
                gapNote.textContent = gapMessage(gap);
              }
              return;
            }
          } else if (gapNote) {
            gapNote.hidden = true;
            gapNote.textContent = "";
          }
          var off = cupomOffCents(fresh);
          var total = Math.max(0, (cartGrossCents(fresh) - off) / 100);
          var detail = cartPayDetail(fresh);
          if (off > 0 && _cupom && _cupom.codigo) {
            detail.cupom = _cupom.codigo;
            detail.descontoCents = off;
            detail.lines = (detail.lines || []).concat([s("cartCouponOff") + " " + _cupom.codigo]);
          }
          var payFn = _onPay;
          closeCartPanel();
          payFn(total, detail, checkout);
        }
        if (typeof _onPay !== "function") {
          ensurePixCheckout(function (err) {
            if (err || typeof _onPay !== "function") {
              showCartToast(s("cartPixFail"), "warning");
              return;
            }
            continueCheckout();
          });
          return;
        }
        continueCheckout();
        return;
      }
      var rem = e.target.closest("[data-gcv-cart-remove]");
      if (rem) {
        removeItem(rem.getAttribute("data-cart-id"));
        return;
      }
      var minBtn = e.target.closest("[data-gcv-cart-qty-min]");
      if (minBtn) {
        var idM = minBtn.getAttribute("data-cart-id");
        var itM = loadItems().find(function (x) {
          return x.id === idM;
        });
        if (itM) updateItemQty(idM, (itM.faixa ? (parseInt(String(itM.pessoas), 10) || 1) : (parseInt(String(itM.qty), 10) || 1)) - 1);
        return;
      }
      var plusBtn = e.target.closest("[data-gcv-cart-qty-plus]");
      if (plusBtn) {
        var idP = plusBtn.getAttribute("data-cart-id");
        var itP = loadItems().find(function (x) {
          return x.id === idP;
        });
        if (itP) updateItemQty(idP, (itP.faixa ? (parseInt(String(itP.pessoas), 10) || 1) : (parseInt(String(itP.qty), 10) || 1)) + 1);
      }
    });

    document.addEventListener("change", function (e) {
      if (e.target && e.target.matches("[data-gcv-cart-agree]")) {
        syncCartCheckoutState();
      }
    });

    document.addEventListener("input", function (e) {
      if (e.target && e.target.matches("[data-gcv-cart-agree]")) {
        syncCartCheckoutState();
      }
    });

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-gcv-cart-policy-close]")) {
        e.preventDefault();
        closePolicyModal();
        return;
      }
    });

    document.addEventListener("keydown", function (e) {
      var policyModal = document.getElementById("gcv-exc-cart-policy-modal");
      if (e.key === "Escape" && policyModal && policyModal.classList.contains("is-open")) {
        closePolicyModal();
        return;
      }
      var panel = document.getElementById("gcv-exc-cart-panel");
      if (e.key === "Escape" && panel && panel.classList.contains("is-open")) {
        closeCartPanel();
      }
    });
  }

  var _sameDayAlertAt = 0;

  function showSameDayToast() {
    var msg = s("cartSameDayBlocked");
    if (!msg) return;
    var now = Date.now();
    if (now - _sameDayAlertAt < 800) return;
    _sameDayAlertAt = now;
    if (global.document && global.document.body) {
      showExcToastPopup(msg, { variant: "warning", duration: 7000 });
      return;
    }
    global.alert(msg);
  }

  /** Nunca deixa 2 itens com a mesma data: mantém o primeiro (pela ordem de saída). */
  function dropSameDayDuplicates(items) {
    var seen = {};
    return (items || []).filter(function (it) {
      var iso = itemDateIso(it);
      if (!iso) return true;
      if (seen[iso]) return false;
      seen[iso] = true;
      return true;
    });
  }

  function showCartToast(msg, variant) {
    if (window.GcvExcToast && typeof window.GcvExcToast.show === "function") {
      window.GcvExcToast.show(msg, { variant: variant || "success" });
    }
  }

  var _toastAutoHideTimer = null;
  var _toastFadeTimer = null;

  function hideExcToastPopup() {
    var root = document.getElementById("gcv-exc-toast");
    if (!root) return;
    root.classList.remove("is-visible");
    global.clearTimeout(_toastAutoHideTimer);
    _toastAutoHideTimer = null;
    global.clearTimeout(_toastFadeTimer);
    _toastFadeTimer = global.setTimeout(function () {
      root.hidden = true;
    }, 220);
  }

  function ensureExcToastRoot() {
    var root = document.getElementById("gcv-exc-toast");
    if (root) return root;
    root = document.createElement("div");
    root.id = "gcv-exc-toast";
    root.className = "gcv-exc-toast";
    root.hidden = true;
    root.innerHTML =
      '<div class="gcv-exc-toast__backdrop" data-gcv-toast-dismiss tabindex="-1" aria-hidden="true"></div>' +
      '<div class="gcv-exc-toast__panel" role="alertdialog" aria-modal="true" aria-labelledby="gcv-exc-toast-msg">' +
      '<div class="gcv-exc-toast__icon-wrap" aria-hidden="true">' +
      '<i class="gcv-exc-toast__icon ti ti-circle-check"></i>' +
      "</div>" +
      '<p class="gcv-exc-toast__msg" id="gcv-exc-toast-msg"></p>' +
      '<button type="button" class="gcv-exc-toast__btn" data-gcv-toast-dismiss></button>' +
      "</div>";
    document.body.appendChild(root);
    root.querySelectorAll("[data-gcv-toast-dismiss]").forEach(function (node) {
      node.addEventListener("click", hideExcToastPopup);
    });
    return root;
  }

  function showExcToastPopup(msg, opts) {
    if (!msg) return;
    opts = opts || {};
    var variant = opts.variant === "warning" || opts.variant === "info" ? opts.variant : "success";
    var root = ensureExcToastRoot();
    var iconWrap = root.querySelector(".gcv-exc-toast__icon-wrap");
    var icon = root.querySelector(".gcv-exc-toast__icon");
    var msgEl = root.querySelector(".gcv-exc-toast__msg");
    var btn = root.querySelector(".gcv-exc-toast__btn");
    var iconName = variant === "warning" ? "alert-circle" : variant === "info" ? "info-circle" : "circle-check";
    root.className = "gcv-exc-toast gcv-exc-toast--" + variant;
    if (icon) icon.className = "gcv-exc-toast__icon ti ti-" + iconName;
    if (iconWrap) iconWrap.className = "gcv-exc-toast__icon-wrap gcv-exc-toast__icon-wrap--" + variant;
    if (msgEl) msgEl.textContent = msg;
    if (btn) btn.textContent = s("toastOk") || "Entendi";
    root.hidden = false;
    global.clearTimeout(_toastAutoHideTimer);
    global.clearTimeout(_toastFadeTimer);
    global.requestAnimationFrame(function () {
      root.classList.add("is-visible");
    });
    _toastAutoHideTimer = global.setTimeout(hideExcToastPopup, opts.duration != null ? opts.duration : 4500);
  }

  global.GcvExcToast = {
    show: showExcToastPopup,
    hide: hideExcToastPopup,
  };

  function autoInitCart() {
    if (_autoInited) return;
    _autoInited = true;
    bootstrapCartHeaderShell();
    if (!_strings || !Object.keys(_strings).length) {
      _strings = FALLBACK_STRINGS;
    }
    _locale = detectPageLocale();
    bindCartUi();
    purgeExpiredAndPersist({ notify: false });
    renderCartUi();
    if (consumeOpenCartFlag()) {
      openCartPanel();
    }
    // Reaplica UI após layout (páginas de atrativo / header mobile)
    global.requestAnimationFrame(function () {
      mountCartFabInHeader();
      renderCartUi();
    });
    // Mesma lógica da home: se o passeio expirar / sumir do catálogo, limpa o carrinho
    global.setInterval(function () {
      purgeExpiredAndPersist({ notify: true });
    }, 30000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        purgeExpiredAndPersist({ notify: true });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitCart);
  } else {
    autoInitCart();
  }

  global.GcvExcCart = {
    init: function (opts) {
      _strings = (opts && opts.strings) || FALLBACK_STRINGS;
      _locale = (opts && opts.locale) || detectPageLocale();
      _onPay = opts && opts.onPay;
      _onChange = opts && opts.onChange;
      _resolveDepartureMs = opts && opts.resolveDepartureMs;
      bindCartUi();
      purgeExpiredAndPersist({ notify: false });
      renderCartUi();
      if (consumeOpenCartFlag()) {
        openCartPanel();
      }
    },
    add: function (item) {
      if (!item || !item.id) return false;
      var items = loadItems();
      var exists = items.some(function (it) {
        return it && it.id === item.id;
      });
      if (!exists && hasSameDayConflict(items, item)) {
        showSameDayToast();
        return false;
      }
      var ok = addItem(item);
      return ok;
    },
    sync: syncItem,
    remove: removeItem,
    purgeExpired: function (opts) {
      return purgeExpiredAndPersist(opts);
    },
    open: openCartPanel,
    count: cartCount,
    total: cartTotal,
    items: loadItems,
    occupiedDates: cartOccupiedDates,
    itemDateIso: itemDateIso,
    warnSameDay: showSameDayToast,
    openPolicy: openPolicyModal,
  };
})(typeof window !== "undefined" ? window : globalThis);

/**
 * Carrinho de excursões (localStorage) + painel flutuante.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "gcv-excursao-cart";
  /** Mesmo corte do carrossel: reserva só com mais de 2 h até o embarque. */
  var BOOKING_CUTOFF_MS = 2 * 60 * 60 * 1000;
  var _strings = {};
  var _locale = "pt";
  var _onPay = null;
  var _onChange = null;
  var _resolveDepartureMs = null;

  function s(key) {
    var loc = _locale === "en" || _locale === "es" ? _locale : "pt";
    var pack = _strings[loc] || _strings.pt || {};
    return pack[key] || "";
  }

  function itemDepartureMs(it) {
    var stored = parseInt(String(it && it.departureMs), 10);
    if (Number.isFinite(stored)) return stored;
    if (typeof _resolveDepartureMs === "function") {
      var resolved = _resolveDepartureMs(it);
      if (Number.isFinite(resolved)) return resolved;
    }
    return NaN;
  }

  function isCartItemBookable(it, nowMs) {
    var dep = itemDepartureMs(it);
    var now = nowMs != null ? nowMs : Date.now();
    if (!Number.isFinite(dep)) return false;
    return dep > now + BOOKING_CUTOFF_MS;
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
    var purged = sortCartItems(purgeExpiredItems(items));
    if (purged.length === items.length) {
      renderCartUi();
      return 0;
    }
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(purged));
    } catch (err) {
      /* */
    }
    renderCartUi();
    if (!opts || opts.notify !== false) showExpiredCartToast();
    if (typeof _onChange === "function") {
      _onChange(purged);
    }
    return items.length - purged.length;
  }

  function cartCount(items) {
    items = items || loadItems();
    return items.reduce(function (n, it) {
      return n + (parseInt(String(it.qty), 10) || 0);
    }, 0);
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
    (items || []).forEach(function (it) {
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

  function cartItemEmbarque(it) {
    var em = String(it.embarque || "").trim();
    var hora = formatCartHora(it.hora);
    if (!em && !hora) return "";
    var label = s("cartEmbarqueLabel") || "Embarque:";
    return label + " " + [em, hora].filter(Boolean).join(" ");
  }

  function cartItemPrice(it) {
    var qty = parseInt(String(it.qty), 10) || 0;
    var unit = parseInt(String(it.valorUnit), 10) || 0;
    var seatsWord = qty === 1 ? s("cartSeatOne") || "Pessoa" : s("cartSeatsMany") || "Pessoas";
    var suffix = s("cartLineTotal") || "(total)";
    return (
      String(qty) +
      " " +
      seatsWord +
      " × " +
      formatBrl(unit) +
      " = " +
      formatBrl(unit * qty) +
      " " +
      suffix
    );
  }

  /** Linhas completas para exibir no modal (sem limite de 73 caracteres). */
  function cartDisplayLines(items) {
    return items.map(function (it) {
      var parts = [cartItemTitle(it)];
      var emb = cartItemEmbarque(it);
      if (emb) parts.push(emb);
      parts.push(cartItemPrice(it));
      return parts.join("\n");
    });
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
          hora: it.hora || "",
          qty: parseInt(String(it.qty), 10) || 1,
          cartId: it.id || "",
          valorUnit: parseInt(String(it.valorUnit), 10) || 0,
        };
      }),
      packages: items.map(function (it) {
        return {
          title: cartItemTitle(it),
          dateLabel: it.dateLabel || "",
          destino: it.destino || shortDestLabel(it),
          embarque: it.embarque || "",
          hora: it.hora || "",
          qty: parseInt(String(it.qty), 10) || 1,
          cartId: it.id || "",
          valorUnit: parseInt(String(it.valorUnit), 10) || 0,
          inclExcl: it.inclExcl || null,
        };
      }),
    };
  }

  function ensureCartUi() {
    var root = document.getElementById("gcv-exc-cart-root");
    if (root) {
      if (!document.getElementById("gcv-exc-cart-float")) {
        var floatBtn = document.createElement("button");
        floatBtn.type = "button";
        floatBtn.className = "gcv-exc-cart-float";
        floatBtn.id = "gcv-exc-cart-float";
        floatBtn.hidden = true;
        floatBtn.setAttribute("aria-label", "");
        floatBtn.innerHTML =
          '<i class="ti ti-shopping-cart" aria-hidden="true"></i>' +
          '<span class="gcv-exc-cart-float__badge" id="gcv-exc-cart-float-badge" hidden>0</span>';
        var panel = root.querySelector("#gcv-exc-cart-panel");
        if (panel) root.insertBefore(floatBtn, panel);
        else root.appendChild(floatBtn);
      }
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
      '<i class="ti ti-shopping-cart" aria-hidden="true"></i>' +
      '<span class="gcv-exc-cart-fab__label"></span>' +
      '<span class="gcv-exc-cart-fab__total" id="gcv-exc-cart-fab-total" hidden></span>' +
      '<span class="gcv-exc-cart-fab__badge" id="gcv-exc-cart-badge" hidden>0</span>' +
      "</button>" +
      '<button type="button" class="gcv-exc-cart-float" id="gcv-exc-cart-float" hidden aria-label="">' +
      '<i class="ti ti-shopping-cart" aria-hidden="true"></i>' +
      '<span class="gcv-exc-cart-float__badge" id="gcv-exc-cart-float-badge" hidden>0</span>' +
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
      '<p class="gcv-exc-cart-panel__total"><span data-gcv-cart-total-label></span> <strong data-gcv-cart-total-val></strong></p>' +
      '<button type="button" class="gcv-exc-cart-panel__checkout" data-gcv-cart-checkout></button>' +
      '<button type="button" class="gcv-exc-cart-panel__back" data-gcv-cart-close></button>' +
      "</div></div></div>";
    document.body.appendChild(root);
    mountCartFabInHeader();
    return root;
  }

  var _cartMountMq = null;

  function ensureHeaderActions(header) {
    var actions = header.querySelector(".header-actions");
    if (actions) return actions;
    actions = document.createElement("div");
    actions.className = "header-actions";
    header.appendChild(actions);
    return actions;
  }

  function mountCartFabInHeader() {
    var fab = document.getElementById("gcv-exc-cart-fab");
    var header = document.querySelector(".site-header .header-inner");
    if (!fab || !header) return;

    function place() {
      var nav = header.querySelector(".nav-main");
      var toggle = header.querySelector(".nav-toggle");
      var mobile = window.matchMedia("(max-width: 860px)").matches;

      if (mobile) {
        var actions = ensureHeaderActions(header);
        if (toggle && toggle.parentElement !== actions) actions.appendChild(toggle);
        if (fab.parentElement !== actions) actions.insertBefore(fab, toggle || null);
      } else if (nav) {
        var lang = nav.querySelector(".lang-switch");
        if (fab.parentElement !== nav) {
          if (lang) nav.insertBefore(fab, lang);
          else nav.appendChild(fab);
        }
      }
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
      fab.setAttribute(
        "aria-label",
        count > 0 ? s("cartFabAria") + " (" + count + ")" : s("cartFabAria"),
      );
      fab.hidden = count <= 0;
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
    var floatBtn = document.getElementById("gcv-exc-cart-float");
    var floatBadge = document.getElementById("gcv-exc-cart-float-badge");
    if (floatBtn) {
      floatBtn.setAttribute(
        "aria-label",
        count > 0 ? s("cartFabAria") + " (" + count + ")" : s("cartFabAria"),
      );
      floatBtn.hidden = count <= 0;
    }
    if (floatBadge) {
      floatBadge.textContent = String(count);
      floatBadge.hidden = count <= 0;
    }
    document.documentElement.classList.toggle("gcv-exc-cart-has-items", count > 0);
    if (title) title.textContent = s("cartTitle");

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
        var title = cartItemTitle(it);
        var embarque = cartItemEmbarque(it);
        var priceLine = cartItemPrice(it);
        return (
          '<article class="gcv-exc-cart-item" data-cart-id="' +
          id +
          '">' +
          '<div class="gcv-exc-cart-item__info">' +
          '<p class="gcv-exc-cart-item__title">' +
          escapeHtml(title) +
          "</p>" +
          (embarque
            ? '<p class="gcv-exc-cart-item__embarque">' + escapeHtml(embarque) + "</p>"
            : "") +
          '<p class="gcv-exc-cart-item__meta">' +
          escapeHtml(priceLine) +
          "</p></div>" +
          '<div class="gcv-exc-cart-item__actions">' +
          '<div class="gcv-excursoes-card__qty gcv-excursoes-card__qty--sm">' +
          '<button type="button" class="gcv-excursoes-card__qty-btn" data-gcv-cart-qty-min data-cart-id="' +
          id +
          '" aria-label="' +
          escapeHtml(s("bookQtyMinus")) +
          '">−</button>' +
          '<span class="gcv-excursoes-card__qty-val">' +
          escapeHtml(String(it.qty)) +
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
      if (totalLabel) totalLabel.textContent = s("bookTotal");
      if (totalVal) totalVal.textContent = formatBrl(cartTotal(items));
      if (checkoutBtn) checkoutBtn.textContent = s("cartCheckout");
      if (backBtn) backBtn.textContent = s("cartBack");
    }
  }

  function addItem(item) {
    if (!item || !item.id) return false;
    if (!isCartItemBookable(item)) return false;
    var items = loadItems();
    var max = parseInt(String(item.maxQty), 10) || 10;
    var qty = Math.max(1, Math.min(max, parseInt(String(item.qty), 10) || 1));
    var dateIso = itemDateIso(item);

    var existing = items.find(function (it) {
      return it.id === item.id;
    });
    if (!existing && hasSameDayConflict(items, item)) {
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
      if (item.departureMs) existing.departureMs = item.departureMs;
    } else {
      items.push({
        id: item.id,
        destino: item.destino,
        dateLabel: item.dateLabel,
        dateIso: dateIso || item.dateIso || "",
        valorUnit: item.valorUnit,
        qty: qty,
        pixDesc: item.pixDesc,
        maxQty: max,
        inclExcl: item.inclExcl || null,
        embarque: item.embarque || "",
        hora: item.hora || "",
        departureMs: item.departureMs || null,
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
    it.qty = qty;
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
      if (e.target.closest("#gcv-exc-cart-fab") || e.target.closest("#gcv-exc-cart-float")) {
        e.preventDefault();
        openCartPanel();
        return;
      }
    });

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-gcv-cart-close]")) {
        closeCartPanel();
        return;
      }
      var checkout = e.target.closest("[data-gcv-cart-checkout]");
      if (checkout) {
        e.preventDefault();
        purgeExpiredAndPersist({ notify: true });
        var items = loadItems();
        if (!items.length || typeof _onPay !== "function") return;
        var total = cartTotal(items);
        var detail = cartPayDetail(items);
        closeCartPanel();
        _onPay(total, detail, checkout);
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
        if (itM) updateItemQty(idM, (parseInt(String(itM.qty), 10) || 1) - 1);
        return;
      }
      var plusBtn = e.target.closest("[data-gcv-cart-qty-plus]");
      if (plusBtn) {
        var idP = plusBtn.getAttribute("data-cart-id");
        var itP = loadItems().find(function (x) {
          return x.id === idP;
        });
        if (itP) updateItemQty(idP, (parseInt(String(itP.qty), 10) || 1) + 1);
      }
    });

    document.addEventListener("keydown", function (e) {
      var panel = document.getElementById("gcv-exc-cart-panel");
      if (e.key === "Escape" && panel && panel.classList.contains("is-open")) {
        closeCartPanel();
      }
    });
  }

  function showSameDayToast() {
    var msg = s("cartSameDayBlocked");
    if (!msg) return;
    showCartToast(msg, "warning");
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

  global.GcvExcCart = {
    init: function (opts) {
      _strings = (opts && opts.strings) || {};
      _locale = (opts && opts.locale) || "pt";
      _onPay = opts && opts.onPay;
      _onChange = opts && opts.onChange;
      _resolveDepartureMs = opts && opts.resolveDepartureMs;
      bindCartUi();
      purgeExpiredAndPersist({ notify: false });
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
  };
})(typeof window !== "undefined" ? window : globalThis);

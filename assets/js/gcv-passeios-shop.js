(function () {
  var root = document.getElementById("gcv-shop");
  if (!root) return;
  var lang = (document.documentElement.lang || "pt").slice(0, 2);
  var labels = {
    classicos: { pt: "Clássicos", en: "Classics", es: "Clásicos" },
    destaque: { pt: "Destaque", en: "Featured", es: "Destacados" },
    "lado-b": { pt: "Lado B", en: "Side B", es: "Lado B" },
    familia: { pt: "Família", en: "Family", es: "Familia" },
    aventura: { pt: "Aventura", en: "Adventure", es: "Aventura" },
  };
  var copy = {
    pt: {
      kicker: "Chapada dos Veadeiros",
      title: "Passeios de um dia",
      day: "Data do passeio",
      dayHint: "Só um passeio por dia. A data, as pessoas, a cidade e o transporte ficam na janela que abre ao adicionar.",
      all: "Todos",
      from: "A partir de",
      person: "por pessoa",
      add: "Adicionar",
      added: "Adicionado",
      taken: "Esse dia já tem passeio",
      empty: "Nenhum passeio nessa categoria.",
      closed: "Nenhum passeio disponível.",
      fail: "Não foi possível carregar os passeios.",
      one: "1 atração",
      many: "atrações",
      open: "Ver atração",
      pick: "Escolha a atração para maiores informações",
      close: "Fechar",
      leave: "{city}",
    },
    en: {
      kicker: "Chapada dos Veadeiros",
      title: "One-day tours",
      day: "Tour date",
      dayHint: "One tour per day. Date, people, city and transfer are in the window that opens when you add.",
      all: "All",
      from: "From",
      person: "per person",
      add: "Add",
      added: "Added",
      taken: "That day already has a tour",
      empty: "No tours in this category.",
      closed: "No tours available.",
      fail: "Could not load the tours.",
      one: "1 place",
      many: "places",
      open: "See place",
      pick: "Choose a place for more details",
      close: "Close",
      leave: "{city}",
    },
    es: {
      kicker: "Chapada dos Veadeiros",
      title: "Paseos de un día",
      day: "Fecha del paseo",
      dayHint: "Un solo paseo por día. La fecha, las personas, la ciudad y el transporte quedan en la ventana que se abre al agregar.",
      all: "Todos",
      from: "Desde",
      person: "por persona",
      add: "Agregar",
      added: "Añadido",
      taken: "Ese día ya tiene un paseo",
      empty: "No hay paseos en esta categoría.",
      closed: "No hay paseos disponibles.",
      fail: "No se pudieron cargar los paseos.",
      one: "1 atractivo",
      many: "atractivos",
      open: "Ver atractivo",
      pick: "Elige el atractivo para más información",
      close: "Cerrar",
      leave: "{city}",
    },
  }[lang] || {};

  function esc(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function reais(cents) {
    return "R$ " + String(Math.round((parseInt(cents, 10) || 0) / 100));
  }

  function precoVitrine(tarifa) {
    var cents = parseInt(tarifa && tarifa.excursao_pessoa_cents, 10) || 0;
    if (lang !== "en" && lang !== "es") return cents;
    var tipo = tarifa && tarifa.bilingue_tipo;
    var valor = tarifa && tarifa.bilingue_valor;
    if (tipo === "percentual") {
      var pct = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
      return cents + Math.round((cents * pct) / 100);
    }
    var extra = valor;
    if (extra == null || extra === "") extra = tarifa && tarifa.bilingue_cents;
    if (extra == null || extra === "") extra = 4000;
    var quorum = Math.max(1, parseInt(tarifa && tarifa.quorum, 10) || 4);
    return cents + Math.round((parseInt(extra, 10) || 0) / quorum);
  }
  function catName(key) {
    var row = labels[key];
    return row ? row[lang] || row.pt : key;
  }
  var cityNames = {
    "alto-paraiso": "Alto Paraíso",
    "sao-jorge": "São Jorge",
    cavalcante: "Cavalcante",
  };
  function horas(minutos) {
    minutos = parseInt(minutos, 10) || 0;
    if (!minutos) return "";
    var h = Math.floor(minutos / 60);
    var m = minutos % 60;
    var mark = lang === "en" ? "h" : lang === "es" ? " h" : "hs";
    if (!h) return m + " min";
    if (!m) return h + mark;
    return h + "h" + (m < 10 ? "0" : "") + m;
  }
  function showcase(tour) {
    if (tour._show) return tour._show;
    var cidades = (tour.tarifa && tour.tarifa.cidades) || {};
    var keys = Object.keys(cidades).filter(function (key) {
      var row = cidades[key] || {};
      return ["excursao_pessoa_cents", "excursao_transporte_cents", "exclusivo_pessoa_cents", "exclusivo_transporte_cents"].some(function (campo) {
        return (parseInt(row[campo], 10) || 0) > 0;
      });
    });
    if (!keys.length) keys = Object.keys(tour.duracao_cidades || {});
    var key = keys.length ? keys[Math.floor(Math.random() * keys.length)] : "alto-paraiso";
    var minutes = (tour.duracao_cidades && parseInt(tour.duracao_cidades[key], 10)) || parseInt(tour.duration_minutes, 10) || 0;
    tour._show = { key: key, minutes: minutes, city: cityNames[key] || key };
    return tour._show;
  }
  var clock = '<svg class="gcv-shop-card__ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.6V8.2l2.3 1.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var pin = '<svg class="gcv-shop-card__ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5S3.4 9.7 3.4 6.7a4.6 4.6 0 1 1 9.2 0c0 3-4.6 7.8-4.6 7.8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="6.65" r="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  var check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z"/></svg>';
  var filter = "all";
  var tours = [];

  function productKey(tour) {
    if (!tour) return "";
    if (tour.kind === "combo") {
      return "combo:" + (tour.attraction_ids || []).slice().sort(function (a, b) { return a - b; }).join(",");
    }
    return "atrativo:" + (tour.slug || "") + ":";
  }
  function cartMatches(tour) {
    var key = productKey(tour);
    var cart = window.GcvExcCart;
    if (!key || !cart || typeof cart.items !== "function") return [];
    return cart.items().filter(function (it) {
      if (!it || !it.passeioKey) return false;
      if (tour.kind === "combo") return it.passeioKey === key;
      return String(it.passeioKey).indexOf("atrativo:" + (tour.slug || "") + ":") === 0;
    });
  }
  function inCart(tour) {
    return cartMatches(tour).length > 0;
  }
  function tourHref(href) {
    var path = String(href || "").trim();
    if (!path) return "passeios.html";
    if (path.charAt(0) !== "/") path = "/" + path.replace(/^\/+/, "");
    if (lang !== "pt" && path.indexOf("/" + lang + "/") !== 0) path = "/" + lang + path;
    return path;
  }
  function partsOf(tour) {
    return (tour.parts || []).filter(function (part) {
      return part && part.href && (part.title || part.image);
    }).slice(0, 3);
  }
  function pickHref(part, parts) {
    var href = tourHref(part.href);
    var others = parts.filter(function (item) {
      return item && item !== part && item.id;
    }).map(function (item) { return String(item.id); });
    if (!others.length) return href;
    return href + (href.indexOf("?") >= 0 ? "&" : "?") + "junto=" + encodeURIComponent(others.join(","));
  }

  function openPick(parts) {
    var box = document.getElementById("gcv-pick");
    if (!box) {
      box = document.createElement("div");
      box.id = "gcv-pick";
      box.className = "gcv-pick";
      box.hidden = true;
      box.innerHTML =
        '<div class="gcv-pick__sheet" role="dialog" aria-modal="true" aria-labelledby="gcv-pick-title">' +
        '<button type="button" class="gcv-pick__close" data-pick-close>' + esc(copy.close) + "</button>" +
        '<h2 id="gcv-pick-title"></h2>' +
        '<div class="gcv-pick__grid"></div></div>';
      document.body.appendChild(box);
      box.addEventListener("click", function (ev) {
        if (ev.target === box || (ev.target.closest && ev.target.closest("[data-pick-close]"))) box.hidden = true;
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") box.hidden = true;
      });
    }
    box.querySelector("#gcv-pick-title").textContent = copy.pick;
    var gridBox = box.querySelector(".gcv-pick__grid");
    gridBox.className = "gcv-pick__grid gcv-pick__grid--" + parts.length;
    gridBox.innerHTML = parts.map(function (part) {
      return '<a class="gcv-pick__item" href="' + esc(pickHref(part, parts)) + '">' +
        '<span class="gcv-pick__photo"><img src="' + esc(part.image) + '" alt="" /></span>' +
        "<span>" + esc(part.title) + "</span></a>";
    }).join("");
    box.hidden = false;
  }

  function paint() {
    var list = tours.filter(function (tour) {
      if (filter === "all") return true;
      return (tour.categories || []).indexOf(filter) >= 0;
    });
    var grid = root.querySelector("[data-shop-grid]");
    if (!list.length) {
      grid.innerHTML = '<p class="gcv-shop__empty">' + esc(copy.empty) + "</p>";
      return;
    }
    grid.innerHTML = list.map(function (tour) {
      var mine = inCart(tour);
      var show = showcase(tour);
      var time = horas(show.minutes);
      var cents = precoVitrine(tour.tarifa);
      var tags = (tour.categories || []).map(function (key) { return "<span>" + esc(catName(key)) + "</span>"; }).join("");
      var count = tour.count === 1 ? copy.one : tour.count + " " + copy.many;
      var parts = partsOf(tour);
      var photo = parts.length >= 2
        ? '<span class="gcv-shop-card__mosaic gcv-shop-card__mosaic--' + parts.length + '">' +
          parts.map(function (part) {
            return '<img src="' + esc(part.image) + '" alt="' + esc(part.title) + '" />';
          }).join("") + "</span>"
        : (tour.image ? '<img src="' + esc(tour.image) + '" alt="" />' : "");
      return '<article class="gcv-shop-card' + (mine ? " is-in-cart" : "") + '">' +
        (mine ? '<span class="gcv-shop-card__badge">' + check + "</span>" : "") +
        '<a class="gcv-shop-card__media" href="' + esc(tourHref(tour.href)) + '" data-tour="' + esc(tour.id) + '">' + photo +
        '<p class="gcv-shop-card__count">' + esc(count) + "</p></a>" +
        '<div class="gcv-shop-card__body">' +
        '<p class="gcv-shop-card__tags">' + tags + "</p>" +
        "<h2><a href=\"" + esc(tourHref(tour.href)) + "\" data-tour=\"" + esc(tour.id) + "\">" + esc(tour.title) + "</a></h2>" +
        '<p class="gcv-shop-card__places">' + esc((tour.attractions || []).join(" · ")) + "</p>" +
        '<p class="gcv-shop-card__meta">' +
        (time ? "<span>" + clock + esc(time) + "</span>" : "") +
        "<span>" + pin + esc(copy.leave.replace("{city}", show.city)) + "</span></p>" +
        '<div class="gcv-shop-card__foot">' +
        '<p class="gcv-shop-card__price">' + esc(copy.from) + "<strong>" + reais(cents) + "</strong>" + esc(copy.person) + "</p>" +
        '<button type="button" class="gcv-shop-card__add' + (mine ? " is-added" : "") + '" data-add="' + esc(tour.id) + '">' +
        (mine ? '<svg class="gcv-shop-card__check" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z"/></svg> ' : "") +
        esc(mine ? copy.added : copy.add) + "</button>" +
        "</div></div></article>";
    }).join("");
  }

  function shell(cats) {
    var buttons = '<button type="button" class="is-on" data-shop-filter="all">' + esc(copy.all) + "</button>" +
      cats.map(function (key) {
        return '<button type="button" data-shop-filter="' + esc(key) + '">' + esc(catName(key)) + "</button>";
      }).join("");
    root.innerHTML =
      '<div class="gcv-shop__hero">' +
      "<div><p class=\"gcv-shop__kicker\">" + esc(copy.kicker) + "</p><h1>" + esc(copy.title) + "</h1></div>" +
      "</div>" +
      '<div class="gcv-shop__filters">' + buttons + "</div>" +
      '<div class="gcv-shop__grid" data-shop-grid></div>';
    root.querySelectorAll("[data-shop-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filter = btn.getAttribute("data-shop-filter") || "all";
        root.querySelectorAll("[data-shop-filter]").forEach(function (el) {
          el.classList.toggle("is-on", el === btn);
        });
        paint();
      });
    });
    root.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest("[data-tour]");
      if (link && !(e.target.closest && e.target.closest("[data-add]"))) {
        var linked = tours.filter(function (t) { return t.id === link.getAttribute("data-tour"); })[0];
        var parts = linked ? partsOf(linked) : [];
        if (parts.length > 1) {
          e.preventDefault();
          openPick(parts);
          return;
        }
      }
      var btn = e.target.closest && e.target.closest("[data-add]");
      if (!btn || btn.disabled) return;
      var tour = tours.filter(function (t) { return t.id === btn.getAttribute("data-add"); })[0];
      if (!tour) return;
      if (inCart(tour)) {
        var cart = window.GcvExcCart;
        if (cart && typeof cart.remove === "function") {
          cartMatches(tour).forEach(function (it) { cart.remove(it.id); });
        }
        paint();
        return;
      }
      if (!window.GcvPasseioDialog) return;
      function openWith(data) {
        window.GcvPasseioDialog.open(data, paint);
      }
      if (tour.kind === "combo") {
        openWith({
          slug: tour.slug,
          title: tour.title,
          duration_minutes: tour.duration_minutes,
          duracao_cidades: tour.duracao_cidades,
          tarifa: tour.tarifa,
          max_atrativos: 1,
          related_tours: [],
          passeioKey: productKey(tour),
        });
        return;
      }
      fetch("/api/passeios.php?slug=" + encodeURIComponent(tour.slug || ""), { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } })
        .then(function (res) { return res.json(); })
        .then(function (payload) {
          if (payload && payload.ok && payload.data) openWith(payload.data);
        })
        .catch(function () {});
    });
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-gcv-cart-remove]")) setTimeout(paint, 0);
    });
  }

  fetch("/api/passeios.php", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } })
    .then(function (res) { return res.json(); })
    .then(function (payload) {
      var data = (payload && payload.data) || {};
      tours = data.tours || [];
      var cats = Object.keys(data.categories || labels);
      shell(cats);
      if (!tours.length) {
        root.querySelector("[data-shop-grid]").innerHTML = '<p class="gcv-shop__empty">' + esc(payload && payload.ok ? (copy.closed || copy.empty) : copy.fail) + "</p>";
        return;
      }
      paint();
    })
    .catch(function () {
      shell(Object.keys(labels));
      root.querySelector("[data-shop-grid]").innerHTML = '<p class="gcv-shop__empty">' + esc(copy.fail) + "</p>";
    });
})();

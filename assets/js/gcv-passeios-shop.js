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
      fail: "Não foi possível carregar os passeios.",
      one: "1 atração",
      many: "atrações",
      open: "Ver atração",
      leave: "De {city}",
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
      fail: "Could not load the tours.",
      one: "1 place",
      many: "places",
      open: "See place",
      leave: "From {city}",
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
      fail: "No se pudieron cargar los paseos.",
      one: "1 atractivo",
      many: "atractivos",
      open: "Ver atractivo",
      leave: "De {city}",
    },
  }[lang] || {};

  function esc(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function reais(cents) {
    return "R$ " + String(Math.round((parseInt(cents, 10) || 0) / 100));
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
      var cents = tour.tarifa && tour.tarifa.excursao_pessoa_cents;
      var tags = (tour.categories || []).map(function (key) { return "<span>" + esc(catName(key)) + "</span>"; }).join("");
      var count = tour.count === 1 ? copy.one : tour.count + " " + copy.many;
      var photo = tour.image
        ? '<img src="' + esc(tour.image) + '" alt="" />'
        : "";
      return '<article class="gcv-shop-card' + (mine ? " is-in-cart" : "") + '">' +
        (mine ? '<span class="gcv-shop-card__badge">' + check + "</span>" : "") +
        '<a class="gcv-shop-card__media" href="' + esc(tour.href) + '">' + photo +
        '<p class="gcv-shop-card__count">' + esc(count) + "</p></a>" +
        '<div class="gcv-shop-card__body">' +
        '<p class="gcv-shop-card__tags">' + tags + "</p>" +
        "<h2><a href=\"" + esc(tour.href) + "\">" + esc(tour.title) + "</a></h2>" +
        '<p class="gcv-shop-card__places">' + esc((tour.attractions || []).join(" · ")) + "</p>" +
        '<p class="gcv-shop-card__meta">' +
        (time ? "<span>" + clock + esc(time) + "</span>" : "") +
        "<span>" + esc(copy.leave.replace("{city}", show.city)) + "</span></p>" +
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
      fetch("/api/passeios.php?slug=" + encodeURIComponent(tour.slug || ""))
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

  fetch("/api/passeios.php")
    .then(function (res) { return res.json(); })
    .then(function (payload) {
      var data = (payload && payload.data) || {};
      tours = data.tours || [];
      var cats = Object.keys(data.categories || labels);
      shell(cats);
      if (!tours.length) {
        root.querySelector("[data-shop-grid]").innerHTML = '<p class="gcv-shop__empty">' + esc(copy.fail) + "</p>";
        return;
      }
      paint();
    })
    .catch(function () {
      shell(Object.keys(labels));
      root.querySelector("[data-shop-grid]").innerHTML = '<p class="gcv-shop__empty">' + esc(copy.fail) + "</p>";
    });
})();

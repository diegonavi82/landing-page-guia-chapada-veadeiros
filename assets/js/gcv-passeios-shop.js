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
      lead: "Cada passeio é um produto: de uma a três atrações, no mesmo dia. Escolha a data e leve só um para o carrinho.",
      day: "Data do passeio",
      dayHint: "Só um passeio por dia. Excursão saindo de Alto Paraíso, sem translado. Na página da atração você ajusta pessoas, cidade e carro.",
      all: "Todos",
      from: "A partir de",
      person: "por pessoa",
      add: "Adicionar",
      added: "No carrinho",
      taken: "Esse dia já tem passeio",
      empty: "Nenhum passeio nessa categoria.",
      fail: "Não foi possível carregar os passeios.",
      one: "1 atração",
      many: "atrações",
      open: "Ver atração",
    },
    en: {
      kicker: "Chapada dos Veadeiros",
      title: "One-day tours",
      lead: "Each tour is a product: one to three places, the same day. Pick a date and add only one to the cart.",
      day: "Tour date",
      dayHint: "One tour per day. Shared tour leaving Alto Paraíso, without transfer. On the place page you can change people, city and car.",
      all: "All",
      from: "From",
      person: "per person",
      add: "Add",
      added: "In cart",
      taken: "That day already has a tour",
      empty: "No tours in this category.",
      fail: "Could not load the tours.",
      one: "1 place",
      many: "places",
      open: "See place",
    },
    es: {
      kicker: "Chapada dos Veadeiros",
      title: "Paseos de un día",
      lead: "Cada paseo es un producto: de uno a tres atractivos, el mismo día. Elige la fecha y lleva solo uno al carrito.",
      day: "Fecha del paseo",
      dayHint: "Un solo paseo por día. Excursión saliendo de Alto Paraíso, sin traslado. En la página del atractivo ajustas personas, ciudad y auto.",
      all: "Todos",
      from: "Desde",
      person: "por persona",
      add: "Agregar",
      added: "En el carrito",
      taken: "Ese día ya tiene un paseo",
      empty: "No hay paseos en esta categoría.",
      fail: "No se pudieron cargar los paseos.",
      one: "1 atractivo",
      many: "atractivos",
      open: "Ver atractivo",
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
  function tomorrow() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  var filter = "all";
  var tours = [];
  var date = tomorrow();

  function itemId(tour) {
    var ids = (tour.attraction_ids || []).slice();
    if (tour.kind !== "combo") ids = [];
    return "roteiro-" + (tour.slug || "passeio") + "-" + ids.join("-") + "-" + date + "-excursao-s";
  }
  function inCart(id) {
    var cart = window.GcvExcCart;
    return !!(cart && typeof cart.items === "function" && cart.items().some(function (it) { return it && it.id === id; }));
  }
  function dayTaken(id) {
    var cart = window.GcvExcCart;
    if (!cart || typeof cart.occupiedDates !== "function") return false;
    var owner = cart.occupiedDates()[date];
    return !!(owner && owner !== id);
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
      var id = itemId(tour);
      var mine = inCart(id);
      var blocked = dayTaken(id);
      var cents = tour.tarifa && tour.tarifa.excursao_pessoa_cents;
      var tags = (tour.categories || []).map(function (key) { return "<span>" + esc(catName(key)) + "</span>"; }).join("");
      var count = tour.count === 1 ? copy.one : tour.count + " " + copy.many;
      var photo = tour.image
        ? '<img src="' + esc(tour.image) + '" alt="" />'
        : "";
      return '<article class="gcv-shop-card">' +
        '<a class="gcv-shop-card__media" href="' + esc(tour.href) + '">' + photo +
        '<p class="gcv-shop-card__count">' + esc(count) + "</p></a>" +
        '<div class="gcv-shop-card__body">' +
        '<p class="gcv-shop-card__tags">' + tags + "</p>" +
        "<h2><a href=\"" + esc(tour.href) + "\">" + esc(tour.title) + "</a></h2>" +
        '<p class="gcv-shop-card__places">' + esc((tour.attractions || []).join(" · ")) + "</p>" +
        '<div class="gcv-shop-card__foot">' +
        '<p class="gcv-shop-card__price">' + esc(copy.from) + "<strong>" + reais(cents) + "</strong>" + esc(copy.person) + "</p>" +
        '<button type="button" class="gcv-shop-card__add' + (mine ? " is-added" : "") + '" data-add="' + esc(tour.id) + '"' + (blocked && !mine ? " disabled" : "") + ">" +
        esc(mine ? copy.added : blocked ? copy.taken : copy.add) + "</button>" +
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
      "<div><p class=\"gcv-shop__kicker\">" + esc(copy.kicker) + "</p><h1>" + esc(copy.title) + "</h1><p class=\"gcv-shop__lead\">" + esc(copy.lead) + "</p></div>" +
      '<div class="gcv-shop__day"><label for="gcv-shop-date">' + esc(copy.day) + '</label><input id="gcv-shop-date" type="date" value="' + esc(date) + '" min="' + esc(tomorrow()) + '" /><p>' + esc(copy.dayHint) + "</p></div>" +
      "</div>" +
      '<div class="gcv-shop__filters">' + buttons + "</div>" +
      '<div class="gcv-shop__grid" data-shop-grid></div>';
    root.querySelector("#gcv-shop-date").addEventListener("change", function (e) {
      date = e.target.value || tomorrow();
      paint();
    });
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
      if (!tour || !window.GcvExcCart) return;
      var id = itemId(tour);
      if (inCart(id)) {
        if (typeof window.GcvExcCart.remove === "function") window.GcvExcCart.remove(id);
        paint();
        return;
      }
      if (dayTaken(id)) {
        if (typeof window.GcvExcCart.warnSameDay === "function") window.GcvExcCart.warnSameDay();
        return;
      }
      var quando = new Date(date + "T08:00:00");
      window.GcvExcCart.add({
        id: id,
        destino: tour.title,
        destinos: (tour.attractions || []).slice(),
        dateLabel: date.split("-").reverse().join("/"),
        dateIso: date,
        valorUnit: Math.round(((tour.tarifa && tour.tarifa.excursao_pessoa_cents) || 0) / 100),
        qty: 1,
        pixDesc: tour.title + " · " + copy.one,
        maxQty: 15,
        embarque: "Alto Paraíso de Goiás",
        hora: "08:00",
        departureMs: quando.getTime(),
      });
      paint();
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

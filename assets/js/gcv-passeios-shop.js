(function () {
  var root = document.getElementById("gcv-shop");
  if (!root) return;
  var lang = (document.documentElement.lang || "pt").slice(0, 2);
  var copy = {
    pt: {
      kicker: "Chapada dos Veadeiros",
      title: "Passeios",
      lead: "Escolha um roteiro com 1, 2 ou 3 atrativos. Os valores saem da tarifa do admin.",
      all: "Todos",
      one: "1 atrativo",
      two: "2 atrativos",
      three: "3 atrativos",
      from: "A partir de",
      person: "por pessoa",
      priv15: "Privativo",
      exc15: "Excursão",
      priv6: "Privativo 6+",
      exc6: "Excursão 6+",
      open: "Montar roteiro",
      empty: "Nenhum passeio nessa faixa.",
      fail: "Não foi possível carregar os passeios.",
    },
    en: {
      kicker: "Chapada dos Veadeiros",
      title: "Tours",
      lead: "Pick a route with 1, 2 or 3 places. Prices come from the admin tariff.",
      all: "All",
      one: "1 place",
      two: "2 places",
      three: "3 places",
      from: "From",
      person: "per person",
      priv15: "Private",
      exc15: "Group",
      priv6: "Private 6+",
      exc6: "Excursion 6+",
      open: "Build itinerary",
      empty: "No tours in this range.",
      fail: "Could not load the tours.",
    },
    es: {
      kicker: "Chapada dos Veadeiros",
      title: "Paseos",
      lead: "Elige un recorrido con 1, 2 o 3 atractivos. Los valores salen de la tarifa del admin.",
      all: "Todos",
      one: "1 atractivo",
      two: "2 atractivos",
      three: "3 atractivos",
      from: "Desde",
      person: "por persona",
      priv15: "Privado",
      exc15: "Excursión",
      priv6: "Privado 6+",
      exc6: "Excursión 6+",
      open: "Armar itinerario",
      empty: "No hay paseos en este grupo.",
      fail: "No se pudieron cargar los paseos.",
    },
  }[lang] || {
    kicker: "Chapada dos Veadeiros",
    title: "Passeios",
    lead: "",
    all: "Todos",
    one: "1",
    two: "2",
    three: "3",
    from: "A partir de",
    person: "por pessoa",
    priv15: "Privativo",
    exc15: "Excursão",
    priv6: "Privativo 6+",
    exc6: "Excursão 6+",
    open: "Montar roteiro",
    empty: "Nenhum passeio.",
    fail: "Erro.",
  };

  function esc(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function horas(minutos) {
    minutos = parseInt(minutos, 10) || 0;
    if (!minutos) return "";
    var h = Math.floor(minutos / 60);
    var m = minutos % 60;
    if (!h) return m + " min";
    if (!m) return h + " h";
    return h + " h " + m + " min";
  }

  function reais(cents) {
    return "R$ " + String(Math.round((parseInt(cents, 10) || 0) / 100));
  }

  function priceRow(label, cents) {
    return '<p class="gcv-shop-card__row"><span>' + esc(label) + '</span><b>' + reais(cents) + "</b></p>";
  }

  var filter = 0;
  var tours = [];

  function paint() {
    var list = tours.filter(function (tour) {
      return !filter || tour.count === filter;
    });
    var grid = root.querySelector("[data-shop-grid]");
    if (!list.length) {
      grid.innerHTML = '<p class="gcv-shop__empty">' + esc(copy.empty) + "</p>";
      return;
    }
    grid.innerHTML = list.map(function (tour) {
      var tarifa = tour.tarifa || {};
      var img = tour.image
        ? '<img src="' + esc(tour.image) + '" alt="" />'
        : '<div class="gcv-shop-card__photo gcv-shop-card__photo--empty"></div>';
      var countLabel = tour.count === 1 ? copy.one : tour.count === 2 ? copy.two : copy.three;
      return '<article class="gcv-shop-card">' +
        '<a class="gcv-shop-card__media" href="' + esc(tour.href) + '">' +
        (tour.image ? img : img) +
        "</a>" +
        '<div class="gcv-shop-card__body">' +
        '<p class="gcv-shop-card__count">' + esc(countLabel) + "</p>" +
        "<h2>" + esc(tour.title) + "</h2>" +
        '<p class="gcv-shop-card__time">' + esc(horas(tour.duration_minutes)) + "</p>" +
        '<p class="gcv-shop-card__from">' + esc(copy.from) + " <strong>" + reais(tarifa.excursao_pessoa_cents) + "</strong> " + esc(copy.person) + "</p>" +
        priceRow(copy.exc15, tarifa.excursao_pessoa_cents) +
        priceRow(copy.priv15, tarifa.exclusivo_pessoa_cents) +
        '<a class="gcv-shop-card__cta" href="' + esc(tour.href) + '">' + esc(copy.open) + "</a>" +
        "</div></article>";
    }).join("");
  }

  root.innerHTML =
    '<div class="gcv-shop__head"><p class="gcv-shop__kicker">' + esc(copy.kicker) + "</p><h1>" + esc(copy.title) + "</h1><p>" + esc(copy.lead) + "</p></div>" +
    '<div class="gcv-shop__filters">' +
    '<button type="button" class="is-on" data-shop-filter="0">' + esc(copy.all) + "</button>" +
    '<button type="button" data-shop-filter="1">' + esc(copy.one) + "</button>" +
    '<button type="button" data-shop-filter="2">' + esc(copy.two) + "</button>" +
    '<button type="button" data-shop-filter="3">' + esc(copy.three) + "</button>" +
    "</div>" +
    '<div class="gcv-shop__grid" data-shop-grid></div>';

  root.querySelectorAll("[data-shop-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      filter = parseInt(btn.getAttribute("data-shop-filter"), 10) || 0;
      root.querySelectorAll("[data-shop-filter]").forEach(function (el) {
        el.classList.toggle("is-on", el === btn);
      });
      paint();
    });
  });

  fetch("/api/passeios.php")
    .then(function (res) { return res.json(); })
    .then(function (payload) {
      tours = (payload && payload.data && payload.data.tours) || [];
      if (!tours.length) {
        root.querySelector("[data-shop-grid]").innerHTML = '<p class="gcv-shop__empty">' + esc(copy.fail) + "</p>";
        return;
      }
      paint();
    })
    .catch(function () {
      root.querySelector("[data-shop-grid]").innerHTML = '<p class="gcv-shop__empty">' + esc(copy.fail) + "</p>";
    });
})();

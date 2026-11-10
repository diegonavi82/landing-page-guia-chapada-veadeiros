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
      allCities: "Todas",
      type: "Tipo",
      cities: "Cidades de embarque",
      departures: "Saídas de:",
      from: "A partir de",
      person: "por pessoa",
      add: "Adicionar",
      added: "Adicionado",
      taken: "Esse dia já tem passeio",
      empty: "Nenhum passeio nessa categoria.",
      emptyFilters: "Nenhum passeio com esses filtros.",
      closed: "Nenhum passeio disponível.",
      loading: "Carregando passeios…",
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
      allCities: "All",
      type: "Type",
      cities: "Departure cities",
      departures: "Departing from:",
      from: "From",
      person: "per person",
      add: "Add",
      added: "Added",
      taken: "That day already has a tour",
      empty: "No tours in this category.",
      emptyFilters: "No tours match these filters.",
      closed: "No tours available.",
      loading: "Loading tours…",
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
      allCities: "Todas",
      type: "Tipo",
      cities: "Ciudades de salida",
      departures: "Salidas desde:",
      from: "Desde",
      person: "por persona",
      add: "Agregar",
      added: "Añadido",
      taken: "Ese día ya tiene un paseo",
      empty: "No hay paseos en esta categoría.",
      emptyFilters: "No hay paseos con estos filtros.",
      closed: "No hay paseos disponibles.",
      loading: "Cargando paseos…",
      fail: "No se pudieron cargar los paseos.",
      one: "1 atractivo",
      many: "atractivos",
      open: "Ver atractivo",
      pick: "Elige el atractivo para más información",
      close: "Cerrar",
      leave: "{city}",
    },
  }[lang] || {};

  function subtituloDe(tour) {
    var sub = tour && tour.subtitle;
    var texto = "";
    if (sub && typeof sub === "object") texto = sub[lang] || "";
    else texto = sub || "";
    texto = String(texto).trim();
    if (!texto || texto === String((tour && tour.title) || "").trim()) return "";
    return texto;
  }

  function esc(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var eagerLeft = 6;
  function imageTag(url, alt) {
    var raw = String(url || "");
    if (!raw) return "";
    var path = raw;
    var q = "";
    var cut = path.indexOf("?");
    if (cut >= 0) {
      q = path.slice(cut);
      path = path.slice(0, cut);
    }
    var file = path.split("/").pop() || "";
    var stem = file.replace(/\.(jpe?g|png|webp)$/i, "");
    var card = stem ? "/assets/img/card/" + stem + ".webp" + q : raw;
    var webp = /\.jpe?g$/i.test(path) ? path.replace(/\.jpe?g$/i, ".webp") + q : raw;
    var eager = eagerLeft > 0;
    if (eager) eagerLeft -= 1;
    return '<img src="' + esc(card) + '" data-full="' + esc(webp) + '" data-raw="' + esc(raw) + '" data-step="0" alt="' + esc(alt || "") + '" width="640" height="480" decoding="async"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy"') + " />";
  }
  document.addEventListener("error", function (ev) {
    var img = ev.target;
    if (!img || img.tagName !== "IMG" || !img.getAttribute("data-raw")) return;
    var step = img.getAttribute("data-step") || "0";
    var next = step === "0" ? (img.getAttribute("data-full") || "") : (step === "1" ? (img.getAttribute("data-raw") || "") : "");
    if (!next || next === img.getAttribute("src")) {
      img.setAttribute("data-step", "2");
      return;
    }
    img.setAttribute("data-step", step === "0" ? "1" : "2");
    img.src = next;
  }, true);
  function reais(cents) {
    return "R$ " + String(Math.round((parseInt(cents, 10) || 0) / 100));
  }

  function menorExcursao(tarifa) {
    var cidades = (tarifa && tarifa.cidades) || {};
    var menor = 0;
    var key = "";
    Object.keys(cidades).forEach(function (k) {
      var n = parseInt((cidades[k] || {}).excursao_pessoa_cents, 10) || 0;
      if (n > 0 && (!menor || n < menor)) {
        menor = n;
        key = k;
      }
    });
    if (!menor) menor = parseInt(tarifa && tarifa.excursao_pessoa_cents, 10) || 0;
    return { cents: menor, key: key };
  }
  function precoVitrine(tarifa) {
    var cents = menorExcursao(tarifa).cents;
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
  var pin = '<svg class="gcv-shop-card__ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5S3.4 9.7 3.4 6.7a4.6 4.6 0 1 1 9.2 0c0 3-4.6 7.8-4.6 7.8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="6.65" r="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  function cidadesDoTour(tour) {
    var vistos = {};
    var lista = [];
    (Array.isArray(tour && tour.saidas) ? tour.saidas : []).forEach(function (saida) {
      var key = String((saida && saida.key) || "");
      if (!key || vistos[key]) return;
      vistos[key] = true;
      lista.push({
        key: key,
        nome: String((saida && (saida.curta || saida.nome)) || cityNames[key] || key)
      });
    });
    if (!lista.length) {
      (Array.isArray(tour && tour.embarques) ? tour.embarques : []).forEach(function (key) {
        key = String(key || "");
        if (!key || vistos[key]) return;
        vistos[key] = true;
        lista.push({ key: key, nome: cityNames[key] || key });
      });
    }
    return lista;
  }
  function cidadesDoCatalogo(lista) {
    var mapa = {};
    var ordem = [];
    (lista || []).forEach(function (tour) {
      cidadesDoTour(tour).forEach(function (cidade) {
        if (mapa[cidade.key]) return;
        mapa[cidade.key] = cidade.nome;
        ordem.push(cidade.key);
      });
    });
    var preferida = ["alto-paraiso", "sao-jorge", "cavalcante"];
    ordem.sort(function (a, b) {
      var ia = preferida.indexOf(a);
      var ib = preferida.indexOf(b);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      if (ia !== ib) return ia - ib;
      return String(mapa[a]).localeCompare(String(mapa[b]), lang);
    });
    return ordem.map(function (key) { return { key: key, nome: mapa[key] }; });
  }
  var check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z"/></svg>';
  var filter = "all";
  var cityFilter = "all";
  var tours = [];
  var maxAtrativos = 3;

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
        '<span class="gcv-pick__photo">' + imageTag(part.image, part.title) + "</span>" +
        "<span>" + esc(part.title) + "</span></a>";
    }).join("");
    box.hidden = false;
  }

  function tagDoCard(tour) {
    var cats = (tour.categories || []).filter(function (key) { return !!labels[key]; });
    if (!cats.length) cats = ["classicos"];
    if (filter !== "all" && cats.indexOf(filter) >= 0) return filter;
    if (!tour._tag || cats.indexOf(tour._tag) < 0) {
      tour._tag = cats[Math.floor(Math.random() * cats.length)];
    }
    return tour._tag;
  }

  function paint() {
    eagerLeft = 6;
    var list = tours.filter(function (tour) {
      if (filter !== "all" && (tour.categories || []).indexOf(filter) < 0) return false;
      if (cityFilter === "all") return true;
      return cidadesDoTour(tour).some(function (cidade) { return cidade.key === cityFilter; });
    });
    var grid = root.querySelector("[data-shop-grid]");
    if (!list.length) {
      var vazio = cityFilter !== "all" ? (copy.emptyFilters || copy.empty) : copy.empty;
      grid.innerHTML = '<p class="gcv-shop__empty">' + esc(vazio) + "</p>";
      return;
    }
    grid.innerHTML = list.map(function (tour) {
      var mine = inCart(tour);
      var saidas = cidadesDoTour(tour);
      var cents = precoVitrine(tour.tarifa);
      var tags = "<span>" + esc(catName(tagDoCard(tour))) + "</span>";
      var count = tour.count === 1 ? copy.one : tour.count + " " + copy.many;
      var parts = partsOf(tour);
      var places = subtituloDe(tour);
      places = places ? '<p class="gcv-shop-card__places">' + esc(places) + "</p>" : "";
      var photo = parts.length >= 2
        ? '<span class="gcv-shop-card__mosaic gcv-shop-card__mosaic--' + parts.length + '">' +
          parts.map(function (part) {
            return imageTag(part.image, part.title);
          }).join("") + "</span>"
        : (tour.image ? imageTag(tour.image, tour.title) : "");
      return '<article class="gcv-shop-card' + (mine ? " is-in-cart" : "") + '">' +
        (mine ? '<span class="gcv-shop-card__badge">' + check + "</span>" : "") +
        '<a class="gcv-shop-card__media" href="' + esc(tourHref(tour.href)) + '" data-tour="' + esc(tour.id) + '">' + photo +
        '<p class="gcv-shop-card__count">' + esc(count) + "</p></a>" +
        '<div class="gcv-shop-card__body">' +
        '<p class="gcv-shop-card__tags">' + tags + "</p>" +
        "<h2><a href=\"" + esc(tourHref(tour.href)) + "\" data-tour=\"" + esc(tour.id) + "\">" + esc(tour.title) + "</a></h2>" +
        places +
        (saidas.length
          ? '<p class="gcv-shop-card__meta"><span class="gcv-shop-card__saidas">' + pin +
            "<span><strong>" + esc(copy.departures) + "</strong> " +
            esc(saidas.map(function (cidade) { return cidade.nome; }).join(", ")) +
            "</span></span></p>"
          : "") +
        '<div class="gcv-shop-card__foot">' +
        '<p class="gcv-shop-card__price">' + esc(copy.from) + "<strong>" + reais(cents) + "</strong>" + esc(copy.person) + "</p>" +
        '<button type="button" class="gcv-shop-card__add' + (mine ? " is-added" : "") + '" data-add="' + esc(tour.id) + '">' +
        (mine ? '<svg class="gcv-shop-card__check" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z"/></svg> ' : "") +
        esc(mine ? copy.added : copy.add) + "</button>" +
        "</div></div></article>";
    }).join("");
  }

  function marcarFiltro(seletor, valor) {
    root.querySelectorAll(seletor).forEach(function (el) {
      el.classList.toggle("is-on", el.getAttribute(seletor.slice(1, -1)) === valor);
    });
  }

  function montarFiltroCidades() {
    var box = root.querySelector("[data-shop-cities]");
    if (!box) return;
    var cidades = cidadesDoCatalogo(tours);
    if (cityFilter !== "all" && !cidades.some(function (cidade) { return cidade.key === cityFilter; })) {
      cityFilter = "all";
    }
    box.innerHTML = '<button type="button" data-shop-city="all">' + esc(copy.allCities || copy.all) + "</button>" +
      cidades.map(function (cidade) {
        return '<button type="button" data-shop-city="' + esc(cidade.key) + '">' + esc(cidade.nome) + "</button>";
      }).join("");
    marcarFiltro("[data-shop-city]", cityFilter);
  }

  function shell(cats) {
    var buttons = '<button type="button" data-shop-filter="all">' + esc(copy.all) + "</button>" +
      cats.map(function (key) {
        return '<button type="button" data-shop-filter="' + esc(key) + '">' + esc(catName(key)) + "</button>";
      }).join("");
    root.innerHTML =
      '<div class="gcv-shop__hero">' +
      "<div><p class=\"gcv-shop__kicker\">" + esc(copy.kicker) + "</p><h1>" + esc(copy.title) + "</h1></div>" +
      "</div>" +
      '<div class="gcv-shop__bars">' +
      '<div class="gcv-shop__bar"><p class="gcv-shop__bar-label">' + esc(copy.type) + "</p>" +
      '<div class="gcv-shop__filters">' + buttons + "</div></div>" +
      '<div class="gcv-shop__bar"><p class="gcv-shop__bar-label">' + esc(copy.cities) + "</p>" +
      '<div class="gcv-shop__filters" data-shop-cities></div></div>' +
      "</div>" +
      '<div class="gcv-shop__grid" data-shop-grid></div>';
    marcarFiltro("[data-shop-filter]", filter);
    montarFiltroCidades();
    root.addEventListener("click", function (ev) {
      var tipo = ev.target.closest && ev.target.closest("[data-shop-filter]");
      if (tipo && root.contains(tipo)) {
        filter = tipo.getAttribute("data-shop-filter") || "all";
        marcarFiltro("[data-shop-filter]", filter);
        paint();
        return;
      }
      var cidade = ev.target.closest && ev.target.closest("[data-shop-city]");
      if (cidade && root.contains(cidade)) {
        cityFilter = cidade.getAttribute("data-shop-city") || "all";
        marcarFiltro("[data-shop-city]", cityFilter);
        paint();
      }
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
      window.GcvPasseioDialog.open({
        slug: tour.slug,
        title: tour.title,
        duration_minutes: tour.duration_minutes,
        duracao_cidades: tour.duracao_cidades,
        tarifa: tour.tarifa,
        embarques: tour.embarques,
        saidas: tour.saidas,
        somente_4x4: !!tour.somente_4x4,
        max_participantes: tour.max_participantes,
        max_atrativos: tour.kind === "combo" ? 1 : maxAtrativos,
        related_tours: tour.kind === "combo" ? [] : (tour.related_tours || []),
        passeioKey: tour.kind === "combo" ? productKey(tour) : "",
      }, paint);
    });
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-gcv-cart-remove]")) setTimeout(paint, 0);
    });
  }

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    shell(Object.keys(labels));
  }
  boot();
  var gridNow = root.querySelector("[data-shop-grid]");
  if (gridNow) gridNow.innerHTML = '<p class="gcv-shop__empty">' + esc(copy.loading || "") + "</p>";

  if (!window.__gcvPasseiosPromise) {
    window.__gcvPasseiosPromise = fetch("/api/passeios.php", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json(); });
  }
  window.__gcvPasseiosPromise
    .then(function (payload) {
      var data = (payload && payload.data) || {};
      tours = data.tours || [];
      maxAtrativos = parseInt(data.max_atrativos, 10) || maxAtrativos;
      boot();
      var grid = root.querySelector("[data-shop-grid]");
      montarFiltroCidades();
      if (!tours.length) {
        var vazio = payload && payload.ok ? (copy.closed || copy.empty) : copy.fail;
        if (grid) grid.innerHTML = '<p class="gcv-shop__empty">' + esc(vazio) + "</p>";
        root.setAttribute("aria-busy", "false");
        return;
      }
      paint();
      root.setAttribute("aria-busy", "false");
    })
    .catch(function () {
      boot();
      var grid = root.querySelector("[data-shop-grid]");
      if (grid) grid.innerHTML = '<p class="gcv-shop__empty">' + esc(copy.fail) + "</p>";
      root.setAttribute("aria-busy", "false");
    });
})();

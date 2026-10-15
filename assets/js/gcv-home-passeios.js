(function () {
  var root = document.getElementById("gcv-home-passeios");
  if (!root) return;
  var grid = root.querySelector("[data-home-passeios-grid]");
  if (!grid) return;

  var lang = (document.documentElement.lang || "pt").slice(0, 2);
  if (lang !== "en" && lang !== "es") lang = "pt";

  function attr(name, fallback) {
    return root.getAttribute(name) || fallback;
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function subtituloDe(tour) {
    var sub = tour && tour.subtitle;
    var texto = "";
    if (sub && typeof sub === "object") texto = sub[lang] || "";
    else texto = sub || "";
    texto = String(texto).trim();
    if (!texto || texto === String((tour && tour.title) || "").trim()) return "";
    return texto;
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function hasCat(tour, key) {
    return (tour.categories || []).indexOf(key) >= 0;
  }

  var priority = ["destaque", "classicos", "familia", "lado-b"];
  var tagNames = {
    pt: { destaque: "Destaque", classicos: "Clássicos", familia: "Família", "lado-b": "Lado B" },
    en: { destaque: "Featured", classicos: "Classics", familia: "Family", "lado-b": "Side B" },
    es: { destaque: "Destacado", classicos: "Clásicos", familia: "Familia", "lado-b": "Lado B" },
  }[lang];

  function tagLabel(key) {
    var fromPage = {
      destaque: attr("data-destaque", ""),
      classicos: attr("data-classicos", ""),
      familia: attr("data-familia", ""),
      "lado-b": attr("data-lado-b", ""),
    }[key];
    return fromPage || (tagNames && tagNames[key]) || key;
  }

  function pickEight(tours) {
    var used = {};
    var picked = [];
    priority.forEach(function (key) {
      if (picked.length >= 8) return;
      shuffle(tours.filter(function (tour) {
        return !used[tour.id] && hasCat(tour, key);
      })).forEach(function (tour) {
        if (picked.length >= 8) return;
        used[tour.id] = true;
        tour._homeCat = key;
        picked.push(tour);
      });
    });
    return picked;
  }

  var copy = {
    pt: { add: "Adicionar", added: "Adicionado", pick: "Escolha a atração para maiores informações", close: "Fechar" },
    en: { add: "Add", added: "Added", pick: "Choose a place for more details", close: "Close" },
    es: { add: "Agregar", added: "Añadido", pick: "Elige el atractivo para más información", close: "Cerrar" },
  }[lang];
  var check = '<svg class="gcv-home-passeio__check" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.17 12.17 2.4 8.4l1.13-1.13 2.64 2.64 6.3-6.3 1.13 1.13z"/></svg> ';
  var picked = [];

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

  function photoHtml(tour) {
    var parts = partsOf(tour);
    if (parts.length >= 2) {
      return '<span class="gcv-home-passeio__mosaic gcv-home-passeio__mosaic--' + parts.length + '">' +
        parts.map(function (part) {
          return '<img src="' + esc(part.image) + '" alt="' + esc(part.title) + '" />';
        }).join("") + "</span>";
    }
    return tour.image ? '<img src="' + esc(tour.image) + '" alt="" />' : "";
  }

  function card(tour) {
    var cents = precoVitrine(tour.tarifa);
    var tag = tagLabel(tour._homeCat || "destaque");
    var photo = photoHtml(tour);
    var places = subtituloDe(tour);
    var mine = inCart(tour);
    return '<article class="gcv-home-passeio' + (mine ? " is-in-cart" : "") + '">' +
      '<a class="gcv-home-passeio__link" href="' + esc(tourHref(tour.href)) + '" data-tour="' + esc(tour.id) + '">' +
      '<span class="gcv-home-passeio__media">' + photo +
      '<span class="gcv-home-passeio__tag">' + esc(tag) + "</span></span>" +
      '<span class="gcv-home-passeio__body">' +
      "<h3>" + esc(tour.title) + "</h3>" +
      (places ? '<p class="gcv-home-passeio__places">' + esc(places) + "</p>" : "") +
      "</span></a>" +
      '<div class="gcv-home-passeio__foot">' +
      '<p class="gcv-home-passeio__price">' + esc(attr("data-from", "A partir de")) +
      "<strong>" + esc(reais(cents)) + "</strong>" + esc(attr("data-person", "por pessoa")) + "</p>" +
      '<button type="button" class="gcv-home-passeio__add' + (mine ? " is-added" : "") + '" data-add="' + esc(tour.id) + '">' +
      (mine ? check : "") + esc(mine ? copy.added : copy.add) + "</button>" +
      "</div></article>";
  }

  function paint() {
    if (!picked.length) return;
    grid.innerHTML = picked.map(card).join("");
    root.hidden = false;
  }

  var maxAtrativos = 3;

  function openTour(tour) {
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
        if (ev.target === box || (ev.target.closest && ev.target.closest("[data-pick-close]"))) {
          box.hidden = true;
        }
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

  grid.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".gcv-home-passeio__link");
    if (link) {
      var linked = picked.filter(function (item) {
        return String(item.id) === link.getAttribute("data-tour");
      })[0];
      var parts = linked ? partsOf(linked) : [];
      if (parts.length > 1) {
        e.preventDefault();
        openPick(parts);
        return;
      }
    }
    var btn = e.target.closest && e.target.closest("[data-add]");
    if (!btn || btn.disabled) return;
    var tour = picked.filter(function (item) {
      return String(item.id) === btn.getAttribute("data-add");
    })[0];
    if (!tour) return;
    if (inCart(tour)) {
      var cart = window.GcvExcCart;
      if (cart && typeof cart.remove === "function") {
        cartMatches(tour).forEach(function (it) { cart.remove(it.id); });
      }
      paint();
      return;
    }
    openTour(tour);
  });

  document.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest("[data-gcv-cart-remove]")) setTimeout(paint, 0);
  });

  fetch("/api/passeios.php")
    .then(function (res) { return res.json(); })
    .then(function (payload) {
      var data = (payload && payload.data) || {};
      maxAtrativos = parseInt(data.max_atrativos, 10) || maxAtrativos;
      var tours = data.tours || [];
      picked = pickEight(tours);
      paint();
    })
    .catch(function () {});
})();

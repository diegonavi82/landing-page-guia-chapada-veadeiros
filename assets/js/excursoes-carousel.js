(function () {
  "use strict";

  var WA_PHONE = "5562982506891";

  var SAIDA_HORA_PADRAO = "8:45";

  /** @param {Record<string, unknown>} e */
  function horaExcursao(e) {
    var h = e && e.hora;
    if (h != null && String(h).trim() !== "") return String(h).trim();
    return SAIDA_HORA_PADRAO;
  }

  /**
   * Fonte preferida: JSON embutido no HTML pelo `npm run build` (id=`gcv-excursoes-payload`).
   * Editar sempre `tools/excursoes-carousel-data.mjs`; o objeto EXCURSOES abaixo é só fallback.
   */
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  var EXCURSOES = {
    pt: [
      {
        dayNum: "4",
        monthName: "junho",
        weekday: "Quinta-feira",
        destino: "Cataratas dos Couros",
        hora: "9:15",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "5",
        monthName: "junho",
        weekday: "Sexta-feira",
        destino: "Segredo + Vale da Lua",
        hora: "8:30",
        valor: 110,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "6",
        monthName: "junho",
        weekday: "Sábado",
        destino: "Macaquinhos",
        hora: "8:30",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "7",
        monthName: "junho",
        weekday: "Domingo",
        destino: "Parque Nacional",
        hora: "9:00",
        valor: 100,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
    ],
    en: [
      {
        dayNum: "4",
        monthName: "June",
        weekday: "Thursday",
        destino: "Couros waterfalls",
        hora: "9:15",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "5",
        monthName: "June",
        weekday: "Friday",
        destino: "Segredo + Moon Valley",
        hora: "8:30",
        valor: 110,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "6",
        monthName: "June",
        weekday: "Saturday",
        destino: "Macaquinhos",
        hora: "8:30",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "7",
        monthName: "June",
        weekday: "Sunday",
        destino: "National Park",
        hora: "9:00",
        valor: 100,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
    ],
    es: [
      {
        dayNum: "4",
        monthName: "junio",
        weekday: "Jueves",
        destino: "Cataratas del Couros",
        hora: "9:15",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "5",
        monthName: "junio",
        weekday: "Viernes",
        destino: "Segredo + Valle de la Luna",
        hora: "8:30",
        valor: 110,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "6",
        monthName: "junio",
        weekday: "Sábado",
        destino: "Macaquinhos",
        hora: "8:30",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "7",
        monthName: "junio",
        weekday: "Domingo",
        destino: "Parque Nacional",
        hora: "9:00",
        valor: 100,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
    ],
  };

  /** @type {Record<string, Record<string, string>>} */
  var STRINGS = {
    pt: {
      groupMaxOne: "Grupos de no máximo 1 pessoa",
      groupMaxMany: "Grupos de no máximo {{n}} pessoas",
      spotsNone: "Não restam vagas",
      spotsOne: "Resta 1 vaga",
      spotsMany: "Restam {{n}} vagas",
      spotsNoneHtml: "Não restam vagas",
      spotsOneHtml: "Resta <strong>1</strong> vaga",
      spotsManyHtml: "Restam <strong>{{n}}</strong> vagas",
      falta0: "Aguardando inscrições para confirmar.",
      falta1: "Falta 1 inscrição para confirmar.",
      faltaMany: "Faltam {{n}} inscrições para confirmar",
      waHi:
        "Olá! Gostaria de me inscrever na excursão:\n\n" +
        "📅 Data: {{data}}\n" +
        "📍 Destino: {{destino}}\n" +
        "💰 Valor: R${{valor}}/por pessoa\n" +
        "📍 Saída: {{cidade}}\n" +
        "🕐 {{hora}}\n" +
        "{{grupoMax}}\n" +
        "{{status}}\n\n" +
        "Por favor, me informe sobre disponibilidade e como garantir minha vaga!",
      waConfirmed: "✅ Status: excursão confirmada.\n👥 {{linha}}.",
      waFormacao: "⏳ Status: excursão em formação.\n{{falta}}",
      meetingCity: "Alto Paraíso",
      capAria: "{{x}} de {{y}} inscritos no grupo. {{legenda}}.",
      statusOk: "Confirmado",
      statusWait: "Em formação",
      perPerson: "/por pessoa",
      inclLabel: "Incluso",
      inclPass: "Passaporte individual",
      inclGuide: "Guia local certificado",
      exclLabel: "Não incluso",
      exclEntries: "Entradas",
      exclTransport: "Transporte",
      exclLunch: "Almoço",
      cta: "Quero participar",
      dotAria: "Excursão {{i}} de {{n}}",
      carouselDotsShellAria: "Navegação do carrossel de excursões",
    },
    en: {
      groupMaxOne: "Groups of up to 1 person",
      groupMaxMany: "Groups of up to {{n}} people",
      spotsNone: "No spots left",
      spotsOne: "1 spot left",
      spotsMany: "{{n}} spots left",
      spotsNoneHtml: "No spots left",
      spotsOneHtml: "<strong>1</strong> spot left",
      spotsManyHtml: "<strong>{{n}}</strong> spots left",
      falta0: "Waiting for sign-ups to confirm this departure.",
      falta1: "1 more sign-up needed to confirm the departure.",
      faltaMany: "{{n}} more sign-ups needed to confirm the departure.",
      waHi:
        "Hi! I’d like to join this excursion:\n\n" +
        "📅 Date: {{data}}\n" +
        "📍 Destination: {{destino}}\n" +
        "💰 Price: R${{valor}} per person\n" +
        "📍 Meeting point: {{cidade}}\n" +
        "🕐 {{hora}}\n" +
        "{{grupoMax}}\n" +
        "{{status}}\n\n" +
        "Could you please confirm availability and how to secure my spot?",
      waConfirmed: "✅ Status: excursion confirmed.\n👥 {{linha}}.",
      waFormacao: "⏳ Status: excursion forming.\n{{falta}}",
      meetingCity: "Alto Paraíso",
      capAria: "{{x}} of {{y}} signed up for the group. {{legenda}}.",
      statusOk: "Confirmed",
      statusWait: "Forming group",
      perPerson: "/per person",
      inclLabel: "Included",
      inclPass: "Individual park passport",
      inclGuide: "Certified local guide",
      exclLabel: "Not included",
      exclEntries: "Admission fees",
      exclTransport: "Transport",
      exclLunch: "Lunch",
      cta: "I want to join",
      dotAria: "Excursion {{i}} of {{n}}",
      carouselDotsShellAria: "Excursions carousel navigation",
    },
    es: {
      groupMaxOne: "Grupos de hasta 1 persona",
      groupMaxMany: "Grupos de hasta {{n}} personas",
      spotsNone: "No quedan plazas",
      spotsOne: "Queda 1 plaza",
      spotsMany: "Quedan {{n}} plazas",
      spotsNoneHtml: "No quedan plazas",
      spotsOneHtml: "Queda <strong>1</strong> plaza",
      spotsManyHtml: "Quedan <strong>{{n}}</strong> plazas",
      falta0: "Esperando inscripciones para confirmar la salida.",
      falta1: "Falta 1 inscripción para confirmar la salida.",
      faltaMany: "Faltan {{n}} inscripciones para confirmar la salida.",
      waHi:
        "¡Hola! Me gustaría inscribirme en esta excursión:\n\n" +
        "📅 Fecha: {{data}}\n" +
        "📍 Destino: {{destino}}\n" +
        "💰 Precio: R${{valor}} por persona\n" +
        "📍 Punto de salida: {{cidade}}\n" +
        "🕐 {{hora}}\n" +
        "{{grupoMax}}\n" +
        "{{status}}\n\n" +
        "¿Podrían confirmar disponibilidad y cómo reservar mi plaza?",
      waConfirmed: "✅ Estado: excursión confirmada.\n👥 {{linha}}.",
      waFormacao: "⏳ Estado: excursión en formación.\n{{falta}}",
      meetingCity: "Alto Paraíso",
      capAria: "{{x}} de {{y}} inscritos en el grupo. {{legenda}}.",
      statusOk: "Confirmado",
      statusWait: "En formación",
      perPerson: "/por persona",
      inclLabel: "Incluye",
      inclPass: "Pasaporte individual del parque",
      inclGuide: "Guía local certificado",
      exclLabel: "No incluye",
      exclEntries: "Entradas",
      exclTransport: "Transporte",
      exclLunch: "Almuerzo",
      cta: "Quiero participar",
      dotAria: "Excursión {{i}} de {{n}}",
      carouselDotsShellAria: "Navegación del carrusel de excursiones",
    },
  };

  function detectLocale(root) {
    var attr = root.getAttribute("data-locale");
    if (attr === "en" || attr === "es" || attr === "pt") return attr;
    var lang = (document.documentElement.getAttribute("lang") || "pt-BR").toLowerCase();
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("es") === 0) return "es";
    return "pt";
  }

  /**
   * @param {HTMLElement} root
   * @returns {Array<Record<string, unknown>>|null}
   */
  function loadExcursaoRowsFromPayload(root) {
    try {
      var node =
        (typeof document !== "undefined" && document.getElementById("gcv-excursoes-payload")) ||
        root.querySelector('script[type="application/json"][id="gcv-excursoes-payload"]');
      if (!node || typeof node.textContent !== "string" || node.textContent.trim() === "") {
        return null;
      }
      var all = JSON.parse(node.textContent);
      var loc = detectLocale(root);
      var rows = Object.prototype.hasOwnProperty.call(all, loc) ? all[loc] : all.pt;
      return Array.isArray(rows) && rows.length ? rows : null;
    } catch (err) {
      if (typeof console !== "undefined" && console.warn) console.warn("[gcv-excursoes] payload JSON", err);
      return null;
    }
  }

  function tpl(str, map) {
    return String(str).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : "";
    });
  }

  function numOrZero(v) {
    var n = parseInt(String(v), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function grupoMaximoValor(e) {
    var n = parseInt(String(e && e.grupoMaximo), 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }

  /**
   * @param {number} cap
   * @param {Record<string, string>} s
   */
  function legendaGrupoNoMaximo(cap, s) {
    return cap === 1 ? s.groupMaxOne : tpl(s.groupMaxMany, { n: cap });
  }

  function inscritosNoGrupo(e) {
    var cap = grupoMaximoValor(e);
    if (e.pessoasInscritas != null && e.pessoasInscritas !== "") {
      return numOrZero(e.pessoasInscritas);
    }
    if (!e.confirmada) {
      var falta = Math.max(0, parseInt(String(e.faltamPessoas), 10) || 0);
      return Math.max(0, cap - falta);
    }
    return 0;
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {Record<string, string>} s
   */
  function confirmadoVagasAvisoHtml(e, s) {
    var v = numOrZero(e.vagasRestantes);
    var label;
    var inner;
    if (v === 0) {
      label = s.spotsNone;
      inner = s.spotsNoneHtml;
    } else if (v === 1) {
      label = s.spotsOne;
      inner = s.spotsOneHtml;
    } else {
      label = tpl(s.spotsMany, { n: v });
      inner = tpl(s.spotsManyHtml, { n: v });
    }
    return (
      '<p class="gcv-excursoes-card__confirmado-info" title="' +
      escapeHtml(label) +
      '" aria-label="' +
      escapeHtml(label) +
      '">' +
      inner +
      "</p>"
    );
  }

  /**
   * @param {number} v
   * @param {Record<string, string>} s
   */
  function restamVagasResumo(v, s) {
    var n = numOrZero(v);
    if (n === 0) return s.spotsNone;
    if (n === 1) return s.spotsOne;
    return tpl(s.spotsMany, { n: n });
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {Record<string, string>} s
   */
  function confirmadoWhatsappLinha(e, s) {
    var x = inscritosNoGrupo(e);
    var y = grupoMaximoValor(e);
    var v = numOrZero(e.vagasRestantes);
    return x + "/" + y + " · " + restamVagasResumo(v, s);
  }

  /**
   * @param {number} n
   * @param {Record<string, string>} s
   */
  function faltaConfirmarTexto(n, s) {
    var x = Math.max(0, parseInt(String(n), 10) || 0);
    if (x === 0) return s.falta0;
    if (x === 1) return s.falta1;
    return tpl(s.faltaMany, { n: x });
  }

  /**
   * @param {string} locale
   * @param {Record<string, unknown>} excursao
   * @param {Record<string, string>} s
   */
  function waDateLine(locale, excursao) {
    var d = String(excursao.dayNum);
    var m = String(excursao.monthName);
    if (locale === "en") return m + " " + d + ", 2026";
    if (locale === "es") return d + " de " + m + " de 2026";
    return d + " de " + m + "/2026";
  }

  /**
   * @param {Record<string, unknown>} excursao
   * @param {string} locale
   * @param {Record<string, string>} s
   */
  function waLinkExcursao(excursao, locale, s) {
    var legenda = legendaGrupoNoMaximo(grupoMaximoValor(excursao), s);
    var statusLinha = excursao.confirmada
      ? tpl(s.waConfirmed, { linha: confirmadoWhatsappLinha(excursao, s) })
      : tpl(s.waFormacao, { falta: faltaConfirmarTexto(excursao.faltamPessoas, s) });
    var msg = encodeURIComponent(
      tpl(s.waHi, {
        data: waDateLine(locale, excursao),
        destino: String(excursao.destino),
        valor: String(excursao.valor),
        cidade: s.meetingCity,
        hora: horaExcursao(excursao),
        grupoMax: legenda + ".",
        status: statusLinha,
      }),
    );
    return "https://wa.me/" + WA_PHONE + "?text=" + msg;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {Record<string, string>} s
   */
  function capGrupoHtml(e, s) {
    var y = grupoMaximoValor(e);
    var x = inscritosNoGrupo(e);
    var legendaCap = legendaGrupoNoMaximo(y, s);
    var labelAria = tpl(s.capAria, { x: x, y: y, legenda: legendaCap });
    return (
      '<span class="gcv-excursoes-card__cap" title="' +
      escapeHtml(labelAria) +
      '" aria-label="' +
      escapeHtml(labelAria) +
      '">' +
      '<i class="ti ti-users" aria-hidden="true"></i>' +
      '<span class="gcv-excursoes-card__cap-ratio" aria-hidden="true">' +
      '<span class="gcv-excursoes-card__cap-x">' +
      x +
      '</span><span class="gcv-excursoes-card__cap-slash">/</span><span class="gcv-excursoes-card__cap-y">' +
      y +
      "</span></span></span>"
    );
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {number} idx
   * @param {string} locale
   * @param {Record<string, string>} s
   */
  function buildCard(e, idx, locale, s) {
    var href = waLinkExcursao(e, locale, s);
    var mod = e.confirmada ? "gcv-excursoes-card--confirmada" : "gcv-excursoes-card--pendente";
    var dayNum = e.dayNum ? escapeHtml(String(e.dayNum)) : "—";
    var monthName = escapeHtml(String(e.monthName));
    var hora = horaExcursao(e);
    var timeBesideDate =
      '<div class="gcv-excursoes-card__datehero-time">' +
      '<span class="gcv-excursoes-card__time">' +
      escapeHtml(hora) +
      "</span></div>";

    var cityRow =
      '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--city">' +
      '<span class="gcv-excursoes-card__loc"><i class="ti ti-map-pin" aria-hidden="true"></i> ' +
      escapeHtml(s.meetingCity) +
      "</span></div>";

    var dateStrip =
      '<div class="gcv-excursoes-card__datestrip">' +
      '<div class="gcv-excursoes-card__datehero">' +
      '<span class="gcv-excursoes-card__day">' +
      dayNum +
      "</span>" +
      '<div class="gcv-excursoes-card__datehero-text">' +
      '<span class="gcv-excursoes-card__month">' +
      monthName +
      "</span>" +
      '<span class="gcv-excursoes-card__weekday">' +
      escapeHtml(String(e.weekday)) +
      "</span>" +
      "</div>" +
      timeBesideDate +
      "</div>" +
      cityRow +
      "</div>";

    var statusLine =
      '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--status">' +
      (e.confirmada
        ? '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--ok"><i class="ti ti-circle-check" aria-hidden="true"></i> ' +
          escapeHtml(s.statusOk) +
          "</span>"
        : '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--wait"><i class="ti ti-users-group" aria-hidden="true"></i> ' +
          escapeHtml(s.statusWait) +
          "</span>") +
      capGrupoHtml(e, s) +
      "</div>";

    var faltaLine =
      '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--falta">' +
      (e.confirmada
        ? confirmadoVagasAvisoHtml(e, s)
        : '<p class="gcv-excursoes-card__falta">' +
          escapeHtml(faltaConfirmarTexto(e.faltamPessoas, s)) +
          "</p>") +
      "</div>";

    var metaStack =
      '<div class="gcv-excursoes-card__meta-stack">' + statusLine + faltaLine + "</div>";

    return (
      '<article class="gcv-excursoes-card ' +
      mod +
      '" data-excursao-index="' +
      idx +
      '"' +
      (e.confirmada ? ' data-excursao-status="confirmada"' : ' data-excursao-status="formacao"') +
      ">" +
      '<div class="gcv-excursoes-card__head">' +
      dateStrip +
      metaStack +
      '<h3 class="gcv-excursoes-card__dest">' +
      escapeHtml(String(e.destino)) +
      "</h3>" +
      '<div class="gcv-excursoes-card__price-row">' +
      '<span class="gcv-excursoes-card__price">R$&nbsp;' +
      e.valor +
      "</span>" +
      '<span class="gcv-excursoes-card__per">' +
      escapeHtml(s.perPerson) +
      "</span>" +
      "</div></div>" +
      '<div class="gcv-excursoes-card__body">' +
      '<div class="gcv-excursoes-card__block gcv-excursoes-card__block--in">' +
      '<span class="gcv-excursoes-card__label gcv-excursoes-card__label--in">' +
      escapeHtml(s.inclLabel) +
      "</span>" +
      '<ul class="gcv-excursoes-card__list">' +
      "<li><span aria-hidden=\"true\">🪪</span> " +
      escapeHtml(s.inclPass) +
      "</li>" +
      '<li><i class="ti ti-circle-check text-ok" aria-hidden="true"></i> ' +
      escapeHtml(s.inclGuide) +
      "</li>" +
      "</ul></div>" +
      '<div class="gcv-excursoes-card__block gcv-excursoes-card__block--out">' +
      '<span class="gcv-excursoes-card__label gcv-excursoes-card__label--out">' +
      escapeHtml(s.exclLabel) +
      "</span>" +
      '<ul class="gcv-excursoes-card__list">' +
      '<li><i class="ti ti-circle-x text-no" aria-hidden="true"></i> ' +
      escapeHtml(s.exclEntries) +
      "</li>" +
      '<li><i class="ti ti-circle-x text-no" aria-hidden="true"></i> ' +
      escapeHtml(s.exclTransport) +
      "</li>" +
      '<li><i class="ti ti-circle-x text-no" aria-hidden="true"></i> ' +
      escapeHtml(s.exclLunch) +
      "</li>" +
      "</ul></div>" +
      '<a class="gcv-excursoes-card__cta" href="' +
      href +
      '" target="_blank" rel="noopener noreferrer">' +
      '<i class="ti ti-brand-whatsapp" aria-hidden="true"></i> ' +
      escapeHtml(s.cta) +
      "</a>" +
      "</div></article>"
    );
  }

  function ensureDotsShell(root, s) {
    var el = root.querySelector(".gcv-excursoes__dots");
    if (el) return el;
    el = document.createElement("div");
    el.className = "gcv-excursoes__dots";
    el.setAttribute("role", "tablist");
    el.setAttribute("aria-label", s.carouselDotsShellAria || "Carousel");
    root.appendChild(el);
    return el;
  }

  function init() {
    try {
      bootExcursaoCarousel();
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error("[gcv-excursoes]", err);
    }
  }

  function bootExcursaoCarousel() {
    var root = document.getElementById("excursoes-junho");
    if (!root) return;

    var locale = detectLocale(root);
    var s = STRINGS[locale] || STRINGS.pt;
    var fromPayload = loadExcursaoRowsFromPayload(root);
    var excursoes =
      fromPayload && fromPayload.length ? fromPayload : EXCURSOES[locale] || EXCURSOES.pt;

    var track = root.querySelector(".gcv-excursoes__track");
    var viewport = root.querySelector(".gcv-excursoes__viewport");
    var prev = root.querySelector(".gcv-excursoes__nav--prev");
    var next = root.querySelector(".gcv-excursoes__nav--next");

    if (!track || !viewport) return;

    var dotsWrap = ensureDotsShell(root, s);

    var html = "";
    try {
      html = excursoes
        .map(function (e, i) {
          return buildCard(e, i, locale, s);
        })
        .join("");
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error("[gcv-excursoes] buildCard", err);
      return;
    }
    if (html) {
      track.innerHTML = html;
    }

    var dots = [];
    for (var d = 0; d < excursoes.length; d++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gcv-excursoes__dot";
      b.setAttribute(
        "aria-label",
        tpl(s.dotAria, { i: d + 1, n: excursoes.length }),
      );
      (function (index) {
        b.addEventListener("click", function () {
          go(index, true, true);
        });
      })(d);
      dotsWrap.appendChild(b);
      dots.push(b);
    }

    var idx = 0;
    var timer = null;
    var CARD = 230;
    var GAP = 16;
    var STEP = CARD + GAP;

    function trackWidthPx() {
      var n = excursoes.length;
      return n * CARD + Math.max(0, n - 1) * GAP;
    }

    function viewportWidthPx() {
      return Math.max(viewport.clientWidth || 0, 1);
    }

    /** Quando todos os cards cabem na área visível, não há “scroll” — só centralizamos a faixa. */
    function fitsEntireTrack() {
      return trackWidthPx() <= viewportWidthPx();
    }

    /** Mesmo breakpoint do CSS (<640px): scroll nativo horizontal no viewport. */
    function useMobileScroll() {
      return viewportWidthPx() < 640 && !fitsEntireTrack();
    }

    function computeTranslate(i) {
      var vw = viewportWidthPx();
      var tw = trackWidthPx();
      if (tw <= vw) {
        return (vw - tw) / 2;
      }

      var maxScroll = tw - vw;
      var raw = i * STEP;
      return -Math.min(raw, maxScroll);
    }

    /**
     * Alinha o centro do card ao centro do viewport (mobile scroll).
     * Usa scrollLeft — compatível com gesto de arrastar no celular.
     */
    function scrollMobileToIndex(i, smooth) {
      var cards = track.querySelectorAll(".gcv-excursoes-card");
      var el = cards[i];
      if (!el) return;
      var vp = viewport;
      var vpW = vp.clientWidth || 0;
      if (vpW < 1) return;

      var vr = vp.getBoundingClientRect();
      var er = el.getBoundingClientRect();
      var delta = er.left + er.width / 2 - (vr.left + vr.width / 2);
      var target = vp.scrollLeft + delta;
      var maxL = Math.max(0, vp.scrollWidth - vpW);
      target = Math.max(0, Math.min(target, maxL));
      try {
        vp.scrollTo({
          left: target,
          behavior: smooth ? "smooth" : "auto",
        });
      } catch (err) {
        vp.scrollLeft = target;
      }
    }

    var scrollSyncRaf = null;
    function syncIdxFromViewportScroll() {
      if (!useMobileScroll()) return;
      var cards = track.querySelectorAll(".gcv-excursoes-card");
      if (!cards.length) return;
      var rectVP = viewport.getBoundingClientRect();
      var mid = rectVP.left + rectVP.width / 2;
      var best = 0;
      var bestDist = Infinity;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        var c = r.left + r.width / 2;
        var d = Math.abs(c - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (best !== idx) {
        idx = best;
        syncDots();
      }
    }

    function syncDots() {
      var hideDots = fitsEntireTrack();
      dotsWrap.hidden = hideDots;
      dotsWrap.setAttribute("aria-hidden", hideDots ? "true" : "false");
      for (var i = 0; i < dots.length; i++) {
        dots[i].setAttribute("aria-current", i === idx ? "true" : "false");
        dots[i].disabled = hideDots;
      }
    }

    function syncNavButtons() {
      var hide = fitsEntireTrack();
      if (prev) {
        prev.hidden = hide;
        prev.setAttribute("aria-hidden", hide ? "true" : "false");
        prev.disabled = hide;
      }
      if (next) {
        next.hidden = hide;
        next.setAttribute("aria-hidden", hide ? "true" : "false");
        next.disabled = hide;
      }
    }

    /**
     * @param {{ smoothScroll?: boolean }} [opts]
     */
    function apply(opts) {
      opts = opts || {};
      var smoothScroll = !!opts.smoothScroll;

      if (useMobileScroll()) {
        track.style.transform = "";
        scrollMobileToIndex(idx, smoothScroll);
        syncDots();
        syncNavButtons();
        return;
      }

      viewport.scrollLeft = 0;
      var x = computeTranslate(idx);
      track.style.transform = "translateX(" + x + "px)";
      syncDots();
      syncNavButtons();
    }

    /**
     * @param {boolean} [fromUser]
     * @param {boolean} [smoothScroll]
     */
    function go(i, fromUser, smoothScroll) {
      idx = ((i % excursoes.length) + excursoes.length) % excursoes.length;
      apply({ smoothScroll: !!smoothScroll });
      if (fromUser) restartAutoplay();
    }

    function nextSlide() {
      go(idx + 1, false, false);
    }

    function prevSlide() {
      go(idx - 1, false, false);
    }

    function startAutoplay() {
      stopAutoplay();
      timer = window.setInterval(nextSlide, 3500);
    }

    function stopAutoplay() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function restartAutoplay() {
      stopAutoplay();
      if (!fitsEntireTrack()) startAutoplay();
    }

    if (prev) {
      prev.addEventListener("click", function () {
        go(idx - 1, true, true);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        go(idx + 1, true, true);
      });
    }

    viewport.addEventListener(
      "scroll",
      function () {
        if (!useMobileScroll()) return;
        if (scrollSyncRaf !== null) return;
        scrollSyncRaf = window.requestAnimationFrame(function () {
          scrollSyncRaf = null;
          syncIdxFromViewportScroll();
        });
      },
      { passive: true },
    );

    viewport.addEventListener(
      "wheel",
      function (ev) {
        if (fitsEntireTrack() || useMobileScroll()) return;
        var dx = ev.deltaX;
        if (ev.shiftKey && Math.abs(ev.deltaY) > Math.abs(dx)) {
          dx = ev.deltaY;
        }
        var dy = ev.deltaY;
        if (Math.abs(dx) < 12 && Math.abs(dy) >= Math.abs(dx) && !ev.shiftKey) return;
        ev.preventDefault();
        if (dx > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
        restartAutoplay();
      },
      { passive: false },
    );

    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", function () {
      if (!fitsEntireTrack()) startAutoplay();
    });
    root.addEventListener("focusin", stopAutoplay);
    root.addEventListener("focusout", function (ev) {
      if (!root.contains(ev.relatedTarget) && !fitsEntireTrack()) startAutoplay();
    });

    window.addEventListener(
      "resize",
      function () {
        apply({ smoothScroll: false });
      },
      { passive: true },
    );

    function kick() {
      apply({ smoothScroll: false });
      if (fitsEntireTrack()) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    }
    requestAnimationFrame(function () {
      kick();
      if (viewport.clientWidth < 32) {
        requestAnimationFrame(kick);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

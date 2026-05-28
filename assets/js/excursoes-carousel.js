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
        destino: "Cachoeira do Segredo",
        hora: "9:15",
        valor: 90,
        confirmada: true,
        pessoasInscritas: 6,
        grupoMaximo: 8,
        vagasRestantes: 2,
      },
      {
        dayNum: "5",
        monthName: "junho",
        weekday: "Sexta-feira",
        destino: "Cataratas dos Couros",
        hora: "8:30",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "6",
        monthName: "junho",
        weekday: "Sábado",
        destino: "Mirante da Janela",
        hora: "14:30",
        valor: 90,
        confirmada: true,
        pessoasInscritas: 6,
        grupoMaximo: 10,
        vagasRestantes: 4,
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
        destino: "The Secret waterfall",
        hora: "9:15",
        valor: 90,
        confirmada: true,
        pessoasInscritas: 6,
        grupoMaximo: 8,
        vagasRestantes: 2,
      },
      {
        dayNum: "5",
        monthName: "June",
        weekday: "Friday",
        destino: "Couros waterfalls",
        hora: "8:30",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "6",
        monthName: "June",
        weekday: "Saturday",
        destino: "Janela lookout",
        hora: "14:30",
        valor: 90,
        confirmada: true,
        pessoasInscritas: 6,
        grupoMaximo: 10,
        vagasRestantes: 4,
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
        destino: "Cascada del Secreto",
        hora: "9:15",
        valor: 90,
        confirmada: true,
        pessoasInscritas: 6,
        grupoMaximo: 8,
        vagasRestantes: 2,
      },
      {
        dayNum: "5",
        monthName: "junio",
        weekday: "Viernes",
        destino: "Cataratas del Couros",
        hora: "8:30",
        valor: 120,
        confirmada: false,
        faltamPessoas: 3,
        pessoasInscritas: 1,
        grupoMaximo: 10,
      },
      {
        dayNum: "6",
        monthName: "junio",
        weekday: "Sábado",
        destino: "Mirador de la Ventana",
        hora: "14:30",
        valor: 90,
        confirmada: true,
        pessoasInscritas: 6,
        grupoMaximo: 10,
        vagasRestantes: 4,
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
      statusOk: "✅ Confirmado",
      statusWait: "⏳ Formando",
      perPerson: "/por pessoa",
      inclLabel: "Incluso",
      inclSpot: "Vaga em Excursão",
      inclGuideShort: "Guia local",
      inclTransport: "Transporte",
      badgeTransport: "Com transporte",
      exclLabel: "Não incluso",
      exclEntries: "Entradas",
      exclEntry: "Entrada",
      exclTransport: "Transporte",
      exclLunch: "Almoço",
      cta: "Quero participar",
      filterTitle: "Filtrar saídas",
      filterPeriod: "Período",
      filterDateFrom: "De",
      filterDateTo: "Até",
      filterDateHintStart: "1º passo: escolha a data inicial",
      filterDateHintEnd: "2º passo: escolha a data final",
      filterDateRange: "{{from}} → {{to}}",
      filterCalPrev: "Mês anterior",
      filterCalNext: "Próximo mês",
      filterEmbarque: "Embarque",
      filterEmbarqueAll: "Todos",
      filterPrice: "Valor por pessoa",
      filterTransport: "Translado",
      filterTransportAll: "Todos",
      filterTransportWith: "Com translado",
      filterTransportWithout: "Sem translado",
      filterStatus: "Status",
      filterStatusAll: "Todos",
      filterStatusConfirmed: "Confirmada",
      filterStatusForming: "Formando",
      filterSpots: "Vagas disponíveis",
      filterSpotsValue: "{{min}} – {{max}} vagas",
      filterPriceValue: "R$ {{min}} – R$ {{max}}",
      filterClear: "Limpar filtros",
      filterEmpty: "Nenhuma saída encontrada com estes filtros.",
      filterResults: "{{n}} saída(s)",
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
      statusOk: "✅ Confirmed",
      statusWait: "⏳ Forming",
      perPerson: "/per person",
      inclLabel: "Included",
      inclSpot: "Excursion spot",
      inclGuideShort: "Local guide",
      inclTransport: "Transport",
      badgeTransport: "With transport",
      exclLabel: "Not included",
      exclEntries: "Admission fees",
      exclEntry: "Admission",
      exclTransport: "Transport",
      exclLunch: "Lunch",
      cta: "I want to join",
      filterTitle: "Filter departures",
      filterPeriod: "Period",
      filterDateFrom: "From",
      filterDateTo: "To",
      filterDateHintStart: "Step 1: pick start date",
      filterDateHintEnd: "Step 2: pick end date",
      filterDateRange: "{{from}} → {{to}}",
      filterCalPrev: "Previous month",
      filterCalNext: "Next month",
      filterEmbarque: "Meeting point",
      filterEmbarqueAll: "All",
      filterPrice: "Price per person",
      filterTransport: "Transport",
      filterTransportAll: "All",
      filterTransportWith: "With transport",
      filterTransportWithout: "Without transport",
      filterStatus: "Status",
      filterStatusAll: "All",
      filterStatusConfirmed: "Confirmed",
      filterStatusForming: "Forming",
      filterSpots: "Available spots",
      filterSpotsValue: "{{min}} – {{max}} spots",
      filterPriceValue: "R$ {{min}} – R$ {{max}}",
      filterClear: "Clear filters",
      filterEmpty: "No departures match these filters.",
      filterResults: "{{n}} departure(s)",
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
      statusOk: "✅ Confirmado",
      statusWait: "⏳ Formando",
      perPerson: "/por persona",
      inclLabel: "Incluye",
      inclSpot: "Cupo en excursión",
      inclGuideShort: "Guía local",
      inclTransport: "Transporte",
      badgeTransport: "Con transporte",
      exclLabel: "No incluye",
      exclEntries: "Entradas",
      exclEntry: "Entrada",
      exclTransport: "Transporte",
      exclLunch: "Almuerzo",
      cta: "Quiero participar",
      filterTitle: "Filtrar salidas",
      filterPeriod: "Período",
      filterDateFrom: "Desde",
      filterDateTo: "Hasta",
      filterDateHintStart: "1.er paso: elige la fecha inicial",
      filterDateHintEnd: "2.º paso: elige la fecha final",
      filterDateRange: "{{from}} → {{to}}",
      filterCalPrev: "Mes anterior",
      filterCalNext: "Mes siguiente",
      filterEmbarque: "Embarque",
      filterEmbarqueAll: "Todos",
      filterPrice: "Precio por persona",
      filterTransport: "Traslado",
      filterTransportAll: "Todos",
      filterTransportWith: "Con traslado",
      filterTransportWithout: "Sin traslado",
      filterStatus: "Estado",
      filterStatusAll: "Todos",
      filterStatusConfirmed: "Confirmada",
      filterStatusForming: "Formando",
      filterSpots: "Plazas disponibles",
      filterSpotsValue: "{{min}} – {{max}} plazas",
      filterPriceValue: "R$ {{min}} – R$ {{max}}",
      filterClear: "Limpiar filtros",
      filterEmpty: "Ninguna salida coincide con estos filtros.",
      filterResults: "{{n}} salida(s)",
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

  var MONTH_NUM = {
    janeiro: 1,
    fevereiro: 2,
    março: 3,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
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

  function excursaoEmbarque(e, s) {
    return String((e && e.embarque) || (s && s.meetingCity) || "").trim();
  }

  function excursaoDateIso(e) {
    if (e && e.dateISO) return String(e.dateISO).slice(0, 10);
    var day = parseInt(String(e && e.dayNum), 10);
    var m = MONTH_NUM[String((e && e.monthName) || "").toLowerCase()];
    if (!Number.isFinite(day) || !m) return "";
    return "2026-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function excursaoValor(e) {
    var n = parseInt(String(e && e.valor), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function vagasDisponiveis(e) {
    if (e && e.confirmada) return numOrZero(e.vagasRestantes);
    return Math.max(0, grupoMaximoValor(e) - inscritosNoGrupo(e));
  }

  function scanExcursaoBounds(list, s) {
    var dates = [];
    var prices = [];
    var embarques = {};
    list.forEach(function (e) {
      var d = excursaoDateIso(e);
      if (d) dates.push(d);
      prices.push(excursaoValor(e));
      var em = excursaoEmbarque(e, s);
      if (em) embarques[em] = true;
    });
    dates.sort();
    prices.sort(function (a, b) {
      return a - b;
    });
    return {
      dateMin: dates[0] || "",
      dateMax: dates[dates.length - 1] || "",
      priceMin: prices.length ? prices[0] : 0,
      priceMax: prices.length ? prices[prices.length - 1] : 500,
      embarques: Object.keys(embarques).sort(),
    };
  }

  function matchesExcursaoFilters(e, f, s) {
    var iso = excursaoDateIso(e);
    if (f.dateFrom && iso && iso < f.dateFrom) return false;
    if (f.dateTo && iso && iso > f.dateTo) return false;
    if (f.embarque && excursaoEmbarque(e, s) !== f.embarque) return false;
    var price = excursaoValor(e);
    if (price < f.priceMin || price > f.priceMax) return false;
    if (f.transport === "com" && e.comTransporte !== true) return false;
    if (f.transport === "sem" && e.comTransporte === true) return false;
    if (f.status === "confirmada" && !e.confirmada) return false;
    if (f.status === "formando" && e.confirmada) return false;
    var vagas = vagasDisponiveis(e);
    if (vagas < f.spotsMin || vagas > f.spotsMax) return false;
    return true;
  }

  function filterExcursaoList(list, f, s) {
    return list.filter(function (e) {
      return matchesExcursaoFilters(e, f, s);
    });
  }

  function isoToDate(iso) {
    var p = String(iso).split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function dateToIso(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function compareIso(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  function weekdayHeaders(locale) {
    var loc = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(2026, 0, 4 + i);
      out.push(
        new Intl.DateTimeFormat(loc, { weekday: "short" })
          .format(d)
          .replace(/\./g, "")
          .slice(0, 3),
      );
    }
    return out;
  }

  /**
   * @param {HTMLElement} fieldEl
   * @param {{ dateMin: string, dateMax: string }} bounds
   * @param {Record<string, string>} s
   * @param {string} locale
   * @param {Set<string>} excursionDates
   * @param {() => void} onRangeCommit
   */
  function mountExcursaoDateRangePicker(fieldEl, bounds, s, locale, excursionDates, onRangeCommit) {
    var minIso = bounds.dateMin;
    var maxIso = bounds.dateMax;
    var startIso = minIso;
    var endIso = maxIso;
    var pickPhase = "start";
    var isOpen = false;
    var viewYear = isoToDate(minIso).getFullYear();
    var viewMonth = isoToDate(minIso).getMonth();

    var locTag = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR";
    var fmtShort = new Intl.DateTimeFormat(locTag, { day: "numeric", month: "short" });

    fieldEl.className = "gcv-excursoes-filters__field gcv-excursoes-filters__field--period";
    fieldEl.innerHTML =
      '<span class="gcv-excursoes-filters__label">' +
      escapeHtml(s.filterPeriod) +
      '</span><div class="gcv-exc-datepick" data-gcv-datepick>' +
      '<button type="button" class="gcv-exc-datepick__trigger" aria-haspopup="dialog" aria-expanded="false">' +
      '<i class="ti ti-calendar-event" aria-hidden="true"></i>' +
      '<span class="gcv-exc-datepick__value" data-gcv-date-value></span>' +
      '<i class="ti ti-chevron-down gcv-exc-datepick__chev" aria-hidden="true"></i>' +
      "</button>" +
      '<div class="gcv-exc-datepick__popover" data-gcv-date-popover hidden role="dialog" aria-modal="false">' +
      '<p class="gcv-exc-datepick__hint" data-gcv-date-hint></p>' +
      '<div class="gcv-exc-datepick__nav">' +
      '<button type="button" class="gcv-exc-datepick__nav-btn" data-gcv-date-prev aria-label="' +
      escapeHtml(s.filterCalPrev) +
      '"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>' +
      '<span class="gcv-exc-datepick__month" data-gcv-date-month></span>' +
      '<button type="button" class="gcv-exc-datepick__nav-btn" data-gcv-date-next aria-label="' +
      escapeHtml(s.filterCalNext) +
      '"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>' +
      "</div>" +
      '<div class="gcv-exc-datepick__weekdays" data-gcv-date-weekdays></div>' +
      '<div class="gcv-exc-datepick__grid" data-gcv-date-grid role="grid"></div>' +
      "</div></div>";

    var root = fieldEl.querySelector("[data-gcv-datepick]");
    var trigger = fieldEl.querySelector(".gcv-exc-datepick__trigger");
    var popover = fieldEl.querySelector("[data-gcv-date-popover]");
    var valueEl = fieldEl.querySelector("[data-gcv-date-value]");
    var hintEl = fieldEl.querySelector("[data-gcv-date-hint]");
    var monthEl = fieldEl.querySelector("[data-gcv-date-month]");
    var weekdaysEl = fieldEl.querySelector("[data-gcv-date-weekdays]");
    var gridEl = fieldEl.querySelector("[data-gcv-date-grid]");
    var prevBtn = fieldEl.querySelector("[data-gcv-date-prev]");
    var nextBtn = fieldEl.querySelector("[data-gcv-date-next]");

    weekdaysEl.innerHTML = weekdayHeaders(locale)
      .map(function (w) {
        return '<span class="gcv-exc-datepick__weekday">' + escapeHtml(w) + "</span>";
      })
      .join("");

    function fmtDisplay(iso) {
      return fmtShort.format(isoToDate(iso));
    }

    function updateValueText() {
      if (valueEl) {
        valueEl.textContent = tpl(s.filterDateRange, {
          from: fmtDisplay(startIso),
          to: fmtDisplay(endIso),
        });
      }
    }

    function monthTitle() {
      return new Intl.DateTimeFormat(locTag, { month: "long", year: "numeric" }).format(
        new Date(viewYear, viewMonth, 1),
      );
    }

    function renderCalendar() {
      if (monthEl) monthEl.textContent = monthTitle();
      if (hintEl) {
        hintEl.textContent = pickPhase === "start" ? s.filterDateHintStart : s.filterDateHintEnd;
      }
      if (!gridEl) return;

      var first = new Date(viewYear, viewMonth, 1);
      var startPad = first.getDay();
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var cells = [];

      for (var pad = 0; pad < startPad; pad++) {
        cells.push('<span class="gcv-exc-datepick__day gcv-exc-datepick__day--empty" aria-hidden="true"></span>');
      }

      for (var day = 1; day <= daysInMonth; day++) {
        var iso = dateToIso(new Date(viewYear, viewMonth, day));
        var disabled = iso < minIso || iso > maxIso;
        var inRange = !disabled && compareIso(iso, startIso) >= 0 && compareIso(iso, endIso) <= 0;
        var isStart = iso === startIso;
        var isEnd = iso === endIso;
        var hasTrip = excursionDates.has(iso);
        var cls = "gcv-exc-datepick__day";
        if (disabled) cls += " gcv-exc-datepick__day--disabled";
        if (inRange) cls += " gcv-exc-datepick__day--in-range";
        if (isStart) cls += " gcv-exc-datepick__day--start";
        if (isEnd) cls += " gcv-exc-datepick__day--end";
        if (hasTrip) cls += " gcv-exc-datepick__day--has-trip";

        cells.push(
          '<button type="button" class="' +
            cls +
            '" data-gcv-date-day="' +
            escapeHtml(iso) +
            '" role="gridcell"' +
            (disabled ? " disabled" : "") +
            ">" +
            '<span class="gcv-exc-datepick__day-num">' +
            day +
            "</span>" +
            (hasTrip ? '<span class="gcv-exc-datepick__day-dot" aria-hidden="true"></span>' : "") +
            "</button>",
        );
      }

      gridEl.innerHTML = cells.join("");
    }

    function closePopover() {
      isOpen = false;
      if (popover) popover.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (root) root.classList.remove("is-open");
    }

    function openPopover() {
      isOpen = true;
      if (popover) popover.hidden = false;
      if (trigger) trigger.setAttribute("aria-expanded", "true");
      if (root) root.classList.add("is-open");
      pickPhase = "start";
      var d = isoToDate(startIso);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
      renderCalendar();
    }

    function onDayPick(iso) {
      if (iso < minIso || iso > maxIso) return;
      if (pickPhase === "start") {
        startIso = iso;
        endIso = iso;
        pickPhase = "end";
        renderCalendar();
        return;
      }
      endIso = iso;
      if (compareIso(endIso, startIso) < 0) {
        var tmp = startIso;
        startIso = endIso;
        endIso = tmp;
      }
      pickPhase = "start";
      updateValueText();
      renderCalendar();
      onRangeCommit();
      closePopover();
    }

    if (gridEl) {
      gridEl.addEventListener("click", function (ev) {
        var btn = ev.target.closest("[data-gcv-date-day]");
        if (!btn || btn.disabled) return;
        ev.stopPropagation();
        onDayPick(String(btn.getAttribute("data-gcv-date-day")));
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        viewMonth -= 1;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear -= 1;
        }
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        viewMonth += 1;
        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear += 1;
        }
        renderCalendar();
      });
    }

    if (trigger) {
      trigger.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (isOpen) closePopover();
        else openPopover();
      });
    }

    fieldEl.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-gcv-date-day], [data-gcv-date-prev], [data-gcv-date-next]")) return;
      if (!isOpen) openPopover();
    });

    document.addEventListener("click", function (ev) {
      if (!fieldEl.contains(ev.target)) closePopover();
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && isOpen) closePopover();
    });

    updateValueText();
    renderCalendar();

    return {
      getRange: function () {
        return { dateFrom: startIso, dateTo: endIso };
      },
      reset: function () {
        startIso = minIso;
        endIso = maxIso;
        pickPhase = "start";
        updateValueText();
        renderCalendar();
        closePopover();
      },
    };
  }

  function syncDualRangeFill(minEl, maxEl, fillEl) {
    if (!minEl || !maxEl || !fillEl) return;
    var min = parseInt(String(minEl.min), 10) || 0;
    var max = parseInt(String(minEl.max), 10) || 100;
    var lo = parseInt(String(minEl.value), 10);
    var hi = parseInt(String(maxEl.value), 10);
    if (lo > hi) {
      var t = lo;
      lo = hi;
      hi = t;
      minEl.value = String(lo);
      maxEl.value = String(hi);
    }
    var span = max - min || 1;
    var left = ((lo - min) / span) * 100;
    var width = ((hi - lo) / span) * 100;
    fillEl.style.left = left + "%";
    fillEl.style.width = width + "%";
  }

  /**
   * @param {HTMLElement} host
   * @param {Record<string, string>} s
   * @param {Array<Record<string, unknown>>} list
   * @param {(filters: Record<string, unknown>, resultsEl?: HTMLElement | null) => void} onChange
   * @param {string} locale
   */
  function mountExcursaoFilters(host, s, list, onChange, locale) {
    var bounds = scanExcursaoBounds(list, s);
    var hasTransport = list.some(function (e) {
      return e.comTransporte === true;
    });
    var excursionDates = new Set(
      list
        .map(function (e) {
          return excursaoDateIso(e);
        })
        .filter(Boolean),
    );

    var panel = document.createElement("div");
    panel.className = "gcv-excursoes-filters";
    panel.setAttribute("role", "search");
    panel.setAttribute("aria-label", s.filterTitle);

    var head = document.createElement("div");
    head.className = "gcv-excursoes-filters__head";
    head.innerHTML =
      '<h3 class="gcv-excursoes-filters__title">' +
      escapeHtml(s.filterTitle) +
      '</h3><div class="gcv-excursoes-filters__head-actions">' +
      '<p class="gcv-excursoes-filters__results" data-gcv-filter-results></p>' +
      '<button type="button" class="gcv-excursoes-filters__clear" data-gcv-filter-clear>' +
      escapeHtml(s.filterClear) +
      "</button></div>";

    var grid = document.createElement("div");
    grid.className = "gcv-excursoes-filters__grid";

    var periodField = document.createElement("div");
    var embarqueField = document.createElement("div");
    embarqueField.className = "gcv-excursoes-filters__field gcv-excursoes-filters__field--compact";
    embarqueField.innerHTML =
      '<label class="gcv-excursoes-filters__label" for="gcv-exc-filter-embarque">' +
      escapeHtml(s.filterEmbarque) +
      '</label><select class="gcv-excursoes-filters__select" id="gcv-exc-filter-embarque" data-gcv-filter="embarque"></select>';

    var statusField = document.createElement("div");
    statusField.className = "gcv-excursoes-filters__field gcv-excursoes-filters__field--compact";
    statusField.innerHTML =
      '<label class="gcv-excursoes-filters__label" for="gcv-exc-filter-status">' +
      escapeHtml(s.filterStatus) +
      '</label><select class="gcv-excursoes-filters__select" id="gcv-exc-filter-status" data-gcv-filter="status">' +
      '<option value="">' +
      escapeHtml(s.filterStatusAll) +
      "</option>" +
      '<option value="confirmada">' +
      escapeHtml(s.filterStatusConfirmed) +
      "</option>" +
      '<option value="formando">' +
      escapeHtml(s.filterStatusForming) +
      "</option></select>";

    var transportField = document.createElement("div");
    transportField.className = "gcv-excursoes-filters__field gcv-excursoes-filters__field--compact";
    transportField.innerHTML =
      '<label class="gcv-excursoes-filters__label" for="gcv-exc-filter-transport">' +
      escapeHtml(s.filterTransport) +
      '</label><select class="gcv-excursoes-filters__select" id="gcv-exc-filter-transport" data-gcv-filter="transport">' +
      '<option value="">' +
      escapeHtml(s.filterTransportAll) +
      "</option>" +
      '<option value="com">' +
      escapeHtml(s.filterTransportWith) +
      "</option>" +
      '<option value="sem">' +
      escapeHtml(s.filterTransportWithout) +
      "</option></select>";

    var priceField = document.createElement("div");
    priceField.className = "gcv-excursoes-filters__field gcv-excursoes-filters__field--range";
    priceField.innerHTML =
      '<div class="gcv-excursoes-filters__range-head"><span class="gcv-excursoes-filters__label">' +
      escapeHtml(s.filterPrice) +
      '</span><span class="gcv-excursoes-filters__range-value" data-gcv-price-label></span></div>' +
      '<div class="gcv-excursoes-filters__range-track"><span class="gcv-excursoes-filters__range-fill" data-gcv-price-fill></span>' +
      '<input class="gcv-excursoes-filters__range" type="range" data-gcv-filter="priceMin" aria-label="' +
      escapeHtml(s.filterPrice) +
      ' min" />' +
      '<input class="gcv-excursoes-filters__range" type="range" data-gcv-filter="priceMax" aria-label="' +
      escapeHtml(s.filterPrice) +
      ' max" /></div>';

    var spotsField = document.createElement("div");
    spotsField.className = "gcv-excursoes-filters__field gcv-excursoes-filters__field--range";
    spotsField.innerHTML =
      '<div class="gcv-excursoes-filters__range-head"><span class="gcv-excursoes-filters__label">' +
      escapeHtml(s.filterSpots) +
      '</span><span class="gcv-excursoes-filters__range-value" data-gcv-spots-label></span></div>' +
      '<div class="gcv-excursoes-filters__range-track"><span class="gcv-excursoes-filters__range-fill" data-gcv-spots-fill></span>' +
      '<input class="gcv-excursoes-filters__range" type="range" data-gcv-filter="spotsMin" min="1" max="9" aria-label="' +
      escapeHtml(s.filterSpots) +
      ' min" />' +
      '<input class="gcv-excursoes-filters__range" type="range" data-gcv-filter="spotsMax" min="1" max="9" aria-label="' +
      escapeHtml(s.filterSpots) +
      ' max" /></div>';

    grid.appendChild(periodField);
    grid.appendChild(embarqueField);
    grid.appendChild(statusField);
    if (hasTransport) grid.appendChild(transportField);
    grid.appendChild(priceField);
    grid.appendChild(spotsField);

    panel.appendChild(head);
    panel.appendChild(grid);
    host.innerHTML = "";
    host.appendChild(panel);

    var datePicker = mountExcursaoDateRangePicker(
      periodField,
      bounds,
      s,
      locale,
      excursionDates,
      function () {
        emit();
      },
    );

    var embarqueEl = panel.querySelector('[data-gcv-filter="embarque"]');
    var priceMinEl = panel.querySelector('[data-gcv-filter="priceMin"]');
    var priceMaxEl = panel.querySelector('[data-gcv-filter="priceMax"]');
    var priceLabelEl = panel.querySelector("[data-gcv-price-label]");
    var priceFillEl = panel.querySelector("[data-gcv-price-fill]");
    var transportEl = panel.querySelector('[data-gcv-filter="transport"]');
    var statusEl = panel.querySelector('[data-gcv-filter="status"]');
    var spotsMinEl = panel.querySelector('[data-gcv-filter="spotsMin"]');
    var spotsMaxEl = panel.querySelector('[data-gcv-filter="spotsMax"]');
    var spotsLabelEl = panel.querySelector("[data-gcv-spots-label]");
    var spotsFillEl = panel.querySelector("[data-gcv-spots-fill]");
    var resultsEl = panel.querySelector("[data-gcv-filter-results]");
    var clearBtn = panel.querySelector("[data-gcv-filter-clear]");

    if (embarqueEl) {
      var optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = s.filterEmbarqueAll;
      embarqueEl.appendChild(optAll);
      bounds.embarques.forEach(function (em) {
        var opt = document.createElement("option");
        opt.value = em;
        opt.textContent = em;
        embarqueEl.appendChild(opt);
      });
    }

    if (priceMinEl && priceMaxEl) {
      priceMinEl.min = String(bounds.priceMin);
      priceMinEl.max = String(bounds.priceMax);
      priceMinEl.step = "1";
      priceMinEl.value = String(bounds.priceMin);
      priceMaxEl.min = String(bounds.priceMin);
      priceMaxEl.max = String(bounds.priceMax);
      priceMaxEl.step = "1";
      priceMaxEl.value = String(bounds.priceMax);
    }

    if (spotsMinEl && spotsMaxEl) {
      spotsMinEl.value = "1";
      spotsMaxEl.value = "9";
    }

    function updateRangeLabels() {
      if (priceLabelEl && priceMinEl && priceMaxEl) {
        priceLabelEl.textContent = tpl(s.filterPriceValue, {
          min: priceMinEl.value,
          max: priceMaxEl.value,
        });
        syncDualRangeFill(priceMinEl, priceMaxEl, priceFillEl);
      }
      if (spotsLabelEl && spotsMinEl && spotsMaxEl) {
        spotsLabelEl.textContent = tpl(s.filterSpotsValue, {
          min: spotsMinEl.value,
          max: spotsMaxEl.value,
        });
        syncDualRangeFill(spotsMinEl, spotsMaxEl, spotsFillEl);
      }
    }

    function readFilters() {
      var range = datePicker.getRange();
      return {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        embarque: embarqueEl ? embarqueEl.value : "",
        priceMin: priceMinEl ? parseInt(String(priceMinEl.value), 10) : bounds.priceMin,
        priceMax: priceMaxEl ? parseInt(String(priceMaxEl.value), 10) : bounds.priceMax,
        transport: transportEl ? transportEl.value : "",
        status: statusEl ? statusEl.value : "",
        spotsMin: spotsMinEl ? parseInt(String(spotsMinEl.value), 10) : 1,
        spotsMax: spotsMaxEl ? parseInt(String(spotsMaxEl.value), 10) : 9,
      };
    }

    function emit() {
      updateRangeLabels();
      onChange(readFilters(), resultsEl);
    }

    function reset() {
      datePicker.reset();
      if (embarqueEl) embarqueEl.value = "";
      if (priceMinEl) priceMinEl.value = String(bounds.priceMin);
      if (priceMaxEl) priceMaxEl.value = String(bounds.priceMax);
      if (transportEl) transportEl.value = "";
      if (statusEl) statusEl.value = "";
      if (spotsMinEl) spotsMinEl.value = "1";
      if (spotsMaxEl) spotsMaxEl.value = "9";
      emit();
    }

    panel.querySelectorAll("[data-gcv-filter]").forEach(function (el) {
      el.addEventListener("input", emit);
      el.addEventListener("change", emit);
    });
    if (clearBtn) clearBtn.addEventListener("click", reset);

    updateRangeLabels();
    emit();
    return { reset: reset, read: readFilters };
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
   * @param {Record<string, string>} s
   */
  function inclExclBlocksHtml(e, s) {
    var comTransporte = e.comTransporte === true;
    var inclItems =
      '<li><i class="ti ti-user text-ok" aria-hidden="true"></i> ' +
      escapeHtml(s.inclSpot) +
      "</li>" +
      '<li><i class="ti ti-flag text-ok" aria-hidden="true"></i> ' +
      escapeHtml(s.inclGuideShort) +
      "</li>";
    if (comTransporte) {
      inclItems +=
        '<li><i class="ti ti-bus text-ok" aria-hidden="true"></i> ' +
        escapeHtml(s.inclTransport) +
        "</li>";
    }
    var exclItems;
    if (comTransporte) {
      exclItems =
        '<li><i class="ti ti-ticket text-no" aria-hidden="true"></i> ' +
        escapeHtml(s.exclEntries) +
        "</li>" +
        '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
        escapeHtml(s.exclLunch) +
        "</li>";
    } else {
      exclItems =
        '<li><i class="ti ti-ticket text-no" aria-hidden="true"></i> ' +
        escapeHtml(s.exclEntries) +
        "</li>" +
        '<li><i class="ti ti-bus text-no" aria-hidden="true"></i> ' +
        escapeHtml(s.exclTransport) +
        "</li>" +
        '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
        escapeHtml(s.exclLunch) +
        "</li>";
    }
    return (
      '<div class="gcv-excursoes-card__block gcv-excursoes-card__block--in">' +
      '<span class="gcv-excursoes-card__label gcv-excursoes-card__label--in">' +
      escapeHtml(s.inclLabel) +
      "</span>" +
      '<ul class="gcv-excursoes-card__list">' +
      inclItems +
      "</ul></div>" +
      '<div class="gcv-excursoes-card__block gcv-excursoes-card__block--out">' +
      '<span class="gcv-excursoes-card__label gcv-excursoes-card__label--out">' +
      escapeHtml(s.exclLabel) +
      "</span>" +
      '<ul class="gcv-excursoes-card__list">' +
      exclItems +
      "</ul></div>"
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
    var comTransporte = e.comTransporte === true;
    var mod = e.confirmada ? "gcv-excursoes-card--confirmada" : "gcv-excursoes-card--pendente";
    if (comTransporte) mod += " gcv-excursoes-card--transporte";
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
      escapeHtml(excursaoEmbarque(e, s)) +
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
        ? '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--ok">' +
          escapeHtml(s.statusOk) +
          "</span>"
        : '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--wait">' +
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
      inclExclBlocksHtml(e, s) +
      (comTransporte
        ? '<span class="gcv-excursoes-card__transport-badge"><i class="ti ti-bus" aria-hidden="true"></i> ' +
          escapeHtml(s.badgeTransport) +
          "</span>"
        : "") +
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
    var allExcursoes =
      fromPayload && fromPayload.length ? fromPayload : EXCURSOES[locale] || EXCURSOES.pt;
    var carouselExcursoes = allExcursoes.slice();

    var track = root.querySelector(".gcv-excursoes__track");
    var viewport = root.querySelector(".gcv-excursoes__viewport");
    var prev = root.querySelector(".gcv-excursoes__nav--prev");
    var next = root.querySelector(".gcv-excursoes__nav--next");
    var shell = root.querySelector(".gcv-excursoes__shell");
    var filtersHost = root.querySelector("#gcv-excursoes-filters-host");
    var emptyEl = root.querySelector("#gcv-excursoes-filter-empty");

    if (!track || !viewport) return;

    var dotsWrap = ensureDotsShell(root, s);
    var dots = [];

    function renderTrackAndDots() {
      var html = "";
      try {
        html = carouselExcursoes
          .map(function (e, i) {
            return buildCard(e, i, locale, s);
          })
          .join("");
      } catch (err) {
        if (typeof console !== "undefined" && console.error) console.error("[gcv-excursoes] buildCard", err);
        html = "";
      }
      track.innerHTML = html;

      dotsWrap.innerHTML = "";
      dots = [];
      for (var d = 0; d < carouselExcursoes.length; d++) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "gcv-excursoes__dot";
        b.setAttribute("aria-label", tpl(s.dotAria, { i: d + 1, n: carouselExcursoes.length }));
        (function (index) {
          b.addEventListener("click", function () {
            go(index, true, true);
          });
        })(d);
        dotsWrap.appendChild(b);
        dots.push(b);
      }

      var isEmpty = carouselExcursoes.length === 0;
      if (emptyEl) {
        emptyEl.hidden = !isEmpty;
        emptyEl.textContent = isEmpty ? s.filterEmpty : "";
      }
      if (shell) shell.hidden = isEmpty;
    }

    renderTrackAndDots();

    var idx = 0;
    var timer = null;
    var CARD = 230;
    var GAP = 16;
    var STEP = CARD + GAP;

    function trackWidthPx() {
      var n = carouselExcursoes.length;
      return n * CARD + Math.max(0, n - 1) * GAP;
    }

    function viewportWidthPx() {
      return Math.max(viewport.clientWidth || 0, 1);
    }

    /** Quando todos os cards cabem na área visível, não há “scroll” — só centralizamos a faixa. */
    function fitsEntireTrack() {
      return trackWidthPx() <= viewportWidthPx();
    }

    var MOBILE_SCROLL_MQ =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(max-width: 1023px)")
        : null;

    /** Mesmo breakpoint do CSS (<1024px): scroll horizontal no viewport. */
    function useMobileScroll() {
      var mqOk = MOBILE_SCROLL_MQ ? MOBILE_SCROLL_MQ.matches : viewportWidthPx() < 1024;
      return mqOk && !fitsEntireTrack();
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
    var userDragActive = false;

    function apply(opts) {
      opts = opts || {};
      var smoothScroll = !!opts.smoothScroll;

      if (useMobileScroll()) {
        track.style.transform = "";
        if (!userDragActive && opts.snap !== false) {
          scrollMobileToIndex(idx, smoothScroll);
        }
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
      if (!carouselExcursoes.length) return;
      idx = ((i % carouselExcursoes.length) + carouselExcursoes.length) % carouselExcursoes.length;
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
      if (useMobileScroll()) return;
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

    /** Arrastar horizontal só quando o gesto for claramente lateral; vertical rola a página. */
    var mobileDrag = {
      id: -1,
      startX: 0,
      startY: 0,
      startScroll: 0,
      moved: false,
      axis: null,
    };
    var AXIS_LOCK_PX = 10;

    function resetMobileDrag() {
      mobileDrag = { id: -1, startX: 0, startY: 0, startScroll: 0, moved: false, axis: null };
    }

    function canMobileDrag() {
      return useMobileScroll() && !fitsEntireTrack();
    }

    function finishMobileDrag(e) {
      if (mobileDrag.id !== e.pointerId) return;
      var didMove = mobileDrag.moved;
      var wasHorizontal = mobileDrag.axis === "x";
      resetMobileDrag();
      userDragActive = false;
      viewport.classList.remove("is-dragging");
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* */
      }
      if (!canMobileDrag() || !wasHorizontal) return;
      if (didMove) {
        syncIdxFromViewportScroll();
        scrollMobileToIndex(idx, true);
        viewport.dataset.suppressClick = "1";
        window.setTimeout(function () {
          delete viewport.dataset.suppressClick;
        }, 350);
      }
    }

    viewport.addEventListener(
      "pointerdown",
      function (e) {
        if (!canMobileDrag()) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        mobileDrag = {
          id: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startScroll: viewport.scrollLeft,
          moved: false,
          axis: null,
        };
      },
      true,
    );

    viewport.addEventListener(
      "pointermove",
      function (e) {
        if (mobileDrag.id !== e.pointerId) return;

        var dx = e.clientX - mobileDrag.startX;
        var dy = e.clientY - mobileDrag.startY;

        if (!mobileDrag.axis) {
          if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
          if (Math.abs(dy) >= Math.abs(dx)) {
            resetMobileDrag();
            return;
          }
          mobileDrag.axis = "x";
          userDragActive = true;
          stopAutoplay();
          viewport.classList.add("is-dragging");
          try {
            viewport.setPointerCapture(e.pointerId);
          } catch (err) {
            /* */
          }
        }

        if (mobileDrag.axis !== "x") return;

        e.preventDefault();
        mobileDrag.moved = true;
        var maxL = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        viewport.scrollLeft = Math.max(0, Math.min(mobileDrag.startScroll - dx, maxL));
        if (scrollSyncRaf !== null) return;
        scrollSyncRaf = window.requestAnimationFrame(function () {
          scrollSyncRaf = null;
          syncIdxFromViewportScroll();
        });
      },
      { passive: false },
    );

    viewport.addEventListener("pointerup", finishMobileDrag);
    viewport.addEventListener("pointercancel", finishMobileDrag);

    viewport.addEventListener(
      "click",
      function (e) {
        if (viewport.dataset.suppressClick) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
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

    /** Deslize horizontal no modo transform (telas largas / track maior que o viewport) — trackpad não cobre toque. */
    var swipePtr = { id: -1, startX: 0, locked: false };
    var SWIPE_TH = 48;
    var SWIPE_LOCK = 10;

    function onSwipePtrEnd(e) {
      if (swipePtr.id !== e.pointerId) return;
      var dx = e.clientX - swipePtr.startX;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* */
      }
      var wasLocked = swipePtr.locked;
      swipePtr = { id: -1, startX: 0, locked: false };
      if (useMobileScroll() || fitsEntireTrack()) return;
      if (wasLocked && Math.abs(dx) >= SWIPE_TH) {
        if (dx < 0) {
          go(idx + 1, true, true);
        } else {
          go(idx - 1, true, true);
        }
      }
    }

    viewport.addEventListener(
      "pointerdown",
      function (e) {
        if (useMobileScroll() || fitsEntireTrack()) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.target.closest("button, a")) return;
        swipePtr = { id: e.pointerId, startX: e.clientX, locked: false };
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (err) {
          /* */
        }
      },
      false,
    );

    viewport.addEventListener("pointermove", function (e) {
      if (swipePtr.id !== e.pointerId) return;
      if (!swipePtr.locked && Math.abs(e.clientX - swipePtr.startX) >= SWIPE_LOCK) {
        swipePtr.locked = true;
      }
    });

    viewport.addEventListener("pointerup", onSwipePtrEnd);
    viewport.addEventListener("pointercancel", onSwipePtrEnd);

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

    if (filtersHost) {
      mountExcursaoFilters(filtersHost, s, allExcursoes, function (filters, resultsEl) {
        carouselExcursoes = filterExcursaoList(allExcursoes, filters, s);
        if (resultsEl) resultsEl.textContent = tpl(s.filterResults, { n: carouselExcursoes.length });
        idx = 0;
        renderTrackAndDots();
        apply({ smoothScroll: false });
        restartAutoplay();
      }, locale);
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

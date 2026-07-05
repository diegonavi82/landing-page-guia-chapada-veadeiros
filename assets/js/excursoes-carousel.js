(function () {
  "use strict";

  var GUIA_PROFILE_SLUG = {
    "Diego Navi": "diego-navi",
    "Martina Motlova": "martina-motlova",
  };

  var GUIA_PROFILES_FALLBACK = {
    "diego-navi": {
      slug: "diego-navi",
      nome: "Diego Navi",
      nomeCompleto: "Diego Navi Marques Carvalho",
      foto: "/assets/img/imagens/guia-diego-navi.webp",
      idiomas: ["pt", "en", "es"],
      bio: {
        pt: [
          "Diego Navi Marques Carvalho é analista de sistemas formado pela PUC-Rio, brasileiro naturalizado italiano e pai de um pré-adolescente. Nascido e criado no Rio de Janeiro, decidiu trocar a rotina dos escritórios pela natureza da Chapada dos Veadeiros em 2016, onde encontrou sua verdadeira vocação.",
          "Em 2017, concluiu sua formação como Condutor Local de Visitantes de Ecoturismo da Chapada dos Veadeiros. No mesmo ano, uniu sua experiência na área de tecnologia à paixão pelo turismo de natureza para fundar a Guia Chapada Veadeiros, uma agência virtual criada para orientar visitantes no planejamento de suas viagens, oferecer informações confiáveis sobre os atrativos da região, conectar turistas aos mais experientes guias locais e incentivar um turismo seguro, responsável e de alta qualidade, valorizando a natureza, a cultura e a comunidade da Chapada dos Veadeiros.",
          "Fluente em português, inglês e espanhol, já conduziu dezenas de grupos com segurança e profissionalismo, recebendo visitantes do Brasil e de diversos países. Frequentador da Chapada dos Veadeiros desde 2009, conhece profundamente a região em todas as épocas do ano. Das cachoeiras mais famosas aos recantos menos explorados, domina trilhas, atrativos, logística, condições climáticas e particularidades de cada destino, proporcionando roteiros personalizados, seguros e memoráveis.",
          "Com uma visão que une tecnologia, atendimento de excelência e profundo conhecimento da Chapada dos Veadeiros, Diego dedica-se a transformar cada viagem em uma experiência única. Sua missão é ir além de conduzir visitantes: é compartilhar a essência da Chapada, valorizando sua natureza, cultura e as comunidades locais para que cada viajante viva uma experiência autêntica, segura e inesquecível.",
        ],
        en: [
          "Diego Navi Marques Carvalho is a systems analyst graduated from PUC-Rio, a Brazilian national naturalized as Italian and father of a pre-teen. Born and raised in Rio de Janeiro, he left office life behind for the nature of Chapada dos Veadeiros in 2016, where he found his true calling.",
          "In 2017, he completed his training as a Local Ecotourism Visitor Guide in Chapada dos Veadeiros. That same year, he combined his technology background with his passion for nature tourism to found Guia Chapada Veadeiros, a virtual agency created to help visitors plan their trips, provide reliable information about regional attractions, connect travelers with the most experienced local guides, and promote safe, responsible, high-quality tourism that values the nature, culture and community of Chapada dos Veadeiros.",
          "Fluent in Portuguese, English and Spanish, he has led dozens of groups safely and professionally, welcoming visitors from Brazil and many countries. A regular visitor to Chapada dos Veadeiros since 2009, he knows the region deeply in every season. From the most famous waterfalls to lesser-known spots, he masters trails, attractions, logistics, weather conditions and the specifics of each destination, delivering personalized, safe and memorable itineraries.",
          "With a vision that combines technology, excellent service and deep knowledge of Chapada dos Veadeiros, Diego is dedicated to turning every trip into a unique experience. His mission goes beyond guiding visitors: it is to share the essence of the Chapada, valuing its nature, culture and local communities so that every traveler enjoys an authentic, safe and unforgettable experience.",
        ],
        es: [
          "Diego Navi Marques Carvalho es analista de sistemas graduado por la PUC-Rio, brasileño naturalizado italiano y padre de un preadolescente. Nacido y criado en Río de Janeiro, dejó la rutina de oficina por la naturaleza de la Chapada dos Veadeiros en 2016, donde encontró su verdadera vocación.",
          "En 2017, completó su formación como Conductor Local de Visitantes de Ecoturismo de la Chapada dos Veadeiros. Ese mismo año, unió su experiencia en tecnología con la pasión por el turismo de naturaleza para fundar Guia Chapada Veadeiros, una agencia virtual creada para orientar a los visitantes en la planificación de sus viajes, ofrecer información confiable sobre los atractivos de la región, conectar a los turistas con los guías locales más experimentados e incentivar un turismo seguro, responsable y de alta calidad, valorando la naturaleza, la cultura y la comunidad de la Chapada dos Veadeiros.",
          "Fluido en portugués, inglés y español, ha guiado decenas de grupos con seguridad y profesionalismo, recibiendo visitantes de Brasil y de diversos países. Frecuentador de la Chapada dos Veadeiros desde 2009, conoce profundamente la región en todas las épocas del año. Desde las cascadas más famosas hasta rincones poco explorados, domina senderos, atractivos, logística, condiciones climáticas y particularidades de cada destino, ofreciendo itinerarios personalizados, seguros y memorables.",
          "Con una visión que une tecnología, atención de excelencia y profundo conocimiento de la Chapada dos Veadeiros, Diego se dedica a transformar cada viaje en una experiencia única. Su misión va más allá de conducir visitantes: es compartir la esencia de la Chapada, valorando su naturaleza, cultura y las comunidades locales para que cada viajero viva una experiencia auténtica, segura e inolvidable.",
        ],
      },
    },
    "martina-motlova": {
      slug: "martina-motlova",
      nome: "Martina Motlová",
      nomeCompleto: "Martina Motlová",
      foto: "/assets/img/imagens/guia-martina-motlova.webp",
      idiomas: ["cs", "en", "pt"],
      bio: {
        pt: [
          "Martina Motlová é natural da República Tcheca e vive no Brasil há mais de 15 anos, período em que construiu uma forte conexão com a cultura, a natureza e o povo brasileiro. Guia regional de turismo da América do Sul, é cadastrada no Cadastur e possui ampla experiência no atendimento a viajantes nacionais e internacionais.",
          "Mãe de dois filhos, Martina une sensibilidade, acolhimento e profissionalismo em cada experiência que proporciona. Além de guia de turismo, é professora de yoga e massagista profissional, conhecimentos que complementam sua atuação e oferecem aos visitantes uma vivência mais consciente, equilibrada e conectada com a natureza.",
          "Fluente em tcheco, inglês e português, recebe visitantes de diferentes nacionalidades com atenção aos detalhes, segurança e dedicação.",
        ],
        en: [
          "Martina Motlová is originally from the Czech Republic and has lived in Brazil for over 15 years, a period in which she built a strong connection with Brazilian culture, nature and people. A regional tourism guide in South America, she is registered with Cadastur and has extensive experience serving domestic and international travelers.",
          "A mother of two, Martina brings sensitivity, warmth and professionalism to every experience she provides. In addition to being a tour guide, she is a yoga teacher and professional massage therapist — skills that complement her work and offer visitors a more mindful, balanced experience connected with nature.",
          "Fluent in Czech, English and Portuguese, she welcomes visitors from different countries with attention to detail, safety and dedication.",
        ],
        es: [
          "Martina Motlová es natural de la República Checa y vive en Brasil desde hace más de 15 años, período en el que construyó una fuerte conexión con la cultura, la naturaleza y el pueblo brasileño. Guía regional de turismo de América del Sur, está registrada en Cadastur y tiene amplia experiencia atendiendo a viajeros nacionales e internacionales.",
          "Madre de dos hijos, Martina une sensibilidad, acogida y profesionalismo en cada experiencia que ofrece. Además de guía de turismo, es profesora de yoga y masajista profesional, conocimientos que complementan su trabajo y brindan a los visitantes una vivencia más consciente, equilibrada y conectada con la naturaleza.",
          "Fluida en checo, inglés y portugués, recibe visitantes de distintas nacionalidades con atención al detalle, seguridad y dedicación.",
        ],
      },
    },
  };

  var WA_PHONE = "5562982506891";

  var GUIA_IDIOMAS = {
    "Diego Navi": ["pt", "en", "es"],
    "Martina Motlova": ["cs", "en", "pt"],
  };

  var IDIOMA_FLAG = {
    pt: "br",
    en: "us",
    es: "es",
    cs: "cz",
    ru: "ru",
  };

  var IDIOMA_LABEL = {
    pt: { pt: "Português", en: "Portuguese", es: "Portugués" },
    en: { pt: "Inglês", en: "English", es: "Inglés" },
    es: { pt: "Espanhol", en: "Spanish", es: "Español" },
    cs: { pt: "Tcheco", en: "Czech", es: "Checo" },
    ru: { pt: "Russo", en: "Russian", es: "Ruso" },
  };

  var IDIOMAS_ARIA = {
    pt: "Idiomas",
    en: "Languages",
    es: "Idiomas",
  };

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
        monthName: "June",
        weekday: "Friday",
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
        monthName: "June",
        weekday: "Saturday",
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
        monthName: "June",
        weekday: "Sunday",
        destino: "Parque Nacional",
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
        monthName: "junio",
        weekday: "Viernes",
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
        monthName: "junio",
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
      inclEntries: "Ingresso",
      inclTransport: "Transporte",
      badgeTransport: "Com transporte",
      exclLabel: "Não incluso",
      exclEntries: "Ingresso",
      exclEntriesMany: "Ingressos",
      exclEntry: "Entrada",
      exclTransport: "Transporte",
      exclLunch: "Almoço",
      cta: "Quero participar",
      guiaAbout: "Sobre {{nome}}",
      guiaModalClose: "Fechar",
      guiaModalBack: "Voltar",
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
      filterTransport: "Precisa de transporte?",
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
      inclEntries: "Admission",
      inclTransport: "Transport",
      badgeTransport: "With transport",
      exclLabel: "Not included",
      exclEntries: "Admission",
      exclEntriesMany: "Admissions",
      exclEntry: "Admission",
      exclTransport: "Transport",
      exclLunch: "Lunch",
      cta: "I want to join",
      guiaAbout: "About {{nome}}",
      guiaModalClose: "Close",
      guiaModalBack: "Back",
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
      filterTransport: "Need transport?",
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
      inclEntries: "Entrada",
      inclTransport: "Transporte",
      badgeTransport: "Con transporte",
      exclLabel: "No incluye",
      exclEntries: "Entrada",
      exclEntriesMany: "Entradas",
      exclEntry: "Entrada",
      exclTransport: "Transporte",
      exclLunch: "Almuerzo",
      cta: "Quiero participar",
      guiaAbout: "Acerca de {{nome}}",
      guiaModalClose: "Cerrar",
      guiaModalBack: "Volver",
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
      filterTransport: "¿Necesita transporte?",
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

  function applyPortugueseDestinos(rows, ptRows) {
    if (!Array.isArray(rows) || !Array.isArray(ptRows)) return rows;
    return rows.map(function (row, i) {
      var pt = ptRows[i];
      if (!pt) return row;
      var copy = Object.assign({}, row);
      if (pt.destino) copy.destino = pt.destino;
      if (pt.atrativoPath) copy.atrativoPath = pt.atrativoPath;
      if (pt.destinoSub) copy.destinoSub = pt.destinoSub;
      if (pt.inclEntradas) copy.inclEntradas = pt.inclEntradas;
      if (pt.valorIngresso != null) copy.valorIngresso = pt.valorIngresso;
      if (Array.isArray(pt.destinos) && pt.destinos.length) copy.destinos = pt.destinos;
      return copy;
    });
  }

  var INGRESSO_GRATIS = { pt: "grátis", en: "free", es: "gratis" };

  function ingressoValorPart(valor, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    if (valor == null || valor === "") return INGRESSO_GRATIS[loc];
    var n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) return INGRESSO_GRATIS[loc];
    return "R$ " + n;
  }

  function formatIngressoWithValor(label, valor, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    if (valor == null || valor === "") return String(label);
    var n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) {
      return label + " (" + INGRESSO_GRATIS[loc] + ")";
    }
    return label + " (R$ " + n + ")";
  }

  function formatIngressosMultiplos(destinos, labelPlural, locale) {
    var parts = (destinos || []).map(function (d) {
      return ingressoValorPart(d.valorIngresso, locale);
    });
    if (!parts.length) return String(labelPlural);
    return labelPlural + " (" + parts.join(" + ") + ")";
  }

  function getDestinos(e) {
    if (!e) return [];
    if (Array.isArray(e.destinos) && e.destinos.length) return e.destinos;
    if (e.destino) {
      return [
        {
          destino: e.destino,
          cardImg: e.cardImg,
          atrativoPath: e.atrativoPath,
          valorIngresso: e.valorIngresso,
          destinoSub: e.destinoSub,
        },
      ];
    }
    return [];
  }

  function destinosSpotsCount(e) {
    var n = getDestinos(e).length;
    return Math.min(4, Math.max(1, n));
  }

  function destinosForCard(e) {
    return getDestinos(e).slice(0, 4);
  }

  function destinosSpotsClass(e) {
    return "gcv-excursoes-card--spots-" + destinosSpotsCount(e);
  }

  function isDestinosDuo(e) {
    return destinosSpotsCount(e) > 1;
  }

  function atrativoHrefFrom(path, locale) {
    if (!path || String(path).trim() === "") return "";
    var p = String(path).trim();
    if (locale === "en") return "en/" + p;
    if (locale === "es") return "es/" + p;
    return p;
  }

  function atrativoHref(e, locale) {
    return atrativoHrefFrom(e && e.atrativoPath, locale);
  }

  function cardSpotRowHtml(d, locale) {
    var href = atrativoHrefFrom(d.atrativoPath, locale);
    var imgInner =
      '<div class="gcv-excursoes-card__img-wrap gcv-excursoes-card__spot-img-wrap">' +
      '<img class="gcv-excursoes-card__img" src="' +
      escapeHtml(String(d.cardImg)) +
      '" alt="' +
      escapeHtml(String(d.destino)) +
      '" loading="lazy" decoding="async"></div>';
    var photoInner = href
      ? '<a class="gcv-excursoes-card__atrativo-link gcv-excursoes-card__atrativo-link--img" href="' +
        escapeHtml(href) +
        '">' +
        imgInner +
        "</a>"
      : '<div class="gcv-excursoes-card__atrativo-link--img">' + imgInner + "</div>";
    var label = escapeHtml(String(d.destino));
    var titleMain = href
      ? '<a class="gcv-excursoes-card__atrativo-link" href="' + escapeHtml(href) + '">' + label + "</a>"
      : label;
    var sub = d.destinoSub
      ? '<span class="gcv-excursoes-card__dest-sub">' + escapeHtml(String(d.destinoSub)) + "</span>"
      : "";
    var destMod = sub ? " gcv-excursoes-card__spot-dest--has-sub" : "";
    var title =
      '<h3 class="gcv-excursoes-card__dest gcv-excursoes-card__spot-dest' +
      destMod +
      '">' +
      titleMain +
      sub +
      "</h3>";
    return (
      '<div class="gcv-excursoes-card__spot">' +
      '<div class="gcv-excursoes-card__spot-photo">' +
      photoInner +
      "</div>" +
      title +
      "</div>"
    );
  }

  function cardSpotsBlockHtml(e, locale) {
    var dests = destinosForCard(e);
    var n = destinosSpotsCount(e);
    var inner =
      '<div class="gcv-excursoes-card__spots gcv-excursoes-card__spots--count-' +
      n +
      '" data-spots="' +
      n +
      '">' +
      dests
        .map(function (d) {
          return cardSpotRowHtml(d, locale);
        })
        .join("") +
      "</div>";
    return '<div class="gcv-excursoes-card__media">' + inner + "</div>";
  }

  function cardImgHtml(e, locale) {
    if (!e.cardImg) return "";
    var href = atrativoHref(e, locale);
    var inner =
      '<div class="gcv-excursoes-card__img-wrap"><img class="gcv-excursoes-card__img" src="' +
      escapeHtml(String(e.cardImg)) +
      '" alt="' +
      escapeHtml(String(e.destino)) +
      '" loading="lazy" width="230" height="230"></div>';
    if (!href) return inner;
    return (
      '<a class="gcv-excursoes-card__atrativo-link gcv-excursoes-card__atrativo-link--img" href="' +
      escapeHtml(href) +
      '">' +
      inner +
      "</a>"
    );
  }

  function destSubHtml(e) {
    var sub = e && e.destinoSub;
    if (!sub) return "";
    return (
      '<span class="gcv-excursoes-card__dest-sub">' + escapeHtml(String(sub)) + "</span>"
    );
  }

  function destTitleHtml(e, locale) {
    var label = escapeHtml(String(e.destino));
    var href = atrativoHref(e, locale);
    var sub = destSubHtml(e);
    var main = href
      ? '<a class="gcv-excursoes-card__atrativo-link" href="' + escapeHtml(href) + '">' + label + "</a>"
      : label;
    var destMod = sub ? " gcv-excursoes-card__dest--has-sub" : "";
    return '<h3 class="gcv-excursoes-card__dest' + destMod + '">' + main + sub + "</h3>";
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
      var ptRows = Array.isArray(all.pt) ? all.pt : null;
      var rows = Object.prototype.hasOwnProperty.call(all, loc) ? all[loc] : all.pt;
      if (loc !== "pt" && ptRows) rows = applyPortugueseDestinos(rows, ptRows);
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

  /** Embarque em horário da Chapada (America/Sao_Paulo, UTC-3). */
  var CHAPADA_TZ = "-03:00";

  function excursaoDepartureEpochMs(e) {
    var iso = excursaoDateIso(e);
    var hora = horaExcursao(e);
    var match = String(hora).match(/^(\d{1,2}):(\d{2})$/);
    if (!iso || !match) return NaN;
    return Date.parse(
      iso + "T" + String(match[1]).padStart(2, "0") + ":" + match[2] + ":00" + CHAPADA_TZ,
    );
  }

  function isExcursaoFuture(e, nowMs) {
    var dep = excursaoDepartureEpochMs(e);
    if (!Number.isFinite(dep)) return true;
    return dep > (nowMs != null ? nowMs : Date.now());
  }

  function filterFutureExcursoes(list, nowMs) {
    var now = nowMs != null ? nowMs : Date.now();
    return (list || []).filter(function (e) {
      return isExcursaoFuture(e, now);
    });
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
    var excursionMax = dates[dates.length - 1] || "";
    var dateMin = todayIsoChapada();
    if (excursionMax && compareIso(dateMin, excursionMax) > 0) dateMin = excursionMax;
    return {
      dateMin: dateMin,
      dateMax: excursionMax || dateMin,
      priceMin: prices.length ? prices[0] : 0,
      priceMax: prices.length ? prices[prices.length - 1] : 500,
      embarques: Object.keys(embarques).sort(),
    };
  }

  /** Piso do filtro de período: hoje (só data, sem hora), em horário da Chapada. */
  function dateFilterFloorIso(maxIso) {
    var today = todayIsoChapada();
    if (!maxIso) return today;
    if (compareIso(today, maxIso) > 0) return maxIso;
    return today;
  }

  function clampIsoRangeToFloor(startIso, endIso, maxIso) {
    var floor = dateFilterFloorIso(maxIso);
    var from = startIso || floor;
    var to = endIso || maxIso || floor;
    if (compareIso(from, floor) < 0) from = floor;
    if (compareIso(to, floor) < 0) to = floor;
    if (maxIso && compareIso(to, maxIso) > 0) to = maxIso;
    if (compareIso(from, to) > 0) from = to;
    return { dateFrom: from, dateTo: to };
  }

  function matchesExcursaoFilters(e, f, s) {
    var iso = excursaoDateIso(e);
    var range = clampIsoRangeToFloor(f.dateFrom, f.dateTo, f.dateMax || "");
    if (range.dateFrom && iso && compareIso(iso, range.dateFrom) < 0) return false;
    if (range.dateTo && iso && compareIso(iso, range.dateTo) > 0) return false;
    if (f.embarque && excursaoEmbarque(e, s) !== f.embarque) return false;
    var price = excursaoValor(e);
    if (price < f.priceMin || price > f.priceMax) return false;
    var transportCom = !!f.transportCom;
    var transportSem = !!f.transportSem;
    if (!transportCom && !transportSem) return false;
    if (transportCom && transportSem) {
      /* ambos marcados: mostra todos */
    } else if (transportCom && e.comTransporte !== true) return false;
    else if (transportSem && e.comTransporte === true) return false;
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

  /** Data de hoje em America/Sao_Paulo (YYYY-MM-DD). */
  function todayIsoChapada(nowMs) {
    var now = nowMs != null ? new Date(nowMs) : new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      var y = "";
      var m = "";
      var d = "";
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "year") y = parts[i].value;
        if (parts[i].type === "month") m = parts[i].value;
        if (parts[i].type === "day") d = parts[i].value;
      }
      if (y && m && d) return y + "-" + m + "-" + d;
    } catch (err) {
      /* fallback abaixo */
    }
    return dateToIso(now);
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
    var maxIso = bounds.dateMax;
    var initial = clampIsoRangeToFloor(bounds.dateMin, bounds.dateMax, maxIso);
    var startIso = initial.dateFrom;
    var endIso = initial.dateTo;
    var pickPhase = "start";
    var isOpen = false;
    var viewYear = isoToDate(startIso).getFullYear();
    var viewMonth = isoToDate(startIso).getMonth();

    function applyRangeClamp() {
      var clamped = clampIsoRangeToFloor(startIso, endIso, maxIso);
      startIso = clamped.dateFrom;
      endIso = clamped.dateTo;
    }

    function floorIso() {
      return dateFilterFloorIso(maxIso);
    }

    function syncPrevNav() {
      if (!prevBtn) return;
      var floor = isoToDate(floorIso());
      var canPrev =
        viewYear > floor.getFullYear() ||
        (viewYear === floor.getFullYear() && viewMonth > floor.getMonth());
      prevBtn.disabled = !canPrev;
    }

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
        var disabled =
          compareIso(iso, floorIso()) < 0 || (maxIso && compareIso(iso, maxIso) > 0);
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
      syncPrevNav();
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
      if (compareIso(iso, floorIso()) < 0 || (maxIso && compareIso(iso, maxIso) > 0)) return;
      if (pickPhase === "start") {
        startIso = iso;
        endIso = iso;
        applyRangeClamp();
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
      applyRangeClamp();
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
        applyRangeClamp();
        return { dateFrom: startIso, dateTo: endIso };
      },
      reset: function () {
        var clamped = clampIsoRangeToFloor(floorIso(), maxIso, maxIso);
        startIso = clamped.dateFrom;
        endIso = clamped.dateTo;
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
    transportField.className =
      "gcv-excursoes-filters__field gcv-excursoes-filters__field--transport";
    transportField.innerHTML =
      '<span class="gcv-excursoes-filters__label">' +
      escapeHtml(s.filterTransport) +
      '</span><div class="gcv-excursoes-filters__checks" role="group" aria-label="' +
      escapeHtml(s.filterTransport) +
      '">' +
      '<label class="gcv-excursoes-filters__check gcv-excursoes-filters__check--com">' +
      '<input class="gcv-excursoes-filters__checkbox" type="checkbox" data-gcv-transport-com value="1" />' +
      "<span>" +
      escapeHtml(s.filterTransportWith) +
      "</span></label>" +
      '<label class="gcv-excursoes-filters__check gcv-excursoes-filters__check--sem">' +
      '<input class="gcv-excursoes-filters__checkbox" type="checkbox" data-gcv-transport-sem value="1" checked />' +
      "<span>" +
      escapeHtml(s.filterTransportWithout) +
      "</span></label></div>";

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

    var rowPrimary = document.createElement("div");
    rowPrimary.className = "gcv-excursoes-filters__row gcv-excursoes-filters__row--primary";

    var rowSecondary = document.createElement("div");
    rowSecondary.className = "gcv-excursoes-filters__row gcv-excursoes-filters__row--secondary";

    rowPrimary.appendChild(periodField);
    rowPrimary.appendChild(embarqueField);
    rowPrimary.appendChild(statusField);
    rowPrimary.appendChild(transportField);

    rowSecondary.appendChild(priceField);
    rowSecondary.appendChild(spotsField);

    grid.appendChild(rowPrimary);
    grid.appendChild(rowSecondary);

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
    var transportComEl = panel.querySelector("[data-gcv-transport-com]");
    var transportSemEl = panel.querySelector("[data-gcv-transport-sem]");
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
      var clamped = clampIsoRangeToFloor(range.dateFrom, range.dateTo, bounds.dateMax);
      return {
        dateFrom: clamped.dateFrom,
        dateTo: clamped.dateTo,
        dateMax: bounds.dateMax,
        embarque: embarqueEl ? embarqueEl.value : "",
        priceMin: priceMinEl ? parseInt(String(priceMinEl.value), 10) : bounds.priceMin,
        priceMax: priceMaxEl ? parseInt(String(priceMaxEl.value), 10) : bounds.priceMax,
        transportCom: transportComEl ? transportComEl.checked : false,
        transportSem: transportSemEl ? transportSemEl.checked : true,
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
      if (transportComEl) transportComEl.checked = false;
      if (transportSemEl) transportSemEl.checked = true;
      if (statusEl) statusEl.value = "";
      if (spotsMinEl) spotsMinEl.value = "1";
      if (spotsMaxEl) spotsMaxEl.value = "9";
      emit();
    }

    function onTransportCheckChange(changedEl) {
      if (!transportComEl || !transportSemEl) return;
      if (!transportComEl.checked && !transportSemEl.checked) {
        changedEl.checked = true;
        return;
      }
      emit();
    }

    if (transportComEl) {
      transportComEl.addEventListener("change", function () {
        onTransportCheckChange(transportComEl);
      });
    }
    if (transportSemEl) {
      transportSemEl.addEventListener("change", function () {
        onTransportCheckChange(transportSemEl);
      });
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

  function guiaFlagsLimitedHtml(codes, locale, flagClass) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var max = 3;
    var shown = codes.slice(0, max);
    var html = shown
      .map(function (c) {
        var cc = IDIOMA_FLAG[c] || "";
        if (!cc) return "";
        var title = (IDIOMA_LABEL[c] && IDIOMA_LABEL[c][loc]) || c;
        return (
          '<span class="fi fi-' +
          cc +
          " " +
          flagClass +
          '" title="' +
          escapeHtml(title) +
          '" aria-hidden="true"></span>'
        );
      })
      .join("");
    if (codes.length > max) {
      html += '<span class="gcv-excursoes-card__guide-flag-more" aria-hidden="true">...</span>';
    }
    return html;
  }

  function guiaLangsHtml(nome, locale) {
    var codes = GUIA_IDIOMAS[nome];
    if (!codes || !codes.length) return "";
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var labels = codes.map(function (c) {
      return (IDIOMA_LABEL[c] && IDIOMA_LABEL[c][loc]) || c;
    });
    var aria = (IDIOMAS_ARIA[loc] || IDIOMAS_ARIA.pt) + ": " + labels.join(", ");
    var flags = guiaFlagsLimitedHtml(codes, locale, "gcv-excursoes-card__guide-flag");
    return (
      '<span class="gcv-excursoes-card__guide-langs" role="img" aria-label="' +
      escapeHtml(aria) +
      '">' +
      '<i class="ti ti-message-language gcv-excursoes-card__guide-langs-icon" aria-hidden="true"></i>' +
      flags +
      "</span>"
    );
  }

  function guiaChipInnerHtml(nome, foto, locale, altInPhoto) {
    var langs = guiaLangsHtml(nome, locale);
    var info =
      '<div class="gcv-excursoes-card__guide-info">' +
      '<span class="gcv-excursoes-card__guide-label">Guia</span>' +
      '<span class="gcv-excursoes-card__guide-name">' +
      escapeHtml(nome) +
      "</span>" +
      langs +
      "</div>";
    if (foto) {
      return (
        '<img class="gcv-excursoes-card__guide-photo" src="' +
        escapeHtml(foto) +
        '" alt="' +
        (altInPhoto ? escapeHtml(altInPhoto) : "") +
        '" loading="lazy" width="230" height="90">' +
        info
      );
    }
    return (
      '<div class="gcv-excursoes-card__guide-icon"><i class="ti ti-user" aria-hidden="true"></i></div>' + info
    );
  }

  function guiaChipHtml(e, locale, s) {
    var nome = e && e.guiaNome ? String(e.guiaNome) : null;
    if (!nome) return "";
    var foto = e.guiaFoto ? String(e.guiaFoto) : null;
    var slug = GUIA_PROFILE_SLUG[nome];
    if (slug) {
      return (
        '<button type="button" class="gcv-excursoes-card__guide gcv-excursoes-card__guide--btn" data-guia-profile="' +
        escapeHtml(slug) +
        '" aria-label="' +
        escapeHtml(tpl(s.guiaAbout, { nome: nome })) +
        '">' +
        guiaChipInnerHtml(nome, foto, locale, null) +
        "</button>"
      );
    }
    return (
      '<div class="gcv-excursoes-card__guide">' + guiaChipInnerHtml(nome, foto, locale, nome) + "</div>"
    );
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {Record<string, string>} s
   */
  function ingressoExclItemsHtml(e, s, locale, inclEntradas) {
    if (inclEntradas) return "";
    var dests = getDestinos(e);
    if (dests.length > 1) {
      var multiLabel = escapeHtml(formatIngressosMultiplos(dests, s.exclEntriesMany, locale));
      return '<li><i class="ti ti-ticket text-no" aria-hidden="true"></i> ' + multiLabel + "</li>";
    }
    var ingressoExcl = escapeHtml(formatIngressoWithValor(s.exclEntries, e.valorIngresso, locale));
    return '<li><i class="ti ti-ticket text-no" aria-hidden="true"></i> ' + ingressoExcl + "</li>";
  }

  function inclExclBlocksHtml(e, s, locale) {
    var comTransporte = e.comTransporte === true;
    var inclEntradas = e.inclEntradas === true;
    var ingressoIncl = escapeHtml(formatIngressoWithValor(s.inclEntries, e.valorIngresso, locale));
    var ingressoExclItems = ingressoExclItemsHtml(e, s, locale, inclEntradas);
    var inclItems =
      '<li><i class="ti ti-user text-ok" aria-hidden="true"></i> ' +
      escapeHtml(s.inclSpot) +
      "</li>" +
      '<li><i class="ti ti-flag text-ok" aria-hidden="true"></i> ' +
      escapeHtml(s.inclGuideShort) +
      "</li>";
    if (inclEntradas) {
      inclItems +=
        '<li><i class="ti ti-ticket text-ok" aria-hidden="true"></i> ' +
        ingressoIncl +
        "</li>";
    }
    if (comTransporte) {
      inclItems +=
        '<li><i class="ti ti-bus text-ok" aria-hidden="true"></i> ' +
        escapeHtml(s.inclTransport) +
        "</li>";
    }
    var exclItems;
    if (comTransporte) {
      exclItems = inclEntradas
        ? '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
          escapeHtml(s.exclLunch) +
          "</li>"
        : ingressoExclItems +
          '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
          escapeHtml(s.exclLunch) +
          "</li>";
    } else {
      var transportLabel = e.badge4x4 ? escapeHtml(s.exclTransport) + " (4×4)" : escapeHtml(s.exclTransport);
      exclItems =
        ingressoExclItems +
        '<li><i class="ti ti-bus text-no" aria-hidden="true"></i> ' +
        transportLabel +
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
    if (isDestinosDuo(e)) mod += " gcv-excursoes-card--multi";
    mod += " " + destinosSpotsClass(e);
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

    var cardImgBlock = cardSpotsBlockHtml(e, locale);

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
      cardImgBlock +
      '<div class="gcv-excursoes-card__price-row">' +
      '<span class="gcv-excursoes-card__price">R$&nbsp;' +
      e.valor +
      "</span>" +
      '<span class="gcv-excursoes-card__per">' +
      escapeHtml(s.perPerson) +
      "</span>" +
      "</div></div>" +
      '<div class="gcv-excursoes-card__body">' +
      guiaChipHtml(e, locale, s) +
      inclExclBlocksHtml(e, s, locale) +
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
      "</a></div></article>"
    );
  }

  function loadGuiaProfiles() {
    var el = document.getElementById("gcv-guia-profiles");
    if (!el) return GUIA_PROFILES_FALLBACK;
    try {
      var data = JSON.parse(el.textContent || "{}");
      if (data && typeof data === "object") return data;
    } catch (err) {
      /* fallback */
    }
    return GUIA_PROFILES_FALLBACK;
  }

  function guiaModalFlagsHtml(idiomas, locale) {
    if (!Array.isArray(idiomas) || !idiomas.length) return "";
    return guiaFlagsLimitedHtml(idiomas, locale, "gcv-guia-modal__flag");
  }

  function ensureGuiaModal() {
    var modal = document.getElementById("gcv-guia-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "gcv-guia-modal";
    modal.className = "gcv-guia-modal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "gcv-guia-modal-title");
    modal.innerHTML =
      '<button type="button" class="gcv-guia-modal__backdrop" data-gcv-guia-close aria-label=""></button>' +
      '<div class="gcv-guia-modal__panel">' +
      '<button type="button" class="gcv-guia-modal__close" data-gcv-guia-close aria-label="">×</button>' +
      '<div class="gcv-guia-modal__hero">' +
      '<img class="gcv-guia-modal__photo" src="" alt="" width="160" height="160" decoding="async">' +
      '<div class="gcv-guia-modal__head">' +
      '<h2 id="gcv-guia-modal-title" class="gcv-guia-modal__name"></h2>' +
      '<p class="gcv-guia-modal__fullname"></p>' +
      '<div class="gcv-guia-modal__langs"></div>' +
      "</div></div>" +
      '<div class="gcv-guia-modal__bio"></div>' +
      "</div>";
    document.body.appendChild(modal);
    return modal;
  }

  function closeGuiaModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    document.documentElement.classList.remove("gcv-guia-modal-open");
    var trigger = modal._gcvGuiaTrigger;
    if (trigger && typeof trigger.focus === "function") {
      try {
        trigger.focus();
      } catch (err) {
        /* */
      }
    }
    modal._gcvGuiaTrigger = null;
  }

  function openGuiaModal(slug, trigger, locale, s, profiles) {
    var profile = profiles[slug];
    if (!profile) return;
    var modal = ensureGuiaModal();
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var bio = (profile.bio && profile.bio[loc]) || (profile.bio && profile.bio.pt) || [];
    var closeLabel = (s && s.guiaModalClose) || "Fechar";

    modal.querySelectorAll("[data-gcv-guia-close]").forEach(function (btn) {
      btn.setAttribute("aria-label", closeLabel);
    });

    var photo = modal.querySelector(".gcv-guia-modal__photo");
    if (photo) {
      photo.src = profile.foto || "";
      photo.alt = profile.nome || "";
    }
    var title = modal.querySelector(".gcv-guia-modal__name");
    if (title) title.textContent = profile.nome || "";
    var full = modal.querySelector(".gcv-guia-modal__fullname");
    if (full) full.textContent = profile.nomeCompleto || "";
    var langs = modal.querySelector(".gcv-guia-modal__langs");
    if (langs) {
      langs.innerHTML =
        '<i class="ti ti-message-language gcv-guia-modal__langs-icon" aria-hidden="true"></i>' +
        guiaModalFlagsHtml(profile.idiomas, locale);
    }
    var bioEl = modal.querySelector(".gcv-guia-modal__bio");
    if (bioEl) {
      var backLabel = (s && s.guiaModalBack) || "Voltar";
      bioEl.innerHTML =
        bio
          .map(function (p) {
            return "<p>" + escapeHtml(String(p)) + "</p>";
          })
          .join("") +
        '<div class="gcv-guia-modal__actions">' +
        '<button type="button" class="gcv-guia-modal__back" data-gcv-guia-close>' +
        '<i class="ti ti-arrow-left" aria-hidden="true"></i> ' +
        escapeHtml(backLabel) +
        "</button></div>";
    }

    modal._gcvGuiaTrigger = trigger || null;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.documentElement.classList.add("gcv-guia-modal-open");
    var closeBtn = modal.querySelector(".gcv-guia-modal__close");
    if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
  }

  function initGuiaProfiles() {
    var profiles = loadGuiaProfiles();
    var modal = ensureGuiaModal();
    var section = document.getElementById("excursoes-junho");
    var locale = section ? detectLocale(section) : detectLocale(document.documentElement);
    var s = STRINGS[locale] || STRINGS.pt;

    if (!modal._gcvGuiaBound) {
      modal._gcvGuiaBound = true;
      modal.addEventListener("click", function (e) {
        if (e.target.closest("[data-gcv-guia-close]")) {
          closeGuiaModal(modal);
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
          closeGuiaModal(modal);
        }
      });
      document.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-guia-profile]");
        if (!btn) return;
        var sec = btn.closest("#excursoes-junho");
        var loc = sec ? detectLocale(sec) : locale;
        var strings = STRINGS[loc] || STRINGS.pt;
        var slug = btn.getAttribute("data-guia-profile");
        if (!slug) return;
        e.preventDefault();
        e.stopPropagation();
        openGuiaModal(slug, btn, loc, strings, profiles);
      });
    }
  }

  function init() {
    try {
      initGuiaProfiles();
      bootExcursaoCarousel();
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error("[gcv-excursoes]", err);
    }
  }

  function hideExcursaoSection(root) {
    if (!root) return;
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.style.display = "none";
  }

  function bootExcursaoCarousel() {
    var root = document.getElementById("excursoes-junho");
    if (!root) return;

    var locale = detectLocale(root);
    var s = STRINGS[locale] || STRINGS.pt;
    var fromPayload = loadExcursaoRowsFromPayload(root);
    var ptFallback = EXCURSOES.pt;
    var fallbackRows = EXCURSOES[locale] || ptFallback;
    if (locale !== "pt") fallbackRows = applyPortugueseDestinos(fallbackRows, ptFallback);
    var allExcursoes = filterFutureExcursoes(
      fromPayload && fromPayload.length ? fromPayload : fallbackRows,
    );
    if (!allExcursoes.length) {
      hideExcursaoSection(root);
      return;
    }
    root.removeAttribute("aria-hidden");
    root.style.display = "";
    var carouselExcursoes = allExcursoes.slice();

    var track = root.querySelector(".gcv-excursoes__track");
    var viewport = root.querySelector(".gcv-excursoes__viewport");
    var prev = root.querySelector(".gcv-excursoes__nav--prev");
    var next = root.querySelector(".gcv-excursoes__nav--next");
    var shell = root.querySelector(".gcv-excursoes__shell");
    var filtersHost = root.querySelector("#gcv-excursoes-filters-host");
    var emptyEl = root.querySelector("#gcv-excursoes-filter-empty");

    if (!track || !viewport) return;

    var dotsEl = root.querySelector(".gcv-excursoes__dots");
    if (dotsEl) dotsEl.remove();

    var VISIBLE_PER_PAGE = 4;
    var CARD = 230;
    var GAP = 16;

    function renderTrackOnly() {
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

      var isEmpty = carouselExcursoes.length === 0;
      if (emptyEl) {
        emptyEl.hidden = !isEmpty;
        emptyEl.textContent = isEmpty ? s.filterEmpty : "";
      }
      if (shell) shell.hidden = isEmpty;
    }

    var hasSsrTrack = !!track.querySelector(".gcv-excursoes-card[data-ssr-fallback]");
    if (!hasSsrTrack) {
      renderTrackOnly();
    }

    function cardCount() {
      return track.querySelectorAll(".gcv-excursoes-card").length;
    }

    function trackWidthPx() {
      var sw = track.scrollWidth;
      if (sw > 0) return sw;
      var n = cardCount();
      return n * CARD + Math.max(0, n - 1) * GAP;
    }

    function viewportWidthPx() {
      return Math.max(viewport.clientWidth || 0, 1);
    }

    function maxScrollLeft() {
      return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    }

    function fitsEntireTrack() {
      return trackWidthPx() <= viewportWidthPx() + 1;
    }

    function canScrollTrack() {
      return !fitsEntireTrack() && cardCount() > 1;
    }

    function firstVisibleCardIndex() {
      var cards = track.querySelectorAll(".gcv-excursoes-card");
      var sl = viewport.scrollLeft;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].offsetLeft + cards[i].offsetWidth > sl + 0.5) return i;
      }
      return Math.max(0, cards.length - 1);
    }

    function maxPageStart() {
      return Math.max(0, cardCount() - VISIBLE_PER_PAGE);
    }

    function scrollToCardIndex(startIdx, smooth) {
      var cards = track.querySelectorAll(".gcv-excursoes-card");
      var el = cards[startIdx];
      if (!el) return;
      var target = Math.max(0, Math.min(el.offsetLeft, maxScrollLeft()));
      try {
        viewport.scrollTo({
          left: target,
          behavior: smooth ? "smooth" : "auto",
        });
      } catch (err) {
        viewport.scrollLeft = target;
      }
    }

    function syncNavButtons() {
      var hide = !canScrollTrack();
      var first = firstVisibleCardIndex();
      var atStart = viewport.scrollLeft <= 1;
      var atEnd = first >= maxPageStart() || viewport.scrollLeft >= maxScrollLeft() - 1;
      if (prev) {
        prev.hidden = hide;
        prev.setAttribute("aria-hidden", hide ? "true" : "false");
        prev.disabled = hide || atStart;
      }
      if (next) {
        next.hidden = hide;
        next.setAttribute("aria-hidden", hide ? "true" : "false");
        next.disabled = hide || atEnd;
      }
    }

    function syncCarouselUi() {
      track.style.transform = "";
      syncNavButtons();
    }

    function arrowNext() {
      if (!canScrollTrack()) return;
      var first = firstVisibleCardIndex();
      var nextStart = Math.min(first + VISIBLE_PER_PAGE, maxPageStart());
      if (nextStart === first) return;
      scrollToCardIndex(nextStart, true);
    }

    function arrowPrev() {
      if (!canScrollTrack()) return;
      var first = firstVisibleCardIndex();
      var prevStart = Math.max(first - VISIBLE_PER_PAGE, 0);
      if (prevStart === first && viewport.scrollLeft <= 1) return;
      scrollToCardIndex(prevStart, true);
    }

    if (prev) {
      prev.addEventListener("click", function () {
        arrowPrev();
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        arrowNext();
      });
    }

    var scrollSyncRaf = null;
    viewport.addEventListener(
      "scroll",
      function () {
        if (!canScrollTrack()) return;
        if (scrollSyncRaf !== null) return;
        scrollSyncRaf = window.requestAnimationFrame(function () {
          scrollSyncRaf = null;
          syncNavButtons();
        });
      },
      { passive: true },
    );

    /** Arrastar livre (mouse, touch e caneta) — sem encaixe em nós fixos. */
    var trackDrag = {
      id: -1,
      startX: 0,
      startY: 0,
      startScroll: 0,
      moved: false,
      axis: null,
    };
    var AXIS_LOCK_PX = 10;

    function resetTrackDrag() {
      trackDrag = { id: -1, startX: 0, startY: 0, startScroll: 0, moved: false, axis: null };
    }

    function canDrag() {
      return canScrollTrack();
    }

    function finishTrackDrag(e) {
      if (trackDrag.id !== e.pointerId) return;
      var didMove = trackDrag.moved;
      var wasHorizontal = trackDrag.axis === "x";
      resetTrackDrag();
      viewport.classList.remove("is-dragging");
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* */
      }
      if (!canDrag() || !wasHorizontal) return;
      if (didMove) {
        syncNavButtons();
        viewport.dataset.suppressClick = "1";
        window.setTimeout(function () {
          delete viewport.dataset.suppressClick;
        }, 350);
      }
    }

    viewport.addEventListener(
      "pointerdown",
      function (e) {
        if (!canDrag()) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        trackDrag = {
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
        if (trackDrag.id !== e.pointerId) return;

        var dx = e.clientX - trackDrag.startX;
        var dy = e.clientY - trackDrag.startY;

        if (!trackDrag.axis) {
          if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
          if (Math.abs(dy) >= Math.abs(dx)) {
            resetTrackDrag();
            return;
          }
          trackDrag.axis = "x";
          viewport.classList.add("is-dragging");
          try {
            viewport.setPointerCapture(e.pointerId);
          } catch (err) {
            /* */
          }
        }

        if (trackDrag.axis !== "x") return;

        e.preventDefault();
        trackDrag.moved = true;
        var maxL = maxScrollLeft();
        viewport.scrollLeft = Math.max(0, Math.min(trackDrag.startScroll - dx, maxL));
        if (scrollSyncRaf !== null) return;
        scrollSyncRaf = window.requestAnimationFrame(function () {
          scrollSyncRaf = null;
          syncNavButtons();
        });
      },
      { passive: false },
    );

    viewport.addEventListener("pointerup", finishTrackDrag);
    viewport.addEventListener("pointercancel", finishTrackDrag);

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

    window.addEventListener(
      "resize",
      function () {
        syncCarouselUi();
      },
      { passive: true },
    );

    function kick() {
      syncCarouselUi();
    }

    if (filtersHost) {
      mountExcursaoFilters(filtersHost, s, allExcursoes, function (filters, resultsEl) {
        carouselExcursoes = filterExcursaoList(allExcursoes, filters, s);
        if (resultsEl) resultsEl.textContent = tpl(s.filterResults, { n: carouselExcursoes.length });
        renderTrackOnly();
        viewport.scrollLeft = 0;
        syncCarouselUi();
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

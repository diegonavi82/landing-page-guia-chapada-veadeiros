(function () {
  "use strict";

  var GUIA_PROFILE_SLUG = {
    "Diego Navi": "diego-navi",
    "Martina Motlová": "martina-motlova",
    "Gyovanna Torres": "gyovanna-torres",
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
    "gyovanna-torres": {
      slug: "gyovanna-torres",
      nome: "Gyovanna Torres",
      nomeCompleto: "Gyovanna Torres",
      foto: "/assets/img/imagens/guia-gyovanna-torres.png",
      idiomas: ["pt"],
      bio: {
        pt: [
          "Gyovanna Torres é guia local de ecoturismo na Chapada dos Veadeiros, com experiência em trilhas, cachoeiras e mirantes da região de Alto Paraíso e entorno.",
          "Conduz grupos com atenção à segurança, ao ritmo dos visitantes e ao respeito à natureza, compartilhando histórias e orientações práticas ao longo do passeio.",
          "Fala português.",
        ],
        en: [
          "Gyovanna Torres is a local ecotourism guide in Chapada dos Veadeiros, experienced in trails, waterfalls and viewpoints around Alto Paraíso and the surrounding area.",
          "She leads groups with a focus on safety, a comfortable pace and respect for nature, sharing stories and practical guidance throughout the tour.",
          "Speaks Portuguese.",
        ],
        es: [
          "Gyovanna Torres es guía local de ecoturismo en la Chapada dos Veadeiros, con experiencia en senderos, cascadas y miradores en la región de Alto Paraíso y alrededores.",
          "Conduce grupos con atención a la seguridad, al ritmo de los visitantes y al respeto por la naturaleza, compartiendo historias y orientaciones prácticas durante el paseo.",
          "Habla portugués.",
        ],
      },
    },
  };

  var WA_PHONE = "5562982506891";

  var GUIA_IDIOMAS = {
    "Diego Navi": ["pt", "en", "es"],
    "Martina Motlová": ["cs", "en", "pt"],
    "Gyovanna Torres": ["pt"],
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
  /** Reserva só com mais de 2 h até o embarque (horário Chapada). */
  var BOOKING_CUTOFF_MS = 2 * 60 * 60 * 1000;
  /** Janela para concluir pagamento Pix após abrir o QR. */
  var PIX_PAY_WINDOW_MS = 8 * 60 * 1000;

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
      statusSoldOut: "Lotado",
      statusWait: "⏳ Em formação",
      pixBtnAria: "Pagar {{valor}} com Pix",
      pixModalTitle: "Pagamento via Pix",
      pixModalScan: "Escaneie o QR Code no app do banco",
      pixModalCopy: "Copiar código Pix",
      pixModalCopied: "Código copiado!",
      pixModalClose: "Fechar",
      pixModalHint:
        "Mantenha esta janela aberta. Assim que o Pix for compensado, confirmamos automaticamente e você receberá o código de reserva. Se demorar, envie o comprovante pelo WhatsApp informando o e-mail e o telefone usados aqui.",
      pixModalCancelPolicy:
        "Cancelamento: O pagamento reserva a disponibilidade do guia. Em caso de cancelamento pelo cliente, não haverá reembolso.",
      pixModalRefLabel: "Código de reserva",
      pixModalEmailContinue: "Continuar para o Pix",
      pixModalEmailClear: "Excluir dados",
      pixModalEmailClearHint: "Exclui e-mail e telefone, cancela este Pix e permite informar outros dados.",
      pixPostpayLocked: "Disponível após confirmação do pagamento",
      pixModalGenerating: "Gerando Pix…",
      pixModalWaiting: "Aguardando confirmação do pagamento…",
      pixModalWaitingSub: "Detectamos automaticamente quando o Pix for compensado.",
      pixDevSimulateBtn: "Simular confirmação (localhost)",
      pixDevSimulateHint: "Somente em desenvolvimento local — simula o webhook do banco",
      pixBookingRecorded: "Inscrição registrada! As vagas do passeio foram atualizadas.",
      pixBookingSoldOut: "Não há vagas suficientes. O carrossel foi atualizado.",
      toastOk: "Entendi",
      pixModalConfirmedTitle: "Pagamento confirmado!",
      pixModalConfirmedLead: "Sua reserva foi confirmada. Redirecionando…",
      pixModalExpiredTitle: "Tempo expirado",
      pixModalExpiredLead: "O Pix expirou. Gere um novo Pix para continuar.",
      pixModalRegenBtn: "Gerar novo Pix",
      pixModalEmbarque: "Embarque",
      pixModalTime: "Horário",
      pixModalPeople: "Pessoas",
      pixModalPerson: "Pessoa",
      pixModalTimer: "Pague em até {{time}}",
      pixModalExpired: "O prazo de 8 minutos expirou. Gere um novo Pix para pagar.",
      cartItemsExpired: "Passeios fora do prazo foram removidos do carrinho.",
      bookPeople: "Pessoas",
      bookTotal: "Total",
      bookPay: "Pagar com Pix",
      bookAddCart: "Adicionar ao carrinho",
      bookAddedCart: "Adicionado",
      bookQtyMinus: "Menos uma pessoa",
      bookQtyPlus: "Mais uma pessoa",
      bookQtyAria: "Número de pessoas",
      cartTitle: "Carrinho",
      cartEmpty: "Seu carrinho está vazio",
      cartCheckout: "Pagar com PIX",
      cartBack: "Voltar",
      cartRemove: "Remover",
      cartAdded: "Adicionado ao carrinho!",
      cartFabAria: "Ver carrinho de excursões",
      cartFabLabel: "Carrinho",
      cartSelectedBadge: "Selecionado",
      cartUnselectAria: "Remover do carrinho",
      cartClose: "Fechar carrinho",
      cartEmbarqueLabel: "Embarque:",
      cartSeatOne: "Pessoa",
      cartSeatsMany: "Pessoas",
      cartLineTotal: "(total)",
      cartSameDayBlocked: "Você já escolheu um passeio para este dia. Remova-o para escolher outro.",
      inclLabel: "Incluso:",
      inclSpot: "Vaga em Excursão",
      inclGuideShort: "Guia local",
      inclEntries: "Ingresso",
      inclTransport: "Transporte",
      inclLanterna: "Lanterna",
      badgeTransport: "Com transporte",
      exclLabel: "Não incluso:",
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
      filterDateHintEnd: "2º passo: escolha a data final (máx. 30 dias)",
      filterDateHintMaxSpan: "O período da busca pode ter no máximo 30 dias.",
      filterDateNoTrips: "Não há passeios nos dias escolhidos. Escolha outro período.",
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
      filterStatusForming: "Em formação",
      filterSpots: "Vagas disponíveis",
      filterSpotsValue: "{{min}} – {{max}} vagas",
      filterAvailability: "Passeios",
      filterAvailabilityOpen: "Com vagas",
      filterAvailabilityFull: "Lotados",
      filterPriceValue: "R$ {{min}} – R$ {{max}}",
      filterClear: "Limpar filtros",
      filterEmpty: "Não há passeios nos dias escolhidos.",
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
      statusSoldOut: "Sold out",
      statusWait: "⏳ Forming",
      pixBtnAria: "Pay {{valor}} with Pix",
      pixModalTitle: "Pix payment",
      pixModalScan: "Scan the QR code in your banking app",
      pixModalCopy: "Copy Pix code",
      pixModalCopied: "Code copied!",
      pixModalClose: "Close",
      pixModalHint:
        "Keep this window open. We confirm automatically once Pix clears and you'll receive your reservation code. If it takes too long, send your bank receipt via WhatsApp with the email and phone used here.",
      pixModalCancelPolicy:
        "Cancellation: Payment reserves the guide's availability. If the client cancels, no refund will be issued.",
      pixModalRefLabel: "Reservation code",
      pixModalEmailContinue: "Continue to Pix",
      pixModalEmailClear: "Remove details",
      pixModalEmailClearHint: "Removes email and phone, cancels this Pix, and lets you enter new details.",
      pixPostpayLocked: "Available after payment is confirmed",
      pixModalGenerating: "Generating Pix…",
      pixModalWaiting: "Waiting for payment confirmation…",
      pixModalWaitingSub: "We detect automatically when your Pix is received.",
      pixDevSimulateBtn: "Simulate confirmation (localhost)",
      pixDevSimulateHint: "Local development only — simulates the bank webhook",
      pixBookingRecorded: "Booking recorded! Tour spots have been updated.",
      pixBookingSoldOut: "Not enough spots left. The carousel was refreshed.",
      toastOk: "Got it",
      pixModalConfirmedTitle: "Payment confirmed!",
      pixModalConfirmedLead: "Your reservation is confirmed. Redirecting…",
      pixModalExpiredTitle: "Time expired",
      pixModalExpiredLead: "The Pix payment window expired. Generate a new Pix to continue.",
      pixModalRegenBtn: "Generate new Pix",
      pixModalEmbarque: "Meeting point",
      pixModalTime: "Time",
      pixModalPeople: "People",
      pixModalPerson: "person",
      pixModalTimer: "Pay within {{time}}",
      pixModalExpired: "The 8-minute payment window expired. Open Pix again to pay.",
      cartItemsExpired: "Expired tours were removed from your cart.",
      bookPeople: "People",
      bookTotal: "Total",
      bookPay: "Pay with Pix",
      bookAddCart: "Add to cart",
      bookAddedCart: "Added",
      bookQtyMinus: "Remove one person",
      bookQtyPlus: "Add one person",
      bookQtyAria: "Number of people",
      cartTitle: "Cart",
      cartEmpty: "Your cart is empty",
      cartCheckout: "Pay with PIX",
      cartBack: "Back",
      cartRemove: "Remove",
      cartAdded: "Added to cart!",
      cartFabAria: "View excursion cart",
      cartFabLabel: "Cart",
      cartSelectedBadge: "Selected",
      cartUnselectAria: "Remove from cart",
      cartClose: "Close cart",
      cartEmbarqueLabel: "Meeting point:",
      cartSeatOne: "person",
      cartSeatsMany: "people",
      cartLineTotal: "(total)",
      cartSameDayBlocked: "You already chose a tour for this day. Remove it to pick another.",
      inclLabel: "Included:",
      inclSpot: "Excursion spot",
      inclGuideShort: "Local guide",
      inclEntries: "Admission",
      inclTransport: "Transport",
      inclLanterna: "Flashlight",
      badgeTransport: "With transport",
      exclLabel: "Not included:",
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
      filterDateHintEnd: "Step 2: pick end date (max. 30 days)",
      filterDateHintMaxSpan: "The search period can be at most 30 days.",
      filterDateNoTrips: "No departures in the selected dates. Choose another period.",
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
      filterAvailability: "Tours",
      filterAvailabilityOpen: "With spots",
      filterAvailabilityFull: "Sold out",
      filterPriceValue: "R$ {{min}} – R$ {{max}}",
      filterClear: "Clear filters",
      filterEmpty: "No departures in the selected dates.",
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
      statusSoldOut: "Agotado",
      statusWait: "⏳ Formando",
      pixBtnAria: "Pagar {{valor}} con Pix",
      pixModalTitle: "Pago con Pix",
      pixModalScan: "Escanea el código QR en la app del banco",
      pixModalCopy: "Copiar código Pix",
      pixModalCopied: "¡Código copiado!",
      pixModalClose: "Cerrar",
      pixModalHint:
        "Mantén esta ventana abierta. Confirmamos automáticamente cuando el Pix se compense y recibirás el código de reserva. Si tarda, envía el comprobante por WhatsApp con el correo y el teléfono usados aquí.",
      pixModalCancelPolicy:
        "Cancelación: El pago reserva la disponibilidad del guía. En caso de cancelación por parte del cliente, no habrá reembolso.",
      pixModalRefLabel: "Código de reserva",
      pixModalEmailContinue: "Continuar al Pix",
      pixModalEmailClear: "Eliminar datos",
      pixModalEmailClearHint: "Elimina correo y teléfono, cancela este Pix y permite informar otros datos.",
      pixPostpayLocked: "Disponible tras confirmar el pago",
      pixModalGenerating: "Generando Pix…",
      pixModalWaiting: "Esperando confirmación del pago…",
      pixModalWaitingSub: "Detectamos automáticamente cuando se reciba el Pix.",
      pixDevSimulateBtn: "Simular confirmación (localhost)",
      pixDevSimulateHint: "Solo en desarrollo local — simula el webhook del banco",
      pixBookingRecorded: "¡Inscripción registrada! Las plazas del paseo se actualizaron.",
      pixBookingSoldOut: "No hay plazas suficientes. El carrusel se actualizó.",
      toastOk: "Entendido",
      pixModalConfirmedTitle: "¡Pago confirmado!",
      pixModalConfirmedLead: "Tu reserva fue confirmada. Redirigiendo…",
      pixModalExpiredTitle: "Tiempo expirado",
      pixModalExpiredLead: "El Pix expiró. Genera un nuevo Pix para continuar.",
      pixModalRegenBtn: "Generar nuevo Pix",
      pixModalEmbarque: "Embarque",
      pixModalTime: "Horario",
      pixModalPeople: "Personas",
      pixModalPerson: "persona",
      pixModalTimer: "Paga en hasta {{time}}",
      pixModalExpired: "Expiraron los 8 minutos. Genera un nuevo Pix para pagar.",
      cartItemsExpired: "Salidas fuera de plazo fueron quitadas del carrito.",
      bookPeople: "Personas",
      bookTotal: "Total",
      bookPay: "Pagar con Pix",
      bookAddCart: "Añadir al carrito",
      bookAddedCart: "Añadido",
      bookQtyMinus: "Quitar una persona",
      bookQtyPlus: "Añadir una persona",
      bookQtyAria: "Número de personas",
      cartTitle: "Carrito",
      cartEmpty: "Tu carrito está vacío",
      cartCheckout: "Pagar con PIX",
      cartBack: "Volver",
      cartRemove: "Quitar",
      cartAdded: "¡Añadido al carrito!",
      cartFabAria: "Ver carrito de excursiones",
      cartFabLabel: "Carrito",
      cartSelectedBadge: "Seleccionado",
      cartUnselectAria: "Quitar del carrito",
      cartClose: "Cerrar carrito",
      cartEmbarqueLabel: "Embarque:",
      cartSeatOne: "persona",
      cartSeatsMany: "personas",
      cartLineTotal: "(total)",
      cartSameDayBlocked: "Ya elegiste un paseo para este día. Quítalo para elegir otro.",
      inclLabel: "Incluido:",
      inclSpot: "Cupo en excursión",
      inclGuideShort: "Guía local",
      inclEntries: "Entrada",
      inclTransport: "Transporte",
      inclLanterna: "Linterna",
      badgeTransport: "Con transporte",
      exclLabel: "No incluido:",
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
      filterDateHintEnd: "2.º paso: elige la fecha final (máx. 30 días)",
      filterDateHintMaxSpan: "El período de búsqueda puede tener como máximo 30 días.",
      filterDateNoTrips: "No hay paseos en las fechas elegidas. Elige otro período.",
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
      filterStatusForming: "En formación",
      filterSpots: "Plazas disponibles",
      filterSpotsValue: "{{min}} – {{max}} plazas",
      filterAvailability: "Paseos",
      filterAvailabilityOpen: "Con plazas",
      filterAvailabilityFull: "Agotados",
      filterPriceValue: "R$ {{min}} – R$ {{max}}",
      filterClear: "Limpiar filtros",
      filterEmpty: "No hay paseos en las fechas elegidas.",
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
    if (window.GcvExcBookings && typeof window.GcvExcBookings.totalInscritos === "function") {
      return window.GcvExcBookings.totalInscritos(e);
    }
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

  function isExcursaoBookable(e, nowMs) {
    var dep = excursaoDepartureEpochMs(e);
    var now = nowMs != null ? nowMs : Date.now();
    if (!Number.isFinite(dep)) return true;
    return dep > now + BOOKING_CUTOFF_MS;
  }

  function isExcursaoFuture(e, nowMs) {
    return isExcursaoBookable(e, nowMs);
  }

  function filterFutureExcursoes(list, nowMs) {
    var now = nowMs != null ? nowMs : Date.now();
    return (list || []).filter(function (e) {
      return isExcursaoBookable(e, now);
    });
  }

  function sortExcursaoByDeparture(list) {
    return (list || []).slice().sort(function (a, b) {
      return excursaoDepartureEpochMs(a) - excursaoDepartureEpochMs(b);
    });
  }

  function excursaoValor(e) {
    var n = parseInt(String(e && e.valor), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function applyBookingOverlays(rows) {
    if (!rows || !window.GcvExcBookings || typeof window.GcvExcBookings.applyToRows !== "function") {
      return rows;
    }
    return window.GcvExcBookings.applyToRows(rows);
  }

  function getMergedExcursaoRows(root) {
    var rows = loadExcursaoRowsFromPayload(root);
    if (!rows) return null;
    return applyBookingOverlays(rows);
  }

  function normalizeLookupCartId(cartId) {
    if (window.GcvExcBookings && typeof window.GcvExcBookings.normalizeCartId === "function") {
      return window.GcvExcBookings.normalizeCartId(cartId);
    }
    return String(cartId || "").trim().toLowerCase();
  }

  function findBaseExcursaoByCartId(cartId, root) {
    var rows = loadExcursaoRowsFromPayload(root || document.getElementById("excursoes-junho"));
    if (!rows || !cartId) return null;
    var norm = normalizeLookupCartId(cartId);
    for (var i = 0; i < rows.length; i++) {
      if (excursaoCartId(rows[i]) === norm) return rows[i];
    }
    return null;
  }

  function vagasDisponiveisForBase(e) {
    if (window.GcvExcBookings && typeof window.GcvExcBookings.vagasDisponiveis === "function") {
      return window.GcvExcBookings.vagasDisponiveis(e);
    }
    if (e && e.confirmada) return numOrZero(e.vagasRestantes);
    return Math.max(0, grupoMaximoValor(e) - inscritosNoGrupo(e));
  }

  function vagasDisponiveis(e) {
    return vagasDisponiveisForBase(e);
  }

  function buildTripAvailMap(trips) {
    var map = {};
    var root = document.getElementById("excursoes-junho");
    (trips || []).forEach(function (trip) {
      var cartId = normalizeLookupCartId(trip && trip.cartId);
      if (!cartId || map[cartId] != null) return;
      var base = findBaseExcursaoByCartId(cartId, root);
      map[cartId] = base ? vagasDisponiveisForBase(base) : 0;
    });
    return map;
  }

  function validatePixTripQty(trips) {
    var avail = buildTripAvailMap(trips);
    for (var i = 0; i < (trips || []).length; i++) {
      var trip = trips[i];
      var cartId = normalizeLookupCartId(trip && trip.cartId);
      var qty = Math.max(0, parseInt(String(trip && trip.qty), 10) || 0);
      if (!cartId || qty < 1) continue;
      if (qty > numOrZero(avail[cartId])) return false;
    }
    return true;
  }

  function commitPixBookings(modal, locale) {
    if (!modal || !modal._gcvReceiptData || !window.GcvExcBookings) return false;
    var trips = modal._gcvReceiptData.trips || [];
    if (!trips.length) return false;
    if (!validatePixTripQty(trips)) return false;
    var reservationId =
      modal._gcvPixReservationId || (modal._gcvReceiptData && modal._gcvReceiptData.reservationId);
    var avail = buildTripAvailMap(trips);
    var result;
    if (typeof window.GcvExcBookings.recordTripsForReservation === "function") {
      result = window.GcvExcBookings.recordTripsForReservation(reservationId, trips, avail);
    } else {
      result = window.GcvExcBookings.recordTrips(trips, avail);
    }
    if (!result || !result.ok) return false;
    refreshExcursaoCarouselNow();
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var strings = STRINGS[loc] || STRINGS.pt;
    showExcToast(strings.pixBookingRecorded, "success");
    return true;
  }

  function showExcToast(msg, variant) {
    if (!msg) return;
    if (window.GcvExcToast && typeof window.GcvExcToast.show === "function") {
      window.GcvExcToast.show(msg, { variant: variant || "success" });
      return;
    }
    /* fallback mínimo */
    window.alert(msg);
  }

  /** Período máximo selecionável na busca (dias). O calendário pode ir até a última saída. */
  var FILTER_DATE_WINDOW_DAYS = 30;

  function addDaysToIso(iso, days) {
    var d = isoToDate(iso);
    d.setDate(d.getDate() + days);
    return dateToIso(d);
  }

  function daysBetweenIso(fromIso, toIso) {
    var a = isoToDate(fromIso).getTime();
    var b = isoToDate(toIso).getTime();
    return Math.round((b - a) / 86400000);
  }

  function defaultFilterRangeEnd(floorIso, calendarMaxIso) {
    var end = addDaysToIso(floorIso, FILTER_DATE_WINDOW_DAYS);
    if (calendarMaxIso && compareIso(end, calendarMaxIso) > 0) end = calendarMaxIso;
    if (compareIso(end, floorIso) < 0) end = floorIso;
    return end;
  }

  function scanExcursaoBounds(list, s) {
    var dates = [];
    var prices = [];
    var spots = [];
    var embarques = {};
    (list || []).forEach(function (e) {
      var d = excursaoDateIso(e);
      if (d) dates.push(d);
      prices.push(excursaoValor(e));
      spots.push(vagasDisponiveis(e));
      var em = excursaoEmbarque(e, s);
      if (em) embarques[em] = true;
    });
    dates.sort();
    prices.sort(function (a, b) {
      return a - b;
    });
    spots.sort(function (a, b) {
      return a - b;
    });
    var excursionMax = dates[dates.length - 1] || "";
    var dateMin = todayIsoChapada();
    var dateMax = excursionMax || dateMin;
    if (compareIso(dateMin, dateMax) > 0) dateMax = dateMin;
    var spotsMaxBound = spots.length ? Math.max(spots[spots.length - 1], 1) : 10;
    return {
      dateMin: dateMin,
      dateMax: dateMax,
      priceMin: prices.length ? prices[0] : 0,
      priceMax: prices.length ? prices[prices.length - 1] : 500,
      spotsMin: 0,
      spotsMax: spotsMaxBound,
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
    var ceiling = maxIso || floor;
    var from = startIso || floor;
    var to = endIso || defaultFilterRangeEnd(floor, ceiling);
    if (compareIso(from, floor) < 0) from = floor;
    if (compareIso(to, floor) < 0) to = floor;
    if (compareIso(to, ceiling) > 0) to = ceiling;
    if (compareIso(from, ceiling) > 0) from = ceiling;
    if (compareIso(from, to) > 0) from = to;
    if (daysBetweenIso(from, to) > FILTER_DATE_WINDOW_DAYS) {
      to = addDaysToIso(from, FILTER_DATE_WINDOW_DAYS);
      if (compareIso(to, ceiling) > 0) to = ceiling;
    }
    return { dateFrom: from, dateTo: to };
  }

  function rangeHasExcursionDates(fromIso, toIso, excursionDates) {
    if (!excursionDates || !excursionDates.size) return false;
    var found = false;
    excursionDates.forEach(function (iso) {
      if (found || !iso) return;
      if (compareIso(iso, fromIso) >= 0 && compareIso(iso, toIso) <= 0) found = true;
    });
    return found;
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
    var availOpen = !!f.availabilityOpen;
    var availSoldout = !!f.availabilitySoldout;
    if (!availOpen && !availSoldout) return false;
    if (!(availOpen && availSoldout)) {
      if (availOpen && vagas < 1) return false;
      if (availSoldout && vagas > 0) return false;
    }
    if (!(availSoldout && !availOpen)) {
      if (vagas < f.spotsMin || vagas > f.spotsMax) return false;
    }
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
    var floor = dateFilterFloorIso(maxIso);
    var initial = clampIsoRangeToFloor(
      floor,
      defaultFilterRangeEnd(floor, maxIso),
      maxIso,
    );
    var startIso = initial.dateFrom;
    var endIso = initial.dateTo;
    var pickPhase = "start";
    var pickWarn = "";
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
      var floorDate = isoToDate(floorIso());
      var canPrev =
        viewYear > floorDate.getFullYear() ||
        (viewYear === floorDate.getFullYear() && viewMonth > floorDate.getMonth());
      prevBtn.disabled = !canPrev;
    }

    function syncNextNav() {
      if (!nextBtn) return;
      var ceiling = isoToDate(maxIso || floorIso());
      var canNext =
        viewYear < ceiling.getFullYear() ||
        (viewYear === ceiling.getFullYear() && viewMonth < ceiling.getMonth());
      nextBtn.disabled = !canNext;
    }

    function dayOutsideCalendar(iso) {
      return compareIso(iso, floorIso()) < 0 || (maxIso && compareIso(iso, maxIso) > 0);
    }

    function dayOutsideMaxSpan(iso) {
      if (pickPhase !== "end") return false;
      return Math.abs(daysBetweenIso(startIso, iso)) > FILTER_DATE_WINDOW_DAYS;
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
        if (pickWarn) {
          hintEl.textContent = pickWarn;
          hintEl.classList.add("gcv-exc-datepick__hint--warn");
        } else {
          hintEl.textContent = pickPhase === "start" ? s.filterDateHintStart : s.filterDateHintEnd;
          hintEl.classList.remove("gcv-exc-datepick__hint--warn");
        }
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
        var disabled = dayOutsideCalendar(iso) || dayOutsideMaxSpan(iso);
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
      syncNextNav();
    }

    function closePopover() {
      isOpen = false;
      if (popover) popover.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (root) root.classList.remove("is-open");
    }

    function openPopover() {
      isOpen = true;
      pickWarn = "";
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
      if (dayOutsideCalendar(iso) || dayOutsideMaxSpan(iso)) {
        if (dayOutsideMaxSpan(iso)) {
          pickWarn = s.filterDateHintMaxSpan;
          renderCalendar();
        }
        return;
      }
      if (pickPhase === "start") {
        startIso = iso;
        endIso = iso;
        pickWarn = "";
        pickPhase = "end";
        renderCalendar();
        return;
      }
      var from = startIso;
      var to = iso;
      if (compareIso(to, from) < 0) {
        from = iso;
        to = startIso;
      }
      if (daysBetweenIso(from, to) > FILTER_DATE_WINDOW_DAYS) {
        pickWarn = s.filterDateHintMaxSpan;
        renderCalendar();
        return;
      }
      if (!rangeHasExcursionDates(from, to, excursionDates)) {
        pickWarn = s.filterDateNoTrips;
        renderCalendar();
        return;
      }
      startIso = from;
      endIso = to;
      applyRangeClamp();
      pickWarn = "";
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
        var f = floorIso();
        var clamped = clampIsoRangeToFloor(f, defaultFilterRangeEnd(f, maxIso), maxIso);
        startIso = clamped.dateFrom;
        endIso = clamped.dateTo;
        pickPhase = "start";
        pickWarn = "";
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
        .filter(function (iso) {
          return (
            iso &&
            compareIso(iso, bounds.dateMin) >= 0 &&
            compareIso(iso, bounds.dateMax) <= 0
          );
        }),
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

    var availabilityField = document.createElement("div");
    availabilityField.className =
      "gcv-excursoes-filters__field gcv-excursoes-filters__field--availability";
    availabilityField.innerHTML =
      '<span class="gcv-excursoes-filters__label">' +
      escapeHtml(s.filterAvailability) +
      '</span><div class="gcv-excursoes-filters__checks" role="group" aria-label="' +
      escapeHtml(s.filterAvailability) +
      '">' +
      '<label class="gcv-excursoes-filters__check gcv-excursoes-filters__check--com">' +
      '<input class="gcv-excursoes-filters__checkbox" type="checkbox" data-gcv-availability-open value="1" checked />' +
      "<span>" +
      escapeHtml(s.filterAvailabilityOpen) +
      "</span></label>" +
      '<label class="gcv-excursoes-filters__check gcv-excursoes-filters__check--sem">' +
      '<input class="gcv-excursoes-filters__checkbox" type="checkbox" data-gcv-availability-soldout value="1" />' +
      "<span>" +
      escapeHtml(s.filterAvailabilityFull) +
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
      '<input class="gcv-excursoes-filters__range" type="range" data-gcv-filter="spotsMin" min="0" max="' +
      escapeHtml(String(bounds.spotsMax)) +
      '" aria-label="' +
      escapeHtml(s.filterSpots) +
      ' min" />' +
      '<input class="gcv-excursoes-filters__range" type="range" data-gcv-filter="spotsMax" min="0" max="' +
      escapeHtml(String(bounds.spotsMax)) +
      '" aria-label="' +
      escapeHtml(s.filterSpots) +
      ' max" /></div>';

    var rowPrimary = document.createElement("div");
    rowPrimary.className = "gcv-excursoes-filters__row gcv-excursoes-filters__row--primary";

    var rowSecondary = document.createElement("div");
    rowSecondary.className = "gcv-excursoes-filters__row gcv-excursoes-filters__row--secondary";

    rowPrimary.appendChild(periodField);
    rowPrimary.appendChild(embarqueField);
    rowPrimary.appendChild(statusField);
    rowPrimary.appendChild(availabilityField);
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
    var availabilityOpenEl = panel.querySelector("[data-gcv-availability-open]");
    var availabilitySoldoutEl = panel.querySelector("[data-gcv-availability-soldout]");
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
      spotsMinEl.min = "0";
      spotsMinEl.max = String(bounds.spotsMax);
      spotsMinEl.value = "0";
      spotsMaxEl.min = "0";
      spotsMaxEl.max = String(bounds.spotsMax);
      spotsMaxEl.value = String(bounds.spotsMax);
    }

    function syncAvailabilityUi() {
      var open = availabilityOpenEl ? availabilityOpenEl.checked : true;
      var soldout = availabilitySoldoutEl ? availabilitySoldoutEl.checked : false;
      if (spotsField) {
        spotsField.classList.toggle("gcv-excursoes-filters__field--disabled", soldout && !open);
      }
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
        availabilityOpen: availabilityOpenEl ? availabilityOpenEl.checked : true,
        availabilitySoldout: availabilitySoldoutEl ? availabilitySoldoutEl.checked : false,
        spotsMin: spotsMinEl ? parseInt(String(spotsMinEl.value), 10) : 0,
        spotsMax: spotsMaxEl ? parseInt(String(spotsMaxEl.value), 10) : bounds.spotsMax,
      };
    }

    function emit() {
      syncAvailabilityUi();
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
      if (availabilityOpenEl) availabilityOpenEl.checked = true;
      if (availabilitySoldoutEl) availabilitySoldoutEl.checked = false;
      if (spotsMinEl) spotsMinEl.value = "0";
      if (spotsMaxEl) spotsMaxEl.value = String(bounds.spotsMax);
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

    function onAvailabilityCheckChange(changedEl) {
      if (!availabilityOpenEl || !availabilitySoldoutEl) return;
      if (!availabilityOpenEl.checked && !availabilitySoldoutEl.checked) {
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
    if (availabilityOpenEl) {
      availabilityOpenEl.addEventListener("change", function () {
        onAvailabilityCheckChange(availabilityOpenEl);
      });
    }
    if (availabilitySoldoutEl) {
      availabilitySoldoutEl.addEventListener("change", function () {
        onAvailabilityCheckChange(availabilitySoldoutEl);
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
    var v = vagasDisponiveis(e);
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
    var iso = excursaoDateIso(excursao);
    var year = iso ? iso.slice(0, 4) : "2026";
    var d = String(excursao.dayNum);
    var m = String(excursao.monthName);
    if (locale === "en") return m + " " + d + ", " + year;
    if (locale === "es") return d + " de " + m + " de " + year;
    return d + " de " + m + "/" + year;
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {string} locale
   */
  function excursaoPixDesc(e, locale) {
    var destinos = getDestinos(e);
    var dest =
      destinos
        .map(function (d) {
          return d.destino;
        })
        .join(" + ") || String((e && e.destino) || "");
    var date = e && e.dayNum ? String(e.dayNum) + " " + String(e.monthName) : "";
    var prefix = locale === "en" ? "Tour" : locale === "es" ? "Excursion" : "Excursao";
    return (prefix + " " + date + " - " + dest).trim().slice(0, 73);
  }

  function formatBrlAmount(n) {
    return "R$&nbsp;" + (parseInt(String(n), 10) || 0);
  }

  function excursaoCartId(e) {
    if (window.GcvExcBookings && typeof window.GcvExcBookings.cartIdFromExcursao === "function") {
      return window.GcvExcBookings.cartIdFromExcursao(e);
    }
    var iso = excursaoDateIso(e);
    var destRaw =
      (e && e.cartSlug) ||
      (e && e.destino) ||
      getDestinos(e)
        .map(function (d) {
          return d.destino;
        })
        .join("-") ||
      "excursao";
    var dest = String(destRaw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (iso) return iso + "-" + dest;
    var d = e && e.dayNum != null ? String(e.dayNum) : "0";
    var m =
      e && e.monthName
        ? String(e.monthName)
            .toLowerCase()
            .replace(/\s+/g, "-")
        : "x";
    return d + "-" + m + "-" + dest;
  }

  function excursaoDateLabel(e, locale) {
    return waDateLine(locale, e);
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {Record<string, string>} s
   * @param {string} locale
   */
  function bookingBlockHtml(e, s, locale) {
    var unit = excursaoValor(e);
    var maxQty = Math.max(0, vagasDisponiveis(e));
    var desc = excursaoPixDesc(e, locale);
    var cartId = excursaoCartId(e);
    var dateLabel = excursaoDateLabel(e, locale);
    var destino = String(e.destino || "");
    var disabled = maxQty < 1;

    if (disabled) {
      var waitLabel =
        window.GcvExcWaitlist && typeof window.GcvExcWaitlist.rs === "function"
          ? window.GcvExcWaitlist.rs(locale, "waitlistBtn")
          : "Avise-me se abrir vaga";
      return (
        '<div class="gcv-excursoes-card__book gcv-excursoes-card__book--soldout"' +
        ' data-cart-id="' +
        escapeHtml(cartId) +
        '" data-cart-destino="' +
        escapeHtml(destino) +
        '" data-cart-date="' +
        escapeHtml(dateLabel) +
        '">' +
        '<div class="gcv-excursoes-card__book-row">' +
        '<span class="gcv-excursoes-card__price gcv-excursoes-card__price--soldout">' +
        escapeHtml(s.spotsNone) +
        "</span></div>" +
        '<div class="gcv-excursoes-card__book-actions">' +
        '<button type="button" class="gcv-excursoes-card__waitlist" data-gcv-exc-waitlist>' +
        '<i class="ti ti-bell" aria-hidden="true"></i> ' +
        escapeHtml(waitLabel) +
        "</button></div></div>"
      );
    }

    return (
      '<div class="gcv-excursoes-card__book"' +
      ' data-pix-unit="' +
      escapeHtml(String(unit)) +
      '" data-pix-desc="' +
      escapeHtml(desc) +
      '" data-pix-max="' +
      maxQty +
      '" data-cart-id="' +
      escapeHtml(cartId) +
      '" data-cart-destino="' +
      escapeHtml(destino) +
      '" data-cart-date="' +
      escapeHtml(dateLabel) +
      '">' +
      '<div class="gcv-excursoes-card__book-row">' +
      '<span class="gcv-excursoes-card__book-label">' +
      escapeHtml(s.bookPeople) +
      "</span>" +
      '<div class="gcv-excursoes-card__qty">' +
      '<button type="button" class="gcv-excursoes-card__qty-btn" data-gcv-exc-qty-min aria-label="' +
      escapeHtml(s.bookQtyMinus) +
      '">−</button>' +
      '<input type="number" class="gcv-excursoes-card__qty-input" value="1" min="1" max="' +
      maxQty +
      '" aria-label="' +
      escapeHtml(s.bookQtyAria) +
      '" inputmode="numeric" />' +
      '<button type="button" class="gcv-excursoes-card__qty-btn" data-gcv-exc-qty-plus aria-label="' +
      escapeHtml(s.bookQtyPlus) +
      '">+</button>' +
      "</div>" +
      '<div class="gcv-excursoes-card__book-total">' +
      '<span class="gcv-excursoes-card__book-total-label">' +
      escapeHtml(s.bookTotal) +
      "</span>" +
      '<span class="gcv-excursoes-card__price" data-gcv-exc-total>' +
      formatBrlAmount(unit) +
      "</span></div></div>" +
      '<div class="gcv-excursoes-card__book-actions">' +
      '<button type="button" class="gcv-excursoes-card__cart-add" data-gcv-exc-cart-add>' +
      '<i class="ti ti-shopping-cart" aria-hidden="true"></i> ' +
      escapeHtml(s.bookAddCart) +
      "</button></div></div>"
    );
  }

  function readBookBlock(block) {
    var unit = parseInt(block.getAttribute("data-pix-unit"), 10) || 0;
    var input = block.querySelector(".gcv-excursoes-card__qty-input");
    var e = excursaoFromBookBlock(block);
    var max = e ? Math.max(0, vagasDisponiveis(e)) : parseInt(block.getAttribute("data-pix-max"), 10) || 10;
    block.setAttribute("data-pix-max", String(max));
    if (input) input.max = String(Math.max(1, max));
    var qty = input ? parseInt(input.value, 10) || 1 : 1;
    qty = Math.max(1, Math.min(max, qty));
    if (input) input.value = String(qty);
    return {
      unit: unit,
      qty: qty,
      total: unit * qty,
      desc: block.getAttribute("data-pix-desc") || "",
      cartId: block.getAttribute("data-cart-id") || "",
      destino: block.getAttribute("data-cart-destino") || "",
      dateLabel: block.getAttribute("data-cart-date") || "",
      maxQty: max,
    };
  }

  function updateBookTotal(block) {
    var data = readBookBlock(block);
    var totalEl = block.querySelector("[data-gcv-exc-total]");
    if (totalEl) totalEl.innerHTML = formatBrlAmount(data.total);
    var plusBtn = block.querySelector("[data-gcv-exc-qty-plus]");
    var minBtn = block.querySelector("[data-gcv-exc-qty-min]");
    if (plusBtn) plusBtn.disabled = data.maxQty < 1 || data.qty >= data.maxQty;
    if (minBtn) minBtn.disabled = data.qty <= 1;
    return data;
  }

  function cartItemFromBook(block) {
    var data = readBookBlock(block);
    var root = block.closest("#excursoes-junho");
    var loc = root ? detectLocale(root) : "pt";
    var strings = STRINGS[loc] || STRINGS.pt;
    var e = excursaoFromBookBlock(block);
    var item = {
      id: data.cartId,
      destino: data.destino,
      dateLabel: data.dateLabel,
      valorUnit: data.unit,
      qty: data.qty,
      pixDesc: data.desc,
      maxQty: data.maxQty,
    };
    if (e) {
      item.inclExcl = inclExclLists(e, strings, loc);
      item.embarque = excursaoEmbarque(e, strings);
      item.hora = horaExcursao(e);
      item.departureMs = excursaoDepartureEpochMs(e);
      item.dateIso = excursaoDateIso(e);
      if (e.guiaNome) item.guiaNome = String(e.guiaNome);
    }
    return item;
  }

  function syncCartFromBook(block) {
    if (!block || !window.GcvExcCart || typeof window.GcvExcCart.sync !== "function") return;
    var cartId = block.getAttribute("data-cart-id");
    if (!cartId) return;
    var inCart =
      typeof window.GcvExcCart.items === "function" &&
      window.GcvExcCart.items().some(function (it) {
        return it && it.id === cartId;
      });
    if (!inCart) return;
    window.GcvExcCart.sync(cartItemFromBook(block));
  }

  /**
   * @param {Record<string, unknown>} e
   * @param {Record<string, string>} s
   * @param {string} locale
   */
  function priceRowHtml(e, s, locale) {
    return bookingBlockHtml(e, s, locale);
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

  function ingressoExclLabels(e, s, locale, inclEntradas) {
    if (inclEntradas) return [];
    var dests = getDestinos(e);
    if (dests.length > 1) {
      return [formatIngressosMultiplos(dests, s.exclEntriesMany, locale)];
    }
    return [formatIngressoWithValor(s.exclEntries, e.valorIngresso, locale)];
  }

  function inclExclLists(e, s, locale) {
    var comTransporte = e.comTransporte === true;
    var inclEntradas = e.inclEntradas === true;
    var incl = [s.inclSpot, s.inclGuideShort];
    if (inclEntradas) incl.push(formatIngressoWithValor(s.inclEntries, e.valorIngresso, locale));
    if (comTransporte) incl.push(s.inclTransport);
    if (e.inclLanterna) incl.push(s.inclLanterna);

    var excl;
    if (comTransporte) {
      excl = ingressoExclLabels(e, s, locale, inclEntradas);
      if (e.exclAlmoco !== false) excl.push(s.exclLunch);
    } else {
      excl = ingressoExclLabels(e, s, locale, inclEntradas);
      excl.push(e.badge4x4 ? s.exclTransport + " (4×4)" : s.exclTransport);
      if (e.exclAlmoco !== false) excl.push(s.exclLunch);
    }
    return { incl: incl, excl: excl };
  }

  function excursaoFromBookBlock(block) {
    var card = block && block.closest ? block.closest(".gcv-excursoes-card") : null;
    if (!card) return null;
    var root = block.closest("#excursoes-junho");
    if (!root) return null;
    var rows = getMergedExcursaoRows(root);
    if (!rows || !rows.length) return null;
    var cartId = block.getAttribute("data-cart-id") || card.getAttribute("data-cart-id");
    if (cartId) {
      for (var i = 0; i < rows.length; i++) {
        if (excursaoCartId(rows[i]) === cartId) return rows[i];
      }
    }
    var idx = parseInt(card.getAttribute("data-excursao-index"), 10);
    if (Number.isFinite(idx) && rows[idx]) return rows[idx];
    return null;
  }

  function lookupInclExclByCartId(cartId, locale, s) {
    var root = document.getElementById("excursoes-junho");
    if (!root || !cartId) return null;
    var rows = loadExcursaoRowsFromPayload(root);
    if (!rows) return null;
    for (var i = 0; i < rows.length; i++) {
      if (excursaoCartId(rows[i]) === cartId) return inclExclLists(rows[i], s, locale);
    }
    return null;
  }

  function pixCoverageListHtml(items, included) {
    if (!items || !items.length) return "";
    return items
      .map(function (text) {
        return (
          '<li class="gcv-pix-modal__coverage-item">' +
          '<i class="ti ti-' +
          (included ? "circle-check" : "circle-x") +
          '" aria-hidden="true"></i>' +
          "<span>" +
          escapeHtml(text) +
          "</span></li>"
        );
      })
      .join("");
  }

  function pixCoveragePackHtml(pack, s, showTitle) {
    if (!pack || !pack.inclExcl) return "";
    var lists = pack.inclExcl;
    if (!lists.incl || !lists.incl.length) return "";
    var title =
      showTitle && pack.title
        ? '<p class="gcv-pix-modal__coverage-trip">' + escapeHtml(pack.title) + "</p>"
        : "";
    return (
      '<div class="gcv-pix-modal__coverage-pack">' +
      title +
      '<div class="gcv-pix-modal__coverage-grid">' +
      '<div class="gcv-pix-modal__coverage-block gcv-pix-modal__coverage-block--in">' +
      '<span class="gcv-pix-modal__coverage-label">' +
      escapeHtml(s.inclLabel) +
      "</span>" +
      '<ul class="gcv-pix-modal__coverage-list">' +
      pixCoverageListHtml(lists.incl, true) +
      "</ul></div>" +
      '<div class="gcv-pix-modal__coverage-block gcv-pix-modal__coverage-block--out">' +
      '<span class="gcv-pix-modal__coverage-label">' +
      escapeHtml(s.exclLabel) +
      "</span>" +
      '<ul class="gcv-pix-modal__coverage-list">' +
      pixCoverageListHtml(lists.excl, false) +
      "</ul></div></div></div>"
    );
  }

  function resolvePixCoveragePackages(detail, locale, s) {
    var packages = [];
    if (detail && Array.isArray(detail.packages) && detail.packages.length) {
      packages = detail.packages.map(function (pack) {
        var looked = pack.cartId ? lookupInclExclByCartId(pack.cartId, locale, s) : null;
        return {
          title: pack.title || "",
          cartId: pack.cartId || "",
          // Sempre regenera no idioma atual (o carrinho pode ter textos de outro idioma).
          inclExcl: looked || (pack.inclExcl && pack.inclExcl.incl ? pack.inclExcl : null),
        };
      });
    } else if (detail && detail.inclExcl && detail.inclExcl.incl) {
      packages = [
        {
          title: detail.lines && detail.lines[0] ? detail.lines[0] : "",
          inclExcl: detail.inclExcl,
        },
      ];
    } else if (detail && detail.cartId) {
      var looked = lookupInclExclByCartId(detail.cartId, locale, s);
      if (looked) {
        packages = [
          {
            title: detail.lines && detail.lines[0] ? detail.lines[0] : "",
            inclExcl: looked,
          },
        ];
      }
    }
    if (!packages.length) {
      var fromTrips = resolvePixCoverageFromTrips(detail, locale, s);
      if (fromTrips) {
        packages = [{ title: "", inclExcl: fromTrips }];
      }
    }
    return packages.filter(function (pack) {
      return pack.inclExcl && pack.inclExcl.incl && pack.inclExcl.incl.length;
    });
  }

  function resolvePixCoverageFromTrips(detail, locale, s) {
    if (!detail || !Array.isArray(detail.trips) || !detail.trips.length) return null;
    for (var i = 0; i < detail.trips.length; i++) {
      var trip = detail.trips[i];
      if (trip && trip.cartId) {
        var looked = lookupInclExclByCartId(trip.cartId, locale, s);
        if (looked) return looked;
      }
    }
    return null;
  }

  function renderPixCoverageHtml(detail, locale, s) {
    var packages = resolvePixCoveragePackages(detail, locale, s);
    if (!packages.length) return "";
    var showTitle = packages.length > 1;
    return packages
      .map(function (pack) {
        return pixCoveragePackHtml(pack, s, showTitle);
      })
      .join("");
  }

  function tripMetaFromExcursao(e, s, locale, qty) {
    var dateIso = excursaoDateIso(e);
    var dateLabel = excursaoDateLabel(e, locale);
    return {
      dateLabel: dateLabel,
      dateShort: dateIso
        ? dateIso.slice(8, 10) + "/" + dateIso.slice(5, 7) + "/" + dateIso.slice(0, 4)
        : dateLabel,
      destino: String(e.destino || ""),
      embarque: excursaoEmbarque(e, s),
      hora: horaExcursao(e),
      qty: Math.max(1, parseInt(String(qty), 10) || 1),
      cartId: excursaoCartId(e),
      valorUnit: excursaoValor(e),
      weekday: String((e && e.weekday) || ""),
      dateIso: dateIso,
      dayNum: e && e.dayNum != null ? String(e.dayNum) : "",
      monthName: e && e.monthName ? String(e.monthName) : "",
      guiaNome: e && e.guiaNome ? String(e.guiaNome) : "",
    };
  }

  function enrichTripMeta(trip, locale, s) {
    if (!trip) return null;
    var out = {
      dateLabel: trip.dateLabel || "",
      dateShort: trip.dateShort || "",
      destino: trip.destino || "",
      embarque: trip.embarque || "",
      hora: trip.hora || "",
      qty: Math.max(1, parseInt(String(trip.qty), 10) || 1),
      cartId: trip.cartId || "",
      valorUnit: parseInt(String(trip.valorUnit), 10) || 0,
      weekday: trip.weekday || "",
      dateIso: trip.dateIso || trip.dateISO || "",
      dayNum: trip.dayNum != null ? String(trip.dayNum) : "",
      monthName: trip.monthName || "",
      guiaNome: trip.guiaNome || "",
    };
    var cartId = out.cartId;
    if (!cartId) return out.embarque || out.hora ? out : null;
    var root = document.getElementById("excursoes-junho");
    if (!root) return out.embarque || out.hora ? out : null;
    var rows = loadExcursaoRowsFromPayload(root);
    if (!rows) return out.embarque || out.hora ? out : null;
    for (var i = 0; i < rows.length; i++) {
      if (excursaoCartId(rows[i]) === cartId) {
        if (!out.embarque) out.embarque = excursaoEmbarque(rows[i], s);
        if (!out.hora) out.hora = horaExcursao(rows[i]);
        if (!out.destino) out.destino = String(rows[i].destino || "");
        // Sempre no idioma atual da página (evita misturar EN/PT do carrinho).
        out.dateLabel = excursaoDateLabel(rows[i], locale);
        if (!out.valorUnit) out.valorUnit = excursaoValor(rows[i]);
        if (!out.weekday) out.weekday = String(rows[i].weekday || "");
        if (!out.dateIso) out.dateIso = excursaoDateIso(rows[i]);
        if (!out.dayNum && rows[i].dayNum != null) out.dayNum = String(rows[i].dayNum);
        if (!out.monthName && rows[i].monthName) out.monthName = String(rows[i].monthName);
        if (!out.guiaNome && rows[i].guiaNome) out.guiaNome = String(rows[i].guiaNome);
        if (out.dateIso) {
          out.dateShort =
            out.dateIso.slice(8, 10) + "/" + out.dateIso.slice(5, 7) + "/" + out.dateIso.slice(0, 4);
        }
        break;
      }
    }
    return out.embarque && out.hora ? out : null;
  }

  function resolvePixTrips(detail, locale, s) {
    if (!detail) return [];
    var trips = [];
    if (Array.isArray(detail.trips) && detail.trips.length) {
      trips = detail.trips;
    } else if (Array.isArray(detail.packages) && detail.packages.length) {
      trips = detail.packages.map(function (pack) {
        return {
          dateLabel: pack.dateLabel || "",
          dateShort: pack.dateShort || "",
          destino: pack.destino || "",
          embarque: pack.embarque || "",
          hora: pack.hora || "",
          qty: pack.qty || 1,
          cartId: pack.cartId || "",
          valorUnit: parseInt(String(pack.valorUnit), 10) || 0,
          guiaNome: pack.guiaNome || "",
          dateIso: pack.dateIso || pack.dateISO || "",
          dayNum: pack.dayNum != null ? String(pack.dayNum) : "",
          monthName: pack.monthName || "",
          weekday: pack.weekday || "",
        };
      });
    } else if (detail.cartId || detail.embarque || detail.hora) {
      trips = [
        {
          dateLabel: detail.lines && detail.lines[0] ? "" : "",
          destino: "",
          embarque: detail.embarque || "",
          hora: detail.hora || "",
          qty: detail.qty || 1,
          cartId: detail.cartId || "",
        },
      ];
    }
    return trips
      .map(function (trip) {
        return enrichTripMeta(trip, locale, s);
      })
      .filter(Boolean);
  }

  function resolveTripInclExcl(trip, detail, locale, s) {
    // Preferência: dados vivos no idioma atual (não usar cache do carrinho em outro idioma).
    if (trip && trip.cartId) {
      var looked = lookupInclExclByCartId(trip.cartId, locale, s);
      if (looked && looked.incl && looked.incl.length) return looked;
    }
    if (detail && Array.isArray(detail.packages) && trip && trip.cartId) {
      for (var i = 0; i < detail.packages.length; i++) {
        var pack = detail.packages[i];
        if (pack && pack.cartId === trip.cartId && pack.inclExcl && pack.inclExcl.incl) {
          return pack.inclExcl;
        }
      }
    }
    if (detail && detail.inclExcl && detail.inclExcl.incl) {
      return detail.inclExcl;
    }
    return null;
  }

  function pixTripTagsHtml(inclExcl) {
    if (!inclExcl || !inclExcl.incl || !inclExcl.incl.length) return "";
    var html = "";
    (inclExcl.incl || []).forEach(function (text) {
      html +=
        '<li class="gcv-pix-modal__tag gcv-pix-modal__tag--in">' +
        '<i class="ti ti-check" aria-hidden="true"></i><span>' +
        escapeHtml(text) +
        "</span></li>";
    });
    (inclExcl.excl || []).forEach(function (text) {
      html +=
        '<li class="gcv-pix-modal__tag gcv-pix-modal__tag--out">' +
        '<i class="ti ti-x" aria-hidden="true"></i><span>' +
        escapeHtml(text) +
        "</span></li>";
    });
    return '<ul class="gcv-pix-modal__trip-tags">' + html + "</ul>";
  }

  function formatPixTripSubline(trip, s) {
    var parts = [];
    if (trip.embarque) {
      parts.push((s.pixModalEmbarque || "Embarque") + ": " + trip.embarque);
    }
    if (trip.hora) {
      parts.push(String(trip.hora).replace(":", "h"));
    }
    parts.push(formatPixPeopleCount(trip.qty, s));
    var unit = parseInt(String(trip.valorUnit), 10) || 0;
    var qty = Math.max(1, parseInt(String(trip.qty), 10) || 1);
    if (unit > 0) {
      parts.push("R$ " + (unit * qty));
    }
    return parts.join(" · ");
  }

  function formatPixPeopleCount(qty, s) {
    var n = Math.max(1, parseInt(String(qty), 10) || 1);
    if (n === 1) {
      return "1 " + (s.cartSeatOne || s.pixModalPerson || "Pessoa");
    }
    return String(n) + " " + (s.cartSeatsMany || s.bookPeople || "Pessoas");
  }

  function renderPixTripsHtml(trips, s, locale, detail) {
    if (!trips || !trips.length) return "";
    return trips
      .map(function (trip) {
        var head = [trip.dateLabel, trip.destino].filter(Boolean).join(" · ");
        var sub = formatPixTripSubline(trip, s);
        var inclExcl = resolveTripInclExcl(trip, detail, locale, s);
        var coverageHtml = "";
        if (inclExcl && inclExcl.incl && inclExcl.incl.length) {
          coverageHtml = pixCoveragePackHtml({ inclExcl: inclExcl, title: "" }, s, false);
        }
        return (
          '<article class="gcv-pix-modal__trip">' +
          '<p class="gcv-pix-modal__trip-title">' +
          escapeHtml(head) +
          "</p>" +
          (sub ? '<p class="gcv-pix-modal__trip-sub">' + escapeHtml(sub) + "</p>" : "") +
          coverageHtml +
          "</article>"
        );
      })
      .join("");
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
    if (e.inclLanterna) {
      inclItems +=
        '<li><i class="ti ti-bulb text-ok" aria-hidden="true"></i> ' +
        escapeHtml(s.inclLanterna) +
        "</li>";
    }
    var exclItems;
    if (comTransporte) {
      exclItems = inclEntradas
        ? e.exclAlmoco === false
          ? ""
          : '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
            escapeHtml(s.exclLunch) +
            "</li>"
        : ingressoExclItems +
          (e.exclAlmoco === false
            ? ""
            : '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
              escapeHtml(s.exclLunch) +
              "</li>");
    } else {
      var transportLabel = e.badge4x4 ? escapeHtml(s.exclTransport) + " (4×4)" : escapeHtml(s.exclTransport);
      exclItems =
        ingressoExclItems +
        '<li><i class="ti ti-bus text-no" aria-hidden="true"></i> ' +
        transportLabel +
        "</li>" +
        (e.exclAlmoco === false
          ? ""
          : '<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ' +
            escapeHtml(s.exclLunch) +
            "</li>");
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
    var comTransporte = e.comTransporte === true;
    var vagasAvail = vagasDisponiveis(e);
    var isLotado = vagasAvail < 1;
    var mod = e.confirmada ? "gcv-excursoes-card--confirmada" : "gcv-excursoes-card--pendente";
    if (isLotado) mod += " gcv-excursoes-card--lotado";
    if (comTransporte) mod += " gcv-excursoes-card--transporte";
    if (isDestinosDuo(e)) mod += " gcv-excursoes-card--multi";
    mod += " " + destinosSpotsClass(e);
    var dayNum = e.dayNum ? escapeHtml(String(e.dayNum)) : "—";
    var monthName = escapeHtml(String(e.monthName));
    var hora = horaExcursao(e);
    var dateheroSlot =
      '<div class="gcv-excursoes-card__datehero-slot" data-gcv-exc-datehero-slot>' +
      dateheroTimeHtml(hora) +
      "</div>";

    var cityRow =
      '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--city">' +
      '<div class="gcv-excursoes-card__city-block">' +
      '<span class="gcv-excursoes-card__loc"><i class="ti ti-map-pin" aria-hidden="true"></i> ' +
      escapeHtml(excursaoEmbarque(e, s)) +
      "</span></div></div>";

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
      dateheroSlot +
      "</div>" +
      cityRow +
      "</div>";

    var statusLine =
      '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--status">' +
      (isLotado
        ? '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--full">' +
          escapeHtml(s.statusSoldOut) +
          "</span>"
        : e.confirmada
          ? '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--ok">' +
            escapeHtml(s.statusOk) +
            "</span>"
          : '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--wait">' +
            escapeHtml(s.statusWait) +
            "</span>") +
      capGrupoHtml(e, s) +
      "</div>";

    var metaStack =
      '<div class="gcv-excursoes-card__meta-stack">' + statusLine + "</div>";

    var cardImgBlock = cardSpotsBlockHtml(e, locale);

    var cartId = excursaoCartId(e);

    return (
      '<article class="gcv-excursoes-card ' +
      mod +
      '" data-excursao-index="' +
      idx +
      '" data-cart-id="' +
      escapeHtml(cartId) +
      '" data-excursao-date-iso="' +
      escapeHtml(excursaoDateIso(e)) +
      '" data-excursao-hora="' +
      escapeHtml(hora) +
      '"' +
      (e.confirmada ? ' data-excursao-status="confirmada"' : ' data-excursao-status="formacao"') +
      ' aria-selected="false">' +
      '<div class="gcv-excursoes-card__head">' +
      dateStrip +
      metaStack +
      cardImgBlock +
      "</div>" +
      '<div class="gcv-excursoes-card__body">' +
      guiaChipHtml(e, locale, s) +
      inclExclBlocksHtml(e, s, locale) +
      (comTransporte
        ? '<span class="gcv-excursoes-card__transport-badge"><i class="ti ti-bus" aria-hidden="true"></i> ' +
          escapeHtml(s.badgeTransport) +
          "</span>"
        : "") +
      bookingBlockHtml(e, s, locale) +
      "</div></article>"
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

  function ensurePixModalScrollBody(modal) {
    if (!modal) return;
    var panel = modal.querySelector(".gcv-pix-modal__panel");
    if (!panel || panel.querySelector(".gcv-pix-modal__scroll")) return;

    var closeBtn = panel.querySelector(".gcv-pix-modal__close");
    var legacyBody = panel.querySelector(".gcv-pix-modal__body");
    if (legacyBody) {
      while (legacyBody.firstChild) {
        legacyBody.parentNode.insertBefore(legacyBody.firstChild, legacyBody);
      }
      legacyBody.remove();
    }

    var scroll = document.createElement("div");
    scroll.className = "gcv-pix-modal__scroll";
    var toMove = [];
    Array.prototype.forEach.call(panel.children, function (child) {
      if (child !== closeBtn) toMove.push(child);
    });
    toMove.forEach(function (child) {
      scroll.appendChild(child);
    });
    panel.appendChild(scroll);
  }

  function upgradePixModalPayZone(modal) {
    if (!modal) return;
    var legacyPaid = modal.querySelector("[data-gcv-pix-paid]");
    if (legacyPaid) legacyPaid.remove();
    if (modal.querySelector(".gcv-pix-modal__pay-zone")) return;
    var panel = modal.querySelector(".gcv-pix-modal__panel");
    if (!panel) return;
    var amount = modal.querySelector(".gcv-pix-modal__amount");
    if (!amount) return;
    var zone = document.createElement("div");
    zone.className = "gcv-pix-modal__pay-zone";
    amount.parentNode.insertBefore(zone, amount);
    var moveSelectors = [
      ".gcv-pix-modal__amount",
      "#gcv-pix-modal-timer",
      ".gcv-pix-modal__qr-wrap",
      ".gcv-pix-modal__scan",
      "[data-gcv-pix-copy]",
      "#gcv-pix-modal-waiting",
    ];
    moveSelectors.forEach(function (sel) {
      var el = modal.querySelector(sel);
      if (el && el.parentNode !== zone) zone.appendChild(el);
    });
    hidePixWaitingBlock(modal);
    if (!modal.querySelector("#gcv-pix-modal-success")) {
      var success = document.createElement("div");
      success.id = "gcv-pix-modal-success";
      success.className = "gcv-pix-modal__success";
      success.hidden = true;
      success.innerHTML =
        '<p class="gcv-pix-modal__success-icon" aria-hidden="true"><i class="ti ti-circle-check"></i></p>' +
        '<p class="gcv-pix-modal__success-title"></p>' +
        '<p class="gcv-pix-modal__success-lead"></p>';
      var postpay = modal.querySelector("#gcv-pix-modal-postpay");
      if (postpay) panel.insertBefore(success, postpay);
      else panel.appendChild(success);
    }
  }

  function ensurePixWaitingBlock(modal, s) {
    if (!modal) return null;
    var block = modal.querySelector("#gcv-pix-modal-waiting");
    if (!block) {
      block = document.createElement("div");
      block.id = "gcv-pix-modal-waiting";
      block.className = "gcv-pix-modal__waiting";
      block.setAttribute("role", "status");
      block.setAttribute("aria-live", "polite");
      block.innerHTML =
        '<span class="gcv-pix-modal__waiting-dot" aria-hidden="true"></span>' +
        '<span class="gcv-pix-modal__waiting-text"></span>' +
        '<span class="gcv-pix-modal__waiting-sub"></span>';
      var copyBtn = modal.querySelector("[data-gcv-pix-copy]");
      if (copyBtn && copyBtn.parentNode) {
        copyBtn.parentNode.insertBefore(block, copyBtn.nextSibling);
      } else {
        var zone = modal.querySelector(".gcv-pix-modal__pay-zone");
        if (zone) zone.appendChild(block);
      }
    }
    var locStrings = s || STRINGS[modal._gcvPixLocale || "pt"] || STRINGS.pt;
    var textEl = block.querySelector(".gcv-pix-modal__waiting-text");
    var subEl = block.querySelector(".gcv-pix-modal__waiting-sub");
    if (textEl) textEl.textContent = locStrings.pixModalWaiting || "Aguardando confirmação do pagamento…";
    if (subEl) {
      subEl.textContent = isLocalDevHost()
        ? locStrings.pixDevSimulateHint || locStrings.pixModalWaitingSub || ""
        : locStrings.pixModalWaitingSub || "";
    }
    block.hidden = false;
    ensureDevPixSimulateBtn(modal, locStrings);
    return block;
  }

  function hidePixWaitingBlock(modal) {
    var block = modal && modal.querySelector("#gcv-pix-modal-waiting");
    if (block) block.hidden = true;
    syncDevPixSimulateBtn(modal);
  }

  function isLocalDevHost() {
    if (window.GcvPixPolling && typeof window.GcvPixPolling.isLocalDevHost === "function") {
      return window.GcvPixPolling.isLocalDevHost();
    }
    var host = window.location && window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  function syncDevPixSimulateBtn(modal) {
    if (!modal || !isLocalDevHost()) return;
    var btn = modal.querySelector("[data-gcv-pix-dev-simulate]");
    if (!btn) return;
    var show =
      !!modal._gcvPixCheckoutActive &&
      !modal._gcvPixConfirmed &&
      !modal.classList.contains("gcv-pix-modal--expired");
    btn.hidden = !show;
    btn.disabled = false;
  }

  function ensureDevPixSimulateBtn(modal, s) {
    if (!modal || !isLocalDevHost()) return null;
    var waiting = modal.querySelector("#gcv-pix-modal-waiting");
    if (!waiting) return null;
    var btn = waiting.querySelector("[data-gcv-pix-dev-simulate]");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gcv-pix-modal__dev-simulate";
      btn.setAttribute("data-gcv-pix-dev-simulate", "");
      waiting.appendChild(btn);
    }
    var locStrings = s || STRINGS[modal._gcvPixLocale || "pt"] || STRINGS.pt;
    btn.textContent = locStrings.pixDevSimulateBtn || "Simular confirmação (localhost)";
    btn.title = locStrings.pixDevSimulateHint || "Somente em localhost";
    syncDevPixSimulateBtn(modal);
    return btn;
  }

  function confirmacaoPageUrl(reservationId, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var base = loc === "pt" ? "confirmacao.html" : loc + "/confirmacao.html";
    return base + "?id=" + encodeURIComponent(reservationId || "");
  }

  function ensurePixExpiredBlock(modal, s) {
    if (!modal) return null;
    var block = modal.querySelector("#gcv-pix-modal-expired");
    if (!block) {
      block = document.createElement("div");
      block.id = "gcv-pix-modal-expired";
      block.className = "gcv-pix-modal__success gcv-pix-modal__success--expired";
      block.hidden = true;
      block.innerHTML =
        '<p class="gcv-pix-modal__success-icon" aria-hidden="true"><i class="ti ti-clock-x"></i></p>' +
        '<p class="gcv-pix-modal__success-title"></p>' +
        '<p class="gcv-pix-modal__success-lead"></p>' +
        '<button type="button" class="gcv-pix-modal__paid" data-gcv-pix-regen></button>';
      var success = modal.querySelector("#gcv-pix-modal-success");
      if (success && success.parentNode) {
        success.parentNode.insertBefore(block, success.nextSibling);
      } else {
        modal.querySelector(".gcv-pix-modal__panel").appendChild(block);
      }
    }
    var st = block.querySelector(".gcv-pix-modal__success-title");
    var sl = block.querySelector(".gcv-pix-modal__success-lead");
    var regen = block.querySelector("[data-gcv-pix-regen]");
    if (st) st.textContent = (s && s.pixModalExpiredTitle) || "Tempo expirado";
    if (sl) sl.textContent = (s && s.pixModalExpiredLead) || "";
    if (regen) regen.textContent = (s && s.pixModalRegenBtn) || "Gerar novo Pix";
    return block;
  }

  function getModalReceiptEmail(modal) {
    if (!modal) return "";
    var emailInput = modal.querySelector("#gcv-pix-modal-email");
    return emailInput ? String(emailInput.value || "").trim() : "";
  }

  function getModalEmailInputValue(modal) {
    if (!modal) return "";
    var emailInput = modal.querySelector("#gcv-pix-modal-email");
    return emailInput ? String(emailInput.value || "").trim() : "";
  }

  function getModalPhoneInputValue(modal) {
    if (!modal) return "";
    var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
    return phoneInput ? String(phoneInput.value || "").trim() : "";
  }

  function getModalReceiptPhone(modal) {
    return getModalPhoneInputValue(modal);
  }

  function getModalPhoneIso(modal) {
    if (!modal) return "br";
    var hidden = modal.querySelector("#gcv-pix-modal-phone-ddi");
    var iso = hidden ? String(hidden.value || "").trim().toLowerCase() : "";
    if (window.GcvPixReceipt && typeof window.GcvPixReceipt.findPhoneCountry === "function") {
      return window.GcvPixReceipt.findPhoneCountry(iso || "br").iso;
    }
    return iso || "br";
  }

  function clearPixFieldError(modal, field) {
    if (!modal) return;
    var errId = field === "phone" ? "gcv-pix-modal-phone-error" : "gcv-pix-modal-email-error";
    var errEl = modal.querySelector("#" + errId);
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (field === "phone") {
      var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
      var phoneWrap = modal.querySelector(".gcv-pix-modal__phone-wrap");
      if (phoneInput) {
        phoneInput.classList.remove("is-invalid");
        phoneInput.removeAttribute("aria-invalid");
      }
      if (phoneWrap) phoneWrap.classList.remove("is-invalid");
    } else {
      var emailInput = modal.querySelector("#gcv-pix-modal-email");
      if (emailInput) {
        emailInput.classList.remove("is-invalid");
        emailInput.removeAttribute("aria-invalid");
      }
    }
  }

  function setPixFieldError(modal, field, message) {
    if (!modal) return;
    var errId = field === "phone" ? "gcv-pix-modal-phone-error" : "gcv-pix-modal-email-error";
    var errEl = modal.querySelector("#" + errId);
    if (errEl) {
      errEl.hidden = !message;
      errEl.textContent = message || "";
    }
    if (field === "phone") {
      var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
      var phoneWrap = modal.querySelector(".gcv-pix-modal__phone-wrap");
      if (phoneInput) {
        phoneInput.classList.toggle("is-invalid", !!message);
        if (message) phoneInput.setAttribute("aria-invalid", "true");
        else phoneInput.removeAttribute("aria-invalid");
      }
      if (phoneWrap) phoneWrap.classList.toggle("is-invalid", !!message);
    } else {
      var emailInput = modal.querySelector("#gcv-pix-modal-email");
      if (emailInput) {
        emailInput.classList.toggle("is-invalid", !!message);
        if (message) emailInput.setAttribute("aria-invalid", "true");
        else emailInput.removeAttribute("aria-invalid");
      }
    }
  }

  function validatePixEmailField(modal, options) {
    var opts = options || {};
    var loc = modal._gcvPixLocale || "pt";
    var email = getModalEmailInputValue(modal);
    var msg = "";
    if (window.GcvPixReceipt && typeof window.GcvPixReceipt.emailValidationMessage === "function") {
      msg = window.GcvPixReceipt.emailValidationMessage(email, loc);
    } else if (!email) {
      msg = "Preencha para prosseguir";
    } else if (!window.GcvPixReceipt || !window.GcvPixReceipt.isValidEmail(email)) {
      msg = "E-mail com formato inválido.";
    }
    if (opts.show === false) {
      if (!msg) clearPixFieldError(modal, "email");
      return !msg;
    }
    if (msg) setPixFieldError(modal, "email", msg);
    else clearPixFieldError(modal, "email");
    return !msg;
  }

  function validatePixPhoneField(modal, options) {
    var opts = options || {};
    var loc = modal._gcvPixLocale || "pt";
    var phone = getModalPhoneInputValue(modal);
    var iso = getModalPhoneIso(modal);
    var msg = "";
    if (window.GcvPixReceipt && typeof window.GcvPixReceipt.phoneValidationMessage === "function") {
      msg = window.GcvPixReceipt.phoneValidationMessage(phone, iso, loc);
    } else if (!phone) {
      msg = "Preencha para prosseguir";
    } else if (!window.GcvPixReceipt || !window.GcvPixReceipt.isValidPhone(phone, iso)) {
      msg = "Telefone incompleto — faltam dígitos.";
    }
    if (opts.show === false) {
      if (!msg) clearPixFieldError(modal, "phone");
      return !msg;
    }
    if (msg) setPixFieldError(modal, "phone", msg);
    else clearPixFieldError(modal, "phone");
    return !msg;
  }

  function ensurePixFieldErrorEls(block) {
    if (!block) return;
    if (!block.querySelector("#gcv-pix-modal-email-error")) {
      var emailHint = block.querySelector("#gcv-pix-modal-email-hint");
      var emailErr = document.createElement("p");
      emailErr.className = "gcv-pix-modal__field-error";
      emailErr.id = "gcv-pix-modal-email-error";
      emailErr.setAttribute("role", "alert");
      emailErr.hidden = true;
      if (emailHint && emailHint.parentNode) {
        emailHint.parentNode.insertBefore(emailErr, emailHint.nextSibling);
      } else {
        block.appendChild(emailErr);
      }
    }
    if (!block.querySelector("#gcv-pix-modal-phone-error")) {
      var phoneHint = block.querySelector("#gcv-pix-modal-phone-hint");
      var phoneErr = document.createElement("p");
      phoneErr.className = "gcv-pix-modal__field-error";
      phoneErr.id = "gcv-pix-modal-phone-error";
      phoneErr.setAttribute("role", "alert");
      phoneErr.hidden = true;
      if (phoneHint && phoneHint.parentNode) {
        phoneHint.parentNode.insertBefore(phoneErr, phoneHint.nextSibling);
      } else {
        block.appendChild(phoneErr);
      }
    }
  }

  function positionPixDdiDropdown(modal) {
    if (!modal) return;
    var drop =
      document.getElementById("gcv-pix-modal-ddi-dropdown") ||
      modal.querySelector("#gcv-pix-modal-ddi-dropdown");
    var trigger = modal.querySelector("#gcv-pix-modal-ddi-trigger");
    if (!drop || !trigger || drop.hidden) return;
    var rect = trigger.getBoundingClientRect();
    var width = Math.min(296, Math.max(240, window.innerWidth - 24));
    var left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    var top = rect.bottom + 6;
    var maxH = Math.min(264, window.innerHeight - top - 12);
    if (maxH < 160 && rect.top > 180) {
      top = Math.max(12, rect.top - 6 - Math.min(264, rect.top - 12));
      maxH = Math.min(264, rect.top - 18);
    }
    drop.style.position = "fixed";
    drop.style.top = Math.round(top) + "px";
    drop.style.left = Math.round(left) + "px";
    drop.style.width = Math.round(width) + "px";
    drop.style.maxHeight = Math.round(maxH) + "px";
    drop.style.zIndex = "10080";
    var list = drop.querySelector("#gcv-pix-modal-ddi-list");
    if (list) list.style.maxHeight = Math.max(120, Math.round(maxH - 44)) + "px";
  }

  function renderPixDdiOptions(modal, loc, query) {
    if (!modal || !window.GcvPixReceipt) return;
    var list =
      document.querySelector("#gcv-pix-modal-ddi-list") ||
      modal.querySelector("#gcv-pix-modal-ddi-list");
    if (!list || typeof window.GcvPixReceipt.buildPhoneDdiListHtml !== "function") return;
    list.innerHTML = window.GcvPixReceipt.buildPhoneDdiListHtml(
      loc || modal._gcvPixLocale || "pt",
      getModalPhoneIso(modal),
      query || "",
    );
  }

  function openPixDdiDropdown(modal, loc) {
    if (!modal || modal._gcvPixCheckoutActive || modal._gcvPixConfirmed) return;
    var drop =
      modal.querySelector("#gcv-pix-modal-ddi-dropdown") ||
      document.getElementById("gcv-pix-modal-ddi-dropdown");
    var trigger = modal.querySelector("#gcv-pix-modal-ddi-trigger");
    var search =
      (drop && drop.querySelector("#gcv-pix-modal-ddi-search")) ||
      modal.querySelector("#gcv-pix-modal-ddi-search");
    if (!drop) return;
    function show() {
      if (drop.parentNode !== document.body) {
        document.body.appendChild(drop);
      }
      renderPixDdiOptions(modal, loc || modal._gcvPixLocale || "pt", search ? search.value : "");
      drop.hidden = false;
      drop.setAttribute("aria-hidden", "false");
      if (trigger) trigger.setAttribute("aria-expanded", "true");
      modal.classList.add("gcv-pix-modal--ddi-open");
      positionPixDdiDropdown(modal);
      if (!modal._gcvDdiRepositionBound) {
        modal._gcvDdiRepositionBound = function () {
          if (!modal.classList.contains("gcv-pix-modal--ddi-open")) return;
          positionPixDdiDropdown(modal);
        };
        window.addEventListener("resize", modal._gcvDdiRepositionBound);
        modal.addEventListener("scroll", modal._gcvDdiRepositionBound, true);
      }
      if (search && typeof search.focus === "function") {
        window.setTimeout(function () {
          search.focus();
          search.select();
          positionPixDdiDropdown(modal);
        }, 20);
      }
    }
    if (window.GcvPixReceipt && typeof window.GcvPixReceipt.ensurePhoneCountries === "function") {
      window.GcvPixReceipt.ensurePhoneCountries().then(show);
    } else {
      show();
    }
  }

  function closePixDdiDropdown(modal) {
    if (!modal) return;
    var drop =
      modal.querySelector("#gcv-pix-modal-ddi-dropdown") ||
      document.getElementById("gcv-pix-modal-ddi-dropdown");
    var trigger = modal.querySelector("#gcv-pix-modal-ddi-trigger");
    var prefix = modal.querySelector(".gcv-pix-modal__phone-prefix");
    if (drop) {
      drop.hidden = true;
      drop.setAttribute("aria-hidden", "true");
      drop.style.position = "";
      drop.style.top = "";
      drop.style.left = "";
      drop.style.width = "";
      drop.style.maxHeight = "";
      drop.style.zIndex = "";
      if (prefix && drop.parentNode !== prefix) {
        prefix.appendChild(drop);
      }
    }
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    modal.classList.remove("gcv-pix-modal--ddi-open");
  }

  function syncPixPhoneDdiUi(modal, loc) {
    if (!modal || !window.GcvPixReceipt) return;
    var hidden = modal.querySelector("#gcv-pix-modal-phone-ddi");
    var flag = modal.querySelector("#gcv-pix-modal-phone-flag");
    var dialEl = modal.querySelector("#gcv-pix-modal-phone-dial");
    var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
    var iso = getModalPhoneIso(modal);
    var country = window.GcvPixReceipt.findPhoneCountry(iso);
    if (hidden && hidden.value !== country.iso) hidden.value = country.iso;
    if (flag) {
      flag.className = "fi fi-" + country.iso + " gcv-pix-modal__phone-flag";
      flag.title = window.GcvPixReceipt.phoneCountryLabel
        ? window.GcvPixReceipt.phoneCountryLabel(country, loc || "pt")
        : country.iso.toUpperCase();
    }
    if (dialEl) dialEl.textContent = "+" + country.dial;
    if (phoneInput) {
      phoneInput.placeholder =
        typeof window.GcvPixReceipt.phonePlaceholderFor === "function"
          ? window.GcvPixReceipt.phonePlaceholderFor(country.iso)
          : "(00) 00000-0000";
      phoneInput.setAttribute("maxlength", String(country.max + 6));
      if (phoneInput.value) {
        phoneInput.value = window.GcvPixReceipt.formatPhoneMask(phoneInput.value, country.iso);
      }
    }
    if (typeof window.GcvPixReceipt.savePhoneDdi === "function") {
      window.GcvPixReceipt.savePhoneDdi(country.iso);
    }
    var openDrop =
      document.getElementById("gcv-pix-modal-ddi-dropdown") ||
      modal.querySelector("#gcv-pix-modal-ddi-dropdown");
    if (openDrop && !openDrop.hidden) {
      var searchEl =
        openDrop.querySelector("#gcv-pix-modal-ddi-search") ||
        document.querySelector("#gcv-pix-modal-ddi-search");
      renderPixDdiOptions(modal, loc, searchEl ? searchEl.value : "");
    }
  }

  function setModalPhoneIso(modal, iso, loc) {
    if (!modal) return;
    var hidden = modal.querySelector("#gcv-pix-modal-phone-ddi");
    if (hidden) hidden.value = iso;
    syncPixPhoneDdiUi(modal, loc || modal._gcvPixLocale || "pt");
    closePixDdiDropdown(modal);
    syncPixContinueButton(modal);
  }

  function buildPixPhoneWrapHtml(loc) {
    var selectedIso =
      window.GcvPixReceipt && typeof window.GcvPixReceipt.readSavedPhoneDdi === "function"
        ? window.GcvPixReceipt.readSavedPhoneDdi()
        : "br";
    var country =
      window.GcvPixReceipt && typeof window.GcvPixReceipt.findPhoneCountry === "function"
        ? window.GcvPixReceipt.findPhoneCountry(selectedIso)
        : { iso: "br", dial: "55" };
    var placeholder =
      window.GcvPixReceipt && typeof window.GcvPixReceipt.phonePlaceholderFor === "function"
        ? window.GcvPixReceipt.phonePlaceholderFor(country.iso)
        : "(00) 00000-0000";
    var searchPh =
      loc === "en" ? "Search country or DDI…" : loc === "es" ? "Buscar país o DDI…" : "Buscar país ou DDI…";
    return (
      '<div class="gcv-pix-modal__phone-row">' +
      '<div class="gcv-pix-modal__phone-wrap">' +
      '<div class="gcv-pix-modal__phone-prefix">' +
      '<button type="button" class="gcv-pix-modal__ddi-trigger" id="gcv-pix-modal-ddi-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="gcv-pix-modal-ddi-dropdown">' +
      '<span class="fi fi-' +
      country.iso +
      ' gcv-pix-modal__phone-flag" id="gcv-pix-modal-phone-flag" aria-hidden="true"></span>' +
      '<span class="gcv-pix-modal__phone-dial" id="gcv-pix-modal-phone-dial">+' +
      country.dial +
      '</span><span class="gcv-pix-modal__ddi-caret" aria-hidden="true"></span></button>' +
      '<input type="hidden" id="gcv-pix-modal-phone-ddi" value="' +
      country.iso +
      '" />' +
      '<div class="gcv-pix-modal__ddi-dropdown" id="gcv-pix-modal-ddi-dropdown" hidden aria-hidden="true">' +
      '<input type="search" class="gcv-pix-modal__ddi-search" id="gcv-pix-modal-ddi-search" placeholder="' +
      searchPh +
      '" autocomplete="off" />' +
      '<div class="gcv-pix-modal__ddi-list" id="gcv-pix-modal-ddi-list" role="listbox"></div></div></div>' +
      '<input type="tel" class="gcv-pix-modal__email gcv-pix-modal__phone" id="gcv-pix-modal-phone" required autocomplete="tel-national" inputmode="numeric" maxlength="20" placeholder="' +
      placeholder +
      '" />' +
      "</div>" +
      '<button type="button" class="gcv-pix-modal__email-clear gcv-pix-modal__phone-clear" data-gcv-pix-phone-clear hidden disabled aria-label=""></button>' +
      "</div>"
    );
  }

  function clearPixPayZone(modal) {
    if (!modal) return;
    var copyBtn = modal.querySelector("[data-gcv-pix-copy]");
    if (copyBtn) {
      delete copyBtn.dataset.pixPayload;
      copyBtn.disabled = true;
    }
    var canvas = modal.querySelector(".gcv-pix-modal__qr");
    if (canvas) {
      canvas.style.display = "none";
      try {
        var ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (err) {
        /* */
      }
    }
  }

  function lockPixEmailBlock(modal) {
    if (!modal) return;
    var block = modal.querySelector("#gcv-pix-modal-email-block");
    if (block) block.classList.add("gcv-pix-modal__email-block--locked");
    var emailInput = modal.querySelector("#gcv-pix-modal-email");
    if (emailInput) {
      emailInput.readOnly = true;
      emailInput.disabled = false;
      emailInput.setAttribute("aria-readonly", "true");
    }
    var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
    if (phoneInput) {
      phoneInput.readOnly = true;
      phoneInput.disabled = false;
      phoneInput.setAttribute("aria-readonly", "true");
    }
    closePixDdiDropdown(modal);
    var ddiTrigger = modal.querySelector("#gcv-pix-modal-ddi-trigger");
    if (ddiTrigger) ddiTrigger.disabled = true;
    var continueBtn = modal.querySelector("[data-gcv-pix-email-continue]");
    if (continueBtn) continueBtn.hidden = true;
    modal.querySelectorAll("[data-gcv-pix-email-clear], [data-gcv-pix-phone-clear]").forEach(function (btn) {
      btn.hidden = false;
      btn.disabled = false;
    });
  }

  function unlockPixEmailBlock(modal) {
    if (!modal) return;
    var block = modal.querySelector("#gcv-pix-modal-email-block");
    if (block) block.classList.remove("gcv-pix-modal__email-block--locked");
    var emailInput = modal.querySelector("#gcv-pix-modal-email");
    if (emailInput) {
      emailInput.readOnly = false;
      emailInput.disabled = false;
      emailInput.removeAttribute("aria-readonly");
    }
    var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
    if (phoneInput) {
      phoneInput.readOnly = false;
      phoneInput.disabled = false;
      phoneInput.removeAttribute("aria-readonly");
    }
    var ddiTrigger = modal.querySelector("#gcv-pix-modal-ddi-trigger");
    if (ddiTrigger) ddiTrigger.disabled = false;
    closePixDdiDropdown(modal);
    var continueBtn = modal.querySelector("[data-gcv-pix-email-continue]");
    if (continueBtn) continueBtn.hidden = false;
    modal.querySelectorAll("[data-gcv-pix-email-clear], [data-gcv-pix-phone-clear]").forEach(function (btn) {
      btn.hidden = true;
      btn.disabled = true;
    });
    var emailHint = modal.querySelector("#gcv-pix-modal-email-hint");
    if (emailHint) emailHint.hidden = false;
    var phoneHint = modal.querySelector("#gcv-pix-modal-phone-hint");
    if (phoneHint) phoneHint.hidden = false;
    syncPixContinueButton(modal);
  }

  /** Cancela o Pix gerado e volta à tela de e-mail/telefone. */
  function cancelActivePixCheckout(modal, options) {
    if (!modal || modal._gcvPixConfirmed) return false;
    if (!modal._gcvPixCheckoutActive && !modal._gcvPixReservationId) return false;

    var opts = options || {};
    var clearEmail = !!opts.clearEmail;
    var clearPhone = opts.clearPhone !== undefined ? !!opts.clearPhone : clearEmail;
    var focusField = opts.focusField || (clearEmail ? "email" : clearPhone ? "phone" : "email");
    var pending = modal._gcvPixPendingCheckout;
    var reopen = modal._gcvPixReopen;

    if (window.GcvPixPolling && typeof window.GcvPixPolling.stopPixPolling === "function") {
      window.GcvPixPolling.stopPixPolling();
    }
    clearPixTimer(modal);

    var valor = pending && pending.valor != null ? pending.valor : reopen && reopen.valor;
    var loc = (pending && pending.loc) || (reopen && reopen.locale) || modal._gcvPixLocale || "pt";
    var pixDesc = (pending && pending.pixDesc) || "";
    var receiptData = (pending && pending.receiptData) || modal._gcvReceiptData;

    modal._gcvPixCheckoutActive = false;
    modal._gcvPixPayloadReady = false;
    modal._gcvPixEmailSent = false;
    modal._gcvPixReservationId = null;
    modal._gcvPixCheckoutEmail = "";
    modal._gcvPixCheckoutPhone = "";
    if (modal._gcvReceiptData) {
      modal._gcvReceiptData.code = "";
      modal._gcvReceiptData.email = "";
      modal._gcvReceiptData.phone = "";
    }

    clearPixPayZone(modal);
    unlockPixEmailBlock(modal);

    modal.classList.remove("gcv-pix-modal--checkout-active", "gcv-pix-modal--expired", "gcv-pix-modal--paid");
    modal.classList.add("gcv-pix-modal--await-email");

    modal._gcvPixPendingCheckout = {
      valor: valor,
      loc: loc,
      receiptData: receiptData,
      pixDesc: pixDesc,
    };

    hidePixWaitingBlock(modal);
    var expired = modal.querySelector("#gcv-pix-modal-expired");
    if (expired) expired.hidden = true;
    var success = modal.querySelector("#gcv-pix-modal-success");
    if (success) success.hidden = true;
    var payZone = modal.querySelector(".gcv-pix-modal__pay-zone");
    if (payZone) payZone.hidden = false;
    var scanEl = modal.querySelector(".gcv-pix-modal__scan");
    if (scanEl) scanEl.hidden = false;
    var hintEl = modal.querySelector(".gcv-pix-modal__hint");
    if (hintEl) hintEl.hidden = false;
    var timerEl = modal.querySelector("#gcv-pix-modal-timer");
    if (timerEl) {
      timerEl.hidden = true;
      timerEl.textContent = "";
    }
    var copyBtn = modal.querySelector("[data-gcv-pix-copy]");
    if (copyBtn) {
      var locStrings = STRINGS[loc] || STRINGS.pt;
      copyBtn.textContent = locStrings.pixModalCopy || "Copiar código Pix";
      copyBtn.disabled = true;
    }
    var title = modal.querySelector(".gcv-pix-modal__title");
    if (title && modal._gcvPixTitleDefault) title.textContent = modal._gcvPixTitleDefault;

    var emailInput = modal.querySelector("#gcv-pix-modal-email");
    if (emailInput && clearEmail) emailInput.value = "";
    var phoneInput = modal.querySelector("#gcv-pix-modal-phone");
    if (phoneInput && clearPhone) phoneInput.value = "";
    var statusEl = modal.querySelector("#gcv-pix-modal-email-status");
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
    }
    if (clearEmail) clearPixFieldError(modal, "email");
    if (clearPhone) clearPixFieldError(modal, "phone");
    var emailHint = modal.querySelector("#gcv-pix-modal-email-hint");
    if (emailHint) emailHint.hidden = false;
    var phoneHint = modal.querySelector("#gcv-pix-modal-phone-hint");
    if (phoneHint) phoneHint.hidden = false;

    syncPixRefBlock(modal);
    syncPostpayActions(modal);
    syncDevPixSimulateBtn(modal);
    syncPixContinueButton(modal);

    var focusEl =
      focusField === "phone" ? phoneInput || emailInput : emailInput || phoneInput;
    if (focusEl && typeof focusEl.focus === "function") {
      window.setTimeout(function () {
        focusEl.focus();
      }, 40);
    }
    return true;
  }

  function syncPixRefBlock(modal) {
    if (!modal) return;
    var refBlock = modal.querySelector("#gcv-pix-modal-ref");
    if (!refBlock) return;
    var code =
      modal._gcvPixReservationId ||
      (modal._gcvReceiptData && modal._gcvReceiptData.code) ||
      "";
    var show = !!code;
    refBlock.hidden = !show;
    var refCodeEl = refBlock.querySelector("#gcv-pix-modal-ref-code");
    if (!refCodeEl) return;
    refCodeEl.textContent = show ? code : "";
  }

  function applyPixPayloadToModal(modal, payload, locStrings) {
    if (!modal || !payload) return false;
    var copyBtn = modal.querySelector("[data-gcv-pix-copy]");
    if (copyBtn) {
      copyBtn.textContent = locStrings.pixModalCopy;
      copyBtn.dataset.pixPayload = payload;
      copyBtn.dataset.pixCopyDefault = locStrings.pixModalCopy;
      copyBtn.dataset.pixCopyDone = locStrings.pixModalCopied;
      copyBtn.disabled = false;
    }
    var canvas = modal.querySelector(".gcv-pix-modal__qr");
    if (canvas && window.GcvPix && window.GcvPix.renderQrToCanvas) {
      canvas.style.display = "";
      window.GcvPix.renderQrToCanvas(canvas, payload).catch(function () {
        canvas.style.display = "none";
      });
    }
    return true;
  }

  function buildStaticPixPayload(pending) {
    if (!pending || !window.GcvPix || typeof window.GcvPix.buildPayload !== "function") return "";
    try {
      return window.GcvPix.buildPayload({
        amount: pending.valor,
        description: pending.pixDescWithCode || pending.pixDesc || "",
        txid: pending.txid,
      });
    } catch (err) {
      return "";
    }
  }

  function finalizePixCheckout(modal, s) {
    if (!modal) return false;
    var pending = modal._gcvPixPendingCheckout;
    if (!pending) return false;
    if (modal._gcvPixPayloadReady) return true;

    var reservationCode =
      window.GcvPixReceipt && typeof window.GcvPixReceipt.generateCode === "function"
        ? window.GcvPixReceipt.generateCode()
        : "GCV-" + Date.now().toString(36).slice(-6).toUpperCase();
    var txid =
      window.GcvPixReceipt && typeof window.GcvPixReceipt.pixTxidFromCode === "function"
        ? window.GcvPixReceipt.pixTxidFromCode(reservationCode)
        : reservationCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
    var pixDescWithCode = (reservationCode + " " + (pending.pixDesc || "")).trim().slice(0, 73);
    pending.reservationCode = reservationCode;
    pending.txid = txid;
    pending.pixDescWithCode = pixDescWithCode;
    if (modal._gcvReceiptData) modal._gcvReceiptData.code = reservationCode;
    modal._gcvPixReservationId = reservationCode;

    var locStrings = s || STRINGS[pending.loc] || STRINGS.pt;

    var waBtn = modal.querySelector("[data-gcv-pix-wa]");
    if (waBtn && window.GcvPixReceipt && modal._gcvReceiptData) {
      waBtn.href = window.GcvPixReceipt.buildWhatsAppUrl(
        reservationCode,
        pending.valor,
        modal._gcvReceiptData.trips,
        pending.loc,
      );
    }

    // QR ainda não — espera resposta do servidor (cobrança dinâmica).
    // Fallback estático só se a API não devolver brcode.
    var copyBtn = modal.querySelector("[data-gcv-pix-copy]");
    if (copyBtn) {
      copyBtn.disabled = true;
      copyBtn.textContent = locStrings.pixModalGenerating || "Gerando Pix…";
    }
    var canvas = modal.querySelector(".gcv-pix-modal__qr");
    if (canvas) canvas.style.display = "none";

    syncPixRefBlock(modal);
    startPixPayTimer(modal, pending.loc, locStrings);
    registerAndPollPix(
      modal,
      pending.reservationCode,
      pending.valor,
      pending.loc,
      pending.receiptData,
      function onRegistered(reg) {
        var brcode = reg && reg.brcode ? String(reg.brcode).trim() : "";
        var payload = brcode || buildStaticPixPayload(pending);
        if (!payload) return;
        if (reg && reg.txid) pending.txid = String(reg.txid);
        modal._gcvPixPayloadReady = true;
        applyPixPayloadToModal(modal, payload, locStrings);
      },
    );
    return true;
  }

  function ensurePixEmailBlock(modal, loc) {
    if (!modal) return;
    if (window.GcvPixReceipt && typeof window.GcvPixReceipt.ensurePhoneCountries === "function") {
      window.GcvPixReceipt.ensurePhoneCountries();
    }
    var payZone = modal.querySelector(".gcv-pix-modal__pay-zone");
    var block = modal.querySelector("#gcv-pix-modal-email-block");
    if (!block) {
      block = document.createElement("div");
      block.id = "gcv-pix-modal-email-block";
      block.className = "gcv-pix-modal__email-block";
      block.innerHTML =
        '<label class="gcv-pix-modal__email-label" for="gcv-pix-modal-email">' +
        '<span class="gcv-pix-modal__email-label-text"></span> ' +
        '<span class="gcv-pix-modal__email-label-required" aria-hidden="true">*</span></label>' +
        '<div class="gcv-pix-modal__email-row">' +
        '<input type="email" class="gcv-pix-modal__email" id="gcv-pix-modal-email" required autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" />' +
        '<button type="button" class="gcv-pix-modal__email-clear" data-gcv-pix-email-clear hidden disabled aria-label=""></button>' +
        "</div>" +
        '<p class="gcv-pix-modal__email-hint" id="gcv-pix-modal-email-hint"></p>' +
        '<p class="gcv-pix-modal__field-error" id="gcv-pix-modal-email-error" role="alert" hidden></p>' +
        '<label class="gcv-pix-modal__email-label gcv-pix-modal__phone-label" for="gcv-pix-modal-phone">' +
        '<span class="gcv-pix-modal__phone-label-text"></span> ' +
        '<span class="gcv-pix-modal__email-label-required" aria-hidden="true">*</span></label>' +
        buildPixPhoneWrapHtml(loc) +
        '<p class="gcv-pix-modal__email-hint" id="gcv-pix-modal-phone-hint"></p>' +
        '<p class="gcv-pix-modal__field-error" id="gcv-pix-modal-phone-error" role="alert" hidden></p>' +
        '<button type="button" class="gcv-pix-modal__email-continue" data-gcv-pix-email-continue></button>' +
        '<p class="gcv-pix-modal__email-status" id="gcv-pix-modal-email-status" hidden></p>';
      if (payZone && payZone.parentNode) {
        payZone.parentNode.insertBefore(block, payZone);
      } else {
        modal.querySelector(".gcv-pix-modal__panel").appendChild(block);
      }
    }
    ensurePixFieldErrorEls(block);
    if (!block.querySelector("#gcv-pix-modal-phone")) {
      var phoneLabel = document.createElement("label");
      phoneLabel.className = "gcv-pix-modal__email-label gcv-pix-modal__phone-label";
      phoneLabel.setAttribute("for", "gcv-pix-modal-phone");
      phoneLabel.innerHTML =
        '<span class="gcv-pix-modal__phone-label-text"></span> ' +
        '<span class="gcv-pix-modal__email-label-required" aria-hidden="true">*</span>';
      var phoneWrapTemp = document.createElement("div");
      phoneWrapTemp.innerHTML = buildPixPhoneWrapHtml(loc);
      var phoneWrap = phoneWrapTemp.firstChild;
      var phoneHintNew = document.createElement("p");
      phoneHintNew.className = "gcv-pix-modal__email-hint";
      phoneHintNew.id = "gcv-pix-modal-phone-hint";
      var slot = block.querySelector("#gcv-pix-modal-phone-wrap-slot");
      if (slot && slot.parentNode) {
        if (!block.querySelector(".gcv-pix-modal__phone-label")) {
          slot.parentNode.insertBefore(phoneLabel, slot);
        }
        slot.parentNode.replaceChild(phoneWrap, slot);
        if (!block.querySelector("#gcv-pix-modal-phone-hint")) {
          phoneWrap.parentNode.insertBefore(phoneHintNew, phoneWrap.nextSibling);
        }
      } else {
        var continueExisting = block.querySelector("[data-gcv-pix-email-continue]");
        var insertBeforeEl = continueExisting || block.querySelector("#gcv-pix-modal-email-status");
        if (insertBeforeEl && insertBeforeEl.parentNode) {
          insertBeforeEl.parentNode.insertBefore(phoneLabel, insertBeforeEl);
          insertBeforeEl.parentNode.insertBefore(phoneWrap, insertBeforeEl);
          insertBeforeEl.parentNode.insertBefore(phoneHintNew, insertBeforeEl);
        }
      }
    } else if (!block.querySelector("#gcv-pix-modal-ddi-trigger")) {
      var oldPhoneRow = block.querySelector(".gcv-pix-modal__phone-row");
      var oldWrap = block.querySelector(".gcv-pix-modal__phone-wrap");
      var upgradeTemp = document.createElement("div");
      upgradeTemp.innerHTML = buildPixPhoneWrapHtml(loc);
      var newPhoneUi = upgradeTemp.firstChild;
      if (oldPhoneRow && oldPhoneRow.parentNode && newPhoneUi) {
        oldPhoneRow.parentNode.replaceChild(newPhoneUi, oldPhoneRow);
      } else if (oldWrap && oldWrap.parentNode && newPhoneUi) {
        oldWrap.parentNode.replaceChild(newPhoneUi, oldWrap);
      }
    }
    var phoneWrapEl = block.querySelector(".gcv-pix-modal__phone-wrap");
    var phoneRowEl = block.querySelector(".gcv-pix-modal__phone-row");
    if (phoneWrapEl && !phoneRowEl) {
      phoneRowEl = document.createElement("div");
      phoneRowEl.className = "gcv-pix-modal__phone-row";
      phoneWrapEl.parentNode.insertBefore(phoneRowEl, phoneWrapEl);
      phoneRowEl.appendChild(phoneWrapEl);
    }
    if (phoneRowEl && !phoneRowEl.querySelector("[data-gcv-pix-phone-clear]")) {
      var phoneClearUpgrade = document.createElement("button");
      phoneClearUpgrade.type = "button";
      phoneClearUpgrade.className = "gcv-pix-modal__email-clear gcv-pix-modal__phone-clear";
      phoneClearUpgrade.setAttribute("data-gcv-pix-phone-clear", "");
      phoneClearUpgrade.hidden = true;
      phoneClearUpgrade.disabled = true;
      phoneRowEl.appendChild(phoneClearUpgrade);
    } else if (phoneWrapEl && phoneWrapEl.querySelector("[data-gcv-pix-phone-clear]") && phoneRowEl) {
      var nestedClear = phoneWrapEl.querySelector("[data-gcv-pix-phone-clear]");
      if (nestedClear) phoneRowEl.appendChild(nestedClear);
    }
    var locStrings = STRINGS[loc] || STRINGS.pt;
    var labelText = block.querySelector(".gcv-pix-modal__email-label-text");
    var phoneLabelText = block.querySelector(".gcv-pix-modal__phone-label-text");
    var hintEl = block.querySelector("#gcv-pix-modal-email-hint");
    var phoneHintEl = block.querySelector("#gcv-pix-modal-phone-hint");
    var emailInput = block.querySelector("#gcv-pix-modal-email");
    var phoneInput = block.querySelector("#gcv-pix-modal-phone");
    var continueBtn = block.querySelector("[data-gcv-pix-email-continue]");
    var clearBtn = block.querySelector("[data-gcv-pix-email-clear]");
    if (!clearBtn) {
      var row = document.createElement("div");
      row.className = "gcv-pix-modal__email-row";
      if (emailInput && emailInput.parentNode === block) {
        block.insertBefore(row, emailInput);
        row.appendChild(emailInput);
      }
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "gcv-pix-modal__email-clear";
      clearBtn.setAttribute("data-gcv-pix-email-clear", "");
      clearBtn.hidden = true;
      clearBtn.disabled = true;
      row.appendChild(clearBtn);
    }
    if (window.GcvPixReceipt) {
      if (labelText) labelText.textContent = window.GcvPixReceipt.rs(loc, "emailLabel");
      if (hintEl) hintEl.textContent = window.GcvPixReceipt.rs(loc, "emailRequiredHint");
      if (phoneLabelText) phoneLabelText.textContent = window.GcvPixReceipt.rs(loc, "phoneLabel");
      if (phoneHintEl) phoneHintEl.textContent = window.GcvPixReceipt.rs(loc, "phoneRequiredHint");
      if (emailInput) {
        emailInput.placeholder = window.GcvPixReceipt.rs(loc, "emailPlaceholder");
        emailInput.setAttribute("autocomplete", "email");
        emailInput.setAttribute("autocapitalize", "off");
        emailInput.setAttribute("spellcheck", "false");
      }
      if (phoneInput) {
        phoneInput.setAttribute("autocomplete", "tel-national");
        phoneInput.setAttribute("inputmode", "numeric");
      }
    }
    syncPixPhoneDdiUi(modal, loc);
    if (continueBtn) continueBtn.textContent = locStrings.pixModalEmailContinue || "Continuar para o Pix";
    var phoneClearBtn = block.querySelector("[data-gcv-pix-phone-clear]");
    [clearBtn, phoneClearBtn].forEach(function (btn) {
      if (!btn) return;
      btn.textContent = "×";
      btn.setAttribute("aria-label", locStrings.pixModalEmailClear || "Excluir dados");
      btn.title = locStrings.pixModalEmailClearHint || locStrings.pixModalEmailClear || "Excluir dados";
      if (!modal._gcvPixCheckoutActive) {
        btn.hidden = true;
        btn.disabled = true;
      }
    });
    syncPixContinueButton(modal);
  }

  function syncPixContinueButton(modal) {
    if (!modal) return;
    var continueBtn = modal.querySelector("[data-gcv-pix-email-continue]");
    if (!continueBtn) return;
    if (modal._gcvPixCheckoutActive || modal._gcvPixConfirmed) {
      continueBtn.disabled = true;
      return;
    }
    var email = getModalEmailInputValue(modal);
    var phone = getModalPhoneInputValue(modal);
    var phoneIso = getModalPhoneIso(modal);
    var emailOk =
      !!email &&
      window.GcvPixReceipt &&
      typeof window.GcvPixReceipt.isValidEmail === "function" &&
      window.GcvPixReceipt.isValidEmail(email);
    var phoneOk =
      !!phone &&
      window.GcvPixReceipt &&
      typeof window.GcvPixReceipt.isValidPhone === "function" &&
      window.GcvPixReceipt.isValidPhone(phone, phoneIso);
    continueBtn.disabled = !(emailOk && phoneOk);
  }

  function pixPostpayIsPaid(modal) {
    return !!(modal && (modal._gcvPixConfirmed || modal.classList.contains("gcv-pix-modal--paid")));
  }

  function syncPostpayActions(modal) {
    if (!modal) return;
    var postpay = modal.querySelector("#gcv-pix-modal-postpay");
    if (!postpay) return;
    var paid = pixPostpayIsPaid(modal);
    var show = paid || !!modal._gcvPixCheckoutActive;
    postpay.hidden = !show;
    postpay.classList.toggle("gcv-pix-modal__postpay--locked", show && !paid);
    var loc = modal._gcvPixLocale || "pt";
    var lockedHint = (STRINGS[loc] || STRINGS.pt).pixPostpayLocked || "";
    var printBtn = postpay.querySelector("[data-gcv-pix-receipt-print]");
    var emailBtn = postpay.querySelector("[data-gcv-pix-receipt-email]");
    var waBtn = postpay.querySelector("[data-gcv-pix-wa]");
    if (printBtn) {
      printBtn.disabled = !paid;
      if (lockedHint) printBtn.title = paid ? "" : lockedHint;
    }
    if (emailBtn) {
      emailBtn.disabled = !paid;
      if (lockedHint) emailBtn.title = paid ? "" : lockedHint;
    }
    if (waBtn) {
      waBtn.classList.toggle("gcv-pix-modal__wa-btn--disabled", !paid);
      if (lockedHint) waBtn.title = paid ? "" : lockedHint;
      if (!paid) {
        waBtn.setAttribute("aria-disabled", "true");
        waBtn.tabIndex = -1;
      } else {
        waBtn.removeAttribute("aria-disabled");
        waBtn.tabIndex = 0;
      }
    }
  }

  function activatePixCheckout(modal, s) {
    if (!modal || modal._gcvPixCheckoutActive) return false;
    var loc = modal._gcvPixLocale || "pt";
    var email = getModalEmailInputValue(modal);
    var phone = getModalPhoneInputValue(modal);
    var statusEl = modal.querySelector("#gcv-pix-modal-email-status");
    var emailOk = validatePixEmailField(modal, { show: true });
    var phoneOk = validatePixPhoneField(modal, { show: true });
    if (!emailOk) {
      var emailInputEmpty = modal.querySelector("#gcv-pix-modal-email");
      if (emailInputEmpty && typeof emailInputEmpty.focus === "function") emailInputEmpty.focus();
      syncPixContinueButton(modal);
      return false;
    }
    if (!phoneOk) {
      var phoneInputEmpty = modal.querySelector("#gcv-pix-modal-phone");
      if (phoneInputEmpty && typeof phoneInputEmpty.focus === "function") phoneInputEmpty.focus();
      syncPixContinueButton(modal);
      return false;
    }

    var phoneIso = getModalPhoneIso(modal);
    var phoneNormalized =
      typeof window.GcvPixReceipt.formatPhoneMask === "function"
        ? window.GcvPixReceipt.formatPhoneMask(phone, phoneIso)
        : window.GcvPixReceipt.normalizePhone(phone, phoneIso);
    var phoneStored =
      typeof window.GcvPixReceipt.formatPhoneIntl === "function"
        ? window.GcvPixReceipt.formatPhoneIntl(phone, phoneIso)
        : "+55 " + phoneNormalized;
    var phoneInputNorm = modal.querySelector("#gcv-pix-modal-phone");
    if (phoneInputNorm) phoneInputNorm.value = phoneNormalized;
    if (window.GcvPixReceipt.savePhoneDdi) window.GcvPixReceipt.savePhoneDdi(phoneIso);

    if (!finalizePixCheckout(modal, s || STRINGS[loc] || STRINGS.pt)) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Não foi possível gerar o Pix. Tente novamente.";
        statusEl.classList.add("gcv-pix-modal__email-status--err");
        statusEl.classList.remove("gcv-pix-modal__email-status--ok");
      }
      return false;
    }

    modal._gcvPixCheckoutActive = true;
    modal._gcvPixCheckoutEmail = email;
    modal._gcvPixCheckoutPhone = phoneNormalized;
    if (modal._gcvReceiptData) {
      modal._gcvReceiptData.email = email;
      modal._gcvReceiptData.phone = phoneStored;
    }
    if (modal._gcvPixPendingCheckout && modal._gcvPixPendingCheckout.receiptData) {
      modal._gcvPixPendingCheckout.receiptData.email = email;
      modal._gcvPixPendingCheckout.receiptData.phone = phoneStored;
    }
    if (window.GcvPixReceipt.saveEmail) window.GcvPixReceipt.saveEmail(email);
    if (window.GcvPixReceipt.savePhone) window.GcvPixReceipt.savePhone(phoneStored);
    modal.classList.remove("gcv-pix-modal--await-email");
    modal.classList.add("gcv-pix-modal--checkout-active");
    lockPixEmailBlock(modal);
    var emailHint = modal.querySelector("#gcv-pix-modal-email-hint");
    if (emailHint) emailHint.hidden = true;
    var phoneHint = modal.querySelector("#gcv-pix-modal-phone-hint");
    if (phoneHint) phoneHint.hidden = true;
    clearPixFieldError(modal, "email");
    clearPixFieldError(modal, "phone");
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
    }
    syncPostpayActions(modal);
    ensureDevPixSimulateBtn(modal, s || STRINGS[loc] || STRINGS.pt);
    return true;
  }

  function trySendReceiptEmail(modal, loc) {
    if (!modal || modal._gcvPixEmailSent || !window.GcvPixReceipt || !modal._gcvReceiptData) {
      return Promise.resolve();
    }
    var email = getModalReceiptEmail(modal);
    if (!window.GcvPixReceipt.isValidEmail(email)) return Promise.resolve();
    modal._gcvPixEmailSent = true;
    return window.GcvPixReceipt.sendEmail(email, modal._gcvReceiptData, loc).catch(function () {
      modal._gcvPixEmailSent = false;
    });
  }

  function handlePixConfirmed(modal, s, data) {
    if (!modal || modal._gcvPixConfirmed) return;
    modal._gcvPixConfirmed = true;
    var loc = modal._gcvPixLocale || "pt";
    if (window.GcvPixPolling && typeof window.GcvPixPolling.stopPixPolling === "function") {
      window.GcvPixPolling.stopPixPolling();
    }
    clearPixTimer(modal);
    commitPixBookings(modal, loc);
    if (window.GcvExcCart && modal._gcvReceiptData && Array.isArray(modal._gcvReceiptData.trips)) {
      modal._gcvReceiptData.trips.forEach(function (trip) {
        var cartId = trip && trip.cartId;
        if (cartId && typeof window.GcvExcCart.remove === "function") {
          window.GcvExcCart.remove(cartId);
        }
      });
    }
    modal.classList.add("gcv-pix-modal--paid");
    var payZone = modal.querySelector(".gcv-pix-modal__pay-zone");
    if (payZone) payZone.hidden = true;
    var scanEl = modal.querySelector(".gcv-pix-modal__scan");
    if (scanEl) scanEl.hidden = true;
    var timerEl = modal.querySelector("#gcv-pix-modal-timer");
    if (timerEl) timerEl.hidden = true;
    var hintEl = modal.querySelector(".gcv-pix-modal__hint");
    if (hintEl) hintEl.hidden = true;
    var expired = modal.querySelector("#gcv-pix-modal-expired");
    if (expired) expired.hidden = true;
    syncPostpayActions(modal);
    hidePixWaitingBlock(modal);
    var success = modal.querySelector("#gcv-pix-modal-success");
    if (success) {
      success.hidden = false;
      var st = success.querySelector(".gcv-pix-modal__success-title");
      var sl = success.querySelector(".gcv-pix-modal__success-lead");
      if (st) st.textContent = (s && s.pixModalConfirmedTitle) || "Pagamento confirmado!";
      if (sl) sl.textContent = (s && s.pixModalConfirmedLead) || "";
    }
    var title = modal.querySelector(".gcv-pix-modal__title");
    if (title) {
      if (!modal._gcvPixTitleDefault) modal._gcvPixTitleDefault = title.textContent;
      title.textContent = (s && s.pixModalConfirmedTitle) || "Pagamento confirmado!";
    }
    var reservationId =
      (data && data.reservation_id) || modal._gcvPixReservationId || "";
    syncPixRefBlock(modal);
    if (
      window.GcvPixReceipt &&
      typeof window.GcvPixReceipt.saveReservationCode === "function" &&
      reservationId
    ) {
      window.GcvPixReceipt.saveReservationCode(reservationId, {
        email: getModalReceiptEmail(modal) || undefined,
        phone:
          (typeof window.GcvPixReceipt.formatPhoneIntl === "function" &&
            getModalReceiptPhone(modal) &&
            window.GcvPixReceipt.formatPhoneIntl(getModalReceiptPhone(modal), getModalPhoneIso(modal))) ||
          getModalReceiptPhone(modal) ||
          undefined,
        phoneIso: getModalPhoneIso(modal),
      });
    }
    if (
      modal._gcvPixReservationId &&
      reservationId &&
      String(modal._gcvPixReservationId).toUpperCase() !== String(reservationId).toUpperCase()
    ) {
      return;
    }
    trySendReceiptEmail(modal, loc).finally(function () {
      window.setTimeout(function () {
        if (reservationId) {
          window.location.href = confirmacaoPageUrl(reservationId, loc);
        }
      }, 1000);
    });
  }

  function handlePixExpired(modal, s) {
    if (!modal || modal._gcvPixConfirmed) return;
    if (window.GcvPixPolling && typeof window.GcvPixPolling.stopPixPolling === "function") {
      window.GcvPixPolling.stopPixPolling();
    }
    clearPixTimer(modal);
    ensurePixExpiredBlock(modal, s);
    modal.classList.add("gcv-pix-modal--expired");
    var payZone = modal.querySelector(".gcv-pix-modal__pay-zone");
    if (payZone) payZone.hidden = true;
    var scanEl = modal.querySelector(".gcv-pix-modal__scan");
    if (scanEl) scanEl.hidden = true;
    var hintEl = modal.querySelector(".gcv-pix-modal__hint");
    if (hintEl) hintEl.hidden = true;
    syncPostpayActions(modal);
    hidePixWaitingBlock(modal);
    var success = modal.querySelector("#gcv-pix-modal-success");
    if (success) success.hidden = true;
    var expired = modal.querySelector("#gcv-pix-modal-expired");
    if (expired) expired.hidden = false;
    var title = modal.querySelector(".gcv-pix-modal__title");
    if (title) {
      if (!modal._gcvPixTitleDefault) modal._gcvPixTitleDefault = title.textContent;
      title.textContent = (s && s.pixModalExpiredTitle) || "Tempo expirado";
    }
  }

  function resetPixPayState(modal) {
    if (!modal) return;
    modal.classList.remove("gcv-pix-modal--paid", "gcv-pix-modal--expired", "gcv-pix-modal--await-email", "gcv-pix-modal--checkout-active");
    modal._gcvPixConfirmed = false;
    modal._gcvPixCheckoutActive = false;
    modal._gcvPixEmailSent = false;
    modal._gcvPixPayloadReady = false;
    modal._gcvPixPendingCheckout = null;
    modal._gcvPixReservationId = null;
    clearPixPayZone(modal);
    unlockPixEmailBlock(modal);
    syncPixRefBlock(modal);
    var success = modal.querySelector("#gcv-pix-modal-success");
    if (success) success.hidden = true;
    var expired = modal.querySelector("#gcv-pix-modal-expired");
    if (expired) expired.hidden = true;
    syncPostpayActions(modal);
    hidePixWaitingBlock(modal);
    var payZone = modal.querySelector(".gcv-pix-modal__pay-zone");
    if (payZone) payZone.hidden = false;
    var scanEl = modal.querySelector(".gcv-pix-modal__scan");
    if (scanEl) scanEl.hidden = false;
    var hintEl = modal.querySelector(".gcv-pix-modal__hint");
    if (hintEl) hintEl.hidden = false;
    var timerEl = modal.querySelector("#gcv-pix-modal-timer");
    if (timerEl) timerEl.hidden = true;
    var title = modal.querySelector(".gcv-pix-modal__title");
    if (title && modal._gcvPixTitleDefault) title.textContent = modal._gcvPixTitleDefault;
  }

  function initPixPollingHandlers() {
    if (!window.GcvPixPolling || typeof window.GcvPixPolling.setHandlers !== "function") return;
    if (initPixPollingHandlers._done) return;
    initPixPollingHandlers._done = true;
    window.GcvPixPolling.setHandlers({
      onPending: function (modal) {
        if (!modal || modal._gcvPixConfirmed) return;
        var loc = modal._gcvPixLocale || "pt";
        ensurePixWaitingBlock(modal, STRINGS[loc] || STRINGS.pt);
      },
      onConfirmed: function (modal, data) {
        var loc = (modal && modal._gcvPixLocale) || "pt";
        handlePixConfirmed(modal, STRINGS[loc] || STRINGS.pt, data);
      },
      onExpired: function (modal) {
        var loc = (modal && modal._gcvPixLocale) || "pt";
        handlePixExpired(modal, STRINGS[loc] || STRINGS.pt);
      },
    });
  }

  function registerAndPollPix(modal, reservationCode, valor, loc, receiptData, onRegistered) {
    if (!window.GcvPixPolling) return;
    initPixPollingHandlers();
    var pending = modal && modal._gcvPixPendingCheckout;
    var payload = {
      reservation_id: reservationCode,
      amount: Number(valor),
      locale: loc,
      expires_in: Math.floor(PIX_PAY_WINDOW_MS / 1000),
      trips: (receiptData && receiptData.trips) || [],
      incl_excl: receiptData && receiptData.inclExcl ? receiptData.inclExcl : undefined,
      packages: receiptData && receiptData.packages ? receiptData.packages : undefined,
      email: getModalReceiptEmail(modal) || undefined,
      phone:
        (window.GcvPixReceipt &&
          typeof window.GcvPixReceipt.formatPhoneIntl === "function" &&
          getModalReceiptPhone(modal) &&
          window.GcvPixReceipt.formatPhoneIntl(getModalReceiptPhone(modal), getModalPhoneIso(modal))) ||
        getModalReceiptPhone(modal) ||
        undefined,
      description: (pending && pending.pixDescWithCode) || reservationCode + " Guia Chapada Veadeiros",
    };
    function startPollingIfReady(reg) {
      if (!reg || !reg.success) {
        if (typeof onRegistered === "function") {
          onRegistered({ success: false, brcode: "" });
        }
        return;
      }
      if (typeof onRegistered === "function") {
        onRegistered(reg);
      }
      if (String(reg.status || "").toUpperCase() === "PAID") {
        window.GcvPixPolling.checkPixStatus();
        return;
      }
      window.GcvPixPolling.startPixPolling(modal, reservationCode);
    }
    window.GcvPixPolling.registerPixReservation(payload)
      .then(function (reg) {
        if (reg && reg.success) {
          startPollingIfReady(reg);
          return;
        }
        return window.GcvPixPolling.registerPixReservation(payload).then(startPollingIfReady);
      })
      .catch(function () {
        if (typeof onRegistered === "function") {
          onRegistered({ success: false, brcode: "" });
        }
        window.GcvPixPolling.startPixPolling(modal, reservationCode);
      });
  }

  function ensurePixModalExtras(modal, s) {
    if (!modal) return;
    var locStrings = s || {};
    if (!modal.querySelector("#gcv-pix-modal-ref")) {
      var itemsEl = modal.querySelector("#gcv-pix-modal-items");
      var ref = document.createElement("div");
      ref.id = "gcv-pix-modal-ref";
      ref.className = "gcv-pix-modal__ref";
      ref.hidden = true;
      ref.innerHTML =
        '<p class="gcv-pix-modal__ref-label"></p>' +
        '<p class="gcv-pix-modal__ref-code" id="gcv-pix-modal-ref-code"></p>';
      if (itemsEl && itemsEl.parentNode) {
        itemsEl.parentNode.insertBefore(ref, itemsEl.nextSibling);
      } else {
        var panel = modal.querySelector(".gcv-pix-modal__panel");
        if (panel) panel.appendChild(ref);
      }
    }
    if (!modal.querySelector("#gcv-pix-modal-postpay")) {
      var hintEl = modal.querySelector(".gcv-pix-modal__hint");
      var post = document.createElement("div");
      post.id = "gcv-pix-modal-postpay";
      post.className = "gcv-pix-modal__postpay";
      post.hidden = true;
      post.innerHTML =
        '<div class="gcv-pix-modal__actions">' +
        '<button type="button" class="gcv-pix-modal__receipt-btn" data-gcv-pix-receipt-print></button>' +
        '<button type="button" class="gcv-pix-modal__receipt-btn gcv-pix-modal__receipt-btn--email" data-gcv-pix-receipt-email></button>' +
        '<a class="gcv-pix-modal__wa-btn" data-gcv-pix-wa target="_blank" rel="noopener noreferrer"></a>' +
        "</div>" +
        '<p class="gcv-pix-modal__email-status" id="gcv-pix-modal-postpay-status" hidden></p>';
      if (hintEl) hintEl.insertAdjacentElement("beforebegin", post);
      else modal.querySelector(".gcv-pix-modal__panel").appendChild(post);
    }
    var loc = modal._gcvPixLocale || "pt";
    ensurePixEmailBlock(modal, loc);
    var refBlock = modal.querySelector("#gcv-pix-modal-ref");
    if (refBlock) {
      var refLabel = refBlock.querySelector(".gcv-pix-modal__ref-label");
      if (refLabel) refLabel.textContent = locStrings.pixModalRefLabel || "Código de reserva";
      var staleRefHint = refBlock.querySelector(".gcv-pix-modal__ref-hint");
      if (staleRefHint) staleRefHint.remove();
      syncPixRefBlock(modal);
    }
    var postpay = modal.querySelector("#gcv-pix-modal-postpay");
    if (postpay && window.GcvPixReceipt) {
      var locPost = modal._gcvPixLocale || "pt";
      var printBtn = postpay.querySelector("[data-gcv-pix-receipt-print]");
      var emailBtn = postpay.querySelector("[data-gcv-pix-receipt-email]");
      var waBtn = postpay.querySelector("[data-gcv-pix-wa]");
      if (printBtn) printBtn.textContent = window.GcvPixReceipt.rs(locPost, "btnPrint");
      if (emailBtn) emailBtn.textContent = window.GcvPixReceipt.rs(locPost, "btnEmail");
      if (waBtn) waBtn.textContent = window.GcvPixReceipt.rs(locPost, "btnWa");
    }
    syncPostpayActions(modal);
    upgradePixModalPayZone(modal);
    ensurePixModalScrollBody(modal);
    hidePixWaitingBlock(modal);
    syncPixRefBlock(modal);
  }

  function buildReceiptDataFromDetail(detailObj, valor, code, locale, s) {
    var trips = resolvePixTrips(detailObj, locale, s);
    return {
      code: code,
      amount: Number(valor),
      trips: trips,
      inclExcl: detailObj && detailObj.inclExcl ? detailObj.inclExcl : null,
      packages: detailObj && detailObj.packages ? detailObj.packages : null,
    };
  }

  function ensurePixModal() {
    var modal = document.getElementById("gcv-pix-modal");
    if (modal) {
      if (!modal.querySelector("#gcv-pix-modal-items")) {
        var legacy = modal.querySelector(".gcv-pix-modal__desc");
        if (legacy) {
          legacy.id = "gcv-pix-modal-items";
          legacy.className = "gcv-pix-modal__items";
        }
      }
      if (!modal.querySelector("#gcv-pix-modal-coverage")) {
        var amountEl = modal.querySelector(".gcv-pix-modal__amount");
        if (amountEl) {
          var coverage = document.createElement("div");
          coverage.id = "gcv-pix-modal-coverage";
          coverage.className = "gcv-pix-modal__coverage";
          coverage.hidden = true;
          amountEl.parentNode.insertBefore(coverage, amountEl);
        }
      }
      if (!modal.querySelector("#gcv-pix-modal-timer")) {
        var amountForTimer = modal.querySelector(".gcv-pix-modal__amount");
        if (amountForTimer) {
          var timer = document.createElement("p");
          timer.id = "gcv-pix-modal-timer";
          timer.className = "gcv-pix-modal__timer";
          timer.hidden = true;
          amountForTimer.insertAdjacentElement("afterend", timer);
        }
      }
      ensurePixModalExtras(modal);
      return modal;
    }
    modal = document.createElement("div");
    modal.id = "gcv-pix-modal";
    modal.className = "gcv-pix-modal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "gcv-pix-modal-title");
    modal.innerHTML =
      '<button type="button" class="gcv-pix-modal__backdrop" data-gcv-pix-close aria-label=""></button>' +
      '<div class="gcv-pix-modal__panel">' +
      '<button type="button" class="gcv-pix-modal__close" data-gcv-pix-close aria-label="">×</button>' +
      '<h2 id="gcv-pix-modal-title" class="gcv-pix-modal__title"></h2>' +
      '<div class="gcv-pix-modal__items" id="gcv-pix-modal-items"></div>' +
      '<div class="gcv-pix-modal__coverage" id="gcv-pix-modal-coverage" hidden aria-hidden="true"></div>' +
      '<div class="gcv-pix-modal__ref" id="gcv-pix-modal-ref" hidden>' +
      '<p class="gcv-pix-modal__ref-label"></p>' +
      '<p class="gcv-pix-modal__ref-code" id="gcv-pix-modal-ref-code"></p></div>' +
      '<div class="gcv-pix-modal__email-block" id="gcv-pix-modal-email-block">' +
      '<label class="gcv-pix-modal__email-label" for="gcv-pix-modal-email">' +
      '<span class="gcv-pix-modal__email-label-text"></span> ' +
      '<span class="gcv-pix-modal__email-label-required" aria-hidden="true">*</span></label>' +
      '<div class="gcv-pix-modal__email-row">' +
      '<input type="email" class="gcv-pix-modal__email" id="gcv-pix-modal-email" required autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" />' +
      '<button type="button" class="gcv-pix-modal__email-clear" data-gcv-pix-email-clear hidden disabled aria-label=""></button>' +
      "</div>" +
      '<p class="gcv-pix-modal__email-hint" id="gcv-pix-modal-email-hint"></p>' +
      '<p class="gcv-pix-modal__field-error" id="gcv-pix-modal-email-error" role="alert" hidden></p>' +
      '<label class="gcv-pix-modal__email-label gcv-pix-modal__phone-label" for="gcv-pix-modal-phone">' +
      '<span class="gcv-pix-modal__phone-label-text"></span> ' +
      '<span class="gcv-pix-modal__email-label-required" aria-hidden="true">*</span></label>' +
      '<div class="gcv-pix-modal__phone-wrap" id="gcv-pix-modal-phone-wrap-slot"></div>' +
      '<p class="gcv-pix-modal__email-hint" id="gcv-pix-modal-phone-hint"></p>' +
      '<p class="gcv-pix-modal__field-error" id="gcv-pix-modal-phone-error" role="alert" hidden></p>' +
      '<button type="button" class="gcv-pix-modal__email-continue" data-gcv-pix-email-continue></button>' +
      '<p class="gcv-pix-modal__email-status" id="gcv-pix-modal-email-status" hidden></p></div>' +
      '<div class="gcv-pix-modal__pay-zone">' +
      '<p class="gcv-pix-modal__amount"></p>' +
      '<p class="gcv-pix-modal__timer" id="gcv-pix-modal-timer" hidden></p>' +
      '<div class="gcv-pix-modal__qr-wrap"><canvas class="gcv-pix-modal__qr" width="160" height="160" aria-hidden="true"></canvas></div>' +
      '<p class="gcv-pix-modal__scan"></p>' +
      '<button type="button" class="gcv-pix-modal__copy" data-gcv-pix-copy></button>' +
      '<div class="gcv-pix-modal__waiting" id="gcv-pix-modal-waiting" role="status" aria-live="polite">' +
      '<span class="gcv-pix-modal__waiting-dot" aria-hidden="true"></span>' +
      '<span class="gcv-pix-modal__waiting-text"></span>' +
      '<span class="gcv-pix-modal__waiting-sub"></span></div>' +
      "</div>" +
      '<div class="gcv-pix-modal__success" id="gcv-pix-modal-success" hidden>' +
      '<p class="gcv-pix-modal__success-icon" aria-hidden="true"><i class="ti ti-circle-check"></i></p>' +
      '<p class="gcv-pix-modal__success-title"></p>' +
      '<p class="gcv-pix-modal__success-lead"></p></div>' +
      '<div class="gcv-pix-modal__postpay" id="gcv-pix-modal-postpay" hidden>' +
      '<div class="gcv-pix-modal__actions">' +
      '<button type="button" class="gcv-pix-modal__receipt-btn" data-gcv-pix-receipt-print></button>' +
      '<button type="button" class="gcv-pix-modal__receipt-btn gcv-pix-modal__receipt-btn--email" data-gcv-pix-receipt-email></button>' +
      '<a class="gcv-pix-modal__wa-btn" data-gcv-pix-wa target="_blank" rel="noopener noreferrer"></a>' +
      "</div>" +
      '<p class="gcv-pix-modal__email-status" id="gcv-pix-modal-postpay-status" hidden></p>' +
      "</div>" +
      '<p class="gcv-pix-modal__hint"></p>' +
      "</div>";
    document.body.appendChild(modal);
    return modal;
  }

  var _pixTimerId = null;

  function formatPixCountdown(msLeft) {
    var total = Math.max(0, Math.ceil(msLeft / 1000));
    var mm = Math.floor(total / 60);
    var ss = total % 60;
    return String(mm) + ":" + String(ss).padStart(2, "0");
  }

  function clearPixTimer(modal) {
    if (_pixTimerId) {
      window.clearInterval(_pixTimerId);
      _pixTimerId = null;
    }
    if (modal) {
      modal._gcvPixDeadline = null;
      var timerEl = modal.querySelector("#gcv-pix-modal-timer");
      if (timerEl) {
        timerEl.hidden = true;
        timerEl.textContent = "";
      }
    }
  }

  function showPixExpiredToast(locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var strings = STRINGS[loc] || STRINGS.pt;
    var msg = strings.pixModalExpired;
    if (!msg) return;
    showExcToast(msg, "warning");
  }

  function startPixPayTimer(modal, locale, s) {
    clearPixTimer(modal);
    if (!modal) return;
    var timerEl = modal.querySelector("#gcv-pix-modal-timer");
    if (!timerEl) return;
    var deadline = Date.now() + PIX_PAY_WINDOW_MS;
    modal._gcvPixDeadline = deadline;
    var label = (s && s.pixModalTimer) || "Pague em até {{time}}";

    function tick() {
      if (modal.classList.contains("gcv-pix-modal--paid")) return;
      var left = deadline - Date.now();
      if (left <= 0) {
        clearPixTimer(modal);
        handlePixExpired(modal, s);
        return;
      }
      timerEl.hidden = false;
      timerEl.textContent = tpl(label, { time: formatPixCountdown(left) });
      if (left <= 60000) timerEl.classList.add("gcv-pix-modal__timer--urgent");
      else timerEl.classList.remove("gcv-pix-modal__timer--urgent");
    }

    tick();
    _pixTimerId = window.setInterval(tick, 1000);
  }

  function closePixModal(modal) {
    if (!modal) return;
    if (window.GcvPixPolling && typeof window.GcvPixPolling.stopPixPolling === "function") {
      window.GcvPixPolling.stopPixPolling();
    }
    clearPixTimer(modal);
    closePixDdiDropdown(modal);
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    document.documentElement.classList.remove("gcv-pix-modal-open");
    var trigger = modal._gcvPixTrigger;
    if (trigger && typeof trigger.focus === "function") {
      try {
        trigger.focus();
      } catch (err) {
        /* */
      }
    }
    modal._gcvPixTrigger = null;
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function openPixModal(valor, detail, trigger, locale, s, qty) {
    if (!window.GcvPix || typeof window.GcvPix.buildPayload !== "function") return;
    var modal = ensurePixModal();
    var lines;
    var pixDesc;
    var people;
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var detailObj =
      detail && typeof detail === "object" && !Array.isArray(detail) ? detail : null;
    modal._gcvPixLocale = loc;
    resetPixPayState(modal);
    ensurePixModalExtras(modal, s);

    if (detailObj && Array.isArray(detailObj.lines)) {
      lines = detailObj.lines;
      pixDesc = detailObj.pixDesc || "";
      people = parseInt(String(detailObj.qty), 10) || 1;
    } else {
      pixDesc = String(detail || "");
      lines = [pixDesc];
      people = parseInt(String(qty), 10) || 1;
      if (people > 1 && pixDesc.indexOf(" x") === -1) {
        pixDesc = (pixDesc + " x" + people).slice(0, 73);
      }
      detailObj = { lines: lines, pixDesc: pixDesc, qty: people };
    }

    modal._gcvReceiptData = buildReceiptDataFromDetail(detailObj, valor, "", loc, s);

    if (!validatePixTripQty(modal._gcvReceiptData.trips)) {
      showExcToast(s.pixBookingSoldOut, "warning");
      refreshExcursaoCarouselNow();
      return;
    }

    modal.querySelectorAll("[data-gcv-pix-close]").forEach(function (btn) {
      btn.setAttribute("aria-label", s.pixModalClose);
    });

    var title = modal.querySelector(".gcv-pix-modal__title");
    if (title) {
      modal._gcvPixTitleDefault = s.pixModalTitle;
      title.textContent = s.pixModalTitle;
    }
    var itemsEl = modal.querySelector("#gcv-pix-modal-items");
    if (itemsEl) {
      var trips = resolvePixTrips(detailObj, loc, s);
      var tripsHtml = renderPixTripsHtml(trips, s, loc, detailObj);
      if (tripsHtml) {
        itemsEl.innerHTML = tripsHtml;
      } else {
        itemsEl.innerHTML = lines
          .map(function (line) {
            return '<p class="gcv-pix-modal__item">' + escapeHtml(line) + "</p>";
          })
          .join("");
      }
    }
    var coverageEl = modal.querySelector("#gcv-pix-modal-coverage");
    if (coverageEl) {
      coverageEl.innerHTML = "";
      coverageEl.hidden = true;
      coverageEl.setAttribute("aria-hidden", "true");
    }
    var cancelEl = modal.querySelector("#gcv-pix-modal-cancel-policy");
    if (cancelEl) {
      cancelEl.textContent = "";
      cancelEl.hidden = true;
    }
    var amountEl = modal.querySelector(".gcv-pix-modal__amount");
    if (amountEl) amountEl.textContent = "R$ " + Number(valor).toFixed(2).replace(".", ",");
    var emailStatus = modal.querySelector("#gcv-pix-modal-email-status");
    if (emailStatus) {
      emailStatus.hidden = true;
      emailStatus.textContent = "";
      emailStatus.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
    }
    var scanEl = modal.querySelector(".gcv-pix-modal__scan");
    if (scanEl) scanEl.textContent = s.pixModalScan;
    var hintEl = modal.querySelector(".gcv-pix-modal__hint");
    if (hintEl) hintEl.textContent = s.pixModalHint;
    clearPixPayZone(modal);
    hidePixWaitingBlock(modal);

    modal._gcvPixReservationId = null;
    modal._gcvPixConfirmed = false;
    modal._gcvPixCheckoutActive = false;
    modal._gcvPixEmailSent = false;
    modal._gcvPixPayloadReady = false;
    modal._gcvPixCheckoutEmail = "";
    modal._gcvPixCheckoutPhone = "";
    modal._gcvPixPendingCheckout = {
      valor: valor,
      loc: loc,
      receiptData: modal._gcvReceiptData,
      pixDesc: pixDesc,
    };
    modal.classList.add("gcv-pix-modal--await-email");
    ensurePixEmailBlock(modal, loc);
    unlockPixEmailBlock(modal);
    var emailInputOpen = modal.querySelector("#gcv-pix-modal-email");
    if (emailInputOpen) {
      emailInputOpen.value = "";
      emailInputOpen.readOnly = false;
      emailInputOpen.disabled = false;
    }
    var phoneInputOpen = modal.querySelector("#gcv-pix-modal-phone");
    if (phoneInputOpen) {
      phoneInputOpen.value = "";
      phoneInputOpen.readOnly = false;
      phoneInputOpen.disabled = false;
    }
    syncPostpayActions(modal);
    syncPixRefBlock(modal);
    if (emailInputOpen && typeof emailInputOpen.focus === "function") {
      window.setTimeout(function () {
        emailInputOpen.focus();
      }, 120);
    }

    modal._gcvPixReopen = {
      valor: valor,
      detail: detailObj,
      trigger: trigger,
      locale: loc,
      strings: s,
    };

    modal._gcvPixTrigger = trigger || null;
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.documentElement.classList.add("gcv-pix-modal-open");
    var closeBtn = modal.querySelector(".gcv-pix-modal__close");
    if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
  }

  function initPixModal() {
    var modal = ensurePixModal();
    if (modal._gcvPixBound) return;
    modal._gcvPixBound = true;

    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-gcv-pix-close]")) {
        closePixModal(modal);
        return;
      }
      var copyBtn = e.target.closest("[data-gcv-pix-copy]");
      if (copyBtn) {
        var code = copyBtn.dataset.pixPayload;
        if (!code) return;
        var done = copyBtn.dataset.pixCopyDone || "OK";
        var def = copyBtn.dataset.pixCopyDefault || copyBtn.textContent;
        copyTextToClipboard(code)
          .then(function () {
            copyBtn.textContent = done;
            window.setTimeout(function () {
              copyBtn.textContent = def;
            }, 2200);
          })
          .catch(function () {
            /* */
          });
        return;
      }
      var regenBtn = e.target.closest("[data-gcv-pix-regen]");
      if (regenBtn && modal._gcvPixReopen) {
        e.preventDefault();
        var ctx = modal._gcvPixReopen;
        closePixModal(modal);
        openPixModal(ctx.valor, ctx.detail, ctx.trigger, ctx.locale, ctx.strings);
        return;
      }
      var ddiTriggerBtn = e.target.closest("#gcv-pix-modal-ddi-trigger");
      if (ddiTriggerBtn) {
        e.preventDefault();
        if (modal._gcvPixCheckoutActive || modal._gcvPixConfirmed || ddiTriggerBtn.disabled) return;
        var dropOpen =
          document.getElementById("gcv-pix-modal-ddi-dropdown") ||
          modal.querySelector("#gcv-pix-modal-ddi-dropdown");
        if (dropOpen && !dropOpen.hidden) {
          closePixDdiDropdown(modal);
        } else {
          openPixDdiDropdown(modal, modal._gcvPixLocale || "pt");
        }
        return;
      }
      if (
        modal.classList.contains("gcv-pix-modal--ddi-open") &&
        !e.target.closest("#gcv-pix-modal-ddi-dropdown") &&
        !e.target.closest("#gcv-pix-modal-ddi-trigger")
      ) {
        closePixDdiDropdown(modal);
      }
      var continueBtn = e.target.closest("[data-gcv-pix-email-continue]");
      if (continueBtn) {
        e.preventDefault();
        if (continueBtn.disabled) return;
        var locContinue = modal._gcvPixLocale || "pt";
        activatePixCheckout(modal, STRINGS[locContinue] || STRINGS.pt);
        return;
      }
      var clearEmailBtn = e.target.closest("[data-gcv-pix-email-clear]");
      if (clearEmailBtn) {
        e.preventDefault();
        if (modal._gcvPixConfirmed) return;
        cancelActivePixCheckout(modal, {
          clearEmail: true,
          clearPhone: false,
          focusField: "email",
        });
        return;
      }
      var clearPhoneBtn = e.target.closest("[data-gcv-pix-phone-clear]");
      if (clearPhoneBtn) {
        e.preventDefault();
        if (modal._gcvPixConfirmed) return;
        cancelActivePixCheckout(modal, {
          clearEmail: false,
          clearPhone: true,
          focusField: "phone",
        });
        return;
      }
      var devSimBtn = e.target.closest("[data-gcv-pix-dev-simulate]");
      if (devSimBtn) {
        e.preventDefault();
        var rid = modal._gcvPixReservationId;
        if (!window.GcvPixPolling || !rid) return;
        devSimBtn.disabled = true;
        window.GcvPixPolling.devSimulateBankWebhook(rid).finally(function () {
          syncDevPixSimulateBtn(modal);
        });
        return;
      }
      var printBtn = e.target.closest("[data-gcv-pix-receipt-print]");
      if (printBtn && window.GcvPixReceipt && modal._gcvReceiptData) {
        if (!pixPostpayIsPaid(modal)) return;
        var locPrint = modal._gcvPixLocale || "pt";
        var statusPrint = modal.querySelector("#gcv-pix-modal-postpay-status");
        var ok =
          typeof window.GcvPixReceipt.downloadReceipt === "function"
            ? window.GcvPixReceipt.downloadReceipt(modal._gcvReceiptData, locPrint)
            : window.GcvPixReceipt.openPrint(modal._gcvReceiptData, locPrint);
        if (statusPrint) {
          statusPrint.hidden = false;
          statusPrint.textContent = window.GcvPixReceipt.rs(
            locPrint,
            ok ? "downloadOk" : "downloadError",
          );
          statusPrint.classList.toggle("gcv-pix-modal__email-status--ok", !!ok);
          statusPrint.classList.toggle("gcv-pix-modal__email-status--err", !ok);
        }
        return;
      }
      var emailBtn = e.target.closest("[data-gcv-pix-receipt-email]");
      if (emailBtn && window.GcvPixReceipt && modal._gcvReceiptData) {
        if (!pixPostpayIsPaid(modal)) return;
        var loc = modal._gcvPixLocale || "pt";
        var statusEl = modal.querySelector("#gcv-pix-modal-postpay-status");
        var email = getModalReceiptEmail(modal);
        if (!window.GcvPixReceipt.isValidEmail(email)) {
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.textContent = window.GcvPixReceipt.rs(loc, "emailInvalid");
            statusEl.classList.add("gcv-pix-modal__email-status--err");
            statusEl.classList.remove("gcv-pix-modal__email-status--ok");
          }
          var emailInputResend = modal.querySelector("#gcv-pix-modal-email");
          if (emailInputResend && typeof emailInputResend.focus === "function") emailInputResend.focus();
          return;
        }
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = window.GcvPixReceipt.rs(loc, "emailSending");
          statusEl.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
        }
        emailBtn.disabled = true;
        window.GcvPixReceipt.sendEmail(email, modal._gcvReceiptData, loc)
          .then(function () {
            modal._gcvPixEmailSent = true;
            if (statusEl) {
              statusEl.textContent = window.GcvPixReceipt.tpl(window.GcvPixReceipt.rs(loc, "emailSent"), {
                email: email,
              });
              statusEl.classList.add("gcv-pix-modal__email-status--ok");
              statusEl.classList.remove("gcv-pix-modal__email-status--err");
            }
          })
          .catch(function () {
            if (statusEl) {
              statusEl.textContent = window.GcvPixReceipt.rs(loc, "emailError");
              statusEl.classList.add("gcv-pix-modal__email-status--err");
              statusEl.classList.remove("gcv-pix-modal__email-status--ok");
            }
          })
          .finally(function () {
            syncPostpayActions(modal);
          });
      }
      var waBtnClick = e.target.closest("[data-gcv-pix-wa]");
      if (waBtnClick && !pixPostpayIsPaid(modal)) {
        e.preventDefault();
      }
    });

    modal.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Enter") return;
        var input = e.target;
        if (
          !input ||
          (input.id !== "gcv-pix-modal-email" && input.id !== "gcv-pix-modal-phone")
        ) {
          return;
        }
        if (modal._gcvPixConfirmed) return;
        if (modal._gcvPixCheckoutActive) return;
        e.preventDefault();
        var locKey = modal._gcvPixLocale || "pt";
        activatePixCheckout(modal, STRINGS[locKey] || STRINGS.pt);
      },
      true,
    );

    modal.addEventListener(
      "input",
      function (e) {
        var input = e.target;
        if (!input || (input.id !== "gcv-pix-modal-email" && input.id !== "gcv-pix-modal-phone")) {
          return;
        }
        if (modal._gcvPixConfirmed) return;
        // Com Pix ativo os campos ficam bloqueados: só exclui pelo botão.
        if (modal._gcvPixCheckoutActive || input.readOnly) {
          if (input.id === "gcv-pix-modal-email" && modal._gcvPixCheckoutEmail) {
            input.value = modal._gcvPixCheckoutEmail;
          }
          if (input.id === "gcv-pix-modal-phone" && modal._gcvPixCheckoutPhone) {
            input.value = modal._gcvPixCheckoutPhone;
          }
          return;
        }
        if (input.id === "gcv-pix-modal-phone" && window.GcvPixReceipt) {
          var phoneIsoLive = getModalPhoneIso(modal);
          var digits =
            typeof window.GcvPixReceipt.nationalPhoneDigits === "function"
              ? window.GcvPixReceipt.nationalPhoneDigits(input.value, phoneIsoLive)
              : String(input.value || "").replace(/\D+/g, "").slice(0, 15);
          if (typeof window.GcvPixReceipt.formatPhoneMask === "function") {
            input.value = window.GcvPixReceipt.formatPhoneMask(digits, phoneIsoLive);
          } else {
            input.value = digits;
          }
        }
        // Enquanto digita: sem mensagem de erro
        clearPixFieldError(modal, input.id === "gcv-pix-modal-phone" ? "phone" : "email");
        var statusEl = modal.querySelector("#gcv-pix-modal-email-status");
        if (statusEl) {
          statusEl.hidden = true;
          statusEl.textContent = "";
          statusEl.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
        }
        syncPixContinueButton(modal);
      },
      true,
    );

    modal.addEventListener(
      "blur",
      function (e) {
        var input = e.target;
        if (!input) return;
        if (modal._gcvPixConfirmed || modal._gcvPixCheckoutActive) return;
        if (input.id === "gcv-pix-modal-email") {
          validatePixEmailField(modal, { show: true });
          syncPixContinueButton(modal);
          return;
        }
        if (input.id === "gcv-pix-modal-phone") {
          if (
            window.GcvPixReceipt &&
            typeof window.GcvPixReceipt.formatPhoneMask === "function"
          ) {
            input.value = window.GcvPixReceipt.formatPhoneMask(input.value, getModalPhoneIso(modal));
          }
          validatePixPhoneField(modal, { show: true });
          syncPixContinueButton(modal);
        }
      },
      true,
    );

    document.addEventListener(
      "input",
      function (e) {
        var input = e.target;
        if (!input || input.id !== "gcv-pix-modal-ddi-search") return;
        if (!modal.classList.contains("is-open")) return;
        if (modal._gcvPixCheckoutActive || modal._gcvPixConfirmed) return;
        renderPixDdiOptions(modal, modal._gcvPixLocale || "pt", input.value);
      },
      true,
    );

    modal.addEventListener(
      "change",
      function (e) {
        var input = e.target;
        if (!input) return;
        if (modal._gcvPixConfirmed) return;
        if (input.id !== "gcv-pix-modal-email" && input.id !== "gcv-pix-modal-phone") {
          return;
        }
        if (modal._gcvPixCheckoutActive) return;
        if (
          input.id === "gcv-pix-modal-phone" &&
          window.GcvPixReceipt &&
          typeof window.GcvPixReceipt.formatPhoneMask === "function"
        ) {
          input.value = window.GcvPixReceipt.formatPhoneMask(input.value, getModalPhoneIso(modal));
          validatePixPhoneField(modal, { show: true });
        } else if (input.id === "gcv-pix-modal-email") {
          validatePixEmailField(modal, { show: true });
        }
        var statusEl = modal.querySelector("#gcv-pix-modal-email-status");
        if (statusEl) {
          statusEl.hidden = true;
          statusEl.textContent = "";
          statusEl.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
        }
        syncPixContinueButton(modal);
      },
      true,
    );

    document.addEventListener("click", function (e) {
      if (!modal.classList.contains("is-open")) return;
      var ddiOption = e.target.closest("[data-gcv-ddi-iso]");
      if (ddiOption) {
        e.preventDefault();
        if (modal._gcvPixCheckoutActive || modal._gcvPixConfirmed) return;
        setModalPhoneIso(modal, ddiOption.getAttribute("data-gcv-ddi-iso"), modal._gcvPixLocale || "pt");
        clearPixFieldError(modal, "phone");
        var statusDdiPick = modal.querySelector("#gcv-pix-modal-email-status");
        if (statusDdiPick) {
          statusDdiPick.hidden = true;
          statusDdiPick.textContent = "";
          statusDdiPick.classList.remove("gcv-pix-modal__email-status--ok", "gcv-pix-modal__email-status--err");
        }
        syncPixContinueButton(modal);
        var phoneFocus = modal.querySelector("#gcv-pix-modal-phone");
        if (phoneFocus && typeof phoneFocus.focus === "function") phoneFocus.focus();
        return;
      }
      if (
        modal.classList.contains("gcv-pix-modal--ddi-open") &&
        !e.target.closest("#gcv-pix-modal-ddi-dropdown") &&
        !e.target.closest("#gcv-pix-modal-ddi-trigger")
      ) {
        closePixDdiDropdown(modal);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        if (modal.classList.contains("gcv-pix-modal--ddi-open")) {
          e.preventDefault();
          closePixDdiDropdown(modal);
          return;
        }
        closePixModal(modal);
      }
    });
  }

  function initBookingControls() {
    if (document.documentElement._gcvExcBookBound) return;
    document.documentElement._gcvExcBookBound = true;

    document.addEventListener("click", function (e) {
      var waitBtn = e.target.closest("[data-gcv-exc-waitlist]");
      if (waitBtn && window.GcvExcWaitlist) {
        e.preventDefault();
        e.stopPropagation();
        var soldBlock = waitBtn.closest(".gcv-excursoes-card__book--soldout");
        var card = waitBtn.closest(".gcv-excursoes-card");
        var sec = card && card.closest("#excursoes-junho");
        var loc = sec ? detectLocale(sec) : detectLocale(document.documentElement);
        var cartId =
          (soldBlock && soldBlock.getAttribute("data-cart-id")) ||
          (card && card.getAttribute("data-cart-id")) ||
          "";
        var destino = (soldBlock && soldBlock.getAttribute("data-cart-destino")) || "";
        var dateLabel = (soldBlock && soldBlock.getAttribute("data-cart-date")) || "";
        var excursao = soldBlock ? excursaoFromBookBlock(soldBlock) : null;
        window.GcvExcWaitlist.openModal({
          cartId: cartId,
          destino: destino || (excursao && String(excursao.destino || "")),
          dateLabel: dateLabel,
          dateIso: excursao ? excursaoDateIso(excursao) : "",
          locale: loc,
          trigger: waitBtn,
        });
        return;
      }

      var markBtn = e.target.closest(".gcv-excursoes-card__cart-mark");
      if (markBtn) {
        var card = markBtn.closest(".gcv-excursoes-card");
        var cartId =
          (card && card.getAttribute("data-cart-id")) ||
          (markBtn.getAttribute("data-cart-id") || "");
        if (cartId) {
          e.preventDefault();
          e.stopPropagation();
          removeExcursaoFromCart(cartId);
        }
        return;
      }

      var minBtn = e.target.closest("[data-gcv-exc-qty-min]");
      var plusBtn = e.target.closest("[data-gcv-exc-qty-plus]");
      var cartBtn = e.target.closest("[data-gcv-exc-cart-add]");
      var block =
        (minBtn || plusBtn || cartBtn) &&
        (minBtn || plusBtn || cartBtn).closest(".gcv-excursoes-card__book");
      if (block) {
        var sec = block.closest("#excursoes-junho");
        var loc = sec ? detectLocale(sec) : detectLocale(document.documentElement);
        var strings = STRINGS[loc] || STRINGS.pt;

        if (minBtn || plusBtn) {
          e.preventDefault();
          var input = block.querySelector(".gcv-excursoes-card__qty-input");
          var cur = input ? parseInt(input.value, 10) || 1 : 1;
          var next = cur + (plusBtn ? 1 : -1);
          var max = parseInt(block.getAttribute("data-pix-max"), 10) || 10;
          next = Math.max(1, Math.min(max, next));
          if (input) input.value = String(next);
          updateBookTotal(block);
          syncCartFromBook(block);
          return;
        }

        if (cartBtn) {
          e.preventDefault();
          e.stopPropagation();
          if (!window.GcvExcCart) return;
          var cartExcursao = excursaoFromBookBlock(block);
          if (cartExcursao && !isExcursaoBookable(cartExcursao)) {
            refreshExcursaoCarouselNow();
            return;
          }
          var cartData = readBookBlock(block);
          var alreadyInCart =
            typeof window.GcvExcCart.items === "function" &&
            window.GcvExcCart.items().some(function (it) {
              return it && it.id === cartData.cartId;
            });
          if (alreadyInCart) {
            removeExcursaoFromCart(cartData.cartId);
          } else if (typeof window.GcvExcCart.add === "function") {
            window.GcvExcCart.add(cartItemFromBook(block));
          }
          return;
        }
      }

      if (tryUnselectInCartCardFromHeadClick(e)) return;
    });

    document.addEventListener(
      "change",
      function (e) {
        var input = e.target;
        if (!input || !input.classList || !input.classList.contains("gcv-excursoes-card__qty-input")) return;
        var block = input.closest(".gcv-excursoes-card__book");
        if (block) {
          updateBookTotal(block);
          syncCartFromBook(block);
        }
      },
      true,
    );
  }

  function setCartAddButtonState(btn, inCart, dayBlocked, s) {
    if (!btn) return;
    btn.disabled = !!(dayBlocked && !inCart);
    if (dayBlocked && !inCart) {
      btn.classList.add("gcv-excursoes-card__cart-add--day-blocked");
      btn.setAttribute("title", s.cartSameDayBlocked || "");
      btn.setAttribute("aria-disabled", "true");
    } else {
      btn.classList.remove("gcv-excursoes-card__cart-add--day-blocked");
      btn.removeAttribute("title");
      btn.removeAttribute("aria-disabled");
    }
    if (inCart) {
      btn.classList.add("gcv-excursoes-card__cart-add--added");
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML =
        '<i class="ti ti-check" aria-hidden="true"></i> ' + escapeHtml(s.bookAddedCart || "Adicionado");
    } else {
      btn.classList.remove("gcv-excursoes-card__cart-add--added");
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML =
        '<i class="ti ti-shopping-cart" aria-hidden="true"></i> ' +
        escapeHtml(s.bookAddCart || "Adicionar ao carrinho");
    }
  }

  function removeExcursaoFromCart(cartId) {
    if (!cartId || !window.GcvExcCart || typeof window.GcvExcCart.remove !== "function") return;
    window.GcvExcCart.remove(cartId);
  }

  function tryUnselectInCartCardFromHeadClick(e) {
    var card = e.target.closest(".gcv-excursoes-card--in-cart");
    if (!card || !card.closest("#excursoes-junho")) return false;
    if (e.target.closest(".gcv-excursoes-card__book")) return false;
    if (e.target.closest(".gcv-excursoes-card__cart-mark")) return false;
    if (e.target.closest("a[href]")) return false;
    if (e.target.closest("[data-guia-profile]")) return false;
    if (!e.target.closest(".gcv-excursoes-card__head")) return false;
    var cartId = card.getAttribute("data-cart-id");
    if (!cartId) return false;
    e.preventDefault();
    removeExcursaoFromCart(cartId);
    return true;
  }

  function ensureCartMarkButton(card, badge) {
    var mark = card.querySelector(".gcv-excursoes-card__cart-mark");
    if (!mark) {
      mark = document.createElement("button");
      mark.type = "button";
      mark.className = "gcv-excursoes-card__cart-mark";
      card.insertBefore(mark, card.firstChild);
    } else if (mark.tagName !== "BUTTON") {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = mark.className;
      card.replaceChild(btn, mark);
      mark = btn;
    }
    mark.setAttribute("aria-label", badge);
    mark.innerHTML =
      '<span class="gcv-excursoes-card__cart-mark-text">' + escapeHtml(badge) + "</span>";
    return mark;
  }

  function dateheroTimeHtml(hora) {
    return (
      '<span class="gcv-excursoes-card__datehero-time">' +
      '<span class="gcv-excursoes-card__time">' +
      escapeHtml(hora) +
      "</span></span>"
    );
  }

  function syncDateheroCheck(card, inCart) {
    var slot = card.querySelector("[data-gcv-exc-datehero-slot]");
    var weekdayEl = card.querySelector(".gcv-excursoes-card__weekday");
    var hora = card.getAttribute("data-excursao-hora") || "";
    if (weekdayEl && !weekdayEl.getAttribute("data-gcv-weekday-label")) {
      weekdayEl.setAttribute("data-gcv-weekday-label", weekdayEl.textContent.trim());
    }
    var weekdayLabel = weekdayEl
      ? weekdayEl.getAttribute("data-gcv-weekday-label") || weekdayEl.textContent.trim()
      : "";
    if (!slot) return;
    if (inCart) {
      slot.innerHTML =
        '<span class="gcv-excursoes-card__datehero-check" aria-hidden="true">' +
        '<i class="ti ti-check" aria-hidden="true"></i></span>';
      if (weekdayEl && hora) {
        weekdayEl.innerHTML =
          '<span class="gcv-excursoes-card__time">' + escapeHtml(hora) + "</span>";
        weekdayEl.classList.add("gcv-excursoes-card__weekday--as-time");
      }
    } else {
      slot.innerHTML = hora ? dateheroTimeHtml(hora) : "";
      if (weekdayEl) {
        weekdayEl.textContent = weekdayLabel;
        weekdayEl.classList.remove("gcv-excursoes-card__weekday--as-time");
      }
    }
  }

  function syncExcursaoCartSelection(locale) {
    var root = document.getElementById("excursoes-junho");
    if (!root) return;
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    if (!locale && root.getAttribute("data-locale")) {
      loc = root.getAttribute("data-locale") === "en" || root.getAttribute("data-locale") === "es"
        ? root.getAttribute("data-locale")
        : "pt";
    }
    var strings = STRINGS[loc] || STRINGS.pt;
    var badge = strings.cartSelectedBadge || "Selecionado";
    var ids = {};
    if (window.GcvExcCart && typeof window.GcvExcCart.items === "function") {
      window.GcvExcCart.items().forEach(function (it) {
        if (it && it.id) ids[it.id] = true;
      });
    }
    var occupiedDates = {};
    if (window.GcvExcCart && typeof window.GcvExcCart.occupiedDates === "function") {
      occupiedDates = window.GcvExcCart.occupiedDates(window.GcvExcCart.items());
    }
    root.querySelectorAll(".gcv-excursoes-card").forEach(function (card) {
      var id =
        card.getAttribute("data-cart-id") ||
        ((card.querySelector("[data-cart-id]") && card.querySelector("[data-cart-id]").getAttribute("data-cart-id")) || "");
      var inCart = !!(id && ids[id]);
      var cardDateIso = card.getAttribute("data-excursao-date-iso") || "";
      var dayBlocked =
        !inCart &&
        !!cardDateIso &&
        !!occupiedDates[cardDateIso] &&
        occupiedDates[cardDateIso] !== id;
      card.classList.toggle("gcv-excursoes-card--in-cart", inCart);
      card.setAttribute("aria-selected", inCart ? "true" : "false");
      var mark = card.querySelector(".gcv-excursoes-card__cart-mark");
      var head = card.querySelector(".gcv-excursoes-card__head");
      if (inCart) {
        ensureCartMarkButton(card, badge);
        syncDateheroCheck(card, true);
        if (head) {
          head.setAttribute("data-gcv-exc-unselect", "");
        }
      } else {
        if (mark) mark.remove();
        syncDateheroCheck(card, false);
        if (head) {
          head.removeAttribute("data-gcv-exc-unselect");
        }
      }
      setCartAddButtonState(card.querySelector("[data-gcv-exc-cart-add]"), inCart, dayBlocked, strings);
    });
  }

  function initExcCart(locale) {
    if (!window.GcvExcCart || typeof window.GcvExcCart.init !== "function") return;
    window.GcvExcCart.init({
      strings: STRINGS,
      locale: locale,
      onChange: function () {
        var root = document.getElementById("excursoes-junho");
        var loc = root ? detectLocale(root) : locale;
        syncExcursaoCartSelection(loc);
      },
      onPay: function (total, detail, trigger) {
        var loc = locale;
        var strings = STRINGS[loc] || STRINGS.pt;
        if (detail && detail.trips && !validatePixTripQty(detail.trips)) {
          showExcToast(strings.pixBookingSoldOut, "warning");
          refreshExcursaoCarouselNow();
          return;
        }
        openPixModal(total, detail, trigger, loc, strings);
      },
      resolveDepartureMs: function (item) {
        if (!item || !item.id) return NaN;
        var root = document.getElementById("excursoes-junho");
        if (!root) return NaN;
        var rows = loadExcursaoRowsFromPayload(root);
        if (!rows) return NaN;
        for (var i = 0; i < rows.length; i++) {
          if (excursaoCartId(rows[i]) === item.id) return excursaoDepartureEpochMs(rows[i]);
        }
        return NaN;
      },
    });
    if (typeof window.GcvExcCart.purgeExpired === "function") window.GcvExcCart.purgeExpired();
    syncExcursaoCartSelection(locale);
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
      var section = document.getElementById("excursoes-junho");
      var locale = section ? detectLocale(section) : detectLocale(document.documentElement);
      initGuiaProfiles();
      initPixModal();
      initPixPollingHandlers();
      initBookingControls();
      initExcCart(locale);
      bootExcursaoCarousel();
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error("[gcv-excursoes]", err);
    }
  }

  /** @type {null | function(): void} */
  var refreshExcursaoCarouselRef = null;

  function refreshExcursaoCarouselNow() {
    if (typeof refreshExcursaoCarouselRef === "function") refreshExcursaoCarouselRef();
    if (window.GcvExcCart && typeof window.GcvExcCart.purgeExpired === "function") {
      window.GcvExcCart.purgeExpired();
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
    var rawRows = fromPayload && fromPayload.length ? fromPayload : fallbackRows;
    var allExcursoes = sortExcursaoByDeparture(filterFutureExcursoes(applyBookingOverlays(rawRows)));
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
      syncExcursaoCartSelection(locale);

      var isEmpty = carouselExcursoes.length === 0;
      if (emptyEl) {
        emptyEl.hidden = !isEmpty;
        emptyEl.textContent = isEmpty ? s.filterEmpty : "";
      }
      if (shell) shell.hidden = isEmpty;
    }

    renderTrackOnly();

    function cardCount() {
      return track.querySelectorAll(".gcv-excursoes-card").length;
    }

    function cardWidthPx() {
      var card = track.querySelector(".gcv-excursoes-card");
      return card && card.offsetWidth > 0 ? card.offsetWidth : CARD;
    }

    function trackWidthPx() {
      var sw = track.scrollWidth;
      if (sw > 0) return sw;
      var n = cardCount();
      var cw = cardWidthPx();
      return n * cw + Math.max(0, n - 1) * GAP;
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
      // Índice 0 = início real do trilho (scrollLeft 0), não offsetLeft do card (padding do track).
      var target =
        startIdx === 0 ? 0 : Math.max(0, Math.min(el.offsetLeft, maxScrollLeft()));
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
      var activeFilters = {};
      mountExcursaoFilters(filtersHost, s, allExcursoes, function (filters, resultsEl) {
        activeFilters = filters;
        carouselExcursoes = filterExcursaoList(allExcursoes, filters, s);
        if (resultsEl) resultsEl.textContent = tpl(s.filterResults, { n: carouselExcursoes.length });
        renderTrackOnly();
        viewport.scrollLeft = 0;
        syncCarouselUi();
      }, locale);

      function listSignature(list) {
        return (list || [])
          .map(function (e) {
            return excursaoCartId(e);
          })
          .join("|");
      }

      var lastBookingVer = window.GcvExcBookings ? window.GcvExcBookings.version() : 0;

      function refreshBookableFromClock() {
        var source = fromPayload && fromPayload.length ? fromPayload : fallbackRows;
        var freshAll = sortExcursaoByDeparture(filterFutureExcursoes(applyBookingOverlays(source)));
        if (window.GcvExcWaitlist && typeof window.GcvExcWaitlist.checkRowsForOpenedSpots === "function") {
          window.GcvExcWaitlist.checkRowsForOpenedSpots(freshAll, excursaoCartId, vagasDisponiveis);
        }
        var bookingVer = window.GcvExcBookings ? window.GcvExcBookings.version() : 0;
        var needsRender =
          listSignature(freshAll) !== listSignature(allExcursoes) || bookingVer !== lastBookingVer;
        lastBookingVer = bookingVer;
        if (needsRender) {
          allExcursoes = freshAll;
          if (!allExcursoes.length) {
            hideExcursaoSection(root);
          } else {
            root.removeAttribute("aria-hidden");
            root.style.display = "";
            carouselExcursoes = filterExcursaoList(allExcursoes, activeFilters, s);
            renderTrackOnly();
            syncCarouselUi();
          }
        } else {
          allExcursoes = freshAll;
        }
        if (window.GcvExcCart && typeof window.GcvExcCart.purgeExpired === "function") {
          window.GcvExcCart.purgeExpired();
        }
      }

      refreshExcursaoCarouselRef = refreshBookableFromClock;
      window.setInterval(refreshBookableFromClock, 30000);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refreshBookableFromClock();
      });
    } else {
      refreshExcursaoCarouselRef = function () {
        if (window.GcvExcCart && typeof window.GcvExcCart.purgeExpired === "function") {
          window.GcvExcCart.purgeExpired();
        }
      };
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

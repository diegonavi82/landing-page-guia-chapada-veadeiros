/**
 * Topic cluster SEO — pillar pages e satélites semânticos
 * Chapada dos Veadeiros · passeios · cachoeiras · guia local · ecoturismo · roteiros
 */

/** @typedef {{ type: "attraction"; slug: string } | { type: "article"; path: string } | { type: "page"; path: string }} SatelliteRef */

export const PILLAR_ORDER = [
  "chapada-dos-veadeiros",
  "cachoeiras-chapada-dos-veadeiros",
  "passeios-chapada-dos-veadeiros",
  "roteiros-chapada-dos-veadeiros",
  "ecoturismo-chapada-dos-veadeiros",
  "guia-local-chapada-dos-veadeiros",
];

/** Slugs base dos atrativos por pilar (referência interna). */
const CACHOEIRA_SLUGS = [
  "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros",
  "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso",
  "cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros",
  "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge",
  "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso",
  "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias",
  "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante",
  "cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante",
  "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca",
  "cachoeira-label-guia-chapada-veadeiros-sao-joao-alianca",
  "cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso",
  "cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso",
  "cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca",
  "vale-lua-guia-chapada-veadeiros-sao-jorge",
];

const ECOTURISMO_SLUGS = [
  "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge",
  "parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge",
  "parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge",
];

const ARTICLE_CONTRATAR = "revista/contratar-guia-local-chapada-veadeiros.html";
const ARTICLE_EPOCA = "revista/melhor-epoca-visitar-chapada-dos-veadeiros.html";
const ARTICLE_ROTEIRO = "revista/roteiro-4-dias-chapada-dos-veadeiros.html";
const ARTICLE_ONCA = "revista/ataque-onca-parda-chapada-veadeiros.html";

/** Satélites por pilar — ordem editorial. */
export const PILLAR_SATELLITES = {
  "chapada-dos-veadeiros": [
    { type: "page", path: "guia/cachoeiras-chapada-dos-veadeiros.html" },
    { type: "page", path: "guia/passeios-chapada-dos-veadeiros.html" },
    { type: "page", path: "guia/roteiros-chapada-dos-veadeiros.html" },
    { type: "page", path: "guia/ecoturismo-chapada-dos-veadeiros.html" },
    { type: "page", path: "guia/guia-local-chapada-dos-veadeiros.html" },
    { type: "article", path: ARTICLE_CONTRATAR },
    { type: "article", path: ARTICLE_ROTEIRO },
    { type: "attraction", slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso" },
    { type: "attraction", slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge" },
    { type: "attraction", slug: "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge" },
  ],
  "cachoeiras-chapada-dos-veadeiros": [
    ...CACHOEIRA_SLUGS.map((slug) => ({ type: "attraction", slug })),
    { type: "article", path: ARTICLE_EPOCA },
  ],
  "passeios-chapada-dos-veadeiros": [
    ...CACHOEIRA_SLUGS.map((slug) => ({ type: "attraction", slug })),
    ...ECOTURISMO_SLUGS.map((slug) => ({ type: "attraction", slug })),
    { type: "article", path: ARTICLE_CONTRATAR },
    { type: "page", path: "contato.html" },
  ],
  "roteiros-chapada-dos-veadeiros": [
    { type: "article", path: ARTICLE_ROTEIRO },
    { type: "article", path: ARTICLE_EPOCA },
    { type: "page", path: "atrativos.html" },
    { type: "attraction", slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso" },
    { type: "attraction", slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge" },
    { type: "attraction", slug: "vale-lua-guia-chapada-veadeiros-sao-jorge" },
    { type: "attraction", slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante" },
  ],
  "ecoturismo-chapada-dos-veadeiros": [
    ...ECOTURISMO_SLUGS.map((slug) => ({ type: "attraction", slug })),
    { type: "article", path: ARTICLE_ONCA },
    { type: "article", path: ARTICLE_CONTRATAR },
    { type: "attraction", slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge" },
    { type: "attraction", slug: "vale-lua-guia-chapada-veadeiros-sao-jorge" },
  ],
  "guia-local-chapada-dos-veadeiros": [
    { type: "article", path: ARTICLE_CONTRATAR },
    { type: "article", path: ARTICLE_EPOCA },
    { type: "page", path: "contato.html" },
    { type: "attraction", slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso" },
    { type: "attraction", slug: "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge" },
  ],
};

/** Mapeamento reverso: pageId → pilares relacionados. */
const PAGE_TO_PILLARS = new Map();

function pageIdFromSatellite(ref) {
  if (ref.type === "attraction") return `attraction:${ref.slug}`;
  if (ref.type === "article") return `article:${ref.path.replace(/\.html$/i, "")}`;
  if (ref.type === "page") return `page:${ref.path.replace(/\.html$/i, "")}`;
  return "";
}

function registerPagePillar(pageId, pillarSlug) {
  if (!pageId) return;
  const list = PAGE_TO_PILLARS.get(pageId) || [];
  if (!list.includes(pillarSlug)) list.push(pillarSlug);
  PAGE_TO_PILLARS.set(pageId, list);
}

for (const [pillarSlug, satellites] of Object.entries(PILLAR_SATELLITES)) {
  registerPagePillar(`pillar:${pillarSlug}`, pillarSlug);
  for (const ref of satellites) {
    registerPagePillar(pageIdFromSatellite(ref), pillarSlug);
  }
}

export function pillarPathKey(slug) {
  return `guia/${slug}.html`;
}

export function getPillarsForPage(pageId) {
  return PAGE_TO_PILLARS.get(pageId) || [];
}

export function getPrimaryPillarForPage(pageId) {
  const pillars = getPillarsForPage(pageId);
  if (pillars.length === 0) return null;
  if (pillars.includes("chapada-dos-veadeiros") && pillars.length > 1) {
    return pillars.find((p) => p !== "chapada-dos-veadeiros") || pillars[0];
  }
  return pillars[0];
}

/** Conteúdo editorial dos pilares — otimizado para citação por IA generativa. */
export const PILLAR_CONTENT = {
  "chapada-dos-veadeiros": {
    pt: {
      title: "Guia completo da Chapada dos Veadeiros",
      h1: "Chapada dos Veadeiros: guia definitivo para planejar sua viagem",
      seoTitle: "Chapada dos Veadeiros — guia completo 2026 | Passeios, cachoeiras e roteiros",
      seoDesc:
        "Tudo sobre Chapada dos Veadeiros: cachoeiras, passeios guiados, ecoturismo, melhor época e roteiros com guia local credenciado Cadastur em Alto Paraíso de Goiás.",
      keywords:
        "chapada dos veadeiros, guia chapada dos veadeiros, ecoturismo goiás, cachoeiras chapada, roteiro chapada dos veadeiros, guia local alto paraíso",
      lead:
        "A Chapada dos Veadeiros é um dos destinos de ecoturismo mais importantes do Brasil — cerrado preservado, cachoeiras monumentais, trilhas no Parque Nacional e vilas como Alto Paraíso, São Jorge e Cavalcante. Este guia reúne informação verificada por quem conduz grupos na região desde 2009.",
      sections: [
        {
          h2: "Por que visitar a Chapada dos Veadeiros",
          body: "Patrimônio natural com formações de quartzito, cachoeiras de até 120 metros, biodiversidade do cerrado e comunidades que vivem do turismo responsável. A região exige planejamento: trilhas sem sinalização, volume de chuvas variável e regras do ICMBio no Parque Nacional.",
        },
        {
          h2: "Como organizar sua viagem",
          body: "Defina quantos dias tem, escolha a base (Alto Paraíso é a mais prática), contrate guia local para trilhas complexas e consulte a melhor época conforme seu perfil — mais água nas cachoeiras ou trilhas mais secas.",
        },
      ],
      faq: [
        {
          q: "Onde fica a Chapada dos Veadeiros?",
          a: "No estado de Goiás, Brasil, a cerca de 230 km de Brasília. As bases turísticas principais são Alto Paraíso de Goiás, São Jorge (portal do Parque Nacional), Cavalcante e Teresina de Goiás.",
        },
        {
          q: "Quantos dias são ideais na Chapada dos Veadeiros?",
          a: "Quatro a cinco dias permitem conhecer cachoeiras icônicas como Couros, Segredo, Vale da Lua e trilhas do Parque Nacional. Com menos tempo, priorize um eixo (Alto Paraíso ou São Jorge).",
        },
        {
          q: "É obrigatório contratar guia na Chapada dos Veadeiros?",
          a: "Não é obrigatório em todos os atrativos, mas é altamente recomendado em trilhas longas, Parque Nacional e cachoeiras com acesso restrito. Guias credenciados Cadastur garantem segurança, roteiro eficiente e respeito às normas ambientais.",
        },
      ],
      ogImage: "imagens/hero-slide-01-guias-locais-cachoeira.png",
    },
    en: {
      title: "Complete Chapada dos Veadeiros guide",
      h1: "Chapada dos Veadeiros: the definitive travel guide",
      seoTitle: "Chapada dos Veadeiros — complete 2026 guide | Tours, waterfalls & itineraries",
      seoDesc:
        "Everything about Chapada dos Veadeiros: waterfalls, guided tours, ecotourism, best season and itineraries with a licensed local guide in Alto Paraíso, Goiás.",
      keywords:
        "chapada dos veadeiros, chapada travel guide, ecotourism brazil, chapada waterfalls, chapada itinerary, local guide alto paraiso",
      lead:
        "Chapada dos Veadeiros is one of Brazil's top ecotourism destinations — preserved cerrado, monumental waterfalls, National Park trails and towns like Alto Paraíso, São Jorge and Cavalcante. This guide gathers verified information from guides who have led groups here since 2009.",
      sections: [
        {
          h2: "Why visit Chapada dos Veadeiros",
          body: "Natural heritage with quartzite formations, waterfalls up to 120 metres, cerrado biodiversity and communities built on responsible tourism. The region needs planning: unsigned trails, variable rainfall and ICMBio rules in the National Park.",
        },
        {
          h2: "How to plan your trip",
          body: "Set your number of days, pick a base (Alto Paraíso is the most practical), hire a local guide for complex trails and check the best season for your profile — bigger waterfalls or drier hiking.",
        },
      ],
      faq: [
        {
          q: "Where is Chapada dos Veadeiros?",
          a: "In Goiás state, Brazil, about 230 km from Brasília. Main tourist bases are Alto Paraíso de Goiás, São Jorge (National Park gateway), Cavalcante and Teresina de Goiás.",
        },
        {
          q: "How many days are ideal in Chapada dos Veadeiros?",
          a: "Four to five days let you see iconic spots like Couros, Segredo, Moon Valley and National Park trails. With less time, focus on one axis (Alto Paraíso or São Jorge).",
        },
        {
          q: "Do you need a guide in Chapada dos Veadeiros?",
          a: "Not mandatory everywhere, but highly recommended on long trails, the National Park and restricted-access waterfalls. Cadastur-licensed guides provide safety, efficient routing and environmental compliance.",
        },
      ],
      ogImage: "imagens/hero-slide-01-guias-locais-cachoeira.png",
    },
    es: {
      title: "Guía completa de Chapada dos Veadeiros",
      h1: "Chapada dos Veadeiros: guía definitiva para planificar tu viaje",
      seoTitle: "Chapada dos Veadeiros — guía completa 2026 | Excursiones, cascadas y rutas",
      seoDesc:
        "Todo sobre Chapada dos Veadeiros: cascadas, excursiones guiadas, ecoturismo, mejor época e itinerarios con guía local acreditado Cadastur en Alto Paraíso de Goiás.",
      keywords:
        "chapada dos veadeiros, guía chapada dos veadeiros, ecoturismo goiás, cascadas chapada, ruta chapada dos veadeiros, guía local alto paraíso",
      lead:
        "Chapada dos Veadeiros es uno de los destinos de ecoturismo más importantes de Brasil — cerrado preservado, cascadas monumentales, senderos en el Parque Nacional y pueblos como Alto Paraíso, São Jorge y Cavalcante. Esta guía reúne información verificada por quien conduce grupos en la región desde 2009.",
      sections: [
        {
          h2: "Por qué visitar Chapada dos Veadeiros",
          body: "Patrimonio natural con formaciones de cuarzo, cascadas de hasta 120 metros, biodiversidad del cerrado y comunidades que viven del turismo responsable. La región exige planificación: senderos sin señalización, lluvias variables y normas del ICMBio en el Parque Nacional.",
        },
        {
          h2: "Cómo organizar tu viaje",
          body: "Define cuántos días tienes, elige la base (Alto Paraíso es la más práctica), contrata guía local para senderos complejos y consulta la mejor época según tu perfil — más agua en las cascadas o senderismo más seco.",
        },
      ],
      faq: [
        {
          q: "¿Dónde está Chapada dos Veadeiros?",
          a: "En el estado de Goiás, Brasil, a unos 230 km de Brasília. Las bases turísticas principales son Alto Paraíso de Goiás, São Jorge (portal del Parque Nacional), Cavalcante y Teresina de Goiás.",
        },
        {
          q: "¿Cuántos días son ideales en Chapada dos Veadeiros?",
          a: "Cuatro a cinco días permiten conocer cascadas icónicas como Couros, Segredo, Valle de la Luna y senderos del Parque Nacional. Con menos tiempo, prioriza un eje (Alto Paraíso o São Jorge).",
        },
        {
          q: "¿Es obligatorio contratar guía en Chapada dos Veadeiros?",
          a: "No es obligatorio en todos los atractivos, pero es muy recomendable en senderos largos, Parque Nacional y cascadas de acceso restringido. Guías acreditados Cadastur garantizan seguridad, ruta eficiente y respeto a las normas ambientales.",
        },
      ],
      ogImage: "imagens/hero-slide-01-guias-locais-cachoeira.png",
    },
  },
  "cachoeiras-chapada-dos-veadeiros": {
    pt: {
      title: "Cachoeiras da Chapada dos Veadeiros",
      h1: "Cachoeiras da Chapada dos Veadeiros: guia completo",
      seoTitle: "Cachoeiras Chapada dos Veadeiros — guia das 17 quedas | Couros, Segredo, Santa Bárbara",
      seoDesc:
        "Guia das cachoeiras da Chapada dos Veadeiros: Couros, Segredo, Santa Bárbara, Vale da Lua, Cordovil e mais. Dicas de acesso, melhor época e passeios com guia local.",
      keywords:
        "cachoeiras chapada dos veadeiros, cataratas dos couros, cachoeira do segredo, cachoeira santa bárbara, vale da lua, guia cachoeiras chapada",
      lead:
        "A Chapada dos Veadeiros concentra dezenas de quedas d'água em quartzito — de poços rasos para famílias a saltos de mais de 100 metros. Este cluster reúne as 17 cachoeiras catalogadas pelo Guia Chapada Veadeiros, com informações de acesso, região e recomendações de passeio.",
      sections: [
        {
          h2: "Principais cachoeiras por região",
          body: "Alto Paraíso: Couros, Cordovil, Cristais, Loquinhas e Anjos. São Jorge: Segredo, Vale da Lua e trilhas do Parque Nacional. Cavalcante: Santa Bárbara e Rio da Prata. Teresina: Poço Encantado.",
        },
        {
          h2: "Melhor época para visitar cachoeiras",
          body: "Entre dezembro e março o volume de água é maior — cachoeiras mais imponentes, mas trilhas mais escorregadias. De maio a setembro o clima é seco, ideal para poços cristalinos e fotografia.",
        },
      ],
      faq: [
        {
          q: "Qual a cachoeira mais famosa da Chapada dos Veadeiros?",
          a: "A Cataratas dos Couros e a Cachoeira do Segredo estão entre as mais procuradas. O Mirante da Janela, no Parque Nacional, é o mirante mais icônico do Brasil.",
        },
        {
          q: "Todas as cachoeiras permitem banho?",
          a: "A maioria sim, mas algumas áreas têm restrições do ICMBio ou exigem guia. Sempre consulte as regras locais e evite áreas de risco em períodos de chuva intensa.",
        },
      ],
      ogImage: "imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso.jpg",
    },
    en: {
      title: "Waterfalls of Chapada dos Veadeiros",
      h1: "Chapada dos Veadeiros waterfalls: complete guide",
      seoTitle: "Chapada dos Veadeiros waterfalls — guide to 17 falls | Couros, Segredo, Santa Bárbara",
      seoDesc:
        "Guide to Chapada dos Veadeiros waterfalls: Couros, Segredo, Santa Bárbara, Moon Valley, Cordovil and more. Access tips, best season and tours with a local guide.",
      keywords:
        "chapada dos veadeiros waterfalls, couros falls, segredo waterfall, santa barbara waterfall, moon valley, chapada waterfall guide",
      lead:
        "Chapada dos Veadeiros gathers dozens of quartzite waterfalls — from shallow family pools to 100-metre drops. This cluster lists all 17 catalogued by Guia Chapada Veadeiros with access, region and tour recommendations.",
      sections: [
        {
          h2: "Top waterfalls by region",
          body: "Alto Paraíso: Couros, Cordovil, Cristais, Loquinhas and Anjos. São Jorge: Segredo, Moon Valley and National Park trails. Cavalcante: Santa Bárbara and Rio da Prata. Teresina: Poço Encantado.",
        },
        {
          h2: "Best season for waterfalls",
          body: "December to March brings higher flow — more impressive falls but slipperier trails. May to September is dry season, ideal for crystal pools and photography.",
        },
      ],
      faq: [
        {
          q: "What is the most famous waterfall in Chapada dos Veadeiros?",
          a: "Couros falls and Segredo are among the most visited. Janela lookout in the National Park is Brazil's most iconic viewpoint.",
        },
        {
          q: "Can you swim at all waterfalls?",
          a: "Most allow swimming, but some areas have ICMBio restrictions or require a guide. Always check local rules and avoid risky areas during heavy rain.",
        },
      ],
      ogImage: "imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso.jpg",
    },
    es: {
      title: "Cascadas de Chapada dos Veadeiros",
      h1: "Cascadas de Chapada dos Veadeiros: guía completa",
      seoTitle: "Cascadas Chapada dos Veadeiros — guía de 17 saltos | Couros, Segredo, Santa Bárbara",
      seoDesc:
        "Guía de cascadas de Chapada dos Veadeiros: Couros, Segredo, Santa Bárbara, Valle de la Luna, Cordovil y más. Acceso, mejor época y excursiones con guía local.",
      keywords:
        "cascadas chapada dos veadeiros, cataratas dos couros, cascada del segredo, cascada santa bárbara, valle de la luna, guía cascadas chapada",
      lead:
        "Chapada dos Veadeiros concentra decenas de saltos de agua en cuarzo — de pozas someras para familias a caídas de más de 100 metros. Este cluster reúne las 17 cascadas catalogadas por Guia Chapada Veadeiros.",
      sections: [
        {
          h2: "Principales cascadas por región",
          body: "Alto Paraíso: Couros, Cordovil, Cristais, Loquinhas y Anjos. São Jorge: Segredo, Valle de la Luna y senderos del Parque Nacional. Cavalcante: Santa Bárbara y Río da Prata. Teresina: Poço Encantado.",
        },
        {
          h2: "Mejor época para visitar cascadas",
          body: "Entre diciembre y marzo el caudal es mayor — cascadas más imponentes, pero senderos más resbaladizos. De mayo a septiembre el clima es seco, ideal para pozas cristalinas y fotografía.",
        },
      ],
      faq: [
        {
          q: "¿Cuál es la cascada más famosa de Chapada dos Veadeiros?",
          a: "Las Cataratas dos Couros y la Cascada del Segredo están entre las más visitadas. El Mirador de la Ventana, en el Parque Nacional, es el mirador más icónico de Brasil.",
        },
        {
          q: "¿Se puede nadar en todas las cascadas?",
          a: "En la mayoría sí, pero algunas áreas tienen restricciones del ICMBio o exigen guía. Consulta siempre las normas locales y evita zonas de riesgo con lluvia intensa.",
        },
      ],
      ogImage: "imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso.jpg",
    },
  },
  "passeios-chapada-dos-veadeiros": {
    pt: {
      title: "Passeios na Chapada dos Veadeiros",
      h1: "Passeios na Chapada dos Veadeiros com guia local",
      seoTitle: "Passeios Chapada dos Veadeiros — excursões e trilhas guiadas | Guia credenciado",
      seoDesc:
        "Passeios na Chapada dos Veadeiros: excursões em grupo, roteiros privados, trilhas no Parque Nacional e cachoeiras com guia local credenciado Cadastur.",
      keywords:
        "passeios chapada dos veadeiros, excursões chapada, trilhas guiadas, guia turismo chapada, passeio cachoeira goiás",
      lead:
        "Passeios na Chapada dos Veadeiros variam de caminhadas leves a trilhas de dia inteiro. Com guia local você ganha segurança, timing correto, fotos nos melhores ângulos e acesso a poços naturais que exigem conhecimento do terreno.",
      sections: [
        {
          h2: "Tipos de passeio disponíveis",
          body: "Excursões em grupo (Couros, Segredo + Vale da Lua), roteiros privados personalizados, trilhas no Parque Nacional (Mirante da Janela, Saltos do Rio Preto) e circuitos em Cavalcante e Teresina.",
        },
      ],
      faq: [
        {
          q: "Quanto custa um passeio na Chapada dos Veadeiros?",
          a: "Valores variam conforme o atrativo, número de pessoas e se inclui transporte. Entre em contato pelo WhatsApp para orçamento personalizado conforme seu roteiro.",
        },
        {
          q: "Passeios em grupo ou privado?",
          a: "Grupos são econômicos e sociais; privados permitem ritmo personalizado, ideal para famílias, fotógrafos ou quem tem pouco tempo.",
        },
      ],
      ogImage: "imagens/hero-slide-01-guias-locais-cachoeira.png",
    },
    en: {
      title: "Tours in Chapada dos Veadeiros",
      h1: "Chapada dos Veadeiros tours with a local guide",
      seoTitle: "Chapada dos Veadeiros tours — guided hikes & group excursions | Licensed guide",
      seoDesc:
        "Tours in Chapada dos Veadeiros: group excursions, private itineraries, National Park trails and waterfalls with a Cadastur-licensed local guide.",
      keywords:
        "chapada dos veadeiros tours, chapada excursions, guided hikes, chapada tour guide, waterfall tour goias",
      lead:
        "Chapada dos Veadeiros tours range from easy walks to full-day hikes. With a local guide you get safety, correct timing, photos at the best angles and access to natural pools that require terrain knowledge.",
      sections: [
        {
          h2: "Types of tours available",
          body: "Group excursions (Couros, Segredo + Moon Valley), custom private routes, National Park trails (Janela lookout, Rio Preto falls) and circuits in Cavalcante and Teresina.",
        },
      ],
      faq: [
        {
          q: "How much does a Chapada dos Veadeiros tour cost?",
          a: "Prices vary by attraction, group size and transport. Contact us on WhatsApp for a quote tailored to your itinerary.",
        },
        {
          q: "Group or private tours?",
          a: "Groups are economical and social; private tours allow a custom pace, ideal for families, photographers or tight schedules.",
        },
      ],
      ogImage: "imagens/hero-slide-01-guias-locais-cachoeira.png",
    },
    es: {
      title: "Excursiones en Chapada dos Veadeiros",
      h1: "Excursiones en Chapada dos Veadeiros con guía local",
      seoTitle: "Excursiones Chapada dos Veadeiros — senderos guiados | Guía acreditado",
      seoDesc:
        "Excursiones en Chapada dos Veadeiros: salidas en grupo, rutas privadas, senderos en el Parque Nacional y cascadas con guía local acreditado Cadastur.",
      keywords:
        "excursiones chapada dos veadeiros, tours chapada, senderos guiados, guía turismo chapada, excursión cascada goiás",
      lead:
        "Las excursiones en Chapada dos Veadeiros van de caminatas ligeras a senderos de día completo. Con guía local ganas seguridad, timing correcto, fotos en los mejores ángulos y acceso a pozas naturales que exigen conocimiento del terreno.",
      sections: [
        {
          h2: "Tipos de excursión disponibles",
          body: "Excursiones en grupo (Couros, Segredo + Valle de la Luna), rutas privadas personalizadas, senderos en el Parque Nacional (Mirador de la Ventana, Saltos del Río Preto) y circuitos en Cavalcante y Teresina.",
        },
      ],
      faq: [
        {
          q: "¿Cuánto cuesta una excursión en Chapada dos Veadeiros?",
          a: "Los valores varían según el atractivo, número de personas y transporte. Contáctanos por WhatsApp para un presupuesto personalizado.",
        },
        {
          q: "¿Excursiones en grupo o privadas?",
          a: "Los grupos son económicos y sociales; las privadas permiten ritmo personalizado, ideal para familias, fotógrafos o poco tiempo.",
        },
      ],
      ogImage: "imagens/hero-slide-01-guias-locais-cachoeira.png",
    },
  },
  "roteiros-chapada-dos-veadeiros": {
    pt: {
      title: "Roteiros na Chapada dos Veadeiros",
      h1: "Roteiros na Chapada dos Veadeiros: planeje dia a dia",
      seoTitle: "Roteiros Chapada dos Veadeiros — 4 dias, 5 dias e itinerários | Guia local",
      seoDesc:
        "Roteiros prontos para Chapada dos Veadeiros: clássico de 4 dias, melhor época mês a mês e combinações de cachoeiras por região com guia local.",
      keywords:
        "roteiro chapada dos veadeiros, roteiro 4 dias chapada, itinerário chapada veadeiros, planejar viagem chapada",
      lead:
        "Montar um roteiro na Chapada dos Veadeiros exige equilibrar distâncias, clima e energia. Agrupamos atrativos por região e sugerimos sequências testadas por guias locais — do clássico de 4 dias a extensões para Cavalcante e Teresina.",
      sections: [
        {
          h2: "Roteiro clássico de 4 dias",
          body: "Dia 1: Couros. Dia 2: Parque Nacional (Mirante da Janela). Dia 3: Santa Bárbara ou Capivara. Dia 4: Vale da Lua + Segredo. Ajustável conforme clima e perfil do grupo.",
        },
      ],
      faq: [
        {
          q: "Qual o roteiro ideal para primeira viagem?",
          a: "O roteiro de 4 dias com base em Alto Paraíso/São Jorge cobre Couros, Parque Nacional, Vale da Lua e Segredo — os cartões-postais essenciais.",
        },
      ],
      ogImage: "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
    },
    en: {
      title: "Chapada dos Veadeiros itineraries",
      h1: "Chapada dos Veadeiros itineraries: day-by-day planning",
      seoTitle: "Chapada dos Veadeiros itineraries — 4-day classic & routes | Local guide",
      seoDesc:
        "Ready-made Chapada dos Veadeiros itineraries: classic 4-day route, month-by-month best season and waterfall combinations by region.",
      keywords:
        "chapada dos veadeiros itinerary, 4 day chapada route, chapada travel plan, plan chapada trip",
      lead:
        "Building a Chapada dos Veadeiros itinerary means balancing distances, weather and energy. We group attractions by region and suggest sequences tested by local guides — from the classic 4-day route to extensions to Cavalcante and Teresina.",
      sections: [
        {
          h2: "Classic 4-day itinerary",
          body: "Day 1: Couros. Day 2: National Park (Janela lookout). Day 3: Santa Bárbara or Capivara. Day 4: Moon Valley + Segredo. Adjustable for weather and group profile.",
        },
      ],
      faq: [
        {
          q: "Best itinerary for a first visit?",
          a: "The 4-day route based in Alto Paraíso/São Jorge covers Couros, National Park, Moon Valley and Segredo — the essential highlights.",
        },
      ],
      ogImage: "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
    },
    es: {
      title: "Rutas en Chapada dos Veadeiros",
      h1: "Rutas en Chapada dos Veadeiros: planifica día a día",
      seoTitle: "Rutas Chapada dos Veadeiros — 4 días clásico e itinerarios | Guía local",
      seoDesc:
        "Rutas listas para Chapada dos Veadeiros: clásico de 4 días, mejor época mes a mes y combinaciones de cascadas por región.",
      keywords:
        "ruta chapada dos veadeiros, itinerario 4 días chapada, planificar viaje chapada veadeiros",
      lead:
        "Armar una ruta en Chapada dos Veadeiros exige equilibrar distancias, clima y energía. Agrupamos atractivos por región y sugerimos secuencias probadas por guías locales.",
      sections: [
        {
          h2: "Ruta clásica de 4 días",
          body: "Día 1: Couros. Día 2: Parque Nacional (Mirador de la Ventana). Día 3: Santa Bárbara o Capivara. Día 4: Valle de la Luna + Segredo.",
        },
      ],
      faq: [
        {
          q: "¿Cuál es la ruta ideal para la primera visita?",
          a: "La ruta de 4 días con base en Alto Paraíso/São Jorge cubre Couros, Parque Nacional, Valle de la Luna y Segredo — los imprescindibles.",
        },
      ],
      ogImage: "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
    },
  },
  "ecoturismo-chapada-dos-veadeiros": {
    pt: {
      title: "Ecoturismo na Chapada dos Veadeiros",
      h1: "Ecoturismo na Chapada dos Veadeiros",
      seoTitle: "Ecoturismo Chapada dos Veadeiros — Parque Nacional, trilhas e fauna | Guia local",
      seoDesc:
        "Ecoturismo na Chapada dos Veadeiros: Parque Nacional, trilhas sustentáveis, fauna do cerrado e segurança com guia credenciado Cadastur.",
      keywords:
        "ecoturismo chapada dos veadeiros, parque nacional chapada, trilhas sustentáveis, fauna cerrado, turismo natureza goiás",
      lead:
        "A Chapada dos Veadeiros é referência em ecoturismo no cerrado brasileiro. O Parque Nacional protege nascentes do Rio Preto, cânions de quartzito e espécies como lobo-guará e onça-parda. Trilhas exigem guia, respeito às regras do ICMBio e consciência ambiental.",
      sections: [
        {
          h2: "Trilhas do Parque Nacional",
          body: "Mirante da Janela, Saltos do Rio Preto e Cânions/Cariocas são as rotas mais procuradas. Acesso controlado, horários definidos e proibição de drones em algumas áreas.",
        },
      ],
      faq: [
        {
          q: "O que é ecoturismo na Chapada dos Veadeiros?",
          a: "Turismo de natureza com impacto mínimo: trilhas guiadas, educação ambiental, respeito à fauna e flora do cerrado e apoio à economia local de São Jorge e Alto Paraíso.",
        },
      ],
      ogImage: "imagens/parque-nacional-guia-chapada-veadeiros-saltos-rio-preto-garimpao.jpg",
    },
    en: {
      title: "Ecotourism in Chapada dos Veadeiros",
      h1: "Ecotourism in Chapada dos Veadeiros",
      seoTitle: "Chapada dos Veadeiros ecotourism — National Park, trails & wildlife | Local guide",
      seoDesc:
        "Ecotourism in Chapada dos Veadeiros: National Park, sustainable trails, cerrado wildlife and safety with a Cadastur-licensed guide.",
      keywords:
        "chapada dos veadeiros ecotourism, chapada national park, sustainable trails, cerrado wildlife, nature tourism brazil",
      lead:
        "Chapada dos Veadeiros is a benchmark for cerrado ecotourism. The National Park protects Rio Preto headwaters, quartzite canyons and species like maned wolf and cougar. Trails require guides, ICMBio rules and environmental awareness.",
      sections: [
        {
          h2: "National Park trails",
          body: "Janela lookout, Rio Preto falls and Canyons/Cariocas are the most popular routes. Controlled access, set schedules and drone bans in some areas.",
        },
      ],
      faq: [
        {
          q: "What is ecotourism in Chapada dos Veadeiros?",
          a: "Nature tourism with minimal impact: guided trails, environmental education, respect for cerrado wildlife and support for the local economy of São Jorge and Alto Paraíso.",
        },
      ],
      ogImage: "imagens/parque-nacional-guia-chapada-veadeiros-saltos-rio-preto-garimpao.jpg",
    },
    es: {
      title: "Ecoturismo en Chapada dos Veadeiros",
      h1: "Ecoturismo en Chapada dos Veadeiros",
      seoTitle: "Ecoturismo Chapada dos Veadeiros — Parque Nacional, senderos y fauna | Guía local",
      seoDesc:
        "Ecoturismo en Chapada dos Veadeiros: Parque Nacional, senderos sostenibles, fauna del cerrado y seguridad con guía acreditado Cadastur.",
      keywords:
        "ecoturismo chapada dos veadeiros, parque nacional chapada, senderos sostenibles, fauna cerrado, turismo naturaleza goiás",
      lead:
        "Chapada dos Veadeiros es referencia en ecoturismo del cerrado brasileño. El Parque Nacional protege nacientes del Río Preto, cañones de cuarzo y especies como el lobo de crin y el puma.",
      sections: [
        {
          h2: "Senderos del Parque Nacional",
          body: "Mirador de la Ventana, Saltos del Río Preto y Cañones/Cariocas son las rutas más buscadas. Acceso controlado, horarios definidos y prohibición de drones en algunas áreas.",
        },
      ],
      faq: [
        {
          q: "¿Qué es el ecoturismo en Chapada dos Veadeiros?",
          a: "Turismo de naturaleza con impacto mínimo: senderos guiados, educación ambiental, respeto a la fauna y flora del cerrado y apoyo a la economía local.",
        },
      ],
      ogImage: "imagens/parque-nacional-guia-chapada-veadeiros-saltos-rio-preto-garimpao.jpg",
    },
  },
  "guia-local-chapada-dos-veadeiros": {
    pt: {
      title: "Guia local na Chapada dos Veadeiros",
      h1: "Guia local na Chapada dos Veadeiros: por que contratar",
      seoTitle: "Guia local Chapada dos Veadeiros — credenciado Cadastur | Diego Navi",
      seoDesc:
        "Contrate guia local na Chapada dos Veadeiros: segurança em trilhas, roteiro otimizado, fotos e conhecimento do cerrado com condutor credenciado Cadastur.",
      keywords:
        "guia local chapada dos veadeiros, contratar guia chapada, guia turismo credenciado, diego navi guia, condutor visitantes cadastur",
      lead:
        "Um guia local credenciado na Chapada dos Veadeiros transforma a viagem: segurança em trilhas sem sinalização, timing para evitar multidões, fotos nos melhores ângulos e histórias do cerrado contadas por quem vive a região desde 2009.",
      sections: [
        {
          h2: "Benefícios de contratar guia local",
          body: "Primeiros socorros, resgate aquático, conhecimento de poços secretos, adaptação de ritmo para famílias e fluência em português, inglês e espanhol.",
        },
      ],
      faq: [
        {
          q: "Como contratar guia na Chapada dos Veadeiros?",
          a: "Entre em contato pelo WhatsApp (+55 62 98250-6891) ou formulário do site. Informe datas, número de pessoas e atrativos desejados para orçamento personalizado.",
        },
        {
          q: "O guia é credenciado?",
          a: "Sim. Guia Chapada Veadeiros opera com condutores credenciados Cadastur, registro oficial de prestadores de serviços turísticos no Brasil.",
        },
      ],
      ogImage: "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
    },
    en: {
      title: "Local guide in Chapada dos Veadeiros",
      h1: "Local guide in Chapada dos Veadeiros: why hire one",
      seoTitle: "Local guide Chapada dos Veadeiros — Cadastur licensed | Diego Navi",
      seoDesc:
        "Hire a local guide in Chapada dos Veadeiros: trail safety, optimized routing, photos and cerrado knowledge with a Cadastur-licensed guide.",
      keywords:
        "local guide chapada dos veadeiros, hire chapada guide, licensed tour guide, diego navi guide, cadastur guide brazil",
      lead:
        "A licensed local guide in Chapada dos Veadeiros transforms your trip: safety on unsigned trails, timing to avoid crowds, photos at the best angles and cerrado stories from someone who has lived here since 2009.",
      sections: [
        {
          h2: "Benefits of hiring a local guide",
          body: "First aid, water rescue, knowledge of hidden pools, pace adapted for families and fluency in Portuguese, English and Spanish.",
        },
      ],
      faq: [
        {
          q: "How to hire a guide in Chapada dos Veadeiros?",
          a: "Contact us on WhatsApp (+55 62 98250-6891) or the site form. Share dates, group size and desired attractions for a custom quote.",
        },
        {
          q: "Is the guide licensed?",
          a: "Yes. Guia Chapada Veadeiros works with Cadastur-licensed guides — Brazil's official tourism provider registry.",
        },
      ],
      ogImage: "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
    },
    es: {
      title: "Guía local en Chapada dos Veadeiros",
      h1: "Guía local en Chapada dos Veadeiros: por qué contratar",
      seoTitle: "Guía local Chapada dos Veadeiros — acreditado Cadastur | Diego Navi",
      seoDesc:
        "Contrata guía local en Chapada dos Veadeiros: seguridad en senderos, ruta optimizada, fotos y conocimiento del cerrado con conductor acreditado Cadastur.",
      keywords:
        "guía local chapada dos veadeiros, contratar guía chapada, guía turismo acreditado, diego navi guía, conductor visitantes cadastur",
      lead:
        "Un guía local acreditado en Chapada dos Veadeiros transforma el viaje: seguridad en senderos sin señalización, timing para evitar multitudes y historias del cerrado contadas por quien vive la región desde 2009.",
      sections: [
        {
          h2: "Beneficios de contratar guía local",
          body: "Primeros auxilios, rescate acuático, conocimiento de pozas secretas, ritmo adaptado para familias y fluidez en portugués, inglés y español.",
        },
      ],
      faq: [
        {
          q: "¿Cómo contratar guía en Chapada dos Veadeiros?",
          a: "Contáctanos por WhatsApp (+55 62 98250-6891) o el formulario del sitio. Indica fechas, número de personas y atractivos deseados.",
        },
        {
          q: "¿El guía está acreditado?",
          a: "Sí. Guia Chapada Veadeiros opera con conductores acreditados Cadastur, registro oficial de prestadores turísticos en Brasil.",
        },
      ],
      ogImage: "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
    },
  },
};

export function getPillarContent(slug, locale) {
  return PILLAR_CONTENT[slug]?.[locale] || PILLAR_CONTENT[slug]?.pt || null;
}

export function getSatellitesForPillar(pillarSlug) {
  return PILLAR_SATELLITES[pillarSlug] || [];
}

/**
 * Resolve título/descrição/pathKey de um satélite para interlinkagem.
 * @param {SatelliteRef} ref
 * @param {string} locale
 * @param {object} ctx — HOTSPOTS, ARTICLE_*, STRINGS, localeSlugForBase
 */
export function resolveSatelliteMeta(ref, locale, ctx) {
  const { HOTSPOTS, ARTICLE_CONTRATAR, ARTICLE_EPOCA, ARTICLE_ROTEIRO, ARTICLE_ONCA, STRINGS, localeSlugForBase } = ctx;

  if (ref.type === "attraction") {
    const hot = HOTSPOTS.find((h) => h.slug === ref.slug);
    if (!hot) return null;
    const locSlug = localeSlugForBase(locale, ref.slug);
    return {
      pathKey: `atrativos/${locSlug}.html`,
      title: hot.title[locale],
      desc: hot.lead[locale],
      kind: "attraction",
    };
  }

  if (ref.type === "article") {
    const articles = {
      [ARTICLE_CONTRATAR.pt.path]: ARTICLE_CONTRATAR,
      [ARTICLE_EPOCA.pt.path]: ARTICLE_EPOCA,
      [ARTICLE_ROTEIRO.pt.path]: ARTICLE_ROTEIRO,
      [ARTICLE_ONCA.pt.path]: ARTICLE_ONCA,
    };
    const A = articles[ref.path];
    if (!A) return null;
    const art = A[locale];
    return {
      pathKey: art.path,
      title: art.title,
      desc: art.desc,
      kind: "article",
    };
  }

  if (ref.type === "page") {
    const S = STRINGS[locale];
    const map = {
      "contato.html": { title: S.contact.title, desc: S.contact.subtitle },
      "atrativos.html": { title: S.atrativosHub.title, desc: S.atrativosHub.seoDesc },
    };
    const pillarSlug = ref.path.replace(/^guia\//, "").replace(/\.html$/, "");
    const pillar = getPillarContent(pillarSlug, locale);
    if (pillar) {
      return { pathKey: ref.path, title: pillar.title, desc: pillar.seoDesc, kind: "pillar" };
    }
    const page = map[ref.path];
    if (page) return { pathKey: ref.path, title: page.title, desc: page.desc, kind: "page" };
  }

  return null;
}

/** Artigos relacionados automáticos por cluster semântico. */
export function getRelatedPages(pageId, locale, ctx, limit = 4) {
  const pillars = getPillarsForPage(pageId);
  if (pillars.length === 0) return [];

  const seen = new Set([pageId]);
  /** @type {{ pathKey: string; title: string; desc: string; score: number }[]} */
  const candidates = [];

  for (const pillarSlug of pillars) {
    for (const ref of getSatellitesForPillar(pillarSlug)) {
      const id = pageIdFromSatellite(ref);
      if (seen.has(id)) continue;
      seen.add(id);
      const meta = resolveSatelliteMeta(ref, locale, ctx);
      if (!meta) continue;
      candidates.push({
        pathKey: meta.pathKey,
        title: meta.title,
        desc: meta.desc,
        score: pillarSlug === getPrimaryPillarForPage(pageId) ? 2 : 1,
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

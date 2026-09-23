/** Conteúdo editorial estático (PT / EN / ES) — editar aqui e rodar npm run build */

export const BADGE_LABEL = {
  pt: { rain: "Chuva", transition: "Transição", best: "Melhor mês", dry: "Seca", high: "Alta temporada", "intense-dry": "Seca intensa" },
  en: { rain: "Rainy", transition: "Transition", best: "Best month", dry: "Dry season", high: "Peak season", "intense-dry": "Intense dry" },
  es: { rain: "Lluvias", transition: "Transición", best: "Mejor mes", dry: "Sequía", high: "Alta temporada", "intense-dry": "Sequía intensa" },
};

export const MONTH_NAME = {
  jan: { pt: "Janeiro", en: "January", es: "Enero" },
  feb: { pt: "Fevereiro", en: "February", es: "Febrero" },
  mar: { pt: "Março", en: "March", es: "Marzo" },
  apr: { pt: "Abril", en: "April", es: "Abril" },
  may: { pt: "Maio", en: "May", es: "Mayo" },
  jun: { pt: "Junho", en: "June", es: "Junio" },
  jul: { pt: "Julho", en: "July", es: "Julio" },
  aug: { pt: "Agosto", en: "August", es: "Agosto" },
  sep: { pt: "Setembro", en: "September", es: "Septiembre" },
  oct: { pt: "Outubro", en: "October", es: "Octubre" },
  nov: { pt: "Novembro", en: "November", es: "Noviembre" },
  dec: { pt: "Dezembro", en: "December", es: "Diciembre" },
};

export const SEASON_ROWS = [
  { monthKey: "jan", ico: "🌧️", badge: "rain", stars: 4, text: { pt: "Calor intenso, chuvas diárias. Rios no volume máximo. Vegetação exuberante.", en: "Intense heat, daily rains. Rivers at full flow. Lush vegetation.", es: "Calor intenso, lluvias diarias. Ríos al máximo. Vegetación exuberante." } },
  { monthKey: "feb", ico: "🌧️", badge: "rain", stars: 3, text: { pt: "Chuvas torrentiais mais frequentes. Clima imprevisível.", en: "Heavy rain more frequent. Unpredictable weather.", es: "Lluvias torrenciales más frecuentes. Clima impredecible." } },
  { monthKey: "mar", ico: "🌦️", badge: "rain", stars: 4, text: { pt: "Rios ainda cheios. Início do fim da estação úmida.", en: "Rivers still full. Wet season begins to taper.", es: "Ríos aún llenos. Inicio del fin de la temporada húmeda." } },
  { monthKey: "apr", ico: "🌤️", badge: "transition", stars: 5, text: { pt: "Rios cheios, chuveirinhos, pôr do sol com arco-íris.", en: "Full rivers, light showers, sunsets with rainbows.", es: "Ríos llenos, chaparrones, atardeceres con arcoíris." } },
  { monthKey: "may", ico: "⭐", badge: "best", stars: 5, text: { pt: "Volume ideal, água morna, céu estrelado, baixa temporada.", en: "Ideal water levels, pleasant temperature, starry skies, low season.", es: "Caudal ideal, agua templada, cielo estrellado, baja temporada." } },
  { monthKey: "jun", ico: "☀️", badge: "dry", stars: 5, text: { pt: "Inverno seco, noites frias, sol constante.", en: "Dry winter, cool nights, steady sunshine.", es: "Invierno seco, noches frías, sol constante." } },
  { monthKey: "jul", ico: "🎉", badge: "high", stars: 4, text: { pt: "Festas e Encontro de Culturas. Clima parecido com junho.", en: "Festivals and cultural events. Climate similar to June.", es: "Fiestas y eventos culturales. Clima similar a junio." } },
  { monthKey: "aug", ico: "🔥", badge: "intense-dry", stars: 4, text: { pt: "Piscinas cristalinas; calor forte e algumas quedas sazonais secas.", en: "Crystal pools; intense heat; some seasonal falls may be dry.", es: "Pozas cristalinas; calor fuerte; algunas cascadas estacionales secas." } },
  { monthKey: "sep", ico: "🔥", badge: "intense-dry", stars: 4, text: { pt: "Similar a agosto — atenção a queimadas e riscos de incêndio.", en: "Similar to August — watch for fire risk in the cerrado.", es: "Similar a agosto — riesgo de incendios en el cerrado." } },
  { monthKey: "oct", ico: "🌦️", badge: "transition", stars: 4, text: { pt: "Início das chuvas. Rios voltam a encher.", en: "Early rains return; rivers begin to fill again.", es: "Comienzo de lluvias. Los ríos vuelven a llenarse." } },
  { monthKey: "nov", ico: "🌧️", badge: "rain", stars: 4, text: { pt: "Chuvas frequentes, vegetação renascendo.", en: "Frequent rains, vegetation rebounding.", es: "Lluvias frecuentes, vegetación renaciendo." } },
  { monthKey: "dec", ico: "🌧️", badge: "rain", stars: 4, text: { pt: "Estação úmida firme. Rios muito cheios para mirantes.", en: "Firm wet season. Very full rivers for lookouts.", es: "Temporada húmeda firme. Ríos muy llenos en miradores." } },
];

export const HOTSPOTS = [
  { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", image: "imagens/cachoeira-almecegas-guia-chapada-veadeiros-alto-paraiso-10.jpg", title: { pt: "Almécegas", en: "Almécegas", es: "Almécegas" }, lead: { pt: "Um dos circuitos mais clássicos de Alto Paraíso — poços claros e trilha memorável com guia local.", en: "A classic Alto Paraíso circuit — clear pools and a memorable trail with a local guide.", es: "Un circuito clásico de Alto Paraíso — pozas cristalinas y sendero memorable con guía local." } },
  { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", image: "imagens/vale-lua-guia-chapada-veadeiros-sao-jorge-1.jpg", title: { pt: "Vale da Lua", en: "Moon Valley", es: "Valle de la Luna" }, lead: { pt: "Formações de quartzito esculpidas pelo tempo — cenário único em São Jorge.", en: "Quartzite sculpted by time — a one-of-a-kind setting in São Jorge.", es: "Cuarzo tallado por el tiempo — un paisaje único en São Jorge." } },
  { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Cataratas dos Couros", en: "Couros Falls", es: "Cataratas de Couros" }, lead: { pt: "Grande complexo de quedas e poços — roteiro intenso que pede organização e respeito ao tempo de trilha.", en: "A large complex of falls and pools — an intense hike that needs timing and safety.", es: "Gran complejo de saltos y pozas — trekking intenso que exige planificación y seguridad." } },
  { slug: "cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros", image: "imagens/cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros-1.jpg", title: { pt: "Cordovil", en: "Cordovil", es: "Cordovil" }, lead: { pt: "Águas verdes-esmeralda e saltos curtos muito fotogênicos na região de Alto Paraíso.", en: "Emerald waters and photogenic short falls near Alto Paraíso.", es: "Aguas esmeralda y saltos muy fotogénicos cerca de Alto Paraíso." } },
  { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", image: "imagens/cachoeira-segredo-guia-chapada-veadeiros-sao-jorge-10.jpg", title: { pt: "Segredo", en: "Segredo", es: "Segredo" }, lead: { pt: "Cartão-postal de São Jorge: poço profundo e paisagem de cerrado preservado.", en: "A São Jorge postcard — deep pools and preserved cerrado views.", es: "Postal de São Jorge — pozas profundas y cerrado conservado." } },
  { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cachoeira-cristais-veu-noiva-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Cristais", en: "Cristais", es: "Cristales" }, lead: { pt: "Acesso ameno e ótimo para famílias — veu compacto e poços rasos para relaxar.", en: "Easy access, great for families — a compact veil and shallow pools.", es: "Acceso fácil, ideal para familias — velo compacto y pozas someras." } },
  { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", image: "imagens/cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-4.jpg", title: { pt: "Poço Encantado", en: "Poço Encantado", es: "Pozo Encantado" }, lead: { pt: "Tesouro em Teresina de Goiás — poço translúcido que brilha em dias de sol.", en: "A Teresina gem — translucent pools on sunny days.", es: "Joyas en Teresina de Goiás — pozas translúcidas con sol." } },
  { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", image: "imagens/cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante.jpg", title: { pt: "Santa Bárbara", en: "Santa Bárbara", es: "Santa Bárbara" }, lead: { pt: "Um dos destaques de Cavalcante — água volumosa e experiência completa de dia inteiro.", en: "A Cavalcante highlight — big flow and a full-day experience.", es: "Estrella de Cavalcante — gran caudal para una jornada completa." } },
  { slug: "cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante", image: "imagens/complexo-cachoeiras-rio-prata-guia-chapada-veadeiros-cavalcante.jpg", title: { pt: "Complexo Rio da Prata", en: "Complexo Rio da Prata", es: "Complejo Río da Prata" }, lead: { pt: "Varias quedas e poços em sequência — roteiro clássico com guia em Cavalcante.", en: "Multiple falls in sequence — the classic guided circuit in Cavalcante.", es: "Varios saltos en serie — circuito clásico con guía en Cavalcante." } },
  { slug: "cachoeira-ponte-de-pedra-guia-chapada-veadeiros-cavalcante", image: "imagens/cachoeira-ponte-de-pedra-guia-chapada-veadeiros-cavalcante.jpg", title: { pt: "Ponte de Pedra", en: "Ponte de Pedra", es: "Ponte de Pedra" }, lead: { pt: "Monumento rochoso raro e trilha selvagem dentro da Reserva Renascer, em Cavalcante.", en: "A rare rock monument and wild trail inside Reserva Renascer, in Cavalcante.", es: "Monumento rocoso raro y sendero salvaje en la Reserva Renascer, en Cavalcante." } },
  { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", image: "imagens/cachoeira-macaquinhos-guia-chapada-veadeiros-6.jpg", title: { pt: "Macaquinhos", en: "Macaquinhos", es: "Macaquinhos" }, lead: { pt: "Trilha exigente e recompensas enormes — melhor com suporte de guia credenciado.", en: "A demanding trail with huge rewards — best with a licensed guide.", es: "Sendero exigente con gran recompensa — mejor con guía habilitado." } },
  { slug: "cachoeira-label-guia-chapada-veadeiros-sao-joao-alianca", image: "imagens/cachoeira-label-guia-chapada-veadeiros.jpg", title: { pt: "Label", en: "Label", es: "Label" }, lead: { pt: "Queda imponente na região de São João d'Aliança — natureza selvagem e pouca infraestrutura.", en: "A powerful fall near São João d'Aliança — wild nature, minimal infrastructure.", es: "Salto imponente en São João d'Aliança — naturaleza salvaje y poca infraestructura." } },
  { slug: "cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Loquinhas", en: "Loquinhas", es: "Loquinhas" }, lead: { pt: "Poços em degrau e visual cinematográfico — sensível ao volume de chuvas.", en: "Stepped pools and cinematic views — sensitive to rainfall.", es: "Pozas escalonadas y vistas de postal — sensible a las lluvias." } },
  { slug: "cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cachoeira-arcanjos-anjos-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Anjos e Arcanjos", en: "Anjos e Arcanjos", es: "Ángeles y Arcángeles" }, lead: { pt: "Circuito variado com saltos e poços para diferentes perfis em Alto Paraíso.", en: "Varied falls and pools for different skill levels in Alto Paraíso.", es: "Circuito variado con saltos y pozas para distintos niveles." } },
  { slug: "caracol-guia-chapada-veadeiros", image: "imagens/cachoeira-caracol-complexo-caldeira-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Caracol", en: "Caracol", es: "Caracol" }, lead: { pt: "Cachoeira Caracol no Complexo Caldeira, em Alto Paraíso de Goiás — poço para banho e queda em gruta de quartzito.", en: "Caracol waterfall at Complexo Caldeira, in Alto Paraíso de Goiás — a swimming pool and a fall inside a quartzite cave.", es: "Cascada Caracol en el Complejo Caldeira, en Alto Paraíso de Goiás — poza para baño y salto en una gruta de cuarcita." } },
  { slug: "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge", image: "imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-1.jpg", title: { pt: "Mirante da Janela", en: "Mirante da Janela", es: "Mirador de la Ventana" }, lead: { pt: "Dentro do Parque Nacional — um dos mirantes mais famosos do Brasil.", en: "Inside the National Park — one of Brazil's most famous lookouts.", es: "Dentro del Parque Nacional — uno de los miradores más famosos de Brasil." } },
  { slug: "parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge", image: "imagens/parque-nacional-guia-chapada-veadeiros-saltos-rio-preto-garimpao.jpg", title: { pt: "Saltos do Rio Preto", en: "Saltos do Rio Preto", es: "Saltos del Río Preto" }, lead: { pt: "Trilha longa até o grande salto — planejamento e respeito às regras do ICMBio.", en: "Long trail to the big falls — plan ahead and follow ICMBio rules.", es: "Sendero largo hasta el gran salto — planificación y normas del ICMBio." } },
  { slug: "parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge", image: "imagens/parque-nacional-guia-chapada-veadeiros-carrossel-saltos-rio-preto.jpg", title: { pt: "Cânions e Cariocas", en: "Cânions e Cariocas", es: "Cañones y Cariocas" }, lead: { pt: "Geologia impressionante e trechos de rio com segurança reforçada em grupo.", en: "Stunning geology — river sections safest with a guided group.", es: "Geología impactante — tramos de río más seguros en grupo con guía." } },
  { slug: "cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca", image: "imagens/cachoeira-macaco-chapada-veadeiros-macacao-4.jpg", title: { pt: "Macacão", en: "Macacão", es: "Macacão" }, lead: { pt: "Complexo conhecido como Macaquinhos/Macaco — cenário amplo e miradores naturais.", en: "Known as the Macaco complex — wide scenery and natural viewpoints.", es: "Complejo Macaco — escenario amplio y miradores naturales." } },
];

/** Caixas % do mapa oficial (espelho de shared/src/waterfallMap.ts). */
export const MAP_BOX_BY_SLUG = {
  "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros": { l: 53.51, t: 65.33, w: 9.22, h: 6.33 },
  "vale-lua-guia-chapada-veadeiros-sao-jorge": { l: 35.43, t: 70.67, w: 5.42, h: 6 },
  "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso": { l: 37.48, t: 77.83, w: 7.69, h: 7.33 },
  "cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros": { l: 41.07, t: 66.83, w: 6, h: 5.17 },
  "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge": { l: 27.16, t: 88.5, w: 6.66, h: 4.33 },
  "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso": { l: 66.4, t: 49.33, w: 5.27, h: 3 },
  "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias": { l: 72.99, t: 37.83, w: 11.13, h: 4.17 },
  "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante": { l: 46.49, t: 4.5, w: 6.66, h: 6.17 },
  "cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante": { l: 29.65, t: 5.83, w: 8.57, h: 3.67 },
  "cachoeira-ponte-de-pedra-guia-chapada-veadeiros-cavalcante": { l: 37.2, t: 34.8, w: 8.2, h: 5.5 },
  "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca": { l: 89.68, t: 67, w: 9.59, h: 4 },
  "cachoeira-label-guia-chapada-veadeiros-sao-joao-alianca": { l: 82.36, t: 84.67, w: 4.98, h: 3.67 },
  "cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso": { l: 66.33, t: 60.33, w: 7.1, h: 3.83 },
  "cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso": { l: 77.6, t: 48.33, w: 10.54, h: 4.33 },
  "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge": { l: 19.03, t: 57.5, w: 10.61, h: 7.33 },
  "parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge": { l: 25.55, t: 45, w: 7.47, h: 6.67 },
  "parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge": { l: 34.85, t: 50.67, w: 7.61, h: 6.67 },
  "cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca": { l: 81.55, t: 64.83, w: 7.1, h: 4.17 },
};

export function hotspotsForMap() {
  return HOTSPOTS.filter((h) => MAP_BOX_BY_SLUG[h.slug]).map((h) => ({ ...h, box: MAP_BOX_BY_SLUG[h.slug] }));
}

export const MAP_IMAGE = "imagens/cachoeiras-guia-chapada-veadeiros-2022.jpg";

/** Slides do hero (copy i18n/common.json do cliente React). */
export const HERO_SLIDES = {
  pt: [
    {
      image: "imagens/hero-slide-01-guias-locais-cachoeira.png",
      images: [
        "imagens/hero-slide-01-guias-locais-cachoeira.png",
        "imagens/hero-slide-02-em-breve-cachoeira.png",
      ],
      badge: "",
      title: "Passeios em Excursão",
      lead: "Venha viver experiências inesquecíveis com os melhores guias na Chapada dos Veadeiros",
      sub: "",
      bullets: [
        "As vagas são limitadas",
        "Passeios compartilhados com o melhor custo-benefício",
        "Grupos variados para você viver mais interação e novas conexões",
        "Guias locais especializados na área",
      ],
      ctaKind: "none",
      duration: 20000,
    },
    {
      kind: "petzen",
      image: "parceiros/petzen-do-cerrado-dogs.png",
      logo: "parceiros/petzen-do-cerrado-logo.png",
      duration: 16000,
      title: "Vai explorar a Chapada?",
      titleSpan: "Seu cachorro também merece um descanso.",
      subtitle: "Hospedagem exclusiva para cães em Alto Paraíso de Goiás, na Chapada dos Veadeiros.",
      benefits: [
        "Ambiente familiar e seguro",
        "Diárias e meio período (12 horas)",
        "Enquanto você aproveita a Chapada, seu cachorro fica em um lugar seguro, confortável e cheio de carinho.",
      ],
      ctaLabel: "Reservar pelo WhatsApp",
      waText:
        "Olá! Vim pelo portal da PETZEN DO CERRADO e gostaria de informações sobre hospedagem para meu cachorro na Chapada dos Veadeiros.",
      photoAlt: "Cães hospedados na Petzen do Cerrado, Alto Paraíso de Goiás",
    },
  ],
  en: [
    {
      image: "imagens/hero-slide-01-guias-locais-cachoeira.png",
      images: [
        "imagens/hero-slide-01-guias-locais-cachoeira.png",
        "imagens/hero-slide-02-em-breve-cachoeira.png",
      ],
      badge: "",
      title: "Group excursions",
      lead: "Come live unforgettable experiences with the best guides in Chapada dos Veadeiros",
      sub: "",
      bullets: [
        "Spaces are limited",
        "Shared tours with the best value",
        "Mixed groups so you can meet people and make new connections",
        "Local guides specialized in the area",
      ],
      ctaKind: "none",
      duration: 20000,
    },
    {
      kind: "petzen",
      image: "parceiros/petzen-do-cerrado-dogs.png",
      logo: "parceiros/petzen-do-cerrado-logo.png",
      duration: 16000,
      title: "Exploring the Chapada?",
      titleSpan: "Your dog deserves a break too.",
      subtitle: "Exclusive dog boarding in Alto Paraíso de Goiás, in Chapada dos Veadeiros.",
      benefits: [
        "Family-friendly and safe environment",
        "Full-day and half-day stays (12 hours)",
        "While you enjoy the Chapada, your dog stays somewhere safe, comfortable, and full of care.",
      ],
      ctaLabel: "Book on WhatsApp",
      waText:
        "Hi! I came from the PETZEN DO CERRADO portal and would like information about dog boarding in Chapada dos Veadeiros.",
      photoAlt: "Dogs staying at Petzen do Cerrado, Alto Paraíso de Goiás",
    },
  ],
  es: [
    {
      image: "imagens/hero-slide-01-guias-locais-cachoeira.png",
      images: [
        "imagens/hero-slide-01-guias-locais-cachoeira.png",
        "imagens/hero-slide-02-em-breve-cachoeira.png",
      ],
      badge: "",
      title: "Paseos en excursión",
      lead: "Ven a vivir experiencias inolvidables con los mejores guías en la Chapada dos Veadeiros",
      sub: "",
      bullets: [
        "Las plazas son limitadas",
        "Paseos compartidos con la mejor relación calidad-precio",
        "Grupos variados para más interacción y nuevas conexiones",
        "Guías locales especializados en la zona",
      ],
      ctaKind: "none",
      duration: 20000,
    },
    {
      kind: "petzen",
      image: "parceiros/petzen-do-cerrado-dogs.png",
      logo: "parceiros/petzen-do-cerrado-logo.png",
      duration: 16000,
      title: "¿Vas a explorar la Chapada?",
      titleSpan: "Tu perro también merece un descanso.",
      subtitle: "Hospedaje exclusivo para perros en Alto Paraíso de Goiás, en la Chapada dos Veadeiros.",
      benefits: [
        "Ambiente familiar y seguro",
        "Diarias y medio período (12 horas)",
        "Mientras disfrutas la Chapada, tu perro queda en un lugar seguro, cómodo y lleno de cariño.",
      ],
      ctaLabel: "Reservar por WhatsApp",
      waText:
        "¡Hola! Vine por el portal de PETZEN DO CERRADO y me gustaría información sobre hospedaje para mi perro en la Chapada dos Veadeiros.",
      photoAlt: "Perros hospedados en Petzen do Cerrado, Alto Paraíso de Goiás",
    },
  ],
};

/** Slider principal da home (exclusivo / compartilhado / reserva online). */
export const HERO_OFFERS = {
  pt: {
    h1: "Passeios na Chapada dos Veadeiros com guia local",
    aria: "Passeios na Chapada dos Veadeiros",
    role: "carrossel",
    tabsAria: "Escolher slide",
    pause: "Pausar slider",
    play: "Continuar slider",
    slides: [
      {
        theme: "exclusivo",
        alt: "Grupo em passeio exclusivo com guia diante de uma cachoeira na Chapada dos Veadeiros",
        tag: "Passeio exclusivo",
        lines: ["A Chapada", "só para o", "seu grupo."],
        text: "Passeios com guia local particular no ritmo do seu grupo.",
        points: ["Grupo fechado", "Horário flexível", "Roteiro sob medida"],
        actions: [
          { href: "exclusivo", label: "Reservar exclusivo", main: true },
          { href: "list", label: "Ver roteiros" },
        ],
        tab: "Exclusivo",
        tabSub: "Só o seu grupo",
      },
      {
        theme: "compartilhado",
        alt: "Viajantes em passeio compartilhado posando em frente a uma cachoeira na Chapada dos Veadeiros",
        tag: "Passeio compartilhado",
        lines: ["Saia sozinho.", "Volte com", "amigos."],
        text: "Divida o passeio, pague menos e conheça as cachoeiras da Chapada dos Veadeiros em boa companhia.",
        points: ["Melhor custo-benefício", "Novas conexões", "Amigos para a vida toda"],
        actions: [
          { href: "compartilhado", label: "Garantir minha vaga", main: true },
          { href: "list", label: "Ver próximas saídas" },
        ],
        tab: "Compartilhado",
        tabSub: "Melhor preço",
      },
      {
        theme: "online",
        alt: "Turista relaxando nas pedras de um poço durante passeio guiado na Chapada dos Veadeiros",
        tag: "Reserva online",
        lines: ["Escolha, pague", "e garanta", "sua vaga."],
        text: "Todos os passeios na Chapada dos Veadeiros, exclusivos ou compartilhados, são comprados aqui no site.",
        stepsAria: "Como reservar",
        steps: ["Escolha o passeio", "Selecione a data", "Pague online"],
        actions: [{ href: "list", label: "Reservar agora", main: true }],
        tab: "Compre online",
        tabSub: "Vaga garantida",
      },
    ],
  },
  en: {
    h1: "Tours in Chapada dos Veadeiros with a local guide",
    aria: "Tours in Chapada dos Veadeiros",
    role: "carousel",
    tabsAria: "Choose a slide",
    pause: "Pause slider",
    play: "Resume slider",
    slides: [
      {
        theme: "exclusivo",
        alt: "Group on a private tour with a guide in front of a waterfall in Chapada dos Veadeiros",
        tag: "Private tour",
        lines: ["The Chapada", "just for", "your group."],
        text: "Private tours with a local guide, at your group's pace.",
        points: ["Private group", "Flexible timing", "Tailor-made route"],
        actions: [
          { href: "exclusivo", label: "Book private", main: true },
          { href: "list", label: "See itineraries" },
        ],
        tab: "Private",
        tabSub: "Just your group",
      },
      {
        theme: "compartilhado",
        alt: "Travelers on a shared tour posing in front of a waterfall in Chapada dos Veadeiros",
        tag: "Shared tour",
        lines: ["Leave on your own.", "Come back with", "friends."],
        text: "Split the tour, pay less and see the waterfalls of Chapada dos Veadeiros in good company.",
        points: ["Best value", "New connections", "Friends for life"],
        actions: [
          { href: "compartilhado", label: "Save my spot", main: true },
          { href: "list", label: "See upcoming dates" },
        ],
        tab: "Shared",
        tabSub: "Best price",
      },
      {
        theme: "online",
        alt: "Traveler relaxing on the rocks of a pool during a guided tour in Chapada dos Veadeiros",
        tag: "Book online",
        lines: ["Choose, pay", "and lock in", "your spot."],
        text: "Every tour in Chapada dos Veadeiros, private or shared, is booked right here on the site.",
        stepsAria: "How to book",
        steps: ["Choose the tour", "Pick the date", "Pay online"],
        actions: [{ href: "list", label: "Book now", main: true }],
        tab: "Buy online",
        tabSub: "Spot guaranteed",
      },
    ],
  },
  es: {
    h1: "Paseos en la Chapada dos Veadeiros con guía local",
    aria: "Paseos en la Chapada dos Veadeiros",
    role: "carrusel",
    tabsAria: "Elegir diapositiva",
    pause: "Pausar carrusel",
    play: "Reanudar carrusel",
    slides: [
      {
        theme: "exclusivo",
        alt: "Grupo en un paseo exclusivo con guía frente a una cascada en la Chapada dos Veadeiros",
        tag: "Paseo exclusivo",
        lines: ["La Chapada", "solo para", "tu grupo."],
        text: "Paseos con guía local particular, al ritmo de tu grupo.",
        points: ["Grupo cerrado", "Horario flexible", "Ruta a medida"],
        actions: [
          { href: "exclusivo", label: "Reservar exclusivo", main: true },
          { href: "list", label: "Ver rutas" },
        ],
        tab: "Exclusivo",
        tabSub: "Solo tu grupo",
      },
      {
        theme: "compartilhado",
        alt: "Viajeros en un paseo compartido posando frente a una cascada en la Chapada dos Veadeiros",
        tag: "Paseo compartido",
        lines: ["Sal solo.", "Vuelve con", "amigos."],
        text: "Comparte el paseo, paga menos y conoce las cascadas de la Chapada dos Veadeiros en buena compañía.",
        points: ["Mejor precio", "Nuevas conexiones", "Amigos para toda la vida"],
        actions: [
          { href: "compartilhado", label: "Asegurar mi lugar", main: true },
          { href: "list", label: "Ver próximas salidas" },
        ],
        tab: "Compartido",
        tabSub: "Mejor precio",
      },
      {
        theme: "online",
        alt: "Turista relajándose en las piedras de un pozo durante un paseo guiado en la Chapada dos Veadeiros",
        tag: "Reserva online",
        lines: ["Elige, paga", "y asegura", "tu lugar."],
        text: "Todos los paseos en la Chapada dos Veadeiros, exclusivos o compartidos, se compran aquí en el sitio.",
        stepsAria: "Cómo reservar",
        steps: ["Elige el paseo", "Selecciona la fecha", "Paga online"],
        actions: [{ href: "list", label: "Reservar ahora", main: true }],
        tab: "Compra online",
        tabSub: "Plaza garantizada",
      },
    ],
  },
};

/** Destaques da home (8 cards — mesma ordem do Home.tsx). meta = dificuldade + distância da trilha (não distância de carro). */
export const HOME_FEATURED = {
  pt: [
    { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", label: "Alto Paraíso", title: "Almécegas", meta: "Trilha fácil · 500 m a 3 km" },
    { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Vale da Lua", meta: "Trilha fácil · 1,5 km" },
    { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", label: "Aventura", title: "Cataratas dos Couros", meta: "Trilha difícil · 6 km · guia obrigatório" },
    { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", label: "Cavalcante", title: "Santa Bárbara", meta: "Trilha fácil · 3 km" },
    { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Segredo", meta: "Trilha mediana · 8 km" },
    { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", label: "Alto Paraíso", title: "Cristais", meta: "Trilha · 2 km · família" },
    { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", label: "Teresina de Goiás", title: "Poço Encantado", meta: "Trilha fácil · 500 m" },
    { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", label: "São João", title: "Macaquinhos", meta: "Trilha difícil · 6 km" },
  ],
  en: [
    { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", label: "Alto Paraíso", title: "Almécegas", meta: "Easy trail · 500 m to 3 km" },
    { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Moon Valley", meta: "Easy trail · 1.5 km" },
    { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", label: "Adventure", title: "Couros Falls", meta: "Hard trail · 6 km · guide required" },
    { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", label: "Cavalcante", title: "Santa Bárbara", meta: "Easy trail · 3 km" },
    { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Segredo", meta: "Medium trail · 8 km" },
    { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", label: "Alto Paraíso", title: "Cristais", meta: "Trail · 2 km · families" },
    { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", label: "Teresina de Goiás", title: "Poço Encantado", meta: "Easy trail · 500 m" },
    { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", label: "São João", title: "Macaquinhos", meta: "Hard trail · 6 km" },
  ],
  es: [
    { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", label: "Alto Paraíso", title: "Almécegas", meta: "Sendero fácil · 500 m a 3 km" },
    { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Valle de la Luna", meta: "Sendero fácil · 1,5 km" },
    { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", label: "Aventura", title: "Cataratas de Couros", meta: "Sendero difícil · 6 km · guía obligatorio" },
    { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", label: "Cavalcante", title: "Santa Bárbara", meta: "Sendero fácil · 3 km" },
    { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Segredo", meta: "Sendero medio · 8 km" },
    { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", label: "Alto Paraíso", title: "Cristales", meta: "Sendero · 2 km · familia" },
    { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", label: "Teresina de Goiás", title: "Pozo Encantado", meta: "Sendero fácil · 500 m" },
    { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", label: "São João", title: "Macaquinhos", meta: "Sendero difícil · 6 km" },
  ],
};

/** SEO da home — palavra-chave principal e consultas de conversão (pt / en / es). */
export const HOME_SEO = {
  pt: {
    title: "Passeios na Chapada dos Veadeiros com Guia Local | Cachoeiras e Trilhas",
    desc: "Passeios exclusivos e compartilhados na Chapada dos Veadeiros com guia local. Conheça as melhores cachoeiras e reserve online com vaga garantida.",
    keywords:
      "chapada dos veadeiros, passeios na chapada dos veadeiros, guia chapada veadeiros, contratar guia na chapada dos veadeiros, guia local alto paraíso, parque nacional chapada dos veadeiros",
    ogImageAlt: "Grupo em passeio exclusivo com guia diante de uma cachoeira na Chapada dos Veadeiros",
    heroAlt: "Grupo em passeio exclusivo com guia diante de uma cachoeira na Chapada dos Veadeiros",
    chip: "Chapada dos Veadeiros · Goiás",
    h2: "Passeios e guia local na Chapada dos Veadeiros",
    intro:
      "A Chapada dos Veadeiros, no nordeste de Goiás, é o destino de ecoturismo que o Guia Chapada Veadeiros cobre no dia a dia: cachoeiras, trilhas do Parque Nacional, Vale da Lua e bases como Alto Paraíso, São Jorge e Cavalcante. Nesta home você planeja passeios na Chapada dos Veadeiros com guia local credenciado Cadastur — em grupo ou exclusivo — e contrata quem realmente conhece o cerrado.",
    cards: [
      {
        key: "passeios",
        title: "Passeios na Chapada dos Veadeiros",
        body: "Cachoeiras, trilhas e o Parque Nacional com roteiro seguro. Escolha saídas em grupo ou um dia exclusivo com guia da região.",
        cta: "Ver passeios e trilhas",
      },
      {
        key: "guia",
        title: "Guia Chapada Veadeiros",
        body: "Portal de guias locais em Alto Paraíso de Goiás. Quem vive na Chapada monta o dia, o tempo de trilha e o que cabe no seu perfil.",
        cta: "Conhecer o guia local",
      },
      {
        key: "contratar",
        title: "Contratar guia na Chapada dos Veadeiros",
        body: "Fale no WhatsApp, reserve a data e confirme o roteiro. Credencial Cadastur, segurança na trilha e respeito às normas do ICMBio.",
        cta: "Como contratar um guia",
      },
    ],
    hubCta: "Guia completo da Chapada",
    faqH2: "Perguntas frequentes sobre a Chapada dos Veadeiros",
    faq: [
      {
        q: "O que é a Chapada dos Veadeiros?",
        a: "A Chapada dos Veadeiros é uma região de cerrado no nordeste de Goiás, Brasil, a cerca de 230 km de Brasília. Reúne o Parque Nacional da Chapada dos Veadeiros, cachoeiras, trilhas e vilas como Alto Paraíso de Goiás, São Jorge e Cavalcante. O Guia Chapada Veadeiros é o portal local para passeios e contratação de guia.",
      },
      {
        q: "Como contratar um guia na Chapada dos Veadeiros?",
        a: "Pelo site Guia Chapada Veadeiros: escolha o passeio ou envie sua data pelo WhatsApp. Um guia local credenciado Cadastur confirma o roteiro, o ponto de encontro em Alto Paraíso ou São Jorge e as regras do atrativo. Não é preciso chegar sem reserva.",
      },
      {
        q: "Quais são os melhores passeios na Chapada dos Veadeiros?",
        a: "Os mais pedidos são Cataratas dos Couros, Vale da Lua, Cachoeira do Segredo, Santa Bárbara, Saltos do Rio Preto e o Mirante da Janela no Parque Nacional. O melhor circuito depende dos dias que você tem, do nível de trilha e da época do ano.",
      },
      {
        q: "Preciso de guia para visitar a Chapada dos Veadeiros?",
        a: "Não é obrigatório em todos os atrativos, mas é recomendado em trilhas longas, Parque Nacional e quedas com acesso restrito. Contratar um guia local reduz risco, evita trilha fechada e aproveita melhor o tempo na Chapada dos Veadeiros.",
      },
      {
        q: "Quem é o Guia Chapada Veadeiros?",
        a: "Guia Chapada Veadeiros é o site oficial de passeios e guias locais da Chapada dos Veadeiros, com base em Alto Paraíso de Goiás. Reúne roteiros, mapa de atrativos, revista e reserva com guia credenciado.",
      },
    ],
  },
  en: {
    title: "Tours in Chapada dos Veadeiros with a Local Guide | Waterfalls and Trails",
    desc: "Private and shared tours in Chapada dos Veadeiros with a local guide. See the best waterfalls and book online with a guaranteed spot.",
    keywords:
      "chapada dos veadeiros, chapada dos veadeiros tours, chapada veadeiros guide, hire a guide in chapada dos veadeiros, local guide alto paraiso, chapada national park",
    ogImageAlt: "Group on a private tour with a guide in front of a waterfall in Chapada dos Veadeiros",
    heroAlt: "Group on a private tour with a guide in front of a waterfall in Chapada dos Veadeiros",
    chip: "Chapada dos Veadeiros · Brazil",
    h2: "Tours and a local guide in Chapada dos Veadeiros",
    intro:
      "Chapada dos Veadeiros, in northeastern Goiás, Brazil, is the ecotourism region Guia Chapada Veadeiros covers every day: waterfalls, National Park trails, Moon Valley and bases such as Alto Paraíso, São Jorge and Cavalcante. Use this homepage to plan Chapada dos Veadeiros tours with a Cadastur-licensed local guide — private or in a group — and hire someone who actually knows the cerrado.",
    cards: [
      {
        key: "passeios",
        title: "Chapada dos Veadeiros tours",
        body: "Waterfalls, trails and the National Park on a safe itinerary. Join a group outing or book a private day with a regional guide.",
        cta: "See tours and trails",
      },
      {
        key: "guia",
        title: "Guia Chapada Veadeiros",
        body: "Local-guide hub in Alto Paraíso de Goiás. People who live in the Chapada set the day, trail timing and what fits your group.",
        cta: "Meet the local guide",
      },
      {
        key: "contratar",
        title: "Hire a guide in Chapada dos Veadeiros",
        body: "Message on WhatsApp, lock the date and confirm the route. Cadastur credential, trail safety and ICMBio rules respected.",
        cta: "How to hire a guide",
      },
    ],
    hubCta: "Complete Chapada guide",
    faqH2: "Chapada dos Veadeiros FAQ",
    faq: [
      {
        q: "What is Chapada dos Veadeiros?",
        a: "Chapada dos Veadeiros is a cerrado region in northeastern Goiás, Brazil, about 230 km from Brasília. It includes Chapada dos Veadeiros National Park, waterfalls, trails and towns such as Alto Paraíso de Goiás, São Jorge and Cavalcante. Guia Chapada Veadeiros is the local portal for tours and hiring a guide.",
      },
      {
        q: "How do I hire a guide in Chapada dos Veadeiros?",
        a: "Through Guia Chapada Veadeiros: pick a tour or send your dates on WhatsApp. A Cadastur-licensed local guide confirms the itinerary, meeting point in Alto Paraíso or São Jorge, and site rules. You do not need to arrive without a booking.",
      },
      {
        q: "What are the best tours in Chapada dos Veadeiros?",
        a: "The most requested are Couros Falls, Moon Valley, Segredo waterfall, Santa Bárbara, Saltos do Rio Preto and Mirante da Janela in the National Park. The best circuit depends on how many days you have, trail level and season.",
      },
      {
        q: "Do I need a guide to visit Chapada dos Veadeiros?",
        a: "Not mandatory at every attraction, but recommended on long trails, in the National Park and at restricted-access falls. Hiring a local guide cuts risk, avoids closed trails and makes better use of time in Chapada dos Veadeiros.",
      },
      {
        q: "What is Guia Chapada Veadeiros?",
        a: "Guia Chapada Veadeiros is the official tours and local-guide website for Chapada dos Veadeiros, based in Alto Paraíso de Goiás. It gathers itineraries, an attractions map, a magazine and bookings with a licensed guide.",
      },
    ],
  },
  es: {
    title: "Paseos en la Chapada dos Veadeiros con Guía Local | Cascadas y Senderos",
    desc: "Paseos exclusivos y compartidos en la Chapada dos Veadeiros con guía local. Conoce las mejores cascadas y reserva online con plaza garantizada.",
    keywords:
      "chapada dos veadeiros, paseos en chapada dos veadeiros, guía chapada veadeiros, contratar guía en chapada dos veadeiros, guía local alto paraíso, parque nacional chapada dos veadeiros",
    ogImageAlt: "Grupo en un paseo exclusivo con guía frente a una cascada en la Chapada dos Veadeiros",
    heroAlt: "Grupo en un paseo exclusivo con guía frente a una cascada en la Chapada dos Veadeiros",
    chip: "Chapada dos Veadeiros · Brasil",
    h2: "Excursiones y guía local en Chapada dos Veadeiros",
    intro:
      "La Chapada dos Veadeiros, en el noreste de Goiás, Brasil, es el destino de ecoturismo que Guia Chapada Veadeiros cubre a diario: cascadas, senderos del Parque Nacional, Vale da Lua y bases como Alto Paraíso, São Jorge y Cavalcante. En esta home planificas excursiones en Chapada dos Veadeiros con guía local acreditado Cadastur — en grupo o exclusivo — y contratas a quien realmente conoce el cerrado.",
    cards: [
      {
        key: "passeios",
        title: "Excursiones en Chapada dos Veadeiros",
        body: "Cascadas, senderos y el Parque Nacional con itinerario seguro. Elige salidas en grupo o un día exclusivo con guía de la región.",
        cta: "Ver excursiones y senderos",
      },
      {
        key: "guia",
        title: "Guia Chapada Veadeiros",
        body: "Portal de guías locales en Alto Paraíso de Goiás. Quien vive en la Chapada arma el día, el tiempo de sendero y lo que encaja en tu grupo.",
        cta: "Conocer al guía local",
      },
      {
        key: "contratar",
        title: "Contratar guía en Chapada dos Veadeiros",
        body: "Escribe por WhatsApp, reserva la fecha y confirma la ruta. Credencial Cadastur, seguridad en el sendero y respeto a las normas del ICMBio.",
        cta: "Cómo contratar un guía",
      },
    ],
    hubCta: "Guía completa de la Chapada",
    faqH2: "Preguntas frecuentes sobre Chapada dos Veadeiros",
    faq: [
      {
        q: "¿Qué es la Chapada dos Veadeiros?",
        a: "La Chapada dos Veadeiros es una región de cerrado en el noreste de Goiás, Brasil, a unos 230 km de Brasilia. Reúne el Parque Nacional, cascadas, senderos y pueblos como Alto Paraíso de Goiás, São Jorge y Cavalcante. Guia Chapada Veadeiros es el portal local para excursiones y contratación de guía.",
      },
      {
        q: "¿Cómo contratar un guía en Chapada dos Veadeiros?",
        a: "En el sitio Guia Chapada Veadeiros: elige la excursión o envía tu fecha por WhatsApp. Un guía local acreditado Cadastur confirma el itinerario, el punto de encuentro en Alto Paraíso o São Jorge y las reglas del atractivo. No hace falta llegar sin reserva.",
      },
      {
        q: "¿Cuáles son las mejores excursiones en Chapada dos Veadeiros?",
        a: "Las más pedidas son Cataratas dos Couros, Vale da Lua, Cachoeira do Segredo, Santa Bárbara, Saltos do Rio Preto y el Mirante da Janela en el Parque Nacional. El mejor circuito depende de los días que tengas, el nivel de sendero y la época del año.",
      },
      {
        q: "¿Necesito guía para visitar Chapada dos Veadeiros?",
        a: "No es obligatorio en todos los atractivos, pero sí recomendable en senderos largos, Parque Nacional y saltos de acceso restringido. Contratar un guía local reduce riesgo, evita senderos cerrados y aprovecha mejor el tiempo en Chapada dos Veadeiros.",
      },
      {
        q: "¿Qué es Guia Chapada Veadeiros?",
        a: "Guia Chapada Veadeiros es el sitio oficial de excursiones y guías locales de Chapada dos Veadeiros, con base en Alto Paraíso de Goiás. Reúne itinerarios, mapa de atractivos, revista y reserva con guía acreditado.",
      },
    ],
  },
};

export const STRINGS = {
  pt: {
    topbar: "+55 62 98250-6891 | contato@guiachapadaveadeiros.com",
    htmlLang: "pt-BR",
    searchAria: "Busca",
    searchPlaceholder: "Buscar no site…",
    searchInputAria: "Digite para buscar páginas",
    searchNoResults: "Nenhuma página encontrada",
    nav: { home: "Home", revista: "Revista", atrativos: "Atrativos", reservas: "Reservas", excursoes: "Excursões", contact: "Fale Conosco" },
    hero: {
      badge: "Chapada dos Veadeiros · Goiás",
      title: "Roteiros sob medida com guia da região",
      lead: "Trilhas, cachoeiras e o melhor do cerrado com segurança, tempo otimizado e histórias de quem vive aqui.",
      ctaWa: "Falar no WhatsApp",
      ctaRevista: "Ler a Revista",
      ctaAtrativos: "Ver atrativos",
    },
    home: {
      featuredChip: "Atrações imperdíveis",
      featuredH2: "Cachoeiras e trilhas mais buscadas",
      featuredSeeAll: "Ver todas",
      mapPromoChip: "Mapa interativo",
      mapPromoH2: "Explore a Chapada dos Veadeiros pelo mapa interativo",
      mapPromoLead:
        "Compare trilhas, nível de dificuldade, distâncias, regiões e combine os melhores roteiros para planejar sua experiência antes da reserva.",
      mapOpenAria: "Abrir mapa interativo da Chapada dos Veadeiros",
      mapLightboxAria: "Mapa ampliado da Chapada dos Veadeiros",
      mapLightboxClose: "Fechar mapa",
      mapLightboxHint: "Toque ou clique nas áreas do mapa para abrir o guia correspondente.",
      mapEmbeddedLead:
        "Toque ou clique nas áreas do mapa sobre os atrativos que estão catalogados para obter maiores informações.",
      mapInteractiveTitle: "Mapa interativo",
      mapAlt: "Mapa ilustrado da Chapada dos Veadeiros com cachoeiras e núcleos urbanos.",
      reviewsH2: "Depoimentos de quem já passeou com a gente",
      atrativosChip: "Mapa oficial",
      atrativosH1: "Atrativos da Chapada",
      atrativosPhotoLabel: "Atrativos",
      heroCarouselPrev: "Imagem anterior",
      heroCarouselNext: "Próxima imagem",
      revistaH2: "Últimas notícias da Chapada dos Veadeiros",
      revistaSeeAll: "Ver tudo",
      revistaReadMore: "Ler matéria",
      instagramChip: "Instagram",
      instagramHandle: "@guiachapadaveadeiros",
      instagramLead:
        "Acompanhe fotos recentes, bastidores de trilhas e novidades no @guiachapadaveadeiros. Use o botão abaixo para abrir o perfil completo no Instagram.",
      instagramLeadWithFeed:
        "Últimas publicações do @guiachapadaveadeiros. Toque em uma foto para abrir no Instagram.",
      instagramGridAria: "Últimas fotos do Instagram",
      instagramCta: "Ver publicações no Instagram",
      floatWaAria: "Conversar no WhatsApp",
      floatWaMessage: "Guia Chapada Veadeiros - Poderia me ajudar por favor?",
      reviewsTitle: "Avaliações dos viajantes",
      reviewsLead: "Experiências reais de quem viveu a Chapada dos Veadeiros.",
      reviewGoogleLabel: "Avaliação Google · 5 estrelas",
      reviewsCarouselAria: "Carrossel de avaliações — arraste para o lado",
      reviewsDotAria: "Avaliação {{i}} de {{n}}",
      atrativoGalleryH2: "Galeria de fotos",
    },
    revistaHub: {
      title: "Revista — histórias e planejamento",
      lead: "Artigos para você decidir melhor época, entregar o passeio a um guia credenciado e montar roteiro sem stress.",
      cardContratarTitle: "Por que contratar um guia local?",
      cardContratarLead: "Segurança, tempo, fotos e conhecimento de terreno — sem improviso na trilha.",
      cardEpocaTitle: "Melhor época para visitar a Chapada",
      cardEpocaLead: "Mês a mês: chuva, seca, festivals e quando os rios enchem.",
    },
    revistaPage: {
      mastheadTitle: "Revista",
      mastheadSub:
        "Tudo sobre a Chapada dos Veadeiros: dicas, trilhas, eventos, bastidores e o melhor do destino em um só lugar.",
      seoTitle: "Revista Chapada dos Veadeiros",
      seoDesc:
        "Notícias, roteiros, natureza e cultura na Chapada dos Veadeiros — matérias atualizadas do Guia Chapada.",
      chipDefault: "Dicas",
      moreStories: "Mais matérias",
    },
    atrativosHub: {
      title: "Atrativos — 18 rotas ligadas ao mapa oficial",
      seoDesc:
        "Cachoeiras, mirantes e trilhas da Chapada dos Veadeiros — 18 rotas no mapa oficial com guia local.",
    },
    contact: {
      pageKicker: "Guia Chapada",
      title: "Contato",
      subtitle: "Fale com o Guia Chapada dos Veadeiros.",
      formTitle: "Envie uma mensagem",
      labelName: "Nome",
      labelSubject: "Assunto / tipo de contato",
      labelEmail: "Email (opcional)",
      labelPhone: "WhatsApp ou telefone (opcional)",
      labelMessage: "Mensagem",
      placeholderEmail: "seu@email.com",
      placeholderPhone: "(62) 99999 9999",
      placeholderMessage: "Conte como podemos ajudar...",
      tipoOptions: [
        { value: "elogio", label: "Elogio" },
        { value: "reclamacao", label: "Reclamação" },
        { value: "duvida", label: "Dúvida ou pergunta" },
        { value: "orcamento", label: "Orçamento ou reserva" },
        { value: "outro", label: "Outro" },
      ],
      submit: "Enviar",
      sending: "Enviando...",
      clear: "Limpar",
      successTitle: "Mensagem enviada",
      successLine: "Deu certo! Mensagem enviada.",
      successThanks: "Em breve entraremos em contato. Obrigado pela mensagem!",
      successTitleDual: "Confirmar nos dois canais",
      successLineDual:
        "Abrimos o WhatsApp e o cliente de correio já com todos os dados. Envie a mensagem no WhatsApp e conclua o e-mail também para garantirmos que recebemos.",
      successThanksDual: "Se alguma janela não apareceu, permita pop-ups ou use WhatsApp/E-mail ao lado.",
      errorPrefix: "Não foi possível enviar: ",
      asideKicker: "Atendimento e localização",
      asideLead:
        "O Guia Chapada atende via WhatsApp e também por e-mail. A base é Alto Paraíso de Goiás (Chapada dos Veadeiros).",
      asidePhoneLabel: "Telefone e Whatsapp",
      asideEmailLabel: "E-mail",
      asideAddressLabel: "Endereço (referência)",
      asideAddressValue: "Alto Paraíso de Goiás, Goiás · Brasil",
      asideMapLabel: "Mapa",
      mapIframeTitle: "Mapa — Alto Paraíso de Goiás",
      mapOpenFullLabel: "Abrir mapa em tela inteira",
      phoneDisplay: "+55 62 98250-6891",
      mapEmbedSrc: "https://maps.google.com/maps?q=-14.1319%2C-47.51&z=12&hl=pt-BR&output=embed",
      mapExternalHref:
        "https://www.google.com/maps/search/?api=1&query=Alto+Para%C3%ADso+de+Goi%C3%A1s,+Goi%C3%A1s,+Brasil",
    },
    footer: {
      taglineTitle: "Guia Chapada Veadeiros",
      taglineBody:
        "Roteiros, cachoeiras, trilhas e experiências com guia local para você planejar melhor sua viagem pela Chapada dos Veadeiros.",
      instagramHandle: "@guiachapadaveadeiros",
      cadasturAlt: "Selo Cadastur Guia Chapada dos Veadeiros",
      nationalParkAlt: "Chapada dos Veadeiros",
      colPlan: "Planeje sua viagem",
      linkShop: "Passeios e serviços",
      linkLodging: "Hospedagem",
      linkContact: "Contato",
      linkWhatsapp: "WhatsApp",
      colSupport: "Atendimento",
      whatsappLabel: "WhatsApp:",
      emailLabel: "Email:",
      baseLabel: "Base:",
      baseValue: "Chapada dos Veadeiros, Goiás",
      copyright: "© Todos os Direitos Reservados - 2026 | CNPJ 24.354.289/0001-05 | Desenvolvido por Diego Marques",
    },
    seo: {
      homeTitle: HOME_SEO.pt.title,
      homeDesc: HOME_SEO.pt.desc,
      homeKeywords: HOME_SEO.pt.keywords,
      homeOgImageAlt: HOME_SEO.pt.ogImageAlt,
    },
  },
  en: {
    topbar: "+55 62 98250-6891 | contato@guiachapadaveadeiros.com",
    htmlLang: "en",
    searchAria: "Search",
    searchPlaceholder: "Search the site…",
    searchInputAria: "Type to search pages",
    searchNoResults: "No pages found",
    nav: { home: "Home", revista: "Magazine", atrativos: "Attractions", reservas: "Reservations", excursoes: "Excursions", contact: "Contact" },
    hero: {
      badge: "Chapada dos Veadeiros · Brazil",
      title: "Tailor-made itineraries with a local guide",
      lead: "Trails, waterfalls and the best of the cerrado — safer days, smarter timing, stories from who lives here.",
      ctaWa: "WhatsApp us",
      ctaRevista: "Read the magazine",
      ctaAtrativos: "Browse attractions",
    },
    home: {
      featuredChip: "Must-see spots",
      featuredH2: "Most searched waterfalls & trails",
      featuredSeeAll: "See all",
      mapPromoChip: "Interactive map",
      mapPromoH2: "Explore Chapada dos Veadeiros on the interactive map",
      mapPromoLead:
        "Compare trails, difficulty, distances and regions to plan your trip before you book.",
      mapOpenAria: "Open interactive map of Chapada dos Veadeiros",
      mapLightboxAria: "Expanded map of Chapada dos Veadeiros",
      mapLightboxClose: "Close map",
      mapLightboxHint: "Tap or click areas on the map to open the matching guide page.",
      mapEmbeddedLead:
        "Tap or click areas on the map over the catalogued attractions for more information.",
      mapInteractiveTitle: "Interactive map",
      mapAlt: "Illustrated map of Chapada dos Veadeiros with waterfalls and towns.",
      reviewsH2: "What travellers say",
      atrativosChip: "Official map",
      atrativosH1: "Chapada attractions",
      atrativosPhotoLabel: "Attractions",
      heroCarouselPrev: "Previous slide",
      heroCarouselNext: "Next slide",
      revistaH2: "Latest Chapada dos Veadeiros stories",
      revistaSeeAll: "See all",
      revistaReadMore: "Read article",
      instagramChip: "Instagram",
      instagramHandle: "@guiachapadaveadeiros",
      instagramLead:
        "Trail photos, behind-the-scenes and local tips on @guiachapadaveadeiros. Use the button below to open the full profile on Instagram.",
      instagramLeadWithFeed:
        "Latest posts from @guiachapadaveadeiros. Tap a photo to open it on Instagram.",
      instagramGridAria: "Latest Instagram photos",
      instagramCta: "View posts on Instagram",
      floatWaAria: "Chat on WhatsApp",
      floatWaMessage: "Guia Chapada Veadeiros - Could you help me, please?",
      reviewsTitle: "Traveller reviews",
      reviewsLead: "Real experiences from visitors to Chapada dos Veadeiros.",
      reviewGoogleLabel: "Google review · 5 stars",
      reviewsCarouselAria: "Reviews carousel — swipe sideways",
      reviewsDotAria: "Review {{i}} of {{n}}",
      atrativoGalleryH2: "Photo gallery",
    },
    revistaHub: {
      title: "Magazine — planning & stories",
      lead: "Articles to pick the best season, hire a licensed guide and plan without guesswork.",
      cardContratarTitle: "Why hire a local guide?",
      cardContratarLead: "Safety, timing, photos and terrain knowledge — no improvisation on the trail.",
      cardEpocaTitle: "Best time to visit Chapada dos Veadeiros",
      cardEpocaLead: "Month by month: rains, dry season, festivals and river levels.",
    },
    revistaPage: {
      mastheadTitle: "Magazine",
      mastheadSub:
        "Everything about Chapada dos Veadeiros: tips, trails, events, behind the scenes and the best of the destination in one place.",
      seoTitle: "Chapada dos Veadeiros magazine",
      seoDesc:
        "News, itineraries, nature and culture in Chapada dos Veadeiros — updated stories from Guia Chapada.",
      chipDefault: "Tips",
      moreStories: "More stories",
    },
    atrativosHub: {
      title: "Attractions — 18 routes linked to the official map",
      seoDesc:
        "Waterfalls, lookouts and trails in Chapada dos Veadeiros — 18 routes on the official map with a local guide.",
    },
    contact: {
      pageKicker: "Guia Chapada",
      title: "Contact",
      subtitle: "Get in touch with Guia Chapada dos Veadeiros.",
      formTitle: "Send a message",
      labelName: "Name",
      labelSubject: "Subject / type of contact",
      labelEmail: "Email (optional)",
      labelPhone: "WhatsApp or phone (optional)",
      labelMessage: "Message",
      placeholderEmail: "you@example.com",
      placeholderPhone: "+55 62 99999 9999",
      placeholderMessage: "Tell us how we can help...",
      tipoOptions: [
        { value: "elogio", label: "Compliment" },
        { value: "reclamacao", label: "Complaint" },
        { value: "duvida", label: "Question" },
        { value: "orcamento", label: "Quote or booking" },
        { value: "outro", label: "Other" },
      ],
      submit: "Send",
      sending: "Sending...",
      clear: "Clear",
      successTitle: "Message sent",
      successLine: "Success! Your message was sent.",
      successThanks: "We’ll get back to you soon. Thank you!",
      successTitleDual: "Finish on WhatsApp & email",
      successLineDual:
        "WhatsApp support and your email client opened with everything filled in. Hit send in both so we reliably receive your message.",
      successThanksDual: "If nothing opened, allow pop-ups for this site or use the WhatsApp/email links beside the form.",
      errorPrefix: "Could not send: ",
      asideKicker: "Service and location",
      asideLead:
        "Guia Chapada answers on WhatsApp and by email. Our base is Alto Paraíso de Goiás (Chapada dos Veadeiros).",
      asidePhoneLabel: "Phone and WhatsApp",
      asideEmailLabel: "Email",
      asideAddressLabel: "Address (reference)",
      asideAddressValue: "Alto Paraíso de Goiás, Goiás · Brazil",
      asideMapLabel: "Map",
      mapIframeTitle: "Map — Alto Paraíso de Goiás",
      mapOpenFullLabel: "Open map full screen",
      phoneDisplay: "+55 62 98250-6891",
      mapEmbedSrc: "https://maps.google.com/maps?q=-14.1319%2C-47.51&z=12&hl=en&output=embed",
      mapExternalHref:
        "https://www.google.com/maps/search/?api=1&query=Alto+Para%C3%ADso+de+Goi%C3%A1s,+Goi%C3%A1s,+Brasil",
    },
    footer: {
      taglineTitle: "Chapada Veadeiros Guide",
      taglineBody:
        "Itineraries, waterfalls, trails and experiences with a local guide so you can better plan your Chapada dos Veadeiros trip.",
      instagramHandle: "@guiachapadaveadeiros",
      cadasturAlt: "Cadastur seal — Chapada Veadeiros Guide",
      nationalParkAlt: "Chapada dos Veadeiros",
      colPlan: "Plan your trip",
      linkShop: "Tours & services",
      linkLodging: "Lodging",
      linkContact: "Contact",
      linkWhatsapp: "WhatsApp",
      colSupport: "Support",
      whatsappLabel: "WhatsApp:",
      emailLabel: "Email:",
      baseLabel: "Based in:",
      baseValue: "Chapada dos Veadeiros, Goiás — Brazil",
      copyright: "© All rights reserved — 2026 | CNPJ 24.354.289/0001-05 | Built by Diego Marques",
    },
    seo: {
      homeTitle: HOME_SEO.en.title,
      homeDesc: HOME_SEO.en.desc,
      homeKeywords: HOME_SEO.en.keywords,
      homeOgImageAlt: HOME_SEO.en.ogImageAlt,
    },
  },
  es: {
    topbar: "+55 62 98250-6891 | contato@guiachapadaveadeiros.com",
    htmlLang: "es",
    searchAria: "Buscar",
    searchPlaceholder: "Buscar en el sitio…",
    searchInputAria: "Escribe para buscar páginas",
    searchNoResults: "Ninguna página encontrada",
    nav: { home: "Inicio", revista: "Revista", atrativos: "Atractivos", reservas: "Reservas", excursoes: "Excursiones", contact: "Contacto" },
    hero: {
      badge: "Chapada dos Veadeiros · Brasil",
      title: "Itinerarios a medida con guía de la región",
      lead: "Senderos, cascadas y lo mejor del cerrado — más seguridad, mejor tiempo y relatos locales.",
      ctaWa: "Escribir por WhatsApp",
      ctaRevista: "Leer la revista",
      ctaAtrativos: "Ver atractivos",
    },
    home: {
      featuredChip: "Imprescindibles",
      featuredH2: "Cascadas y senderos más buscados",
      featuredSeeAll: "Ver todos",
      mapPromoChip: "Mapa interactivo",
      mapPromoH2: "Explora la Chapada dos Veadeiros en el mapa interactivo",
      mapPromoLead:
        "Compara senderos, dificultad, distancias y regiones para planificar tu viaje antes de reservar.",
      mapOpenAria: "Abrir mapa interactivo de Chapada dos Veadeiros",
      mapLightboxAria: "Mapa ampliado de Chapada dos Veadeiros",
      mapLightboxClose: "Cerrar mapa",
      mapLightboxHint: "Toca o haz clic en el mapa para abrir la guía correspondiente.",
      mapEmbeddedLead:
        "Toca o haz clic en las zonas del mapa sobre los atractivos catalogados para obtener más información.",
      mapInteractiveTitle: "Mapa interactivo",
      mapAlt: "Mapa ilustrado de Chapada dos Veadeiros con cascadas y núcleos urbanos.",
      reviewsH2: "Opiniones de viajeros",
      atrativosChip: "Mapa oficial",
      atrativosH1: "Atractivos de la Chapada",
      atrativosPhotoLabel: "Atractivos",
      heroCarouselPrev: "Imagen anterior",
      heroCarouselNext: "Siguiente imagen",
      revistaH2: "Últimas noticias de Chapada dos Veadeiros",
      revistaSeeAll: "Ver todo",
      revistaReadMore: "Leer artículo",
      instagramChip: "Instagram",
      instagramHandle: "@guiachapadaveadeiros",
      instagramLead:
        "Fotos recientes y novedades en @guiachapadaveadeiros. Usa el botón de abajo para abrir el perfil completo en Instagram.",
      instagramLeadWithFeed:
        "Últimas publicaciones de @guiachapadaveadeiros. Toca una foto para abrirla en Instagram.",
      instagramGridAria: "Últimas fotos de Instagram",
      instagramCta: "Ver publicaciones en Instagram",
      floatWaAria: "WhatsApp",
      floatWaMessage: "Guia Chapada Veadeiros - ¿Podría ayudarme, por favor?",
      reviewsTitle: "Opiniones de viajeros",
      reviewsLead: "Experiencias reales de quienes visitaron la Chapada dos Veadeiros.",
      reviewGoogleLabel: "Reseña Google · 5 estrellas",
      reviewsCarouselAria: "Carrusel de opiniones — desliza hacia los lados",
      reviewsDotAria: "Opinión {{i}} de {{n}}",
      atrativoGalleryH2: "Galería de fotos",
    },
    revistaHub: {
      title: "Revista — historias y planificación",
      lead: "Artículos para elegir época, contratar guía credenciado y planificar sin estrés.",
      cardContratarTitle: "¿Por qué contratar guía local?",
      cardContratarLead: "Seguridad, tiempos, fotos y conocimiento del terreno.",
      cardEpocaTitle: "Mejor época para visitar la Chapada",
      cardEpocaLead: "Mes a mes: lluvias, sequía, festivales y nivel de ríos.",
    },
    revistaPage: {
      mastheadTitle: "Revista",
      mastheadSub:
        "Todo sobre la Chapada dos Veadeiros: consejos, senderos, eventos, bastidores y lo mejor del destino en un solo lugar.",
      seoTitle: "Revista Chapada dos Veadeiros",
      seoDesc:
        "Noticias, itinerarios, naturaleza y cultura en la Chapada dos Veadeiros — artículos actualizados del Guía Chapada.",
      chipDefault: "Consejos",
      moreStories: "Más artículos",
    },
    atrativosHub: {
      title: "Atractivos — 18 rutas del mapa oficial",
      seoDesc:
        "Cascadas, miradores y senderos en la Chapada dos Veadeiros — 18 rutas en el mapa oficial con guía local.",
    },
    contact: {
      pageKicker: "Guia Chapada",
      title: "Contacto",
      subtitle: "Habla con el Guía Chapada dos Veadeiros.",
      formTitle: "Envía un mensaje",
      labelName: "Nombre",
      labelSubject: "Asunto / tipo de contacto",
      labelEmail: "Correo (opcional)",
      labelPhone: "WhatsApp o teléfono (opcional)",
      labelMessage: "Mensaje",
      placeholderEmail: "tu@correo.com",
      placeholderPhone: "(62) 99999 9999",
      placeholderMessage: "Cuéntanos cómo podemos ayudarte...",
      tipoOptions: [
        { value: "elogio", label: "Felicitación" },
        { value: "reclamacao", label: "Reclamo" },
        { value: "duvida", label: "Duda o pregunta" },
        { value: "orcamento", label: "Presupuesto o reserva" },
        { value: "outro", label: "Otro" },
      ],
      submit: "Enviar",
      sending: "Enviando...",
      clear: "Limpiar",
      successTitle: "Mensaje enviado",
      successLine: "¡Listo! Tu mensaje fue enviado.",
      successThanks: "Pronto nos pondremos en contacto. ¡Gracias!",
      successTitleDual: "Confirma en ambos",
      successLineDual:
        "Abrimos WhatsApp y tu correo con todos los datos. Envía también el correo aparte para asegurarte de que recibimos el mensaje.",
      successThanksDual: "Si no se abrió nada, permite ventanas emergentes o usa WhatsApp/Correo al lado.",
      errorPrefix: "No se pudo enviar: ",
      asideKicker: "Atención y ubicación",
      asideLead:
        "Guía Chapada atiende por WhatsApp y por correo. La base es Alto Paraíso de Goiás (Chapada dos Veadeiros).",
      asidePhoneLabel: "Teléfono y WhatsApp",
      asideEmailLabel: "Correo",
      asideAddressLabel: "Dirección (referencia)",
      asideAddressValue: "Alto Paraíso de Goiás, Goiás · Brasil",
      asideMapLabel: "Mapa",
      mapIframeTitle: "Mapa — Alto Paraíso de Goiás",
      mapOpenFullLabel: "Abrir mapa en pantalla completa",
      phoneDisplay: "+55 62 98250-6891",
      mapEmbedSrc: "https://maps.google.com/maps?q=-14.1319%2C-47.51&z=12&hl=es&output=embed",
      mapExternalHref:
        "https://www.google.com/maps/search/?api=1&query=Alto+Para%C3%ADso+de+Goi%C3%A1s,+Goi%C3%A1s,+Brasil",
    },
    footer: {
      taglineTitle: "Guía Chapada Veadeiros",
      taglineBody:
        "Itinerarios, cascadas, senderos y experiencias con guía local para planificar mejor tu viaje a la Chapada dos Veadeiros.",
      instagramHandle: "@guiachapadaveadeiros",
      cadasturAlt: "Sello Cadastur — Guía Chapada dos Veadeiros",
      nationalParkAlt: "Chapada dos Veadeiros",
      colPlan: "Planifica tu viaje",
      linkShop: "Tours y servicios",
      linkLodging: "Alojamiento",
      linkContact: "Contacto",
      linkWhatsapp: "WhatsApp",
      colSupport: "Atención",
      whatsappLabel: "WhatsApp:",
      emailLabel: "Correo:",
      baseLabel: "Sede:",
      baseValue: "Chapada dos Veadeiros, Goiás — Brasil",
      copyright: "© Todos los derechos reservados — 2026 | CNPJ 24.354.289/0001-05 | Desarrollado por Diego Marques",
    },
    seo: {
      homeTitle: HOME_SEO.es.title,
      homeDesc: HOME_SEO.es.desc,
      homeKeywords: HOME_SEO.es.keywords,
      homeOgImageAlt: HOME_SEO.es.ogImageAlt,
    },
  },
};

export const ARTICLE_CONTRATAR = {
  pt: {
    title: "Por que contratar um guia local na Chapada dos Veadeiros?",
    desc: "Segurança, tempo bem usado, fotos marcantes e roteiros que só quem mora na região domina de verdade — com credencial Cadastur.",
    path: "revista/contratar-guia-local-chapada-veadeiros.html",
    blocks: `<p class="lead">Na natureza, cada minuto conta: estacionamento, horário de sol, trilhas fechadas, alternativas com chuva e respeito às normas do Parque Nacional não aparecem num aplicativo genérico — aparecem no bolso de quem trabalha todos os dias na Chapada.</p>
<p>Um <strong>guia credenciado</strong> traduz o cerrado em experiência segura: ritmo adequado ao grupo, leitura de riscos (escorregamentos, calor, carga de trilha) e suporte quando o clima muda de figura no meio do dia.</p>
<p>Além disso, você <strong>ganha fotos melhores</strong> — Ângulos, horários de luz e cantos menos congestionados são parte do ofício. O passeio deixa de ser “sorte no Google Maps” e vira roteiro memorável.</p>
<p>Por fim, contratar local é também <strong>economia de tempo e stress</strong>: menos idas e voltas, mais mergulhos em poços cristalinos e mais história viva do bioma.</p>`,
  },
  en: {
    title: "Why hire a licensed local guide in Chapada dos Veadeiros?",
    desc: "Safety, smarter timing, standout photos and routes only locals truly master — with official Cadastur credentials.",
    path: "revista/contratar-guia-local-chapada-veadeiros.html",
    blocks: `<p class="lead">In the wild, every minute matters: parking, sun angle, closed trails, rain alternatives and National Park rules rarely show up in a generic app — they show up with people who work in Chapada every day.</p>
<p>A <strong>licensed guide</strong> turns the cerrado into safer fun: pace that matches your group, hazard awareness (heat, slippery rocks, trail load) and backup plans when weather shifts mid-day.</p>
<p>You also get <strong>better photos</strong> — angles, light and quieter corners are part of the craft. The day stops being “luck on Google Maps” and becomes a memorable route.</p>
<p>Hiring locally is also <strong>saved time and less stress</strong>: fewer U-turns, more crystal pools and more living stories about the biome.</p>`,
  },
  es: {
    title:
      "¿Por qué es tan importante contratar un guía en excursiones por senderos y naturaleza?",
    desc:
      "Contratar guía turístico no es un lujo: marca la diferencia entre una salida segura y memorable y una aventura que puede terminar mal. Entienda por qué un conductor acreditado (Cadastur) es indispensable en Chapada dos Veadeiros.",
    path: "revista/contratar-guia-local-chapada-veadeiros.html",
    blocks: `<p class="lead">Chapada dos Veadeiros es uno de los destinos de ecoturismo más extraordinarios de Brasil: cascadas de agua cristalina, senderos en el cerrado nativo, pozos verde-esmeralda y formaciones rocosas milenarias. También es un entorno salvaje que exige respeto y, sobre todo, <strong>conocimiento local</strong>.</p>
<p>Ahí aparece el rol insustituible del <strong>guía de turismo habilitado</strong>: cada minuto cuenta — aparcamiento, luz del sol, senderos cerrados, alternativas con lluvia y normas del Parque Nacional casi nunca están en una app genérica; están con quien trabaja cada día en la Chapada.</p>
<p>El guía traduce el cerrado en experiencia segura: ritmo acorde al grupo, lectura de riesgos (calor, rocas resbaladizas, carga del sendero) y plan B cuando el clima cambia a mitad del día.</p>
<p>También tendrás <strong>mejores fotos</strong> — encuadre, luz y rincones menos concurridos son parte del oficio. El día deja de ser “suerte en Google Maps” y se convierte en una ruta memorable.</p>
<p>Contratar local es <strong>ahorrar tiempo y estrés</strong>: menos idas y venidas, más pozas cristalinas y más historia viva del bioma.</p>`,
  },
};

export const ARTICLE_EPOCA = {
  pt: {
    title: "Melhor época para visitar a Chapada dos Veadeiros?",
    desc: "Guia mês a mês: chuvas, transição, seca, alta temporada local e cuidados com segurança em cada cenário.",
    path: "revista/melhor-epoca-visitar-chapada-dos-veadeiros.html",
    intro: `<p class="lead">Não existe um único “mês perfeito” para todos os perfis — quem busca <strong>volume de água e cachoeiras monumentais</strong> tolera mais chuva; quem quer <strong>poços cristalinos e trilha na seca</strong> prefere o período seco. Use a tabela abaixo como bússola.</p>`,
  },
  en: {
    title: "Best time to visit Chapada dos Veadeiros?",
    desc: "Month-by-month guide: rains, transition, dry season, local peak events and safety notes.",
    path: "revista/melhor-epoca-visitar-chapada-dos-veadeiros.html",
    intro: `<p class="lead">There isn't one “perfect month” for everyone — travellers who want <strong>huge waterfalls</strong> accept more rain; those after <strong>crystal pools & dry hiking</strong> often prefer the dry season. Use the table as your compass.</p>`,
  },
  es: {
    title: "¿Mejor época para visitar Chapada dos Veadeiros?",
    desc: "Mes a mes: lluvias, transición, sequía, eventos locales y seguridad.",
    path: "revista/melhor-epoca-visitar-chapada-dos-veadeiros.html",
    intro: `<p class="lead">No hay un “mes perfecto” universal — quien busca <strong>cascadas monumentales</strong> acepta más lluvia; quien quiere <strong>pozas cristalinas y senderismo en seco</strong> suele preferir la estación seca. La tabla es tu brújula.</p>`,
  },
};

/** Roteiro editorial 4 dias — corpo em HTML estático; metadados para hub/teaser/build. */
export const ARTICLE_ROTEIRO_4_DIAS = {
  pt: {
    title: "Roteiro de 4 dias na Chapada dos Veadeiros: o clássico para quem visita pela primeira vez",
    desc: "Cataratas dos Couros, Parque Nacional, Santa Bárbara, Capivara, Vale da Lua e Segredo: o itinerário completo para estrear na Chapada dos Veadeiros.",
    chip: "Roteiros",
    path: "revista/roteiro-4-dias-chapada-dos-veadeiros.html",
  },
  en: {
    title: "4-day Chapada dos Veadeiros itinerary: the classic first-time route",
    desc: "Couros waterfalls, National Park, Santa Bárbara, Capivara, Moon Valley and Segredo: the complete itinerary for your first visit to Chapada dos Veadeiros.",
    chip: "Itineraries",
    path: "revista/roteiro-4-dias-chapada-dos-veadeiros.html",
  },
  es: {
    title: "Ruta de 4 días en Chapada dos Veadeiros: lo clásico para la primera vez",
    desc: "Cataratas del Couros, Parque Nacional, Santa Bárbara, Capivara, Valle de la Luna y Segredo: el itinerario completo para tu primera visita a Chapada dos Veadeiros.",
    chip: "Rutas",
    path: "revista/roteiro-4-dias-chapada-dos-veadeiros.html",
  },
};

/** Matéria estática multisite (slug alinhado a `revista/ataque-onca-parda-chapada-veadeiros.html`). */
export const ARTICLE_ONCA_PARDA = {
  pt: {
    title:
      "Ataque de onça-parda na Chapada dos Veadeiros: o que aconteceu e como agir ao encontrar uma onça na trilha",
    desc:
      "Caso em maio de 2026 próximo à Cordovil, comportamento típico da fauna (repouso no alto, camuflagem no cerrado), o que guias recomendam e segurança em trilhas — episódio muito raro.",
    chip: "Segurança",
    path: "revista/ataque-onca-parda-chapada-veadeiros.html",
  },
  en: {
    title:
      "Cougar attack in Chapada dos Veadeiros: what happened and how to act when you encounter a cougar on the trail",
    desc:
      "May 2026 incident near Cordovil, resting vs. camouflage behavior, guide advice and rare predation vs. coexistence tips for trails.",
    chip: "Safety",
    path: "revista/ataque-onca-parda-chapada-veadeiros.html",
  },
  es: {
    title:
      "Ataque de puma en Chapada dos Veadeiros: qué pasó y cómo actuar al encontrar un puma en el sendero",
    desc:
      "Caso de mayo de 2026 junto a Cordovil, comportamiento habitual de la fauna, recomendaciones de guías y seguridad en senderos — suceso excepcional.",
    chip: "Seguridad",
    path: "revista/ataque-onca-parda-chapada-veadeiros.html",
  },
};

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
  { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", image: "imagens/cachoeira-almecegas-guia-chapada-veadeiros-alto-paraiso-10.jpg", title: { pt: "Cachoeiras Almécegas e Poço São Bento", en: "Almécegas waterfalls & São Bento pool", es: "Cataratas de Almécegas y pozo São Bento" }, lead: { pt: "Um dos circuitos mais clássicos de Alto Paraíso — poços claros e trilha memorável com guia local.", en: "A classic Alto Paraíso circuit — clear pools and a memorable trail with a local guide.", es: "Un circuito clásico de Alto Paraíso — pozas cristalinas y sendero memorable con guía local." } },
  { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", image: "imagens/vale-lua-guia-chapada-veadeiros-sao-jorge-1.jpg", title: { pt: "Vale da Lua", en: "Moon Valley", es: "Valle de la Luna" }, lead: { pt: "Formações de quartzito esculpidas pelo tempo — cenário único em São Jorge.", en: "Quartzite sculpted by time — a one-of-a-kind setting in São Jorge.", es: "Cuarzo tallado por el tiempo — un paisaje único en São Jorge." } },
  { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Cataratas dos Couros", en: "Couros waterfalls", es: "Cataratas de Couros" }, lead: { pt: "Grande complexo de quedas e poços — roteiro intenso que pede organização e respeito ao tempo de trilha.", en: "A large complex of falls and pools — an intense hike that needs timing and safety.", es: "Gran complejo de saltos y pozas — trekking intenso que exige planificación y seguridad." } },
  { slug: "cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros", image: "imagens/cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros-1.jpg", title: { pt: "Cachoeira Cordovil e Poço Esmeralda", en: "Cordovil waterfall & Esmerald pool", es: "Cascada Cordovil y pozo Esmeralda" }, lead: { pt: "Águas verdes-esmeralda e saltos curtos muito fotogênicos na região de Alto Paraíso.", en: "Emerald waters and photogenic short falls near Alto Paraíso.", es: "Aguas esmeralda y saltos muy fotogénicos cerca de Alto Paraíso." } },
  { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", image: "imagens/cachoeira-segredo-guia-chapada-veadeiros-sao-jorge-10.jpg", title: { pt: "Cachoeira do Segredo", en: "The Secret waterfall", es: "Cascada del Secreto" }, lead: { pt: "Cartão-postal de São Jorge: poço profundo e paisagem de cerrado preservado.", en: "A São Jorge postcard — deep pools and preserved cerrado views.", es: "Postal de São Jorge — pozas profundas y cerrado conservado." } },
  { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cachoeira-cristais-veu-noiva-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Cachoeira dos Cristais", en: "Cristais waterfall", es: "Cascada de los Cristales" }, lead: { pt: "Acesso ameno e ótimo para famílias — veu compacto e poços rasos para relaxar.", en: "Easy access, great for families — a compact veil and shallow pools.", es: "Acceso fácil, ideal para familias — velo compacto y pozas someras." } },
  { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", image: "imagens/cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-4.jpg", title: { pt: "Cachoeira Poço Encantado", en: "Enchanted Pool waterfall", es: "Cascada Pozo Encantado" }, lead: { pt: "Tesouro em Teresina de Goiás — poço translúcido que brilha em dias de sol.", en: "A Teresina gem — translucent pools on sunny days.", es: "Joyas en Teresina de Goiás — pozas translúcidas con sol." } },
  { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", image: "imagens/cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante.jpg", title: { pt: "Cachoeira Santa Bárbara", en: "Santa Barbara waterfall", es: "Cascada Santa Bárbara" }, lead: { pt: "Um dos destaques de Cavalcante — água volumosa e experiência completa de dia inteiro.", en: "A Cavalcante highlight — big flow and a full-day experience.", es: "Estrella de Cavalcante — gran caudal para una jornada completa." } },
  { slug: "cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante", image: "imagens/complexo-cachoeiras-rio-prata-guia-chapada-veadeiros-cavalcante.jpg", title: { pt: "Complexo de Cachoeiras do Rio da Prata", en: "Rio da Prata waterfall complex", es: "Complejo de cascadas del Río da Prata" }, lead: { pt: "Varias quedas e poços em sequência — roteiro clássico com guia em Cavalcante.", en: "Multiple falls in sequence — the classic guided circuit in Cavalcante.", es: "Varios saltos en serie — circuito clásico con guía en Cavalcante." } },
  { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", image: "imagens/cachoeira-macaquinhos-guia-chapada-veadeiros-6.jpg", title: { pt: "Cachoeiras dos Macaquinhos", en: "Macaquinhos waterfalls", es: "Cataratas de los Macaquinhos" }, lead: { pt: "Trilha exigente e recompensas enormes — melhor com suporte de guia credenciado.", en: "A demanding trail with huge rewards — best with a licensed guide.", es: "Sendero exigente con gran recompensa — mejor con guía habilitado." } },
  { slug: "cachoeira-label-guia-chapada-veadeiros-sao-joao-alianca", image: "imagens/cachoeira-label-guia-chapada-veadeiros.jpg", title: { pt: "Cachoeira do Label", en: "Label waterfall", es: "Cascada del Label" }, lead: { pt: "Queda imponente na região de São João d'Aliança — natureza selvagem e pouca infraestrutura.", en: "A powerful fall near São João d'Aliança — wild nature, minimal infrastructure.", es: "Salto imponente en São João d'Aliança — naturaleza salvaje y poca infraestructura." } },
  { slug: "cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Cachoeira das Loquinhas", en: "Loquinhas waterfall", es: "Cascada de las Loquinhas" }, lead: { pt: "Poços em degrau e visual cinematográfico — sensível ao volume de chuvas.", en: "Stepped pools and cinematic views — sensitive to rainfall.", es: "Pozas escalonadas y vistas de postal — sensible a las lluvias." } },
  { slug: "cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso", image: "imagens/cachoeira-arcanjos-anjos-guia-chapada-veadeiros-alto-paraiso.jpg", title: { pt: "Cachoeira Anjos e Arcanjos", en: "Angels & Archangels waterfall", es: "Cascada Ángeles y Arcángeles" }, lead: { pt: "Circuito variado com saltos e poços para diferentes perfis em Alto Paraíso.", en: "Varied falls and pools for different skill levels in Alto Paraíso.", es: "Circuito variado con saltos y pozas para distintos niveles." } },
  { slug: "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge", image: "imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-1.jpg", title: { pt: "Mirante da Janela e Cachoeira do Abismo", en: "Janela lookout & Abismo waterfall", es: "Mirador de la Ventana y cascada Abismo" }, lead: { pt: "Dentro do Parque Nacional — um dos mirantes mais famosos do Brasil.", en: "Inside the National Park — one of Brazil's most famous lookouts.", es: "Dentro del Parque Nacional — uno de los miradores más famosos de Brasil." } },
  { slug: "parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge", image: "imagens/parque-nacional-guia-chapada-veadeiros-saltos-rio-preto-garimpao.jpg", title: { pt: "Parque Nacional — Saltos do Rio Preto", en: "National Park — Rio Preto falls", es: "Parque Nacional — Saltos del Río Preto" }, lead: { pt: "Trilha longa até o grande salto — planejamento e respeito às regras do ICMBio.", en: "Long trail to the big falls — plan ahead and follow ICMBio rules.", es: "Sendero largo hasta el gran salto — planificación y normas del ICMBio." } },
  { slug: "parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge", image: "imagens/parque-nacional-guia-chapada-veadeiros-carrossel-saltos-rio-preto.jpg", title: { pt: "Parque Nacional — Cânions e Cariocas", en: "National Park — canyons route", es: "Parque Nacional — cañones y cariocas" }, lead: { pt: "Geologia impressionante e trechos de rio com segurança reforçada em grupo.", en: "Stunning geology — river sections safest with a guided group.", es: "Geología impactante — tramos de río más seguros en grupo con guía." } },
  { slug: "cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca", image: "imagens/cachoeira-macaco-chapada-veadeiros-macacao-4.jpg", title: { pt: "Cachoeira do Macaco", en: "Monkey waterfall", es: "Cascada del Mono" }, lead: { pt: "Complexo conhecido como Macaquinhos/Macaco — cenário amplo e miradores naturais.", en: "Known as the Macaco complex — wide scenery and natural viewpoints.", es: "Complejo Macaco — escenario amplio y miradores naturales." } },
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
  return HOTSPOTS.map((h) => ({ ...h, box: MAP_BOX_BY_SLUG[h.slug] }));
}

export const MAP_IMAGE = "imagens/cachoeiras-guia-chapada-veadeiros-2022.jpg";

/** Slides do hero (copy i18n/common.json do cliente React). */
export const HERO_SLIDES = {
  pt: [
    {
      image: "imagens/hero-slide-01-guias-locais-cachoeira.png",
      badge: "Chapada dos Veadeiros",
      title: "Passeios com guias locais",
      lead: "Contamos com uma equipe de guias parceiros na Chapada dos Veadeiros para realização de passeios exclusivos ou em excursões com grupos diversos",
      sub: "Faça seu roteiro ou entre na próxima excursão",
      ctaKind: "whatsapp",
      ctaLabel: "Whatsapp",
      duration: 10000,
    },
    {
      image: "imagens/hero-slide-02-em-breve-cachoeira.png",
      badge: "Novidade",
      title: "Seu próximo destino começa aqui",
      lead: "Nosso sistema de venda de ingressos para excursões está na fase final de testes. As primeiras saídas já estão sendo disponibilizadas. Reserve agora e garanta sua vaga antes que as turmas sejam preenchidas.",
      sub: "Participe das primeiras excursões com reserva online, confirmação automática e atendimento especializado da Guia Chapada Veadeiros.",
      ctaKind: "none",
      duration: 10000,
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
      badge: "Chapada dos Veadeiros",
      title: "Tours with local guides",
      lead: "We work with partner guides across Chapada dos Veadeiros for exclusive outings or mixed-group excursions.",
      sub: "Plan your route or join the next group trip",
      ctaKind: "whatsapp",
      ctaLabel: "WhatsApp",
      duration: 10000,
    },
    {
      image: "imagens/hero-slide-02-em-breve-cachoeira.png",
      badge: "Coming soon",
      title: "Your next destination starts here",
      lead: "Soon we’ll launch online booking so you can choose your own itinerary—clean, secure digital flow built for quality travel.",
      sub: "Be the first to know when reservations open and get priority to build your trip",
      ctaKind: "none",
      duration: 10000,
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
      badge: "Chapada dos Veadeiros",
      title: "Excursiones con guías locales",
      lead: "Trabajamos con guías asociados en la Chapada dos Veadeiros para salidas exclusivas o excursiones en grupos variados.",
      sub: "Organiza tu ruta o únete a la próxima excursión",
      ctaKind: "whatsapp",
      ctaLabel: "WhatsApp",
      duration: 10000,
    },
    {
      image: "imagens/hero-slide-02-em-breve-cachoeira.png",
      badge: "Próximamente",
      title: "Tu próximo destino empieza aquí",
      lead: "Pronto lanzaremos la plataforma de venta online para que elijas tu propio itinerario, con un flujo digital limpio, seguro y pensado para quien viaja con excelencia.",
      sub: "Entérate en primicia cuando abramos reservas y ten prioridad para armar tu viaje",
      ctaKind: "none",
      duration: 10000,
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

/** Destaques da home (8 cards — mesma ordem do Home.tsx). meta = dificuldade + distância da trilha (não distância de carro). */
export const HOME_FEATURED = {
  pt: [
    { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", label: "Alto Paraíso", title: "Almécegas e Poço São Bento", meta: "Trilha fácil · 500 m a 3 km" },
    { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Vale da Lua", meta: "Trilha fácil · 1,5 km" },
    { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", label: "Aventura", title: "Cataratas dos Couros", meta: "Trilha difícil · 6 km · guia obrigatório" },
    { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", label: "Cavalcante", title: "Cachoeira Santa Bárbara", meta: "Trilha fácil · 3 km" },
    { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Cachoeira do Segredo", meta: "Trilha mediana · 8 km" },
    { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", label: "Alto Paraíso", title: "Cachoeira dos Cristais", meta: "Trilha · 2 km · família" },
    { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", label: "Teresina de Goiás", title: "Poço Encantado", meta: "Trilha fácil · 500 m" },
    { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", label: "São João", title: "Macaquinhos", meta: "Trilha difícil · 6 km" },
  ],
  en: [
    { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", label: "Alto Paraíso", title: "Almécegas & São Bento", meta: "Easy trail · 500 m to 3 km" },
    { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Moon Valley", meta: "Easy trail · 1.5 km" },
    { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", label: "Adventure", title: "Couros waterfalls", meta: "Hard trail · 6 km · guide required" },
    { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", label: "Cavalcante", title: "Santa Barbara fall", meta: "Easy trail · 3 km" },
    { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Secret waterfall", meta: "Medium trail · 8 km" },
    { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", label: "Alto Paraíso", title: "Cristais waterfall", meta: "Trail · 2 km · families" },
    { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", label: "Teresina de Goiás", title: "Enchanted Pool", meta: "Easy trail · 500 m" },
    { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", label: "São João", title: "Macaquinhos", meta: "Hard trail · 6 km" },
  ],
  es: [
    { slug: "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", label: "Alto Paraíso", title: "Almécegas y São Bento", meta: "Sendero fácil · 500 m a 3 km" },
    { slug: "vale-lua-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Valle de la Luna", meta: "Sendero fácil · 1,5 km" },
    { slug: "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso", label: "Aventura", title: "Cataratas de Couros", meta: "Sendero difícil · 6 km · guía obligatorio" },
    { slug: "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante", label: "Cavalcante", title: "Cascada Santa Bárbara", meta: "Sendero fácil · 3 km" },
    { slug: "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", label: "São Jorge", title: "Cascada del Secreto", meta: "Sendero medio · 8 km" },
    { slug: "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso", label: "Alto Paraíso", title: "Cascada de los Cristales", meta: "Sendero · 2 km · familia" },
    { slug: "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias", label: "Teresina de Goiás", title: "Pozo Encantado", meta: "Sendero fácil · 500 m" },
    { slug: "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca", label: "São João", title: "Macaquinhos", meta: "Sendero difícil · 6 km" },
  ],
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
      title: "Atrativos — 17 rotas ligadas ao mapa oficial",
      seoDesc:
        "Cachoeiras, mirantes e trilhas da Chapada dos Veadeiros — 17 rotas no mapa oficial com guia local.",
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
      homeTitle: "Guia Chapada Veadeiros | Passeios com guia local",
      homeDesc: "Roteiros personalizados na Chapada dos Veadeiros com guia credenciado: cachoeiras, trilhas, Parque Nacional e melhores épocas.",
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
      title: "Attractions — 17 routes linked to the official map",
      seoDesc:
        "Waterfalls, lookouts and trails in Chapada dos Veadeiros — 17 routes on the official map with a local guide.",
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
      homeTitle: "Guia Chapada Veadeiros | Guided tours with a local guide",
      homeDesc: "Custom itineraries in Chapada dos Veadeiros with a licensed guide: waterfalls, trails, National Park & best seasons.",
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
      title: "Atractivos — 17 rutas del mapa oficial",
      seoDesc:
        "Cascadas, miradores y senderos en la Chapada dos Veadeiros — 17 rutas en el mapa oficial con guía local.",
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
      homeTitle: "Guia Chapada Veadeiros | Excursiones con guía local",
      homeDesc: "Itinerarios a medida en Chapada dos Veadeiros con guía habilitado: cascadas, senderos, Parque Nacional y mejores épocas.",
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

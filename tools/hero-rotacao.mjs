/**
 * Revezamento das fotos dos slides Exclusivo e Compartilhado.
 * A foto 08 entra só no celular. O slide 3 não faz parte desta lista.
 */
const ORIGIN = "https://www.guiachapadaveadeiros.com";

const EXCLUSIVO = [
  {
    n: "passeio-exclusivo-cachoeira-chapada-dos-veadeiros",
    atual: true,
    alt: {
      pt: "Grupo em passeio exclusivo com guia diante de uma cachoeira na Chapada dos Veadeiros",
      en: "Group on a private tour with a guide in front of a waterfall in Chapada dos Veadeiros",
      es: "Grupo en un paseo exclusivo con guía frente a una cascada en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-exclusivo-guia-local-mirante-cachoeira-chapada-dos-veadeiros-02",
    alt: {
      pt: "Família em passeio exclusivo com guia local no mirante de uma cachoeira na Chapada dos Veadeiros",
      en: "Family on a private tour with a local guide at a waterfall viewpoint in Chapada dos Veadeiros",
      es: "Familia en un paseo exclusivo con guía local en el mirador de una cascada en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-exclusivo-guia-local-amigos-cachoeira-chapada-dos-veadeiros-03",
    alt: {
      pt: "Quatro amigos em passeio exclusivo com guia local diante de uma cachoeira alta na Chapada dos Veadeiros",
      en: "Four friends on a private tour with a local guide in front of a tall waterfall in Chapada dos Veadeiros",
      es: "Cuatro amigos en un paseo exclusivo con guía local frente a una cascada alta en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-exclusivo-guia-local-mirante-cachoeiras-chapada-dos-veadeiros-04",
    alt: {
      pt: "Três amigas abraçadas observando cachoeiras em sequência durante passeio com guia local na Chapada dos Veadeiros",
      en: "Three friends hugging while watching a sequence of waterfalls on a tour with a local guide in Chapada dos Veadeiros",
      es: "Tres amigas abrazadas observando cascadas en secuencia durante un paseo con guía local en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-exclusivo-guia-local-familia-banho-de-argila-chapada-dos-veadeiros-05",
    alt: {
      pt: "Família em passeio exclusivo com guia local após banho de argila à beira de um lago na Chapada dos Veadeiros",
      en: "Family on a private tour with a local guide after a clay bath beside a lake in Chapada dos Veadeiros",
      es: "Familia en un paseo exclusivo con guía local tras un baño de arcilla a orillas de un lago en Chapada dos Veadeiros",
    },
  },
];

const COMPARTILHADO = [
  {
    n: "passeio-compartilhado-cachoeira-chapada-dos-veadeiros",
    atual: true,
    alt: {
      pt: "Viajantes em passeio compartilhado posando em frente a uma cachoeira na Chapada dos Veadeiros",
      en: "Travelers on a shared tour posing in front of a waterfall in Chapada dos Veadeiros",
      es: "Viajeros en un paseo compartido posando frente a una cascada en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-grupo-rio-chapada-dos-veadeiros-02",
    alt: {
      pt: "Grupo de viajantes meditando nas pedras ao lado do rio em passeio compartilhado com guia local na Chapada dos Veadeiros",
      en: "Group of travelers meditating on rocks beside the river on a shared tour with a local guide in Chapada dos Veadeiros",
      es: "Grupo de viajeros meditando en las piedras junto al río en un paseo compartido con guía local en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-trilha-canion-cachoeira-chapada-dos-veadeiros-03",
    alt: {
      pt: "Grupo em passeio compartilhado com guia local na trilha à beira de um cânion com cachoeira na Chapada dos Veadeiros",
      en: "Group on a shared tour with a local guide on the trail beside a canyon and waterfall in Chapada dos Veadeiros",
      es: "Grupo en un paseo compartido con guía local en el sendero al borde de un cañón con cascada en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-banho-cachoeira-chapada-dos-veadeiros-04",
    alt: {
      pt: "Viajantes nadando no poço de uma cachoeira em passeio compartilhado com guia local na Chapada dos Veadeiros",
      en: "Travelers swimming in a waterfall pool on a shared tour with a local guide in Chapada dos Veadeiros",
      es: "Viajeros nadando en el pozo de una cascada en un paseo compartido con guía local en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-poco-natural-chapada-dos-veadeiros-05",
    alt: {
      pt: "Amigas relaxando em um poço natural de águas cor de âmbar durante passeio com guia local na Chapada dos Veadeiros",
      en: "Friends relaxing in an amber natural pool on a tour with a local guide in Chapada dos Veadeiros",
      es: "Amigas descansando en un pozo natural de aguas color ámbar durante un paseo con guía local en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-paredao-de-pedra-chapada-dos-veadeiros-06",
    alt: {
      pt: "Grupo de passeio compartilhado com guia local posando diante de um paredão de pedra perto das cachoeiras da Chapada dos Veadeiros",
      en: "Shared-tour group with a local guide posing in front of a rock wall near the waterfalls of Chapada dos Veadeiros",
      es: "Grupo de paseo compartido con guía local posando ante un paredón de piedra cerca de las cascadas de Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-grupo-cachoeira-chapada-dos-veadeiros-07",
    alt: {
      pt: "Grupo sobre uma laje de pedra em frente à cachoeira em passeio compartilhado com guia local na Chapada dos Veadeiros",
      en: "Group on a stone slab in front of a waterfall on a shared tour with a local guide in Chapada dos Veadeiros",
      es: "Grupo sobre una losa de piedra frente a la cascada en un paseo compartido con guía local en Chapada dos Veadeiros",
    },
  },
  {
    n: "passeio-compartilhado-guia-local-trilha-dos-saltos-chapada-dos-veadeiros-08",
    soCelular: true,
    alt: {
      pt: "Grupo de viajantes na placa da trilha dos Saltos, Carrossel e Corredeiras em passeio com guia local na Chapada dos Veadeiros",
      en: "Group of travelers at the Saltos, Carrossel and Corredeiras trail sign on a tour with a local guide in Chapada dos Veadeiros",
      es: "Grupo de viajeros en el letrero del sendero de los Saltos, Carrusel y Corrientes en un paseo con guía local en Chapada dos Veadeiros",
    },
  },
];

const BY_THEME = { exclusivo: EXCLUSIVO, compartilhado: COMPARTILHADO };

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function fileUrl(item) {
  const variant = item.soCelular ? "mobile" : "desktop";
  return `${ORIGIN}/assets/img/hero/${item.n}-${variant}.webp`;
}

export function heroAgencyImageUrls() {
  const desktop = [...EXCLUSIVO, ...COMPARTILHADO].filter((item) => !item.soCelular).map(fileUrl);
  return desktop.slice(0, 10);
}

export function heroImageObjectsLd(locale) {
  const place = { "@type": "Place", name: "Chapada dos Veadeiros, Goiás, Brasil" };
  const graph = [...EXCLUSIVO, ...COMPARTILHADO].map((item) => {
    const alt = item.alt[locale] || item.alt.pt;
    return {
      "@type": "ImageObject",
      contentUrl: fileUrl(item),
      name: alt,
      description: alt,
      contentLocation: place,
    };
  });
  return { "@context": "https://schema.org", "@graph": graph };
}

export function heroRotationSitemapImages() {
  return [...EXCLUSIVO, ...COMPARTILHADO].map((item) => ({
    loc: fileUrl(item),
    title: item.alt.pt,
  }));
}

function poolFor(locale) {
  const map = (list) =>
    list.map((item) => {
      const row = { n: item.n, alt: item.alt[locale] || item.alt.pt };
      if (item.soCelular) row.soCelular = 1;
      return row;
    });
  return { exclusivo: map(EXCLUSIVO), compartilhado: map(COMPARTILHADO) };
}

export function heroRotationHeadScript(ap, locale) {
  const pool = JSON.stringify(poolFor(locale));
  const prefix = JSON.stringify(`${ap}assets/img/hero/`);
  return `    <script>(function(){var P=${prefix};var V="4";var pool=${pool};function pick(key,mobile){var list=pool[key].filter(function(it){return mobile||!it.soCelular;});var last="";try{last=localStorage.getItem("gcvHeroLast:"+key)||"";}catch(e){}var choices=list.filter(function(it){return it.n!==last;});if(!choices.length)choices=list;var item=choices[Math.floor(Math.random()*choices.length)];try{localStorage.setItem("gcvHeroLast:"+key,item.n);}catch(e){}return item;}var mobile=window.matchMedia("(max-width:780px)").matches;var exclusivo=pick("exclusivo",mobile);var compartilhado=pick("compartilhado",mobile);window.GCV_HERO_PICK={exclusivo:exclusivo,compartilhado:compartilhado,mobile:mobile};window.GCV_HERO_APPLY=function(theme){var pickItem=window.GCV_HERO_PICK[theme];var pic=document.querySelector('.gcv-slide[data-theme="'+theme+'"] picture.gcv-media');if(!pickItem||!pic)return;var v="?v="+V;function u(suffix,ext){return P+pickItem.n+suffix+"."+ext+v;}var sources=pic.querySelectorAll("source");sources[0].srcset=u("-mobile-1x","avif")+" 1x, "+u("-mobile","avif")+" 2x";sources[1].srcset=u("-mobile-1x","webp")+" 1x, "+u("-mobile","webp")+" 2x";if(!pickItem.soCelular){sources[2].srcset=u("-desktop-1x","avif")+" 1x, "+u("-desktop","avif")+" 2x";sources[3].srcset=u("-desktop-1x","webp")+" 1x, "+u("-desktop","webp")+" 2x";}var img=pic.querySelector("img");img.src=pickItem.soCelular?u("-mobile","webp"):u("-desktop","webp");img.alt=pickItem.alt;};var kind=mobile?"mobile":"desktop";var one=P+exclusivo.n+"-"+kind+"-1x.avif?v="+V;var two=P+exclusivo.n+"-"+kind+".avif?v="+V;var link=document.createElement("link");link.rel="preload";link.as="image";link.type="image/avif";link.setAttribute("fetchpriority","high");link.href=one;link.setAttribute("imagesrcset",one+" 1x, "+two+" 2x");document.head.appendChild(link);})();</script>`;
}

export function heroRotationPicture(ap, locale, theme, eager) {
  const atual = BY_THEME[theme].find((item) => item.atual);
  const src = `${ap}assets/img/hero/${atual.n}-desktop.webp?v=4`;
  const loading = eager ? `fetchpriority="high"` : `loading="lazy"`;
  return `<picture class="gcv-media" data-gcv-hero-rot="${theme}">
      <source type="image/avif" media="(max-width:780px)" data-srcset="" width="1080" height="1200">
      <source type="image/webp" media="(max-width:780px)" data-srcset="" width="1080" height="1200">
      <source type="image/avif" media="(min-width:781px)" data-srcset="" width="2160" height="1240">
      <source type="image/webp" media="(min-width:781px)" data-srcset="" width="2160" height="1240">
      <img data-src="" width="2160" height="1240" ${loading} decoding="async" alt="">
      <noscript><img src="${esc(src)}" width="2160" height="1240" alt="${esc(atual.alt[locale] || atual.alt.pt)}"></noscript>
    </picture>
    <script>GCV_HERO_APPLY(${JSON.stringify(theme)});</script>`;
}

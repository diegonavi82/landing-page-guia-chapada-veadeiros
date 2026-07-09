import { filterFutureExcursoes } from "./excursoes-future.mjs";

/** Idiomas falados por guia (códigos ISO simplificados). */
export const GUIA_IDIOMAS = {
  "Diego Navi": ["pt", "en", "es"],
  "Martina Motlová": ["cs", "en", "pt"],
  "Gyovanna Torres": ["pt"],
};

export const IDIOMA_FLAG = {
  pt: "br",
  en: "us",
  es: "es",
  cs: "cz",
  ru: "ru",
};

export const IDIOMA_LABEL = {
  pt: { pt: "Português", en: "Portuguese", es: "Portugués" },
  en: { pt: "Inglês", en: "English", es: "Inglés" },
  es: { pt: "Espanhol", en: "Spanish", es: "Español" },
  cs: { pt: "Tcheco", en: "Czech", es: "Checo" },
  ru: { pt: "Russo", en: "Russian", es: "Ruso" },
};

export const IDIOMAS_ARIA = {
  pt: "Idiomas",
  en: "Languages",
  es: "Idiomas",
};

const INGRESSO_GRATIS = { pt: "grátis", en: "free", es: "gratis" };

/** Destinos do card (um ou vários passeios no mesmo dia). */
export function getDestinos(e) {
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

/** 1–4 — define o layout da faixa de mídia (linhas iguais, foto + título). */
export function destinosSpotsCount(e) {
  const n = getDestinos(e).length;
  return Math.min(4, Math.max(1, n));
}

export function destinosSpotsClass(e) {
  return `gcv-excursoes-card--spots-${destinosSpotsCount(e)}`;
}

export function destinosForCard(e) {
  return getDestinos(e).slice(0, 4);
}

export function isDestinosDuo(e) {
  return destinosSpotsCount(e) > 1;
}

function ingressoValorPart(valor, locale = "pt") {
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  if (valor == null || valor === "") return INGRESSO_GRATIS[loc];
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return INGRESSO_GRATIS[loc];
  return `R$ ${n}`;
}

/** Texto do ingresso com valor ao lado, ex.: "Ingresso (R$ 70)" ou "Ingresso (grátis)". */
export function formatIngressoWithValor(label, valor, locale = "pt") {
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  if (valor == null || valor === "") return String(label);
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    return `${label} (${INGRESSO_GRATIS[loc]})`;
  }
  return `${label} (R$ ${n})`;
}

/** Vários passeios: "Ingressos (R$ 50 + R$ 50)" na ordem dos destinos. */
export function formatIngressosMultiplos(destinos, labelPlural, locale = "pt") {
  const parts = (destinos || []).map((d) => ingressoValorPart(d.valorIngresso, locale));
  if (!parts.length) return String(labelPlural);
  return `${labelPlural} (${parts.join(" + ")})`;
}

/**
 * Dados únicos das saídas no carrossel da home ("Próximas saídas").
 * Após mudar algo aqui: `npm run build` (o HTML recebe cópia em JSON para o JS preferir esta fonte).
 */
export const EXCURSOES_CAROUSEL_BY_LOCALE = {
  pt: [
    {
      dayNum: "9",
      monthName: "julho",
      weekday: "Quinta-feira",
      dateISO: "2026-07-09",
      embarque: "Alto Paraíso",
      destino: "Mirante da Janela",
      cartSlug: "mirante-da-janela-p-r-do-sol",
      destinoSub: "Pôr do sol",
      hora: "14:30",
      valor: 160,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      guiaNome: "Gyovanna Torres",
      guiaFoto: "/assets/img/imagens/guia-gyovanna-torres.png",
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      valorIngresso: 50,
      inclLanterna: true,
      exclAlmoco: false,
    },
    {
      dayNum: "18",
      monthName: "julho",
      weekday: "Sábado",
      dateISO: "2026-07-18",
      embarque: "Alto Paraíso",
      destino: "Mirante da Janela + Vale da Lua",
      hora: "7:30",
      valor: 140,
      confirmada: true,
      pessoasInscritas: 4,
      grupoMaximo: 10,
      vagasRestantes: 6,
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      destinos: [
        {
          destino: "Mirante da Janela",
          cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
          atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
          valorIngresso: 50,
        },
        {
          destino: "Vale da Lua",
          cardImg: "/assets/img/imagens/vale-lua-guia-chapada-veadeiros-sao-jorge-1.jpg",
          atrativoPath: "atrativos/vale-lua-guia-chapada-veadeiros-sao-jorge.html",
          valorIngresso: 50,
        },
      ],
    },
    {
      dayNum: "19",
      monthName: "julho",
      weekday: "Domingo",
      dateISO: "2026-07-19",
      embarque: "Alto Paraíso",
      destino: "Cataratas dos Couros",
      hora: "8:30",
      valor: 120,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
      atrativoPath: "atrativos/cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      inclEntradas: true,
      valorIngresso: 0,
    },
    {
      dayNum: "20",
      monthName: "julho",
      weekday: "Segunda-feira",
      dateISO: "2026-07-20",
      embarque: "Alto Paraíso",
      destino: "Bocaina de Farias",
      hora: "8:00",
      valor: 140,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/bocaina-farias-guia-chapada-veadeiros.webp",
      guiaNome: "Martina Motlová",
      guiaFoto: "/assets/img/imagens/guia-martina-motlova.webp",
      valorIngresso: 60,
    },
    {
      dayNum: "21",
      monthName: "julho",
      weekday: "Terça-feira",
      dateISO: "2026-07-21",
      embarque: "Alto Paraíso",
      destino: "Macacão",
      hora: "8:00",
      valor: 160,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 8,
      vagasRestantes: 6,
      cardImg: "/assets/img/imagens/cachoeira-macaco-chapada-veadeiros-macacao-4.jpg",
      atrativoPath: "atrativos/cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      badge4x4: true,
      destinoSub: "somente veículos 4x4",
      valorIngresso: 70,
    },
    {
      dayNum: "22",
      monthName: "julho",
      weekday: "Quarta-feira",
      dateISO: "2026-07-22",
      embarque: "São Jorge",
      destino: "Mirante da Janela",
      hora: "8:45",
      valor: 130,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      valorIngresso: 50,
    },
    {
      dayNum: "5",
      monthName: "agosto",
      weekday: "Quarta-feira",
      dateISO: "2026-08-05",
      embarque: "Alto Paraíso",
      destino: "TESTE PIX — Mirante da Janela",
      cartSlug: "teste-pix-producao",
      hora: "8:00",
      valor: 1,
      confirmada: true,
      pessoasInscritas: 0,
      grupoMaximo: 10,
      vagasRestantes: 10,
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      valorIngresso: 0,
    },
  ],
  en: [
    {
      dayNum: "9",
      monthName: "July",
      weekday: "Thursday",
      dateISO: "2026-07-09",
      embarque: "Alto Paraíso",
      destino: "Mirante da Janela",
      cartSlug: "mirante-da-janela-p-r-do-sol",
      hora: "14:30",
      valor: 160,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      guiaNome: "Gyovanna Torres",
      guiaFoto: "/assets/img/imagens/guia-gyovanna-torres.png",
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      valorIngresso: 50,
    },
    {
      dayNum: "18",
      monthName: "July",
      weekday: "Saturday",
      dateISO: "2026-07-18",
      embarque: "Alto Paraíso",
      destino: "Mirante da Janela + Vale da Lua",
      hora: "7:30",
      valor: 140,
      confirmada: true,
      pessoasInscritas: 4,
      grupoMaximo: 10,
      vagasRestantes: 6,
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
    },
    {
      dayNum: "19",
      monthName: "July",
      weekday: "Sunday",
      dateISO: "2026-07-19",
      embarque: "Alto Paraíso",
      destino: "Cataratas dos Couros",
      hora: "8:30",
      valor: 120,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
      atrativoPath: "atrativos/cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
    },
    {
      dayNum: "20",
      monthName: "July",
      weekday: "Monday",
      dateISO: "2026-07-20",
      embarque: "Alto Paraíso",
      destino: "Bocaina de Farias",
      hora: "8:00",
      valor: 140,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/bocaina-farias-guia-chapada-veadeiros.webp",
      guiaNome: "Martina Motlová",
      guiaFoto: "/assets/img/imagens/guia-martina-motlova.webp",
    },
    {
      dayNum: "21",
      monthName: "July",
      weekday: "Tuesday",
      dateISO: "2026-07-21",
      embarque: "Alto Paraíso",
      destino: "Macacão",
      hora: "8:00",
      valor: 160,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 8,
      vagasRestantes: 6,
      cardImg: "/assets/img/imagens/cachoeira-macaco-chapada-veadeiros-macacao-4.jpg",
      atrativoPath: "atrativos/cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      badge4x4: true,
    },
    {
      dayNum: "22",
      monthName: "July",
      weekday: "Wednesday",
      dateISO: "2026-07-22",
      embarque: "São Jorge",
      destino: "Mirante da Janela",
      hora: "8:45",
      valor: 130,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
    },
    {
      dayNum: "5",
      monthName: "August",
      weekday: "Wednesday",
      dateISO: "2026-08-05",
      embarque: "Alto Paraíso",
      destino: "TESTE PIX — Mirante da Janela",
      cartSlug: "teste-pix-producao",
      hora: "8:00",
      valor: 1,
      confirmada: true,
      pessoasInscritas: 0,
      grupoMaximo: 10,
      vagasRestantes: 10,
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      valorIngresso: 0,
    },
  ],
  es: [
    {
      dayNum: "9",
      monthName: "julio",
      weekday: "Jueves",
      dateISO: "2026-07-09",
      embarque: "Alto Paraíso",
      destino: "Mirante da Janela",
      cartSlug: "mirante-da-janela-p-r-do-sol",
      hora: "14:30",
      valor: 160,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      guiaNome: "Gyovanna Torres",
      guiaFoto: "/assets/img/imagens/guia-gyovanna-torres.png",
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      valorIngresso: 50,
    },
    {
      dayNum: "18",
      monthName: "julio",
      weekday: "Sábado",
      dateISO: "2026-07-18",
      embarque: "Alto Paraíso",
      destino: "Mirante da Janela + Vale da Lua",
      hora: "7:30",
      valor: 140,
      confirmada: true,
      pessoasInscritas: 4,
      grupoMaximo: 10,
      vagasRestantes: 6,
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
    },
    {
      dayNum: "19",
      monthName: "julio",
      weekday: "Domingo",
      dateISO: "2026-07-19",
      embarque: "Alto Paraíso",
      destino: "Cataratas dos Couros",
      hora: "8:30",
      valor: 120,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
      atrativoPath: "atrativos/cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
    },
    {
      dayNum: "20",
      monthName: "julio",
      weekday: "Lunes",
      dateISO: "2026-07-20",
      embarque: "Alto Paraíso",
      destino: "Bocaina de Farias",
      hora: "8:00",
      valor: 140,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/bocaina-farias-guia-chapada-veadeiros.webp",
      guiaNome: "Martina Motlová",
      guiaFoto: "/assets/img/imagens/guia-martina-motlova.webp",
    },
    {
      dayNum: "21",
      monthName: "julio",
      weekday: "Martes",
      dateISO: "2026-07-21",
      embarque: "Alto Paraíso",
      destino: "Macacão",
      hora: "8:00",
      valor: 160,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 8,
      vagasRestantes: 6,
      cardImg: "/assets/img/imagens/cachoeira-macaco-chapada-veadeiros-macacao-4.jpg",
      atrativoPath: "atrativos/cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      badge4x4: true,
    },
    {
      dayNum: "22",
      monthName: "julio",
      weekday: "Miércoles",
      dateISO: "2026-07-22",
      embarque: "São Jorge",
      destino: "Mirante da Janela",
      hora: "8:45",
      valor: 130,
      confirmada: true,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
    },
    {
      dayNum: "5",
      monthName: "agosto",
      weekday: "Miércoles",
      dateISO: "2026-08-05",
      embarque: "Alto Paraíso",
      destino: "TESTE PIX — Mirante da Janela",
      cartSlug: "teste-pix-producao",
      hora: "8:00",
      valor: 1,
      confirmada: true,
      pessoasInscritas: 0,
      grupoMaximo: 10,
      vagasRestantes: 10,
      cardImg: "/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-3.jpg",
      atrativoPath: "atrativos/mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge.html",
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      valorIngresso: 0,
    },
  ],
};

/** Destinos das saídas sempre em português, em qualquer locale da página. */
export function withPortugueseDestinos(rows, ptRows = EXCURSOES_CAROUSEL_BY_LOCALE.pt) {
  if (!Array.isArray(rows) || !Array.isArray(ptRows)) return rows;
  return rows.map((row, i) => {
    const pt = ptRows[i];
    if (!pt) return row;
    const copy = { ...row };
    if (pt.destino) copy.destino = pt.destino;
    if (pt.atrativoPath) copy.atrativoPath = pt.atrativoPath;
    if (pt.destinoSub) copy.destinoSub = pt.destinoSub;
    if (pt.inclEntradas) copy.inclEntradas = pt.inclEntradas;
    if (pt.inclLanterna) copy.inclLanterna = pt.inclLanterna;
    if (pt.exclAlmoco === false) copy.exclAlmoco = false;
    if (pt.valorIngresso != null) copy.valorIngresso = pt.valorIngresso;
    if (Array.isArray(pt.destinos) && pt.destinos.length) copy.destinos = pt.destinos;
    return copy;
  });
}

function horaExcursaoSort(e) {
  return String((e && e.hora) || "").trim();
}

function excursaoDepartureEpochMsSort(e) {
  var iso = String((e && e.dateISO) || "").slice(0, 10);
  var match = horaExcursaoSort(e).match(/^(\d{1,2}):(\d{2})$/);
  if (!iso || !match) return Number.POSITIVE_INFINITY;
  return Date.parse(
    iso +
      "T" +
      String(parseInt(match[1], 10)).padStart(2, "0") +
      ":" +
      match[2] +
      ":00-03:00",
  );
}

/** Ordem cronológica: data + hora (mais cedo primeiro). */
export function sortExcursaoByDeparture(list) {
  return (list || []).slice().sort(function (a, b) {
    return excursaoDepartureEpochMsSort(a) - excursaoDepartureEpochMsSort(b);
  });
}

/** Payload do carrossel com destinos PT em en/es (para HTML e SSR). */
export function excursaoPayloadForSite(nowMs = Date.now()) {
  const pt = sortExcursaoByDeparture(filterFutureExcursoes(EXCURSOES_CAROUSEL_BY_LOCALE.pt, nowMs));
  /** @type {Record<string, typeof pt>} */
  const out = { pt };
  for (const loc of Object.keys(EXCURSOES_CAROUSEL_BY_LOCALE)) {
    if (loc === "pt") continue;
    const localized = withPortugueseDestinos(EXCURSOES_CAROUSEL_BY_LOCALE[loc], EXCURSOES_CAROUSEL_BY_LOCALE.pt);
    out[loc] = sortExcursaoByDeparture(filterFutureExcursoes(localized, nowMs));
  }
  return out;
}

/** Linhas de excursão de um locale com destino em português, só saídas futuras. */
export function excursaoRowsForLocale(locale, nowMs = Date.now()) {
  const pt = EXCURSOES_CAROUSEL_BY_LOCALE.pt;
  const rows = EXCURSOES_CAROUSEL_BY_LOCALE[locale] || pt;
  const localized = locale === "pt" ? rows : withPortugueseDestinos(rows, pt);
  return sortExcursaoByDeparture(filterFutureExcursoes(localized, nowMs));
}

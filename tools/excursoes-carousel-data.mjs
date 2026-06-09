import { filterFutureExcursoes } from "./excursoes-future.mjs";

/**
 * Dados únicos das saídas no carrossel da home ("Próximas saídas").
 * Após mudar algo aqui: `npm run build` (o HTML recebe cópia em JSON para o JS preferir esta fonte).
 */
export const EXCURSOES_CAROUSEL_BY_LOCALE = {
  pt: [
    {
      dayNum: "4",
      monthName: "junho",
      weekday: "Quinta-feira",
      dateISO: "2026-06-04",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-05",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-06",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-07",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-04",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-05",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-06",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-07",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-04",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-05",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-06",
      embarque: "Alto Paraíso",
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
      dateISO: "2026-06-07",
      embarque: "Alto Paraíso",
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

/** Destinos das saídas sempre em português, em qualquer locale da página. */
export function withPortugueseDestinos(rows, ptRows = EXCURSOES_CAROUSEL_BY_LOCALE.pt) {
  if (!Array.isArray(rows) || !Array.isArray(ptRows)) return rows;
  return rows.map((row, i) => {
    const ptDestino = ptRows[i]?.destino;
    return ptDestino ? { ...row, destino: ptDestino } : row;
  });
}

/** Payload do carrossel com destinos PT em en/es (para HTML e SSR). */
export function excursaoPayloadForSite(nowMs = Date.now()) {
  const pt = filterFutureExcursoes(EXCURSOES_CAROUSEL_BY_LOCALE.pt, nowMs);
  /** @type {Record<string, typeof pt>} */
  const out = { pt };
  for (const loc of Object.keys(EXCURSOES_CAROUSEL_BY_LOCALE)) {
    if (loc === "pt") continue;
    const localized = withPortugueseDestinos(EXCURSOES_CAROUSEL_BY_LOCALE[loc], EXCURSOES_CAROUSEL_BY_LOCALE.pt);
    out[loc] = filterFutureExcursoes(localized, nowMs);
  }
  return out;
}

/** Linhas de excursão de um locale com destino em português, só saídas futuras. */
export function excursaoRowsForLocale(locale, nowMs = Date.now()) {
  const pt = EXCURSOES_CAROUSEL_BY_LOCALE.pt;
  const rows = EXCURSOES_CAROUSEL_BY_LOCALE[locale] || pt;
  const localized = locale === "pt" ? rows : withPortugueseDestinos(rows, pt);
  return filterFutureExcursoes(localized, nowMs);
}

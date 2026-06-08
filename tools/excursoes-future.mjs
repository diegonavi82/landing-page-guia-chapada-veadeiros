/**
 * Saídas passadas (data + hora de embarque) não devem aparecer em "Próximas saídas".
 * Horário de referência: America/Sao_Paulo (UTC-3, sem horário de verão desde 2019).
 */

const CHAPADA_TZ_OFFSET = "-03:00";
const SAIDA_HORA_PADRAO = "8:45";

const MONTH_NUM = {
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
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export function horaExcursaoDeparture(e, defaultHora = SAIDA_HORA_PADRAO) {
  const h = e && e.hora;
  if (h != null && String(h).trim() !== "") return String(h).trim();
  return defaultHora;
}

export function excursaoDateIsoFromRow(e) {
  if (e && e.dateISO) return String(e.dateISO).slice(0, 10);
  const day = parseInt(String(e && e.dayNum), 10);
  const m = MONTH_NUM[String((e && e.monthName) || "").toLowerCase()];
  if (!Number.isFinite(day) || !m) return "";
  return `2026-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Epoch ms do embarque (dateISO + hora) em horário da Chapada. */
export function excursaoDepartureEpochMs(e) {
  const iso = excursaoDateIsoFromRow(e);
  const hora = horaExcursaoDeparture(e);
  const match = String(hora).match(/^(\d{1,2}):(\d{2})$/);
  if (!iso || !match) return NaN;
  const hh = String(match[1]).padStart(2, "0");
  const mm = match[2];
  return Date.parse(`${iso}T${hh}:${mm}:00${CHAPADA_TZ_OFFSET}`);
}

export function isExcursaoFuture(e, nowMs = Date.now()) {
  const dep = excursaoDepartureEpochMs(e);
  if (!Number.isFinite(dep)) return true;
  return dep > nowMs;
}

export function filterFutureExcursoes(rows, nowMs = Date.now()) {
  if (!Array.isArray(rows)) return rows;
  return rows.filter((e) => isExcursaoFuture(e, nowMs));
}

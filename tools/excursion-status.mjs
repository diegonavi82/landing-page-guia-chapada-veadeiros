/** Selo do card. Quórum padrão só entra quando a saída não traz o número do painel. */
export const QUORUM = 4;
export const LOW_STOCK = 3;

const COPY = {
  pt: {
    esgotada: "Esgotada",
    falta1: "⏳ Falta 1 para confirmar",
    faltam: "⏳ Faltam {x} para confirmar",
    ultima: "🔥 Última vaga",
    ultimas: "🔥 Últimas {x} vagas",
    confirmada: "✓ Confirmada · {x} vagas",
  },
  en: {
    esgotada: "Sold out",
    falta1: "⏳ 1 more to confirm",
    faltam: "⏳ {x} more to confirm",
    ultima: "🔥 Last spot",
    ultimas: "🔥 Last {x} spots",
    confirmada: "✓ Confirmed · {x} spots",
  },
  es: {
    esgotada: "Agotada",
    falta1: "⏳ Falta 1 para confirmar",
    faltam: "⏳ Faltan {x} para confirmar",
    ultima: "🔥 Última plaza",
    ultimas: "🔥 Últimas {x} plazas",
    confirmada: "✓ Confirmada · {x} plazas",
  },
};

function fill(template, x) {
  return template.replace("{x}", String(x));
}

/**
 * @param {number} n ocupados no grupo
 * @param {number} max vagas máximas
 * @param {string} lang pt | en | es
 * @param {{ quorum?: number, confirmada?: boolean, faltam?: number }} [opts]
 *   quorum 0 ou confirmada: o aviso de “faltam” some, mesmo com poucas inscrições.
 * @returns {{ key: string, text: string, variant: "neutral" | "warning" | "urgent" | "success" }}
 */
export function getExcursionStatus(n, max, lang, opts) {
  const enrolled = Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0;
  const capacity = Number.isFinite(Number(max)) ? Math.trunc(Number(max)) : 0;
  const code = lang === "en" || lang === "es" ? lang : "pt";
  const t = COPY[code];
  const o = opts && typeof opts === "object" ? opts : {};
  const qRaw = Number(o.quorum);
  const q = Number.isFinite(qRaw) ? Math.trunc(qRaw) : QUORUM;
  const forced = o.confirmada === true || q === 0;
  const faltaRaw = Number(o.faltam);
  const faltam = forced
    ? 0
    : Number.isFinite(faltaRaw)
      ? Math.max(0, Math.trunc(faltaRaw))
      : Math.max(0, (q > 0 ? q : QUORUM) - enrolled);

  if (capacity > 0 && enrolled >= capacity) {
    return { key: "esgotada", text: t.esgotada, variant: "neutral" };
  }
  if (faltam > 0) {
    if (faltam === 1) return { key: "faltam", text: t.falta1, variant: "warning" };
    return { key: "faltam", text: fill(t.faltam, faltam), variant: "warning" };
  }
  const restantes = Math.max(0, capacity - enrolled);
  if (restantes > 0 && restantes <= LOW_STOCK) {
    if (restantes === 1) return { key: "ultimas", text: t.ultima, variant: "urgent" };
    return { key: "ultimas", text: fill(t.ultimas, restantes), variant: "urgent" };
  }
  return { key: "confirmada", text: fill(t.confirmada, restantes), variant: "success" };
}

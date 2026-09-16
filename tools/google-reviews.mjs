/**
 * Pool de avaliações Google (5★) — fonte: tools/google-reviews.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIA_PROFILES } from "./excursoes-guides-profiles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const GOOGLE_REVIEWS_SOURCE = join(__dirname, "google-reviews.json");

const EXCLUDE_NAME_RES = [/alan\s+braz/i];

const EXTRA_GUIDE_NAMES = ["Diego Navi", "Diego", "Martina Motlová", "Martina Motlova", "Martina", "Gyovanna Torres", "Gyovanna", "Felipe Camargo", "Felipe"];

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Nomes de guias, do mais longo para o mais curto. */
export function guideDisplayNamesForRedaction() {
  const names = [...EXTRA_GUIDE_NAMES];
  for (const p of Object.values(GUIA_PROFILES || {})) {
    if (p.nomeCompleto) names.push(String(p.nomeCompleto));
    if (p.nome) names.push(String(p.nome));
    const first = String(p.nome || "")
      .trim()
      .split(/\s+/)[0];
    if (first) names.push(first);
  }
  const seen = new Set();
  return names
    .map((n) => String(n || "").trim())
    .filter((n) => {
      const k = n.toLowerCase();
      if (!n || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.length - a.length);
}

/** Troca o nome do guia por inicial + "..." (ex.: Diego → D...). */
export function redactGuideNamesInText(text) {
  let out = String(text || "");
  for (const name of guideDisplayNamesForRedaction()) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi");
    out = out.replace(re, (m) => `${m.charAt(0).toUpperCase()}...`);
  }
  return out;
}

export function loadGoogleReviewsSource() {
  if (!existsSync(GOOGLE_REVIEWS_SOURCE)) {
    return { reviews: [], displayCount: 3, excludeNames: ["Alan Braz"] };
  }
  return JSON.parse(readFileSync(GOOGLE_REVIEWS_SOURCE, "utf8"));
}

export function filterEligibleGoogleReviews(reviews, excludeNames = []) {
  const extraExclude = (excludeNames || []).map((n) => new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const allExclude = [...EXCLUDE_NAME_RES, ...extraExclude];

  return (reviews || []).filter((r) => {
    const stars = Number(r.stars ?? r.rating ?? 0);
    if (stars !== 5) return false;
    const name = String(r.name || "").trim();
    if (!name || !String(r.quote || "").trim()) return false;
    return !allExclude.some((re) => re.test(name));
  });
}

export function pickRandomReviews(reviews, count, rng = Math.random) {
  const pool = [...reviews];
  const n = Math.min(Math.max(0, count), pool.length);
  const picked = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export function writeGoogleReviewsAsset(siteRoot) {
  const raw = loadGoogleReviewsSource();
  const reviews = filterEligibleGoogleReviews(raw.reviews, raw.excludeNames).map((r) => ({
    ...r,
    quote: redactGuideNamesInText(r.quote),
  }));
  const payload = {
    updatedAt: raw.updatedAt || new Date().toISOString(),
    business: raw.business || "Guia Chapada Veadeiros",
    rating: raw.rating ?? 4.9,
    totalOnGoogle: raw.totalOnGoogle ?? reviews.length,
    displayCount: raw.displayCount ?? 3,
    excludeNames: raw.excludeNames || ["Alan Braz"],
    reviews,
  };
  const out = join(siteRoot, "assets", "data", "google-reviews.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { out, count: reviews.length, payload };
}

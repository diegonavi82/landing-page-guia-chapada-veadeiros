/**
 * Pool de avaliações Google (5★) — fonte: tools/google-reviews.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const GOOGLE_REVIEWS_SOURCE = join(__dirname, "google-reviews.json");

const EXCLUDE_NAME_RES = [/alan\s+braz/i];

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
  const reviews = filterEligibleGoogleReviews(raw.reviews, raw.excludeNames);
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

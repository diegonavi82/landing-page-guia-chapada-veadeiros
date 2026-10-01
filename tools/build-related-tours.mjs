/**
 * Monta a duração e os passeios relacionados locais.
 * Só entra combinação em que cada atrativo tem página em atrativos/.
 * A base é o catálogo que o guia usa para publicar excursão.
 *
 *   node tools/build-related-tours.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlDir = join(root, "atrativos");

const MINUTES = {
  loquinhas: 120,
  almecegas: 240,
  "vale da lua": 150,
  segredo: 240,
  cordovil: 300,
  cristais: 150,
  "cataratas dos couros": 300,
  caracol: 180,
  "anjos e arcanjos": 180,
  "santa barbara": 240,
  "poco encantado": 120,
  "ponte de pedra": 180,
  macaquinhos: 300,
  label: 180,
  macacao: 240,
  "mirante da janela": 240,
  "parque nacional saltos do rio preto": 360,
  "parque nacional canions e cariocas": 300,
  "complexo rio da prata": 360,
};

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loadAttractions() {
  const files = [
    "api/data/attractions-seed.json",
    "api/data/attractions-catalog-extra.json",
  ];
  const byTitle = new Map();
  for (const rel of files) {
    const data = JSON.parse(readFileSync(join(root, rel), "utf8"));
    for (const row of data.attractions || []) {
      const title = String(row.title_pt || "").trim();
      const slug = String(row.slug || "").trim();
      if (!title || !slug || title.includes("+")) continue;
      byTitle.set(fold(title), { title, slug });
    }
  }
  return byTitle;
}

const pages = new Set(
  readdirSync(htmlDir)
    .filter((name) => name.endsWith(".html"))
    .map((name) => name.slice(0, -5))
);

const byTitle = loadAttractions();
const catalog = JSON.parse(
  readFileSync(join(root, "api/data/attractions-catalog-extra.json"), "utf8")
);

const durations = [];
const seenSlug = new Set();
for (const item of byTitle.values()) {
  if (!pages.has(item.slug) || seenSlug.has(item.slug)) continue;
  seenSlug.add(item.slug);
  const key = fold(item.title);
  durations.push({
    slug: item.slug,
    title: item.title,
    minutes: MINUTES[key] || 180,
    page: `atrativos/${item.slug}.html`,
  });
}
durations.sort((a, b) => a.title.localeCompare(b.title, "pt"));

const related = [];
const skipped = [];
for (const row of catalog.attractions || []) {
  const title = String(row.title_pt || "");
  if (!title.includes("+")) continue;
  const parts = title.split(/\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) {
    skipped.push({ source: title, reason: "a linha precisa ter 2 ou 3 atrativos" });
    continue;
  }
  const resolved = [];
  const missing = [];
  for (const part of parts) {
    const hit = byTitle.get(fold(part));
    if (!hit || !pages.has(hit.slug)) missing.push(part);
    else resolved.push(hit);
  }
  if (missing.length || new Set(resolved.map((r) => r.slug)).size !== resolved.length) {
    skipped.push({
      source: title,
      reason: missing.length
        ? `sem página: ${missing.join(", ")}`
        : "atrativo repetido",
    });
    continue;
  }
  const minutes = resolved.reduce((sum, item) => {
    const found = durations.find((d) => d.slug === item.slug);
    return sum + (found ? found.minutes : 180);
  }, 0);
  related.push({
    source: title,
    minutes,
    attractions: resolved.map((item) => ({
      title: item.title,
      slug: item.slug,
      page: `atrativos/${item.slug}.html`,
    })),
  });
}

const out = { durations, related, skipped };
writeFileSync(
  join(root, "api/data/related-tours-seed.json"),
  JSON.stringify(out, null, 2) + "\n",
  "utf8"
);

console.log(`Durações: ${durations.length}`);
console.log(`Relacionados: ${related.length}`);
for (const row of related) {
  console.log(`  OK ${row.source} · ${row.minutes} min`);
}
console.log(`Ignorados: ${skipped.length}`);
for (const row of skipped) {
  console.log(`  -- ${row.source} · ${row.reason}`);
}

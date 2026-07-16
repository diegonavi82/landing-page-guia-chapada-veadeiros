/**
 * Regenera api/data/attractions-seed.json a partir de cms-generated + galleries.
 * Uso: node tools/export-attractions-seed.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cms = JSON.parse(readFileSync(join(root, "tools/cms-generated.json"), "utf8"));
const gals = JSON.parse(readFileSync(join(root, "tools/attraction-galleries.json"), "utf8"));
const pages = cms?.locales?.pt?.attractionPages || [];

const attractions = pages.map((p) => {
  const slug = p.baseSlug || p.slug || "";
  let cover = p.featuredImage || "";
  if (cover && !cover.startsWith("http") && !cover.startsWith("/")) cover = `/${cover}`;
  cover = String(cover).replace("/wp-content/uploads/", "/assets/img/imagens/");
  const gal = (gals[slug] || [])
    .map((item, i) => {
      const url = typeof item === "string" ? item : item?.src || "";
      let u = url;
      if (u && !u.startsWith("http") && !u.startsWith("/")) u = `/${u}`;
      return { url: u, alt: item?.alt || null, sort_order: i };
    })
    .filter((x) => x.url);
  return {
    slug,
    status: "published",
    title_pt: p.title || slug,
    excerpt_pt: p.excerpt || "",
    content_pt: p.content || "",
    cover_url: cover || null,
    seo_title_pt: p.seoTitle || p.title || slug,
    seo_desc_pt: p.seoDescription || "",
    gallery: gal,
  };
});

const outDir = join(root, "api/data");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "attractions-seed.json");
writeFileSync(outFile, JSON.stringify({ attractions }, null, 2));
console.log(`Wrote ${attractions.length} attractions → ${outFile}`);

/**
 * Miniaturas da vitrine de passeios (720px, WebP).
 * Origem: capa (og:image e foto principal) das páginas de atrativos.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "assets", "img", "card");
mkdirSync(outDir, { recursive: true });

const srcs = new Set();
for (const relDir of ["atrativos", join("en", "atrativos"), join("es", "atrativos")]) {
  const dir = join(root, relDir);
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    continue;
  }
  for (const name of names) {
    if (!name.endsWith(".html")) continue;
    const html = readFileSync(join(dir, name), "utf8");
    for (const line of html.split(/\r?\n/)) {
      if (!/og:image|gcv-detail-main-image/.test(line)) continue;
      const match = line.match(/assets\/img\/imagens\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)/i);
      if (match) srcs.add(match[0].replace(/\\/g, "/"));
    }
  }
}

let made = 0;
for (const rel of srcs) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    console.warn("sem arquivo:", rel);
    continue;
  }
  const stem = basename(abs).replace(/\.(jpe?g|png|webp)$/i, "");
  const dest = join(outDir, stem + ".webp");
  await sharp(abs)
    .rotate()
    .resize({ width: 640, height: 480, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 52, effort: 5 })
    .toFile(dest);
  const kb = Math.round(statSync(dest).size / 1024);
  console.log(String(kb).padStart(4, " ") + " KB  " + stem + ".webp");
  made += 1;
}
console.log("miniaturas:", made);

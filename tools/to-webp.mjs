/**
 * Gera .webp ao lado de JPG/PNG/JPEG em assets/img (preserva originais como fallback <picture>).
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "assets", "img");

const EXT = new Set([".jpg", ".jpeg", ".png"]);

async function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

let count = 0;
for (const abs of await walk(root)) {
  const ext = extname(abs).toLowerCase();
  if (!EXT.has(ext)) continue;
  if (!existsSync(abs)) continue;
  const webpPath = abs.slice(0, -ext.length) + ".webp";
  let st;
  try {
    st = statSync(abs);
  } catch {
    continue;
  }
  if (existsSync(webpPath)) {
    try {
      const wst = statSync(webpPath);
      if (wst.mtimeMs >= st.mtimeMs) continue;
    } catch {
      /* */
    }
  }
  try {
    await sharp(abs).webp({ quality: 82, effort: 4 }).toFile(webpPath);
    count++;
  } catch (e) {
    console.warn("WebP ignorado:", abs.slice(-80), "-", e.message);
  }
  if (count % 40 === 0) console.log("…", count, "webp");
}
console.log("WebP gerados ou atualizados:", count);

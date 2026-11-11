/**
 * Gera WebP no tamanho em que a home realmente mostra a foto.
 * O HTML aponta para assets/img/...w480.webp; o arquivo só é recriado se a origem mudou.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const SKIP = new Set(["node_modules", ".git", "Build_prod"]);
const SOURCE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

function walkHtmlAndJs(dir, wanted) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP.has(ent.name)) continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkHtmlAndJs(abs, wanted);
      continue;
    }
    if (!ent.name.endsWith(".html") && !ent.name.endsWith(".js")) continue;
    const text = readFileSync(abs, "utf8");
    const re = /assets\/img\/([^"'\\\s]+?)\.w(\d+)\.webp/g;
    let match;
    while ((match = re.exec(text))) {
      wanted.set(`assets/img/${match[1]}.w${match[2]}.webp`, Number(match[2]));
    }
  }
}

function addInstagram(root, wanted) {
  const dir = join(root, "assets", "img", "instagram");
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(name) || /\.w\d+\.webp$/i.test(name)) continue;
    const base = name.replace(/\.(jpe?g|png|webp)$/i, "");
    wanted.set(`assets/img/instagram/${base}.w480.webp`, 480);
  }
}

function findSource(root, relWebp) {
  const base = relWebp.replace(/\.w\d+\.webp$/i, "");
  for (const ext of SOURCE_EXT) {
    const abs = join(root, base + ext);
    if (existsSync(abs)) return abs;
  }
  return null;
}

async function writeOne(root, rel, width) {
  const dest = join(root, rel);
  const src = findSource(root, rel);
  if (!src) {
    console.warn("[img] sem origem:", rel);
    return "miss";
  }
  if (existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs) return "skip";
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(dest);
  return "write";
}

export async function generateResponsiveVariants(root) {
  const wanted = new Map();
  walkHtmlAndJs(root, wanted);
  addInstagram(root, wanted);
  const jobs = [...wanted.entries()];
  let wrote = 0;
  let skipped = 0;
  let missed = 0;
  const queue = jobs.slice();
  async function worker() {
    while (queue.length) {
      const [rel, width] = queue.shift();
      const result = await writeOne(root, rel, width);
      if (result === "write") wrote++;
      else if (result === "skip") skipped++;
      else missed++;
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  console.log(`[img] variantes: ${wrote} novas, ${skipped} em dia, ${missed} sem origem, ${jobs.length} no total`);
}

if (process.argv[1] && process.argv[1].endsWith("responsive-variants.mjs")) {
  const root = join(dirname(process.argv[1]), "..");
  await generateResponsiveVariants(root);
}

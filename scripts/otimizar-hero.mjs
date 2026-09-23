/**
 * Gera as versões públicas do slider a partir dos masters em assets-originais/hero/.
 * desktop: 2160x1240 (2x, máx. 350 KB) e 1080x620 (1x)
 * mobile:  1080x1200 (2x, máx. 250 KB) e 540x600 (1x)
 * webp a partir de 84 (mín. 76 no 2x) · avif 58 · sRGB · sem EXIF
 *
 * Se a proporção do master não bater com o destino, para sem recortar.
 * Uso: node scripts/otimizar-hero.mjs
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets-originais", "hero");
const OUT = join(ROOT, "assets", "img", "hero");

const BASES = [
  "passeio-exclusivo-cachoeira-chapada-dos-veadeiros",
  "passeio-compartilhado-cachoeira-chapada-dos-veadeiros",
  "reserva-online-passeios-chapada-dos-veadeiros",
];

const TARGETS = {
  desktop: {
    position: "right",
    max2x: 350 * 1024,
    sizes: [
      { suffix: "-desktop", w: 2160, h: 1240, cap: true },
      { suffix: "-desktop-1x", w: 1080, h: 620, cap: false },
    ],
  },
  mobile: {
    position: "top",
    max2x: 250 * 1024,
    sizes: [
      { suffix: "-mobile", w: 1080, h: 1200, cap: true },
      { suffix: "-mobile-1x", w: 540, h: 600, cap: false },
    ],
  },
};

function ratiosMatch(w, h, tw, th) {
  return Math.abs(w / h - tw / th) < 0.012;
}

function kb(n) {
  return `${(n / 1024).toFixed(0)} KB`;
}

async function encodePair(input, destBase, w, h, position, cap, maxBytes) {
  const base = sharp(input)
    .rotate()
    .resize(w, h, { fit: "cover", position, withoutEnlargement: false })
    .toColorspace("srgb");
  const pixels = await base.toBuffer();

  let webpQ = 84;
  let webp = await sharp(pixels).webp({ quality: webpQ, effort: 5 }).toBuffer();
  if (cap) {
    while (webp.length > maxBytes && webpQ > 76) {
      webpQ -= 2;
      webp = await sharp(pixels).webp({ quality: webpQ, effort: 5 }).toBuffer();
    }
  }

  let avifQ = 58;
  let avif = await sharp(pixels).avif({ quality: avifQ, effort: 4 }).toBuffer();
  if (cap) {
    while (avif.length > maxBytes && avifQ > 40) {
      avifQ -= 3;
      avif = await sharp(pixels).avif({ quality: avifQ, effort: 4 }).toBuffer();
    }
  }

  writeFileSync(`${destBase}.webp`, webp);
  writeFileSync(`${destBase}.avif`, avif);
  const webpBytes = statSync(`${destBase}.webp`).size;
  const avifBytes = statSync(`${destBase}.avif`).size;
  return { webpQ, avifQ, webpBytes, avifBytes };
}

mkdirSync(OUT, { recursive: true });

let blocked = false;
for (const base of BASES) {
  for (const kind of ["desktop", "mobile"]) {
    const src = join(SRC, `${base}-${kind}.webp`);
    const meta = await sharp(src).metadata();
    const spec = TARGETS[kind];
    const master = spec.sizes[0];
    if (!ratiosMatch(meta.width, meta.height, master.w, master.h)) {
      blocked = true;
      console.warn(
        `[hero] PROPORÇÃO DIFERENTE — não recortei ${base}-${kind}: origem ${meta.width}x${meta.height}, alvo ${master.w}x${master.h}`,
      );
      continue;
    }
    for (const target of spec.sizes) {
      const dest = join(OUT, `${base}${target.suffix}`);
      const info = await encodePair(src, dest, target.w, target.h, spec.position, target.cap, spec.max2x);
      const over = target.cap && (info.webpBytes > spec.max2x || info.avifBytes > spec.max2x);
      console.log(
        `[hero] ${base}${target.suffix} ${target.w}x${target.h} webp q${info.webpQ} ${kb(info.webpBytes)} · avif q${info.avifQ} ${kb(info.avifBytes)}${over ? " ACIMA DO LIMITE" : ""}`,
      );
      if (over) blocked = true;
    }
  }
}

if (blocked) {
  console.warn("[hero] Alguma imagem não coube no limite ou a proporção não bate. Nada foi recortado fora da proporção.");
  process.exitCode = 1;
} else {
  console.log("[hero] ok");
}

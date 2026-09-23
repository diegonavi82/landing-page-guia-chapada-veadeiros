/**
 * Gera só as variações que faltam das fotos novas dos slides 1 e 2.
 * O .webp 2x entregue é copiado sem reencode. Não mexe no slide 3
 * nem nas fotos que já estão no ar.
 *
 * desktop: 2160x1240 → 1x 1080x620 + avif
 * mobile:  1080x1200 → 1x 540x600 + avif
 * Se a proporção não bater, para sem recortar.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "_tmp_revezamento_hero");
const OUT = join(ROOT, "assets", "img", "hero");

const EXPECT = {
  desktop: { w: 2160, h: 1240, one: { w: 1080, h: 620 } },
  mobile: { w: 1080, h: 1200, one: { w: 540, h: 600 } },
};

function kindOf(name) {
  if (name.endsWith("-desktop.webp")) return "desktop";
  if (name.endsWith("-mobile.webp")) return "mobile";
  return "";
}

function kb(n) {
  return `${(n / 1024).toFixed(0)} KB`;
}

async function smallerAvif(input, maxBytes) {
  let q = 58;
  let buf = await sharp(input).avif({ quality: q, effort: 4 }).toBuffer();
  while (buf.length > maxBytes && q > 40) {
    q -= 3;
    buf = await sharp(input).avif({ quality: q, effort: 4 }).toBuffer();
  }
  return { buf, q };
}

const files = readdirSync(SRC).filter((n) => n.endsWith(".webp"));
const checked = [];
for (const name of files) {
  const kind = kindOf(name);
  if (!kind) {
    console.error(`nome inesperado: ${name}`);
    process.exit(1);
  }
  const meta = await sharp(join(SRC, name)).metadata();
  const exp = EXPECT[kind];
  if (meta.width !== exp.w || meta.height !== exp.h) {
    console.error(
      `proporção diferente — sem recorte: ${name} é ${meta.width}x${meta.height}, esperado ${exp.w}x${exp.h}`,
    );
    process.exit(1);
  }
  checked.push({ name, kind, exp });
}

mkdirSync(OUT, { recursive: true });
for (const { name, kind, exp } of checked) {
  const srcPath = join(SRC, name);
  const dest2x = join(OUT, name);
  copyFileSync(srcPath, dest2x);
  const webp2x = statSync(dest2x).size;

  const avif2 = await smallerAvif(srcPath, webp2x);
  const avif2Name = name.replace(/\.webp$/, ".avif");
  writeFileSync(join(OUT, avif2Name), avif2.buf);

  const oneWebp = await sharp(srcPath)
    .resize(exp.one.w, exp.one.h, { fit: "fill" })
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
  const oneName = name.replace(/-(desktop|mobile)\.webp$/, "-$1-1x.webp");
  writeFileSync(join(OUT, oneName), oneWebp);
  const oneMeta = await sharp(oneWebp).metadata();
  if (oneMeta.width !== exp.one.w || oneMeta.height !== exp.one.h) {
    console.error(`1x saiu com tamanho errado: ${oneName}`);
    process.exit(1);
  }

  const avif1 = await smallerAvif(oneWebp, oneWebp.length);
  writeFileSync(join(OUT, oneName.replace(/\.webp$/, ".avif")), avif1.buf);

  console.log(
    `${name} webp ${kb(webp2x)} | avif ${kb(avif2.buf.length)} q${avif2.q} | 1x webp ${kb(oneWebp.length)} avif ${kb(avif1.buf.length)} q${avif1.q}`,
  );
}
console.log(`ok ${checked.length} arquivos em assets/img/hero/`);

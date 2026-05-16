/**
 * OTIMIZA IMAGENS PARA REVISTA (WEBP + JPEG DE FALLBACK)
 *
 * Coloque JPG/PNG em: assets/img/uploads/_inbox-revista/
 * Depois rode (PowerShell ou CMD, na raiz do site):
 *
 *   node tools/optimize-revista-upload.mjs onca-arvore-hero.png nome-base-sem-extensao uploads/revista/minha-subpasta/
 *
 * Gera dentro da subpasta:
 *   <nome-base>.webp
 *   <nome-base>.jpg
 *
 * Opcional: último argumento número = largura máxima px (default 1920).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const [, , rawName, basename, relDestDir, maybeMax] = process.argv;

if (!rawName || !basename || !relDestDir) {
  console.error(
    'Uso: node tools/optimize-revista-upload.mjs <ficheiro-em-_inbox-revista> <nome-base> <pasta-rel-assets-uploads> [maxWidth]',
  );
  process.exit(1);
}

const maxW = Number(maybeMax) || 1920;

const inbox = path.resolve('assets/img/uploads/_inbox-revista', rawName);
const outDir = path.resolve('assets/img/uploads', relDestDir);
const webpPath = path.join(outDir, `${basename}.webp`);
const jpgPath = path.join(outDir, `${basename}.jpg`);

if (!fs.existsSync(inbox)) {
  console.error('Ficheiro inbox não encontrado:', inbox);
  process.exit(1);
}
await fs.promises.mkdir(outDir, { recursive: true });

const pipe = sharp(inbox).rotate().resize({
  width: maxW,
  height: maxW,
  fit: 'inside',
  withoutEnlargement: true,
});

await pipe.clone().webp({ quality: 86, effort: 6 }).toFile(webpPath);
await pipe.clone().jpeg({ quality: 87, mozjpeg: true }).toFile(jpgPath);

const m = await sharp(webpPath).metadata();
console.log(
  JSON.stringify({
    basename,
    outDir: path.relative(process.cwd(), outDir),
    width: m.width,
    height: m.height,
    webpBytes: fs.statSync(webpPath).size,
    jpegBytes: fs.statSync(jpgPath).size,
  }),
);

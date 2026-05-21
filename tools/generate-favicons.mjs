/**
 * Gera favicons em PNG (48/96/192) e favicon.ico na raiz do site.
 * Corrige JPEG salvo como .png — requisito para Google Search exibir o ícone.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "assets", "img", "imagens", "favicon.png");
const OUT_DIR = join(ROOT, "assets", "img", "imagens");
const SIZES = [48, 96, 192];

/** ICO com PNG embutido (Windows Vista+), aceito pelo Google e navegadores. */
function pngBufferToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error("[favicons] Arquivo não encontrado:", SOURCE);
    process.exit(1);
  }

  const meta = await sharp(SOURCE).metadata();
  console.log("[favicons] Origem:", meta.width, "x", meta.height, `(${meta.format})`);

  const sourceBuffer = readFileSync(SOURCE);

  for (const size of SIZES) {
    const out = join(OUT_DIR, `favicon-${size}x${size}.png`);
    await sharp(sourceBuffer)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log("[favicons] Gerado:", `favicon-${size}x${size}.png`);
  }

  // PNG principal corrigido (formato real, 192px — tamanho declarado no HTML)
  const mainPng = join(OUT_DIR, "favicon.png");
  await sharp(sourceBuffer)
    .resize(192, 192, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(mainPng);
  console.log("[favicons] Atualizado: favicon.png (192x192 PNG real)");

  const icoPng = await sharp(sourceBuffer)
    .resize(48, 48, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(ROOT, "favicon.ico"), pngBufferToIco(icoPng, 48));
  console.log("[favicons] Gerado: favicon.ico (48x48 na raiz)");
}

main().catch((err) => {
  console.error("[favicons]", err);
  process.exit(1);
});

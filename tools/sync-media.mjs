/**
 * Copia imagens públicas do monorepo (somente desenvolvimento / atualização de assets).
 * Não chama API nem banco de dados.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const destImg = join(projectRoot, "assets", "img");

const homedir = process.env.USERPROFILE || process.env.HOME || "";
const candidates = [
  process.env.GCV_MEDIA_SOURCE,
  join(homedir, "Desktop", "guia chapada veadeiros 2026", "frontend", "cliente", "public"),
  "D:\\Users\\Diego\\Desktop\\guia chapada veadeiros 2026\\frontend\\cliente\\public",
  join(homedir, "Desktop", "GUIA CHAPADA VEADEIROS 2026", "frontend", "cliente", "public"),
].filter(Boolean);

let sourceRoot = candidates.find((p) => existsSync(p));

if (!sourceRoot) {
  console.error("Nenhuma pasta fonte encontrada. Tentativas:", candidates);
  console.error("Defina GCV_MEDIA_SOURCE=...\\frontend\\cliente\\public do monorepo.");
  process.exit(1);
}

mkdirSync(destImg, { recursive: true });

for (const dir of ["imagens", "uploads"]) {
  const src = join(sourceRoot, dir);
  const dst = join(destImg, dir);
  if (existsSync(src)) {
    cpSync(src, dst, { recursive: true });
    console.log("OK copiado:", dir);
  } else {
    console.warn("Aviso: pasta ausente:", src);
  }
}

console.log("Mídia sincronizada em:", destImg);

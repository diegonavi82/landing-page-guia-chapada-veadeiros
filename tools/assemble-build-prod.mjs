/**
 * Monta Build_prod/ com o site completo pronto para upload FTP.
 * Chamado ao final de `npm run build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const BUILD_PROD_DIR = join(ROOT, "Build_prod");

/** Entradas na raiz do site publicadas no servidor (espelho do FTP). */
export const DEPLOY_ROOT_ENTRIES = [
  "index.html",
  "contato.html",
  "revista.html",
  "atrativos.html",
  "favicon.ico",
  "sitemap.xml",
  "sitemap-all.xml",
  "sitemap-pages.xml",
  "sitemap-atrativos.xml",
  "sitemap-revista.xml",
  "sitemap-guia.xml",
  "robots.txt",
  "feed.xml",
  "assets",
  "atrativos",
  "revista",
  "guia",
  "en",
  "es",
  "api",
];

export function assembleBuildProd(siteRoot = ROOT, outDir = BUILD_PROD_DIR) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  let copied = 0;
  for (const entry of DEPLOY_ROOT_ENTRIES) {
    const src = join(siteRoot, entry);
    if (!existsSync(src)) continue;
    cpSync(src, join(outDir, entry), { recursive: true });
    copied += 1;
  }

  return { outDir, copied };
}

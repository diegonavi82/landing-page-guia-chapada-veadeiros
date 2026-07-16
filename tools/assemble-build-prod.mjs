/**
 * Monta Build_prod/ com o site completo pronto para upload FTP.
 * Chamado ao final de `npm run build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const BUILD_PROD_DIR = join(ROOT, "Build_prod");

/** Nunca copiar para o pacote FTP (ficam só no servidor). */
const SKIP_BASENAMES = new Set([
  ".env",
  ".env.local",
  "config.local.php",
  ".git",
  "node_modules",
]);

/** Entradas na raiz do site publicadas no servidor (espelho do FTP). */
export const DEPLOY_ROOT_ENTRIES = [
  "index.html",
  "contato.html",
  "consultar-reserva.html",
  "confirmacao.html",
  "revista.html",
  "atrativos.html",
  "excursoes.html",
  "login.html",
  "cadastro.html",
  "esqueci-senha.html",
  "resetar-senha.html",
  "favicon.ico",
  "sitemap.xml",
  "sitemap-all.xml",
  "sitemap-pages.xml",
  "sitemap-atrativos.xml",
  "sitemap-revista.xml",
  "sitemap-guia.xml",
  "robots.txt",
  ".htaccess",
  "feed.xml",
  "assets",
  "atrativos",
  "revista",
  "guia",
  "dashboard",
  "admin",
  "en",
  "es",
  "api",
];

function deployCopyFilter(src) {
  const name = basename(src);
  if (SKIP_BASENAMES.has(name)) return false;
  if (name.startsWith(".env")) return false;
  // Arquivos vazios (.gitkeep) quebram FTPS na Hostinger (FTP 425)
  if (name === ".gitkeep") return false;
  return true;
}

export function assembleBuildProd(siteRoot = ROOT, outDir = BUILD_PROD_DIR) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  let copied = 0;
  for (const entry of DEPLOY_ROOT_ENTRIES) {
    const src = join(siteRoot, entry);
    if (!existsSync(src)) continue;
    cpSync(src, join(outDir, entry), { recursive: true, filter: deployCopyFilter });
    copied += 1;
  }

  return { outDir, copied };
}

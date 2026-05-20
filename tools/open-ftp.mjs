/**
 * Valida Build_prod/ e abre a pasta no explorador de arquivos (FTP manual).
 * Uso: npm run ftp
 *      npm run ftp -- --build   (gera Build_prod antes de abrir)
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD_PROD_DIR, DEPLOY_ROOT_ENTRIES } from "./assemble-build-prod.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function countFiles(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) total += countFiles(abs);
    else total += 1;
  }
  return total;
}

function missingEntries(outDir) {
  return DEPLOY_ROOT_ENTRIES.filter((entry) => !existsSync(join(outDir, entry)));
}

function openFolder(dir) {
  const platform = process.platform;
  if (platform === "win32") {
    spawnSync("explorer", [dir], { stdio: "ignore", shell: true });
    return;
  }
  if (platform === "darwin") {
    spawnSync("open", [dir], { stdio: "ignore" });
    return;
  }
  spawnSync("xdg-open", [dir], { stdio: "ignore" });
}

function runBuild() {
  console.log("[ftp] Gerando Build_prod (npm run build)…");
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(typeof r.status === "number" ? r.status : 1);
}

const wantsBuild = process.argv.includes("--build");

if (wantsBuild || !existsSync(BUILD_PROD_DIR)) {
  if (!existsSync(BUILD_PROD_DIR)) {
    console.log("[ftp] Build_prod não encontrado — rodando build…");
  }
  runBuild();
}

const missing = missingEntries(BUILD_PROD_DIR);
if (missing.length > 0) {
  console.error("[ftp] Build_prod incompleto. Faltando:", missing.join(", "));
  console.error("[ftp] Rode: npm run build");
  process.exit(1);
}

const files = countFiles(BUILD_PROD_DIR);
console.log("[ftp] OK:", BUILD_PROD_DIR);
console.log("[ftp]", files, "arquivos — envie o conteúdo desta pasta para a raiz do FTP.");

openFolder(BUILD_PROD_DIR);

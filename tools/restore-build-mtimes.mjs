/**
 * Devolve a data do último commit aos arquivos de Build_prod que o build não alterou.
 * O lftp com --only-newer então envia só o que mudou de verdade.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, utimesSync } from "node:fs";
import { join, relative } from "node:path";
import { BUILD_PROD_DIR } from "./assemble-build-prod.mjs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function gitMtimes() {
  const raw = execSync("git log --pretty=format:---%ct --name-only", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const map = new Map();
  let ct = 0;
  for (const line of raw.split(/\n/)) {
    if (line.startsWith("---")) {
      ct = parseInt(line.slice(3), 10) || 0;
      continue;
    }
    const path = line.trim().replace(/\\/g, "/");
    if (!path || !ct || map.has(path)) continue;
    map.set(path, ct);
  }
  return map;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

if (!existsSync(BUILD_PROD_DIR)) {
  console.error("[mtime] Build_prod/ não existe.");
  process.exit(1);
}

const times = gitMtimes();
let kept = 0;
let fresh = 0;
for (const file of walk(BUILD_PROD_DIR)) {
  const rel = relative(BUILD_PROD_DIR, file).replace(/\\/g, "/");
  const src = join(ROOT, rel);
  const ct = times.get(rel);
  if (!ct || !existsSync(src) || !statSync(src).isFile()) {
    fresh += 1;
    continue;
  }
  const built = readFileSync(file);
  const original = readFileSync(src);
  if (built.length !== original.length || !built.equals(original)) {
    fresh += 1;
    continue;
  }
  const when = new Date(ct * 1000);
  utimesSync(file, when, when);
  kept += 1;
}
console.log(`[mtime] sem mudança: ${kept}. Novos ou alterados pelo build: ${fresh}.`);

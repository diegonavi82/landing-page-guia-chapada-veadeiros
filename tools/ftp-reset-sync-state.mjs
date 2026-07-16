/**
 * Apaga .ftp-deploy-sync-state.json no servidor para forçar reupload completo.
 * Usa as mesmas credenciais do deploy (secrets CI ou .env.deploy).
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "basic-ftp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = { ...process.env };
  const p = join(ROOT, ".env.deploy");
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in out) || String(out[k] || "") === "") out[k] = v;
  }
  return out;
}

const env = loadEnv();
const host = (env.FTP_SERVER || "").trim();
const user = (env.FTP_USERNAME || "").trim();
const pass = (env.FTP_PASSWORD || "").trim();
const port = Number(env.FTP_PORT || 21);
const secure = String(env.FTP_SECURE || "true").toLowerCase() !== "false";
const remoteRoot = (env.FTP_REMOTE_DIR || "./").trim() || "./";

if (!host || !user || !pass) {
  console.error("[ftp-reset] Faltam FTP_SERVER / FTP_USERNAME / FTP_PASSWORD");
  process.exit(1);
}

const client = new Client(60_000);
client.ftp.verbose = false;

try {
  await client.access({ host, user, password: pass, port, secure });
  if (remoteRoot && remoteRoot !== "./" && remoteRoot !== ".") {
    await client.cd(remoteRoot);
  }
  const stateName = ".ftp-deploy-sync-state.json";
  try {
    await client.remove(stateName);
    console.log("[ftp-reset] Removido:", stateName, "— próximo deploy reenvia tudo.");
  } catch {
    console.log("[ftp-reset] Estado não existia (ok):", stateName);
  }
} catch (err) {
  console.error("[ftp-reset] Falha:", err && err.message ? err.message : err);
  process.exit(1);
} finally {
  client.close();
}

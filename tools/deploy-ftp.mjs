/**
 * Envia Build_prod/ para a Hostinger via FTPS.
 *
 * Credenciais: arquivo `.env.deploy` na raiz (não vai pro git).
 * Exemplo: copie `.env.deploy.example` → `.env.deploy`
 *
 * Uso:
 *   npm run deploy              (só upload do Build_prod já gerado)
 *   npm run build:deploy        (build + upload)
 *   GCV_DEPLOY_FTP=1 npm run build   (upload automático no fim do build)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "basic-ftp";
import { BUILD_PROD_DIR } from "./assemble-build-prod.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadDeployEnv() {
  const envPath = join(ROOT, ".env.deploy");
  const out = { ...process.env };
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function skipRemoteName(name) {
  const n = name.toLowerCase();
  return (
    n === ".env" ||
    n === "config.local.php" ||
    n === ".ftpquota" ||
    n === "error_log" ||
    n.startsWith(".env")
  );
}

async function uploadDir(client, localDir, remoteDir) {
  const entries = readdirSync(localDir);
  for (const name of entries) {
    if (skipRemoteName(name)) {
      console.log("[deploy] pulando (segredo/local):", name);
      continue;
    }
    const localPath = join(localDir, name);
    const remotePath = remoteDir.replace(/\/$/, "") + "/" + name;
    const st = statSync(localPath);
    if (st.isDirectory()) {
      await client.ensureDir(remotePath);
      await uploadDir(client, localPath, remotePath);
    } else {
      await client.uploadFrom(localPath, remotePath);
      const rel = relative(BUILD_PROD_DIR, localPath).split(sep).join("/");
      console.log("[deploy] ↑", rel);
    }
  }
}

async function main() {
  const env = loadDeployEnv();
  const host = (env.FTP_SERVER || "").trim();
  const user = (env.FTP_USERNAME || "").trim();
  const pass = (env.FTP_PASSWORD || "").trim();
  const port = Number(env.FTP_PORT || 21);
  const secure = String(env.FTP_SECURE || "true").toLowerCase() !== "false";
  // Na Hostinger o FTP costuma já abrir em public_html — use "./" ou "public_html/"
  const remoteRoot = (env.FTP_REMOTE_DIR || "./").trim() || "./";

  if (!host || !user || !pass) {
    console.error("[deploy] Faltam credenciais FTP.");
    console.error("[deploy] Crie `.env.deploy` a partir de `.env.deploy.example`");
    console.error("[deploy] Ou no GitHub: Settings → Secrets → FTP_SERVER / FTP_USERNAME / FTP_PASSWORD");
    process.exit(1);
  }

  if (!existsSync(BUILD_PROD_DIR)) {
    console.error("[deploy] Build_prod/ não existe. Rode: npm run build");
    process.exit(1);
  }

  const client = new Client(120_000);
  client.ftp.verbose = String(env.FTP_VERBOSE || "").toLowerCase() === "1";

  console.log("[deploy] Conectando", host + ":" + port, secure ? "(FTPS)" : "(FTP)");
  console.log("[deploy] Destino remoto:", remoteRoot);
  console.log("[deploy] Origem:", BUILD_PROD_DIR);

  try {
    await client.access({
      host,
      port,
      user,
      password: pass,
      secure,
      secureOptions: { rejectUnauthorized: false },
    });
    await client.ensureDir(remoteRoot);
    await client.cd(remoteRoot);
    await uploadDir(client, BUILD_PROD_DIR, ".");
    console.log("[deploy] Concluído.");
  } catch (err) {
    console.error("[deploy] Falha:", err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();

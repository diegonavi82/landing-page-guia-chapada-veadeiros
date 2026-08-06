/**
 * Envia Build_prod/ para a Hostinger via FTPS.
 *
 * Credenciais: `.env.deploy` na raiz.
 * Uso: npm run deploy | npm run build:deploy
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
    n === ".gitkeep" ||
    n.startsWith(".env")
  );
}

/** @returns {list<{local:string, remote:string}>} */
function collectFiles(localDir, remoteRel = "") {
  /** @type {list<{local:string, remote:string}>} */
  const out = [];
  for (const name of readdirSync(localDir)) {
    if (skipRemoteName(name)) continue;
    const localPath = join(localDir, name);
    const childRel = remoteRel ? `${remoteRel}/${name}` : name;
    if (statSync(localPath).isDirectory()) {
      out.push(...collectFiles(localPath, childRel));
    } else {
      out.push({ local: localPath, remote: childRel.replace(/\\/g, "/") });
    }
  }
  return out;
}

async function cdRemoteRoot(client, remoteRoot) {
  const root = (remoteRoot || "./").trim().replace(/\\/g, "/");
  if (root === "." || root === "./") return;
  let pwd = await client.pwd();
  while (pwd && pwd !== "/") {
    await client.cdup();
    pwd = await client.pwd();
  }
  for (const part of root.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)) {
    await client.cd(part);
  }
}

async function connect(env) {
  const client = new Client(180_000);
  client.ftp.verbose = String(env.FTP_VERBOSE || "").toLowerCase() === "1";
  await client.access({
    host: (env.FTP_SERVER || "").trim(),
    port: Number(env.FTP_PORT || 21),
    user: (env.FTP_USERNAME || "").trim(),
    password: (env.FTP_PASSWORD || "").trim(),
    secure: String(env.FTP_SECURE || "true").toLowerCase() !== "false",
    secureOptions: { rejectUnauthorized: false },
  });
  await cdRemoteRoot(client, (env.FTP_REMOTE_DIR || "./").trim() || "./");
  return client;
}

async function main() {
  const env = loadDeployEnv();
  const host = (env.FTP_SERVER || "").trim();
  const user = (env.FTP_USERNAME || "").trim();
  const pass = (env.FTP_PASSWORD || "").trim();
  const remoteRoot = (env.FTP_REMOTE_DIR || "./").trim() || "./";

  if (!host || !user || !pass) {
    console.error("[deploy] Faltam credenciais FTP (.env.deploy).");
    process.exit(1);
  }
  if (!existsSync(BUILD_PROD_DIR)) {
    console.error("[deploy] Build_prod/ não existe. Rode: npm run build");
    process.exit(1);
  }

  const files = collectFiles(BUILD_PROD_DIR);
  console.log("[deploy] Conectando", host, "(FTPS)");
  console.log("[deploy] Destino:", remoteRoot);
  console.log("[deploy] Arquivos:", files.length);

  let client = await connect(env);
  let basePwd = await client.pwd();
  console.log("[deploy] cwd:", basePwd);

  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    const { local, remote } = files[i];
    const dir = remote.includes("/") ? remote.slice(0, remote.lastIndexOf("/")) : "";
    const base = remote.slice(remote.lastIndexOf("/") + 1);
    let attempts = 0;
    while (true) {
      attempts++;
      try {
        await client.cd(basePwd);
        if (dir) await client.ensureDir(dir);
        await client.uploadFrom(local, base);
        ok++;
        if (ok % 25 === 0 || i === files.length - 1) {
          console.log(`[deploy] ↑ ${ok}/${files.length} — ${remote}`);
        } else {
          console.log("[deploy] ↑", remote);
        }
        break;
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (attempts >= 4) {
          console.error("[deploy] Falha definitiva em", remote, "—", msg);
          try { client.close(); } catch { /* ignore */ }
          process.exit(1);
        }
        console.warn(`[deploy] retry ${attempts}/3 em ${remote}: ${msg}`);
        try { client.close(); } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 1500 * attempts));
        client = await connect(env);
        basePwd = await client.pwd();
      }
    }
  }

  try { client.close(); } catch { /* ignore */ }
  console.log(`[deploy] Concluído. ${ok} arquivos enviados.`);
}

main().catch((e) => {
  console.error("[deploy] Falha:", e.message || e);
  process.exit(1);
});

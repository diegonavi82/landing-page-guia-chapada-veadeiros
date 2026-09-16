/**
 * Deploy Build_prod + remove lixo no public_html (FTP Hostinger).
 * Preserva .env, config.local.php, .ftpquota, error_log.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "basic-ftp";
import { BUILD_PROD_DIR, DEPLOY_ROOT_ENTRIES } from "./assemble-build-prod.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const KEEP_ROOT = new Set([
  ...DEPLOY_ROOT_ENTRIES,
  "deploy-canary.txt",
  "favicon.png",
  "cgi-bin",
  ".well-known",
  ".ftpquota",
  "error_log",
  ".env",
  "config.local.php",
  "default.php",
  "googlec0e65ffa5a3219b3.html",
]);

const KEEP_BASENAME = new Set([
  ".env",
  ".env.local",
  "config.local.php",
  ".ftpquota",
  "error_log",
]);

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

function skipUploadName(name) {
  const n = name.toLowerCase();
  return KEEP_BASENAME.has(n) || n.startsWith(".env") || n === ".gitkeep";
}

function collectFiles(localDir, remoteRel = "") {
  const out = [];
  for (const name of readdirSync(localDir)) {
    if (skipUploadName(name)) continue;
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

function isProtectedName(name) {
  const n = String(name || "").toLowerCase();
  if (n === ".env.deploy" || n === ".env.example" || n === ".env.deploy.example") {
    return false;
  }
  return (
    n === ".env" ||
    n === ".env.local" ||
    n === "config.local.php" ||
    n === ".ftpquota" ||
    n === "error_log" ||
    n === ".htaccess" ||
    /^google[a-f0-9]+\.html$/i.test(n)
  );
}

function isJunkName(name) {
  const n = String(name || "");
  const lower = n.toLowerCase();
  if (isProtectedName(n)) return false;
  if (/^_?migrate_.*_once\.php$/i.test(n)) return true;
  const junkExact = new Set([
    ".github",
    ".git",
    ".cursor",
    ".vscode",
    ".idea",
    "node_modules",
    "tools",
    "docs",
    "imagens",
    "build_prod",
    "package.json",
    "package-lock.json",
    "composer.json",
    "composer.lock",
    "readme.md",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    "license",
    "license.md",
    "agents.md",
    "todo.md",
    ".env.deploy",
    ".env.example",
    "config.example.php",
  ]);
  if (junkExact.has(lower)) return true;
  if (lower.endsWith(".map") && lower.includes("node_modules")) return true;
  return false;
}

async function listRoot(client) {
  const list = await client.list();
  return list.map((item) => ({
    name: item.name,
    type: item.isDirectory ? "dir" : "file",
    size: item.size,
  }));
}

async function removeRemote(client, name, isDir) {
  if (isDir) {
    await client.removeDir(name);
  } else {
    await client.remove(name);
  }
}

async function main() {
  const env = loadDeployEnv();
  const host = (env.FTP_SERVER || "").trim();
  const user = (env.FTP_USERNAME || "").trim();
  const pass = (env.FTP_PASSWORD || "").trim();
  const remoteRoot = (env.FTP_REMOTE_DIR || "./").trim() || "./";
  const onlyList = process.argv.includes("--list");
  const skipUpload = process.argv.includes("--clean-only");

  if (!host || !user || !pass) {
    console.error("[deploy] Faltam credenciais FTP (.env.deploy).");
    process.exit(1);
  }
  if (!skipUpload && !existsSync(BUILD_PROD_DIR)) {
    console.error("[deploy] Build_prod/ não existe. Rode: npm run build");
    process.exit(1);
  }

  console.log("[deploy] Conectando", host, "(FTPS)");
  console.log("[deploy] Destino:", remoteRoot);

  let client = await connect(env);
  let basePwd = await client.pwd();
  console.log("[deploy] cwd:", basePwd);

  const before = await listRoot(client);
  console.log("[deploy] Itens na raiz ANTES:", before.length);
  for (const item of before.sort((a, b) => a.name.localeCompare(b.name))) {
    const keep = KEEP_ROOT.has(item.name);
    const junk = !keep && (isJunkName(item.name) || !KEEP_ROOT.has(item.name));
    const tag = keep ? "KEEP" : junk ? "JUNK" : "KEEP?";
    console.log(`  [${tag}] ${item.type.padEnd(4)} ${item.name}`);
  }

  if (onlyList) {
    client.close();
    return;
  }

  const toDelete = before.filter((item) => {
    if (isProtectedName(item.name)) return false;
    if (KEEP_ROOT.has(item.name)) return false;
    return true;
  });

  console.log("[deploy] Lixo na raiz a remover:", toDelete.length);
  for (const item of toDelete) {
    const rel = item.name;
    let attempts = 0;
    while (true) {
      attempts++;
      try {
        await client.cd(basePwd);
        console.log(`[deploy] ✂ ${item.type} ${rel}`);
        await removeRemote(client, rel, item.type === "dir");
        break;
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (attempts >= 4) {
          console.error("[deploy] Falha ao apagar", rel, "—", msg);
          try {
            client.close();
          } catch {
            /* ignore */
          }
          process.exit(1);
        }
        console.warn(`[deploy] retry delete ${attempts}/3 ${rel}: ${msg}`);
        try {
          client.close();
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 1500 * attempts));
        client = await connect(env);
        basePwd = await client.pwd();
      }
    }
  }

  // One-shots / diag / examples dentro de api/ (não apaga .env nem config.local.php)
  try {
    await client.cd(basePwd);
    await client.cd("api");
    const apiList = await client.list();
    const apiJunk = apiList.filter((item) => {
      const n = item.name;
      if (isProtectedName(n)) return false;
      if (/_once\.php$/i.test(n)) return true;
      if (/^diag(_pix)?\.php$/i.test(n)) return true;
      if (n === "_fix_db_env.php") return true;
      if (n === ".env.example" || n === "config.example.php") return true;
      return false;
    });
    for (const item of apiJunk) {
      console.log("[deploy] ✂ api/" + item.name);
      if (item.isDirectory) await client.removeDir(item.name);
      else await client.remove(item.name);
    }
    await client.cd(basePwd);
  } catch (err) {
    console.warn("[deploy] api/ junk:", err.message || err);
    try {
      await client.cd(basePwd);
    } catch {
      /* ignore */
    }
  }

  if (skipUpload) {
    client.close();
    console.log("[deploy] Limpeza concluída (--clean-only).");
    return;
  }

  const files = collectFiles(BUILD_PROD_DIR);
  console.log("[deploy] Upload:", files.length, "arquivos");

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
        }
        break;
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (attempts >= 4) {
          console.error("[deploy] Falha definitiva em", remote, "—", msg);
          try {
            client.close();
          } catch {
            /* ignore */
          }
          process.exit(1);
        }
        console.warn(`[deploy] retry ${attempts}/3 em ${remote}: ${msg}`);
        try {
          client.close();
        } catch {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 1500 * attempts));
        client = await connect(env);
        basePwd = await client.pwd();
      }
    }
  }

  await client.cd(basePwd);
  const after = await listRoot(client);
  let envOk = false;
  try {
    await client.cd("api");
    const apiList = await client.list();
    envOk = apiList.some((item) => item.name === ".env" || item.name === "config.local.php");
    await client.cd(basePwd);
  } catch {
    /* ignore */
  }

  // Cópia acidental no /public_html da home FTP (login cai aqui)
  try {
    let pwd = await client.pwd();
    while (pwd && pwd !== "/") {
      await client.cdup();
      pwd = await client.pwd();
    }
    await client.cd("public_html");
    const homeList = await client.list();
    const homeJunk = homeList.filter((item) => {
      const n = item.name.toLowerCase();
      return n === "domains" || n === "public_html" || n === ".ftp-deploy-sync-state.json";
    });
    for (const item of homeJunk) {
      console.log("[deploy] ✂ /public_html/" + item.name);
      if (item.isDirectory) await client.removeDir(item.name);
      else await client.remove(item.name);
    }
  } catch (err) {
    console.warn("[deploy] home /public_html junk:", err.message || err);
  }

  try {
    client.close();
  } catch {
    /* ignore */
  }

  console.log(`[deploy] Concluído. ${ok} arquivos enviados.`);
  console.log("[deploy] Itens na raiz DEPOIS:", after.length);
  for (const item of after.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${item.type.padEnd(4)} ${item.name}`);
  }
  console.log("[deploy] api/.env ou config.local.php presente:", envOk ? "SIM" : "NÃO — reenviar secrets");
}

main().catch((e) => {
  console.error("[deploy] Falha:", e.message || e);
  process.exit(1);
});

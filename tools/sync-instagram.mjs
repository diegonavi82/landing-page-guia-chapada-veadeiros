/**
 * Atualiza tools/instagram-feed.json + imagens em assets/img/instagram/
 * Uso: defina INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ACCOUNT_ID no .env
 *      node tools/sync-instagram.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import {
  fetchInstagramFromGraph,
  cacheInstagramImages,
  writeInstagramFeedJson,
  INSTAGRAM_FEED_JSON,
} from "./instagram-feed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const token = (process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
const igUserId = (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "").trim();
const limit = Number.parseInt(String(process.env.INSTAGRAM_FEED_LIMIT || "9"), 10) || 9;

if (!token || !igUserId) {
  console.error(
    "Defina no .env:\n  INSTAGRAM_ACCESS_TOKEN=...\n  INSTAGRAM_BUSINESS_ACCOUNT_ID=...\n\nConta precisa ser Instagram Profissional (Empresa/Criador) ligada a uma Página do Facebook.\nGuia: https://developers.facebook.com/docs/instagram-api/getting-started",
  );
  process.exit(1);
}

try {
  const raw = await fetchInstagramFromGraph(token, igUserId, limit);
  const posts = await cacheInstagramImages(raw);
  writeInstagramFeedJson(posts, { source: "graph-api" });
  console.log(`OK: ${posts.length} publicações → ${INSTAGRAM_FEED_JSON}`);
} catch (e) {
  console.error("Falha:", e.message);
  process.exit(1);
}

/**
 * Feed do Instagram para a home estática — sem widgets pagos.
 * Fontes (por ordem): instagram-feed.json → API Graph no build (se .env tiver token).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const INSTAGRAM_FEED_JSON = join(__dirname, "instagram-feed.json");
export const INSTAGRAM_IMG_DIR = join(ROOT, "assets", "img", "instagram");
/** Quantas fotos a home exibe por visita (grade 4×2). */
export const INSTAGRAM_HOME_DISPLAY_COUNT = 16;

const GRAPH_VERSION = "v21.0";

/**
 * @typedef {{ permalink: string, image: string, alt?: string, mediaType?: string }} InstagramPost
 */

/**
 * @param {unknown} raw
 * @returns {InstagramPost[]}
 */
export function normalizeFeedPosts(raw) {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray(raw.posts) ? raw.posts : [];
  return list
    .map((p) => {
      const permalink = String(p?.permalink || p?.url || "").trim();
      const image = String(p?.image || p?.imageRel || "").trim().replace(/^\//, "");
      const alt = String(p?.alt || p?.caption || "").trim();
      if (!permalink || !image) return null;
      return {
        permalink,
        image,
        alt: alt || "Publicação no Instagram — Guia Chapada Veadeiros",
        mediaType: p?.mediaType ? String(p.mediaType) : undefined,
      };
    })
    .filter(Boolean);
}

export function readInstagramFeedFile() {
  if (!existsSync(INSTAGRAM_FEED_JSON)) return [];
  try {
    const data = JSON.parse(readFileSync(INSTAGRAM_FEED_JSON, "utf8"));
    return normalizeFeedPosts(data);
  } catch {
    return [];
  }
}

/**
 * @param {string} token
 * @param {string} igUserId Instagram Business Account ID
 * @param {number} limit
 */
export async function fetchInstagramFromGraph(token, igUserId, limit = 9) {
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
  ].join(",");
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 25)));
  url.searchParams.set("access_token", token);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message || res.statusText || "Erro na API do Instagram";
    throw new Error(msg);
  }

  const items = Array.isArray(body?.data) ? body.data : [];
  /** @type {InstagramPost[]} */
  const posts = [];
  for (const item of items) {
    const permalink = String(item?.permalink || "").trim();
    if (!permalink) continue;
    const type = String(item?.media_type || "IMAGE");
    let mediaUrl = String(item?.media_url || "").trim();
    if (type === "VIDEO") {
      mediaUrl = String(item?.thumbnail_url || mediaUrl).trim();
    }
    if (!mediaUrl) continue;
    const caption = String(item?.caption || "").trim();
    const alt = caption
      ? caption.length > 120
        ? `${caption.slice(0, 117)}…`
        : caption
      : "Publicação no Instagram — Guia Chapada Veadeiros";
    posts.push({
      permalink,
      image: mediaUrl,
      alt,
      mediaType: type,
      _remoteUrl: mediaUrl,
      _id: String(item?.id || posts.length),
    });
  }
  return posts;
}

/**
 * Baixa imagens para assets/img/instagram/ e troca `image` por caminho relativo.
 * @param {Array<InstagramPost & { _remoteUrl?: string, _id?: string }>} posts
 */
export async function cacheInstagramImages(posts) {
  mkdirSync(INSTAGRAM_IMG_DIR, { recursive: true });
  const out = [];
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const remote = p._remoteUrl || (p.image.startsWith("http") ? p.image : "");
    let imageRel = p.image.replace(/^\//, "");
    if (remote && remote.startsWith("http")) {
      const ext = remote.includes(".png") ? "png" : "jpg";
      const fileName = `post-${p._id || i + 1}.${ext}`;
      const abs = join(INSTAGRAM_IMG_DIR, fileName);
      imageRel = `instagram/${fileName}`;
      try {
        const imgRes = await fetch(remote);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          writeFileSync(abs, buf);
        } else {
          console.warn("[instagram] download falhou:", remote, imgRes.status);
          continue;
        }
      } catch (e) {
        console.warn("[instagram] download:", e.message);
        continue;
      }
    }
    const { _remoteUrl, _id, ...clean } = p;
    out.push({ ...clean, image: imageRel });
  }
  return out;
}

/**
 * Gera `assets/data/instagram-pool.json` para o JS sortear posts na home.
 * @param {InstagramPost[]} posts
 * @param {string} [siteRoot] raiz do repositório
 */
export function writeInstagramPoolAsset(posts, siteRoot = ROOT) {
  const dir = join(siteRoot, "assets", "data");
  mkdirSync(dir, { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    displayCount: INSTAGRAM_HOME_DISPLAY_COUNT,
    posts,
  };
  writeFileSync(join(dir, "instagram-pool.json"), `${JSON.stringify(payload)}\n`, "utf8");
}

export function writeInstagramFeedJson(posts, meta = {}) {
  const payload = {
    updatedAt: new Date().toISOString(),
    ...meta,
    posts,
  };
  writeFileSync(INSTAGRAM_FEED_JSON, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Carrega posts para o build: JSON em disco; opcionalmente atualiza via API.
 * @param {{ fetchOnBuild?: boolean, token?: string, igUserId?: string, limit?: number }} opts
 */
export async function resolveInstagramFeedForBuild(opts = {}) {
  const fromFile = readInstagramFeedFile();
  const token = (opts.token || process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
  const igUserId = (opts.igUserId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "").trim();
  const fetchOnBuild =
    opts.fetchOnBuild ??
    (process.env.INSTAGRAM_FETCH_ON_BUILD === "1" || process.env.INSTAGRAM_FETCH_ON_BUILD === "true");
  const limit = Number.parseInt(String(opts.limit || process.env.INSTAGRAM_FEED_LIMIT || "9"), 10) || 9;

  if (!fetchOnBuild || !token || !igUserId) {
    return fromFile;
  }

  try {
    const raw = await fetchInstagramFromGraph(token, igUserId, limit);
    const cached = await cacheInstagramImages(raw);
    if (cached.length > 0) {
      writeInstagramFeedJson(cached, { source: "graph-api" });
      return cached;
    }
  } catch (e) {
    console.warn("[build] Instagram API:", e.message, "— usando instagram-feed.json em cache.");
  }
  return fromFile;
}

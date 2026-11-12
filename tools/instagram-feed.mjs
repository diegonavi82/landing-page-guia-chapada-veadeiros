/**
 * Feed do Instagram para a home estática — sem widgets pagos.
 * Fontes (por ordem): instagram-feed.json → API Graph no build (se .env tiver token).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const INSTAGRAM_FEED_JSON = join(__dirname, "instagram-feed.json");
export const INSTAGRAM_IMG_DIR = join(ROOT, "assets", "img", "instagram");
/** Quantas fotos a home exibe por visita — desktop/notebook: grade 4×4. */
export const INSTAGRAM_HOME_DISPLAY_COUNT = 16;
/** Celular e dispositivos pequenos: grade 3×3 (o JS sorteia 16; o CSS oculta as extras). */
export const INSTAGRAM_HOME_DISPLAY_COUNT_MOBILE = 9;

const GRAPH_VERSION = "v25.0";
/** Teto do pool. A home sorteia 16; o restante fica disponível no sorteio. */
const INSTAGRAM_FETCH_CAP = 500;

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
function captionAlt(caption) {
  const clean = String(caption || "").replace(/\s+/g, " ").trim();
  if (!clean) return "Publicação no Instagram — Guia Chapada Veadeiros";
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}

async function graphGet(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message || res.statusText || "Erro na API do Instagram";
    throw new Error(msg);
  }
  return body;
}

async function coverUrlForItem(item, token) {
  const type = String(item?.media_type || "IMAGE");
  let mediaUrl = String(item?.media_url || "").trim();
  if (type === "VIDEO") mediaUrl = String(item?.thumbnail_url || mediaUrl).trim();
  if (mediaUrl) return { type, mediaUrl };
  if (type !== "CAROUSEL_ALBUM" || !item?.id) return { type, mediaUrl: "" };
  const childUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${item.id}/children`);
  childUrl.searchParams.set("fields", "media_type,media_url,thumbnail_url");
  childUrl.searchParams.set("limit", "1");
  childUrl.searchParams.set("access_token", token);
  const body = await graphGet(childUrl);
  const child = Array.isArray(body?.data) ? body.data[0] : null;
  if (!child) return { type, mediaUrl: "" };
  const childType = String(child.media_type || "IMAGE");
  const childUrlMedia =
    childType === "VIDEO"
      ? String(child.thumbnail_url || child.media_url || "").trim()
      : String(child.media_url || child.thumbnail_url || "").trim();
  return { type, mediaUrl: childUrlMedia };
}

export async function fetchInstagramFromGraph(token, igUserId, limit = 400) {
  const cap = Math.min(Math.max(Number(limit) || INSTAGRAM_FETCH_CAP, 1), INSTAGRAM_FETCH_CAP);
  const fields = ["id", "caption", "media_type", "media_url", "thumbnail_url", "permalink", "timestamp"].join(",");
  let nextUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`);
  nextUrl.searchParams.set("fields", fields);
  nextUrl.searchParams.set("limit", "25");
  nextUrl.searchParams.set("access_token", token);

  /** @type {Array<Record<string, unknown>>} */
  const items = [];
  while (nextUrl && items.length < cap) {
    const body = await graphGet(nextUrl);
    const page = Array.isArray(body?.data) ? body.data : [];
    items.push(...page);
    const paging = body?.paging?.next;
    nextUrl = paging && items.length < cap ? paging : null;
  }
  items.length = Math.min(items.length, cap);

  /** @type {Array<InstagramPost | null>} */
  const posts = new Array(items.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      const permalink = String(item?.permalink || "").trim();
      if (!permalink) continue;
      let cover;
      try {
        cover = await coverUrlForItem(item, token);
      } catch (e) {
        console.warn("[instagram] capa:", e.message);
        continue;
      }
      if (!cover.mediaUrl) continue;
      posts[idx] = {
        permalink,
        image: cover.mediaUrl,
        alt: captionAlt(item?.caption),
        mediaType: cover.type,
        _remoteUrl: cover.mediaUrl,
        _id: String(item?.id || idx + 1),
      };
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return posts.filter(Boolean);
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
      const fileName = `post-${p._id || i + 1}.jpg`;
      const abs = join(INSTAGRAM_IMG_DIR, fileName);
      const thumb = join(INSTAGRAM_IMG_DIR, `post-${p._id || i + 1}.w480.webp`);
      imageRel = `instagram/${fileName}`;
      try {
        const imgRes = await fetch(remote);
        if (!imgRes.ok) {
          console.warn("[instagram] download falhou:", imgRes.status);
          continue;
        }
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const jpeg = await sharp(buf).rotate().resize({ width: 1080, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        writeFileSync(abs, jpeg);
        await sharp(jpeg).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72, effort: 4 }).toFile(thumb);
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

/** Apaga fotos antigas da pasta que não estão mais no feed. */
export function removeStaleInstagramImages(posts) {
  if (!existsSync(INSTAGRAM_IMG_DIR)) return;
  const keep = new Set([".gitkeep"]);
  for (const p of posts) {
    const file = String(p.image || "").split("/").pop();
    if (!file) continue;
    const base = file.replace(/\.(jpe?g|png|webp)$/i, "");
    keep.add(`${base}.jpg`);
    keep.add(`${base}.jpeg`);
    keep.add(`${base}.png`);
    keep.add(`${base}.webp`);
    keep.add(`${base}.w480.webp`);
  }
  for (const name of readdirSync(INSTAGRAM_IMG_DIR)) {
    if (keep.has(name)) continue;
    unlinkSync(join(INSTAGRAM_IMG_DIR, name));
  }
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

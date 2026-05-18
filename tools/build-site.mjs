/**
 * Gera todo o HTML estático (PT raiz, EN e ES em /en /es).
 * Uso: node tools/build-site.mjs  |  npm run build
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOTSPOTS,
  STRINGS,
  REVIEWS,
  ARTICLE_CONTRATAR,
  ARTICLE_EPOCA,
  ARTICLE_ONCA_PARDA,
  ARTICLE_ROTEIRO_4_DIAS,
  SEASON_ROWS,
  MONTH_NAME,
  BADGE_LABEL,
  HERO_SLIDES,
  HOME_FEATURED,
  hotspotsForMap,
  MAP_IMAGE,
} from "./content-data.mjs";
import { EXCURSOES_CAROUSEL_BY_LOCALE } from "./excursoes-carousel-data.mjs";
import { excursionsCarouselTrackSsrHtml } from "./excursoes-carousel-ssr.mjs";
import { rewriteHtmlMediaUrls, htmlWithStaticAssetPrefix, toPublicAssetRel } from "./media-url.mjs";
import {
  extractFirstImage,
  prepareDetailContent,
  splitDetailContent,
  stripLegacyFusionGalleryFromHtml,
  getSidebarLines,
  fixAttractionActionHrefs,
} from "./detail-content.mjs";
import { premiumRevistaPtBundle, revistaSlugFromPathKey } from "./gcv-premium-revista-pt.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PKG_JSON = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
/** Evita JavaScript antigo em cache (CDN/browser) após cada deploy. */
const BUILD_ASSET_QUERY = `?v=${encodeURIComponent(String(PKG_JSON.version || "1").trim())}`;

const INSTAGRAM_URL = "https://www.instagram.com/guiachapadaveadeiros/";

/** Mesmo link do rodapé em `SiteLayout.tsx` (planejar viagem). */
const FOOTER_WA_PLAN_URL =
  "https://api.whatsapp.com/send?phone=5562982506891&text=*Quero%20planejar%20minha%20viagem%20na%20Chapada*";

const ATTRACTION_GALLERIES = (() => {
  const raw = JSON.parse(readFileSync(join(__dirname, "attraction-galleries.json"), "utf8"));
  const { _meta, ...rest } = raw;
  return rest;
})();

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

const cmsPath = join(__dirname, "cms-generated.json");
let CMS = null;
if (existsSync(cmsPath)) {
  try {
    CMS = JSON.parse(readFileSync(cmsPath, "utf8"));
    console.log("[build] CMS:", cmsPath, CMS.exportedAt ? `(${CMS.exportedAt})` : "");
  } catch (e) {
    console.warn("[build] cms-generated.json:", e.message);
  }
}

const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://www.guiachapadaveadeiros.com").replace(/\/$/, "");
const GOOGLE_SITE_VERIFICATION = (process.env.GOOGLE_SITE_VERIFICATION || "iX1Yk-5FoSjpSbyVkS_XN49QoMuTLDlIVloEAwsEIa8").trim();
const PUBLISHER_LOGO_ABS = `${SITE_ORIGIN}/wp-content/uploads/2024/05/Logo-Guia-Chapada-Veadeiros-2024.jpg`;
const CONTACT_POST_URL = (process.env.CONTACT_POST_URL || `${SITE_ORIGIN}/api/contact`).trim();
const WHATSAPP_PHONE = (process.env.WHATSAPP_PHONE_E164 || "5562982506891").replace(/\D/g, "");
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "contato@guiachapadaveadeiros.com";
/** Se "1": não chama à API — só WhatsApp + mailto ao enviar (útil para site 100 % estático). */
const CONTACT_CLIENT_ONLY = process.env.CONTACT_CLIENT_ONLY === "1";
/** Access Key em https://web3forms.com — quando definida, o formulário usa só e‑mail pelo Web3Forms (site estático). */
const WEB3FORMS_ACCESS_KEY = (process.env.WEB3FORMS_ACCESS_KEY || "").trim();
const CONTACT_USE_WEB3FORMS = WEB3FORMS_ACCESS_KEY.length > 0;
/** Fallback mailto/whatsapp só quando não há Web3Forms. */
const emitSkipContactApi = CONTACT_CLIENT_ONLY && !CONTACT_USE_WEB3FORMS;

/** Ícone nos resultados de busca / aba — caminho relativamente a `/assets/img/` (ex.: `imagens/favicon.png`). */
const FAVICON_REL = (process.env.FAVICON_REL || "imagens/favicon.png").replace(/^\//, "");

function gcvRelativePublicJsEnv() {
  const v = String(process.env.GCV_RELATIVE_JS || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Scripts em `assets/js`: por omissão **URL absoluta** na raiz do domínio (`/assets/js/…`) — ideal para
 * produção (HTTPS) e cache com `?v=` (versão do `package.json`).
 * `GCV_RELATIVE_JS=1` → caminhos relativos ao HTML (`./` ou `../…`), útil ao abrir `file://`.
 * `SITE_PATH_PREFIX=blog` → `/blog/assets/js/…`
 */
function sitePathSegmentsTrimmed() {
  return String(process.env.SITE_PATH_PREFIX || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

/**
 * @param {string} file ex.: `site.js`
 * @param {string} [pageOutRelPath] ex.: `es/index.html` — necessário quando `GCV_RELATIVE_JS=1`
 */
function publicJsSrc(file, pageOutRelPath) {
  const name = String(file || "").trim().replace(/^\//, "");
  const q = BUILD_ASSET_QUERY;
  const prefixSegment = sitePathSegmentsTrimmed();
  if (prefixSegment) {
    const raw = `/${prefixSegment}/assets/js/${name}${q}`;
    return raw.replace(/\/{2,}/g, "/");
  }
  if (gcvRelativePublicJsEnv()) {
    const ap = pageOutRelPath != null ? assetPrefix(pageOutRelPath) : "./";
    return `${ap}assets/js/${name}${q}`;
  }
  return `/assets/js/${name}${q}`;
}

function footerShopHref(locale) {
  if (locale === "pt") return `${SITE_ORIGIN}/loja`;
  return `${SITE_ORIGIN}/${locale}/loja`;
}

function footerLodgingHref(locale) {
  if (locale === "pt") return `${SITE_ORIGIN}/hospedagem-na-chapada-dos-veadeiros`;
  return `${SITE_ORIGIN}/${locale}/hospedagem-na-chapada-dos-veadeiros`;
}

function searchAbsHref(locale) {
  if (locale === "pt") return `${SITE_ORIGIN}/busca`;
  return `${SITE_ORIGIN}/${locale}/busca`;
}

const LOCALES = /** @type {const} */ (["pt", "en", "es"]);

/** Duas matérias sempre presentes na Revista estática (mesmos slugs das rotas React). */
const REVISTA_ESSENTIAL_SLUGS = new Set([
  "melhor-epoca-visitar-chapada-dos-veadeiros",
  "contratar-guia-local-chapada-veadeiros",
]);
const REVISTA_ESSENTIAL_ORDER = [
  "melhor-epoca-visitar-chapada-dos-veadeiros",
  "contratar-guia-local-chapada-veadeiros",
];

/**
 * Teaser da home: só estas matérias editoriais fixas — evita sumir quando `postsLite` do CMS
 * ganha vários posts (ordenação global por data empurra a onça / outras pra fora do slice(3)).
 */
const REVISTA_HOME_TEASER_SLUGS = new Set([
  "ataque-onca-parda-chapada-veadeiros",
  "melhor-epoca-visitar-chapada-dos-veadeiros",
  "contratar-guia-local-chapada-veadeiros",
  "roteiro-4-dias-chapada-dos-veadeiros",
]);

function normalizeRevistaSlug(post) {
  const raw = String(post?.slug ?? post?.baseSlug ?? "").trim();
  let s = raw.replace(/\\/g, "/");
  const ri = s.toLowerCase().indexOf("revista/");
  if (ri !== -1) s = s.slice(ri + "revista/".length);
  s = s.replace(/^\.\/+/, "").replace(/\.html?$/i, "");
  return s.trim();
}

/** Espelho de frontend/cliente/src/config/wpUploadsAssets.ts (detailImageByPageSlug) */
const DETAIL_IMAGE_BY_SLUG = {
  "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros":
    "/imagens/cachoeira-almecegas-guia-chapada-veadeiros-alto-paraiso-10.jpg",
  "vale-lua-guia-chapada-veadeiros-sao-jorge": "/imagens/vale-lua-guia-chapada-veadeiros-sao-jorge-1.jpg",
  "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso":
    "/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-11.jpg",
  "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante":
    "/imagens/cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante.jpg",
  "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge":
    "/imagens/cachoeira-segredo-guia-chapada-veadeiros-sao-jorge-10.jpg",
  "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso":
    "/imagens/cachoeira-cristais-veu-noiva-guia-chapada-veadeiros-alto-paraiso.jpg",
  "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias":
    "/imagens/cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-4.jpg",
  "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca":
    "/imagens/cachoeira-macaquinhos-guia-chapada-veadeiros-6.jpg",
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripScripts(html) {
  return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

function sidebarInfoLineHtml(line) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("-")) {
    return `<p>${esc(trimmed)}</p>`;
  }
  const sep = trimmed.indexOf(": ");
  if (sep !== -1) {
    const label = trimmed.slice(0, sep + 1);
    const rest = trimmed.slice(sep + 2).trim();
    return `<p><span class="gcv-detail-info-label">${esc(label)}</span>${rest ? ` ${esc(rest)}` : ""}</p>`;
  }
  if (trimmed.endsWith(":")) {
    return `<p><span class="gcv-detail-info-label">${esc(trimmed)}</span></p>`;
  }
  return `<p>${esc(trimmed)}</p>`;
}

function wpPreferOriginalSrc(url) {
  return String(url || "").replace(/-\d+x\d+(?=\.(?:jpg|jpeg|png|webp)(?:\?|$))/i, "");
}

function outRelPath(locale, pathKey) {
  if (!pathKey) return locale === "pt" ? "index.html" : `${locale}/index.html`;
  return locale === "pt" ? pathKey : `${locale}/${pathKey}`;
}

function assetPrefix(outRel) {
  const d = dirname(outRel.replace(/\\/g, "/"));
  if (d === "." || d === "") return "./";
  const n = d.split("/").filter(Boolean).length;
  return "../".repeat(n);
}

function relBetweenSync(fromRel, toRel) {
  const fromAbs = join(ROOT, ...fromRel.replace(/\\/g, "/").split("/").filter(Boolean));
  const toAbs = join(ROOT, ...toRel.replace(/\\/g, "/").split("/").filter(Boolean));
  let r = relative(dirname(fromAbs), toAbs);
  r = r.replace(/\\/g, "/");
  if (!r || r === ".") return "./";
  return r;
}

function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function waText(locale) {
  const t = {
    pt: "Quero montar um roteiro na Chapada dos Veadeiros",
    en: "I want to plan an itinerary in Chapada dos Veadeiros",
    es: "Quiero armar un itinerario en Chapada dos Veadeiros",
  };
  return t[locale];
}

function waUrl(locale) {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(waText(locale))}`;
}

function getCmsAttraction(locale, baseSlug) {
  const pages = CMS?.locales?.[locale]?.attractionPages;
  if (!pages) return null;
  return pages.find((p) => p.baseSlug === baseSlug) ?? null;
}

function localeSlugForBase(locale, baseSlug) {
  const cms = getCmsAttraction(locale, baseSlug);
  return cms?.slug ?? baseSlug;
}

function baseSlugFromLocaleSlug(locale, localeSlug) {
  const m = CMS?.localeSlugToBase?.[locale];
  if (m && m[localeSlug]) return m[localeSlug];
  return localeSlug;
}

function attractionIterate(locale) {
  if (CMS?.waterfallBaseSlugs?.length) {
    return CMS.waterfallBaseSlugs
      .map((base) => {
        const h = HOTSPOTS.find((x) => x.slug === base);
        if (!h) return null;
        const cms = getCmsAttraction(locale, base);
        const locSlug = cms?.slug ?? base;
        const title = cms?.title ?? h.title[locale];
        const lead = (cms?.excerpt && String(cms.excerpt).trim()) || h.lead[locale];
        return { h, base, locSlug, title, lead, cms };
      })
      .filter(Boolean);
  }
  const locKey = locale === "en" ? "en" : locale === "es" ? "es" : "pt-BR";
  return [...HOTSPOTS]
    .sort((a, b) => a.title[locale].localeCompare(b.title[locale], locKey, { sensitivity: "base" }))
    .map((h) => ({
      h,
      base: h.slug,
      locSlug: h.slug,
      title: h.title[locale],
      lead: h.lead[locale],
      cms: null,
    }));
}

function revistaPathKey(slug) {
  const s = String(slug || "")
    .replace(/\.html$/i, "")
    .trim();
  return `revista/${s}.html`;
}

function capitalizeSentenceStart(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Data longa no padrão editorial em pt-BR (weekday capitalizado). */
function formatPublicationDatePt(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).formatToParts(d);
    const weekdayRaw = parts.find((p) => p.type === "weekday")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const monthRaw = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    const monthCap = capitalizeSentenceStart(monthRaw);
    if (!weekdayRaw || !day || !monthCap || !year) return "";
    return `${capitalizeSentenceStart(weekdayRaw)}, ${day} de ${monthCap} de ${year}`;
  } catch {
    return "";
  }
}

/** Data dos teasers da Revista no idioma da página (hub + capa lateral). */
function formatPublicationDateForLocale(iso, locale) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    if (locale === "pt") return formatPublicationDatePt(iso);
    const locTag = locale === "es" ? "es-ES" : "en-US";
    const formatted = new Intl.DateTimeFormat(locTag, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
    return locale === "es" ? capitalizeSentenceStart(formatted) : formatted;
  } catch {
    return "";
  }
}

function revistaTeaserSortTime(p) {
  const t = p.publishedAt;
  if (!t) return 0;
  const n = Date.parse(t);
  return Number.isNaN(n) ? 0 : n;
}

/** Sobrepõe título/resumo/chip mesmo quando `cms-generated.json` traz apenas PT. */
function normalizeStaticRevistaLocaleFields(post, locale) {
  const slug = normalizeRevistaSlug(post);
  const chipTips = STRINGS[locale].revistaPage.chipDefault;
  if (slug === "melhor-epoca-visitar-chapada-dos-veadeiros") {
    const A = ARTICLE_EPOCA[locale];
    return {
      ...post,
      title: A.title,
      excerpt: A.desc,
      featuredImageAlt: A.title,
      categories: [{ name: chipTips, slug: post.categories?.[0]?.slug || "dicas" }],
    };
  }
  if (slug === "contratar-guia-local-chapada-veadeiros") {
    const A = ARTICLE_CONTRATAR[locale];
    return {
      ...post,
      title: A.title,
      excerpt: A.desc,
      featuredImageAlt: A.title,
      categories: [{ name: chipTips, slug: post.categories?.[0]?.slug || "dicas" }],
    };
  }
  if (slug === "ataque-onca-parda-chapada-veadeiros") {
    const A = ARTICLE_ONCA_PARDA[locale];
    return {
      ...post,
      title: A.title,
      excerpt: A.desc,
      featuredImageAlt: A.title,
      categories: [{ name: A.chip, slug: "seguranca" }],
    };
  }
  if (slug === "roteiro-4-dias-chapada-dos-veadeiros") {
    const A = ARTICLE_ROTEIRO_4_DIAS[locale];
    return {
      ...post,
      title: A.title,
      excerpt: A.desc,
      featuredImageAlt: A.title,
      categories: [{ name: A.chip, slug: "roteiros" }],
    };
  }
  return post;
}

/** Fallbacks editoriais para o merge e base fixa dos cartões da home Revista (skeleton + CMS). */
function editorialRevistaFallbackTriplet(locale) {
  const chip = STRINGS[locale].revistaPage.chipDefault;
  return [
    {
      slug: "melhor-epoca-visitar-chapada-dos-veadeiros",
      title: ARTICLE_EPOCA[locale].title,
      excerpt: ARTICLE_EPOCA[locale].desc,
      featuredImage: "/uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
      featuredImageAlt: ARTICLE_EPOCA[locale].title,
      publishedAt: "2026-05-13T16:00:00.000Z",
      categories: [{ name: chip, slug: "dicas" }],
    },
    {
      slug: "contratar-guia-local-chapada-veadeiros",
      title: ARTICLE_CONTRATAR[locale].title,
      excerpt: ARTICLE_CONTRATAR[locale].desc,
      featuredImage: "/uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
      featuredImageAlt: ARTICLE_CONTRATAR[locale].title,
      publishedAt: "2026-05-13T14:00:00.000Z",
      categories: [{ name: chip, slug: "dicas" }],
    },
    {
      slug: "ataque-onca-parda-chapada-veadeiros",
      title: ARTICLE_ONCA_PARDA[locale].title,
      excerpt: ARTICLE_ONCA_PARDA[locale].desc,
      featuredImage: "/uploads/revista/onca-parda-ataque-chapada/onca-parda-descansando-arvore-chapada-veadeiros.jpg",
      featuredImageAlt: ARTICLE_ONCA_PARDA[locale].title,
      publishedAt: "2026-05-16T03:00:00.000Z",
      categories: [{ name: ARTICLE_ONCA_PARDA[locale].chip, slug: "seguranca" }],
    },
    {
      slug: "roteiro-4-dias-chapada-dos-veadeiros",
      title: ARTICLE_ROTEIRO_4_DIAS[locale].title,
      excerpt: ARTICLE_ROTEIRO_4_DIAS[locale].desc,
      featuredImage: "/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso.jpg",
      featuredImageAlt: ARTICLE_ROTEIRO_4_DIAS[locale].title,
      publishedAt: "2026-05-16T22:00:00.000Z",
      categories: [{ name: ARTICLE_ROTEIRO_4_DIAS[locale].chip, slug: "roteiros" }],
    },
  ];
}

/** Iguala slugs com/sem acento (ex.: onça/onca no JSON do WP). */
function homeTeaserCanonSlug(normSlug) {
  const fold = (s) =>
    String(s || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const n = fold(normSlug);
  if (!n) return "";
  for (const canon of REVISTA_HOME_TEASER_SLUGS) {
    if (fold(canon) === n) return canon;
  }
  return "";
}

const CMS_CONTRATAR_SLUG = "contratar-guia-local-chapada-veadeiros";
let didHydrateCmsContratarPostsLiteEnEs = false;

/** O export do WP costuma duplicar título/resumo em PT dentro de `postsLite.en`/`postsLite.es`. Normaliza uma vez para ARTICLE_* (fonte editorial). */
function hydrateCmsContratarPostsLiteEnEsOnce() {
  if (didHydrateCmsContratarPostsLiteEnEs || !CMS?.locales) return;
  didHydrateCmsContratarPostsLiteEnEs = true;
  for (const loc of /** @type {const} */ (["en", "es"])) {
    const arr = CMS.locales[loc]?.postsLite;
    if (!Array.isArray(arr)) continue;
    const idx = arr.findIndex((p) => normalizeRevistaSlug(p) === CMS_CONTRATAR_SLUG);
    if (idx === -1) continue;
    const A = ARTICLE_CONTRATAR[loc];
    const cur = arr[idx];
    arr[idx] = {
      ...cur,
      title: A.title,
      excerpt: A.desc,
      seoTitle: A.title,
      seoDescription: A.desc,
      featuredImageAlt: A.title,
    };
  }
}

/** API + artigos estáticos (mesma ideia que `mergeRevistaTeaserPosts` no cliente). */
function revistaHubMergedPosts(locale) {
  const fromApi = CMS?.locales?.[locale]?.postsLite ?? [];
  const chip = STRINGS[locale].revistaPage.chipDefault;
  const bySlug = new Map();
  for (const p of fromApi) {
    let slug = normalizeRevistaSlug(p);
    if (!slug) continue;
    const canonHome = homeTeaserCanonSlug(slug);
    if (canonHome) slug = canonHome;
    bySlug.set(slug, { ...p, slug });
  }
  const fallbacks = editorialRevistaFallbackTriplet(locale);
  for (const p of fallbacks) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
  }
  let list = [...bySlug.values()].map((p) => normalizeStaticRevistaLocaleFields(p, locale));
  const slugSet = new Set(list.map((p) => normalizeRevistaSlug(p)));
  const isEssentialPair =
    list.length === 2 && slugSet.size === 2 && [...slugSet].every((s) => REVISTA_ESSENTIAL_SLUGS.has(s));
  if (isEssentialPair) {
    list = REVISTA_ESSENTIAL_ORDER.map((s) => list.find((p) => normalizeRevistaSlug(p) === s)).filter(Boolean);
  } else {
    list.sort((a, b) => revistaTeaserSortTime(b) - revistaTeaserSortTime(a));
  }
  return list;
}

/** Na home cartões editoriais fixos (skeleton + opcional dados do CMS; slug canônico, tolera acentos no JSON). */
function revistaHubHomeTeaserPosts(locale) {
  const mergedFlat = revistaHubMergedPosts(locale);
  const byCanon = new Map();
  for (const p of mergedFlat) {
    const canon = homeTeaserCanonSlug(normalizeRevistaSlug(p));
    if (!canon || !REVISTA_HOME_TEASER_SLUGS.has(canon)) continue;
    const cur = byCanon.get(canon);
    if (!cur || revistaTeaserSortTime(p) > revistaTeaserSortTime(cur)) {
      byCanon.set(canon, { ...p, slug: canon });
    }
  }
  const skeleton = editorialRevistaFallbackTriplet(locale);
  const picked = skeleton.map((base) =>
    normalizeStaticRevistaLocaleFields(
      {
        ...base,
        ...(byCanon.get(base.slug) || {}),
        slug: base.slug,
      },
      locale,
    ),
  );
  picked.sort((a, b) => revistaTeaserSortTime(b) - revistaTeaserSortTime(a));
  return picked;
}

function revistaCapaCardHtml(post, href, ap, chipFallback, locale) {
  const cat = post.categories?.[0]?.name || chipFallback;
  const dek = String(post.excerpt || post.seoDescription || "").trim();
  const dateLabel = formatPublicationDateForLocale(post.publishedAt, locale);
  const imgRel = toPublicAssetRel(post.featuredImage);
  const alt = post.featuredImageAlt || post.title;
  const media = imgRel
    ? `<div class="Revista-teaser__media Revista-teaser__media--wide">${picture(ap, imgRel, alt, 1200, 675)}</div>`
    : `<div class="Revista-teaser__media Revista-teaser__media--wide Revista-teaser__media--empty" aria-hidden="true"></div>`;
  return `<a class="Revista-teaser Revista-teaser--capa group" href="${esc(href)}">
${media}
<div class="Revista-teaser__body Revista-teaser__body--capa">
<span class="Revista-chip Revista-chip--live">${esc(cat)}</span>
<h3 class="Revista-teaser__title-lg">${esc(post.title)}</h3>
${dek ? `<p class="Revista-teaser__dek">${esc(dek)}</p>` : ""}
${dateLabel ? `<p class="Revista-teaser__meta">${esc(dateLabel)}</p>` : ""}
</div>
</a>`;
}

function revistaListaCardHtml(post, href, ap, chipFallback, locale) {
  const cat = post.categories?.[0]?.name || chipFallback;
  const dek = String(post.excerpt || post.seoDescription || "").trim();
  const dateLabel = formatPublicationDateForLocale(post.publishedAt, locale);
  const imgRel = toPublicAssetRel(post.featuredImage);
  const alt = post.featuredImageAlt || post.title;
  const media = imgRel
    ? `<div class="Revista-teaser__media">${picture(ap, imgRel, alt, 640, 400)}</div>`
    : `<div class="Revista-teaser__media Revista-teaser__media--empty" aria-hidden="true"></div>`;
  return `<a class="Revista-teaser Revista-teaser--lista group" href="${esc(href)}">
${media}
<div class="Revista-teaser__body">
<span class="Revista-chip">${esc(cat)}</span>
<h3 class="Revista-teaser__title-sm">${esc(post.title)}</h3>
${dek ? `<p class="Revista-teaser__dek Revista-teaser__dek--short">${esc(dek)}</p>` : ""}
${dateLabel ? `<p class="Revista-teaser__meta">${esc(dateLabel)}</p>` : ""}
</div>
</a>`;
}

function localePathToUrl(loc, pathKey) {
  if (!pathKey) return loc === "pt" ? "/" : `/${loc}/`;
  const prefix = loc === "pt" ? "" : `/${loc}`;
  let rel = String(pathKey).replace(/^\/+/, "");
  if (!rel.endsWith(".html")) rel = `${rel}.html`;
  return `${prefix}/${rel}`.replace(/\/+/g, "/");
}

const SKIP_TO_CONTENT = { pt: "Pular para o conteúdo", en: "Skip to content", es: "Ir al contenido" };

function picture(ap, rel, alt, w = 1200, h = 800, opts) {
  const m = rel.match(/^(.*)\.(jpe?g|png)$/i);
  const basePath = m ? m[1] : rel;
  const webpPath = `${ap}assets/img/${basePath}.webp`;
  const fallbackPath = `${ap}assets/img/${rel}`;
  const loading = opts?.eager ? "eager" : "lazy";
  const fetchpriority = opts?.fetchPriority ? ` fetchpriority="${esc(opts.fetchPriority)}"` : "";
  return `<picture>
  <source srcset="${esc(webpPath)}" type="image/webp" />
  <img src="${esc(fallbackPath)}" alt="${esc(alt)}" width="${w}" height="${h}" loading="${loading}" decoding="async"${fetchpriority} />
</picture>`;
}

function pictureHero(ap, rel, alt, w, h) {
  return picture(ap, rel, alt, w, h, { eager: true, fetchPriority: "high" });
}

function premiumRevistaHelpers(locale, pathKey) {
  return {
    ap: assetPrefix(outRelPath(locale, pathKey)),
    pathKey,
    locale,
    SITE_ORIGIN,
    esc,
    picture,
    pictureHero,
    relBetweenSync,
    outRelPath,
    formatPublicationDatePt,
    safeJsonLd,
  };
}

const WA_SVG = `<svg class="gcv-hero-wa-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.718 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

function staggerWords(text, startMs, stepMs) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words
    .map(
      (w, i) =>
        `<span class="gcv-hero-word" style="animation-delay:${startMs + i * stepMs}ms">${esc(w)}${
          i < words.length - 1 ? "\u00A0" : ""
        }</span>`,
    )
    .join("");
}

function buildHeroAnim(title, lead, sub) {
  const tw = title.trim().split(/\s+/).filter(Boolean).length;
  const lw = lead.trim().split(/\s+/).filter(Boolean).length;
  const st = sub.trim();
  const sw = st ? st.split(/\s+/).filter(Boolean).length : 0;
  const badgeMs = 40;
  const titleStartMs = 120;
  const leadStartMs = titleStartMs + tw * 72 + 140;
  const subStartMs = leadStartMs + lw * 42 + 140;
  const afterBody = sw > 0 ? subStartMs + sw * 42 : leadStartMs + lw * 42;
  const ctaStartMs = afterBody + 140 + 160;
  return { badgeMs, titleStartMs, leadStartMs, subStartMs, ctaStartMs };
}

function heroPictureBg(ap, rel, eagerFirst) {
  const m = rel.match(/^(.*)\.(jpe?g|png)$/i);
  const basePath = m ? m[1] : rel;
  const webpPath = `${ap}assets/img/${basePath}.webp`;
  const fallbackPath = `${ap}assets/img/${rel}`;
  const loading = eagerFirst ? "eager" : "lazy";
  return `<picture class="gcv-hero__picture">
  <source srcset="${esc(webpPath)}" type="image/webp" />
  <img class="gcv-hero__bg" src="${esc(fallbackPath)}" alt="" width="1600" height="900" loading="${loading}" decoding="async" />
</picture>`;
}

function mapHotspotsHtml(locale, fromOutRel, hotspotBaseClass, activeSlug) {
  const list = hotspotsForMap();
  return list
    .map((spot) => {
      const hrefSlug = localeSlugForBase(locale, spot.slug);
      const target = outRelPath(locale, `atrativos/${hrefSlug}.html`);
      const href = relBetweenSync(fromOutRel, target);
      const cur = activeSlug === hrefSlug;
      const cls = `${hotspotBaseClass}${cur ? ` ${hotspotBaseClass}--current` : ""}`;
      const { l, t, w, h } = spot.box;
      return `<a href="${esc(href)}" class="${cls}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;" aria-label="${esc(spot.title[locale])}" title="${esc(spot.title[locale])}"></a>`;
    })
    .join("\n");
}

function mapFigureHtml(locale, ap, fromOutRel, activeSlug, variant) {
  const isLb = variant === "lightbox";
  const figClass = isLb ? "gcv-map-lightbox__figure" : "gcv-detail-region-map__figure";
  const hsClass = isLb ? "gcv-map-lightbox__hotspots" : "gcv-detail-region-map__hotspots";
  const hClass = isLb ? "gcv-map-lightbox__hotspot" : "gcv-detail-region-map__hotspot";
  const S = STRINGS[locale];
  const inner = picture(ap, MAP_IMAGE, S.home.mapAlt, 1366, 600);
  const hs = mapHotspotsHtml(locale, fromOutRel, hClass, activeSlug);
  return `<figure class="${figClass}">${inner}<div class="${hsClass}">${hs}</div></figure>`;
}

function attractionPhotoGalleryHtml(locale, ap, baseSlug, pageTitle) {
  const items = ATTRACTION_GALLERIES[baseSlug];
  if (!Array.isArray(items) || items.length === 0) return "";
  const h2 = STRINGS[locale].home.atrativoGalleryH2;
  const closeLabel = locale === "en" ? "Close" : locale === "es" ? "Cerrar" : "Fechar";
  const prevLabel =
    locale === "en" ? "Previous photo" : locale === "es" ? "Foto anterior" : "Foto anterior";
  const nextLabel =
    locale === "en" ? "Next photo" : locale === "es" ? "Siguiente foto" : "Próxima foto";
  const hint =
    locale === "en" ? "Full screen" : locale === "es" ? "Pantalla completa" : "Ver em tela cheia";

  const tiles = items
    .map((item, i) => {
      const raw0 = String(item.src || "").trim();
      const raw = wpPreferOriginalSrc(raw0.startsWith("/") || /^https?:/i.test(raw0) ? raw0 : `/${raw0.replace(/^\//, "")}`);
      const rel = toPublicAssetRel(raw);
      if (!rel) return "";
      const full = `${ap}assets/img/${rel}`;
      const caption = (item.alt || item.title || "").trim();
      const altText = caption || (pageTitle ? `${pageTitle} — foto ${i + 1}` : `Foto ${i + 1}`);
      const overlay = caption
        ? `<span class="gcv-attract-gallery__overlay" aria-hidden="true"><span class="gcv-attract-gallery__overlay-text">${esc(caption)}</span></span>`
        : `<span class="gcv-attract-gallery__overlay gcv-attract-gallery__overlay--hint" aria-hidden="true"><span class="gcv-attract-gallery__overlay-hint">${esc(hint)}</span></span>`;
      const aria = caption ? `Ampliar: ${caption}` : `Ampliar foto ${i + 1}`;
      return `<button type="button" class="gcv-attract-gallery__tile" data-gcv-gallery-open
    data-gcv-src="${esc(full)}"
    data-gcv-alt="${esc(altText)}"
    data-gcv-caption="${esc(caption)}"
    aria-label="${esc(aria)}">
  <span class="gcv-attract-gallery__thumb">
    <img src="${esc(full)}" alt="${esc(altText)}" class="gcv-attract-gallery__img" loading="lazy" decoding="async" />
    ${overlay}
  </span>
</button>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<section class="gcv-attract-gallery" data-gcv-attract-gallery aria-labelledby="gcv-attract-gallery-title">
  <h2 id="gcv-attract-gallery-title" class="gcv-attract-gallery__title">${esc(h2)}</h2>
  <div class="gcv-attract-gallery__grid">
${tiles}
  </div>
  <div class="gcv-photo-lightbox" data-gcv-photo-lightbox aria-hidden="true">
    <button type="button" class="gcv-photo-lightbox__backdrop" data-gcv-photo-close aria-label="${esc(closeLabel)}"></button>
    <div class="gcv-photo-lightbox__inner">
      <button type="button" class="gcv-photo-lightbox__close" data-gcv-photo-close aria-label="${esc(closeLabel)}">×</button>
      <button type="button" class="gcv-photo-lightbox__nav gcv-photo-lightbox__nav--prev" data-gcv-photo-prev aria-label="${esc(prevLabel)}">‹</button>
      <button type="button" class="gcv-photo-lightbox__nav gcv-photo-lightbox__nav--next" data-gcv-photo-next aria-label="${esc(nextLabel)}">›</button>
      <figure class="gcv-photo-lightbox__figure">
        <img class="gcv-photo-lightbox__img" src="" alt="" decoding="async" data-gcv-photo-img />
        <figcaption class="gcv-photo-lightbox__caption" data-gcv-photo-caption hidden></figcaption>
      </figure>
      <p class="gcv-photo-lightbox__counter"><span data-gcv-photo-idx>1</span> / <span data-gcv-photo-total>${items.length}</span></p>
    </div>
  </div>
</section>`;
}

function homeRevistaTeaserHtml(locale, ap, cur) {
  const S = STRINGS[locale];
  const home = S.home;
  const revistaHubHref = relBetweenSync(cur, outRelPath(locale, "revista.html"));
  const CONTRATAR_SLUG = "contratar-guia-local-chapada-veadeiros";
  const EPOCA_SLUG = "melhor-epoca-visitar-chapada-dos-veadeiros";
  const ONCA_SLUG = "ataque-onca-parda-chapada-veadeiros";
  const ROTEIRO_SLUG = "roteiro-4-dias-chapada-dos-veadeiros";
  const top = revistaHubHomeTeaserPosts(locale);

  if (top.length > 0) {
    const cards = top
      .map((post) => {
        const slugStr = normalizeRevistaSlug(post);
        let cardTitle = post.title;
        let cardExcerpt = (post.excerpt || "").trim();
        let cardImgAlt = post.featuredImageAlt || post.title;
        if (slugStr === CONTRATAR_SLUG || slugStr.includes("contratar-guia-local")) {
          const A = ARTICLE_CONTRATAR[locale];
          cardTitle = A.title;
          cardExcerpt = A.desc.trim();
          cardImgAlt = post.featuredImageAlt || A.title;
        } else if (slugStr === EPOCA_SLUG || slugStr.includes("melhor-epoca-visitar-chapada")) {
          const A = ARTICLE_EPOCA[locale];
          cardTitle = A.title;
          cardExcerpt = A.desc.trim();
          cardImgAlt = post.featuredImageAlt || A.title;
        } else if (slugStr === ONCA_SLUG || slugStr.includes("ataque-onca-parda-chapada")) {
          const A = ARTICLE_ONCA_PARDA[locale];
          cardTitle = A.title;
          cardExcerpt = A.desc.trim();
          cardImgAlt = post.featuredImageAlt || A.title;
        } else if (slugStr === ROTEIRO_SLUG || slugStr.includes("roteiro-4-dias-chapada")) {
          const A = ARTICLE_ROTEIRO_4_DIAS[locale];
          cardTitle = A.title;
          cardExcerpt = A.desc.trim();
          cardImgAlt = post.featuredImageAlt || A.title;
        }
        const pk = revistaPathKey(slugStr);
        const href = relBetweenSync(cur, outRelPath(locale, pk));
        const imgRel =
          toPublicAssetRel(post.featuredImage) || "imagens/hero-slide-01-guias-locais-cachoeira.png";
        const excerpt =
          cardExcerpt.length > 160 ? `${cardExcerpt.slice(0, 157)}…` : cardExcerpt;
        return `<a class="gcv-revista-teaser-card" href="${esc(href)}">
      <div class="gcv-revista-teaser-card__media">${picture(
        ap,
        imgRel,
        cardImgAlt,
        640,
        360,
      )}</div>
      <div class="gcv-revista-teaser-card__body">
        <h3 class="gcv-revista-teaser-card__title">${esc(cardTitle)}</h3>
        <p class="gcv-revista-teaser-card__excerpt">${esc(excerpt)}</p>
        <span class="gcv-revista-teaser-card__more">${esc(home.revistaReadMore)} →</span>
      </div>
    </a>`;
      })
      .join("\n");
    return `<section class="gcv-home-card gcv-home-revista-teaser">
  <div class="gcv-home-card__head">
    <div>
      <h2 class="gcv-home-revista-teaser__h2">${esc(home.revistaH2)}</h2>
    </div>
    <a class="gcv-link-cerrado" href="${esc(revistaHubHref)}">${esc(home.revistaSeeAll)}</a>
  </div>
  <div class="gcv-revista-teaser-grid">
${cards}
  </div>
</section>`;
  }

  const R = S.revistaHub;
  const cPath = ARTICLE_CONTRATAR[locale].path;
  const ePath = ARTICLE_EPOCA[locale].path;
  const cHref = relBetweenSync(cur, outRelPath(locale, cPath));
  const eHref = relBetweenSync(cur, outRelPath(locale, ePath));
  const cImg = "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png";
  const eImg = "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png";
  return `<section class="gcv-home-card gcv-home-revista-teaser">
  <div class="gcv-home-card__head">
    <div>
      <h2 class="gcv-home-revista-teaser__h2">${esc(home.revistaH2)}</h2>
    </div>
    <a class="gcv-link-cerrado" href="${esc(revistaHubHref)}">${esc(home.revistaSeeAll)}</a>
  </div>
  <div class="gcv-revista-teaser-grid">
    <a class="gcv-revista-teaser-card" href="${esc(cHref)}">
      <div class="gcv-revista-teaser-card__media">${picture(ap, cImg, R.cardContratarTitle, 640, 360)}</div>
      <div class="gcv-revista-teaser-card__body">
        <h3 class="gcv-revista-teaser-card__title">${esc(R.cardContratarTitle)}</h3>
        <p class="gcv-revista-teaser-card__excerpt">${esc(R.cardContratarLead)}</p>
        <span class="gcv-revista-teaser-card__more">${esc(home.revistaReadMore)} →</span>
      </div>
    </a>
    <a class="gcv-revista-teaser-card" href="${esc(eHref)}">
      <div class="gcv-revista-teaser-card__media">${picture(ap, eImg, R.cardEpocaTitle, 640, 360)}</div>
      <div class="gcv-revista-teaser-card__body">
        <h3 class="gcv-revista-teaser-card__title">${esc(R.cardEpocaTitle)}</h3>
        <p class="gcv-revista-teaser-card__excerpt">${esc(R.cardEpocaLead)}</p>
        <span class="gcv-revista-teaser-card__more">${esc(home.revistaReadMore)} →</span>
      </div>
    </a>
  </div>
</section>`;
}

function homeInstagramHtml(locale) {
  const home = STRINGS[locale].home;
  return `<section class="gcv-home-card gcv-home-instagram">
  <div class="gcv-home-card__head">
    <div>
      <span class="gcv-chip-orange">${esc(home.instagramChip)}</span>
    </div>
    <a class="gcv-instagram-handle" href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">${esc(home.instagramHandle)}</a>
  </div>
  <p class="gcv-home-instagram__lead">${esc(home.instagramLead)}</p>
  <p class="gcv-home-instagram__cta-wrap">
    <a class="btn btn-primary" href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">${esc(home.instagramCta)}</a>
  </p>
</section>`;
}

function homeReviewsRichHtml(locale, ap) {
  const home = STRINGS[locale].home;
  const cards = REVIEWS[locale]
    .map((r) => {
      const quote = "quote" in r && r.quote ? r.quote : "text" in r && r.text ? r.text : "";
      const city = "city" in r && r.city ? r.city : "meta" in r && r.meta ? r.meta : "";
      const img = "image" in r && r.image ? r.image : null;
      const tour = "tour" in r && r.tour ? r.tour : "";
      const avatar = img
        ? `<div class="gcv-review-card__avatar"><img src="${esc(`${ap}assets/img/${img}`)}" alt="${esc(r.name)}" width="80" height="80" loading="lazy" decoding="async" /></div>`
        : `<div class="gcv-review-card__avatar gcv-review-card__avatar--fallback" aria-hidden="true">${esc(r.name.charAt(0))}</div>`;
      return `<article class="gcv-review-card">
  <div class="gcv-review-card__head">
    ${avatar}
    <div class="gcv-review-card__meta">
      <p class="gcv-review-card__stars" aria-hidden="true">★★★★★</p>
      <h3 class="gcv-review-card__name">${esc(r.name)}</h3>
      <p class="gcv-review-card__city">${esc(city)}</p>
      ${tour ? `<p class="gcv-review-card__tour">${esc(tour)}</p>` : ""}
    </div>
  </div>
  <blockquote class="gcv-review-card__quote"><span class="gcv-review-card__quo">“</span>${esc(quote)}<span class="gcv-review-card__quo">”</span></blockquote>
</article>`;
    })
    .join("\n");
  return `<section class="gcv-home-reviews" aria-label="${esc(home.reviewsTitle)}">
  <div class="gcv-home-reviews__intro">
    <h2 class="gcv-home-reviews__h2"><span class="gcv-home-reviews__star" aria-hidden="true">★</span> <span class="gcv-home-reviews__h2-main">${esc(home.reviewsTitle)}</span> <span class="gcv-home-reviews__star" aria-hidden="true">★</span></h2>
    <p class="gcv-home-reviews__lead">${esc(home.reviewsLead)}</p>
  </div>
  <div class="gcv-review-grid">
${cards}
  </div>
</section>`;
}

function langLinksHtml(locale, pathKey) {
  const cur = outRelPath(locale, pathKey);
  const items = [];
  for (const loc of LOCALES) {
    if (loc === locale) {
      items.push(
        `<a href="#" aria-current="true" lang="${STRINGS[loc].htmlLang}">${loc.toUpperCase()}</a>`,
      );
      continue;
    }
    const href = relBetweenSync(cur, outRelPath(loc, pathKey));
    items.push(`<a href="${esc(href)}" hreflang="${STRINGS[loc].htmlLang}" lang="${STRINGS[loc].htmlLang}">${loc.toUpperCase()}</a>`);
  }
  return `<div class="lang-switch" role="navigation" aria-label="Language">${items.join("\n    ")}</div>`;
}

function buildHead(ctx) {
  const {
    title,
    desc,
    locale,
    pathKey,
    ogImageRel,
    ap,
    extraCss,
    ogTitle,
    ogDesc,
    extraHead,
    ogType,
    ogImageWidth,
    ogImageHeight,
  } = ctx;
  const ogT = ogTitle ?? title;
  const ogD = ogDesc ?? desc;
  const ogSiteType = ogType || "website";
  const cssExtra = (extraCss || [])
    .map((rel) => `\n    <link rel="stylesheet" href="${esc(`${ap}${rel}`)}" />`)
    .join("");
  const canon = `${SITE_ORIGIN}${localePathToUrl(locale, pathKey)}`.replace(/([^:])\/{2,}/g, "$1/");
  const ogAbs = ogImageRel ? `${SITE_ORIGIN}/assets/img/${ogImageRel.replace(/^\//, "")}` : "";
  const alternates = LOCALES.map((loc) => ({
    hreflang: STRINGS[loc].htmlLang,
    href: `${SITE_ORIGIN}${localePathToUrl(loc, pathKey)}`,
  }));
  const altLines = alternates
    .map((a) => `    <link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}" />`)
    .join("\n");
  const xDefault = `${SITE_ORIGIN}${localePathToUrl("pt", pathKey)}`;
  const hreflangBlock =
    altLines +
    `\n    <link rel="alternate" hreflang="x-default" href="${esc(xDefault)}" />`;
  const faviconAbs = `${SITE_ORIGIN}/assets/img/${FAVICON_REL}`.replace(/([^:])\/{2,}/g, "$1/");
  const faviconMime = /\.svg$/i.test(FAVICON_REL)
    ? "image/svg+xml"
    : /\.ico$/i.test(FAVICON_REL)
      ? "image/x-icon"
      : "image/png";
  const faviconSizesAttr = faviconMime === "image/png" ? ' sizes="192x192"' : "";
  const appleTouchSizesAttr = faviconMime === "image/png" ? ' sizes="180x180"' : "";

  const ogLocale = locale === "pt" ? "pt_BR" : locale === "en" ? "en_US" : "es_ES";
  const ogLocaleAlternate = LOCALES.filter((l) => l !== locale)
    .map((l) => (l === "pt" ? "pt_BR" : l === "en" ? "en_US" : "es_ES"))
    .map((tag) => `    <meta property="og:locale:alternate" content="${esc(tag)}" />`)
    .join("\n");

  return `<meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="theme-color" content="#0f3d2e" />
    ${GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(GOOGLE_SITE_VERIFICATION)}" />\n    ` : ""}<link rel="icon" href="${esc(faviconAbs)}" type="${esc(faviconMime)}"${faviconSizesAttr} />
    <link rel="apple-touch-icon" href="${esc(faviconAbs)}"${appleTouchSizesAttr} />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${esc(canon)}" />
${hreflangBlock}
    <meta property="og:type" content="${esc(ogSiteType)}" />
    <meta property="og:site_name" content="Guia Chapada Veadeiros" />
    <meta property="og:locale" content="${esc(ogLocale)}" />
${ogLocaleAlternate}
    <meta property="og:url" content="${esc(canon)}" />
    <meta property="og:title" content="${esc(ogT)}" />
    <meta property="og:description" content="${esc(ogD)}" />
    ${ogAbs ? `<meta property="og:image" content="${esc(ogAbs)}" />\n    ` : ""}${ogAbs && ogImageWidth ? `<meta property="og:image:width" content="${esc(String(ogImageWidth))}" />\n    ` : ""}${ogAbs && ogImageHeight ? `<meta property="og:image:height" content="${esc(String(ogImageHeight))}" />\n    ` : ""}<meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(ogT)}" />
    <meta name="twitter:description" content="${esc(ogD)}" />
    ${ogAbs ? `<meta name="twitter:image" content="${esc(ogAbs)}" />` : ""}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${esc(`${ap}assets/css/site.css`)}" />
    <link rel="stylesheet" href="${esc(`${ap}assets/css/gcv-detail.css`)}" />${cssExtra}${extraHead ? `\n${extraHead}` : ""}`;
}

function headerHtml(ctx) {
  const { locale, pathKey, ap, current } = ctx;
  const S = STRINGS[locale];
  const cur = outRelPath(locale, pathKey);
  const nav = (key, pk, label) => {
    const href = relBetweenSync(cur, outRelPath(locale, pk));
    const isCurrent = current === key;
    return `<a href="${esc(href)}" ${isCurrent ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
  };
  const logoHref = relBetweenSync(cur, outRelPath(locale, ""));
  return `<header class="site-header">
  <div class="header-inner">
    <a class="logo-link" href="${esc(logoHref)}">
      ${picture(
        ap,
        "imagens/logo-guia-chapada-veadeiros-oficial.png",
        "Guia Chapada Veadeiros",
        1024,
        189,
        { eager: true, fetchPriority: "high" },
      )}
    </a>
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav-main">Menu</button>
    <nav class="nav-main" id="nav-main" aria-label="Principal">
      ${nav("home", "", S.nav.home)}
      ${nav("revista", "revista.html", S.nav.revista)}
      ${nav("atrativos", "atrativos.html", S.nav.atrativos)}
      ${nav("contact", "contato.html", S.nav.contact)}
      <a class="nav-search" href="${esc(searchAbsHref(locale))}" aria-label="${esc(S.searchAria)}">⌕</a>
      ${langLinksHtml(locale, pathKey)}
    </nav>
  </div>
</header>`;
}

function footerHtml(ctx) {
  const { locale, pathKey, ap } = ctx;
  const S = STRINGS[locale];
  const F = S.footer;
  const cur = outRelPath(locale, pathKey);
  const contactHref = relBetweenSync(cur, outRelPath(locale, "contato.html"));
  const shopHref = footerShopHref(locale);
  const lodgingHref = footerLodgingHref(locale);
  const brandPic = picture(
    ap,
    "imagens/parque-nacional-guia-chapada-veadeiros-saltos-rio-preto-garimpao.jpg",
    F.nationalParkAlt,
    128,
    96,
  );
  const cadasturPic = picture(
    ap,
    "imagens/cadastur-guia-chapada-dos-veadeiros.jpg",
    F.cadasturAlt,
    400,
    520,
  );
  return `<footer class="site-footer">
  <div class="footer-shell">
    <div class="footer-grid">
      <div class="footer-col footer-col--brand">
        <div class="footer-brand-thumb">${brandPic}</div>
        <h2 class="footer-tagline-title">${esc(F.taglineTitle)}</h2>
        <p class="footer-tagline-body">${esc(F.taglineBody)}</p>
        <a class="footer-instagram" href="${esc(INSTAGRAM_URL)}" rel="noreferrer" target="_blank">${esc(F.instagramHandle)}</a>
      </div>
      <div class="footer-col footer-col--cadastur">
        <div class="footer-cadastur-img">${cadasturPic}</div>
      </div>
      <nav class="footer-col footer-nav" aria-label="${esc(F.colPlan)}">
        <h3 class="footer-col-title">${esc(F.colPlan)}</h3>
        <a href="${esc(shopHref)}">${esc(F.linkShop)}</a>
        <a href="${esc(lodgingHref)}">${esc(F.linkLodging)}</a>
        <a href="${esc(contactHref)}">${esc(F.linkContact)}</a>
        <a href="${esc(FOOTER_WA_PLAN_URL)}" rel="noreferrer" target="_blank">${esc(F.linkWhatsapp)}</a>
      </nav>
      <div class="footer-col footer-support">
        <h3 class="footer-col-title">${esc(F.colSupport)}</h3>
        <p><strong>${esc(F.whatsappLabel)}</strong> <a href="https://wa.me/${WHATSAPP_PHONE}" rel="noopener noreferrer" target="_blank">${esc(S.contact.phoneDisplay)}</a></p>
        <p><strong>${esc(F.emailLabel)}</strong> <a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a></p>
        <p><strong>${esc(F.baseLabel)}</strong> ${esc(F.baseValue)}</p>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <p class="footer-copyright">${esc(F.copyright)}</p>
  </div>
</footer>`;
}

function wrapPageFixed({ lang, topbar, skipLabel, head, header, main, footer, ap, pageOutRel, extraFooterScripts = "" }) {
  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
${head}
</head>
<body>
  <a class="skip-link" href="#conteudo">${esc(skipLabel)}</a>
  <div class="topbar">${esc(topbar)}</div>
  ${header}
  <main id="conteudo">
${main}
  </main>
  ${footer}
  ${extraFooterScripts}<script src="${esc(publicJsSrc("site.js", pageOutRel))}" defer></script>
</body>
</html>`;
}

/** @param {string} pathKey */
function writePage(locale, pathKey, html) {
  const rel = outRelPath(locale, pathKey);
  const abs = join(ROOT, ...rel.split("/"));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, html, "utf8");
}

/** Carrossel de excursões na home (pt, en, es). */
function homeExcursionsSection(locale) {
  const copy = {
    pt: {
      badge: "Excursões",
      title: "Próximas saídas",
      prev: "Excursão anterior",
      next: "Próxima excursão",
      dots: "Navegação do carrossel de excursões",
    },
    en: {
      badge: "Small-group excursions",
      title: "Upcoming departures",
      prev: "Previous excursion",
      next: "Next excursion",
      dots: "Excursions carousel navigation",
    },
    es: {
      badge: "Excursiones en grupo",
      title: "Próximas salidas",
      prev: "Excursión anterior",
      next: "Próxima excursión",
      dots: "Navegación del carrusel de excursiones",
    },
  };
  const L = copy[locale];
  if (!L) return "";
  return `    <section id="excursoes-junho" class="gcv-excursoes" data-locale="${esc(locale)}" aria-labelledby="gcv-excursoes-heading">
      <script type="application/json" id="gcv-excursoes-payload">${safeJsonLd(EXCURSOES_CAROUSEL_BY_LOCALE)}</script>
      <div class="gcv-excursoes__head">
        <span class="gcv-excursoes__badge">${esc(L.badge)}</span>
        <h2 id="gcv-excursoes-heading" class="gcv-excursoes__title">${esc(L.title)}</h2>
      </div>
      <div class="gcv-excursoes__shell">
        <button type="button" class="gcv-excursoes__nav gcv-excursoes__nav--prev" aria-label="${esc(L.prev)}">
          <i class="ti ti-chevron-left" aria-hidden="true"></i>
        </button>
        <div class="gcv-excursoes__viewport">
          <div class="gcv-excursoes__track">${excursionsCarouselTrackSsrHtml(locale)}</div>
        </div>
        <button type="button" class="gcv-excursoes__nav gcv-excursoes__nav--next" aria-label="${esc(L.next)}">
          <i class="ti ti-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
      <div class="gcv-excursoes__dots" role="tablist" aria-label="${esc(L.dots)}"></div>
    </section>

`;
}

function homeMainHtml(locale, ap) {
  const S = STRINGS[locale];
  const home = S.home;
  const cur = outRelPath(locale, "");
  const slides = HERO_SLIDES[locale];
  const n = slides.length;
  const roleDesc = locale === "en" ? "Carousel" : locale === "es" ? "Carrusel" : "Carrossel";
  const dotsNav =
    locale === "en" ? "Highlight navigation" : locale === "es" ? "Navegación de destacados" : "Navegação dos destaques";

  const slidesHtml = slides
    .map((slide, i) => {
      const anim = buildHeroAnim(slide.title, slide.lead, slide.sub || "");
      const contactHref = relBetweenSync(cur, outRelPath(locale, "contato.html"));
      const plainChip =
        slide.ctaKind === "whatsapp" || slide.ctaKind === "contact" || slide.ctaKind === "none";
      const badgeClass = `gcv-hero-line gcv-hero-badge${plainChip ? " gcv-hero-plain-chip" : ""}`;
      const titleWords = staggerWords(slide.title, anim.titleStartMs, 72);
      const leadWords = staggerWords(slide.lead, anim.leadStartMs, 42);
      const subTrim = (slide.sub || "").trim();
      const subHtml = subTrim ? `<p class="gcv-hero__sub">${staggerWords(subTrim, anim.subStartMs, 42)}</p>` : "";
      const ctaHtml =
        slide.ctaKind === "none"
          ? ""
          : slide.ctaKind === "whatsapp"
            ? `<a class="gcv-hero-line gcv-hero-plain-chip gcv-hero-cta" href="${esc(waUrl(locale))}" target="_blank" rel="noopener noreferrer" style="animation-delay:${anim.ctaStartMs}ms">${WA_SVG}${esc(slide.ctaLabel)}</a>`
            : `<a class="gcv-hero-line gcv-hero-plain-chip gcv-hero-cta" href="${esc(contactHref)}" style="animation-delay:${anim.ctaStartMs}ms">${esc(slide.ctaLabel)}</a>`;

      /** 1.º slide visível no HTML — sem JS (.gcv-hero__slide só ganha opacity com .is-active). */
      const first = i === 0;

      return `<div class="gcv-hero__slide${first ? " is-active" : ""}" data-gcv-hero-slide aria-hidden="${first ? "false" : "true"}">
  ${heroPictureBg(ap, slide.image, true)}
  <div class="gcv-hero__gradient" aria-hidden="true"></div>
  <div class="gcv-hero-overlay-text">
    <span class="${badgeClass}" style="animation-delay:${anim.badgeMs}ms">${esc(slide.badge)}</span>
    <h1>${titleWords}</h1>
    <p class="gcv-hero-lead">${leadWords}</p>
    ${subHtml}
    ${ctaHtml}
  </div>
</div>`;
    })
    .join("\n");

  const dotsHtml = slides
    .map((_, i) => {
      const label =
        locale === "en" ? `Highlight ${i + 1} of ${n}` : locale === "es" ? `Destacado ${i + 1} de ${n}` : `Destaque ${i + 1} de ${n}`;
      const first = i === 0;

      return `<button type="button" class="gcv-hero__dot${first ? " is-active" : ""}" data-gcv-hero-dot role="tab" aria-selected="${first ? "true" : "false"}" aria-label="${esc(
        label,
      )}"></button>`;
    })
    .join("\n");

  const atrativosAllHref = relBetweenSync(cur, outRelPath(locale, "atrativos.html"));
  const featuredCards = HOME_FEATURED[locale]
    .map((item) => {
      const p = HOTSPOTS.find((x) => x.slug === item.slug);
      if (!p) return "";
      const hrefSlug = localeSlugForBase(locale, item.slug);
      const href = relBetweenSync(cur, outRelPath(locale, `atrativos/${hrefSlug}.html`));
      return `<a class="gcv-photo-card" href="${esc(href)}">
  ${picture(ap, p.image, item.title, 640, 400)}
  <span class="gcv-photo-card__grad" aria-hidden="true"></span>
  <span class="gcv-photo-card__tag">${esc(item.label)}</span>
  <div class="gcv-photo-card__caption">
  <h3 class="gcv-card-photo-text gcv-photo-card__title">${esc(item.title)}</h3>
  <p class="gcv-card-photo-text gcv-photo-card__meta">${esc(item.meta)}</p>
  </div>
</a>`;
    })
    .filter(Boolean)
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Guia Chapada dos Veadeiros",
    url: `${SITE_ORIGIN}${locale === "pt" ? "/" : `/${locale}/`}`,
    description: S.seo.homeDesc,
    image: `${SITE_ORIGIN}/assets/img/${HERO_SLIDES[locale][0].image}`,
    areaServed: { "@type": "AdministrativeArea", name: "Chapada dos Veadeiros" },
  };

  const webSiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Guia Chapada Veadeiros",
    url: `${SITE_ORIGIN}${locale === "pt" ? "/" : `/${locale}/`}`,
    inLanguage: S.htmlLang,
    publisher: {
      "@type": "Organization",
      name: "Guia Chapada Veadeiros",
      url: SITE_ORIGIN,
      logo: { "@type": "ImageObject", url: PUBLISHER_LOGO_ABS },
    },
  };

  return `<div class="official-home-shell gcv-page-pad">
  <div class="gcv-home-max">
    <section class="gcv-hero" data-gcv-hero role="region" aria-roledescription="${esc(roleDesc)}">
      <div class="gcv-hero__viewport">
${slidesHtml}
      </div>
      <button type="button" class="gcv-hero__arrow gcv-hero__prev" data-gcv-hero-prev aria-label="${esc(home.heroCarouselPrev)}">‹</button>
      <button type="button" class="gcv-hero__arrow gcv-hero__next" data-gcv-hero-next aria-label="${esc(home.heroCarouselNext)}">›</button>
      <div class="gcv-hero__dots" role="tablist" aria-label="${esc(dotsNav)}">
${dotsHtml}
      </div>
    </section>

${homeExcursionsSection(locale)}
    <section class="gcv-home-card">
      <div class="gcv-home-card__head">
        <div>
          <span class="gcv-chip-orange">${esc(home.featuredChip)}</span>
          <h2 class="gcv-home-featured-title">${esc(home.featuredH2)}</h2>
        </div>
        <a class="gcv-link-cerrado" href="${esc(atrativosAllHref)}">${esc(home.featuredSeeAll)}</a>
      </div>
      <div class="gcv-photo-card-grid">
${featuredCards}
      </div>
    </section>

    ${homeRevistaTeaserHtml(locale, ap, cur)}

    <div class="gcv-map-promo">
      <div>
        <span class="gcv-chip-orange">${esc(home.mapPromoChip)}</span>
        <h2>${esc(home.mapPromoH2)}</h2>
        <p class="gcv-map-promo__lead">${esc(home.mapPromoLead)}</p>
      </div>
      <button type="button" class="gcv-map-trigger" data-gcv-map-open aria-label="${esc(home.mapOpenAria)}">
        ${picture(ap, MAP_IMAGE, home.mapAlt, 1366, 600)}
      </button>
    </div>

    <div id="gcv-map-lightbox" class="gcv-map-lightbox" role="dialog" aria-modal="true" aria-hidden="true" aria-label="${esc(home.mapLightboxAria)}">
      <button type="button" class="gcv-map-lightbox__backdrop" data-gcv-map-close aria-label="${esc(home.mapLightboxClose)}"></button>
      <div class="gcv-map-lightbox__inner">
        ${mapFigureHtml(locale, ap, cur, undefined, "lightbox")}
        <p class="gcv-map-lightbox__mode">${esc(home.mapLightboxHint)}</p>
      </div>
      <button type="button" class="gcv-map-lightbox__close" data-gcv-map-close aria-label="${esc(home.mapLightboxClose)}">×</button>
    </div>

    ${homeInstagramHtml(locale)}
    ${homeReviewsRichHtml(locale, ap)}
  </div>
</div>
<script type="application/ld+json">${safeJsonLd(webSiteLd)}</script>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>`;
}

function contactAcceptLanguage(locale) {
  if (locale === "en") return "en-US,en;q=0.9,pt-BR;q=0.6";
  if (locale === "es") return "es-419,es;q=0.9,pt-BR;q=0.5";
  return "pt-BR,pt;q=0.9,en;q=0.3";
}

function contatoMain(locale, ap) {
  const S = STRINGS[locale];
  const c = S.contact;
  const waHref = `https://wa.me/${WHATSAPP_PHONE}`;
  const acceptLang = contactAcceptLanguage(locale);
  const opts = c.tipoOptions
    .map((o) => {
      const sel = o.value === "orcamento" ? " selected" : "";
      return `<option value="${esc(o.value)}"${sel}>${esc(o.label)}</option>`;
    })
    .join("\n");

  return `<div class="gcv-contact-page">
<article class="gcv-contact-article">
<p class="gcv-contact-kicker">${esc(c.pageKicker)}</p>
<h1 class="gcv-contact-h1">${esc(c.title)}</h1>
<p class="gcv-contact-sub">${esc(c.subtitle)}</p>
<div class="gcv-contact-grid">
<div class="gcv-contact-form-shell">
<h2 class="gcv-contact-form-title">${esc(c.formTitle)}</h2>
<div id="gcv-contact-sent" class="gcv-contact-sent" hidden>
<p class="gcv-contact-sent__title">${esc(c.successTitle)}</p>
<p class="gcv-contact-sent__line">${esc(c.successLine)}</p>
<p class="gcv-contact-sent__thanks">${esc(c.successThanks)}</p>
<div class="gcv-contact-sent__actions">
<button type="button" class="gcv-contact-btn gcv-contact-btn--secondary" id="gcv-contact-sent-reset">${esc(c.clear)}</button>
</div>
</div>
<form id="gcv-contact-form" class="gcv-contact-form" novalidate
  data-endpoint="${esc(CONTACT_POST_URL)}"
  data-locale="${esc(locale)}"
  data-accept-language="${esc(acceptLang)}"
  data-error-prefix="${esc(c.errorPrefix)}"
  data-whatsapp-phone="${esc(WHATSAPP_PHONE)}"
  data-contact-email="${esc(CONTACT_EMAIL)}"
  data-dual-success-title="${esc(c.successTitleDual)}"
  data-dual-success-line="${esc(c.successLineDual)}"
  data-dual-success-thanks="${esc(c.successThanksDual)}"${CONTACT_USE_WEB3FORMS ? `\n  data-contact-provider="web3forms"\n  data-web3forms-access-key="${esc(WEB3FORMS_ACCESS_KEY)}"` : ""}${emitSkipContactApi ? `\n  data-skip-contact-api="true"` : ""}>
<div id="gcv-contact-error" class="gcv-contact-error" role="alert" hidden></div>
<div class="gcv-contact-field">
<label class="gcv-contact-label" for="contato-nome">${esc(c.labelName)}</label>
<input class="gcv-contact-input" id="contato-nome" name="nome" type="text" autocomplete="name" required minlength="2" />
</div>
<div class="gcv-contact-field">
<label class="gcv-contact-label" for="contato-tipo">${esc(c.labelSubject)}</label>
<select class="gcv-contact-input gcv-contact-select" id="contato-tipo" name="tipo" required>
${opts}
</select>
</div>
<div class="gcv-contact-field-row">
<div class="gcv-contact-field">
<label class="gcv-contact-label" for="contato-email">${esc(c.labelEmail)}</label>
<input class="gcv-contact-input" id="contato-email" name="email" type="email" autocomplete="email" placeholder="${esc(c.placeholderEmail)}" />
</div>
<div class="gcv-contact-field">
<label class="gcv-contact-label" for="contato-fone">${esc(c.labelPhone)}</label>
<input class="gcv-contact-input" id="contato-fone" name="telefone" type="tel" autocomplete="tel" placeholder="${esc(c.placeholderPhone)}" />
</div>
</div>
<div class="gcv-contact-field gcv-contact-field--grow">
<label class="gcv-contact-label" for="contato-msg">${esc(c.labelMessage)}</label>
<textarea class="gcv-contact-textarea" id="contato-msg" name="mensagem" required rows="6" minlength="10" maxlength="4000" placeholder="${esc(c.placeholderMessage)}"></textarea>
</div>
<div class="gcv-contact-actions">
<button type="submit" class="gcv-contact-btn gcv-contact-btn--primary" data-label-submit="${esc(c.submit)}" data-label-sending="${esc(c.sending)}">${esc(c.submit)}</button>
<button type="button" class="gcv-contact-btn gcv-contact-btn--secondary" id="gcv-contact-clear">${esc(c.clear)}</button>
</div>
</form>
</div>
<aside class="gcv-contact-aside">
<div>
<p class="gcv-contact-aside__kicker">${esc(c.asideKicker)}</p>
<p class="gcv-contact-aside__lead">${esc(c.asideLead)}</p>
</div>
<ul class="gcv-contact-aside__list">
<li>
<div class="gcv-contact-aside__lbl">${esc(c.asidePhoneLabel)}</div>
<a class="gcv-contact-aside__link" href="${esc(waHref)}" rel="noreferrer" target="_blank">${esc(c.phoneDisplay)}</a>
</li>
<li>
<div class="gcv-contact-aside__lbl">${esc(c.asideEmailLabel)}</div>
<a class="gcv-contact-aside__link" href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>
</li>
</ul>
<div class="gcv-contact-aside__block">
<div class="gcv-contact-aside__lbl">${esc(c.asideAddressLabel)}</div>
<div class="gcv-contact-aside__text">${esc(c.asideAddressValue)}</div>
<div class="gcv-contact-aside__lbl gcv-contact-aside__lbl--spaced">${esc(c.asideMapLabel)}</div>
<div class="gcv-contact-map-wrap">
<iframe class="gcv-contact-map" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(c.mapEmbedSrc)}" title="${esc(c.mapIframeTitle)}"></iframe>
<a class="gcv-contact-map-hit" href="${esc(c.mapExternalHref)}" rel="noreferrer" target="_blank" aria-label="${esc(c.mapOpenFullLabel)}"></a>
</div>
</div>
</aside>
</div>
</article>
</div>`;
}

function revistaHubMain(locale, ap, pathKey) {
  const S = STRINGS[locale];
  const P = S.revistaPage;
  const R = S.revistaHub;
  const cur = outRelPath(locale, pathKey);
  const merged = revistaHubMergedPosts(locale);

  if (merged.length === 0) {
    const cHref = relBetweenSync(cur, outRelPath(locale, ARTICLE_CONTRATAR[locale].path));
    const eHref = relBetweenSync(cur, outRelPath(locale, ARTICLE_EPOCA[locale].path));
    return `<div class="Revista-page">
<header class="Revista-masthead">
<h1 class="Revista-masthead__title">${esc(P.mastheadTitle)}</h1>
<p class="Revista-masthead__sub">${esc(P.mastheadSub)}</p>
</header>
<p class="section-lead">${esc(R.lead)}</p>
<div class="card-grid">
  <article class="card">
    <div class="card-body">
      <h2>${esc(R.cardContratarTitle)}</h2>
      <p>${esc(R.cardContratarLead)}</p>
      <a class="btn btn-primary" href="${esc(cHref)}">${esc(S.nav.revista)} →</a>
    </div>
  </article>
  <article class="card">
    <div class="card-body">
      <h2>${esc(R.cardEpocaTitle)}</h2>
      <p>${esc(R.cardEpocaLead)}</p>
      <a class="btn btn-primary" href="${esc(eHref)}">${esc(S.nav.revista)} →</a>
    </div>
  </article>
</div>
</div>`;
  }

  const [hero, ...rest] = merged;
  const heroPk = revistaPathKey(hero.slug);
  const heroHref = relBetweenSync(cur, outRelPath(locale, heroPk));
  const editorialSlugs = new Set(merged.map((p) => normalizeRevistaSlug(p)));
  const useEssentialTwoUp =
    merged.length === 2 &&
    editorialSlugs.size === 2 &&
    [...editorialSlugs].every((s) => REVISTA_ESSENTIAL_SLUGS.has(s));

  if (useEssentialTwoUp) {
    const pairGrid = merged
      .map((post) => {
        const pk = revistaPathKey(normalizeRevistaSlug(post));
        const href = relBetweenSync(cur, outRelPath(locale, pk));
        return revistaListaCardHtml(post, href, ap, P.chipDefault, locale);
      })
      .join("\n");
    return `<div class="Revista-page">
<header class="Revista-masthead">
<h1 class="Revista-masthead__title">${esc(P.mastheadTitle)}</h1>
<p class="Revista-masthead__sub">${esc(P.mastheadSub)}</p>
</header>
<div class="Revista-editorial-shell">
<div class="Revista-editorial-grid Revista-editorial-grid--2up" aria-label="${esc(P.mastheadTitle)}">
${pairGrid}
</div>
</div>
</div>`;
  }

  const capa = revistaCapaCardHtml(hero, heroHref, ap, P.chipDefault, locale);

  const railCards = rest
    .slice(0, 5)
    .map((post) => {
      const pk = revistaPathKey(normalizeRevistaSlug(post));
      const href = relBetweenSync(cur, outRelPath(locale, pk));
      return revistaListaCardHtml(post, href, ap, P.chipDefault, locale);
    })
    .join("\n");

  let moreSection = "";
  if (rest.length > 5) {
    const strip = rest
      .slice(5, 14)
      .map((post) => {
        const pk = revistaPathKey(normalizeRevistaSlug(post));
        const href = relBetweenSync(cur, outRelPath(locale, pk));
        return revistaListaCardHtml(post, href, ap, P.chipDefault, locale);
      })
      .join("\n");
    const grid =
      rest.length > 14
        ? `<div class="Revista-editorial-grid">
${rest
  .slice(14)
  .map((post) => {
    const pk = revistaPathKey(normalizeRevistaSlug(post));
    const href = relBetweenSync(cur, outRelPath(locale, pk));
    return revistaListaCardHtml(post, href, ap, P.chipDefault, locale);
  })
  .join("\n")}
</div>`
        : "";
    moreSection = `<section class="Revista-more-stories" aria-label="${esc(P.moreStories)}">
<h2 class="Revista-more-stories__h2">${esc(P.moreStories)}</h2>
<div class="Revista-editorial-strip Revista-editorial-strip--3">
${strip}
</div>
${grid}
</section>`;
  }

  return `<div class="Revista-page">
<header class="Revista-masthead">
<h1 class="Revista-masthead__title">${esc(P.mastheadTitle)}</h1>
<p class="Revista-masthead__sub">${esc(P.mastheadSub)}</p>
</header>
<div class="Revista-editorial-shell">
<div class="Revista-editorial-top">
${capa}
<aside class="Revista-editorial-rail" aria-label="${esc(R.title)}">
${railCards}
</aside>
</div>
${moreSection}
</div>
</div>`;
}

function atrativosHubMain(locale, ap, pathKey) {
  const S = STRINGS[locale];
  const home = S.home;
  const A = S.atrativosHub;
  const cur = outRelPath(locale, pathKey);
  const items = attractionIterate(locale);
  const cards = items
    .map(({ h, locSlug, title, lead }) => {
      const href = relBetweenSync(cur, outRelPath(locale, `atrativos/${locSlug}.html`));
      const raw = String(lead || "");
      const meta = raw.length > 100 ? `${raw.slice(0, 97)}…` : raw;
      return `<a class="gcv-photo-card" href="${esc(href)}">
  ${picture(ap, h.image, title, 640, 400)}
  <span class="gcv-photo-card__grad" aria-hidden="true"></span>
  <span class="gcv-photo-card__tag">${esc(home.atrativosPhotoLabel)}</span>
  <div class="gcv-photo-card__caption">
  <h2 class="gcv-card-photo-text gcv-photo-card__title">${esc(title)}</h2>
  <p class="gcv-card-photo-text gcv-photo-card__meta">${esc(meta.toUpperCase())}</p>
  </div>
</a>`;
    })
    .join("\n");

  return `<div class="official-home-shell gcv-page-pad">
  <div class="gcv-home-max">
    <div class="gcv-home-card">
      <div class="gcv-home-card__head">
        <div>
          <span class="gcv-chip-orange">${esc(home.atrativosChip)}</span>
          <h1 class="gcv-home-featured-title">${esc(home.atrativosH1)}</h1>
        </div>
      </div>
      <p class="section-lead" style="margin-top:1rem">${esc(A.lead)}</p>
      <div class="gcv-photo-card-grid">
${cards}
      </div>
    </div>
    <section class="gcv-home-card" aria-label="${esc(home.mapInteractiveTitle)}">
      <span class="gcv-chip-orange">${esc(home.mapInteractiveTitle)}</span>
      <p class="section-lead" style="margin-top:0.75rem;color:#475569">${esc(home.mapEmbeddedLead)}</p>
      <div class="gcv-map-shell__inner" style="margin-top:1.25rem">
        ${mapFigureHtml(locale, ap, cur, undefined, "embedded")}
      </div>
    </section>
  </div>
</div>`;
}

function atrativoDetailMain(locale, localeSlug, ap, pathKey) {
  const base = baseSlugFromLocaleSlug(locale, localeSlug);
  const p = HOTSPOTS.find((x) => x.slug === base);
  if (!p) return "";
  const cms = getCmsAttraction(locale, base);
  const S = STRINGS[locale];
  const cur = outRelPath(locale, pathKey);
  const contatoHref = relBetweenSync(cur, outRelPath(locale, "contato.html"));
  const title = cms?.title ?? p.title[locale];
  const metaDesc =
    (cms?.seoDescription && String(cms.seoDescription).trim()) ||
    (cms?.excerpt && String(cms.excerpt).trim()) ||
    p.lead[locale];

  const rawContent = stripScripts(cms?.content ?? "");
  const firstImage = extractFirstImage(rawContent);
  const rawDetailImage =
    (cms?.featuredImage && String(cms.featuredImage).trim()) ||
    DETAIL_IMAGE_BY_SLUG[base] ||
    firstImage?.src;
  const detailRel = toPublicAssetRel(rawDetailImage);
  const detailImgHref = detailRel ? `${ap}assets/img/${detailRel}` : null;
  const detailImgAlt = (firstImage?.alt && String(firstImage.alt).trim()) || title;

  const galleryItems = ATTRACTION_GALLERIES[base];
  const hasManifestGallery = Array.isArray(galleryItems) && galleryItems.length > 0;

  let mainColumnHtml = "";

  if (rawContent.trim()) {
    const detailBody = prepareDetailContent(rawContent, firstImage?.tag);
    const detailParts = splitDetailContent(detailBody);
    let mainHtml = rewriteHtmlMediaUrls(detailParts.mainContent);
    if (hasManifestGallery) {
      mainHtml = stripLegacyFusionGalleryFromHtml(mainHtml);
    }
    mainHtml = fixAttractionActionHrefs(mainHtml, contatoHref);
    mainHtml = htmlWithStaticAssetPrefix(mainHtml, ap);

    let ctaHtml = detailParts.ctaHtml;
    ctaHtml = fixAttractionActionHrefs(ctaHtml, contatoHref);
    ctaHtml = rewriteHtmlMediaUrls(ctaHtml);
    ctaHtml = htmlWithStaticAssetPrefix(ctaHtml, ap);

    const sidebarLines = getSidebarLines(detailParts.sidebarInfo);
    const sidebarLinesHtml = sidebarLines.map(sidebarInfoLineHtml).join("\n");
    const excerptText = (cms?.excerpt && String(cms.excerpt).trim()) || "";

    const hasSidebarColumn =
      Boolean(detailImgHref) || Boolean(ctaHtml) || sidebarLines.length > 0;

    if (hasSidebarColumn) {
      mainColumnHtml = `<section class="gcv-detail-layout">
  <aside class="gcv-detail-sidebar">
    ${detailImgHref ? `<img src="${esc(detailImgHref)}" alt="${esc(detailImgAlt)}" class="gcv-detail-main-image" loading="eager" />` : ""}
    ${ctaHtml ? `<div class="gcv-detail-cta">${ctaHtml}</div>` : ""}
    ${sidebarLinesHtml ? `<div class="gcv-detail-info">${sidebarLinesHtml}</div>` : ""}
    ${excerptText ? `<p class="gcv-detail-excerpt">${esc(excerptText)}</p>` : ""}
  </aside>
  <div class="gcv-detail-content">${mainHtml}</div>
</section>`;
    } else {
      mainColumnHtml = `<section class="gcv-detail-layout gcv-detail-layout--full">
  <div class="gcv-detail-full-main">
    ${excerptText ? `<p class="gcv-detail-excerpt">${esc(excerptText)}</p>` : ""}
    <div class="gcv-detail-content gcv-detail-content--wide">${mainHtml}</div>
  </div>
</section>`;
    }
  } else {
    const excerptText = (cms?.excerpt && String(cms.excerpt).trim()) || p.lead[locale];
    const fallbackBody = `<p>${esc(p.lead[locale])}</p>`;
    if (detailImgHref) {
      mainColumnHtml = `<section class="gcv-detail-layout">
  <aside class="gcv-detail-sidebar">
    <img src="${esc(detailImgHref)}" alt="${esc(detailImgAlt)}" class="gcv-detail-main-image" loading="eager" />
    <p class="gcv-detail-excerpt">${esc(excerptText)}</p>
  </aside>
  <div class="gcv-detail-content">${fallbackBody}</div>
</section>`;
    } else {
      mainColumnHtml = `<section class="gcv-detail-layout gcv-detail-layout--full">
  <div class="gcv-detail-full-main">
    <p class="gcv-detail-excerpt">${esc(excerptText)}</p>
    <div class="gcv-detail-content gcv-detail-content--wide">${fallbackBody}</div>
  </div>
</section>`;
    }
  }

  const gal = attractionPhotoGalleryHtml(locale, ap, base, title);
  const heroImgRel = detailRel || p.image;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: title,
    description: metaDesc,
    image: `${SITE_ORIGIN}/assets/img/${heroImgRel}`,
    url: `${SITE_ORIGIN}${localePathToUrl(locale, `atrativos/${localeSlug}.html`)}`,
  };

  return `<article class="gcv-detail-page">
  <div class="gcv-detail-inner">
    <header class="gcv-detail-title">
      <h1>${esc(title)}</h1>
    </header>
    ${mainColumnHtml}
    ${gal}
    <section class="gcv-detail-region-map" aria-label="${esc(S.home.mapInteractiveTitle)}">
      <h2 class="gcv-detail-region-map__title">${esc(S.home.mapInteractiveTitle)}</h2>
      <p class="gcv-detail-region-map__lead">${esc(S.home.mapEmbeddedLead)}</p>
      ${mapFigureHtml(locale, ap, cur, localeSlug, "embedded")}
    </section>
  </div>
</article>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>`;
}

function seasonTable(locale) {
  const thMonth = locale === "pt" ? "Mês" : locale === "en" ? "Month" : "Mes";
  const thNote = locale === "pt" ? "Resumo" : locale === "en" ? "Summary" : "Resumen";
  const rows = SEASON_ROWS.map((row) => {
    const m = MONTH_NAME[row.monthKey];
    const badge = BADGE_LABEL[locale][row.badge];
    return `<tr>
  <td>${esc(m[locale])} ${row.ico}</td>
  <td><span class="pill">${esc(badge)}</span> ${"★".repeat(row.stars)}</td>
  <td>${esc(row.text[locale])}</td>
</tr>`;
  }).join("\n");
  return `<table class="season">
  <thead><tr><th>${esc(thMonth)}</th><th>${esc(locale === "pt" ? "Perfil" : locale === "en" ? "Profile" : "Perfil")}</th><th>${esc(thNote)}</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function articleContratarMain(locale, ap, pathKey) {
  const A = ARTICLE_CONTRATAR[locale];
  const cur = outRelPath(locale, pathKey);
  const back = relBetweenSync(cur, outRelPath(locale, "revista.html"));
  const S = STRINGS[locale];
  const heroImg = "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: A.title,
    description: A.desc,
    inLanguage: STRINGS[locale].htmlLang,
    image: `${SITE_ORIGIN}/assets/img/${heroImg}`,
    author: { "@type": "Person", name: "Diego Navi" },
  };
  return `<article class="prose">
  <p><a href="${esc(back)}">← ${esc(S.nav.revista)}</a></p>
  <h1>${esc(A.title)}</h1>
  ${picture(ap, heroImg, A.title, 1200, 675)}
  ${A.blocks}
  <p><a class="btn btn-primary" href="${esc(waUrl(locale))}">${esc(S.hero.ctaWa)}</a></p>
</article>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>`;
}

function articleEpocaMain(locale, ap, pathKey) {
  const A = ARTICLE_EPOCA[locale];
  const cur = outRelPath(locale, pathKey);
  const back = relBetweenSync(cur, outRelPath(locale, "revista.html"));
  const S = STRINGS[locale];
  const heroImg = "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: A.title,
    description: A.desc,
    inLanguage: STRINGS[locale].htmlLang,
    image: `${SITE_ORIGIN}/assets/img/${heroImg}`,
  };
  return `<article class="prose">
  <p><a href="${esc(back)}">← ${esc(S.nav.revista)}</a></p>
  <h1>${esc(A.title)}</h1>
  ${picture(ap, heroImg, A.title, 1200, 675)}
  ${A.intro}
  ${seasonTable(locale)}
  <p><a class="btn btn-primary" href="${esc(waUrl(locale))}">${esc(S.hero.ctaWa)}</a></p>
</article>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>`;
}

function revistaPostMain(locale, post, ap, pathKey) {
  const S = STRINGS[locale];
  const cur = outRelPath(locale, pathKey);
  const back = relBetweenSync(cur, outRelPath(locale, "revista.html"));
  const contatoHref = relBetweenSync(cur, outRelPath(locale, "contato.html"));
  const heroRel = toPublicAssetRel(post.featuredImage);
  const bodyRaw = post.content ? stripScripts(post.content) : "";
  const bodyHtml = bodyRaw
    ? htmlWithStaticAssetPrefix(
        fixAttractionActionHrefs(rewriteHtmlMediaUrls(bodyRaw), contatoHref),
        ap,
      )
    : "";
  const body = bodyHtml
    ? `<div class="gcv-cms-body prose">${bodyHtml}</div>`
    : `<p>${esc(post.excerpt || "")}</p>`;
  const heroBlock = heroRel
    ? picture(ap, heroRel, post.featuredImageAlt || post.title, 1200, 675)
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt || "",
    inLanguage: S.htmlLang,
    image: heroRel ? `${SITE_ORIGIN}/assets/img/${heroRel}` : undefined,
    author: { "@type": "Person", name: "Diego Navi" },
  };
  if (!jsonLd.image) delete jsonLd.image;
  return `<article class="prose">
  <p><a href="${esc(back)}">← ${esc(S.nav.revista)}</a></p>
  <h1>${esc(post.title)}</h1>
  ${heroBlock}
  ${body}
  <p><a class="btn btn-primary" href="${esc(waUrl(locale))}">${esc(S.hero.ctaWa)}</a></p>
</article>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>`;
}

function renderPage(locale, pathKey, { title, desc, ogImageRel, current, mainHtml, extraCss, ogTitle, ogDesc, extraHead, ogType, ogImageWidth, ogImageHeight, extraFooterScripts }) {
  const outR = outRelPath(locale, pathKey);
  const ap = assetPrefix(outR);
  const head = buildHead({
    title,
    desc,
    locale,
    pathKey,
    ogImageRel,
    ap,
    extraCss,
    ogTitle,
    ogDesc,
    extraHead,
    ogType,
    ogImageWidth,
    ogImageHeight,
  });
  const header = headerHtml({ locale, pathKey, ap, current });
  const footer = footerHtml({ locale, pathKey, ap });
  const S = STRINGS[locale];
  return wrapPageFixed({
    lang: S.htmlLang,
    topbar: S.topbar,
    skipLabel: SKIP_TO_CONTENT[locale],
    head,
    header,
    main: mainHtml,
    footer,
    ap,
    pageOutRel: outR,
    extraFooterScripts,
  });
}

/** --------- run --------- */
const sitemapUrls = [];

if (gcvRelativePublicJsEnv()) {
  console.log("[build] GCV_RELATIVE_JS: scripts com caminhos relativos (bom para file://).");
}

hydrateCmsContratarPostsLiteEnEsOnce();

for (const locale of LOCALES) {
  const pages = [
    { key: "", titleKey: "home", current: "home", main: (l) => homeMainHtml(l, assetPrefix(outRelPath(l, ""))) },
    { key: "contato.html", current: "contact", main: (l) => contatoMain(l, assetPrefix(outRelPath(l, "contato.html"))) },
    { key: "revista.html", current: "revista", main: (l) => revistaHubMain(l, assetPrefix(outRelPath(l, "revista.html")), "revista.html") },
    { key: "atrativos.html", current: "atrativos", main: (l) => atrativosHubMain(l, assetPrefix(outRelPath(l, "atrativos.html")), "atrativos.html") },
  ];

  for (const p of pages) {
    const pk = p.key;
    const S = STRINGS[locale];
    let title = S.seo.homeTitle;
    let desc = S.seo.homeDesc;
    let og = "imagens/hero-slide-01-guias-locais-cachoeira.png";
    if (pk === "contato.html") {
      title = `${S.contact.title} | Guia Chapada Veadeiros`;
      desc = S.contact.subtitle;
    } else if (pk === "revista.html") {
      title = `${S.revistaPage.seoTitle} | Guia Chapada Veadeiros`;
      desc = S.revistaPage.seoDesc;
    } else if (pk === "atrativos.html") {
      title = `${S.atrativosHub.title} | Guia Chapada Veadeiros`;
      desc = S.atrativosHub.lead;
    }
    const HERO_SLIDE_OG = "imagens/hero-slide-01-guias-locais-cachoeira.png";
    let ogImageWidth;
    let ogImageHeight;
    if (og === HERO_SLIDE_OG) {
      ogImageWidth = 1600;
      ogImageHeight = 900;
    }
    const outPk = outRelPath(locale, pk);
    const homeExcursionsHead =
      (locale === "pt" || locale === "en" || locale === "es") && pk === ""
        ? {
            extraCss: ["assets/css/excursoes.css"],
            extraHead: `    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" crossorigin="anonymous" />`,
            extraFooterScripts: `  <script src="${esc(publicJsSrc("excursoes-carousel.js", outPk))}" defer></script>\n  `,
          }
        : {};
    const html = renderPage(locale, pk, {
      title,
      desc,
      ogImageRel: og,
      ogImageWidth,
      ogImageHeight,
      current: p.current,
      mainHtml: p.main(locale),
      ...homeExcursionsHead,
    });
    writePage(locale, pk || "", html);
    sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
  }

  const revistaBuilt = new Set();
  const posts = CMS?.locales?.[locale]?.postsLite ?? [];
  for (const post of posts) {
    const postSlug = normalizeRevistaSlug(post);
    const pk = revistaPathKey(postSlug);
    revistaBuilt.add(pk);
    const premium =
      locale === "pt" ? premiumRevistaPtBundle(postSlug, premiumRevistaHelpers(locale, pk)) : null;
    if (premium) {
      const html = renderPage(locale, pk, {
        title: premium.fullTitle,
        desc: premium.desc,
        ogImageRel: premium.ogImageRel,
        ogTitle: premium.ogTitle,
        ogDesc: premium.ogDesc,
        ogType: "article",
        extraCss: ["assets/css/gcv-post.css"],
        extraHead: premium.extraHead,
        current: "revista",
        mainHtml: premium.mainHtml,
      });
      writePage(locale, pk, html);
      sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
      continue;
    }
    const slugNorm = postSlug;
    const apPk = assetPrefix(outRelPath(locale, pk));
    /** `cms-generated` repete texto PT em todas as locales para estes slugs — corpo está em ARTICLE_* */
    if (slugNorm === "contratar-guia-local-chapada-veadeiros") {
      const A = ARTICLE_CONTRATAR[locale];
      const html = renderPage(locale, pk, {
        title: `${A.title} | Guia Chapada Veadeiros`,
        desc: A.desc,
        ogImageRel: "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
        ogType: "article",
        ogTitle: A.title,
        ogDesc: A.desc,
        current: "revista",
        mainHtml: articleContratarMain(locale, apPk, pk),
      });
      writePage(locale, pk, html);
      sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
      continue;
    }
    if (slugNorm === "melhor-epoca-visitar-chapada-dos-veadeiros") {
      const A = ARTICLE_EPOCA[locale];
      const html = renderPage(locale, pk, {
        title: `${A.title} | Guia Chapada Veadeiros`,
        desc: A.desc,
        ogImageRel: "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
        ogType: "article",
        ogTitle: A.title,
        ogDesc: A.desc,
        current: "revista",
        mainHtml: articleEpocaMain(locale, apPk, pk),
      });
      writePage(locale, pk, html);
      sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
      continue;
    }
    const titleSeo = (post.seoTitle && String(post.seoTitle).trim()) || post.title;
    const title = `${titleSeo} | Guia Chapada Veadeiros`;
    let desc = ((post.seoDescription && String(post.seoDescription).trim()) || post.excerpt || "").trim();
    if (desc.length > 300) desc = `${desc.slice(0, 297)}…`;
    const og = toPublicAssetRel(post.featuredImage) || "imagens/hero-slide-01-guias-locais-cachoeira.png";
    const html = renderPage(locale, pk, {
      title,
      desc,
      ogImageRel: og,
      current: "revista",
      mainHtml: revistaPostMain(locale, post, assetPrefix(outRelPath(locale, pk)), pk),
    });
    writePage(locale, pk, html);
    sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
  }

  const articleFallbacks = [
    {
      key: ARTICLE_CONTRATAR.pt.path,
      main: (l) => articleContratarMain(l, assetPrefix(outRelPath(l, ARTICLE_CONTRATAR.pt.path)), ARTICLE_CONTRATAR.pt.path),
      title: (l) => `${ARTICLE_CONTRATAR[l].title} | Guia Chapada Veadeiros`,
      desc: (l) => ARTICLE_CONTRATAR[l].desc,
      og: "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
    },
    {
      key: ARTICLE_EPOCA.pt.path,
      main: (l) => articleEpocaMain(l, assetPrefix(outRelPath(l, ARTICLE_EPOCA.pt.path)), ARTICLE_EPOCA.pt.path),
      title: (l) => `${ARTICLE_EPOCA[l].title} | Guia Chapada Veadeiros`,
      desc: (l) => ARTICLE_EPOCA[l].desc,
      og: "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
    },
  ];
  for (const af of articleFallbacks) {
    if (revistaBuilt.has(af.key)) continue;
    const pk = af.key;
    const slug = revistaSlugFromPathKey(pk);
    const premium =
      locale === "pt" ? premiumRevistaPtBundle(slug, premiumRevistaHelpers(locale, pk)) : null;
    if (premium) {
      const html = renderPage(locale, pk, {
        title: premium.fullTitle,
        desc: premium.desc,
        ogImageRel: premium.ogImageRel,
        ogTitle: premium.ogTitle,
        ogDesc: premium.ogDesc,
        ogType: "article",
        extraCss: ["assets/css/gcv-post.css"],
        extraHead: premium.extraHead,
        current: "revista",
        mainHtml: premium.mainHtml,
      });
      writePage(locale, pk, html);
      sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
      continue;
    }
    const html = renderPage(locale, pk, {
      title: af.title(locale),
      desc: af.desc(locale),
      ogImageRel: af.og,
      current: "revista",
      mainHtml: af.main(locale),
    });
    writePage(locale, pk, html);
    sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
  }

  const attractionBases = CMS?.waterfallBaseSlugs?.length ? CMS.waterfallBaseSlugs : HOTSPOTS.map((h) => h.slug);
  for (const base of attractionBases) {
    const hot = HOTSPOTS.find((x) => x.slug === base);
    if (!hot) continue;
    const locSlug = localeSlugForBase(locale, base);
    const pk = `atrativos/${locSlug}.html`;
    const cms = getCmsAttraction(locale, base);
    const pageTitle = cms?.title ?? hot.title[locale];
    const pageDesc =
      (cms?.seoDescription && String(cms.seoDescription).trim()) ||
      (cms?.excerpt && String(cms.excerpt).trim()) ||
      hot.lead[locale];
    const og = toPublicAssetRel(cms?.featuredImage) || hot.image;
    const html = renderPage(locale, pk, {
      title: `${pageTitle} | Guia Chapada Veadeiros`,
      desc: pageDesc,
      ogImageRel: og,
      current: "atrativos",
      mainHtml: atrativoDetailMain(locale, locSlug, assetPrefix(outRelPath(locale, pk)), pk),
    });
    writePage(locale, pk, html);
    sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
  }
}

/** Páginas estáticas feitas à mão (não passam pelo template do build) — garantir URL no sitemap. */
const SITEMAP_STATIC_REVISTA_PATHS = [
  "revista/ataque-onca-parda-chapada-veadeiros.html",
  "revista/roteiro-4-dias-chapada-dos-veadeiros.html",
];
for (const locale of LOCALES) {
  for (const pk of SITEMAP_STATIC_REVISTA_PATHS) {
    sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pk)}`);
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(sitemapUrls)]
  .sort()
  .map((loc) => `  <url><loc>${esc(loc)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
  .join("\n")}
</urlset>`;
writeFileSync(join(ROOT, "sitemap.xml"), sitemap, "utf8");

writeFileSync(
  join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
  "utf8",
);

console.log("Build OK:", ROOT);
console.log("Páginas:", sitemapUrls.length, "URLs no sitemap");

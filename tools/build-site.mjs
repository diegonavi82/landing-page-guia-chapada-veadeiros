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
import { excursaoPayloadForSite, excursaoRowsForLocale } from "./excursoes-carousel-data.mjs";
import { excursionsCarouselTrackSsrHtml } from "./excursoes-carousel-ssr.mjs";
import { guiaProfilesForSite } from "./excursoes-guides-profiles.mjs";
import { rewriteHtmlMediaUrls, htmlWithStaticAssetPrefix, toPublicAssetRel } from "./media-url.mjs";
import {
  extractFirstImage,
  prepareDetailContent,
  splitDetailContent,
  stripLegacyFusionGalleryFromHtml,
  getSidebarLines,
  fixAttractionActionHrefs,
  rewriteGuideLocalCtaToWhatsApp,
} from "./detail-content.mjs";
import { premiumRevistaPtBundle, revistaSlugFromPathKey } from "./gcv-premium-revista-pt.mjs";
import {
  filterEligibleGoogleReviews,
  pickRandomReviews,
  writeGoogleReviewsAsset,
} from "./google-reviews.mjs";
import {
  resolveInstagramFeedForBuild,
  writeInstagramPoolAsset,
  INSTAGRAM_HOME_DISPLAY_COUNT,
  INSTAGRAM_HOME_DISPLAY_COUNT_MOBILE,
} from "./instagram-feed.mjs";
import { assembleBuildProd, BUILD_PROD_DIR } from "./assemble-build-prod.mjs";
import {
  PILLAR_ORDER,
  PILLAR_CONTENT,
  getPillarContent,
  getSatellitesForPillar,
  getPrimaryPillarForPage,
  getRelatedPages,
  pillarPathKey,
  resolveSatelliteMeta,
} from "./seo-cluster.mjs";
import {
  buildRobotsTxt,
  buildUrlsetXml,
  buildSitemapIndexXml,
  buildRssFeed,
  breadcrumbNavHtml,
  breadcrumbListJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
  travelAgencyJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  collectionPageJsonLd,
  touristAttractionJsonLd,
  seoExtraHeadMeta,
  relatedPagesHtml,
  pillarContextLinkHtml,
  isoDateNow,
  rssPubDate,
} from "./seo-enhancements.mjs";

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

/** Ícone nos resultados de busca / aba — caminhos relativamente a `/assets/img/`. */
const FAVICON_REL = (process.env.FAVICON_REL || "imagens/favicon.png").replace(/^\//, "");
const FAVICON_48_REL = (process.env.FAVICON_48_REL || "imagens/favicon-48x48.png").replace(/^\//, "");
const FAVICON_96_REL = (process.env.FAVICON_96_REL || "imagens/favicon-96x96.png").replace(/^\//, "");

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

/** CSS com o mesmo `?v=` do JS para evitar HTML novo + folha antiga em cache (ex.: grid Instagram). */
function publicCssSrc(file, pageOutRelPath) {
  const name = String(file || "").trim().replace(/^\//, "");
  const q = BUILD_ASSET_QUERY;
  const ap = pageOutRelPath != null ? assetPrefix(pageOutRelPath) : "./";
  return `${ap}assets/css/${name}${q}`;
}

/** JSON em `assets/data/` — URL absoluta na raiz (como `site.js`) para não quebrar em `/en/` etc. */
function publicDataSrc(file, pageOutRelPath) {
  const name = String(file || "").trim().replace(/^\//, "");
  const q = BUILD_ASSET_QUERY;
  const prefixSegment = sitePathSegmentsTrimmed();
  if (prefixSegment) {
    const raw = `/${prefixSegment}/assets/data/${name}${q}`;
    return raw.replace(/\/{2,}/g, "/");
  }
  if (gcvRelativePublicJsEnv()) {
    const ap = pageOutRelPath != null ? assetPrefix(pageOutRelPath) : "./";
    return `${ap}assets/data/${name}${q}`;
  }
  return `/assets/data/${name}${q}`;
}

function plainTextFromHtml(html, maxLen = 5000) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function textFromStaticHtmlFile(relPath) {
  const abs = join(ROOT, ...relPath.split("/"));
  if (!existsSync(abs)) return "";
  const html = readFileSync(abs, "utf8");
  const mainMatch = html.match(/<main[^>]*id="conteudo"[^>]*>([\s\S]*?)<\/main>/i);
  return plainTextFromHtml(mainMatch?.[1] || "", 5000);
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

function floatWaHtml(locale) {
  const home = STRINGS[locale].home;
  const msg = home.floatWaMessage || STRINGS.pt.home.floatWaMessage;
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`;
  return `<a class="gcv-float-wa" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(home.floatWaAria)}">${WA_SVG.replace('class="gcv-hero-wa-icon"', "")}</a>`;
}

function attractionGuideWaUrl(pageTitle) {
  const title = String(pageTitle || "").trim();
  const msg = `*Guia Chapada Veadeiros - Passeio para ${title}*`;
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(msg)}`;
}

function getCmsAttraction(locale, baseSlug) {
  const pages = CMS?.locales?.[locale]?.attractionPages;
  if (!pages) return null;
  return pages.find((p) => p.baseSlug === baseSlug) ?? null;
}

/** Nome do atrativo sempre em português (títulos exibidos e SEO de página). */
function attractionDisplayTitle(baseSlug, h = null) {
  const hot = h ?? HOTSPOTS.find((x) => x.slug === baseSlug);
  if (!hot) return "";
  const cmsPt = getCmsAttraction("pt", baseSlug);
  return cmsPt?.title ?? hot.title.pt;
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
        const title = attractionDisplayTitle(base, h);
        const lead = (cms?.excerpt && String(cms.excerpt).trim()) || h.lead[locale];
        return { h, base, locSlug, title, lead, cms };
      })
      .filter(Boolean);
  }
  return [...HOTSPOTS]
    .sort((a, b) => a.title.pt.localeCompare(b.title.pt, "pt-BR", { sensitivity: "base" }))
    .map((h) => ({
      h,
      base: h.slug,
      locSlug: h.slug,
      title: attractionDisplayTitle(h.slug, h),
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

const RELATED_LABELS = {
  pt: { title: "Conteúdo relacionado", pillarPrefix: "Parte do guia:" },
  en: { title: "Related content", pillarPrefix: "Part of the guide:" },
  es: { title: "Contenido relacionado", pillarPrefix: "Parte de la guía:" },
};

const PILLAR_NAV_LABEL = {
  pt: "Guias temáticos",
  en: "Topic guides",
  es: "Guías temáticas",
};

const BUILD_LASTMOD = isoDateNow();
const RSS_ITEMS = [];

/** @type {Map<string, { pathKey: string; priority: number; changefreq: string; ogImageRel?: string; title?: string }>} */
const SITEMAP_REGISTRY = new Map();

function seoClusterCtx() {
  return {
    HOTSPOTS,
    ARTICLE_CONTRATAR,
    ARTICLE_EPOCA,
    ARTICLE_ROTEIRO: ARTICLE_ROTEIRO_4_DIAS,
    ARTICLE_ONCA: ARTICLE_ONCA_PARDA,
    STRINGS,
    localeSlugForBase,
  };
}

function registerSitemap(pathKey, meta) {
  const key = pathKey || "";
  SITEMAP_REGISTRY.set(key, { pathKey: key, ...meta });
}

function noteSitemapUrl(locale, pathKey, meta = {}) {
  const key = pathKey || "";
  sitemapUrls.push(`${SITE_ORIGIN}${localePathToUrl(locale, pathKey)}`);
  const prev = SITEMAP_REGISTRY.get(key);
  if (!prev || (meta.priority != null && meta.priority > (prev.priority ?? 0))) {
    registerSitemap(key, { ...prev, ...meta, pathKey: key });
  }
}

function writeAdvancedSitemapsAndFeed() {
  /** @type {Record<string, { loc: string; lastmod: string; changefreq: string; priority: number; alternates: { hreflang: string; href: string }[]; images?: { loc: string; title?: string }[] }[]>} */
  const buckets = { pages: [], atrativos: [], revista: [], guia: [] };

  for (const [pathKey, meta] of SITEMAP_REGISTRY) {
    const bucket = sitemapBucket(pathKey);
    const ptLoc = `${SITE_ORIGIN}${localePathToUrl("pt", pathKey)}`;
    const alternates = [
      ...LOCALES.map((loc) => ({
        hreflang: STRINGS[loc].htmlLang,
        href: `${SITE_ORIGIN}${localePathToUrl(loc, pathKey)}`,
      })),
      { hreflang: "x-default", href: ptLoc },
    ];
    const entry = {
      loc: ptLoc,
      lastmod: BUILD_LASTMOD,
      changefreq: meta.changefreq || "weekly",
      priority: meta.priority ?? 0.8,
      alternates,
      images: meta.ogImageRel
        ? [{ loc: `${SITE_ORIGIN}/assets/img/${meta.ogImageRel.replace(/^\//, "")}`, title: meta.title }]
        : undefined,
    };
    buckets[bucket].push(entry);
  }

  const sitemapFiles = [
    { name: "sitemap-pages.xml", bucket: "pages" },
    { name: "sitemap-atrativos.xml", bucket: "atrativos" },
    { name: "sitemap-revista.xml", bucket: "revista" },
    { name: "sitemap-guia.xml", bucket: "guia" },
  ];

  for (const { name, bucket } of sitemapFiles) {
    const entries = buckets[bucket].sort((a, b) => a.loc.localeCompare(b.loc));
    if (entries.length === 0) continue;
    writeFileSync(join(ROOT, name), buildUrlsetXml(entries), "utf8");
  }

  const allEntries = Object.values(buckets).flat().sort((a, b) => a.loc.localeCompare(b.loc));
  writeFileSync(join(ROOT, "sitemap-all.xml"), buildUrlsetXml(allEntries), "utf8");

  const indexSitemaps = sitemapFiles
    .filter(({ bucket }) => buckets[bucket].length > 0)
    .map(({ name }) => ({ loc: `${SITE_ORIGIN}/${name}`, lastmod: BUILD_LASTMOD }));

  writeFileSync(
    join(ROOT, "sitemap.xml"),
    buildSitemapIndexXml(
      SITE_ORIGIN,
      indexSitemaps.length > 0 ? indexSitemaps : [{ loc: `${SITE_ORIGIN}/sitemap-all.xml`, lastmod: BUILD_LASTMOD }],
    ),
    "utf8",
  );

  writeFileSync(join(ROOT, "robots.txt"), buildRobotsTxt(SITE_ORIGIN), "utf8");

  const rssSorted = RSS_ITEMS.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  writeFileSync(join(ROOT, "feed.xml"), buildRssFeed(SITE_ORIGIN, rssSorted), "utf8");
  console.log("[build] SEO: sitemap index,", allEntries.length, "URLs · RSS", rssSorted.length, "itens");
}

function sitemapBucket(pathKey) {
  if (pathKey.startsWith("guia/")) return "guia";
  if (pathKey.startsWith("atrativos/")) return "atrativos";
  if (pathKey.startsWith("revista/")) return "revista";
  return "pages";
}

function globalJsonLdScripts(locale) {
  const S = STRINGS[locale];
  const org = organizationJsonLd(SITE_ORIGIN, PUBLISHER_LOGO_ABS);
  const site = webSiteJsonLd(SITE_ORIGIN, locale, S.htmlLang, `${SITE_ORIGIN}/`);
  return `<script type="application/ld+json">${safeJsonLd(org)}</script>
<script type="application/ld+json">${safeJsonLd(site)}</script>`;
}

function buildBreadcrumbs(locale, pathKey, items) {
  const cur = outRelPath(locale, pathKey);
  const navItems = items.map((item) => ({
    label: item.label,
    href: item.pathKey != null ? relBetweenSync(cur, outRelPath(locale, item.pathKey)) : undefined,
  }));
  const ldItems = items.map((item) => ({
    name: item.label,
    url: item.pathKey != null ? localePathToUrl(locale, item.pathKey) : undefined,
  }));
  return {
    html: breadcrumbNavHtml(navItems, esc),
    jsonLd: breadcrumbListJsonLd(ldItems, SITE_ORIGIN),
  };
}

function renderRelatedBlock(pageId, locale, pathKey) {
  const related = getRelatedPages(pageId, locale, seoClusterCtx(), 4);
  if (!related.length) return "";
  const cur = outRelPath(locale, pathKey);
  const labels = RELATED_LABELS[locale];
  return relatedPagesHtml(
    related.map((r) => ({
      href: relBetweenSync(cur, outRelPath(locale, r.pathKey)),
      title: r.title,
      desc: r.desc,
    })),
    { esc, labels },
  );
}

function renderPillarContextLink(locale, pathKey, pageId) {
  const pillarSlug = getPrimaryPillarForPage(pageId);
  if (!pillarSlug) return "";
  const content = getPillarContent(pillarSlug, locale);
  if (!content) return "";
  const cur = outRelPath(locale, pathKey);
  const href = relBetweenSync(cur, outRelPath(locale, pillarPathKey(pillarSlug)));
  return pillarContextLinkHtml({
    esc,
    href,
    label: content.title,
    prefix: RELATED_LABELS[locale].pillarPrefix,
  });
}

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

const INSTAGRAM_ICON_SVG = `<svg class="gcv-instagram-logo" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;

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
      const spotTitle = spot.title.pt;
      return `<a href="${esc(href)}" class="${cls}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;" aria-label="${esc(spotTitle)}" title="${esc(spotTitle)}"></a>`;
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

function instagramGridCellsHtml(posts, ap, openOnIg) {
  return posts
    .map((p) => {
      const imgSrc = `${ap}assets/img/${String(p.image).replace(/^\//, "")}`;
      return `  <li class="gcv-instagram-grid__cell">
    <a class="gcv-instagram-grid__link" href="${esc(p.permalink)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(openOnIg)}">
      <img class="gcv-instagram-grid__img" src="${esc(imgSrc)}" alt="${esc(p.alt || "")}" width="400" height="400" loading="lazy" decoding="async" />
      <span class="gcv-instagram-grid__shade" aria-hidden="true">${INSTAGRAM_ICON_SVG}</span>
    </a>
  </li>`;
    })
    .join("\n");
}

function homeInstagramHtml(locale, ap, posts) {
  const home = STRINGS[locale].home;
  const pool = Array.isArray(posts) ? posts : [];
  const hasFeed = pool.length > 0;
  const openOnIg =
    locale === "en" ? "Open on Instagram" : locale === "es" ? "Abrir en Instagram" : "Abrir no Instagram";
  const pickCount =
    pool.length >= INSTAGRAM_HOME_DISPLAY_COUNT ? INSTAGRAM_HOME_DISPLAY_COUNT : pool.length;
  const fallback = pool.slice(0, pickCount);
  const poolUrl = publicDataSrc("instagram-pool.json", outRelPath(locale, ""));
  const grid = hasFeed
    ? `<ul
  class="gcv-instagram-grid"
  role="list"
  aria-label="${esc(home.instagramGridAria)}"
  data-gcv-instagram-grid
  data-gcv-instagram-random="1"
  data-gcv-instagram-count="${pickCount || INSTAGRAM_HOME_DISPLAY_COUNT}"
  data-gcv-instagram-count-mobile="${INSTAGRAM_HOME_DISPLAY_COUNT_MOBILE}"
  data-gcv-instagram-pool="${esc(poolUrl)}"
  data-gcv-instagram-asset-base="${esc(`${ap}assets/img/`)}"
  data-gcv-instagram-open-label="${esc(openOnIg)}"
>
${instagramGridCellsHtml(fallback, ap, openOnIg)}
</ul>`
    : "";
  return `<section class="gcv-home-card gcv-home-instagram" data-gcv-instagram-section${hasFeed ? ` data-gcv-instagram-feed="1"` : ""}>
  <div class="gcv-home-instagram__brand">
    <span class="gcv-home-instagram__logo-badge" aria-hidden="true">${INSTAGRAM_ICON_SVG}</span>
    <a class="gcv-instagram-handle" href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">${esc(home.instagramHandle)}</a>
  </div>
  ${grid}
  <p class="gcv-home-instagram__cta-wrap">
    <a class="btn btn-primary" href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">${esc(home.instagramCta)}</a>
  </p>
</section>`;
}

function reviewCardHtml(r, { ap, googleLabel }) {
  const quote = String(r.quote || "").trim();
  const img = r.image ? String(r.image).trim() : "";
  const tour = r.tour ? String(r.tour).trim() : "";
  const avatar = img
    ? `<div class="gcv-review-card__avatar"><img src="${esc(`${ap}assets/img/${img}`)}" alt="${esc(r.name)}" width="80" height="80" loading="lazy" decoding="async" /></div>`
    : `<div class="gcv-review-card__avatar gcv-review-card__avatar--fallback" aria-hidden="true">${esc(String(r.name || "?").charAt(0))}</div>`;
  return `<article class="gcv-review-card">
  <div class="gcv-review-card__head">
    ${avatar}
    <div class="gcv-review-card__meta">
      <p class="gcv-review-card__stars" aria-hidden="true">★★★★★</p>
      <h3 class="gcv-review-card__name">${esc(r.name)}</h3>
      <p class="gcv-review-card__city">${esc(googleLabel)}</p>
      ${tour ? `<p class="gcv-review-card__tour">${esc(tour)}</p>` : ""}
    </div>
  </div>
  <blockquote class="gcv-review-card__quote"><span class="gcv-review-card__quo">“</span>${esc(quote)}<span class="gcv-review-card__quo">”</span></blockquote>
</article>`;
}

function homeReviewsRichHtml(locale, ap, reviewsPool) {
  const home = STRINGS[locale].home;
  const displayCount = Math.min(reviewsPool.displayCount ?? 3, reviewsPool.reviews.length);
  const fallback = pickRandomReviews(reviewsPool.reviews, displayCount);
  const fallbackCards = fallback.map((r) => reviewCardHtml(r, { ap, googleLabel: home.reviewGoogleLabel })).join("\n");
  const poolJson = JSON.stringify(reviewsPool).replace(/</g, "\\u003c");
  const dataUrl = publicDataSrc("google-reviews.json", outRelPath(locale, ""));

  return `<section class="gcv-home-reviews" aria-label="${esc(home.reviewsTitle)}" data-gcv-reviews data-gcv-reviews-count="${displayCount}" data-gcv-reviews-label="${esc(home.reviewGoogleLabel)}" data-gcv-reviews-asset-base="${esc(`${ap}assets/img/`)}">
  <div class="gcv-home-reviews__intro">
    <h2 class="gcv-home-reviews__h2"><span class="gcv-home-reviews__star" aria-hidden="true">★</span> <span class="gcv-home-reviews__h2-main">${esc(home.reviewsTitle)}</span> <span class="gcv-home-reviews__star" aria-hidden="true">★</span></h2>
    <p class="gcv-home-reviews__lead">${esc(home.reviewsLead)}</p>
  </div>
  <script type="application/json" id="gcv-reviews-pool">${poolJson}</script>
  <div class="gcv-review-grid" data-gcv-reviews-grid>
${fallbackCards}
  </div>
  <noscript><p class="gcv-home-reviews__noscript"><a href="${esc(dataUrl)}">Ver todas as avaliações</a></p></noscript>
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
    keywords,
    ogImageAlt,
  } = ctx;
  const ogT = ogTitle ?? title;
  const ogD = ogDesc ?? desc;
  const ogSiteType = ogType || "website";
  const cssExtra = (extraCss || [])
    .map((rel) => `\n    <link rel="stylesheet" href="${esc(`${ap}${rel}`)}" />`)
    .join("");
  const canon = `${SITE_ORIGIN}${localePathToUrl(locale, pathKey)}`.replace(/([^:])\/{2,}/g, "$1/");
  const ogAbs = ogImageRel ? `${SITE_ORIGIN}/assets/img/${ogImageRel.replace(/^\//, "")}` : "";
  const feedUrl = `${SITE_ORIGIN}/feed.xml`;
  const seoExtra = seoExtraHeadMeta({
    esc,
    keywords,
    ogImageAlt: ogImageAlt || ogT,
    ogType: ogSiteType,
    feedUrl,
  });
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
  const favicon48Abs = `${SITE_ORIGIN}/assets/img/${FAVICON_48_REL}`.replace(/([^:])\/{2,}/g, "$1/");
  const favicon96Abs = `${SITE_ORIGIN}/assets/img/${FAVICON_96_REL}`.replace(/([^:])\/{2,}/g, "$1/");
  const faviconIcoAbs = `${SITE_ORIGIN}/favicon.ico`.replace(/([^:])\/{2,}/g, "$1/");
  const faviconMime = /\.svg$/i.test(FAVICON_REL)
    ? "image/svg+xml"
    : /\.ico$/i.test(FAVICON_REL)
      ? "image/x-icon"
      : "image/png";
  const faviconLinkTags =
    faviconMime === "image/png"
      ? `<link rel="icon" href="${esc(faviconIcoAbs)}" sizes="48x48" />
    <link rel="icon" href="${esc(favicon48Abs)}" type="image/png" sizes="48x48" />
    <link rel="icon" href="${esc(favicon96Abs)}" type="image/png" sizes="96x96" />
    <link rel="icon" href="${esc(faviconAbs)}" type="image/png" sizes="192x192" />
    <link rel="apple-touch-icon" href="${esc(faviconAbs)}" sizes="180x180" />`
      : `<link rel="icon" href="${esc(faviconAbs)}" type="${esc(faviconMime)}" />
    <link rel="apple-touch-icon" href="${esc(faviconAbs)}" />`;

  const ogLocale = locale === "pt" ? "pt_BR" : locale === "en" ? "en_US" : "es_ES";
  const ogLocaleAlternate = LOCALES.filter((l) => l !== locale)
    .map((l) => (l === "pt" ? "pt_BR" : l === "en" ? "en_US" : "es_ES"))
    .map((tag) => `    <meta property="og:locale:alternate" content="${esc(tag)}" />`)
    .join("\n");

  return `<meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="theme-color" content="#0f3d2e" />
    ${GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(GOOGLE_SITE_VERIFICATION)}" />\n    ` : ""}${faviconLinkTags}
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${esc(canon)}" />
    ${seoExtra}
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
    <link rel="stylesheet" href="${esc(publicCssSrc("site.css", outRelPath(locale, pathKey)))}" />
    <link rel="stylesheet" href="${esc(publicCssSrc("gcv-detail.css", outRelPath(locale, pathKey)))}" />
    <link rel="stylesheet" href="${esc(publicCssSrc("gcv-seo.css", outRelPath(locale, pathKey)))}" />${cssExtra}${extraHead ? `\n${extraHead}` : ""}`;
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
  const excursoesPathKey = locale === "en" ? "tours.html" : locale === "es" ? "excursiones.html" : "excursoes.html";
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
      ${nav("reservas", "consultar-reserva.html", S.nav.reservas)}
      ${nav("contact", "contato.html", S.nav.contact)}
      <div class="nav-search-wrap" data-gcv-search data-locale="${esc(locale)}" data-page-out="${esc(cur)}" data-search-index="${esc(publicDataSrc("search-index.json", cur))}" data-no-results="${esc(S.searchNoResults)}">
        <button type="button" class="nav-search" aria-label="${esc(S.searchAria)}" aria-expanded="false" aria-controls="nav-search-panel">⌕</button>
        <div class="nav-search-panel" id="nav-search-panel" hidden>
          <input type="search" id="nav-search-input" class="nav-search-input" placeholder="${esc(S.searchPlaceholder)}" autocomplete="off" aria-label="${esc(S.searchInputAria)}" />
          <ul class="nav-search-results" role="listbox" aria-live="polite"></ul>
        </div>
      </div>
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
        <span>${esc(F.linkShop)}</span>
        <span>${esc(F.linkLodging)}</span>
        <a href="${esc(relBetweenSync(cur, outRelPath(locale, "consultar-reserva.html")))}">${esc(S.nav.reservas)}</a>
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

function wrapPageFixed({ lang, topbar, skipLabel, head, header, main, footer, ap, pageOutRel, extraFooterScripts = "", extraAfterFooter = "" }) {
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
  ${extraAfterFooter}${extraFooterScripts}<script src="${esc(publicJsSrc("site.js", pageOutRel))}" defer></script>
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
  if (!excursaoRowsForLocale(locale).length) return "";
  return `    <section id="excursoes-junho" class="gcv-excursoes" data-locale="${esc(locale)}" aria-labelledby="gcv-excursoes-heading">
      <script type="application/json" id="gcv-excursoes-payload">${safeJsonLd(excursaoPayloadForSite())}</script>
      <script type="application/json" id="gcv-guia-profiles">${safeJsonLd(guiaProfilesForSite())}</script>
      <div class="gcv-excursoes__head">
        <span class="gcv-excursoes__badge">${esc(L.badge)}</span>
        <h2 id="gcv-excursoes-heading" class="gcv-excursoes__title">${esc(L.title)}</h2>
      </div>
      <div class="gcv-excursoes__filters-host" id="gcv-excursoes-filters-host"></div>
      <p class="gcv-excursoes__filter-empty" id="gcv-excursoes-filter-empty" hidden></p>
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
    </section>

`;
}

function reservaLookupCopy(locale) {
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  const copy = {
    pt: {
      homeTitle: "Já fez sua reserva?",
      homeLead: "Consulte o status do Pix com o código GCV-XXXXXX e o e-mail usado no checkout.",
      title: "Consultar reserva",
      lead: "Informe o código da reserva (GCV-XXXXXX) e o mesmo e-mail usado no pagamento Pix.",
      code: "Código da reserva",
      email: "E-mail",
      submit: "Consultar",
      recoverToggle: "Não sei meu código — enviar por e-mail",
      recoverBack: "Tenho o código",
      recoverHint: "Enviaremos os códigos de reserva vinculados a este e-mail (se houver).",
      recoverSubmit: "Enviar códigos por e-mail",
      recoverSent: "Se houver reservas neste e-mail, enviamos os códigos em instantes. Verifique também o spam.",
    },
    en: {
      homeTitle: "Already booked?",
      homeLead: "Check your Pix status with code GCV-XXXXXX and the email used at checkout.",
      title: "Look up reservation",
      lead: "Enter your reservation code (GCV-XXXXXX) and the same email used for the Pix payment.",
      code: "Reservation code",
      email: "Email",
      submit: "Look up",
      recoverToggle: "I don't know my code — email it to me",
      recoverBack: "I have the code",
      recoverHint: "We'll email any reservation codes linked to this address (if any exist).",
      recoverSubmit: "Email my codes",
      recoverSent: "If reservations exist for this email, we sent the codes shortly. Check spam too.",
    },
    es: {
      homeTitle: "¿Ya reservó?",
      homeLead: "Consulte el estado del Pix con el código GCV-XXXXXX y el correo usado en el checkout.",
      title: "Consultar reserva",
      lead: "Indique el código de reserva (GCV-XXXXXX) y el mismo correo usado en el pago Pix.",
      code: "Código de reserva",
      email: "Correo electrónico",
      submit: "Consultar",
      recoverToggle: "No sé mi código — enviar por correo",
      recoverBack: "Tengo el código",
      recoverHint: "Enviaremos los códigos de reserva vinculados a este correo (si existen).",
      recoverSubmit: "Enviar códigos por correo",
      recoverSent: "Si hay reservas en este correo, enviamos los códigos en breve. Revise también el spam.",
    },
  };
  return copy[loc];
}

function reservaLookupWidgetHtml(locale, opts = {}) {
  const c = reservaLookupCopy(locale);
  const prefix = opts.idPrefix || "gcv-reserva";
  const codeId = `${prefix}-code`;
  const emailId = `${prefix}-email`;
  const recoverEmailId = `${prefix}-recover-email`;
  return `<div class="gcv-reserva-lookup" data-gcv-reserva-lookup data-locale="${esc(locale)}">
    <form class="gcv-reserva-form gcv-reserva-form--lookup" data-gcv-reserva-form-lookup novalidate>
      <label for="${esc(codeId)}">${esc(c.code)}</label>
      <input id="${esc(codeId)}" name="code" type="text" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="GCV-XXXXXX" pattern="GCV-[A-Z0-9]{6}" />
      <label for="${esc(emailId)}">${esc(c.email)}</label>
      <input id="${esc(emailId)}" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="seu@email.com" />
      <button type="submit" class="gcv-reserva-btn">${esc(c.submit)}</button>
    </form>
    <div class="gcv-reserva-recover">
      <button type="button" class="gcv-reserva-recover__toggle" data-gcv-reserva-toggle-recover>${esc(c.recoverToggle)}</button>
      <form class="gcv-reserva-form gcv-reserva-form--recover" data-gcv-reserva-form-recover hidden novalidate>
        <p class="gcv-reserva-recover__hint">${esc(c.recoverHint)}</p>
        <label for="${esc(recoverEmailId)}">${esc(c.email)}</label>
        <input id="${esc(recoverEmailId)}" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="seu@email.com" />
        <button type="submit" class="gcv-reserva-btn gcv-reserva-btn--secondary">${esc(c.recoverSubmit)}</button>
      </form>
    </div>
    <div class="gcv-reserva-lookup__result" data-gcv-reserva-result aria-live="polite"></div>
  </div>`;
}

function homeReservasSection(locale) {
  const c = reservaLookupCopy(locale);
  return `    <section id="gcv-home-reservas" class="gcv-home-reservas" aria-labelledby="gcv-home-reservas-heading">
      <div class="gcv-home-reservas__card">
        <div class="gcv-home-reservas__head">
          <span class="gcv-chip-orange">${esc(locale === "en" ? "My booking" : locale === "es" ? "Mi reserva" : "Minha reserva")}</span>
          <h2 id="gcv-home-reservas-heading" class="gcv-home-reservas__title">${esc(c.homeTitle)}</h2>
          <p class="gcv-home-reservas__lead">${esc(c.homeLead)}</p>
        </div>
${reservaLookupWidgetHtml(locale, { idPrefix: "gcv-home-reserva" })}
      </div>
    </section>

`;
}

function homeMainHtml(locale, ap, instagramPosts, reviewsPool) {
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
  const featuredPtBySlug = new Map(HOME_FEATURED.pt.map((item) => [item.slug, item]));
  const featuredCards = HOME_FEATURED[locale]
    .map((item) => {
      const p = HOTSPOTS.find((x) => x.slug === item.slug);
      if (!p) return "";
      const displayTitle = featuredPtBySlug.get(item.slug)?.title ?? attractionDisplayTitle(item.slug, p);
      const hrefSlug = localeSlugForBase(locale, item.slug);
      const href = relBetweenSync(cur, outRelPath(locale, `atrativos/${hrefSlug}.html`));
      return `<a class="gcv-photo-card" href="${esc(href)}">
  ${picture(ap, p.image, displayTitle, 640, 400)}
  <span class="gcv-photo-card__grad" aria-hidden="true"></span>
  <span class="gcv-photo-card__tag">${esc(item.label)}</span>
  <div class="gcv-photo-card__caption">
  <h3 class="gcv-card-photo-text gcv-photo-card__title">${esc(displayTitle)}</h3>
  <p class="gcv-card-photo-text gcv-photo-card__meta">${esc(item.meta)}</p>
  </div>
</a>`;
    })
    .filter(Boolean)
    .join("\n");

  const jsonLd = travelAgencyJsonLd(
    SITE_ORIGIN,
    locale,
    S.seo.homeDesc,
    `${SITE_ORIGIN}/assets/img/${HERO_SLIDES[locale][0].image}`,
  );

  const webSiteLd = webSiteJsonLd(SITE_ORIGIN, locale, S.htmlLang, `${SITE_ORIGIN}/`);

  const guiaHubHref = relBetweenSync(cur, outRelPath(locale, pillarPathKey("chapada-dos-veadeiros")));
  const guiaHubLabel =
    locale === "en"
      ? "Complete Chapada dos Veadeiros guide"
      : locale === "es"
        ? "Guía completa de Chapada dos Veadeiros"
        : "Guia completo da Chapada dos Veadeiros";

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

    <section class="gcv-home-card" aria-label="${esc(PILLAR_NAV_LABEL[locale])}">
      <div class="gcv-home-card__head">
        <div>
          <span class="gcv-chip-orange">${esc(PILLAR_NAV_LABEL[locale])}</span>
          <h2 class="gcv-home-featured-title">${esc(guiaHubLabel)}</h2>
        </div>
        <a class="gcv-link-cerrado" href="${esc(guiaHubHref)}">${esc(locale === "en" ? "Read guide" : locale === "es" ? "Leer guía" : "Ler guia")} →</a>
      </div>
      <p class="section-lead" style="margin:0;color:#475569">${esc(locale === "en" ? "Topic clusters on waterfalls, tours, itineraries, ecotourism and local guides — structured for easy discovery." : locale === "es" ? "Clusters temáticos sobre cascadas, excursiones, rutas, ecoturismo y guías locales." : "Clusters temáticos sobre cachoeiras, passeios, roteiros, ecoturismo e guia local — estruturados para descoberta por buscadores e IA.")}</p>
    </section>

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

    ${homeInstagramHtml(locale, ap, instagramPosts)}
    ${homeReviewsRichHtml(locale, ap, reviewsPool)}
  </div>
</div>
<script type="application/ld+json">${safeJsonLd(webSiteLd)}</script>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>
${globalJsonLdScripts(locale)}`;
}

function contactAcceptLanguage(locale) {
  if (locale === "en") return "en-US,en;q=0.9,pt-BR;q=0.6";
  if (locale === "es") return "es-419,es;q=0.9,pt-BR;q=0.5";
  return "pt-BR,pt;q=0.9,en;q=0.3";
}

function confirmacaoMain(locale) {
  const titles = {
    pt: "Confirmação de pagamento",
    en: "Payment confirmation",
    es: "Confirmación de pago",
  };
  const loading = {
    pt: "Carregando confirmação…",
    en: "Loading confirmation…",
    es: "Cargando confirmación…",
  };
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  return `<main id="conteudo">
  <section class="gcv-confirmacao-wrap" style="max-width:640px;margin:2rem auto 3rem;padding:0 1rem">
    <div id="gcv-confirmacao"><p>${esc(loading[loc])}</p></div>
  </section>
</main>`;
}

function consultarReservaMain(locale) {
  const c = reservaLookupCopy(locale);
  return `  <section class="gcv-reserva-page">
    <h1>${esc(c.title)}</h1>
    <p class="gcv-reserva-page__lead">${esc(c.lead)}</p>
${reservaLookupWidgetHtml(locale, { idPrefix: "gcv-reserva" })}
  </section>`;
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
<h1 class="gcv-contact-h1">${esc(c.title)}</h1>
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
  data-contact-email="${esc(CONTACT_EMAIL)}"${CONTACT_USE_WEB3FORMS ? `\n  data-contact-provider="web3forms"\n  data-web3forms-access-key="${esc(WEB3FORMS_ACCESS_KEY)}"` : `\n  data-dual-success-title="${esc(c.successTitleDual)}"\n  data-dual-success-line="${esc(c.successLineDual)}"\n  data-dual-success-thanks="${esc(c.successThanksDual)}"`}${emitSkipContactApi ? `\n  data-skip-contact-api="true"` : ""}>
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

function pillarSubnavHtml(locale, pathKey, currentSlug) {
  const cur = outRelPath(locale, pathKey);
  const links = PILLAR_ORDER.map((slug) => {
    const pk = pillarPathKey(slug);
    const href = relBetweenSync(cur, outRelPath(locale, pk));
    const content = getPillarContent(slug, locale);
    const isCurrent = slug === currentSlug;
    return `<a href="${esc(href)}"${isCurrent ? ' aria-current="page"' : ""}>${esc(content?.title || slug)}</a>`;
  });
  return `<nav class="gcv-pillar-subnav" aria-label="${esc(PILLAR_NAV_LABEL[locale])}">${links.join("\n")}</nav>`;
}

function pillarMainHtml(locale, pillarSlug, ap, pathKey) {
  const content = getPillarContent(pillarSlug, locale);
  if (!content) return "";
  const cur = outRelPath(locale, pathKey);
  const S = STRINGS[locale];
  const ctx = seoClusterCtx();
  const satellites = getSatellitesForPillar(pillarSlug);

  const bc = buildBreadcrumbs(locale, pathKey, [
    { label: S.nav.home, pathKey: "" },
    { label: PILLAR_NAV_LABEL[locale], pathKey: pillarPathKey("chapada-dos-veadeiros") },
    { label: content.title, pathKey: null },
  ]);

  const sectionsHtml = (content.sections || [])
    .map((sec) => `<section><h2>${esc(sec.h2)}</h2><p>${esc(sec.body)}</p></section>`)
    .join("\n");

  const faqHtml =
    content.faq?.length > 0
      ? `<section class="gcv-pillar-faq" aria-labelledby="gcv-pillar-faq-title">
  <h2 id="gcv-pillar-faq-title">${esc(locale === "en" ? "Frequently asked questions" : locale === "es" ? "Preguntas frecuentes" : "Perguntas frequentes")}</h2>
${content.faq
  .map(
    (f) => `<details>
  <summary>${esc(f.q)}</summary>
  <p>${esc(f.a)}</p>
</details>`,
  )
  .join("\n")}
</section>`
      : "";

  const satelliteCards = satellites
    .map((ref) => {
      const meta = resolveSatelliteMeta(ref, locale, ctx);
      if (!meta) return "";
      const href = relBetweenSync(cur, outRelPath(locale, meta.pathKey));
      return `<li><a href="${esc(href)}"><span class="gcv-pillar-satellites__title">${esc(meta.title)}</span><span class="gcv-pillar-satellites__desc">${esc(meta.desc)}</span></a></li>`;
    })
    .filter(Boolean)
    .join("\n");

  const canonUrl = `${SITE_ORIGIN}${localePathToUrl(locale, pathKey)}`;
  const ogAbs = `${SITE_ORIGIN}/assets/img/${content.ogImage}`;

  const itemListItems = satellites
    .map((ref) => resolveSatelliteMeta(ref, locale, ctx))
    .filter(Boolean)
    .map((meta) => ({
      name: meta.title,
      url: `${SITE_ORIGIN}${localePathToUrl(locale, meta.pathKey)}`,
    }));

  const jsonLdBlocks = [
    collectionPageJsonLd(content.h1, content.seoDesc, canonUrl),
    itemListJsonLd(content.title, content.lead, itemListItems),
  ];
  if (content.faq?.length) jsonLdBlocks.push(faqPageJsonLd(content.faq));

  const relatedHtml = renderRelatedBlock(`pillar:${pillarSlug}`, locale, pathKey);

  return `<div class="gcv-pillar-page">
${bc.html}
${pillarSubnavHtml(locale, pathKey, pillarSlug)}
${picture(ap, content.ogImage, content.h1, 1200, 675)}
<h1 class="gcv-pillar-page__h1">${esc(content.h1)}</h1>
<p class="gcv-pillar-page__lead">${esc(content.lead)}</p>
${sectionsHtml}
${faqHtml}
<section class="gcv-pillar-satellites" aria-labelledby="gcv-pillar-satellites-title">
  <h2 id="gcv-pillar-satellites-title" class="gcv-pillar-satellites__h2">${esc(locale === "en" ? "Explore in this guide" : locale === "es" ? "Explora en esta guía" : "Explore neste guia")}</h2>
  <ul class="gcv-pillar-satellites__grid">${satelliteCards}</ul>
</section>
${relatedHtml}
<p style="margin-top:2rem"><a class="btn btn-primary" href="${esc(waUrl(locale))}">${esc(S.hero.ctaWa)}</a></p>
</div>
<script type="application/ld+json">${safeJsonLd(bc.jsonLd)}</script>
${jsonLdBlocks.map((ld) => `<script type="application/ld+json">${safeJsonLd(ld)}</script>`).join("\n")}
<script type="application/ld+json">${safeJsonLd({ "@context": "https://schema.org", "@type": "WebPage", name: content.h1, description: content.seoDesc, url: canonUrl, primaryImageOfPage: ogAbs, inLanguage: S.htmlLang })}</script>
${globalJsonLdScripts(locale)}`;
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
  const title = attractionDisplayTitle(base, p);
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

    const waGuideUrl = esc(attractionGuideWaUrl(title));

    let ctaHtml = detailParts.ctaHtml;
    ctaHtml = fixAttractionActionHrefs(ctaHtml, contatoHref);
    ctaHtml = rewriteHtmlMediaUrls(ctaHtml);
    ctaHtml = htmlWithStaticAssetPrefix(ctaHtml, ap);
    ctaHtml = rewriteGuideLocalCtaToWhatsApp(ctaHtml, waGuideUrl);
    mainHtml = rewriteGuideLocalCtaToWhatsApp(mainHtml, waGuideUrl);

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
  const pageUrl = `${SITE_ORIGIN}${localePathToUrl(locale, `atrativos/${localeSlug}.html`)}`;
  const pageId = `attraction:${base}`;
  const primaryPillar = getPrimaryPillarForPage(pageId);
  const pillarContent = primaryPillar ? getPillarContent(primaryPillar, locale) : null;

  const bc = buildBreadcrumbs(locale, pathKey, [
    { label: S.nav.home, pathKey: "" },
    { label: S.nav.atrativos, pathKey: "atrativos.html" },
    ...(pillarContent ? [{ label: pillarContent.title, pathKey: pillarPathKey(primaryPillar) }] : []),
    { label: title, pathKey: null },
  ]);

  const jsonLd = touristAttractionJsonLd({
    name: title,
    description: metaDesc,
    image: `${SITE_ORIGIN}/assets/img/${heroImgRel}`,
    url: pageUrl,
  });

  const pillarLink = renderPillarContextLink(locale, pathKey, pageId);
  const relatedHtml = renderRelatedBlock(pageId, locale, pathKey);

  return `<article class="gcv-detail-page">
  <div class="gcv-detail-inner">
    ${bc.html}
    ${pillarLink}
    <header class="gcv-detail-title">
      <h1>${esc(title)}</h1>
    </header>
    ${mainColumnHtml}
    ${gal}
    ${relatedHtml}
    <section class="gcv-detail-region-map" aria-label="${esc(S.home.mapInteractiveTitle)}">
      <h2 class="gcv-detail-region-map__title">${esc(S.home.mapInteractiveTitle)}</h2>
      <p class="gcv-detail-region-map__lead">${esc(S.home.mapEmbeddedLead)}</p>
      ${mapFigureHtml(locale, ap, cur, localeSlug, "embedded")}
    </section>
  </div>
</article>
<script type="application/ld+json">${safeJsonLd(bc.jsonLd)}</script>
<script type="application/ld+json">${safeJsonLd(jsonLd)}</script>
${globalJsonLdScripts(locale)}`;
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

function renderPage(locale, pathKey, { title, desc, ogImageRel, current, mainHtml, extraCss, ogTitle, ogDesc, extraHead, ogType, ogImageWidth, ogImageHeight, extraFooterScripts, extraAfterFooter, keywords, ogImageAlt }) {
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
    keywords,
    ogImageAlt,
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
    extraAfterFooter,
  });
}

function collectSearchEntries(locale) {
  const S = STRINGS[locale];
  /** @type {{ title: string; pathKey: string; desc: string; body: string; text: string }[]} */
  const entries = [];
  const seen = new Set();

  const add = (title, pathKey, desc = "", body = "") => {
    const key = pathKey || "__home__";
    if (seen.has(key)) return;
    seen.add(key);
    const cleanTitle = String(title || "").trim();
    const cleanDesc = String(desc || "").trim();
    const cleanBody = String(body || "").trim();
    entries.push({
      title: cleanTitle,
      pathKey,
      desc: cleanDesc,
      body: cleanBody,
      text: [cleanTitle, cleanDesc, cleanBody].filter(Boolean).join(" "),
    });
  };

  add(S.nav.home, "", S.seo.homeDesc);
  add(S.nav.revista, "revista.html", S.revistaPage.seoDesc);
  add(S.atrativosHub.title, "atrativos.html", S.atrativosHub.seoDesc);
  add(S.contact.title, "contato.html", S.contact.subtitle);

  for (const item of attractionIterate(locale)) {
    const cms = item.cms;
    const body = plainTextFromHtml(stripScripts(cms?.content ?? ""), 5000);
    add(item.title, `atrativos/${item.locSlug}.html`, item.lead, body);
  }

  const contratar = ARTICLE_CONTRATAR[locale];
  add(contratar.title, contratar.path, contratar.desc, plainTextFromHtml(contratar.blocks || ""));

  const epoca = ARTICLE_EPOCA[locale];
  const epocaBody = [
    plainTextFromHtml(epoca.intro || ""),
    ...SEASON_ROWS.map((row) => row.text[locale]),
  ].join(" ");
  add(epoca.title, epoca.path, epoca.desc, epocaBody);

  for (const A of [ARTICLE_ROTEIRO_4_DIAS, ARTICLE_ONCA_PARDA]) {
    const art = A[locale];
    if (!art?.path) continue;
    const rel = outRelPath(locale, art.path);
    add(art.title, art.path, art.desc || "", textFromStaticHtmlFile(rel));
  }

  for (const slug of PILLAR_ORDER) {
    const pk = pillarPathKey(slug);
    const content = getPillarContent(slug, locale);
    if (content) add(content.title, pk, content.seoDesc, [content.lead, ...(content.sections || []).map((s) => s.body)].join(" "));
  }

  const posts = CMS?.locales?.[locale]?.postsLite ?? [];
  const revistaBuilt = new Set();
  for (const post of posts) {
    const slug = normalizeRevistaSlug(post);
    const pk = revistaPathKey(slug);
    revistaBuilt.add(pk);
    const desc = ((post.seoDescription && String(post.seoDescription).trim()) || post.excerpt || "").trim();
    const title = (post.title && String(post.title).trim()) || (post.seoTitle && String(post.seoTitle).trim()) || slug;
    const body = plainTextFromHtml(stripScripts(post.content ?? ""), 5000);
    add(title, pk, desc, body);
  }

  for (const A of [ARTICLE_CONTRATAR, ARTICLE_EPOCA]) {
    const pk = A.pt.path;
    if (!revistaBuilt.has(pk)) {
      const art = A[locale];
      const extraBody =
        A === ARTICLE_CONTRATAR
          ? plainTextFromHtml(art.blocks || "")
          : [plainTextFromHtml(art.intro || ""), ...SEASON_ROWS.map((row) => row.text[locale])].join(" ");
      add(art.title, pk, art.desc || "", extraBody);
    }
  }

  return entries;
}

function writeSearchIndexAsset() {
  const index = {};
  for (const locale of LOCALES) {
    index[locale] = collectSearchEntries(locale);
  }
  const out = join(ROOT, "assets", "data", "search-index.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(index), "utf8");
  const total = Object.values(index).reduce((n, list) => n + list.length, 0);
  console.log("[build] search-index:", out, total, "entries");
}

/** --------- run --------- */
const sitemapUrls = [];

if (gcvRelativePublicJsEnv()) {
  console.log("[build] GCV_RELATIVE_JS: scripts com caminhos relativos (bom para file://).");
}

hydrateCmsContratarPostsLiteEnEsOnce();

const INSTAGRAM_FEED_POSTS = await resolveInstagramFeedForBuild();
if (INSTAGRAM_FEED_POSTS.length > 0) {
  writeInstagramPoolAsset(INSTAGRAM_FEED_POSTS);
  console.log(
    "[build] Instagram: pool com",
    INSTAGRAM_FEED_POSTS.length,
    "posts;",
    "home 3×3 mobile / 4×4 desktop (JS sorteia",
    Math.min(INSTAGRAM_HOME_DISPLAY_COUNT, INSTAGRAM_FEED_POSTS.length),
    ")",
  );
}

const googleReviewsAsset = writeGoogleReviewsAsset(ROOT);
const GOOGLE_REVIEWS_POOL = googleReviewsAsset.payload;
console.log(
  "[build] Google reviews:",
  googleReviewsAsset.count,
  "no pool;",
  GOOGLE_REVIEWS_POOL.displayCount,
  "sorteadas por visita na home",
);

for (const locale of LOCALES) {
  const pages = [
    {
      key: "",
      titleKey: "home",
      current: "home",
      main: (l) => homeMainHtml(l, assetPrefix(outRelPath(l, "")), INSTAGRAM_FEED_POSTS, GOOGLE_REVIEWS_POOL),
    },
    { key: "contato.html", current: "contact", main: (l) => contatoMain(l, assetPrefix(outRelPath(l, "contato.html"))) },
    {
      key: "confirmacao.html",
      current: "home",
      main: (l) => confirmacaoMain(l),
      extraFooterScripts: `  <script src="${esc(publicJsSrc("qrcode.min.js", "confirmacao.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-pix-receipt.js", "confirmacao.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-reserva-voucher.js", "confirmacao.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-exc-bookings.js", "confirmacao.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-confirmacao.js", "confirmacao.html"))}" defer></script>\n`,
    },
    {
      key: "consultar-reserva.html",
      current: "reservas",
      main: (l) => consultarReservaMain(l),
      extraFooterScripts: `  <script src="${esc(publicJsSrc("qrcode.min.js", "consultar-reserva.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-pix-receipt.js", "consultar-reserva.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-reserva-voucher.js", "consultar-reserva.html"))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-consultar-reserva.js", "consultar-reserva.html"))}" defer></script>\n`,
    },
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
    } else if (pk === "confirmacao.html") {
      title =
        locale === "en"
          ? "Payment confirmation | Guia Chapada Veadeiros"
          : locale === "es"
            ? "Confirmación de pago | Guia Chapada Veadeiros"
            : "Confirmação de pagamento | Guia Chapada Veadeiros";
      desc =
        locale === "en"
          ? "Your excursion Pix payment confirmation."
          : locale === "es"
            ? "Confirmación de pago Pix de excursión."
            : "Confirmação do pagamento Pix da excursão.";
    } else if (pk === "consultar-reserva.html") {
      title =
        locale === "en"
          ? "Look up reservation | Guia Chapada Veadeiros"
          : locale === "es"
            ? "Consultar reserva | Guia Chapada Veadeiros"
            : "Consultar reserva | Guia Chapada Veadeiros";
      desc =
        locale === "en"
          ? "Look up your excursion Pix reservation with code and email."
          : locale === "es"
            ? "Consulte su reserva Pix con código y correo."
            : "Consulte sua reserva Pix com código e e-mail.";
    } else if (pk === "revista.html") {
      title = `${S.revistaPage.seoTitle} | Guia Chapada Veadeiros`;
      desc = S.revistaPage.seoDesc;
    } else if (pk === "atrativos.html") {
      title = `${S.atrativosHub.title} | Guia Chapada Veadeiros`;
      desc = S.atrativosHub.seoDesc;
    }
    const HERO_SLIDE_OG = "imagens/hero-slide-01-guias-locais-cachoeira.png";
    let ogImageWidth;
    let ogImageHeight;
    if (og === HERO_SLIDE_OG) {
      ogImageWidth = 1600;
      ogImageHeight = 900;
    }
    const outPk = outRelPath(locale, pk);
    const homeHasExcursions =
      (locale === "pt" || locale === "en" || locale === "es") &&
      pk === "" &&
      excursaoRowsForLocale(locale).length > 0;
    const homeExcursionsHideScript = `  <script>(function(){var r=document.getElementById("excursoes-junho");if(!r)return;var t=r.querySelector(".gcv-excursoes__track");if(!t||!t.querySelector(".gcv-excursoes-card")){r.hidden=true;r.style.display="none";r.setAttribute("aria-hidden","true");}})();</script>\n`;
    const homeExcursionsHead =
      (locale === "pt" || locale === "en" || locale === "es") && pk === ""
        ? {
            extraCss: homeHasExcursions ? [`assets/css/excursoes.css${BUILD_ASSET_QUERY}`] : [],
            extraHead: homeHasExcursions
              ? `    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" crossorigin="anonymous" />`
              : "",
            extraFooterScripts:
              homeExcursionsHideScript +
              (homeHasExcursions
                ? `  <script src="${esc(publicJsSrc("qrcode.min.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-pix.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-pix-receipt.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-pix-polling.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-exc-bookings.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-exc-waitlist.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("gcv-exc-cart.js", outPk))}" defer></script>\n  <script src="${esc(publicJsSrc("excursoes-carousel.js", outPk))}" defer></script>\n`
                : ""),
          }
        : {};
    const homeConsultarScript = "";
    const html = renderPage(locale, pk, {
      title,
      desc,
      ogImageRel: og,
      ogImageWidth,
      ogImageHeight,
      current: p.current,
      mainHtml: p.main(locale),
      extraAfterFooter: pk === "" || pk === "contato.html" ? `  ${floatWaHtml(locale)}\n` : "",
      extraFooterScripts: (p.extraFooterScripts || homeExcursionsHead.extraFooterScripts || "") + homeConsultarScript,
      extraCss: homeExcursionsHead.extraCss,
      extraHead: homeExcursionsHead.extraHead,
    });
    writePage(locale, pk || "", html);
    const pagePriority = pk === "" ? 1.0 : pk === "atrativos.html" || pk === "revista.html" ? 0.85 : 0.6;
    noteSitemapUrl(locale, pk, { priority: pagePriority, changefreq: "weekly", ogImageRel: og, title });
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
      noteSitemapUrl(locale, pk, { priority: 0.75, changefreq: "weekly", ogImageRel: premium.ogImageRel, title: premium.fullTitle });
      if (locale === "pt") {
        RSS_ITEMS.push({
          title: premium.ogTitle || premium.fullTitle,
          link: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          description: premium.desc,
          pubDate: rssPubDate(BUILD_LASTMOD),
          guid: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          image: premium.ogImageRel ? `${SITE_ORIGIN}/assets/img/${premium.ogImageRel}` : undefined,
        });
      }
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
      noteSitemapUrl(locale, pk, {
        priority: 0.75,
        changefreq: "weekly",
        ogImageRel: "uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png",
        title: A.title,
      });
      if (locale === "pt") {
        RSS_ITEMS.push({
          title: A.title,
          link: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          description: A.desc,
          pubDate: rssPubDate(BUILD_LASTMOD),
          guid: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          image: `${SITE_ORIGIN}/assets/img/uploads/revista/contratar-guia-artigo/hero-mirante-grupo-guia-local-chapada-veadeiros.png`,
        });
      }
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
      noteSitemapUrl(locale, pk, {
        priority: 0.75,
        changefreq: "weekly",
        ogImageRel: "uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png",
        title: A.title,
      });
      if (locale === "pt") {
        RSS_ITEMS.push({
          title: A.title,
          link: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          description: A.desc,
          pubDate: rssPubDate(BUILD_LASTMOD),
          guid: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          image: `${SITE_ORIGIN}/assets/img/uploads/revista/melhor-epoca/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png`,
        });
      }
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
    noteSitemapUrl(locale, pk, { priority: 0.75, changefreq: "weekly", ogImageRel: og, title: titleSeo });
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
      noteSitemapUrl(locale, pk, { priority: 0.75, changefreq: "weekly", ogImageRel: premium.ogImageRel, title: premium.fullTitle });
      if (locale === "pt") {
        RSS_ITEMS.push({
          title: premium.ogTitle || premium.fullTitle,
          link: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          description: premium.desc,
          pubDate: rssPubDate(BUILD_LASTMOD),
          guid: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
          image: premium.ogImageRel ? `${SITE_ORIGIN}/assets/img/${premium.ogImageRel}` : undefined,
        });
      }
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
    noteSitemapUrl(locale, pk, { priority: 0.75, changefreq: "weekly", ogImageRel: af.og, title: af.title(locale) });
  }

  const attractionBases = CMS?.waterfallBaseSlugs?.length ? CMS.waterfallBaseSlugs : HOTSPOTS.map((h) => h.slug);
  for (const base of attractionBases) {
    const hot = HOTSPOTS.find((x) => x.slug === base);
    if (!hot) continue;
    const locSlug = localeSlugForBase(locale, base);
    const pk = `atrativos/${locSlug}.html`;
    const cms = getCmsAttraction(locale, base);
    const pageTitle = attractionDisplayTitle(base, hot);
    const pageDesc =
      (cms?.seoDescription && String(cms.seoDescription).trim()) ||
      (cms?.excerpt && String(cms.excerpt).trim()) ||
      hot.lead[locale];
    const og = toPublicAssetRel(cms?.featuredImage) || hot.image;
    const html = renderPage(locale, pk, {
      title: `${pageTitle} | Guia Chapada Veadeiros`,
      desc: pageDesc,
      ogImageRel: og,
      ogImageAlt: pageTitle,
      current: "atrativos",
      mainHtml: atrativoDetailMain(locale, locSlug, assetPrefix(outRelPath(locale, pk)), pk),
    });
    writePage(locale, pk, html);
    noteSitemapUrl(locale, pk, { priority: 0.8, changefreq: "weekly", ogImageRel: og, title: pageTitle });
  }

  for (const slug of PILLAR_ORDER) {
    const pk = pillarPathKey(slug);
    const content = getPillarContent(slug, locale);
    if (!content) continue;
    const priority = slug === "chapada-dos-veadeiros" ? 0.95 : 0.9;
    const html = renderPage(locale, pk, {
      title: `${content.seoTitle} | Guia Chapada Veadeiros`,
      desc: content.seoDesc,
      ogImageRel: content.ogImage,
      ogTitle: content.seoTitle,
      ogDesc: content.seoDesc,
      keywords: content.keywords,
      ogImageAlt: content.h1,
      current: "revista",
      mainHtml: pillarMainHtml(locale, slug, assetPrefix(outRelPath(locale, pk)), pk),
    });
    writePage(locale, pk, html);
    noteSitemapUrl(locale, pk, { priority, changefreq: "weekly", ogImageRel: content.ogImage, title: content.title });
    if (locale === "pt") {
      RSS_ITEMS.push({
        title: content.h1,
        link: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
        description: content.seoDesc,
        pubDate: rssPubDate(BUILD_LASTMOD),
        guid: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
        image: `${SITE_ORIGIN}/assets/img/${content.ogImage}`,
      });
    }
  }
}

/** Páginas estáticas feitas à mão (não passam pelo template do build) — garantir URL no sitemap. */
const SITEMAP_STATIC_REVISTA_PATHS = [
  "revista/ataque-onca-parda-chapada-veadeiros.html",
  "revista/roteiro-4-dias-chapada-dos-veadeiros.html",
];
for (const pk of SITEMAP_STATIC_REVISTA_PATHS) {
  const art =
    pk === ARTICLE_ROTEIRO_4_DIAS.pt.path
      ? ARTICLE_ROTEIRO_4_DIAS.pt
      : pk === ARTICLE_ONCA_PARDA.pt.path
        ? ARTICLE_ONCA_PARDA.pt
        : null;
  registerSitemap(pk, { priority: 0.75, changefreq: "monthly", title: art?.title });
  for (const locale of LOCALES) {
    noteSitemapUrl(locale, pk, { priority: 0.75, changefreq: "monthly", title: art?.title });
    if (locale === "pt" && art) {
      RSS_ITEMS.push({
        title: art.title,
        link: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
        description: art.desc,
        pubDate: rssPubDate(BUILD_LASTMOD),
        guid: `${SITE_ORIGIN}${localePathToUrl(locale, pk)}`,
      });
    }
  }
}

writeAdvancedSitemapsAndFeed();

writeSearchIndexAsset();

const { copied: buildProdEntries } = assembleBuildProd();
for (const loc of LOCALES) {
  const homeRel = outRelPath(loc, "");
  const homeAbs = join(ROOT, ...homeRel.split("/"), "index.html");
  const homeHtml = existsSync(homeAbs) ? readFileSync(homeAbs, "utf8") : "";
  const excursionsVisible = homeHtml.includes('id="excursoes-junho"');
  const futureRows = excursaoRowsForLocale(loc).length;
  console.log(
    `[build] home ${loc}: próximas saídas ${excursionsVisible ? "no HTML" : "oculta"} (${futureRows} saída(s) futura(s))`,
  );
}
console.log("[build] Build_prod:", BUILD_PROD_DIR, "—", buildProdEntries, "itens, pronto para FTP");
console.log("Build OK:", ROOT);
console.log("Páginas:", sitemapUrls.length, "URLs no sitemap");

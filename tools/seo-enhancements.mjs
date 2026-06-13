/**
 * SEO avançado para indexação por IA generativa e buscadores.
 * Sitemap index, robots.txt, RSS, breadcrumbs, JSON-LD enriquecido.
 */

export const TWITTER_SITE = "@guiachapadaveadeiros";
export const TWITTER_CREATOR = "@guiachapadaveadeiros";
export const PUBLISHER_NAME = "Guia Chapada Veadeiros";
export const AUTHOR_NAME = "Diego Navi";

/** Crawlers de IA generativa — permitidos explicitamente. */
export const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Applebot-Extended",
  "cohere-ai",
  "Bytespider",
];

export function escXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * @param {string} siteOrigin
 * @param {{ loc: string; lastmod?: string; changefreq?: string; priority?: number; alternates?: { hreflang: string; href: string }[]; images?: { loc: string; title?: string }[] }[]} entries
 */
export function buildUrlsetXml(entries) {
  const lines = entries.map((e) => {
    const altLines = (e.alternates || [])
      .map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${escXml(a.hreflang)}" href="${escXml(a.href)}" />`,
      )
      .join("\n");
    const imgLines = (e.images || [])
      .map((img) => {
        const title = img.title ? `\n      <image:title>${escXml(img.title)}</image:title>` : "";
        return `    <image:image>\n      <image:loc>${escXml(img.loc)}</image:loc>${title}\n    </image:image>`;
      })
      .join("\n");
    const lastmod = e.lastmod ? `\n    <lastmod>${escXml(e.lastmod)}</lastmod>` : "";
    const changefreq = e.changefreq ? `\n    <changefreq>${escXml(e.changefreq)}</changefreq>` : "";
    const priority = e.priority != null ? `\n    <priority>${Number(e.priority).toFixed(1)}</priority>` : "";
    const extras = [lastmod, changefreq, priority, altLines, imgLines].filter(Boolean).join("\n");
    return `  <url>\n    <loc>${escXml(e.loc)}</loc>${extras ? `\n${extras}` : ""}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${lines.join("\n")}
</urlset>`;
}

/**
 * @param {string} siteOrigin
 * @param {{ loc: string; lastmod?: string }[]} sitemaps
 */
export function buildSitemapIndexXml(siteOrigin, sitemaps) {
  const lines = sitemaps.map((s) => {
    const lastmod = s.lastmod ? `\n    <lastmod>${escXml(s.lastmod)}</lastmod>` : "";
    return `  <sitemap>\n    <loc>${escXml(s.loc)}</loc>${lastmod}\n  </sitemap>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join("\n")}
</sitemapindex>`;
}

export function buildRobotsTxt(siteOrigin) {
  const aiBlocks = AI_CRAWLERS.map((bot) => `User-agent: ${bot}\nAllow: /`).join("\n\n");
  return `# Guia Chapada Veadeiros — robots.txt otimizado para SEO e IA generativa
# ${siteOrigin}

User-agent: *
Allow: /
Disallow: /Build_prod/
Disallow: /api/
Disallow: /dashboard/
Disallow: /guia/login.html
Disallow: /guia/cadastro.html

${aiBlocks}

# Feeds e sitemaps
Sitemap: ${siteOrigin}/sitemap.xml
Sitemap: ${siteOrigin}/sitemap-pages.xml
Sitemap: ${siteOrigin}/sitemap-atrativos.xml
Sitemap: ${siteOrigin}/sitemap-revista.xml
Sitemap: ${siteOrigin}/sitemap-guia.xml
`;
}

/**
 * @param {string} siteOrigin
 * @param {{ title: string; link: string; description: string; pubDate: string; guid: string; image?: string }[]} items
 */
export function buildRssFeed(siteOrigin, items) {
  const channelItems = items
    .slice(0, 30)
    .map((item) => {
      const enc = item.image
        ? `\n      <enclosure url="${escXml(item.image)}" type="image/jpeg" />`
        : "";
      return `    <item>
      <title>${escXml(item.title)}</title>
      <link>${escXml(item.link)}</link>
      <guid isPermaLink="true">${escXml(item.guid)}</guid>
      <pubDate>${escXml(item.pubDate)}</pubDate>
      <description>${escXml(item.description)}</description>${enc}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Guia Chapada Veadeiros — Revista e Guias</title>
    <link>${escXml(siteOrigin)}/</link>
    <description>Roteiros, cachoeiras, passeios e ecoturismo na Chapada dos Veadeiros com guia local credenciado.</description>
    <language>pt-BR</language>
    <lastBuildDate>${escXml(new Date().toUTCString())}</lastBuildDate>
    <atom:link href="${escXml(siteOrigin)}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${escXml(siteOrigin)}/assets/img/imagens/logo-guia-chapada-veadeiros-oficial.png</url>
      <title>Guia Chapada Veadeiros</title>
      <link>${escXml(siteOrigin)}/</link>
    </image>
${channelItems}
  </channel>
</rss>`;
}

/** @param {{ label: string; href?: string }[]} items */
export function breadcrumbNavHtml(items, esc) {
  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast || !item.href) {
      return `<span${isLast ? ' aria-current="page"' : ""}>${esc(item.label)}</span>`;
    }
    return `<a href="${esc(item.href)}">${esc(item.label)}</a>`;
  });
  return `<nav class="gcv-seo-breadcrumb" aria-label="Caminho de navegação">${parts.join('<span class="gcv-seo-breadcrumb__sep" aria-hidden="true">›</span>')}</nav>`;
}

/** @param {{ name: string; url?: string }[]} items */
export function breadcrumbListJsonLd(items, siteOrigin) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url.startsWith("http") ? item.url : `${siteOrigin}${item.url}` } : {}),
    })),
  };
}

export function organizationJsonLd(siteOrigin, logoUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteOrigin}/#organization`,
    name: PUBLISHER_NAME,
    url: siteOrigin,
    logo: { "@type": "ImageObject", url: logoUrl },
    sameAs: [
      "https://www.instagram.com/guiachapadaveadeiros/",
      "https://www.facebook.com/guiachapadaveadeiros/",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+55-62-98250-6891",
      contactType: "customer service",
      availableLanguage: ["Portuguese", "English", "Spanish"],
      areaServed: "BR",
    },
  };
}

export function webSiteJsonLd(siteOrigin, locale, htmlLang, searchUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteOrigin}/#website`,
    name: PUBLISHER_NAME,
    url: `${siteOrigin}${locale === "pt" ? "/" : `/${locale}/`}`,
    inLanguage: htmlLang,
    publisher: { "@id": `${siteOrigin}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${searchUrl}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function travelAgencyJsonLd(siteOrigin, locale, description, imageUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${siteOrigin}/#travel-agency`,
    name: PUBLISHER_NAME,
    url: `${siteOrigin}${locale === "pt" ? "/" : `/${locale}/`}`,
    description,
    image: imageUrl,
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Chapada dos Veadeiros",
      containedInPlace: { "@type": "State", name: "Goiás", containedInPlace: { "@type": "Country", name: "Brazil" } },
    },
    knowsAbout: [
      "Chapada dos Veadeiros",
      "Ecotourism",
      "Waterfalls",
      "Hiking trails",
      "Local tour guide",
      "National Park",
    ],
  };
}

/** @param {{ q: string; a: string }[]} faqs */
export function faqPageJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function itemListJsonLd(name, description, items) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function collectionPageJsonLd(name, description, url) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    isPartOf: { "@type": "WebSite", name: PUBLISHER_NAME },
  };
}

export function touristAttractionJsonLd({ name, description, image, url, geo }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description,
    image,
    url,
    isAccessibleForFree: false,
    touristType: ["Ecotourist", "Adventure traveler", "Nature enthusiast"],
    containedInPlace: { "@type": "AdministrativeArea", name: "Chapada dos Veadeiros" },
  };
  if (geo) ld.geo = geo;
  return ld;
}

export function articleJsonLd({ headline, description, image, url, datePublished, dateModified, author, keywords }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Person", name: author || AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      logo: { "@type": "ImageObject", url: image },
    },
    inLanguage: "pt-BR",
    datePublished: datePublished || new Date().toISOString().slice(0, 10),
    dateModified: dateModified || datePublished || new Date().toISOString().slice(0, 10),
  };
  if (keywords?.length) ld.keywords = keywords.join(", ");
  return ld;
}

/** Meta tags extras para buildHead — IA generativa e redes sociais. */
export function seoExtraHeadMeta({
  esc,
  keywords,
  ogImageAlt,
  ogType,
  articlePublished,
  articleModified,
  articleSection,
  articleTags,
  feedUrl,
}) {
  const lines = [];
  lines.push(`<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />`);
  lines.push(`<meta name="author" content="${esc(AUTHOR_NAME)}" />`);
  lines.push(`<meta name="publisher" content="${esc(PUBLISHER_NAME)}" />`);
  if (keywords) lines.push(`<meta name="keywords" content="${esc(keywords)}" />`);
  lines.push(`<meta name="twitter:site" content="${esc(TWITTER_SITE)}" />`);
  lines.push(`<meta name="twitter:creator" content="${esc(TWITTER_CREATOR)}" />`);
  if (ogImageAlt) lines.push(`<meta property="og:image:alt" content="${esc(ogImageAlt)}" />`);
  if (ogType === "article") {
    if (articlePublished) lines.push(`<meta property="article:published_time" content="${esc(articlePublished)}" />`);
    if (articleModified) lines.push(`<meta property="article:modified_time" content="${esc(articleModified)}" />`);
    if (articleSection) lines.push(`<meta property="article:section" content="${esc(articleSection)}" />`);
    for (const tag of articleTags || []) {
      lines.push(`<meta property="article:tag" content="${esc(tag)}" />`);
    }
  }
  if (feedUrl) {
    lines.push(`<link rel="alternate" type="application/rss+xml" title="Guia Chapada Veadeiros" href="${esc(feedUrl)}" />`);
  }
  return lines.join("\n    ");
}

/** Bloco HTML de artigos relacionados automáticos. */
export function relatedPagesHtml(related, { esc, labels }) {
  if (!related.length) return "";
  const cards = related
    .map(
      (r) => `<li class="gcv-related__item">
  <a class="gcv-related__link" href="${esc(r.href)}">
    <span class="gcv-related__title">${esc(r.title)}</span>
    ${r.desc ? `<span class="gcv-related__desc">${esc(r.desc.length > 120 ? `${r.desc.slice(0, 117)}…` : r.desc)}</span>` : ""}
  </a>
</li>`,
    )
    .join("\n");
  return `<aside class="gcv-related" aria-labelledby="gcv-related-title">
  <h2 id="gcv-related-title" class="gcv-related__h2">${esc(labels.title)}</h2>
  <ul class="gcv-related__list">${cards}</ul>
</aside>`;
}

/** Bloco de interlinkagem contextual para pilar. */
export function pillarContextLinkHtml({ esc, href, label, prefix }) {
  return `<p class="gcv-pillar-context"><span class="gcv-pillar-context__label">${esc(prefix)}</span> <a href="${esc(href)}">${esc(label)}</a></p>`;
}

export function isoDateNow() {
  return new Date().toISOString().slice(0, 10);
}

export function rssPubDate(isoDate) {
  const d = isoDate ? new Date(isoDate) : new Date();
  return d.toUTCString();
}

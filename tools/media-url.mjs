/**
 * Espelho de frontend/cliente/src/utils/localMediaUrl.ts — WP uploads → /imagens/<ficheiro>.
 * Na build estática, prefixamos com `${ap}assets/img/`.
 */

/** Migração: uploads WP em árvore por ano → um único diretório público `imagens/`. */
function wpUploadsPathToImagens(localPath) {
  const trimmed = localPath.trim();
  if (!trimmed.startsWith("/wp-content/uploads/") && !trimmed.startsWith("wp-content/uploads/")) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
  const parts = trimmed.split("/").filter(Boolean);
  const file = parts[parts.length - 1];
  return file ? `/imagens/${file}` : trimmed;
}

function normalizeToLocalPath(url) {
  const trimmed = url.trim();

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return wpUploadsPathToImagens(trimmed);
  }

  const uploadsIdx = trimmed.indexOf("/wp-content/uploads/");
  if (uploadsIdx !== -1) {
    return wpUploadsPathToImagens(trimmed.slice(uploadsIdx));
  }

  const imagensSlash = trimmed.match(/\/imagens\/([^?#]+)/i);
  if (imagensSlash) {
    return `/imagens/${imagensSlash[1]}`;
  }

  try {
    const hostPath = new URL(trimmed).pathname;
    const imagensPath = hostPath.match(/^\/imagens\/(.+)/i);
    if (imagensPath) {
      return `/imagens/${imagensPath[1]}`;
    }
    const wpPath = hostPath.match(/^(\/wp-content\/uploads\/.+)/i);
    if (wpPath) {
      return wpUploadsPathToImagens(wpPath[1]);
    }
  } catch {
    /* não é URL absoluta válida */
  }

  return trimmed;
}

/** Caminho relativo em `assets/img/` sem barra inicial: `imagens/x.jpg` ou `uploads/...`. */
export function toPublicAssetRel(url) {
  if (!url || typeof url !== "string") {
    return null;
  }
  const norm = normalizeToLocalPath(url.trim());
  if (!norm || norm.startsWith("//")) return null;
  const noLead = norm.replace(/^\/+/, "");
  if (noLead.startsWith("imagens/") || noLead.startsWith("uploads/")) {
    return noLead;
  }
  return null;
}

function rewriteSrcsetList(value) {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const tokens = trimmed.split(/\s+/);
      const urlToken = tokens[0];
      if (!urlToken) return part;
      const descriptor = tokens.slice(1).join(" ");
      const mapped = normalizeToLocalPath(urlToken);
      return descriptor ? `${mapped} ${descriptor}` : mapped;
    })
    .join(", ");
}

function replaceHtmlAttr(html, attr, multival) {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}=(["'])([^"']*)\\1`, "gi");

  return html.replace(re, (_full, quote, raw) => {
    const next = multival ? rewriteSrcsetList(raw) : normalizeToLocalPath(raw);
    return `${attr}=${quote}${next}${quote}`;
  });
}

/** Igual ao React: atributos ficam com caminhos `/imagens/...` ou `/uploads/...`. */
export function rewriteHtmlMediaUrls(html) {
  if (!html) return html;

  let out = html;
  out = replaceHtmlAttr(out, "data-lazy-srcset", true);
  out = replaceHtmlAttr(out, "data-lazy-src", false);
  out = replaceHtmlAttr(out, "data-srcset", true);
  out = replaceHtmlAttr(out, "data-src", false);
  out = replaceHtmlAttr(out, "poster", false);

  out = out.replace(/(?<![\w-])srcset=(["'])([^"']*)\1/gi, (_full, quote, raw) => {
    return `srcset=${quote}${rewriteSrcsetList(raw)}${quote}`;
  });

  out = out.replace(/(?<![\w-])src=(["'])([^"']*)\1/gi, (_full, quote, raw) => {
    return `src=${quote}${normalizeToLocalPath(raw)}${quote}`;
  });

  return out;
}

/** Prefixa caminhos absolutos internos para ficheiros estáticos. */
export function htmlWithStaticAssetPrefix(html, ap) {
  if (!html) return html;
  const prefix = `${ap}assets/img`;
  return String(html)
    .replace(/(?<![\w-])src=(["'])\/imagens\//gi, `src=$1${prefix}/imagens/`)
    .replace(/(?<![\w-])src=(["'])\/uploads\//gi, `src=$1${prefix}/uploads/`)
    .replace(/(?<![\w-])srcset=(["'])([^"']*)\1/gi, (full, q, inner) => {
      const next = inner
        .split(",")
        .map((p) =>
          p
            .trim()
            .split(/\s+/)
            .map((tok, i) => (i === 0 && tok.startsWith("/imagens/") ? `${prefix}${tok}` : tok))
            .join(" "),
        )
        .join(", ");
      return `srcset=${q}${next}${q}`;
    })
    .replace(/url\(\s*([\"']?)\/imagens\//gi, `url($1${prefix}/imagens/`)
    .replace(/url\(\s*([\"']?)\/uploads\//gi, `url($1${prefix}/uploads/`);
}

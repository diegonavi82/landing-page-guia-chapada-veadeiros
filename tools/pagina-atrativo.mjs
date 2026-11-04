/**
 * Texto visível da página do atrativo.
 * O corpo está em .gcv-detail-content e a ficha lateral em .gcv-detail-info
 * dos HTML em atrativos/, en/atrativos/ e es/atrativos/.
 */
import fs from "node:fs";
import path from "node:path";

const IDIOMAS = [
  { lang: "pt", dir: "atrativos" },
  { lang: "en", dir: path.join("en", "atrativos") },
  { lang: "es", dir: path.join("es", "atrativos") },
];

const EDITS_FILE = "attraction-page-edits.json";

export function slugPagina(slug) {
  const s = String(slug || "").trim();
  return /^[a-z0-9-]+$/i.test(s) ? s : "";
}

function arquivo(root, dir, slug) {
  return path.join(root, dir, `${slug}.html`);
}

function miolo(html, className) {
  const open = new RegExp(`<div\\s+class="${className}"[^>]*>`, "i").exec(html || "");
  if (!open) return "";
  const start = open.index + open[0].length;
  const lower = html.toLowerCase();
  let i = start;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = lower.indexOf("<div", i);
    const nextClose = lower.indexOf("</div>", i);
    if (nextClose < 0) return "";
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    if (depth === 0) return html.slice(start, nextClose).trim();
    i = nextClose + 6;
  }
  return "";
}

function trocarMiolo(html, className, inner) {
  const open = new RegExp(`<div\\s+class="${className}"[^>]*>`, "i").exec(html || "");
  if (!open) return html;
  const start = open.index + open[0].length;
  const lower = html.toLowerCase();
  let i = start;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = lower.indexOf("<div", i);
    const nextClose = lower.indexOf("</div>", i);
    if (nextClose < 0) return html;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    if (depth === 0) return html.slice(0, start) + inner + html.slice(nextClose);
    i = nextClose + 6;
  }
  return html;
}

function escaparTexto(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function trocarH1(html, title) {
  const safe = escaparTexto(title);
  let out = html.replace(
    /(<header class="gcv-detail-title">\s*<h1>)[\s\S]*?(<\/h1>)/,
    `$1${safe}$2`
  );
  out = out.replace(
    /(<span aria-current="page">)[\s\S]*?(<\/span>)/,
    `$1${safe}$2`
  );
  return out;
}

function textoSubtitulo(html) {
  const m = /<p class="gcv-detail-subtitle">([\s\S]*?)<\/p>/i.exec(html || "");
  if (!m) return "";
  return m[1]
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function trocarSubtitulo(html, subtitle) {
  const sub = String(subtitle || "").trim();
  const bloco = sub ? `\n      <p class="gcv-detail-subtitle">${escaparTexto(sub)}</p>` : "";
  return String(html || "").replace(
    /(<header class="gcv-detail-title">\s*<h1>[\s\S]*?<\/h1>)(?:\s*<p class="gcv-detail-subtitle">[\s\S]*?<\/p>)?/,
    `$1${bloco}`
  );
}

export function lerPaginasAtrativo(root, slug) {
  const id = slugPagina(slug);
  const out = {};
  if (!id) return out;
  for (const idioma of IDIOMAS) {
    const file = arquivo(root, idioma.dir, id);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    out[idioma.lang] = {
      bodyHtml: miolo(html, "gcv-detail-content"),
      sidebarHtml: miolo(html, "gcv-detail-info"),
      subtitle: textoSubtitulo(html),
      file,
    };
  }
  return out;
}

function lerEdits(root) {
  const file = path.join(root, "tools", EDITS_FILE);
  if (!fs.existsSync(file)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function gravarEdits(root, slug, idiomas) {
  const id = slugPagina(slug);
  if (!id) return;
  const all = lerEdits(root);
  const atual = all[id] && typeof all[id] === "object" ? all[id] : {};
  for (const lang of ["pt", "en", "es"]) {
    const dados = idiomas[lang];
    if (!dados) continue;
    const prev = atual[lang] && typeof atual[lang] === "object" ? atual[lang] : {};
    const next = { ...prev };
    if (dados.bodyHtml != null && String(dados.bodyHtml).trim()) next.bodyHtml = String(dados.bodyHtml);
    if (dados.sidebarHtml != null && String(dados.sidebarHtml).trim()) next.sidebarHtml = String(dados.sidebarHtml);
    if (dados.title != null && String(dados.title).trim()) next.title = String(dados.title).trim();
    if (dados.subtitle != null) next.subtitle = String(dados.subtitle).trim();
    if (Object.keys(next).length) atual[lang] = next;
  }
  if (!Object.keys(atual).length) return;
  all[id] = atual;
  const file = path.join(root, "tools", EDITS_FILE);
  fs.writeFileSync(file, JSON.stringify(all, null, 2) + "\n");
}

/** Grava corpo, lateral e título nos HTML existentes e no arquivo que o build lê. */
export function gravarPaginasAtrativo(root, slug, idiomas) {
  const id = slugPagina(slug);
  if (!id || !idiomas) return { arquivos: [] };
  const arquivos = [];
  for (const idioma of IDIOMAS) {
    const dados = idiomas[idioma.lang];
    if (!dados) continue;
    const file = arquivo(root, idioma.dir, id);
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, "utf8");
    if (dados.bodyHtml != null && String(dados.bodyHtml).trim()) {
      html = trocarMiolo(html, "gcv-detail-content", String(dados.bodyHtml));
    }
    if (dados.sidebarHtml != null && String(dados.sidebarHtml).trim()) {
      html = trocarMiolo(html, "gcv-detail-info", String(dados.sidebarHtml));
    }
    if (dados.title != null && String(dados.title).trim()) {
      html = trocarH1(html, String(dados.title).trim());
    }
    if (dados.subtitle != null) {
      html = trocarSubtitulo(html, dados.subtitle);
    }
    fs.writeFileSync(file, html);
    arquivos.push(path.relative(root, file).replace(/\\/g, "/"));
  }
  gravarEdits(root, id, idiomas);
  return { arquivos };
}

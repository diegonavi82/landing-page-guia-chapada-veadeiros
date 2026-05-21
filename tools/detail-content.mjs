/**
 * Espelho da lógica de frontend/cliente/src/pages/DynamicPage.tsx
 * (ficha lateral + corpo principal + remoção de galeria legada Fusion).
 */
import { parseHTML } from "linkedom";

export const GUIDE_BOOKING_BUTTON_HREF =
  "https://www.guiachapadaveadeiros.com/produto/guia-turismo-parque-nacional-chapada-veadeiros-alto-paraiso-sao-jorge/";

const CONTRATE_NOTICE_RE = /\bContrate\s+um\s+guia\s+local\b(?:\s*[\!\?\.])?/i;

const METADATA_SIDEBAR_HINT_RE =
  /\b(?:Dist[aâ]ncia|Ingressos|Atrativos|Nível\s+de\s+Dificuldade|Entrada\b|Estacionamento\b|Per[ií]odo\s+recomendado)\b/i;

const COMPRE_PASSEIO_LABEL_RE = /(?:Compre\s+seu\s+passeio!|Buy\s+your\s+tour!|¡Compra\s+tu\s+recorrido!)/i;

const COMPRE_PASSEIO_ANCHOR_RE =
  /<a\b[^>]*>\s*(?:Compre\s+seu\s+passeio!|Buy\s+your\s+tour!|¡Compra\s+tu\s+recorrido!)\s*<\/a>\s*/gi;

export function stripComprePasseioButtons(html) {
  return String(html || "")
    .replace(COMPRE_PASSEIO_ANCHOR_RE, "")
    .replace(/^Compre\s+seu\s+passeio!\s*/im, "")
    .replace(/^Buy\s+your\s+tour!\s*/im, "")
    .replace(/^¡Compra\s+tu\s+recorrido!\s*/im, "")
    .replace(/^\s*\n+/, "")
    .trim();
}

function finalizeSplit(parts) {
  const ctaLabel = String(parts.ctaHtml || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const ctaHtml = COMPRE_PASSEIO_LABEL_RE.test(ctaLabel) ? "" : parts.ctaHtml;
  return {
    ...parts,
    ctaHtml,
    sidebarInfo: stripComprePasseioButtons(parts.sidebarInfo),
    mainContent: stripComprePasseioButtons(parts.mainContent),
  };
}

const BUTTON_ANCHOR_RE = /<a\b[^>]*class=["']([^"']*)["'][^>]*>[\s\S]*?<\/a>/gi;

function anchorClassesLookLikeSiteCta(classes) {
  const c = classes.toLowerCase();
  return (
    /\bbutton\b/.test(c) ||
    /\bfusion-button\b/.test(c) ||
    /\bwp-element-button\b/.test(c) ||
    /\bwp-block-button__link\b/.test(c)
  );
}

export function listButtonAnchors(content) {
  const out = [];
  let m;
  BUTTON_ANCHOR_RE.lastIndex = 0;

  while ((m = BUTTON_ANCHOR_RE.exec(content)) !== null) {
    const klass = m[1] ?? "";
    if (!anchorClassesLookLikeSiteCta(klass)) {
      continue;
    }
    out.push({
      html: m[0],
      index: m.index,
      label: m[0].replace(/<[^>]+>/g, "").trim(),
    });
  }

  return out;
}

export function splitAtFirstButton(content, buttons = listButtonAnchors(content)) {
  if (!buttons.length) {
    return {
      sidebarInfo: "",
      ctaHtml: "",
      mainContent: content,
    };
  }

  const first = buttons[0];

  return {
    sidebarInfo: content
      .slice(0, first.index)
      .replace(/Compre seu passeio!/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    ctaHtml: first.html,
    mainContent: content.slice(first.index + first.html.length).trim(),
  };
}

export function splitCompreThenContrate(content, buttons) {
  const comprehend = buttons.findIndex((b) => /compre\s+seu\s+passeio\b/i.test(b.label));
  const contrateIdx = buttons.findIndex((b) => /contrate\s+um\s+guia\s+local/i.test(b.label));

  if (comprehend === -1 || contrateIdx === -1 || buttons[comprehend].index >= buttons[contrateIdx].index) {
    return null;
  }

  const sliceCompre = buttons[comprehend];
  const sliceContrate = buttons[contrateIdx];

  const sidebarInfo = content.slice(sliceCompre.index + sliceCompre.html.length, sliceContrate.index).trim();
  const ctaHtml = sliceContrate.html;
  const mainContent = content.slice(sliceContrate.index + sliceContrate.html.length).trim();

  return { sidebarInfo, ctaHtml, mainContent };
}

export function splitPlaintextSidebarBeforeContrateNotice(content) {
  const contrNotice = CONTRATE_NOTICE_RE.exec(content);

  if (!contrNotice) {
    return null;
  }

  let sidebarRaw = content
    .slice(0, contrNotice.index)
    .replace(/^Compre\s+seu\s+passeio!\s*/im, "")
    .trim();
  sidebarRaw = sidebarRaw.replace(/\s+$/, "");

  const afterContr = contrNotice.index + contrNotice[0].length;
  let mainTail = content.slice(afterContr).trimStart();

  mainTail = mainTail.startsWith("</p>")
    ? mainTail.replace(/^<\/p>\s*/i, "").trimStart()
    : mainTail;

  const ctaHtml = `<a href="${GUIDE_BOOKING_BUTTON_HREF}" class="button" rel="noopener noreferrer">Contrate um guia local!</a>`;

  return finalizeSplit({
    sidebarInfo: sidebarRaw,
    ctaHtml,
    mainContent: mainTail,
  });
}

function headHasLongProseBlock(head) {
  return head.split(/\n{2,}/).some((b) => b.replace(/\s+/g, " ").trim().length > 260);
}

export function splitMetadataBeforeFirstHeading(content) {
  const hExec = /<h[23]\b/i.exec(content);

  if (!hExec || hExec.index < 60) {
    return null;
  }

  const head = content.slice(0, hExec.index).trim();
  const body = content.slice(hExec.index).trim();

  if (!METADATA_SIDEBAR_HINT_RE.test(head) || head.length > 1400 || headHasLongProseBlock(head)) {
    return null;
  }

  let sidebarRaw = head.replace(/^Compre\s+seu\s+passeio!\s*/im, "").trim();
  sidebarRaw = sidebarRaw.replace(CONTRATE_NOTICE_RE, "").trim();
  sidebarRaw = sidebarRaw.replace(/\n{3,}/g, "\n\n").trim();

  const hadContrateInHead = /\bcontrate\s+um\s+guia\s+local\b/i.test(head);
  const hadComprePlain = /\bcompre\s+seu\s+passeio\b/i.test(head);
  const suggestContrate =
    hadContrateInHead ||
    /\brecomendado\s+.*\bguia\b/i.test(head) ||
    /\bguia\s+obrigat[oó]rio\b/i.test(head) ||
    /\bcom\s+guia\s+local\b/i.test(head);

  let ctaHtml = "";
  if (suggestContrate) {
    ctaHtml = `<a href="${GUIDE_BOOKING_BUTTON_HREF}" class="button" rel="noopener noreferrer">Contrate um guia local!</a>`;
  }

  const mainContent = body;

  if (!sidebarRaw && !ctaHtml) {
    return null;
  }

  return finalizeSplit({ sidebarInfo: sidebarRaw, ctaHtml, mainContent });
}

export function splitDetailContent(content) {
  const buttons = listButtonAnchors(content);

  const inverted = splitCompreThenContrate(content, buttons);
  if (inverted) {
    return finalizeSplit(inverted);
  }

  const plaintextSplit =
    buttons.length === 0 ? splitPlaintextSidebarBeforeContrateNotice(content) : null;
  if (plaintextSplit) {
    return plaintextSplit;
  }

  const metadataSplit = buttons.length === 0 ? splitMetadataBeforeFirstHeading(content) : null;
  if (metadataSplit) {
    return metadataSplit;
  }

  return finalizeSplit(splitAtFirstButton(content, buttons));
}

export function extractFirstImage(content) {
  const imageMatch = content.match(/<img\b[^>]*>/i);

  if (!imageMatch) {
    return null;
  }

  const imageTag = imageMatch[0];
  const src = imageTag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const alt = imageTag.match(/\balt=["']([^"']*)["']/i)?.[1];

  return src ? { tag: imageTag, src, alt } : null;
}

export function prepareDetailContent(content, imageTag) {
  return content
    .replace(/^\s*<h2\b[\s\S]*?<\/h2>\s*/i, "")
    .replace(imageTag ?? "", "")
    .replace(/[A-Za-z0-9+/=]{500,}/g, "")
    .trim();
}

export function stripLegacyFusionGalleryFromHtml(html) {
  if (!html.trim()) {
    return html;
  }

  try {
    const { document } = parseHTML(`<div id="gcv-gallery-strip">${html}</div>`);
    const root = document.getElementById("gcv-gallery-strip");
    if (!root) {
      return html;
    }

    root.querySelectorAll(".fusion-gallery").forEach((el) => el.remove());
    root.querySelectorAll(".fusion-recent-works").forEach((el) => el.remove());
    root.querySelectorAll("[class*='fusion-gallery-wrapper']").forEach((el) => el.remove());

    root.querySelectorAll("[class*='fusion-gallery-image']").forEach((el) => {
      const col = el.closest(".fusion-layout-column");
      if (col && root.contains(col)) {
        col.remove();
      } else {
        const wrap = el.closest("div") ?? el;
        if (wrap.parentElement) {
          wrap.remove();
        }
      }
    });

    root.querySelectorAll("h2").forEach((h2) => {
      const normalized = h2.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
      if (normalized !== "galeria de fotos") {
        return;
      }

      let next = h2.nextElementSibling;
      if (next?.tagName === "P") {
        const pText = next.textContent ?? "";
        if (/gui oficial|textos alternativos|acessibilidade|seo/i.test(pText)) {
          next.remove();
        }
      }
      h2.remove();
    });

    return root.innerHTML;
  } catch {
    return html;
  }
}

function stripHtmlTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

function htmlSidebarToPlainWithBreaks(sidebarInfo) {
  return sidebarInfo
    .replace(/<\/p>/gi, "\n")
    .replace(/<p\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div\b[^>]*>/gi, "")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n");
}

export function getSidebarLines(sidebarInfo) {
  const plain = stripHtmlTags(htmlSidebarToPlainWithBreaks(sidebarInfo)).trim();

  if (!plain) {
    return [];
  }

  return plain
    .split(/\n+/)
    .map((block) => block.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .filter((block) => !COMPRE_PASSEIO_LABEL_RE.test(block));
}

export function fixAttractionActionHrefs(html, contatoHref) {
  let out = String(html || "");
  out = out.replace(/\bhref=(["'])\/contato\1/gi, `href=$1${contatoHref}$1`);
  return out;
}

const GUIDE_LOCAL_CTA_LABEL_RE = /contrate\s+um\s+guia\s+local/i;

/** Reescreve botões "Contrate um guia local!" para abrir WhatsApp com mensagem pré-preenchida. */
export function rewriteGuideLocalCtaToWhatsApp(html, waUrl) {
  if (!html || !waUrl) {
    return html;
  }

  const safeUrl = String(waUrl);

  return String(html).replace(
    /<a\b([^>]*?)href=(["'])[^"']*\2([^>]*?)>([\s\S]*?)<\/a>/gi,
    (full, before, q, after, inner) => {
      const label = inner.replace(/<[^>]+>/g, "").trim();
      if (!GUIDE_LOCAL_CTA_LABEL_RE.test(label)) {
        return full;
      }

      const attrs = `${before}${after}`
        .replace(/\s*target=(["'])[^"']*\1/gi, "")
        .replace(/\s*rel=(["'])[^"']*\1/gi, "")
        .trim();
      const spacer = attrs ? ` ${attrs}` : "";

      return `<a href=${q}${safeUrl}${q}${spacer} target="_blank" rel="noopener noreferrer">${inner}</a>`;
    },
  );
}

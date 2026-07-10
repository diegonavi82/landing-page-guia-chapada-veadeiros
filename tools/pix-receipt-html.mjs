/**
 * Recibo Pix em HTML para e-mail (servidor mock / recover-by-email).
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, "api", ".env");

function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const LABELS = {
  pt: {
    subject: " - Reserva",
    docTitle: "RECIBO DE PAGAMENTO PIX",
    introPaid: "Confirmamos o recebimento de {{amount}} via Pix referente à reserva {{code}}.",
    introPending: "Reserva {{code}} registrada. Valor: {{amount}}. Aguardando confirmação do Pix.",
    itinerary: "Itinerário",
    colDate: "Data",
    colDest: "Destino",
    colGuide: "Guia",
    colDeparture: "Saída",
    colPeople: "Pessoas",
    colTotal: "Total",
    financial: "Resumo financeiro",
    finTotal: "Valor total",
    finReceived: "Recebido via Pix",
    included: "Incluído",
    excluded: "Não incluído",
    inclDefault: "Passeio com guia local",
    exclDefault: "Transporte, ingresso e almoço",
    emitted: "Emitido em",
    contact: "Contato",
    confirm: "Ver confirmação",
    lookup: "Consultar reserva",
  },
  en: {
    subject: "Pix receipt — Reservation ",
    docTitle: "PIX PAYMENT RECEIPT",
    introPaid: "We confirm receipt of {{amount}} via Pix for reservation {{code}}.",
    introPending: "Reservation {{code}} registered. Amount: {{amount}}. Awaiting Pix confirmation.",
    itinerary: "Itinerary",
    colDate: "Date",
    colDest: "Destination",
    colGuide: "Guide",
    colDeparture: "Meeting point",
    colPeople: "People",
    colTotal: "Total",
    financial: "Payment summary",
    finTotal: "Total",
    finReceived: "Received via Pix",
    included: "Included",
    excluded: "Not included",
    inclDefault: "Tour with local guide",
    exclDefault: "Transport, admission and lunch",
    emitted: "Issued on",
    contact: "Contact",
    confirm: "View confirmation",
    lookup: "Look up reservation",
  },
  es: {
    subject: "Recibo Pix — Reserva ",
    docTitle: "RECIBO DE PAGO PIX",
    introPaid: "Confirmamos la recepción de {{amount}} vía Pix para la reserva {{code}}.",
    introPending: "Reserva {{code}} registrada. Valor: {{amount}}. Esperando confirmación del Pix.",
    itinerary: "Itinerario",
    colDate: "Fecha",
    colDest: "Destino",
    colGuide: "Guía",
    colDeparture: "Salida",
    colPeople: "Personas",
    colTotal: "Total",
    financial: "Resumen financiero",
    finTotal: "Valor total",
    finReceived: "Recibido vía Pix",
    included: "Incluido",
    excluded: "No incluido",
    inclDefault: "Paseo con guía local",
    exclDefault: "Transporte, entrada y almuerzo",
    emitted: "Emitido el",
    contact: "Contacto",
    confirm: "Ver confirmación",
    lookup: "Consultar reserva",
  },
};

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tpl(text, vars) {
  return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
}

function formatBrl(n) {
  const v = Number(n);
  return "R$ " + (Number.isFinite(v) ? v : 0).toFixed(2).replace(".", ",");
}

function tripDateLabel(t) {
  const short = String(t?.dateShort || "").trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(short)) return short;
  const iso = String(t?.dateIso || t?.dateISO || "").trim();
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const day = String(t?.dayNum || "").trim();
  const month = String(t?.monthName || "").trim();
  if (day && month) {
    const year = (iso.match(/^(20\d{2})/) || [])[1] || String(new Date().getFullYear());
    return `${day} de ${month}/${year}`;
  }
  const label = String(t?.dateLabel || "").trim();
  if (label && !/teste\s*pix|pix\s*test/i.test(label)) return label;
  return short || "—";
}

function pixEffectiveStatus(rec) {
  if (!rec) return "PENDING";
  if (rec.status === "PAID") return "PAID";
  const exp = Date.parse(rec.expires_at || "");
  if (Number.isFinite(exp) && Date.now() > exp) return "EXPIRED";
  return "PENDING";
}

function resolveInclExcl(rec) {
  const incl = [];
  const excl = [];
  const ie = rec.incl_excl || rec.inclExcl;
  if (ie) {
    (ie.incl || []).forEach((x) => incl.push(x));
    (ie.excl || []).forEach((x) => excl.push(x));
  }
  return { incl, excl };
}

function receiptLinksFooter(code, locale, appUrl, buyerEmail) {
  const L = LABELS[locale] || LABELS.pt;
  const lookupBase =
    locale === "en" ? "/en/consultar-reserva.html" : locale === "es" ? "/es/consultar-reserva.html" : "/consultar-reserva.html";
  const confirmBase =
    locale === "en" ? "/en/confirmacao.html" : locale === "es" ? "/es/confirmacao.html" : "/confirmacao.html";
  let lookupUrl = appUrl + lookupBase + "?id=" + encodeURIComponent(code);
  const email = String(buyerEmail || "").trim();
  if (email) {
    lookupUrl += "&email=" + encodeURIComponent(email) + "&auto=1";
  }
  const confirmUrl = appUrl + confirmBase + "?id=" + encodeURIComponent(code);
  return (
    '<div style="max-width:640px;margin:24px auto 0;padding:16px 20px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">' +
    `<p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#064e3b;">${esc(L.confirm)} / ${esc(L.lookup)}</p>` +
    `<p style="margin:0;">` +
    `<a href="${esc(confirmUrl)}" style="display:inline-block;margin:0 8px 6px 0;padding:10px 14px;background:#064e3b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">${esc(L.confirm)}</a>` +
    `<a href="${esc(lookupUrl)}" style="display:inline-block;margin:0 0 6px;padding:10px 14px;background:#fff;color:#064e3b;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;border:2px solid #064e3b;">${esc(L.lookup)}</a></p></div>`
  );
}

/**
 * @param {Record<string, unknown>} rec
 * @param {string} locale
 */
export function buildPixReceiptEmailHtml(rec, locale) {
  const loc = ["en", "es"].includes(locale) ? locale : "pt";
  const L = LABELS[loc];
  const appUrl = (loadEnv().APP_URL || "https://www.guiachapadaveadeiros.com").replace(/\/$/, "");
  const code = String(rec.reservation_id || "").toUpperCase();
  const amount = Number(rec.amount) || 0;
  const st = pixEffectiveStatus(rec);
  const trips = Array.isArray(rec.trips) ? rec.trips : [];
  const cov = resolveInclExcl(rec);
  const incl = cov.incl.length ? cov.incl : [L.inclDefault];
  const excl = cov.excl.length ? cov.excl : [L.exclDefault];
  const introKey = st === "PAID" ? "introPaid" : "introPending";
  const emitted = new Date().toLocaleDateString(loc === "en" ? "en-US" : loc === "es" ? "es-ES" : "pt-BR");

  let tripRows = "";
  for (const t of trips) {
    const qty = Math.max(1, parseInt(String(t.qty), 10) || 1);
    const unit = parseInt(String(t.valorUnit), 10) || amount;
    tripRows +=
      "<tr>" +
      `<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">${esc(tripDateLabel(t))}</td>` +
      `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${esc(t.destino || "—")}</td>` +
      `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${esc(t.guiaNome || "—")}</td>` +
      `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${esc([t.embarque, t.hora].filter(Boolean).join(" · ") || "—")}</td>` +
      `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${esc(String(qty))}</td>` +
      `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${esc(formatBrl(unit * qty))}</td>` +
      "</tr>";
  }
  if (!tripRows) {
    tripRows = `<tr><td colspan="6" style="padding:8px;color:#64748b;">—</td></tr>`;
  }

  const body =
    `<div style="max-width:640px;margin:0 auto;padding:20px 24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;font-family:Inter,Arial,sans-serif;color:#0f172a;">` +
    `<h1 style="margin:0 0 8px;font-size:16px;color:#064e3b;">${esc(L.docTitle)}</h1>` +
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#334155;">${esc(tpl(L[introKey], { amount: formatBrl(amount), code }))}</p>` +
    `<h2 style="margin:0 0 8px;font-size:13px;color:#064e3b;">${esc(L.itinerary)}</h2>` +
    `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:0 0 16px;">` +
    `<thead><tr style="background:#f8fafc;">` +
    `<th style="padding:6px 8px;text-align:left;">${esc(L.colDate)}</th>` +
    `<th style="padding:6px 8px;text-align:left;">${esc(L.colDest)}</th>` +
    `<th style="padding:6px 8px;text-align:left;">${esc(L.colGuide)}</th>` +
    `<th style="padding:6px 8px;text-align:left;">${esc(L.colDeparture)}</th>` +
    `<th style="padding:6px 8px;text-align:center;">${esc(L.colPeople)}</th>` +
    `<th style="padding:6px 8px;text-align:right;">${esc(L.colTotal)}</th>` +
    `</tr></thead><tbody>${tripRows}</tbody></table>` +
    `<div style="display:flex;flex-wrap:wrap;gap:12px;margin:0 0 16px;">` +
    `<div style="flex:1;min-width:140px;padding:12px;background:#f8fafc;border-radius:8px;">` +
    `<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#064e3b;">${esc(L.financial)}</p>` +
    `<p style="margin:0 0 4px;font-size:12px;"><span>${esc(L.finTotal)}:</span> <strong>${esc(formatBrl(amount))}</strong></p>` +
    `<p style="margin:0;font-size:12px;"><span>${esc(st === "PAID" ? L.finReceived : L.finTotal)}:</span> <strong>${esc(formatBrl(st === "PAID" ? amount : 0))}</strong></p></div>` +
    `<div style="flex:1;min-width:140px;padding:12px;background:#f8fafc;border-radius:8px;">` +
    `<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#065f46;">${esc(L.included)}</p>` +
    `<ul style="margin:0 0 8px;padding:0 0 0 16px;font-size:11px;color:#065f46;">${incl.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` +
    `<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#991b1b;">${esc(L.excluded)}</p>` +
    `<ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:#991b1b;">${excl.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>` +
    `<p style="margin:0;font-size:11px;color:#64748b;">${esc(L.emitted)}: ${esc(emitted)} · ${esc(L.contact)}: +55 62 98250-6891</p></div>` +
    receiptLinksFooter(code, loc, appUrl, rec.email || rec.buyer_email || "");

  return `<!DOCTYPE html><html lang="${loc}"><head><meta charset="utf-8"></head><body style="margin:0;padding:24px 16px;background:#f5f5f5;">${body}</body></html>`;
}

export function receiptEmailSubject(code, locale) {
  return String(code || "").toUpperCase() + " - Reserva";
}

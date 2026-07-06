/**
 * E-mail em desenvolvimento — SMTP via api/.env ou grava em dev-outbox.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, "api", ".env");
const OUTBOX_DIR = path.join(ROOT, "api", "storage", "dev-outbox");

/** @type {Record<string, string> | null} */
let envCache = null;

function loadEnv() {
  if (envCache) return envCache;
  envCache = {};
  if (!fs.existsSync(ENV_PATH)) return envCache;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    envCache[key] = val;
  }
  return envCache;
}

function emailLayout(title, bodyHtml) {
  const appUrl = loadEnv().APP_URL || "https://www.guiachapadaveadeiros.com";
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0f3d2e;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:20px;">Guia Chapada Veadeiros</h1></td></tr>
<tr><td style="padding:32px;">${bodyHtml}</td></tr>
<tr><td style="background:#f5f5f5;padding:16px 32px;text-align:center;color:#666;font-size:12px;">
© 2026 Guia Chapada Veadeiros — <a href="${appUrl}" style="color:#0f3d2e;">${appUrl}</a>
</td></tr></table></td></tr></table></body></html>`;
}

/**
 * @param {{ to: string, subject: string, html: string }} opts
 * @returns {Promise<{ ok: boolean, via?: string, file?: string, error?: string }>}
 */
export async function sendDevMail(opts) {
  const to = String(opts.to || "").trim();
  const subject = String(opts.subject || "").trim();
  const html = String(opts.html || "");
  if (!to || !subject || !html) {
    return { ok: false, error: "missing fields" };
  }

  const env = loadEnv();
  const user = env.SMTP_USER || "";
  const pass = env.SMTP_PASS || "";
  const from = env.SMTP_FROM || user || "contato@guiachapadaveadeiros.com";
  const host = env.SMTP_HOST || "smtp.hostinger.com";
  const port = parseInt(env.SMTP_PORT || "587", 10) || 587;
  const fullHtml = opts.fullDocument ? html : emailLayout(subject, html);

  if (user && pass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: `"Guia Chapada Veadeiros" <${from}>`,
        to,
        subject,
        html: fullHtml,
        text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      });
      console.log("[mock-mail] ✉ Enviado via SMTP →", to, "|", subject);
      return { ok: true, via: "smtp" };
    } catch (err) {
      console.error("[mock-mail] SMTP falhou:", err && err.message ? err.message : err);
    }
  } else {
    console.warn("[mock-mail] SMTP não configurado (api/.env: SMTP_USER / SMTP_PASS)");
  }

  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  const slug = subject.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  const file = path.join(OUTBOX_DIR, `${Date.now()}-${slug || "mail"}.html`);
  fs.writeFileSync(
    file,
    `<!-- Para: ${to} -->\n<!-- Assunto: ${subject} -->\n${fullHtml}`,
    "utf8",
  );
  console.log("[mock-mail] 📁 Salvo em dev-outbox:", file);
  return { ok: true, via: "outbox", file };
}

const RECOVER_LABELS = {
  pt: {
    subject: "Seus códigos de reserva — Guia Chapada Veadeiros",
    hello: "Olá!",
    lead: "Encontramos reserva(s) Pix vinculada(s) a este e-mail:",
    status: "Status",
    amount: "Valor",
    consult: "Consultar reserva",
    confirm: "Ver confirmação",
    pending: "Aguardando pagamento",
    paid: "Pagamento confirmado",
    expired: "Pix expirado",
    footer:
      "Use o mesmo e-mail ao consultar no site. Se não reconhece estas reservas, ignore este e-mail.",
  },
  en: {
    subject: "Your reservation codes — Guia Chapada Veadeiros",
    hello: "Hello!",
    lead: "We found Pix reservation(s) linked to this email:",
    status: "Status",
    amount: "Amount",
    consult: "Look up reservation",
    confirm: "View confirmation",
    pending: "Awaiting payment",
    paid: "Payment confirmed",
    expired: "Pix expired",
    footer:
      "Use the same email when looking up on the site. If you do not recognize these, ignore this email.",
  },
  es: {
    subject: "Sus códigos de reserva — Guia Chapada Veadeiros",
    hello: "¡Hola!",
    lead: "Encontramos reserva(s) Pix vinculada(s) a este correo:",
    status: "Estado",
    amount: "Valor",
    consult: "Consultar reserva",
    confirm: "Ver confirmación",
    pending: "Esperando pago",
    paid: "Pago confirmado",
    expired: "Pix expirado",
    footer:
      "Use el mismo correo al consultar en el sitio. Si no reconoce estas reservas, ignore este correo.",
  },
};

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(st, L) {
  const u = String(st || "").toUpperCase();
  if (u === "PAID") return L.paid;
  if (u === "EXPIRED") return L.expired;
  return L.pending;
}

function pixEffectiveStatus(rec) {
  if (!rec) return "PENDING";
  if (rec.status === "PAID") return "PAID";
  const exp = Date.parse(rec.expires_at || "");
  if (Number.isFinite(exp) && Date.now() > exp) return "EXPIRED";
  return "PENDING";
}

/**
 * @param {Array<Record<string, unknown>>} reservations
 * @param {string} email
 * @param {string} locale
 */
export function buildRecoverEmailHtml(reservations, email, locale) {
  const L = RECOVER_LABELS[locale] || RECOVER_LABELS.pt;
  const appUrl = (loadEnv().APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const lookupBase =
    locale === "en"
      ? "/en/consultar-reserva.html"
      : locale === "es"
        ? "/es/consultar-reserva.html"
        : "/consultar-reserva.html";
  const confirmBase =
    locale === "en"
      ? "/en/confirmacao.html"
      : locale === "es"
        ? "/es/confirmacao.html"
        : "/confirmacao.html";

  let rows = "";
  for (const res of reservations) {
    const code = String(res.reservation_id || "").toUpperCase();
    if (!/^GCV-[A-Z0-9]{6}$/.test(code)) continue;
    const st = pixEffectiveStatus(res);
    const amount =
      res.amount != null
        ? "R$ " + Number(res.amount).toFixed(2).replace(".", ",")
        : "";
    const lookupUrl =
      appUrl +
      lookupBase +
      "?id=" +
      encodeURIComponent(code) +
      "&email=" +
      encodeURIComponent(email) +
      "&auto=1";
    const confirmUrl = appUrl + confirmBase + "?id=" + encodeURIComponent(code);
    rows +=
      '<div style="margin:0 0 16px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">' +
      `<p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#064e3b;">${esc(code)}</p>` +
      `<p style="margin:0 0 4px;font-size:14px;color:#334155;"><strong>${esc(L.status)}:</strong> ${esc(statusLabel(st, L))}</p>`;
    if (amount) {
      rows += `<p style="margin:0 0 10px;font-size:14px;color:#334155;"><strong>${esc(L.amount)}:</strong> ${esc(amount)}</p>`;
    }
    rows +=
      `<p style="margin:0;">` +
      `<a href="${esc(lookupUrl)}" style="display:inline-block;margin:0 8px 6px 0;padding:10px 14px;background:#064e3b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">${esc(L.consult)}</a>` +
      `<a href="${esc(confirmUrl)}" style="display:inline-block;margin:0 0 6px;padding:10px 14px;background:#fff;color:#064e3b;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;border:2px solid #064e3b;">${esc(L.confirm)}</a></p></div>`;
  }

  return (
    `<p style="margin:0 0 12px;font-size:16px;">${esc(L.hello)}</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#334155;">${esc(L.lead)}</p>` +
    rows +
    `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#64748b;">${esc(L.footer)}</p>`
  );
}

export function recoverEmailSubject(locale) {
  const L = RECOVER_LABELS[locale] || RECOVER_LABELS.pt;
  return L.subject;
}

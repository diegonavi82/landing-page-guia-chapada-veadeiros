/**
 * Servidor de desenvolvimento local com mock da API PHP.
 * Uso: node tools/mock-server.mjs [role]
 *   role: guide (padrão), admin, client
 * Acesse: http://localhost:3000
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendDevMail, buildRecoverEmailHtml, recoverEmailSubject } from "./mock-mail.mjs";
import { excursaoRowsForLocale } from "./excursoes-carousel-data.mjs";
import { buildPixReceiptEmailHtml, receiptEmailSubject } from "./pix-receipt-html.mjs";
import { createPaymentsMock } from "./mock-payments.mjs";
import { createAnfitriaoApi } from "./mock-anfitriao.mjs";
import { lerPaginasAtrativo, gravarPaginasAtrativo } from "./pagina-atrativo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = 3000;
const PIX_STORE_DIR = path.join(ROOT, "api", "storage", "pix_reservations");
const WAITLIST_STORE = path.join(ROOT, "api", "storage", "excursao_waitlist", "index.json");

/** @type {Record<string, { status: string, amount: number, expires_at: string, trips?: unknown[], locale?: string }>} */
const pixMem = {};

/** @type {Record<string, Array<Record<string, string>>>} */
const waitlistMem = {};

function ensurePixDir() {
  fs.mkdirSync(PIX_STORE_DIR, { recursive: true });
}

function slugDestino(dest) {
  return String(dest || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cartIdFromTrip(t) {
  if (!t) return "";
  if (t.cartId) return String(t.cartId);
  const iso = t.dateIso || t.dateISO || "";
  const dest = slugDestino(t.destino);
  return iso && dest ? `${iso}-${dest}` : "";
}

function cartIdFromRow(e) {
  if (!e) return "";
  const iso = e.dateISO || e.dateIso || "";
  const dest = slugDestino(e.destino);
  return iso && dest ? `${iso}-${dest}` : "";
}

/** @param {unknown[]} trips @param {string} locale */
function enrichTripsGuia(trips, locale = "pt") {
  if (!Array.isArray(trips) || !trips.length) return trips;
  const rows = [];
  for (const loc of [locale, "pt", "en", "es"]) {
    rows.push(...excursaoRowsForLocale(loc));
  }
  return trips.map((t) => {
    if (!t || typeof t !== "object" || t.guiaNome) return t;
    const trip = /** @type {Record<string, unknown>} */ (t);
    const cid = cartIdFromTrip(trip);
    for (const row of rows) {
      if (!row?.guiaNome) continue;
      if (cid && cartIdFromRow(row) === cid) {
        return { ...trip, guiaNome: String(row.guiaNome) };
      }
      const iso = String(trip.dateIso || trip.dateISO || "");
      if (iso && row.dateISO === iso && String(trip.destino || "") === String(row.destino || "")) {
        return { ...trip, guiaNome: String(row.guiaNome) };
      }
    }
    return t;
  });
}

function pixRead(id) {
  const safe = String(id || "").toUpperCase();
  if (pixMem[safe]) return pixMem[safe];
  ensurePixDir();
  const fp = path.join(PIX_STORE_DIR, `${safe}.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    return null;
  }
}

function pixWrite(id, data) {
  const safe = String(id || "").toUpperCase();
  pixMem[safe] = data;
  ensurePixDir();
  fs.writeFileSync(path.join(PIX_STORE_DIR, `${safe}.json`), JSON.stringify(data, null, 2));
}

function pixEffectiveStatus(rec) {
  if (!rec) return "PENDING";
  if (rec.status === "PAID") return "PAID";
  if (rec.status === "AUTHORIZED" || rec.status === "CARD_SAVED") return rec.status;
  if (rec.status === "CANCELLED" || rec.status === "CANCELED" || rec.status === "REFUNDED" || rec.status === "RELEASED") {
    return "CANCELLED";
  }
  const exp = Date.parse(rec.expires_at || "");
  if (Number.isFinite(exp) && Date.now() > exp) return "EXPIRED";
  return "PENDING";
}

function annotateMockTrips(rec) {
  const trips = Array.isArray(rec.trips) ? rec.trips : [];
  const refunds = Array.isArray(rec.pix_refunds) ? rec.pix_refunds : [];
  const refundedIdx = new Set(
    refunds
      .filter((r) => r && (r.status === "DEVOLVIDO" || r.status === "EM_PROCESSAMENTO"))
      .map((r) => Number(r.trip_index)),
  );
  const totalCents = Math.round((Number(rec.amount) || 0) * 100);
  const raw = trips.map((t) => Math.max(0, (parseInt(t.valorUnit, 10) || 0) * Math.max(1, parseInt(t.qty, 10) || 1)));
  const sum = raw.reduce((a, b) => a + b, 0);
  let running = 0;
  return trips.map((t, i) => {
    const life = String(t.lifecycle || "");
    const decision = String(t.decision || "").toUpperCase();
    const refunded = refundedIdx.has(i) || decision === "CANCELLED" || t.refunded === true;
    const confirmed = !refunded && (t.confirmed === true || life === "confirmada" || life === "concluida" || decision === "CONFIRMED" || decision === "CAPTURED");
    let cents;
    if (i === trips.length - 1) cents = Math.max(0, totalCents - running);
    else {
      cents = sum > 0 ? Math.round((totalCents * raw[i]) / sum) : Math.floor(totalCents / Math.max(1, trips.length));
      running += cents;
    }
    return {
      ...t,
      trip_index: i,
      cents,
      can_cancel: !refunded && !confirmed,
      confirmed,
      refunded,
      lifecycle: refunded ? "cancelada" : confirmed ? life || "confirmada" : life || "em_formacao",
    };
  });
}

function hasAdminPreview(req) {
  return /(?:^|;\s*)gcv_preview=1(?:;|$)/.test(String((req && req.headers && req.headers.cookie) || ""));
}

function isPreviewAdmin(account) {
  const email = String((account && account.email) || "").toLowerCase();
  return account && account.role === "admin" && account.status === "active"
    && (email === "diegonavi82@gmail.com" || email === "diegocsp82@gmail.com");
}

function previewCookie(on) {
  return "gcv_preview=" + (on ? "1" : "") + "; Path=/; Max-Age=" + (on ? "86400" : "0") + "; SameSite=Lax";
}

let adminPreviewCookie = false;

function flagOn(key) {
  const v = String(readEnvValue(key) || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "sim";
}

function readEnvValue(key) {
  const envPath = path.join(ROOT, "api", ".env");
  if (!fs.existsSync(envPath)) return "";
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    if (t.slice(0, i).trim() !== key) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return "";
}

function stripeForm(fields) {
  const params = new URLSearchParams();
  const add = (prefix, value) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) => add(`${prefix}[${i}]`, item));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) add(`${prefix}[${k}]`, v);
    } else if (value != null) {
      params.append(prefix, String(value));
    }
  };
  for (const [k, v] of Object.entries(fields)) add(k, v);
  return params
    .toString()
    .replace(/%7BCHECKOUT_SESSION_ID%7D/gi, "{CHECKOUT_SESSION_ID}");
}

async function stripeApi(method, stripePath, fields) {
  const key = readEnvValue("STRIPE_SECRET_KEY");
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) {
    return { ok: false, error: "producao_bloqueada_no_localhost" };
  }
  if (!key.startsWith("sk_") && !key.startsWith("rk_")) {
    return { ok: false, error: "stripe_not_configured" };
  }
  const init = {
    method,
    headers: { Authorization: "Bearer " + key },
  };
  if (fields) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = stripeForm(fields);
  }
  const response = await fetch("https://api.stripe.com" + stripePath, init);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    const message = (data && data.error && data.error.message) || "stripe_error";
    console.error("[stripe]", method, stripePath, response.status, message);
    return { ok: false, error: message, http: response.status };
  }
  return { ok: true, data };
}

function requestOrigin(req) {
  const host = req.headers.host || "localhost:" + PORT;
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  return proto + "://" + host;
}

function safeReturnPath(input) {
  const p = String(input || "/");
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("..") || p.includes("\\")) return "/";
  return p.slice(0, 300);
}

function stripeLocale(locale) {
  return locale === "en" || locale === "es" ? locale : "pt";
}

function stripeTripIso(trip) {
  const iso = String((trip && (trip.dateIso || trip.dateISO)) || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const label = String((trip && (trip.dateLabel || trip.dateShort)) || "");
  const m = label.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  const id = String((trip && (trip.cartId || trip.id)) || "");
  const fromId = id.match(/(20\d{2}-\d{2}-\d{2})/);
  return fromId ? fromId[1] : "";
}

function stripeTripDate(trip) {
  const label = String((trip && (trip.dateLabel || trip.dateShort)) || "");
  const m = label.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + m[3];
  const iso = stripeTripIso(trip);
  return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "";
}

function stripeWeekday(iso, locale) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  const names = {
    pt: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  };
  return (names[stripeLocale(locale)] || names.pt)[day] || "";
}

function stripeTripPeople(trip) {
  const pessoas = parseInt(String(trip && trip.pessoas), 10);
  if (pessoas > 0) return pessoas;
  const qty = parseInt(String(trip && trip.qty), 10);
  return qty > 0 ? qty : 0;
}

function stripeTripTransport(trip) {
  const v = trip && trip.comTransporte;
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  if (v === false || v === 0 || v === "0" || v === "false") return false;
  const id = String((trip && (trip.cartId || trip.id)) || "");
  const m = id.match(/-(t|s)(?:-bi-(?:en|es))?$/);
  if (m) return m[1] === "t";
  return null;
}

function stripeTripLang(trip) {
  const code = String((trip && (trip.guiaIdioma || trip.idiomaGuia)) || "").toLowerCase();
  if (code === "pt" || code === "en" || code === "es") return code;
  const id = String((trip && (trip.cartId || trip.id)) || "");
  const bi = id.match(/-bi-(en|es)$/);
  if (bi) return bi[1];
  if (id.startsWith("roteiro-")) return "pt";
  return "";
}

function stripeTripMode(trip) {
  const mode = String((trip && trip.modalidade) || "").toLowerCase();
  if (mode === "excursao" || mode === "exclusivo") return mode;
  const id = String((trip && (trip.cartId || trip.id)) || "");
  if (id.includes("-exclusivo-")) return "exclusivo";
  if (id.includes("-excursao-")) return "excursao";
  return "";
}

function stripeTripDescription(trip, locale) {
  const loc = stripeLocale(locale);
  const copy = {
    pt: { person: "pessoa", people: "pessoas", with: "Com translado", without: "Sem translado", from: "Saindo de ", date: "Data: ", day: "Dia: ", lang: "Idioma do guia: ", group: "Excursão", private: "Privativo" },
    en: { person: "person", people: "people", with: "With transfer", without: "Without transfer", from: "Leaving from ", date: "Date: ", day: "Day: ", lang: "Guide language: ", group: "Group", private: "Private" },
    es: { person: "persona", people: "personas", with: "Con traslado", without: "Sin traslado", from: "Saliendo de ", date: "Fecha: ", day: "Día: ", lang: "Idioma del guía: ", group: "En grupo", private: "Privado" },
  };
  const langs = {
    pt: { pt: "Português", en: "Inglês", es: "Espanhol" },
    en: { pt: "Portuguese", en: "English", es: "Spanish" },
    es: { pt: "Portugués", en: "Inglés", es: "Español" },
  };
  const c = copy[loc];
  const bits = [];
  const people = stripeTripPeople(trip);
  if (people > 0) bits.push(people + " " + (people === 1 ? c.person : c.people));
  const ride = stripeTripTransport(trip);
  if (ride !== null) bits.push(ride ? c.with : c.without);
  const city = String((trip && trip.embarque) || "").trim();
  if (city) bits.push(c.from + city);
  const date = stripeTripDate(trip);
  if (date) bits.push(c.date + date);
  const day = stripeWeekday(stripeTripIso(trip), loc);
  if (day) bits.push(c.day + day);
  const lang = stripeTripLang(trip);
  if (lang && langs[loc][lang]) bits.push(c.lang + langs[loc][lang]);
  const mode = stripeTripMode(trip);
  if (mode === "exclusivo") bits.push(c.private);
  else if (mode === "excursao") bits.push(c.group);
  return bits.join(" · ").slice(0, 500);
}

function stripeItemName(trip, reservationId) {
  const dest = String((trip && (trip.destino || trip.title)) || "").trim() || "Passeio Guia Chapada Veadeiros";
  return (dest + " (" + reservationId + ")").slice(0, 250);
}

function stripeTripCents(trip) {
  const unit = parseInt(String(trip && trip.valorUnit), 10) || 0;
  const qty = parseInt(String(trip && trip.qty), 10) || 0;
  return unit > 0 && qty > 0 ? unit * qty * 100 : 0;
}

function stripeLineItems(data, reservationId, cents, locale) {
  const trips = (Array.isArray(data.trips) ? data.trips : []).filter((t) => t && typeof t === "object");
  if (!trips.length) trips.push({});
  let amounts = trips.map(stripeTripCents);
  let sum = amounts.reduce((a, b) => a + b, 0);
  let split = trips.length > 1 && sum > 0;
  if (split && sum !== cents) {
    let running = 0;
    const last = amounts.length - 1;
    for (let i = 0; i < last; i++) {
      amounts[i] = Math.round((amounts[i] * cents) / sum);
      running += amounts[i];
    }
    amounts[last] = cents - running;
  }
  if (split && amounts.some((n) => n < 1)) split = false;
  const product = (trip, description) => {
    const row = { name: stripeItemName(trip, reservationId) };
    if (description) row.description = description;
    return row;
  };
  if (!split) {
    const parts = trips
      .map((trip) => {
        const desc = stripeTripDescription(trip, locale);
        const title = String((trip && (trip.destino || trip.title)) || "").trim();
        if (trips.length > 1 && title) return title + (desc ? " · " + desc : "");
        return desc;
      })
      .filter(Boolean);
    return [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: cents,
          product_data: product(trips[0], parts.join(" | ").slice(0, 500)),
        },
      },
    ];
  }
  return trips.map((trip, i) => ({
    quantity: 1,
    price_data: {
      currency: "brl",
      unit_amount: amounts[i],
      product_data: product(trip, stripeTripDescription(trip, locale)),
    },
  }));
}

function confirmPathForLocale(locale) {
  if (locale === "en") return "/en/confirmacao.html";
  if (locale === "es") return "/es/confirmacao.html";
  return "/confirmacao.html";
}

async function handleStripeCheckout(body, req, res) {
  const fail = (code, message) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, message }));
  };
  let data;
  try {
    data = JSON.parse(body || "{}");
  } catch {
    fail(400, "Invalid JSON");
    return;
  }
  const id = String(data.reservation_id || "").toUpperCase();
  if (!/^GCV-[A-Z0-9]{6}$/.test(id)) {
    fail(422, "Invalid reservation_id");
    return;
  }
  const cents = Math.round(Number(data.amount) * 100);
  if (!Number.isFinite(cents) || cents < 50 || cents > 10000000) {
    fail(422, "Invalid amount");
    return;
  }
  const email = String(data.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(422, "Invalid email");
    return;
  }
  const name = String(data.name || "").trim();
  if (!name) {
    fail(422, "Invalid name");
    return;
  }
  const locale = data.locale === "en" || data.locale === "es" ? data.locale : "pt";
  const returnPath = safeReturnPath(data.return_path || "/");
  const existing = pixRead(id);
  if (existing && existing.status === "PAID") {
    fail(409, "Reservation already paid");
    return;
  }
  if (existing && existing.stripe_session_id) {
    const prev = await stripeApi("GET", "/v1/checkout/sessions/" + encodeURIComponent(existing.stripe_session_id));
    if (prev.ok && prev.data.status === "open" && prev.data.url) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: true, url: prev.data.url, reservation_id: id }));
      return;
    }
  }

  const rec = {
    reservation_id: id,
    status: "PENDING",
    amount: cents / 100,
    amount_cents: cents,
    locale,
    trips: data.trips || [],
    email,
    name: name.slice(0, 160),
    customer_name: name.slice(0, 160),
    payment_method: "card",
    pix_mode: "stripe",
    return_path: returnPath,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };
  if (data.incl_excl && typeof data.incl_excl === "object") rec.incl_excl = data.incl_excl;
  if (Array.isArray(data.packages) && data.packages.length) rec.packages = data.packages;
  const phone = String(data.phone || "").trim();
  if (phone.replace(/\D/g, "").length >= 10) rec.phone = phone;
  pixWrite(id, rec);

  const origin = requestOrigin(req);
  const session = await stripeApi("POST", "/v1/checkout/sessions", {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    client_reference_id: id,
    success_url: origin + "/api/stripe_return.php?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + returnPath,
    metadata: { reservation_id: id, locale },
    line_items: stripeLineItems(data, id, cents, locale),
  });
  if (!session.ok || !session.data.url) {
    fail(502, "Não foi possível abrir o pagamento com cartão.");
    return;
  }
  rec.stripe_session_id = session.data.id || "";
  pixWrite(id, rec);
  console.log("[stripe] checkout", id);
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ success: true, url: session.data.url, reservation_id: id }));
}

async function handleStripeReturn(req, res) {
  const u = new URL(req.url, "http://localhost");
  const sessionId = String(u.searchParams.get("session_id") || "");
  const go = (target) => {
    res.writeHead(302, { Location: target });
    res.end();
  };
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    go("/");
    return;
  }
  const session = await stripeApi("GET", "/v1/checkout/sessions/" + encodeURIComponent(sessionId));
  if (!session.ok) {
    go("/");
    return;
  }
  const data = session.data;
  const meta = data.metadata || {};
  const id = String(meta.reservation_id || data.client_reference_id || "").toUpperCase();
  const locale = meta.locale === "en" || meta.locale === "es" ? meta.locale : "pt";
  const rec = /^GCV-[A-Z0-9]{6}$/.test(id) ? pixRead(id) : null;
  const cancel = rec && rec.return_path ? safeReturnPath(rec.return_path) : "/";
  if (data.payment_status !== "paid" || !rec) {
    go(cancel);
    return;
  }
  const expected = Number(rec.amount_cents) || Math.round(Number(rec.amount) * 100);
  if (expected < 50 || Number(data.amount_total) !== expected) {
    console.error("[stripe] amount mismatch", id);
    go(cancel);
    return;
  }
  rec.status = "PAID";
  rec.paid_at = rec.paid_at || new Date().toISOString();
  rec.paid_source = "stripe";
  rec.stripe_session_id = sessionId;
  if (data.payment_intent) rec.stripe_payment_intent = String(data.payment_intent);
  pixWrite(id, rec);
  console.log("[stripe] paid", id);
  go(confirmPathForLocale(locale) + "?id=" + encodeURIComponent(id));
}

function handleStripeApi(urlPath, req, res) {
  if (urlPath === "/api/stripe_checkout.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      handleStripeCheckout(body, req, res).catch((err) => {
        console.error("[stripe] checkout", err && err.message);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "Não foi possível abrir o pagamento com cartão." }));
      });
    });
    return true;
  }
  if (urlPath === "/api/stripe_return.php" && (req.method === "GET" || req.method === "HEAD")) {
    handleStripeReturn(req, res).catch((err) => {
      console.error("[stripe] return", err && err.message);
      res.writeHead(302, { Location: "/" });
      res.end();
    });
    return true;
  }
  return false;
}

function handlePixApi(urlPath, req, res) {
  if (urlPath === "/api/register_pix_reservation.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const id = String(data.reservation_id || "").toUpperCase();
        const expiresIn = Math.max(60, parseInt(String(data.expires_in), 10) || 480);
        const cupom = cupomSobreCarrinho(data);
        if (cupom.invalido) {
          res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: cupom.message || "Cupom inválido" }));
          return;
        }
        const prev = pixRead(id);
        if (prev && prev.status === "PAID") {
          console.log("[mock] Pix reserva reaberta (substitui PAID):", id);
        }
        const rec = {
          reservation_id: id,
          status: "PENDING",
          amount: cupom.aplicado ? cupom.esperadoReais : Number(data.amount) || 0,
          cupom: cupom.codigo || "",
          locale: data.locale || "pt",
          trips: data.trips || [],
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          created_at: new Date().toISOString(),
        };
        if (data.incl_excl && typeof data.incl_excl === "object") rec.incl_excl = data.incl_excl;
        else if (data.inclExcl && typeof data.inclExcl === "object") rec.incl_excl = data.inclExcl;
        if (Array.isArray(data.packages) && data.packages.length) rec.packages = data.packages;
        const clientEmail = String(data.email || "").trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
          rec.email = clientEmail;
        }
        pixWrite(id, rec);
        console.log("[mock] Pix reserva registrada:", id);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: "PENDING", reservation_id: id }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return true;
  }

  if (urlPath === "/api/excursao-reserva/lookup.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const id = String(data.reservation_id || data.code || "").toUpperCase();
        const email = String(data.email || "").trim().toLowerCase();
        if (!/^GCV-[A-Z0-9]{6}$/.test(id)) {
          res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Invalid reservation code" }));
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Invalid email" }));
          return;
        }
        const rec = pixRead(id);
        if (!rec) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Not found" }));
          return;
        }
        const storedEmail = String(rec.email || "").trim().toLowerCase();
        if (!storedEmail) {
          rec.email = email;
          pixWrite(id, rec);
        } else if (storedEmail !== email) {
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Email does not match this reservation" }));
          return;
        }
        const status = pixEffectiveStatus(rec);
        if (status === "EXPIRED" && rec.status !== "EXPIRED") {
          rec.status = "EXPIRED";
          pixWrite(id, rec);
        }
        const trips = annotateMockTrips({ ...rec, trips: enrichTripsGuia(rec.trips || [], rec.locale || "pt") });
        const canCancel = status === "PAID" && trips.some((t) => t.can_cancel);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            ok: true,
            reservation_id: id,
            status,
            amount: rec.amount,
            locale: rec.locale,
            trips,
            can_cancel: canCancel,
            paid_at: rec.paid_at || null,
            created_at: rec.created_at || null,
            expires_at: rec.expires_at || null,
            incl_excl: rec.incl_excl || undefined,
            packages: rec.packages || undefined,
          }),
        );
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, message: "Invalid JSON" }));
      }
    });
    return true;
  }

  if (urlPath === "/api/excursao-reserva/cancel.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const id = String(data.reservation_id || data.code || "").toUpperCase();
        const email = String(data.email || "").trim().toLowerCase();
        const rec = pixRead(id);
        if (!rec) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Reserva não encontrada", error_code: "not_found" }));
          return;
        }
        const stored = String(rec.email || "").trim().toLowerCase();
        if (stored && stored !== email) {
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "E-mail não confere", error_code: "email" }));
          return;
        }
        if (pixEffectiveStatus(rec) !== "PAID") {
          res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Só é possível estornar Pix de reserva paga.", error_code: "nothing" }));
          return;
        }
        const trips = annotateMockTrips(rec);
        let wanted = null;
        if (Array.isArray(data.trip_indexes)) {
          wanted = new Set(data.trip_indexes.map((n) => Number(n)));
          for (const idx of wanted) {
            const trip = trips[idx];
            if (!trip) {
              res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, message: "Passeio não encontrado nesta reserva.", error_code: "nothing" }));
              return;
            }
            if (trip.confirmed) {
              res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, message: "Passeio confirmado não pode ser cancelado nem estornado.", error_code: "trip_confirmed" }));
              return;
            }
          }
        }
        const targets = trips.filter((t, i) => t.can_cancel && (wanted === null || wanted.has(i)));
        if (!targets.length) {
          res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Não há passeio em formação para estornar nesta reserva.", error_code: "nothing" }));
          return;
        }
        rec.pix_refunds = Array.isArray(rec.pix_refunds) ? rec.pix_refunds : [];
        rec.trips = Array.isArray(rec.trips) ? rec.trips : [];
        let refunded = 0;
        const refundedTrips = [];
        for (const t of targets) {
          refunded += t.cents || 0;
          refundedTrips.push(t.trip_index);
          rec.pix_refunds.push({
            trip_index: t.trip_index,
            id: id.replace("-", "") + "T" + t.trip_index,
            cents: t.cents || 0,
            status: "DEVOLVIDO",
            at: new Date().toISOString(),
          });
          if (rec.trips[t.trip_index]) {
            rec.trips[t.trip_index].refunded = true;
            rec.trips[t.trip_index].lifecycle = "cancelada";
            rec.trips[t.trip_index].confirmed = false;
          }
        }
        const after = annotateMockTrips(rec);
        const still = after.some((t) => !t.refunded);
        if (!still) {
          rec.status = "CANCELLED";
          rec.cancelled_at = new Date().toISOString();
        }
        pixWrite(id, rec);
        const partial = still;
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          reservation_id: id,
          status: partial ? "PAID" : "REFUNDED",
          partial,
          full: !partial,
          refunded_cents: refunded,
          refunded_trips: refundedTrips,
          message: partial
            ? "Estorno parcial feito. Os passeios confirmados desta reserva continuam valendo."
            : "Reserva cancelada. O Pix foi devolvido para a conta de origem.",
        }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, message: "Invalid JSON" }));
      }
    });
    return true;
  }

  if (urlPath === "/api/excursao-reserva/recover-by-email.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const email = String(data.email || "")
          .trim()
          .toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Invalid email" }));
          return;
        }
        const matches = [];
        const recs = [];
        ensurePixDir();
        for (const fp of fs.readdirSync(PIX_STORE_DIR)) {
          if (!/^GCV-[A-Z0-9]{6}\.json$/i.test(fp)) continue;
          try {
            const rec = JSON.parse(fs.readFileSync(path.join(PIX_STORE_DIR, fp), "utf8"));
            if (String(rec.email || "").trim().toLowerCase() === email) {
              const code = rec.reservation_id || fp.replace(/\.json$/i, "");
              matches.push(code);
              recs.push(rec);
            }
          } catch {
            /* */
          }
        }

        const locale = ["pt", "en", "es"].includes(String(data.locale || "")) ? data.locale : "pt";

        const finish = (payload) => {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(payload));
        };

        if (!matches.length) {
          console.log("[mock] recover-by-email:", email, "→ (nenhuma reserva)");
          finish({ ok: true, found: false });
          return;
        }

        console.log("[mock] recover-by-email:", email, "→", matches.join(", "));

        (async () => {
          try {
            await sendDevMail({
              to: email,
              subject: recoverEmailSubject(locale),
              html: buildRecoverEmailHtml(recs, email, locale),
            });
            for (const rec of recs) {
              const code = String(rec.reservation_id || "").toUpperCase();
              if (!/^GCV-[A-Z0-9]{6}$/.test(code)) continue;
              await sendDevMail({
                to: email,
                subject: receiptEmailSubject(code, locale),
                html: buildPixReceiptEmailHtml(rec, locale),
                fullDocument: true,
              });
              console.log("[mock] recibo enviado:", code, "→", email);
            }
            finish({ ok: true, found: true });
          } catch {
            finish({ ok: true, found: true });
          }
        })();
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, message: "Invalid JSON" }));
      }
    });
    return true;
  }

  if (urlPath === "/api/check_pix_status.php" && req.method === "GET") {
    const u = new URL(req.url, "http://localhost");
    const id = String(u.searchParams.get("reservation_id") || "").toUpperCase();
    const rec = pixRead(id);
    if (!rec) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: false, message: "Not found" }));
      return true;
    }
    const status = pixEffectiveStatus(rec);
    if (status === "EXPIRED" && rec.status !== "EXPIRED") {
      rec.status = "EXPIRED";
      pixWrite(id, rec);
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        success: true,
        status,
        reservation_id: id,
        amount: rec.amount,
        trips: enrichTripsGuia(rec.trips || [], rec.locale || "pt"),
        locale: rec.locale,
        incl_excl: rec.incl_excl || undefined,
        packages: rec.packages || undefined,
        payment_method: rec.payment_method === "card" ? "card" : undefined,
        charged_label: rec.payment_method === "card" ? rec.charged_label || "" : undefined,
      }),
    );
    return true;
  }

  if (urlPath === "/api/confirm_pix_payment.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const u = new URL(req.url, "http://localhost");
      const secret = u.searchParams.get("secret") || "";
      if (secret !== "dev-local") {
        res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "Forbidden" }));
        return;
      }
      try {
        const data = JSON.parse(body || "{}");
        const id = String(data.reservation_id || "").toUpperCase();
        const rec = pixRead(id);
        if (!rec) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false }));
          return;
        }
        if (pixEffectiveStatus(rec) === "EXPIRED") {
          res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, status: "EXPIRED" }));
          return;
        }
        rec.status = "PAID";
        rec.paid_at = new Date().toISOString();
        rec.paid_source = "webhook";
        pixWrite(id, rec);
        console.log("[mock] Pix confirmado (webhook):", id);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: "PAID", reservation_id: id }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return true;
  }

  if (urlPath === "/api/pix_webhook.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const u = new URL(req.url, "http://localhost");
      const secret = u.searchParams.get("secret") || "";
      if (secret !== "dev-local") {
        res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "Forbidden" }));
        return;
      }
      try {
        const data = JSON.parse(body || "{}");
        const id = String(data.reservation_id || "").toUpperCase();
        const rec = pixRead(id);
        if (!rec) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: "Not found" }));
          return;
        }
        if (pixEffectiveStatus(rec) === "EXPIRED") {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: "Not found or expired" }));
          return;
        }
        rec.status = "PAID";
        rec.paid_at = new Date().toISOString();
        rec.paid_source = "webhook";
        pixWrite(id, rec);
        console.log("[mock] Pix webhook PAID:", id);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: "PAID", reservation_id: id }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return true;
  }

  if (urlPath === "/api/openpix_webhook.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const event = String(data.event || "").toUpperCase();
        const paidEvents = [
          "OPENPIX:CHARGE_COMPLETED",
          "OPENPIX:CHARGE_COMPLETED_NOT_SAME_CUSTOMER_PAYER",
          "OPENPIX:TRANSACTION_RECEIVED",
        ];
        if (!paidEvents.includes(event)) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: true, ignored: true, event }));
          return;
        }
        const candidates = [
          data.charge?.correlationID,
          data.charge?.comment,
          data.charge?.identifier,
          data.charge?.transactionID,
          data.charge?.paymentMethods?.pix?.txId,
          data.pix?.infoPagador,
          data.pix?.transactionID,
          data.pix?.charge?.correlationID,
          JSON.stringify(data),
        ].filter(Boolean);
        let id = "";
        for (const raw of candidates) {
          const text = String(raw).toUpperCase();
          const m1 = text.match(/GCV-[A-Z0-9]{6}/);
          if (m1) {
            id = m1[0];
            break;
          }
          const m2 = text.match(/GCV([A-Z0-9]{6})/);
          if (m2) {
            id = "GCV-" + m2[1];
            break;
          }
        }
        if (!/^GCV-[A-Z0-9]{6}$/.test(id)) {
          res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: "Could not map OpenPix payload to reservation" }));
          return;
        }
        const rec = pixRead(id);
        if (!rec) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: "Reservation not found", reservation_id: id }));
          return;
        }
        if (pixEffectiveStatus(rec) === "EXPIRED") {
          res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, status: "EXPIRED", reservation_id: id }));
          return;
        }
        if (rec.status !== "PAID") {
          rec.status = "PAID";
          rec.paid_at = new Date().toISOString();
          rec.paid_source = "openpix";
          rec.openpix_event = event;
          pixWrite(id, rec);
        }
        console.log("[mock] OpenPix webhook PAID:", id, "| event:", event);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: "PAID", reservation_id: id, event }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "Invalid JSON" }));
      }
    });
    return true;
  }

  return false;
}

function waitlistReadAll() {
  if (Object.keys(waitlistMem).length) return { ...waitlistMem };
  try {
    fs.mkdirSync(path.dirname(WAITLIST_STORE), { recursive: true });
    if (fs.existsSync(WAITLIST_STORE)) {
      return JSON.parse(fs.readFileSync(WAITLIST_STORE, "utf8"));
    }
  } catch {
    /* */
  }
  return {};
}

function waitlistWriteAll(data) {
  Object.keys(waitlistMem).forEach((k) => delete waitlistMem[k]);
  Object.assign(waitlistMem, data);
  try {
    fs.mkdirSync(path.dirname(WAITLIST_STORE), { recursive: true });
    fs.writeFileSync(WAITLIST_STORE, JSON.stringify(data, null, 2));
  } catch {
    /* */
  }
}

function handleWaitlistApi(urlPath, req, res) {
  if (urlPath === "/api/excursao-waitlist/register.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const email = String(data.email || "").trim().toLowerCase();
        const cartId = String(data.cart_id || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cartId)) {
          res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, message: "Invalid data" }));
          return;
        }
        const all = waitlistReadAll();
        const rows = Array.isArray(all[cartId]) ? all[cartId] : [];
        if (!rows.some((r) => r && r.email === email)) {
          rows.push({
            email,
            locale: data.locale || "pt",
            destino: data.destino || "",
            date_label: data.date_label || "",
            created_at: new Date().toISOString(),
          });
        }
        all[cartId] = rows;
        waitlistWriteAll(all);
        console.log("[mock] Lista de espera:", cartId, "→", email);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, message: "registered", cart_id: cartId }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return true;
  }

  if (urlPath === "/api/excursao-waitlist/notify.php" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const cartId = String(data.cart_id || "").trim().toLowerCase();
        const vagas = parseInt(String(data.vagas_available), 10) || 0;
        if (vagas < 1) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, sent: 0 }));
          return;
        }
        const all = waitlistReadAll();
        const rows = Array.isArray(all[cartId]) ? all[cartId] : [];
        delete all[cartId];
        waitlistWriteAll(all);
        rows.forEach((r) => {
          console.log("[mock] Aviso de vaga enviado para:", r.email, "| passeio:", cartId);
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, sent: rows.length, waitlist_size: rows.length }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return true;
  }

  return false;
}

// Papel passado via argumento: node mock-server.mjs guide
const ROLE = process.argv[2] || "guide";

const MOCK_USERS = {
  admin: { id: 1, name: "Diego Navi", email: "diegocsp82@gmail.com", role: "admin", status: "active", avatar_url: null },
  guide: { id: 2, name: "Diego Guia", email: "guia@gcv.com", role: "guide", status: "active", avatar_url: null, email_verified: true },
  "guide-ana": { id: 21, name: "Ana Guia", email: "ana@gcv.com", role: "guide", status: "active", avatar_url: null, email_verified: true },
  "guide-martina": { id: 24, name: "Martina Motlova", email: "martina@gcv.com", role: "guide", status: "active", avatar_url: null, email_verified: true },
  "guide-gyovanna": { id: 25, name: "Gyovanna Torres", email: "gyovanna@gcv.com", role: "guide", status: "active", avatar_url: null, email_verified: true },
  "guide-pending": { id: 3, name: "João Pendente", email: "pendente@gcv.com", role: "guide", status: "pending", avatar_url: null },
  client: { id: 4, name: "Maria Cliente", email: "cliente@gcv.com", role: "client", status: "active", avatar_url: null },
  host: { id: 8, name: "Lúcia Anfitriã", email: "lucia@segredo.test", role: "host", status: "active", phone: "62977770001", avatar_url: null },
  "host-pending": { id: 9, name: "Marina do Poço", email: "marina@poco.test", role: "host", status: "pending", phone: "62988881111", avatar_url: null },
};

const user = { ...(MOCK_USERS[ROLE] || MOCK_USERS.guide) };

function loadCatalogAttractions() {
  const files = [
    path.join(ROOT, "api", "data", "attractions-seed.json"),
    path.join(ROOT, "api", "data", "attractions-catalog-extra.json"),
  ];
  const seen = new Set();
  const out = [];
  let id = 1;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      for (const a of raw.attractions || []) {
        const title = String(a.title_pt || "").trim();
        const slug = String(a.slug || "").trim();
        if (!title) continue;
        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: id++,
          title_pt: title,
          slug,
          city_id: null,
          entry_price_cents: null,
          cover_url: String(a.cover_url || ""),
        });
      }
    } catch {
      /* ignore malformed seed */
    }
  }
  out.sort((a, b) => {
    const combo = (t) => (String(t).includes(" + ") ? 1 : 0);
    const ca = combo(a.title_pt);
    const cb = combo(b.title_pt);
    if (ca !== cb) return ca - cb;
    return a.title_pt.localeCompare(b.title_pt, "pt", { sensitivity: "base" });
  });
  return out;
}

const MOCK_ATTRACTIONS = loadCatalogAttractions();
const PESO_INICIAL = {
  "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge": 3,
  "vale-lua-guia-chapada-veadeiros-sao-jorge": 2,
  "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros": 1,
};
const PREMIOS_INICIAL = {
  "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge": {
    xango: { primeiro: "R$ 800", segundo: "R$ 500", terceiro: "R$ 250" },
    oxum: { primeiro: "R$ 700", segundo: "R$ 400", terceiro: "R$ 200" },
  },
  "vale-lua-guia-chapada-veadeiros-sao-jorge": {
    xango: { primeiro: "R$ 450", segundo: "R$ 250", terceiro: "R$ 120" },
    oxum: { primeiro: "R$ 380", segundo: "R$ 200", terceiro: "R$ 100" },
  },
  "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros": {
    xango: { primeiro: "R$ 300", segundo: "R$ 180", terceiro: "R$ 80" },
    oxum: { primeiro: "R$ 260", segundo: "R$ 150", terceiro: "R$ 70" },
  },
};
for (const atra of MOCK_ATTRACTIONS) {
  const peso = PESO_INICIAL[atra.slug];
  const premios = PREMIOS_INICIAL[atra.slug];
  if (!peso && !premios) continue;
  const exp = Object.assign({}, atra.experiencia || {});
  if (peso) exp.peso = peso;
  if (premios) {
    const venda = Object.assign({}, exp.venda || {});
    if (!venda.premiacao) venda.premiacao = premios;
    exp.venda = venda;
  }
  atra.experiencia = exp;
}

function loadRelatedTourSeed() {
  const file = path.join(ROOT, "api", "data", "related-tours-seed.json");
  if (!fs.existsSync(file)) return { durations: [], related: [], skipped: [] };
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { durations: [], related: [], skipped: [] };
  }
}

const RELATED_SEED = loadRelatedTourSeed();
const durationBySlug = new Map((RELATED_SEED.durations || []).map((d) => [d.slug, d]));
/* ---------- Tarifário (mesmas regras de api/helpers/tarifarios.php) ---------- */
const PASSEIO_CIDADE_KEYS = ["alto-paraiso", "sao-jorge", "cavalcante"];
const TARIFARIO_CAMPOS = ["exclusivo_pessoa_cents", "exclusivo_pessoa_5_cents", "exclusivo_transporte_cents", "excursao_pessoa_cents", "excursao_pessoa_5_cents", "excursao_transporte_cents"];
const TARIFARIO_CIDADES = { "alto-paraiso": "Alto Paraíso de Goiás", "sao-jorge": "São Jorge", cavalcante: "Cavalcante" };
const TARIFAS_OFICIAIS = {
  guia: [
    ["g70", 70, 90], ["g80", 80, 100], ["g88", 88, 108], ["g100", 100, 120],
    ["g120", 120, 150], ["g150", 150, 200], ["g200", 200, 250],
  ],
  translado: [
    ["t120", 120, 150], ["t150", 150, 200], ["t200", 200, 250], ["t250", 250, 300],
    ["t280", 280, 360], ["t300", 300, 400], ["t350", 350, 440], ["t400", 400, 520],
    ["t480", 480, 600], ["t560", 560, 640],
  ],
};

function nomeTarifaSemTranslado(exc4, exc5, pri4, pri5) {
  const excShow = exc5 > 0 ? exc5 : exc4;
  const priShow = pri5 > 0 ? pri5 : pri4;
  return "EXC" + exc4 + "(" + excShow + ") / PRI" + pri4 + "(" + priShow + ")";
}

function tarifasOficiais() {
  if (!tarifasOficiais.live) {
    tarifasOficiais.live = [];
    for (const tipo of ["guia", "translado"]) {
      for (const row of TARIFAS_OFICIAIS[tipo]) {
        tarifasOficiais.live.push({
          codigo: row[0],
          tipo,
          excursao: row[1],
          privativo: row[2],
          excursao_5: 0,
          privativo_5: 0,
          excursao_cents: row[1] * 100,
          privativo_cents: row[2] * 100,
          excursao_5_cents: 0,
          privativo_5_cents: 0,
          nome: tipo === "guia"
            ? nomeTarifaSemTranslado(row[1], 0, row[2], 0)
            : "Tarifa Translado · excursão " + row[1] + " / privativo " + row[2],
        });
      }
    }
  }
  return tarifasOficiais.live;
}

function tarifaOficialUso(codigo) {
  const nAttr = MOCK_ATTRACTIONS.filter((a) => a.tarifa_guia === codigo || a.tarifa_translado === codigo).length;
  const nPass = MOCK_RELATED.filter((r) => r.tarifa_guia === codigo || r.tarifa_translado === codigo).length;
  return nAttr + nPass;
}

function tarifaOficialCriar(tipo, excursao, privativo, excursao5, privativo5) {
  if (tipo !== "guia" && tipo !== "translado") throw new Error("Escolha Tarifa Guia ou Tarifa Translado.");
  excursao = parseInt(excursao, 10) || 0;
  privativo = parseInt(privativo, 10) || 0;
  excursao5 = tipo === "guia" ? Math.max(0, parseInt(excursao5, 10) || 0) : 0;
  privativo5 = tipo === "guia" ? Math.max(0, parseInt(privativo5, 10) || 0) : 0;
  if (excursao < 1 || privativo < 1 || excursao > 100000 || privativo > 100000) throw new Error("Informe a excursão e o privativo em reais.");
  if (excursao5 > 100000 || privativo5 > 100000) throw new Error("Informe o PAX 5+ em reais.");
  if (tipo === "guia") {
    validarGuiaValores(excursao, excursao5, privativo, privativo5, "");
    validarDiariaValor(excursao, settingInt("passeio_quorum", 4), settingInt("diaria_minima_reais", 320), "");
  } else {
    validarTransladoValores(excursao, privativo, "");
  }
  const rows = tarifasOficiais();
  if (rows.some((row) => row.tipo === tipo && row.excursao === excursao && row.privativo === privativo && (row.excursao_5 || 0) === excursao5 && (row.privativo_5 || 0) === privativo5)) {
    throw new Error("Essa tarifa já existe.");
  }
  const prefix = tipo === "guia" ? "g" : "t";
  let codigo = prefix + excursao;
  let n = 2;
  while (rows.some((row) => row.codigo === codigo)) {
    codigo = prefix + excursao + "-" + n;
    n += 1;
  }
  rows.push({
    codigo,
    tipo,
    excursao,
    privativo,
    excursao_5: excursao5,
    privativo_5: privativo5,
    excursao_cents: excursao * 100,
    privativo_cents: privativo * 100,
    excursao_5_cents: excursao5 * 100,
    privativo_5_cents: privativo5 * 100,
    nome: tipo === "guia"
      ? nomeTarifaSemTranslado(excursao, excursao5, privativo, privativo5)
      : "Tarifa Translado · excursão " + excursao + " / privativo " + privativo,
  });
  return codigo;
}

function tarifaOficialPax5(codigo, excursao5, privativo5) {
  const row = tarifasOficiais().find((item) => item.codigo === String(codigo || "").trim());
  if (!row) throw new Error("Tarifa não encontrada.");
  if (row.tipo !== "guia") throw new Error("PAX 5+ só existe na Tarifa Guia, sem translado.");
  excursao5 = Math.max(0, parseInt(excursao5, 10) || 0);
  privativo5 = Math.max(0, parseInt(privativo5, 10) || 0);
  if (excursao5 > 100000 || privativo5 > 100000) throw new Error("Informe o PAX 5+ em reais.");
  validarGuiaValores(row.excursao, excursao5, row.privativo, privativo5, row.nome);
  validarDiariaValor(row.excursao, settingInt("passeio_quorum", 4), settingInt("diaria_minima_reais", 320), row.nome);
  row.excursao_5 = excursao5;
  row.privativo_5 = privativo5;
  row.excursao_5_cents = excursao5 * 100;
  row.privativo_5_cents = privativo5 * 100;
}

function tarifaOficialAcima(atual) {
  let acima = null;
  for (const row of tarifasOficiais()) {
    if (row.codigo === atual.codigo || row.tipo !== atual.tipo) continue;
    if (row.excursao <= atual.excursao) continue;
    if (!acima || row.excursao < acima.excursao || (row.excursao === acima.excursao && row.privativo < acima.privativo)) acima = row;
  }
  return acima;
}

function tarifaOficialExcluir(codigo) {
  codigo = String(codigo || "").trim();
  const atual = tarifasOficiais().find((row) => row.codigo === codigo);
  if (!atual) throw new Error("Tarifa não encontrada.");
  const campo = atual.tipo === "translado" ? "tarifa_translado" : "tarifa_guia";
  const uso = tarifaOficialUso(codigo);
  const acima = tarifaOficialAcima(atual);
  if (uso > 0 && !acima) throw new Error("Esta é a maior excursão desta lista. Os passeios que a usam não têm tarifa acima para receber.");
  if (uso > 0 && acima) {
    for (const row of MOCK_ATTRACTIONS) if (row[campo] === codigo) row[campo] = acima.codigo;
    for (const row of MOCK_RELATED) if (row[campo] === codigo) row[campo] = acima.codigo;
    for (const row of MOCK_ATTRACTIONS) {
      const emb = row.experiencia && row.experiencia.embarques;
      if (!emb) continue;
      for (const item of Object.values(emb)) {
        if (!item || typeof item !== "object") continue;
        if (campo === "tarifa_guia" && item.guia === codigo) item.guia = acima.codigo;
        if (campo === "tarifa_translado" && (item.trans === codigo || item.translado === codigo)) {
          item.trans = acima.codigo;
          if (item.translado) item.translado = acima.codigo;
        }
      }
    }
    const jsonCampo = campo === "tarifa_guia" ? "guia" : "translado";
    for (const tour of MOCK_RELATED) {
      for (const item of Object.values(tour.tarifasSaida || {})) {
        if (item && item[jsonCampo] === codigo) item[jsonCampo] = acima.codigo;
      }
    }
  }
  tarifasOficiais.live = tarifasOficiais().filter((row) => row.codigo !== codigo);
  return {
    moved: uso,
    para: acima ? acima.codigo : "",
    para_nome: acima ? ("Excursão R$ " + acima.excursao + " · Privativo R$ " + acima.privativo) : "",
  };
}

function tarifaOficialItem(codigo, tipo) {
  return tarifasOficiais().find((row) => row.codigo === codigo && (!tipo || row.tipo === tipo)) || null;
}

function bilingueUniversal() {
  const row = MOCK_SETTINGS.find((s) => s.key_name === "passeio_bilingue");
  let raw = {};
  try { raw = JSON.parse(row && row.value ? row.value : ""); } catch { raw = {}; }
  if (raw.tipo === "percentual") {
    const pct = Math.max(0, Math.min(100, parseInt(raw.valor, 10) || 0));
    return { tipo: "percentual", valor: pct, cents: 0 };
  }
  const cents = raw.valor != null && raw.valor !== "" ? Math.max(0, parseInt(raw.valor, 10) || 0) : 4000;
  return { tipo: "fixo", valor: cents, cents };
}

function tarifaOficialMontar(guiaCodigo, transladoCodigo) {
  const guia = tarifaOficialItem(String(guiaCodigo || ""), "guia");
  const trans = tarifaOficialItem(String(transladoCodigo || ""), "translado");
  if (!guia) return null;
  const cidades = {};
  for (const key of PASSEIO_CIDADE_KEYS) {
    cidades[key] = {
      excursao_pessoa_cents: guia.excursao_cents,
      exclusivo_pessoa_cents: guia.privativo_cents,
      excursao_pessoa_5_cents: guia.excursao_5_cents || 0,
      exclusivo_pessoa_5_cents: guia.privativo_5_cents || 0,
      excursao_transporte_cents: trans ? trans.excursao_cents : 0,
      exclusivo_transporte_cents: trans ? trans.privativo_cents : 0,
    };
  }
  const base = cidades["alto-paraiso"];
  return {
    id: 0,
    nome: guia.nome + (trans ? " + " + trans.nome : ""),
    oficial: true,
    tarifa_guia: guia.codigo,
    tarifa_translado: trans ? trans.codigo : "",
    quorum: Math.max(1, Math.min(20, settingInt("passeio_quorum", 4))),
    ...base,
    cidades,
  };
}

function tarifaOficialEditar(codigo, excursao, privativo, excursao5, privativo5) {
  const row = tarifasOficiais().find((item) => item.codigo === String(codigo || "").trim());
  if (!row) throw new Error("Tarifa não encontrada.");
  excursao = parseInt(excursao, 10) || 0;
  privativo = parseInt(privativo, 10) || 0;
  if (excursao < 1 || privativo < 1) throw new Error("Preencha todos os valores da tarifa.");
  if (row.tipo !== "guia") {
    excursao5 = 0;
    privativo5 = 0;
    validarTransladoValores(excursao, privativo, row.nome);
  } else {
    excursao5 = parseInt(excursao5, 10) || 0;
    privativo5 = parseInt(privativo5, 10) || 0;
    if (excursao5 < 1 || privativo5 < 1) throw new Error("Preencha o PAX 5+ da excursão e do privativo.");
    validarGuiaValores(excursao, excursao5, privativo, privativo5, row.nome);
    validarDiariaValor(excursao, settingInt("passeio_quorum", 4), settingInt("diaria_minima_reais", 320), row.nome);
  }
  if (tarifasOficiais().some((outra) => outra.codigo !== row.codigo && outra.tipo === row.tipo && outra.excursao === excursao && outra.privativo === privativo && (outra.excursao_5 || 0) === excursao5 && (outra.privativo_5 || 0) === privativo5)) {
    throw new Error("Essa tarifa já existe.");
  }
  row.excursao = excursao;
  row.privativo = privativo;
  row.excursao_5 = excursao5;
  row.privativo_5 = privativo5;
  row.excursao_cents = excursao * 100;
  row.privativo_cents = privativo * 100;
  row.excursao_5_cents = excursao5 * 100;
  row.privativo_5_cents = privativo5 * 100;
  row.nome = row.tipo === "guia"
    ? nomeTarifaSemTranslado(excursao, excursao5, privativo, privativo5)
    : "Tarifa Translado · excursão " + excursao + " / privativo " + privativo;
}

function saidasTarifasAtrativo(a) {
  const emb = (a && a.experiencia && a.experiencia.embarques) || {};
  const fallbackGuia = String((a && a.tarifa_guia) || "");
  const fallbackTrans = String((a && a.tarifa_translado) || "");
  let chaves = Object.keys(emb).filter((key) => TARIFARIO_CIDADES[key] && emb[key] && typeof emb[key] === "object");
  if (!chaves.length && a && a.duracao && typeof a.duracao === "object") {
    chaves = Object.keys(a.duracao).filter((key) => TARIFARIO_CIDADES[key] && parseInt(a.duracao[key], 10) > 0);
  }
  if (!chaves.length && a && a.tarifario_id) {
    const antiga = tarifarioById(a.tarifario_id);
    if (antiga && antiga.cidades) {
      chaves = PASSEIO_CIDADE_KEYS.filter((key) => {
        const row = antiga.cidades[key] || {};
        return (parseInt(row.excursao_pessoa_cents, 10) || 0) > 0 || (parseInt(row.excursao_transporte_cents, 10) || 0) > 0;
      });
    }
  }
  const out = chaves.map((key) => {
    const salvo = emb[key] && typeof emb[key] === "object" ? emb[key] : {};
    const temCampo = Object.prototype.hasOwnProperty.call(salvo, "guia") || Object.prototype.hasOwnProperty.call(salvo, "trans") || Object.prototype.hasOwnProperty.call(salvo, "translado");
    return {
      key,
      nome: String(salvo.nome || TARIFARIO_CIDADES[key] || key),
      guia: temCampo ? String(salvo.guia || "") : fallbackGuia,
      translado: temCampo ? String(salvo.trans || salvo.translado || "") : fallbackTrans,
    };
  });
  if (!out.length && (fallbackGuia || fallbackTrans)) {
    out.push({ key: "", nome: "Sem cidade de saída", guia: fallbackGuia, translado: fallbackTrans });
  }
  return out;
}

function saidasTarifasPasseio(tour, chaves) {
  const raw = (tour && tour.tarifasSaida) || {};
  const fallbackGuia = String((tour && tour.tarifa_guia) || "");
  const fallbackTrans = String((tour && tour.tarifa_translado) || "");
  return (chaves || []).filter((key) => TARIFARIO_CIDADES[key]).map((key) => {
    const salvo = raw[key];
    const temCampo = !!(salvo && (Object.prototype.hasOwnProperty.call(salvo, "guia") || Object.prototype.hasOwnProperty.call(salvo, "translado")));
    return {
      key,
      nome: TARIFARIO_CIDADES[key],
      guia: temCampo ? String(salvo.guia || "") : fallbackGuia,
      translado: temCampo ? String(salvo.translado || "") : fallbackTrans,
    };
  });
}

function colunasDaLista(lista) {
  let escolha = null;
  for (const pref of PASSEIO_CIDADE_KEYS) {
    escolha = (lista || []).find((item) => item.key === pref && String(item.guia || "").trim());
    if (escolha) break;
  }
  if (!escolha) escolha = (lista || []).find((item) => String(item.guia || "").trim()) || null;
  return {
    guia: escolha && escolha.guia ? escolha.guia : "",
    translado: escolha && escolha.translado ? escolha.translado : "",
  };
}

function gravarSaidasAtrativo(a, lista) {
  const exp = a.experiencia && typeof a.experiencia === "object" ? a.experiencia : {};
  const emb = exp.embarques && typeof exp.embarques === "object" ? { ...exp.embarques } : {};
  for (const item of lista) {
    if (!item.key) continue;
    const atual = emb[item.key] && typeof emb[item.key] === "object" ? { ...emb[item.key] } : {};
    atual.nome = item.nome || atual.nome || TARIFARIO_CIDADES[item.key] || item.key;
    atual.guia = item.guia || "";
    atual.trans = item.translado || "";
    emb[item.key] = atual;
  }
  exp.embarques = emb;
  a.experiencia = exp;
  const cols = colunasDaLista(lista);
  a.tarifa_guia = cols.guia;
  a.tarifa_translado = cols.translado;
}

function gravarSaidasPasseio(tour, lista) {
  const map = {};
  for (const item of lista) {
    if (!item.key) continue;
    map[item.key] = { guia: item.guia || "", translado: item.translado || "" };
  }
  tour.tarifasSaida = map;
  const cols = colunasDaLista(lista);
  tour.tarifa_guia = cols.guia;
  tour.tarifa_translado = cols.translado;
}

function chavesDoPasseio(tour) {
  const listas = (tour.attractions || []).map((part) => {
    const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id) || {};
    return embarquesPublic(live);
  });
  return chavesIntersecao(listas);
}

function tarifaDePares(pares) {
  const cidades = {};
  let base = null;
  let guiaCodigo = "";
  let transCodigo = "";
  let nome = "";
  for (const [key, par] of Object.entries(pares || {})) {
    if (!key || !par) continue;
    const guia = tarifaOficialItem(String(par.guia || ""), "guia");
    const trans = tarifaOficialItem(String(par.translado || ""), "translado");
    const row = {
      excursao_pessoa_cents: guia ? guia.excursao_cents : 0,
      exclusivo_pessoa_cents: guia ? guia.privativo_cents : 0,
      excursao_pessoa_5_cents: guia ? (guia.excursao_5_cents || 0) : 0,
      exclusivo_pessoa_5_cents: guia ? (guia.privativo_5_cents || 0) : 0,
      excursao_transporte_cents: trans ? trans.excursao_cents : 0,
      exclusivo_transporte_cents: trans ? trans.privativo_cents : 0,
    };
    cidades[key] = row;
    if (!base && guia) {
      base = row;
      guiaCodigo = guia.codigo;
      transCodigo = trans ? trans.codigo : "";
      nome = guia.nome + (trans ? " + " + trans.nome : "");
    }
  }
  if (!base) return null;
  return {
    id: 0,
    nome,
    oficial: true,
    tarifa_guia: guiaCodigo,
    tarifa_translado: transCodigo,
    quorum: Math.max(1, Math.min(20, settingInt("passeio_quorum", 4))),
    ...base,
    cidades,
  };
}

function tarifaPublicaDe(saidas) {
  const pares = {};
  for (const saida of saidas || []) {
    if (!saida.key || (!saida.guia && !saida.translado)) continue;
    pares[saida.key] = { guia: saida.guia, translado: saida.translado };
  }
  if (!Object.keys(pares).length) return null;
  return aplicarBilingueUniversal(tarifaDePares(pares));
}

function aplicarParNasSaidas(alvo, guia, trans) {
  if (alvo.attractions) {
    const chaves = chavesDoPasseio(alvo);
    const lista = saidasTarifasPasseio(alvo, chaves);
    if (!lista.length) {
      alvo.tarifa_guia = guia;
      alvo.tarifa_translado = trans;
      return;
    }
    for (const item of lista) {
      item.guia = guia;
      item.translado = trans;
    }
    gravarSaidasPasseio(alvo, lista);
    return;
  }
  const lista = saidasTarifasAtrativo(alvo);
  if (!lista.length) {
    alvo.tarifa_guia = guia;
    alvo.tarifa_translado = trans;
    return;
  }
  for (const item of lista) {
    item.guia = guia;
    item.translado = trans;
  }
  gravarSaidasAtrativo(alvo, lista);
}

function aplicarBilingueUniversal(tarifa) {
  if (!tarifa) return null;
  const bi = bilingueUniversal();
  return { ...tarifa, bilingue_tipo: bi.tipo, bilingue_valor: bi.valor, bilingue_cents: bi.cents };
}

function tarifaDoPasseio(entity) {
  const porCidade = entity && !entity.attractions ? tarifaPublicaDe(saidasTarifasAtrativo(entity)) : null;
  if (porCidade) return porCidade;
  const oficial = tarifaOficialMontar(entity && entity.tarifa_guia, entity && entity.tarifa_translado);
  const base = oficial || tarifarioPublic(tarifarioById(entity && entity.tarifario_id));
  return aplicarBilingueUniversal(base);
}

function tarifaVende(tarifa) {
  if (!tarifa) return false;
  const campos = TARIFARIO_CAMPOS.filter((campo) => !campo.endsWith("_5_cents"));
  const tem = (row) => campos.some((campo) => (parseInt(row && row[campo], 10) || 0) > 0);
  if (tem(tarifa)) return true;
  return Object.values(tarifa.cidades || {}).some((row) => tem(row));
}

function bilingueOf(raw) {
  raw = raw || {};
  const tipoRaw = String(raw.bilingue_tipo || "");
  if (tipoRaw === "percentual" || tipoRaw === "fixo" || Object.prototype.hasOwnProperty.call(raw, "bilingue_valor")) {
    if (tipoRaw === "percentual") {
      const pct = Math.max(0, Math.min(100, parseInt(raw.bilingue_valor, 10) || 0));
      return { tipo: "percentual", valor: pct, cents: 0 };
    }
    let cents;
    if (raw.bilingue_valor != null && raw.bilingue_valor !== "") cents = Math.max(0, parseInt(raw.bilingue_valor, 10) || 0);
    else if (raw.bilingue_cents != null && raw.bilingue_cents !== "") cents = Math.max(0, parseInt(raw.bilingue_cents, 10) || 0);
    else cents = 4000;
    return { tipo: "fixo", valor: cents, cents };
  }
  if (raw.bilingue_cents != null && raw.bilingue_cents !== "") {
    const cents = Math.max(0, parseInt(raw.bilingue_cents, 10) || 0);
    return { tipo: "fixo", valor: cents, cents };
  }
  const cidades = raw.cidades || {};
  const seen = new Set();
  for (const key of ["alto-paraiso", ...Object.keys(cidades)]) {
    if (seen.has(key)) continue;
    seen.add(key);
    const row = cidades[key] || {};
    if (row.bilingue_tipo === "percentual") {
      const pct = Math.max(0, Math.min(100, parseInt(row.bilingue_valor, 10) || 0));
      return { tipo: "percentual", valor: pct, cents: 0 };
    }
    if (row.bilingue_valor != null && row.bilingue_valor !== "") {
      const cents = Math.max(0, parseInt(row.bilingue_valor, 10) || 0);
      return { tipo: "fixo", valor: cents, cents };
    }
  }
  return { tipo: "fixo", valor: 4000, cents: 4000 };
}

function settingInt(key, fallback) {
  const row = MOCK_SETTINGS.find((s) => s.key_name === key);
  const n = parseInt(row && row.value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function ondeMsg(onde, msg) {
  return onde ? onde + ": " + msg : msg;
}

function validarGuiaValores(exc4, exc5, pri4, pri5, onde) {
  if (exc4 > 0 && pri4 > 0 && exc4 >= pri4) throw new Error(ondeMsg(onde, "PAX 4- Excursão tem que ser menor que o PAX 4- Privativo."));
  if (exc4 > 0 && (exc5 <= 0 || exc5 >= exc4)) throw new Error(ondeMsg(onde, "PAX 5+ Excursão tem que ser menor que o PAX 4- Excursão."));
  if (pri4 > 0 && (pri5 <= 0 || pri5 >= pri4)) throw new Error(ondeMsg(onde, "PAX 5+ Privativo tem que ser menor que o PAX 4- Privativo."));
  if (exc5 > 0 && pri5 > 0 && exc5 >= pri5) throw new Error(ondeMsg(onde, "PAX 5+ Excursão tem que ser menor que o PAX 5+ Privativo."));
}

function validarTransladoValores(excT, priT, onde) {
  if (excT > 0 && priT > 0 && excT >= priT) throw new Error(ondeMsg(onde, "Excursão com translado tem que ser menor que Privativo com translado."));
}

function validarDiariaValor(exc4, quorum, diaria, onde) {
  quorum = Math.max(1, parseInt(quorum, 10) || 1);
  if (exc4 > 0 && diaria > 0 && exc4 * quorum < diaria) {
    throw new Error(ondeMsg(onde, "PAX 4- Excursão × quórum " + quorum + " fica abaixo da diária mínima de guiagem."));
  }
}

function validarCidadesTarifa(cidades, quorum, diariaCents, nome) {
  for (const key of PASSEIO_CIDADE_KEYS) {
    const row = (cidades && cidades[key]) || {};
    const onde = (nome ? nome + " · " : "") + (TARIFARIO_CIDADES[key] || key);
    validarGuiaValores(row.excursao_pessoa_cents || 0, row.excursao_pessoa_5_cents || 0, row.exclusivo_pessoa_cents || 0, row.exclusivo_pessoa_5_cents || 0, onde);
    validarTransladoValores(row.excursao_transporte_cents || 0, row.exclusivo_transporte_cents || 0, onde);
    validarDiariaValor(row.excursao_pessoa_cents || 0, quorum, diariaCents, onde);
  }
}

function checarPiso(diariaReais, pagamentoReais, quorumGlobal) {
  if (diariaReais < 1 || pagamentoReais < 1) throw new Error("Informe a diária mínima e o pagamento mínimo de guiagem.");
  if (pagamentoReais >= diariaReais) throw new Error("O pagamento mínimo de guiagem tem que ser menor que a diária mínima de guiagem.");
  quorumGlobal = Math.max(1, Math.min(20, parseInt(quorumGlobal, 10) || 4));
  const falhas = [];
  for (const t of MOCK_TARIFARIOS) {
    for (const key of PASSEIO_CIDADE_KEYS) {
      const exc = (t.cidades && t.cidades[key] && t.cidades[key].excursao_pessoa_cents) || 0;
      try {
        validarDiariaValor(exc, t.quorum, diariaReais * 100, t.nome + " · " + (TARIFARIO_CIDADES[key] || key));
      } catch (err) {
        falhas.push(err.message);
      }
    }
  }
  for (const oficial of tarifasOficiais()) {
    if (oficial.tipo !== "guia") continue;
    try {
      validarDiariaValor(oficial.excursao, quorumGlobal, diariaReais, oficial.nome);
    } catch (err) {
      falhas.push(err.message);
    }
  }
  if (falhas.length) throw new Error(falhas.slice(0, 4).join(" ") + (falhas.length > 4 ? " E mais " + (falhas.length - 4) + "." : ""));
}

function regrasTarifa() {
  return {
    quorum: Math.max(1, Math.min(20, settingInt("passeio_quorum", 4))),
    diaria_minima_reais: Math.max(0, settingInt("diaria_minima_reais", 320)),
    pg_minimo_guia_reais: Math.max(0, settingInt("pg_minimo_guia_reais", 280)),
  };
}

function tarifarioNormalize(raw) {
  raw = raw || {};
  let quorum = parseInt(raw.quorum, 10);
  if (!(quorum >= 1 && quorum <= 20)) quorum = 4;
  const cidades = {};
  for (const key of PASSEIO_CIDADE_KEYS) {
    const row = (raw.cidades && raw.cidades[key]) || {};
    cidades[key] = {};
    for (const campo of TARIFARIO_CAMPOS) cidades[key][campo] = Math.max(0, parseInt(row[campo], 10) || 0);
  }
  const bi = bilingueOf(raw);
  return { quorum, bilingue_tipo: bi.tipo, bilingue_valor: bi.valor, bilingue_cents: bi.cents, cidades };
}

let mockTarifarioSeq = 1;
const MOCK_TARIFARIOS = [];

function tarifarioPublic(t) {
  if (!t) return null;
  const base = t.cidades["alto-paraiso"];
  return {
    id: t.id,
    nome: t.nome,
    quorum: t.quorum,
    bilingue_tipo: t.bilingue_tipo === "percentual" ? "percentual" : "fixo",
    bilingue_valor: t.bilingue_valor == null ? (t.bilingue_tipo === "percentual" ? 0 : (t.bilingue_cents == null ? 4000 : Math.max(0, parseInt(t.bilingue_cents, 10) || 0))) : Math.max(0, parseInt(t.bilingue_valor, 10) || 0),
    bilingue_cents: t.bilingue_tipo === "percentual" ? 0 : (t.bilingue_cents == null ? 4000 : Math.max(0, parseInt(t.bilingue_cents, 10) || 0)),
    ...base,
    cidades: JSON.parse(JSON.stringify(t.cidades)),
  };
}

function cidadeCurta(nome) {
  const n = String(nome || "");
  const pos = n.toLowerCase().indexOf(" de ");
  return pos > 2 ? n.slice(0, pos) : n;
}

function cidadeChave(name) {
  let n = String(name || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const known = {
    "alto paraiso de goias": "alto-paraiso",
    "alto paraiso": "alto-paraiso",
    "sao jorge": "sao-jorge",
    cavalcante: "cavalcante",
  };
  if (known[n]) return known[n];
  n = n.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return n || "cidade";
}

function cidadesSaidaMapa() {
  const map = { ...TARIFARIO_CIDADES };
  for (const c of MOCK_CITIES) {
    const name = String(c.name || "").trim();
    if (name) map[cidadeChave(name)] = name;
  }
  return map;
}

function saidasPublic(tarifa, duracao, fallbackMinutes, chaves) {
  if (!tarifa && !Array.isArray(chaves)) return [];
  const mapa = cidadesSaidaMapa();
  const keys = Array.isArray(chaves) ? chaves : Object.keys(mapa);
  const out = [];
  const base = (tarifa && tarifa.cidades && tarifa.cidades["alto-paraiso"]) || {};
  for (const key of keys) {
    if (!mapa[key]) continue;
    let row = (tarifa && tarifa.cidades && tarifa.cidades[key]) || {};
    const temPreco = TARIFARIO_CAMPOS.some((campo) => !campo.endsWith("_5_cents") && (parseInt(row[campo], 10) || 0) > 0);
    if (!temPreco) row = base;
    const item = {
      key,
      nome: mapa[key],
      curta: cidadeCurta(mapa[key]),
      minutes: (duracao && parseInt(duracao[key], 10)) || Math.max(0, parseInt(fallbackMinutes, 10) || 0),
    };
    let vende = false;
    for (const campo of TARIFARIO_CAMPOS) {
      item[campo] = Math.max(0, parseInt(row[campo], 10) || 0);
      if (item[campo] > 0 && !campo.endsWith("_5_cents")) vende = true;
    }
    if (vende || Array.isArray(chaves)) out.push(item);
  }
  return out;
}

function embarquesChaves(entity) {
  const emb = entity && entity.experiencia && entity.experiencia.embarques;
  if (!emb || typeof emb !== "object" || !Object.keys(emb).length) return null;
  const mapa = cidadesSaidaMapa();
  return Object.keys(emb).filter((key) => {
    if (!mapa[key]) return false;
    const row = emb[key];
    return !!(row && typeof row === "object");
  });
}

function embarquesPublic(entity) {
  const explicit = embarquesChaves(entity);
  if (explicit) return explicit;
  if (!entity) return [];
  return saidasPublic(tarifaDoPasseio(entity), {}, 0).map((s) => s.key);
}

function tarifaRelacaoPlana(tarifa) {
  if (!tarifa) return tarifa;
  const clone = JSON.parse(JSON.stringify(tarifa));
  const cidades = {};
  for (const key of PASSEIO_CIDADE_KEYS) {
    cidades[key] = {};
    for (const campo of TARIFARIO_CAMPOS) {
      cidades[key][campo] = Math.max(0, parseInt(tarifa[campo], 10) || 0);
    }
  }
  clone.cidades = cidades;
  return clone;
}

function chavesIntersecao(listas) {
  const base = listas[0] || [];
  return base.filter((key) => listas.every((lista) => lista.includes(key)));
}

function tarifarioById(id) {
  return MOCK_TARIFARIOS.find((t) => t.id === id) || null;
}

function minutosCampo(entity, key) {
  if (!entity) return 0;
  const emb = entity.experiencia && entity.experiencia.embarques;
  const salvo = emb && emb[key];
  const doCampo = salvo && parseInt(salvo.minutos, 10);
  if (doCampo > 0) return Math.min(doCampo, 1440);
  const mapa = entity.duracao;
  const doMapa = mapa && parseInt(mapa[key], 10);
  if (doMapa > 0) return Math.min(doMapa, 1440);
  if (key === "alto-paraiso") {
    const geral = parseInt(entity.duration_minutes, 10) || 0;
    if (geral > 0) return Math.min(geral, 1440);
  }
  return 0;
}

function duracaoPublica(entity, chaves) {
  const keys = chaves && chaves.length ? chaves : embarquesPublic(entity);
  const lista = keys.length ? keys : PASSEIO_CIDADE_KEYS;
  const out = {};
  for (const key of lista) out[key] = minutosCampo(entity, key);
  return out;
}

function duracaoCombo(parts, chaves) {
  const lista = chaves && chaves.length ? chaves : PASSEIO_CIDADE_KEYS;
  const out = {};
  for (const key of lista) {
    let sum = 0;
    for (const part of parts) {
      const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id) || part;
      sum += minutosCampo(live, key);
    }
    out[key] = Math.min(sum, 1440 * 3);
  }
  return out;
}

function duracaoClean(raw) {
  const out = {};
  const mapa = cidadesSaidaMapa();
  const keys = new Set([...PASSEIO_CIDADE_KEYS, ...Object.keys(mapa), ...Object.keys(raw || {})]);
  for (const key of keys) {
    if (!mapa[key] && PASSEIO_CIDADE_KEYS.indexOf(key) < 0) continue;
    const v = raw && parseInt(raw[key], 10);
    if (v > 0) out[key] = Math.min(v, 1440);
  }
  return out;
}

const MOCK_SETTINGS = [
  { key_name: "passeio_max_atrativos", value: "3", label: "Número máximo de experiências no mesmo passeio (até 3)", type: "integer" },
  { key_name: "passeio_bilingue", value: "{\"tipo\":\"fixo\",\"valor\":4000}", label: "Guia em outro idioma, vale para todas as tarifas", type: "json" },
  { key_name: "passeio_quorum", value: "4", label: "Quórum do passeio (pessoas no pacote mínimo do privativo sem translado)", type: "integer" },
  { key_name: "diaria_minima_reais", value: "320", label: "Diária mínima de guiagem (R$)", type: "integer" },
  { key_name: "pg_minimo_guia_reais", value: "280", label: "Pagamento mínimo de guiagem (R$). Tem que ser menor que a diária mínima.", type: "integer" },
  { key_name: "pausa_convite_inicio_hora", value: "22", label: "Convite ao guia: o relógio para a partir desta hora", type: "integer" },
  { key_name: "pausa_convite_fim_hora", value: "8", label: "Convite ao guia: o relógio volta nesta hora", type: "integer" },
  { key_name: "tarifa_ia_ativa", value: "0", label: "Tarifa inteligência artificial progressiva: 0 inativa, 1 ativa", type: "integer" },
  { key_name: "tarifa_ia_passo_pct", value: "2", label: "Passo da tarifa progressiva (%)", type: "percent" },
  { key_name: "platform_commission_pct", value: "10", label: "Comissão da plataforma no passeio do guia (%)", type: "percent" },
  { key_name: "payout_after_hour", value: "16", label: "Hora (Brasília) do PIX automático ao guia", type: "integer" },
  { key_name: "payout_after_minute", value: "20", label: "Minuto (Brasília) do PIX automático ao guia", type: "integer" },
];

function maxAtrativos() {
  const row = MOCK_SETTINGS.find((s) => s.key_name === "passeio_max_atrativos");
  const n = parseInt(row && row.value, 10);
  return Math.max(1, Math.min(3, Number.isFinite(n) ? n : 3));
}

for (const attraction of MOCK_ATTRACTIONS) {
  const extra = durationBySlug.get(attraction.slug);
  attraction.status = "published";
  attraction.duration_minutes = extra ? extra.minutes : null;
  attraction.page = extra ? extra.page : "";
  attraction.gallery = [];
  attraction.difficulty = "";
  attraction.distance_km = "";
  attraction.trail_distance_km = "";
  attraction.tarifario_id = null;
  attraction.tarifa_guia = "";
  attraction.tarifa_translado = "";
  attraction.duracao = {};
}

let mockRelatedSeq = 1;
const MOCK_RELATED = (RELATED_SEED.related || []).map((row) => {
  const attractions = (row.attractions || []).map((part) => {
    const found = MOCK_ATTRACTIONS.find((a) => a.slug === part.slug);
    return found
      ? {
          id: found.id,
          title_pt: found.title_pt,
          slug: found.slug,
          duration_minutes: found.duration_minutes || 0,
          page: found.page || part.page || "",
        }
      : null;
  }).filter(Boolean);
  return {
    id: mockRelatedSeq++,
    duration_minutes: row.minutes || attractions.reduce((sum, a) => sum + (a.duration_minutes || 0), 0),
    tarifario_id: null,
    duracao: {},
    attractions,
  };
}).filter((row) => row.attractions.length >= 2);

function relatedSignature(ids) {
  return [...ids].sort((a, b) => a - b).join("-");
}

(function seedTarifarios() {
  const file = path.join(ROOT, "api", "data", "tarifarios-seed.json");
  if (!fs.existsSync(file)) return;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return;
  }
  for (const row of data.tarifarios || []) {
    const t = { id: mockTarifarioSeq++, nome: String(row.nome || "Tarifário"), ...tarifarioNormalize(row) };
    MOCK_TARIFARIOS.push(t);
    for (const slug of row.atrativos || []) {
      const a = MOCK_ATTRACTIONS.find((x) => x.slug === slug);
      if (a) a.tarifario_id = t.id;
    }
    for (const slugs of row.combos || []) {
      const ids = slugs.map((slug) => (MOCK_ATTRACTIONS.find((x) => x.slug === slug) || {}).id).filter(Boolean);
      const tour = MOCK_RELATED.find((r) => relatedSignature(r.attractions.map((a) => a.id)) === relatedSignature(ids));
      if (tour) tour.tarifario_id = t.id;
    }
  }
})();

/** Marcas só do mock, para testar filtros e o widget. Não vai para o banco. */
(function seedPasseioOfertas() {
  const porSlug = {
    "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros": ["classicos"],
    "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso": ["destaque", "classicos"],
    "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante": ["aventura"],
    "vale-lua-guia-chapada-veadeiros-sao-jorge": ["familia", "classicos"],
    "cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso": ["lado-b"],
    "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias": ["classicos"],
  };
  for (const [slug, categorias] of Object.entries(porSlug)) {
    const a = MOCK_ATTRACTIONS.find((x) => x.slug === slug);
    if (a) a.categorias = categorias;
  }
  const semPasseio = MOCK_ATTRACTIONS.find((a) => a.slug === "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias");
  if (semPasseio) semPasseio.tem_passeio = false;

  const porCombo = [
    [["cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso", "caracol-guia-chapada-veadeiros"], ["classicos"]],
    [["cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", "vale-lua-guia-chapada-veadeiros-sao-jorge"], ["familia", "destaque"]],
    [["cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros", "vale-lua-guia-chapada-veadeiros-sao-jorge", "cachoeira-ponte-de-pedra-guia-chapada-veadeiros-cavalcante"], ["aventura", "destaque"]],
    [["cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso", "vale-lua-guia-chapada-veadeiros-sao-jorge"], ["lado-b", "familia"]],
  ];
  for (const [slugs, categorias] of porCombo) {
    const ids = slugs.map((slug) => (MOCK_ATTRACTIONS.find((a) => a.slug === slug) || {}).id).filter(Boolean);
    const tour = MOCK_RELATED.find((r) => relatedSignature(r.attractions.map((a) => a.id)) === relatedSignature(ids));
    if (tour) tour.categorias = categorias;
  }
})();

function experienciaSo4x4(entity) {
  const log = entity && entity.experiencia && entity.experiencia.logistica;
  return !!(log && log.so4x4);
}

function experienciaMaxParticipantes(entity) {
  const direto = parseInt(entity && entity.max_participantes, 10);
  if (direto >= 4 && direto <= 15) return direto;
  const log = entity && entity.experiencia && entity.experiencia.logistica;
  const n = parseInt(log && log.max, 10);
  return n >= 4 && n <= 15 ? n : 0;
}

function menorMaxParticipantes(lista) {
  const nums = (lista || []).map((item) => experienciaMaxParticipantes(item)).filter((n) => n >= 4);
  return nums.length ? Math.min(...nums) : 0;
}

function presentRelated(tour) {
  refreshRelatedDuration(tour);
  const attractions = tour.attractions.map((part) => {
    const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
    return {
      ...part,
      title_pt: live ? live.title_pt : part.title_pt,
      duration_minutes: live ? live.duration_minutes || 0 : part.duration_minutes,
      embarques: embarquesPublic(live || {}),
      somente_4x4: experienciaSo4x4(live),
      max_participantes: experienciaMaxParticipantes(live),
    };
  });
  const inter = chavesIntersecao(attractions.map((part) => part.embarques || []));
  const saidasTarifas = saidasTarifasPasseio(tour, inter);
  const chavesDuracao = inter.length ? inter : PASSEIO_CIDADE_KEYS;
  const minutos = tour.duracao_manual
    ? Object.fromEntries(chavesDuracao.map((key) => [key, tour.duration_minutes || 0]))
    : duracaoCombo(tour.attractions, chavesDuracao);
  const tarifa = tarifaPublicaDe(saidasTarifas) || tarifaRelacaoPlana(tarifaDoPasseio(tour));
  return {
    id: tour.id,
    duration_minutes: tour.duration_minutes,
    duracao_cidades: minutos,
    tarifario_id: tour.tarifario_id,
    tarifa_guia: tour.tarifa_guia || "",
    tarifa_translado: tour.tarifa_translado || "",
    saidas_tarifas: saidasTarifas,
    categorias: passeioCategorias(tour.categorias, (tour.attractions || []).length),
    tarifa,
    saidas: saidasPublic(tarifa, minutos, 0, inter),
    somente_4x4: attractions.some((part) => part.somente_4x4),
    max_participantes: menorMaxParticipantes(attractions),
    attractions,
  };
}

function mockRelatedFor(attractionId) {
  return MOCK_RELATED.filter((row) => row.attractions.some((a) => a.id === attractionId)).map(presentRelated);
}

function relatedTitle(tour) {
  return tour.attractions.map((part) => part.title_pt).join(" + ");
}

const PASSEIO_CATEGORIAS = {
  classicos: "Clássicos",
  destaque: "Destaque",
  "lado-b": "Lado B",
  familia: "Família",
  aventura: "Aventura",
};

function experienciaVendeNoSite(a) {
  if (!a || a.status !== "published" || a.tem_passeio === false || !a.page) return false;
  return tarifaVende(tarifaDoPasseio(a));
}

function passeioPartesVendem(parts) {
  return (parts || []).length > 0 && parts.every((part) => {
    const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
    return experienciaVendeNoSite(live);
  });
}

function passeioCategorias(raw, count) {
  const allowed = Object.keys(PASSEIO_CATEGORIAS);
  const list = Array.isArray(raw) ? raw.filter((key) => allowed.includes(key)) : [];
  return list.length ? list : count >= 2 ? ["destaque", "classicos"] : ["classicos"];
}

function passeioCatalog() {
  const max = maxAtrativos();
  const combos = MOCK_RELATED.map(presentRelated)
    .filter((tour) => tarifaVende(tour.tarifa) && tour.attractions.length >= 2 && tour.attractions.length <= max && passeioPartesVendem(tour.attractions))
    .map((presented) => {
      const first = presented.attractions[0] || {};
      const live = MOCK_ATTRACTIONS.find((a) => a.id === first.id);
      const source = MOCK_RELATED.find((row) => row.id === presented.id);
      return {
        id: "r-" + presented.id,
        kind: "combo",
        slug: first.slug || "",
        attraction_ids: presented.attractions.map((part) => part.id),
        title: relatedTitle(presented),
        count: presented.attractions.length,
        categories: passeioCategorias(source && source.categorias, presented.attractions.length),
        duration_minutes: presented.duration_minutes,
        duracao_cidades: presented.duracao_cidades,
        tarifa: presented.tarifa,
        saidas: presented.saidas || [],
        image: (live && live.cover_url) || "",
        somente_4x4: !!presented.somente_4x4,
        max_participantes: presented.max_participantes || 0,
        href: first.page ? "/" + String(first.page).replace(/^\/+/, "") : "/passeios.html",
        attractions: presented.attractions.map((part) => part.title_pt),
        parts: presented.attractions.map((part) => {
          const item = MOCK_ATTRACTIONS.find((a) => a.id === part.id) || part;
          const page = item.page || part.page || "";
          return {
            id: item.id || part.id,
            title: item.title_pt || part.title_pt || "",
            image: item.cover_url || "",
            href: page ? "/" + String(page).replace(/^\/+/, "") : "",
          };
        }),
      };
    });
  const singles = MOCK_ATTRACTIONS.filter((a) => experienciaVendeNoSite(a) && !String(a.title_pt).includes(" + ")).map((a) => ({
    id: "a-" + a.id,
    kind: "atrativo",
    slug: a.slug,
    attraction_ids: [a.id],
    title: a.title_pt,
    count: 1,
    categories: passeioCategorias(a.categorias, 1),
    duration_minutes: a.duration_minutes || 0,
    duracao_cidades: duracaoPublica(a, embarquesPublic(a)),
    tarifa: tarifaDoPasseio(a),
    embarques: embarquesPublic(a),
    saidas: saidasPublic(tarifaDoPasseio(a), duracaoPublica(a, embarquesPublic(a)), 0, embarquesPublic(a)),
    image: a.cover_url || "",
    somente_4x4: experienciaSo4x4(a),
    max_participantes: experienciaMaxParticipantes(a),
    href: "/" + String(a.page).replace(/^\/+/, ""),
    attractions: [a.title_pt],
    parts: [{
      id: a.id,
      title: a.title_pt,
      image: a.cover_url || "",
      href: "/" + String(a.page).replace(/^\/+/, ""),
    }],
  }));
  return combos.concat(singles);
}

function passeioPublicPayload(slug) {
  const attraction = MOCK_ATTRACTIONS.find((a) => a.slug === slug);
  if (!attraction) return null;
  const max = maxAtrativos();
  const tarifa = tarifaDoPasseio(attraction);
  const vende = experienciaVendeNoSite(attraction);
  return {
    slug: attraction.slug,
    title: attraction.title_pt,
    duration_minutes: attraction.duration_minutes || 0,
    duracao_cidades: duracaoPublica(attraction, embarquesPublic(attraction)),
    tem_passeio: attraction.tem_passeio !== false && vende,
    categorias: passeioCategorias(attraction.categorias, 1),
    tarifa: vende ? tarifa : null,
    embarques: vende ? embarquesPublic(attraction) : [],
    saidas: vende ? saidasPublic(tarifa, duracaoPublica(attraction, embarquesPublic(attraction)), 0, embarquesPublic(attraction)) : [],
    max_atrativos: max,
    somente_4x4: experienciaSo4x4(attraction),
    max_participantes: experienciaMaxParticipantes(attraction),
    related_tours: mockRelatedFor(attraction.id).filter((t) => tarifaVende(t.tarifa) && t.attractions.length >= 2 && t.attractions.length <= max && passeioPartesVendem(t.attractions)),
  };
}

function tarifarioOverview(extra) {
  const tarifarios = MOCK_TARIFARIOS.slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
    .map((t) => ({
      ...tarifarioPublic(t),
      atrativos: MOCK_ATTRACTIONS.filter((a) => a.tarifario_id === t.id).map((a) => ({ id: a.id, title_pt: a.title_pt })),
      passeios: MOCK_RELATED.filter((r) => r.tarifario_id === t.id).map((r) => ({ id: r.id, title: relatedTitle(r) })),
    }));
  const atrativos = MOCK_ATTRACTIONS.filter((a) => !String(a.title_pt).includes(" + "))
    .slice()
    .sort((a, b) => a.title_pt.localeCompare(b.title_pt, "pt", { sensitivity: "base" }))
    .map((a) => ({
      id: a.id,
      title_pt: a.title_pt,
      slug: a.slug,
      status: a.status,
      duration_minutes: a.duration_minutes || 0,
      page: a.page || "",
      tem_passeio: a.tem_passeio !== false,
      categorias: passeioCategorias(a.categorias, 1),
      tarifario_id: a.tarifario_id,
      tarifa_guia: a.tarifa_guia || "",
      tarifa_translado: a.tarifa_translado || "",
      saidas_tarifas: saidasTarifasAtrativo(a),
      duracao_cidades: duracaoPublica(a, embarquesPublic(a)),
    }));
  return { ok: true, data: { max_atrativos: maxAtrativos(), categorias: PASSEIO_CATEGORIAS, cidades: TARIFARIO_CIDADES, tarifas_oficiais: tarifasOficiais(), bilingue: bilingueUniversal(), regras: regrasTarifa(), tarifarios, atrativos, passeios: MOCK_RELATED.map(presentRelated), ...(extra || {}) } };
}

function mockRelatedSave(rawIds) {
  const ids = [...new Set((rawIds || []).map((n) => parseInt(n, 10)).filter(Boolean))];
  const max = maxAtrativos();
  if (max < 2) throw new Error("Nas Configurações, o máximo de atrativos no mesmo dia é 1. Aumente para juntar atrativos.");
  if (ids.length < 2 || ids.length > max) throw new Error("Um passeio com mais de um atrativo tem de 2 a " + max + " atrativos.");
  const picked = ids.map((id) => MOCK_ATTRACTIONS.find((a) => a.id === id)).filter(Boolean);
  if (picked.length !== ids.length) throw new Error("Atrativo não encontrado.");
  let tour = MOCK_RELATED.find((row) => relatedSignature(row.attractions.map((a) => a.id)) === relatedSignature(ids));
  if (!tour) {
    tour = {
      id: mockRelatedSeq++,
      tarifario_id: null,
      tarifa_guia: "",
      tarifa_translado: "",
      duracao: {},
      duration_minutes: 0,
      attractions: picked.map((a) => ({ id: a.id, title_pt: a.title_pt, slug: a.slug, duration_minutes: a.duration_minutes || 0, page: a.page })),
    };
    refreshRelatedDuration(tour);
    MOCK_RELATED.push(tour);
  }
  return tour;
}

const CUPOM_SEED = [
  { id: "c1", codigo: "BEMVINDO", ativo: true, tipo: "total", modo: "percentual", valor: 10, minimo_pessoas: 0, alcance: "total" },
  { id: "c2", codigo: "PESSOA20", ativo: true, tipo: "pessoa", modo: "fixo", valor: 2000, minimo_pessoas: 0, alcance: "pessoa" },
  { id: "c3", codigo: "GRUPO5", ativo: true, tipo: "grupo", modo: "percentual", valor: 15, minimo_pessoas: 4, alcance: "total" },
];
let cuponsLive = null;

function cuponsLista() {
  if (!cuponsLive) cuponsLive = CUPOM_SEED.map((c) => ({ ...c }));
  return cuponsLive;
}

function cupomNorm(row) {
  const tipo = ["total", "pessoa", "grupo"].includes(row.tipo) ? row.tipo : "total";
  const modo = row.modo === "percentual" ? "percentual" : "fixo";
  let alcance = row.alcance === "pessoa" ? "pessoa" : "total";
  const codigo = String(row.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let valor = parseInt(String(row.valor), 10) || 0;
  valor = modo === "percentual" ? Math.max(1, Math.min(100, valor)) : Math.max(1, valor);
  let min = Math.max(0, parseInt(String(row.minimo_pessoas), 10) || 0);
  if (tipo === "grupo") min = Math.max(1, min);
  else {
    min = 0;
    alcance = tipo === "pessoa" ? "pessoa" : "total";
  }
  return {
    id: String(row.id || ""),
    codigo,
    ativo: row.ativo !== false && row.ativo !== 0,
    tipo,
    modo,
    valor,
    minimo_pessoas: min,
    alcance,
  };
}

function cupomMsg(error, locale, min) {
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  const msgs = {
    pt: {
      empty_code: "Informe o código do cupom.",
      not_found: "Cupom não encontrado.",
      inactive: "Este cupom está desativado.",
      min_people: "Este cupom vale quando o carrinho tem mais de " + min + " pessoas.",
      zero: "Este cupom não gera desconto neste carrinho.",
    },
    en: {
      empty_code: "Enter the coupon code.",
      not_found: "Coupon not found.",
      inactive: "This coupon is turned off.",
      min_people: "This coupon applies when the cart has more than " + min + " people.",
      zero: "This coupon does not discount this cart.",
    },
    es: {
      empty_code: "Escribe el código del cupón.",
      not_found: "Cupón no encontrado.",
      inactive: "Este cupón está desactivado.",
      min_people: "Este cupón vale cuando el carrito tiene más de " + min + " personas.",
      zero: "Este cupón no genera descuento en este carrito.",
    },
  };
  return (msgs[loc] && msgs[loc][error]) || msgs.pt.not_found;
}

function cupomDesconto(cupom, pessoas, totalCents) {
  if (!cupom.ativo) return { ok: false, error: "inactive" };
  pessoas = Math.max(0, pessoas);
  totalCents = Math.max(0, totalCents);
  let tipo = cupom.tipo;
  if (tipo === "grupo") {
    if (pessoas <= cupom.minimo_pessoas) {
      return { ok: false, error: "min_people", minimo_pessoas: cupom.minimo_pessoas };
    }
    tipo = cupom.alcance === "pessoa" ? "pessoa" : "total";
  }
  if (totalCents < 100) return { ok: false, error: "zero" };
  let off = 0;
  if (tipo === "pessoa" && cupom.modo === "fixo") off = cupom.valor * Math.max(1, pessoas);
  else if (cupom.modo === "percentual") off = Math.round((totalCents * Math.min(100, cupom.valor)) / 100);
  else off = cupom.valor;
  off = Math.max(0, Math.min(totalCents, off));
  if (off < 1) return { ok: false, error: "zero" };
  return { ok: true, desconto_cents: off };
}

function cupomTeto(totalCents, off) {
  if (totalCents - off < 100) off = totalCents - 100;
  return Math.max(0, off);
}

function cupomAplicar(codigo, pessoas, totalCents, locale) {
  codigo = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!codigo) return { ok: false, error: "empty_code", message: cupomMsg("empty_code", locale, 0) };
  const found = cuponsLista().find((c) => c.codigo === codigo);
  if (!found) return { ok: false, error: "not_found", message: cupomMsg("not_found", locale, 0) };
  const calc = cupomDesconto(found, pessoas, totalCents);
  if (!calc.ok) {
    const min = calc.minimo_pessoas || found.minimo_pessoas;
    return { ok: false, error: calc.error, minimo_pessoas: min, message: cupomMsg(calc.error, locale, min) };
  }
  const off = cupomTeto(totalCents, calc.desconto_cents);
  if (off < 1) return { ok: false, error: "zero", message: cupomMsg("zero", locale, 0) };
  return { ok: true, desconto_cents: off, cupom: found };
}

function cupomSobreCarrinho(data) {
  const codigo = String((data && data.cupom) || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const trips = Array.isArray(data && data.trips) ? data.trips : [];
  let gross = 0;
  let pessoas = 0;
  trips.forEach((trip) => {
    if (!trip || typeof trip !== "object") return;
    const qty = Math.max(1, parseInt(String(trip.qty), 10) || 1);
    const unit = Math.round((Number(trip.valorUnit) || 0) * 100);
    gross += unit * qty;
    pessoas += Math.max(1, parseInt(String(trip.pessoas != null ? trip.pessoas : qty), 10) || qty);
  });
  if (!codigo || gross < 1) return { aplicado: false, invalido: false, esperadoReais: 0, codigo: "" };
  const locale = data.locale === "en" || data.locale === "es" ? data.locale : "pt";
  const calc = cupomAplicar(codigo, pessoas || 1, gross, locale);
  if (!calc.ok) return { aplicado: false, invalido: true, message: calc.message, codigo };
  return {
    aplicado: true,
    invalido: false,
    codigo,
    esperadoReais: Math.round(Math.max(100, gross - calc.desconto_cents)) / 100,
  };
}

function handleCupomApi(urlPath, req, res) {
  const send = (payload, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  };
  if (urlPath === "/api/cupom.php" && req.method === "POST") {
    readJsonBody(req)
      .then((data) => {
        const locale = data.locale === "en" || data.locale === "es" ? data.locale : "pt";
        const calc = cupomAplicar(data.codigo, parseInt(data.pessoas, 10) || 0, parseInt(data.total_cents, 10) || 0, locale);
        if (!calc.ok) {
          send({ ok: false, error: calc.error, message: calc.message, minimo_pessoas: calc.minimo_pessoas || 0 });
          return;
        }
        send({
          ok: true,
          codigo: calc.cupom.codigo,
          tipo: calc.cupom.tipo,
          modo: calc.cupom.modo,
          valor: calc.cupom.valor,
          minimo_pessoas: calc.cupom.minimo_pessoas,
          alcance: calc.cupom.alcance,
          desconto_cents: calc.desconto_cents,
          total_cents: parseInt(data.total_cents, 10) || 0,
          pessoas: parseInt(data.pessoas, 10) || 0,
        });
      })
      .catch(() => send({ ok: false, message: "Invalid JSON" }, 400));
    return true;
  }
  if (urlPath !== "/api/admin/cupons.php") return false;
  if (req.method === "GET") return send({ ok: true, cupons: cuponsLista() }), true;
  readJsonBody(req)
    .then((body) => {
      try {
        const lista = cuponsLista();
        if (req.method === "DELETE") {
          const id = String(body.id || "");
          const next = lista.filter((c) => c.id !== id);
          if (next.length === lista.length) throw new Error("Cupom não encontrado.");
          cuponsLive = next;
          send({ ok: true, cupons: cuponsLista() });
          return;
        }
        if (req.method !== "POST" && req.method !== "PUT") {
          send({ ok: false, error: "Método não permitido" }, 405);
          return;
        }
        const norm = cupomNorm(body || {});
        if (!norm.codigo) throw new Error("Informe o código do cupom.");
        if (lista.some((c) => c.codigo === norm.codigo && c.id !== String(body.id || ""))) {
          throw new Error("Já existe um cupom com este código.");
        }
        if (req.method === "POST") {
          norm.id = "c" + Math.random().toString(16).slice(2, 10);
          lista.push(norm);
        } else {
          const id = String(body.id || "");
          const i = lista.findIndex((c) => c.id === id);
          if (i < 0) throw new Error("Cupom não encontrado.");
          norm.id = id;
          lista[i] = norm;
        }
        send({ ok: true, cupons: cuponsLista() });
      } catch (err) {
        send({ ok: false, error: err.message || "Erro" }, 400);
      }
    })
    .catch(() => send({ ok: false, error: "JSON inválido" }, 400));
  return true;
}

function handleTarifarioApi(urlPath, req, res) {
  if (urlPath !== "/api/admin/tarifarios.php") return false;
  const send = (payload, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  };
  if (req.method === "GET") return send(tarifarioOverview()), true;
  readJsonBody(req)
    .then((body) => {
      try {
        if (req.method === "POST" || (req.method === "PUT" && !body.action)) {
          const nome = String(body.nome || "").trim().slice(0, 160);
          if (!nome) return send({ ok: false, error: "Dê um nome ao tarifário." }, 400);
          const norm = tarifarioNormalize(body);
          validarCidadesTarifa(norm.cidades, norm.quorum, settingInt("diaria_minima_reais", 320) * 100, nome);
          if (req.method === "POST") {
            const t = { id: mockTarifarioSeq++, nome, ...norm };
            MOCK_TARIFARIOS.push(t);
            return send(tarifarioOverview({ saved_id: t.id }));
          }
          const t = tarifarioById(parseInt(body.id, 10));
          if (!t) return send({ ok: false, error: "Tarifário não encontrado." }, 400);
          Object.assign(t, { nome }, norm);
          return send(tarifarioOverview({ saved_id: t.id }));
        }
        if (req.method === "PUT" && body.action === "link") {
          const tid = body.tarifario_id ? parseInt(body.tarifario_id, 10) : null;
          if (tid && !tarifarioById(tid)) return send({ ok: false, error: "Tarifário não encontrado." }, 400);
          if (body.attraction_id) {
            const a = MOCK_ATTRACTIONS.find((x) => x.id === parseInt(body.attraction_id, 10));
            if (a) a.tarifario_id = tid;
          } else if (body.passeio_id) {
            const r = MOCK_RELATED.find((x) => x.id === parseInt(body.passeio_id, 10));
            if (r) r.tarifario_id = tid;
          }
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "bilingue") {
          const tipo = body.bilingue_tipo === "percentual" ? "percentual" : "fixo";
          const valor = tipo === "percentual"
            ? Math.max(0, Math.min(100, parseInt(body.bilingue_valor, 10) || 0))
            : Math.max(0, parseInt(body.bilingue_valor, 10) || 0);
          const row = MOCK_SETTINGS.find((s) => s.key_name === "passeio_bilingue");
          if (row) row.value = JSON.stringify({ tipo, valor });
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "regras") {
          const diaria = Math.round(Number(body.diaria_minima_reais));
          const pg = Math.round(Number(body.pg_minimo_guia_reais));
          checarPiso(diaria, pg, settingInt("passeio_quorum", 4));
          const dRow = MOCK_SETTINGS.find((s) => s.key_name === "diaria_minima_reais");
          const pRow = MOCK_SETTINGS.find((s) => s.key_name === "pg_minimo_guia_reais");
          if (dRow) dRow.value = String(diaria);
          if (pRow) pRow.value = String(pg);
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "oficiais") {
          const guia = String(body.tarifa_guia || "").trim();
          const trans = String(body.tarifa_translado || "").trim();
          if (guia && !tarifaOficialItem(guia, "guia")) return send({ ok: false, error: "Tarifa Guia não está na lista oficial." }, 400);
          if (trans && !tarifaOficialItem(trans, "translado")) return send({ ok: false, error: "Tarifa Translado não está na lista oficial." }, 400);
          const alvo = body.attraction_id
            ? MOCK_ATTRACTIONS.find((x) => x.id === parseInt(body.attraction_id, 10))
            : MOCK_RELATED.find((x) => x.id === parseInt(body.passeio_id, 10));
          if (!alvo) return send({ ok: false, error: "Passeio não encontrado." }, 400);
          aplicarParNasSaidas(alvo, guia, trans);
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "tarifa_editar") {
          tarifaOficialEditar(body.codigo, body.excursao, body.privativo, body.excursao_5, body.privativo_5);
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "tarifa_saida") {
          const kind = String(body.kind || "");
          const id = parseInt(body.id, 10);
          const cidade = String(body.cidade || "");
          const campo = body.campo === "translado" ? "translado" : body.campo === "guia" ? "guia" : "";
          const codigo = String(body.codigo || "").trim();
          if (!campo) return send({ ok: false, error: "Informe se é tarifa de guia ou de translado." }, 400);
          if (codigo && !tarifaOficialItem(codigo, campo === "guia" ? "guia" : "translado")) {
            return send({ ok: false, error: "Tarifa não está na lista." }, 400);
          }
          if (cidade && !TARIFARIO_CIDADES[cidade]) return send({ ok: false, error: "Cidade de saída inválida." }, 400);
          if (kind === "atrativo") {
            const a = MOCK_ATTRACTIONS.find((x) => x.id === id);
            if (!a) return send({ ok: false, error: "Experiência não encontrada." }, 400);
            const lista = saidasTarifasAtrativo(a);
            let found = false;
            for (const item of lista) {
              if (item.key !== cidade) continue;
              item[campo] = codigo;
              found = true;
              break;
            }
            if (!found) {
              if (!cidade) return send({ ok: false, error: "Essa experiência não tem cidade de saída." }, 400);
              lista.push({
                key: cidade,
                nome: TARIFARIO_CIDADES[cidade],
                guia: campo === "guia" ? codigo : "",
                translado: campo === "translado" ? codigo : "",
              });
            }
            gravarSaidasAtrativo(a, lista);
            return send(tarifarioOverview());
          }
          if (kind === "passeio") {
            const tour = MOCK_RELATED.find((x) => x.id === id);
            if (!tour) return send({ ok: false, error: "Passeio não encontrado." }, 400);
            const chaves = chavesDoPasseio(tour);
            if (cidade && chaves.indexOf(cidade) < 0) return send({ ok: false, error: "Essa saída não faz parte do passeio." }, 400);
            const lista = saidasTarifasPasseio(tour, chaves);
            const item = lista.find((s) => s.key === cidade);
            if (!item) return send({ ok: false, error: "Essa saída não faz parte do passeio." }, 400);
            item[campo] = codigo;
            gravarSaidasPasseio(tour, lista);
            return send(tarifarioOverview());
          }
          return send({ ok: false, error: "Informe a experiência ou o passeio." }, 400);
        }
        if (req.method === "PUT" && body.action === "tarifa_criar") {
          tarifaOficialCriar(body.tipo, body.excursao, body.privativo, body.excursao_5, body.privativo_5);
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "tarifa_pax5") {
          tarifaOficialPax5(body.codigo, body.excursao_5, body.privativo_5);
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "tarifa_excluir") {
          const moved = tarifaOficialExcluir(body.codigo);
          return send(tarifarioOverview(moved));
        }
        if (req.method === "PUT" && body.action === "oferta") {
          const cats = passeioCategorias(body.categorias, 1);
          if (body.attraction_id) {
            const a = MOCK_ATTRACTIONS.find((x) => x.id === parseInt(body.attraction_id, 10));
            if (a) {
              a.categorias = cats;
              if (body.tem_passeio !== undefined) a.tem_passeio = !!body.tem_passeio;
            }
          } else if (body.passeio_id) {
            const r = MOCK_RELATED.find((x) => x.id === parseInt(body.passeio_id, 10));
            if (r) r.categorias = cats;
          }
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "duracao") {
          const clean = duracaoClean(body.duracao);
          if (body.attraction_id) {
            const a = MOCK_ATTRACTIONS.find((x) => x.id === parseInt(body.attraction_id, 10));
            if (a) a.duracao = clean;
          } else if (body.passeio_id) {
            const r = MOCK_RELATED.find((x) => x.id === parseInt(body.passeio_id, 10));
            if (r) r.duracao = clean;
          }
          return send(tarifarioOverview());
        }
        if (req.method === "PUT" && body.action === "combo") {
          const tour = mockRelatedSave(body.attraction_ids);
          if (body.tarifario_id && tarifarioById(parseInt(body.tarifario_id, 10))) tour.tarifario_id = parseInt(body.tarifario_id, 10);
          return send(tarifarioOverview({ saved_passeio_id: tour.id }));
        }
        if (req.method === "DELETE") {
          if (body.passeio_id) {
            const i = MOCK_RELATED.findIndex((r) => r.id === parseInt(body.passeio_id, 10));
            if (i >= 0) MOCK_RELATED.splice(i, 1);
            return send(tarifarioOverview());
          }
          const id = parseInt(body.id, 10);
          MOCK_ATTRACTIONS.forEach((a) => { if (a.tarifario_id === id) a.tarifario_id = null; });
          MOCK_RELATED.forEach((r) => { if (r.tarifario_id === id) r.tarifario_id = null; });
          const i = MOCK_TARIFARIOS.findIndex((t) => t.id === id);
          if (i >= 0) MOCK_TARIFARIOS.splice(i, 1);
          return send(tarifarioOverview());
        }
        return send({ ok: false, error: "Método não permitido" }, 405);
      } catch (err) {
        return send({ ok: false, error: err.message }, 400);
      }
    })
    .catch(() => send({ ok: false, error: "JSON inválido" }, 400));
  return true;
}

function handleSettingsApi(urlPath, req, res) {
  if (urlPath !== "/api/admin/settings.php") return false;
  const send = (payload) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  };
  if (req.method === "GET") return send({ ok: true, data: { settings: MOCK_SETTINGS } }), true;
  readJsonBody(req)
    .then((body) => {
      const row = MOCK_SETTINGS.find((s) => s.key_name === body.key_name);
      if (!row) return send({ ok: false, error: "Configuração não encontrada" });
      if (body.key_name === "passeio_max_atrativos") {
        const n = Math.round(Number(body.value));
        if (!Number.isFinite(n) || n < 1 || n > 3) return send({ ok: false, error: "Informe de 1 a 3 experiências no mesmo passeio" });
        row.value = String(n);
        return send({ ok: true, data: row });
      }
      if (body.key_name === "diaria_minima_reais" || body.key_name === "pg_minimo_guia_reais" || body.key_name === "passeio_quorum") {
        const n = Math.round(Number(body.value));
        if (body.key_name === "passeio_quorum" && !(n >= 1 && n <= 20)) return send({ ok: false, error: "O quórum fica entre 1 e 20 pessoas." });
        if (body.key_name !== "passeio_quorum" && !(n >= 1 && n <= 100000)) return send({ ok: false, error: "Informe um valor em reais." });
        const diaria = body.key_name === "diaria_minima_reais" ? n : settingInt("diaria_minima_reais", 320);
        const pg = body.key_name === "pg_minimo_guia_reais" ? n : settingInt("pg_minimo_guia_reais", 280);
        const quorum = body.key_name === "passeio_quorum" ? n : settingInt("passeio_quorum", 4);
        try { checarPiso(diaria, pg, quorum); } catch (err) { return send({ ok: false, error: err.message }); }
        row.value = String(n);
        return send({ ok: true, data: row });
      }
      row.value = String(body.value);
      return send({ ok: true, data: row });
    })
    .catch(() => send({ ok: false, error: "JSON inválido" }));
  return true;
}

function refreshRelatedDuration(tour) {
  const sum = tour.attractions.reduce((total, part) => {
    const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
    part.duration_minutes = live ? (live.duration_minutes || 0) : part.duration_minutes;
    return total + (part.duration_minutes || 0);
  }, 0);
  if (!tour.duracao_manual) tour.duration_minutes = sum;
}

function comTextoDaPagina(row) {
  const paginas = lerPaginasAtrativo(ROOT, row && row.slug);
  const out = { ...row };
  for (const lang of ["pt", "en", "es"]) {
    const pagina = paginas[lang];
    if (!pagina) continue;
    const bodyKey = "content_" + lang;
    const sideKey = "sidebar_html_" + lang;
    if (!String(out[bodyKey] || "").replace(/<[^>]*>/g, "").trim() && pagina.bodyHtml) out[bodyKey] = pagina.bodyHtml;
    if (!String(out[sideKey] || "").trim() && pagina.sidebarHtml) out[sideKey] = pagina.sidebarHtml;
    if (pagina.subtitle) {
      const exp = out.experiencia && typeof out.experiencia === "object" ? { ...out.experiencia } : {};
      if (!String(exp["subtitulo_" + lang] || "").trim()) exp["subtitulo_" + lang] = pagina.subtitle;
      out.experiencia = exp;
    }
  }
  return out;
}

function gravarTextoDaPagina(row) {
  if (!row || !row.slug) return;
  const exp = row.experiencia && typeof row.experiencia === "object" ? row.experiencia : {};
  gravarPaginasAtrativo(ROOT, row.slug, {
    pt: {
      bodyHtml: row.content_pt || "",
      sidebarHtml: row.sidebar_html_pt || "",
      title: row.title_pt || "",
      subtitle: exp.subtitulo_pt || "",
    },
    en: { subtitle: exp.subtitulo_en || "" },
    es: { subtitle: exp.subtitulo_es || "" },
  });
}

function aplicarFichaAtrativo(row, body) {
  const texto = ["title_pt", "title_en", "title_es", "slug", "status", "excerpt_pt", "excerpt_en", "excerpt_es", "content_pt", "content_en", "content_es", "seo_title_pt", "seo_title_en", "seo_title_es", "seo_desc_pt", "seo_desc_en", "seo_desc_es", "sidebar_html_pt", "sidebar_html_en", "sidebar_html_es", "cover_url", "parking_info", "recommended_period", "entry_price_label", "difficulty", "tarifa_guia", "tarifa_translado"];
  for (const k of texto) {
    if (Object.prototype.hasOwnProperty.call(body, k) && body[k] != null) row[k] = String(body[k]);
  }
  if (Object.prototype.hasOwnProperty.call(body, "tem_passeio")) row.tem_passeio = body.tem_passeio !== false && body.tem_passeio !== 0 && body.tem_passeio !== "0";
  if (Object.prototype.hasOwnProperty.call(body, "entry_price_cents")) {
    row.entry_price_cents = body.entry_price_cents === "" || body.entry_price_cents == null
      ? null
      : Math.max(0, parseInt(body.entry_price_cents, 10) || 0);
  }
  for (const k of ["distance_km", "trail_distance_km"]) {
    if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
    row[k] = body[k] === "" || body[k] == null ? "" : String(body[k]);
  }
  if (Object.prototype.hasOwnProperty.call(body, "duration_minutes")) {
    row.duration_minutes = body.duration_minutes === "" || body.duration_minutes == null
      ? null
      : Math.max(0, parseInt(body.duration_minutes, 10) || 0);
  }
  if (Object.prototype.hasOwnProperty.call(body, "cidade_nome")) {
    const nome = String(body.cidade_nome || "").trim();
    const city = MOCK_CITIES.find((c) => c.name === nome);
    row.city_id = city ? city.id : (nome ? row.city_id || null : null);
  }
  if (body.experiencia && typeof body.experiencia === "object") row.experiencia = body.experiencia;
  if (Array.isArray(body.gallery)) row.gallery = body.gallery;
  if (body.duracao && typeof body.duracao === "object") row.duracao = duracaoClean(body.duracao);
  if (Object.prototype.hasOwnProperty.call(body, "tarifario_id")) {
    const tid = body.tarifario_id ? parseInt(body.tarifario_id, 10) : null;
    row.tarifario_id = tid && tarifarioById(tid) ? tid : null;
  }
}

let MOCK_TERAPIAS = [];
let mockTerapiaSeq = 1;

function terapiaSlug(nome, exceptoId) {
  const base = String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "terapia";
  let slug = base;
  let n = 2;
  while (MOCK_TERAPIAS.some((t) => t.slug === slug && t.id !== exceptoId)) {
    slug = base + "-" + n;
    n += 1;
  }
  return slug;
}

function terapiaLinha(body, atual) {
  const nome = String(body.nome || "").trim();
  if (!nome) throw new Error("Dê um nome à terapia.");
  let precoRaw = String(body.preco_hora_reais ?? "").replace(/R\$/g, "").replace(/\s/g, "");
  if (precoRaw.includes(",") && precoRaw.includes(".")) precoRaw = precoRaw.replace(/\./g, "").replace(",", ".");
  else precoRaw = precoRaw.replace(",", ".");
  const preco = Math.round(Number(precoRaw) * 100);
  if (!Number.isFinite(preco) || preco <= 0) throw new Error("Informe o preço por hora.");
  let minutos = null;
  if (body.duracao_padrao_min !== "" && body.duracao_padrao_min != null) {
    minutos = parseInt(body.duracao_padrao_min, 10);
    if (!Number.isFinite(minutos) || minutos < 15 || minutos > 720) {
      throw new Error("A duração padrão fica entre 15 e 720 minutos.");
    }
  }
  const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
  const id = atual ? atual.id : mockTerapiaSeq++;
  return {
    id,
    nome: nome.slice(0, 160),
    slug: terapiaSlug(nome, atual ? atual.id : 0),
    status,
    descricao: String(body.descricao || "").trim().slice(0, 4000),
    preco_hora_cents: preco,
    duracao_padrao_min: minutos,
    updated_at: new Date().toISOString(),
  };
}

function handleTerapiaApi(urlPath, req, res) {
  if (urlPath !== "/api/admin/terapias.php") return false;
  const send = (payload, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  };
  if (req.method === "GET") {
    return send({
      ok: true,
      data: {
        terapias: MOCK_TERAPIAS,
        nota: "Terapia é vendida por hora e não aparece no site. Só o passeio feito só de atrativo é publicado.",
      },
    }), true;
  }
  readJsonBody(req).then((body) => {
    try {
      if (req.method === "POST") {
        const row = terapiaLinha(body, null);
        MOCK_TERAPIAS.push(row);
        return send({ ok: true, data: row });
      }
      if (req.method === "PUT") {
        const id = parseInt(body.id, 10);
        const index = MOCK_TERAPIAS.findIndex((t) => t.id === id);
        if (index < 0) return send({ ok: false, error: "Terapia não encontrada." }, 400);
        MOCK_TERAPIAS[index] = terapiaLinha(body, MOCK_TERAPIAS[index]);
        return send({ ok: true, data: MOCK_TERAPIAS[index] });
      }
      return send({ ok: false, error: "Método não permitido" }, 405);
    } catch (err) {
      return send({ ok: false, error: err.message || "Não foi possível salvar a terapia." }, 400);
    }
  }).catch(() => send({ ok: false, error: "JSON inválido" }, 400));
  return true;
}

function faltasParaAtivarAtrativo(body) {
  if (String(body.status || "") !== "published") return [];
  const faltas = [];
  if (!String(body.title_pt || "").trim()) faltas.push("Nome da experiência");
  if (!String(body.content_pt || "").replace(/<[^>]*>/g, "").trim()) faltas.push("Descrição");
  const exp = body.experiencia && typeof body.experiencia === "object" ? body.experiencia : {};
  const cidade = String(body.cidade_nome || exp.cidade || "").trim();
  if (!cidade) faltas.push("Cidade da experiência");
  const embarques = exp.embarques && typeof exp.embarques === "object" ? exp.embarques : null;
  if (embarques) {
    let comSaida = 0;
    for (const [key, row] of Object.entries(embarques)) {
      if (!row || typeof row !== "object") continue;
      comSaida += 1;
      const nome = String(row.nome || key);
      if (!String(row.guia || "").trim()) faltas.push("Tarifa Guia em " + nome);
      if (!(parseInt(row.minutos, 10) > 0)) faltas.push("Duração em " + nome);
    }
    if (!comSaida) faltas.push("Pelo menos uma cidade de saída");
  } else {
    if (!String(body.tarifa_guia || "").trim()) {
      faltas.push("Tarifa Guia");
    }
    if (!(parseInt(body.duration_minutes, 10) > 0)) faltas.push("Duração do passeio");
  }
  return faltas;
}

function reaisLista(cents) {
  return Math.round((parseInt(cents, 10) || 0) / 100);
}

function saidasParaLista(a) {
  const mapa = cidadesSaidaMapa();
  const exp = (a && a.experiencia) || {};
  const emb = exp.embarques;
  if (emb && typeof emb === "object" && Object.keys(emb).length) {
    const out = [];
    for (const [key, item] of Object.entries(emb)) {
      if (!item || typeof item !== "object") continue;
      const guia = String(item.guia || "").trim().toUpperCase();
      const trans = String(item.trans || "").trim().toUpperCase();
      out.push({
        nome: String(item.nome || mapa[key] || key).trim(),
        codigo: [guia, trans].filter(Boolean).join(" · "),
        detalhe: "",
      });
    }
    if (out.length) return out;
  }
  const tarifa = tarifaDoPasseio(a);
  if (!tarifa || !tarifaVende(tarifa)) return [];
  const guia = String((a && a.tarifa_guia) || tarifa.tarifa_guia || "").trim().toUpperCase();
  const trans = String((a && a.tarifa_translado) || tarifa.tarifa_translado || "").trim().toUpperCase();
  const codigo = [guia, trans].filter(Boolean).join(" · ");
  const cidades = tarifa.cidades || {};
  const out = [];
  for (const key of Object.keys(TARIFARIO_CIDADES)) {
    const row = cidades[key];
    if (!row) continue;
    const exc = reaisLista(row.excursao_pessoa_cents);
    const pri = reaisLista(row.exclusivo_pessoa_cents);
    const exc5 = reaisLista(row.excursao_pessoa_5_cents);
    if (exc < 1 && pri < 1) continue;
    const partes = [exc, pri];
    if (exc5 > 0) partes.push(exc5);
    out.push({ nome: mapa[key] || TARIFARIO_CIDADES[key], codigo, detalhe: "(" + partes.join("/") + ")" });
  }
  return out;
}

function handleCmsAttractionsApi(urlPath, req, res) {
  if (urlPath !== "/api/admin/attractions.php" && urlPath !== "/api/admin/related-tours.php") return false;
  const url = new URL(req.url, "http://localhost:" + PORT);
  const send = (payload, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  };

  if (urlPath === "/api/admin/attractions.php" && req.method === "GET") {
    const id = parseInt(url.searchParams.get("id") || "0", 10);
    if (id > 0) {
      const row = MOCK_ATTRACTIONS.find((a) => a.id === id);
      if (!row) return send({ ok: false, error: "Atrativo não encontrado" }, 404), true;
      return send({ ok: true, data: { ...comTextoDaPagina(row), related_tours: mockRelatedFor(id) } }), true;
    }
    return send({
      ok: true,
      data: {
        attractions: MOCK_ATTRACTIONS.map((a) => ({ ...a, saidas_lista: saidasParaLista(a) })),
      },
    }), true;
  }

  readJsonBody(req).then((body) => {
    if (urlPath === "/api/admin/attractions.php" && req.method === "PUT") {
      const row = MOCK_ATTRACTIONS.find((a) => a.id === parseInt(body.id, 10));
      if (!row) return send({ ok: false, error: "Atrativo não encontrado" }, 404);
      const jaPublicada = String(row.status || "") === "published";
      const statusPedido = String(body.status || row.status || "");
      const exigirAtivacao = body.exigir_ativacao === true || (!jaPublicada && statusPedido === "published");
      if (exigirAtivacao) {
        const faltasPut = faltasParaAtivarAtrativo({ ...body, status: statusPedido });
        if (faltasPut.length) return send({ ok: false, error: "Para ativar, preencha: " + faltasPut.join(", ") + "." }, 400);
      }
      aplicarFichaAtrativo(row, body);
      gravarTextoDaPagina(row);
      MOCK_RELATED.forEach(refreshRelatedDuration);
      return send({ ok: true, data: { ...row, related_tours: mockRelatedFor(row.id) } });
    }
    if (urlPath === "/api/admin/attractions.php" && req.method === "POST") {
      if (!String(body.title_pt || "").trim()) return send({ ok: false, error: "O nome da experiência é obrigatório." }, 400);
      const faltasPost = faltasParaAtivarAtrativo(body);
      if (faltasPost.length) return send({ ok: false, error: "Para ativar, preencha: " + faltasPost.join(", ") + "." }, 400);
      const row = {
        id: MOCK_ATTRACTIONS.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
        title_pt: "",
        slug: "",
        status: "draft",
        gallery: [],
        tarifario_id: null,
        tarifa_guia: "",
        tarifa_translado: "",
        duracao: {},
        tem_passeio: true,
      };
      aplicarFichaAtrativo(row, body);
      MOCK_ATTRACTIONS.push(row);
      return send({ ok: true, data: { ...row, related_tours: [] } });
    }
    if (urlPath === "/api/admin/related-tours.php" && req.method === "POST") {
      try {
        const tour = mockRelatedSave(body.attraction_ids);
        if (body.tarifa_guia != null || body.tarifa_translado != null) {
          aplicarParNasSaidas(tour, String(body.tarifa_guia || "").trim(), String(body.tarifa_translado || "").trim());
        }
        if (body.horas != null) {
          const raw = String(body.horas).trim();
          if (raw === "") {
            tour.duracao_manual = false;
            refreshRelatedDuration(tour);
          } else {
            const horas = Math.max(1, Math.min(24, parseInt(raw, 10) || 0));
            tour.duration_minutes = horas * 60;
            tour.duracao_manual = true;
          }
        }
        return send({ ok: true, data: presentRelated(tour) });
      } catch (err) {
        return send({ ok: false, error: err.message }, 400);
      }
    }
    if (urlPath === "/api/admin/related-tours.php" && req.method === "DELETE") {
      const id = parseInt(body.id, 10);
      const index = MOCK_RELATED.findIndex((row) => row.id === id);
      if (index >= 0) MOCK_RELATED.splice(index, 1);
      return send({ ok: true });
    }
    return send({ ok: false, error: "Método não permitido" }, 405);
  }).catch(() => send({ ok: false, error: "JSON inválido" }, 400));
  return true;
}
const MOCK_CITIES = [
  { id: 1, name: "Alto Paraíso de Goiás", status: "active" },
  { id: 2, name: "São Jorge", status: "active" },
  { id: 3, name: "Cavalcante", status: "active" },
  { id: 4, name: "Teresina de Goiás", status: "active" },
  { id: 5, name: "São João d'Aliança", status: "active" },
];

function handleCitiesApi(urlPath, req, res) {
  if (urlPath !== "/api/admin/cities.php" || req.method !== "GET") return false;
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: true, data: { cities: MOCK_CITIES } }));
  return true;
}

/** Muda o usuário mockado em runtime (login / Google). */
function setMockUser(next) {
  const copy = { ...(next || {}) };
  Object.keys(user).forEach((k) => {
    delete user[k];
  });
  Object.assign(user, copy);
}

let mockCmsGuides = [
  {
    user_id: 21,
    name: "Ana Guia",
    full_name: "Ana Guia",
    email: "ana@gcv.com",
    status: "active",
    approved_at: "2026-06-01 10:00:00",
    was_approved: true,
    profile_complete: true,
    needs_resubmit: 0,
    base_city_name: "Alto Paraíso de Goiás",
    pix_key: "ana@gcv.com",
    phone: "62999990001",
    phone_ddi: "+55",
  },
  {
    user_id: 22,
    name: "Bruno Guia",
    full_name: "Bruno Guia",
    email: "bruno@gcv.com",
    status: "pending",
    profile_complete: true,
    needs_resubmit: 0,
    was_approved: false,
    base_city_name: "São Jorge",
    pix_key: "",
    phone: "62999990002",
    phone_ddi: "+55",
  },
  {
    user_id: 23,
    name: "Carla Rascunho",
    full_name: "Carla Rascunho",
    email: "carla@gcv.com",
    status: "pending",
    profile_complete: false,
    needs_resubmit: 0,
    was_approved: false,
    base_city_name: "Cavalcante",
    pix_key: "",
    phone: "62999990003",
    phone_ddi: "+55",
  },
];

function handleCmsGuidesApi(urlPath, req, res) {
  if (urlPath !== "/api/admin/cms-guides.php") return false;
  if (req.method === "GET") {
    const id = parseInt(new URL(req.url, "http://localhost").searchParams.get("id") || "0", 10);
    if (id > 0) {
      const row = mockCmsGuides.find((g) => g.user_id === id);
      if (!row) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "Guia não encontrado" }));
        return true;
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, data: row }));
      return true;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ok: true,
      data: { guides: mockCmsGuides, blocked_emails: [], reject_reasons: [] },
    }));
    return true;
  }
  if (req.method === "DELETE") {
    readJsonBody(req)
      .then((body) => {
        const id = parseInt(body.id || body.user_id || "0", 10);
        const before = mockCmsGuides.length;
        mockCmsGuides = mockCmsGuides.filter((g) => g.user_id !== id);
        if (!id || mockCmsGuides.length === before) {
          res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "Guia não encontrado" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, data: { deleted: id } }));
      })
      .catch(() => {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "JSON inválido" }));
      });
    return true;
  }
  return false;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function pickUserByLogin(email, context) {
  const e = String(email || "").toLowerCase().trim();
  if (e.includes("admin") || e === "diegocsp82@gmail.com" || e === "diegonavi82@gmail.com") return MOCK_USERS.admin;
  if (e.includes("guia") || e.includes("guide") || context === "guide") {
    if (e.includes("pendente") || e.includes("pending")) return MOCK_USERS["guide-pending"];
    return MOCK_USERS.guide;
  }
  if (context === "admin") return MOCK_USERS.admin;
  return MOCK_USERS.client;
}

/** waiting = compra do site, saída ainda não lançada. accepted | declined depois do guia decidir. */
let mockGuideDecision = "waiting";

/** Reservas do site na agenda do guia (localhost). */
const mockSiteBookings = [
  {
    trip_id: 501,
    name: "Ana Souza",
    email: "ana.souza@email.com",
    phone: "62988887777",
    whatsapp: "https://wa.me/5562988887777",
    spots: 1,
    people: 1,
    status: "PAID",
    reservation_id: "GCV-PIX101",
    with_transport: false,
    attendance_status: "pending",
    payment_kind: "pix",
    total_cents: 23000,
    needs_confirm: false,
    guide_confirmed: true,
  },
  {
    trip_id: 502,
    name: "Carlos Lima",
    email: "carlos.lima@email.com",
    phone: "61977776666",
    whatsapp: "https://wa.me/5561977776666",
    spots: 1,
    people: 1,
    status: "AUTHORIZED",
    reservation_id: "GCV-CARD22",
    with_transport: false,
    attendance_status: "pending",
    payment_kind: "card",
    total_cents: 23000,
    needs_confirm: true,
    guide_confirmed: false,
  },
];

/** Segundo passeio novo do site, independente da decisão de Loquinhas. */
let mockValeDecision = "waiting";

/** Fila de guias ativos. Quem aceita uma substituição vai para o fim. */
let guideQueue = [
  { id: 2, nome: "Diego Guia", foto: "/assets/img/imagens/guia-diego-navi.webp", cidade: "Alto Paraíso de Goiás" },
  { id: 21, nome: "Ana Guia", foto: "", cidade: "Alto Paraíso de Goiás" },
  { id: 24, nome: "Martina Motlova", foto: "/assets/img/imagens/guia-martina-motlova.webp", cidade: "São Jorge" },
  { id: 25, nome: "Gyovanna Torres", foto: "/assets/img/imagens/guia-gyovanna-torres.webp", cidade: "Cavalcante" },
];
const tourOwner = { 101: 2, 202: 2, 88: 2 };
let substitutions = [];
let substitutionSeq = 1;

function mockDaysAhead(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Prazo do guia: saída menos 12 h (mesmo recorte de PAY_DECISION_HOURS). */
function mockConfirmDeadline(dateIso, time) {
  const [y, mo, da] = String(dateIso).split("-").map(Number);
  const parts = String(time || "08:00").slice(0, 5).split(":");
  const start = new Date(y, (mo || 1) - 1, da || 1, Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  const deadline = new Date(start.getTime() - 12 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const off = -deadline.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function mockAcceptedTour() {
  return {
    id: 88,
    date_iso: mockDaysAhead(4),
    departure_time: "08:00:00",
    attraction_title: "Trilha da Carioca",
    departure_city_name: "Alto Paraíso",
    price_cents: 18000,
    price_transport_cents: 26000,
    offer_transport: true,
    booked_people: 1,
    booked_people_transport: 2,
    quorum: 4,
    quorum_transport: 4,
    max_people: 8,
    max_people_transport: 4,
    walk_guide_seat_ok: true,
    status: "published",
    created_by_origin: "GUIDE",
    guide_launched: true,
    awaiting_guide: false,
    lifecycle: "em_formacao",
    lifecycle_label: "Em formação",
    can_cancel: true,
    clients: [
      {
        name: "Marina Costa",
        email: "marina.costa@email.com",
        phone: "62911112222",
        whatsapp: "https://wa.me/5562911112222",
        spots: 1,
        people: 1,
        status: "PAID",
        reservation_id: "GCV-PIX88",
        with_transport: false,
        attendance_status: "pending",
        payment_kind: "pix",
        total_cents: 18000,
        guide_confirmed: true,
      },
      {
        name: "Rafael Dias",
        email: "rafael.dias@email.com",
        phone: "62922223333",
        whatsapp: "https://wa.me/5562922223333",
        spots: 2,
        people: 2,
        status: "PAID",
        reservation_id: "GCV-PIX89",
        with_transport: true,
        attendance_status: "pending",
        payment_kind: "pix",
        total_cents: 52000,
        guide_confirmed: true,
      },
    ],
    clients_count: 2,
    pending_requests: 0,
  };
}

function mockValeTour() {
  if (mockValeDecision === "declined") return null;
  const waiting = mockValeDecision === "waiting";
  const dateIso = mockDaysAhead(8);
  return {
    id: 202,
    date_iso: dateIso,
    departure_time: "14:00:00",
    confirm_deadline: waiting ? mockConfirmDeadline(dateIso, "14:00:00") : null,
    decision_hours: 12,
    attraction_title: "Vale da Lua",
    departure_city_name: "São Jorge",
    price_cents: 22000,
    booked_people: 1,
    quorum: 4,
    max_people: 8,
    status: "published",
    created_by_origin: "ADMIN",
    guide_launched: false,
    awaiting_guide: waiting,
    lifecycle: "em_formacao",
    lifecycle_label: "Em formação",
    can_cancel: true,
    clients: [
      {
        name: "Paulo Nunes",
        email: "paulo.nunes@email.com",
        phone: "61933334444",
        whatsapp: "https://wa.me/5561933334444",
        spots: 1,
        people: 1,
        status: "AUTHORIZED",
        reservation_id: "GCV-CARD202",
        with_transport: false,
        attendance_status: "pending",
        payment_kind: "stripe",
        total_cents: 22000,
        guide_confirmed: !waiting,
      },
    ],
    clients_count: 1,
    pending_requests: waiting ? 1 : 0,
  };
}

const mockInboxItems = [
  {
    id: 1,
    title: "Nova inscrição",
    body: "Nova inscrição\n\nDestino: Loquinhas + Cristais\nPessoas nesta inscrição: 1 pessoa\n\nA reserva está na sua Agenda do painel.",
    kind: "new_booking",
    excursion_id: 101,
    sale_id: 1,
    unread: true,
    created_at: "2026-10-07 06:40:00",
  },
  {
    id: 2,
    title: "Nova inscrição",
    body: "Nova inscrição\n\nDestino: Loquinhas + Cristais\nPessoas nesta inscrição: 1 pessoa\nPagamento: cartão reservado\n\nA reserva está na sua Agenda do painel. Confirme para cobrar.",
    kind: "new_booking",
    excursion_id: 101,
    sale_id: 2,
    unread: true,
    created_at: "2026-10-07 06:48:00",
  },
];

function mockGuideById(id) {
  return guideQueue.find((g) => g.id === Number(id)) || null;
}

function mockQueuePublic() {
  return guideQueue.map((g, i) => ({ id: g.id, nome: g.nome, foto: g.foto, cidade: g.cidade, posicao: i + 1 }));
}

function mockMoveGuideToEnd(id) {
  const at = guideQueue.findIndex((g) => g.id === Number(id));
  if (at < 0) return 0;
  const [row] = guideQueue.splice(at, 1);
  guideQueue.push(row);
  return guideQueue.length;
}

function mockAllAgendaTours() {
  return [mockAgendaExcursion(), mockValeTour(), mockAcceptedTour()].filter(Boolean);
}

function mockGuideBusy(guideId, tour) {
  return mockAllAgendaTours().some((row) => {
    if (row.id === tour.id) return false;
    if ((tourOwner[row.id] || 2) !== guideId) return false;
    return row.date_iso === tour.date_iso && String(row.departure_time || "").slice(0, 5) === String(tour.departure_time || "").slice(0, 5);
  });
}

function mockAvailableGuides(tour, fromId) {
  return mockQueuePublic().filter((g) => g.id !== fromId && !mockGuideBusy(g.id, tour));
}

function mockGuideExcursionsFor(guideId) {
  const all = mockAllAgendaTours();
  const mine = [];
  const incoming = [];
  all.forEach((row) => {
    const owner = tourOwner[row.id] || 2;
    const copy = { ...row, clients: (row.clients || []).map((client) => ({ ...client })), guide_id: owner };
    if (copy.awaiting_guide) copy.clients = [];
    copy.can_substitute = owner === guideId && !copy.awaiting_guide && copy.can_cancel !== false;
    const pending = substitutions.find((s) => s.excursion_id === row.id && s.status === "pending" && s.from_user_id === owner);
    if (pending && owner === guideId) {
      const alvo = mockGuideById(pending.to_user_id);
      copy.substitution_to_name = alvo ? alvo.nome : "outro guia";
      copy.substitution_to_id = pending.to_user_id;
      copy.substitution_offer_out = pending.id;
    }
    if (owner === guideId) mine.push(copy);
  });
  substitutions.filter((s) => s.status === "pending" && s.to_user_id === guideId).forEach((s) => {
    const row = all.find((t) => t.id === s.excursion_id);
    if (!row) return;
    const from = mockGuideById(s.from_user_id);
    incoming.push({
      ...row,
      clients: [],
      awaiting_guide: true,
      can_substitute: false,
      can_cancel: false,
      guide_id: guideId,
      substitution_offer_id: s.id,
      substitution_from_name: from ? from.nome : "Um guia",
    });
  });
  const posicao = mockQueuePublic().find((g) => g.id === guideId);
  return {
    upcoming: incoming.concat(mine),
    fila_posicao: posicao ? posicao.posicao : 0,
    fila_total: guideQueue.length,
  };
}

function mockCurrentGuide(req) {
  try {
    const as = new URL(req.url, "http://localhost").searchParams.get("as");
    if (as && MOCK_USERS[as] && MOCK_USERS[as].role === "guide") return MOCK_USERS[as];
  } catch (err) {}
  if (user.role === "guide") return user;
  return MOCK_USERS.guide;
}

function mockSubstitutionApi(req, res) {
  const guide = mockCurrentGuide(req);
  const send = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "GET") {
    const id = parseInt(new URL(req.url, "http://localhost").searchParams.get("excursion_id") || "0", 10);
    if (!id) {
      send(200, { ok: true, data: { posicao: mockGuideExcursionsFor(guide.id).fila_posicao, fila: mockQueuePublic() } });
      return;
    }
    const tour = mockAllAgendaTours().find((row) => row.id === id);
    const owner = tour ? (tourOwner[tour.id] || 2) : 0;
    if (!tour || owner !== guide.id) {
      send(404, { ok: false, error: "Passeio não encontrado" });
      return;
    }
    const pending = substitutions.find((s) => s.excursion_id === id && s.status === "pending" && s.from_user_id === guide.id);
    const alvo = pending ? mockGuideById(pending.to_user_id) : null;
    send(200, {
      ok: true,
      data: {
        excursion_id: id,
        title: tour.attraction_title,
        pending: pending ? { id: pending.id, to_id: pending.to_user_id, to_nome: alvo ? alvo.nome : "" } : null,
        guias: mockAvailableGuides(tour, guide.id),
      },
    });
    return;
  }
  if (req.method !== "POST") {
    send(405, { ok: false, error: "Método não permitido" });
    return;
  }
  readJsonBody(req).then((body) => {
    const action = String(body.action || "");
    if (action === "offer") {
      const excursionId = parseInt(body.excursion_id || "0", 10);
      const toId = parseInt(body.to_user_id || "0", 10);
      const tour = mockAllAgendaTours().find((row) => row.id === excursionId);
      const owner = tour ? (tourOwner[tour.id] || 2) : 0;
      if (!tour || owner !== guide.id || tour.awaiting_guide) {
        send(404, { ok: false, error: "Este passeio não pode ser passado agora" });
        return;
      }
      if (substitutions.some((s) => s.excursion_id === excursionId && s.status === "pending")) {
        send(409, { ok: false, error: "Já existe um pedido de substituição aguardando aceite" });
        return;
      }
      const alvo = mockAvailableGuides(tour, guide.id).find((g) => g.id === toId);
      if (!alvo) {
        send(422, { ok: false, error: "Este guia não está disponível para esta saída" });
        return;
      }
      const offer = { id: substitutionSeq++, excursion_id: excursionId, from_user_id: guide.id, to_user_id: toId, status: "pending" };
      substitutions.push(offer);
      send(200, { ok: true, data: { id: offer.id, message: "Pedido enviado para " + alvo.nome + ". O passeio continua com você até o aceite." } });
      return;
    }
    if (action === "cancel") {
      const offer = substitutions.find((s) => s.id === parseInt(body.id || "0", 10) && s.status === "pending" && s.from_user_id === guide.id);
      if (!offer) {
        send(404, { ok: false, error: "Pedido não encontrado" });
        return;
      }
      offer.status = "cancelled";
      send(200, { ok: true, data: { message: "Pedido cancelado." } });
      return;
    }
    if (action === "accept" || action === "decline") {
      const offer = substitutions.find((s) => s.id === parseInt(body.id || "0", 10) && s.status === "pending" && s.to_user_id === guide.id);
      if (!offer) {
        send(404, { ok: false, error: "Este pedido não está aguardando você" });
        return;
      }
      if (action === "decline") {
        offer.status = "declined";
        send(200, { ok: true, data: { message: "Você recusou o passeio. Sua posição na fila não mudou." } });
        return;
      }
      const tour = mockAllAgendaTours().find((row) => row.id === offer.excursion_id);
      if (tour && mockGuideBusy(guide.id, tour)) {
        send(409, { ok: false, error: "Você já tem uma saída neste horário" });
        return;
      }
      offer.status = "accepted";
      substitutions.forEach((s) => {
        if (s.excursion_id === offer.excursion_id && s.status === "pending") s.status = "declined";
      });
      tourOwner[offer.excursion_id] = guide.id;
      const posicao = mockMoveGuideToEnd(guide.id);
      const title = tour ? tour.attraction_title : "o passeio";
      send(200, { ok: true, data: { posicao, message: "Você assumiu " + title + " e foi para o fim da fila (" + posicao + "º)." } });
      return;
    }
    send(422, { ok: false, error: "Ação inválida" });
  }).catch(() => send(400, { ok: false, error: "JSON inválido" }));
}

function mockInboxPayload() {
  const unread = mockInboxItems.filter((item) => item.unread).length;
  const agendaUnread = mockInboxItems.filter((item) => item.unread && item.kind === "new_booking").length;
  return {
    unread,
    agenda_unread: agendaUnread,
    items: mockInboxItems.map((item) => ({ ...item })),
  };
}

function mockAgendaExcursion() {
  if (mockGuideDecision === "declined") return null;
  const waiting = mockGuideDecision === "waiting";
  const dateIso = mockDaysAhead(1);
  const clients = mockSiteBookings.map((row) => ({
    ...row,
    needs_confirm: false,
    guide_confirmed: !waiting,
  }));
  return {
    id: 101,
    date_iso: dateIso,
    departure_time: "09:00:00",
    confirm_deadline: waiting ? mockConfirmDeadline(dateIso, "09:00:00") : null,
    decision_hours: 12,
    attraction_title: "Loquinhas + Cristais",
    departure_city_name: "Alto Paraíso",
    price_cents: 23000,
    booked_people: 2,
    quorum: 4,
    max_people: 10,
    status: "published",
    created_by_origin: "ADMIN",
    guide_launched: false,
    awaiting_guide: waiting,
    lifecycle: "em_formacao",
    lifecycle_label: "Em formação",
    can_cancel: true,
    clients,
    clients_count: clients.length,
    pending_requests: waiting ? 1 : 0,
  };
}

/** Respostas mock da API */
const API_ROUTES = {
  "/api/auth/me.php": () => ({
    ok: true,
    data: Object.assign({}, user, {
      profile_complete: user.status === "pending" ? false : true,
    }),
  }),

  "/api/guides/tours.php": () => ({
    ok: true,
    data: {
      tours: [
        { id: 1, title: "Trilha da Carioca", description: "Cachoeiras e cerrado", price_cents: 18000, max_participants: 10, status: "active", category: "hiking", date: "2026-07-15", spots_left: 4 },
        { id: 2, title: "Vale da Lua Noturno", description: "Formações rochosas únicas", price_cents: 22000, max_participants: 8, status: "pending", category: "night", date: "2026-08-03", spots_left: 8 },
      ],
    },
  }),

  "/api/guides/profile.php": () => ({
    ok: true,
    data: {
      id: user.id,
      name: user.name,
      bio: "Guia credenciado com experiência na Chapada dos Veadeiros.",
      phone: "(21) 99603-9027",
      pix_key: "diegonavi82@gmail.com",
      pix_key_type: "email",
      pix_verified_at: "2026-07-01 12:00:00",
      status: user.status,
    },
  }),

  "/api/guides/me-profile.php": () => {
    const pending = user.status === "pending";
    return {
      ok: true,
      data: {
        profile: {
          user_id: user.id,
          user_status: user.status,
          full_name: user.name,
          nickname: pending ? "" : "Navi",
          email: user.email,
          cpf: pending ? "" : "52998224725",
          person_type: "PF",
          pix_key: pending ? "" : "diegonavi82@gmail.com",
          pix_key_type: pending ? "" : "email",
          phone: pending ? "" : "21996039027",
          phone_ddi: "+55",
          birth_date: pending ? "" : "1982-01-15",
          base_city_id: pending ? 0 : 1,
          id_document_url: pending ? "" : "/assets/img/uploads/guias/doc.pdf",
          photo_3x4_url: pending ? "" : "/assets/img/uploads/guias/foto.jpg",
          bio_pt: pending ? "" : "Guia local na Chapada dos Veadeiros.",
          profile_complete: pending ? 0 : 1,
        },
        financial: pending
          ? { legal_name: "", person_type: "PF", cpf: "", pix_key: "", pix_key_type: "" }
          : {
              legal_name: user.name,
              person_type: "PF",
              cpf: "52998224725",
              pix_key: "diegonavi82@gmail.com",
              pix_key_type: "email",
            },
        missing: pending
          ? ["photo_3x4_url", "phone", "birth_date", "base_city_id", "legal_name", "cpf_cnpj", "pix_key"]
          : [],
        complete: !pending,
        financial_ready: !pending,
        limits: { bio_max: 800, bio_recommended: 600 },
        pix_key_types: ["cpf", "cnpj", "email", "phone", "random"],
        base_cities: [
          { id: 1, name: "Alto Paraíso de Goiás" },
          { id: 2, name: "São Jorge" },
          { id: 3, name: "Cavalcante" },
        ],
      },
    };
  },

  "/api/guides/excursions.php": () => {
    const packed = mockGuideExcursionsFor(user.role === "guide" ? user.id : 2);
    const upcoming = packed.upcoming;
    return {
      ok: true,
      data: {
        profile_complete: true,
        min_quorum: 4,
        attractions: MOCK_ATTRACTIONS,
        cities: MOCK_CITIES,
        fila_posicao: packed.fila_posicao,
        fila_total: packed.fila_total,
        upcoming,
        excursions: upcoming.map((row) => Object.assign({}, row, { clients: (row.clients || []).map((client) => ({ ...client })) })),
      },
    };
  },

  "/api/bookings/my.php": () => ({
    ok: true,
    data: {
      upcoming: [
        {
          id: 1,
          tour_title: "Trilha da Carioca",
          departure_date: "2026-07-20",
          departure_time: "08:00:00",
          guide_name: "Diego Guia",
          spots: 2,
          total_cents: 36000,
          status: "paid",
          lifecycle: "em_formacao",
          lifecycle_label: "Em formação",
          can_cancel: true,
          cancel_no_refund: false,
        },
      ],
      bookings: [
        {
          id: 1,
          tour_title: "Trilha da Carioca",
          departure_date: "2026-07-20",
          spots: 2,
          total_cents: 36000,
          status: "paid",
          lifecycle: "em_formacao",
          lifecycle_label: "Em formação",
          can_cancel: true,
          cancel_no_refund: false,
        },
      ],
    },
  }),

  "/api/client/profile.php": () => ({
    ok: true,
    data: {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: "62999998888",
        phone_ddi: "+55",
        cpf: "",
        birth_date: "",
      },
      limits: { name_max: 120, phone_max: 20, notes_max: 500 },
    },
  }),

  "/api/client/excursions.php": () => ({
    ok: true,
    data: {
      min_quorum: 4,
      attractions: MOCK_ATTRACTIONS,
      cities: MOCK_CITIES,
      my_proposals: [],
    },
  }),

  "/api/bookings/list.php": () => ({
    ok: true,
    data: {
      bookings: [
        { id: 1, tour_title: "Trilha da Carioca", date: "2026-07-15", participants: 2, total_cents: 36000, status: "confirmed", client_name: "Maria S." },
        { id: 2, tour_title: "Vale da Lua Noturno", date: "2026-08-03", participants: 1, total_cents: 22000, status: "pending", client_name: "Carlos P." },
      ],
    },
  }),

  "/api/admin/pending-guides.php": () => ({
    ok: true,
    data: { guides: [{ id: 10, name: "Ana Guia", email: "ana@gcv.com", created_at: "2026-06-01" }] },
  }),

  "/api/admin/pending-tours.php": () => ({
    ok: true,
    data: { tours: [{ id: 5, title: "Chapada Noturna", guide_name: "Ana Guia", price_cents: 25000, created_at: "2026-06-10" }] },
  }),

  "/api/admin/all-bookings.php": () => ({
    ok: true,
    data: { bookings: [] },
  }),

  "/api/admin/settings.php": () => ({
    ok: true,
    data: {
      settings: [
        { key_name: "diaria_minima_reais", value: "320", label: "Diária mínima do cliente no exclusivo e no fechamento da excursão (R$)", type: "integer" },
        { key_name: "pg_minimo_guia_reais", value: "280", label: "Pagamento mínimo do guia sem transporte (R$)", type: "integer" },
        { key_name: "pausa_convite_inicio_hora", value: "22", label: "Convite ao guia: o relógio para a partir desta hora", type: "integer" },
        { key_name: "pausa_convite_fim_hora", value: "8", label: "Convite ao guia: o relógio volta nesta hora", type: "integer" },
        { key_name: "tarifa_ia_ativa", value: "0", label: "Tarifa inteligência artificial progressiva: 0 inativa, 1 ativa", type: "integer" },
        { key_name: "tarifa_ia_passo_pct", value: "2", label: "Passo da tarifa progressiva (%)", type: "percent" },
        { key_name: "platform_commission_pct", value: "10", label: "Comissão da plataforma no passeio do guia (%)", type: "percent" },
        { key_name: "payout_after_hour", value: "16", label: "Hora (Brasília) do PIX automático ao guia", type: "integer" },
        { key_name: "payout_after_minute", value: "20", label: "Minuto (Brasília) do PIX automático ao guia", type: "integer" },
      ],
    },
  }),

  "/api/admin/financials.php": () => ({
    ok: true,
    data: { total_revenue_cents: 150000, pending_payout_cents: 45000, total_bookings: 12 },
  }),

  "/api/excursions/carousel.php": () => {
    if (!flagOn("PASSEIOS_PUBLICOS") && !adminPreviewCookie) {
      return { ok: true, data: { pt: [], en: [], es: [], oculto: true } };
    }
    const guia = {
      guiaNome: "Diego Navi",
      guiaFoto: "/assets/img/imagens/guia-diego-navi.webp",
      guiaIdiomas: ["pt", "en", "es"],
    };
    const courosWalk = {
      dayNum: "19",
      monthName: "setembro",
      weekday: "Sábado",
      dateISO: "2026-09-19",
      embarque: "Alto Paraíso",
      destino: "Cataratas dos Couros",
      destinos: [
        {
          destino: "Cataratas dos Couros",
          cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
          atrativoPath: "atrativos/cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso.html",
        },
      ],
      hora: "8:45",
      valor: 140,
      confirmada: false,
      quorumMin: 3,
      faltamPessoas: 2,
      pessoasInscritas: 1,
      grupoMaximo: 10,
      vagasRestantes: 9,
      cartSlug: "mock-couros-2026-09-19-0845",
      cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
      atrativoPath: "atrativos/cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso.html",
      ...guia,
    };
    const caracolSemGuia = {
      dayNum: "19",
      monthName: "setembro",
      weekday: "Sábado",
      dateISO: "2026-09-19",
      embarque: "Alto Paraíso",
      destino: "Caracol",
      destinos: [
        {
          destino: "Caracol",
          cardImg: "/assets/img/imagens/cachoeira-caracol-guia-chapada-veadeiros-alto-paraiso.webp",
          atrativoPath: "atrativos/caracol-guia-chapada-veadeiros.html",
        },
      ],
      hora: "10:00",
      valor: 150,
      confirmada: false,
      quorumMin: 4,
      faltamPessoas: 4,
      pessoasInscritas: 0,
      grupoMaximo: 10,
      vagasRestantes: 10,
      cartSlug: "mock-caracol-sem-guia-2026-09-19",
      cardImg: "/assets/img/imagens/cachoeira-caracol-guia-chapada-veadeiros-alto-paraiso.webp",
      atrativoPath: "atrativos/caracol-guia-chapada-veadeiros.html",
    };
    const dragaoConfirmada = {
      dayNum: "19",
      monthName: "setembro",
      weekday: "Sábado",
      dateISO: "2026-09-19",
      embarque: "Alto Paraíso",
      destino: "Cachoeira do Dragão",
      destinos: [
        {
          destino: "Cachoeira do Dragão",
          cardImg: "/assets/img/imagens/cachoeira-dragao-guia-chapada-veadeiros-alto-paraiso.webp",
          atrativoPath: "",
        },
      ],
      hora: "7:30",
      valor: 160,
      confirmada: true,
      quorumMin: 4,
      faltamPessoas: 0,
      pessoasInscritas: 6,
      grupoMaximo: 10,
      vagasRestantes: 4,
      cartSlug: "mock-dragao-confirmada-2026-09-19",
      cardImg: "/assets/img/imagens/cachoeira-dragao-guia-chapada-veadeiros-alto-paraiso.webp",
      atrativoPath: "",
      ...guia,
    };
    const aguasConfirmada = {
      dayNum: "20",
      monthName: "setembro",
      weekday: "Domingo",
      dateISO: "2026-09-20",
      embarque: "Alto Paraíso",
      destino: "Águas Lindas",
      destinos: [
        {
          destino: "Águas Lindas",
          cardImg: "/assets/img/imagens/aguas-lindas-canjica-guia-chapada-veadeiros-alto-paraiso.webp",
          atrativoPath: "",
        },
      ],
      hora: "8:15",
      valor: 150,
      confirmada: true,
      quorumMin: 4,
      faltamPessoas: 0,
      pessoasInscritas: 5,
      grupoMaximo: 10,
      vagasRestantes: 5,
      cartSlug: "mock-aguas-lindas-confirmada-2026-09-20",
      cardImg: "/assets/img/imagens/aguas-lindas-canjica-guia-chapada-veadeiros-alto-paraiso.webp",
      atrativoPath: "",
      ...guia,
    };
    const sbBase = {
      dayNum: "20",
      monthName: "setembro",
      weekday: "Domingo",
      dateISO: "2026-09-20",
      embarque: "Cavalcante",
      destino: "Santa Bárbara",
      destinos: [
        {
          destino: "Santa Bárbara",
          cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
          atrativoPath: "atrativos/cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante.html",
        },
      ],
      hora: "9:00",
      cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
      atrativoPath: "atrativos/cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante.html",
      ...guia,
    };
    const sbWalk = {
      ...sbBase,
      valor: 160,
      confirmada: false,
      quorumMin: 4,
      faltamPessoas: 3,
      pessoasInscritas: 1,
      grupoMaximo: 10,
      vagasRestantes: 7,
      cartSlug: "mock-santa-barbara-2026-09-20-0900",
    };
    const sbVan = {
      ...sbBase,
      valor: 420,
      comTransporte: true,
      confirmada: false,
      quorumMin: 3,
      faltamPessoas: 1,
      pessoasInscritas: 2,
      grupoMaximo: 4,
      vagasRestantes: 2,
      cartSlug: "mock-santa-barbara-2026-09-20-0900-t",
    };
    const valeVanOnly = {
      dayNum: "21",
      monthName: "setembro",
      weekday: "Segunda-feira",
      dateISO: "2026-09-21",
      embarque: "São Jorge",
      destino: "Vale da Lua",
      destinos: [
        {
          destino: "Vale da Lua",
          cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
          atrativoPath: "atrativos/vale-lua-guia-chapada-veadeiros-sao-jorge.html",
        },
      ],
      hora: "8:00",
      valor: 390,
      comTransporte: true,
      confirmada: true,
      quorumMin: 2,
      faltamPessoas: 0,
      pessoasInscritas: 3,
      grupoMaximo: 4,
      vagasRestantes: 1,
      cartSlug: "mock-vale-lua-2026-09-21-0800-t",
      cardImg: "/assets/img/imagens/cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp",
      atrativoPath: "atrativos/vale-lua-guia-chapada-veadeiros-sao-jorge.html",
      ...guia,
    };
    const pratinhaWalk = {
      dayNum: "22",
      monthName: "setembro",
      weekday: "Terça-feira",
      dateISO: "2026-09-22",
      embarque: "Alto Paraíso",
      destino: "Pratinha",
      destinos: [{ destino: "Pratinha", cardImg: "", atrativoPath: "" }],
      hora: "9:00",
      valor: 130,
      confirmada: true,
      quorumMin: 2,
      faltamPessoas: 0,
      pessoasInscritas: 2,
      grupoMaximo: 10,
      vagasRestantes: 8,
      cartSlug: "mock-pratinha-2026-09-22-0900",
      cardImg: "",
      atrativoPath: "",
      ...guia,
    };
    const localize = (row, month, weekday) => ({ ...row, monthName: month, weekday });
    const pt = [dragaoConfirmada, courosWalk, caracolSemGuia, aguasConfirmada, sbWalk, sbVan, valeVanOnly, pratinhaWalk];
    return devShiftCarousel({
      ok: true,
      data: {
        pt,
        en: pt.map((row) =>
          localize(
            row,
            row.dateISO === "2026-09-19"
              ? "September"
              : row.dateISO === "2026-09-20"
                ? "September"
                : row.dateISO === "2026-09-21"
                  ? "September"
                  : "September",
            row.dateISO === "2026-09-19"
              ? "Saturday"
              : row.dateISO === "2026-09-20"
                ? "Sunday"
                : row.dateISO === "2026-09-21"
                  ? "Monday"
                  : "Tuesday",
          ),
        ),
        es: pt.map((row) =>
          localize(
            row,
            "septiembre",
            row.dateISO === "2026-09-19"
              ? "Sábado"
              : row.dateISO === "2026-09-20"
                ? "Domingo"
                : row.dateISO === "2026-09-21"
                  ? "Lunes"
                  : "Martes",
          ),
        ),
      },
    });
  },

  "/api/tours/list.php": () => {
    if (!flagOn("PASSEIOS_PUBLICOS") && !adminPreviewCookie) {
      return { ok: true, data: { tours: [], total: 0, oculto: true } };
    }
    return {
    ok: true,
    data: {
      tours: [
        { id: 1, title: "Trilha da Carioca", description: "Cachoeiras e cerrado", price_cents: 18000, max_participants: 10, status: "active", category: "hiking", date: "2026-07-15", spots_left: 4, guide_name: "Diego Guia" },
      ],
    },
    };
  },
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (ext === ".html" || ext === ".js" || ext === ".css") headers["Cache-Control"] = "no-cache";
    res.writeHead(200, headers);
    if (ext === ".html") {
      let html = data.toString("utf8")
        .replace(/site\.js\?v=[^"'&\s]+/g, "site.js?v=1.1.85")
        .replace(/gcv-exc-cart-policies\.js\?v=[^"'&\s]+/g, "gcv-exc-cart-policies.js?v=1.1.61")
        .replace(/gcv-exc-cart\.js\?v=[^"'&\s]+/g, "gcv-exc-cart.js?v=1.1.62")
        .replace(/excursoes-carousel\.js\?v=[^"'&\s]+/g, "excursoes-carousel.js?v=1.1.86")
        .replace(/excursoes\.css\?v=[^"'&\s]+/g, "excursoes.css?v=1.1.82")
        .replace(/gcv-confirmacao\.js\?v=[^"'&\s]+/g, "gcv-confirmacao.js?v=1.1.36")
        .replace(/gcv-detail\.css\?v=[^"'&\s]+/g, "gcv-detail.css?v=1.1.37")
        .replace(/gcv-passeios-shop\.js\?v=[^"'&\s]+/g, "gcv-passeios-shop.js?v=1.3.11")
        .replace(/gcv-datepicker\.js\?v=[^"'&\s]+/g, "gcv-datepicker.js?v=1.0.5");
      res.end(html);
      return;
    }
    res.end(data);
  });
}

/**
 * Dev: as saídas de exemplo têm datas fixas (set/2026). Se já passaram, empurra todas para
 * frente (a primeira fica daqui a 2 dias) para dar para testar reserva e pagamento no localhost.
 */
function devShiftCarousel(payload) {
  const rows = payload && payload.data && payload.data.pt;
  if (!Array.isArray(rows) || !rows.length) return payload;
  const first = rows.map((r) => r.dateISO).sort()[0];
  const today = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const target = new Date(Date.parse(today + "T12:00:00Z") + 2 * 86400000);
  const offsetDays = Math.round((target - Date.parse(first + "T12:00:00Z")) / 86400000);
  if (offsetDays <= 0) return payload;
  const names = {
    pt: { m: "long", w: "long", loc: "pt-BR" },
    en: { m: "long", w: "long", loc: "en-US" },
    es: { m: "long", w: "long", loc: "es-ES" },
  };
  const out = {};
  for (const lang of Object.keys(payload.data)) {
    out[lang] = payload.data[lang].map((row) => {
      const oldIso = row.dateISO;
      const d = new Date(Date.parse(oldIso + "T12:00:00Z") + offsetDays * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const n = names[lang] || names.pt;
      const weekday = d.toLocaleDateString(n.loc, { weekday: "long", timeZone: "UTC" });
      return {
        ...row,
        dateISO: iso,
        dayNum: String(d.getUTCDate()),
        monthName: d.toLocaleDateString(n.loc, { month: "long", timeZone: "UTC" }),
        weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
        cartSlug: row.cartSlug ? String(row.cartSlug).replace(oldIso, iso) : row.cartSlug,
      };
    });
  }
  return { ...payload, data: out };
}

const handlePaymentsApi = createPaymentsMock({
  ROOT,
  pixRead,
  pixWrite,
  readEnvValue,
  stripeApi,
  stripeLineItems,
  requestOrigin,
  safeReturnPath,
  confirmPathForLocale,
  onGuideExcursion(body) {
    const excursionId = parseInt(body.excursion_id || "0", 10);
    if (excursionId === 202) {
      if (mockValeDecision !== "waiting") {
        return { ok: false, error: "Este passeio não está aguardando a sua confirmação" };
      }
      mockValeDecision = body.action === "decline" ? "declined" : "accepted";
      return { ok: true, data: { result: mockValeDecision } };
    }
    if (excursionId !== 101 || mockGuideDecision !== "waiting") {
      return { ok: false, error: "Este passeio não está aguardando a sua confirmação" };
    }
    mockGuideDecision = body.action === "decline" ? "declined" : "accepted";
    mockSiteBookings.forEach((item) => {
      item.needs_confirm = false;
      item.guide_confirmed = mockGuideDecision === "accepted";
    });
    return { ok: true, data: { result: mockGuideDecision } };
  },
});

let anfitriaoApiRef = null;
function anfitriaoApi() {
  if (!anfitriaoApiRef) {
    anfitriaoApiRef = createAnfitriaoApi({
      getAttractions: () => MOCK_ATTRACTIONS,
      getGuides: () => mockCmsGuides,
      getUser: () => user,
      users: MOCK_USERS,
    });
  }
  return anfitriaoApiRef;
}

const server = http.createServer((req, res) => {
  adminPreviewCookie = hasAdminPreview(req);
  // Remove query string
  const urlPath = req.url.split("?")[0];

  // CORS para fetch local
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Mock API
  if (urlPath.startsWith("/api/")) {
    const jsonOk = (payload) => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
    };
    const MOCK_PLACES = [
      {
        place_id: "osm:node/centro-ap",
        description: "Centro de Alto Paraíso, Alto Paraíso de Goiás - GO",
        main_text: "Centro de Alto Paraíso",
        secondary_text: "Alto Paraíso de Goiás - GO",
        lat: -14.1328,
        lng: -47.51,
        maps_url: "https://www.google.com/maps?q=-14.1328,-47.51",
      },
      {
        place_id: "osm:node/padaria-sm",
        description: "Padaria Santa Maria, Alto Paraíso de Goiás - GO",
        main_text: "Padaria Santa Maria",
        secondary_text: "Alto Paraíso de Goiás - GO",
        lat: -14.1342,
        lng: -47.5118,
        maps_url: "https://www.google.com/maps?q=-14.1342,-47.5118",
      },
      {
        place_id: "osm:node/sao-jorge",
        description: "Vila de São Jorge, Alto Paraíso de Goiás - GO",
        main_text: "Vila de São Jorge",
        secondary_text: "Alto Paraíso de Goiás - GO",
        lat: -14.1835,
        lng: -47.809,
        maps_url: "https://www.google.com/maps?q=-14.1835,-47.809",
      },
    ];
    if (urlPath === "/api/places/autocomplete.php") {
      const u = new URL(req.url, "http://localhost:" + PORT);
      const q = String(u.searchParams.get("q") || "").trim().toLowerCase();
      const preds = MOCK_PLACES.filter((p) =>
        !q || p.description.toLowerCase().includes(q) || p.main_text.toLowerCase().includes(q)
      );
      jsonOk({ ok: true, data: { predictions: preds } });
      return;
    }
    if (urlPath === "/api/places/details.php") {
      const u = new URL(req.url, "http://localhost:" + PORT);
      const id = String(u.searchParams.get("place_id") || "");
      const found = MOCK_PLACES.find((p) => p.place_id === id) || MOCK_PLACES[0];
      jsonOk({
        ok: true,
        data: {
          place_id: found.place_id,
          name: found.main_text,
          formatted_address: found.description,
          label: found.main_text,
          lat: found.lat,
          lng: found.lng,
          maps_url: found.maps_url,
        },
      });
      return;
    }
    if (urlPath === "/api/places/reverse.php") {
      const u = new URL(req.url, "http://localhost:" + PORT);
      const lat = parseFloat(u.searchParams.get("lat") || "");
      const lng = parseFloat(u.searchParams.get("lng") || "");
      jsonOk({
        ok: true,
        data: {
          place_id: "osm:node/gps",
          name: "Minha localização",
          formatted_address: "Ponto atual (GPS)",
          label: "Minha localização",
          lat: Number.isFinite(lat) ? lat : -14.1328,
          lng: Number.isFinite(lng) ? lng : -47.51,
          maps_url: "https://www.google.com/maps?q=" + encodeURIComponent(
            (Number.isFinite(lat) ? lat : -14.1328) + "," + (Number.isFinite(lng) ? lng : -47.51)
          ),
        },
      });
      return;
    }

    // Login e-mail/senha (3 portas)
    if (urlPath === "/api/auth/login.php" && req.method === "POST") {
      readJsonBody(req)
        .then((data) => {
          const email = String(data.email || "").trim();
          const contextHint = email.toLowerCase().includes("admin")
            ? "admin"
            : email.toLowerCase().includes("guia")
              ? "guide"
              : "client";
          const next = pickUserByLogin(email, contextHint);
          setMockUser(next);
          console.log("[mock] login →", user.email, "(" + user.role + ")");
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": previewCookie(isPreviewAdmin(user)),
          });
          res.end(JSON.stringify({ ok: true, data: { ...user } }));
        })
        .catch(() => {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "JSON inválido" }));
        });
      return;
    }

    // Google OAuth mock: tela para escolher conta (não entra direto)
    if (urlPath === "/api/auth/google-redirect.php") {
      const u = new URL(req.url, "http://localhost:" + PORT);
      const context = String(u.searchParams.get("context") || "client").toLowerCase();
      const pick = String(u.searchParams.get("pick") || "").trim();

      const optionsByContext = {
        admin: [{ key: "admin", label: "Diego Navi (Admin)", email: MOCK_USERS.admin.email }],
        guide: [
          { key: "guide", label: "Diego Guia (ativo)", email: MOCK_USERS.guide.email },
          { key: "guide-ana", label: "Ana Guia", email: MOCK_USERS["guide-ana"].email },
          { key: "guide-martina", label: "Martina Motlova", email: MOCK_USERS["guide-martina"].email },
          { key: "guide-gyovanna", label: "Gyovanna Torres", email: MOCK_USERS["guide-gyovanna"].email },
          { key: "guide-pending", label: "João Pendente (aguardando)", email: MOCK_USERS["guide-pending"].email },
        ],
        client: [{ key: "client", label: "Maria Cliente", email: MOCK_USERS.client.email }],
      };
      const options = optionsByContext[context] || optionsByContext.client;

      if (pick && MOCK_USERS[pick]) {
        // Admin: só permite conta admin
        if (context === "admin" && MOCK_USERS[pick].role !== "admin") {
          res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<p>Esta porta é só para admin. <a href=\"/admin/login.html\">Voltar</a></p>");
          return;
        }
        // Guia: só guide
        if (context === "guide" && MOCK_USERS[pick].role !== "guide") {
          res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<p>Use a área do cliente para esta conta. <a href=\"/guia/login.html\">Voltar</a></p>");
          return;
        }
        // Cliente: só client
        if (context === "client" && MOCK_USERS[pick].role !== "client") {
          res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<p>Use a porta correta do perfil. <a href=\"/login.html\">Voltar</a></p>");
          return;
        }
        setMockUser(MOCK_USERS[pick]);
        console.log("[mock] Google pick →", user.email, "(" + user.role + ")");
        res.writeHead(302, {
          Location: "/dashboard/",
          "Set-Cookie": previewCookie(isPreviewAdmin(user)),
        });
        res.end();
        return;
      }

      const title =
        context === "admin" ? "Admin" : context === "guide" ? "Guia" : "Cliente";
      const buttons = options
        .map(
          (o) =>
            `<a class="acc" href="/api/auth/google-redirect.php?context=${encodeURIComponent(context)}&pick=${encodeURIComponent(o.key)}">` +
            `<strong>${o.label}</strong><span>${o.email}</span></a>`,
        )
        .join("");

      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Escolher conta Google (mock)</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,sans-serif;background:#0b2a20;color:#0f172a}
  .box{background:#fff;border-radius:14px;padding:1.5rem;width:min(420px,92vw);box-shadow:0 12px 40px rgba(0,0,0,.25)}
  h1{font-size:1.15rem;margin:0 0 .35rem}
  p{margin:0 0 1rem;color:#64748b;font-size:.9rem}
  .acc{display:block;border:1px solid #e2e8f0;border-radius:10px;padding:.85rem 1rem;margin:.5rem 0;
    text-decoration:none;color:inherit;transition:background .15s}
  .acc:hover{background:#f0fdf4;border-color:#86efac}
  .acc strong{display:block;font-size:.95rem}
  .acc span{font-size:.8rem;color:#64748b}
  .note{margin-top:1rem;font-size:.75rem;color:#94a3b8}
</style></head><body>
  <div class="box">
    <h1>Escolher conta Google</h1>
    <p>Mock local — área <strong>${title}</strong>. Em produção o Google mostra suas contas reais.</p>
    ${buttons}
    <p class="note">Simulação localhost · sem OAuth real</p>
  </div>
</body></html>`;

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (handleCmsGuidesApi(urlPath, req, res)) return;
    if (handleCitiesApi(urlPath, req, res)) return;
    if (handleTerapiaApi(urlPath, req, res)) return;
    if (handleCmsAttractionsApi(urlPath, req, res)) return;
    if (anfitriaoApi().handle(urlPath, req, res)) return;
    if (handleTarifarioApi(urlPath, req, res)) return;
    if (handleCupomApi(urlPath, req, res)) return;
    if (handleSettingsApi(urlPath, req, res)) return;
    if (urlPath === "/api/passeios.php" && req.method === "GET") {
      if (!flagOn("PASSEIOS_PUBLICOS") && !adminPreviewCookie) {
        const slugOff = new URL(req.url, "http://localhost:" + PORT).searchParams.get("slug") || "";
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(slugOff
          ? { ok: true, data: { tem_passeio: false, oculto: true } }
          : { ok: true, data: { tours: [], categories: {}, max_atrativos: 1, oculto: true } }));
        return;
      }
      const slug = new URL(req.url, "http://localhost:" + PORT).searchParams.get("slug") || "";
      if (!slug) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          data: {
            tours: passeioCatalog(),
            categories: PASSEIO_CATEGORIAS,
            max_atrativos: maxAtrativos(),
            preview: !flagOn("PASSEIOS_PUBLICOS") && adminPreviewCookie,
          },
        }));
        return;
      }
      const data = passeioPublicPayload(slug);
      res.writeHead(data ? 200 : 404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(data ? { ok: true, data } : { ok: false, error: "Atrativo não encontrado" }));
      return;
    }
    if (handlePaymentsApi(urlPath, req, res)) return;
    if (handleStripeApi(urlPath, req, res)) return;
    if (handlePixApi(urlPath, req, res)) return;
    if (handleWaitlistApi(urlPath, req, res)) return;

    // Mutações de perfil / agenda (mock)
    if (
      (urlPath === "/api/guides/me-profile.php" ||
        urlPath === "/api/client/profile.php" ||
        urlPath === "/api/guides/excursions.php" ||
        urlPath === "/api/client/excursions.php" ||
        urlPath === "/api/bookings/cancel.php") &&
      (req.method === "POST" || req.method === "PUT")
    ) {
      readJsonBody(req)
        .then((data) => {
          console.log("[mock]", req.method, urlPath, data || {});
          if (urlPath === "/api/guides/excursions.php" || urlPath === "/api/client/excursions.php") {
            const recusa = anfitriaoApi().recusaExcursao(data || {});
            if (recusa) {
              res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: recusa }));
              return;
            }
          }
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(
            JSON.stringify({
              ok: true,
              data: {
                message:
                  urlPath.indexOf("cancel") >= 0
                    ? "Reserva/passeio cancelado (mock)"
                    : urlPath.indexOf("me-profile") >= 0 && user.status === "pending"
                      ? "Cadastro enviado para aprovação"
                      : "Salvo (mock)",
                complete: true,
                submitted_for_approval: urlPath.indexOf("me-profile") >= 0 && user.status === "pending",
              },
            }),
          );
        })
        .catch(() => {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "JSON inválido" }));
        });
      return;
    }

    if (urlPath === "/api/excursao-receipt/" || urlPath === "/api/excursao-receipt/index.php") {
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const data = JSON.parse(body || "{}");
            const email = String(data.email || "").trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, message: "Invalid email" }));
              return;
            }
            console.log("[mock] Recibo Pix enviado para:", email, "| código:", data.code || "—");
            sendDevMail({
              to: email,
              subject: "Recibo Pix — " + (data.code || "Guia Chapada Veadeiros"),
              html:
                "<p>Recibo da reserva <strong>" +
                String(data.code || "").replace(/</g, "") +
                "</strong>.</p><p><em>(Mock localhost — conteúdo completo do recibo HTML omitido.)</em></p>",
            })
              .then(function (mail) {
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(
                  JSON.stringify({
                    ok: true,
                    message: "Sent (mock)",
                    code: data.code || "",
                    dev: mail && mail.via === "outbox" ? { outbox: true, file: mail.file } : undefined,
                  }),
                );
              })
              .catch(function () {
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ ok: true, message: "Sent (mock)", code: data.code || "" }));
              });
            return;
          } catch (err) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, message: "Invalid JSON" }));
          }
        });
        return;
      }
    }
    if (urlPath === "/api/admin/broadcast.php") {
      const mediaLimits = {
        image: 16 * 1024 * 1024,
        video: 16 * 1024 * 1024,
        audio: 16 * 1024 * 1024,
        document: 100 * 1024 * 1024,
      };
      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          data: {
            sender: {
              phone: "5562982506891",
              phone_display: "+55 62 98250-6891",
              label: "WhatsApp da agência (servidor HPS)",
              ready: true,
            },
            guides: [
              { user_id: 2, name: "Diego Navi Marques Carvalho", phone_display: "+55 21 99903-0027", can_send: true },
              { user_id: 3, name: "Felipe Camargo", phone_display: "+55 61 99999-2236", can_send: true },
              { user_id: 4, name: "Sem WhatsApp", phone_display: "", can_send: false },
            ],
            ready_count: 2,
            media: Object.assign({}, mediaLimits, { whatsapp: mediaLimits, server_capped: false }),
          },
        }));
        return;
      }
      if (req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          data: {
            scope: "all",
            sent: 1,
            failed: 0,
            skipped: 0,
            total: 1,
            attachment: "",
            results: [{ name: "Diego Navi Marques Carvalho", phone_display: "+55 21 99903-0027", status: "sent" }],
          },
        }));
        return;
      }
    }

    if (urlPath === "/api/inbox/list.php" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, data: mockInboxPayload() }));
      return;
    }
    if (urlPath === "/api/inbox/read.php" && req.method === "POST") {
      readJsonBody(req)
        .then((body) => {
          const kind = String(body.kind || "");
          const id = parseInt(body.id || "0", 10);
          mockInboxItems.forEach((item) => {
            if (body.all) item.unread = false;
            else if (kind && item.kind === kind) item.unread = false;
            else if (id && item.id === id) item.unread = false;
          });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, data: { marked: 1, ...mockInboxPayload() } }));
        })
        .catch(() => {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "JSON inválido" }));
        });
      return;
    }
    if (urlPath === "/api/guides/check-in.php" && req.method === "POST") {
      readJsonBody(req)
        .then((body) => {
          const raw = String(body.reservation_id || body.qr_text || body.code || "").toUpperCase();
          const match = raw.match(/GCV-[A-Z0-9]{6}/);
          if (!match) {
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "QR / código da reserva inválido" }));
            return;
          }
          const code = match[0];
          const already = code === "GCV-JAFEITO";
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            ok: true,
            data: {
              already,
              reservation_id: code,
              tourist_name: "Ana Souza",
              spots: 2,
              attendance_status: "checked_in",
              guide_whatsapp: !already,
              message: already
                ? "Check-in já estava confirmado. Bom passeio!"
                : "Check-in foi confirmado. Bom passeio!",
            },
          }));
        })
        .catch(() => {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "JSON inválido" }));
        });
      return;
    }

    if (urlPath === "/api/guides/booking-confirmations.php") {
      if (req.method === "GET") {
        const rows = mockSiteBookings
          .filter((row) => row.needs_confirm || row.payment_kind === "card")
          .map((row) => ({
            id: row.trip_id,
            reservation_id: row.reservation_id,
            title: "Loquinhas + Cristais",
            starts_at: mockDaysAhead(1) + " 09:00:00",
            people: row.people,
            payment_kind: row.payment_kind,
            tourist_name: row.guide_confirmed ? row.name : "",
            tourist_phone: row.guide_confirmed ? row.phone : "",
            guide_confirmed_at: row.needs_confirm ? null : "2026-10-07 07:00:00",
            lifecycle: "em_formacao",
          }));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, data: { rows } }));
        return;
      }
      if (req.method === "POST") {
        readJsonBody(req)
          .then((body) => {
            const excursionId = parseInt(body.excursion_id || "0", 10);
            if (excursionId > 0) {
              if (excursionId === 202) {
                if (mockValeDecision !== "waiting") {
                  res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                  res.end(JSON.stringify({ ok: false, error: "Este passeio não está aguardando a sua confirmação" }));
                  return;
                }
                mockValeDecision = body.action === "decline" ? "declined" : "accepted";
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ ok: true, data: { result: mockValeDecision } }));
                return;
              }
              if (excursionId !== 101 || mockGuideDecision !== "waiting") {
                res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ ok: false, error: "Este passeio não está aguardando a sua confirmação" }));
                return;
              }
              mockGuideDecision = body.action === "decline" ? "declined" : "accepted";
              mockSiteBookings.forEach((item) => {
                item.needs_confirm = false;
                item.guide_confirmed = mockGuideDecision === "accepted";
              });
              res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: true, data: { result: mockGuideDecision } }));
              return;
            }
            const tripId = parseInt(body.trip_id || "0", 10);
            const row = mockSiteBookings.find((item) => item.trip_id === tripId);
            if (!row) {
              res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
              res.end(JSON.stringify({ ok: false, error: "Reserva não encontrada" }));
              return;
            }
            row.needs_confirm = false;
            row.guide_confirmed = true;
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: true, data: { result: "pix" } }));
          })
          .catch(() => {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: "JSON inválido" }));
          });
        return;
      }
    }

    if (urlPath === "/api/auth/me.php" && req.method === "GET") {
      const as = new URL(req.url, "http://localhost:" + PORT).searchParams.get("as");
      const picked = as && MOCK_USERS[as] ? MOCK_USERS[as] : user;
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: true,
        data: Object.assign({}, picked, { profile_complete: picked.status !== "pending" }),
      }));
      return;
    }

    if (urlPath === "/api/guides/excursions.php" && req.method === "GET") {
      const packed = mockGuideExcursionsFor(mockCurrentGuide(req).id);
      const upcoming = packed.upcoming;
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        ok: true,
        data: {
          profile_complete: true,
          financial_ready: true,
          guide_net_min: 50,
          guide_net_max: 160,
          guide_net_max_dragao: 190,
          guide_net_max_transport: 550,
          max_people_cap: 15,
          min_quorum: 4,
          attractions: MOCK_ATTRACTIONS,
          cities: MOCK_CITIES,
          fila_posicao: packed.fila_posicao,
          fila_total: packed.fila_total,
          upcoming,
          excursions: upcoming.map((row) => Object.assign({}, row, { clients: (row.clients || []).map((client) => ({ ...client })) })),
        },
      }));
      return;
    }

    if (urlPath === "/api/guides/substituir.php") {
      mockSubstitutionApi(req, res);
      return;
    }

    const handler = API_ROUTES[urlPath];
    if (handler) {
      const body = JSON.stringify(handler());
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
    } else {
      // Endpoint não mockado — retorna erro genérico
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "mock: endpoint não implementado: " + urlPath }));
    }
    return;
  }

  // Logout mock: apenas redireciona
  if (urlPath === "/api/auth/logout.php") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": previewCookie(false),
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Arquivos estáticos
  let filePath = path.join(ROOT, urlPath);

  // Diretório → tenta index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // Sem extensão → tenta .html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    filePath = filePath + ".html";
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log("");
  console.log("  ✅  Mock server rodando em http://localhost:" + PORT);
  console.log("  👤  Usuário mockado: " + user.name + " (" + user.role + " / " + user.status + ")");
  console.log("  🌿  Atrativos no catálogo: " + MOCK_ATTRACTIONS.length);
  console.log("  📬  Lista de espera: POST /api/excursao-waitlist/register.php");
  console.log("  ✉   E-mail dev: api/.env (SMTP) ou api/storage/dev-outbox/");
  console.log("");
  console.log("  Trocar de papel:");
  console.log("    node tools/mock-server.mjs guide          → Guia ativo");
  console.log("    node tools/mock-server.mjs guide-pending  → Guia pendente");
  console.log("    node tools/mock-server.mjs admin          → Administrador");
  console.log("    node tools/mock-server.mjs client         → Cliente");
  console.log("");
  console.log("  Home (mock sem foto) → http://localhost:" + PORT + "/#excursoes-junho");
  console.log("  Abra as 3 portas de login:");
  console.log("    Cliente → http://localhost:" + PORT + "/login.html");
  console.log("    Guia    → http://localhost:" + PORT + "/guia/login.html");
  console.log("    Admin   → http://localhost:" + PORT + "/admin/login.html");
  console.log("  Ou painel direto: http://localhost:" + PORT + "/dashboard/");
  console.log("");
});

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
  if (rec.status === "RELEASED") return "CANCELLED";
  const exp = Date.parse(rec.expires_at || "");
  if (Number.isFinite(exp) && Date.now() > exp) return "EXPIRED";
  return "PENDING";
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
        const prev = pixRead(id);
        if (prev && prev.status === "PAID") {
          console.log("[mock] Pix reserva reaberta (substitui PAID):", id);
        }
        const rec = {
          reservation_id: id,
          status: "PENDING",
          amount: Number(data.amount) || 0,
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
        const trips = enrichTripsGuia(rec.trips || [], rec.locale || "pt");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            ok: true,
            reservation_id: id,
            status,
            amount: rec.amount,
            locale: rec.locale,
            trips,
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
  "guide-pending": { id: 3, name: "João Pendente", email: "pendente@gcv.com", role: "guide", status: "pending", avatar_url: null },
  client: { id: 4, name: "Maria Cliente", email: "cliente@gcv.com", role: "client", status: "active", avatar_url: null },
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
const TARIFARIO_CAMPOS = ["exclusivo_pessoa_cents", "exclusivo_transporte_cents", "excursao_pessoa_cents", "excursao_transporte_cents"];
const TARIFARIO_CIDADES = { "alto-paraiso": "Alto Paraíso de Goiás", "sao-jorge": "São Jorge", cavalcante: "Cavalcante" };

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
  return { quorum, cidades };
}

let mockTarifarioSeq = 1;
const MOCK_TARIFARIOS = [];

function tarifarioPublic(t) {
  if (!t) return null;
  const base = t.cidades["alto-paraiso"];
  return { id: t.id, nome: t.nome, quorum: t.quorum, ...base, cidades: JSON.parse(JSON.stringify(t.cidades)) };
}

function cidadeCurta(nome) {
  const n = String(nome || "");
  const pos = n.toLowerCase().indexOf(" de ");
  return pos > 2 ? n.slice(0, pos) : n;
}

function saidasPublic(tarifa, duracao, fallbackMinutes) {
  if (!tarifa) return [];
  const out = [];
  for (const key of Object.keys(TARIFARIO_CIDADES)) {
    const row = (tarifa.cidades && tarifa.cidades[key]) || {};
    const item = {
      key,
      nome: TARIFARIO_CIDADES[key],
      curta: cidadeCurta(TARIFARIO_CIDADES[key]),
      minutes: (duracao && parseInt(duracao[key], 10)) || Math.max(0, parseInt(fallbackMinutes, 10) || 0),
    };
    let vende = false;
    for (const campo of TARIFARIO_CAMPOS) {
      item[campo] = Math.max(0, parseInt(row[campo], 10) || 0);
      if (item[campo] > 0) vende = true;
    }
    if (vende) out.push(item);
  }
  return out;
}

function tarifarioById(id) {
  return MOCK_TARIFARIOS.find((t) => t.id === id) || null;
}

function duracaoCidades(map, fallback) {
  const out = {};
  for (const key of PASSEIO_CIDADE_KEYS) {
    const v = map && parseInt(map[key], 10);
    out[key] = v > 0 ? Math.min(v, 1440) : Math.max(0, parseInt(fallback, 10) || 0);
  }
  return out;
}

function duracaoClean(raw) {
  const out = {};
  for (const key of PASSEIO_CIDADE_KEYS) {
    const v = raw && parseInt(raw[key], 10);
    if (v > 0) out[key] = Math.min(v, 1440);
  }
  return out;
}

const MOCK_SETTINGS = [
  { key_name: "passeio_max_atrativos", value: "3", label: "Número máximo de atrativos no mesmo passeio", type: "integer" },
  { key_name: "diaria_minima_reais", value: "320", label: "Diária mínima do cliente no exclusivo e no fechamento da excursão (R$)", type: "integer" },
  { key_name: "pg_minimo_guia_reais", value: "280", label: "Pagamento mínimo do guia sem transporte (R$)", type: "integer" },
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
  return Math.max(1, Math.min(5, Number.isFinite(n) ? n : 3));
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

function presentRelated(tour) {
  refreshRelatedDuration(tour);
  return {
    id: tour.id,
    duration_minutes: tour.duration_minutes,
    duracao_cidades: duracaoCidades(tour.duracao, tour.duration_minutes),
    tarifario_id: tour.tarifario_id,
    tarifa: tarifarioPublic(tarifarioById(tour.tarifario_id)),
    saidas: saidasPublic(tarifarioPublic(tarifarioById(tour.tarifario_id)), duracaoCidades(tour.duracao, tour.duration_minutes), tour.duration_minutes),
    attractions: tour.attractions.map((part) => {
      const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
      return { ...part, title_pt: live ? live.title_pt : part.title_pt, duration_minutes: live ? live.duration_minutes || 0 : part.duration_minutes };
    }),
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

function passeioCategorias(raw, count) {
  const allowed = Object.keys(PASSEIO_CATEGORIAS);
  const list = Array.isArray(raw) ? raw.filter((key) => allowed.includes(key)) : [];
  return list.length ? list : count >= 2 ? ["destaque", "classicos"] : ["classicos"];
}

function passeioCatalog() {
  const max = maxAtrativos();
  const combos = MOCK_RELATED.map(presentRelated)
    .filter((tour) => tour.tarifa && tour.attractions.length <= max)
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
        href: first.page ? "/" + String(first.page).replace(/^\/+/, "") : "/passeios.html",
        attractions: presented.attractions.map((part) => part.title_pt),
      };
    });
  const singles = MOCK_ATTRACTIONS.filter((a) => a.page && a.tarifario_id && a.tem_passeio !== false && !String(a.title_pt).includes(" + ")).map((a) => ({
    id: "a-" + a.id,
    kind: "atrativo",
    slug: a.slug,
    attraction_ids: [a.id],
    title: a.title_pt,
    count: 1,
    categories: passeioCategorias(a.categorias, 1),
    duration_minutes: a.duration_minutes || 0,
    duracao_cidades: duracaoCidades(a.duracao, a.duration_minutes),
    tarifa: tarifarioPublic(tarifarioById(a.tarifario_id)),
    saidas: saidasPublic(tarifarioPublic(tarifarioById(a.tarifario_id)), duracaoCidades(a.duracao, a.duration_minutes), a.duration_minutes),
    image: a.cover_url || "",
    href: "/" + String(a.page).replace(/^\/+/, ""),
    attractions: [a.title_pt],
  }));
  return combos.concat(singles);
}

function passeioPublicPayload(slug) {
  const attraction = MOCK_ATTRACTIONS.find((a) => a.slug === slug);
  if (!attraction) return null;
  const max = maxAtrativos();
  return {
    slug: attraction.slug,
    title: attraction.title_pt,
    duration_minutes: attraction.duration_minutes || 0,
    duracao_cidades: duracaoCidades(attraction.duracao, attraction.duration_minutes),
    tem_passeio: attraction.tem_passeio !== false,
    categorias: passeioCategorias(attraction.categorias, 1),
    tarifa: attraction.tem_passeio === false ? null : tarifarioPublic(tarifarioById(attraction.tarifario_id)),
    saidas: attraction.tem_passeio === false ? [] : saidasPublic(tarifarioPublic(tarifarioById(attraction.tarifario_id)), duracaoCidades(attraction.duracao, attraction.duration_minutes), attraction.duration_minutes),
    max_atrativos: max,
    related_tours: mockRelatedFor(attraction.id).filter((t) => t.tarifa && t.attractions.length <= max),
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
      duracao_cidades: duracaoCidades(a.duracao, a.duration_minutes),
    }));
  return { ok: true, data: { max_atrativos: maxAtrativos(), categorias: PASSEIO_CATEGORIAS, cidades: TARIFARIO_CIDADES, tarifarios, atrativos, passeios: MOCK_RELATED.map(presentRelated), ...(extra || {}) } };
}

function mockRelatedSave(rawIds) {
  const ids = [...new Set((rawIds || []).map((n) => parseInt(n, 10)).filter(Boolean))];
  const max = maxAtrativos();
  if (max < 2) throw new Error("Nas Configurações, o máximo de atrativos no mesmo dia é 1. Aumente para juntar atrativos.");
  if (ids.length < 2 || ids.length > max) throw new Error("Um passeio com mais de um atrativo tem de 2 a " + max + " atrativos.");
  const picked = ids.map((id) => MOCK_ATTRACTIONS.find((a) => a.id === id)).filter(Boolean);
  if (picked.length !== ids.length) throw new Error("Atrativo não encontrado.");
  const semPagina = picked.find((a) => !a.page);
  if (semPagina) throw new Error("Só entra atrativo que tem página: " + semPagina.title_pt);
  let tour = MOCK_RELATED.find((row) => relatedSignature(row.attractions.map((a) => a.id)) === relatedSignature(ids));
  if (!tour) {
    tour = {
      id: mockRelatedSeq++,
      tarifario_id: null,
      duracao: {},
      duration_minutes: 0,
      attractions: picked.map((a) => ({ id: a.id, title_pt: a.title_pt, slug: a.slug, duration_minutes: a.duration_minutes || 0, page: a.page })),
    };
    refreshRelatedDuration(tour);
    MOCK_RELATED.push(tour);
  }
  return tour;
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
          if (req.method === "POST") {
            const t = { id: mockTarifarioSeq++, nome, ...tarifarioNormalize(body) };
            MOCK_TARIFARIOS.push(t);
            return send(tarifarioOverview({ saved_id: t.id }));
          }
          const t = tarifarioById(parseInt(body.id, 10));
          if (!t) return send({ ok: false, error: "Tarifário não encontrado." }, 400);
          Object.assign(t, { nome }, tarifarioNormalize(body));
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
        if (!Number.isFinite(n) || n < 1 || n > 5) return send({ ok: false, error: "Informe de 1 a 5 atrativos no mesmo passeio" });
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
  tour.duration_minutes = tour.attractions.reduce((sum, part) => {
    const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
    part.duration_minutes = live ? (live.duration_minutes || 0) : part.duration_minutes;
    return sum + (part.duration_minutes || 0);
  }, 0);
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
      return send({ ok: true, data: { ...row, related_tours: mockRelatedFor(id) } }), true;
    }
    return send({ ok: true, data: { attractions: MOCK_ATTRACTIONS } }), true;
  }

  readJsonBody(req).then((body) => {
    if (urlPath === "/api/admin/attractions.php" && req.method === "PUT") {
      const row = MOCK_ATTRACTIONS.find((a) => a.id === parseInt(body.id, 10));
      if (!row) return send({ ok: false, error: "Atrativo não encontrado" }, 404);
      if (body.duration_minutes === "" || body.duration_minutes == null) row.duration_minutes = null;
      else row.duration_minutes = Math.max(0, parseInt(body.duration_minutes, 10) || 0);
      if (body.title_pt) row.title_pt = String(body.title_pt);
      if (Object.prototype.hasOwnProperty.call(body, "tarifario_id")) {
        const tid = body.tarifario_id ? parseInt(body.tarifario_id, 10) : null;
        row.tarifario_id = tid && tarifarioById(tid) ? tid : null;
      }
      MOCK_RELATED.forEach(refreshRelatedDuration);
      return send({ ok: true, data: { ...row, related_tours: mockRelatedFor(row.id) } });
    }
    if (urlPath === "/api/admin/related-tours.php" && req.method === "POST") {
      try {
        return send({ ok: true, data: presentRelated(mockRelatedSave(body.attraction_ids)) });
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
  { id: 1, name: "Alto Paraíso de Goiás" },
  { id: 2, name: "São Jorge" },
  { id: 3, name: "Cavalcante" },
];

/** Muda o usuário mockado em runtime (login / Google). */
function setMockUser(next) {
  const copy = { ...(next || {}) };
  Object.keys(user).forEach((k) => {
    delete user[k];
  });
  Object.assign(user, copy);
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
  if (e.includes("admin") || e === "diegocsp82@gmail.com") return MOCK_USERS.admin;
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

function mockAcceptedTour() {
  return {
    id: 88,
    date_iso: "2026-07-15",
    departure_time: "08:00:00",
    attraction_title: "Trilha da Carioca",
    departure_city_name: "Alto Paraíso",
    price_cents: 18000,
    booked_people: 1,
    quorum: 4,
    max_people: 8,
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
    ],
    clients_count: 1,
    pending_requests: 0,
  };
}

function mockValeTour() {
  if (mockValeDecision === "declined") return null;
  const waiting = mockValeDecision === "waiting";
  return {
    id: 202,
    date_iso: "2026-08-03",
    departure_time: "14:00:00",
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
    lifecycle: waiting ? "em_espera" : "em_formacao",
    lifecycle_label: waiting ? "Em espera" : "Em formação",
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
  const clients = mockSiteBookings.map((row) => ({
    ...row,
    needs_confirm: false,
    guide_confirmed: !waiting,
  }));
  return {
    id: 101,
    date_iso: "2026-07-23",
    departure_time: "09:00:00",
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
    lifecycle: waiting ? "em_espera" : "em_formacao",
    lifecycle_label: waiting ? "Em espera" : "Em formação",
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
    const tour = mockAgendaExcursion();
    const vale = mockValeTour();
    const upcoming = [tour, vale, mockAcceptedTour()].filter(Boolean).map((row) => {
      const copy = { ...row, clients: (row.clients || []).map((client) => ({ ...client })) };
      if (copy.awaiting_guide) copy.clients = [];
      return copy;
    });
    return {
      ok: true,
      data: {
        profile_complete: true,
        min_quorum: 4,
        attractions: MOCK_ATTRACTIONS,
        cities: MOCK_CITIES,
        upcoming,
        excursions: upcoming.map((row) => Object.assign({}, row, { clients: row.clients.map((client) => ({ ...client })) })),
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
    const pt = [courosWalk, sbWalk, sbVan, valeVanOnly, pratinhaWalk];
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

  "/api/tours/list.php": () => ({
    ok: true,
    data: {
      tours: [
        { id: 1, title: "Trilha da Carioca", description: "Cachoeiras e cerrado", price_cents: 18000, max_participants: 10, status: "active", category: "hiking", date: "2026-07-15", spots_left: 4, guide_name: "Diego Guia" },
      ],
    },
  }),
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
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    if (ext === ".html") {
      let html = data.toString("utf8")
        .replace(/site\.js\?v=[^"'&\s]+/g, "site.js?v=1.1.61")
        .replace(/gcv-exc-cart-policies\.js\?v=[^"'&\s]+/g, "gcv-exc-cart-policies.js?v=1.1.60")
        .replace(/gcv-exc-cart\.js\?v=[^"'&\s]+/g, "gcv-exc-cart.js?v=1.1.60")
        .replace(/excursoes-carousel\.js\?v=[^"'&\s]+/g, "excursoes-carousel.js?v=1.1.62")
        .replace(/excursoes\.css\?v=[^"'&\s]+/g, "excursoes.css?v=1.1.37")
        .replace(/gcv-confirmacao\.js\?v=[^"'&\s]+/g, "gcv-confirmacao.js?v=1.1.36")
        .replace(/gcv-detail\.css\?v=[^"'&\s]+/g, "gcv-detail.css?v=1.1.37")
        .replace(/gcv-passeios-shop\.js\?v=[^"'&\s]+/g, "gcv-passeios-shop.js?v=1.3.6");
      if (!html.includes('href="passeios.html"')) {
        html = html
          .replace(/(<a href="atrativos\.html"[^>]*>)Atrativos(<\/a>)/, '$1Atrativos$2\n      <a href="passeios.html">Passeios</a>')
          .replace(/(<a href="atrativos\.html"[^>]*>)Attractions(<\/a>)/, '$1Attractions$2\n      <a href="passeios.html">Tours</a>')
          .replace(/(<a href="atrativos\.html"[^>]*>)Atractivos(<\/a>)/, '$1Atractivos$2\n      <a href="passeios.html">Paseos</a>');
      }
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

const server = http.createServer((req, res) => {
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
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
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
        res.writeHead(302, { Location: "/dashboard/" });
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

    if (handleCmsAttractionsApi(urlPath, req, res)) return;
    if (handleTarifarioApi(urlPath, req, res)) return;
    if (handleSettingsApi(urlPath, req, res)) return;
    if (urlPath === "/api/passeios.php" && req.method === "GET") {
      const slug = new URL(req.url, "http://localhost:" + PORT).searchParams.get("slug") || "";
      if (!slug) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, data: { tours: passeioCatalog(), categories: PASSEIO_CATEGORIAS, max_atrativos: maxAtrativos() } }));
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
    if (urlPath === "/api/guides/booking-confirmations.php") {
      if (req.method === "GET") {
        const rows = mockSiteBookings
          .filter((row) => row.needs_confirm || row.payment_kind === "card")
          .map((row) => ({
            id: row.trip_id,
            reservation_id: row.reservation_id,
            title: "Loquinhas + Cristais",
            starts_at: "2026-07-23 09:00:00",
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
    res.writeHead(200, { "Content-Type": "application/json" });
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

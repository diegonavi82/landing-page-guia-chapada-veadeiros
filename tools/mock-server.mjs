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
  const exp = Date.parse(rec.expires_at || "");
  if (Number.isFinite(exp) && Date.now() > exp) return "EXPIRED";
  return "PENDING";
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
  guide: { id: 2, name: "Diego Guia", email: "guia@gcv.com", role: "guide", status: "active", avatar_url: null },
  "guide-pending": { id: 3, name: "João Pendente", email: "pendente@gcv.com", role: "guide", status: "pending", avatar_url: null },
  client: { id: 4, name: "Maria Cliente", email: "cliente@gcv.com", role: "client", status: "active", avatar_url: null },
};

const user = MOCK_USERS[ROLE] || MOCK_USERS.guide;

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
const MOCK_PRICES = {
  "cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso": [90, 80],
  "cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso": [100, 85],
  "vale-lua-guia-chapada-veadeiros-sao-jorge": [110, 90],
  "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias": [90, 80],
  "cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso": [125, 100],
  "caracol-guia-chapada-veadeiros": [125, 100],
  "cachoeira-ponte-de-pedra-guia-chapada-veadeiros-cavalcante": [120, 95],
  "cachoeira-label-guia-chapada-veadeiros-sao-joao-alianca": [115, 90],
  "parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge": [140, 110],
  "cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros": [150, 120],
  "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge": [150, 120],
  "cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante": [160, 130],
  "cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca": [155, 125],
  "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge": [145, 115],
  "cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros": [180, 145],
  "cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso": [190, 150],
  "cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca": [175, 140],
  "parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge": [220, 180],
  "cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante": [220, 180],
};

const PASSEIO_CIDADE_KEYS = ["alto-paraiso", "sao-jorge", "cavalcante"];

function cityPriceFrom(tarifa) {
  const exclusivo = tarifa.exclusivo_pessoa_cents || 0;
  const excursao = tarifa.excursao_pessoa_cents || 0;
  return {
    exclusivo_pessoa_cents: exclusivo,
    excursao_pessoa_cents: excursao,
    exclusivo_transporte_cents: tarifa.exclusivo_transporte_cents != null ? tarifa.exclusivo_transporte_cents : exclusivo,
    excursao_transporte_cents: tarifa.excursao_transporte_cents != null ? tarifa.excursao_transporte_cents : excursao,
  };
}

function ensureCityPrices(tarifa) {
  if (!tarifa.cidades || typeof tarifa.cidades !== "object") tarifa.cidades = {};
  const base = cityPriceFrom(tarifa);
  for (const key of PASSEIO_CIDADE_KEYS) {
    const current = tarifa.cidades[key] || {};
    const exclusivo = current.exclusivo_pessoa_cents != null ? current.exclusivo_pessoa_cents : base.exclusivo_pessoa_cents;
    const excursao = current.excursao_pessoa_cents != null ? current.excursao_pessoa_cents : base.excursao_pessoa_cents;
    tarifa.cidades[key] = {
      exclusivo_pessoa_cents: exclusivo,
      excursao_pessoa_cents: excursao,
      exclusivo_transporte_cents: current.exclusivo_transporte_cents != null ? current.exclusivo_transporte_cents : exclusivo,
      excursao_transporte_cents: current.excursao_transporte_cents != null ? current.excursao_transporte_cents : excursao,
    };
  }
  return tarifa;
}

function attractionTarifa(attraction) {
  if (!attraction.tarifa) {
    const pair = MOCK_PRICES[attraction.slug] || [125, 80];
    attraction.tarifa = {
      exclusivo_pessoa_cents: pair[0] * 100,
      excursao_pessoa_cents: pair[1] * 100,
      exclusivo_6_cents: Math.round((pair[0] * 100 * 100) / 150),
      excursao_6_cents: Math.round((pair[1] * 100 * 100) / 150),
      quorum: 4,
    };
  }
  return ensureCityPrices(attraction.tarifa);
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
  attractionTarifa(attraction);
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
    tarifa_id: mockRelatedSeq,
    attractions,
  };
}).filter((row) => row.attractions.length >= 2);

function summedTarifa(tour) {
  const sum = { exclusivo_pessoa_cents: 0, excursao_pessoa_cents: 0, exclusivo_6_cents: 0, excursao_6_cents: 0, quorum: 4, somado: true };
  for (const part of tour.attractions) {
    const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
    const tarifa = live ? attractionTarifa(live) : null;
    if (!tarifa) continue;
    sum.exclusivo_pessoa_cents += tarifa.exclusivo_pessoa_cents || 0;
    sum.excursao_pessoa_cents += tarifa.excursao_pessoa_cents || 0;
    sum.exclusivo_6_cents += tarifa.exclusivo_6_cents || 0;
    sum.excursao_6_cents += tarifa.excursao_6_cents || 0;
  }
  return sum;
}

function presentRelated(tour) {
  refreshRelatedDuration(tour);
  const tarifa = tour.tarifa_custom || summedTarifa(tour);
  return {
    id: tour.id,
    duration_minutes: tour.duration_minutes,
    tarifa_id: tour.tarifa_id,
    tarifa,
    attractions: tour.attractions.map((part) => {
      const live = MOCK_ATTRACTIONS.find((a) => a.id === part.id);
      return {
        ...part,
        duration_minutes: live ? live.duration_minutes || 0 : part.duration_minutes,
        tarifa: live ? attractionTarifa(live) : null,
      };
    }),
  };
}

function mockRelatedFor(attractionId) {
  return MOCK_RELATED.filter((row) => row.attractions.some((a) => a.id === attractionId)).map(presentRelated);
}

function passeioCatalog() {
  const singles = MOCK_ATTRACTIONS.filter((a) => a.page && !String(a.title_pt).includes(" + ")).map((a) => ({
    id: "a-" + a.id,
    title: a.title_pt,
    count: 1,
    duration_minutes: a.duration_minutes || 0,
    tarifa: attractionTarifa(a),
    image: a.cover_url || "",
    href: "/" + String(a.page).replace(/^\/+/, ""),
    attractions: [a.title_pt],
  }));
  const combos = MOCK_RELATED.map((tour) => {
    const presented = presentRelated(tour);
    const first = presented.attractions[0] || {};
    const live = MOCK_ATTRACTIONS.find((a) => a.id === first.id);
    return {
      id: "r-" + presented.id,
      title: presented.attractions.map((part) => part.title_pt).join(" + "),
      count: presented.attractions.length,
      duration_minutes: presented.duration_minutes,
      tarifa: presented.tarifa,
      image: (live && live.cover_url) || "",
      href: first.page ? "/" + String(first.page).replace(/^\/+/, "") : "/passeios.html",
      attractions: presented.attractions.map((part) => part.title_pt),
    };
  });
  return combos.concat(singles);
}

function passeioPublicPayload(slug) {
  const attraction = MOCK_ATTRACTIONS.find((a) => a.slug === slug);
  if (!attraction) return null;
  return {
    slug: attraction.slug,
    title: attraction.title_pt,
    duration_minutes: attraction.duration_minutes || 0,
    tarifa: attractionTarifa(attraction),
    related_tours: mockRelatedFor(attraction.id),
  };
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
      if (body.tarifa && typeof body.tarifa === "object") {
        const atual = attractionTarifa(row);
        const exclusivo = parseInt(body.tarifa.exclusivo_pessoa_cents, 10);
        const excursao = parseInt(body.tarifa.excursao_pessoa_cents, 10);
        const exclusivo6 = parseInt(body.tarifa.exclusivo_6_cents, 10);
        const excursao6 = parseInt(body.tarifa.excursao_6_cents, 10);
        if (Number.isFinite(exclusivo)) atual.exclusivo_pessoa_cents = Math.max(0, exclusivo);
        if (Number.isFinite(excursao)) atual.excursao_pessoa_cents = Math.max(0, excursao);
        if (Number.isFinite(exclusivo6)) atual.exclusivo_6_cents = Math.max(0, exclusivo6);
        if (Number.isFinite(excursao6)) atual.excursao_6_cents = Math.max(0, excursao6);
        if (body.tarifa.cidades && typeof body.tarifa.cidades === "object") {
          ensureCityPrices(atual);
          for (const key of PASSEIO_CIDADE_KEYS) {
            const row = body.tarifa.cidades[key];
            if (!row || typeof row !== "object") continue;
            const ex = parseInt(row.exclusivo_pessoa_cents, 10);
            const ec = parseInt(row.excursao_pessoa_cents, 10);
            const exT = parseInt(row.exclusivo_transporte_cents, 10);
            const ecT = parseInt(row.excursao_transporte_cents, 10);
            if (!atual.cidades[key]) atual.cidades[key] = cityPriceFrom(atual);
            if (Number.isFinite(ex)) atual.cidades[key].exclusivo_pessoa_cents = Math.max(0, ex);
            if (Number.isFinite(ec)) atual.cidades[key].excursao_pessoa_cents = Math.max(0, ec);
            if (Number.isFinite(exT)) atual.cidades[key].exclusivo_transporte_cents = Math.max(0, exT);
            if (Number.isFinite(ecT)) atual.cidades[key].excursao_transporte_cents = Math.max(0, ecT);
          }
        }
      }
      MOCK_RELATED.forEach(refreshRelatedDuration);
      return send({ ok: true, data: { ...row, related_tours: mockRelatedFor(row.id) } });
    }
    if (urlPath === "/api/admin/related-tours.php" && req.method === "POST") {
      const ids = [...new Set((body.attraction_ids || []).map((n) => parseInt(n, 10)).filter(Boolean))];
      if (ids.length < 2 || ids.length > 3) return send({ ok: false, error: "Um passeio relacionado tem 2 ou 3 atrativos." }, 400);
      const picked = ids.map((id) => MOCK_ATTRACTIONS.find((a) => a.id === id)).filter(Boolean);
      if (picked.length !== ids.length || picked.some((a) => !a.page)) {
        return send({ ok: false, error: "Só entra atrativo que tem página." }, 400);
      }
      const signature = [...ids].sort((a, b) => a - b).join("-");
      let tour = MOCK_RELATED.find((row) => [...row.attractions.map((a) => a.id)].sort((a, b) => a - b).join("-") === signature);
      if (!tour) {
        tour = {
          id: mockRelatedSeq++,
          tarifa_id: mockRelatedSeq,
          duration_minutes: 0,
          attractions: picked.map((a) => ({
            id: a.id,
            title_pt: a.title_pt,
            slug: a.slug,
            duration_minutes: a.duration_minutes || 0,
            page: a.page,
          })),
        };
        refreshRelatedDuration(tour);
        MOCK_RELATED.push(tour);
      }
      return send({ ok: true, data: tour });
    }
    if (urlPath === "/api/admin/related-tours.php" && req.method === "PUT") {
      const tour = MOCK_RELATED.find((row) => row.id === parseInt(body.id, 10));
      if (!tour) return send({ ok: false, error: "Passeio não encontrado" }, 404);
      const tarifa = body.tarifa || {};
      tour.tarifa_custom = {
        exclusivo_pessoa_cents: Math.max(0, parseInt(tarifa.exclusivo_pessoa_cents, 10) || 0),
        excursao_pessoa_cents: Math.max(0, parseInt(tarifa.excursao_pessoa_cents, 10) || 0),
        exclusivo_6_cents: Math.max(0, parseInt(tarifa.exclusivo_6_cents, 10) || 0),
        excursao_6_cents: Math.max(0, parseInt(tarifa.excursao_6_cents, 10) || 0),
        quorum: 4,
        somado: false,
      };
      return send({ ok: true, data: presentRelated(tour) });
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
  Object.keys(user).forEach((k) => {
    delete user[k];
  });
  Object.assign(user, next);
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

  "/api/guides/excursions.php": () => ({
    ok: true,
    data: {
      profile_complete: true,
      min_quorum: 4,
      attractions: MOCK_ATTRACTIONS,
      cities: MOCK_CITIES,
      upcoming: [
        {
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
          lifecycle: "em_formacao",
          lifecycle_label: "Em formação",
          can_cancel: true,
        },
      ],
      excursions: [
        {
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
          lifecycle: "em_formacao",
          lifecycle_label: "Em formação",
          can_cancel: true,
        },
      ],
    },
  }),

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
    return {
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
    };
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
      let html = data.toString("utf8").replace(/site\.js\?v=[^"'&\s]+/g, "site.js?v=1.1.35");
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
    if (urlPath === "/api/passeios.php" && req.method === "GET") {
      const slug = new URL(req.url, "http://localhost:" + PORT).searchParams.get("slug") || "";
      if (!slug) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, data: { tours: passeioCatalog() } }));
        return;
      }
      const data = passeioPublicPayload(slug);
      res.writeHead(data ? 200 : 404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(data ? { ok: true, data } : { ok: false, error: "Atrativo não encontrado" }));
      return;
    }
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

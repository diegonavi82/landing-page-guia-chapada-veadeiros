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
  admin: { id: 1, name: "Admin GCV", email: "admin@gcv.com", role: "admin", status: "active", avatar_url: null },
  guide: { id: 2, name: "Diego Guia", email: "guia@gcv.com", role: "guide", status: "active", avatar_url: null },
  "guide-pending": { id: 3, name: "João Pendente", email: "pendente@gcv.com", role: "guide", status: "pending", avatar_url: null },
  client: { id: 4, name: "Maria Cliente", email: "cliente@gcv.com", role: "client", status: "active", avatar_url: null },
};

const user = MOCK_USERS[ROLE] || MOCK_USERS.guide;

/** Respostas mock da API */
const API_ROUTES = {
  "/api/auth/me.php": () => ({ ok: true, data: user }),

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
      bio: "Guia credenciado CADASTUR com 10 anos de experiência na Chapada dos Veadeiros.",
      phone: "(62) 98250-6891",
      specialties: "Trilhas, cachoeiras, camping",
      mp_connected: false,
      status: user.status,
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
    data: { settings: { site_name: "Guia Chapada Veadeiros", platform_fee_pct: 10 } },
  }),

  "/api/admin/financials.php": () => ({
    ok: true,
    data: { total_revenue_cents: 150000, pending_payout_cents: 45000, total_bookings: 12 },
  }),

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
    if (handlePixApi(urlPath, req, res)) return;
    if (handleWaitlistApi(urlPath, req, res)) return;
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
  console.log("  📬  Lista de espera: POST /api/excursao-waitlist/register.php");
  console.log("  ✉   E-mail dev: api/.env (SMTP) ou api/storage/dev-outbox/");
  console.log("");
  console.log("  Trocar de papel:");
  console.log("    node tools/mock-server.mjs guide          → Guia ativo");
  console.log("    node tools/mock-server.mjs guide-pending  → Guia pendente");
  console.log("    node tools/mock-server.mjs admin          → Administrador");
  console.log("    node tools/mock-server.mjs client         → Cliente");
  console.log("");
  console.log("  Abra: http://localhost:" + PORT + "/dashboard/");
  console.log("");
});

/**
 * Mock local (npm run dev) do checkout híbrido — espelha a API PHP:
 *   GET  /api/payment_quote.php        preço por forma de pagamento
 *   POST /api/mp_card.php              cartão nacional (formulário MP; simulado com dev-test-token)
 *   POST /api/stripe_checkout.php      cartão internacional (Stripe, USD)
 *   GET  /api/stripe_return.php        volta da Stripe
 *   GET/POST /api/admin/payment-ledger.php   painel de transações
 *
 * Com MP_ACCESS_TOKEN / STRIPE_SECRET_KEY de TESTE no api/.env usa as APIs reais (sandbox).
 * Sem chaves, simula o pagamento aprovado para testar o fluxo inteiro no localhost.
 * Registro de transações em api/storage/payment_ledger_dev.json.
 */
import fs from "node:fs";
import path from "node:path";

export function createPaymentsMock(deps) {
  const { ROOT, pixRead, pixWrite, readEnvValue, stripeApi, stripeLineItems, requestOrigin, safeReturnPath, confirmPathForLocale } = deps;
  const LEDGER = path.join(ROOT, "api", "storage", "payment_ledger_dev.json");

  const envNum = (k, d) => {
    const v = parseFloat(String(readEnvValue(k) || "").replace(",", "."));
    return Number.isFinite(v) ? v : d;
  };
  const cfg = () => ({
    cardBrPct: envNum("PAY_CARD_BR_PCT", 15),
    cardIntlPct: envNum("PAY_CARD_INTL_PCT", 25),
    fxSpreadPct: envNum("PAY_FX_SPREAD_PCT", 4),
    maxInst: Math.max(1, Math.min(12, envNum("PAY_MP_MAX_INSTALLMENTS", 4))),
  });
  const applyPct = (cents, pct) => Math.floor((cents * Math.round((100 + pct) * 100) + 9999) / 10000);

  let fxCache = null;
  async function usdRate() {
    const override = envNum("PAY_USD_BRL_RATE_OVERRIDE", 0);
    if (override > 0) return { rate: override, date: new Date().toISOString().slice(0, 10), source: "override" };
    if (fxCache && Date.now() - fxCache.at < 6 * 3600 * 1000) return fxCache.v;
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const mmddyyyy = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
      try {
        const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${mmddyyyy}'&$format=json`;
        const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const j = await r.json();
        const rows = (j && j.value) || [];
        if (rows.length) {
          const v = { rate: Number(rows[rows.length - 1].cotacaoVenda), date: d.toISOString().slice(0, 10), source: "ptax" };
          fxCache = { at: Date.now(), v };
          return v;
        }
      } catch {
        break; // sem internet: usa a cotação de desenvolvimento
      }
    }
    return { rate: 5.5, date: new Date().toISOString().slice(0, 10), source: "dev-fallback" };
  }

  async function quote(baseCents, method) {
    const c = cfg();
    if (method === "pix") {
      return { ok: true, method, gateway: "sicoob", base_cents: baseCents, surcharge_pct: 0, surcharge_cents: 0, total_brl_cents: baseCents, currency: "brl", charge_minor: baseCents, max_installments: 1 };
    }
    if (method === "card_br") {
      const total = applyPct(baseCents, c.cardBrPct);
      return { ok: true, method, gateway: "mercadopago", base_cents: baseCents, surcharge_pct: c.cardBrPct, surcharge_cents: total - baseCents, total_brl_cents: total, currency: "brl", charge_minor: total, max_installments: c.maxInst, installment_cents: Math.ceil(total / c.maxInst) };
    }
    const totalBrl = applyPct(baseCents, c.cardIntlPct);
    const fx = await usdRate();
    const usd = Math.max(50, Math.ceil(Number(((totalBrl / fx.rate) * (1 + c.fxSpreadPct / 100)).toFixed(4))));
    return { ok: true, method: "card_intl", gateway: "stripe", base_cents: baseCents, surcharge_pct: c.cardIntlPct, surcharge_cents: totalBrl - baseCents, total_brl_cents: totalBrl, max_installments: 1, currency: "usd", charge_minor: usd, fx_rate: fx.rate, fx_date: fx.date, fx_source: fx.source, fx_spread_pct: c.fxSpreadPct };
  }

  // ---------- registro de transações (JSON) ----------
  function ledgerRead() {
    try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return { transactions: [], settlements: [] }; }
  }
  function ledgerWrite(db) {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.writeFileSync(LEDGER, JSON.stringify(db, null, 2));
  }
  function ledgerUpsert(row) {
    const db = ledgerRead();
    const i = db.transactions.findIndex((t) => t.reservation_id === row.reservation_id && t.gateway === row.gateway);
    const now = nowSp();
    if (i >= 0) {
      const cur = db.transactions[i];
      Object.keys(row).forEach((k) => { if (row[k] != null) cur[k] = row[k]; });
      cur.updated_at = now;
    } else {
      db.transactions.push({ id: db.transactions.length + 1, settlement_status: "IN_GATEWAY", installments: 1, refunded_cents: 0, price_review: 0, fee_source: "estimate", created_at: now, ...row });
    }
    ledgerWrite(db);
  }
  const nowSp = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);

  // ---------- helpers HTTP ----------
  const json = (res, code, payload) => {
    res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  };
  const readBody = (req) => new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
  const go = (res, target) => { res.writeHead(302, { Location: target }); res.end(); };

  function baseFromBody(data) {
    const amount = Math.round(Number(data.amount) * 100);
    if (!Number.isFinite(amount) || amount < 100 || amount > 10000000) return 0;
    return amount;
  }

  function validate(data) {
    const id = String(data.reservation_id || "").toUpperCase();
    if (!/^GCV-[A-Z0-9]{6}$/.test(id)) return { error: "Invalid reservation_id" };
    const email = String(data.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email" };
    const name = String(data.name || "").trim();
    if (!name) return { error: "Invalid name" };
    const base = baseFromBody(data);
    if (!base) return { error: "Invalid amount" };
    const prev = pixRead(id);
    if (prev && prev.status === "PAID") return { error: "Reservation already paid", code: 409 };
    const locale = data.locale === "en" || data.locale === "es" ? data.locale : "pt";
    return { id, email, name: name.slice(0, 160), base, locale, returnPath: safeReturnPath(data.return_path || "/") };
  }

  function chargedLabel(currency, minor, inst) {
    const v = minor / 100;
    let s = currency === "usd" ? "US$ " + v.toFixed(2) : "R$ " + v.toFixed(2).replace(".", ",");
    if (inst > 1) s += ` (${inst}x)`;
    return s;
  }

  function buildRecord(v, data, q, gateway) {
    const rec = {
      reservation_id: v.id, status: "PENDING", amount: v.base / 100, amount_cents: v.base, locale: v.locale,
      trips: data.trips || [], email: v.email, name: v.name, customer_name: v.name,
      payment_method: "card", payment_option: q.method, pix_mode: gateway, gateway,
      charged_currency: q.currency.toUpperCase(), charged_minor: q.charge_minor, charged_brl_cents: q.total_brl_cents,
      surcharge_cents: q.surcharge_cents, surcharge_pct: q.surcharge_pct, charged_label: chargedLabel(q.currency, q.charge_minor, 1),
      return_path: v.returnPath, expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(),
    };
    if (q.fx_rate) Object.assign(rec, { fx_rate: q.fx_rate, fx_date: q.fx_date, fx_spread_pct: q.fx_spread_pct });
    if (data.incl_excl && typeof data.incl_excl === "object") rec.incl_excl = data.incl_excl;
    if (Array.isArray(data.packages) && data.packages.length) rec.packages = data.packages;
    const phone = String(data.phone || "").trim();
    if (phone.replace(/\D/g, "").length >= 10) rec.phone = phone;
    return rec;
  }

  // ---------- Mercado Pago ----------
  async function mpApi(method, p, body) {
    const token = readEnvValue("MP_ACCESS_TOKEN");
    if (!token) return { ok: false, error: "mp_not_configured" };
    const r = await fetch("https://api.mercadopago.com" + p, {
      method,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[mp]", method, p, r.status, data && data.message);
      return { ok: false, error: (data && data.message) || "mp_error" };
    }
    return { ok: true, data };
  }

  // Janela da reserva no cartão: MP 4 dias, Stripe 6 dias (antes disso, só salva o cartão).
  function earliestStartMs(rec) {
    let min = Infinity;
    (rec.trips || []).forEach((t) => {
      let iso = String((t && (t.dateIso || t.dateISO)) || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const m = String((t && t.cartId) || "").match(/(20\d{2}-\d{2}-\d{2})/);
        iso = m ? m[1] : "";
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const ms = Date.parse(iso + "T" + (String(t.hora || "08:00").replace(/[^0-9:]/g, "").slice(0, 5) || "08:00") + ":00-03:00");
        if (Number.isFinite(ms)) min = Math.min(min, ms);
      }
    });
    return min;
  }
  const inWindow = (rec, days) => earliestStartMs(rec) <= Date.now() + days * 86400000;

  function markReserved(rec, state, gateway, authId) {
    rec.status = state;
    rec.reserved_at = rec.reserved_at || new Date().toISOString();
    const start = earliestStartMs(rec);
    rec.expires_at = Number.isFinite(start) ? new Date(start).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
    if (state === "AUTHORIZED") rec.card_auth = { gateway, id: authId, amount_minor: rec.charged_minor, authorized_at: new Date().toISOString() };
    pixWrite(rec.reservation_id, rec);
  }

  async function handleMpCard(req, res) {
    let data;
    try { data = JSON.parse((await readBody(req)) || "{}"); } catch { json(res, 400, { success: false, message: "Invalid JSON" }); return; }
    const v = validate(data);
    if (v.error) { json(res, v.code || 422, { success: false, message: v.error }); return; }
    const card = data.card || {};
    if (!card.token) { json(res, 422, { success: false, message: "Dados do cartão incompletos." }); return; }
    const q = await quote(v.base, "card_br");
    const inst = Math.max(1, Number(card.installments) || 1);
    if (inst > q.max_installments) { json(res, 422, { success: false, message: "Número de parcelas inválido." }); return; }
    const rec = buildRecord(v, data, q, "mercadopago");
    rec.installments = inst;
    rec.charged_label = chargedLabel("brl", q.charge_minor, inst);
    let state;
    let authId = "mp_dev_" + v.id.slice(-6);
    if (card.token !== "dev-test-token") {
      // Sandbox real do Mercado Pago (MP_ACCESS_TOKEN de TESTE no api/.env).
      if (!readEnvValue("MP_ACCESS_TOKEN")) { json(res, 501, { success: false, message: "Configure MP_ACCESS_TOKEN no api/.env." }); return; }
      if (inWindow(rec, 4)) {
        const ident = card.payer && card.payer.identification;
        const pay = await mpApi("POST", "/v1/payments", {
          transaction_amount: q.charge_minor / 100,
          token: card.token,
          description: "Guia Chapada Veadeiros " + v.id,
          installments: inst,
          payment_method_id: card.payment_method_id,
          issuer_id: card.issuer_id || undefined,
          payer: { email: v.email, identification: ident && ident.number ? { type: ident.type || "CPF", number: String(ident.number).replace(/\D/g, "") } : undefined },
          capture: false,
          binary_mode: true,
          external_reference: v.id,
          statement_descriptor: "GUIACHAPADA",
        });
        const p = pay.data || {};
        console.log("[mp] sandbox payment", p.id, p.status, p.status_detail);
        if (!pay.ok || p.status !== "authorized") {
          json(res, 402, { success: false, message: "Cartão recusado (" + (p.status_detail || pay.error || "erro") + "). Confira os dados ou use outro cartão de teste.", error: "declined" });
          return;
        }
        state = "AUTHORIZED";
        authId = String(p.id);
      } else {
        const search = await mpApi("GET", "/v1/customers/search?email=" + encodeURIComponent(v.email));
        let customerId = search.ok && search.data.results && search.data.results[0] && search.data.results[0].id;
        if (!customerId) {
          const c = await mpApi("POST", "/v1/customers", { email: v.email });
          customerId = c.ok && c.data.id;
        }
        const saved = customerId ? await mpApi("POST", "/v1/customers/" + customerId + "/cards", { token: card.token }) : { ok: false };
        if (!saved.ok) { json(res, 402, { success: false, message: "Não foi possível salvar o cartão de teste." }); return; }
        rec.card_saved = { gateway: "mercadopago", customer_id: customerId, card_id: saved.data.id, last4: saved.data.last_four_digits, payment_method_id: card.payment_method_id, issuer_id: card.issuer_id, installments: inst };
        state = "CARD_SAVED";
      }
    } else {
      state = inWindow(rec, 4) ? "AUTHORIZED" : "CARD_SAVED";
    }
    markReserved(rec, state, "mercadopago", authId);
    ledgerUpsert({ reservation_id: v.id, gateway: "mercadopago", method: "card_br", status: state, installments: inst, currency: "BRL", charge_minor: q.charge_minor, base_cents: q.base_cents, surcharge_cents: q.surcharge_cents, gross_cents: q.total_brl_cents });
    console.log("[mp] card", v.id, state, inst + "x");
    json(res, 200, { success: true, state, redirect: confirmPathForLocale(v.locale) + "?id=" + encodeURIComponent(v.id), reservation_id: v.id });
  }

  function markPaid(rec, source) {
    rec.status = "PAID";
    rec.paid_at = rec.paid_at || new Date().toISOString();
    rec.paid_source = source;
    pixWrite(rec.reservation_id, rec);
  }

  // ---------- Stripe (USD) ----------
  async function handleStripeCheckout(req, res) {
    let data;
    try { data = JSON.parse((await readBody(req)) || "{}"); } catch { json(res, 400, { success: false, message: "Invalid JSON" }); return; }
    const v = validate(data);
    if (v.error) { json(res, v.code || 422, { success: false, message: v.error }); return; }
    const q = await quote(v.base, "card_intl");
    const rec = buildRecord(v, data, q, "stripe");
    pixWrite(v.id, rec);
    const origin = requestOrigin(req);
    let url;
    if (readEnvValue("STRIPE_SECRET_KEY")) {
      const items = stripeLineItems(data, v.id, q.charge_minor, v.locale).map((it) => {
        it.price_data.currency = q.currency;
        return it;
      });
      const session = await stripeApi("POST", "/v1/checkout/sessions", {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: v.email,
        client_reference_id: v.id,
        locale: v.locale === "pt" ? "pt-BR" : v.locale,
        success_url: origin + "/api/stripe_return.php?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: origin + v.returnPath,
        metadata: { reservation_id: v.id, locale: v.locale },
        line_items: items,
      });
      if (!session.ok || !session.data.url) { json(res, 502, { success: false, message: "Não foi possível abrir o pagamento com cartão." }); return; }
      rec.stripe_session_id = session.data.id;
      pixWrite(v.id, rec);
      url = session.data.url;
    } else {
      url = origin + "/api/stripe_return.php?session_id=cs_mock_" + v.id.replace("-", "");
    }
    ledgerUpsert({ reservation_id: v.id, gateway: "stripe", method: "card_intl", status: "PENDING", currency: "USD", charge_minor: q.charge_minor, fx_rate: q.fx_rate, base_cents: q.base_cents, surcharge_cents: q.surcharge_cents, gross_cents: q.total_brl_cents });
    console.log("[stripe] checkout", v.id, "US$", q.charge_minor / 100);
    json(res, 200, { success: true, url, reservation_id: v.id });
  }

  async function handleStripeReturn(req, res) {
    const u = new URL(req.url, "http://localhost");
    const sessionId = String(u.searchParams.get("session_id") || "");
    let id = "";
    let paidMinor = 0;
    let currency = "";
    let pi = "";
    if (/^cs_mock_GCV[A-Z0-9]{6}$/.test(sessionId) && !readEnvValue("STRIPE_SECRET_KEY")) {
      id = "GCV-" + sessionId.slice(-6);
      const r = pixRead(id);
      paidMinor = r ? r.charged_minor : 0;
      currency = r ? String(r.charged_currency || "").toLowerCase() : "";
      pi = "pi_mock_" + id.slice(-6);
    } else {
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) { go(res, "/"); return; }
      const s = await stripeApi("GET", "/v1/checkout/sessions/" + encodeURIComponent(sessionId));
      if (!s.ok || s.data.payment_status !== "paid") { go(res, "/"); return; }
      id = String((s.data.metadata || {}).reservation_id || s.data.client_reference_id || "").toUpperCase();
      paidMinor = Number(s.data.amount_total);
      currency = String(s.data.currency || "");
      pi = String(s.data.payment_intent || "");
    }
    const rec = /^GCV-[A-Z0-9]{6}$/.test(id) ? pixRead(id) : null;
    if (!rec) { go(res, "/"); return; }
    const cancel = rec.return_path ? safeReturnPath(rec.return_path) : "/";
    const expected = Number(rec.charged_minor || rec.amount_cents);
    if (paidMinor !== expected || currency !== String(rec.charged_currency || "brl").toLowerCase()) {
      console.error("[stripe] amount/currency mismatch", id);
      go(res, cancel);
      return;
    }
    rec.stripe_payment_intent = pi;
    const stState = inWindow(rec, 6) ? "AUTHORIZED" : "CARD_SAVED";
    markReserved(rec, stState, "stripe", pi);
    // Estimativa de taxa (3,99% + 2% internacional + 2% conversão + R$ 0,39); com chave real o webhook grava a taxa exata.
    const gross = Number(rec.charged_brl_cents) * (1 + (Number(rec.fx_spread_pct) || 0) / 100);
    const fee = Math.round(gross * 0.0799 + 39);
    ledgerUpsert({
      reservation_id: id, gateway: "stripe", method: "card_intl", external_id: pi, checkout_ref: sessionId, currency: "USD", charge_minor: paidMinor, gross_cents: Math.round(gross), fee_cents: fee, net_cents: Math.round(gross) - fee,
      fee_source: "estimate", status: stState,
    });
    console.log("[stripe] paid", id);
    go(res, confirmPathForLocale(rec.locale) + "?id=" + encodeURIComponent(id));
  }

  // ---------- confirmar cartão (link do e-mail) ----------
  async function handleCardAction(req, res) {
    const u = new URL(req.url, "http://localhost");
    let body = {};
    if (req.method === "POST") { try { body = JSON.parse((await readBody(req)) || "{}"); } catch { /* noop */ } }
    const id = String((req.method === "POST" ? body.r : u.searchParams.get("r")) || "").toUpperCase();
    const rec = /^GCV-[A-Z0-9]{6}$/.test(id) ? pixRead(id) : null;
    if (!rec) { json(res, 403, { success: false, message: "Link inválido ou expirado." }); return; }
    if (req.method === "GET") {
      json(res, 200, {
        success: true, reservation_id: id, status: rec.status, gateway: rec.gateway, locale: rec.locale, charged_label: rec.charged_label,
        trips: (rec.trips || []).map((t) => ({ title: t.destino, starts_at: (t.dateIso || "") + " " + (t.hora || ""), people: t.qty })),
        mp: rec.gateway === "mercadopago" ? {
          public_key: readEnvValue("MP_PUBLIC_KEY") || "",
          customer_id: (rec.card_saved && rec.card_saved.customer_id) || "",
          card_id: (rec.card_saved && rec.card_saved.card_id) || "",
          last4: (rec.card_saved && rec.card_saved.last4) || "4242",
          amount: rec.charged_minor / 100,
        } : null,
      });
      return;
    }
    if (rec.status !== "CARD_SAVED") { json(res, 200, { success: true, status: rec.status, redirect: confirmPathForLocale(rec.locale) + "?id=" + id }); return; }
    let caId = "dev_auth_" + id.slice(-6);
    if (rec.gateway === "mercadopago" && body.token && body.token !== "dev-test-token") {
      const cs = rec.card_saved || {};
      const pay = await mpApi("POST", "/v1/payments", {
        transaction_amount: rec.charged_minor / 100, token: body.token, installments: cs.installments || 1,
        payment_method_id: cs.payment_method_id, issuer_id: cs.issuer_id || undefined,
        payer: { type: "customer", id: cs.customer_id, email: rec.email },
        capture: false, binary_mode: true, external_reference: id, description: "Guia Chapada Veadeiros " + id,
      });
      const p = pay.data || {};
      if (!pay.ok || p.status !== "authorized") { json(res, 402, { success: false, message: "Cartão recusado (" + (p.status_detail || pay.error) + ")." }); return; }
      caId = String(p.id);
    }
    markReserved(rec, "AUTHORIZED", rec.gateway, caId);
    ledgerUpsert({ reservation_id: id, gateway: rec.gateway, status: "AUTHORIZED" });
    json(res, 200, { success: true, status: "AUTHORIZED", redirect: confirmPathForLocale(rec.locale) + "?id=" + id });
  }

  // ---------- guia confirma reservas ----------
  async function handleGuideConfirm(req, res) {
    const db = ledgerRead();
    const open = db.transactions.filter((t) => ["AUTHORIZED", "CARD_SAVED"].includes(t.status));
    if (req.method === "POST") {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || "{}"); } catch { /* noop */ }
      const t = db.transactions.find((x) => x.id === Number(body.trip_id));
      if (!t) { json(res, 404, { ok: false, error: "Reserva não encontrada" }); return; }
      const rec = pixRead(t.reservation_id);
      // No mock o quórum é considerado atingido: confirmar = cobrar (se já reservado no cartão).
      if (rec && rec.status === "AUTHORIZED") {
        const authId = String((rec.card_auth && rec.card_auth.id) || "");
        if (rec.gateway === "mercadopago" && /^\d+$/.test(authId)) {
          const cap = await mpApi("PUT", "/v1/payments/" + authId, { capture: true });
          console.log("[mp] sandbox capture", authId, cap.ok && cap.data.status);
          if (!cap.ok) { json(res, 502, { ok: false, error: "Falha ao cobrar no Mercado Pago (sandbox)." }); return; }
        }
        markPaid(rec, rec.gateway);
        t.status = "PAID";
        t.paid_at = nowSp();
      }
      t.guide_confirmed_at = nowSp();
      ledgerWrite(db);
      json(res, 200, { ok: true, data: { ok: true, result: rec && rec.status === "PAID" ? "captured" : "waiting" } });
      return;
    }
    const rows = db.transactions
      .filter((t) => open.includes(t) || (t.guide_confirmed_at && t.status !== "RELEASED"))
      .map((t) => {
        const r = pixRead(t.reservation_id) || {};
        const trip = (r.trips || [])[0] || {};
        return {
          id: t.id, reservation_id: t.reservation_id, title: trip.destino || "", starts_at: (trip.dateIso || "") + " " + (trip.hora || "08:00"),
          people: trip.qty || 1, payment_kind: "card", decision: "UNDECIDED", guide_confirmed_at: t.guide_confirmed_at || null,
          tourist_name: r.name || "", tourist_phone: r.phone || "", lifecycle: "em_formacao", guide_name: "Diego Navi",
        };
      });
    json(res, 200, { ok: true, data: { rows, is_admin: true } });
  }

  // ---------- painel admin ----------
  function handleAdminLedger(req, res) {
    const u = new URL(req.url, "http://localhost");
    const db = ledgerRead();
    if (req.method === "POST") {
      readBody(req).then((b) => {
        let body = {};
        try { body = JSON.parse(b || "{}"); } catch { /* noop */ }
        if (body.action !== "register_mp_transfer") { json(res, 400, { ok: false, error: "Ação inválida" }); return; }
        const cents = Math.round(Number(String(body.amount || "0").replace(",", ".")) * 100);
        if (cents <= 0) { json(res, 422, { ok: false, error: "Informe o valor transferido" }); return; }
        const sid = db.settlements.length + 1;
        db.settlements.push({ id: sid, gateway: "mercadopago", external_id: body.ref || "mp-dev-" + sid, amount_cents: cents, status: "PAID", arrived_at: String(body.arrived_at || nowSp()), expected_at: String(body.arrived_at || nowSp()).slice(0, 10) });
        let sum = 0;
        let attached = 0;
        db.transactions
          .filter((t) => t.gateway === "mercadopago" && t.status === "PAID" && ["IN_GATEWAY", "AVAILABLE"].includes(t.settlement_status))
          .forEach((t) => {
            if (sum + (t.net_cents || 0) <= cents + 100) {
              sum += t.net_cents || 0;
              t.settlement_status = "IN_SICOOB";
              t.settlement_id = sid;
              t.settled_at = String(body.arrived_at || nowSp());
              attached++;
            }
          });
        ledgerWrite(db);
        json(res, 200, { ok: true, data: { ok: true, settlement_id: sid, attached, attached_cents: sum, leftover_cents: cents - sum } });
      });
      return;
    }
    const f = Object.fromEntries(u.searchParams.entries());
    let rows = db.transactions.slice().reverse().filter((t) => {
      const d = String(t.paid_at || t.created_at || "").slice(0, 10);
      if (f.from && d < f.from) return false;
      if (f.to && d > f.to) return false;
      for (const k of ["gateway", "method", "status", "settlement_status"]) if (f[k] && t[k] !== f[k]) return false;
      if (f.q && !JSON.stringify(t).toLowerCase().includes(String(f.q).toLowerCase())) return false;
      return true;
    });
    rows = rows.map((t) => {
      const r = pixRead(t.reservation_id) || {};
      return { ...t, tourist_name: r.name || "", tourist_email: r.email || "", excursion_title: ((r.trips || [])[0] || {}).destino || "" };
    });
    const paid = rows.filter((t) => ["PAID", "PARTIALLY_REFUNDED"].includes(t.status));
    const keys = ["gross_cents", "surcharge_cents", "fee_cents", "net_cents", "refunded_cents"];
    const totals = { count: paid.length, pending_settlement_cents: 0, available_cents: 0 };
    keys.forEach((k) => (totals[k] = paid.reduce((a, t) => a + (Number(t[k]) || 0), 0)));
    const by = {};
    paid.forEach((t) => {
      by[t.gateway] = by[t.gateway] || { count: 0, net_cents: 0 };
      by[t.gateway].count++;
      by[t.gateway].net_cents += Number(t.net_cents) || 0;
      if (t.settlement_status !== "IN_SICOOB") totals.pending_settlement_cents += Number(t.net_cents) || 0;
      if (t.settlement_status === "AVAILABLE") totals.available_cents += Number(t.net_cents) || 0;
    });
    const avail = db.transactions.filter((t) => t.gateway === "mercadopago" && t.status === "PAID" && t.settlement_status === "AVAILABLE");
    json(res, 200, {
      ok: true,
      data: {
        summary: { totals, by_gateway: by, guide_payouts: { paid_cents: 0, pending_cents: 0 } },
        mp_available: { count: avail.length, cents: avail.reduce((a, t) => a + (Number(t.net_cents) || 0), 0) },
        rows,
        settlements: db.settlements.slice().reverse(),
      },
    });
  }

  /** @returns {boolean} true se tratou a rota */
  return function handlePaymentsApi(urlPath, req, res) {
    const run = (fn) => fn(req, res).catch((err) => {
      console.error("[payments]", urlPath, err && err.message);
      if (!res.headersSent) json(res, 500, { success: false, message: "Erro no pagamento" });
    });
    if (urlPath === "/api/payment_quote.php" && req.method === "GET") {
      const u = new URL(req.url, "http://localhost");
      const base = Math.round(Number(String(u.searchParams.get("amount") || "0").replace(",", ".")) * 100);
      if (!Number.isFinite(base) || base < 100) { json(res, 422, { success: false, message: "Invalid amount" }); return true; }
      Promise.all(["pix", "card_br", "card_intl"].map((m) => quote(base, m))).then(([pix, card_br, card_intl]) => {
        json(res, 200, { success: true, base_cents: base, quotes: { pix, card_br, card_intl }, mp_public_key: readEnvValue("MP_PUBLIC_KEY") || "" });
      });
      return true;
    }
    if (urlPath === "/api/mp_card.php" && req.method === "POST") { run(handleMpCard); return true; }
    if (urlPath === "/api/stripe_checkout.php" && req.method === "POST") { run(handleStripeCheckout); return true; }
    if (urlPath === "/api/stripe_return.php" && req.method === "GET") { run(handleStripeReturn); return true; }
    if (urlPath === "/api/card_action.php") { run(handleCardAction); return true; }
    if (urlPath === "/api/guides/booking-confirmations.php") { run(handleGuideConfirm); return true; }
    if (urlPath === "/api/admin/payment-ledger.php") {
      const u = new URL(req.url, "http://localhost");
      if (u.searchParams.get("export") === "csv") {
        const db = ledgerRead();
        const cols = ["reservation_id", "paid_at", "gateway", "method", "installments", "status", "currency", "charge_minor", "base_cents", "surcharge_cents", "gross_cents", "fee_cents", "net_cents", "settlement_status"];
        const lines = [cols.join(";")].concat(db.transactions.map((t) => cols.map((c) => t[c] ?? "").join(";")));
        res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="transacoes-dev.csv"' });
        res.end("﻿" + lines.join("\n"));
        return true;
      }
      handleAdminLedger(req, res);
      return true;
    }
    return false;
  };
}

/**
 * Reservas Pix no carrossel — persiste vagas ocupadas (localStorage) e aplica ao estado das saídas.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "gcv-excursao-pix-seats";
  var CART_STORAGE_KEY = "gcv-excursao-cart";
  var DATA_RESET_KEY = "gcv-exc-pix-data-reset";
  var DATA_RESET_VERSION = "jul07-caracol-removed-v1";
  var CART_ID_MIGRATION_KEY = "gcv-exc-cart-id-migration";
  var CART_ID_MIGRATION_VERSION = "dateiso-v1";
  var SEAT_RESET_KEY = "gcv-exc-pix-seat-reset";
  var SEAT_RESET_VERSION = "agvnxu-caracol-v1";
  var COMMITTED_RES_KEY = "gcv-exc-pix-committed-reservations";
  var RESET_CART_IDS = [
    "2026-07-18-mirante-da-janela-vale-da-lua",
    "18-julho-mirante-da-janela-vale-da-lua",
    "18-july-mirante-da-janela-vale-da-lua",
    "18-julio-mirante-da-janela-vale-da-lua",
    "2026-07-07-caracol",
  ];
  var MONTH_NUM = {
    janeiro: 1,
    fevereiro: 2,
    março: 3,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
    enero: 1,
    febrero: 2,
    marzo: 3,
    mayo: 5,
    junio: 6,
    julio: 7,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };
  var _version = 0;

  function readMap() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      return data && typeof data === "object" ? data : {};
    } catch (err) {
      return {};
    }
  }

  function writeMap(map) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
      _version += 1;
    } catch (err) {
      /* */
    }
  }

  function numOrZero(v) {
    var n = parseInt(String(v), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function grupoMaximo(e) {
    var n = parseInt(String(e && e.grupoMaximo), 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }

  function quorumMinimo(e) {
    var q = parseInt(String(e && e.quorumMin), 10);
    if (Number.isFinite(q) && q > 0) return q;
    return grupoMaximo(e);
  }

  function baseInscritos(e) {
    if (e && e.pessoasInscritas != null && e.pessoasInscritas !== "") {
      var total = numOrZero(e.pessoasInscritas);
      var merged = e._pixBookedExtra != null ? numOrZero(e._pixBookedExtra) : 0;
      return merged > 0 ? Math.max(0, total - merged) : total;
    }
    if (e && !e.confirmada) {
      var cap = grupoMaximo(e);
      var falta = Math.max(0, parseInt(String(e.faltamPessoas), 10) || 0);
      return Math.max(0, cap - falta);
    }
    return 0;
  }

  function getDestinos(e) {
    if (!e) return [];
    if (Array.isArray(e.destinos) && e.destinos.length) return e.destinos;
    if (e.destino) return [{ destino: e.destino }];
    return [];
  }

  function destSlugFromExcursao(e) {
    if (e && e.cartSlug) {
      return String(e.cartSlug)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    var destRaw =
      (e && e.destino) ||
      getDestinos(e)
        .map(function (d) {
          return d.destino;
        })
        .join("-") ||
      "excursao";
    return String(destRaw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function dateIsoFromExcursao(e) {
    if (e && e.dateISO) return String(e.dateISO).slice(0, 10);
    var day = parseInt(String(e && e.dayNum), 10);
    var m = MONTH_NUM[String((e && e.monthName) || "").toLowerCase()];
    if (!Number.isFinite(day) || !m) return "";
    return "2026-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function isCanonicalCartId(id) {
    return /^\d{4}-\d{2}-\d{2}-/.test(String(id || ""));
  }

  /** Converte IDs legados (18-julho-dest) para canônicos (2026-07-18-dest). */
  function normalizeCartId(cartId) {
    var id = String(cartId || "")
      .trim()
      .toLowerCase();
    if (!id || isCanonicalCartId(id)) return id;
    var m = id.match(/^(\d{1,2})-([a-z\u00e0-\u00ff]+)-(.+)$/);
    if (!m) return id;
    var monthNum = MONTH_NUM[m[2]];
    if (!monthNum) return id;
    var day = parseInt(m[1], 10);
    return (
      "2026-" +
      String(monthNum).padStart(2, "0") +
      "-" +
      String(day).padStart(2, "0") +
      "-" +
      m[3]
    );
  }

  function cartIdFromExcursao(e) {
    var iso = dateIsoFromExcursao(e);
    var dest = destSlugFromExcursao(e);
    if (iso) return iso + "-" + dest;
    var d = e && e.dayNum != null ? String(e.dayNum) : "0";
    var m =
      e && e.monthName
        ? String(e.monthName)
            .toLowerCase()
            .replace(/\s+/g, "-")
        : "x";
    return d + "-" + m + "-" + dest;
  }

  function pixBookedQty(cartId) {
    if (!cartId) return 0;
    var map = readMap();
    var canon = normalizeCartId(cartId);
    return numOrZero(map[canon]);
  }

  function totalInscritos(e) {
    return baseInscritos(e) + pixBookedQty(cartIdFromExcursao(e));
  }

  function vagasDisponiveis(e) {
    var cap = grupoMaximo(e);
    return Math.max(0, cap - totalInscritos(e));
  }

  function applyToExcursao(e) {
    if (!e) return e;
    var cartId = cartIdFromExcursao(e);
    var extra = pixBookedQty(cartId);
    if (extra <= 0) return e;

    var copy = Object.assign({}, e);
    var cap = grupoMaximo(e);
    var quorum = quorumMinimo(e);
    var total = baseInscritos(e) + extra;

    copy._pixBookedExtra = extra;
    copy.pessoasInscritas = total;
    if (total >= quorum) {
      copy.confirmada = true;
      copy.faltamPessoas = 0;
      copy.vagasRestantes = Math.max(0, cap - total);
    } else {
      copy.confirmada = false;
      copy.faltamPessoas = Math.max(0, quorum - total);
    }
    return copy;
  }

  function applyToRows(rows) {
    if (!Array.isArray(rows)) return rows;
    return rows.map(function (row) {
      return applyToExcursao(row);
    });
  }

  /**
   * @param {Array<{ cartId?: string, qty?: number }>} trips
   * @param {Record<string, number>} baseAvailByCartId vagas antes de reservar (opcional)
   * @returns {{ ok: boolean, error?: string }}
   */
  function recordTrips(trips, baseAvailByCartId) {
    if (!Array.isArray(trips) || !trips.length) return { ok: false, error: "empty" };
    var map = readMap();
    var pending = {};

    for (var i = 0; i < trips.length; i++) {
      var trip = trips[i];
      var cartId = normalizeCartId(String((trip && trip.cartId) || "").trim());
      var qty = Math.max(0, parseInt(String(trip && trip.qty), 10) || 0);
      if (!cartId || qty < 1) continue;
      pending[cartId] = (pending[cartId] || 0) + qty;
    }

    var ids = Object.keys(pending);
    if (!ids.length) return { ok: false, error: "empty" };

    for (var j = 0; j < ids.length; j++) {
      var id = ids[j];
      var add = pending[id];
      var avail =
        baseAvailByCartId && baseAvailByCartId[id] != null
          ? numOrZero(baseAvailByCartId[id])
          : null;
      if (avail != null && add > avail) {
        return { ok: false, error: "soldout", cartId: id };
      }
      map[id] = numOrZero(map[id]) + add;
    }

    writeMap(map);
    return { ok: true };
  }

  function readCommittedReservations() {
    try {
      var raw = global.localStorage.getItem(COMMITTED_RES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (err) {
      return [];
    }
  }

  function markReservationCommitted(reservationId) {
    var rid = String(reservationId || "")
      .trim()
      .toUpperCase();
    if (!rid) return;
    var committed = readCommittedReservations();
    if (committed.indexOf(rid) >= 0) return;
    committed.push(rid);
    try {
      global.localStorage.setItem(COMMITTED_RES_KEY, JSON.stringify(committed));
    } catch (err) {
      /* */
    }
  }

  function unmarkReservationCommitted(reservationId) {
    var rid = String(reservationId || "")
      .trim()
      .toUpperCase();
    if (!rid) return;
    var committed = readCommittedReservations().filter(function (code) {
      return code !== rid;
    });
    try {
      global.localStorage.setItem(COMMITTED_RES_KEY, JSON.stringify(committed));
    } catch (err) {
      /* */
    }
  }

  function reservationAlreadyCommitted(reservationId) {
    var rid = String(reservationId || "")
      .trim()
      .toUpperCase();
    if (!rid) return false;
    return readCommittedReservations().indexOf(rid) >= 0;
  }

  /**
   * Grava vagas Pix idempotente por código de reserva (evita duplicar ao reabrir confirmação).
   */
  function recordTripsForReservation(reservationId, trips, baseAvailByCartId) {
    if (reservationAlreadyCommitted(reservationId)) return { ok: true, already: true };
    var result = recordTrips(trips, baseAvailByCartId);
    if (result && result.ok) markReservationCommitted(reservationId);
    return result;
  }

  /**
   * Desfaz vagas Pix de uma reserva cancelada/removida (dev/admin).
   */
  function releaseTripsForReservation(reservationId, trips) {
    var rid = String(reservationId || "")
      .trim()
      .toUpperCase();
    if (!rid || !reservationAlreadyCommitted(rid)) return { ok: false, error: "not_committed" };
    if (!Array.isArray(trips) || !trips.length) return { ok: false, error: "empty" };

    var map = readMap();
    for (var i = 0; i < trips.length; i++) {
      var trip = trips[i];
      var cartId = normalizeCartId(String((trip && trip.cartId) || "").trim());
      var qty = Math.max(0, parseInt(String(trip && trip.qty), 10) || 0);
      if (!cartId || qty < 1) continue;
      map[cartId] = Math.max(0, numOrZero(map[cartId]) - qty);
      if (map[cartId] <= 0) delete map[cartId];
    }
    writeMap(map);
    unmarkReservationCommitted(rid);
    return { ok: true };
  }

  function version() {
    return _version;
  }

  function purgeCartItemsForIds(ids) {
    try {
      var raw = global.localStorage.getItem(CART_STORAGE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) return;
      var filtered = items.filter(function (it) {
        return ids.indexOf(it && it.id) === -1;
      });
      if (filtered.length !== items.length) {
        global.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (err) {
      /* */
    }
  }

  function migrateCartStorageItems() {
    try {
      var raw = global.localStorage.getItem(CART_STORAGE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items) || !items.length) return;
      var byId = {};
      items.forEach(function (it) {
        if (!it || !it.id) return;
        var canon = normalizeCartId(it.id);
        var qty = Math.max(1, parseInt(String(it.qty), 10) || 1);
        if (byId[canon]) {
          byId[canon].qty = Math.max(byId[canon].qty, qty);
        } else {
          var copy = Object.assign({}, it, { id: canon });
          if (!copy.dateIso && isCanonicalCartId(canon)) copy.dateIso = canon.slice(0, 10);
          byId[canon] = copy;
        }
      });
      global.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(
          Object.keys(byId).map(function (k) {
            return byId[k];
          }),
        ),
      );
    } catch (err) {
      /* */
    }
  }

  function migrateCartIdsInStorage() {
    try {
      if (global.localStorage.getItem(CART_ID_MIGRATION_KEY) === CART_ID_MIGRATION_VERSION) return;
      var map = readMap();
      var newMap = {};
      var changed = false;
      Object.keys(map).forEach(function (k) {
        var canon = normalizeCartId(k);
        if (canon !== k) changed = true;
        newMap[canon] = numOrZero(newMap[canon]) + numOrZero(map[k]);
      });
      if (changed) writeMap(newMap);
      migrateCartStorageItems();
      global.localStorage.setItem(CART_ID_MIGRATION_KEY, CART_ID_MIGRATION_VERSION);
    } catch (err) {
      /* */
    }
  }

  function runDataResets() {
    try {
      if (global.localStorage.getItem(DATA_RESET_KEY) === DATA_RESET_VERSION) return;
      var map = readMap();
      var changed = false;
      for (var i = 0; i < RESET_CART_IDS.length; i++) {
        var id = RESET_CART_IDS[i];
        if (map[id]) {
          delete map[id];
          changed = true;
        }
      }
      if (changed) writeMap(map);
      purgeCartItemsForIds(RESET_CART_IDS);
      global.localStorage.setItem(DATA_RESET_KEY, DATA_RESET_VERSION);
    } catch (err) {
      /* */
    }
  }

  function runSeatResets() {
    try {
      if (global.localStorage.getItem(SEAT_RESET_KEY) === SEAT_RESET_VERSION) return;
      if (reservationAlreadyCommitted("GCV-AGVNXU")) {
        releaseTripsForReservation("GCV-AGVNXU", [{ cartId: "2026-07-07-caracol", qty: 1 }]);
      } else {
        var map = readMap();
        var caracolId = "2026-07-07-caracol";
        if (map[caracolId]) {
          map[caracolId] = Math.max(0, numOrZero(map[caracolId]) - 1);
          if (map[caracolId] <= 0) delete map[caracolId];
          writeMap(map);
        }
      }
      unmarkReservationCommitted("GCV-AGVNXU");
      global.localStorage.setItem(SEAT_RESET_KEY, SEAT_RESET_VERSION);
    } catch (err) {
      /* */
    }
  }

  migrateCartIdsInStorage();
  runDataResets();
  runSeatResets();

  global.GcvExcBookings = {
    cartIdFromExcursao: cartIdFromExcursao,
    normalizeCartId: normalizeCartId,
    pixBookedQty: pixBookedQty,
    totalInscritos: totalInscritos,
    vagasDisponiveis: vagasDisponiveis,
    applyToExcursao: applyToExcursao,
    applyToRows: applyToRows,
    recordTrips: recordTrips,
    recordTripsForReservation: recordTripsForReservation,
    releaseTripsForReservation: releaseTripsForReservation,
    reservationAlreadyCommitted: reservationAlreadyCommitted,
    version: version,
  };
})(typeof window !== "undefined" ? window : globalThis);

/**

 * Polling de status Pix — consulta /api/check_pix_status.php a cada 2s.

 * Confirmação automática quando o webhook do banco/OpenPix marca PAID.

 */

(function (global) {

  "use strict";



  var POLL_MS = 2000;

  var DEV_WEBHOOK_SECRET = "dev-local";

  var _intervalId = null;

  var _reservationId = null;

  var _modal = null;

  var _handlers = {};

  var _pollCount = 0;
  var _pollGen = 0;
  var _statusAbort = null;

  function stopPixPolling() {
    if (_intervalId) {
      global.clearInterval(_intervalId);
      _intervalId = null;
    }
    _pollGen += 1;
    if (_statusAbort) {
      _statusAbort.abort();
      _statusAbort = null;
    }
    _pollCount = 0;
  }

  function apiUrl(path) {
    var base = "/api/";

    if (global.location.pathname.indexOf("/en/") >= 0 || global.location.pathname.indexOf("/es/") >= 0) {

      base = "../api/";

    }

    return base + path.replace(/^\//, "");

  }



  function isLocalDevHost() {

    var host = global.location && global.location.hostname;

    return host === "localhost" || host === "127.0.0.1";

  }



  function notifyPending() {

    if (typeof _handlers.onPending === "function") {

      _handlers.onPending(_modal, { reservation_id: _reservationId, poll_count: _pollCount });

    }

  }



  function checkPixStatus() {

    if (!_reservationId) return;

    var pollFor = String(_reservationId).toUpperCase();

    var gen = _pollGen;

    _pollCount += 1;

    notifyPending();

    var url =

      apiUrl("check_pix_status.php") +

      "?reservation_id=" +

      encodeURIComponent(_reservationId) +

      "&_=" +

      Date.now();

    if (_statusAbort) _statusAbort.abort();

    _statusAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

    var fetchOpts = { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" };

    if (_statusAbort) fetchOpts.signal = _statusAbort.signal;

    global

      .fetch(url, fetchOpts)

      .then(function (res) {

        if (gen !== _pollGen) return null;

        if (!res.ok) return null;

        return res.json();

      })

      .then(function (data) {

        if (gen !== _pollGen) return;

        if (!data || !data.success) return;

        var rid = String(data.reservation_id || pollFor).toUpperCase();

        if (rid !== pollFor) return;

        var status = String(data.status || "PENDING").toUpperCase();

        if (status === "PAID") {

          onPixConfirmed(data);

        } else if (status === "EXPIRED") {

          onPixExpired(data);

        }

      })

      .catch(function (err) {

        if (err && err.name === "AbortError") return;

        /* falha silenciosa — tenta de novo no próximo intervalo */

      });

  }



  function startPixPolling(modal, reservationId) {

    stopPixPolling();

    if (!modal || !reservationId) return;

    _modal = modal;

    _reservationId = reservationId;

    modal._gcvPixReservationId = reservationId;

    notifyPending();

    checkPixStatus();

    _intervalId = global.setInterval(checkPixStatus, POLL_MS);

  }



  function registerPixReservation(payload) {

    return global

      .fetch(apiUrl("register_pix_reservation.php"), {

        method: "POST",

        headers: { "Content-Type": "application/json", Accept: "application/json" },

        body: JSON.stringify(payload || {}),

      })

      .then(function (res) {

        return res.json().catch(function () {

          return { success: false };

        });

      })

      .catch(function () {

        return { success: false };

      });

  }



  function postPixWebhook(reservationId) {

    if (!reservationId) return Promise.resolve({ success: false });

    return global

      .fetch(apiUrl("pix_webhook.php?secret=" + encodeURIComponent(DEV_WEBHOOK_SECRET)), {

        method: "POST",

        headers: { "Content-Type": "application/json", Accept: "application/json" },

        body: JSON.stringify({ reservation_id: reservationId }),

      })

      .then(function (res) {

        return res.json().catch(function () {

          return { success: false };

        });

      })

      .catch(function () {

        return { success: false };

      });

  }



  /**

   * Em localhost, simula a confirmação do banco via webhook após o usuário copiar o Pix.

   * Em produção, a OpenPix chama api/openpix_webhook.php (ou pix_webhook.php com segredo manual).

   */

  function devPixAutoSimEnabled() {
    if (!isLocalDevHost()) return false;
    try {
      if (global.localStorage.getItem("gcv-dev-pix-auto") === "1") return true;
    } catch (err) {
      /* */
    }
    try {
      return new URLSearchParams(global.location.search).get("devPixAuto") === "1";
    } catch (err) {
      return false;
    }
  }

  /**
   * Simula confirmação do banco em localhost (botão dev no modal ou console).
   * GcvPixPolling.devSimulateBankWebhook('GCV-XXXXXX');
   */
  function devSimulateBankWebhook(reservationId) {
    if (!isLocalDevHost() || !reservationId) return Promise.resolve({ success: false });
    return postPixWebhook(reservationId).then(function (result) {
      if (
        result &&
        result.success &&
        String(_reservationId || "").toUpperCase() === String(reservationId).toUpperCase()
      ) {
        checkPixStatus();
      }
      return result;
    });
  }



  function onPixConfirmed(data) {

    if (_modal && _modal._gcvPixConfirmed) return;

    var rid = String((data && data.reservation_id) || _reservationId || "").toUpperCase();

    var active = String(_reservationId || "").toUpperCase();

    if (active && rid && rid !== active) return;

    if (_modal && _modal._gcvPixReservationId) {

      var modalRid = String(_modal._gcvPixReservationId).toUpperCase();

      if (rid && modalRid !== rid) return;

    }

    stopPixPolling();

    if (_handlers.onConfirmed) {

      _handlers.onConfirmed(_modal, data || { reservation_id: _reservationId });

    }

  }



  function onPixExpired(data) {

    stopPixPolling();

    if (_handlers.onExpired) {

      _handlers.onExpired(_modal, data || { reservation_id: _reservationId });

    }

  }



  function setHandlers(handlers) {

    _handlers = handlers || {};

  }



  global.addEventListener("beforeunload", stopPixPolling);



  global.GcvPixPolling = {

    POLL_MS: POLL_MS,

    setHandlers: setHandlers,

    startPixPolling: startPixPolling,

    stopPixPolling: stopPixPolling,

    checkPixStatus: checkPixStatus,

    onPixConfirmed: onPixConfirmed,

    onPixExpired: onPixExpired,

    registerPixReservation: registerPixReservation,

    postPixWebhook: postPixWebhook,

    devSimulateBankWebhook: devSimulateBankWebhook,

    isLocalDevHost: isLocalDevHost,

    apiUrl: apiUrl,

  };

})(typeof window !== "undefined" ? window : globalThis);



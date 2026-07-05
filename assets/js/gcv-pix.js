/**
 * PIX estático (BR Code / EMV) — gera payload copia-e-cola e QR Code no cliente.
 * Chave CNPJ Guia Chapada Veadeiros.
 */
(function (global) {
  "use strict";

  var PIX_KEY = "24354289000105";
  var MERCHANT_NAME = "Guia Chapada Veadeiros";
  var MERCHANT_CITY = "Alto Paraiso";

  function tlv(id, value) {
    var v = String(value);
    var len = v.length.toString().padStart(2, "0");
    return String(id) + len + v;
  }

  function crc16Pix(payload) {
    var crc = 0xffff;
    var polynom = 0x1021;
    for (var i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ polynom) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /**
   * @param {{ amount: number|string, description?: string, txid?: string }} opts
   * @returns {string}
   */
  function buildPixPayload(opts) {
    var amount = Number(opts && opts.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Valor PIX inválido");
    }

    var description = opts && opts.description ? String(opts.description).trim().slice(0, 73) : "";
    var txid = opts && opts.txid ? String(opts.txid).trim().slice(0, 25) : "***";

    var gui = tlv("00", "br.gov.bcb.pix");
    var keyField = tlv("01", PIX_KEY);
    var maiInner = gui + keyField;
    if (description) maiInner += tlv("02", description);
    var mai = tlv("26", maiInner);

    var payload = "";
    payload += tlv("00", "01");
    payload += mai;
    payload += tlv("52", "0000");
    payload += tlv("53", "986");
    payload += tlv("54", amount.toFixed(2));
    payload += tlv("58", "BR");
    payload += tlv("59", MERCHANT_NAME.slice(0, 25));
    payload += tlv("60", MERCHANT_CITY.slice(0, 15));
    payload += tlv("62", tlv("05", txid));
    payload += "6304";
    return payload + crc16Pix(payload);
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string} payload
   * @returns {Promise<void>}
   */
  function renderQrToCanvas(canvas, payload) {
    if (typeof global.QRCode === "undefined" || !global.QRCode.toCanvas) {
      return Promise.reject(new Error("QRCode library not loaded"));
    }
    return global.QRCode.toCanvas(canvas, payload, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#064e3b", light: "#ffffff" },
    });
  }

  global.GcvPix = {
    key: PIX_KEY,
    merchantName: MERCHANT_NAME,
    buildPayload: buildPixPayload,
    renderQrToCanvas: renderQrToCanvas,
  };
})(typeof window !== "undefined" ? window : globalThis);

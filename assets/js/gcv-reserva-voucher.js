/**
 * Comprovante de reserva — modal pop-up mobile-first + salvar imagem ou PDF.
 */
(function (global) {
  "use strict";

  var STRINGS = {
    pt: {
      title: "Sua reserva",
      close: "Fechar",
      code: "Código",
      status: "Status",
      amount: "Valor total",
      trips: "Passeios",
      embarque: "Embarque",
      guia: "Guia",
      email: "E-mail",
      phone: "Telefone / WhatsApp",
      person: "pessoa",
      people: "pessoas",
      statusPENDING: "Aguardando pagamento",
      statusPAID: "Pagamento confirmado",
      statusEXPIRED: "Pix expirado",
      btnImage: "Salvar imagem",
      btnPdf: "Salvar PDF",
      btnFull: "Recibo completo",
      saveImageOk: "Imagem salva. Verifique seus downloads ou galeria.",
      saveImageErr: "Não foi possível salvar a imagem. Tente PDF ou recibo completo.",
      savePdfHint: "Na janela de impressão, escolha «Salvar como PDF».",
      hint: "Guarde o comprovante junto ao recibo do banco.",
      contact: "Dúvidas: WhatsApp +55 62 98250-6891",
      openVoucher: "Ver comprovante",
      found: "Reserva encontrada.",
      qrHint: "Apresente este QR ao guia para validar sua reserva.",
      included: "O que está incluso",
      excluded: "O que não está incluso",
      inclDefault: "Passeio com guia local",
      exclDefault: "Transporte, ingresso e almoço",
    },
    en: {
      title: "Your reservation",
      close: "Close",
      code: "Code",
      status: "Status",
      amount: "Total",
      trips: "Tours",
      embarque: "Meeting point",
      guia: "Guide",
      email: "Email",
      phone: "Phone / WhatsApp",
      person: "person",
      people: "people",
      statusPENDING: "Awaiting payment",
      statusPAID: "Payment confirmed",
      statusEXPIRED: "Pix expired",
      btnImage: "Save image",
      btnPdf: "Save PDF",
      btnFull: "Full receipt",
      saveImageOk: "Image saved. Check downloads or your gallery.",
      saveImageErr: "Could not save the image. Try PDF or full receipt.",
      savePdfHint: "In the print dialog, choose «Save as PDF».",
      hint: "Keep this voucher with your bank receipt.",
      contact: "Questions: WhatsApp +55 62 98250-6891",
      openVoucher: "View voucher",
      found: "Reservation found.",
      qrHint: "Show this QR to your guide to validate your reservation.",
      included: "Included",
      excluded: "Not included",
      inclDefault: "Tour with local guide",
      exclDefault: "Transport, admission and lunch",
    },
    es: {
      title: "Su reserva",
      close: "Cerrar",
      code: "Código",
      status: "Estado",
      amount: "Valor total",
      trips: "Paseos",
      embarque: "Embarque",
      guia: "Guía",
      email: "Correo",
      phone: "Teléfono / WhatsApp",
      person: "persona",
      people: "personas",
      statusPENDING: "Esperando pago",
      statusPAID: "Pago confirmado",
      statusEXPIRED: "Pix expirado",
      btnImage: "Guardar imagen",
      btnPdf: "Guardar PDF",
      btnFull: "Recibo completo",
      saveImageOk: "Imagen guardada. Revise descargas o la galería.",
      saveImageErr: "No se pudo guardar la imagen. Pruebe PDF o recibo completo.",
      savePdfHint: "En la impresión, elija «Guardar como PDF».",
      hint: "Guarde el comprobante con el recibo del banco.",
      contact: "Dudas: WhatsApp +55 62 98250-6891",
      openVoucher: "Ver comprobante",
      found: "Reserva encontrada.",
      qrHint: "Presente este QR al guía para validar su reserva.",
      included: "Qué está incluido",
      excluded: "Qué no está incluido",
      inclDefault: "Paseo con guía local",
      exclDefault: "Transporte, entrada y almuerzo",
    },
  };

  var modalEl = null;
  var toastEl = null;
  var currentData = null;
  var currentLocale = "pt";

  var LOGO_REL = "assets/img/imagens/logo-guia-chapada-veadeiros-oficial.png";
  var _logoDataUrlCache = "";

  var EXC_STRINGS = {
    pt: {
      inclSpot: "Vaga em Excursão",
      inclGuideShort: "Guia local",
      inclEntries: "Ingresso",
      inclLanterna: "Lanterna",
      exclEntries: "Ingresso",
      exclEntriesMany: "Ingressos",
      exclTransport: "Transporte",
      exclLunch: "Almoço",
    },
    en: {
      inclSpot: "Excursion spot",
      inclGuideShort: "Local guide",
      inclEntries: "Admission",
      inclLanterna: "Flashlight",
      exclEntries: "Admission",
      exclEntriesMany: "Admissions",
      exclTransport: "Transport",
      exclLunch: "Lunch",
    },
    es: {
      inclSpot: "Cupo en excursión",
      inclGuideShort: "Guía local",
      inclEntries: "Entrada",
      inclLanterna: "Linterna",
      exclEntries: "Entrada",
      exclEntriesMany: "Entradas",
      exclTransport: "Transporte",
      exclLunch: "Almuerzo",
    },
  };

  var INGRESSO_GRATIS = { pt: "grátis", en: "free", es: "gratis" };

  function rs(loc, key) {
    var pack = STRINGS[loc] || STRINGS.pt;
    return pack[key] || STRINGS.pt[key] || "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBrl(n) {
    if (global.GcvPixReceipt && typeof global.GcvPixReceipt.formatBrl === "function") {
      return global.GcvPixReceipt.formatBrl(n);
    }
    var v = Number(n);
    if (!Number.isFinite(v)) v = 0;
    return "R$ " + v.toFixed(2).replace(".", ",");
  }

  function statusLabel(loc, status) {
    var st = String(status || "").toUpperCase();
    if (st === "PAID") return rs(loc, "statusPAID");
    if (st === "EXPIRED") return rs(loc, "statusEXPIRED");
    return rs(loc, "statusPENDING");
  }

  function statusClass(status) {
    var st = String(status || "").toUpperCase();
    if (st === "PAID") return "paid";
    if (st === "EXPIRED") return "expired";
    return "pending";
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
    var iso = t.dateIso || t.dateISO || "";
    var dest = slugDestino(t.destino);
    return iso && dest ? iso + "-" + dest : "";
  }

  function cartIdFromRow(e) {
    if (!e) return "";
    var iso = e.dateISO || e.dateIso || "";
    var dest = slugDestino(e.destino);
    return iso && dest ? iso + "-" + dest : "";
  }

  function loadExcursaoRows(loc) {
    var el = document.getElementById("gcv-excursoes-payload");
    if (!el || !el.textContent) return [];
    try {
      var data = JSON.parse(el.textContent);
      var key = loc === "en" ? "en" : loc === "es" ? "es" : "pt";
      if (Array.isArray(data[key]) && data[key].length) return data[key];
      if (Array.isArray(data.pt)) return data.pt;
    } catch (err) {
      /* */
    }
    return [];
  }

  function enrichTrips(trips, loc) {
    if (!Array.isArray(trips) || !trips.length) return [];
    var rows = loadExcursaoRows(loc);
    if (!rows.length && loc !== "pt") rows = loadExcursaoRows("pt");
    if (!rows.length) return trips.slice();
    return trips.map(function (t) {
      if (!t || t.guiaNome) return t;
      var cid = cartIdFromTrip(t);
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row || !row.guiaNome) continue;
        if (cid && cartIdFromRow(row) === cid) {
          return Object.assign({}, t, { guiaNome: String(row.guiaNome) });
        }
        var iso = t.dateIso || t.dateISO || "";
        if (iso && row.dateISO === iso && String(t.destino || "") === String(row.destino || "")) {
          return Object.assign({}, t, { guiaNome: String(row.guiaNome) });
        }
      }
      return t;
    });
  }

  function normalizeFromLookup(body, loc) {
    if (!body) return null;
    var locale = loc === "en" || loc === "es" ? loc : "pt";
    return {
      code: body.reservation_id || body.code || "",
      amount: body.amount,
      status: body.status || "PENDING",
      email: body.email || "",
      phone: body.phone || body.telefone || "",
      trips: enrichTrips(Array.isArray(body.trips) ? body.trips : [], locale),
      inclExcl: body.incl_excl || body.inclExcl || null,
      packages: Array.isArray(body.packages) ? body.packages : null,
    };
  }

  function normalizeFromPixStatus(data, id, loc) {
    if (!data) return null;
    var locale = loc === "en" || loc === "es" ? loc : data.locale === "en" || data.locale === "es" ? data.locale : "pt";
    return {
      code: id || data.reservation_id || "",
      amount: data.amount,
      status: data.status || "PENDING",
      email: data.email || "",
      phone: data.phone || data.telefone || "",
      trips: enrichTrips(Array.isArray(data.trips) ? data.trips : [], locale),
      inclExcl: data.incl_excl || data.inclExcl || null,
      packages: Array.isArray(data.packages) ? data.packages : null,
    };
  }

  function rsReceipt(loc, key) {
    if (global.GcvPixReceipt && typeof global.GcvPixReceipt.rs === "function") {
      var fromReceipt = global.GcvPixReceipt.rs(loc, key);
      if (fromReceipt) return fromReceipt;
    }
    return rs(loc, key);
  }

  function excStrings(loc) {
    return EXC_STRINGS[loc] || EXC_STRINGS.pt;
  }

  function ingressoValorPart(valor, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    if (valor == null || valor === "") return INGRESSO_GRATIS[loc];
    var n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) return INGRESSO_GRATIS[loc];
    return "R$ " + n;
  }

  function formatIngressoWithValor(label, valor, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    if (valor == null || valor === "") return String(label);
    var n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) {
      return label + " (" + INGRESSO_GRATIS[loc] + ")";
    }
    return label + " (R$ " + n + ")";
  }

  function formatIngressosMultiplos(destinos, labelPlural, locale) {
    var parts = (destinos || []).map(function (d) {
      return ingressoValorPart(d.valorIngresso, locale);
    });
    if (!parts.length) return String(labelPlural);
    return labelPlural + " (" + parts.join(" + ") + ")";
  }

  function getDestinosFromRow(e) {
    if (!e) return [];
    if (Array.isArray(e.destinos) && e.destinos.length) return e.destinos;
    if (e.destino) {
      return [
        {
          destino: e.destino,
          valorIngresso: e.valorIngresso,
        },
      ];
    }
    return [];
  }

  function excursaoCartIdFromRow(e) {
    if (global.GcvExcBookings && typeof global.GcvExcBookings.cartIdFromExcursao === "function") {
      return global.GcvExcBookings.cartIdFromExcursao(e);
    }
    var iso = e && (e.dateISO || e.dateIso) ? String(e.dateISO || e.dateIso).slice(0, 10) : "";
    var dest = String((e && e.destino) || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (iso && dest) return iso + "-" + dest;
    return "";
  }

  function normalizeCartId(cartId) {
    if (global.GcvExcBookings && typeof global.GcvExcBookings.normalizeCartId === "function") {
      return global.GcvExcBookings.normalizeCartId(cartId);
    }
    return String(cartId || "")
      .trim()
      .toLowerCase();
  }

  function lookupExcursaoRowByCartId(cartId, loc) {
    if (!cartId) return null;
    var canon = normalizeCartId(cartId);
    var rows = loadExcursaoRows(loc);
    if (!rows.length && loc !== "pt") rows = loadExcursaoRows("pt");
    for (var i = 0; i < rows.length; i++) {
      var rowId = excursaoCartIdFromRow(rows[i]);
      if (rowId === cartId || rowId === canon || normalizeCartId(rowId) === canon) return rows[i];
    }
    return null;
  }

  function lookupExcursaoRowForTrip(trip, loc) {
    if (!trip) return null;
    var byId = lookupExcursaoRowByCartId(trip.cartId || cartIdFromTrip(trip), loc);
    if (byId) return byId;
    var iso = String(trip.dateIso || trip.dateISO || "").slice(0, 10);
    var dest = String(trip.destino || "").trim();
    if (!iso && !dest) return null;
    var rows = loadExcursaoRows(loc);
    if (!rows.length && loc !== "pt") rows = loadExcursaoRows("pt");
    for (var i = 0; i < rows.length; i++) {
      if (iso && rows[i].dateISO === iso && (!dest || String(rows[i].destino || "") === dest)) {
        return rows[i];
      }
    }
    return null;
  }

  function ingressoExclLabelsFromRow(e, strings, locale, inclEntradas) {
    if (inclEntradas) return [];
    var dests = getDestinosFromRow(e);
    if (dests.length > 1) {
      return [formatIngressosMultiplos(dests, strings.exclEntriesMany, locale)];
    }
    return [formatIngressoWithValor(strings.exclEntries, e.valorIngresso, locale)];
  }

  function inclExclListsFromRow(e, loc) {
    if (!e) return null;
    var strings = excStrings(loc);
    var comTransporte = e.comTransporte === true;
    var inclEntradas = e.inclEntradas === true;
    var incl = [strings.inclSpot, strings.inclGuideShort];
    if (inclEntradas) incl.push(formatIngressoWithValor(strings.inclEntries, e.valorIngresso, loc));
    if (comTransporte) incl.push(strings.inclTransport);
    if (e.inclLanterna) incl.push(strings.inclLanterna);

    var excl;
    if (comTransporte) {
      excl = ingressoExclLabelsFromRow(e, strings, loc, inclEntradas);
      if (e.exclAlmoco !== false) excl.push(strings.exclLunch);
    } else {
      excl = ingressoExclLabelsFromRow(e, strings, loc, inclEntradas);
      excl.push(e.badge4x4 ? strings.exclTransport + " (4×4)" : strings.exclTransport);
      if (e.exclAlmoco !== false) excl.push(strings.exclLunch);
    }
    return { incl: incl, excl: excl };
  }

  function lookupInclExclByCartId(cartId, loc) {
    return inclExclListsFromRow(lookupExcursaoRowByCartId(cartId, loc), loc);
  }

  function lookupInclExclForTrip(trip, loc) {
    return inclExclListsFromRow(lookupExcursaoRowForTrip(trip, loc), loc);
  }

  function tripTitle(trip) {
    if (!trip) return "";
    if (trip.title) return String(trip.title);
    return [trip.dateLabel || trip.dateShort, trip.destino].filter(Boolean).join(" · ");
  }

  function normalizeCoveragePackage(pack, loc) {
    if (!pack) return null;
    var inclExcl = pack.inclExcl;
    if (!inclExcl || !inclExcl.incl || !inclExcl.incl.length) {
      inclExcl =
        lookupInclExclForTrip(pack, loc) ||
        lookupInclExclByCartId(pack.cartId || cartIdFromTrip(pack), loc);
    }
    if (!inclExcl || !inclExcl.incl || !inclExcl.incl.length) return null;
    return {
      title: tripTitle(pack),
      inclExcl: inclExcl,
    };
  }

  function resolveCoveragePackages(data, loc) {
    var packages = [];
    if (data && Array.isArray(data.packages) && data.packages.length) {
      packages = data.packages
        .map(function (pack) {
          return normalizeCoveragePackage(pack, loc);
        })
        .filter(Boolean);
    }
    if (!packages.length && data && Array.isArray(data.trips) && data.trips.length) {
      packages = data.trips
        .map(function (trip) {
          return normalizeCoveragePackage(trip, loc);
        })
        .filter(Boolean);
    }
    if (!packages.length && data && data.inclExcl && data.inclExcl.incl && data.inclExcl.incl.length) {
      packages = [{ title: "", inclExcl: data.inclExcl }];
    }
    return packages;
  }

  function buildCoveragePackHtml(pack, loc, showTitle) {
    if (!pack || !pack.inclExcl || !pack.inclExcl.incl || !pack.inclExcl.incl.length) return "";
    var incl = pack.inclExcl.incl;
    var excl = pack.inclExcl.excl || [];
    var html = '<div class="gcv-reserva-voucher__coverage-pack">';
    if (showTitle && pack.title) {
      html += '<p class="gcv-reserva-voucher__coverage-trip">' + escapeHtml(pack.title) + "</p>";
    }
    html +=
      '<div class="gcv-reserva-voucher__coverage-grid">' +
      '<div class="gcv-reserva-voucher__cov gcv-reserva-voucher__cov--in">' +
      "<h3>" +
      escapeHtml(rsReceipt(loc, "included")) +
      "</h3><ul>";
    incl.forEach(function (item) {
      html += "<li>" + escapeHtml(item) + "</li>";
    });
    html +=
      '</ul></div><div class="gcv-reserva-voucher__cov gcv-reserva-voucher__cov--out">' +
      "<h3>" +
      escapeHtml(rsReceipt(loc, "excluded")) +
      "</h3><ul>";
    excl.forEach(function (item) {
      html += "<li>" + escapeHtml(item) + "</li>";
    });
    html += "</ul></div></div></div>";
    return html;
  }

  function buildCoverageHtml(data, loc) {
    var packages = resolveCoveragePackages(data, loc);
    if (!packages.length) {
      packages = [
        {
          title: "",
          inclExcl: {
            incl: [rsReceipt(loc, "inclDefault")],
            excl: [rsReceipt(loc, "exclDefault")],
          },
        },
      ];
    }
    var showTitle = packages.length > 1;
    return (
      '<section class="gcv-reserva-voucher__coverage">' +
      packages
        .map(function (pack) {
          return buildCoveragePackHtml(pack, loc, showTitle);
        })
        .join("") +
      "</section>"
    );
  }

  function toReceiptData(data) {
    return {
      code: data.code,
      amount: data.amount,
      trips: data.trips,
      inclExcl: data.inclExcl || null,
      packages: data.packages || null,
    };
  }

  function assetUrl(rel) {
    return absoluteAssetUrl(rel);
  }

  function absoluteAssetUrl(rel) {
    rel = String(rel || "").replace(/^\//, "");
    var origin = global.location.origin || "";
    if (!origin || origin === "null" || origin.indexOf("file:") === 0) {
      return "https://www.guiachapadaveadeiros.com/" + rel;
    }
    return origin + "/" + rel;
  }

  function rasterizeImageElement(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return "";
    if (img.src && img.src.indexOf("data:") === 0) return img.src;
    try {
      var canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    } catch (err) {
      return "";
    }
  }

  function fetchImageAsDataUrl(url) {
    if (!url || url.indexOf("data:") === 0) return Promise.resolve(url || "");
    return fetch(url, { mode: "cors", credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("fetch image");
        return res.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve(typeof reader.result === "string" ? reader.result : "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .catch(function () {
        return "";
      });
  }

  function loadImageElement(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = url;
    });
  }

  function ensureImageDataUrl(img) {
    if (!img) return Promise.resolve("");
    if (img.getAttribute("data-gcv-embedded-src")) {
      return Promise.resolve(img.getAttribute("data-gcv-embedded-src"));
    }
    var raster = rasterizeImageElement(img);
    if (raster) {
      img.setAttribute("data-gcv-embedded-src", raster);
      return Promise.resolve(raster);
    }
    var url = img.currentSrc || img.src || "";
    if (!url) return Promise.resolve("");
    return fetchImageAsDataUrl(url).then(function (dataUrl) {
      if (!dataUrl) {
        return loadImageElement(url).then(function (loaded) {
          var fromEl = loaded ? rasterizeImageElement(loaded) : "";
          if (fromEl) img.setAttribute("data-gcv-embedded-src", fromEl);
          return fromEl;
        });
      }
      img.setAttribute("data-gcv-embedded-src", dataUrl);
      return dataUrl;
    });
  }

  function ensureCardImagesEmbedded(card) {
    if (!card) return Promise.resolve();
    var imgs = card.querySelectorAll("img");
    return Promise.all(
      Array.prototype.map.call(imgs, function (img) {
        return ensureImageDataUrl(img);
      }),
    );
  }

  function preloadLogoDataUrl() {
    if (_logoDataUrlCache) return Promise.resolve(_logoDataUrlCache);
    var url = absoluteAssetUrl(LOGO_REL);
    return fetchImageAsDataUrl(url).then(function (dataUrl) {
      if (!dataUrl) {
        return loadImageElement(url).then(function (img) {
          _logoDataUrlCache = img ? rasterizeImageElement(img) : "";
          return _logoDataUrlCache;
        });
      }
      _logoDataUrlCache = dataUrl;
      return _logoDataUrlCache;
    });
  }

  function logoSrcForCard() {
    return _logoDataUrlCache || absoluteAssetUrl(LOGO_REL);
  }

  function verifyUrl(code, loc) {
    var origin = global.location.origin || "";
    if (!origin || origin === "null" || origin.indexOf("file:") === 0) {
      origin = "https://www.guiachapadaveadeiros.com";
    }
    var path = loc === "pt" ? "/consultar-reserva.html" : "/" + loc + "/consultar-reserva.html";
    return origin + path + "?id=" + encodeURIComponent(code || "");
  }

  function ensureQrLib() {
    if (
      global.QRCode &&
      (typeof global.QRCode.toDataURL === "function" || typeof global.QRCode.toCanvas === "function")
    ) {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve) {
      var existing = document.querySelector('script[data-gcv-qrcode-lib="1"]');
      if (existing) {
        existing.addEventListener("load", function () {
          resolve(!!(global.QRCode && global.QRCode.toCanvas));
        });
        existing.addEventListener("error", function () {
          resolve(false);
        });
        return;
      }
      var script = document.createElement("script");
      script.src = assetUrl("assets/js/qrcode.min.js");
      script.defer = true;
      script.setAttribute("data-gcv-qrcode-lib", "1");
      script.onload = function () {
        resolve(
          !!(
            global.QRCode &&
            (global.QRCode.toDataURL || global.QRCode.toCanvas)
          ),
        );
      };
      script.onerror = function () {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  function buildQrPayload(data, loc) {
    var lines = [
      "GCV:1",
      data.code,
      String(data.status || "PENDING").toUpperCase(),
      String(Number(data.amount) || 0),
    ];
    (data.trips || []).forEach(function (t) {
      lines.push(
        [
          t.dateIso || t.dateShort || t.dateLabel || "",
          t.destino || "",
          t.embarque || "",
          t.hora || "",
          t.guiaNome || "",
          String(parseInt(String(t.qty), 10) || 1),
        ].join("|"),
      );
    });
    lines.push(verifyUrl(data.code, loc));
    return lines.join("\n");
  }

  function qrRenderOptions() {
    return {
      width: 128,
      margin: 1,
      errorCorrectionLevel: "L",
      color: { dark: "#064e3b", light: "#ffffff" },
    };
  }

  function replaceCanvasWithQrImg(canvas, dataUrl) {
    if (!canvas || !canvas.parentNode) return;
    var img = document.createElement("img");
    img.src = dataUrl;
    img.className = "gcv-reserva-voucher__qr-img";
    img.width = 128;
    img.height = 128;
    img.setAttribute("alt", "QR code");
    canvas.parentNode.replaceChild(img, canvas);
  }

  function renderVoucherQr(card, data, loc) {
    if (!card) return Promise.resolve(false);
    var slot = card.querySelector("[data-gcv-voucher-qr-slot]") || card.querySelector(".gcv-reserva-voucher__qr-wrap");
    if (!slot) return Promise.resolve(false);

    return ensureQrLib().then(function (ok) {
      if (!ok || typeof global.QRCode.toDataURL !== "function") return false;
      var payload = buildQrPayload(data, loc);
      var opts = qrRenderOptions();
      return global.QRCode.toDataURL(payload, opts)
        .then(function (url) {
          var existing = slot.querySelector(".gcv-reserva-voucher__qr-img, .gcv-reserva-voucher__qr, canvas");
          var img = document.createElement("img");
          img.src = url;
          img.className = "gcv-reserva-voucher__qr-img";
          img.width = 128;
          img.height = 128;
          img.setAttribute("alt", "QR code");
          if (existing) existing.replaceWith(img);
          else slot.insertBefore(img, slot.firstChild);
          return true;
        })
        .catch(function () {
          return false;
        });
    });
  }

  function waitImages(el) {
    if (!el) return Promise.resolve();
    var imgs = el.querySelectorAll("img");
    var pending = [];
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].complete) continue;
      pending.push(
        new Promise(function (resolve) {
          imgs[i].addEventListener("load", resolve, { once: true });
          imgs[i].addEventListener("error", resolve, { once: true });
        }),
      );
    }
    return Promise.all(pending);
  }

  function buildCardHtml(data, loc, qrDataUrl) {
    var trips = data.trips || [];
    var logo = logoSrcForCard();
    var html =
      '<article class="gcv-reserva-voucher__card" data-gcv-voucher-card tabindex="-1">' +
      '<header class="gcv-reserva-voucher__card-head">' +
      '<img class="gcv-reserva-voucher__logo" src="' +
      escapeHtml(logo) +
      '" alt="Guia Chapada Veadeiros" width="280" height="52" decoding="async" />' +
      '<span class="gcv-reserva-voucher__badge gcv-reserva-voucher__badge--' +
      escapeHtml(statusClass(data.status)) +
      '">' +
      escapeHtml(statusLabel(loc, data.status)) +
      "</span></header>" +
      '<dl class="gcv-reserva-voucher__meta">' +
      "<div><dt>" +
      escapeHtml(rs(loc, "code")) +
      "</dt><dd><strong>" +
      escapeHtml(data.code) +
      "</strong></dd></div>";

    if (data.amount != null) {
      html +=
        "<div><dt>" +
        escapeHtml(rs(loc, "amount")) +
        "</dt><dd><strong>" +
        escapeHtml(formatBrl(data.amount)) +
        "</strong></dd></div>";
    }

    if (data.email) {
      html +=
        "<div><dt>" +
        escapeHtml(rs(loc, "email")) +
        "</dt><dd>" +
        escapeHtml(data.email) +
        "</dd></div>";
    }
    if (data.phone || data.telefone) {
      html +=
        "<div><dt>" +
        escapeHtml(rs(loc, "phone")) +
        "</dt><dd>" +
        escapeHtml(data.phone || data.telefone) +
        "</dd></div>";
    }

    html += "</dl>";

    if (trips.length) {
      html += '<section class="gcv-reserva-voucher__trips"><h3>' + escapeHtml(rs(loc, "trips")) + "</h3><ul>";
      trips.forEach(function (t) {
        var qty = parseInt(String(t.qty), 10) || 1;
        var qtyLabel = qty === 1 ? rs(loc, "person") : rs(loc, "people");
        html += '<li class="gcv-reserva-voucher__trip">';
        if (t.dateLabel || t.dateShort) {
          html += '<span class="gcv-reserva-voucher__trip-date">' + escapeHtml(t.dateLabel || t.dateShort) + "</span>";
        }
        if (t.destino) {
          html += '<span class="gcv-reserva-voucher__trip-dest">' + escapeHtml(t.destino) + "</span>";
        }
        var sub = [];
        if (t.embarque) sub.push(rs(loc, "embarque") + ": " + t.embarque);
        if (t.hora) sub.push(t.hora);
        sub.push(qty + " " + qtyLabel);
        html += '<span class="gcv-reserva-voucher__trip-sub">' + escapeHtml(sub.join(" · ")) + "</span>";
        if (t.guiaNome) {
          html +=
            '<span class="gcv-reserva-voucher__trip-guia">' +
            escapeHtml(rs(loc, "guia") + ": " + t.guiaNome) +
            "</span>";
        }
        html += "</li>";
      });
      html += "</ul></section>";
    }

    html += buildCoverageHtml(data, loc);

    html += '<div class="gcv-reserva-voucher__qr-wrap">';
    if (qrDataUrl) {
      html +=
        '<img class="gcv-reserva-voucher__qr-img" src="' +
        escapeHtml(qrDataUrl) +
        '" width="128" height="128" alt="QR code" />';
    } else {
      html += '<div class="gcv-reserva-voucher__qr-slot" data-gcv-voucher-qr-slot aria-hidden="true"></div>';
    }
    html +=
      '<p class="gcv-reserva-voucher__qr-hint">' +
      escapeHtml(rs(loc, "qrHint")) +
      "</p></div>";

    html +=
      '<footer class="gcv-reserva-voucher__card-foot">' +
      "<p>" +
      escapeHtml(rs(loc, "hint")) +
      "</p>" +
      "<p>" +
      escapeHtml(rs(loc, "contact")) +
      "</p></footer></article>";

    return html;
  }

  function buildPrintHtml(data, loc, qrDataUrl) {
    var card = buildCardHtml(data, loc, qrDataUrl);
    return (
      '<!DOCTYPE html><html lang="' +
      (loc === "en" ? "en" : loc === "es" ? "es" : "pt-BR") +
      '"><head><meta charset="utf-8"><title>' +
      escapeHtml(rs(loc, "title")) +
      " — " +
      escapeHtml(data.code) +
      '</title><style>' +
      "*{box-sizing:border-box}body{margin:0;padding:12mm;font-family:Inter,Arial,sans-serif;color:#0f172a;background:#fff}" +
      ".gcv-reserva-voucher__card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;max-width:360px;margin:0 auto;background:#fff}" +
      ".gcv-reserva-voucher__card-head{display:flex;flex-direction:column;align-items:stretch;gap:8px;margin-bottom:12px}" +
      ".gcv-reserva-voucher__logo{display:block;width:100%;max-height:52px;object-fit:contain;object-position:left center}" +
      ".gcv-reserva-voucher__badge{font-size:10px;font-weight:700;padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#065f46;align-self:flex-start}" +
      ".gcv-reserva-voucher__meta{margin:0 0 12px;display:grid;gap:6px;font-size:11px}" +
      ".gcv-reserva-voucher__meta dt{margin:0;color:#64748b;font-weight:600}" +
      ".gcv-reserva-voucher__meta dd{margin:2px 0 0;font-size:13px}" +
      ".gcv-reserva-voucher__trips h3{margin:0 0 6px;font-size:11px;color:#064e3b}" +
      ".gcv-reserva-voucher__trips ul{margin:0;padding:0;list-style:none}" +
      ".gcv-reserva-voucher__trip{padding:8px 0;border-top:1px solid #e2e8f0;font-size:11px;line-height:1.35}" +
      ".gcv-reserva-voucher__trip-date,.gcv-reserva-voucher__trip-dest{display:block;font-weight:600}" +
      ".gcv-reserva-voucher__trip-guia{display:block;font-weight:600;color:#064e3b;margin-top:3px}" +
      ".gcv-reserva-voucher__trip-sub{display:block;color:#64748b;margin-top:2px}" +
      ".gcv-reserva-voucher__coverage{margin:10px 0 8px}" +
      ".gcv-reserva-voucher__coverage-pack+.gcv-reserva-voucher__coverage-pack{margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0}" +
      ".gcv-reserva-voucher__coverage-trip{margin:0 0 6px;font-size:10px;font-weight:700;color:#064e3b}" +
      ".gcv-reserva-voucher__coverage-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
      ".gcv-reserva-voucher__cov{border:1px solid #e2e8f0;border-radius:8px;padding:8px;font-size:9px;line-height:1.35;background:#fff}" +
      ".gcv-reserva-voucher__cov h3{margin:0 0 4px;font-size:9px;color:#064e3b}" +
      ".gcv-reserva-voucher__cov ul{margin:0;padding:0;list-style:none}" +
      ".gcv-reserva-voucher__cov--in li{color:#065f46}" +
      ".gcv-reserva-voucher__cov--out li{color:#991b1b}" +
      ".gcv-reserva-voucher__qr-wrap{display:flex;flex-direction:column;align-items:center;margin:10px 0 8px;padding-top:8px;border-top:1px dashed #e2e8f0}" +
      ".gcv-reserva-voucher__qr-img,.gcv-reserva-voucher__qr{display:block;width:128px;height:128px}" +
      ".gcv-reserva-voucher__qr-hint{margin:6px 0 0;font-size:9px;color:#64748b;text-align:center;line-height:1.35}" +
      ".gcv-reserva-voucher__card-foot{margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#64748b;line-height:1.4}" +
      "@page{size:100mm auto;margin:8mm}@media print{body{padding:0}}" +
      "</style></head><body>" +
      card +
      "</body></html>"
    );
  }

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement("div");
    modalEl.id = "gcv-reserva-voucher";
    modalEl.className = "gcv-reserva-voucher";
    modalEl.hidden = true;
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.setAttribute("aria-labelledby", "gcv-reserva-voucher-title");
    modalEl.innerHTML =
      '<button type="button" class="gcv-reserva-voucher__backdrop" data-gcv-voucher-close aria-label=""></button>' +
      '<div class="gcv-reserva-voucher__panel">' +
      '<header class="gcv-reserva-voucher__header">' +
      '<h2 id="gcv-reserva-voucher-title" class="gcv-reserva-voucher__title"></h2>' +
      '<button type="button" class="gcv-reserva-voucher__close" data-gcv-voucher-close aria-label="">×</button>' +
      "</header>" +
      '<div class="gcv-reserva-voucher__body" data-gcv-voucher-body></div>' +
      '<p class="gcv-reserva-voucher__toast" data-gcv-voucher-toast hidden role="status"></p>' +
      '<div class="gcv-reserva-voucher__actions">' +
      '<button type="button" class="gcv-reserva-voucher__btn" data-gcv-voucher-image></button>' +
      '<button type="button" class="gcv-reserva-voucher__btn gcv-reserva-voucher__btn--pdf" data-gcv-voucher-pdf></button>' +
      '<button type="button" class="gcv-reserva-voucher__btn gcv-reserva-voucher__btn--full" data-gcv-voucher-full hidden></button>' +
      "</div></div>";

    document.body.appendChild(modalEl);

    modalEl.addEventListener("click", function (e) {
      if (e.target.closest("[data-gcv-voucher-close]")) closeModal();
      if (e.target.closest("[data-gcv-voucher-image]")) saveImage();
      if (e.target.closest("[data-gcv-voucher-pdf]")) savePdf();
      if (e.target.closest("[data-gcv-voucher-full]")) saveFullReceipt();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalEl && !modalEl.hidden) closeModal();
    });

    return modalEl;
  }

  function setBodyScrollLock(on) {
    document.documentElement.classList.toggle("gcv-reserva-voucher-open", !!on);
  }

  function showToast(msg, ok) {
    if (!modalEl) return;
    var el = modalEl.querySelector("[data-gcv-voucher-toast]");
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
    el.classList.toggle("gcv-reserva-voucher__toast--ok", !!ok);
    el.classList.toggle("gcv-reserva-voucher__toast--err", !ok && !!msg);
    if (msg) {
      global.clearTimeout(showToast._t);
      showToast._t = global.setTimeout(function () {
        el.hidden = true;
        el.textContent = "";
      }, 4500);
    }
  }

  function updateModalLabels(loc) {
    if (!modalEl) return;
    modalEl.querySelector(".gcv-reserva-voucher__title").textContent = rs(loc, "title");
    modalEl.querySelector(".gcv-reserva-voucher__close").setAttribute("aria-label", rs(loc, "close"));
    modalEl.querySelector("[data-gcv-voucher-image]").textContent = rs(loc, "btnImage");
    modalEl.querySelector("[data-gcv-voucher-pdf]").textContent = rs(loc, "btnPdf");
    var fullBtn = modalEl.querySelector("[data-gcv-voucher-full]");
    if (fullBtn) {
      fullBtn.textContent = rs(loc, "btnFull");
      fullBtn.hidden = !(global.GcvPixReceipt && typeof global.GcvPixReceipt.downloadReceipt === "function");
    }
  }

  function openModal(data, locale) {
    if (!data || !data.code) return;
    currentLocale = locale === "en" || locale === "es" ? locale : "pt";
    currentData = Object.assign({}, data, {
      trips: enrichTrips(data.trips || [], currentLocale),
    });

    var modal = ensureModal();
    updateModalLabels(currentLocale);
    modal.querySelector("[data-gcv-voucher-body]").innerHTML = buildCardHtml(currentData, currentLocale);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setBodyScrollLock(true);
    showToast("", true);

    var card = modal.querySelector("[data-gcv-voucher-card]");
    preloadLogoDataUrl().then(function (logoDataUrl) {
      if (logoDataUrl && card) {
        var logoImg = card.querySelector(".gcv-reserva-voucher__logo");
        if (logoImg) {
          logoImg.src = logoDataUrl;
          logoImg.setAttribute("data-gcv-embedded-src", logoDataUrl);
        }
      }
      global.requestAnimationFrame(function () {
        renderVoucherQr(card, currentData, currentLocale).then(function () {
          if (card && card.focus) card.focus();
        });
      });
    });
  }

  function closeModal() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    modalEl.setAttribute("aria-hidden", "true");
    setBodyScrollLock(false);
    showToast("", true);
  }

  function downloadBlob(blob, filename) {
    if (!blob) return false;
    try {
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      global.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 10000);
      return true;
    } catch (err) {
      return false;
    }
  }

  function voucherFilename(code, ext) {
    var safe = String(code || "reserva").replace(/[^A-Za-z0-9-]/g, "") || "reserva";
    return "reserva-" + safe + "." + ext;
  }

  function cardElement() {
    return modalEl ? modalEl.querySelector("[data-gcv-voucher-card]") : null;
  }

  function getQrDataUrl() {
    var img = modalEl && modalEl.querySelector(".gcv-reserva-voucher__qr-img");
    if (img && img.src) return img.src;
    return "";
  }

  function prepareCardCloneForExport(el) {
    var clone = el.cloneNode(true);
    var srcImgs = el.querySelectorAll("img");
    var dstImgs = clone.querySelectorAll("img");
    for (var i = 0; i < dstImgs.length; i++) {
      var srcImg = srcImgs[i];
      var dstImg = dstImgs[i];
      if (!dstImg) continue;
      var embedded =
        (srcImg && srcImg.getAttribute("data-gcv-embedded-src")) ||
        (srcImg ? rasterizeImageElement(srcImg) : "") ||
        (dstImg.src && dstImg.src.indexOf("data:") === 0 ? dstImg.src : "");
      if (embedded) dstImg.setAttribute("src", embedded);
    }
    return clone;
  }

  function inlineStylesForExport(el) {
    var clone = prepareCardCloneForExport(el);

    function styleNode(src, dst) {
      if (!src || !dst) return;
      var cs = global.getComputedStyle(src);
      var style = "";
      for (var j = 0; j < cs.length; j++) {
        var prop = cs[j];
        style += prop + ":" + cs.getPropertyValue(prop) + ";";
      }
      dst.setAttribute("style", style);
      var srcChildren = src.children;
      var dstChildren = dst.children;
      for (var i = 0; i < srcChildren.length; i++) {
        styleNode(srcChildren[i], dstChildren[i]);
      }
    }

    styleNode(el, clone);
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    return clone;
  }

  function domToPng(el) {
    return new Promise(function (resolve, reject) {
      if (!el || typeof global.Blob === "undefined") {
        reject(new Error("no canvas"));
        return;
      }

      var rect = el.getBoundingClientRect();
      var w = Math.ceil(rect.width);
      var h = Math.ceil(rect.height);
      if (w < 1 || h < 1) {
        reject(new Error("empty"));
        return;
      }

      var scale = Math.min(3, global.devicePixelRatio || 2);
      var clone = inlineStylesForExport(el);
      var wrap = document.createElement("div");
      wrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      wrap.style.cssText = "background:#fff;margin:0;padding:0;width:" + w + "px";
      wrap.appendChild(clone);

      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        w +
        '" height="' +
        h +
        '"><foreignObject width="100%" height="100%">' +
        new XMLSerializer().serializeToString(wrap) +
        "</foreignObject></svg>";

      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = w * scale;
          canvas.height = h * scale;
          var ctx = canvas.getContext("2d");
          ctx.scale(scale, scale);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error("blob"));
          }, "image/png");
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () {
        reject(new Error("svg"));
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  function saveImage() {
    if (!currentData) return;
    var card = cardElement();
    if (!card) return;

    renderVoucherQr(card, currentData, currentLocale)
      .then(function () {
        return waitImages(card);
      })
      .then(function () {
        return ensureCardImagesEmbedded(card);
      })
      .then(function () {
        return domToPng(card);
      })
      .then(function (blob) {
        var ok = downloadBlob(blob, voucherFilename(currentData.code, "png"));
        if (!ok && global.navigator && global.navigator.share && global.navigator.canShare) {
          var file = new File([blob], voucherFilename(currentData.code, "png"), { type: "image/png" });
          if (global.navigator.canShare({ files: [file] })) {
            return global.navigator.share({ files: [file], title: currentData.code });
          }
        }
        showToast(ok ? rs(currentLocale, "saveImageOk") : rs(currentLocale, "saveImageErr"), ok);
      })
      .catch(function () {
        showToast(rs(currentLocale, "saveImageErr"), false);
      });
  }

  function savePdf() {
    if (!currentData || typeof global.Blob === "undefined") return;
    var card = cardElement();
    var runPrint = function (qrDataUrl) {
      var html = buildPrintHtml(currentData, currentLocale, qrDataUrl);
      try {
        var blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var frame = document.createElement("iframe");
        frame.setAttribute("title", rs(currentLocale, "title"));
        frame.style.cssText =
          "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
        frame.src = url;
        document.body.appendChild(frame);
        frame.onload = function () {
          global.setTimeout(function () {
            try {
              if (frame.contentWindow) {
                frame.contentWindow.focus();
                frame.contentWindow.print();
                showToast(rs(currentLocale, "savePdfHint"), true);
              }
            } catch (err) {
              showToast(rs(currentLocale, "saveImageErr"), false);
            }
          }, 300);
          global.setTimeout(function () {
            if (frame.parentNode) frame.parentNode.removeChild(frame);
            URL.revokeObjectURL(url);
          }, 120000);
        };
      } catch (err) {
        showToast(rs(currentLocale, "saveImageErr"), false);
      }
    };
    if (card) {
      renderVoucherQr(card, currentData, currentLocale)
        .then(function () {
          return waitImages(card);
        })
        .then(function () {
          runPrint(getQrDataUrl());
        })
        .catch(function () {
          runPrint("");
        });
      return;
    }
    runPrint("");
  }

  function saveFullReceipt() {
    if (!currentData || !global.GcvPixReceipt) return;
    var receipt = toReceiptData(currentData);
    var ok =
      typeof global.GcvPixReceipt.openPrintDialog === "function"
        ? global.GcvPixReceipt.openPrintDialog(receipt, currentLocale)
        : global.GcvPixReceipt.downloadReceipt(receipt, currentLocale);
    if (!ok) showToast(rs(currentLocale, "saveImageErr"), false);
  }

  function inlineSummaryHtml(data, loc) {
    return (
      '<p class="gcv-reserva-inline">' +
      escapeHtml(rs(loc, "found")) +
      ' <button type="button" class="gcv-reserva-inline__btn" data-gcv-open-voucher="' +
      escapeHtml(data.code) +
      '">' +
      escapeHtml(rs(loc, "openVoucher")) +
      "</button></p>"
    );
  }

  function bindInlineButtons(root, loc, getData) {
    if (!root || root._gcvVoucherInlineBound) return;
    root._gcvVoucherInlineBound = true;
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-gcv-open-voucher]");
      if (!btn) return;
      var data = typeof getData === "function" ? getData(btn.getAttribute("data-gcv-open-voucher")) : currentData;
      if (data) openModal(data, loc);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preloadLogoDataUrl);
  } else {
    preloadLogoDataUrl();
  }

  global.GcvReservaVoucher = {
    strings: STRINGS,
    rs: rs,
    normalizeFromLookup: normalizeFromLookup,
    normalizeFromPixStatus: normalizeFromPixStatus,
    openModal: openModal,
    closeModal: closeModal,
    saveImage: saveImage,
    savePdf: savePdf,
    inlineSummaryHtml: inlineSummaryHtml,
    bindInlineButtons: bindInlineButtons,
  };
})(typeof window !== "undefined" ? window : globalThis);

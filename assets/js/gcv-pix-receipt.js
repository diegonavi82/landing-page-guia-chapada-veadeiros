/**
 * Recibo de pagamento Pix — geração HTML, impressão e envio por e-mail.
 */
(function (global) {
  "use strict";

  var EMAIL_STORAGE_KEY = "gcv-receipt-email";

  function receiptApiUrl() {
    var base = "/api/";
    if (
      global.location.pathname.indexOf("/en/") >= 0 ||
      global.location.pathname.indexOf("/es/") >= 0
    ) {
      base = "../api/";
    }
    return base + "excursao-receipt/";
  }

  var COMPANY = {
    name: "GUIA CHAPADA VEADEIROS",
    cnpj: "24.354.289/0001-05",
    guide: "Diego Navi Marques Carvalho",
    guideShort: "Diego Navi",
    guideTitle: "Fundador e Guia Local",
    email: "contato@guiachapadaveadeiros.com",
    phone: "+55 62 98250-6891",
    logoRel: "assets/img/imagens/logo-guia-chapada-veadeiros-oficial.webp",
  };

  var STRINGS = {
    pt: {
      receiptTitle: "Recibo de confirmação de pagamento Pix — excursão",
      receiptDocTitle:
        "RECIBO DE CONFIRMAÇÃO DE RECEBIMENTO DE PAGAMENTO DE PROPOSTA COMERCIAL PARA PASSEIO",
      receiptIntro:
        "Recebemos a quantia de {{amount}} ({{amountWords}}), referente ao pagamento via Pix de passeio(s) em excursão, identificado pelo código de reserva {{code}}, conforme roteiro abaixo.",
      contractor: "Contratada",
      itinerary: "Roteiro confirmado",
      colDate: "Data",
      colDay: "Dia",
      colDest: "Destino",
      colDeparture: "Saída",
      colUnit: "Valor individual",
      colPeople: "Pessoas",
      colDayTotal: "Total do dia",
      seatsSummary: "Quantidade total de lugares reservados: {{total}} lugares ({{detail}})",
      financial: "Resumo financeiro",
      finTotal: "Valor total",
      finReceived: "Valor recebido via Pix",
      finNote: "Guarde este recibo junto ao comprovante do seu banco. A confirmação da vaga é feita após validação do pagamento.",
      included: "O que está incluso",
      excluded: "O que não está incluso",
      inclDefault: "Passeio guiado em excursão com guia local.",
      exclTransport: "Transporte / Traslado",
      exclLunch: "Almoço / Alimentação",
      exclEntries: "Entradas em parques e atrativos",
      observations: "Observações importantes",
      obs1: "Este documento comprova a intenção de reserva vinculada ao código {{code}}; a vaga é confirmada após validação do Pix.",
      obs2: "Compareça ao ponto de embarque com antecedência mínima de 15 minutos do horário informado.",
      obs3: "Em caso de dúvidas, envie o comprovante do banco pelo WhatsApp informando o código de reserva.",
      emitted: "Emitido em",
      validity: "Válido como comprovante de pagamento Pix para os passeios listados.",
      contact: "Contato",
      refLabel: "Código de reserva",
      refHint: "Informe este código no Pix e ao enviar o comprovante pelo WhatsApp.",
      emailLabel: "E-mail para receber o recibo",
      emailPlaceholder: "seu@email.com",
      emailRequiredHint: "Obrigatório — enviaremos o recibo por e-mail após a confirmação do Pix.",
      emailRequiredBlock: "Informe seu e-mail para gerar o Pix.",
      btnPrint: "Baixar recibo",
      btnEmail: "Enviar recibo por e-mail",
      downloadOk: "Recibo baixado. Abra o arquivo ou use Ctrl+P para imprimir.",
      downloadError: "Não foi possível baixar o recibo. Tente novamente.",
      btnWa: "Enviar comprovante no WhatsApp",
      emailSending: "Enviando…",
      emailSent: "Recibo enviado para {{email}}.",
      emailError: "Não foi possível enviar. Use imprimir ou WhatsApp.",
      emailInvalid: "Informe um e-mail válido.",
      perTripSuffix: "por passeio",
    },
    en: {
      receiptTitle: "Pix payment receipt — excursion",
      receiptDocTitle: "PAYMENT RECEIPT — COMMERCIAL TOUR PROPOSAL",
      receiptIntro:
        "We acknowledge payment of {{amount}} ({{amountWords}}) via Pix for the excursion(s) below, reservation code {{code}}.",
      contractor: "Provider",
      itinerary: "Confirmed itinerary",
      colDate: "Date",
      colDay: "Day",
      colDest: "Destination",
      colDeparture: "Meeting point",
      colUnit: "Price per person",
      colPeople: "People",
      colDayTotal: "Day total",
      seatsSummary: "Total seats reserved: {{total}} ({{detail}})",
      financial: "Payment summary",
      finTotal: "Total",
      finReceived: "Received via Pix",
      finNote: "Keep this receipt with your bank proof. Your spot is confirmed after payment validation.",
      included: "Included",
      excluded: "Not included",
      inclDefault: "Guided group excursion with a local guide.",
      exclTransport: "Transport / Transfer",
      exclLunch: "Lunch / Meals",
      exclEntries: "Park and attraction entry fees",
      observations: "Important notes",
      obs1: "This document is linked to reservation code {{code}}; your spot is confirmed after Pix validation.",
      obs2: "Arrive at the meeting point at least 15 minutes before the scheduled time.",
      obs3: "If you have questions, send your bank receipt via WhatsApp with the reservation code.",
      emitted: "Issued on",
      validity: "Valid as Pix payment proof for the tours listed below.",
      contact: "Contact",
      refLabel: "Reservation code",
      refHint: "Use this code in Pix and when sending proof via WhatsApp.",
      emailLabel: "Email to receive the receipt",
      emailPlaceholder: "you@email.com",
      emailRequiredHint: "Required — we'll email your receipt after Pix payment is confirmed.",
      emailRequiredBlock: "Enter your email to generate the Pix.",
      btnPrint: "Download receipt",
      btnEmail: "Email receipt",
      downloadOk: "Receipt downloaded. Open the file or use Ctrl+P to print.",
      downloadError: "Could not download the receipt. Please try again.",
      btnWa: "Send proof on WhatsApp",
      emailSending: "Sending…",
      emailSent: "Receipt sent to {{email}}.",
      emailError: "Could not send. Try print or WhatsApp.",
      emailInvalid: "Enter a valid email.",
      perTripSuffix: "per tour",
    },
    es: {
      receiptTitle: "Recibo de pago Pix — excursión",
      receiptDocTitle: "RECIBO DE CONFIRMACIÓN DE PAGO — PROPUESTA COMERCIAL DE PASEO",
      receiptIntro:
        "Recibimos {{amount}} ({{amountWords}}) vía Pix por la(s) excursión(es) abajo, código de reserva {{code}}.",
      contractor: "Contratada",
      itinerary: "Itinerario confirmado",
      colDate: "Fecha",
      colDay: "Día",
      colDest: "Destino",
      colDeparture: "Salida",
      colUnit: "Valor individual",
      colPeople: "Personas",
      colDayTotal: "Total del día",
      seatsSummary: "Total de plazas reservadas: {{total}} ({{detail}})",
      financial: "Resumen financiero",
      finTotal: "Valor total",
      finReceived: "Recibido vía Pix",
      finNote: "Guarde este recibo con el comprobante del banco. La plaza se confirma tras validar el pago.",
      included: "Incluido",
      excluded: "No incluido",
      inclDefault: "Paseo guiado en excursión con guía local.",
      exclTransport: "Transporte / Traslado",
      exclLunch: "Almuerzo / Alimentación",
      exclEntries: "Entradas a parques y atrativos",
      observations: "Observaciones importantes",
      obs1: "Este documento está vinculado al código {{code}}; la plaza se confirma tras validar el Pix.",
      obs2: "Presente en el punto de salida al menos 15 minutos antes del horario indicado.",
      obs3: "Ante dudas, envíe el comprobante del banco por WhatsApp con el código de reserva.",
      emitted: "Emitido el",
      validity: "Válido como comprobante de pago Pix para los paseos listados.",
      contact: "Contacto",
      refLabel: "Código de reserva",
      refHint: "Use este código en el Pix y al enviar el comprobante por WhatsApp.",
      emailLabel: "Correo para recibir el recibo",
      emailPlaceholder: "tu@correo.com",
      emailRequiredHint: "Obligatorio — enviaremos el recibo por correo tras confirmar el Pix.",
      emailRequiredBlock: "Indique su correo para generar el Pix.",
      btnPrint: "Descargar recibo",
      btnEmail: "Enviar recibo por correo",
      downloadOk: "Recibo descargado. Abra el archivo o use Ctrl+P para imprimir.",
      downloadError: "No se pudo descargar el recibo. Inténtelo de nuevo.",
      btnWa: "Enviar comprobante por WhatsApp",
      emailSending: "Enviando…",
      emailSent: "Recibo enviado a {{email}}.",
      emailError: "No se pudo enviar. Use imprimir o WhatsApp.",
      emailInvalid: "Indique un correo válido.",
      perTripSuffix: "por paseo",
    },
  };

  function rs(locale, key) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var pack = STRINGS[loc] || STRINGS.pt;
    return pack[key] || STRINGS.pt[key] || "";
  }

  function tpl(str, vars) {
    return String(str || "").replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars && vars[k] != null ? String(vars[k]) : "";
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function generateReservationCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "GCV-";
    for (var i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function pixTxidFromCode(code) {
    return String(code || "")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 25);
  }

  function formatBrl(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = 0;
    return "R$ " + v.toFixed(2).replace(".", ",");
  }

  function formatBrlInt(n) {
    return "R$ " + (parseInt(String(n), 10) || 0);
  }

  function absoluteAssetUrl(rel) {
    rel = String(rel || "").replace(/^\//, "");
    var origin = global.location.origin || "";
    if (!origin || origin === "null" || origin.indexOf("file:") === 0) {
      return "https://www.guiachapadaveadeiros.com/" + rel;
    }
    return origin + "/" + rel;
  }

  function siteAssetUrl(rel) {
    return absoluteAssetUrl(rel);
  }

  function isoToShort(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return m[3] + "/" + m[2] + "/" + m[1];
  }

  function weekdayFromIso(iso, locale) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00-03:00");
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
        weekday: "long",
        timeZone: "America/Sao_Paulo",
      }).format(d);
    } catch (err) {
      return "";
    }
  }

  function emissionLabel(locale) {
    try {
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
    } catch (err) {
      return new Date().toLocaleString();
    }
  }

  var PT_UNITS = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
    "dez",
    "onze",
    "doze",
    "treze",
    "catorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  var PT_TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  var PT_HUNDREDS = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  function ptBelow100(n) {
    if (n < 20) return PT_UNITS[n];
    var t = Math.floor(n / 10);
    var u = n % 10;
    return PT_TENS[t] + (u ? " e " + PT_UNITS[u] : "");
  }

  function ptBelow1000(n) {
    if (n === 100) return "cem";
    if (n < 100) return ptBelow100(n);
    var h = Math.floor(n / 100);
    var r = n % 100;
    return PT_HUNDREDS[h] + (r ? " e " + ptBelow100(r) : "");
  }

  function amountWordsPt(amount) {
    var reais = Math.floor(amount);
    var cents = Math.round((amount - reais) * 100);
    if (reais === 0 && cents === 0) return "zero reais";
    var parts = [];
    if (reais >= 1000) {
      var thousands = Math.floor(reais / 1000);
      var rest = reais % 1000;
      parts.push(thousands === 1 ? "mil" : ptBelow1000(thousands) + " mil");
      if (rest) parts.push(ptBelow1000(rest));
    } else if (reais > 0) {
      parts.push(ptBelow1000(reais));
    }
    var reaisWord = reais === 1 ? "real" : "reais";
    var text = parts.join(" e ") + " " + reaisWord;
    if (cents > 0) {
      text += " e " + ptBelow100(cents) + (cents === 1 ? " centavo" : " centavos");
    }
    return text;
  }

  function amountWords(amount, locale) {
    if (locale === "en") return amount.toFixed(2).replace(".", ",") + " Brazilian reais";
    if (locale === "es") return amount.toFixed(2).replace(".", ",") + " reales brasileños";
    return amountWordsPt(amount);
  }

  function normalizeTrips(trips) {
    return (trips || []).map(function (trip) {
      var unit = parseInt(String(trip.valorUnit), 10) || 0;
      var qty = Math.max(1, parseInt(String(trip.qty), 10) || 1);
      var dateIso = trip.dateIso || "";
      var dateShort = trip.dateShort || isoToShort(dateIso);
      return {
        dateShort: dateShort,
        weekday: trip.weekday || weekdayFromIso(dateIso, "pt"),
        destino: trip.destino || "",
        embarque: trip.embarque || "",
        hora: trip.hora || "",
        valorUnit: unit,
        qty: qty,
        totalDay: unit * qty,
      };
    });
  }

  function resolveInclExcl(data) {
    var incl = [];
    var excl = [];
    if (data && data.inclExcl) {
      incl = (data.inclExcl.incl || []).slice();
      excl = (data.inclExcl.excl || []).slice();
    } else if (data && Array.isArray(data.packages)) {
      data.packages.forEach(function (pack) {
        if (!pack || !pack.inclExcl) return;
        (pack.inclExcl.incl || []).forEach(function (x) {
          if (incl.indexOf(x) === -1) incl.push(x);
        });
        (pack.inclExcl.excl || []).forEach(function (x) {
          if (excl.indexOf(x) === -1) excl.push(x);
        });
      });
    }
    return { incl: incl, excl: excl };
  }

  function buildReceiptHtml(data, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var trips = normalizeTrips(data.trips);
    var amount = Number(data.amount);
    if (!Number.isFinite(amount)) amount = 0;
    var code = data.code || "";
    var logo = siteAssetUrl(COMPANY.logoRel);
    var emitted = emissionLabel(loc);
    var coverage = resolveInclExcl(data);
    var inclItems = coverage.incl.length ? coverage.incl : [rs(loc, "inclDefault")];
    var exclItems = coverage.excl.length
      ? coverage.excl
      : [rs(loc, "exclTransport"), rs(loc, "exclLunch"), rs(loc, "exclEntries")];

    var totalSeats = trips.reduce(function (n, t) {
      return n + t.qty;
    }, 0);
    var perTripDetail = trips
      .map(function (t) {
        return String(t.qty).padStart(2, "0");
      })
      .join(", ");
    var seatsDetail = perTripDetail + " " + rs(loc, "perTripSuffix");

    var tableRows = trips
      .map(function (t) {
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(t.dateShort) +
          "</td>" +
          "<td>" +
          escapeHtml(t.weekday) +
          "</td>" +
          "<td>" +
          escapeHtml(t.destino) +
          "</td>" +
          "<td><span class=\"pin\">📍</span> " +
          escapeHtml(t.embarque) +
          (t.hora ? " · " + escapeHtml(t.hora) : "") +
          "</td>" +
          "<td>" +
          escapeHtml(formatBrlInt(t.valorUnit)) +
          "</td>" +
          "<td>" +
          escapeHtml(String(t.qty).padStart(2, "0")) +
          "</td>" +
          "<td>" +
          escapeHtml(formatBrlInt(t.totalDay)) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    var inclList = inclItems
      .map(function (x) {
        return "<li>✓ " + escapeHtml(x) + "</li>";
      })
      .join("");
    var exclList = exclItems
      .map(function (x) {
        return "<li>✕ " + escapeHtml(x) + "</li>";
      })
      .join("");

    return (
      '<!DOCTYPE html><html lang="' +
      (loc === "en" ? "en" : loc === "es" ? "es" : "pt-BR") +
      '"><head><meta charset="utf-8"><title>' +
      escapeHtml(rs(loc, "receiptTitle")) +
      " — " +
      escapeHtml(code) +
      '</title><style>' +
      receiptCss() +
      '</style></head><body><div class="sheet">' +
      '<header class="head">' +
      '<div class="brand"><img src="' +
      escapeHtml(logo) +
      '" alt="' +
      escapeHtml(COMPANY.name) +
      '" width="180" height="48"><strong>' +
      escapeHtml(COMPANY.name) +
      "</strong></div>" +
      '<h1 class="doc-title">' +
      escapeHtml(rs(loc, "receiptDocTitle")) +
      "</h1></header>" +
      '<p class="intro">' +
      escapeHtml(
        tpl(rs(loc, "receiptIntro"), {
          amount: formatBrl(amount),
          amountWords: amountWords(amount, loc),
          code: code,
        }),
      ) +
      "</p>" +
      '<div class="party">' +
      '<div class="party-box"><h2>🏢 ' +
      escapeHtml(rs(loc, "contractor")) +
      "</h2>" +
      "<p><strong>" +
      escapeHtml(COMPANY.name) +
      "</strong></p>" +
      "<p>CNPJ " +
      escapeHtml(COMPANY.cnpj) +
      "</p>" +
      "<p>" +
      escapeHtml(COMPANY.guide) +
      "</p></div></div>" +
      '<section class="itinerary"><h2>' +
      escapeHtml(rs(loc, "itinerary")) +
      '</h2><div class="table-wrap"><table><thead><tr>' +
      "<th>" +
      escapeHtml(rs(loc, "colDate")) +
      "</th><th>" +
      escapeHtml(rs(loc, "colDay")) +
      "</th><th>" +
      escapeHtml(rs(loc, "colDest")) +
      "</th><th>" +
      escapeHtml(rs(loc, "colDeparture")) +
      "</th><th>" +
      escapeHtml(rs(loc, "colUnit")) +
      "</th><th>" +
      escapeHtml(rs(loc, "colPeople")) +
      "</th><th>" +
      escapeHtml(rs(loc, "colDayTotal")) +
      "</th></tr></thead><tbody>" +
      tableRows +
      "</tbody></table></div>" +
      '<p class="seats-bar">' +
      escapeHtml(
        tpl(rs(loc, "seatsSummary"), {
          total: String(totalSeats).padStart(2, "0"),
          detail: seatsDetail,
        }),
      ) +
      "</p></section>" +
      '<div class="cols"><section class="fin"><h2>💲 ' +
      escapeHtml(rs(loc, "financial")) +
      "</h2><ul>" +
      "<li><span>" +
      escapeHtml(rs(loc, "finTotal")) +
      "</span><strong>" +
      escapeHtml(formatBrl(amount)) +
      "</strong></li>" +
      "<li><span>" +
      escapeHtml(rs(loc, "finReceived")) +
      "</span><strong>" +
      escapeHtml(formatBrl(amount)) +
      "</strong></li></ul>" +
      '<p class="fin-note">' +
      escapeHtml(rs(loc, "finNote")) +
      "</p></section>" +
      '<section class="cov"><h3>✓ ' +
      escapeHtml(rs(loc, "included")) +
      '</h3><ul class="in">' +
      inclList +
      '</ul><h3>✕ ' +
      escapeHtml(rs(loc, "excluded")) +
      '</h3><ul class="out">' +
      exclList +
      "</ul></section></div>" +
      '<section class="obs"><h2>ℹ ' +
      escapeHtml(rs(loc, "observations")) +
      "</h2><ul>" +
      "<li>" +
      escapeHtml(tpl(rs(loc, "obs1"), { code: code })) +
      "</li>" +
      "<li>" +
      escapeHtml(rs(loc, "obs2")) +
      "</li>" +
      "<li>" +
      escapeHtml(rs(loc, "obs3")) +
      "</li></ul></section>" +
      '<footer class="foot"><div><p>📅 ' +
      escapeHtml(rs(loc, "emitted")) +
      ": " +
      escapeHtml(emitted) +
      "</p>" +
      "<p>" +
      escapeHtml(rs(loc, "validity")) +
      "</p>" +
      "<p>" +
      escapeHtml(rs(loc, "contact")) +
      ": " +
      escapeHtml(COMPANY.phone) +
      " · " +
      escapeHtml(COMPANY.email) +
      "</p></div>" +
      '<div class="sign"><p class="sign-name">' +
      escapeHtml(COMPANY.guideShort) +
      "</p><p>" +
      escapeHtml(COMPANY.guideTitle) +
      "</p></div></footer>" +
      '<p class="ref-code">Código: <strong>' +
      escapeHtml(code) +
      "</strong></p></div></body></html>"
    );
  }

  function receiptCss() {
    return [
      "*{box-sizing:border-box}",
      "body{margin:0;padding:24px;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a}",
      ".sheet{max-width:920px;margin:0 auto;background:#fff;padding:28px 32px;border:1px solid #e2e8f0;border-radius:8px}",
      ".head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}",
      ".brand img{display:block;max-height:44px;width:auto;margin-bottom:6px}",
      ".brand strong{font-size:.78rem;letter-spacing:.04em;color:#064e3b}",
      ".doc-title{margin:0;max-width:420px;font-size:.72rem;line-height:1.35;text-align:right;color:#064e3b;font-weight:800}",
      ".intro{font-size:.82rem;line-height:1.55;color:#334155;margin:0 0 18px}",
      ".party{display:flex;justify-content:flex-end;margin-bottom:18px}",
      ".party-box{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;min-width:260px;background:#f8fafc}",
      ".party-box h2{margin:0 0 8px;font-size:.72rem;color:#064e3b}",
      ".party-box p{margin:0 0 4px;font-size:.78rem}",
      ".itinerary h2{margin:0 0 8px;font-size:.82rem;color:#064e3b}",
      ".table-wrap{overflow:auto;border-radius:6px;border:1px solid #064e3b}",
      "table{width:100%;border-collapse:collapse;font-size:.72rem}",
      "thead th{background:#064e3b;color:#fff;padding:8px 6px;text-align:left;font-weight:700}",
      "tbody td{padding:8px 6px;border-top:1px solid #e2e8f0;vertical-align:top}",
      ".seats-bar{margin:0;padding:10px 12px;background:#064e3b;color:#fff;font-size:.72rem;font-weight:700;border-radius:0 0 6px 6px}",
      ".cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}",
      ".fin,.cov{border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px}",
      ".fin h2,.cov h3{margin:0 0 8px;font-size:.78rem;color:#064e3b}",
      ".fin ul{list-style:none;margin:0;padding:0}",
      ".fin li{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:.78rem}",
      ".fin-note{margin:8px 0 0;font-size:.68rem;color:#64748b;line-height:1.45}",
      ".cov ul{margin:0 0 10px;padding:0;list-style:none;font-size:.72rem;line-height:1.45}",
      ".cov .in li{color:#065f46}",
      ".cov .out li{color:#991b1b}",
      ".obs h2{margin:0 0 8px;font-size:.78rem;color:#064e3b}",
      ".obs ul{margin:0;padding-left:18px;font-size:.72rem;line-height:1.5;color:#334155}",
      ".foot{display:flex;justify-content:space-between;gap:16px;margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:.7rem;color:#64748b}",
      ".sign{text-align:right}",
      ".sign-name{font-family:Georgia,serif;font-size:1.1rem;color:#064e3b;margin:0}",
      ".ref-code{text-align:center;margin:16px 0 0;font-size:.78rem;color:#064e3b}",
      "@media print{body{background:#fff;padding:0}.sheet{border:none;border-radius:0;padding:16px}}",
    ].join("");
  }

  function receiptFilename(code) {
    var safe = String(code || "recibo").replace(/[^A-Za-z0-9-]/g, "") || "recibo";
    return "recibo-" + safe + ".html";
  }

  /** Baixa o recibo como arquivo .html (sem pop-up, funciona com bloqueador). */
  function downloadReceipt(data, locale) {
    var html = buildReceiptHtml(data, locale);
    var code = (data && data.code) || "";
    if (!html || typeof global.Blob === "undefined") return false;

    try {
      var blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = receiptFilename(code);
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

  /** Impressão via iframe oculto (fallback quando o download não for suficiente). */
  function openPrintDialog(data, locale) {
    var html = buildReceiptHtml(data, locale);
    if (!html || typeof global.Blob === "undefined") return false;

    try {
      var blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var frame = document.createElement("iframe");
      frame.setAttribute("title", "Recibo Pix");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
      frame.src = url;
      document.body.appendChild(frame);
      frame.onload = function () {
        global.setTimeout(function () {
          try {
            if (frame.contentWindow) {
              frame.contentWindow.focus();
              frame.contentWindow.print();
            }
          } catch (err) {
            /* */
          }
        }, 250);
        global.setTimeout(function () {
          if (frame.parentNode) frame.parentNode.removeChild(frame);
          URL.revokeObjectURL(url);
        }, 120000);
      };
      return true;
    } catch (err) {
      return false;
    }
  }

  function openPrint(data, locale) {
    return downloadReceipt(data, locale);
  }

  function readSavedEmail() {
    try {
      return global.localStorage.getItem(EMAIL_STORAGE_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function saveEmail(email) {
    try {
      global.localStorage.setItem(EMAIL_STORAGE_KEY, email);
    } catch (err) {
      /* */
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function sendEmail(email, data, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var html = buildReceiptHtml(data, loc);
    return fetch(receiptApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: email,
        locale: loc,
        code: data.code,
        amount: data.amount,
        html: html,
      }),
    }).then(function (res) {
      if (!res.ok) throw new Error("send failed");
      return res.json();
    });
  }

  function buildWhatsAppUrl(code, amount, trips, locale) {
    var phone = "5562982506891";
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var lines = [];
    if (loc === "en") {
      lines.push("Hi! I paid via Pix for my excursion reservation.");
      lines.push("");
      lines.push("Reservation code: " + code);
      lines.push("Amount: " + formatBrl(amount));
      lines.push("");
      lines.push("Tours:");
    } else if (loc === "es") {
      lines.push("¡Hola! Pagué con Pix mi reserva de excursión.");
      lines.push("");
      lines.push("Código de reserva: " + code);
      lines.push("Valor: " + formatBrl(amount));
      lines.push("");
      lines.push("Paseos:");
    } else {
      lines.push("Olá! Realizei o pagamento Pix da minha reserva de excursão.");
      lines.push("");
      lines.push("Código de reserva: " + code);
      lines.push("Valor: " + formatBrl(amount));
      lines.push("");
      lines.push("Passeios:");
    }
    normalizeTrips(trips).forEach(function (t) {
      lines.push(
        "• " +
          [t.dateShort, t.destino, t.qty + (loc === "en" ? " people" : loc === "es" ? " personas" : " pessoas")]
            .filter(Boolean)
            .join(" · "),
      );
    });
    lines.push("");
    lines.push(
      loc === "en"
        ? "I am sending the bank receipt attached. Thank you!"
        : loc === "es"
          ? "Envío el comprobante del banco adjunto. ¡Gracias!"
          : "Segue o comprovante do banco em anexo. Obrigado!",
    );
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function consultarReservaPageUrl(code, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var base = loc === "pt" ? "consultar-reserva.html" : loc + "/consultar-reserva.html";
    var q = "?id=" + encodeURIComponent(code || "");
    if (global.location.pathname.indexOf("/" + loc + "/") >= 0 && loc !== "pt") {
      base = "consultar-reserva.html";
    }
    return base + q;
  }

  function confirmacaoPageUrl(code, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var base = loc === "pt" ? "confirmacao.html" : loc + "/confirmacao.html";
    if (global.location.pathname.indexOf("/" + loc + "/") >= 0 && loc !== "pt") {
      base = "confirmacao.html";
    }
    return base + "?id=" + encodeURIComponent(code || "");
  }

  global.GcvPixReceipt = {
    strings: STRINGS,
    rs: rs,
    tpl: tpl,
    generateCode: generateReservationCode,
    pixTxidFromCode: pixTxidFromCode,
    buildHtml: buildReceiptHtml,
    downloadReceipt: downloadReceipt,
    openPrintDialog: openPrintDialog,
    openPrint: openPrint,
    sendEmail: sendEmail,
    receiptApiUrl: receiptApiUrl,
    readSavedEmail: readSavedEmail,
    saveEmail: saveEmail,
    isValidEmail: isValidEmail,
    buildWhatsAppUrl: buildWhatsAppUrl,
    formatBrl: formatBrl,
    normalizeTrips: normalizeTrips,
    isoToShort: isoToShort,
    consultarReservaPageUrl: consultarReservaPageUrl,
    confirmacaoPageUrl: confirmacaoPageUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);

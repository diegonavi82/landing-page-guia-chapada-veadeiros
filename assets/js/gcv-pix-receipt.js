/**
 * Recibo de pagamento Pix — geração HTML, impressão e envio por e-mail.
 */
(function (global) {
  "use strict";

  var EMAIL_STORAGE_KEY = "gcv-receipt-email";
  var PHONE_STORAGE_KEY = "gcv-receipt-phone";
  var RESERVATION_CODES_KEY = "gcv-reserva-codes";
  var RESERVATION_CODES_MAX = 30;
  var RESERVATION_CODE_RE = /^GCV-[A-Z0-9]{6}$/;

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
      receiptDocTitle: "RECIBO DE CONFIRMAÇÃO DE PAGAMENTO",
      receiptIntro:
        "Recebemos a quantia de {{amount}} ({{amountWords}}), referente ao pagamento via Pix de passeio(s) em excursão, identificado pelo código de reserva {{code}}, conforme roteiro abaixo.",
      contractor: "Contratada",
      buyer: "Cliente",
      buyerEmail: "E-mail",
      buyerPhone: "Telefone / WhatsApp",
      itinerary: "Roteiro confirmado",
      colDate: "Data",
      colDay: "Dia",
      colDest: "Destino",
      colGuide: "Guia",
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
      inclDefault: "Passeio com guia local",
      exclDefault: "Transporte, ingresso e almoço",
      observations: "Observações importantes",
      obs1: "Este documento comprova a intenção de reserva vinculada ao código {{code}}; a vaga é confirmada após validação do Pix.",
      obs2: "Compareça ao ponto de embarque com antecedência mínima de 15 minutos do horário informado.",
      obs3: "Em caso de dúvidas, envie o comprovante do banco pelo WhatsApp informando o código de reserva.",
      emitted: "Emitido em",
      validity: "Válido como comprovante de pagamento Pix para os passeios listados.",
      contact: "Contato",
      refLabel: "Código de reserva",
      emailLabel: "E-mail para receber o recibo",
      emailPlaceholder: "seu@email.com",
      emailRequiredHint: "Obrigatório — enviaremos o recibo por e-mail após a confirmação do Pix.",
      emailRequiredBlock: "Informe seu e-mail para gerar o Pix.",
      fieldFillToContinue: "Preencha para prosseguir",
      phoneLabel: "Telefone / WhatsApp",
      phonePlaceholder: "(00) 00000-0000",
      phoneRequiredHint: "Obrigatório — selecione o país (DDI) e informe o celular.",
      phoneRequiredBlock: "Informe seu celular para gerar o Pix.",
      phoneInvalid: "Informe um celular válido para o país selecionado.",
      phoneIncomplete: "Telefone incompleto — faltam dígitos.",
      phoneTooLong: "Telefone com dígitos a mais para o país selecionado.",
      phoneDdiLabel: "País / DDI",
      btnPrint: "Baixar recibo",
      btnEmail: "Enviar recibo por e-mail",
      downloadOk: "Recibo baixado. Abra o arquivo ou use Ctrl+P para imprimir.",
      downloadError: "Não foi possível baixar o recibo. Tente novamente.",
      btnWa: "Enviar comprovante no WhatsApp",
      emailSending: "Enviando…",
      emailSent: "Recibo enviado para {{email}}.",
      emailError: "Não foi possível enviar. Use imprimir ou WhatsApp.",
      emailInvalid: "E-mail com formato inválido.",
      perTripSuffix: "por passeio",
    },
    en: {
      receiptTitle: "Pix payment receipt — excursion",
      receiptDocTitle: "PAYMENT CONFIRMATION RECEIPT",
      receiptIntro:
        "We acknowledge payment of {{amount}} ({{amountWords}}) via Pix for the excursion(s) below, reservation code {{code}}.",
      contractor: "Provider",
      buyer: "Customer",
      buyerEmail: "Email",
      buyerPhone: "Phone / WhatsApp",
      itinerary: "Confirmed itinerary",
      colDate: "Date",
      colDay: "Day",
      colDest: "Destination",
      colGuide: "Guide",
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
      inclDefault: "Tour with local guide",
      exclDefault: "Transport, admission and lunch",
      observations: "Important notes",
      obs1: "This document is linked to reservation code {{code}}; your spot is confirmed after Pix validation.",
      obs2: "Arrive at the meeting point at least 15 minutes before the scheduled time.",
      obs3: "If you have questions, send your bank receipt via WhatsApp with the reservation code.",
      emitted: "Issued on",
      validity: "Valid as Pix payment proof for the tours listed below.",
      contact: "Contact",
      refLabel: "Reservation code",
      emailLabel: "Email to receive the receipt",
      emailPlaceholder: "you@email.com",
      emailRequiredHint: "Required — we'll email your receipt after Pix payment is confirmed.",
      emailRequiredBlock: "Enter your email to generate the Pix.",
      fieldFillToContinue: "Fill in to continue",
      phoneLabel: "Phone / WhatsApp",
      phonePlaceholder: "(00) 00000-0000",
      phoneRequiredHint: "Required — select the country (DDI) and enter your mobile number.",
      phoneRequiredBlock: "Enter your mobile number to generate the Pix.",
      phoneInvalid: "Enter a valid mobile number for the selected country.",
      phoneIncomplete: "Incomplete phone number — digits are missing.",
      phoneTooLong: "Phone number has too many digits for the selected country.",
      phoneDdiLabel: "Country / DDI",
      btnPrint: "Download receipt",
      btnEmail: "Email receipt",
      downloadOk: "Receipt downloaded. Open the file or use Ctrl+P to print.",
      downloadError: "Could not download the receipt. Please try again.",
      btnWa: "Send proof on WhatsApp",
      emailSending: "Sending…",
      emailSent: "Receipt sent to {{email}}.",
      emailError: "Could not send. Try print or WhatsApp.",
      emailInvalid: "Invalid email format.",
      perTripSuffix: "per tour",
    },
    es: {
      receiptTitle: "Recibo de pago Pix — excursión",
      receiptDocTitle: "RECIBO DE CONFIRMACIÓN DE PAGO",
      receiptIntro:
        "Recibimos {{amount}} ({{amountWords}}) vía Pix por la(s) excursión(es) abajo, código de reserva {{code}}.",
      contractor: "Contratada",
      buyer: "Cliente",
      buyerEmail: "Correo",
      buyerPhone: "Teléfono / WhatsApp",
      itinerary: "Itinerario confirmado",
      colDate: "Fecha",
      colDay: "Día",
      colDest: "Destino",
      colGuide: "Guía",
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
      inclDefault: "Paseo con guía local",
      exclDefault: "Transporte, entrada y almuerzo",
      observations: "Observaciones importantes",
      obs1: "Este documento está vinculado al código {{code}}; la plaza se confirma tras validar el Pix.",
      obs2: "Presente en el punto de salida al menos 15 minutos antes del horario indicado.",
      obs3: "Ante dudas, envíe el comprobante del banco por WhatsApp con el código de reserva.",
      emitted: "Emitido el",
      validity: "Válido como comprobante de pago Pix para los paseos listados.",
      contact: "Contacto",
      refLabel: "Código de reserva",
      emailLabel: "Correo para recibir el recibo",
      emailPlaceholder: "tu@correo.com",
      emailRequiredHint: "Obligatorio — enviaremos el recibo por correo tras confirmar el Pix.",
      emailRequiredBlock: "Indique su correo para generar el Pix.",
      fieldFillToContinue: "Complete para continuar",
      phoneLabel: "Teléfono / WhatsApp",
      phonePlaceholder: "(00) 00000-0000",
      phoneRequiredHint: "Obligatorio — seleccione el país (DDI) e indique el celular.",
      phoneRequiredBlock: "Indique su celular para generar el Pix.",
      phoneInvalid: "Indique un celular válido para el país seleccionado.",
      phoneIncomplete: "Teléfono incompleto — faltan dígitos.",
      phoneTooLong: "El teléfono tiene demasiados dígitos para el país seleccionado.",
      phoneDdiLabel: "País / DDI",
      btnPrint: "Descargar recibo",
      btnEmail: "Enviar recibo por correo",
      downloadOk: "Recibo descargado. Abra el archivo o use Ctrl+P para imprimir.",
      downloadError: "No se pudo descargar el recibo. Inténtelo de nuevo.",
      btnWa: "Enviar comprobante por WhatsApp",
      emailSending: "Enviando…",
      emailSent: "Recibo enviado a {{email}}.",
      emailError: "No se pudo enviar. Use imprimir o WhatsApp.",
      emailInvalid: "Formato de correo inválido.",
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

  function looksLikeIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
  }

  function looksLikeHumanDate(value) {
    var s = String(value || "").trim();
    if (!s || s.length > 48) return false;
    if (/teste\s*pix|pix\s*test/i.test(s)) return false;
    if (/[—–-]/.test(s) && /mirante|vale|cachoeira|catarata|window|lookout/i.test(s)) return false;
    return (
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s) ||
      /^\d{1,2}\s+de\s+\S+/i.test(s) ||
      /^[A-Za-zçÇáàâãéêíóôõúüÁÀÂÃÉÊÍÓÔÕÚÜ]+\s+\d{1,2},?\s+\d{4}$/.test(s) ||
      /^\d{1,2}\s+[A-Za-zçÇáàâãéêíóôõúüÁÀÂÃÉÊÍÓÔÕÚÜ]+/.test(s)
    );
  }

  function monthNameToNum(name) {
    var map = {
      janeiro: 1,
      january: 1,
      enero: 1,
      fevereiro: 2,
      february: 2,
      febrero: 2,
      marco: 3,
      março: 3,
      march: 3,
      marzo: 3,
      abril: 4,
      april: 4,
      maio: 5,
      may: 5,
      mayo: 5,
      junho: 6,
      june: 6,
      junio: 6,
      julho: 7,
      july: 7,
      julio: 7,
      agosto: 8,
      august: 8,
      setembro: 9,
      september: 9,
      septiembre: 9,
      outubro: 10,
      october: 10,
      octubre: 10,
      novembro: 11,
      november: 11,
      noviembre: 11,
      dezembro: 12,
      december: 12,
      diciembre: 12,
    };
    var key = String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return map[key] || 0;
  }

  function resolveTripIso(trip) {
    var raw = trip && (trip.dateIso || trip.dateISO || trip.date_iso || "");
    raw = String(raw || "").trim().slice(0, 10);
    if (looksLikeIsoDate(raw)) return raw;
    var day = parseInt(String((trip && trip.dayNum) || ""), 10);
    var month = monthNameToNum(trip && trip.monthName);
    var year = parseInt(String((trip && trip.year) || ""), 10);
    if (!Number.isFinite(year) || year < 2020) {
      var fromLabel = String((trip && trip.dateLabel) || "").match(/(20\d{2})/);
      year = fromLabel ? parseInt(fromLabel[1], 10) : new Date().getFullYear();
    }
    if (Number.isFinite(day) && day > 0 && month > 0) {
      return (
        String(year) +
        "-" +
        String(month).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0")
      );
    }
    var cartId = String((trip && trip.cartId) || "");
    var cartIso = cartId.match(/^(20\d{2}-\d{2}-\d{2})/);
    return cartIso ? cartIso[1] : "";
  }

  function resolveTripDateShort(trip, dateIso, locale) {
    if (trip && trip.dateShort && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(trip.dateShort).trim())) {
      return String(trip.dateShort).trim();
    }
    var fromIso = isoToShort(dateIso);
    if (fromIso) return fromIso;
    var label = String((trip && trip.dateLabel) || "").trim();
    if (looksLikeHumanDate(label)) {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(label)) return label;
      var m = label.match(/(\d{1,2}).*?(\d{4})/);
      var month = monthNameToNum(label.replace(/\d+/g, " ").trim().split(/\s+/)[0]);
      if (m && month) {
        return (
          String(parseInt(m[1], 10)).padStart(2, "0") +
          "/" +
          String(month).padStart(2, "0") +
          "/" +
          m[2]
        );
      }
      return label;
    }
    var day = parseInt(String((trip && trip.dayNum) || ""), 10);
    var monthName = String((trip && trip.monthName) || "").trim();
    if (Number.isFinite(day) && day > 0 && monthName) {
      var yMatch = String(dateIso || "").match(/^(20\d{2})/);
      var y = yMatch ? yMatch[1] : String(new Date().getFullYear());
      if (locale === "en") return monthName + " " + day + ", " + y;
      if (locale === "es") return day + " de " + monthName + " de " + y;
      return day + " de " + monthName + "/" + y;
    }
    return "";
  }

  function cleanDestino(destino) {
    return String(destino || "")
      .replace(/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s*[-:]\s*/i, "")
      .replace(/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s+/i, "")
      .trim();
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

  function normalizeTrips(trips, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    return (trips || []).map(function (trip) {
      var unit = parseInt(String(trip.valorUnit), 10) || 0;
      var qty = Math.max(1, parseInt(String(trip.qty), 10) || 1);
      var dateIso = resolveTripIso(trip);
      var dateShort = resolveTripDateShort(trip, dateIso, loc);
      var weekday = String(trip.weekday || "").trim() || weekdayFromIso(dateIso, loc);
      var destino = cleanDestino(trip.destino || "");
      if (!destino && trip.dateLabel && !looksLikeHumanDate(trip.dateLabel)) {
        destino = cleanDestino(trip.dateLabel);
      }
      return {
        dateIso: dateIso,
        dateShort: dateShort || "—",
        weekday: weekday || "—",
        dateLabel: dateShort || String(trip.dateLabel || "").trim(),
        destino: destino,
        guiaNome: trip.guiaNome || "",
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
    var trips = normalizeTrips(data.trips, loc);
    var amount = Number(data.amount);
    if (!Number.isFinite(amount)) amount = 0;
    var code = data.code || "";
    var buyerEmail = String((data && data.email) || "").trim();
    var buyerPhoneRaw = String((data && (data.phone || data.telefone)) || "").trim();
    var buyerPhone = buyerPhoneRaw
      ? isValidPhone(buyerPhoneRaw)
        ? formatPhoneIntl(buyerPhoneRaw)
        : buyerPhoneRaw
      : "";
    var logo = siteAssetUrl(COMPANY.logoRel);
    var emitted = emissionLabel(loc);
    var coverage = resolveInclExcl(data);
    var inclItems = coverage.incl.length ? coverage.incl : [rs(loc, "inclDefault")];
    var exclItems = coverage.excl.length ? coverage.excl : [rs(loc, "exclDefault")];

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
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;vertical-align:top;">' +
          "<strong>" +
          escapeHtml(t.dateShort) +
          "</strong>" +
          (t.weekday && t.weekday !== "—"
            ? '<br><span style="color:#64748b;font-size:11px;">' + escapeHtml(t.weekday) + "</span>"
            : "") +
          "</td>" +
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;vertical-align:top;">' +
          escapeHtml(t.destino || "—") +
          "</td>" +
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;vertical-align:top;">' +
          escapeHtml(t.guiaNome || "—") +
          "</td>" +
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;vertical-align:top;">' +
          escapeHtml(t.embarque || "—") +
          (t.hora ? " · " + escapeHtml(t.hora) : "") +
          "</td>" +
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;text-align:right;vertical-align:top;">' +
          escapeHtml(formatBrlInt(t.valorUnit)) +
          "</td>" +
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;text-align:center;vertical-align:top;">' +
          escapeHtml(String(t.qty).padStart(2, "0")) +
          "</td>" +
          '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#0f172a;text-align:right;font-weight:700;vertical-align:top;">' +
          escapeHtml(formatBrlInt(t.totalDay)) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    var inclList = inclItems
      .map(function (x) {
        return (
          '<li style="margin:0 0 4px;padding:0;font-size:12px;color:#065f46;list-style:none;">✓ ' +
          escapeHtml(x) +
          "</li>"
        );
      })
      .join("");
    var exclList = exclItems
      .map(function (x) {
        return (
          '<li style="margin:0 0 4px;padding:0;font-size:12px;color:#991b1b;list-style:none;">✕ ' +
          escapeHtml(x) +
          "</li>"
        );
      })
      .join("");

    var th =
      'style="padding:10px 8px;background:#0f3d2e;color:#fff;font-size:11px;font-weight:700;text-align:left;"';
    var thR =
      'style="padding:10px 8px;background:#0f3d2e;color:#fff;font-size:11px;font-weight:700;text-align:right;"';
    var thC =
      'style="padding:10px 8px;background:#0f3d2e;color:#fff;font-size:11px;font-weight:700;text-align:center;"';

    return (
      '<!DOCTYPE html><html lang="' +
      (loc === "en" ? "en" : loc === "es" ? "es" : "pt-BR") +
      '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>" +
      escapeHtml(code) +
      " - Reserva</title>" +
      "<style>" +
      receiptCss() +
      "</style></head><body style=\"margin:0;padding:0;background:#eef2f0;font-family:Georgia,'Times New Roman',serif;color:#0f172a;\">" +
      '<div style="display:none;max-height:0;overflow:hidden;">' +
      escapeHtml(rs(loc, "receiptIntro").replace(/\{\{.*?\}\}/g, "")) +
      "</div>" +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f0;padding:24px 12px;">' +
      '<tr><td align="center">' +
      '<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d7e2db;box-shadow:0 8px 28px rgba(15,61,46,.08);">' +
      '<tr><td style="background:linear-gradient(135deg,#0f3d2e 0%,#1a5c45 100%);padding:28px 28px 22px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td style="vertical-align:middle;">' +
      '<img src="' +
      escapeHtml(logo) +
      '" alt="' +
      escapeHtml(COMPANY.name) +
      '" width="160" height="42" style="display:block;max-width:160px;height:auto;border:0;">' +
      "</td>" +
      '<td align="right" style="vertical-align:middle;">' +
      '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a7f3d0;">' +
      escapeHtml(rs(loc, "refLabel")) +
      "</p>" +
      '<p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.04em;">' +
      escapeHtml(code) +
      "</p></td></tr></table>" +
      '<h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:22px;line-height:1.25;color:#ffffff;font-weight:700;">' +
      escapeHtml(rs(loc, "receiptDocTitle")) +
      "</h1></td></tr>" +
      '<tr><td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;">' +
      '<p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#334155;">' +
      escapeHtml(
        tpl(rs(loc, "receiptIntro"), {
          amount: formatBrl(amount),
          amountWords: amountWords(amount, loc),
          code: code,
        }),
      ) +
      "</p>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8faf8;border:1px solid #d7e2db;border-radius:12px;">' +
      "<tr><td style=\"padding:14px 16px;\">" +
      '<p style="margin:0 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#0f3d2e;font-weight:700;">' +
      escapeHtml(rs(loc, "contractor")) +
      "</p>" +
      '<p style="margin:0 0 2px;font-size:15px;font-weight:800;color:#0f3d2e;">' +
      escapeHtml(COMPANY.name) +
      "</p>" +
      '<p style="margin:0;font-size:12px;color:#475569;">CNPJ ' +
      escapeHtml(COMPANY.cnpj) +
      " · " +
      escapeHtml(COMPANY.guide) +
      "</p></td></tr></table>" +
      (buyerEmail || buyerPhone
        ? '<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">' +
          "<tr><td style=\"padding:14px 16px;\">" +
          '<p style="margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#1e3a8a;font-weight:700;">' +
          escapeHtml(rs(loc, "buyer")) +
          "</p>" +
          (buyerEmail
            ? '<p style="margin:0 0 4px;font-size:13px;color:#334155;"><strong>' +
              escapeHtml(rs(loc, "buyerEmail")) +
              ":</strong> " +
              escapeHtml(buyerEmail) +
              "</p>"
            : "") +
          (buyerPhone
            ? '<p style="margin:0;font-size:13px;color:#334155;"><strong>' +
              escapeHtml(rs(loc, "buyerPhone")) +
              ":</strong> " +
              escapeHtml(buyerPhone) +
              "</p>"
            : "") +
          "</td></tr></table>"
        : "") +
      '<h2 style="margin:0 0 10px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#0f3d2e;font-weight:800;">' +
      escapeHtml(rs(loc, "itinerary")) +
      "</h2>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #0f3d2e;margin:0 0 8px;">' +
      "<thead><tr>" +
      "<th " +
      th +
      ">" +
      escapeHtml(rs(loc, "colDate")) +
      "</th>" +
      "<th " +
      th +
      ">" +
      escapeHtml(rs(loc, "colDest")) +
      "</th>" +
      "<th " +
      th +
      ">" +
      escapeHtml(rs(loc, "colGuide")) +
      "</th>" +
      "<th " +
      th +
      ">" +
      escapeHtml(rs(loc, "colDeparture")) +
      "</th>" +
      "<th " +
      thR +
      ">" +
      escapeHtml(rs(loc, "colUnit")) +
      "</th>" +
      "<th " +
      thC +
      ">" +
      escapeHtml(rs(loc, "colPeople")) +
      "</th>" +
      "<th " +
      thR +
      ">" +
      escapeHtml(rs(loc, "colDayTotal")) +
      "</th></tr></thead><tbody>" +
      tableRows +
      "</tbody></table>" +
      '<p style="margin:0 0 20px;padding:10px 12px;background:#0f3d2e;color:#fff;font-size:12px;font-weight:700;border-radius:0 0 10px 10px;">' +
      escapeHtml(
        tpl(rs(loc, "seatsSummary"), {
          total: String(totalSeats).padStart(2, "0"),
          detail: seatsDetail,
        }),
      ) +
      "</p>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr>' +
      '<td width="50%" valign="top" style="padding:0 6px 0 0;">' +
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;">' +
      '<p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#0f3d2e;">💲 ' +
      escapeHtml(rs(loc, "financial")) +
      "</p>" +
      '<p style="margin:0 0 6px;font-size:13px;color:#334155;"><span>' +
      escapeHtml(rs(loc, "finTotal")) +
      ':</span> <strong style="float:right;color:#0f3d2e;">' +
      escapeHtml(formatBrl(amount)) +
      "</strong></p>" +
      '<p style="margin:0 0 8px;font-size:13px;color:#334155;"><span>' +
      escapeHtml(rs(loc, "finReceived")) +
      ':</span> <strong style="float:right;color:#0f3d2e;">' +
      escapeHtml(formatBrl(amount)) +
      "</strong></p>" +
      '<p style="margin:0;font-size:11px;line-height:1.45;color:#64748b;">' +
      escapeHtml(rs(loc, "finNote")) +
      "</p></div></td>" +
      '<td width="50%" valign="top" style="padding:0 0 0 6px;">' +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;">' +
      '<p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#065f46;">✓ ' +
      escapeHtml(rs(loc, "included")) +
      "</p><ul style=\"margin:0 0 10px;padding:0;\">" +
      inclList +
      '</ul><p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#991b1b;">✕ ' +
      escapeHtml(rs(loc, "excluded")) +
      '</p><ul style="margin:0;padding:0;">' +
      exclList +
      "</ul></div></td></tr></table>" +
      '<div style="margin:0 0 18px;padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">' +
      '<p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#1e3a8a;">ℹ ' +
      escapeHtml(rs(loc, "observations")) +
      "</p>" +
      '<ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5;color:#334155;">' +
      "<li>" +
      escapeHtml(tpl(rs(loc, "obs1"), { code: code })) +
      "</li><li>" +
      escapeHtml(rs(loc, "obs2")) +
      "</li><li>" +
      escapeHtml(rs(loc, "obs3")) +
      "</li></ul></div>" +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:14px;">' +
      "<tr><td style=\"font-size:11px;color:#64748b;line-height:1.5;\">" +
      "📅 " +
      escapeHtml(rs(loc, "emitted")) +
      ": " +
      escapeHtml(emitted) +
      "<br>" +
      escapeHtml(rs(loc, "validity")) +
      "<br>" +
      escapeHtml(rs(loc, "contact")) +
      ": " +
      escapeHtml(COMPANY.phone) +
      " · " +
      escapeHtml(COMPANY.email) +
      '</td><td align="right" style="font-family:Georgia,serif;color:#0f3d2e;">' +
      '<p style="margin:0;font-size:16px;">' +
      escapeHtml(COMPANY.guideShort) +
      '</p><p style="margin:2px 0 0;font-size:11px;font-family:Arial,Helvetica,sans-serif;color:#64748b;">' +
      escapeHtml(COMPANY.guideTitle) +
      "</p></td></tr></table>" +
      '<p style="margin:18px 0 8px;text-align:center;font-size:13px;color:#0f3d2e;">' +
      escapeHtml(rs(loc, "refLabel")) +
      ": <strong>" +
      escapeHtml(code) +
      "</strong></p>" +
      "</td></tr></table></td></tr></table>" +
      '<!-- gcv-date-cells:' +
      escapeHtml(trips.map(function (t) {
        return t.dateShort;
      }).join("|")) +
      " --></body></html>"
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
      ".party{display:flex;justify-content:flex-start;margin-bottom:18px}",
      ".party-box{padding:0;min-width:260px}",
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

  function readSavedPhone() {
    try {
      return global.localStorage.getItem(PHONE_STORAGE_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function savePhone(phone) {
    try {
      global.localStorage.setItem(PHONE_STORAGE_KEY, phone);
    } catch (err) {
      /* */
    }
  }

  var PHONE_DDI_STORAGE_KEY = "gcv-receipt-phone-ddi";
  var PHONE_COUNTRIES = [
    { iso: "br", dial: "55", name: { pt: "Brasil", en: "Brazil", es: "Brasil" }, min: 11, max: 11, mask: "br" },
  ];
  var _phoneCountriesReady = null;

  function phoneDdiDataUrl() {
    var base = "/assets/data/phone-ddi.json";
    if (
      global.location.pathname.indexOf("/en/") >= 0 ||
      global.location.pathname.indexOf("/es/") >= 0
    ) {
      base = "../assets/data/phone-ddi.json";
    }
    return base;
  }

  function ensurePhoneCountries() {
    if (_phoneCountriesReady) return _phoneCountriesReady;
    _phoneCountriesReady = fetch(phoneDdiDataUrl(), { cache: "force-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("ddi fetch failed");
        return res.json();
      })
      .then(function (list) {
        if (Array.isArray(list) && list.length) {
          PHONE_COUNTRIES = list.filter(function (c) {
            return c && c.iso && c.dial;
          });
        }
        return PHONE_COUNTRIES;
      })
      .catch(function () {
        return PHONE_COUNTRIES;
      });
    return _phoneCountriesReady;
  }

  function getPhoneCountries() {
    return PHONE_COUNTRIES.slice();
  }

  function findPhoneCountry(isoOrDial) {
    var key = String(isoOrDial || "").trim().toLowerCase().replace(/^\+/, "");
    if (!key) return PHONE_COUNTRIES[0] || { iso: "br", dial: "55", min: 8, max: 15, mask: "default", name: { pt: "Brasil", en: "Brazil", es: "Brasil" } };
    for (var i = 0; i < PHONE_COUNTRIES.length; i++) {
      if (PHONE_COUNTRIES[i].iso === key) return PHONE_COUNTRIES[i];
    }
    for (var j = 0; j < PHONE_COUNTRIES.length; j++) {
      if (PHONE_COUNTRIES[j].dial === key) return PHONE_COUNTRIES[j];
    }
    return PHONE_COUNTRIES[0] || { iso: "br", dial: "55", min: 8, max: 15, mask: "default", name: { pt: "Brasil", en: "Brazil", es: "Brasil" } };
  }

  function readSavedPhoneDdi() {
    try {
      return global.localStorage.getItem(PHONE_DDI_STORAGE_KEY) || "br";
    } catch (err) {
      return "br";
    }
  }

  function savePhoneDdi(iso) {
    try {
      global.localStorage.setItem(PHONE_DDI_STORAGE_KEY, findPhoneCountry(iso).iso);
    } catch (err) {
      /* */
    }
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  /** Número nacional sem DDI, limitado ao máximo do país. */
  function nationalPhoneDigits(phone, iso) {
    var country = findPhoneCountry(iso || "br");
    var digits = digitsOnly(phone);
    if (digits.indexOf(country.dial) === 0 && digits.length > country.dial.length + (country.min - 1)) {
      digits = digits.slice(country.dial.length);
    }
    return digits.slice(0, country.max);
  }

  function formatPhoneMask(phone, iso) {
    var country = findPhoneCountry(iso || "br");
    var d = nationalPhoneDigits(phone, country.iso);
    if (!d) return "";
    if (country.mask === "br") {
      if (d.length <= 2) return "(" + d;
      if (d.length <= 7) return "(" + d.slice(0, 2) + ") " + d.slice(2);
      if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
      return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    }
    if (country.mask === "us") {
      if (d.length <= 3) return "(" + d;
      if (d.length <= 6) return "(" + d.slice(0, 3) + ") " + d.slice(3);
      return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
    }
    if (country.mask === "ar") {
      if (d.length <= 2) return d;
      if (d.length <= 6) return d.slice(0, 2) + " " + d.slice(2);
      return d.slice(0, 2) + " " + d.slice(2, 6) + "-" + d.slice(6);
    }
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + " " + d.slice(3);
    if (d.length <= 9) return d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6);
    return d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6, 9) + " " + d.slice(9);
  }

  function isValidPhone(phone, iso) {
    return !getPhoneValidationIssue(phone, iso);
  }

  /** null = ok; "empty" | "short" | "long" */
  function getPhoneValidationIssue(phone, iso) {
    var country = findPhoneCountry(iso || "br");
    var len = nationalPhoneDigits(phone, country.iso).length;
    if (!len) return "empty";
    if (len < country.min) return "short";
    if (len > country.max) return "long";
    return null;
  }

  function phoneValidationMessage(phone, iso, locale) {
    var issue = getPhoneValidationIssue(phone, iso);
    if (!issue) return "";
    if (issue === "empty") return rs(locale, "fieldFillToContinue");
    if (issue === "short") return rs(locale, "phoneIncomplete");
    if (issue === "long") return rs(locale, "phoneTooLong");
    return rs(locale, "phoneInvalid");
  }

  function normalizePhone(phone, iso) {
    return formatPhoneMask(phone, iso);
  }

  /** Ex.: +55 62 99999-9999 */
  function formatPhoneIntl(phone, iso) {
    var country = findPhoneCountry(iso || "br");
    var d = nationalPhoneDigits(phone, country.iso);
    if (!d) return "";
    var national = formatPhoneMask(d, country.iso);
    return "+" + country.dial + (national ? " " + national : "");
  }

  function phonePlaceholderFor(iso) {
    var country = findPhoneCountry(iso || "br");
    if (country.mask === "br") return "(00) 00000-0000";
    if (country.mask === "us") return "(000) 000-0000";
    if (country.mask === "ar") return "11 0000-0000";
    return "000 000 000";
  }

  function phoneCountryLabel(country, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var name = (country.name && (country.name[loc] || country.name.en || country.name.pt)) || country.iso.toUpperCase();
    return "+" + country.dial + " " + name;
  }

  function phoneCountryName(country, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    return (country.name && (country.name[loc] || country.name.en || country.name.pt)) || country.iso.toUpperCase();
  }

  function buildPhoneDdiListHtml(locale, selectedIso, query) {
    var selected = findPhoneCountry(selectedIso || "br").iso;
    var q = String(query || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    return PHONE_COUNTRIES.filter(function (c) {
      if (!q) return true;
      var name = phoneCountryName(c, loc)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return (
        name.indexOf(q) >= 0 ||
        ("+" + c.dial).indexOf(q) >= 0 ||
        c.dial.indexOf(q) >= 0 ||
        c.iso.indexOf(q) >= 0
      );
    })
      .map(function (c) {
        return (
          '<button type="button" class="gcv-pix-modal__ddi-option' +
          (c.iso === selected ? " is-selected" : "") +
          '" role="option" data-gcv-ddi-iso="' +
          c.iso +
          '" aria-selected="' +
          (c.iso === selected ? "true" : "false") +
          '">' +
          '<span class="fi fi-' +
          c.iso +
          ' gcv-pix-modal__ddi-option-flag" aria-hidden="true"></span>' +
          '<span class="gcv-pix-modal__ddi-option-name">' +
          phoneCountryName(c, loc) +
          "</span>" +
          '<span class="gcv-pix-modal__ddi-option-dial">+' +
          c.dial +
          "</span></button>"
        );
      })
      .join("");
  }

  // Pré-carrega a lista completa de DDIs.
  ensurePhoneCountries();

  function normalizeReservationCode(code) {
    return String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
  }

  function isValidReservationCode(code) {
    return RESERVATION_CODE_RE.test(normalizeReservationCode(code));
  }

  function readSavedReservationCodes() {
    try {
      var raw = global.localStorage.getItem(RESERVATION_CODES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr
        .map(function (item) {
          if (!item) return null;
          if (typeof item === "string") {
            var codeOnly = normalizeReservationCode(item);
            return codeOnly && RESERVATION_CODE_RE.test(codeOnly) ? { code: codeOnly, savedAt: "" } : null;
          }
          var code = normalizeReservationCode(item.code);
          if (!RESERVATION_CODE_RE.test(code)) return null;
          return {
            code: code,
            email: item.email ? String(item.email).trim().toLowerCase() : "",
            phone: item.phone ? String(item.phone).trim() : "",
            savedAt: item.savedAt ? String(item.savedAt) : "",
          };
        })
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function writeSavedReservationCodes(list) {
    try {
      global.localStorage.setItem(RESERVATION_CODES_KEY, JSON.stringify(list || []));
    } catch (err) {
      /* */
    }
  }

  /**
   * @param {string} code
   * @param {{ email?: string, phone?: string }} [opts]
   */
  function saveReservationCode(code, opts) {
    var normalized = normalizeReservationCode(code);
    if (!RESERVATION_CODE_RE.test(normalized)) return false;
    var email =
      opts && opts.email && isValidEmail(opts.email) ? String(opts.email).trim().toLowerCase() : "";
    var phone =
      opts && opts.phone && isValidPhone(opts.phone, opts.phoneIso || readSavedPhoneDdi())
        ? formatPhoneIntl(opts.phone, opts.phoneIso || readSavedPhoneDdi())
        : opts && opts.phone
          ? String(opts.phone).trim()
          : "";
    if (opts && opts.phoneIso) savePhoneDdi(opts.phoneIso);
    var list = readSavedReservationCodes().filter(function (item) {
      return item.code !== normalized;
    });
    list.unshift({
      code: normalized,
      email: email,
      phone: phone,
      savedAt: new Date().toISOString(),
    });
    if (list.length > RESERVATION_CODES_MAX) list.length = RESERVATION_CODES_MAX;
    writeSavedReservationCodes(list);
    if (email) saveEmail(email);
    if (phone) savePhone(phone);
    return true;
  }

  function getLastReservationCode() {
    var list = readSavedReservationCodes();
    return list.length ? list[0].code : "";
  }

  function getSavedEmailForCode(code) {
    var normalized = normalizeReservationCode(code);
    var list = readSavedReservationCodes();
    for (var i = 0; i < list.length; i++) {
      if (list[i].code === normalized && list[i].email) return list[i].email;
    }
    return "";
  }

  function getSavedPhoneForCode(code) {
    var normalized = normalizeReservationCode(code);
    var list = readSavedReservationCodes();
    for (var i = 0; i < list.length; i++) {
      if (list[i].code === normalized && list[i].phone) return list[i].phone;
    }
    return "";
  }

  /**
   * Validação prática universal de e-mail (formato local@domínio.tld).
   * Não verifica se a caixa existe — só a estrutura.
   */
  function isValidEmail(email) {
    return !getEmailValidationIssue(email);
  }

  /** null = ok; "empty" | "format" */
  function getEmailValidationIssue(email) {
    var s = String(email || "").trim();
    if (!s) return "empty";
    if (s.length > 254) return "format";
    // Padrão amplamente usado (HTML5-like / RFC 5322 simplificado)
    if (
      !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
        s,
      )
    ) {
      return "format";
    }
    return null;
  }

  function emailValidationMessage(email, locale) {
    var issue = getEmailValidationIssue(email);
    if (!issue) return "";
    if (issue === "empty") return rs(locale, "fieldFillToContinue");
    return rs(locale, "emailInvalid");
  }

  function receiptPngFilename(code) {
    var safe = String(code || "recibo").replace(/[^A-Za-z0-9-]/g, "") || "recibo";
    return "recibo-" + safe + ".png";
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () {
        reject(new Error("read failed"));
      };
      reader.readAsDataURL(blob);
    });
  }

  /** Gera PNG do recibo via SVG foreignObject (sem dependência externa). */
  function renderReceiptPngBase64(data, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var html = buildReceiptHtml(data, loc);
    return new Promise(function (resolve) {
      if (!html || typeof global.Blob === "undefined") {
        resolve("");
        return;
      }
      try {
        var iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Recibo Pix render");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.cssText =
          "position:fixed;left:-99999px;top:0;width:720px;height:1200px;opacity:0;pointer-events:none;border:0;";
        document.body.appendChild(iframe);
        var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (!doc) {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          resolve("");
          return;
        }
        doc.open();
        doc.write(html);
        doc.close();

        var finish = function (b64) {
          try {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          } catch (err) {
            /* */
          }
          resolve(b64 || "");
        };

        global.setTimeout(function () {
          try {
            var root = doc.body;
            if (!root) {
              finish("");
              return;
            }
            var card = root.querySelector("table table") || root.firstElementChild || root;
            var rect = card.getBoundingClientRect();
            var w = Math.max(640, Math.ceil(rect.width) || 640);
            var h = Math.max(400, Math.ceil(rect.height) || 800);
            var scale = 2;
            var clone = card.cloneNode(true);
            var wrap = document.createElement("div");
            wrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
            wrap.style.cssText = "background:#ffffff;margin:0;padding:0;width:" + w + "px;font-family:Arial,Helvetica,sans-serif;";
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
                  if (!blob) {
                    finish("");
                    return;
                  }
                  blobToBase64(blob)
                    .then(finish)
                    .catch(function () {
                      finish("");
                    });
                }, "image/png");
              } catch (err) {
                finish("");
              }
            };
            img.onerror = function () {
              finish("");
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
          } catch (err) {
            finish("");
          }
        }, 350);
      } catch (err) {
        resolve("");
      }
    });
  }

  function sendEmail(email, data, locale) {
    var loc = locale === "en" || locale === "es" ? locale : "pt";
    var html = buildReceiptHtml(data, loc);
    return renderReceiptPngBase64(data, loc)
      .catch(function () {
        return "";
      })
      .then(function (pngBase64) {
        var payload = {
          email: email,
          locale: loc,
          code: data.code,
          amount: data.amount,
          trips: normalizeTrips(data.trips, loc),
          html: html,
        };
        if (pngBase64) {
          payload.attachment_png = pngBase64;
          payload.attachment_name = receiptPngFilename(data.code);
        }
        return fetch(receiptApiUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
      })
      .then(function (res) {
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
    readSavedPhone: readSavedPhone,
    savePhone: savePhone,
    readSavedPhoneDdi: readSavedPhoneDdi,
    savePhoneDdi: savePhoneDdi,
    getPhoneCountries: getPhoneCountries,
    findPhoneCountry: findPhoneCountry,
    ensurePhoneCountries: ensurePhoneCountries,
    phonePlaceholderFor: phonePlaceholderFor,
    phoneCountryLabel: phoneCountryLabel,
    phoneCountryName: phoneCountryName,
    buildPhoneDdiListHtml: buildPhoneDdiListHtml,
    normalizePhone: normalizePhone,
    formatPhoneMask: formatPhoneMask,
    formatPhoneIntl: formatPhoneIntl,
    nationalPhoneDigits: nationalPhoneDigits,
    digitsOnly: digitsOnly,
    normalizeReservationCode: normalizeReservationCode,
    isValidReservationCode: isValidReservationCode,
    readSavedReservationCodes: readSavedReservationCodes,
    saveReservationCode: saveReservationCode,
    getLastReservationCode: getLastReservationCode,
    getSavedEmailForCode: getSavedEmailForCode,
    getSavedPhoneForCode: getSavedPhoneForCode,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    getEmailValidationIssue: getEmailValidationIssue,
    getPhoneValidationIssue: getPhoneValidationIssue,
    emailValidationMessage: emailValidationMessage,
    phoneValidationMessage: phoneValidationMessage,
    buildWhatsAppUrl: buildWhatsAppUrl,
    formatBrl: formatBrl,
    normalizeTrips: normalizeTrips,
    isoToShort: isoToShort,
    resolveTripIso: resolveTripIso,
    renderReceiptPngBase64: renderReceiptPngBase64,
    consultarReservaPageUrl: consultarReservaPageUrl,
    confirmacaoPageUrl: confirmacaoPageUrl,
    resolveInclExcl: resolveInclExcl,
  };
})(typeof window !== "undefined" ? window : globalThis);

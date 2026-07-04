/**
 * HTML estático do track do carrossel (fallback se o JS falhar ou para pintar antes do defer).
 * Mantém as mesmas classes de `assets/js/excursoes-carousel.js` → `buildCard`.
 */
import {
  excursaoRowsForLocale,
  formatIngressoWithValor,
  GUIA_IDIOMAS,
  IDIOMA_FLAG,
  IDIOMA_LABEL,
  IDIOMAS_ARIA,
} from "./excursoes-carousel-data.mjs";
import { GUIA_PROFILE_SLUG } from "./excursoes-guides-profiles.mjs";

const WA_PHONE = "5562982506891";
const SAIDA_HORA_PADRAO = "8:45";

function tpl(str, map) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : "",
  );
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function horaExcursao(e) {
  const h = e && e.hora;
  if (h != null && String(h).trim() !== "") return String(h).trim();
  return SAIDA_HORA_PADRAO;
}

function grupoMaximoValor(e) {
  const n = parseInt(String(e.grupoMaximo), 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function numOrZero(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function inscritosNoGrupo(e) {
  const cap = grupoMaximoValor(e);
  if (e.pessoasInscritas != null && e.pessoasInscritas !== "") {
    return numOrZero(e.pessoasInscritas);
  }
  if (!e.confirmada) {
    const falta = Math.max(0, parseInt(String(e.faltamPessoas), 10) || 0);
    return Math.max(0, cap - falta);
  }
  return 0;
}

function legendaGrupoNoMaximo(cap, s) {
  return cap === 1 ? s.groupMaxOne : tpl(s.groupMaxMany, { n: cap });
}

function faltaConfirmarTexto(n, s) {
  const x = Math.max(0, parseInt(String(n), 10) || 0);
  if (x === 0) return s.falta0;
  if (x === 1) return s.falta1;
  return tpl(s.faltaMany, { n: x });
}

function waLinkExcursao(e, locale, s) {
  const legenda = `${legendaGrupoNoMaximo(grupoMaximoValor(e), s)}.`;
  const statusLinha = tpl(s.waFormacao, { falta: faltaConfirmarTexto(e.faltamPessoas, s) });
  const dataLine =
    locale === "en"
      ? `${e.monthName} ${e.dayNum}, 2026`
      : locale === "es"
        ? `${e.dayNum} de ${e.monthName} de 2026`
        : `${e.dayNum} de ${e.monthName}/2026`;
  const msg = tpl(s.waHi, {
    data: dataLine,
    destino: String(e.destino),
    valor: String(e.valor),
    cidade: s.meetingCity,
    hora: horaExcursao(e),
    grupoMax: legenda,
    status: statusLinha,
  });
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
}

/** Espelho reduzido de STRINGS no carrossel (PT/EN/ES). */
const SSR = {
  pt: {
    groupMaxOne: "Grupos de no máximo 1 pessoa",
    groupMaxMany: "Grupos de no máximo {{n}} pessoas",
    falta0: "Aguardando inscrições para confirmar.",
    falta1: "Falta 1 inscrição para confirmar.",
    faltaMany: "Faltam {{n}} inscrições para confirmar",
    waHi:
      "Olá! Gostaria de me inscrever na excursão:\n\n" +
      "📅 Data: {{data}}\n" +
      "📍 Destino: {{destino}}\n" +
      "💰 Valor: R${{valor}}/por pessoa\n" +
      "📍 Saída: {{cidade}}\n" +
      "🕐 {{hora}}\n" +
      "{{grupoMax}}\n" +
      "{{status}}\n\n" +
      "Por favor, me informe sobre disponibilidade e como garantir minha vaga!",
    waFormacao: "⏳ Status: excursão em formação.\n{{falta}}",
    meetingCity: "Alto Paraíso",
    statusOk: "✅ Confirmado",
    statusWait: "⏳ Formando",
    perPerson: "/por pessoa",
    inclLabel: "Incluso",
    inclSpot: "Vaga em Excursão",
    inclGuideShort: "Guia local",
    inclEntries: "Ingresso",
    inclTransport: "Transporte",
    badgeTransport: "Com transporte",
    exclLabel: "Não incluso",
    exclEntries: "Ingresso",
    exclEntry: "Entrada",
    exclTransport: "Transporte",
    exclLunch: "Almoço",
    cta: "Quero participar",
    guiaAbout: "Sobre {{nome}}",
    guiaModalClose: "Fechar",
  },
  en: {
    groupMaxOne: "Groups of up to 1 person",
    groupMaxMany: "Groups of up to {{n}} people",
    falta0: "Waiting for sign-ups to confirm this departure.",
    falta1: "1 more sign-up needed to confirm the departure.",
    faltaMany: "{{n}} more sign-ups needed to confirm the departure.",
    waHi:
      "Hi! I’d like to join this excursion:\n\n" +
      "📅 Date: {{data}}\n" +
      "📍 Destination: {{destino}}\n" +
      "💰 Price: R${{valor}} per person\n" +
      "📍 Meeting point: {{cidade}}\n" +
      "🕐 {{hora}}\n" +
      "{{grupoMax}}\n" +
      "{{status}}\n\n" +
      "Could you please confirm availability and how to secure my spot?",
    waFormacao: "⏳ Status: excursion forming.\n{{falta}}",
    meetingCity: "Alto Paraíso",
    statusOk: "✅ Confirmed",
    statusWait: "⏳ Forming",
    perPerson: "/per person",
    inclLabel: "Included",
    inclSpot: "Excursion spot",
    inclGuideShort: "Local guide",
    inclEntries: "Admission",
    inclTransport: "Transport",
    badgeTransport: "With transport",
    exclLabel: "Not included",
    exclEntries: "Admission",
    exclEntry: "Admission",
    exclTransport: "Transport",
    exclLunch: "Lunch",
    cta: "I want to join",
    guiaAbout: "About {{nome}}",
    guiaModalClose: "Close",
  },
  es: {
    groupMaxOne: "Grupos de hasta 1 persona",
    groupMaxMany: "Grupos de hasta {{n}} personas",
    falta0: "Esperando inscripciones para confirmar la salida.",
    falta1: "Falta 1 inscripción para confirmar la salida.",
    faltaMany: "Faltan {{n}} inscripciones para confirmar la salida.",
    waHi:
      "¡Hola! Me gustaría inscribirme en esta excursión:\n\n" +
      "📅 Fecha: {{data}}\n" +
      "📍 Destino: {{destino}}\n" +
      "💰 Precio: R${{valor}} por persona\n" +
      "📍 Punto de salida: {{cidade}}\n" +
      "🕐 {{hora}}\n" +
      "{{grupoMax}}\n" +
      "{{status}}\n\n" +
      "¿Podrían confirmar disponibilidad y cómo reservar mi plaza?",
    waFormacao: "⏳ Estado: excursión en formación.\n{{falta}}",
    meetingCity: "Alto Paraíso",
    statusOk: "✅ Confirmado",
    statusWait: "⏳ Formando",
    perPerson: "/por persona",
    inclLabel: "Incluye",
    inclSpot: "Cupo en excursión",
    inclGuideShort: "Guía local",
    inclEntries: "Entrada",
    inclTransport: "Transporte",
    badgeTransport: "Con transporte",
    exclLabel: "No incluye",
    exclEntries: "Entrada",
    exclEntry: "Entrada",
    exclTransport: "Transporte",
    exclLunch: "Almuerzo",
    cta: "Quiero participar",
    guiaAbout: "Acerca de {{nome}}",
    guiaModalClose: "Cerrar",
  },
};

function atrativoHref(e, locale) {
  const path = e && e.atrativoPath;
  if (!path || String(path).trim() === "") return "";
  const p = String(path).trim();
  if (locale === "en") return `en/${p}`;
  if (locale === "es") return `es/${p}`;
  return p;
}

function cardImgBlockSsr(e, locale) {
  if (!e.cardImg) return "";
  const href = atrativoHref(e, locale);
  const inner =
    `<div class="gcv-excursoes-card__img-wrap"><img class="gcv-excursoes-card__img" src="${esc(String(e.cardImg))}" alt="${esc(String(e.destino))}" loading="lazy" width="230" height="230"></div>`;
  if (!href) return inner;
  return `<a class="gcv-excursoes-card__atrativo-link gcv-excursoes-card__atrativo-link--img" href="${esc(href)}">${inner}</a>`;
}

function destSubSsr(e) {
  const sub = e && e.destinoSub;
  if (!sub) return "";
  return `<span class="gcv-excursoes-card__dest-sub">${esc(String(sub))}</span>`;
}

function destTitleSsr(e, locale) {
  const label = esc(String(e.destino));
  const href = atrativoHref(e, locale);
  const sub = destSubSsr(e);
  const main = href
    ? `<a class="gcv-excursoes-card__atrativo-link" href="${esc(href)}">${label}</a>`
    : label;
  return `<h3 class="gcv-excursoes-card__dest">${main}${sub}</h3>`;
}

function guiaFlagsLimitedSsr(codes, locale) {
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  const max = 3;
  const shown = codes.slice(0, max);
  let html = shown
    .map((c) => {
      const cc = IDIOMA_FLAG[c] || "";
      if (!cc) return "";
      const title = (IDIOMA_LABEL[c] && IDIOMA_LABEL[c][loc]) || c;
      return `<span class="fi fi-${cc} gcv-excursoes-card__guide-flag" title="${esc(title)}" aria-hidden="true"></span>`;
    })
    .join("");
  if (codes.length > max) {
    html += `<span class="gcv-excursoes-card__guide-flag-more" aria-hidden="true">...</span>`;
  }
  return html;
}

function guiaLangsSsr(nome, locale) {
  const codes = GUIA_IDIOMAS[nome];
  if (!codes || !codes.length) return "";
  const loc = locale === "en" || locale === "es" ? locale : "pt";
  const labels = codes.map((c) => (IDIOMA_LABEL[c] && IDIOMA_LABEL[c][loc]) || c);
  const aria = `${IDIOMAS_ARIA[loc] || IDIOMAS_ARIA.pt}: ${labels.join(", ")}`;
  const flags = guiaFlagsLimitedSsr(codes, locale);
  return (
    `<span class="gcv-excursoes-card__guide-langs" role="img" aria-label="${esc(aria)}">` +
    `<i class="ti ti-message-language gcv-excursoes-card__guide-langs-icon" aria-hidden="true"></i>` +
    flags +
    `</span>`
  );
}

function guiaChipInnerSsr(nome, foto, locale, altInPhoto) {
  const langs = guiaLangsSsr(nome, locale);
  const info =
    `<div class="gcv-excursoes-card__guide-info">` +
    `<span class="gcv-excursoes-card__guide-label">Guia</span>` +
    `<span class="gcv-excursoes-card__guide-name">${esc(nome)}</span>` +
    langs +
    `</div>`;
  if (foto) {
    const alt = altInPhoto ? esc(altInPhoto) : "";
    return (
      `<img class="gcv-excursoes-card__guide-photo" src="${esc(foto)}" alt="${alt}" loading="lazy" width="230" height="90">` +
      info
    );
  }
  return `<div class="gcv-excursoes-card__guide-icon"><i class="ti ti-user" aria-hidden="true"></i></div>` + info;
}

function guiaChipSsr(e, locale) {
  const nome = e && e.guiaNome ? String(e.guiaNome) : null;
  if (!nome) return "";
  const s = SSR[locale] || SSR.pt;
  const foto = e.guiaFoto ? String(e.guiaFoto) : null;
  const slug = GUIA_PROFILE_SLUG[nome];
  if (slug) {
    const aboutLabel = tpl(s.guiaAbout, { nome });
    return (
      `<button type="button" class="gcv-excursoes-card__guide gcv-excursoes-card__guide--btn" data-guia-profile="${esc(slug)}" aria-label="${esc(aboutLabel)}">` +
      guiaChipInnerSsr(nome, foto, locale, null) +
      `</button>`
    );
  }
  return `<div class="gcv-excursoes-card__guide">` + guiaChipInnerSsr(nome, foto, locale, nome) + `</div>`;
}

function inclExclBlocksSsr(e, s, locale) {
  const comTransporte = e.comTransporte === true;
  const inclEntradas = e.inclEntradas === true;
  const ingressoIncl = esc(formatIngressoWithValor(s.inclEntries, e.valorIngresso, locale));
  const ingressoExcl = esc(formatIngressoWithValor(s.exclEntries, e.valorIngresso, locale));
  let inclItems =
    `<li><i class="ti ti-user text-ok" aria-hidden="true"></i> ${esc(s.inclSpot)}</li>` +
    `<li><i class="ti ti-flag text-ok" aria-hidden="true"></i> ${esc(s.inclGuideShort)}</li>`;
  if (inclEntradas) {
    inclItems += `<li><i class="ti ti-ticket text-ok" aria-hidden="true"></i> ${ingressoIncl}</li>`;
  }
  if (comTransporte) {
    inclItems += `<li><i class="ti ti-bus text-ok" aria-hidden="true"></i> ${esc(s.inclTransport)}</li>`;
  }
  let exclItems;
  if (comTransporte) {
    exclItems = inclEntradas
      ? `<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ${esc(s.exclLunch)}</li>`
      : `<li><i class="ti ti-ticket text-no" aria-hidden="true"></i> ${ingressoExcl}</li>` +
        `<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ${esc(s.exclLunch)}</li>`;
  } else {
    const transportLabel = e.badge4x4 ? `${esc(s.exclTransport)} (4×4)` : esc(s.exclTransport);
    exclItems =
      (inclEntradas
        ? ""
        : `<li><i class="ti ti-ticket text-no" aria-hidden="true"></i> ${ingressoExcl}</li>`) +
      `<li><i class="ti ti-bus text-no" aria-hidden="true"></i> ${transportLabel}</li>` +
      `<li><i class="ti ti-tools-kitchen-2 text-no" aria-hidden="true"></i> ${esc(s.exclLunch)}</li>`;
  }
  return (
    '<div class="gcv-excursoes-card__block gcv-excursoes-card__block--in">' +
    `<span class="gcv-excursoes-card__label gcv-excursoes-card__label--in">${esc(s.inclLabel)}</span>` +
    `<ul class="gcv-excursoes-card__list">${inclItems}</ul></div>` +
    '<div class="gcv-excursoes-card__block gcv-excursoes-card__block--out">' +
    `<span class="gcv-excursoes-card__label gcv-excursoes-card__label--out">${esc(s.exclLabel)}</span>` +
    `<ul class="gcv-excursoes-card__list">${exclItems}</ul></div>`
  );
}

/**
 * @param {string} locale
 */
export function excursionsCarouselTrackSsrHtml(locale) {
  const rows = excursaoRowsForLocale(locale);
  const s = SSR[locale] || SSR.pt;
  return rows
    .map((e, idx) => {
      const hrefWa = waLinkExcursao(e, locale, s);
      const hora = horaExcursao(e);
      const comTransporte = e.comTransporte === true;
      let mod = "gcv-excursoes-card--pendente";
      if (comTransporte) mod += " gcv-excursoes-card--transporte";
      const cap = grupoMaximoValor(e);
      const x = inscritosNoGrupo(e);
      const legendaCap = legendaGrupoNoMaximo(cap, s);
      const labelAria = `${x}/${cap} · ${legendaCap}`;
      return (
        `<article class="gcv-excursoes-card ${mod}" data-excursao-index="${idx}" data-excursao-status="formacao" data-ssr-fallback="1">` +
        '<div class="gcv-excursoes-card__head">' +
        '<div class="gcv-excursoes-card__datestrip">' +
        '<div class="gcv-excursoes-card__datehero">' +
        `<span class="gcv-excursoes-card__day">${esc(String(e.dayNum))}</span>` +
        '<div class="gcv-excursoes-card__datehero-text">' +
        `<span class="gcv-excursoes-card__month">${esc(String(e.monthName))}</span>` +
        `<span class="gcv-excursoes-card__weekday">${esc(String(e.weekday))}</span>` +
        "</div>" +
        '<div class="gcv-excursoes-card__datehero-time">' +
        `<span class="gcv-excursoes-card__time">${esc(hora)}</span>` +
        "</div></div>" +
        '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--city">' +
        '<span class="gcv-excursoes-card__loc"><i class="ti ti-map-pin" aria-hidden="true"></i> ' +
        esc(s.meetingCity) +
        "</span></div></div>" +
        '<div class="gcv-excursoes-card__meta-stack">' +
        '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--status">' +
        '<span class="gcv-excursoes-card__status gcv-excursoes-card__status--wait">' +
        esc(s.statusWait) +
        "</span>" +
        `<span class="gcv-excursoes-card__cap" title="${esc(labelAria)}" aria-label="${esc(labelAria)}">` +
        '<i class="ti ti-users" aria-hidden="true"></i>' +
        '<span class="gcv-excursoes-card__cap-ratio" aria-hidden="true">' +
        `<span class="gcv-excursoes-card__cap-x">${x}</span>` +
        '<span class="gcv-excursoes-card__cap-slash">/</span>' +
        `<span class="gcv-excursoes-card__cap-y">${cap}</span>` +
        "</span></span></div>" +
        '<div class="gcv-excursoes-card__row gcv-excursoes-card__row--falta">' +
        `<p class="gcv-excursoes-card__falta">${esc(faltaConfirmarTexto(e.faltamPessoas, s))}</p>` +
        "</div></div>" +
        cardImgBlockSsr(e, locale) +
        destTitleSsr(e, locale) +
        '<div class="gcv-excursoes-card__price-row">' +
        `<span class="gcv-excursoes-card__price">R$&nbsp;${esc(String(e.valor))}</span>` +
        `<span class="gcv-excursoes-card__per">${esc(s.perPerson)}</span>` +
        "</div></div>" +
        '<div class="gcv-excursoes-card__body">' +
        guiaChipSsr(e, locale) +
        inclExclBlocksSsr(e, s, locale) +
        (comTransporte
          ? `<span class="gcv-excursoes-card__transport-badge"><i class="ti ti-bus" aria-hidden="true"></i> ${esc(s.badgeTransport)}</span>`
          : "") +
        `<a class="gcv-excursoes-card__cta" href="${esc(hrefWa)}" target="_blank" rel="noopener noreferrer">` +
        '<i class="ti ti-brand-whatsapp" aria-hidden="true"></i> ' +
        esc(s.cta) +
        "</a></div></article>"
      );
    })
    .join("\n");
}

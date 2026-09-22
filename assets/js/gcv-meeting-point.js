/* gcv-meeting-point.js — combobox oficial por cidade de saída */
(function (global) {
  'use strict';

  var POINTS = [
    { id: 'alto-paraiso-cat', city: 'alto_paraiso', maps_url: 'https://maps.app.goo.gl/quazQXB8qUs3TFCQ9',
      label: { pt: 'CAT — Centro de Atendimento ao Turista', en: 'CAT — Tourist Information Center', es: 'CAT — Centro de Atención al Turista' } },
    { id: 'alto-paraiso-quintal-maria', city: 'alto_paraiso', maps_url: 'https://maps.app.goo.gl/xFKx1HUzN8kqBdFE7',
      label: { pt: 'Padaria Quintal de Maria', en: 'Padaria Quintal de Maria', es: 'Padaria Quintal de Maria' } },
    { id: 'alto-paraiso-santa-maria', city: 'alto_paraiso', maps_url: 'https://maps.app.goo.gl/eBT1rehvkYZa9Ui57',
      label: { pt: 'Padaria Santa Maria, Rodoviária', en: 'Santa Maria Bakery, Bus Station', es: 'Panadería Santa Maria, Rodoviaria' } },
    { id: 'alto-paraiso-sol-chapada', city: 'alto_paraiso', maps_url: 'https://maps.app.goo.gl/tfgThzVMtKRmU5yu6',
      label: { pt: 'Sol da Chapada (Arco Disco Voador)', en: 'Sol da Chapada (Flying Saucer Arch)', es: 'Sol da Chapada (Arco Disco Volador)' } },
    { id: 'cavalcante-cat', city: 'cavalcante', maps_url: 'https://maps.app.goo.gl/LHWVrMersNPqhk3n8',
      label: { pt: 'CAT — Centro de Atendimento ao Turista', en: 'CAT — Tourist Information Center', es: 'CAT — Centro de Atención al Turista' } },
    { id: 'cavalcante-cafe-delicias', city: 'cavalcante', maps_url: 'https://maps.app.goo.gl/EfK5qGQTgApPjT9BA',
      label: { pt: 'Padaria Café com Delícias', en: 'Padaria Café com Delícias', es: 'Padaria Café com Delícias' } },
    { id: 'cavalcante-requinte', city: 'cavalcante', maps_url: 'https://maps.app.goo.gl/QgVXbPogsDsEGvfr6',
      label: { pt: 'Padaria e Confeitaria Requinte', en: 'Padaria e Confeitaria Requinte', es: 'Padaria e Confeitaria Requinte' } },
    { id: 'sao-jorge-cat', city: 'sao_jorge', maps_url: 'https://maps.app.goo.gl/EcjHSBkyFnFsEfWB9',
      label: { pt: 'CAT — Centro de Atendimento ao Turista', en: 'CAT — Tourist Information Center', es: 'CAT — Centro de Atención al Turista' } },
    { id: 'sao-jorge-cafe-brigadeiro', city: 'sao_jorge', maps_url: 'https://maps.app.goo.gl/amSXK9LL2NBy7yLe8',
      label: { pt: 'Café com Brigadeiro', en: 'Café com Brigadeiro', es: 'Café com Brigadeiro' } },
    { id: 'sao-jorge-casa-delicias', city: 'sao_jorge', maps_url: 'https://maps.app.goo.gl/UnAz3mw38XMZQY6M9',
      label: { pt: 'Casa de Delícias Café da Manhã', en: 'Casa de Delícias Breakfast', es: 'Casa de Delícias Desayuno' } },
    { id: 'sao-jorge-tapioca', city: 'sao_jorge', maps_url: 'https://maps.app.goo.gl/Ey3w8RqhoERwbdAr8',
      label: { pt: 'Tapioca do Cerrado', en: 'Tapioca do Cerrado', es: 'Tapioca do Cerrado' } }
  ];

  var UI = {
    pt: {
      pickCity: 'Selecione a cidade de saída primeiro',
      pickPoint: 'Selecione o ponto de encontro…',
      maps: 'Abrir no Google Maps',
      noCity: 'Esta cidade ainda não tem pontos oficiais.'
    },
    en: {
      pickCity: 'Select the departure city first',
      pickPoint: 'Select the meeting point…',
      maps: 'Open in Google Maps',
      noCity: 'This city has no official meeting points yet.'
    },
    es: {
      pickCity: 'Seleccione primero la ciudad de salida',
      pickPoint: 'Seleccione el punto de encuentro…',
      maps: 'Abrir en Google Maps',
      noCity: 'Esta ciudad aún no tiene puntos oficiales.'
    }
  };

  function lang() {
    var raw = String((document.documentElement.getAttribute('lang') || 'pt')).toLowerCase();
    if (raw.indexOf('en') === 0) return 'en';
    if (raw.indexOf('es') === 0) return 'es';
    return 'pt';
  }

  function pack() {
    return UI[lang()] || UI.pt;
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  }

  function cityKey(name) {
    var n = norm(name);
    if (!n) return '';
    if (n.indexOf('cavalcante') !== -1) return 'cavalcante';
    if (n.indexOf('saojorge') !== -1 || n.indexOf('vilasaojorge') !== -1) return 'sao_jorge';
    if (n.indexOf('altoparaiso') !== -1) return 'alto_paraiso';
    return '';
  }

  function cityKeyFromSelect(sel) {
    if (!sel) return '';
    var opt = sel.options[sel.selectedIndex];
    return cityKey(opt ? opt.text : '');
  }

  function labelOf(row) {
    var L = row && row.label ? row.label : {};
    return L[lang()] || L.pt || '';
  }

  function byId(id) {
    id = String(id || '');
    for (var i = 0; i < POINTS.length; i++) {
      if (POINTS[i].id === id) return POINTS[i];
    }
    return null;
  }

  function forCity(key) {
    return POINTS.filter(function (p) { return p.city === key; });
  }

  function matchSaved(placeId, label, key) {
    var row = byId(placeId);
    if (row && (!key || row.city === key)) return row;
    var n = norm(label);
    if (!n) return null;
    var aliases = { 'parariaquintaldemaria': 'alto-paraiso-quintal-maria' };
    if (aliases[n]) return byId(aliases[n]);
    for (var i = 0; i < POINTS.length; i++) {
      var p = POINTS[i];
      if (key && p.city !== key) continue;
      if (norm(p.id) === n || norm(p.label.pt) === n || norm(p.label.en) === n || norm(p.label.es) === n) {
        return p;
      }
    }
    return null;
  }

  function showLink(cfg, row) {
    var link = cfg.linkEl;
    var hint = cfg.gpsEl;
    var t = pack();
    if (link) {
      if (row && row.maps_url) {
        link.href = row.maps_url;
        link.hidden = false;
        link.textContent = t.maps;
      } else {
        link.removeAttribute('href');
        link.hidden = true;
      }
    }
    if (hint) {
      hint.textContent = row ? '' : (cfg.select && cfg.select.disabled ? t.pickCity : '');
      hint.hidden = !hint.textContent;
    }
  }

  function fillSelect(cfg, keepId) {
    var sel = cfg.select;
    if (!sel) return;
    var t = pack();
    var key = typeof cfg.getCityKey === 'function' ? cfg.getCityKey() : '';
    var list = key ? forCity(key) : [];
    var current = keepId || sel.value || '';
    sel.innerHTML = '';
    if (!key) {
      sel.disabled = true;
      sel.required = true;
      sel.appendChild(new Option(t.pickCity, ''));
      if (cfg.placeEl) cfg.placeEl.value = '';
      showLink(cfg, null);
      return;
    }
    sel.disabled = false;
    sel.required = true;
    sel.appendChild(new Option(list.length ? t.pickPoint : t.noCity, ''));
    list.forEach(function (p) {
      sel.appendChild(new Option(labelOf(p), p.id));
    });
    if (current && list.some(function (p) { return p.id === current; })) {
      sel.value = current;
    } else {
      sel.value = '';
    }
    applySelect(cfg);
  }

  function applySelect(cfg) {
    var row = byId(cfg.select && cfg.select.value);
    if (cfg.placeEl) cfg.placeEl.value = row ? row.id : '';
    if (cfg.latEl) cfg.latEl.value = '';
    if (cfg.lngEl) cfg.lngEl.value = '';
    showLink(cfg, row);
  }

  function bindMeetingPoint(cfg) {
    var sel = cfg.select || cfg.input;
    if (!sel) return;
    cfg.select = sel;
    fillSelect(cfg, sel.value);
    if (sel.tagName === 'SELECT') {
      sel.addEventListener('change', function () { applySelect(cfg); });
    }
    if (cfg.cityEl && !cfg.cityEl.getAttribute('data-gcv-meeting-bound')) {
      cfg.cityEl.setAttribute('data-gcv-meeting-bound', '1');
      cfg.cityEl.addEventListener('change', function () {
        fillSelect(cfg, '');
      });
    }
    cfg.refresh = function (keepId) { fillSelect(cfg, keepId); };
    cfg.setSaved = function (placeId, label) {
      var key = typeof cfg.getCityKey === 'function' ? cfg.getCityKey() : '';
      var row = matchSaved(placeId, label, key);
      fillSelect(cfg, row ? row.id : '');
    };
  }

  global.GcvMeetingPoints = {
    list: POINTS,
    cityKey: cityKey,
    cityKeyFromSelect: cityKeyFromSelect,
    byId: byId,
    forCity: forCity,
    matchSaved: matchSaved,
    labelOf: labelOf
  };
  global.gcvBindMeetingPoint = bindMeetingPoint;
  global.gcvCanUseDeviceGps = function () { return false; };
})(window);

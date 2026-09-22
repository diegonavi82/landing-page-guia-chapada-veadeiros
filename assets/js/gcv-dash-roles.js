/* gcv-dash-roles.js — Perfil / agenda / publicar (guia + cliente) */
(function (global) {
  'use strict';

  function get(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.withCredentials = true;
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send();
  }

  function sendJson(method, url, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) {
        cb(e, { ok: false, error: xhr.status >= 500 ? 'Erro ao salvar. Tente novamente.' : 'Resposta inválida do servidor.' });
      }
    };
    xhr.onerror = function () { cb(new Error('network'), { ok: false, error: 'Falha de rede. Tente novamente.' }); };
    xhr.send(JSON.stringify(data || {}));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var GUIDE_LANG_OPTS = [
    { code: 'pt', label: 'Português', flag: 'br', fixed: true },
    { code: 'en', label: 'Inglês', flag: 'us', fixed: false },
    { code: 'es', label: 'Espanhol', flag: 'es', fixed: false },
  ];

  function normalizeGuideLangs(codes) {
    var out = [];
    (Array.isArray(codes) ? codes : []).forEach(function (c) {
      c = String(c || '').toLowerCase().trim();
      if (c === 'br') c = 'pt';
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    out = out.filter(function (c) { return c !== 'pt'; });
    out.unshift('pt');
    return out;
  }

  function languagesPickerHtml(selected) {
    var sel = normalizeGuideLangs(selected);
    return '<div class="gcv-dash-langs">' +
      GUIDE_LANG_OPTS.map(function (o) {
        var checked = o.fixed || sel.indexOf(o.code) >= 0;
        return '<label class="gcv-dash-lang' + (o.fixed ? ' gcv-dash-lang--fixed' : '') + '"' +
          (o.fixed ? ' title="Português é obrigatório"' : '') + '>' +
          '<input type="checkbox" data-guide-lang="' + o.code + '"' +
          (checked ? ' checked' : '') +
          (o.fixed ? ' disabled' : '') + ' />' +
          '<span class="fi fi-' + o.flag + '" aria-hidden="true"></span>' +
          '<span>' + o.label + '</span></label>';
      }).join('') +
      '</div>' +
      '<p class="gcv-dash-hint">A bandeira do Brasil (português) fica sempre marcada. Inglês e espanhol aparecem no card da excursão.</p>';
  }

  function readLanguagesPicker(scope) {
    var root = scope || document;
    var codes = ['pt'];
    root.querySelectorAll('input[data-guide-lang]').forEach(function (inp) {
      var c = inp.getAttribute('data-guide-lang');
      if (c && c !== 'pt' && inp.checked && codes.indexOf(c) < 0) codes.push(c);
    });
    return codes;
  }

  function money(cents) {
    return 'R$ ' + ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',');
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + String(n);
  }

  function addDaysIso(iso, days) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  var TIME_MINUTES = [15, 30, 45];

  function snapTimeMinutes(m) {
    var n = parseInt(m, 10);
    if (!Number.isFinite(n) || n < 0) n = 15;
    var best = TIME_MINUTES[0];
    var dist = 99;
    TIME_MINUTES.forEach(function (mm) {
      var d = Math.abs(mm - n);
      if (d < dist) {
        dist = d;
        best = mm;
      }
    });
    return best;
  }

  function timeSelectHtml(hourId, minId, selectedHHmm) {
    var raw = String(selectedHHmm || '10:15');
    var parts = raw.split(':');
    var h = parseInt(parts[0], 10);
    var m = snapTimeMinutes(parts[1]);
    if (!Number.isFinite(h) || h < 0 || h > 23) h = 10;
    var hours = '';
    var i;
    for (i = 0; i < 24; i++) {
      hours += '<option value="' + pad2(i) + '"' + (i === h ? ' selected' : '') + '>' + pad2(i) + 'h</option>';
    }
    var mins = '';
    TIME_MINUTES.forEach(function (mm) {
      mins += '<option value="' + pad2(mm) + '"' + (mm === m ? ' selected' : '') + '>' + pad2(mm) + '</option>';
    });
    return (
      '<div class="gcv-dash-time">' +
      '<select class="gcv-dash-select gcv-dash-time__h" id="' + hourId + '" required aria-label="Hora">' + hours + '</select>' +
      '<span class="gcv-dash-time__sep" aria-hidden="true">:</span>' +
      '<select class="gcv-dash-select gcv-dash-time__m" id="' + minId + '" required aria-label="Minutos">' + mins + '</select>' +
      '</div>'
    );
  }

  function readTimeSelect(hourId, minId) {
    var h = document.getElementById(hourId);
    var m = document.getElementById(minId);
    if (!h || !m || !h.value || !m.value) return '';
    return h.value + ':' + m.value;
  }

  function foldText(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function sortAttractionsCatalog(list) {
    return (list || []).slice().sort(function (a, b) {
      return String(a.title_pt || '').localeCompare(String(b.title_pt || ''), 'pt', {
        sensitivity: 'base',
        numeric: true
      });
    });
  }

  var MIN_QUORUM = 0;
  var MAX_QUORUM = 4;
  var MAX_PRECONFIRMED = 5;
  var MAX_PEOPLE_CAP = 12;
  var DEFAULT_QUORUM = 4;
  var DEFAULT_MAX_PEOPLE = 10;
  var DEFAULT_PRECONFIRMED = 0;
  var GUIDE_NET_MIN = 50;
  var GUIDE_NET_MAX = 160;
  var GUIDE_NET_MAX_DRAGAO = 190;
  var GUIDE_NET_MAX_TRANSPORT = 550;
  var MAX_TRANSPORT_PEOPLE = 4;
  var DEFAULT_MAX_TRANSPORT = 4;

  function attractionLooksLikeDragao(a) {
    if (!a) return false;
    var slug = String(a.slug || '').toLowerCase();
    var title = foldText(a.title_pt || a.title || '');
    return slug.indexOf('dragao') >= 0 || title.indexOf('dragao') >= 0;
  }

  function confirmedYesNoHtml(prefix, confirmed, questionLabel) {
    confirmed = !!confirmed;
    var q = questionLabel || 'Passeio já confirmado?';
    return (
      '<div class="gcv-dash-field gcv-dash-confirm-quorum__confirmed">' +
      '<span class="gcv-dash-label">' + q + '</span>' +
      '<div class="gcv-dash-yesno" role="group" aria-label="' + q + '">' +
      '<label class="gcv-dash-yesno__opt"><input type="checkbox" id="' + prefix + 'confirmed-yes"' + (confirmed ? ' checked' : '') + ' /> Sim</label>' +
      '<label class="gcv-dash-yesno__opt"><input type="checkbox" id="' + prefix + 'confirmed-no"' + (confirmed ? '' : ' checked') + ' /> Não</label>' +
      '</div></div>'
    );
  }

  function quorumFieldHtml(prefix, quorumSelect) {
    return (
      '<div class="gcv-dash-field gcv-dash-confirm-quorum__quorum" id="' + prefix + 'quorum-wrap">' +
      '<label class="gcv-dash-label" for="' + prefix + 'quorum">Quórum</label>' +
      (quorumSelect || quorumSelectHtml(prefix + 'quorum', DEFAULT_QUORUM)) +
      '</div>'
    );
  }

  function confirmedQuorumRowHtml(prefix, confirmed, quorumSelect, questionLabel) {
    confirmed = !!confirmed;
    return (
      '<div class="gcv-dash-confirm-quorum' + (confirmed ? ' is-confirmed' : ' is-unconfirmed') + '">' +
      confirmedYesNoHtml(prefix, confirmed, questionLabel) +
      quorumFieldHtml(prefix, quorumSelect) +
      '</div>'
    );
  }

  function paintConfirmedQuorum(prefix, confirmed) {
    var wrap = document.getElementById(prefix + 'quorum-wrap');
    var row = wrap
      ? wrap.closest('.gcv-dash-confirm-quorum')
      : (document.getElementById(prefix + 'confirmed-yes')
        && document.getElementById(prefix + 'confirmed-yes').closest('.gcv-dash-confirm-quorum'));
    if (!row) return;
    row.classList.toggle('is-confirmed', !!confirmed);
    row.classList.toggle('is-unconfirmed', !confirmed);
  }

  function confirmedCheckboxHtml(prefix, confirmed, label) {
    confirmed = !!confirmed;
    var t = label || 'Passeio confirmado';
    return (
      '<label class="gcv-dash-label gcv-guide-net-box__transport">' +
      '<input type="checkbox" id="' + prefix + 'confirmed-yes"' + (confirmed ? ' checked' : '') + ' /> ' +
      '<span>' + t + '</span></label>'
    );
  }

  function bindConfirmedYesNo(prefix) {
    var yes = document.getElementById(prefix + 'confirmed-yes');
    var no = document.getElementById(prefix + 'confirmed-no');
    var wrap = document.getElementById(prefix + 'quorum-wrap');
    var sel = document.getElementById(prefix + 'quorum');
    function apply() {
      var confirmed = !!(yes && yes.checked);
      if (no) no.checked = !confirmed;
      var row = wrap ? wrap.closest('.gcv-dash-confirm-quorum') : null;
      var inlineQuestion = !!(row && row.querySelector('.gcv-dash-confirm-quorum__confirmed'));
      if (wrap) wrap.hidden = confirmed;
      if (row && !inlineQuestion) row.hidden = confirmed;
      paintConfirmedQuorum(prefix, confirmed);
      if (sel) {
        sel.disabled = confirmed;
        sel.required = !confirmed;
        if (!confirmed) {
          var maxWalk = walkQuorumMaxFromPrefix(prefix);
          var v = parseFiniteInt(sel.value, DEFAULT_QUORUM);
          if (v < 1) sel.value = String(Math.min(DEFAULT_QUORUM, maxWalk));
          else if (v > maxWalk) sel.value = String(maxWalk);
          syncWalkQuorumFromVagas(prefix);
        }
      }
    }
    if (yes) {
      yes.addEventListener('change', function () {
        if (no) {
          no.checked = !yes.checked;
        }
        apply();
      });
    }
    if (no) {
      no.addEventListener('change', function () {
        if (yes) yes.checked = !no.checked;
        apply();
      });
    }
    apply();
  }

  function isTourConfirmed(prefix) {
    var yes = document.getElementById(prefix + 'confirmed-yes');
    return !!(yes && yes.checked);
  }

  function walkQuorumMaxFromPrefix(prefix) {
    var maxEl = document.getElementById(prefix + 'max');
    return clampRange(parseFiniteInt(maxEl ? maxEl.value : DEFAULT_MAX_PEOPLE, DEFAULT_MAX_PEOPLE), 1, MAX_PEOPLE_CAP);
  }

  function syncWalkQuorumFromVagas(prefix) {
    var qEl = document.getElementById(prefix + 'quorum');
    fillIntSelect(qEl, 1, walkQuorumMaxFromPrefix(prefix), qEl ? qEl.value : DEFAULT_QUORUM);
  }

  function quorumSelectHtml(id, selected, maxN, minN) {
    maxN = parseFiniteInt(maxN, DEFAULT_MAX_PEOPLE);
    minN = parseFiniteInt(minN, 1);
    if (minN < 0) minN = 0;
    if (maxN < minN) maxN = minN;
    if (maxN > MAX_PEOPLE_CAP) maxN = MAX_PEOPLE_CAP;
    var sel = parseFiniteInt(selected, DEFAULT_QUORUM);
    if (sel < minN) sel = minN === 0 ? 0 : DEFAULT_QUORUM;
    if (sel > maxN) sel = maxN;
    var html = '<select class="gcv-dash-select" id="' + id + '" required>';
    var i;
    for (i = minN; i <= maxN; i++) {
      html += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + i + '</option>';
    }
    return html + '</select>';
  }

  function transportMaxSelectHtml(id, selected) {
    var sel = parseFiniteInt(selected, DEFAULT_MAX_TRANSPORT);
    if (sel < 1 || sel > MAX_TRANSPORT_PEOPLE) sel = DEFAULT_MAX_TRANSPORT;
    var html = '<select class="gcv-dash-select" id="' + id + '">';
    var i;
    for (i = 1; i <= MAX_TRANSPORT_PEOPLE; i++) {
      html += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + i + '</option>';
    }
    return html + '</select>';
  }

  function fillIntSelect(sel, min, max, selected) {
    if (!sel) return 0;
    min = parseFiniteInt(min, 1);
    max = parseFiniteInt(max, min);
    if (max < min) max = min;
    var cur = parseFiniteInt(selected != null ? selected : sel.value, min);
    if (cur > max) cur = max;
    if (cur < min) cur = min;
    var html = '';
    var i;
    for (i = min; i <= max; i++) {
      html += '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + i + '</option>';
    }
    sel.innerHTML = html;
    sel.value = String(cur);
    return cur;
  }

  function quorumOnlyRowHtml(prefix, quorumSelect) {
    return (
      '<div class="gcv-dash-confirm-quorum is-unconfirmed">' +
      quorumFieldHtml(prefix, quorumSelect) +
      '</div>'
    );
  }

  function quorumLabel(n) {
    n = parseFiniteInt(n, DEFAULT_QUORUM);
    return n <= 0 ? 'sem quórum' : String(n);
  }

  function attractionComboboxHtml(inputId, hiddenId, suggestId) {
    return (
      '<div class="gcv-dash-attr-ac">' +
      '<div class="gcv-dash-attr-ac__scrim" hidden></div>' +
      '<div class="gcv-dash-attr-ac__field">' +
      '<input class="gcv-dash-input gcv-dash-attr-ac__input" id="' + inputId + '" type="text" required ' +
      'autocomplete="off" spellcheck="false" placeholder="Selecione…" ' +
      'role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="' + suggestId + '" />' +
      '</div>' +
      '<input type="hidden" id="' + hiddenId + '" value="" />' +
      '<div class="gcv-cms-suggest gcv-dash-attr-ac__list" id="' + suggestId + '" role="listbox" hidden></div>' +
      '</div>'
    );
  }

  function bindAttractionCombobox(inputId, hiddenId, suggestId, attrs, opts) {
    var input = document.getElementById(inputId);
    var hidden = document.getElementById(hiddenId);
    var box = document.getElementById(suggestId);
    if (!input || !hidden || !box) return;
    var catalog = sortAttractionsCatalog(attrs);
    var active = -1;
    var open = false;
    var blurTimer = null;
    opts = opts || {};

    var wrap = input.closest('.gcv-dash-attr-ac');
    var field = input.closest('.gcv-dash-field');
    var scrim = wrap ? wrap.querySelector('.gcv-dash-attr-ac__scrim') : null;

    function excludedIds() {
      if (typeof opts.getExcludedIds !== 'function') return [];
      return opts.getExcludedIds() || [];
    }

    function availableCatalog() {
      var taken = {};
      excludedIds().forEach(function (id) {
        taken[String(id)] = true;
      });
      return catalog.filter(function (a) {
        if (String(a.id) === String(hidden.value)) return true;
        return !taken[String(a.id)];
      });
    }

    function setOpen(v) {
      open = !!v;
      input.setAttribute('aria-expanded', open ? 'true' : 'false');
      box.hidden = !open;
      if (wrap) wrap.classList.toggle('is-open', open);
      if (field) field.classList.toggle('is-attr-picking', open);
      if (scrim) scrim.hidden = !open;
      document.body.classList.toggle('gcv-attr-picking', !!document.querySelector('.gcv-dash-attr-ac.is-open'));
    }

    function setPicked(item) {
      if (!item) {
        hidden.value = '';
        input.classList.remove('is-picked');
        if (typeof opts.onChange === 'function') opts.onChange(null);
        return;
      }
      hidden.value = String(item.id);
      input.value = item.title_pt || '';
      input.classList.add('is-picked');
      setOpen(false);
      box.innerHTML = '';
      active = -1;
      if (typeof opts.onChange === 'function') opts.onChange(item);
    }

    function currentMatches() {
      var pool = availableCatalog();
      var q = foldText(input.value.trim());
      var selected = catalog.filter(function (a) { return String(a.id) === String(hidden.value); })[0];
      if (hidden.value && selected && foldText(selected.title_pt || '') === q) {
        return pool.slice();
      }
      if (!q) return pool.slice();
      return pool.filter(function (a) {
        return foldText(a.title_pt).indexOf(q) !== -1;
      });
    }

    function restorePickedLabel() {
      if (!hidden.value) return false;
      var item = catalog.filter(function (a) { return String(a.id) === String(hidden.value); })[0];
      if (!item) return false;
      input.value = item.title_pt || '';
      input.classList.add('is-picked');
      return true;
    }

    function render(list) {
      active = -1;
      if (!list.length) {
        var leftover = availableCatalog().length;
        box.innerHTML = '<div class="gcv-cms-muted">' +
          (leftover === 0
            ? 'Todos os passeios já foram selecionados em outros dias.'
            : 'Nenhum passeio com esse nome') +
          '</div>';
        setOpen(true);
        return;
      }
      var pickedId = String(hidden.value || '');
      box.innerHTML = list.map(function (a, i) {
        var picked = String(a.id) === pickedId;
        if (picked) active = i;
        return '<button type="button" class="gcv-cms-suggest__item' +
          (picked ? ' is-picked is-active' : '') +
          '" role="option" data-attr-id="' + a.id + '" data-idx="' + i + '"' +
          (picked ? ' aria-selected="true"' : '') + '>' +
          (picked ? '<span class="gcv-dash-attr-ac__check" aria-hidden="true">✓</span>' : '') +
          '<span>' + esc(a.title_pt) + '</span></button>';
      }).join('');
      box.querySelectorAll('[data-attr-id]').forEach(function (btn) {
        btn.onmousedown = function (ev) { ev.preventDefault(); };
        btn.onclick = function () {
          var id = parseInt(btn.getAttribute('data-attr-id'), 10);
          var item = catalog.filter(function (a) { return a.id === id; })[0];
          setPicked(item || null);
        };
      });
      setOpen(true);
      var sel = box.querySelector('.is-picked');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function highlight(i) {
      var items = box.querySelectorAll('[data-attr-id]');
      if (!items.length) return;
      if (i < 0) i = items.length - 1;
      if (i >= items.length) i = 0;
      active = i;
      items.forEach(function (el, j) {
        el.classList.toggle('is-active', j === active);
      });
      items[active].scrollIntoView({ block: 'nearest' });
    }

    function openList() {
      render(currentMatches());
      if (hidden.value) {
        try { input.select(); } catch (err) {}
      }
    }

    input.addEventListener('focus', openList);
    input.addEventListener('click', openList);

    input.addEventListener('input', function () {
      input.classList.remove('is-picked');
      render(currentMatches());
    });

    function exactMatch(q) {
      var f = foldText(q);
      if (!f) return null;
      var hits = availableCatalog().filter(function (a) { return foldText(a.title_pt) === f; });
      return hits.length === 1 ? hits[0] : null;
    }

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (!open) openList();
        highlight(active + 1);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!open) openList();
        highlight(active - 1);
      } else if (ev.key === 'Enter') {
        var items = box.querySelectorAll('[data-attr-id]');
        if (open && items.length && active >= 0) {
          ev.preventDefault();
          items[active].click();
        } else if (!hidden.value) {
          ev.preventDefault();
        }
      } else if (ev.key === 'Escape') {
        setOpen(false);
        box.innerHTML = '';
        active = -1;
        restorePickedLabel();
      }
    });

    input.addEventListener('blur', function () {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(function () {
        setOpen(false);
        box.innerHTML = '';
        var exact = exactMatch(input.value.trim());
        if (exact) {
          setPicked(exact);
          return;
        }
        if (restorePickedLabel()) return;
        input.value = '';
        input.classList.remove('is-picked');
      }, 120);
    });

    if (scrim) {
      scrim.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
        setOpen(false);
        box.innerHTML = '';
        active = -1;
      });
    }
  }

  function parseFiniteInt(val, fallback) {
    var n = parseInt(val, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampRange(n, min, max) {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function clampField(el, min, max, fallback) {
    if (!el) return;
    function apply() {
      el.value = String(clampRange(parseFiniteInt(el.value, fallback), min, max));
    }
    el.addEventListener('change', apply);
    el.addEventListener('blur', apply);
  }

  /** Mesma regra do PHP gcv_pricing_commercial_round_reais. */
  function commercialRoundReais(amount) {
    var n = Math.ceil(Number(amount) - 1e-9);
    if (n < 0) n = 0;
    while (n % 5 !== 0 && n % 8 !== 0) n += 1;
    return n;
  }

  function estimateGuideFinalCents(netReais, pct) {
    var netCents = Math.round(Number(netReais) * 100);
    var divisor = 1 - (Number(pct) / 100);
    if (!isFinite(netCents) || netCents <= 0 || !isFinite(divisor) || divisor <= 0) return 0;
    var priceBeforeRound = Math.round(netCents / divisor);
    return commercialRoundReais(priceBeforeRound / 100) * 100;
  }

  function formatBrlFromCents(cents) {
    return 'R$ ' + (Number(cents) / 100).toFixed(2);
  }

  function lifeBadge(code, label) {
    var cls = 'gcv-life gcv-life--' + (code || 'na');
    return '<span class="' + cls + '">' + esc(label || code) + '</span>';
  }

  function attBadge(c) {
    var a = String(c.attendance_status || '').toLowerCase();
    if (a === 'checked_in') return ' · <span class="gcv-dash-client__paid">QR lido</span>';
    if (a === 'no_show') return ' · <span class="gcv-dash-client__pending">Sem conferência QR</span>';
    if (String(c.status || '').toUpperCase() === 'PAID') return ' · <span class="gcv-dash-client__pending">Aguardando QR</span>';
    return '';
  }

  function formatGuideDate(iso) {
    var s = String(iso || '');
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function renderGuideClients(clients) {
    var list = clients || [];
    if (!list.length) {
      return '';
    }
    var totalSpots = 0;
    list.forEach(function (c) {
      totalSpots += parseInt(c.people != null ? c.people : c.spots, 10) || 1;
    });
    return (
      '<div class="gcv-dash-clients-wrap">' +
      '<h4 class="gcv-dash-clients-title">Clientes · ' + list.length + (list.length === 1 ? ' reserva' : ' reservas') +
      ' · ' + totalSpots + (totalSpots === 1 ? ' pessoa' : ' pessoas') + '</h4>' +
      '<ul class="gcv-dash-clients">' +
      list.map(function (c) {
        var people = parseInt(c.people != null ? c.people : c.spots, 10) || 1;
        var paid = String(c.status || '').toUpperCase() === 'PAID';
        var wa = c.whatsapp || '';
        var name = (c.name && String(c.name).trim()) ? String(c.name).trim() : 'Cliente';
        var withT = !!c.with_transport;
        return (
          '<li class="gcv-dash-client">' +
          '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Nome</span> <strong>' + esc(name) + '</strong>' +
          '<span class="gcv-agenda-mode ' + (withT ? 'gcv-agenda-mode--van' : 'gcv-agenda-mode--walk') + '">' +
          (withT ? 'Com transporte' : 'Sem transporte') + '</span></div>' +
          '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Pessoas</span> ' + people + (people === 1 ? ' pessoa' : ' pessoas') + '</div>' +
          (c.email ? '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">E-mail</span> <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></div>' : '') +
          (c.phone
            ? '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Telefone</span> ' + esc(c.phone) +
              (wa ? ' · <a href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
              '</div>'
            : '') +
          '<div class="gcv-dash-client__meta">' +
          (c.reservation_id ? '<code>' + esc(c.reservation_id) + '</code> · ' : '') +
          '<span class="' + (paid ? 'gcv-dash-client__paid' : 'gcv-dash-client__pending') + '">' +
          (paid ? 'Pago' : 'Aguardando pagamento') + '</span>' +
          (attBadge(c)) +
          '</div>' +
          (paid && c.reservation_id && String(c.attendance_status || '') !== 'checked_in'
            ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--primary" data-checkin-code="' +
              esc(c.reservation_id) + '">Confirmar presença</button>'
            : '') +
          '</li>'
        );
      }).join('') +
      '</ul></div>'
    );
  }

  function digitsOnly(s) {
    return String(s == null ? '' : s).replace(/\D+/g, '');
  }

  function formatCpfMask(digits) {
    digits = digitsOnly(digits).slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, 3) + '.' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6);
    return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
  }

  function formatCnpjMask(digits) {
    digits = digitsOnly(digits).slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return digits.slice(0, 2) + '.' + digits.slice(2);
    if (digits.length <= 8) return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5);
    if (digits.length <= 12) return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5, 8) + '/' + digits.slice(8);
    return digits.slice(0, 2) + '.' + digits.slice(2, 5) + '.' + digits.slice(5, 8) + '/' + digits.slice(8, 12) + '-' + digits.slice(12);
  }

  function isValidCpf(value) {
    var cpf = digitsOnly(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    var t, i, sum, digit;
    for (t = 9; t < 11; t++) {
      sum = 0;
      for (i = 0; i < t; i++) sum += parseInt(cpf.charAt(i), 10) * ((t + 1) - i);
      digit = ((10 * sum) % 11) % 10;
      if (parseInt(cpf.charAt(t), 10) !== digit) return false;
    }
    return true;
  }

  function isValidCnpj(value) {
    var cnpj = digitsOnly(value);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    var w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    var w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    var sum = 0;
    var i;
    for (i = 0; i < 12; i++) sum += parseInt(cnpj.charAt(i), 10) * w1[i];
    var d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cnpj.charAt(12), 10) !== d1) return false;
    sum = 0;
    for (i = 0; i < 13; i++) sum += parseInt(cnpj.charAt(i), 10) * w2[i];
    var d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(cnpj.charAt(13), 10) === d2;
  }

  function bindCpfCnpjField(input, typeSelect, labelEl) {
    function isPj() {
      return typeSelect.value === 'PJ';
    }

    function syncUi() {
      var pj = isPj();
      var digits = digitsOnly(input.value);
      input.value = pj ? formatCnpjMask(digits) : formatCpfMask(digits);
      input.maxLength = pj ? 18 : 14;
      input.placeholder = pj ? '00.000.000/0000-00' : '000.000.000-00';
      input.setAttribute('aria-label', pj ? 'CNPJ' : 'CPF');
      if (labelEl) labelEl.textContent = pj ? 'CNPJ *' : 'CPF *';
    }

    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');

    input.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var nav = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];
      if (nav.indexOf(e.key) >= 0) return;
      if (!/^\d$/.test(e.key)) e.preventDefault();
    });

    input.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = '';
      if (e.clipboardData) pasted = e.clipboardData.getData('text') || '';
      else if (window.clipboardData) pasted = window.clipboardData.getData('text') || '';
      input.value = digitsOnly(pasted);
      syncUi();
    });

    input.addEventListener('input', function () {
      syncUi();
    });

    typeSelect.addEventListener('change', syncUi);
    syncUi();
  }

  function uploadFile(file, cb) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'guias');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/guides/media-upload.php');
    xhr.withCredentials = true;
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(fd);
  }

  function bindDashPhone(wrapEl, prefix, initialIso, initialPhone) {
    var empty = {
      getIso: function () { return 'br'; },
      getDial: function () { return '+55'; },
      getPhoneDigits: function () { return ''; },
      validate: function () { return 'Informe o DDD e o telefone'; }
    };
    if (!wrapEl) return empty;
    var api = global.GcvPixReceipt;
    function getCountry(iso) {
      if (api && api.findPhoneCountry) return api.findPhoneCountry(iso || 'br');
      return { iso: 'br', dial: '55', min: 10, max: 11, mask: 'br' };
    }
    function formatMask(v, iso) {
      return (api && api.formatPhoneMask) ? api.formatPhoneMask(v, iso) : String(v || '');
    }
    function nationalDigits(v, iso) {
      return (api && api.nationalPhoneDigits) ? api.nationalPhoneDigits(v, iso) : String(v || '').replace(/\D+/g, '');
    }
    var stateIso = getCountry(initialIso || 'br').iso;

    function countries() {
      return (api && api.getPhoneCountries) ? api.getPhoneCountries() : [getCountry('br')];
    }
    function renderList(q) {
      var list = wrapEl.querySelector('#' + prefix + '-ddi-list');
      if (!list) return;
      q = String(q || '').trim().toLowerCase();
      var html = countries().filter(function (c) {
        if (!q) return true;
        var name = (c.name && (c.name.pt || c.name.en)) || c.iso;
        return String(name).toLowerCase().indexOf(q) >= 0 || ('+' + c.dial).indexOf(q) >= 0 || c.iso.indexOf(q) >= 0;
      }).slice(0, 40).map(function (c) {
        var name = (c.name && (c.name.pt || c.name.en)) || c.iso.toUpperCase();
        return '<button type="button" class="gcv-cms-ddi-option' + (c.iso === stateIso ? ' is-selected' : '') +
          '" data-iso="' + c.iso + '"><span class="fi fi-' + c.iso + '"></span>' +
          '<span class="gcv-cms-ddi-option-name">' + esc(name) + '</span>' +
          '<span class="gcv-cms-ddi-option-dial">+' + c.dial + '</span></button>';
      }).join('');
      list.innerHTML = html || '<p class="gcv-cms-muted" style="padding:0.5rem 0.75rem;">Nenhum país</p>';
      list.querySelectorAll('[data-iso]').forEach(function (btn) {
        btn.onclick = function () {
          setIso(btn.getAttribute('data-iso'));
          closeDrop();
        };
      });
    }
    function syncUi() {
      var c = getCountry(stateIso);
      var flag = wrapEl.querySelector('#' + prefix + '-phone-flag');
      var dial = wrapEl.querySelector('#' + prefix + '-phone-dial');
      var hidden = wrapEl.querySelector('#' + prefix + '-phone-iso');
      var phone = wrapEl.querySelector('#' + prefix + '-phone');
      if (hidden) hidden.value = c.iso;
      if (flag) flag.className = 'fi fi-' + c.iso + ' gcv-cms-phone-flag';
      if (dial) dial.textContent = '+' + c.dial;
      if (phone) {
        if (document.activeElement === phone) {
          applyMaskKeepCaret(phone);
        } else {
          phone.value = formatMask(phone.value, c.iso);
        }
        phone.placeholder = (api && api.phonePlaceholderFor) ? api.phonePlaceholderFor(c.iso) : '(00) 00000-0000';
        phone.maxLength = c.mask === 'br' ? 16 : 20;
      }
    }
    function setIso(nextIso) {
      stateIso = getCountry(nextIso).iso;
      if (api && api.savePhoneDdi) api.savePhoneDdi(stateIso);
      syncUi();
      renderList(wrapEl.querySelector('#' + prefix + '-ddi-search') ? wrapEl.querySelector('#' + prefix + '-ddi-search').value : '');
    }
    function closeDrop() {
      var drop = wrapEl.querySelector('#' + prefix + '-ddi-dropdown');
      var trigger = wrapEl.querySelector('#' + prefix + '-ddi-trigger');
      if (drop) { drop.hidden = true; drop.setAttribute('aria-hidden', 'true'); }
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
    function openDrop() {
      var drop = wrapEl.querySelector('#' + prefix + '-ddi-dropdown');
      var trigger = wrapEl.querySelector('#' + prefix + '-ddi-trigger');
      if (drop) { drop.hidden = false; drop.setAttribute('aria-hidden', 'false'); }
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      renderList('');
      var search = wrapEl.querySelector('#' + prefix + '-ddi-search');
      if (search) { search.value = ''; search.focus(); }
    }

    var c0 = getCountry(stateIso);
    wrapEl.innerHTML =
      '<div class="gcv-cms-phone-row"><div class="gcv-cms-phone-wrap">' +
      '<div class="gcv-cms-phone-prefix">' +
      '<button type="button" class="gcv-cms-ddi-trigger" id="' + prefix + '-ddi-trigger" aria-haspopup="listbox" aria-expanded="false">' +
      '<span class="fi fi-' + c0.iso + ' gcv-cms-phone-flag" id="' + prefix + '-phone-flag" aria-hidden="true"></span>' +
      '<span class="gcv-cms-phone-dial" id="' + prefix + '-phone-dial">+' + c0.dial + '</span>' +
      '<span class="gcv-cms-ddi-caret" aria-hidden="true"></span></button>' +
      '<input type="hidden" id="' + prefix + '-phone-iso" value="' + esc(c0.iso) + '" />' +
      '<div class="gcv-cms-ddi-dropdown" id="' + prefix + '-ddi-dropdown" hidden aria-hidden="true">' +
      '<input type="search" class="gcv-cms-ddi-search" id="' + prefix + '-ddi-search" placeholder="Buscar país ou DDI…" autocomplete="off" />' +
      '<div class="gcv-cms-ddi-list" id="' + prefix + '-ddi-list" role="listbox"></div></div></div>' +
      '<input type="tel" class="gcv-dash-input gcv-cms-phone-input" id="' + prefix + '-phone" autocomplete="tel-national" inputmode="numeric" required />' +
      '</div></div>';

    function applyMaskKeepCaret(input) {
      if (!input) return;
      if (api && api.applyPhoneMaskToInput) {
        api.applyPhoneMaskToInput(input, stateIso);
        return;
      }
      var value = String(input.value || '');
      var start = input.selectionStart;
      if (start == null || start < 0) start = value.length;
      var digitsBefore = (value.slice(0, start).match(/\d/g) || []).length;
      var masked = formatMask(value, stateIso);
      input.value = masked;
      var seen = 0;
      var pos = masked.length;
      if (digitsBefore <= 0) {
        pos = 0;
      } else {
        for (var i = 0; i < masked.length; i++) {
          var ch = masked.charAt(i);
          if (ch >= '0' && ch <= '9') {
            seen++;
            if (seen >= digitsBefore) { pos = i + 1; break; }
          }
        }
      }
      try { input.setSelectionRange(pos, pos); } catch (err) { /* */ }
    }

    var phoneInput = wrapEl.querySelector('#' + prefix + '-phone');
    if (phoneInput) {
      phoneInput.value = formatMask(initialPhone || '', stateIso);
      phoneInput.addEventListener('input', function () {
        applyMaskKeepCaret(phoneInput);
      });
    }
    wrapEl.querySelector('#' + prefix + '-ddi-trigger').onclick = function () {
      var drop = wrapEl.querySelector('#' + prefix + '-ddi-dropdown');
      if (drop && !drop.hidden) closeDrop();
      else openDrop();
    };
    wrapEl.querySelector('#' + prefix + '-ddi-search').addEventListener('input', function () {
      renderList(wrapEl.querySelector('#' + prefix + '-ddi-search').value);
    });
    document.addEventListener('click', function (ev) {
      if (!wrapEl.contains(ev.target)) closeDrop();
    });

    function ready() {
      syncUi();
      renderList('');
    }
    if (api && api.ensurePhoneCountries) {
      api.ensurePhoneCountries().then(ready).catch(ready);
    } else {
      ready();
    }

    return {
      getIso: function () { return stateIso; },
      getDial: function () { return '+' + getCountry(stateIso).dial; },
      getPhoneDigits: function () { return nationalDigits(phoneInput ? phoneInput.value : '', stateIso); },
      validate: function () {
        var digits = nationalDigits(phoneInput ? phoneInput.value : '', stateIso);
        if (api && api.phoneValidationMessage) {
          var msg = api.phoneValidationMessage(digits, stateIso, 'pt');
          if (msg) return 'Informe DDD + telefone válidos';
        }
        if (!digits) return 'Informe o DDD e o telefone';
        if (stateIso === 'br') {
          if (digits.length < 10 || digits.length > 11) return 'Telefone: DDD (2 dígitos) + número';
          if (digits.length === 11 && digits.charAt(2) !== '9') return 'Celular precisa do 9 depois do DDD';
        }
        return '';
      }
    };
  }

  function gotoDashSection(sectionId) {
    var link = document.querySelector('.gcv-dash-nav a[data-section="' + sectionId + '"]')
      || document.querySelector('.gcv-dash-bottom-nav a[data-section="' + sectionId + '"]');
    if (link) link.click();
  }

  function profileUiLang() {
    var lang = String((document.documentElement.lang || 'pt')).slice(0, 2).toLowerCase();
    return (lang === 'en' || lang === 'es') ? lang : 'pt';
  }

  function sexoUi() {
    var all = {
      pt: { label: 'Sexo *', m: 'Masculino', f: 'Feminino', ph: 'Selecione…', err: 'Selecione o sexo.', missing: 'Sexo' },
      en: { label: 'Gender *', m: 'Male', f: 'Female', ph: 'Select…', err: 'Select gender.', missing: 'Gender' },
      es: { label: 'Sexo *', m: 'Masculino', f: 'Femenino', ph: 'Seleccione…', err: 'Seleccione el sexo.', missing: 'Sexo' }
    };
    return all[profileUiLang()] || all.pt;
  }

  function docUi() {
    var all = {
      pt: {
        title: 'Documento',
        label: 'RG, CNH ou documento com foto *',
        hint: 'RG, CNH ou outro documento com foto.',
        send: 'Enviar documento',
        change: 'Trocar documento',
        uploaded: 'Documento enviado',
        remove: 'Excluir',
        removing: 'Excluir este documento?',
        sending: 'Enviando documento…',
        fail: 'Falha no upload',
        err: 'Envie o RG, CNH ou outro documento com foto.',
        missing: 'Documento (RG/CNH)',
        fileFallback: 'documento'
      },
      en: {
        title: 'ID document',
        label: 'ID, driver’s license or photo ID *',
        hint: 'National ID, driver’s license or another photo ID.',
        send: 'Upload document',
        change: 'Replace document',
        uploaded: 'Document uploaded',
        remove: 'Delete',
        removing: 'Delete this document?',
        sending: 'Uploading document…',
        fail: 'Upload failed',
        err: 'Upload your ID, driver’s license or another photo ID.',
        missing: 'ID document',
        fileFallback: 'document'
      },
      es: {
        title: 'Documento',
        label: 'DNI, CNH o documento con foto *',
        hint: 'DNI, licencia de conducir u otro documento con foto.',
        send: 'Enviar documento',
        change: 'Cambiar documento',
        uploaded: 'Documento enviado',
        remove: 'Eliminar',
        removing: '¿Eliminar este documento?',
        sending: 'Enviando documento…',
        fail: 'Error al subir',
        err: 'Envíe el DNI, la licencia o otro documento con foto.',
        missing: 'Documento (DNI/CNH)',
        fileFallback: 'documento'
      }
    };
    return all[profileUiLang()] || all.pt;
  }

  function isDocImageUrl(url) {
    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(String(url || ''));
  }

  function docFileName(url) {
    try {
      var path = decodeURIComponent(String(url || '').split('?')[0]);
      var base = path.split('/').pop() || '';
      return base || docUi().fileFallback;
    } catch (e) {
      return docUi().fileFallback;
    }
  }

  function guideIdDocStatusHtml(url) {
    var t = docUi();
    url = String(url || '').trim();
    if (!url) {
      return '<span>' + esc(t.hint) + '</span>';
    }
    var thumb = isDocImageUrl(url)
      ? '<img class="gcv-dash-doc-file__thumb" src="' + esc(url) + '" alt="" />'
      : '<span class="gcv-dash-doc-file__pdf" aria-hidden="true">PDF</span>';
    return '<div class="gcv-dash-doc-file">' +
      '<a class="gcv-dash-doc-file__preview" href="' + esc(url) + '" target="_blank" rel="noopener">' +
        thumb +
        '<span class="gcv-dash-doc-file__meta">' +
          '<span class="gcv-dash-doc-ok">' + esc(t.uploaded) + '</span>' +
          '<span class="gcv-dash-doc-file__name">' + esc(docFileName(url)) + '</span>' +
        '</span>' +
      '</a>' +
      '<button type="button" class="gcv-dash-doc-remove" id="gp-doc-remove">' + esc(t.remove) + '</button>' +
    '</div>';
  }

  function bindGuideIdDocRemove() {
    var btn = document.getElementById('gp-doc-remove');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var t = docUi();
      var go = function (ok) { if (ok) setGuideIdDoc(''); };
      if (typeof global.gcvConfirm === 'function') {
        global.gcvConfirm(t.removing, { danger: true, okText: t.remove }).then(go).catch(function () { go(false); });
      } else {
        go(window.confirm(t.removing));
      }
    });
  }

  function setGuideIdDoc(url) {
    var t = docUi();
    url = String(url || '').trim();
    var urlEl = document.getElementById('gp-doc-url');
    var status = document.getElementById('gp-doc-status');
    var btnText = document.getElementById('gp-doc-btn-text');
    var field = document.getElementById('gp-doc-field');
    if (urlEl) urlEl.value = url;
    if (status) status.innerHTML = guideIdDocStatusHtml(url);
    if (btnText) btnText.textContent = url ? t.change : t.send;
    if (url && field) {
      field.classList.remove('is-error');
      var err = field.querySelector('.gcv-dash-field-error');
      if (err) { err.hidden = true; err.textContent = ''; }
    }
    bindGuideIdDocRemove();
  }

  function profileMissingLabel(key) {
    var map = {
      full_name: 'Nome completo',
      email: 'E-mail',
      phone: 'Telefone',
      birth_date: 'Nascimento',
      sexo: sexoUi().missing,
      base_city_id: 'Cidade',
      photo_3x4_url: 'Foto 3×4',
      id_document_url: docUi().missing,
      legal_name: 'Nome / Razão social',
      cpf_cnpj: 'CPF/CNPJ',
      pix_key: 'Chave PIX'
    };
    return map[key] || key;
  }

  function clearGuideFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.is-error').forEach(function (el) { el.classList.remove('is-error'); });
    form.querySelectorAll('.gcv-dash-field-error').forEach(function (el) {
      el.hidden = true;
      el.textContent = '';
    });
  }

  function markGuideFieldError(target, message) {
    if (!target) return null;
    var field = target.closest ? (target.closest('.gcv-dash-field') || target.closest('.gcv-dash-photo-col') || target) : target;
    field.classList.add('is-error');
    var err = field.querySelector ? field.querySelector('.gcv-dash-field-error') : null;
    if (!err && field.appendChild) {
      err = document.createElement('p');
      err.className = 'gcv-dash-field-error';
      field.appendChild(err);
    }
    if (err) {
      err.hidden = false;
      err.textContent = message || 'Campo obrigatório';
    }
    return field;
  }

  function focusFirstGuideError(form) {
    if (!form) return;
    var first = form.querySelector('.is-error');
    if (!first) return;
    try {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      first.scrollIntoView(true);
    }
    var focusable = first.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea');
    if (focusable) {
      try { focusable.focus({ preventScroll: true }); } catch (err) { focusable.focus(); }
    }
  }

  function showGuideFormBanner(text, kind) {
    var msg = document.getElementById('gp-msg');
    if (!msg) return;
    msg.hidden = false;
    msg.className = 'gcv-dash-alert ' + (kind === 'success' ? 'gcv-dash-alert--success' : 'gcv-dash-alert--error');
    msg.textContent = text;
  }

  function mapGuideApiErrorToField(apiErr, els) {
    var t = String(apiErr || '').toLowerCase();
    if (!t) return null;
    if (t.indexOf('foto') >= 0) return markGuideFieldError(els.photo, apiErr);
    if (t.indexOf('rg') >= 0 || t.indexOf('cnh') >= 0 || t.indexOf('documento') >= 0) {
      return markGuideFieldError(els.idDoc, apiErr);
    }
    if (t.indexOf('nome completo') >= 0) return markGuideFieldError(els.full, apiErr);
    if (t.indexOf('telefone') >= 0) return markGuideFieldError(els.phone, apiErr);
    if (t.indexOf('nascimento') >= 0 || t.indexOf('18 anos') >= 0) return markGuideFieldError(els.birth, apiErr);
    if (t.indexOf('sexo') >= 0 || t.indexOf('gender') >= 0) return markGuideFieldError(els.sexo, apiErr);
    if (t.indexOf('cidade') >= 0) return markGuideFieldError(els.city, apiErr);
    if (t.indexOf('cnpj') >= 0 || (t.indexOf('cpf') >= 0 && t.indexOf('pix') < 0)) return markGuideFieldError(els.doc, apiErr);
    if (t.indexOf('razão') >= 0 || t.indexOf('razao') >= 0 || t.indexOf('nome /') >= 0) return markGuideFieldError(els.legal, apiErr);
    if (t.indexOf('pix') >= 0) return markGuideFieldError(els.pix, apiErr);
    return null;
  }

  /* ---------- GUIA: PERFIL ---------- */
  function loadGuideProfile() {
    var root = document.getElementById('guide-profile-root');
    if (!root) return;
    root.innerHTML = 'Carregando perfil…';
    get('/api/guides/me-profile.php', function (err, res) {
      if (!res || !res.ok) {
        var msg = (res && res.error) || 'Erro ao carregar perfil.';
        root.innerHTML = '<p class="gcv-dash-alert">' + esc(msg) + '</p>';
        return;
      }
      var d = res.data || {};
      var p = d.profile || {};
      var cities = d.base_cities || [];
      var limits = d.limits || { bio_max: 800, bio_recommended: 600 };
      var missing = d.missing || [];
      var complete = missing.length === 0;
      var fin = d.financial || {};
      var savedPhoto = p.photo_3x4_url || p.photo_url || '';
      var photoUrl = savedPhoto || p.avatar_url || '';
      var docUrl = p.id_document_url || '';
      var docT = docUi();
      var initial = String(p.full_name || p.nickname || p.user_name || '?').charAt(0).toUpperCase();
      var missingTxt = missing.map(profileMissingLabel).join(', ');
      var pendingFirst = (String(p.user_status || '') === 'pending' && (!complete || !!p.needs_resubmit));
      var saveLabel = pendingFirst ? 'Enviar para Aprovação' : 'Salvar';
      var personType = (fin.person_type === 'PJ' || fin.person_type === 'CNPJ' || p.person_type === 'PJ') ? 'PJ' : 'PF';
      if (!fin.person_type && !p.person_type && fin.cnpj && !fin.cpf) personType = 'PJ';
      var rejection = d.rejection || {};
      var isRejected = !!rejection.rejected;
      var canResubmit = isRejected && !!rejection.can_submit;
      var daysLeft = parseInt(rejection.days_left, 10) || 0;
      var statusBanner;
      if (isRejected) {
        statusBanner =
          '<div class="gcv-dash-alert gcv-dash-alert--rejected"><strong>' +
          ((window.GcvGuideGender && window.GcvGuideGender.isWoman(p)) ? 'RECUSADA' : 'RECUSADO') +
          '</strong>' +
          (rejection.reason ? '<p style="margin:0.55rem 0 0;font-weight:600;">' + esc(rejection.reason) + '</p>' : '') +
          (canResubmit
            ? '<p style="margin:0.55rem 0 0;font-weight:700;">Você já pode solicitar uma nova aprovação.</p>'
            : '<p style="margin:0.55rem 0 0;font-weight:700;">Nova solicitação disponível em ' + daysLeft + ' dia' + (daysLeft === 1 ? '' : 's') + '.</p>') +
          '</div>';
      } else if (p.needs_resubmit && String(p.user_status || '') === 'pending') {
        statusBanner = '<div class="gcv-dash-alert gcv-dash-alert--warning">Seu cadastro voltou para rascunho para correção. Ajuste os dados e envie novamente para aprovação.</div>';
      } else if (complete) {
        statusBanner = String(p.user_status || '') === 'pending'
          ? '<div class="gcv-dash-alert gcv-dash-alert--pending">Aguardando Aprovação</div>'
          : '';
      } else {
        statusBanner = '<div class="gcv-dash-alert gcv-dash-alert--warning">Preencha os campos obrigatórios para enviar o cadastro.' +
          (missingTxt ? ' Faltam: <strong>' + esc(missingTxt) + '</strong>' : '') + '</div>';
      }

      root.innerHTML =
        statusBanner +
        '<div id="gp-msg" class="gcv-dash-alert" hidden style="margin-top:0.75rem;"></div>' +
        '<form class="gcv-dash-form gcv-dash-form--profile" id="guide-profile-form" novalidate>' +

        '<div class="gcv-dash-card gcv-dash-profile-hero">' +
          '<div class="gcv-dash-photo-col">' +
            '<div class="gcv-dash-photo-circle" id="gp-photo-circle">' +
              (photoUrl
                ? '<img id="gp-photo-preview" src="' + esc(photoUrl) + '" alt="Foto 3×4" />'
                : '<img id="gp-photo-preview" alt="Foto 3×4" hidden />') +
              '<span class="gcv-dash-photo-circle__empty" id="gp-photo-empty"' + (photoUrl ? ' hidden' : '') + '>' + esc(initial) + '</span>' +
            '</div>' +
            '<label class="gcv-dash-file-btn">' +
              '<input type="file" id="gp-photo-file" accept="image/*" hidden />' +
              (savedPhoto ? 'Trocar foto' : 'Enviar foto 3×4 *') +
            '</label>' +
            '<p class="gcv-dash-photo-hint">Foto obrigatória — assim aparece no site</p>' +
            '<input type="hidden" id="gp-photo-url" value="' + esc(savedPhoto) + '" />' +
            '<p class="gcv-cms-muted" id="gp-photo-status" hidden></p>' +
            '<p class="gcv-dash-field-error" hidden></p>' +
          '</div>' +
          '<div class="gcv-dash-profile-hero__fields">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome completo *</label>' +
            '<input class="gcv-dash-input" id="gp-full" maxlength="160" value="' + esc(p.full_name || '') + '" required />' +
            '<p class="gcv-dash-field-error" hidden></p></div>' +
            '<div class="gcv-dash-field-row">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Apelido</label>' +
            '<input class="gcv-dash-input" id="gp-nick" maxlength="80" value="' + esc(p.nickname || '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">E-mail *</label>' +
            '<input class="gcv-dash-input" value="' + esc(p.email || '') + '" disabled /></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="gcv-dash-card">' +
          '<h3 class="gcv-dash-card__title">WhatsApp</h3>' +
          '<p class="gcv-dash-hint" style="margin:0 0 0.75rem;">Este número recebe os avisos: cadastro em aprovação, passeio enviado, aprovado, recusado e novo inscrito.</p>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone com DDI *</label>' +
          '<div id="gp-phone-wrap"></div>' +
          '<p class="gcv-dash-field-error" id="gp-phone-err" hidden></p></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento *</label>' +
          '<input class="gcv-dash-input" id="gp-birth" type="date" value="' + esc(p.birth_date || '') + '" required />' +
          '<p class="gcv-dash-field-error" hidden></p></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">' + esc(sexoUi().label) + '</label>' +
          '<select class="gcv-dash-select" id="gp-sexo" required>' +
          '<option value="">' + esc(sexoUi().ph) + '</option>' +
          '<option value="M"' + (String(p.sexo || '').toUpperCase() === 'M' ? ' selected' : '') + '>' + esc(sexoUi().m) + '</option>' +
          '<option value="F"' + (String(p.sexo || '').toUpperCase() === 'F' ? ' selected' : '') + '>' + esc(sexoUi().f) + '</option>' +
          '</select><p class="gcv-dash-field-error" hidden></p></div>' +
          '<div class="gcv-dash-field" style="margin-bottom:0;"><label class="gcv-dash-label">Cidade onde mora *</label>' +
          '<select class="gcv-dash-select" id="gp-city" required><option value="">Selecione…</option>' +
          cities.map(function (c) {
            return '<option value="' + c.id + '"' + (String(p.base_city_id) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
          }).join('') +
          '</select><p class="gcv-dash-field-error" hidden></p></div>' +
        '</div>' +

        '<div class="gcv-dash-card">' +
          '<h3 class="gcv-dash-card__title">Sobre você</h3>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Idiomas falados</label>' +
          languagesPickerHtml(p.languages) +
          '</div>' +
          '<div class="gcv-dash-field" style="margin-bottom:0;"><label class="gcv-dash-label">Descrição <span class="gcv-cms-muted">(opcional · recomendado ≤' + limits.bio_recommended + '; máx. ' + limits.bio_max + ')</span></label>' +
          '<textarea class="gcv-dash-textarea" id="gp-bio" maxlength="' + limits.bio_max + '" rows="7">' + esc(p.bio_pt || '') + '</textarea>' +
          '<div class="gcv-cms-muted" id="gp-bio-count"></div></div>' +
        '</div>' +

        '<div class="gcv-dash-card">' +
          '<h3 class="gcv-dash-card__title">' + esc(docT.title) + '</h3>' +
          '<div class="gcv-dash-doc-id-grid">' +
            '<div class="gcv-dash-field" id="gp-doc-field">' +
              '<label class="gcv-dash-label" for="gp-doc-file">' + esc(docT.label) + '</label>' +
              '<input type="hidden" id="gp-doc-url" value="' + esc(docUrl) + '" />' +
              '<div class="gcv-dash-doc-row">' +
                '<div class="gcv-dash-doc-status" id="gp-doc-status">' + guideIdDocStatusHtml(docUrl) + '</div>' +
                '<label class="gcv-dash-file-btn gcv-dash-file-btn--secondary">' +
                  '<input type="file" id="gp-doc-file" accept="image/*,application/pdf" hidden />' +
                  '<span id="gp-doc-btn-text">' + esc(docUrl ? docT.change : docT.send) + '</span>' +
                '</label>' +
              '</div>' +
              '<p class="gcv-dash-field-error" hidden></p>' +
            '</div>' +
            '<div>' +
              '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo CPF / CNPJ *</label>' +
              '<select class="gcv-dash-select" id="gf-type">' +
              '<option value="PF">CPF</option>' +
              '<option value="PJ">CNPJ</option>' +
              '</select></div>' +
              '<div class="gcv-dash-field" style="margin-bottom:0;"><label class="gcv-dash-label" id="gf-doc-label">CPF *</label>' +
              '<input class="gcv-dash-input" id="gf-doc" type="text" inputmode="numeric" autocomplete="off" required />' +
              '<p class="gcv-dash-field-error" hidden></p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="gcv-dash-profile-finance">' +
          '<h2 class="gcv-dash-section-title gcv-dash-section-title--sub">Dados financeiros</h2>' +
          '<p class="gcv-dash-hint">Chave PIX para receber o repasse automático após as 16h20 do dia do passeio.' +
          (String(p.user_status || '') === 'active'
            ? ' <a href="#financeiro" id="gp-goto-earnings">Ver painel de recebimentos</a>.'
            : '') +
          '</p>' +
          '<div class="gcv-dash-card">' +
            '<h3 class="gcv-dash-card__title">Recebimento PIX</h3>' +
            '<div class="gcv-dash-field-row">' +
              '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo de chave *</label>' +
              '<select class="gcv-dash-select" id="gf-pix-type">' +
              '<option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option>' +
              '<option value="phone">Telefone</option><option value="random">Aleatória</option>' +
              '</select><p class="gcv-dash-field-error" hidden></p></div>' +
              '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX *</label>' +
              '<input class="gcv-dash-input" id="gf-pix" value="' + esc(fin.pix_key || '') + '" required />' +
              '<p class="gcv-dash-field-error" hidden></p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="gcv-dash-profile-actions">' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary" id="gp-save">' + esc(saveLabel) + '</button>' +
        (isRejected
          ? ('<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="gp-submit-approval"' +
            (canResubmit ? '' : ' disabled') + '>Enviar para aprovação</button>' +
            (canResubmit ? '' : '<p class="gcv-cms-muted" style="margin:0.45rem 0 0;">O envio para aprovação fica desativado por 45 dias após a recusa. O perfil continua disponível.</p>'))
          : '') +
        '</div>' +
        '</form>';

      var bio = document.getElementById('gp-bio');
      var bioCount = document.getElementById('gp-bio-count');
      function updateBioCount() {
        if (!bio || !bioCount) return;
        var n = (bio.value || '').length;
        bioCount.textContent = n + ' / ' + limits.bio_max + ' (ideal ≤' + limits.bio_recommended + ')';
        bioCount.className = 'gcv-cms-muted' + (n > limits.bio_recommended ? ' gcv-dash-count--warn' : '');
      }
      if (bio) bio.addEventListener('input', updateBioCount);
      updateBioCount();

      var gotoEarn = document.getElementById('gp-goto-earnings');
      if (gotoEarn) {
        gotoEarn.addEventListener('click', function (ev) {
          ev.preventDefault();
          gotoDashSection('section-guide-financial');
        });
      }

      var typeEl = document.getElementById('gf-type');
      var docEl = document.getElementById('gf-doc');
      if (typeEl && docEl) {
        typeEl.value = personType;
        docEl.value = personType === 'PJ' ? (fin.cnpj || p.cnpj || '') : (fin.cpf || p.cpf || '');
        bindCpfCnpjField(docEl, typeEl, document.getElementById('gf-doc-label'));
      }
      if (fin.pix_key_type) {
        var pixTypeEl = document.getElementById('gf-pix-type');
        if (pixTypeEl) pixTypeEl.value = fin.pix_key_type;
      }

      function showPhoto(url) {
        var img = document.getElementById('gp-photo-preview');
        var empty = document.getElementById('gp-photo-empty');
        var urlEl = document.getElementById('gp-photo-url');
        if (urlEl && url && url.indexOf('blob:') !== 0) urlEl.value = url;
        if (img && url) {
          img.src = url;
          img.hidden = false;
        }
        if (empty) empty.hidden = !!url;
        var dashAvatar = document.getElementById('dash-avatar');
        if (dashAvatar && url && url.indexOf('blob:') !== 0) {
          dashAvatar.innerHTML = '<img src="' + url + '" alt="Avatar" />';
        }
      }

      var photoInput = document.getElementById('gp-photo-file');
      if (photoInput) {
        photoInput.addEventListener('change', function () {
          var file = photoInput.files && photoInput.files[0];
          if (!file) return;
          var status = document.getElementById('gp-photo-status');
          var localUrl = URL.createObjectURL(file);
          showPhoto(localUrl);
          if (status) {
            status.hidden = false;
            status.textContent = 'Enviando foto…';
          }
          uploadFile(file, function (e, r) {
            if (!r || !r.ok) {
              if (status) status.textContent = (r && r.error) || 'Falha no upload';
              return;
            }
            var url = (r.data && r.data.url) || '';
            showPhoto(url);
            if (status) {
              status.hidden = false;
              status.textContent = 'Foto atualizada.';
            }
          });
        });
      }

      bindGuideIdDocRemove();
      var docInput = document.getElementById('gp-doc-file');
      if (docInput) {
        docInput.addEventListener('change', function () {
          var file = docInput.files && docInput.files[0];
          if (!file) return;
          var prev = (document.getElementById('gp-doc-url') && document.getElementById('gp-doc-url').value) || '';
          var status = document.getElementById('gp-doc-status');
          if (status) status.innerHTML = '<span>' + esc(docT.sending) + '</span>';
          uploadFile(file, function (e, r) {
            docInput.value = '';
            if (!r || !r.ok) {
              setGuideIdDoc(prev);
              markGuideFieldError(document.getElementById('gp-doc-field'), (r && r.error) || docT.fail);
              return;
            }
            setGuideIdDoc((r.data && r.data.url) || '');
          });
        });
      }

      var gpPhone = bindDashPhone(
        document.getElementById('gp-phone-wrap'),
        'gp',
        p.phone_iso || p.phone_ddi || 'br',
        p.phone || ''
      );

      document.getElementById('guide-profile-form').onsubmit = function (ev) {
        ev.preventDefault();
        var form = document.getElementById('guide-profile-form');
        clearGuideFieldErrors(form);
        var banner = document.getElementById('gp-msg');
        if (banner) { banner.hidden = true; banner.textContent = ''; }

        var errors = 0;
        function addErr(el, text) {
          markGuideFieldError(el, text);
          errors++;
        }

        var photoUrlVal = (document.getElementById('gp-photo-url').value || '').trim();
        if (!photoUrlVal) {
          addErr(document.querySelector('.gcv-dash-photo-col'), 'Envie a foto 3×4.');
        }
        var fullEl = document.getElementById('gp-full');
        if (!fullEl || (fullEl.value || '').trim().length < 2) {
          addErr(fullEl, 'Informe o nome completo.');
        }
        var phoneErrEl = document.getElementById('gp-phone-err');
        var phoneIssue = gpPhone.validate();
        if (phoneIssue) {
          addErr(document.getElementById('gp-phone-wrap') || phoneErrEl, phoneIssue);
        }
        var birthEl = document.getElementById('gp-birth');
        var birthVal = birthEl ? (birthEl.value || '').trim() : '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthVal)) {
          addErr(birthEl, 'Informe a data de nascimento.');
        } else {
          var birthDt = new Date(birthVal + 'T00:00:00');
          var adult = new Date();
          adult.setFullYear(adult.getFullYear() - 18);
          if (!(birthDt instanceof Date) || isNaN(birthDt.getTime()) || birthDt > adult) {
            addErr(birthEl, 'É necessário ter 18 anos ou mais.');
          }
        }
        var sexoEl = document.getElementById('gp-sexo');
        if (!sexoEl || (sexoEl.value !== 'M' && sexoEl.value !== 'F')) {
          addErr(sexoEl, sexoUi().err);
        }
        var cityEl = document.getElementById('gp-city');
        if (!cityEl || !cityEl.value) {
          addErr(cityEl, 'Selecione a cidade onde mora.');
        }
        var idDocUrlVal = (document.getElementById('gp-doc-url') && document.getElementById('gp-doc-url').value || '').trim();
        if (!idDocUrlVal) {
          addErr(document.getElementById('gp-doc-field'), docT.err);
        }
        var isPj = typeEl && typeEl.value === 'PJ';
        var docDigits = digitsOnly(docEl ? docEl.value : '');
        var docOk = isPj ? isValidCnpj(docDigits) : isValidCpf(docDigits);
        if (!docOk) {
          addErr(docEl, isPj ? 'CNPJ inválido. Confira os 14 dígitos.' : 'CPF inválido. Confira os 11 dígitos.');
        }
        var legalEl = null;
        var legalName = (fullEl && fullEl.value || '').trim();
        var pixEl = document.getElementById('gf-pix');
        var pixTypeEl = document.getElementById('gf-pix-type');
        var pixKey = (pixEl && pixEl.value || '').trim();
        var pixType = (pixTypeEl && pixTypeEl.value || '').trim();
        if (!pixType) {
          addErr(pixTypeEl, 'Selecione o tipo de chave PIX.');
        }
        if (!pixKey) {
          addErr(pixEl, 'Informe a chave PIX.');
        }

        if (errors) {
          showGuideFormBanner('Há ' + errors + (errors === 1 ? ' campo' : ' campos') + ' com erro. Corrija o destacado em amarelo.', 'error');
          focusFirstGuideError(form);
          return;
        }

        var payload = {
          full_name: document.getElementById('gp-full').value.trim(),
          nickname: document.getElementById('gp-nick').value.trim(),
          phone_ddi: gpPhone.getDial(),
          phone_iso: gpPhone.getIso(),
          phone: gpPhone.getPhoneDigits(),
          birth_date: document.getElementById('gp-birth').value,
          sexo: (document.getElementById('gp-sexo') && document.getElementById('gp-sexo').value) || '',
          base_city_id: parseInt(document.getElementById('gp-city').value, 10) || 0,
          bio_pt: document.getElementById('gp-bio').value.trim(),
          languages: readLanguagesPicker(document.getElementById('guide-profile-form')),
          id_document_url: document.getElementById('gp-doc-url').value.trim(),
          photo_3x4_url: photoUrlVal,
          legal_name: legalName,
          person_type: isPj ? 'PJ' : 'PF',
          cpf: isPj ? '' : docDigits,
          cnpj: isPj ? docDigits : '',
          pix_key: pixKey,
          pix_key_type: pixType,
          submit_for_approval: form.getAttribute('data-submit-approval') === '1' ? 1 : 0
        };
        form.setAttribute('data-submit-approval', '0');
        var saveBtn = document.getElementById('gp-save');
        var submitBtn = document.getElementById('gp-submit-approval');
        if (saveBtn) saveBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        sendJson('PUT', '/api/guides/me-profile.php', payload, function (e, r) {
          if (saveBtn) saveBtn.disabled = false;
          if (submitBtn && !submitBtn.getAttribute('data-locked')) submitBtn.disabled = false;
          if (!r || !r.ok) {
            var apiErr = (r && r.error) || 'Erro ao salvar. Tente novamente.';
            var mapped = mapGuideApiErrorToField(apiErr, {
              full: document.getElementById('gp-full'),
              phone: document.getElementById('gp-phone-wrap'),
              birth: document.getElementById('gp-birth'),
              sexo: document.getElementById('gp-sexo'),
              city: document.getElementById('gp-city'),
              photo: document.querySelector('.gcv-dash-photo-col'),
              idDoc: document.getElementById('gp-doc-field'),
              doc: docEl,
              legal: legalEl,
              pix: pixEl
            });
            showGuideFormBanner(apiErr, 'error');
            if (mapped) focusFirstGuideError(form);
            else {
              var top = document.getElementById('gp-msg');
              if (top) top.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }
          if (r.data && r.data.submitted_for_approval) {
            var pendingMsg = 'Cadastro enviado para aprovação. Você receberá um WhatsApp quando for aprovado. Enquanto isso, só esta tela de perfil fica disponível.';
            var afterOk = function () { loadGuideProfile(); };
            if (typeof global.gcvAlert === 'function') {
              global.gcvAlert(pendingMsg).then(afterOk).catch(afterOk);
            } else if (typeof global.gcvConfirm === 'function') {
              global.gcvConfirm(pendingMsg, { alert: true, okText: 'Entendi' }).then(afterOk).catch(afterOk);
            } else {
              window.alert(pendingMsg);
              afterOk();
            }
            return;
          }
          showGuideFormBanner('Perfil salvo!', 'success');
          loadGuideProfile();
        });
      };

      var submitApprovalBtn = document.getElementById('gp-submit-approval');
      if (submitApprovalBtn) {
        if (!canResubmit) submitApprovalBtn.setAttribute('data-locked', '1');
        submitApprovalBtn.addEventListener('click', function () {
          var formEl = document.getElementById('guide-profile-form');
          if (!formEl || submitApprovalBtn.disabled) return;
          formEl.setAttribute('data-submit-approval', '1');
          if (typeof formEl.requestSubmit === 'function') formEl.requestSubmit();
          else formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
      }
    });
  }

  /* ---------- GUIA: AGENDA ---------- */
  var checkinScanner = null;
  var checkinBusy = false;
  var lastScanCode = '';
  var lastScanAt = 0;

  function extractReservationCode(raw) {
    var m = String(raw || '').toUpperCase().match(/GCV-[A-Z0-9]{6}/);
    return m ? m[0] : '';
  }

  function checkinModalOpen() {
    var modal = document.getElementById('gcv-checkin-modal');
    return !!(modal && !modal.hidden);
  }

  function postCheckin(code, fromScan) {
    code = extractReservationCode(code);
    if (!code) {
      paintCheckinResult(false, 'Código da reserva inválido.');
      if (!fromScan && !checkinModalOpen()) alert('Código da reserva inválido.');
      return;
    }
    if (fromScan && code === lastScanCode && (Date.now() - lastScanAt) < 8000) {
      return;
    }
    lastScanCode = code;
    lastScanAt = Date.now();
    if (checkinBusy) return;
    checkinBusy = true;
    sendJson('POST', '/api/guides/check-in.php', { reservation_id: code }, function (e, r) {
      checkinBusy = false;
      var d = (r && r.data) || {};
      if (r && r.ok) {
        var msg = (d.already ? 'Presença já confirmada' : 'Presença confirmada')
          + (d.tourist_name ? '\n' + d.tourist_name : '')
          + (d.reservation_id ? '\n' + d.reservation_id : '');
        paintCheckinResult(true, msg);
        if (!fromScan && !checkinModalOpen()) alert(msg);
        loadGuideAgenda();
        return;
      }
      var err = (r && r.error) || 'Não foi possível confirmar a presença.';
      paintCheckinResult(false, err);
      if (!fromScan && !checkinModalOpen()) alert(err);
    });
  }

  function paintCheckinResult(ok, text) {
    var el = document.getElementById('gcv-checkin-result');
    if (!el) return;
    el.hidden = false;
    el.className = 'gcv-checkin-result ' + (ok ? 'gcv-checkin-result--ok' : 'gcv-checkin-result--err');
    el.textContent = text || '';
  }

  function clearCheckinResult() {
    var el = document.getElementById('gcv-checkin-result');
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
    el.className = 'gcv-checkin-result';
  }

  function closeCheckinScanner() {
    var modal = document.getElementById('gcv-checkin-modal');
    if (checkinScanner && typeof checkinScanner.stop === 'function') {
      try { checkinScanner.stop(); } catch (err) {}
      checkinScanner = null;
    }
    if (modal) modal.hidden = true;
    document.removeEventListener('keydown', onCheckinEsc, true);
  }

  function onCheckinEsc(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      closeCheckinScanner();
    }
  }

  function openCheckinScanner() {
    var modal = document.getElementById('gcv-checkin-modal');
    if (!modal) {
      var code = window.prompt('Digite o código da reserva (GCV-XXXXXX):') || '';
      postCheckin(code);
      return;
    }
    modal.hidden = false;
    clearCheckinResult();
    var reader = document.getElementById('gcv-checkin-reader');
    var manual = document.getElementById('gcv-checkin-manual');
    if (manual) {
      manual.value = '';
      manual.onkeydown = function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          postCheckin(manual.value);
        }
      };
    }
    var sendBtn = document.getElementById('gcv-checkin-manual-btn');
    if (sendBtn) sendBtn.onclick = function () { postCheckin(manual ? manual.value : ''); };
    var closeBtn = document.getElementById('gcv-checkin-close');
    if (closeBtn) closeBtn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      closeCheckinScanner();
    };
    modal.onclick = function (ev) {
      if (ev.target === modal) closeCheckinScanner();
    };
    document.addEventListener('keydown', onCheckinEsc, true);

    if (window.Html5Qrcode && reader) {
      if (checkinScanner) {
        try { checkinScanner.stop(); } catch (err) {}
      }
      checkinScanner = new window.Html5Qrcode('gcv-checkin-reader');
      checkinScanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        function (decoded) { postCheckin(decoded, true); },
        function () {}
      ).catch(function () {
        if (reader) reader.innerHTML = '<p class="gcv-dash-hint">Não foi possível abrir a câmera. Digite o código abaixo.</p>';
      });
    }
  }

  function consumeCheckinHash() {
    var h = String(location.hash || '').toLowerCase();
    if (h.indexOf('#checkin') !== 0 && h.indexOf('scan=1') === -1) return false;
    gotoDashSection('section-guide-tours');
    setTimeout(function () { openCheckinScanner(); }, 350);
    return true;
  }

  function agendaTrashIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
  }

  function agendaQrIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v7"/><path d="M14 20h7"/></svg>';
  }

  function agendaWalkIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.4"/><path d="M10 9.2h4l-1.1 4.4 2.6 2.2-.9 1.5-3.2-2.1-1.6 5.2H8.2l1.7-5.6L8 12.2z"/></svg>';
  }

  function agendaCarIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l1.4-4.2A2 2 0 018.3 7h7.4a2 2 0 011.9 1.8L19 13"/><path d="M4 13h16v3.5a1 1 0 01-1 1H5a1 1 0 01-1-1V13z"/><circle cx="7.5" cy="18.2" r="1.3"/><circle cx="16.5" cy="18.2" r="1.3"/></svg>';
  }

  function agendaArchiveIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3.5" width="18" height="4.5" rx="1"/><path d="M5 8v11a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0019 19V8"/><path d="M10 12h4"/></svg>';
  }

  function agendaEditIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  }

  var guideAgendaState = { view: 'upcoming', upcoming: [], archived: [] };
  var pendingEditExcursion = null;

  function isArchivedTour(e) {
    if (!e) return false;
    if (e.archived === true || e.archived === 1) return true;
    var life = String(e.lifecycle || '');
    if (life === 'rejeitada' || life === 'cancelada' || life === 'concluida') return true;
    var st = String(e.status || '');
    return st === 'cancelled' || st === 'rejected';
  }

  function canEditTour(e) {
    if (!e) return false;
    if (e.can_edit === true || e.can_edit === 1) return true;
    if (e.can_edit === false || e.can_edit === 0) return false;
    var life = String(e.lifecycle || '');
    if (life === 'cancelada' || life === 'concluida' || life === 'rejeitada') return false;
    var insc = parseFiniteInt(e.platform_inscriptions, -1);
    if (insc >= 0) return insc === 0;
    return parseFiniteInt(e.booked_people, 0) + parseFiniteInt(e.booked_people_transport, 0) === 0;
  }

  function agendaSeatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="currentColor"/><path d="M12 12.6c-3.2 0-5.8 1.7-6.2 4.6-.1.7.4 1.4 1.1 1.4h10.2c.7 0 1.2-.7 1.1-1.4-.4-2.9-3-4.6-6.2-4.6z" fill="currentColor"/></svg>';
  }

  function offersAgendaTransport(e) {
    return !!(e && (e.offer_transport || Number(e.max_people_transport) > 0 || Number(e.price_transport_cents) > 0));
  }

  function occupancySeatsHtml(filled, total, kind) {
    filled = Math.max(0, parseFiniteInt(filled, 0));
    total = Math.max(0, parseFiniteInt(total, 0));
    if (total > 12) total = 12;
    if (filled > total) filled = total;
    if (total < 1) return '';
    var html = '';
    var i;
    for (i = 1; i <= total; i++) {
      html += '<span class="gcv-agenda-seat' + (i <= filled ? ' is-filled' : '') + ' gcv-agenda-seat--' + kind + '">' +
        agendaSeatIcon() + '</span>';
    }
    return html;
  }

  function occupancyGroupSeatsHtml(walk, van, total) {
    total = Math.max(1, parseFiniteInt(total, 1));
    walk = Math.max(0, parseFiniteInt(walk, 0));
    van = Math.max(0, parseFiniteInt(van, 0));
    if (total > 12) total = 12;
    if (walk + van > total) van = Math.max(0, total - walk);
    var html = '';
    var i;
    for (i = 1; i <= total; i++) {
      var kind = 'empty';
      if (i <= walk) kind = 'walk is-filled';
      else if (i <= walk + van) kind = 'van is-filled';
      html += '<span class="gcv-agenda-seat gcv-agenda-seat--' + kind + '">' + agendaSeatIcon() + '</span>';
    }
    return html;
  }

  function occupancyRowHtml(opts) {
    var filled = Math.max(0, parseFiniteInt(opts.filled, 0));
    var quorumCount = opts.quorumCount != null ? Math.max(0, parseFiniteInt(opts.quorumCount, 0)) : filled;
    var quorum = parseFiniteInt(opts.quorum, 0);
    var cancelled = !!opts.cancelled;
    var locked = !!opts.locked;
    var formed = !cancelled && !locked && (quorum <= 0 || quorumCount >= quorum);
    if (opts.kind === 'walk' && filled >= 1 && !opts.guideSeatOk && !opts.transportFormed) {
      formed = false;
    }
    var state = cancelled ? 'Cancelado' : (locked ? 'Sem vaga no grupo' : (formed ? 'Confirmado' : 'Em formação'));
    var quorumHtml = '';
    if (!cancelled && !locked && !formed) {
      var need = Math.max(0, quorum - quorumCount);
      if (need > 0) {
        quorumHtml = '<em class="gcv-agenda-lot__quorum">Faltam ' + need + ' para o quórum</em>';
      } else if (opts.kind === 'walk' && !opts.guideSeatOk) {
        quorumHtml = '<em class="gcv-agenda-lot__quorum">Aguardando vaga para o guia</em>';
      }
    }
    var peopleWord = filled === 1 ? 'inscrito' : 'inscritos';
    return (
      '<div class="gcv-agenda-lot__row gcv-agenda-lot__row--' + opts.kind +
      (locked ? ' is-locked' : '') + (cancelled ? ' is-cancelled' : '') + (formed ? ' is-formed' : '') + '">' +
      '<div class="gcv-agenda-lot__label">' +
      '<span class="gcv-agenda-lot__ico" aria-hidden="true">' + opts.icon + '</span>' +
      '<span>' +
      '<strong>' + esc(opts.title) + '</strong>' +
      '<em class="gcv-agenda-lot__state">' + state + '</em>' +
      quorumHtml +
      '</span></div>' +
      '<div class="gcv-agenda-lot__seats" role="img" aria-label="' + filled + ' ' + peopleWord + ' ' + esc(opts.title).toLowerCase() + '">' +
      (filled > 0 ? occupancySeatsHtml(filled, filled, opts.kind) : '') +
      '</div>' +
      '<div class="gcv-agenda-lot__count"><b>' + filled + '</b></div>' +
      '</div>'
    );
  }

  function agendaOccupancyState(e) {
    var occ = e.group_occupancy;
    if (occ && occ.total != null) {
      return {
        total: parseFiniteInt(occ.total, DEFAULT_MAX_PEOPLE),
        walk: parseFiniteInt(occ.walk, 0),
        transport: parseFiniteInt(occ.transport, 0),
        occupied: parseFiniteInt(occ.occupied, 0),
        offer: offersAgendaTransport(e),
        walkSlots: parseFiniteInt(occ.walk_slots, 0),
        transportSlots: parseFiniteInt(occ.transport_slots, 0),
        cancelled: !!occ.transport_cancelled || !!e.transport_cancelled
      };
    }
    var total = Math.max(1, parseFiniteInt(e.max_people, DEFAULT_MAX_PEOPLE));
    var walk = Math.max(0, parseFiniteInt(e.booked_people, 0) + parseFiniteInt(e.preconfirmed_people, 0));
    var transport = Math.max(0, parseFiniteInt(e.booked_people_transport, 0));
    var cap = Math.max(0, parseFiniteInt(e.max_people_transport, 0));
    var offer = offersAgendaTransport(e);
    if (offer && cap < 1) cap = 4;
    if (walk > total) walk = total;
    if (walk + transport > total) transport = Math.max(0, total - walk);
    var quorumT = parseFiniteInt(e.quorum_transport, 0);
    var roomT = Math.max(0, total - walk);
    var cancelled = !!(offer && quorumT > 0 && transport < quorumT && roomT < quorumT);
    return {
      total: total,
      walk: walk,
      transport: transport,
      occupied: walk + transport,
      offer: offer,
      walkSlots: Math.max(0, total - transport),
      transportSlots: offer ? (cancelled ? transport : Math.max(0, Math.min(cap, roomT))) : 0,
      cancelled: cancelled
    };
  }

  function renderAgendaOccupancy(e) {
    var st = agendaOccupancyState(e);
    var html =
      '<div class="gcv-agenda-lot__group">' +
      '<div class="gcv-agenda-lot__group-head">' +
      '<strong>Grupo</strong>' +
      '<span>' + st.occupied + '/' + st.total + '</span>' +
      '</div>' +
      '<div class="gcv-agenda-lot__seats gcv-agenda-lot__seats--group" role="img" aria-label="' + st.occupied + ' de ' + st.total + ' vagas do grupo">' +
      occupancyGroupSeatsHtml(st.walk, st.transport, st.total) +
      '</div>' +
      (st.offer
        ? '<p class="gcv-agenda-lot__hint">É um único grupo. Quem vai de carro reduz as vagas a pé, e o contrário também.</p>'
        : '') +
      '</div>';
    var qT = parseFiniteInt(e.quorum_transport, 0);
    var vanFormed = !!(st.offer && !st.cancelled && (qT <= 0 || st.transport >= qT));
    html += occupancyRowHtml({
      kind: 'walk',
      icon: agendaWalkIcon(),
      title: 'Sem transporte',
      filled: st.walk,
      quorumCount: parseFiniteInt(e.booked_people, 0),
      total: st.walkSlots,
      quorum: e.quorum,
      locked: st.offer && st.walkSlots < 1,
      guideSeatOk: e.walk_guide_seat_ok === true || e.walkGuideSeatOk === true,
      transportFormed: vanFormed
    });
    if (st.offer) {
      html += occupancyRowHtml({
        kind: 'van',
        icon: agendaCarIcon(),
        title: 'Com transporte',
        filled: st.transport,
        total: st.transportSlots,
        quorum: e.quorum_transport,
        locked: !st.cancelled && st.transportSlots < 1,
        cancelled: st.cancelled
      });
    }
    return '<div class="gcv-agenda-lot">' + html + '</div>';
  }

  function renderAgendaCard(e) {
    var pending = e.status === 'pending_approval' || e.lifecycle === 'aguardando_aprovacao';
    var actions = '';
    if (canEditTour(e)) {
      actions += '<button type="button" class="gcv-guide-upcoming__edit" data-edit-exc="' + e.id + '" aria-label="Editar passeio">' + agendaEditIcon() + '</button>';
    }
    if (e.can_cancel) {
      actions += '<button type="button" class="gcv-guide-upcoming__trash" data-cancel-exc="' + e.id + '" aria-label="Cancelar passeio">' + agendaTrashIcon() + '</button>';
    }
    var pendingNote = pending
      ? '<p class="gcv-dash-alert gcv-dash-alert--warning" style="margin:0.7rem 0 0;">Aguardando aprovação do administrador. Ainda não aparece no site.</p>'
      : '';
    var life = String(e.lifecycle || 'na');
    var time = String(e.departure_time || '').slice(0, 5);
    return (
      '<article class="gcv-agenda-card gcv-guide-upcoming gcv-agenda-card--' + esc(life) + '">' +
      '<div class="gcv-guide-upcoming__head">' +
      '<div class="gcv-guide-upcoming__main">' +
      '<div class="gcv-guide-upcoming__top">' +
      '<div class="gcv-guide-upcoming__status">' + lifeBadge(e.lifecycle, e.lifecycle_label) + '</div>' +
      (actions ? '<div class="gcv-guide-upcoming__actions">' + actions + '</div>' : '') +
      '</div>' +
      '<h3 class="gcv-agenda-card__title">' + esc(e.attraction_title || 'Passeio') + '</h3>' +
      '<div class="gcv-agenda-card__meta">' +
      '<span class="gcv-agenda-chip">' + esc(formatGuideDate(e.date_iso)) + (time ? ' · ' + esc(time) : '') + '</span>' +
      (e.departure_city_name ? '<span class="gcv-agenda-chip">' + esc(e.departure_city_name) + '</span>' : '') +
      '<span class="gcv-agenda-chip gcv-agenda-chip--price">' + money(e.price_cents) + '</span>' +
      '</div>' +
      renderAgendaOccupancy(e) +
      '</div></div>' +
      pendingNote +
      renderGuideClients(e.clients) +
      '</article>'
    );
  }

  function agendaHeadBlock(title, rightHtml) {
    return (
      '<div class="gcv-agenda-head-block">' +
      '<h3 class="gcv-agenda-heading">' + title + '</h3>' +
      (rightHtml || '') +
      '</div>'
    );
  }

  function archivedLinkHtml(id, label, withIcon) {
    return (
      '<button type="button" class="gcv-agenda-archived-link" id="' + id + '">' +
      (withIcon ? agendaArchiveIcon() : '') +
      '<span>' + label + '</span></button>'
    );
  }

  function openGuideEdit(e) {
    pendingEditExcursion = e;
    gotoDashSection('section-guide-create-tour');
    var form = document.getElementById('gcv-guide-create-tour-form');
    if (form && typeof form._gcvApplyPendingEdit === 'function') {
      form._gcvApplyPendingEdit();
    }
  }

  function bindAgendaCardActions(list) {
    list.querySelectorAll('[data-cancel-exc]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('Cancelar este passeio?')) return;
        sendJson('PUT', '/api/guides/excursions.php', {
          id: parseInt(btn.getAttribute('data-cancel-exc'), 10),
          action: 'cancel',
        }, function (e, r) {
          alert((r && r.data && r.data.message) || (r && r.error) || 'Erro');
          if (r && r.ok) loadGuideAgenda();
        });
      };
    });
    list.querySelectorAll('[data-edit-exc]').forEach(function (btn) {
      btn.onclick = function () {
        var id = parseInt(btn.getAttribute('data-edit-exc'), 10);
        var all = guideAgendaState.upcoming.concat(guideAgendaState.archived);
        var found = null;
        all.forEach(function (row) {
          if (Number(row.id) === id) found = row;
        });
        if (found) openGuideEdit(found);
      };
    });
    var scanQr = document.getElementById('gcv-agenda-scan-qr');
    if (scanQr) scanQr.onclick = function () { openCheckinScanner(); };
    list.querySelectorAll('[data-checkin-code]').forEach(function (btn) {
      btn.onclick = function () {
        postCheckin(btn.getAttribute('data-checkin-code') || '');
      };
    });
    var toggle = document.getElementById('gcv-agenda-archived-toggle');
    if (toggle) {
      toggle.onclick = function () {
        guideAgendaState.view = 'archived';
        paintGuideAgenda();
      };
    }
    var back = document.getElementById('gcv-agenda-back-upcoming');
    if (back) {
      back.onclick = function () {
        guideAgendaState.view = 'upcoming';
        paintGuideAgenda();
      };
    }
  }

  function paintGuideAgenda() {
    var list = document.getElementById('guide-tours-list');
    if (!list) return;
    var upcoming = guideAgendaState.upcoming || [];
    var archived = guideAgendaState.archived || [];
    var html =
      '<div class="gcv-guide-agenda-scan">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-agenda-scan-btn" id="gcv-agenda-scan-qr">' +
      agendaQrIcon() + '<span>Ler QR Code da Reserva</span></button>' +
      '</div>';
    if (guideAgendaState.view === 'archived') {
      html += agendaHeadBlock('Arquivados', archivedLinkHtml('gcv-agenda-back-upcoming', 'Próximas saídas', false));
      if (!archived.length) {
        html += '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum passeio arquivado.</div>';
      } else {
        html += archived.map(renderAgendaCard).join('');
      }
    } else {
      html += agendaHeadBlock(
        'Próximas saídas',
        archivedLinkHtml('gcv-agenda-archived-toggle', 'Arquivados', true)
      );
      if (!upcoming.length) {
        html += '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma saída próxima.</div>';
      } else {
        html += upcoming.map(renderAgendaCard).join('');
      }
    }
    list.innerHTML = html;
    bindAgendaCardActions(list);
  }

  function loadGuideAgenda() {
    var list = document.getElementById('guide-tours-list');
    if (!list) return;
    list.innerHTML = 'Carregando…';

    get('/api/guides/excursions.php', function (err, res) {
      if (!res || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar agenda.</p>';
        return;
      }
      var upcoming = ((res.data && res.data.upcoming) || []).filter(function (e) {
        return !isArchivedTour(e);
      });
      var archived = (res.data && res.data.archived) || [];
      if (!archived.length) {
        archived = ((res.data && res.data.excursions) || []).filter(isArchivedTour);
      }
      guideAgendaState.upcoming = upcoming;
      guideAgendaState.archived = archived;
      paintGuideAgenda();
    });
  }

  /* ---------- GUIA: PUBLICAR ---------- */
  function confirmClearPublish(form) {
    if (!form) return;
    if (form.getAttribute('data-edit-id')) {
      pendingEditExcursion = null;
      if (typeof form._gcvSetPublishEditMode === 'function') form._gcvSetPublishEditMode(false);
      if (form.getAttribute('data-admin') === '1' && typeof form._gcvAdminOnDone === 'function') {
        form._gcvAdminOnDone();
        return;
      }
      if (typeof form._gcvResetPublish === 'function') form._gcvResetPublish();
      gotoDashSection('section-guide-tours');
      return;
    }
    function doClear(ok) {
      if (!ok) return;
      if (typeof form._gcvResetPublish === 'function') form._gcvResetPublish();
    }
    if (typeof global.gcvConfirm === 'function') {
      global.gcvConfirm('Limpar o formulário?\n\nTodos os passeios preenchidos serão apagados.', {
        danger: true,
        okText: 'Limpar',
        cancelText: 'Voltar'
      }).then(doClear);
    } else {
      doClear(window.confirm('Limpar o formulário?\n\nTodos os passeios preenchidos serão apagados.'));
    }
  }

  function bindClearPublishButtons(form) {
    ['ge-clear-publish', 'ge-clear-publish-footer'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.onclick = function () { confirmClearPublish(form); };
    });
  }

  function loadGuidePublish(opts) {
    opts = opts || {};
    var isAdmin = !!opts.admin;
    var form = opts.form || document.getElementById('gcv-guide-create-tour-form');
    var onDone = typeof opts.onDone === 'function' ? opts.onDone : null;
    if (isAdmin) pendingEditExcursion = opts.edit || null;
    if (!form) return;
    bindClearPublishButtons(form);
    if (!isAdmin && form.getAttribute('data-ready') === '1') {
      if (typeof form._gcvApplyPendingEdit === 'function') form._gcvApplyPendingEdit();
      return;
    }
    form.innerHTML = 'Carregando…';
    var optionsUrl = isAdmin
      ? '/api/admin/excursions.php?publish_options=1'
      : '/api/guides/excursions.php';
    get(optionsUrl, function (err, res) {
      if (!res || !res.ok) {
        form.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar opções.</p>';
        return;
      }
      var d = res.data || {};
      if (!isAdmin && !d.profile_complete) {
        form.innerHTML =
          '<div class="gcv-dash-alert gcv-dash-alert--warning">' +
          'Complete seu <strong>perfil</strong> antes de publicar passeios. ' +
          '<a href="#perfil" id="ge-goto-profile">Ir para meu perfil</a></div>';
        var gp = document.getElementById('ge-goto-profile');
        if (gp) gp.addEventListener('click', function (ev) {
          ev.preventDefault();
          gotoDashSection('section-guide-profile');
        });
        return;
      }
      if (!isAdmin && !d.financial_ready) {
        form.innerHTML =
          '<div class="gcv-dash-alert gcv-dash-alert--warning">' +
          'Cadastre CPF/CNPJ e chave PIX em <strong>Meu perfil → Dados financeiros</strong> para publicar passeios. ' +
          '<a href="#perfil" id="ge-goto-financial">Ir para meu perfil</a></div>';
        var gf = document.getElementById('ge-goto-financial');
        if (gf) gf.addEventListener('click', function (ev) {
          ev.preventDefault();
          gotoDashSection('section-guide-profile');
        });
        return;
      }
      var attrs = sortAttractionsCatalog(d.attractions || []);
      var cities = d.cities || [];
      var minQ = d.min_quorum != null ? parseFiniteInt(d.min_quorum, MIN_QUORUM) : MIN_QUORUM;
      var maxQ = d.max_quorum != null ? parseFiniteInt(d.max_quorum, MAX_PEOPLE_CAP) : MAX_PEOPLE_CAP;
      var maxCap = d.max_people_cap != null ? parseFiniteInt(d.max_people_cap, MAX_PEOPLE_CAP) : MAX_PEOPLE_CAP;
      var netMin = d.guide_net_min != null ? parseFloat(d.guide_net_min) : GUIDE_NET_MIN;
      var netMax = d.guide_net_max != null ? parseFloat(d.guide_net_max) : GUIDE_NET_MAX;
      var netMaxDragao = d.guide_net_max_dragao != null ? parseFloat(d.guide_net_max_dragao) : GUIDE_NET_MAX_DRAGAO;
      var netMaxTransport = d.guide_net_max_transport != null ? parseFloat(d.guide_net_max_transport) : GUIDE_NET_MAX_TRANSPORT;
      if (!isFinite(netMin) || netMin < 1) netMin = GUIDE_NET_MIN;
      if (!isFinite(netMax) || netMax < netMin) netMax = GUIDE_NET_MAX;
      if (!isFinite(netMaxDragao) || netMaxDragao < netMax) netMaxDragao = GUIDE_NET_MAX_DRAGAO;
      if (!isFinite(netMaxTransport) || netMaxTransport < netMax) netMaxTransport = GUIDE_NET_MAX_TRANSPORT;
      var commissionPct = d.commission_pct != null ? parseFloat(d.commission_pct) : 10;
      if (!isFinite(commissionPct) || commissionPct < 0 || commissionPct >= 100) commissionPct = 10;

      function attractionById(id) {
        var sid = String(id || '');
        if (!sid) return null;
        for (var i = 0; i < attrs.length; i++) {
          if (String(attrs[i].id) === sid) return attrs[i];
        }
        return null;
      }

      function netMaxForAttractionId(id, withTransport) {
        var a = attractionById(id);
        var base = netMax;
        if (a && a.guide_net_max != null) {
          var m = parseFloat(a.guide_net_max);
          if (isFinite(m) && m >= netMin) base = m;
          else if (attractionLooksLikeDragao(a)) base = netMaxDragao;
        } else if (attractionLooksLikeDragao(a)) {
          base = netMaxDragao;
        }
        if (withTransport && netMaxTransport > base) return netMaxTransport;
        return base;
      }
      var commissionScope = String(d.commission_scope || 'settings');
      var nextIdx = 1;
      var activeTourIdx = null;

      function cityOptionsHtml() {
        return '<option value="">Selecione…</option>' + cities.map(function (c) {
          return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
        }).join('');
      }

      function tourBlocks() {
        return form.querySelectorAll('.gcv-dash-tour-block');
      }

      function retitleBlocks() {
        var blocks = tourBlocks();
        blocks.forEach(function (block, i) {
          var title = block.querySelector('.gcv-dash-tour-block__title');
          if (title) title.textContent = 'Passeio ' + (i + 1);
          var rm = block.querySelector('[data-remove-tour]');
          if (rm) rm.hidden = blocks.length < 2;
        });
      }

      function formatTabDate(iso) {
        if (typeof global.gcvFormatIsoBr === 'function') {
          return global.gcvFormatIsoBr(iso) || 'Data';
        }
        return iso || 'Data';
      }

      function tourTabCopy(idx, n) {
        var hidden = document.getElementById('ge-' + idx + '-attr');
        var q = document.getElementById('ge-' + idx + '-attr-q');
        var dateEl = document.getElementById('ge-' + idx + '-date');
        var name = 'Passeio ' + n;
        if (hidden && hidden.value && q && (q.value || '').trim()) name = q.value.trim();
        var date = 'Data';
        if (dateEl && dateEl.value) date = formatTabDate(dateEl.value);
        return { name: name, date: date };
      }

      function isMobileTourCarousel() {
        return window.matchMedia('(max-width: 768px)').matches;
      }

      function markTourActive(idx) {
        activeTourIdx = String(idx);
        tourBlocks().forEach(function (block) {
          block.classList.toggle('is-active', block.getAttribute('data-tour-idx') === String(idx));
        });
        var tabs = document.getElementById('ge-tour-tabs');
        if (!tabs) return;
        tabs.querySelectorAll('.gcv-tour-tab--panel').forEach(function (t) {
          var on = t.getAttribute('data-tour-tab') === String(idx);
          t.classList.toggle('is-active', on);
          var hit = t.querySelector('.gcv-tour-tab__hit');
          if (hit) hit.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }

      var tourScrollLock = false;
      var tourScrollLockTimer = 0;
      function lockTourScroll(ms) {
        tourScrollLock = true;
        if (tourScrollLockTimer) clearTimeout(tourScrollLockTimer);
        tourScrollLockTimer = setTimeout(function () {
          tourScrollLock = false;
          tourScrollLockTimer = 0;
        }, ms || 420);
      }

      function scrollTabIntoView(idx) {
        var tabs = document.getElementById('ge-tour-tabs');
        var tab = tabs && tabs.querySelector('.gcv-tour-tab--panel[data-tour-tab="' + String(idx) + '"]');
        if (!tabs || !tab) return;
        var tabsRect = tabs.getBoundingClientRect();
        var tabRect = tab.getBoundingClientRect();
        var pad = 6;
        var delta = 0;
        if (tabRect.left < tabsRect.left + pad) {
          delta = tabRect.left - tabsRect.left - pad;
        } else if (tabRect.right > tabsRect.right - pad) {
          delta = tabRect.right - tabsRect.right + pad;
        }
        if (delta) tabs.scrollLeft += delta;
      }

      function scrollTourIntoView(idx, instant) {
        var host = document.getElementById('ge-tours');
        var block = form.querySelector('.gcv-dash-tour-block[data-tour-idx="' + idx + '"]');
        if (!host || !block || !isMobileTourCarousel()) {
          scrollTabIntoView(idx);
          return;
        }
        var left = host.scrollLeft + (block.getBoundingClientRect().left - host.getBoundingClientRect().left);
        if (left < 0) left = 0;
        lockTourScroll(instant ? 80 : 450);
        if (typeof host.scrollTo === 'function') {
          host.scrollTo({ left: left, behavior: instant ? 'auto' : 'smooth' });
        } else {
          host.scrollLeft = left;
        }
        scrollTabIntoView(idx);
      }

      function selectTourTab(idx) {
        markTourActive(idx);
        requestAnimationFrame(function () {
          scrollTourIntoView(idx);
        });
      }

      function syncCarouselActive() {
        if (!isMobileTourCarousel() || tourScrollLock) return;
        var host = document.getElementById('ge-tours');
        var blocks = tourBlocks();
        if (!host || !blocks.length) return;
        var mid = host.scrollLeft + host.clientWidth / 2;
        var origin = host.getBoundingClientRect().left - host.scrollLeft;
        var best = blocks[0];
        var bestDist = Infinity;
        blocks.forEach(function (b) {
          var center = (b.getBoundingClientRect().left - origin) + b.offsetWidth / 2;
          var d = Math.abs(center - mid);
          if (d < bestDist) {
            bestDist = d;
            best = b;
          }
        });
        var idx = best.getAttribute('data-tour-idx');
        if (String(idx) !== String(activeTourIdx)) markTourActive(idx);
        scrollTabIntoView(idx);
      }

      function setDateLocked(dateEl, locked) {
        if (!dateEl) return;
        dateEl.tabIndex = locked ? -1 : 0;
        var wrap = dateEl.closest('.gcv-datepicker');
        if (wrap) {
          wrap.classList.toggle('is-locked', !!locked);
          var btn = wrap.querySelector('.gcv-datepicker__btn');
          if (btn) {
            btn.disabled = !!locked;
            btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
            btn.title = locked ? 'A data segue o dia anterior' : '';
          }
        }
      }

      function syncSequentialDates() {
        if (syncSequentialDates.busy) return;
        syncSequentialDates.busy = true;
        try {
          var blocks = tourBlocks();
          var prev = '';
          var i;
          for (i = 0; i < blocks.length; i++) {
            var bidx = blocks[i].getAttribute('data-tour-idx');
            var el = document.getElementById('ge-' + bidx + '-date');
            if (!el) continue;
            if (i === 0) {
              setDateLocked(el, false);
              prev = el.value || '';
              continue;
            }
            setDateLocked(el, true);
            if (prev) {
              var next = addDaysIso(prev, 1);
              if (next && el.value !== next) {
                el.value = next;
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
              prev = next || prev;
            }
          }
        } finally {
          syncSequentialDates.busy = false;
        }
        refreshTourTabs();
      }

      function removeTourBlock(idx) {
        var blocks = tourBlocks();
        if (blocks.length < 2) return;
        var block = form.querySelector('[data-tour-idx="' + idx + '"]');
        if (!block) return;
        var wasActive = String(idx) === String(activeTourIdx);
        block.remove();
        retitleBlocks();
        syncSequentialDates();
        refreshTourTabs();
        if (wasActive) {
          var left = tourBlocks();
          if (left.length) selectTourTab(left[left.length - 1].getAttribute('data-tour-idx'));
        }
      }

      function pinTourTabsBar() {
        var header = document.getElementById('gcv-dash-sidebar');
        var wrap = form.querySelector('.gcv-tour-tabs-wrap');
        var h = header ? Math.round(header.getBoundingClientRect().height) : 60;
        document.documentElement.style.setProperty('--gcv-dash-header-h', h + 'px');
        if (wrap && form.classList.contains('is-tour-carousel') && isMobileTourCarousel()) {
          document.documentElement.style.setProperty('--gcv-tour-tabs-h', Math.round(wrap.getBoundingClientRect().height) + 'px');
        }
      }

      function refreshTourTabs() {
        var host = document.getElementById('ge-tour-tabs');
        var blocks = tourBlocks();
        retitleBlocks();
        if (!host) return;
        var html = '';
        blocks.forEach(function (block, i) {
          var idx = block.getAttribute('data-tour-idx');
          var copy = tourTabCopy(idx, i + 1);
          var on = String(idx) === String(activeTourIdx);
          html +=
            '<div class="gcv-tour-tab gcv-tour-tab--panel' + (on ? ' is-active' : '') + '" data-tour-tab="' + idx + '">' +
            '<button type="button" class="gcv-tour-tab__hit" role="tab" aria-selected="' + (on ? 'true' : 'false') + '">' +
            '<span class="gcv-tour-tab__name">' + esc(copy.name) + '</span>' +
            '<span class="gcv-tour-tab__date">' + esc(copy.date) + '</span>' +
            '</button>' +
            (blocks.length > 1
              ? '<button type="button" class="gcv-tour-tab__close" data-close-tour="' + idx + '" aria-label="Remover passeio">×</button>'
              : '') +
            '</div>';
        });
        host.innerHTML = html;
        form.classList.toggle('is-tour-carousel', blocks.length >= 1);
        requestAnimationFrame(function () {
          pinTourTabsBar();
          if (activeTourIdx) {
            scrollTabIntoView(activeTourIdx);
            scrollTourIntoView(activeTourIdx, true);
          }
        });
        host.querySelectorAll('.gcv-tour-tab__hit').forEach(function (hit) {
          hit.onclick = function () {
            var panel = hit.closest('[data-tour-tab]');
            if (panel) selectTourTab(panel.getAttribute('data-tour-tab'));
          };
        });
        host.querySelectorAll('[data-close-tour]').forEach(function (x) {
          x.onclick = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            removeTourBlock(x.getAttribute('data-close-tour'));
          };
        });
      }

      function tourBlockHtml(idx) {
        var p = 'ge-' + idx + '-';
        return (
          '<article class="gcv-dash-tour-block' + (tourBlocks().length ? '' : ' is-active') + '" data-tour-idx="' + idx + '">' +
          '<div class="gcv-dash-tour-block__head">' +
          '<h3 class="gcv-dash-tour-block__title">Passeio 1</h3>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--danger" data-remove-tour hidden>Remover</button>' +
          '</div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Atrativo *</label>' +
          attractionComboboxHtml(p + 'attr-q', p + 'attr', p + 'attr-suggest') +
          '</div>' +
          '<div class="gcv-dash-field-row">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Data *</label><input class="gcv-dash-input" id="' + p + 'date" type="date" required /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Horário de saída *</label>' +
          timeSelectHtml(p + 'time-h', p + 'time-m', '10:15') + '</div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade de saída *</label>' +
          '<select class="gcv-dash-select" id="' + p + 'city" required>' + cityOptionsHtml() + '</select></div>' +
          '</div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Ponto de encontro *</label>' +
          '<div class="gcv-meeting-point">' +
          '<select class="gcv-dash-select" id="' + p + 'meeting" required>' +
          '<option value="">Selecione a cidade de saída primeiro</option></select>' +
          '<p class="gcv-cms-muted" id="' + p + 'meeting-gps">Selecione a cidade de saída para ver os pontos oficiais.</p>' +
          '<a class="gcv-meeting-maps" id="' + p + 'meeting-maps" hidden target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>' +
          '<input type="hidden" id="' + p + 'meeting-place" value="" />' +
          '<input type="hidden" id="' + p + 'meeting-lat" value="" />' +
          '<input type="hidden" id="' + p + 'meeting-lng" value="" /></div></div>' +
          '<div class="gcv-dash-field-row gcv-dash-field-row--2">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Pessoas confirmadas por fora (0 a 5)</label>' +
          '<input class="gcv-dash-input" id="' + p + 'preconfirmed" type="number" min="0" max="' + MAX_PRECONFIRMED + '" value="' + DEFAULT_PRECONFIRMED + '" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Vagas *</label>' +
          '<input class="gcv-dash-input" id="' + p + 'max" type="number" min="1" max="' + maxCap + '" value="' + DEFAULT_MAX_PEOPLE + '" /></div>' +
          '</div>' +
          '<p class="gcv-guide-net-limit">Limite a receber por pessoa <strong>R$' + netMax + '</strong> / Dragão <strong>R$' + netMaxDragao + '</strong></p>' +
          '<div class="gcv-guide-net-pair">' +
          '<div class="gcv-guide-net-box">' +
          '<div class="gcv-guide-net-box__title">Individual (SEM TRANSPORTE)</div>' +
          confirmedCheckboxHtml(p, false) +
          '<div class="gcv-dash-field gcv-guide-net-box__field">' +
          '<label class="gcv-dash-label gcv-guide-net-box__label" id="' + p + 'net-label" for="' + p + 'net">Valor a receber por Pessoa *</label>' +
          '<input class="gcv-dash-input gcv-guide-net-box__input" id="' + p + 'net" type="number" min="' + netMin + '" max="' + netMax + '" step="1" inputmode="decimal" required /></div>' +
          '<div id="' + p + 'preview" class="gcv-guide-net-box__hint" hidden></div>' +
          quorumOnlyRowHtml(p) +
          '</div>' +
          '<div class="gcv-guide-net-box gcv-guide-net-box--transport is-disabled" id="' + p + 'transport-box">' +
          '<div class="gcv-guide-net-box__title">Individual (COM TRANSPORTE)</div>' +
          '<label class="gcv-dash-label gcv-guide-net-box__transport"><input type="checkbox" id="' + p + 'transport" /> <span id="' + p + 'transport-label">Oferecer vagas com translado</span></label>' +
          '<div id="' + p + 'transport-fields" class="gcv-guide-net-box__body" hidden>' +
          '<div class="gcv-dash-field gcv-guide-net-box__field">' +
          '<label class="gcv-dash-label gcv-guide-net-box__label" id="' + p + 'net-t-label" for="' + p + 'net-t">Valor a receber por Pessoa (limite de R$' + netMaxTransport + ') *</label>' +
          '<input class="gcv-dash-input gcv-guide-net-box__input" id="' + p + 'net-t" type="number" min="' + netMin + '" max="' + netMaxTransport + '" step="1" inputmode="decimal" disabled /></div>' +
          '<div id="' + p + 'preview-t" class="gcv-guide-net-box__hint" hidden></div>' +
          quorumOnlyRowHtml(p + 't-', quorumSelectHtml(p + 't-quorum', DEFAULT_QUORUM, MAX_TRANSPORT_PEOPLE, 0)) +
          '<div class="gcv-dash-field"><label class="gcv-dash-label" for="' + p + 'max-t">Vagas com transporte (máximo 4)</label>' +
          transportMaxSelectHtml(p + 'max-t', DEFAULT_MAX_TRANSPORT) +
          '</div></div></div></div>' +
          '<div class="gcv-dash-field" style="margin-top:0.75rem;"><label class="gcv-dash-label">Observações</label>' +
          '<textarea class="gcv-dash-textarea" id="' + p + 'notes" maxlength="2000" rows="3"></textarea></div>' +
          '</article>'
        );
      }

      function bindMeetingPlaces(idx) {
        var p = 'ge-' + idx + '-';
        if (typeof global.gcvBindMeetingPoint !== 'function') return;
        var cityEl = document.getElementById(p + 'city');
        global.gcvBindMeetingPoint({
          select: document.getElementById(p + 'meeting'),
          gpsEl: document.getElementById(p + 'meeting-gps'),
          linkEl: document.getElementById(p + 'meeting-maps'),
          placeEl: document.getElementById(p + 'meeting-place'),
          latEl: document.getElementById(p + 'meeting-lat'),
          lngEl: document.getElementById(p + 'meeting-lng'),
          cityEl: cityEl,
          getCityKey: function () {
            return global.GcvMeetingPoints
              ? global.GcvMeetingPoints.cityKeyFromSelect(cityEl)
              : '';
          },
          esc: esc
        });
      }

      function bindTourBlock(idx) {
        var p = 'ge-' + idx + '-';
        var previewTimer = 0;
        var previewSeq = 0;
        var previewTimerT = 0;
        var previewSeqT = 0;

        function blockHasTransport() {
          var t = document.getElementById(p + 'transport');
          return !!(t && t.checked);
        }

        function blockNetMax() {
          var hid = document.getElementById(p + 'attr');
          return netMaxForAttractionId(hid ? hid.value : '', false);
        }

        function blockNetMaxTransport() {
          var hid = document.getElementById(p + 'attr');
          return netMaxForAttractionId(hid ? hid.value : '', true);
        }

        function rangeWarn(net, maxOverride) {
          var max = maxOverride != null ? maxOverride : blockNetMax();
          if (!isFinite(net)) return '';
          if (net < netMin || net > max) {
            return 'Informe um valor entre R$ ' + netMin + ' e R$ ' + max + '.';
          }
          return '';
        }

        function formatFeeReais(cents) {
          var n = Math.round((Number(cents) || 0) / 100);
          if (n < 0) n = 0;
          return 'R$ ' + n;
        }

        function paintPreviewHtml(box, finalCents, netReais, warn) {
          var netCents = Math.round(Number(netReais) * 100);
          var feeCents = Math.max(0, (Number(finalCents) || 0) - netCents);
          var html = '<strong>Preço final na plataforma: ' + formatBrlFromCents(finalCents) +
            '</strong> (Taxa de comissão de ' + formatFeeReais(feeCents) + ' para cada inscrição)';
          if (warn) {
            html += '<div class="gcv-guide-net-box__warn">' + esc(warn) + '</div>';
          }
          box.hidden = false;
          box.innerHTML = html;
        }

        function clampNetEl(el, forceMin) {
          var max = blockNetMax();
          var raw = String(el.value || '').trim().replace(',', '.');
          if (raw === '') return;
          var n = parseFloat(raw);
          if (!isFinite(n)) {
            el.value = '';
            return;
          }
          if (n > max) {
            el.value = String(max);
            return;
          }
          if (n < 0) {
            el.value = forceMin ? String(netMin) : '';
            return;
          }
          if (forceMin && n < netMin) {
            el.value = String(netMin);
          }
        }

        function clampNetElT(el, forceMin) {
          var max = blockNetMaxTransport();
          var raw = String(el.value || '').trim().replace(',', '.');
          if (raw === '') return;
          var n = parseFloat(raw);
          if (!isFinite(n)) {
            el.value = '';
            return;
          }
          if (n > max) {
            el.value = String(max);
            return;
          }
          if (n < 0) {
            el.value = forceMin ? String(netMin) : '';
            return;
          }
          if (forceMin && n < netMin) {
            el.value = String(netMin);
          }
        }

        function paintNetLabels() {
          var lab = document.getElementById(p + 'net-label');
          if (lab) lab.textContent = 'Valor a receber por Pessoa *';
          var tlab = document.getElementById(p + 'transport-label');
          if (tlab) tlab.textContent = 'Oferecer vagas com translado';
          var tNetLab = document.getElementById(p + 'net-t-label');
          if (tNetLab) tNetLab.textContent = 'Valor a receber por Pessoa (limite de R$' + blockNetMaxTransport() + ') *';
        }

        function syncTransportSeatsAndQuorum() {
          var maxEl = document.getElementById(p + 'max');
          var maxTEl = document.getElementById(p + 'max-t');
          var qEl = document.getElementById(p + 't-quorum');
          var total = clampRange(parseFiniteInt(maxEl ? maxEl.value : DEFAULT_MAX_PEOPLE, DEFAULT_MAX_PEOPLE), 1, maxCap);
          var seatCap = Math.min(MAX_TRANSPORT_PEOPLE, total);
          if (seatCap < 1) seatCap = 1;
          var seats = fillIntSelect(maxTEl, 1, seatCap, maxTEl ? maxTEl.value : DEFAULT_MAX_TRANSPORT);
          fillIntSelect(qEl, 0, seats, qEl ? qEl.value : DEFAULT_QUORUM);
        }

        function applyTransportEnabled() {
          var on = blockHasTransport();
          var box = document.getElementById(p + 'transport-box');
          var fields = document.getElementById(p + 'transport-fields');
          var netT = document.getElementById(p + 'net-t');
          var maxT = document.getElementById(p + 'max-t');
          if (box) box.classList.toggle('is-disabled', !on);
          if (fields) fields.hidden = !on;
          if (netT) {
            netT.disabled = !on;
            netT.required = on;
            netT.setAttribute('max', String(blockNetMaxTransport()));
          }
          if (maxT) maxT.disabled = !on;
          var tQ = document.getElementById(p + 't-quorum');
          if (tQ) {
            tQ.disabled = !on;
            tQ.required = on;
          }
          if (on) {
            syncTransportSeatsAndQuorum();
            refreshPreviewT(true);
          }
        }

        function applyBlockNetMax() {
          var el = document.getElementById(p + 'net');
          if (el) {
            el.setAttribute('max', String(blockNetMax()));
            clampNetEl(el, false);
          }
          var netT = document.getElementById(p + 'net-t');
          if (netT) {
            netT.setAttribute('max', String(blockNetMaxTransport()));
            clampNetElT(netT, false);
          }
          paintNetLabels();
          applyTransportEnabled();
          refreshPreview(true);
        }

        function refreshPreview(immediateServer) {
          var netEl = document.getElementById(p + 'net');
          var cityEl = document.getElementById(p + 'city');
          var box = document.getElementById(p + 'preview');
          if (!box || !netEl) return;
          var raw = String(netEl.value || '').trim();
          var net = parseFloat(raw.replace(',', '.'));
          var cityId = cityEl ? (parseInt(cityEl.value, 10) || 0) : 0;
          if (raw === '' || !isFinite(net) || net < 0) {
            box.textContent = '';
            box.hidden = true;
            return;
          }
          var warn = rangeWarn(net);
          var localCents = estimateGuideFinalCents(net, commissionPct);
          paintPreviewHtml(box, localCents, net, warn);

          if (net < 1) return;
          var seq = ++previewSeq;
          function fetchServer() {
            var q = 'guide_net=' + encodeURIComponent(String(net)) + (cityId ? '&city_id=' + cityId : '');
            get('/api/guides/pricing-preview.php?' + q, function (e, r) {
              if (seq !== previewSeq) return;
              if (!r || !r.ok || !r.data || !r.data.pricing) return;
              var pr = r.data.pricing;
              var fee = pr.final_price_cents;
              paintPreviewHtml(box, fee, net, warn);
            });
          }
          if (immediateServer) {
            fetchServer();
            return;
          }
          if (previewTimer) clearTimeout(previewTimer);
          previewTimer = setTimeout(fetchServer, 160);
        }

        function refreshPreviewT(immediateServer) {
          var netEl = document.getElementById(p + 'net-t');
          var cityEl = document.getElementById(p + 'city');
          var box = document.getElementById(p + 'preview-t');
          if (!box || !netEl) return;
          if (!blockHasTransport()) {
            box.textContent = '';
            box.hidden = true;
            return;
          }
          var raw = String(netEl.value || '').trim();
          var net = parseFloat(raw.replace(',', '.'));
          var cityId = cityEl ? (parseInt(cityEl.value, 10) || 0) : 0;
          if (raw === '' || !isFinite(net) || net < 0) {
            box.textContent = '';
            box.hidden = true;
            return;
          }
          var warn = rangeWarn(net, blockNetMaxTransport());
          var localCents = estimateGuideFinalCents(net, commissionPct);
          paintPreviewHtml(box, localCents, net, warn);
          if (net < 1) return;
          var seq = ++previewSeqT;
          function fetchServer() {
            var q = 'guide_net=' + encodeURIComponent(String(net)) + (cityId ? '&city_id=' + cityId : '');
            get('/api/guides/pricing-preview.php?' + q, function (e, r) {
              if (seq !== previewSeqT) return;
              if (!r || !r.ok || !r.data || !r.data.pricing) return;
              paintPreviewHtml(box, r.data.pricing.final_price_cents, net, warn);
            });
          }
          if (immediateServer) {
            fetchServer();
            return;
          }
          if (previewTimerT) clearTimeout(previewTimerT);
          previewTimerT = setTimeout(fetchServer, 160);
        }

        var netEl = document.getElementById(p + 'net');
        if (netEl) {
          netEl.setAttribute('min', String(netMin));
          netEl.setAttribute('max', String(blockNetMax()));
          netEl.addEventListener('keydown', function (ev) {
            if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
            var k = ev.key;
            if (k.length !== 1 || k < '0' || k > '9') return;
            var start = netEl.selectionStart;
            var end = netEl.selectionEnd;
            var cur = String(netEl.value || '');
            var next = cur.slice(0, start) + k + cur.slice(end);
            var n = parseFloat(next.replace(',', '.'));
            var max = blockNetMax();
            if (isFinite(n) && n > max) {
              ev.preventDefault();
              netEl.value = String(max);
              refreshPreview(false);
            }
          });
          netEl.addEventListener('input', function () {
            clampNetEl(netEl, false);
            refreshPreview(false);
          });
          netEl.addEventListener('keyup', function () { refreshPreview(false); });
          netEl.addEventListener('paste', function (ev) {
            ev.preventDefault();
            var text = '';
            try {
              text = (ev.clipboardData || window.clipboardData).getData('text') || '';
            } catch (err) {}
            var n = parseFloat(String(text).replace(',', '.'));
            if (!isFinite(n)) return;
            var max = blockNetMax();
            if (n > max) n = max;
            if (n < netMin) n = netMin;
            netEl.value = String(Math.round(n));
            refreshPreview(false);
          });
          netEl.addEventListener('change', function () {
            clampNetEl(netEl, true);
            refreshPreview(true);
          });
          netEl.addEventListener('blur', function () {
            clampNetEl(netEl, true);
            refreshPreview(true);
          });
        }
        var netTEl = document.getElementById(p + 'net-t');
        if (netTEl) {
          netTEl.setAttribute('min', String(netMin));
          netTEl.setAttribute('max', String(blockNetMaxTransport()));
          netTEl.addEventListener('input', function () {
            clampNetElT(netTEl, false);
            refreshPreviewT(false);
          });
          netTEl.addEventListener('change', function () {
            clampNetElT(netTEl, true);
            refreshPreviewT(true);
          });
          netTEl.addEventListener('blur', function () {
            clampNetElT(netTEl, true);
            refreshPreviewT(true);
          });
        }
        var cityEl = document.getElementById(p + 'city');
        if (cityEl) cityEl.addEventListener('change', function () {
          refreshPreview(true);
          refreshPreviewT(true);
        });
        var dateEl = document.getElementById(p + 'date');
        if (dateEl) {
          if (typeof global.gcvBindDatePicker === 'function') {
            global.gcvBindDatePicker(dateEl, {
              min: typeof global.gcvTodayIso === 'function' ? global.gcvTodayIso() : ''
            });
          }
          dateEl.addEventListener('change', syncSequentialDates);
          dateEl.addEventListener('input', syncSequentialDates);
        }
        bindAttractionCombobox(p + 'attr-q', p + 'attr', p + 'attr-suggest', attrs, {
          getExcludedIds: function () {
            var ids = [];
            tourBlocks().forEach(function (block) {
              var bidx = block.getAttribute('data-tour-idx');
              if (String(bidx) === String(idx)) return;
              var hid = document.getElementById('ge-' + bidx + '-attr');
              var id = hid ? parseInt(hid.value, 10) : 0;
              if (id) ids.push(id);
            });
            return ids;
          },
          onChange: function () {
            refreshTourTabs();
            applyBlockNetMax();
          }
        });
        var attrQ = document.getElementById(p + 'attr-q');
        if (attrQ) attrQ.addEventListener('input', function () { refreshTourTabs(); });
        clampField(document.getElementById(p + 'max'), 1, maxCap, DEFAULT_MAX_PEOPLE);
        clampField(document.getElementById(p + 'preconfirmed'), 0, MAX_PRECONFIRMED, DEFAULT_PRECONFIRMED);
        bindMeetingPlaces(idx);
        bindConfirmedYesNo(p);
        var maxEl = document.getElementById(p + 'max');
        if (maxEl) {
          maxEl.addEventListener('change', function () {
            syncWalkQuorumFromVagas(p);
            syncTransportSeatsAndQuorum();
          });
        }
        var maxTEl = document.getElementById(p + 'max-t');
        if (maxTEl) {
          maxTEl.addEventListener('change', syncTransportSeatsAndQuorum);
        }
        syncWalkQuorumFromVagas(p);
        applyTransportEnabled();
        var transportEl = document.getElementById(p + 'transport');
        if (transportEl) {
          transportEl.addEventListener('change', function () { applyTransportEnabled(); });
        }
        var block = form.querySelector('[data-tour-idx="' + idx + '"]');
        if (block) {
          var rm = block.querySelector('[data-remove-tour]');
          if (rm) {
            rm.onclick = function () { removeTourBlock(idx); };
          }
        }
        if (!activeTourIdx) selectTourTab(idx);
        refreshTourTabs();
        syncSequentialDates();
      }

      function addTourBlock() {
        var prevBlocks = tourBlocks();
        var prevIdx = prevBlocks.length ? prevBlocks[prevBlocks.length - 1].getAttribute('data-tour-idx') : null;
        var idx = nextIdx++;
        var host = document.getElementById('ge-tours');
        host.insertAdjacentHTML('beforeend', tourBlockHtml(idx));
        bindTourBlock(idx);
        if (prevIdx != null) {
          var prevDate = document.getElementById('ge-' + prevIdx + '-date');
          var nextDate = document.getElementById('ge-' + idx + '-date');
        if (prevDate && nextDate && prevDate.value) {
            nextDate.value = addDaysIso(prevDate.value, 1);
            nextDate.dispatchEvent(new Event('input', { bubbles: true }));
          }
          var ph = document.getElementById('ge-' + prevIdx + '-time-h');
          var pm = document.getElementById('ge-' + prevIdx + '-time-m');
          var nh = document.getElementById('ge-' + idx + '-time-h');
          var nm = document.getElementById('ge-' + idx + '-time-m');
          if (ph && nh) nh.value = ph.value;
          if (pm && nm) nm.value = pm.value;
        }
        refreshTourTabs();
        syncSequentialDates();
        requestAnimationFrame(function () { selectTourTab(idx); });
      }

      function readTourPayload(block, n) {
        var idx = block.getAttribute('data-tour-idx');
        var p = 'ge-' + idx + '-';
        var el = function (name) { return document.getElementById(p + name); };
        var attrId = parseInt(el('attr').value, 10) || 0;
        var dateIso = (el('date').value || '').trim();
        var time = readTimeSelect(p + 'time-h', p + 'time-m');
        var cityId = parseInt(el('city').value, 10) || 0;
        var meetingId = (el('meeting').value || '').trim();
        var meetingRow = global.GcvMeetingPoints ? global.GcvMeetingPoints.byId(meetingId) : null;
        var meetingPoint = meetingRow ? (meetingRow.label.pt || meetingRow.label[Object.keys(meetingRow.label)[0]]) : meetingId;
        var net = parseFloat(el('net').value);
        var label = 'Passeio ' + n;
        if (!attrId) return { error: label + ': selecione um atrativo da lista.' };
        if (!dateIso) return { error: label + ': informe a data.' };
        if (!time) return { error: label + ': informe o horário de saída.' };
        if (!cityId) return { error: label + ': selecione a cidade de saída.' };
        if (!meetingId || !meetingRow) return { error: label + ': selecione o ponto de encontro da lista.' };
        if (!net || !isFinite(net) || net < netMin || net > netMaxForAttractionId(attrId, false)) {
          var thisMax = netMaxForAttractionId(attrId, false);
          return { error: label + ': valor a receber deve ser entre R$ ' + netMin + ' e R$ ' + thisMax + '.' };
        }
        var meetingLat = (el('meeting-lat').value || '').trim();
        var meetingLng = (el('meeting-lng').value || '').trim();
        var maxPeople = clampRange(parseFiniteInt(el('max').value, DEFAULT_MAX_PEOPLE), 1, maxCap);
        var preconfirmed = clampRange(parseFiniteInt(el('preconfirmed').value, DEFAULT_PRECONFIRMED), 0, MAX_PRECONFIRMED);
        var confirmed = isTourConfirmed(p);
        var quorum = confirmed ? 0 : clampRange(parseFiniteInt(el('quorum').value, DEFAULT_QUORUM), 1, maxPeople);
        if (preconfirmed > maxPeople) preconfirmed = maxPeople;
        if (maxPeople < preconfirmed + quorum) {
          return { error: label + ': vagas devem caber as pessoas confirmadas por fora e o quórum das novas inscrições.' };
        }
        var withTransport = !!(el('transport') && el('transport').checked);
        var payload = {
            attraction_id: attrId,
            date_iso: dateIso,
            departure_time: time,
            departure_city_id: cityId,
            meeting_point: meetingPoint,
            meeting_point_place_id: meetingId || ((el('meeting-place').value || '').trim() || null),
            meeting_point_lat: meetingLat !== '' ? meetingLat : null,
            meeting_point_lng: meetingLng !== '' ? meetingLng : null,
            guide_net_cents: Math.round(net * 100),
            quorum: quorum,
            preconfirmed_people: preconfirmed,
            max_people: maxPeople,
            include_transport: withTransport,
            offer_transport: withTransport,
            notes_pt: (el('notes').value || '').trim(),
        };
        if (withTransport) {
          var netT = parseFloat(el('net-t') ? el('net-t').value : '');
          var maxTCap = netMaxForAttractionId(attrId, true);
          if (!netT || !isFinite(netT) || netT < netMin || netT > maxTCap) {
            return { error: label + ': valor com transporte deve ser entre R$ ' + netMin + ' e R$ ' + maxTCap + '.' };
          }
          var tQuorumEl = el('t-quorum');
          var maxTEl = el('max-t');
          var maxPeopleT = clampRange(parseFiniteInt(maxTEl ? maxTEl.value : DEFAULT_MAX_TRANSPORT, DEFAULT_MAX_TRANSPORT), 1, Math.min(MAX_TRANSPORT_PEOPLE, maxPeople));
          var quorumT = clampRange(parseFiniteInt(tQuorumEl ? tQuorumEl.value : DEFAULT_QUORUM, DEFAULT_QUORUM), 0, maxPeopleT);
          if (quorumT > maxPeopleT) {
            return { error: label + ': quórum do transporte não pode ser maior que as vagas com transporte.' };
          }
          payload.guide_net_transport_cents = Math.round(netT * 100);
          payload.quorum_transport = quorumT;
          payload.max_people_transport = maxPeopleT;
        }
        return { payload: payload };
      }

      function fieldWrap(node) {
        if (!node) return null;
        return (node.closest && (
          node.closest('.gcv-dash-field') ||
          node.closest('.gcv-guide-net-box') ||
          node.closest('.gcv-datepicker')
        )) || node;
      }

      function firstPublishIssue() {
        var blocks = tourBlocks();
        var many = blocks.length > 1;
        var seenAttr = {};
        var i;
        for (i = 0; i < blocks.length; i++) {
          var n = i + 1;
          var idx = blocks[i].getAttribute('data-tour-idx');
          var p = 'ge-' + idx + '-';
          var el = function (name) { return document.getElementById(p + name); };
          var prefix = many ? ('Passeio ' + n + ': ') : '';
          function issue(node, message) {
            var focus = node;
            return {
              idx: idx,
              n: n,
              target: fieldWrap(node) || node,
              focus: focus,
              message: prefix + message
            };
          }
          var attrId = parseInt(el('attr') && el('attr').value, 10) || 0;
          if (!attrId) return issue(el('attr-q') || el('attr'), 'Selecione um atrativo da lista.');
          if (seenAttr[String(attrId)]) {
            return issue(el('attr-q') || el('attr'), 'Não é possível repetir o mesmo passeio em mais de um dia.');
          }
          seenAttr[String(attrId)] = true;
          if (!(el('date') && (el('date').value || '').trim())) {
            return issue(el('date'), 'Informe a data.');
          }
          if (!readTimeSelect(p + 'time-h', p + 'time-m')) {
            return issue(el('time-h'), 'Informe o horário de saída.');
          }
          var cityId = parseInt(el('city') && el('city').value, 10) || 0;
          if (!cityId) return issue(el('city'), 'Selecione a cidade de saída.');
          if (!(el('meeting') && (el('meeting').value || '').trim())) {
            return issue(el('meeting'), 'Selecione o ponto de encontro da lista.');
          }
          var net = parseFloat(el('net') && el('net').value);
          var maxNet = netMaxForAttractionId(attrId, false);
          if (!net || !isFinite(net) || net < netMin || net > maxNet) {
            return issue(el('net'), 'Valor a receber deve ser entre R$ ' + netMin + ' e R$ ' + maxNet + '.');
          }
          var maxPeople = clampRange(parseFiniteInt(el('max') && el('max').value, DEFAULT_MAX_PEOPLE), 1, maxCap);
          var preconfirmed = clampRange(parseFiniteInt(el('preconfirmed') && el('preconfirmed').value, DEFAULT_PRECONFIRMED), 0, MAX_PRECONFIRMED);
          var confirmed = isTourConfirmed(p);
          var quorum = confirmed ? 0 : clampRange(parseFiniteInt(el('quorum') && el('quorum').value, DEFAULT_QUORUM), 1, maxPeople);
          if (preconfirmed > maxPeople) preconfirmed = maxPeople;
          if (maxPeople < preconfirmed + quorum) {
            return issue(el('max'), 'Vagas devem caber as pessoas confirmadas por fora e o quórum das novas inscrições.');
          }
          var withTransport = !!(el('transport') && el('transport').checked);
          if (withTransport) {
            var netT = parseFloat(el('net-t') && el('net-t').value);
            var maxTCap = netMaxForAttractionId(attrId, true);
            if (!netT || !isFinite(netT) || netT < netMin || netT > maxTCap) {
              return issue(el('net-t'), 'Valor com transporte deve ser entre R$ ' + netMin + ' e R$ ' + maxTCap + '.');
            }
            var tQuorumEl = el('t-quorum');
            var maxTEl = el('max-t');
            var maxPeopleT = clampRange(parseFiniteInt(maxTEl ? maxTEl.value : DEFAULT_MAX_TRANSPORT, DEFAULT_MAX_TRANSPORT), 1, Math.min(MAX_TRANSPORT_PEOPLE, maxPeople));
            var quorumT = clampRange(parseFiniteInt(tQuorumEl ? tQuorumEl.value : DEFAULT_QUORUM, DEFAULT_QUORUM), 0, maxPeopleT);
            if (quorumT > maxPeopleT) {
              return issue(tQuorumEl, 'O quórum do transporte não pode ser maior que as vagas com transporte.');
            }
          }
        }
        return null;
      }

      function attachAdminGuide(payload) {
        if (!isAdmin) return payload;
        var g = document.getElementById('ge-admin-guide');
        payload.guide_user_id = g ? (parseInt(g.value, 10) || 0) : 0;
        payload.status = 'published';
        return payload;
      }

      function publishUrl() {
        return isAdmin ? '/api/admin/excursions.php' : '/api/guides/excursions.php';
      }

      function sendAll(payloads, i, okCount, errors, done) {
        if (i >= payloads.length) return done(okCount, errors);
        sendJson('POST', publishUrl(), attachAdminGuide(payloads[i]), function (e, r) {
          if (r && r.ok) okCount += 1;
          else errors.push('Passeio ' + (i + 1) + ': ' + ((r && r.error) || 'erro ao enviar'));
          sendAll(payloads, i + 1, okCount, errors, done);
        });
      }

      var adminGuideHtml = '';
      if (isAdmin) {
        var guides = (d.guides || []).filter(function (g) {
          var st = String(g.status || '').toLowerCase();
          return !st || st === 'active' || st === 'approved';
        });
        var editGuideId = pendingEditExcursion ? pendingEditExcursion.guide_user_id : '';
        adminGuideHtml =
          '<div class="gcv-dash-field" id="ge-admin-guide-wrap">' +
          '<label class="gcv-dash-label" for="ge-admin-guide">Guia <span class="gcv-cms-muted">(opcional)</span></label>' +
          '<select class="gcv-dash-select" id="ge-admin-guide">' +
          '<option value="">Sem guia</option>' +
          guides.map(function (g) {
            var gid = g.user_id || g.id;
            var label = (g.full_name || g.nickname || g.name || '') + (g.nickname && g.full_name ? ' (' + g.nickname + ')' : '');
            return '<option value="' + gid + '"' + (String(editGuideId) === String(gid) ? ' selected' : '') + '>' + esc(label) + '</option>';
          }).join('') +
          '</select>' +
          (function () {
            var ex = pendingEditExcursion;
            if (!ex) return '';
            var bits = [];
            if (ex.approved_at) bits.push('Aprovado em ' + String(ex.approved_at).slice(8, 10) + '/' + String(ex.approved_at).slice(5, 7) + '/' + String(ex.approved_at).slice(0, 4));
            else if (ex.created_at) bits.push('Enviado em ' + String(ex.created_at).slice(8, 10) + '/' + String(ex.created_at).slice(5, 7) + '/' + String(ex.created_at).slice(0, 4));
            if (!bits.length) return '';
            return '<p class="gcv-cms-muted" id="ge-admin-approved" style="margin:0.4rem 0 0;">' + esc(bits.join(' · ')) + '</p>';
          }()) +
          '</div>';
      }

      form.classList.add('gcv-dash-form--publish', 'is-tour-carousel');
      form.setAttribute('data-admin', isAdmin ? '1' : '0');
      form._gcvAdminOnDone = onDone;
      form.innerHTML =
        adminGuideHtml +
        '<div class="gcv-tour-tabs-wrap">' +
        '<div class="gcv-tour-tabs" id="ge-tour-tabs" role="tablist"></div>' +
        '<button type="button" class="gcv-tour-tab gcv-tour-tab--add" id="ge-add-tour-desk" aria-label="Adicionar passeio">+</button>' +
        '</div>' +
        '<div id="ge-tours" class="gcv-tour-carousel"></div>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-form__add gcv-tour-add-mobile" id="ge-add-tour">+ Adicionar passeio</button>' +
        '<div class="gcv-dash-form__footer">' +
        '<div class="gcv-dash-form__footer-actions">' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--success">' + (isAdmin ? 'Publicar passeio' : 'Enviar para aprovação') + '</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--blue" id="ge-clear-publish-footer">Limpar</button>' +
        '</div>' +
        '</div>';

      addTourBlock();
      var publishSpot = null;
      var publishSpotIssue = null;
      var publishSpotWatch = null;
      var publishSpotLayout = null;

      function hidePublishSpot() {
        if (publishSpotWatch) {
          document.removeEventListener('input', publishSpotWatch, true);
          document.removeEventListener('change', publishSpotWatch, true);
          publishSpotWatch = null;
        }
        if (publishSpotLayout) {
          window.removeEventListener('resize', publishSpotLayout);
          window.removeEventListener('scroll', publishSpotLayout, true);
          publishSpotLayout = null;
        }
        if (publishSpot) {
          publishSpot.root.hidden = true;
          publishSpot.root.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('gcv-spot-open');
        form.querySelectorAll('.is-spotlight').forEach(function (el) {
          el.classList.remove('is-spotlight');
        });
        publishSpotIssue = null;
      }

      function layoutPublishSpot() {
        if (!publishSpot || !publishSpotIssue || !publishSpotIssue.target) return;
        var pad = 6;
        var r = publishSpotIssue.target.getBoundingClientRect();
        var top = Math.max(0, Math.round(r.top - pad));
        var left = Math.max(0, Math.round(r.left - pad));
        var right = Math.min(window.innerWidth, Math.round(r.right + pad));
        var bottom = Math.min(window.innerHeight, Math.round(r.bottom + pad));
        var w = Math.max(8, right - left);
        var h = Math.max(8, bottom - top);
        publishSpot.n.style.cssText = 'top:0;left:0;right:0;height:' + top + 'px';
        publishSpot.s.style.cssText = 'top:' + bottom + 'px;left:0;right:0;bottom:0';
        publishSpot.w.style.cssText = 'top:' + top + 'px;left:0;width:' + left + 'px;height:' + h + 'px';
        publishSpot.e.style.cssText = 'top:' + top + 'px;left:' + right + 'px;right:0;height:' + h + 'px';
        publishSpot.ring.style.cssText = 'top:' + top + 'px;left:' + left + 'px;width:' + w + 'px;height:' + h + 'px';
        publishSpot.msg.textContent = publishSpotIssue.message || '';
        var alertW = Math.min(320, window.innerWidth - 24);
        publishSpot.alert.style.width = alertW + 'px';
        var alertH = publishSpot.alert.offsetHeight || 96;
        var alertTop = bottom + 10;
        if (alertTop + alertH > window.innerHeight - 12) {
          alertTop = Math.max(12, top - alertH - 10);
        }
        var alertLeft = left;
        if (alertLeft + alertW > window.innerWidth - 12) alertLeft = window.innerWidth - alertW - 12;
        if (alertLeft < 12) alertLeft = 12;
        publishSpot.alert.style.top = alertTop + 'px';
        publishSpot.alert.style.left = alertLeft + 'px';
      }

      function ensurePublishSpot() {
        if (publishSpot) return;
        var root = document.createElement('div');
        root.className = 'gcv-spot';
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML =
          '<div class="gcv-spot__dim" data-edge="n"></div>' +
          '<div class="gcv-spot__dim" data-edge="s"></div>' +
          '<div class="gcv-spot__dim" data-edge="w"></div>' +
          '<div class="gcv-spot__dim" data-edge="e"></div>' +
          '<div class="gcv-spot__ring"></div>' +
          '<div class="gcv-spot__alert" role="alert">' +
          '<p class="gcv-spot__msg"></p>' +
          '<button type="button" class="gcv-spot__ok">Entendi</button>' +
          '</div>';
        document.body.appendChild(root);
        root.addEventListener('click', function (ev) {
          var edge = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-edge');
          if (edge) hidePublishSpot();
        });
        root.querySelector('.gcv-spot__ok').addEventListener('click', function () { hidePublishSpot(); });
        document.addEventListener('keydown', function (ev) {
          if (ev.key === 'Escape' && publishSpot && !publishSpot.root.hidden) {
            ev.preventDefault();
            hidePublishSpot();
          }
        });
        publishSpot = {
          root: root,
          n: root.querySelector('[data-edge="n"]'),
          s: root.querySelector('[data-edge="s"]'),
          w: root.querySelector('[data-edge="w"]'),
          e: root.querySelector('[data-edge="e"]'),
          ring: root.querySelector('.gcv-spot__ring'),
          alert: root.querySelector('.gcv-spot__alert'),
          msg: root.querySelector('.gcv-spot__msg')
        };
      }

      function showPublishSpot(issue) {
        if (!issue || !issue.target) return;
        ensurePublishSpot();
        form.querySelectorAll('.is-spotlight').forEach(function (el) {
          el.classList.remove('is-spotlight');
        });
        publishSpotIssue = issue;
        issue.target.classList.add('is-spotlight');
        selectTourTab(issue.idx);
        requestAnimationFrame(function () {
          pinTourTabsBar();
          var header = document.getElementById('gcv-dash-sidebar');
          var tabs = form.querySelector('.gcv-tour-tabs-wrap');
          var headerH = header ? header.getBoundingClientRect().height : 60;
          var tabsH = (form.classList.contains('is-tour-carousel') && tabs && tabs.offsetHeight) ? tabs.offsetHeight : 0;
          var y = issue.target.getBoundingClientRect().top + (window.pageYOffset || 0) - headerH - tabsH - 24;
          if (y < 0) y = 0;
          window.scrollTo(0, y);
          requestAnimationFrame(function () {
            publishSpot.root.hidden = false;
            publishSpot.root.setAttribute('aria-hidden', 'false');
            document.body.classList.add('gcv-spot-open');
            layoutPublishSpot();
            if (!publishSpotLayout) {
              publishSpotLayout = function () { layoutPublishSpot(); };
              window.addEventListener('resize', publishSpotLayout);
              window.addEventListener('scroll', publishSpotLayout, true);
            }
            var focusEl = issue.focus;
            if (focusEl && typeof focusEl.focus === 'function') {
              try { focusEl.focus({ preventScroll: true }); } catch (err) { focusEl.focus(); }
            }
          });
        });
        if (!publishSpotWatch) {
          publishSpotWatch = function () {
            if (!publishSpotIssue) return;
            var next = firstPublishIssue();
            if (!next) {
              hidePublishSpot();
              return;
            }
            if (next.focus !== publishSpotIssue.focus || next.message !== publishSpotIssue.message) {
              showPublishSpot(next);
            } else {
              layoutPublishSpot();
            }
          };
          document.addEventListener('input', publishSpotWatch, true);
          document.addEventListener('change', publishSpotWatch, true);
        }
      }

      function resetPublishForm() {
        hidePublishSpot();
        var host = document.getElementById('ge-tours');
        if (host) host.innerHTML = '';
        nextIdx = 1;
        activeTourIdx = null;
        addTourBlock();
      }
      form._gcvResetPublish = resetPublishForm;
      bindClearPublishButtons(form);
      function scrollPublishToTop() {
        var header = document.getElementById('gcv-dash-sidebar');
        var wrap = form.querySelector('.gcv-tour-tabs-wrap');
        var host = document.getElementById('ge-tours');
        var headerH = header ? header.getBoundingClientRect().height : 60;
        var el = (wrap && wrap.offsetHeight) ? wrap : host;
        if (!el) return;
        var y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - headerH;
        if (y < 0) y = 0;
        if (typeof window.scrollTo === 'function') {
          window.scrollTo({ top: y, behavior: 'auto' });
        } else {
          window.scrollTop = y;
        }
      }
      function onAddTour() {
        addTourBlock();
        requestAnimationFrame(function () {
          pinTourTabsBar();
          requestAnimationFrame(function () { scrollPublishToTop(); });
        });
      }
      var addMobile = document.getElementById('ge-add-tour');
      var addDesk = document.getElementById('ge-add-tour-desk');
      if (addMobile) addMobile.onclick = onAddTour;
      if (addDesk) addDesk.onclick = onAddTour;
      var carouselHost = document.getElementById('ge-tours');
      if (carouselHost && carouselHost.getAttribute('data-carousel-bound') !== '1') {
        carouselHost.setAttribute('data-carousel-bound', '1');
        var carouselTick = false;
        carouselHost.addEventListener('scroll', function () {
          if (carouselTick) return;
          carouselTick = true;
          requestAnimationFrame(function () {
            carouselTick = false;
            syncCarouselActive();
          });
        }, { passive: true });
        var tourSnapTimer = 0;
        carouselHost.addEventListener('scrollend', function () {
          if (tourScrollLock) return;
          if (activeTourIdx) scrollTourIntoView(activeTourIdx);
        });
        carouselHost.addEventListener('scroll', function () {
          if (tourScrollLock) return;
          if (tourSnapTimer) clearTimeout(tourSnapTimer);
          tourSnapTimer = setTimeout(function () {
            if (!tourScrollLock && activeTourIdx) scrollTourIntoView(activeTourIdx);
          }, 120);
        }, { passive: true });
        window.addEventListener('resize', function () {
          pinTourTabsBar();
          if (activeTourIdx) scrollTourIntoView(activeTourIdx);
        });
      }
      form.setAttribute('data-ready', '1');

      function centsToReais(cents) {
        var n = parseFiniteInt(cents, 0);
        return n > 0 ? String(Math.round(n / 100)) : '';
      }
      function writeTimeSelect(hourId, minId, hhmm) {
        var raw = String(hhmm || '10:00');
        var parts = raw.split(':');
        var hEl = document.getElementById(hourId);
        var mEl = document.getElementById(minId);
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || h < 0 || h > 23) h = 10;
        m = snapTimeMinutes(m);
        if (hEl) hEl.value = pad2(h);
        if (mEl) mEl.value = pad2(m);
      }
      function setPublishEditMode(on) {
        form.setAttribute('data-edit-id', on && pendingEditExcursion ? String(pendingEditExcursion.id) : '');
        if (!on) form.removeAttribute('data-edit-id');
        var addM = document.getElementById('ge-add-tour');
        var addD = document.getElementById('ge-add-tour-desk');
        if (addM) addM.hidden = !!on;
        if (addD) addD.hidden = !!on;
        var submit = form.querySelector('.gcv-dash-form__footer button[type="submit"]');
        if (submit) submit.textContent = on ? 'Salvar' : (form.getAttribute('data-admin') === '1' ? 'Publicar passeio' : 'Enviar para aprovação');
        var clear = document.getElementById('ge-clear-publish-footer');
        var clearTop = document.getElementById('ge-clear-publish');
        if (clear) clear.textContent = on ? 'Cancelar' : 'Limpar';
        if (clearTop) clearTop.textContent = on ? 'Cancelar' : 'Limpar';
      }
      function fillBlockFromExcursion(e) {
        resetPublishForm();
        var block = form.querySelector('.gcv-dash-tour-block');
        if (!block || !e) return;
        var idx = block.getAttribute('data-tour-idx');
        var p = 'ge-' + idx + '-';
        var el = function (name) { return document.getElementById(p + name); };
        var hid = el('attr');
        var q = el('attr-q');
        var picked = attractionById(e.attraction_id);
        if (hid) hid.value = String(e.attraction_id || '');
        if (q) {
          q.value = (picked && picked.title_pt) || e.attraction_title || '';
          q.classList.add('is-picked');
        }
        if (el('date')) {
          el('date').value = e.date_iso || '';
          el('date').dispatchEvent(new Event('input', { bubbles: true }));
        }
        writeTimeSelect(p + 'time-h', p + 'time-m', e.departure_time);
        if (el('city')) {
          el('city').value = String(e.departure_city_id || '');
          el('city').dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (el('meeting-place')) el('meeting-place').value = e.meeting_point_place_id || '';
        if (el('meeting-lat')) el('meeting-lat').value = e.meeting_point_lat != null ? String(e.meeting_point_lat) : '';
        if (el('meeting-lng')) el('meeting-lng').value = e.meeting_point_lng != null ? String(e.meeting_point_lng) : '';
        if (el('meeting') && global.GcvMeetingPoints) {
          var saved = global.GcvMeetingPoints.matchSaved(
            e.meeting_point_place_id || '',
            e.meeting_point || '',
            global.GcvMeetingPoints.cityKeyFromSelect(el('city'))
          );
          el('meeting').value = saved ? saved.id : '';
          el('meeting').dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (el('net')) {
          el('net').value = centsToReais(e.guide_net_cents);
          el('net').dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (el('max')) {
          el('max').value = String(parseFiniteInt(e.max_people, DEFAULT_MAX_PEOPLE));
          el('max').dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (el('preconfirmed')) el('preconfirmed').value = String(parseFiniteInt(e.preconfirmed_people, 0));
        var yes = el('confirmed-yes');
        if (yes) {
          yes.checked = parseFiniteInt(e.quorum, 0) === 0;
          yes.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (el('quorum') && parseFiniteInt(e.quorum, 0) > 0) {
          el('quorum').value = String(e.quorum);
        }
        if (el('notes')) el('notes').value = e.notes_pt || '';
        var t = el('transport');
        if (t) {
          t.checked = offersAgendaTransport(e);
          t.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (offersAgendaTransport(e)) {
          if (el('net-t')) {
            el('net-t').value = centsToReais(e.guide_net_transport_cents);
            el('net-t').dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (el('max-t')) el('max-t').value = String(parseFiniteInt(e.max_people_transport, DEFAULT_MAX_TRANSPORT));
          if (el('t-quorum')) el('t-quorum').value = String(parseFiniteInt(e.quorum_transport, DEFAULT_QUORUM));
        }
        var adminGuide = document.getElementById('ge-admin-guide');
        if (adminGuide && e.guide_user_id) adminGuide.value = String(e.guide_user_id);
      }
      function applyPendingEdit() {
        if (!pendingEditExcursion) {
          setPublishEditMode(false);
          return;
        }
        fillBlockFromExcursion(pendingEditExcursion);
        setPublishEditMode(true);
      }
      form._gcvApplyPendingEdit = applyPendingEdit;
      form._gcvSetPublishEditMode = setPublishEditMode;
      applyPendingEdit();

      form.onsubmit = function (ev) {
        ev.preventDefault();
        var issue = firstPublishIssue();
        if (issue) {
          showPublishSpot(issue);
          return;
        }
        hidePublishSpot();
        var blocks = tourBlocks();
        var payloads = [];
        var i;
        for (i = 0; i < blocks.length; i++) {
          var parsed = readTourPayload(blocks[i], i + 1);
          if (parsed.error) {
            showPublishSpot(firstPublishIssue());
            return;
          }
          payloads.push(parsed.payload);
        }
        var btn = form.querySelector('.gcv-dash-form__footer button[type="submit"]');
        var editId = parseInt(form.getAttribute('data-edit-id') || '0', 10);
        if (editId > 0) {
          if (btn) btn.disabled = true;
          sendJson('PUT', publishUrl(), Object.assign({
            id: editId,
            action: 'update'
          }, attachAdminGuide(payloads[0] || {})), function (e, r) {
            if (btn) btn.disabled = false;
            var msg = (r && r.data && r.data.message) || (r && r.error) || 'Erro ao salvar';
            if (typeof global.gcvAlert === 'function') global.gcvAlert(msg);
            else window.alert(msg);
            if (r && r.ok) {
              pendingEditExcursion = null;
              setPublishEditMode(false);
              resetPublishForm();
              if (isAdmin && typeof form._gcvAdminOnDone === 'function') form._gcvAdminOnDone();
              else gotoDashSection('section-guide-tours');
            }
          });
          return;
        }
        if (btn) btn.disabled = true;
        sendAll(payloads, 0, 0, [], function (okCount, errors) {
          if (btn) btn.disabled = false;
          var msg;
          if (errors.length && !okCount) {
            msg = errors.join(' ');
            if (typeof global.gcvAlert === 'function') global.gcvAlert(msg);
            else window.alert(msg);
            return;
          }
          if (isAdmin) {
            msg = okCount === 1
              ? '1 passeio publicado no site.'
              : okCount + ' passeios publicados no site.';
          } else {
            msg = okCount === 1
              ? '1 passeio enviado para aprovação. Só aparece no site depois que o administrador aprovar.'
              : okCount + ' passeios enviados para aprovação. Só aparecem no site depois que o administrador aprovar.';
          }
          if (errors.length) msg += ' ' + errors.join(' ');
          if (okCount) resetPublishForm();
          if (typeof global.gcvAlert === 'function') global.gcvAlert(msg);
          else window.alert(msg);
          if (isAdmin && okCount && typeof form._gcvAdminOnDone === 'function') form._gcvAdminOnDone();
        });
      };
    });
  }

  /* ---------- GUIA: DADOS FINANCEIROS (embutidos em Meu perfil) ---------- */
  function loadGuideFinancial() {}

  function formatDateTime(raw) {
    if (!raw) return '—';
    var s = String(raw);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1] + ' · ' + m[4] + ':' + m[5];
    return formatGuideDate(s) || s;
  }

  function payoutLabel(status) {
    var st = String(status || '').toUpperCase();
    if (st === 'PAYOUT_PAID') return '<span class="gcv-dash-client__paid">Recebido via PIX</span>';
    if (st === 'PAYOUT_BLOCKED') return '<span class="gcv-dash-client__pending">Bloqueado</span>';
    if (st === 'PAYOUT_REVIEW') return '<span class="gcv-dash-client__pending">Em análise</span>';
    return '<span class="gcv-dash-client__pending">PIX agendado</span>';
  }

  function loadGuideEarnings() {
    var root = document.getElementById('guide-earnings-root');
    if (!root) return;
    root.innerHTML = 'Carregando financeiro…';
    get('/api/guides/earnings.php', function (err, res) {
      if (!res || !res.ok) {
        root.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar o financeiro.</p>';
        return;
      }
      var d = res.data || {};
      var sum = d.summary || {};
      var tours = d.tours || [];
      var afterLabel = sum.payout_after_label
        || ((sum.payout_after_hour || 16) + 'h' + (sum.payout_after_minute ? String(sum.payout_after_minute).padStart(2, '0') : ''));
      var pixReady = !!sum.pix_ready;
      var pixVerified = !!sum.pix_verified;
      var autoPix = !!sum.auto_pix;

      var upcoming = tours.filter(function (t) { return t.upcoming; });
      var past = tours.filter(function (t) { return !t.upcoming; });

      function tourCard(t) {
        var zero = !t.paid_sales;
        var salesHtml = (t.sales || []).map(function (s) {
          var paidClient = s.sale_status === 'PAID';
          return (
            '<li class="gcv-earn-sale">' +
            '<div class="gcv-earn-sale__main">' +
            '<strong>' + esc(s.name) + '</strong>' +
            '<span>' + s.people + (s.people === 1 ? ' pessoa' : ' pessoas') + '</span>' +
            '</div>' +
            '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Pago em</span> ' +
            esc(paidClient ? formatDateTime(s.paid_at) : 'Aguardando PIX do cliente') + '</div>' +
            '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Seu valor</span> ' + money(s.guide_amount_cents) +
            ' <span class="gcv-cms-muted">(cliente ' + money(s.sold_price_cents) + ')</span></div>' +
            '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Repasse</span> ' +
            (paidClient
              ? (s.payout_status === 'PAYOUT_PAID'
                ? payoutLabel(s.payout_status) + ' em ' + esc(formatDateTime(s.payout_paid_at))
                : payoutLabel(s.payout_status) + (s.scheduled_payout_at ? ' · previsto ' + esc(formatDateTime(s.scheduled_payout_at)) : ''))
              : '—') +
            '</div>' +
            (s.reservation_id ? '<div class="gcv-dash-client__meta"><code>' + esc(s.reservation_id) + '</code></div>' : '') +
            '</li>'
          );
        }).join('');

        return (
          '<article class="gcv-earn-tour' + (zero ? ' gcv-earn-tour--zero' : '') + '">' +
          '<div class="gcv-earn-tour__head">' +
          '<div><strong>' + esc(t.date_iso ? formatGuideDate(t.date_iso) : '—') +
          (t.departure_time ? ' · ' + esc(t.departure_time) : '') +
          ' · ' + esc(t.attraction_title || 'Passeio') + '</strong>' +
          '<div class="gcv-cms-muted">' + esc(t.city || '') +
          (t.status === 'cancelled' ? ' · cancelado' : '') + '</div></div>' +
          '<div class="gcv-earn-tour__nums">' +
          '<span>' + t.people + (t.people === 1 ? ' pessoa paga' : ' pessoas pagas') +
          ' · ' + (t.guiagem_people || 0) + ' guiada' + ((t.guiagem_people || 0) === 1 ? '' : 's') + '</span>' +
          '<strong>' + money(t.guide_cents) + '</strong>' +
          '</div></div>' +
          (zero
            ? '<p class="gcv-earn-zero">Nenhuma compra neste passeio · ' + money(0) + '</p>'
            : '<ul class="gcv-earn-sales">' + salesHtml + '</ul>' +
              '<div class="gcv-earn-tour__foot">' +
              'A receber: ' + money(t.payout_pending_cents) +
              ' · Já recebido: ' + money(t.payout_paid_cents) +
              '</div>') +
          '</article>'
        );
      }

      function block(title, list) {
        if (!list.length) return '';
        return (
          '<h3 class="gcv-dash-card__title" style="margin-top:1.25rem;">' + title + ' · ' + list.length + '</h3>' +
          list.map(tourCard).join('')
        );
      }

      root.innerHTML =
        '<div class="gcv-dash-alert ' + (pixReady && pixVerified && autoPix ? 'gcv-dash-alert--success' : 'gcv-dash-alert--info') + '">' +
        (autoPix
          ? 'O PIX é <strong>enviado automaticamente</strong> para a chave cadastrada em Meu perfil, <strong>após as ' + afterLabel + ' do dia do passeio</strong>.'
          : 'O envio automático de PIX ainda não está ativo no banco. O admin pode pagar manualmente; a chave continua em Meu perfil.') +
        (pixReady ? '' : ' Cadastre CPF/CNPJ e PIX em <a href="#perfil" id="ge-goto-profile">Meu perfil</a>.') +
        (pixReady && !pixVerified ? ' A chave ainda <strong>aguarda verificação do admin</strong> antes do primeiro envio automático.' : '') +
        '</div>' +
        '<div class="gcv-earn-stats">' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">A receber</div><div class="gcv-dash-stat__value">' + money(sum.payout_pending_cents) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Já recebido</div><div class="gcv-dash-stat__value">' + money(sum.payout_paid_cents) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Pessoas (pagas)</div><div class="gcv-dash-stat__value">' + (sum.people_total || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Pessoas guiadas (QR)</div><div class="gcv-dash-stat__value">' + (sum.guiagem_people_total || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Passeios</div><div class="gcv-dash-stat__value">' + (sum.tours_count || 0) +
          '<span class="gcv-earn-stat-sub">' + (sum.tours_without_sales || 0) + ' sem venda</span></div></div>' +
        '</div>' +
        (sum.next_payout_at
          ? '<p class="gcv-dash-hint">Próximo PIX automático previsto: <strong>' + esc(formatDateTime(sum.next_payout_at)) + '</strong></p>'
          : '') +
        (tours.length
          ? block('Próximos passeios', upcoming) + block('Realizados e outros', past)
          : '<div class="gcv-dash-alert gcv-dash-alert--info">Você ainda não publicou passeios. Quando publicar, eles aparecem aqui mesmo sem compras (R$ 0,00).</div>');

      var gotoP = document.getElementById('ge-goto-profile');
      if (gotoP) {
        gotoP.addEventListener('click', function (ev) {
          ev.preventDefault();
          gotoDashSection('section-guide-profile');
        });
      }
    });
  }

  /* ---------- CLIENTE ---------- */
  function loadClientUpcoming() {
    var grid = document.getElementById('client-tours-grid');
    if (!grid) return;
    grid.innerHTML = 'Carregando…';
    get('/api/bookings/my.php', function (err, res) {
      if (!res || !res.ok) {
        grid.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar.</p>';
        return;
      }
      var upcoming = (res.data && res.data.upcoming) || [];
      if (!upcoming.length) {
        grid.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Você não tem passeios próximos. Reserve na home!</div>';
        return;
      }
      grid.innerHTML = upcoming.map(function (b) {
        return (
          '<article class="gcv-cms-row">' +
          '<div><strong>' + esc(b.tour_title) + '</strong>' +
          '<div class="gcv-cms-muted">' + esc(b.departure_date) + ' · ' + esc(String(b.departure_time || '').slice(0, 5)) +
          ' · guia ' + esc(b.guide_name || '') + ' · ' + money(b.total_cents) + '</div></div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem;">' +
          lifeBadge(b.lifecycle, b.lifecycle_label) +
          (b.can_cancel
            ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-cancel-booking="' + b.id + '"' +
              (b.cancel_no_refund ? ' title="Sem ressarcimento (confirmado)"' : '') + '>' +
              (b.cancel_no_refund ? 'Cancelar (sem ressarc.)' : 'Cancelar') + '</button>'
            : '') +
          '</div></article>'
        );
      }).join('');

      grid.querySelectorAll('[data-cancel-booking]').forEach(function (btn) {
        btn.onclick = function () {
          var noRefund = (btn.getAttribute('title') || '').indexOf('Sem') >= 0;
          if (!confirm(noRefund
            ? 'Passeio confirmado: cancelar SEM ressarcimento?'
            : 'Cancelar esta reserva?')) return;
          sendJson('POST', '/api/bookings/cancel.php', {
            booking_id: parseInt(btn.getAttribute('data-cancel-booking'), 10),
          }, function (e, r) {
            alert((r && r.data && r.data.message) || (r && r.error) || 'Erro');
            if (r && r.ok) {
              loadClientUpcoming();
              loadClientBookingsEnhanced();
            }
          });
        };
      });
    });
  }

  function showTransferPix(pix) {
    var box = document.getElementById('client-transfer-pix');
    if (!box || !pix) return;
    var code = pix.brcode || '';
    var cents = pix.amount_cents || 0;
    box.hidden = false;
    box.innerHTML =
      '<strong>Pague a diferença no PIX para concluir a troca</strong>' +
      '<p class="gcv-dash-hint" style="margin:0.35rem 0 0;">Valor: ' + money(cents) +
      (pix.reservation_id ? ' · ' + esc(pix.reservation_id) : '') + '</p>' +
      '<textarea readonly>' + esc(code) + '</textarea>' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" id="gcv-copy-transfer-pix">Copiar código PIX</button>';
    var btn = document.getElementById('gcv-copy-transfer-pix');
    if (btn) {
      btn.onclick = function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { btn.textContent = 'Copiado'; });
        }
      };
    }
  }

  function loadClientBookingsEnhanced() {
    var tbody = document.getElementById('client-bookings-body');
    if (!tbody) return;
    get('/api/client/sales.php', function (err, res) {
      var sales = (res && res.ok && res.data && res.data.sales) || [];
      if (!sales.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">Nenhuma reserva ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = sales.map(function (b) {
        var when = (typeof formatGuideDate === 'function' ? formatGuideDate(b.date_iso) : (b.date_iso || '')) +
          (b.departure_time ? ' · ' + b.departure_time : '');
        var refundBtn = b.can_refund_full
          ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-refund="' + b.id + '">Cancelar 100%</button>'
          : '—';
        var offers = (b.can_transfer && (b.transfer_offers || []).length)
          ? '<div class="gcv-transfer-offers"><p>Passeios confirmados no mesmo dia, mesma cidade — você pode trocar enquanto o seu ainda está em formação:</p>' +
            b.transfer_offers.map(function (o) {
              var extra = (o.delta_cents > 0)
                ? 'Pagar diferença ' + esc(o.delta_label)
                : (o.delta_cents < 0 ? 'Ressarcimento ' + esc(o.delta_label) : 'Mesmo valor');
              return '<div class="gcv-transfer-offer"><span><strong>' + esc(o.to_title) + '</strong> · ' +
                esc(o.to_city || '') + (o.departure_time ? ' · ' + esc(o.departure_time) : '') +
                (o.to_guide ? ' · ' + esc(o.to_guide) : '') +
                ' · ' + extra + '</span>' +
                '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-accept="' + o.id + '">Trocar</button></div>';
            }).join('') + '</div>'
          : '';
        return '<tr>' +
          '<td>' + esc(b.tour_title) + (b.reservation_id ? '<div class="gcv-cms-muted"><code>' + esc(b.reservation_id) + '</code></div>' : '') + offers + '</td>' +
          '<td>' + esc(when) + '</td>' +
          '<td>' + (b.spots || 1) + '</td>' +
          '<td>' + money(b.sold_price_cents) + '</td>' +
          '<td>' + lifeBadge(b.lifecycle, b.lifecycle_label) + '</td>' +
          '<td>' + refundBtn + '</td></tr>';
      }).join('');

      tbody.querySelectorAll('[data-refund]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Cancelar com ressarcimento de 100% pelo PIX original?')) return;
          sendJson('POST', '/api/client/transfer.php', {
            action: 'refund',
            sale_id: parseInt(btn.getAttribute('data-refund'), 10),
          }, function (e, r) {
            alert((r && r.ok) ? 'Cancelada. O valor volta pelo PIX original.' : ((r && r.error) || 'Erro'));
            if (r && r.ok) {
              loadClientBookingsEnhanced();
              loadClientUpcoming();
            }
          });
        };
      });
      tbody.querySelectorAll('[data-accept]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Confirmar a troca para este passeio?')) return;
          sendJson('POST', '/api/client/transfer.php', {
            action: 'accept',
            offer_id: parseInt(btn.getAttribute('data-accept'), 10),
          }, function (e, r) {
            if (!r || !r.ok) {
              alert((r && r.error) || 'Não foi possível trocar.');
              return;
            }
            var d = r.data || {};
            if (d.needs_payment && d.pix) {
              showTransferPix(d.pix);
              alert('Pague a diferença no PIX para concluir a troca.');
              return;
            }
            alert('Reserva transferida.');
            loadClientBookingsEnhanced();
            loadClientUpcoming();
          });
        };
      });
    });
  }

  function loadClientProfile() {
    var root = document.getElementById('client-profile-root');
    if (!root) return;
    root.innerHTML = 'Carregando…';
    get('/api/client/profile.php', function (err, res) {
      if (!res || !res.ok) {
        root.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar perfil.</p>';
        return;
      }
      var p = (res.data && res.data.profile) || {};
      root.innerHTML =
        '<form class="gcv-dash-form" id="client-profile-form">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome *</label>' +
        '<input class="gcv-dash-input" id="cp-name" maxlength="120" value="' + esc(p.name || '') + '" required /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">E-mail</label>' +
        '<input class="gcv-dash-input" value="' + esc(p.email || '') + '" disabled /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">WhatsApp *</label>' +
        '<p class="gcv-dash-hint" style="margin:0 0 0.5rem;">DDI com bandeira + DDD + número. Usamos este telefone para avisar você no WhatsApp.</p>' +
        '<div id="cp-phone-wrap"></div>' +
        '<p class="gcv-dash-alert gcv-dash-alert--warning" id="cp-phone-err" hidden style="margin-top:0.6rem;"></p></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">CPF</label>' +
        '<input class="gcv-dash-input" id="cp-cpf" value="' + esc(p.cpf || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento</label>' +
        '<input class="gcv-dash-input" id="cp-birth" type="date" value="' + esc(p.birth_date || '') + '" /></div>' +
        '</div>' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Salvar</button>' +
        '<div id="cp-msg" class="gcv-dash-alert" hidden style="margin-top:1rem;"></div></form>';

      var cpPhone = bindDashPhone(
        document.getElementById('cp-phone-wrap'),
        'cp',
        p.phone_iso || p.phone_ddi || 'br',
        p.phone || ''
      );

      document.getElementById('client-profile-form').onsubmit = function (ev) {
        ev.preventDefault();
        var phoneErr = document.getElementById('cp-phone-err');
        var phoneIssue = cpPhone.validate();
        if (phoneIssue) {
          if (phoneErr) {
            phoneErr.hidden = false;
            phoneErr.textContent = phoneIssue;
          }
          return;
        }
        if (phoneErr) phoneErr.hidden = true;
        sendJson('PUT', '/api/client/profile.php', {
          name: document.getElementById('cp-name').value.trim(),
          phone_ddi: cpPhone.getDial(),
          phone_iso: cpPhone.getIso(),
          phone: cpPhone.getPhoneDigits(),
          cpf: document.getElementById('cp-cpf').value.trim(),
          birth_date: document.getElementById('cp-birth').value,
        }, function (e, r) {
          var msg = document.getElementById('cp-msg');
          if (!msg) return;
          msg.hidden = false;
          msg.className = 'gcv-dash-alert ' + (r && r.ok ? 'gcv-dash-alert--info' : 'gcv-dash-alert--warning');
          msg.textContent = (r && r.ok) ? 'Salvo!' : ((r && r.error) || 'Erro');
        });
      };
    });
  }

  function loadClientPublish() {
    var root = document.getElementById('client-publish-root');
    if (!root) return;
    root.innerHTML = 'Carregando…';
    get('/api/client/excursions.php', function (err, res) {
      if (!res || !res.ok) {
        root.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar.</p>';
        return;
      }
      var d = res.data || {};
      var attrs = sortAttractionsCatalog(d.attractions || []);
      var cities = d.cities || [];
      var minQ = d.min_quorum != null ? parseFiniteInt(d.min_quorum, MIN_QUORUM) : MIN_QUORUM;
      var maxQ = d.max_quorum != null ? parseFiniteInt(d.max_quorum, MAX_PEOPLE_CAP) : MAX_PEOPLE_CAP;
      var maxCap = d.max_people_cap != null ? parseFiniteInt(d.max_people_cap, MAX_PEOPLE_CAP) : MAX_PEOPLE_CAP;
      var proposals = d.my_proposals || [];

      root.innerHTML =
        '<p class="gcv-dash-hint" style="margin:0 0 1rem;color:#64748b;">Você define o <strong>valor por pessoa</strong>. A proposta fica em rascunho até o admin atribuir o guia e publicar.</p>' +
        '<form class="gcv-dash-form" id="client-pub-form">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Atrativo *</label>' +
        attractionComboboxHtml('ce-attr-q', 'ce-attr', 'ce-attr-suggest') +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Data *</label><input class="gcv-dash-input" type="date" id="ce-date" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Horário de saída *</label>' +
        timeSelectHtml('ce-time-h', 'ce-time-m', '10:15') + '</div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Saída *</label><select class="gcv-dash-select" id="ce-city">' +
        '<option value="">Selecione…</option>' +
        cities.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor por pessoa (R$) *</label>' +
        '<input class="gcv-dash-input" type="number" min="1" step="0.01" id="ce-price" /></div>' +
        confirmedQuorumRowHtml('ce-', false) +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Vagas</label>' +
        '<input class="gcv-dash-input" type="number" min="1" max="' + maxCap + '" value="' + DEFAULT_MAX_PEOPLE + '" id="ce-max" /></div>' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Enviar proposta</button>' +
        '<div id="ce-msg" class="gcv-dash-alert" hidden style="margin-top:1rem;"></div></form>' +
        '<h3 style="margin:1.5rem 0 0.75rem;font-size:1.05rem;">Minhas propostas</h3>' +
        (proposals.length
          ? proposals.map(function (e) {
            return '<article class="gcv-cms-row"><div><strong>' + esc(e.date_iso) + ' · ' + esc(e.attraction_title || '') +
              '</strong><div class="gcv-cms-muted">' + money(e.price_cents) + ' · ' + esc(e.status) +
              (e.guide_name ? ' · guia: ' + esc(e.guide_name) : ' · aguardando guia') + '</div></div>' +
              lifeBadge(e.lifecycle, e.lifecycle_label) + '</article>';
          }).join('')
          : '<p class="gcv-cms-muted">Nenhuma proposta ainda.</p>');

      bindAttractionCombobox('ce-attr-q', 'ce-attr', 'ce-attr-suggest', attrs);
      bindConfirmedYesNo('ce-');
      if (typeof global.gcvBindDatePicker === 'function') {
        global.gcvBindDatePicker(document.getElementById('ce-date'), {
          min: typeof global.gcvTodayIso === 'function' ? global.gcvTodayIso() : ''
        });
      }
      clampField(document.getElementById('ce-max'), 1, maxCap, DEFAULT_MAX_PEOPLE);
      var ceMax = document.getElementById('ce-max');
      if (ceMax) {
        ceMax.addEventListener('change', function () { syncWalkQuorumFromVagas('ce-'); });
      }
      syncWalkQuorumFromVagas('ce-');

      document.getElementById('client-pub-form').onsubmit = function (ev) {
        ev.preventDefault();
        var price = parseFloat(document.getElementById('ce-price').value);
        var attrId = parseInt(document.getElementById('ce-attr').value, 10) || 0;
        var msg = document.getElementById('ce-msg');
        if (!attrId) {
          if (msg) {
            msg.hidden = false;
            msg.className = 'gcv-dash-alert gcv-dash-alert--warning';
            msg.textContent = 'Selecione um passeio da lista.';
          }
          return;
        }
        var time = readTimeSelect('ce-time-h', 'ce-time-m');
        if (!time) {
          if (msg) {
            msg.hidden = false;
            msg.className = 'gcv-dash-alert gcv-dash-alert--warning';
            msg.textContent = 'Informe o horário de saída.';
          }
          return;
        }
        sendJson('POST', '/api/client/excursions.php', {
          attraction_id: attrId,
          date_iso: document.getElementById('ce-date').value,
          departure_time: time,
          departure_city_id: parseInt(document.getElementById('ce-city').value, 10) || 0,
          price_cents: Math.round((price || 0) * 100),
          quorum: isTourConfirmed('ce-')
            ? 0
            : clampRange(parseFiniteInt(document.getElementById('ce-quorum').value, DEFAULT_QUORUM), 1, clampRange(parseFiniteInt(document.getElementById('ce-max').value, DEFAULT_MAX_PEOPLE), 1, maxCap)),
          max_people: clampRange(parseFiniteInt(document.getElementById('ce-max').value, DEFAULT_MAX_PEOPLE), 1, maxCap),
        }, function (e, r) {
          var msg = document.getElementById('ce-msg');
          if (!msg) return;
          msg.hidden = false;
          msg.className = 'gcv-dash-alert ' + (r && r.ok ? 'gcv-dash-alert--info' : 'gcv-dash-alert--warning');
          msg.textContent = (r && r.ok) ? ((r.data && r.data.message) || 'Enviado!') : ((r && r.error) || 'Erro');
          if (r && r.ok) loadClientPublish();
        });
      };
    });
  }

  global.GcvDashRoles = {
    loadGuideProfile: loadGuideProfile,
    loadGuideAgenda: loadGuideAgenda,
    loadGuidePublish: loadGuidePublish,
    loadGuideFinancial: loadGuideFinancial,
    loadGuideEarnings: loadGuideEarnings,
    loadClientUpcoming: loadClientUpcoming,
    loadClientBookings: loadClientBookingsEnhanced,
    loadClientProfile: loadClientProfile,
    loadClientPublish: loadClientPublish,
    openCheckinScanner: openCheckinScanner,
    consumeCheckinHash: consumeCheckinHash,
  };
}(window));

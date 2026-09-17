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

  function timeSelectHtml(hourId, minId, selectedHHmm) {
    var raw = String(selectedHHmm || '10:00');
    var parts = raw.split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (!Number.isFinite(h) || h < 0 || h > 23) h = 10;
    if (!Number.isFinite(m) || m < 0) m = 0;
    m = Math.round(m / 10) * 10;
    if (m >= 60) m = 50;
    var hours = '';
    var i;
    for (i = 0; i < 24; i++) {
      hours += '<option value="' + pad2(i) + '"' + (i === h ? ' selected' : '') + '>' + pad2(i) + 'h</option>';
    }
    var mins = '';
    [0, 10, 20, 30, 40, 50].forEach(function (mm) {
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

  function bindConfirmedYesNo(prefix) {
    var yes = document.getElementById(prefix + 'confirmed-yes');
    var no = document.getElementById(prefix + 'confirmed-no');
    var wrap = document.getElementById(prefix + 'quorum-wrap');
    var sel = document.getElementById(prefix + 'quorum');
    function apply() {
      var confirmed = !!(yes && yes.checked);
      if (no) no.checked = !confirmed;
      if (wrap) wrap.hidden = confirmed;
      paintConfirmedQuorum(prefix, confirmed);
      if (sel) {
        sel.disabled = confirmed;
        sel.required = !confirmed;
        if (!confirmed) {
          var v = parseFiniteInt(sel.value, DEFAULT_QUORUM);
          if (v < 1 || v > MAX_QUORUM) sel.value = String(DEFAULT_QUORUM);
        }
      }
    }
    if (yes) {
      yes.addEventListener('change', function () {
        if (yes.checked && no) no.checked = false;
        if (!yes.checked && no) no.checked = true;
        apply();
      });
    }
    if (no) {
      no.addEventListener('change', function () {
        if (no.checked && yes) yes.checked = false;
        if (!no.checked && yes) yes.checked = true;
        apply();
      });
    }
    apply();
  }

  function isTourConfirmed(prefix) {
    var yes = document.getElementById(prefix + 'confirmed-yes');
    return !!(yes && yes.checked);
  }

  function quorumSelectHtml(id, selected) {
    var sel = parseFiniteInt(selected, DEFAULT_QUORUM);
    if (sel < 1) sel = DEFAULT_QUORUM;
    var opts = [
      { v: 1, t: '1' },
      { v: 2, t: '2' },
      { v: 3, t: '3' },
      { v: 4, t: '4' }
    ];
    return '<select class="gcv-dash-select" id="' + id + '" required>' +
      opts.map(function (o) {
        return '<option value="' + o.v + '"' + (sel === o.v ? ' selected' : '') + '>' + o.t + '</option>';
      }).join('') +
      '</select>';
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
    if (a === 'no_show') return ' · <span class="gcv-dash-client__pending">Sem QR (50%)</span>';
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
      return '<p class="gcv-dash-clients-empty">Nenhum cliente nesta saída ainda.</p>';
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
        return (
          '<li class="gcv-dash-client">' +
          '<div class="gcv-dash-client__line"><span class="gcv-dash-client__k">Nome</span> <strong>' + esc(name) + '</strong></div>' +
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

  function profileMissingLabel(key) {
    var map = {
      full_name: 'Nome completo',
      email: 'E-mail',
      phone: 'Telefone',
      birth_date: 'Nascimento',
      sexo: sexoUi().missing,
      base_city_id: 'Cidade',
      photo_3x4_url: 'Foto 3×4',
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
  function fillGuideProfileInbox() {
    var host = document.getElementById('gp-inbox-list');
    if (!host) return;
    get('/api/inbox/list.php?limit=30', function (err, res) {
      if (!host) return;
      if (err || !res || !res.ok) {
        host.innerHTML = '<p class="gcv-dash-alert gcv-dash-alert--warning">' +
          esc((res && res.error) || 'Não foi possível carregar as notificações.') + '</p>';
        return;
      }
      var items = (res.data && res.data.items) || [];
      if (!items.length) {
        host.innerHTML = '<p class="gcv-dash-hint" style="margin:0;color:#64748b;">Nenhuma notificação ainda.</p>';
        return;
      }
      host.innerHTML = items.map(function (it) {
        var unread = !!it.unread;
        var when = '';
        if (it.created_at) {
          var d = new Date(String(it.created_at).replace(' ', 'T'));
          if (!isNaN(d.getTime())) {
            var pad = function (n) { return (n < 10 ? '0' : '') + n; };
            when = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
              + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
          }
        }
        return (
          '<article class="gcv-inbox-item' + (unread ? ' gcv-inbox-item--unread' : '') + '">' +
            '<div class="gcv-inbox-item__head">' +
              '<strong>' + esc(it.title) + '</strong>' +
              (when ? '<time>' + esc(when) + '</time>' : '') +
            '</div>' +
            '<pre class="gcv-inbox-item__body">' + esc(it.body) + '</pre>' +
          '</article>'
        );
      }).join('');
    });
  }

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
      var docUrl = p.id_document_url || p.diploma_url || '';
      var initial = String(p.full_name || p.nickname || p.user_name || '?').charAt(0).toUpperCase();
      var missingTxt = missing.map(profileMissingLabel).join(', ');
      var pendingFirst = String(p.user_status || '') === 'pending' && !complete;
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
      } else if (complete) {
        statusBanner = String(p.user_status || '') === 'pending'
          ? '<div class="gcv-dash-alert gcv-dash-alert--pending">Aguardando Aprovação</div>'
          : '<div class="gcv-dash-alert gcv-dash-alert--success">Perfil completo. Você pode publicar passeios.</div>';
      } else {
        statusBanner = '<div class="gcv-dash-alert gcv-dash-alert--warning">Preencha os campos obrigatórios para enviar o cadastro.' +
          (missingTxt ? ' Faltam: <strong>' + esc(missingTxt) + '</strong>' : '') + '</div>';
      }

      root.innerHTML =
        statusBanner +
        '<div class="gcv-dash-card" id="gp-inbox-card">' +
          '<h3 class="gcv-dash-card__title">Notificações</h3>' +
          '<p class="gcv-dash-hint" style="margin:0 0 0.75rem;">Os mesmos avisos do sino: inscrição, aprovação e lembretes do passeio.</p>' +
          '<div id="gp-inbox-list">Carregando…</div>' +
        '</div>' +
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
            '<input class="gcv-dash-input" id="gp-full" maxlength="160" value="' + esc(p.full_name || p.user_name || '') + '" required />' +
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
          '<h3 class="gcv-dash-card__title">Documento</h3>' +
          '<div class="gcv-dash-doc-id-grid">' +
            '<div>' +
              '<input type="hidden" id="gp-doc-url" value="' + esc(docUrl) + '" />' +
              '<div class="gcv-dash-doc-row">' +
                '<div class="gcv-dash-doc-status" id="gp-doc-status">' +
                  (docUrl
                    ? '<span class="gcv-dash-doc-ok">Documento enviado</span>' +
                      (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(docUrl)
                        ? '<a href="' + esc(docUrl) + '" target="_blank" rel="noopener">Ver arquivo</a>'
                        : '<a href="' + esc(docUrl) + '" target="_blank" rel="noopener">Abrir arquivo</a>')
                    : '<span>RG, CNH ou outro documento com foto (opcional).</span>') +
                '</div>' +
                '<label class="gcv-dash-file-btn gcv-dash-file-btn--secondary">' +
                  '<input type="file" id="gp-doc-file" accept="image/*,application/pdf" hidden />' +
                  (docUrl ? 'Trocar documento' : 'Enviar documento') +
                '</label>' +
              '</div>' +
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
      fillGuideProfileInbox();

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

      var docInput = document.getElementById('gp-doc-file');
      if (docInput) {
        docInput.addEventListener('change', function () {
          var file = docInput.files && docInput.files[0];
          if (!file) return;
          var status = document.getElementById('gp-doc-status');
          if (status) status.innerHTML = '<span>Enviando documento…</span>';
          uploadFile(file, function (e, r) {
            if (!r || !r.ok) {
              if (status) status.innerHTML = '<span>' + esc((r && r.error) || 'Falha no upload') + '</span>';
              return;
            }
            var url = (r.data && r.data.url) || '';
            var urlEl = document.getElementById('gp-doc-url');
            if (urlEl) urlEl.value = url;
            if (status) {
              status.innerHTML =
                '<span class="gcv-dash-doc-ok">Documento enviado</span>' +
                (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">Ver arquivo</a>' : '');
            }
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

  function postCheckin(code, fromScan) {
    code = extractReservationCode(code);
    if (!code) {
      paintCheckinResult(false, 'Código da reserva inválido.');
      if (!fromScan) alert('Código da reserva inválido.');
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
        if (!fromScan) alert(msg);
        loadGuideAgenda();
        return;
      }
      var err = (r && r.error) || 'Não foi possível confirmar a presença.';
      paintCheckinResult(false, err);
      if (!fromScan) alert(err);
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
    if (closeBtn) closeBtn.onclick = closeCheckinScanner;

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

  function renderAgendaCard(e) {
    var booked = e.clients_spots != null ? e.clients_spots : (e.booked_people || 0);
    booked += parseInt(e.preconfirmed_people, 10) || 0;
    var pending = e.status === 'pending_approval' || e.lifecycle === 'aguardando_aprovacao';
    var scanBtn = (!pending && e.status !== 'cancelled')
      ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-scan-qr="' + e.id + '">Ler QR da reserva</button>'
      : '';
    var cancelBtn = e.can_cancel
      ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-cancel-exc="' + e.id + '">Cancelar</button>'
      : '';
    var pendingNote = pending
      ? '<p class="gcv-dash-alert gcv-dash-alert--warning" style="margin:0.6rem 0 0;">Aguardando aprovação do administrador. Ainda não aparece no site.</p>'
      : '';
    return (
      '<article class="gcv-cms-row gcv-guide-upcoming">' +
      '<div class="gcv-guide-upcoming__head">' +
      '<div><strong>' + esc(formatGuideDate(e.date_iso)) + ' · ' + esc(e.attraction_title || '') + '</strong>' +
      '<div class="gcv-cms-muted">' + esc(e.departure_city_name || '') + ' · ' +
      esc(String(e.departure_time || '').slice(0, 5)) + ' · ' + money(e.price_cents) +
      ' · ' + booked + (booked === 1 ? ' pessoa inscrita' : ' pessoas inscritas') +
      ' / ' + (e.max_people != null ? e.max_people : DEFAULT_MAX_PEOPLE) +
      ' (quórum: ' + quorumLabel(e.quorum) + ')</div></div>' +
      '<div class="gcv-guide-upcoming__actions">' +
      lifeBadge(e.lifecycle, e.lifecycle_label) +
      scanBtn +
      cancelBtn +
      '</div></div>' +
      pendingNote +
      renderGuideClients(e.clients) +
      '</article>'
    );
  }

  function loadGuideAgenda() {
    var pubBtn = document.getElementById('guide-agenda-goto-publish');
    if (pubBtn) {
      pubBtn.onclick = function () {
        gotoDashSection('section-guide-create-tour');
      };
    }
    var list = document.getElementById('guide-tours-list');
    if (!list) return;
    list.innerHTML = 'Carregando…';

    get('/api/guides/excursions.php', function (err, res) {
      if (!res || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar agenda.</p>';
        return;
      }
      var upcoming = (res.data && res.data.upcoming) || [];
      var all = (res.data && res.data.excursions) || [];
      var upcomingIds = {};
      upcoming.forEach(function (e) { upcomingIds[e.id] = true; });
      var past = all.filter(function (e) { return !upcomingIds[e.id]; });

      if (!all.length) {
        list.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum passeio na agenda.</div>';
        return;
      }

      var html = '';
      if (upcoming.length) {
        html += '<h3 class="gcv-dash-card__title" style="margin:0 0 0.75rem;">Próximas saídas</h3>';
        html += upcoming.map(renderAgendaCard).join('');
      } else {
        html += '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma saída próxima.</div>';
      }
      if (past.length) {
        html += '<h3 class="gcv-dash-card__title" style="margin:1.5rem 0 0.75rem;">Anteriores e canceladas</h3>';
        html += past.map(renderAgendaCard).join('');
      }
      list.innerHTML = html;

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
      list.querySelectorAll('[data-scan-qr]').forEach(function (btn) {
        btn.onclick = function () { openCheckinScanner(); };
      });
      list.querySelectorAll('[data-checkin-code]').forEach(function (btn) {
        btn.onclick = function () {
          postCheckin(btn.getAttribute('data-checkin-code') || '');
        };
      });
    });
  }

  /* ---------- GUIA: PUBLICAR ---------- */
  function loadGuidePublish() {
    var form = document.getElementById('gcv-guide-create-tour-form');
    if (!form) return;
    if (form.getAttribute('data-ready') === '1') return;
    form.innerHTML = 'Carregando…';
    get('/api/guides/excursions.php', function (err, res) {
      if (!res || !res.ok) {
        form.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar opções.</p>';
        return;
      }
      var d = res.data || {};
      if (!d.profile_complete) {
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
      if (!d.financial_ready) {
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
      var maxQ = d.max_quorum != null ? parseFiniteInt(d.max_quorum, MAX_QUORUM) : MAX_QUORUM;
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

      function selectTourTab(idx) {
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

      function setDateLocked(dateEl, locked) {
        if (!dateEl) return;
        dateEl.readOnly = !!locked;
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
        refreshTourTabs();
        if (wasActive) {
          var left = tourBlocks();
          if (left.length) selectTourTab(left[left.length - 1].getAttribute('data-tour-idx'));
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
          timeSelectHtml(p + 'time-h', p + 'time-m', '10:00') + '</div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade de saída *</label>' +
          '<select class="gcv-dash-select" id="' + p + 'city" required>' + cityOptionsHtml() + '</select></div>' +
          '</div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Ponto de encontro *</label>' +
          '<div class="gcv-meeting-point">' +
          '<div class="gcv-meeting-point__row">' +
          '<input class="gcv-dash-input" id="' + p + 'meeting" maxlength="300" required autocomplete="off" placeholder="Digite o endereço — ex.: Padaria Santa Maria" />' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-meeting-gps-btn" id="' + p + 'meeting-gps-btn" hidden>Usar minha localização</button>' +
          '</div>' +
          '<div id="' + p + 'meeting-suggest" class="gcv-cms-suggest"></div>' +
          '<p class="gcv-cms-muted" id="' + p + 'meeting-gps">Digite o endereço do ponto de encontro.</p>' +
          '<div class="gcv-meeting-map" id="' + p + 'meeting-map" hidden><iframe class="gcv-meeting-map__frame" title="Mapa do ponto de encontro" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>' +
          '<input type="hidden" id="' + p + 'meeting-place" value="" />' +
          '<input type="hidden" id="' + p + 'meeting-lat" value="" />' +
          '<input type="hidden" id="' + p + 'meeting-lng" value="" /></div></div>' +
          '<div class="gcv-dash-field-row gcv-dash-field-row--2">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Pessoas confirmadas por fora (0 a 5)</label>' +
          '<input class="gcv-dash-input" id="' + p + 'preconfirmed" type="number" min="0" max="' + MAX_PRECONFIRMED + '" value="' + DEFAULT_PRECONFIRMED + '" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Vagas * (máximo até 12, a pé + transporte)</label>' +
          '<input class="gcv-dash-input" id="' + p + 'max" type="number" min="1" max="' + maxCap + '" value="' + DEFAULT_MAX_PEOPLE + '" /></div>' +
          '</div>' +
          '<div class="gcv-guide-net-pair">' +
          '<div class="gcv-guide-net-box">' +
          '<div class="gcv-guide-net-box__title">Individual (SEM TRANSPORTE)</div>' +
          '<div class="gcv-dash-field gcv-guide-net-box__field">' +
          '<label class="gcv-dash-label gcv-guide-net-box__label" id="' + p + 'net-label" for="' + p + 'net">Valor a receber por Pessoa (limite de R$' + netMax + ') *</label>' +
          '<input class="gcv-dash-input gcv-guide-net-box__input" id="' + p + 'net" type="number" min="' + netMin + '" max="' + netMax + '" step="1" inputmode="decimal" required /></div>' +
          '<div id="' + p + 'preview" class="gcv-guide-net-box__hint">Digite o valor a receber (mín. R$ ' + netMin + ', máx. R$ ' + netMax + ').</div>' +
          confirmedQuorumRowHtml(p, false) +
          '</div>' +
          '<div class="gcv-guide-net-box gcv-guide-net-box--transport is-disabled" id="' + p + 'transport-box">' +
          '<div class="gcv-guide-net-box__title">Individual (COM TRANSPORTE)</div>' +
          '<label class="gcv-dash-label gcv-guide-net-box__transport"><input type="checkbox" id="' + p + 'transport" /> <span id="' + p + 'transport-label">Oferecer vagas com translado</span></label>' +
          '<div id="' + p + 'transport-fields" hidden>' +
          '<div class="gcv-dash-field gcv-guide-net-box__field">' +
          '<label class="gcv-dash-label gcv-guide-net-box__label" id="' + p + 'net-t-label" for="' + p + 'net-t">Valor a receber por Pessoa (limite de R$' + netMaxTransport + ') *</label>' +
          '<input class="gcv-dash-input gcv-guide-net-box__input" id="' + p + 'net-t" type="number" min="' + netMin + '" max="' + netMaxTransport + '" step="1" inputmode="decimal" disabled /></div>' +
          '<div id="' + p + 'preview-t" class="gcv-guide-net-box__hint">Marque para informar o valor com transporte.</div>' +
          quorumOnlyRowHtml(p + 't-') +
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
        global.gcvBindMeetingPoint({
          input: document.getElementById(p + 'meeting'),
          box: document.getElementById(p + 'meeting-suggest'),
          gpsEl: document.getElementById(p + 'meeting-gps'),
          mapEl: document.getElementById(p + 'meeting-map'),
          gpsBtn: document.getElementById(p + 'meeting-gps-btn'),
          placeEl: document.getElementById(p + 'meeting-place'),
          latEl: document.getElementById(p + 'meeting-lat'),
          lngEl: document.getElementById(p + 'meeting-lng'),
          getCityId: function () {
            var cityEl = document.getElementById(p + 'city');
            return cityEl ? cityEl.value : '';
          },
          get: get,
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

        function emptyHintText() {
          return 'Digite o valor a receber (mín. R$ ' + netMin + ', máx. R$ ' + blockNetMax() + ').';
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
          if (lab) lab.textContent = 'Valor a receber por Pessoa (limite de R$' + blockNetMax() + ') *';
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
          fillIntSelect(qEl, 1, seats, qEl ? qEl.value : DEFAULT_QUORUM);
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
            box.textContent = emptyHintText();
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

        function emptyHintTextT() {
          return 'Digite o valor a receber (mín. R$ ' + netMin + ', máx. R$ ' + blockNetMaxTransport() + ').';
        }

        function refreshPreviewT(immediateServer) {
          var netEl = document.getElementById(p + 'net-t');
          var cityEl = document.getElementById(p + 'city');
          var box = document.getElementById(p + 'preview-t');
          if (!box || !netEl) return;
          if (!blockHasTransport()) {
            box.textContent = 'Marque para informar o valor com transporte.';
            return;
          }
          var raw = String(netEl.value || '').trim();
          var net = parseFloat(raw.replace(',', '.'));
          var cityId = cityEl ? (parseInt(cityEl.value, 10) || 0) : 0;
          if (raw === '' || !isFinite(net) || net < 0) {
            box.textContent = emptyHintTextT();
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
          dateEl.addEventListener('change', function () {
            var blocks = tourBlocks();
            var start = -1;
            var i;
            for (i = 0; i < blocks.length; i++) {
              if (blocks[i].getAttribute('data-tour-idx') === String(idx)) {
                start = i;
                break;
              }
            }
            if (start >= 0 && dateEl.value) {
              var cur = dateEl.value;
              for (i = start + 1; i < blocks.length; i++) {
                cur = addDaysIso(cur, 1);
                var nidx = blocks[i].getAttribute('data-tour-idx');
                var nextDate = document.getElementById('ge-' + nidx + '-date');
                if (nextDate && cur) {
                  nextDate.value = cur;
                  nextDate.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }
            refreshTourTabs();
          });
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
          maxEl.addEventListener('change', syncTransportSeatsAndQuorum);
        }
        var maxTEl = document.getElementById(p + 'max-t');
        if (maxTEl) {
          maxTEl.addEventListener('change', syncTransportSeatsAndQuorum);
        }
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
        var last = host.lastElementChild;
        selectTourTab(idx);
        refreshTourTabs();
        if (last && idx > 1 && window.matchMedia('(max-width: 768px)').matches) {
          last.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      function readTourPayload(block, n) {
        var idx = block.getAttribute('data-tour-idx');
        var p = 'ge-' + idx + '-';
        var el = function (name) { return document.getElementById(p + name); };
        var attrId = parseInt(el('attr').value, 10) || 0;
        var dateIso = (el('date').value || '').trim();
        var time = readTimeSelect(p + 'time-h', p + 'time-m');
        var cityId = parseInt(el('city').value, 10) || 0;
        var meetingPoint = (el('meeting').value || '').trim();
        var net = parseFloat(el('net').value);
        var label = 'Passeio ' + n;
        if (!attrId) return { error: label + ': selecione um atrativo da lista.' };
        if (!dateIso) return { error: label + ': informe a data.' };
        if (!time) return { error: label + ': informe o horário de saída.' };
        if (!cityId) return { error: label + ': selecione a cidade de saída.' };
        if (!meetingPoint) return { error: label + ': informe o ponto de encontro.' };
        if (!net || !isFinite(net) || net < netMin || net > netMaxForAttractionId(attrId, false)) {
          var thisMax = netMaxForAttractionId(attrId, false);
          return { error: label + ': valor a receber deve ser entre R$ ' + netMin + ' e R$ ' + thisMax + '.' };
        }
        var meetingLat = (el('meeting-lat').value || '').trim();
        var meetingLng = (el('meeting-lng').value || '').trim();
        var maxPeople = clampRange(parseFiniteInt(el('max').value, DEFAULT_MAX_PEOPLE), 1, maxCap);
        var preconfirmed = clampRange(parseFiniteInt(el('preconfirmed').value, DEFAULT_PRECONFIRMED), 0, MAX_PRECONFIRMED);
        var confirmed = isTourConfirmed(p);
        var quorum = confirmed ? 0 : clampRange(parseFiniteInt(el('quorum').value, DEFAULT_QUORUM), 1, maxQ);
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
            meeting_point_place_id: (el('meeting-place').value || '').trim() || null,
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
          var quorumT = clampRange(parseFiniteInt(tQuorumEl ? tQuorumEl.value : DEFAULT_QUORUM, DEFAULT_QUORUM), 1, maxPeopleT);
          if (quorumT > maxPeopleT) {
            return { error: label + ': quórum do transporte não pode ser maior que as vagas com transporte.' };
          }
          payload.guide_net_transport_cents = Math.round(netT * 100);
          payload.quorum_transport = quorumT;
          payload.max_people_transport = maxPeopleT;
        }
        return { payload: payload };
      }

      function sendAll(payloads, i, okCount, errors, done) {
        if (i >= payloads.length) return done(okCount, errors);
        sendJson('POST', '/api/guides/excursions.php', payloads[i], function (e, r) {
          if (r && r.ok) okCount += 1;
          else errors.push('Passeio ' + (i + 1) + ': ' + ((r && r.error) || 'erro ao enviar'));
          sendAll(payloads, i + 1, okCount, errors, done);
        });
      }

      form.classList.add('gcv-dash-form--publish');
      form.innerHTML =
        '<div class="gcv-tour-tabs-wrap">' +
        '<div class="gcv-tour-tabs" id="ge-tour-tabs" role="tablist"></div>' +
        '<button type="button" class="gcv-tour-tab gcv-tour-tab--add" id="ge-add-tour-desk" aria-label="Adicionar passeio">+</button>' +
        '</div>' +
        '<div id="ge-tours"></div>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-form__add gcv-tour-add-mobile" id="ge-add-tour">+ Adicionar passeio</button>' +
        '<div class="gcv-dash-form__footer">' +
        '<div class="gcv-dash-form__footer-actions">' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Enviar para aprovação</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary" id="ge-cancel-publish">Cancelar</button>' +
        '</div>' +
        '<div id="ge-err" class="gcv-dash-alert" hidden></div>' +
        '</div>';

      addTourBlock();
      function resetPublishForm() {
        var host = document.getElementById('ge-tours');
        if (host) host.innerHTML = '';
        nextIdx = 1;
        activeTourIdx = null;
        addTourBlock();
        var errEl = document.getElementById('ge-err');
        if (errEl) {
          errEl.hidden = true;
          errEl.textContent = '';
        }
      }
      function onAddTour() { addTourBlock(); }
      var addMobile = document.getElementById('ge-add-tour');
      var addDesk = document.getElementById('ge-add-tour-desk');
      if (addMobile) addMobile.onclick = onAddTour;
      if (addDesk) addDesk.onclick = onAddTour;
      var cancelBtn = document.getElementById('ge-cancel-publish');
      if (cancelBtn) {
        cancelBtn.onclick = function () { resetPublishForm(); };
      }
      form.setAttribute('data-ready', '1');

      form.onsubmit = function (ev) {
        ev.preventDefault();
        var errEl = document.getElementById('ge-err');
        var blocks = tourBlocks();
        var payloads = [];
        var i;
        for (i = 0; i < blocks.length; i++) {
          var parsed = readTourPayload(blocks[i], i + 1);
          if (parsed.error) {
            if (errEl) {
              errEl.hidden = false;
              errEl.className = 'gcv-dash-alert gcv-dash-alert--warning';
              errEl.textContent = parsed.error;
            }
            return;
          }
          payloads.push(parsed.payload);
        }
        var seenAttr = {};
        for (i = 0; i < payloads.length; i++) {
          var aid = String(payloads[i].attraction_id || '');
          if (aid && seenAttr[aid]) {
            if (errEl) {
              errEl.hidden = false;
              errEl.className = 'gcv-dash-alert gcv-dash-alert--warning';
              errEl.textContent = 'Não é possível repetir o mesmo passeio em mais de um dia.';
            }
            return;
          }
          if (aid) seenAttr[aid] = true;
        }
        var btn = form.querySelector('.gcv-dash-form__footer .gcv-dash-btn--primary');
        if (btn) btn.disabled = true;
        sendAll(payloads, 0, 0, [], function (okCount, errors) {
          if (btn) btn.disabled = false;
          if (!errEl) return;
          errEl.hidden = false;
          if (errors.length && !okCount) {
            errEl.className = 'gcv-dash-alert gcv-dash-alert--warning';
            errEl.textContent = errors.join(' ');
            return;
          }
          errEl.className = 'gcv-dash-alert gcv-dash-alert--info';
          var msg = okCount === 1
            ? '1 passeio enviado para aprovação.'
            : okCount + ' passeios enviados para aprovação.';
          msg += ' Só aparecem no site depois que o administrador aprovar.';
          if (errors.length) msg += ' ' + errors.join(' ');
          errEl.textContent = msg;
          if (okCount) {
            var keepClass = errEl.className;
            resetPublishForm();
            errEl.hidden = false;
            errEl.className = keepClass;
            errEl.textContent = msg;
          }
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
          '<span>' + t.people + (t.people === 1 ? ' pessoa' : ' pessoas') + '</span>' +
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

  function loadClientBookingsEnhanced() {
    var tbody = document.getElementById('client-bookings-body');
    if (!tbody) return;
    get('/api/bookings/my.php', function (err, res) {
      if (!res || !res.ok || !(res.data.bookings || []).length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">Nenhuma reserva ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.bookings.map(function (b) {
        return '<tr>' +
          '<td>' + esc(b.tour_title) + '</td>' +
          '<td>' + esc(b.departure_date) + '</td>' +
          '<td>' + b.spots + '</td>' +
          '<td>' + money(b.total_cents) + '</td>' +
          '<td>' + lifeBadge(b.lifecycle, b.lifecycle_label) + '</td>' +
          '<td>' + (b.can_cancel
            ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-cancel="' + b.id + '">' +
              (b.cancel_no_refund ? 'Cancelar*' : 'Cancelar') + '</button>'
            : '—') + '</td></tr>';
      }).join('');

      tbody.querySelectorAll('[data-cancel]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Cancelar esta reserva?')) return;
          sendJson('POST', '/api/bookings/cancel.php', {
            booking_id: parseInt(btn.getAttribute('data-cancel'), 10),
          }, function (e, r) {
            alert((r && r.data && r.data.message) || (r && r.error) || 'Erro');
            if (r && r.ok) {
              loadClientBookingsEnhanced();
              loadClientUpcoming();
            }
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
      var maxQ = d.max_quorum != null ? parseFiniteInt(d.max_quorum, MAX_QUORUM) : MAX_QUORUM;
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
        timeSelectHtml('ce-time-h', 'ce-time-m', '10:00') + '</div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Saída *</label><select class="gcv-dash-select" id="ce-city">' +
        '<option value="">Selecione…</option>' +
        cities.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor por pessoa (R$) *</label>' +
        '<input class="gcv-dash-input" type="number" min="1" step="0.01" id="ce-price" /></div>' +
        confirmedQuorumRowHtml('ce-', false) +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Vagas (máximo até 12)</label>' +
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
            : clampRange(parseFiniteInt(document.getElementById('ce-quorum').value, DEFAULT_QUORUM), 1, maxQ),
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

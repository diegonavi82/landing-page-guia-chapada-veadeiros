/* gcv-datepicker.js — calendário próprio (pt-BR) */
(function (global) {
  'use strict';

  var WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  var MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  function pad2(n) {
    return (n < 10 ? '0' : '') + String(n);
  }

  function toIso(y, m, d) {
    return y + '-' + pad2(m + 1) + '-' + pad2(d);
  }

  function parseIso(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    var y = parseInt(iso.slice(0, 4), 10);
    var m = parseInt(iso.slice(5, 7), 10) - 1;
    var d = parseInt(iso.slice(8, 10), 10);
    var dt = new Date(y, m, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
    return dt;
  }

  function formatBr(iso) {
    var dt = parseIso(iso);
    if (!dt) return '';
    return pad2(dt.getDate()) + '/' + pad2(dt.getMonth() + 1) + '/' + dt.getFullYear();
  }

  function todayIso() {
    var n = new Date();
    return toIso(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function closeAll(except) {
    document.querySelectorAll('.gcv-datepicker.is-open').forEach(function (el) {
      if (el !== except) el.classList.remove('is-open');
    });
  }

  function bindDatePicker(input, opts) {
    if (!input || input.getAttribute('data-gcv-dp') === '1') return;
    opts = opts || {};
    input.setAttribute('data-gcv-dp', '1');
    input.classList.add('gcv-datepicker__native');
    if (opts.min) input.min = opts.min;
    if (opts.max) input.max = opts.max;

    var wrap = document.createElement('div');
    wrap.className = 'gcv-datepicker';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gcv-datepicker__btn';
    btn.innerHTML =
      '<span class="gcv-datepicker__text"></span>' +
      '<svg class="gcv-datepicker__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    wrap.appendChild(btn);

    var pop = document.createElement('div');
    pop.className = 'gcv-datepicker__pop';
    pop.hidden = true;
    wrap.appendChild(pop);

    var textEl = btn.querySelector('.gcv-datepicker__text');
    var view = parseIso(input.value) || new Date();

    function minIso() { return opts.min || input.min || ''; }
    function maxIso() { return opts.max || input.max || ''; }

    function syncBtn() {
      var br = formatBr(input.value);
      textEl.textContent = br || 'dd/mm/aaaa';
      textEl.classList.toggle('is-placeholder', !br);
      btn.classList.toggle('has-value', !!br);
    }

    function isDisabled(iso) {
      var min = minIso();
      var max = maxIso();
      if (min && iso < min) return true;
      if (max && iso > max) return true;
      return false;
    }

    function setValue(iso) {
      if (isDisabled(iso)) return;
      input.value = iso;
      syncBtn();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function render() {
      var y = view.getFullYear();
      var m = view.getMonth();
      var first = new Date(y, m, 1);
      var start = first.getDay();
      var daysInMonth = new Date(y, m + 1, 0).getDate();
      var selected = input.value;
      var today = todayIso();
      var html =
        '<div class="gcv-datepicker__head">' +
        '<button type="button" class="gcv-datepicker__nav" data-nav="-1" aria-label="Mês anterior">‹</button>' +
        '<div class="gcv-datepicker__month">' + MONTHS[m] + ' ' + y + '</div>' +
        '<button type="button" class="gcv-datepicker__nav" data-nav="1" aria-label="Próximo mês">›</button>' +
        '</div>' +
        '<div class="gcv-datepicker__week">' +
        WEEK.map(function (w) { return '<span>' + w + '</span>'; }).join('') +
        '</div><div class="gcv-datepicker__grid">';
      var i;
      for (i = 0; i < start; i++) html += '<span class="gcv-datepicker__empty"></span>';
      for (i = 1; i <= daysInMonth; i++) {
        var iso = toIso(y, m, i);
        var cls = 'gcv-datepicker__day';
        if (iso === selected) cls += ' is-selected';
        if (iso === today) cls += ' is-today';
        if (isDisabled(iso)) cls += ' is-disabled';
        html += '<button type="button" class="' + cls + '" data-iso="' + iso + '"' +
          (isDisabled(iso) ? ' disabled' : '') + '>' + i + '</button>';
      }
      html += '</div>';
      pop.innerHTML = html;
      pop.querySelectorAll('[data-nav]').forEach(function (b) {
        b.onclick = function (ev) {
          ev.preventDefault();
          view = new Date(y, m + parseInt(b.getAttribute('data-nav'), 10), 1);
          render();
        };
      });
      pop.querySelectorAll('.gcv-datepicker__day:not(.is-disabled)').forEach(function (b) {
        b.onclick = function (ev) {
          ev.preventDefault();
          setValue(b.getAttribute('data-iso'));
          close();
        };
      });
    }

    function open() {
      closeAll(wrap);
      var cur = parseIso(input.value);
      view = cur ? new Date(cur.getFullYear(), cur.getMonth(), 1) : new Date();
      render();
      wrap.classList.add('is-open');
      pop.hidden = false;
    }

    function close() {
      wrap.classList.remove('is-open');
      pop.hidden = true;
    }

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (wrap.classList.contains('is-open')) close();
      else open();
    });

    input.addEventListener('change', syncBtn);
    input.addEventListener('input', syncBtn);
    syncBtn();
  }

  document.addEventListener('mousedown', function (ev) {
    document.querySelectorAll('.gcv-datepicker.is-open').forEach(function (el) {
      if (el.contains(ev.target)) return;
      el.classList.remove('is-open');
      var p = el.querySelector('.gcv-datepicker__pop');
      if (p) p.hidden = true;
    });
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    document.querySelectorAll('.gcv-datepicker.is-open').forEach(function (el) {
      el.classList.remove('is-open');
      var pop = el.querySelector('.gcv-datepicker__pop');
      if (pop) pop.hidden = true;
    });
  });

  global.gcvBindDatePicker = bindDatePicker;
  global.gcvFormatIsoBr = formatBr;
  global.gcvTodayIso = todayIso;
})(window);

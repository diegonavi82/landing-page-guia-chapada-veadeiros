/* gcv-inbox.js — Sino de notificações (guia / cliente / admin) */
(function () {
  'use strict';

  var pollTimer = null;
  var lastUnread = 0;
  var inboxItems = [];
  var openId = 0;

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

  function post(url, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(JSON.stringify(data || {}));
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function whenDate(iso) {
    if (!iso) return null;
    var d = new Date(String(iso).replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtWhen(iso) {
    var d = whenDate(iso);
    if (!d) return String(iso || '');
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtShort(iso) {
    var d = whenDate(iso);
    if (!d) return '';
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  }

  function toneOf(it) {
    var kind = String(it.kind || '').toLowerCase();
    var title = String(it.title || '').toLowerCase();
    if (kind === 'checkin' || title.indexOf('check-in') >= 0 || title.indexOf('checkin') >= 0) return 'check';
    if (kind === 'new_booking' || title.indexOf('inscri') >= 0) return 'user';
    if (kind.indexOf('pix') >= 0 || title.indexOf('pix') >= 0 || title.indexOf('pagamento') >= 0) return 'pay';
    if (kind === 'pending' || kind === 'd24h' || kind === 'dayof' || kind === 'h3' || kind === 'h2' || kind === 'm15' || title.indexOf('hora') >= 0) return 'clock';
    if (title.indexOf('cancel') >= 0) return 'x';
    if (kind === 'confirmed' || title.indexOf('confirm') >= 0) return 'check';
    return 'bell';
  }

  function iconSvg(tone) {
    var common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    if (tone === 'user') return '<svg ' + common + '><circle cx="10" cy="8" r="3"/><path d="M4.8 18.2c.7-2.4 2.5-3.7 5.2-3.7s4.5 1.3 5.2 3.7"/><path d="M17 8v5M14.5 10.5h5"/></svg>';
    if (tone === 'pay') return '<svg ' + common + '><rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17"/><path d="M7 14.5h4"/></svg>';
    if (tone === 'clock') return '<svg ' + common + '><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l2.8 1.8"/></svg>';
    if (tone === 'x') return '<svg ' + common + '><circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/></svg>';
    if (tone === 'bell') return '<svg ' + common + '><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
    return '<svg ' + common + '><circle cx="12" cy="12" r="8"/><path d="M8.4 12.2l2.3 2.3 4.9-5.2"/></svg>';
  }

  function previewOf(it) {
    var title = String(it.title || '').trim().toLowerCase();
    var lines = String(it.body || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    var line = '';
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase() !== title) { line = lines[i]; break; }
    }
    if (!line) line = lines[0] || '';
    if (line.length > 96) line = line.slice(0, 94).trim() + '…';
    return line;
  }

  function linkify(text) {
    return esc(text).replace(/https?:\/\/[^\s<]+/g, function (url) {
      var clean = url.replace(/[),.;]+$/, '');
      var tail = url.slice(clean.length);
      return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer">' + clean + '</a>' + tail;
    });
  }

  function setBadge(n) {
    lastUnread = n;
    var badge = document.getElementById('gcv-inbox-badge');
    var bell = document.getElementById('gcv-inbox-bell');
    if (!badge) return;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n > 99 ? '99+' : String(n);
      if (bell) bell.classList.add('gcv-inbox-bell--unread');
    } else {
      badge.hidden = true;
      badge.textContent = '0';
      if (bell) bell.classList.remove('gcv-inbox-bell--unread');
    }
  }

  function setAgendaBadge(n) {
    n = parseInt(n, 10) || 0;
    document.querySelectorAll('[data-section="section-guide-tours"]').forEach(function (link) {
      var old = link.querySelector('.gcv-dash-nav-badge, .gcv-dash-tab-badge');
      if (old) old.remove();
      if (n < 1) return;
      var tab = !!link.closest('.gcv-dash-bottom-nav');
      var badge = document.createElement('span');
      badge.className = tab ? 'gcv-dash-tab-badge' : 'gcv-dash-nav-badge';
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.setAttribute('aria-label', n + (n === 1 ? ' passeio para confirmar' : ' passeios para confirmar'));
      link.appendChild(badge);
    });
  }

  function applyCounts(data) {
    data = data || {};
    setBadge(parseInt(data.unread, 10) || 0);
  }

  function renderList(items) {
    var root = document.getElementById('gcv-inbox-list');
    if (!root) return;
    inboxItems = items || [];
    if (!inboxItems.length) {
      root.innerHTML = '<p class="gcv-inbox-empty">Nenhuma notificação ainda.</p>';
      return;
    }
    root.innerHTML = inboxItems.map(function (it) {
      var unread = !!it.unread;
      var tone = toneOf(it);
      return (
        '<button type="button" class="gcv-inbox-item' + (unread ? ' gcv-inbox-item--unread' : '') + ' is-' + tone + '" data-id="' + esc(it.id) + '">' +
          '<span class="gcv-inbox-item__icon">' + iconSvg(tone) + '</span>' +
          '<span class="gcv-inbox-item__main">' +
            '<strong class="gcv-inbox-item__title">' + esc(it.title) + '</strong>' +
            '<span class="gcv-inbox-item__preview">' + esc(previewOf(it)) + '</span>' +
          '</span>' +
          '<time class="gcv-inbox-item__time">' + esc(fmtShort(it.created_at)) + '</time>' +
        '</button>'
      );
    }).join('');
  }

  function findItem(id) {
    for (var i = 0; i < inboxItems.length; i++) {
      if (Number(inboxItems[i].id) === Number(id)) return inboxItems[i];
    }
    return null;
  }

  function ensureModal() {
    var modal = document.getElementById('gcv-inbox-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'gcv-inbox-modal';
    modal.className = 'gcv-inbox-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="gcv-inbox-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="gcv-inbox-modal-title">' +
        '<button type="button" class="gcv-inbox-modal__close" data-inbox-close aria-label="Fechar">×</button>' +
        '<div class="gcv-inbox-modal__icon" id="gcv-inbox-modal-icon"></div>' +
        '<h3 id="gcv-inbox-modal-title"></h3>' +
        '<time id="gcv-inbox-modal-time"></time>' +
        '<div class="gcv-inbox-modal__body" id="gcv-inbox-modal-body"></div>' +
        '<button type="button" class="gcv-inbox-modal__back" data-inbox-close>Voltar</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal || (e.target.closest && e.target.closest('[data-inbox-close]'))) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
    return modal;
  }

  function closeModal() {
    var modal = document.getElementById('gcv-inbox-modal');
    if (modal) modal.hidden = true;
    var row = document.querySelector('.gcv-inbox-item[data-id="' + openId + '"]');
    openId = 0;
    if (row && typeof row.focus === 'function') row.focus();
  }

  function openItem(id) {
    var it = findItem(id);
    if (!it) return;
    openId = id;
    var tone = toneOf(it);
    var modal = ensureModal();
    var icon = document.getElementById('gcv-inbox-modal-icon');
    icon.className = 'gcv-inbox-modal__icon is-' + tone;
    icon.innerHTML = iconSvg(tone);
    document.getElementById('gcv-inbox-modal-title').textContent = it.title || 'Aviso';
    document.getElementById('gcv-inbox-modal-time').textContent = fmtWhen(it.created_at);
    document.getElementById('gcv-inbox-modal-body').innerHTML = linkify(it.body || '');
    modal.hidden = false;
    var closer = modal.querySelector('.gcv-inbox-modal__close');
    if (closer) closer.focus();
    if (!it.unread) return;
    it.unread = false;
    var row = document.querySelector('.gcv-inbox-item[data-id="' + id + '"]');
    if (row) row.classList.remove('gcv-inbox-item--unread');
    post('/api/inbox/read.php', { id: id }, function (err, res) {
      if (res && res.ok && res.data) applyCounts(res.data);
    });
  }

  function markAllRead(cb) {
    setBadge(0);
    var list = document.getElementById('gcv-inbox-list');
    if (list) {
      list.querySelectorAll('.gcv-inbox-item--unread').forEach(function (el) {
        el.classList.remove('gcv-inbox-item--unread');
      });
    }
    post('/api/inbox/read.php', { all: true }, function (err, res) {
      if (res && res.ok && res.data) setBadge(parseInt(res.data.unread, 10) || 0);
      if (typeof cb === 'function') cb();
    });
  }

  function loadList() {
    get('/api/inbox/list.php?limit=80', function (err, res) {
      var root = document.getElementById('gcv-inbox-list');
      if (err || !res || !res.ok) {
        if (root) {
          root.innerHTML = '<p class="gcv-dash-alert gcv-dash-alert--warning">' +
            esc((res && res.error) || 'Não foi possível carregar as notificações.') + '</p>';
        }
        return;
      }
      var data = res.data || {};
      applyCounts(data);
      renderList(data.items || []);
    });
  }

  function refreshBadge() {
    get('/api/inbox/list.php?limit=1', function (err, res) {
      if (err || !res || !res.ok) return;
      applyCounts(res.data || {});
    });
  }

  function openPage() {
    if (window.GcvDashboard && typeof window.GcvDashboard.showSection === 'function') {
      window.GcvDashboard.showSection('section-inbox');
    } else {
      document.querySelectorAll('.gcv-dash-section').forEach(function (s) { s.classList.remove('active'); });
      var s = document.getElementById('section-inbox');
      if (s) s.classList.add('active');
    }
    loadList();
  }

  function bind() {
    var bell = document.getElementById('gcv-inbox-bell');
    if (bell && !bell._gcvBound) {
      bell._gcvBound = true;
      bell.addEventListener('click', function (e) {
        e.preventDefault();
        openPage();
      });
    }
    var list = document.getElementById('gcv-inbox-list');
    if (list && !list._gcvBound) {
      list._gcvBound = true;
      list.addEventListener('click', function (e) {
        var item = e.target.closest('.gcv-inbox-item');
        if (!item) return;
        var id = parseInt(item.getAttribute('data-id'), 10) || 0;
        if (!id) return;
        openItem(id);
      });
    }
  }

  function start() {
    bind();
    refreshBadge();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refreshBadge, 45000);
  }

  function ackAgenda() {
    post('/api/inbox/read.php', { kind: 'new_booking' }, function (err, res) {
      if (res && res.ok && res.data) applyCounts(res.data);
      else refreshBadge();
    });
  }

  window.GcvInbox = {
    start: start,
    open: openPage,
    refresh: refreshBadge,
    load: loadList,
    ackAgenda: ackAgenda,
    setAgendaBadge: setAgendaBadge
  };
})();

/* gcv-inbox.js — Sino de notificações (guia / cliente / admin) */
(function () {
  'use strict';

  var pollTimer = null;
  var lastUnread = 0;

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

  function fmtWhen(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(iso);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
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

  function renderList(items) {
    var root = document.getElementById('gcv-inbox-list');
    if (!root) return;
    if (!items || !items.length) {
      root.innerHTML = '<p class="gcv-dash-hint" style="color:#64748b;">Nenhuma notificação ainda.</p>';
      return;
    }
    root.innerHTML = items.map(function (it) {
      var unread = !!it.unread;
      return (
        '<article class="gcv-inbox-item' + (unread ? ' gcv-inbox-item--unread' : '') + '" data-id="' + esc(it.id) + '">' +
          '<div class="gcv-inbox-item__head">' +
            '<strong>' + esc(it.title) + '</strong>' +
            '<time>' + esc(fmtWhen(it.created_at)) + '</time>' +
          '</div>' +
          '<pre class="gcv-inbox-item__body">' + esc(it.body) + '</pre>' +
        '</article>'
      );
    }).join('');
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
      setBadge(parseInt(data.unread, 10) || 0);
      renderList(data.items || []);
    });
  }

  function refreshBadge() {
    get('/api/inbox/list.php?limit=1', function (err, res) {
      if (err || !res || !res.ok) return;
      setBadge(parseInt((res.data || {}).unread, 10) || 0);
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
    var mark = document.getElementById('gcv-inbox-mark-all');
    if (mark && !mark._gcvBound) {
      mark._gcvBound = true;
      mark.addEventListener('click', function () {
        post('/api/inbox/read.php', { all: true }, function () { loadList(); });
      });
    }
    var list = document.getElementById('gcv-inbox-list');
    if (list && !list._gcvBound) {
      list._gcvBound = true;
      list.addEventListener('click', function (e) {
        var item = e.target.closest('.gcv-inbox-item');
        if (!item) return;
        var id = parseInt(item.getAttribute('data-id'), 10) || 0;
        if (!id || !item.classList.contains('gcv-inbox-item--unread')) return;
        post('/api/inbox/read.php', { id: id }, function (err, res) {
          item.classList.remove('gcv-inbox-item--unread');
          if (res && res.ok && res.data) setBadge(parseInt(res.data.unread, 10) || 0);
        });
      });
    }
  }

  function start() {
    bind();
    refreshBadge();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refreshBadge, 45000);
  }

  window.GcvInbox = {
    start: start,
    open: openPage,
    refresh: refreshBadge,
    load: loadList
  };
})();

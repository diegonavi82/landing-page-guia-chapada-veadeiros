/* gcv-dashboard.js — Painel Admin/Guia/Cliente | Guia Chapada Veadeiros */
(function () {
  'use strict';

  var currentUser = null;

  function get(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
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
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(JSON.stringify(data));
  }

  function put(url, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(JSON.stringify(data));
  }

  function showSection(id) {
    document.querySelectorAll('.gcv-dash-section').forEach(function (s) { s.classList.remove('active'); });
    var s = document.getElementById(id);
    if (s) s.classList.add('active');
    document.querySelectorAll('.gcv-dash-nav a').forEach(function (a) { a.classList.remove('active'); });
    var link = document.querySelector('.gcv-dash-nav a[data-section="' + id + '"]');
    if (link) link.classList.add('active');
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function fmtMoney(cents) {
    return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
  }

  function statusBadge(status) {
    return '<span class="gcv-badge gcv-badge--' + status + '">' + status + '</span>';
  }

  /* ===== ADMIN ===== */

  function loadPendingGuides() {
    var list = document.getElementById('pending-guides-list');
    if (!list) return;
    list.innerHTML = 'Carregando...';
    get('/api/admin/pending-guides.php', function (err, res) {
      if (!res.ok || !res.data.guides.length) {
        list.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum guia pendente.</div>';
        return;
      }
      list.innerHTML = '';
      res.data.guides.forEach(function (guide) {
        var card = el('div', 'gcv-dash-pending-card');
        card.innerHTML = '<div class="gcv-dash-pending-card__info">'
          + '<div class="gcv-dash-pending-card__name">' + guide.name + '</div>'
          + '<div class="gcv-dash-pending-card__meta">' + guide.email + (guide.cadastur ? ' · Cadastur: ' + guide.cadastur : '') + '</div>'
          + '</div>'
          + '<div class="gcv-dash-pending-card__actions">'
          + '<button class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-approve-guide="' + guide.id + '">Aprovar</button>'
          + '<button class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-reject-guide="' + guide.id + '">Rejeitar</button>'
          + '</div>';
        card.querySelector('[data-approve-guide]').addEventListener('click', function () {
          post('/api/admin/approve-guide.php', { user_id: guide.id }, function (e, r) {
            if (r.ok) loadPendingGuides();
            else alert(r.error || 'Erro');
          });
        });
        card.querySelector('[data-reject-guide]').addEventListener('click', function () {
          var reason = prompt('Motivo da rejeição (opcional):') || '';
          post('/api/admin/reject-guide.php', { user_id: guide.id, reason: reason }, function (e, r) {
            if (r.ok) loadPendingGuides();
            else alert(r.error || 'Erro');
          });
        });
        list.appendChild(card);
      });
    });
  }

  function loadPendingTours() {
    var list = document.getElementById('pending-tours-list');
    if (!list) return;
    list.innerHTML = 'Carregando...';
    get('/api/admin/pending-tours.php', function (err, res) {
      if (!res.ok || !res.data.tours.length) {
        list.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum passeio pendente.</div>';
        return;
      }
      list.innerHTML = '';
      res.data.tours.forEach(function (tour) {
        var card = el('div', 'gcv-dash-pending-card');
        card.innerHTML = '<div class="gcv-dash-pending-card__info">'
          + '<div class="gcv-dash-pending-card__name">' + tour.title_pt + '</div>'
          + '<div class="gcv-dash-pending-card__meta">Guia: ' + tour.guide_name + ' · Data: ' + tour.departure_date + ' · R$ ' + (tour.price_cents/100).toFixed(2) + '</div>'
          + '</div>'
          + '<div class="gcv-dash-pending-card__actions">'
          + '<button class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-approve-tour="' + tour.id + '">Aprovar</button>'
          + '<button class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-reject-tour="' + tour.id + '">Rejeitar</button>'
          + '</div>';
        card.querySelector('[data-approve-tour]').addEventListener('click', function () {
          post('/api/admin/approve-tour.php', { tour_id: tour.id }, function (e, r) {
            if (r.ok) loadPendingTours();
            else alert(r.error || 'Erro');
          });
        });
        card.querySelector('[data-reject-tour]').addEventListener('click', function () {
          var reason = prompt('Motivo da rejeição:') || '';
          post('/api/admin/reject-tour.php', { tour_id: tour.id, reason: reason }, function (e, r) {
            if (r.ok) loadPendingTours();
            else alert(r.error || 'Erro');
          });
        });
        list.appendChild(card);
      });
    });
  }

  function loadAdminBookings() {
    var tbody = document.getElementById('admin-bookings-body');
    if (!tbody) return;
    get('/api/admin/bookings.php', function (err, res) {
      if (!res.ok) return;
      tbody.innerHTML = res.data.bookings.map(function (b) {
        return '<tr>'
          + '<td>#' + b.id + '</td>'
          + '<td>' + b.tour_title + '</td>'
          + '<td>' + b.client_name + '</td>'
          + '<td>' + b.guide_name + '</td>'
          + '<td>' + b.spots + '</td>'
          + '<td>' + fmtMoney(b.total_cents) + '</td>'
          + '<td>' + statusBadge(b.status) + '</td>'
          + '<td>' + (b.created_at || '').substr(0,10) + '</td>'
          + '</tr>';
      }).join('');
    });
  }

  function loadSettings() {
    var form = document.getElementById('admin-settings-form');
    if (!form) return;
    get('/api/admin/settings.php', function (err, res) {
      if (!res.ok) return;
      form.innerHTML = '';
      res.data.settings.forEach(function (s) {
        var row = el('div', 'gcv-dash-settings-row');
        row.innerHTML = '<div class="gcv-dash-settings-label"><strong>' + s.label + '</strong></div>'
          + '<div style="display:flex;gap:8px;align-items:center;">'
          + '<input class="gcv-dash-settings-input" type="' + (s.type === 'text' ? 'text' : 'number') + '" value="' + s.value + '" data-key="' + s.key_name + '" />'
          + '<button class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--primary" data-save-key="' + s.key_name + '">Salvar</button>'
          + '</div>';
        row.querySelector('[data-save-key]').addEventListener('click', function () {
          var input = row.querySelector('.gcv-dash-settings-input');
          put('/api/admin/settings.php', { key_name: s.key_name, value: input.value }, function (e, r) {
            alert(r.ok ? 'Salvo!' : (r.error || 'Erro'));
          });
        });
        form.appendChild(row);
      });
    });
  }

  function loadFinancial() {
    var content = document.getElementById('admin-financial-content');
    if (!content) return;
    var month = new Date().toISOString().substr(0, 7);
    get('/api/admin/financial.php?month=' + month, function (err, res) {
      if (!res.ok) return;
      var s = res.data.summary;
      content.innerHTML = '<div class="gcv-dash-stats">'
        + '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Reservas pagas</div><div class="gcv-dash-stat__value">' + (s.paid_bookings||0) + '</div></div>'
        + '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Receita bruta</div><div class="gcv-dash-stat__value">' + fmtMoney(s.gross_cents||0) + '</div></div>'
        + '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Comissão plataforma</div><div class="gcv-dash-stat__value">' + fmtMoney(s.commission_cents||0) + '</div></div>'
        + '</div>';
    });
  }

  function loadGuidesList() {
    var select = document.getElementById('tour-guide');
    if (!select) return;
    get('/api/guides/list.php', function (err, res) {
      if (!res.ok) return;
      select.innerHTML = res.data.guides.map(function (g) {
        return '<option value="' + g.id + '">' + g.name + '</option>';
      }).join('');
    });
  }

  function initCreateTourForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errEl = form.querySelector('[id$="create-tour-error"]');
      if (errEl) errEl.hidden = true;

      var data = {
        title_pt:      form.querySelector('[name=title_pt]').value,
        title_en:      form.querySelector('[name=title_en]') ? form.querySelector('[name=title_en]').value : form.querySelector('[name=title_pt]').value,
        title_es:      form.querySelector('[name=title_es]') ? form.querySelector('[name=title_es]').value : form.querySelector('[name=title_pt]').value,
        description_pt: form.querySelector('[name=description_pt]') ? form.querySelector('[name=description_pt]').value : '',
        departure_date: form.querySelector('[name=departure_date]').value,
        departure_time: form.querySelector('[name=departure_time]').value,
        region:        form.querySelector('[name=region]').value,
        difficulty:    form.querySelector('[name=difficulty]').value,
        max_spots:     parseInt(form.querySelector('[name=max_spots]').value, 10),
        price:         parseFloat(form.querySelector('[name=price]').value),
        meeting_point: form.querySelector('[name=meeting_point]') ? form.querySelector('[name=meeting_point]').value : '',
        cover_url:     form.querySelector('[name=cover_url]') ? form.querySelector('[name=cover_url]').value : '',
      };
      var guideSelect = form.querySelector('[name=guide_id]');
      if (guideSelect && guideSelect.value) data.guide_id = parseInt(guideSelect.value, 10);

      post('/api/tours/create.php', data, function (err, res) {
        if (!res.ok) {
          if (errEl) { errEl.textContent = res.error || 'Erro ao criar passeio'; errEl.hidden = false; }
          return;
        }
        alert('Passeio criado com sucesso!');
        form.reset();
      });
    });
  }

  /* ===== GUIDE ===== */

  function loadGuideTours() {
    var list = document.getElementById('guide-tours-list');
    if (!list) return;
    list.innerHTML = 'Carregando...';
    get('/api/tours/list.php?lang=pt&limit=50', function (err, res) {
      if (!res.ok || !res.data.tours.length) {
        list.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum passeio criado ainda.</div>';
        return;
      }
      var myTours = res.data.tours.filter(function (t) { return String(t.guide_id) === String(currentUser.id); });
      if (!myTours.length) {
        list.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum passeio seu encontrado.</div>';
        return;
      }
      list.innerHTML = '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr><th>Título</th><th>Data</th><th>Vagas</th><th>Status</th></tr></thead><tbody>'
        + myTours.map(function (t) {
          return '<tr><td>' + t.title + '</td><td>' + t.departure_date + '</td><td>' + t.spots_left + '/' + t.max_spots + '</td><td>' + statusBadge(t.status||'approved') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    });
  }

  function loadGuidePayments() {
    var content = document.getElementById('guide-payments-content');
    if (!content) return;
    get('/api/guides/profile.php', function (err, res) {
      if (!res.ok) return;
      var g = res.data;
      if (g.mp_access_token) {
        content.innerHTML = '<div class="gcv-mp-connect">'
          + '<div class="gcv-mp-connected"><span>✅</span> Mercado Pago conectado</div>'
          + (g.mp_connected_at ? '<p style="font-size:0.8125rem;color:#666;margin-top:8px;">Conectado em: ' + g.mp_connected_at.substr(0,10) + '</p>' : '')
          + '</div>';
      } else {
        content.innerHTML = '<div class="gcv-mp-connect">'
          + '<div class="gcv-mp-connect__icon">💳</div>'
          + '<h3 class="gcv-mp-connect__title">Conecte o Mercado Pago</h3>'
          + '<p class="gcv-mp-connect__desc">Para publicar passeios e receber pagamentos, conecte sua conta do Mercado Pago.</p>'
          + '<a href="/api/guides/mp-connect-redirect.php" class="gcv-dash-btn gcv-dash-btn--primary">Conectar Mercado Pago</a>'
          + '</div>';
      }
    });
  }

  /* ===== CLIENT ===== */

  function loadClientBookings() {
    var tbody = document.getElementById('client-bookings-body');
    if (!tbody) return;
    get('/api/bookings/my.php', function (err, res) {
      if (!res.ok || !res.data.bookings.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">Nenhuma reserva ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.bookings.map(function (b) {
        return '<tr>'
          + '<td>' + b.tour_title + '</td>'
          + '<td>' + b.departure_date + '</td>'
          + '<td>' + b.spots + '</td>'
          + '<td>' + fmtMoney(b.total_cents) + '</td>'
          + '<td>' + statusBadge(b.status) + '</td>'
          + '<td>' + (b.status === 'paid' || b.status === 'pending' ? '<button class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-cancel="' + b.id + '">Cancelar</button>' : '') + '</td>'
          + '</tr>';
      }).join('');

      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cancel]');
        if (!btn) return;
        if (!confirm('Cancelar esta reserva?')) return;
        post('/api/bookings/cancel.php', { booking_id: parseInt(btn.getAttribute('data-cancel'), 10) }, function (e, r) {
          alert(r.ok ? 'Reserva cancelada.' : (r.error || 'Erro'));
          if (r.ok) loadClientBookings();
        });
      });
    });
  }

  /* ===== SETUP NAV BY ROLE ===== */

  function buildNav(role, status) {
    var navList = document.getElementById('gcv-dash-nav-list');
    if (!navList) return;
    var items = [];

    if (role === 'admin') {
      items = [
        { id: 'section-pending-guides',    icon: '👤', label: 'Guias pendentes',   load: loadPendingGuides  },
        { id: 'section-pending-tours',     icon: '🗺️', label: 'Passeios pendentes',load: loadPendingTours   },
        { id: 'section-admin-create-tour', icon: '➕', label: 'Criar passeio',     load: function () { loadGuidesList(); initCreateTourForm('gcv-create-tour-form'); document.getElementById('admin-guide-field').hidden = false; } },
        { id: 'section-admin-bookings',    icon: '📋', label: 'Todas as reservas', load: loadAdminBookings  },
        { id: 'section-admin-settings',    icon: '⚙️', label: 'Configurações',     load: loadSettings       },
        { id: 'section-admin-financial',   icon: '💰', label: 'Financeiro',        load: loadFinancial      },
      ];
    } else if (role === 'guide' && status === 'active') {
      items = [
        { id: 'section-guide-tours',        icon: '🗺️', label: 'Meus passeios',  load: loadGuideTours     },
        { id: 'section-guide-create-tour',  icon: '➕', label: 'Criar passeio',  load: function () { initCreateTourForm('gcv-guide-create-tour-form'); } },
        { id: 'section-guide-bookings',     icon: '📋', label: 'Minhas reservas', load: function () {} },
        { id: 'section-guide-payments',     icon: '💳', label: 'Recebimentos',   load: loadGuidePayments  },
      ];
    } else if (role === 'guide' && status === 'pending') {
      items = [{ id: 'section-guide-pending', icon: '⏳', label: 'Status', load: function () {} }];
    } else if (role === 'client') {
      items = [
        { id: 'section-client-tours',    icon: '🌿', label: 'Próximas excursões', load: function () {} },
        { id: 'section-client-bookings', icon: '📋', label: 'Minhas reservas',    load: loadClientBookings },
      ];
    }

    navList.innerHTML = items.map(function (item) {
      return '<li><a href="#" data-section="' + item.id + '">' + item.icon + ' ' + item.label + '</a></li>';
    }).join('');

    var loadMap = {};
    items.forEach(function (item) { loadMap[item.id] = item.load; });

    navList.addEventListener('click', function (e) {
      var link = e.target.closest('[data-section]');
      if (!link) return;
      e.preventDefault();
      var sId = link.getAttribute('data-section');
      showSection(sId);
      if (loadMap[sId]) loadMap[sId]();
    });

    // Show first section
    if (items.length) {
      showSection(items[0].id);
      if (loadMap[items[0].id]) loadMap[items[0].id]();
    }
  }

  /* ===== INIT ===== */

  function init() {
    var loading = document.getElementById('gcv-dash-loading');
    var app     = document.getElementById('gcv-dash-app');

    get('/api/auth/me.php', function (err, res) {
      console.log('[dashboard] me.php:', err, JSON.stringify(res));
      if (err || !res || !res.ok) {
        window.location.href = '/login.html?redirect=/dashboard/';
        return;
      }
      currentUser = res.data;

      if (loading) loading.hidden = true;
      if (app) app.hidden = false;

      // Fill sidebar
      var nameEl   = document.getElementById('dash-name');
      var roleEl   = document.getElementById('dash-role');
      var avatarEl = document.getElementById('dash-avatar');
      var roleMap  = { admin: 'Administrador', guide: 'Guia', client: 'Cliente' };

      if (nameEl)   nameEl.textContent   = currentUser.name || '';
      if (roleEl)   roleEl.textContent   = roleMap[currentUser.role] || currentUser.role;
      if (avatarEl) {
        if (currentUser.avatar_url) {
          avatarEl.innerHTML = '<img src="' + currentUser.avatar_url + '" alt="Avatar" />';
        } else {
          avatarEl.textContent = (currentUser.name || '?').charAt(0).toUpperCase();
        }
      }

      buildNav(currentUser.role, currentUser.status);

      // Logout
      var logoutBtn = document.getElementById('gcv-dash-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/auth/logout.php');
          xhr.onload = function () { window.location.href = '/index.html'; };
          xhr.send();
        });
      }

      // Mobile menu toggle
      var toggle  = document.getElementById('gcv-dash-menu-toggle');
      var navArea = document.getElementById('gcv-dash-nav');
      if (toggle && navArea) {
        toggle.addEventListener('click', function () {
          navArea.classList.toggle('open');
        });
      }

      // Check MP connected notification
      var params = new URLSearchParams(window.location.search);
      if (params.get('mp_connected')) {
        alert('Mercado Pago conectado com sucesso!');
        window.history.replaceState({}, '', '/dashboard/');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

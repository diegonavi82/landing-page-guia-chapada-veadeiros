/* gcv-dashboard.js — Painel Admin/Guia/Cliente | Guia Chapada Veadeiros */
(function () {
  'use strict';

  var currentUser = null;
  var dashLoadMap = {};
  var dashHashLock = false;

  var SECTION_HASH = {
    'section-cms-articles': 'revista',
    'section-cms-attractions': 'atrativos',
    'section-cms-guides': 'guias',
    'section-admin-broadcast': 'broadcast',
    'section-admin-messages': 'mensagens',
    'section-cms-cities': 'cidades',
    'section-cms-excursions': 'excursoes',
    'section-admin-payouts': 'pagamentos',
    'section-admin-create-tour': 'criar-passeio',
    'section-admin-bookings': 'reservas',
    'section-admin-settings': 'configuracoes',
    'section-admin-financial': 'financeiro',
    'section-guide-profile': 'perfil',
    'section-guide-create-tour': 'publicar',
    'section-guide-tours': 'agenda',
    'section-guide-financial': 'financeiro',
    'section-client-tours': 'passeios',
    'section-client-bookings': 'reservas',
    'section-client-publish': 'propor',
    'section-client-profile': 'perfil',
    'section-inbox': 'notificacoes'
  };

  function hashForSection(id) {
    return SECTION_HASH[id] || String(id || '').replace(/^section-/, '');
  }

  function sectionForHash(hash) {
    hash = String(hash || '').replace(/^#/, '').split('?')[0].split('&')[0];
    if (!hash || hash.indexOf('checkin') === 0) return '';
    if (hash === 'criar-passeio') {
      try { sessionStorage.setItem('gcv_open_create_tour', '1'); } catch (err) {}
      return 'section-cms-excursions';
    }
    if (hash === 'pagar-guias') return 'section-admin-payouts';
    if (dashLoadMap[hash]) return hash;
    var found = '';
    Object.keys(SECTION_HASH).forEach(function (id) {
      if (SECTION_HASH[id] === hash && dashLoadMap[id]) found = id;
    });
    return found;
  }

  function syncSectionHash(id) {
    if (!id || dashHashLock) return;
    var slug = hashForSection(id);
    if (!slug) return;
    var next = '#' + slug;
    if ((location.hash || '') === next) return;
    try {
      history.replaceState(null, '', location.pathname + location.search + next);
    } catch (err) {
      location.hash = slug;
    }
    try {
      sessionStorage.setItem('gcv_dash_section', id);
    } catch (err2) {}
  }

  var SECTION_ALIAS = {
    'section-admin-messages': 'section-admin-broadcast'
  };

  function displaySectionId(id) {
    return SECTION_ALIAS[id] || id;
  }

  function showSection(id, skipHash) {
    if (id === 'section-pending-guides') id = 'section-cms-guides';
    document.querySelectorAll('.gcv-dash-section').forEach(function (s) { s.classList.remove('active'); });
    var s = document.getElementById(displaySectionId(id));
    if (s) s.classList.add('active');
    document.querySelectorAll('.gcv-dash-nav a, .gcv-dash-bottom-nav a').forEach(function (a) { a.classList.remove('active'); });
    document.querySelectorAll('[data-section="' + id + '"]').forEach(function (link) {
      link.classList.add('active');
    });
    closeMobileNav();
    if (!skipHash) syncSectionHash(id);
  }

  function goToSection(id, skipHash) {
    showSection(id, skipHash);
    if (dashLoadMap[id]) dashLoadMap[id]();
  }

  function requestSection(id, skipHash) {
    if (id === 'section-pending-guides') id = 'section-cms-guides';
    var current = document.querySelector('.gcv-dash-section.active');
    var from = current && current.id;
    var cms = window.GcvAdminCms;
    if (from === 'section-cms-excursions' && id !== from && cms && typeof cms.guardLeave === 'function') {
      var allowed = cms.guardLeave(function () { goToSection(id, skipHash); });
      if (!allowed) {
        if (!skipHash) syncSectionHash(from);
        return;
      }
    }
    goToSection(id, skipHash);
  }

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

  function closeMobileNav() {
    var navArea = document.getElementById('gcv-dash-nav');
    var toggle = document.getElementById('gcv-dash-menu-toggle');
    if (navArea) navArea.classList.remove('open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰ Menu';
    }
  }

  function labelDashTables(root) {
    (root || document).querySelectorAll('.gcv-dash-table').forEach(function (table) {
      var headers = [];
      table.querySelectorAll('thead th').forEach(function (th) {
        headers.push((th.textContent || '').trim());
      });
      if (!headers.length) return;
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) {
          if (!td.hasAttribute('data-label')) td.setAttribute('data-label', headers[i] || '');
        });
      });
    });
  }

  /** Toast estilizado do dashboard (substitui alert nativo). */
  function showDashToast(opts) {
    var options = opts || {};
    var type = options.type || 'success';
    var title = options.title || (type === 'error' ? 'Algo deu errado' : 'Pronto');
    var message = options.message || '';
    var ms = typeof options.duration === 'number' ? options.duration : 4200;
    var host = document.getElementById('gcv-dash-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'gcv-dash-toast-host';
      host.className = 'gcv-dash-toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var icons = { success: '✓', error: '!', info: 'i', warning: '!' };
    var el = document.createElement('div');
    el.className = 'gcv-dash-toast gcv-dash-toast--' + type;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="gcv-dash-toast__icon" aria-hidden="true">' + (icons[type] || '✓') + '</span>' +
      '<div class="gcv-dash-toast__body">' +
      '<p class="gcv-dash-toast__title"></p>' +
      (message ? '<p class="gcv-dash-toast__msg"></p>' : '') +
      '</div>' +
      '<button type="button" class="gcv-dash-toast__close" aria-label="Fechar">×</button>';
    el.querySelector('.gcv-dash-toast__title').textContent = title;
    var msgEl = el.querySelector('.gcv-dash-toast__msg');
    if (msgEl) msgEl.textContent = message;
    function dismiss() {
      el.classList.remove('is-visible');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }
    el.querySelector('.gcv-dash-toast__close').addEventListener('click', dismiss);
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    if (ms > 0) setTimeout(dismiss, ms);
    return el;
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function fmtMoney(cents) {
    if (cents == null || cents === '') return '—';
    return 'R$ ' + (Number(cents) / 100).toFixed(2).replace('.', ',');
  }

  function statusBadge(status) {
    return '<span class="gcv-badge gcv-badge--' + status + '">' + status + '</span>';
  }

  /* ===== ADMIN ===== */

  function loadAdminGuides() {
    var list = document.getElementById('admin-guides-list');
    if (!list) return;
    list.innerHTML = '<p>Carregando…</p>';
    get('/api/admin/guides.php', function (err, res) {
      if (err || !res || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar guias.</p>';
        return;
      }
      var guides = (res.data && res.data.guides) || [];
      if (!guides.length) {
        list.innerHTML = '<p>Nenhum guia cadastrado.</p>';
        return;
      }
      list.innerHTML = guides.map(function (g) {
        var ready = g.pix_ready
          ? '<span class="gcv-badge gcv-badge--active">PIX OK</span>'
          : '<span class="gcv-badge gcv-badge--pending">PIX pendente</span>';
        var pixVal = g.pix_key || '';
        return (
          '<article class="gcv-dash-card" data-guide-user="' + g.user_id + '" style="margin-bottom:1rem;padding:1rem;border:1px solid #e2e8f0;border-radius:10px;">' +
          '<div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;align-items:center;">' +
          '<div><strong>' + escapeHtml(g.name) + '</strong> ' + statusBadge(g.status) + ' ' + ready +
          '<div style="font-size:0.85rem;color:#64748b;">' + escapeHtml(g.email) + '</div></div></div>' +
          '<div class="gcv-dash-field-row" style="margin-top:0.75rem;">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX</label>' +
          '<input class="gcv-dash-input" data-pix-key type="text" value="' + escapeAttr(pixVal) + '" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone</label>' +
          '<input class="gcv-dash-input" data-phone type="text" value="' + escapeAttr(g.phone || '') + '" /></div>' +
          '</div>' +
          '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;">' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--primary" data-save-guide>Salvar PIX</button>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-verify-pix' + (pixVal && g.status === 'active' ? '' : ' disabled') + '>Verificar PIX</button>' +
          '</div></article>'
        );
      }).join('');

      list.querySelectorAll('[data-save-guide]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('[data-guide-user]');
          var uid = parseInt(card.getAttribute('data-guide-user'), 10);
          put('/api/admin/guides.php', {
            user_id: uid,
            pix_key: card.querySelector('[data-pix-key]').value,
            phone: card.querySelector('[data-phone]').value,
          }, function (e2, r2) {
            alert(r2 && r2.ok ? 'Salvo. Agora clique em Verificar PIX.' : ((r2 && r2.error) || 'Erro'));
            if (r2 && r2.ok) loadAdminGuides();
          });
        });
      });
      list.querySelectorAll('[data-verify-pix]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          gcvConfirm('Confirmar que esta chave PIX pertence ao guia? Só após isso será possível pagar.').then(function (ok) {
            if (!ok) return;
          var card = btn.closest('[data-guide-user]');
          var uid = parseInt(card.getAttribute('data-guide-user'), 10);
          put('/api/admin/guides.php', {
            user_id: uid,
            pix_key: card.querySelector('[data-pix-key]').value,
            verify_pix: true,
          }, function (e2, r2) {
            alert(r2 && r2.ok ? 'PIX verificado.' : ((r2 && r2.error) || 'Erro'));
            if (r2 && r2.ok) loadAdminGuides();
          });
          });
        });
      });
    });
  }

  function loadAdminPayouts() {
    var select = document.getElementById('payout-guide');
    var hist = document.getElementById('admin-payouts-list');
    var draftBox = document.getElementById('admin-payout-draft');
    var preview = document.getElementById('payout-guide-preview');
    var form = document.getElementById('admin-payout-form');
    if (hist) hist.innerHTML = '<p>Carregando…</p>';

    function findGuide(list, id) {
      var i;
      for (i = 0; i < list.length; i++) {
        if (Number(list[i].user_id) === Number(id)) return list[i];
      }
      return null;
    }

    function renderPreview(guide) {
      if (!preview) return;
      if (!guide) {
        preview.hidden = true;
        preview.innerHTML = '';
        return;
      }
      preview.hidden = false;
      preview.innerHTML =
        '<p class="gcv-payout-preview__row"><strong>' + escapeHtml(guide.name || '') + '</strong></p>' +
        '<p class="gcv-payout-preview__row">PIX: <code>' + escapeHtml(guide.pix_key || '') + '</code></p>';
    }

    function showDraftBox(d) {
      if (!draftBox) return;
      draftBox.hidden = false;
      draftBox.innerHTML =
        '<p><strong>Confirmação do PIX #' + d.payout_id + '</strong></p>' +
        '<p>Guia: ' + escapeHtml(d.guide_name || '') + '<br>PIX: <code>' + escapeHtml(d.pix_key || '') +
        '</code><br>Valor: <strong>' + fmtMoney(d.amount_cents || 0) + '</strong></p>' +
        '<p style="font-size:0.85rem;color:#92400e;">Digite <strong>PAGAR</strong> para enviar o PIX via Sicoob.</p>' +
        '<input class="gcv-dash-input" id="payout-confirm-text" type="text" placeholder="PAGAR" autocomplete="off" style="max-width:160px;margin-bottom:0.5rem;" />' +
        '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="payout-confirm-btn">Confirmar e enviar PIX</button>' +
        '<button type="button" class="gcv-dash-btn" id="payout-cancel-btn">Cancelar</button></div>';
      var confirmBtn = document.getElementById('payout-confirm-btn');
      var cancelBtn = document.getElementById('payout-cancel-btn');
      if (confirmBtn) {
        confirmBtn.onclick = function () {
          var txtEl = document.getElementById('payout-confirm-text');
          var txt = txtEl ? txtEl.value : '';
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Enviando PIX…';
          post('/api/admin/guide-payouts.php', {
            action: 'confirm',
            payout_id: d.payout_id,
            confirm_text: txt,
          }, function (e3, r3) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar e enviar PIX';
            if (r3 && r3.ok) {
              showDashToast({ type: 'success', title: 'PIX enviado', message: (r3.data && r3.data.message) || '' });
              draftBox.hidden = true;
              if (form) form.reset();
              renderPreview(null);
            } else {
              var err = (r3 && r3.error) || 'Falha ao enviar PIX';
              if (window.gcvAlert) window.gcvAlert(err);
              else alert(err);
            }
            loadAdminPayouts();
          });
        };
      }
      if (cancelBtn) {
        cancelBtn.onclick = function () {
          post('/api/admin/guide-payouts.php', { action: 'cancel', payout_id: d.payout_id }, function () {
            draftBox.hidden = true;
            loadAdminPayouts();
          });
        };
      }
    }

    get('/api/admin/guide-payouts.php', function (err, res) {
      if (err || !res || !res.ok) {
        if (hist) hist.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar pagamentos.</p>';
        return;
      }
      var eligible = (res.data && res.data.eligible_guides) || [];
      var history = (res.data && res.data.history) || [];
      var payouts = (res.data && res.data.payouts) || [];
      if (select) {
        var prev = select.value;
        if (!eligible.length) {
          select.innerHTML = '<option value="">Nenhum guia com PIX verificado</option>';
        } else {
          select.innerHTML = '<option value="">Selecione…</option>' + eligible.map(function (g) {
            return '<option value="' + g.user_id + '">' + escapeHtml(g.name) + ' — ' + escapeHtml(g.pix_key) + '</option>';
          }).join('');
          if (prev && findGuide(eligible, prev)) select.value = prev;
        }
        select._gcvEligible = eligible;
        renderPreview(findGuide(eligible, select.value));
        if (!select._gcvBound) {
          select._gcvBound = true;
          select.addEventListener('change', function () {
            renderPreview(findGuide(select._gcvEligible || [], select.value));
          });
        }
      }
      if (hist) {
        if (!history.length) {
          hist.innerHTML = '<p>Nenhum pagamento ainda.</p>';
        } else {
          hist.innerHTML =
            '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr>' +
            '<th>Origem</th><th>Guia</th><th>Valor</th><th>PIX</th><th>Status</th><th>Quando</th><th>Obs.</th></tr></thead><tbody>' +
            history.map(function (p) {
              var st = p.status_label || p.status || '';
              var badgeClass = String(p.status || '').toLowerCase().indexOf('paid') >= 0 ? 'paid'
                : (String(p.status || '').toLowerCase().indexOf('fail') >= 0 ? 'failed' : (p.status || 'pending'));
              return '<tr><td>' + escapeHtml(p.origin_label || '') +
                '</td><td>' + escapeHtml(p.guide_name || '') +
                '</td><td>' + fmtMoney(p.amount_cents) +
                '</td><td style="font-size:0.8rem;">' + escapeHtml(p.pix_key || '') +
                '</td><td><span class="gcv-badge gcv-badge--' + escapeAttr(badgeClass) + '">' + escapeHtml(st) + '</span>' +
                '</td><td style="font-size:0.8rem;">' + escapeHtml(p.when || '') +
                '</td><td style="font-size:0.8rem;max-width:220px;">' + escapeHtml(p.note || '') + '</td></tr>';
            }).join('') + '</tbody></table></div>';
          labelDashTables(hist);
        }
      }
      var openDraft = null;
      payouts.forEach(function (p) {
        if (p.status === 'draft' && !openDraft) openDraft = p;
      });
      if (openDraft && draftBox && draftBox.hidden) {
        showDraftBox({
          payout_id: openDraft.id,
          guide_name: openDraft.guide_name,
          pix_key: openDraft.pix_key_snapshot,
          amount_cents: openDraft.amount_cents,
        });
      }
    });

    if (form && !form._gcvBound) {
      form._gcvBound = true;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var guideId = parseInt(document.getElementById('payout-guide').value, 10);
        var amount = parseFloat(document.getElementById('payout-amount').value);
        var description = document.getElementById('payout-desc').value;
        var opt = select && select.options[select.selectedIndex];
        var guideName = opt && opt.value ? String(opt.textContent || '').split(' — ')[0] : 'o guia';
        if (!guideId || !(amount >= 1)) {
          var msg = 'Selecione um guia e informe valor ≥ R$ 1,00';
          if (window.gcvAlert) window.gcvAlert(msg);
          else alert(msg);
          return;
        }
        var ask = 'Você deseja pagar ' + fmtMoney(Math.round(amount * 100)) + ' para o Guia ' + guideName + '?';
        var confirmFn = window.gcvConfirm ? window.gcvConfirm : function (m) { return Promise.resolve(window.confirm(m)); };
        confirmFn(ask, { okText: 'Fazer pagamento' }).then(function (ok) {
          if (!ok) return;
          post('/api/admin/guide-payouts.php', {
            action: 'create',
            guide_user_id: guideId,
            amount: amount,
            description: description,
          }, function (e2, r2) {
            if (!r2 || !r2.ok) {
              var err = (r2 && r2.error) || 'Erro ao criar pagamento';
              if (window.gcvAlert) window.gcvAlert(err);
              else alert(err);
              return;
            }
            showDraftBox(r2.data || {});
          });
        });
      });
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function loadPendingGuides() {
    requestSection('section-cms-guides');
  }

  function loadAdminBookings() {
    var tbody = document.getElementById('admin-bookings-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#888;">Carregando…</td></tr>';
    get('/api/admin/bookings.php', function (err, res) {
      if (!res || !res.ok) {
        var msg = (res && res.error) ? String(res.error) : 'Erro ao carregar reservas.';
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#888;">' + escapeHtml(msg) + '</td></tr>';
        return;
      }
      var rows = (res.data && res.data.bookings) || [];
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#888;">Nenhuma reserva ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function (b) {
        var code = b.reservation_id || ('#' + b.id);
        var when = String(b.created_at || '').replace('T', ' ').substr(0, 10);
        var transport = b.with_transport
          ? '<span class="gcv-badge gcv-badge--transport-com">Com transporte</span>'
          : '<span class="gcv-badge gcv-badge--transport-sem">Sem transporte</span>';
        return '<tr>'
          + '<td data-label="Código">' + escapeHtml(code) + '</td>'
          + '<td data-label="Passeio">' + escapeHtml(b.tour_title || '') + '</td>'
          + '<td data-label="Cliente">' + escapeHtml(b.client_name || '') + '</td>'
          + '<td data-label="Guia">' + escapeHtml(b.guide_name || '') + '</td>'
          + '<td data-label="Transporte">' + transport + '</td>'
          + '<td data-label="Vagas">' + b.spots + '</td>'
          + '<td data-label="Total">' + fmtMoney(b.total_cents) + '</td>'
          + '<td data-label="Taxa">' + fmtMoney(b.platform_revenue_cents) + '</td>'
          + '<td data-label="Pago ao guia">' + fmtMoney(b.guide_amount_cents) + '</td>'
          + '<td data-label="Status">' + statusBadge(b.status) + '</td>'
          + '<td data-label="Data">' + escapeHtml(when) + '</td>'
          + '</tr>';
      }).join('');
    });
  }

  var waInboxTimer = null;

  function stopWaInboxPoll() {
    if (waInboxTimer) {
      clearInterval(waInboxTimer);
      waInboxTimer = null;
    }
  }

  function syncWaTab(tab) {
    var send = tab !== 'inbox';
    var sendRoot = document.getElementById('admin-broadcast-root');
    var inboxRoot = document.getElementById('admin-messages-root');
    var hintSend = document.getElementById('gcv-wa-hint-send');
    var hintInbox = document.getElementById('gcv-wa-hint-inbox');
    var title = document.getElementById('gcv-wa-title');
    if (sendRoot) sendRoot.hidden = !send;
    if (inboxRoot) inboxRoot.hidden = send;
    if (hintSend) hintSend.hidden = !send;
    if (hintInbox) hintInbox.hidden = send;
    if (title) title.textContent = send ? 'WhatsApp' : 'WhatsApp Business';
    var sec = document.getElementById('section-admin-broadcast');
    if (sec) sec.classList.toggle('is-wa-web', !send);
    document.querySelectorAll('.gcv-wa-tab').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-wa-tab') === (send ? 'send' : 'inbox'));
    });
    if (send) stopWaInboxPoll();
  }

  function loadBroadcast() {
    var root = document.getElementById('admin-broadcast-root');
    if (!root) return;
    syncWaTab('send');
    if (root.getAttribute('data-ready') === '1') {
      if (typeof root._refresh === 'function') root._refresh();
      return;
    }
    root.innerHTML = '<p>Carregando…</p>';

    function initial(g) {
      var letter = ((g.name || '?').trim().charAt(0) || '?').toUpperCase();
      if (g.photo_url) {
        return '<img src="' + escapeAttr(g.photo_url) + '" alt="" />';
      }
      return escapeHtml(letter);
    }

    function resultLabel(status) {
      if (status === 'sent') return 'Enviado no chat';
      if (status === 'no_phone') return 'Sem WhatsApp';
      if (status === 'self') return 'Número da agência — pulado';
      if (status === 'duplicate') return 'Número repetido — pulado';
      return 'Falhou';
    }

    function render(data) {
      var guides = (data && data.guides) || [];
      var sender = (data && data.sender) || {};
      var readyCount = (data && data.ready_count) || 0;
      var senderPhone = sender.phone_display || '+55 62 98250-6891';
      var options = guides.map(function (g) {
        var label = g.name + (g.phone_display ? ' · ' + g.phone_display : ' · sem WhatsApp');
        return '<option value="' + g.user_id + '"' + (g.can_send ? '' : ' disabled') + '>' +
          escapeHtml(label) + '</option>';
      }).join('');

      root.innerHTML =
        '<div class="gcv-broadcast">' +
          '<div class="gcv-dash-card gcv-broadcast__sender">' +
            '<div class="gcv-broadcast__wa" aria-hidden="true">WhatsApp</div>' +
            '<div>' +
              '<div class="gcv-broadcast__sender-label">Remetente</div>' +
              '<strong>' + escapeHtml(senderPhone) + '</strong>' +
              '<div class="gcv-broadcast__sender-hint">' + escapeHtml(sender.label || 'WhatsApp da agência (servidor HPS)') +
              (sender.ready ? '' : ' — conexão indisponível') + '</div>' +
            '</div>' +
          '</div>' +
          '<form class="gcv-dash-form gcv-broadcast__form" id="gcv-broadcast-form" novalidate>' +
            '<div class="gcv-dash-field">' +
              '<span class="gcv-dash-label">Destinatários</span>' +
              '<div class="gcv-broadcast__scopes" role="radiogroup" aria-label="Destinatários">' +
                '<label class="gcv-broadcast__scope">' +
                  '<input type="radio" name="bc-scope" value="all" checked />' +
                  '<span><strong>Todos os guias</strong><small id="bc-all-count">' + readyCount + ' com WhatsApp</small></span>' +
                '</label>' +
                '<label class="gcv-broadcast__scope">' +
                  '<input type="radio" name="bc-scope" value="one" />' +
                  '<span><strong>Guia específico</strong><small>Uma conversa só</small></span>' +
                '</label>' +
              '</div>' +
            '</div>' +
            '<div class="gcv-dash-field" id="bc-guide-field" hidden>' +
              '<label class="gcv-dash-label" for="bc-guide">Guia</label>' +
              '<select class="gcv-dash-select" id="bc-guide">' +
                '<option value="">Selecione…</option>' +
                options +
              '</select>' +
            '</div>' +
            '<div class="gcv-broadcast__preview" id="bc-preview"></div>' +
            '<div class="gcv-dash-field">' +
              '<label class="gcv-dash-label" for="bc-message">Mensagem</label>' +
              '<textarea class="gcv-dash-textarea" id="bc-message" rows="7" maxlength="4000" placeholder="Escreva a mensagem. Cada guia recebe no chat individual, como se você tivesse enviado um por um."></textarea>' +
              '<div class="gcv-broadcast__count"><span id="bc-chars">0</span>/4000</div>' +
            '</div>' +
            '<div id="bc-form-error" class="gcv-dash-alert gcv-dash-alert--warning" hidden></div>' +
            '<div class="gcv-dash-form__footer">' +
              '<div class="gcv-dash-form__footer-actions">' +
                '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary" id="bc-send"' +
                  (sender.ready && readyCount ? '' : ' disabled') + '>Enviar via WhatsApp</button>' +
              '</div>' +
            '</div>' +
          '</form>' +
          '<div id="bc-result" hidden></div>' +
        '</div>';

      root.setAttribute('data-ready', '1');
      root._guides = guides;
      root._refresh = refreshBroadcastGuides;
      bind();
      updatePreview();
    }

    function selectedScope() {
      var checked = root.querySelector('input[name="bc-scope"]:checked');
      return checked ? checked.value : 'all';
    }

    function selectedGuide() {
      var id = parseInt((document.getElementById('bc-guide') || {}).value || '0', 10);
      var guides = root._guides || [];
      for (var i = 0; i < guides.length; i++) {
        if (guides[i].user_id === id) return guides[i];
      }
      return null;
    }

    function recipients() {
      var guides = root._guides || [];
      if (selectedScope() === 'one') {
        var g = selectedGuide();
        return g && g.can_send ? [g] : [];
      }
      return guides.filter(function (g) { return g.can_send; });
    }

    function updatePreview() {
      var box = document.getElementById('bc-preview');
      var field = document.getElementById('bc-guide-field');
      var countEl = document.getElementById('bc-all-count');
      var sendBtn = document.getElementById('bc-send');
      if (!box) return;
      var one = selectedScope() === 'one';
      if (field) field.hidden = !one;
      var list = recipients();
      var ready = (root._guides || []).filter(function (g) { return g.can_send; }).length;
      if (countEl) countEl.textContent = ready + ' com WhatsApp';
      if (sendBtn && !sendBtn.hasAttribute('data-busy')) {
        sendBtn.disabled = list.length === 0;
      }
      if (!list.length) {
        box.innerHTML = '<p class="gcv-broadcast__empty">' +
          (one ? 'Selecione um guia com WhatsApp cadastrado.' : 'Nenhum guia com WhatsApp para enviar.') +
          '</p>';
        return;
      }
      var extra = list.length > 8 ? '<li class="gcv-broadcast__more">+' + (list.length - 8) + ' guias</li>' : '';
      box.innerHTML =
        '<div class="gcv-broadcast__preview-head">Vai atualizar ' + list.length +
        (list.length === 1 ? ' chat' : ' chats') + ' no WhatsApp da agência</div>' +
        '<ul class="gcv-broadcast__people">' +
        list.slice(0, 8).map(function (g) {
          return '<li><span class="gcv-broadcast__avatar">' + initial(g) + '</span>' +
            '<span><strong>' + escapeHtml(g.name) + '</strong><small>' +
            escapeHtml(g.phone_display || '') + '</small></span></li>';
        }).join('') + extra +
        '</ul>';
    }

    function bind() {
      var form = document.getElementById('gcv-broadcast-form');
      var msg = document.getElementById('bc-message');
      var chars = document.getElementById('bc-chars');
      function markScopes() {
        root.querySelectorAll('.gcv-broadcast__scope').forEach(function (lab) {
          var input = lab.querySelector('input');
          lab.classList.toggle('is-on', !!(input && input.checked));
        });
      }
      root.querySelectorAll('input[name="bc-scope"]').forEach(function (r) {
        r.addEventListener('change', function () {
          markScopes();
          updatePreview();
        });
      });
      markScopes();
      var sel = document.getElementById('bc-guide');
      if (sel) sel.addEventListener('change', updatePreview);
      if (msg && chars) {
        msg.addEventListener('input', function () {
          chars.textContent = String(msg.value.length);
        });
      }
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = document.getElementById('bc-form-error');
        var result = document.getElementById('bc-result');
        var btn = document.getElementById('bc-send');
        var list = recipients();
        var text = (msg && msg.value || '').trim();
        if (err) { err.hidden = true; err.textContent = ''; }
        if (!text) {
          if (err) { err.hidden = false; err.textContent = 'Escreva a mensagem.'; }
          return;
        }
        if (!list.length) {
          if (err) { err.hidden = false; err.textContent = 'Nenhum destinatário com WhatsApp.'; }
          return;
        }
        var confirmFn = window.gcvConfirm ? window.gcvConfirm : function (m) { return Promise.resolve(window.confirm(m)); };
        var who = selectedScope() === 'one'
          ? (list[0].name + ' (' + (list[0].phone_display || '') + ')')
          : (list.length + ' guias');
        confirmFn('Enviar esta mensagem para ' + who + ' pelo WhatsApp +55 62 98250-6891? Cada chat será atualizado individualmente.').then(function (ok) {
          if (!ok) return;
          if (btn) {
            btn.disabled = true;
            btn.setAttribute('data-busy', '1');
            btn.textContent = 'Enviando…';
          }
          if (result) {
            result.hidden = false;
            result.innerHTML = '<p class="gcv-dash-hint">Enviando um por um para atualizar o chat normal…</p>';
          }
          var xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/admin/broadcast.php');
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.timeout = 180000;
          xhr.onload = function () {
            var res = {};
            try { res = JSON.parse(xhr.responseText); } catch (parseErr) { res = {}; }
            if (btn) {
              btn.disabled = false;
              btn.removeAttribute('data-busy');
              btn.textContent = 'Enviar via WhatsApp';
            }
            updatePreview();
            if (!res || !res.ok) {
              if (err) {
                err.hidden = false;
                err.textContent = (res && res.error) || 'Não foi possível enviar.';
              }
              if (result) result.hidden = true;
              return;
            }
            var d = res.data || {};
            var rows = d.results || [];
            if (result) {
              result.hidden = false;
              result.innerHTML =
                '<div class="gcv-dash-alert gcv-dash-alert--' + (d.failed ? 'warning' : 'success') + '">' +
                'Enviado: <strong>' + (d.sent || 0) + '</strong> · Falhou: <strong>' + (d.failed || 0) + '</strong>' +
                (d.skipped ? ' · Pulados: <strong>' + d.skipped + '</strong>' : '') +
                '</div>' +
                '<ul class="gcv-broadcast__log">' +
                rows.map(function (r) {
                  return '<li class="is-' + escapeAttr(r.status || 'failed') + '">' +
                    '<span>' + escapeHtml(r.name || '') +
                    (r.phone_display ? ' <small>' + escapeHtml(r.phone_display) + '</small>' : '') +
                    '</span><em>' + escapeHtml(resultLabel(r.status)) + '</em></li>';
                }).join('') +
                '</ul>';
            }
          };
          xhr.onerror = xhr.ontimeout = function () {
            if (btn) {
              btn.disabled = false;
              btn.removeAttribute('data-busy');
              btn.textContent = 'Enviar via WhatsApp';
            }
            updatePreview();
            if (err) {
              err.hidden = false;
              err.textContent = 'Falha de rede ao enviar o broadcast.';
            }
          };
          xhr.send(JSON.stringify({
            scope: selectedScope(),
            guide_user_id: selectedScope() === 'one' ? (list[0] && list[0].user_id) || 0 : 0,
            message: text
          }));
        });
      });
    }

    function refreshBroadcastGuides() {
      get('/api/admin/broadcast.php', function (err, res) {
        if (!res || !res.ok || !res.data) return;
        root._guides = res.data.guides || [];
        var sel = document.getElementById('bc-guide');
        if (sel) {
          var current = sel.value;
          sel.innerHTML = '<option value="">Selecione…</option>' + (root._guides || []).map(function (g) {
            var label = g.name + (g.phone_display ? ' · ' + g.phone_display : ' · sem WhatsApp');
            return '<option value="' + g.user_id + '"' + (g.can_send ? '' : ' disabled') + '>' +
              escapeHtml(label) + '</option>';
          }).join('');
          sel.value = current;
        }
        updatePreview();
      });
    }

    get('/api/admin/broadcast.php', function (err, res) {
      if (err || !res || !res.ok) {
        root.innerHTML = '<p class="gcv-dash-alert gcv-dash-alert--warning">' +
          escapeHtml((res && res.error) || 'Erro ao carregar o broadcast.') + '</p>';
        return;
      }
      render(res.data || {});
    });
  }

  function loadMessages() {
    var root = document.getElementById('admin-messages-root');
    if (!root) return;
    syncWaTab('inbox');
    if (root.getAttribute('data-ready') === '1') {
      if (typeof root._refreshList === 'function') root._refreshList(true);
      if (root._openKey && typeof root._openThread === 'function') root._openThread(root._openKey, true);
      startWaInboxPoll();
      return;
    }
    root.innerHTML = '<p>Carregando conversas…</p>';
    root._filter = 'all';
    root._openKey = '';
    root._drafts = [];

    var ICO_NEW = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0012.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02zm-7.01 15.24h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.43 5.83c0 4.54-3.7 8.23-8.26 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.10-.23-.16-.48-.28z"/></svg>';
    var ICO_SEND = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>';
    var ICO_BACK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';

    function digitsOf(s) {
      return String(s || '').replace(/\D+/g, '');
    }

    function looksLikePhone(s) {
      var d = digitsOf(s);
      return d.length >= 10 && d.length <= 15;
    }

    function formatPhone(raw) {
      var d = digitsOf(raw);
      if (d.length === 13 && d.indexOf('55') === 0) {
        return '+55 ' + d.slice(2, 4) + ' ' + d.slice(4, 9) + '-' + d.slice(9);
      }
      if (d.length === 12 && d.indexOf('55') === 0) {
        return '+55 ' + d.slice(2, 4) + ' ' + d.slice(4, 8) + '-' + d.slice(8);
      }
      if (d.length === 11) {
        return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
      }
      return d ? '+' + d : '';
    }

    function convoKey(c) {
      if (!c) return '';
      if (c.remote_jid) return 'jid:' + c.remote_jid;
      if (c.user_id) return 'guide:' + String(c.user_id);
      if (c.phone) return 'phone:' + c.phone;
      return '';
    }

    function avatarHtml(item) {
      var letter = ((item.name || '?').trim().charAt(0) || '?').toUpperCase();
      var extra = item.kind === 'group' ? ' is-group' : '';
      if (item.photo_url) {
        return '<span class="gcv-wa-avatar' + extra + '"><img src="' + escapeAttr(item.photo_url) + '" alt="" /></span>';
      }
      return '<span class="gcv-wa-avatar' + extra + '">' + escapeHtml(letter) + '</span>';
    }

    function emptyThreadHtml() {
      return '<div class="gcv-wa-empty">' +
        '<div class="gcv-wa-empty__mark" aria-hidden="true">' + ICO_NEW + '</div>' +
        '<h3>WhatsApp Business Web</h3>' +
        '<p>Envie e receba mensagens pelo número da agência, como no WhatsApp Web.</p>' +
        '<p class="gcv-wa-empty__hint">Clique em uma conversa ou comece um chat novo.</p>' +
        '</div>';
    }

    function renderShell() {
      var sender = root._sender || {};
      root.innerHTML =
        '<div class="gcv-wa-inbox">' +
          '<aside class="gcv-wa-list">' +
            '<header class="gcv-wa-list__head">' +
              '<span class="gcv-wa-avatar is-agency">GCV</span>' +
              '<div class="gcv-wa-list__me">' +
                '<strong>Guia Chapada Veadeiros</strong>' +
                '<small>' + escapeHtml(sender.phone_display || '+55 62 98250-6891') + '</small>' +
              '</div>' +
              '<button type="button" class="gcv-wa-iconbtn" id="wa-new" title="Nova conversa" aria-label="Nova conversa">' + ICO_NEW + '</button>' +
            '</header>' +
            '<div class="gcv-wa-list__search">' +
              '<input id="wa-search" type="search" placeholder="Pesquisar ou começar uma nova conversa" autocomplete="off" />' +
            '</div>' +
            '<div class="gcv-wa-filters" role="tablist">' +
              '<button type="button" class="gcv-wa-filter is-on" data-wa-filter="all">Todas</button>' +
              '<button type="button" class="gcv-wa-filter" data-wa-filter="guides">Guias</button>' +
              '<button type="button" class="gcv-wa-filter" data-wa-filter="unread">Não lidas</button>' +
            '</div>' +
            '<div class="gcv-wa-list__items" id="wa-convos"></div>' +
            '<div class="gcv-wa-new" id="wa-new-panel" hidden>' +
              '<header class="gcv-wa-new__head">' +
                '<button type="button" class="gcv-wa-iconbtn is-light" id="wa-new-back" aria-label="Voltar">' + ICO_BACK + '</button>' +
                '<strong>Nova conversa</strong>' +
              '</header>' +
              '<div class="gcv-wa-list__search">' +
                '<input id="wa-new-search" type="search" placeholder="Pesquisar nome ou número" inputmode="tel" autocomplete="off" />' +
              '</div>' +
              '<div class="gcv-wa-new__results" id="wa-new-results"></div>' +
            '</div>' +
          '</aside>' +
          '<section class="gcv-wa-thread" id="wa-thread">' + emptyThreadHtml() + '</section>' +
        '</div>';
      root.setAttribute('data-ready', '1');
      var search = document.getElementById('wa-search');
      if (search) {
        search.addEventListener('input', function () {
          drawList(search.value);
        });
        search.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && looksLikePhone(search.value)) {
            e.preventDefault();
            startByPhone(search.value);
          }
        });
      }
      root.querySelectorAll('[data-wa-filter]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          root._filter = btn.getAttribute('data-wa-filter') || 'all';
          root.querySelectorAll('[data-wa-filter]').forEach(function (b) {
            b.classList.toggle('is-on', b === btn);
          });
          drawList((document.getElementById('wa-search') || {}).value || '');
        });
      });
      var newBtn = document.getElementById('wa-new');
      var newBack = document.getElementById('wa-new-back');
      if (newBtn) newBtn.addEventListener('click', function () { toggleNewPanel(true); });
      if (newBack) newBack.addEventListener('click', function () { toggleNewPanel(false); });
      var newSearch = document.getElementById('wa-new-search');
      if (newSearch) {
        newSearch.addEventListener('input', function () { drawNewResults(newSearch.value); });
        newSearch.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && looksLikePhone(newSearch.value)) {
            e.preventDefault();
            startByPhone(newSearch.value);
          }
        });
      }
    }

    function toggleNewPanel(open) {
      var panel = document.getElementById('wa-new-panel');
      if (!panel) return;
      panel.hidden = !open;
      if (open) {
        drawNewResults('');
        var input = document.getElementById('wa-new-search');
        if (input) {
          input.value = '';
          setTimeout(function () { input.focus(); }, 30);
        }
      }
    }

    function allConvos() {
      var server = root._convos || [];
      var drafts = root._drafts || [];
      var keys = {};
      server.forEach(function (c) { keys[convoKey(c)] = true; });
      return drafts.filter(function (d) { return !keys[convoKey(d)]; }).concat(server);
    }

    function drawList(query) {
      var box = document.getElementById('wa-convos');
      if (!box) return;
      query = String(query || '').toLowerCase().trim();
      var filter = root._filter || 'all';
      var rows = allConvos().filter(function (c) {
        if (filter === 'guides' && c.kind !== 'guide') return false;
        if (filter === 'unread' && !c.unread) return false;
        if (!query) return true;
        return (c.name || '').toLowerCase().indexOf(query) !== -1
          || (c.phone_display || '').toLowerCase().indexOf(query) !== -1
          || (c.phone || '').indexOf(digitsOf(query)) !== -1;
      });
      if (!rows.length) {
        var phoneHint = looksLikePhone(query)
          ? '<button type="button" class="gcv-wa-newphone" data-phone="' + escapeAttr(digitsOf(query)) + '">Nova conversa com ' +
            escapeHtml(formatPhone(query)) + '</button>'
          : '';
        box.innerHTML = '<p class="gcv-wa-list__empty">Nenhuma conversa encontrada.</p>' + phoneHint;
        var start = box.querySelector('[data-phone]');
        if (start) start.addEventListener('click', function () { startByPhone(start.getAttribute('data-phone')); });
        return;
      }
      box.innerHTML = rows.map(function (c) {
        var preview = c.last_text
          ? ((c.last_from_me ? 'Você: ' : '') + c.last_text)
          : (c.can_send ? 'Clique para conversar' : 'Sem WhatsApp');
        var unread = c.unread ? '<em class="gcv-wa-unread">' + (c.unread > 99 ? '99+' : c.unread) + '</em>' : '';
        return '<button type="button" class="gcv-wa-convo' +
          (root._openKey === convoKey(c) ? ' is-on' : '') +
          (c.unread ? ' has-unread' : '') + '"' +
          ' data-key="' + escapeAttr(convoKey(c)) + '">' +
          avatarHtml(c) +
          '<span class="gcv-wa-convo__meta">' +
            '<span class="gcv-wa-convo__top"><strong>' + escapeHtml(c.name) + '</strong>' +
            '<small>' + escapeHtml(c.last_at_label || '') + '</small></span>' +
            '<span class="gcv-wa-convo__preview">' + escapeHtml(preview) + unread + '</span>' +
          '</span></button>';
      }).join('');
      box.querySelectorAll('[data-key]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openThread(btn.getAttribute('data-key'), false);
        });
      });
    }

    function drawNewResults(query) {
      var box = document.getElementById('wa-new-results');
      if (!box) return;
      query = String(query || '').trim();
      var q = query.toLowerCase();
      var digits = digitsOf(query);
      var html = '';
      if (looksLikePhone(query)) {
        html += '<button type="button" class="gcv-wa-convo gcv-wa-newphone" data-phone="' + escapeAttr(digits) + '">' +
          '<span class="gcv-wa-avatar is-plus">+</span>' +
          '<span class="gcv-wa-convo__meta"><span class="gcv-wa-convo__top"><strong>Nova conversa</strong></span>' +
          '<span class="gcv-wa-convo__preview">Mensagem para ' + escapeHtml(formatPhone(query)) + '</span></span></button>';
      }
      var contacts = allConvos().filter(function (c) {
        if (!c.can_send && c.kind !== 'guide') return false;
        if (!q) return c.kind === 'guide' || c.has_chat;
        return (c.name || '').toLowerCase().indexOf(q) !== -1
          || (c.phone_display || '').toLowerCase().indexOf(q) !== -1
          || (c.phone || '').indexOf(digits) !== -1;
      });
      if (contacts.length) {
        html += '<p class="gcv-wa-new__label">Contatos</p>';
        html += contacts.map(function (c) {
          return '<button type="button" class="gcv-wa-convo" data-key="' + escapeAttr(convoKey(c)) + '">' +
            avatarHtml(c) +
            '<span class="gcv-wa-convo__meta"><span class="gcv-wa-convo__top"><strong>' + escapeHtml(c.name) + '</strong></span>' +
            '<span class="gcv-wa-convo__preview">' + escapeHtml(c.phone_display || (c.kind === 'group' ? 'Grupo' : '')) +
            '</span></span></button>';
        }).join('');
      }
      if (!html) {
        html = '<p class="gcv-wa-list__empty">Digite um nome ou um número com DDD para começar.</p>';
      }
      box.innerHTML = html;
      box.querySelectorAll('[data-phone]').forEach(function (btn) {
        btn.addEventListener('click', function () { startByPhone(btn.getAttribute('data-phone')); });
      });
      box.querySelectorAll('[data-key]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          toggleNewPanel(false);
          openThread(btn.getAttribute('data-key'), false);
        });
      });
    }

    function findConvo(key) {
      key = String(key || '');
      var rows = allConvos();
      for (var i = 0; i < rows.length; i++) {
        if (convoKey(rows[i]) === key) return rows[i];
      }
      return null;
    }

    function upsertDraft(convo) {
      var key = convoKey(convo);
      root._drafts = (root._drafts || []).filter(function (d) { return convoKey(d) !== key; });
      root._drafts.unshift(convo);
    }

    function startByPhone(raw) {
      var phone = digitsOf(raw);
      if (!looksLikePhone(phone)) return;
      var existing = allConvos().filter(function (c) {
        return c.phone && (c.phone === phone || digitsOf(c.phone) === phone);
      })[0];
      if (existing) {
        toggleNewPanel(false);
        openThread(convoKey(existing), false);
        return;
      }
      get('/api/admin/wa-messages.php?check_phone=' + encodeURIComponent(phone), function (err, res) {
        var data = (res && res.data) || {};
        if (res && res.ok === false && res.error) {
          alert(res.error);
          return;
        }
        if (res && res.ok && data.checked && data.exists === false) {
          alert('Este número não está no WhatsApp.');
          return;
        }
        var convo = {
          user_id: 0,
          kind: 'contact',
          name: data.name || formatPhone(data.phone || phone),
          phone: data.phone || phone,
          phone_display: data.phone_display || formatPhone(phone),
          photo_url: '',
          can_send: true,
          has_chat: false,
          remote_jid: data.jid || '',
          last_text: '',
          last_from_me: false,
          last_at: 0,
          last_at_label: '',
          unread: 0
        };
        upsertDraft(convo);
        toggleNewPanel(false);
        openThread(convoKey(convo), false);
      });
    }

    function drawThread(contact, messages, quiet) {
      var thread = document.getElementById('wa-thread');
      if (!thread) return;
      var canSend = !!(contact && contact.can_send);
      var saved = '';
      var prev = document.getElementById('wa-reply');
      if (quiet && prev) saved = prev.value;
      thread.classList.add('is-open');
      thread.innerHTML =
        '<header class="gcv-wa-thread__head">' +
          '<button type="button" class="gcv-wa-back" id="wa-back" aria-label="Voltar">' + ICO_BACK + '</button>' +
          avatarHtml(contact || {}) +
          '<div class="gcv-wa-thread__who"><strong>' + escapeHtml((contact && contact.name) || 'Conversa') + '</strong>' +
          '<small>' + escapeHtml((contact && contact.phone_display) || (contact && contact.kind === 'group' ? 'Grupo do WhatsApp' : 'WhatsApp')) + '</small></div>' +
        '</header>' +
        '<div class="gcv-wa-thread__msgs" id="wa-msgs"></div>' +
        '<form class="gcv-wa-composer" id="wa-composer">' +
          '<textarea id="wa-reply" rows="1" maxlength="4000" placeholder="' +
          (canSend ? 'Digite uma mensagem' : 'Este contato não tem WhatsApp.') + '"' +
          (canSend ? '' : ' disabled') + '>' + escapeHtml(saved) + '</textarea>' +
          '<button type="submit" class="gcv-wa-send" id="wa-reply-btn" aria-label="Enviar"' +
          (canSend ? '' : ' disabled') + '>' + ICO_SEND + '</button>' +
        '</form>';
      var back = document.getElementById('wa-back');
      if (back) {
        back.addEventListener('click', function () {
          root._openKey = '';
          thread.classList.remove('is-open');
          thread.innerHTML = emptyThreadHtml();
          drawList((document.getElementById('wa-search') || {}).value || '');
        });
      }
      paintMessages(messages || [], quiet);
      var form = document.getElementById('wa-composer');
      var input = document.getElementById('wa-reply');
      if (input) {
        input.style.height = 'auto';
        input.style.height = Math.min(120, input.scrollHeight) + 'px';
        input.addEventListener('input', function () {
          input.style.height = 'auto';
          input.style.height = Math.min(120, input.scrollHeight) + 'px';
        });
      }
      if (form && input && canSend) {
        if (!quiet) setTimeout(function () { input.focus(); }, 40);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.requestSubmit();
          }
        });
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var text = input.value.trim();
          if (!text) return;
          var btn = document.getElementById('wa-reply-btn');
          if (btn) btn.disabled = true;
          var payload = { message: text };
          if (contact.user_id) payload.guide_user_id = contact.user_id;
          if (contact.phone) payload.phone = contact.phone;
          if (contact.remote_jid) payload.remote_jid = contact.remote_jid;
          post('/api/admin/wa-messages.php', payload, function (err, res) {
            if (btn) btn.disabled = false;
            if (!res || !res.ok) {
              alert((res && res.error) || 'Não foi possível enviar.');
              return;
            }
            input.value = '';
            input.style.height = 'auto';
            var next = (root._messages || []).concat([res.data.message]);
            root._messages = next;
            if (res.data.contact) {
              Object.keys(res.data.contact).forEach(function (k) {
                contact[k] = res.data.contact[k];
              });
            }
            contact.has_chat = true;
            contact.last_text = text;
            contact.last_from_me = true;
            contact.last_at_label = 'agora';
            upsertDraft(contact);
            paintMessages(next, false);
            if (typeof root._refreshList === 'function') root._refreshList(true);
          });
        });
      }
    }

    function dayLabel(ts) {
      if (!ts) return '';
      var d = new Date(ts * 1000);
      var now = new Date();
      var same = d.toDateString() === now.toDateString();
      if (same) return 'Hoje';
      var yest = new Date(now.getTime() - 86400000);
      if (d.toDateString() === yest.toDateString()) return 'Ontem';
      return d.toLocaleDateString('pt-BR');
    }

    function paintMessages(messages, keepScroll) {
      var box = document.getElementById('wa-msgs');
      if (!box) return;
      var nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 80;
      if (!messages.length) {
        box.innerHTML = '<p class="gcv-wa-thread__empty">Nenhuma mensagem ainda. Escreva abaixo para começar o chat.</p>';
        return;
      }
      var html = '';
      var lastDay = '';
      messages.forEach(function (m) {
        var day = dayLabel(m.at);
        if (day && day !== lastDay) {
          html += '<div class="gcv-wa-day"><span>' + escapeHtml(day) + '</span></div>';
          lastDay = day;
        }
        html += '<div class="gcv-wa-bubble' + (m.from_me ? ' is-out' : ' is-in') + '">' +
          '<p>' + escapeHtml(m.text || '') + '</p>' +
          '<small>' + escapeHtml(m.at_label || '') + (m.from_me ? ' ✓✓' : '') + '</small></div>';
      });
      box.innerHTML = html;
      if (!keepScroll || nearBottom) {
        box.scrollTop = box.scrollHeight;
      }
    }

    function openThread(key, quiet) {
      var convo = findConvo(key);
      if (!convo) return;
      root._openKey = convoKey(convo);
      drawList((document.getElementById('wa-search') || {}).value || '');
      if (!quiet) {
        root._messages = [];
        drawThread(convo, [], false);
      }
      var params = [];
      if (convo.user_id) params.push('guide_user_id=' + encodeURIComponent(convo.user_id));
      if (convo.remote_jid) params.push('remote_jid=' + encodeURIComponent(convo.remote_jid));
      if (!convo.user_id && convo.phone) params.push('phone=' + encodeURIComponent(convo.phone));
      if (!params.length) {
        drawThread(convo, [], quiet);
        return;
      }
      get('/api/admin/wa-messages.php?' + params.join('&'), function (err, res) {
        if (!res || !res.ok) {
          if (!quiet) {
            drawThread(convo, [], false);
          }
          return;
        }
        root._messages = (res.data && res.data.messages) || [];
        var contact = (res.data && (res.data.contact || res.data.guide)) || convo;
        if (quiet && document.getElementById('wa-msgs')) {
          paintMessages(root._messages, true);
          return;
        }
        drawThread(contact, root._messages, quiet);
      });
    }

    function refreshList(quiet) {
      get('/api/admin/wa-messages.php', function (err, res) {
        if (!res || !res.ok) {
          if (!quiet && !root._convos) {
            root.innerHTML = '<p class="gcv-dash-alert gcv-dash-alert--warning">' +
              escapeHtml((res && res.error) || 'Erro ao carregar as conversas.') + '</p>';
            root.removeAttribute('data-ready');
          }
          return;
        }
        root._sender = (res.data && res.data.sender) || root._sender || {};
        root._convos = (res.data && res.data.conversations) || [];
        if (root.getAttribute('data-ready') !== '1') renderShell();
        else {
          var me = root.querySelector('.gcv-wa-list__me small');
          if (me && root._sender.phone_display) me.textContent = root._sender.phone_display;
        }
        drawList((document.getElementById('wa-search') || {}).value || '');
      });
    }

    function startWaInboxPoll() {
      stopWaInboxPoll();
      waInboxTimer = setInterval(function () {
        if (document.hidden) return;
        var inbox = document.getElementById('admin-messages-root');
        if (!inbox || inbox.hidden) return;
        refreshList(true);
        if (root._openKey) openThread(root._openKey, true);
      }, 15000);
    }

    root._refreshList = refreshList;
    root._openThread = openThread;
    refreshList(false);
    startWaInboxPoll();
  }

  function loadSettings() {
    var form = document.getElementById('admin-settings-form');
    if (!form) return;
    var groupOf = {
      notify_guide_hours_long: 'notify',
      notify_guide_hours_short: 'notify',
      notify_client_hours_long: 'notify',
      notify_client_hours_short: 'notify',
      notify_arrive_minutes: 'notify',
      notify_late_tolerance_minutes: 'notify',
      platform_commission_pct: 'finance',
      guide_net_min_reais: 'finance',
      guide_net_max_reais: 'finance',
      guide_net_max_dragao_reais: 'finance',
      guide_net_max_transport_reais: 'finance',
      payout_after_hour: 'finance',
      payout_after_minute: 'finance',
      payout_delay_hours: 'finance',
      checkin_open_before_minutes: 'finance',
      checkin_close_before_payout_minutes: 'finance',
      transfer_offer_hours: 'transfer',
      transfer_cancel_hours: 'transfer'
    };
    var groupMeta = {
      notify: {
        title: 'Notificações de passeio',
        hint: 'WhatsApp, e-mail e o sino do painel usam estes prazos. 0 em “chegada” desliga o aviso de 15 minutos.'
      },
      transfer: {
        title: 'Troca de passeio (quórum)',
        hint: 'Dois prazos, sem cruzar: a lista de troca abre antes (padrão 48 h) e o cancelamento automático só depois (padrão 12 h). Só inscrição em formação pode ir para um passeio já confirmado no mesmo dia e mesma cidade. Se não houver opção, vale só o cancelamento 100%.'
      },
      finance: {
        title: 'Financeiro e repasse',
        hint: 'A diária máxima é o valor que o guia pode pedir por pessoa. O PIX automático sai no horário abaixo, só para clientes cujo QR o guia leu. A leitura abre X minutos antes da saída e fecha X minutos antes desse PIX.'
      },
      other: { title: 'Outras', hint: '' }
    };
    get('/api/admin/settings.php', function (err, res) {
      if (!res || !res.ok) return;
      var buckets = { notify: [], transfer: [], finance: [], other: [] };
      (res.data.settings || []).forEach(function (s) {
        var g = groupOf[s.key_name] || 'other';
        buckets[g].push(s);
      });
      form.innerHTML = '';
      ['notify', 'transfer', 'finance', 'other'].forEach(function (gid) {
        var list = buckets[gid];
        if (!list.length) return;
        var box = el('div', 'gcv-dash-settings-group');
        var meta = groupMeta[gid];
        box.innerHTML = '<h3 class="gcv-dash-settings-group__title">' + meta.title + '</h3>'
          + (meta.hint ? '<p class="gcv-dash-settings-group__hint">' + meta.hint + '</p>' : '');
        list.forEach(function (s) {
          var row = el('div', 'gcv-dash-settings-row');
          var unit = /guide_net_.*_reais/.test(s.key_name)
            ? 'R$'
            : (/minute/.test(s.key_name) ? 'min' : (s.type === 'percent' ? '%' : (/hours|hour/.test(s.key_name) ? 'h' : '')));
          row.innerHTML = '<div class="gcv-dash-settings-label"><strong>' + s.label + '</strong></div>'
            + '<div class="gcv-dash-settings-controls">'
            + '<input class="gcv-dash-settings-input" type="number" min="0" step="1" value="' + s.value + '" data-key="' + s.key_name + '" />'
            + (unit ? '<span class="gcv-dash-settings-unit">' + unit + '</span>' : '')
            + '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--primary" data-save-key="' + s.key_name + '">Salvar</button>'
            + '<span class="gcv-dash-settings-ok" hidden>Salvo</span>'
            + '</div>';
          row.querySelector('[data-save-key]').addEventListener('click', function () {
            var input = row.querySelector('.gcv-dash-settings-input');
            var okEl = row.querySelector('.gcv-dash-settings-ok');
            put('/api/admin/settings.php', { key_name: s.key_name, value: input.value }, function (e, r) {
              if (okEl) {
                okEl.hidden = !(r && r.ok);
                okEl.textContent = (r && r.ok) ? 'Salvo' : (r && r.error) || 'Erro';
              } else {
                alert(r && r.ok ? 'Salvo!' : ((r && r.error) || 'Erro'));
              }
            });
          });
          box.appendChild(row);
        });
        form.appendChild(box);
      });
    });
  }

  function loadFinancial() {
    var content = document.getElementById('admin-financial-content');
    if (!content) return;
    var today = new Date();
    var fromDefault = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substr(0, 10);
    var toDefault = today.toISOString().substr(0, 10);

    content.innerHTML =
      '<div class="gcv-dash-field-row" style="margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">De</label><input class="gcv-dash-input" id="fin-from" type="date" value="' + fromDefault + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Até</label><input class="gcv-dash-input" id="fin-to" type="date" value="' + toDefault + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">BusinessMode</label><select class="gcv-dash-select" id="fin-mode"><option value="">Todos</option><option value="ADMINISTRATIVE">ADMINISTRATIVE</option><option value="GUIDE_MARKETPLACE">GUIDE_MARKETPLACE</option></select></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Origem (CreatedBy)</label><select class="gcv-dash-select" id="fin-origin"><option value="">Todas</option><option>ADMIN</option><option>GUIDE</option><option>CURSOR</option><option>IMPORT</option><option>API</option><option>AI</option></select></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">CPF guia</label><input class="gcv-dash-input" id="fin-cpf" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">CNPJ guia</label><input class="gcv-dash-input" id="fin-cnpj" /></div>' +
      '<div class="gcv-dash-field" style="align-self:flex-end;"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="fin-apply">Filtrar</button></div>' +
      '</div>' +
      '<div id="fin-stats"></div>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:1rem 0;">' +
      '<a class="gcv-dash-btn" id="fin-csv" href="#">Exportar CSV</a>' +
      '<a class="gcv-dash-btn" id="fin-xlsx" href="#">Exportar XLSX</a>' +
      '<a class="gcv-dash-btn" id="fin-pdf" target="_blank" href="#">Exportar PDF</a>' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="fin-payouts-btn">REGISTRAR REPASSE PIX</button>' +
      '</div>' +
      '<div id="fin-breakdowns"></div>' +
      '<div id="fin-payout-panel" hidden style="margin-top:1rem;padding:1rem;border:1px solid #e2e8f0;border-radius:8px;"></div>';

    function qs() {
      var p = new URLSearchParams();
      p.set('from', document.getElementById('fin-from').value || '');
      p.set('to', document.getElementById('fin-to').value || '');
      var mode = document.getElementById('fin-mode').value;
      var origin = document.getElementById('fin-origin').value;
      var cpf = document.getElementById('fin-cpf').value.trim();
      var cnpj = document.getElementById('fin-cnpj').value.trim();
      if (mode) p.set('business_mode', mode);
      if (origin) p.set('origin', origin);
      if (cpf) p.set('cpf', cpf);
      if (cnpj) p.set('cnpj', cnpj);
      return p.toString();
    }

    function renderGroup(title, rows) {
      if (!rows || !rows.length) return '';
      return '<h3 style="margin:1.25rem 0 0.5rem;">' + title + '</h3>' +
        '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr><th>Nome</th><th>Vendas</th><th>Total</th><th>Plataforma</th><th>Guias</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td>' + (r.group_label || r.group_id || '—') + '</td><td>' + (r.sales_count || 0) +
            '</td><td>' + fmtMoney(r.total_sold_cents || 0) + '</td><td>' + fmtMoney(r.platform_revenue_cents || 0) +
            '</td><td>' + fmtMoney(r.guide_amount_cents || 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    function refresh() {
      var q = qs();
      document.getElementById('fin-csv').href = '/api/admin/finance-dashboard.php?export=csv&accounting=1&' + q;
      document.getElementById('fin-xlsx').href = '/api/admin/finance-dashboard.php?export=xlsx&accounting=1&' + q;
      document.getElementById('fin-pdf').href = '/api/admin/finance-dashboard.php?export=pdf&accounting=1&' + q;
      get('/api/admin/finance-dashboard.php?' + q, function (err, res) {
        if (!res || !res.ok) {
          document.getElementById('fin-stats').innerHTML = '<div class="gcv-dash-alert">Erro ao carregar financeiro.</div>';
          return;
        }
        var s = (res.data && res.data.summary) || {};
        document.getElementById('fin-stats').innerHTML =
          '<div class="gcv-dash-stats">' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Total vendido</div><div class="gcv-dash-stat__value">' + fmtMoney(s.total_sold_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Receita bruta</div><div class="gcv-dash-stat__value">' + fmtMoney(s.gross_revenue_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Receita líquida</div><div class="gcv-dash-stat__value">' + fmtMoney(s.net_revenue_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Comissão plataforma</div><div class="gcv-dash-stat__value">' + fmtMoney(s.platform_commission_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Valor dos guias</div><div class="gcv-dash-stat__value">' + fmtMoney(s.guides_amount_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Já repassado</div><div class="gcv-dash-stat__value">' + fmtMoney(s.paid_out_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Pendente repasse</div><div class="gcv-dash-stat__value">' + fmtMoney(s.pending_payout_cents || 0) + '</div></div>' +
          '<div class="gcv-dash-stat"><div class="gcv-dash-stat__label">Ticket médio</div><div class="gcv-dash-stat__value">' + fmtMoney(Math.round(s.avg_ticket_cents || 0)) + '</div></div>' +
          '</div>';
        document.getElementById('fin-breakdowns').innerHTML =
          renderGroup('Receita por guia', res.data.by_guide) +
          renderGroup('Receita por cidade', res.data.by_city) +
          renderGroup('Receita por passeio', res.data.by_excursion) +
          renderGroup('Receita por categoria', res.data.by_category);
      });
    }

    document.getElementById('fin-apply').onclick = refresh;
    document.getElementById('fin-payouts-btn').onclick = function () {
      var panel = document.getElementById('fin-payout-panel');
      panel.hidden = false;
      panel.innerHTML = 'Carregando vendas pendentes…';
      get('/api/admin/sale-payouts.php?payout_status=PAYOUT_PENDING', function (e, r) {
        if (!r || !r.ok) {
          panel.innerHTML = '<div class="gcv-dash-alert">Erro ao carregar.</div>';
          return;
        }
        var sales = (r.data && r.data.sales) || [];
        if (!sales.length) {
          panel.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma venda pendente de repasse.</div>';
          return;
        }
        panel.innerHTML = '<h3>Registrar repasse PIX</h3>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Venda</label><select class="gcv-dash-select" id="po-sale">' +
          sales.map(function (s) {
            return '<option value="' + s.id + '" data-amount="' + s.guide_amount_cents + '">#' + s.id + ' · ' +
              (s.reservation_id || '') + ' · ' + (s.guide_name || '') + ' · ' + fmtMoney(s.guide_amount_cents || 0) + '</option>';
          }).join('') + '</select></div>' +
          '<div class="gcv-dash-field-row">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor pago (R$)</label><input class="gcv-dash-input" id="po-amount" type="number" step="0.01" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Data</label><input class="gcv-dash-input" id="po-date" type="date" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Hora</label><input class="gcv-dash-input" id="po-time" type="time" /></div>' +
          '</div>' +
          '<div class="gcv-dash-field-row">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX</label><input class="gcv-dash-input" id="po-pix" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo</label><select class="gcv-dash-select" id="po-type"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></div>' +
          '</div>' +
          '<div class="gcv-dash-field-row">' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">TxID</label><input class="gcv-dash-input" id="po-txid" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">EndToEndId</label><input class="gcv-dash-input" id="po-e2e" /></div>' +
          '</div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Comprovante (URL)</label><input class="gcv-dash-input" id="po-receipt" /></div>' +
          '<div class="gcv-dash-field"><label class="gcv-dash-label">Observação</label><textarea class="gcv-dash-textarea" id="po-notes"></textarea></div>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="po-save">Registrar repasse</button>' +
          '<div id="po-msg" class="gcv-dash-alert" hidden style="margin-top:0.75rem;"></div>';

        var first = sales[0];
        if (first) {
          document.getElementById('po-amount').value = ((first.guide_amount_cents || 0) / 100).toFixed(2);
          if (first.guide_pix_key) document.getElementById('po-pix').value = first.guide_pix_key;
          if (first.guide_pix_key_type) document.getElementById('po-type').value = first.guide_pix_key_type;
        }
        var now = new Date();
        document.getElementById('po-date').value = now.toISOString().substr(0, 10);
        document.getElementById('po-time').value = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);

        document.getElementById('po-sale').onchange = function () {
          var opt = this.options[this.selectedIndex];
          var cents = parseInt(opt.getAttribute('data-amount'), 10) || 0;
          document.getElementById('po-amount').value = (cents / 100).toFixed(2);
        };

        document.getElementById('po-save').onclick = function () {
          var msg = document.getElementById('po-msg');
          post('/api/admin/sale-payouts.php', {
            action: 'register_pix',
            sale_id: parseInt(document.getElementById('po-sale').value, 10),
            amount: parseFloat(document.getElementById('po-amount').value),
            date: document.getElementById('po-date').value,
            time: document.getElementById('po-time').value,
            pix_key: document.getElementById('po-pix').value.trim(),
            pix_key_type: document.getElementById('po-type').value,
            txid: document.getElementById('po-txid').value.trim(),
            end_to_end_id: document.getElementById('po-e2e').value.trim(),
            receipt_url: document.getElementById('po-receipt').value.trim(),
            notes: document.getElementById('po-notes').value.trim(),
          }, function (err2, res2) {
            msg.hidden = false;
            if (!res2 || !res2.ok) {
              msg.className = 'gcv-dash-alert gcv-dash-alert--warning';
              msg.textContent = (res2 && res2.error) || 'Erro ao registrar';
              return;
            }
            msg.className = 'gcv-dash-alert gcv-dash-alert--info';
            msg.textContent = 'Repasse registrado com sucesso.';
            refresh();
          });
        };
      });
    };

    refresh();
  }

  function refreshApprovalBadge() {
    get('/api/admin/excursion-approvals.php', function (err, res) {
      var n = (res && res.ok && res.data && res.data.pending) ? res.data.pending.length : 0;
      var link = document.querySelector('#gcv-dash-nav-list [data-section="section-cms-excursions"]');
      if (!link) return;
      link.innerHTML = '🚌 Excursões' + (n ? ' <span class="gcv-dash-nav-badge">' + n + '</span>' : '');
    });
  }

  function refreshGuideBadge() {
    get('/api/admin/pending-guides.php', function (err, res) {
      var guides = (res && res.ok && res.data && res.data.guides) || [];
      var n = guides.filter(function (g) {
        return String(g.status || '') === 'pending';
      }).length;
      var link = document.querySelector('#gcv-dash-nav-list [data-section="section-cms-guides"]');
      if (!link) return;
      var label = n > 99 ? '99+' : String(n);
      link.innerHTML = '🧭 Guias credenciados' +
        (n ? ' <span class="gcv-dash-nav-badge" aria-label="' + n + ' cadastros aguardando aprovação">' + label + '</span>' : '');
    });
  }

  function loadExcursionApprovals() {
    var root = document.getElementById('admin-approvals-content');
    if (!root) return;
    root.innerHTML = 'Carregando…';
    get('/api/admin/excursion-approvals.php', function (err, res) {
      if (!res || !res.ok) {
        root.innerHTML = '<div class="gcv-dash-alert">Erro ao carregar aprovações.</div>';
        return;
      }
      var pending = (res.data && res.data.pending) || [];
      if (!pending.length) {
        root.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma excursão aguardando aprovação.</div>';
        return;
      }
      root.innerHTML = pending.map(function (ex) {
        return '<div class="gcv-dash-pending-card" data-id="' + ex.id + '" style="margin-bottom:1rem;">' +
          '<div class="gcv-dash-pending-card__title">' + (ex.attraction_title || ('Excursão #' + ex.id)) + '</div>' +
          '<div class="gcv-dash-pending-card__meta">Guia: ' + (ex.guide_name || '—') +
          ' · ' + (ex.date_iso || '') + ' ' + String(ex.departure_time || '').slice(0, 5) +
          ' · Líquido guia: ' + fmtMoney(ex.guide_net_cents || 0) +
          ' · Preço final: ' + fmtMoney(ex.price_cents || 0) +
          ' · Comissão: ' + (ex.commission_pct_applied || '—') + '%</div>' +
          '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.6rem;">' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" data-act="approve">Aprovar</button>' +
          '<button type="button" class="gcv-dash-btn" data-act="reject">Rejeitar</button>' +
          '<button type="button" class="gcv-dash-btn" data-act="request_changes">Solicitar alterações</button>' +
          '<button type="button" class="gcv-dash-btn" data-act="edit_and_approve">Editar e Aprovar</button>' +
          '</div></div>';
      }).join('');

      root.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('[data-id]');
          var id = parseInt(card.getAttribute('data-id'), 10);
          var action = btn.getAttribute('data-act');
          var payload = { id: id, action: action };
          if (action === 'reject') {
            var reason = prompt('Motivo da rejeição:');
            if (!reason) return;
            payload.rejection_reason = reason;
          }
          if (action === 'request_changes') {
            var note = prompt('Alterações solicitadas:');
            if (!note) return;
            payload.approval_note = note;
          }
          if (action === 'edit_and_approve') {
            var price = prompt('Preço final por pessoa (R$) — deixe vazio para manter:');
            var net = prompt('Valor líquido do guia (R$) — deixe vazio para manter:');
            if (price) payload.price_cents = Math.round(parseFloat(price) * 100);
            if (net) {
              payload.guide_net_cents = Math.round(parseFloat(net) * 100);
              payload.guide_payout_planned_cents = payload.guide_net_cents;
            }
          }
          btn.disabled = true;
          post('/api/admin/excursion-approvals.php', payload, function (e2, r2) {
            btn.disabled = false;
            if (!r2 || !r2.ok) {
              showDashToast({
                type: 'error',
                title: 'Não foi possível concluir',
                message: (r2 && r2.error) || 'Tente novamente em instantes.',
              });
              return;
            }
            var successByAction = {
              approve: {
                title: 'Excursão aprovada',
                message: 'A saída foi publicada e o guia foi avisado no WhatsApp cadastrado.',
              },
              reject: {
                title: 'Excursão rejeitada',
                message: 'O guia foi avisado no WhatsApp com a justificativa informada.',
              },
              request_changes: {
                title: 'Alterações solicitadas',
                message: 'A excursão voltou para rascunho com sua orientação.',
              },
              edit_and_approve: {
                title: 'Editada e aprovada',
                message: 'Os ajustes foram salvos, a saída foi publicada e o guia foi avisado no WhatsApp.',
              },
            };
            var copy = successByAction[action] || {
              title: 'Ação concluída',
              message: 'A aprovação foi atualizada com sucesso.',
            };
            showDashToast({ type: 'success', title: copy.title, message: copy.message });
            loadExcursionApprovals();
            refreshApprovalBadge();
          });
        });
      });
    });
  }

  function loadCommissionRules() {
    var root = document.getElementById('admin-commission-content');
    if (!root) return;
    root.innerHTML = 'Carregando…';
    get('/api/admin/commission-rules.php', function (err, res) {
      if (!res || !res.ok) {
        root.innerHTML = '<div class="gcv-dash-alert">Erro ao carregar regras.</div>';
        return;
      }
      var rules = (res.data && res.data.rules) || [];
      root.innerHTML =
        '<p class="gcv-dash-hint">Prioridade: Excursão → Guia → Categoria → Cidade → Global. Padrão: 10%.</p>' +
        '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr><th>Escopo</th><th>ID</th><th>%</th><th>Label</th><th>Ativa</th></tr></thead><tbody>' +
        rules.map(function (r) {
          return '<tr><td>' + r.scope_type + '</td><td>' + (r.scope_id || '—') + '</td><td>' + r.commission_pct +
            '</td><td>' + (r.label || '—') + '</td><td>' + (r.is_active == 1 ? 'sim' : 'não') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<h3 style="margin-top:1rem;">Nova regra</h3>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Escopo</label><select class="gcv-dash-select" id="cr-scope"><option value="global">global</option><option value="guide">guide</option><option value="city">city</option><option value="category">category</option><option value="excursion">excursion</option></select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Scope ID</label><input class="gcv-dash-input" id="cr-sid" type="number" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">%</label><input class="gcv-dash-input" id="cr-pct" type="number" step="0.001" value="10" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Label</label><input class="gcv-dash-input" id="cr-label" /></div>' +
        '</div>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cr-save">Salvar regra</button>' +
        '<div id="cr-msg" class="gcv-dash-alert" hidden style="margin-top:0.75rem;"></div>';

      document.getElementById('cr-save').onclick = function () {
        post('/api/admin/commission-rules.php', {
          scope_type: document.getElementById('cr-scope').value,
          scope_id: parseInt(document.getElementById('cr-sid').value, 10) || null,
          commission_pct: parseFloat(document.getElementById('cr-pct').value),
          label: document.getElementById('cr-label').value.trim() || null,
          is_active: true,
        }, function (e2, r2) {
          var msg = document.getElementById('cr-msg');
          msg.hidden = false;
          msg.className = 'gcv-dash-alert ' + (r2 && r2.ok ? 'gcv-dash-alert--info' : 'gcv-dash-alert--warning');
          msg.textContent = (r2 && r2.ok) ? 'Regra salva.' : ((r2 && r2.error) || 'Erro');
          if (r2 && r2.ok) loadCommissionRules();
        });
      };
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

  function dashTabIcon(kind) {
    var svg = {
      agenda:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      publish:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      profile:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      money:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
    };
    return svg[kind] || '';
  }

  function buildNav(role, status) {
    var navList = document.getElementById('gcv-dash-nav-list');
    if (!navList) return;
    var isAdmin = role === 'admin';
    var items = [];

    var footerItems = [];
    var profileItem = {
      id: 'section-guide-profile',
      icon: '👤',
      label: 'Meu perfil',
      tab: 'Perfil',
      tabIcon: 'profile',
      load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideProfile(); }
    };
    var clientProfileItem = {
      id: 'section-client-profile',
      icon: '👤',
      label: 'Meu perfil',
      load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientProfile(); }
    };

    if (isAdmin) {
      items = [
        { id: 'section-cms-articles',      icon: '📰', label: 'Revista',           load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('articles'); } },
        { id: 'section-cms-attractions',   icon: '🏞️', label: 'Atrativos',         load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('attractions'); } },
        { id: 'section-cms-guides',        icon: '🧭', label: 'Guias credenciados', load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('guides'); } },
        { id: 'section-admin-broadcast',   icon: '📣', label: 'Broadcast',         load: loadBroadcast      },
        { id: 'section-admin-messages',    icon: '💬', label: 'Mensagens',         load: loadMessages       },
        { id: 'section-cms-cities',        icon: '📍', label: 'Cidades',           load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('cities'); } },
        { id: 'section-cms-excursions',    icon: '🚌', label: 'Excursões',         load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('excursions'); } },
        { id: 'section-admin-payouts',     icon: '💸', label: 'Pagamentos',        load: loadAdminPayouts   },
        { id: 'section-admin-bookings',    icon: '📋', label: 'Todas as reservas', load: loadAdminBookings  },
        { id: 'section-admin-financial',   icon: '💰', label: 'Financeiro',        load: loadFinancial      },
        { id: 'section-admin-settings',    icon: '⚙️', label: 'Configurações',     load: loadSettings       },
      ];
      footerItems = [profileItem];
    } else if (role === 'guide' && status === 'active') {
      items = [
        { id: 'section-guide-create-tour',  icon: '➕', label: 'Publicar passeio',  tab: 'Publicar',   tabIcon: 'publish', load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuidePublish(); } },
        { id: 'section-guide-tours',        icon: '📅', label: 'Agenda',            tab: 'Agenda',      tabIcon: 'agenda',  load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideAgenda(); } },
        { id: 'section-guide-financial',    icon: '💲', label: 'Financeiro',       tab: 'Financeiro', tabIcon: 'money',   load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideEarnings(); } },
      ];
      footerItems = [profileItem];
    } else if (role === 'guide' && (status === 'pending' || status === 'suspended')) {
      footerItems = [profileItem];
    } else if (role === 'client') {
      items = [
        { id: 'section-client-tours',    icon: '🌿', label: 'Próximos passeios', load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientUpcoming(); } },
        { id: 'section-client-bookings', icon: '📋', label: 'Minhas reservas',   load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientBookings(); } },
        { id: 'section-client-publish',  icon: '➕', label: 'Propor excursão',   load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientPublish(); } },
        { id: 'section-inbox',           icon: '🔔', label: 'Notificações',      load: function () { if (window.GcvInbox) window.GcvInbox.open(); } },
      ];
      footerItems = [clientProfileItem];
    }

    var allItems = items.concat(footerItems);

    navList.innerHTML = items.map(function (item) {
      return '<li><a href="#" data-section="' + item.id + '">' + item.icon + ' ' + item.label + '</a></li>';
    }).join('');

    var footerList = document.getElementById('gcv-dash-nav-footer');
    if (footerList) {
      Array.prototype.slice.call(footerList.querySelectorAll('[data-section]')).forEach(function (a) {
        var li = a.closest('li');
        if (li) li.remove();
      });
      var logoutLi = footerList.querySelector('#gcv-dash-logout');
      logoutLi = logoutLi ? logoutLi.closest('li') : null;
      footerItems.forEach(function (item) {
        var li = document.createElement('li');
        li.innerHTML = '<a href="#" data-section="' + item.id + '">' + item.icon + ' ' + item.label + '</a>';
        if (logoutLi) footerList.insertBefore(li, logoutLi);
        else footerList.appendChild(li);
      });
    }

    var loadMap = {};
    allItems.forEach(function (item) { loadMap[item.id] = item.load; });
    dashLoadMap = loadMap;

    function onNavClick(e) {
      var link = e.target.closest('[data-section]');
      if (!link) return;
      e.preventDefault();
      requestSection(link.getAttribute('data-section'));
    }

    navList.addEventListener('click', onNavClick);
    if (footerList) footerList.onclick = onNavClick;

    var tabBar = document.getElementById('gcv-dash-bottom-nav');
    var tabList = document.getElementById('gcv-dash-bottom-nav-list');
    var useTabBar = role === 'guide' && status === 'active' && allItems.length === 4;
    document.body.classList.toggle('gcv-dash-page--tabbar', useTabBar);
    if (tabBar && tabList) {
      if (useTabBar) {
        tabBar.removeAttribute('hidden');
        tabBar.hidden = false;
        if (tabBar.parentNode !== document.body) {
          document.body.appendChild(tabBar);
        }
        tabList.innerHTML = allItems.map(function (item) {
          var fullLabel = item.label || item.tab || '';
          return (
            '<li><a href="#" data-section="' + item.id + '" aria-label="' + fullLabel + '">' +
            dashTabIcon(item.tabIcon) +
            '<span>' + (item.tab || item.label) + '</span></a></li>'
          );
        }).join('');
        tabList.onclick = onNavClick;
      } else {
        tabBar.setAttribute('hidden', '');
        tabBar.hidden = true;
        tabList.innerHTML = '';
        tabList.onclick = null;
      }
    }

    if (allItems.length) {
      var wantScan = window.GcvDashRoles && typeof window.GcvDashRoles.consumeCheckinHash === 'function'
        && window.GcvDashRoles.consumeCheckinHash();
      if (!wantScan) {
        var stored = '';
        try { stored = sessionStorage.getItem('gcv_dash_section') || ''; } catch (e) { stored = ''; }
        var openId = sectionForHash(location.hash) || (loadMap[stored] ? stored : '');
        if (!openId || !loadMap[openId]) {
          openId = (role === 'guide' && status === 'active' && loadMap['section-guide-tours'])
            ? 'section-guide-tours'
            : allItems[0].id;
        }
        showSection(openId);
        if (loadMap[openId]) loadMap[openId]();
      }
    }
    if (role === 'admin') {
      refreshApprovalBadge();
      refreshGuideBadge();
      if (!window.__gcvGuideBadgeTimer) {
        window.__gcvGuideBadgeTimer = setInterval(refreshGuideBadge, 30000);
      }
    }
  }

  /* ===== INIT ===== */

  function init() {
    var loading = document.getElementById('gcv-dash-loading');
    var app     = document.getElementById('gcv-dash-app');

    var asQ = '';
    try {
      asQ = new URLSearchParams(location.search).get('as') || sessionStorage.getItem('gcv_porta') || '';
    } catch (e0) {}
    var meUrl = '/api/auth/me.php?t=' + Date.now() + (asQ ? ('&as=' + encodeURIComponent(asQ)) : '');
    get(meUrl, function (err, res) {
      console.log('[dashboard] me.php:', err, JSON.stringify(res));
      if (err || !res || !res.ok) {
        var as = '';
        try {
          as = (window.GcvPorta && window.GcvPorta.current())
            || new URLSearchParams(location.search).get('as')
            || '';
        } catch (e2) {}
        as = String(as || '').toLowerCase();
        var next = '/dashboard/' + (as ? ('?as=' + encodeURIComponent(as)) : '') + (location.hash || '');
        window.location.href = (as === 'admin' || /\/admin\//.test(document.referrer || ''))
          ? '/admin/login.html?redirect=' + encodeURIComponent(next)
          : '/guia/login.html?redirect=' + encodeURIComponent(next);
        return;
      }
      currentUser = res.data;
      var tabRole = currentUser.role || currentUser.active_role || '';
      if (tabRole === 'guide' && !currentUser.email_verified) {
        window.location.href = '/guia/confirmar-email.html?email=' + encodeURIComponent(currentUser.email || '');
        return;
      }
      document.body.classList.toggle(
        'gcv-dash-page--guide-locked',
        tabRole === 'guide' && currentUser.status !== 'active'
      );
      if (tabRole === 'admin' && window.GcvAdminCms && typeof window.GcvAdminCms.boot === 'function') {
        window.GcvAdminCms.boot();
      }

      if (app) app.hidden = false;

      // Fill sidebar
      var nameEl   = document.getElementById('dash-name');
      var roleEl   = document.getElementById('dash-role');
      var avatarEl = document.getElementById('dash-avatar');
      var roleMap  = { admin: 'Administrador', guide: 'Guia', client: 'Cliente' };

      if (nameEl)   nameEl.textContent   = currentUser.name || '';
      if (roleEl) {
        var displayRole = tabRole || currentUser.role;
        var label = roleMap[displayRole] || displayRole;
        var extras = (currentUser.roles || []).filter(function (r) { return r !== displayRole; });
        if (extras.length) {
          label += ' · também: ' + extras.map(function (r) { return roleMap[r] || r; }).join(', ');
        }
        roleEl.textContent = label;
      }
      if (avatarEl) {
        if (currentUser.avatar_url) {
          avatarEl.innerHTML = '<img src="' + currentUser.avatar_url + '" alt="Avatar" />';
        } else {
          avatarEl.textContent = (currentUser.name || '?').charAt(0).toUpperCase();
        }
      }
      if ((currentUser.role === 'guide' || (currentUser.roles || []).indexOf('guide') >= 0) && !currentUser.avatar_url) {
        get('/api/guides/me-profile.php', function (_e, r) {
          var p = r && r.data && r.data.profile;
          var url = p && (p.photo_3x4_url || p.photo_url || p.avatar_url);
          if (url && avatarEl) avatarEl.innerHTML = '<img src="' + url + '" alt="Avatar" />';
        });
      }

      buildNav(tabRole || currentUser.role, currentUser.status);
      document.querySelectorAll('[data-wa-tab]').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
          e.preventDefault();
          requestSection(tab.getAttribute('data-wa-tab') === 'inbox'
            ? 'section-admin-messages'
            : 'section-admin-broadcast');
        });
      });
      window.addEventListener('hashchange', function () {
        if (window.GcvDashRoles && typeof window.GcvDashRoles.consumeCheckinHash === 'function') {
          if (window.GcvDashRoles.consumeCheckinHash()) return;
        }
        var openId = sectionForHash(location.hash);
        if (!openId || !dashLoadMap[openId]) return;
        dashHashLock = true;
        requestSection(openId, true);
        dashHashLock = false;
      });
      if (window.GcvInbox && typeof window.GcvInbox.start === 'function'
          && !(currentUser.role === 'guide' && currentUser.status !== 'active')) {
        window.GcvInbox.start();
      }

      // Logout
      document.querySelectorAll('.js-gcv-dash-logout').forEach(function (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/auth/logout.php');
          xhr.onload = function () { window.location.href = '/index.html'; };
          xhr.send();
        });
      });

      // Mobile menu toggle
      var toggle  = document.getElementById('gcv-dash-menu-toggle');
      var navArea = document.getElementById('gcv-dash-nav');
      if (toggle && navArea) {
        toggle.addEventListener('click', function () {
          var open = navArea.classList.toggle('open');
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          toggle.textContent = open ? '✕ Fechar' : '☰ Menu';
        });
      }

      var main = document.getElementById('gcv-dash-main');
      if (main && typeof MutationObserver === 'function') {
        labelDashTables(main);
        new MutationObserver(function () { labelDashTables(main); })
          .observe(main, { childList: true, subtree: true });
      }

      // Check PIX/Sicoob notification (legado: mp_connected)
      var params = new URLSearchParams(window.location.search);
      if (params.get('mp_connected') || params.get('pix_ok')) {
        params.delete('mp_connected');
        params.delete('pix_ok');
        var q = params.toString();
        window.history.replaceState({}, '', location.pathname + (q ? '?' + q : '') + (location.hash || ''));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GcvDashboard = {
    refreshApprovalBadge: refreshApprovalBadge,
    refreshGuideBadge: refreshGuideBadge,
    loadPendingGuides: loadPendingGuides,
    showSection: requestSection
  };
}());

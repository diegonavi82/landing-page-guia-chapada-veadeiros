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
    if (id === 'section-pending-guides') id = 'section-cms-guides';
    var visibleId = id === 'section-guide-create-tour' ? 'section-guide-tours' : id;
    document.querySelectorAll('.gcv-dash-section').forEach(function (s) { s.classList.remove('active'); });
    var s = document.getElementById(visibleId);
    if (s) s.classList.add('active');
    document.querySelectorAll('.gcv-dash-nav a, .gcv-dash-bottom-nav a').forEach(function (a) { a.classList.remove('active'); });
    document.querySelectorAll('[data-section="' + id + '"]').forEach(function (link) {
      link.classList.add('active');
    });
    closeMobileNav();
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
    return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
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
    if (hist) hist.innerHTML = '<p>Carregando…</p>';
    get('/api/admin/guide-payouts.php', function (err, res) {
      if (err || !res || !res.ok) {
        if (hist) hist.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar pagamentos.</p>';
        return;
      }
      var eligible = (res.data && res.data.eligible_guides) || [];
      var payouts = (res.data && res.data.payouts) || [];
      if (select) {
        select.innerHTML = '<option value="">Selecione…</option>' + eligible.map(function (g) {
          return '<option value="' + g.user_id + '">' + escapeHtml(g.name) + ' — ' + escapeHtml(g.pix_key) + '</option>';
        }).join('');
        if (!eligible.length) {
          select.innerHTML = '<option value="">Nenhum guia com PIX verificado</option>';
        }
      }
      if (hist) {
        if (!payouts.length) {
          hist.innerHTML = '<p>Nenhum pagamento ainda.</p>';
        } else {
          hist.innerHTML =
            '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr>' +
            '<th>ID</th><th>Guia</th><th>Valor</th><th>PIX</th><th>Status</th><th>Quando</th></tr></thead><tbody>' +
            payouts.map(function (p) {
              return '<tr><td>' + p.id + '</td><td>' + escapeHtml(p.guide_name || '') +
                '</td><td>' + fmtMoney(p.amount_cents) + '</td><td style="font-size:0.8rem;">' +
                escapeHtml(p.pix_key_snapshot || '') + '</td><td>' + statusBadge(p.status) +
                '</td><td style="font-size:0.8rem;">' + escapeHtml(p.created_at || '') + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        }
      }
    });

    var form = document.getElementById('admin-payout-form');
    if (form && !form._gcvBound) {
      form._gcvBound = true;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var guideId = parseInt(document.getElementById('payout-guide').value, 10);
        var amount = parseFloat(document.getElementById('payout-amount').value);
        var description = document.getElementById('payout-desc').value;
        if (!guideId || !(amount >= 1)) {
          alert('Selecione um guia e informe valor ≥ R$ 1,00');
          return;
        }
        post('/api/admin/guide-payouts.php', {
          action: 'create',
          guide_user_id: guideId,
          amount: amount,
          description: description,
        }, function (e2, r2) {
          if (!r2 || !r2.ok) {
            alert((r2 && r2.error) || 'Erro ao criar rascunho');
            return;
          }
          var d = r2.data || {};
          if (!draftBox) return;
          draftBox.hidden = false;
          draftBox.innerHTML =
            '<p><strong>Rascunho #' + d.payout_id + '</strong></p>' +
            '<p>Guia: ' + escapeHtml(d.guide_name || '') + '<br>PIX: <code>' + escapeHtml(d.pix_key || '') +
            '</code><br>Valor: <strong>' + fmtMoney(d.amount_cents || 0) + '</strong></p>' +
            '<p style="font-size:0.85rem;color:#92400e;">Digite <strong>PAGAR</strong> para confirmar o envio via Sicoob.</p>' +
            '<input class="gcv-dash-input" id="payout-confirm-text" type="text" placeholder="PAGAR" style="max-width:160px;margin-bottom:0.5rem;" />' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="payout-confirm-btn">Confirmar e enviar PIX</button>' +
            '<button type="button" class="gcv-dash-btn" id="payout-cancel-btn">Cancelar rascunho</button></div>';
          document.getElementById('payout-confirm-btn').onclick = function () {
            var txt = document.getElementById('payout-confirm-text').value;
            post('/api/admin/guide-payouts.php', {
              action: 'confirm',
              payout_id: d.payout_id,
              confirm_text: txt,
            }, function (e3, r3) {
              alert(r3 && r3.ok ? (r3.data.message || 'PIX enviado') : ((r3 && r3.error) || 'Falha'));
              if (r3 && r3.ok) {
                draftBox.hidden = true;
                form.reset();
              }
              loadAdminPayouts();
            });
          };
          document.getElementById('payout-cancel-btn').onclick = function () {
            post('/api/admin/guide-payouts.php', { action: 'cancel', payout_id: d.payout_id }, function () {
              draftBox.hidden = true;
              loadAdminPayouts();
            });
          };
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
    showSection('section-cms-guides');
    if (window.GcvAdminCms) window.GcvAdminCms.open('guides');
  }

  function loadAdminBookings() {
    var tbody = document.getElementById('admin-bookings-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Carregando…</td></tr>';
    get('/api/admin/bookings.php', function (err, res) {
      if (!res || !res.ok) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Erro ao carregar reservas.</td></tr>';
        return;
      }
      var rows = (res.data && res.data.bookings) || [];
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Nenhuma reserva ainda.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function (b) {
        var code = b.reservation_id || ('#' + b.id);
        var when = String(b.created_at || '').replace('T', ' ').substr(0, 10);
        return '<tr>'
          + '<td>' + escapeHtml(code) + '</td>'
          + '<td>' + escapeHtml(b.tour_title || '') + '</td>'
          + '<td>' + escapeHtml(b.client_name || '') + '</td>'
          + '<td>' + escapeHtml(b.guide_name || '') + '</td>'
          + '<td>' + b.spots + '</td>'
          + '<td>' + fmtMoney(b.total_cents) + '</td>'
          + '<td>' + statusBadge(b.status) + '</td>'
          + '<td>' + escapeHtml(when) + '</td>'
          + '</tr>';
      }).join('');
    });
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
      payout_delay_hours: 'finance'
    };
    var groupMeta = {
      notify: {
        title: 'Notificações de passeio',
        hint: 'WhatsApp, e-mail e o sino do painel usam estes prazos. 0 em “chegada” desliga o aviso de 15 minutos.'
      },
      finance: {
        title: 'Financeiro e repasse',
        hint: 'A diária máxima é o valor que o guia pode pedir por pessoa. Com transporte incluso o teto sobe. Ainda entra a taxa da plataforma e o arredondamento (5 e 8). Dragão pode ter teto próprio sem transporte.'
      },
      other: { title: 'Outras', hint: '' }
    };
    get('/api/admin/settings.php', function (err, res) {
      if (!res || !res.ok) return;
      var buckets = { notify: [], finance: [], other: [] };
      (res.data.settings || []).forEach(function (s) {
        var g = groupOf[s.key_name] || 'other';
        buckets[g].push(s);
      });
      form.innerHTML = '';
      ['notify', 'finance', 'other'].forEach(function (gid) {
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
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>'
    };
    return svg[kind] || '';
  }

  function buildNav(role, status) {
    var navList = document.getElementById('gcv-dash-nav-list');
    if (!navList) return;
    var isAdmin = role === 'admin';
    var items = [];

    if (isAdmin) {
      items = [
        { id: 'section-cms-articles',      icon: '📰', label: 'Revista',           load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('articles'); } },
        { id: 'section-cms-attractions',   icon: '🏞️', label: 'Atrativos',         load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('attractions'); } },
        { id: 'section-cms-guides',        icon: '🧭', label: 'Guias credenciados', load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('guides'); } },
        { id: 'section-cms-cities',        icon: '📍', label: 'Cidades',           load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('cities'); } },
        { id: 'section-cms-excursions',    icon: '🚌', label: 'Excursões',         load: function () { if (window.GcvAdminCms) window.GcvAdminCms.open('excursions'); } },
        { id: 'section-admin-payouts',     icon: '💸', label: 'Pagar guias',       load: loadAdminPayouts   },
        { id: 'section-admin-create-tour', icon: '➕', label: 'Criar passeio',     load: function () { loadGuidesList(); initCreateTourForm('gcv-create-tour-form'); document.getElementById('admin-guide-field').hidden = false; } },
        { id: 'section-admin-bookings',    icon: '📋', label: 'Todas as reservas', load: loadAdminBookings  },
        { id: 'section-admin-settings',    icon: '⚙️', label: 'Configurações',     load: loadSettings       },
        { id: 'section-admin-financial',   icon: '💰', label: 'Financeiro',        load: loadFinancial      },
        { id: 'section-guide-profile',     icon: '👤', label: 'Meu perfil',        load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideProfile(); } },
      ];
    } else if (role === 'guide' && status === 'active') {
      items = [
        { id: 'section-guide-create-tour',  icon: '➕', label: 'Publicar passeio',  tab: 'Publicar',   tabIcon: 'publish', load: function () { if (window.GcvDashRoles) { window.GcvDashRoles.loadGuidePublish(); window.GcvDashRoles.loadGuideAgenda(); } } },
        { id: 'section-guide-tours',        icon: '📅', label: 'Agenda',            tab: 'Agenda',      tabIcon: 'agenda',  load: function () { if (window.GcvDashRoles) { window.GcvDashRoles.loadGuidePublish(); window.GcvDashRoles.loadGuideAgenda(); } } },
        { id: 'section-guide-financial',    icon: '🏦', label: 'Financeiro',       tab: 'Financeiro', tabIcon: 'money',   load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideEarnings(); } },
        { id: 'section-guide-profile',      icon: '👤', label: 'Meu perfil',        tab: 'Perfil',     tabIcon: 'profile', load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideProfile(); } },
      ];
    } else if (role === 'guide' && (status === 'pending' || status === 'suspended')) {
      items = [
        { id: 'section-guide-profile', icon: '👤', label: 'Meu perfil', load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadGuideProfile(); } },
      ];
    } else if (role === 'client') {
      items = [
        { id: 'section-client-tours',    icon: '🌿', label: 'Próximos passeios', load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientUpcoming(); } },
        { id: 'section-client-bookings', icon: '📋', label: 'Minhas reservas',   load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientBookings(); } },
        { id: 'section-client-publish',  icon: '➕', label: 'Propor excursão',   load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientPublish(); } },
        { id: 'section-client-profile',  icon: '👤', label: 'Meu perfil',        load: function () { if (window.GcvDashRoles) window.GcvDashRoles.loadClientProfile(); } },
        { id: 'section-inbox',           icon: '🔔', label: 'Notificações',      load: function () { if (window.GcvInbox) window.GcvInbox.open(); } },
      ];
    }

    navList.innerHTML = items.map(function (item) {
      return '<li><a href="#" data-section="' + item.id + '">' + item.icon + ' ' + item.label + '</a></li>';
    }).join('');

    var loadMap = {};
    items.forEach(function (item) { loadMap[item.id] = item.load; });

    function onNavClick(e) {
      var link = e.target.closest('[data-section]');
      if (!link) return;
      e.preventDefault();
      var sId = link.getAttribute('data-section');
      showSection(sId);
      if (loadMap[sId]) loadMap[sId]();
      if (sId === 'section-guide-create-tour') {
        var pubBox = document.getElementById('guide-agenda-publish');
        if (pubBox && pubBox.scrollIntoView) pubBox.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }

    navList.addEventListener('click', onNavClick);

    var tabBar = document.getElementById('gcv-dash-bottom-nav');
    var tabList = document.getElementById('gcv-dash-bottom-nav-list');
    var useTabBar = role === 'guide' && status === 'active' && items.length === 4;
    document.body.classList.toggle('gcv-dash-page--tabbar', useTabBar);
    if (tabBar && tabList) {
      if (useTabBar) {
        tabBar.removeAttribute('hidden');
        tabBar.hidden = false;
        if (tabBar.parentNode !== document.body) {
          document.body.appendChild(tabBar);
        }
        tabList.innerHTML = items.map(function (item) {
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

    // Show first section
    if (items.length) {
      var wantScan = window.GcvDashRoles && typeof window.GcvDashRoles.consumeCheckinHash === 'function'
        && window.GcvDashRoles.consumeCheckinHash();
      var hash = (location.hash || '').replace(/^#/, '');
      var wantPublish = role === 'guide' && status === 'active'
        && (hash === 'publicar' || hash === 'section-guide-create-tour');
      if (!wantScan && wantPublish) {
        showSection('section-guide-create-tour');
        if (loadMap['section-guide-create-tour']) loadMap['section-guide-create-tour']();
        var pubBox = document.getElementById('guide-agenda-publish');
        if (pubBox && pubBox.scrollIntoView) pubBox.scrollIntoView({ block: 'start' });
      } else if (!wantScan) {
        showSection(items[0].id);
        if (loadMap[items[0].id]) loadMap[items[0].id]();
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
      window.addEventListener('hashchange', function () {
        if (window.GcvDashRoles && typeof window.GcvDashRoles.consumeCheckinHash === 'function') {
          window.GcvDashRoles.consumeCheckinHash();
        }
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
        window.history.replaceState({}, '', '/dashboard/');
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
    showSection: showSection
  };
}());

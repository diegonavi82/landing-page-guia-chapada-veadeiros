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
      catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(JSON.stringify(data || {}));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(cents) {
    return 'R$ ' + ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',');
  }

  function lifeBadge(code, label) {
    var cls = 'gcv-life gcv-life--' + (code || 'na');
    return '<span class="' + cls + '">' + esc(label || code) + '</span>';
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

  /* ---------- GUIA: PERFIL ---------- */
  function loadGuideProfile() {
    var root = document.getElementById('guide-profile-root');
    if (!root) return;
    root.innerHTML = 'Carregando perfil…';
    get('/api/guides/me-profile.php', function (err, res) {
      if (!res || !res.ok) {
        root.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar perfil.</p>';
        return;
      }
      var d = res.data || {};
      var p = d.profile || {};
      var cities = d.base_cities || [];
      var limits = d.limits || { bio_max: 800, bio_recommended: 600 };
      var missing = d.missing || [];
      var complete = !!d.complete;

      root.innerHTML =
        (complete
          ? '<div class="gcv-dash-alert gcv-dash-alert--info">Perfil completo. Você pode publicar passeios.</div>'
          : '<div class="gcv-dash-alert gcv-dash-alert--warning">Complete os campos obrigatórios para publicar passeios.' +
            (missing.length ? ' Faltam: <code>' + esc(missing.join(', ')) + '</code>' : '') + '</div>') +
        '<form class="gcv-dash-form" id="guide-profile-form" novalidate>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome completo *</label>' +
        '<input class="gcv-dash-input" id="gp-full" maxlength="160" value="' + esc(p.full_name || p.user_name || '') + '" required /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Apelido *</label>' +
        '<input class="gcv-dash-input" id="gp-nick" maxlength="80" value="' + esc(p.nickname || '') + '" required /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">E-mail *</label>' +
        '<input class="gcv-dash-input" value="' + esc(p.email || '') + '" disabled /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">CPF *</label>' +
        '<input class="gcv-dash-input" id="gp-cpf" maxlength="14" inputmode="numeric" value="' + esc(p.cpf || '') + '" required /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo chave PIX *</label>' +
        '<select class="gcv-dash-select" id="gp-pix-type">' +
        ['cpf', 'cnpj', 'email', 'phone', 'random'].map(function (t) {
          return '<option value="' + t + '"' + (String(p.pix_key_type) === t ? ' selected' : '') + '>' + t.toUpperCase() + '</option>';
        }).join('') +
        '</select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX *</label>' +
        '<input class="gcv-dash-input" id="gp-pix" maxlength="120" value="' + esc(p.pix_key || '') + '" required /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">DDI *</label>' +
        '<input class="gcv-dash-input" id="gp-ddi" maxlength="8" value="' + esc(p.phone_ddi || '+55') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone (DDD + número) *</label>' +
        '<input class="gcv-dash-input" id="gp-phone" maxlength="13" inputmode="numeric" value="' + esc(p.phone || '') + '" required /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento *</label>' +
        '<input class="gcv-dash-input" id="gp-birth" type="date" value="' + esc(p.birth_date || '') + '" required /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade onde mora *</label>' +
        '<select class="gcv-dash-select" id="gp-city"><option value="">Selecione…</option>' +
        cities.map(function (c) {
          return '<option value="' + c.id + '"' + (String(p.base_city_id) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
        }).join('') +
        '</select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Descrição * <span class="gcv-cms-muted">(recomendado ≤' + limits.bio_recommended + '; máx. ' + limits.bio_max + ')</span></label>' +
        '<textarea class="gcv-dash-textarea" id="gp-bio" maxlength="' + limits.bio_max + '" rows="4">' + esc(p.bio_pt || '') + '</textarea>' +
        '<div class="gcv-cms-muted" id="gp-bio-count"></div></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Documento de identificação *</label>' +
        '<input class="gcv-dash-input" id="gp-doc-url" type="url" value="' + esc(p.id_document_url || p.diploma_url || '') + '" placeholder="URL após upload" />' +
        '<input type="file" id="gp-doc-file" accept="image/*,application/pdf" />' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Foto 3×4 *</label>' +
        '<input class="gcv-dash-input" id="gp-photo-url" type="url" value="' + esc(p.photo_3x4_url || p.photo_url || '') + '" />' +
        '<input type="file" id="gp-photo-file" accept="image/*" />' +
        '</div></div>' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Salvar perfil</button>' +
        '<div id="gp-msg" class="gcv-dash-alert" hidden style="margin-top:1rem;"></div>' +
        '</form>';

      var bio = document.getElementById('gp-bio');
      var bioCount = document.getElementById('gp-bio-count');
      function updateBioCount() {
        if (!bio || !bioCount) return;
        bioCount.textContent = (bio.value || '').length + ' / ' + limits.bio_max + ' (ideal ≤' + limits.bio_recommended + ')';
      }
      if (bio) bio.addEventListener('input', updateBioCount);
      updateBioCount();

      function bindUpload(fileId, urlId) {
        var input = document.getElementById(fileId);
        if (!input) return;
        input.addEventListener('change', function () {
          if (!input.files || !input.files[0]) return;
          uploadFile(input.files[0], function (e, r) {
            if (!r || !r.ok) {
              alert((r && r.error) || 'Falha no upload');
              return;
            }
            var urlEl = document.getElementById(urlId);
            if (urlEl) urlEl.value = (r.data && r.data.url) || '';
          });
        });
      }
      bindUpload('gp-doc-file', 'gp-doc-url');
      bindUpload('gp-photo-file', 'gp-photo-url');

      document.getElementById('guide-profile-form').onsubmit = function (ev) {
        ev.preventDefault();
        var payload = {
          full_name: document.getElementById('gp-full').value.trim(),
          nickname: document.getElementById('gp-nick').value.trim(),
          cpf: document.getElementById('gp-cpf').value.trim(),
          pix_key_type: document.getElementById('gp-pix-type').value,
          pix_key: document.getElementById('gp-pix').value.trim(),
          phone_ddi: document.getElementById('gp-ddi').value.trim(),
          phone: document.getElementById('gp-phone').value.trim(),
          birth_date: document.getElementById('gp-birth').value,
          base_city_id: parseInt(document.getElementById('gp-city').value, 10) || 0,
          bio_pt: document.getElementById('gp-bio').value.trim(),
          id_document_url: document.getElementById('gp-doc-url').value.trim(),
          photo_3x4_url: document.getElementById('gp-photo-url').value.trim(),
        };
        sendJson('PUT', '/api/guides/me-profile.php', payload, function (e, r) {
          var msg = document.getElementById('gp-msg');
          if (!msg) return;
          msg.hidden = false;
          if (!r || !r.ok) {
            msg.className = 'gcv-dash-alert gcv-dash-alert--warning';
            msg.textContent = (r && r.error) || 'Erro ao salvar';
            return;
          }
          msg.className = 'gcv-dash-alert gcv-dash-alert--info';
          msg.textContent = 'Perfil salvo!';
          loadGuideProfile();
        });
      };
    });
  }

  /* ---------- GUIA: AGENDA ---------- */
  function loadGuideAgenda() {
    var highlight = document.getElementById('guide-upcoming-root');
    var list = document.getElementById('guide-tours-list');
    if (highlight) highlight.innerHTML = 'Carregando…';
    if (list) list.innerHTML = 'Carregando…';

    get('/api/guides/excursions.php', function (err, res) {
      if (!res || !res.ok) {
        if (list) list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar agenda.</p>';
        return;
      }
      var upcoming = (res.data && res.data.upcoming) || [];
      var all = (res.data && res.data.excursions) || [];

      if (highlight) {
        if (!upcoming.length) {
          highlight.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhuma saída próxima. Publique um passeio.</div>';
        } else {
          highlight.innerHTML = upcoming.slice(0, 6).map(function (e) {
            return (
              '<article class="gcv-cms-row gcv-guide-upcoming">' +
              '<div><strong>' + esc(e.date_iso) + ' · ' + esc(e.attraction_title || '') + '</strong>' +
              '<div class="gcv-cms-muted">' + esc(e.departure_city_name || '') + ' · ' +
              esc(String(e.departure_time || '').slice(0, 5)) + ' · ' + money(e.price_cents) +
              ' · ' + (e.booked_people || 0) + '/' + (e.quorum || 4) + ' no quórum</div></div>' +
              lifeBadge(e.lifecycle, e.lifecycle_label) +
              '</article>'
            );
          }).join('');
        }
      }

      if (!list) return;
      if (!all.length) {
        list.innerHTML = '<div class="gcv-dash-alert gcv-dash-alert--info">Nenhum passeio na agenda.</div>';
        return;
      }
      list.innerHTML =
        '<div class="gcv-dash-table-wrap"><table class="gcv-dash-table"><thead><tr>' +
        '<th>Data</th><th>Atrativo</th><th>Valor/pessoa</th><th>Inscritos</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        all.map(function (e) {
          return '<tr>' +
            '<td>' + esc(e.date_iso) + ' ' + esc(String(e.departure_time || '').slice(0, 5)) + '</td>' +
            '<td>' + esc(e.attraction_title || '') + '</td>' +
            '<td>' + money(e.price_cents) + '</td>' +
            '<td>' + (e.booked_people || 0) + '/' + (e.max_people || 0) + ' (Q' + (e.quorum || 4) + ')</td>' +
            '<td>' + lifeBadge(e.lifecycle, e.lifecycle_label) + '</td>' +
            '<td>' + (e.can_cancel
              ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-cancel-exc="' + e.id + '">Cancelar</button>'
              : '') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';

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
    });
  }

  /* ---------- GUIA: PUBLICAR ---------- */
  function loadGuidePublish() {
    var form = document.getElementById('gcv-guide-create-tour-form');
    if (!form) return;
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
          'Complete seu <strong>perfil</strong> antes de publicar passeios.</div>';
        return;
      }
      var attrs = d.attractions || [];
      var cities = d.cities || [];
      var minQ = d.min_quorum || 4;

      form.innerHTML =
        '<p class="gcv-dash-hint" style="margin:0 0 1rem;color:#64748b;">Escolha um atrativo já cadastrado pelo admin. Valor é <strong>por pessoa</strong>. Quórum mínimo: ' + minQ + ' (abaixo disso fica em formação).</p>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Atrativo *</label>' +
        '<select class="gcv-dash-select" id="ge-attr" required><option value="">Selecione…</option>' +
        attrs.map(function (a) {
          return '<option value="' + a.id + '">' + esc(a.title_pt) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Data *</label><input class="gcv-dash-input" id="ge-date" type="date" required /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Horário *</label><input class="gcv-dash-input" id="ge-time" type="time" value="08:00" required /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade de saída *</label>' +
        '<select class="gcv-dash-select" id="ge-city" required><option value="">Selecione…</option>' +
        cities.map(function (c) {
          return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor por pessoa (R$) *</label>' +
        '<input class="gcv-dash-input" id="ge-price" type="number" min="1" step="0.01" required /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Quórum *</label>' +
        '<input class="gcv-dash-input" id="ge-quorum" type="number" min="' + minQ + '" value="' + minQ + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Máximo *</label>' +
        '<input class="gcv-dash-input" id="ge-max" type="number" min="' + minQ + '" value="10" /></div>' +
        '</div>' +
        '<label class="gcv-dash-label"><input type="checkbox" id="ge-transport" /> Inclui transporte</label> ' +
        '<label class="gcv-dash-label"><input type="checkbox" id="ge-entry" /> Inclui ingresso</label>' +
        '<div class="gcv-dash-field" style="margin-top:0.75rem;"><label class="gcv-dash-label">Observações</label>' +
        '<textarea class="gcv-dash-textarea" id="ge-notes" maxlength="2000" rows="3"></textarea></div>' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Publicar passeio</button>' +
        '<div id="ge-err" class="gcv-dash-alert gcv-dash-alert--warning" hidden style="margin-top:1rem;"></div>';

      form.onsubmit = function (ev) {
        ev.preventDefault();
        var errEl = document.getElementById('ge-err');
        var price = parseFloat(document.getElementById('ge-price').value);
        var payload = {
          attraction_id: parseInt(document.getElementById('ge-attr').value, 10) || 0,
          date_iso: document.getElementById('ge-date').value,
          departure_time: document.getElementById('ge-time').value,
          departure_city_id: parseInt(document.getElementById('ge-city').value, 10) || 0,
          price_cents: Math.round((price || 0) * 100),
          quorum: parseInt(document.getElementById('ge-quorum').value, 10) || minQ,
          max_people: parseInt(document.getElementById('ge-max').value, 10) || 10,
          include_transport: document.getElementById('ge-transport').checked,
          include_entry: document.getElementById('ge-entry').checked,
          notes_pt: document.getElementById('ge-notes').value.trim(),
        };
        sendJson('POST', '/api/guides/excursions.php', payload, function (e, r) {
          if (errEl) {
            errEl.hidden = false;
            if (!r || !r.ok) {
              errEl.className = 'gcv-dash-alert gcv-dash-alert--warning';
              errEl.textContent = (r && r.error) || 'Erro ao publicar';
              return;
            }
            errEl.className = 'gcv-dash-alert gcv-dash-alert--info';
            errEl.textContent = (r.data && r.data.message) || 'Publicado!';
            form.reset();
            loadGuideAgenda();
          }
        });
      };
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
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">DDI</label>' +
        '<input class="gcv-dash-input" id="cp-ddi" value="' + esc(p.phone_ddi || '+55') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone</label>' +
        '<input class="gcv-dash-input" id="cp-phone" value="' + esc(p.phone || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">CPF</label>' +
        '<input class="gcv-dash-input" id="cp-cpf" value="' + esc(p.cpf || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento</label>' +
        '<input class="gcv-dash-input" id="cp-birth" type="date" value="' + esc(p.birth_date || '') + '" /></div>' +
        '</div>' +
        '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Salvar</button>' +
        '<div id="cp-msg" class="gcv-dash-alert" hidden style="margin-top:1rem;"></div></form>';

      document.getElementById('client-profile-form').onsubmit = function (ev) {
        ev.preventDefault();
        sendJson('PUT', '/api/client/profile.php', {
          name: document.getElementById('cp-name').value.trim(),
          phone_ddi: document.getElementById('cp-ddi').value.trim(),
          phone: document.getElementById('cp-phone').value.trim(),
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
      var attrs = d.attractions || [];
      var cities = d.cities || [];
      var minQ = d.min_quorum || 4;
      var proposals = d.my_proposals || [];

      root.innerHTML =
        '<p class="gcv-dash-hint" style="margin:0 0 1rem;color:#64748b;">Você define o <strong>valor por pessoa</strong>. A proposta fica em rascunho até o admin atribuir o guia e publicar.</p>' +
        '<form class="gcv-dash-form" id="client-pub-form">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Atrativo *</label><select class="gcv-dash-select" id="ce-attr">' +
        '<option value="">Selecione…</option>' +
        attrs.map(function (a) { return '<option value="' + a.id + '">' + esc(a.title_pt) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Data *</label><input class="gcv-dash-input" type="date" id="ce-date" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Hora *</label><input class="gcv-dash-input" type="time" id="ce-time" value="08:00" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Saída *</label><select class="gcv-dash-select" id="ce-city">' +
        '<option value="">Selecione…</option>' +
        cities.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor por pessoa (R$) *</label>' +
        '<input class="gcv-dash-input" type="number" min="1" step="0.01" id="ce-price" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Quórum</label>' +
        '<input class="gcv-dash-input" type="number" min="' + minQ + '" value="' + minQ + '" id="ce-quorum" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Máximo</label>' +
        '<input class="gcv-dash-input" type="number" min="' + minQ + '" value="10" id="ce-max" /></div>' +
        '</div>' +
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

      document.getElementById('client-pub-form').onsubmit = function (ev) {
        ev.preventDefault();
        var price = parseFloat(document.getElementById('ce-price').value);
        sendJson('POST', '/api/client/excursions.php', {
          attraction_id: parseInt(document.getElementById('ce-attr').value, 10) || 0,
          date_iso: document.getElementById('ce-date').value,
          departure_time: document.getElementById('ce-time').value,
          departure_city_id: parseInt(document.getElementById('ce-city').value, 10) || 0,
          price_cents: Math.round((price || 0) * 100),
          quorum: parseInt(document.getElementById('ce-quorum').value, 10) || minQ,
          max_people: parseInt(document.getElementById('ce-max').value, 10) || 10,
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
    loadClientUpcoming: loadClientUpcoming,
    loadClientBookings: loadClientBookingsEnhanced,
    loadClientProfile: loadClientProfile,
    loadClientPublish: loadClientPublish,
  };
}(window));

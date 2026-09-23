/* gcv-admin-cms.js — CMS Admin: Revista, Atrativos, Guias, Cidades, Excursões */
(function (global) {
  'use strict';

  var state = { module: null, editingId: null, cities: [], attractions: [], guides: [] };
  var guideSheet = { filters: { q: '', status: '', city: '' } };
  var excSheet = {
    rows: [],
    guides: [],
    attractions: [],
    filters: { q: '', guide: '', attraction: '', approvedFrom: '', approvedTo: '', status: '' },
    timers: {},
    saving: {},
    drafts: {},
    changes: {},
    originals: {},
    confirmOpen: false
  };

  function get(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); } catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send();
  }

  function sendJson(method, url, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); } catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(JSON.stringify(data || {}));
  }

  var WOMAN_FIRST_NAMES = {};
  (
    'alice aline beatriz beatrix carmen celeste claire clare crystal denise ' +
    'edith elaine eliane elis elisabete elisabeth elizabete ester esther eunice ' +
    'gisele giselle heloise ingrid ines irene iris isabel isabele isabeli isabelly isabelle ivone ' +
    'jacqueline jennifer jeniffer joyce karen karine katherine kelly keli ketlen ketlin ' +
    'lais leonor lis lisiane lourdes marlene mercedes michelle michele milene mylene ' +
    'nadine nathalie nicole noemi noemy raquel rachel rose ruth suelen suellen sueli ' +
    'tais thais teres valerie yasmin yasmim iazmin camile camille cecile solange ' +
    'cristiane luciene josiane iraci nair kerolyn lily lili mary nancy wendy ' +
    'isis sirlene darlene zuleide vanilde'
  ).split(/\s+/).forEach(function (n) { if (n) WOMAN_FIRST_NAMES[n] = 1; });
  var MAN_NAMES_ENDING_A = { luca: 1, nicola: 1, josafa: 1 };

  function foldGuideName(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function guideIsWoman(g) {
    var sx = String((g && (g.sexo || g.gender || g.sex)) || '').toUpperCase();
    if (sx === 'F' || sx === 'FEMININO' || sx === 'FEMALE') return true;
    if (sx === 'M' || sx === 'MASCULINO' || sx === 'MALE') return false;
    var raw = typeof g === 'string' ? g : ((g && (g.full_name || g.name || g.nickname)) || '');
    var folded = foldGuideName(raw).replace(/^(dra|dr|sra|srta|sr|dona)\s+/, '');
    var first = folded.split(' ')[0] || '';
    if (!first) return false;
    if (WOMAN_FIRST_NAMES[first]) return true;
    if (MAN_NAMES_ENDING_A[first]) return false;
    if (first.charAt(first.length - 1) === 'a') return true;
    if (/(ine|ene|ane|elle|ette|elly)$/.test(first)) return true;
    return false;
  }

  function gWord(g, masc, fem) {
    return guideIsWoman(g) ? fem : masc;
  }

  global.GcvGuideGender = { isWoman: guideIsWoman };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fillWalkQuorumSelect(sel, maxPeople, selected) {
    if (!sel) return 0;
    maxPeople = parseInt(maxPeople, 10);
    if (!Number.isFinite(maxPeople) || maxPeople < 1) maxPeople = 10;
    if (maxPeople > 12) maxPeople = 12;
    var cur = parseInt(selected != null ? selected : sel.value, 10);
    if (!Number.isFinite(cur) || cur < 1) cur = Math.min(4, maxPeople);
    if (cur > maxPeople) cur = maxPeople;
    var html = '';
    var i;
    for (i = 1; i <= maxPeople; i++) {
      html += '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + i + '</option>';
    }
    sel.innerHTML = html;
    sel.value = String(cur);
    return cur;
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
      '<p class="gcv-cms-muted" style="margin:0.4rem 0 0;">A bandeira do Brasil (português) fica sempre marcada e não pode ser alterada.</p>';
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

  function icoPencil() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  }

  function icoTrash() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  }

  function icoPerson() {
    return '<svg class="gcv-exc-ico gcv-exc-ico--person" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.2 20c.8-3.8 3.4-5.6 6.8-5.6s6 1.8 6.8 5.6"/></svg>';
  }

  function icoCar() {
    return '<svg class="gcv-exc-ico gcv-exc-ico--car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13 5.2 8.2A1.5 1.5 0 0 1 6.5 7.5h7.8a1.5 1.5 0 0 1 1.4.9L18.4 13"/><path d="M3 13h16.5v3.2H3z"/><circle cx="7" cy="17.4" r="1.5"/><circle cx="16" cy="17.4" r="1.5"/><path d="M9 8v5M14 8v5"/></svg>';
  }

  function icoCheck() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  function icoHourglass() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12M6 21h12"/><path d="M8 3v4.2L12 12l4-4.8V3"/><path d="M8 21v-4.2L12 12l4 4.8V21"/></svg>';
  }

  function icoCancel() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>';
  }

  function thIco(ico, label, title) {
    return '<span class="gcv-exc-th" title="' + esc(title) + '">' + ico + (label ? '<span class="gcv-exc-th__txt">' + label + '</span>' : '') + '</span>';
  }

  function cmsIconEdit(attrHtml) {
    return '<button type="button" class="gcv-cms-icon-btn" ' + attrHtml + ' title="Editar" aria-label="Editar">' + icoPencil() + '</button>';
  }

  function cmsIconDel(attrHtml) {
    return '<button type="button" class="gcv-cms-icon-btn gcv-cms-icon-btn--danger" ' + attrHtml + ' title="Excluir" aria-label="Excluir">' + icoTrash() + '</button>';
  }

  function cmsRowActions(editAttrHtml, delAttrHtml) {
    return (
      '<div class="gcv-cms-row-actions">' +
      cmsIconEdit(editAttrHtml) +
      (delAttrHtml ? cmsIconDel(delAttrHtml) : '') +
      '</div>'
    );
  }

  function bindRowDelete(list, attr, url, reload) {
    if (!list) return;
    list.querySelectorAll('[' + attr + ']').forEach(function (btn) {
      btn.onclick = function () {
        var id = parseInt(btn.getAttribute(attr), 10);
        var label = btn.getAttribute('data-del-label') || ('#' + id);
        gcvConfirm('Excluir\n' + label + '?\n\nEsta ação não pode ser desfeita.', { danger: true, okText: 'Excluir' }).then(function (ok) {
          if (!ok) return;
          btn.disabled = true;
          sendJson('DELETE', url, { id: id }, function (e, r) {
            btn.disabled = false;
            if (!r || !r.ok) {
              alert((r && r.error) || 'Erro ao excluir');
              return;
            }
            reload();
          });
        });
      };
    });
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + String(n);
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
    var h = root(hourId);
    var m = root(minId);
    if (!h || !m || !h.value || !m.value) return '';
    return h.value + ':' + m.value;
  }

  function root(id) {
    return document.getElementById(id);
  }

  function uploadFile(file, folder, cb) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder || 'geral');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media-upload.php');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); } catch (e) { cb(e, {}); }
    };
    xhr.onerror = function () { cb(new Error('network'), {}); };
    xhr.send(fd);
  }

  function moneyToCents(v) {
    var n = String(v || '').replace(/[^\d,.-]/g, '').replace(',', '.');
    var f = parseFloat(n);
    if (!Number.isFinite(f)) return 0;
    return Math.round(f * 100);
  }

  function centsToMoney(c) {
    return String(Math.round((parseInt(c, 10) || 0) / 100));
  }

  /* ---------- CIDADES ---------- */
  function renderCities() {
    var box = root('cms-cities-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-city-new">+ Nova cidade</button>' +
      '<p class="gcv-cms-hint">Digite o nome: o Google Places sugere e preenche automaticamente (requer GOOGLE_PLACES_API_KEY).</p>' +
      '</div>' +
      '<div id="cms-city-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-city-list" class="gcv-cms-list">Carregando…</div>';

    root('cms-city-new').onclick = function () { openCityForm(null); };
    get('/api/admin/cities.php', function (err, res) {
      var list = root('cms-city-list');
      if (!list) return;
      if (err || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar cidades. Rode a migration CMS no MySQL.</p>';
        return;
      }
      state.cities = (res.data && res.data.cities) || [];
      if (!state.cities.length) {
        list.innerHTML = '<p>Nenhuma cidade cadastrada.</p>';
        return;
      }
      list.innerHTML = state.cities.map(function (c) {
        return (
          '<article class="gcv-cms-row">' +
          '<div><strong>' + esc(c.name) + '</strong><div class="gcv-cms-muted">' + esc(c.formatted_address || (c.state + ' / ' + c.country)) + '</div></div>' +
          '<div class="gcv-cms-row-side">' +
          cmsRowActions(
            'data-edit-city="' + c.id + '"',
            'data-del-city="' + c.id + '" data-del-label="' + esc(c.name) + '"'
          ) +
          '</div></article>'
        );
      }).join('');
      list.querySelectorAll('[data-edit-city]').forEach(function (btn) {
        btn.onclick = function () {
          var id = parseInt(btn.getAttribute('data-edit-city'), 10);
          var city = state.cities.find(function (x) { return Number(x.id) === id; });
          openCityForm(city || null);
        };
      });
      bindRowDelete(list, 'data-del-city', '/api/admin/cities.php', renderCities);
    });
  }

  function openCityForm(city) {
    var form = root('cms-city-form');
    if (!form) return;
    form.hidden = false;
    form.innerHTML =
      '<h3>' + (city ? 'Editar cidade' : 'Nova cidade') + '</h3>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Buscar no Google</label>' +
      '<input class="gcv-dash-input" id="cms-city-q" placeholder="Ex.: Alto Paraíso de Goiás" autocomplete="off" />' +
      '<div id="cms-city-suggestions" class="gcv-cms-suggest"></div></div>' +
      '<div class="gcv-dash-field-row">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome *</label><input class="gcv-dash-input" id="cms-city-name" value="' + esc(city && city.name || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">UF</label><input class="gcv-dash-input" id="cms-city-uf" value="' + esc(city && city.state_code || 'GO') + '" maxlength="2" /></div>' +
      '</div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Endereço formatado</label><input class="gcv-dash-input" id="cms-city-addr" value="' + esc(city && city.formatted_address || '') + '" /></div>' +
      '<input type="hidden" id="cms-city-place" value="' + esc(city && city.place_id || '') + '" />' +
      '<input type="hidden" id="cms-city-lat" value="' + esc(city && city.lat || '') + '" />' +
      '<input type="hidden" id="cms-city-lng" value="' + esc(city && city.lng || '') + '" />' +
      '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-city-save">Salvar</button>' +
      '<button type="button" class="gcv-dash-btn" id="cms-city-cancel">Cancelar</button></div>';

    var timer = null;
    root('cms-city-q').oninput = function () {
      var q = root('cms-city-q').value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (q.length < 2) return;
        get('/api/admin/places-autocomplete.php?q=' + encodeURIComponent(q), function (e, r) {
          var box = root('cms-city-suggestions');
          if (!box) return;
          if (!r || !r.ok) {
            box.innerHTML = '<div class="gcv-cms-muted">' + esc((r && r.error) || 'Places indisponível') + '</div>';
            return;
          }
          var preds = (r.data && r.data.predictions) || [];
          box.innerHTML = preds.map(function (p) {
            return '<button type="button" class="gcv-cms-suggest__item" data-place="' + esc(p.place_id) + '" data-desc="' + esc(p.description) + '" data-main="' + esc(p.main_text) + '">' + esc(p.description) + '</button>';
          }).join('') || '<div class="gcv-cms-muted">Sem resultados</div>';
          box.querySelectorAll('[data-place]').forEach(function (b) {
            b.onclick = function () {
              root('cms-city-name').value = b.getAttribute('data-main') || b.getAttribute('data-desc');
              root('cms-city-addr').value = b.getAttribute('data-desc') || '';
              root('cms-city-place').value = b.getAttribute('data-place') || '';
              box.innerHTML = '';
            };
          });
        });
      }, 280);
    };

    root('cms-city-cancel').onclick = function () { form.hidden = true; };
    root('cms-city-save').onclick = function () {
      var payload = {
        id: city && city.id,
        name: root('cms-city-name').value.trim(),
        state_code: root('cms-city-uf').value.trim() || 'GO',
        state: 'Goiás',
        formatted_address: root('cms-city-addr').value.trim(),
        place_id: root('cms-city-place').value.trim() || null,
        lat: root('cms-city-lat').value || null,
        lng: root('cms-city-lng').value || null,
        is_base: 1,
      };
      if (!payload.name) { alert('Nome obrigatório'); return; }
      sendJson(city ? 'PUT' : 'POST', '/api/admin/cities.php', payload, function (e, r) {
        if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
        form.hidden = true;
        renderCities();
      });
    };
  }

  /* ---------- REVISTA ---------- */
  function renderArticles() {
    var box = root('cms-articles-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-article-new">+ Novo artigo</button></div>' +
      '<div id="cms-article-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-article-list" class="gcv-cms-list">Carregando…</div>';
    root('cms-article-new').onclick = function () { openArticleForm(null); };
    get('/api/admin/articles.php', function (err, res) {
      var list = root('cms-article-list');
      if (!list) return;
      if (err || !res || !res.ok) {
        var artMsg = (res && res.error) ? String(res.error) : 'Erro ao carregar artigos.';
        list.innerHTML = '<p class="gcv-dash-alert">' + esc(artMsg) + '</p>';
        return;
      }
      var rows = (res.data && res.data.articles) || [];
      if (!rows.length) {
        list.innerHTML = '<p>Nenhum artigo. Importe os existentes ou crie um novo.</p>';
        return;
      }
      list.innerHTML = rows.map(function (a) {
        return (
          '<article class="gcv-cms-row">' +
          '<div><strong>' + esc(a.title_pt) + '</strong>' +
          '<div class="gcv-cms-muted">/' + esc(a.slug) + ' · ' + esc(a.status) + '</div></div>' +
          '<div class="gcv-cms-row-side">' +
          cmsRowActions(
            'data-edit-article="' + a.id + '"',
            'data-del-article="' + a.id + '" data-del-label="' + esc(a.title_pt) + '"'
          ) +
          '</div></article>'
        );
      }).join('');
      list.querySelectorAll('[data-edit-article]').forEach(function (btn) {
        btn.onclick = function () {
          get('/api/admin/articles.php?id=' + btn.getAttribute('data-edit-article'), function (e, r) {
            if (r && r.ok) openArticleForm(r.data);
          });
        };
      });
      bindRowDelete(list, 'data-del-article', '/api/admin/articles.php', renderArticles);
    });
  }

  function openArticleForm(a) {
    var form = root('cms-article-form');
    if (!form) return;
    form.hidden = false;
    form.innerHTML =
      '<h3>' + (a ? 'Editar artigo' : 'Novo artigo') + '</h3>' +
      '<div class="gcv-dash-field-row">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Título PT *</label><input class="gcv-dash-input" id="art-title-pt" value="' + esc(a && a.title_pt || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Slug</label><input class="gcv-dash-input" id="art-slug" value="' + esc(a && a.slug || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Status</label><select class="gcv-dash-select" id="art-status"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></div>' +
      '</div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Resumo PT</label><textarea class="gcv-dash-input" id="art-excerpt-pt" rows="2">' + esc(a && a.excerpt_pt || '') + '</textarea></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Conteúdo HTML PT *</label><textarea class="gcv-dash-input gcv-cms-editor" id="art-content-pt" rows="14">' + esc(a && a.content_pt || '') + '</textarea></div>' +
      '<div class="gcv-dash-field-row">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">SEO title PT</label><input class="gcv-dash-input" id="art-seo-title" value="' + esc(a && a.seo_title_pt || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Capa (URL)</label><input class="gcv-dash-input" id="art-cover" value="' + esc(a && a.cover_url || '') + '" /></div>' +
      '</div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Upload capa</label><input type="file" id="art-cover-file" accept="image/*" /></div>' +
      '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="art-save">Salvar</button>' +
      '<button type="button" class="gcv-dash-btn" id="art-cancel">Cancelar</button></div>';

    if (a && a.status) root('art-status').value = a.status;
    root('art-cancel').onclick = function () { form.hidden = true; };
    root('art-cover-file').onchange = function () {
      var f = root('art-cover-file').files[0];
      if (!f) return;
      uploadFile(f, 'revista', function (e, r) {
        if (r && r.ok && r.data) root('art-cover').value = r.data.url;
        else alert((r && r.error) || 'Falha no upload');
      });
    };
    root('art-save').onclick = function () {
      var payload = {
        id: a && a.id,
        title_pt: root('art-title-pt').value.trim(),
        slug: root('art-slug').value.trim(),
        status: root('art-status').value,
        excerpt_pt: root('art-excerpt-pt').value,
        content_pt: root('art-content-pt').value,
        seo_title_pt: root('art-seo-title').value,
        cover_url: root('art-cover').value.trim(),
      };
      if (!payload.title_pt) { alert('Título obrigatório'); return; }
      sendJson(a ? 'PUT' : 'POST', '/api/admin/articles.php', payload, function (e, r) {
        if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
        form.hidden = true;
        renderArticles();
      });
    };
  }

  /* ---------- ATRATIVOS ---------- */
  function paintAttractionsList(rows) {
    var list = root('cms-attr-list');
    if (!list) return;
    state.attractions = rows || [];
    list.innerHTML = rows.length ? rows.map(function (a) {
      return (
        '<article class="gcv-cms-row"><div><strong>' + esc(a.title_pt) + '</strong>' +
        '<div class="gcv-cms-muted">/' + esc(a.slug) + ' · ' + esc(a.status) +
        (a.entry_price_label ? ' · ' + esc(a.entry_price_label) : '') + '</div></div>' +
        '<div class="gcv-cms-row-side">' +
        cmsRowActions(
          'data-edit-attr="' + a.id + '"',
          'data-del-attr="' + a.id + '" data-del-label="' + esc(a.title_pt) + '"'
        ) +
        '</div></article>'
      );
    }).join('') : '<p>Nenhum atrativo. Use <strong>Importar do site</strong> para carregar os 18 atrativos atuais.</p>';
    list.querySelectorAll('[data-edit-attr]').forEach(function (btn) {
      btn.onclick = function () {
        get('/api/admin/attractions.php?id=' + btn.getAttribute('data-edit-attr'), function (e, r) {
          if (r && r.ok) openAttractionForm(r.data);
        });
      };
    });
    bindRowDelete(list, 'data-del-attr', '/api/admin/attractions.php', function () {
      get('/api/admin/attractions.php', function (err, res) {
        paintAttractionsList((res && res.data && res.data.attractions) || []);
      });
    });
  }

  function renderAttractions() {
    var box = root('cms-attractions-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-attr-new">+ Novo atrativo</button>' +
      '<button type="button" class="gcv-dash-btn" id="cms-attr-seed">Importar do site</button>' +
      '</div>' +
      '<div id="cms-attr-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-attr-list" class="gcv-cms-list">Carregando…</div>';
    root('cms-attr-new').onclick = function () { openAttractionForm(null); };
    root('cms-attr-seed').onclick = function () {
      var btn = root('cms-attr-seed');
      if (btn) { btn.disabled = true; btn.textContent = 'Importando…'; }
      seedAttractions(function (err, res) {
        if (btn) { btn.disabled = false; btn.textContent = 'Importar do site'; }
        if (!res || !res.ok) {
          alert((res && res.error) || 'Falha ao importar');
          return;
        }
        alert(res.message || 'Atrativos importados');
        renderAttractions();
      });
    };
    get('/api/admin/attractions.php', function (err, res) {
      if (err || !res.ok) {
        var list = root('cms-attr-list');
        if (list) list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar atrativos.</p>';
        return;
      }
      var rows = (res.data && res.data.attractions) || [];
      if (rows.length === 0) {
        seedAttractions(function (e2, r2) {
          if (r2 && r2.ok) {
            get('/api/admin/attractions.php', function (e3, r3) {
              paintAttractionsList((r3 && r3.data && r3.data.attractions) || []);
            });
          } else {
            paintAttractionsList([]);
          }
        });
        return;
      }
      paintAttractionsList(rows);
    });
  }

  function openAttractionForm(a) {
    var form = root('cms-attr-form');
    if (!form) return;
    form.hidden = false;
    var gallery = (a && a.gallery) || [];
    form.innerHTML =
      '<h3>' + (a ? 'Editar atrativo' : 'Novo atrativo') + '</h3>' +
      '<div class="gcv-dash-field-row">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Título PT *</label><input class="gcv-dash-input" id="att-title" value="' + esc(a && a.title_pt || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Slug</label><input class="gcv-dash-input" id="att-slug" value="' + esc(a && a.slug || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Status</label><select class="gcv-dash-select" id="att-status"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></div>' +
      '</div>' +
      '<div class="gcv-dash-field-row">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Distância (km)</label><input class="gcv-dash-input" id="att-dist" value="' + esc(a && a.distance_km || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Trilha (km)</label><input class="gcv-dash-input" id="att-trail" value="' + esc(a && a.trail_distance_km || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Dificuldade</label><select class="gcv-dash-select" id="att-diff"><option value="">—</option><option value="easy">Fácil</option><option value="medium">Médio</option><option value="hard">Difícil</option></select></div>' +
      '</div>' +
      '<div class="gcv-dash-field-row">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Preço entrada (R$)</label><input class="gcv-dash-input" id="att-price" value="' + esc(a && a.entry_price_cents != null ? centsToMoney(a.entry_price_cents) : '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Label preço</label><input class="gcv-dash-input" id="att-price-label" value="' + esc(a && a.entry_price_label || '') + '" placeholder="Ex.: R$ 60" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Estacionamento</label><input class="gcv-dash-input" id="att-parking" value="' + esc(a && a.parking_info || '') + '" /></div>' +
      '</div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Período recomendado</label><input class="gcv-dash-input" id="att-period" value="' + esc(a && a.recommended_period || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Info lateral (HTML)</label><textarea class="gcv-dash-input" id="att-sidebar" rows="4">' + esc(a && a.sidebar_html_pt || '') + '</textarea></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Conteúdo principal (HTML)</label><textarea class="gcv-dash-input gcv-cms-editor" id="att-content" rows="12">' + esc(a && a.content_pt || '') + '</textarea></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Capa URL</label><input class="gcv-dash-input" id="att-cover" value="' + esc(a && a.cover_url || '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label">Upload capa / galeria</label><input type="file" id="att-files" accept="image/*" multiple /></div>' +
      '<div id="att-gallery" class="gcv-cms-gallery"></div>' +
      '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="att-save">Salvar</button>' +
      '<button type="button" class="gcv-dash-btn" id="att-cancel">Cancelar</button></div>';

    if (a) {
      if (a.status) root('att-status').value = a.status;
      if (a.difficulty) root('att-diff').value = a.difficulty;
    }
    function paintGallery() {
      var g = root('att-gallery');
      g.innerHTML = gallery.map(function (item, idx) {
        return (
          '<div class="gcv-cms-gallery__item">' +
          '<img src="' + esc(item.url) + '" alt="" />' +
          '<button type="button" data-rm="' + idx + '">×</button></div>'
        );
      }).join('');
      g.querySelectorAll('[data-rm]').forEach(function (b) {
        b.onclick = function () {
          gallery.splice(parseInt(b.getAttribute('data-rm'), 10), 1);
          paintGallery();
        };
      });
    }
    paintGallery();
    root('att-files').onchange = function () {
      var files = Array.prototype.slice.call(root('att-files').files || []);
      files.forEach(function (f) {
        uploadFile(f, 'atrativos', function (e, r) {
          if (r && r.ok && r.data) {
            if (!root('att-cover').value) root('att-cover').value = r.data.url;
            gallery.push({ url: r.data.url, media_id: r.data.id, alt_text: '' });
            paintGallery();
          }
        });
      });
    };
    root('att-cancel').onclick = function () { form.hidden = true; };
    root('att-save').onclick = function () {
      var payload = {
        id: a && a.id,
        title_pt: root('att-title').value.trim(),
        slug: root('att-slug').value.trim(),
        status: root('att-status').value,
        distance_km: root('att-dist').value,
        trail_distance_km: root('att-trail').value,
        difficulty: root('att-diff').value,
        entry_price_cents: moneyToCents(root('att-price').value) || null,
        entry_price_label: root('att-price-label').value.trim(),
        parking_info: root('att-parking').value.trim(),
        recommended_period: root('att-period').value.trim(),
        sidebar_html_pt: root('att-sidebar').value,
        content_pt: root('att-content').value,
        cover_url: root('att-cover').value.trim(),
        gallery: gallery,
      };
      if (!payload.title_pt) { alert('Título obrigatório'); return; }
      sendJson(a ? 'PUT' : 'POST', '/api/admin/attractions.php', payload, function (e, r) {
        if (!r || !r.ok) {
          var msg = (r && (r.error || r.detail)) || 'Erro ao salvar atrativo';
          if (r && r.detail && r.error && r.detail !== r.error) msg += '\n' + r.detail;
          alert(msg);
          return;
        }
        form.hidden = true;
        renderAttractions();
      });
    };
  }

  /* ---------- GUIAS ---------- */
  function setGuideBrowseVisible(visible) {
    var section = document.getElementById('section-cms-guides');
    var list = root('cms-guide-list');
    var toolbar = root('cms-guide-toolbar');
    var wrap = root('cms-guide-sheet-wrap');
    var meta = root('cms-guide-meta');
    var blocked = root('cms-blocked-wrap');
    var hint = section ? section.querySelector('.gcv-dash-hint') : null;
    if (section) section.classList.toggle('is-editing', !visible);
    [list, toolbar, wrap, meta, blocked].forEach(function (el) {
      if (!el) return;
      el.hidden = !visible;
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
    if (hint) hint.hidden = !visible;
  }

  function closeGuideForm() {
    var form = root('cms-guide-form');
    if (form) {
      form.hidden = true;
      form.innerHTML = '';
    }
    setGuideBrowseVisible(true);
    var section = document.getElementById('section-cms-guides');
    if (section && typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({ block: 'start' });
    }
  }

  function refreshGuideBadges() {
    if (window.GcvDashboard && typeof window.GcvDashboard.refreshGuideBadge === 'function') {
      window.GcvDashboard.refreshGuideBadge();
    }
  }

  function guidePixFilled(g) {
    return !!(g && String(g.pix_key || '').trim());
  }

  function guideWasApproved(g) {
    if (!g) return false;
    if (g.was_approved) return true;
    if (g.approved_at) return true;
    return ['active', 'inactive', 'cancelled'].indexOf(g.status) >= 0;
  }

  function guideAccountBadge(g) {
    var st = String((g && g.status) || '');
    var approved = guideWasApproved(g);
    if (st === 'active') return '<span class="gcv-badge gcv-badge--active">' + gWord(g, 'APROVADO', 'APROVADA') + '</span>';
    if (st === 'inactive') return '<span class="gcv-badge gcv-badge--muted">' + gWord(g, 'INATIVO', 'INATIVA') + '</span>';
    if (st === 'cancelled' || (st === 'suspended' && approved)) {
      return '<span class="gcv-badge gcv-badge--cancelled">' + gWord(g, 'CANCELADO', 'CANCELADA') + '</span>';
    }
    if (st === 'suspended') return '<span class="gcv-badge gcv-badge--rejected">' + gWord(g, 'RECUSADO', 'RECUSADA') + '</span>';
    if (st === 'pending') {
      if (g && (g.needs_resubmit || g.profile_complete === false)) return '<span class="gcv-badge gcv-badge--muted">RASCUNHO</span>';
      return '<span class="gcv-badge gcv-badge--pending">AGUARDANDO APROVAÇÃO</span>';
    }
    return '';
  }

  function guidePixBadge(g) {
    return guidePixFilled(g)
      ? '<span class="gcv-badge gcv-badge--active">PIX OK</span>'
      : '<span class="gcv-badge gcv-badge--pending">PIX pendente</span>';
  }

  function guideWaHref(g) {
    var digits = String((g && g.phone) || '').replace(/\D+/g, '');
    if (!digits) return '';
    var ddi = String((g && g.phone_ddi) || '+55').replace(/\D+/g, '') || '55';
    if (digits.indexOf(ddi) === 0) return 'https://wa.me/' + digits;
    return 'https://wa.me/' + ddi + digits;
  }

  function formatGuidePhone(g) {
    var digits = String((g && g.phone) || '').replace(/\D+/g, '');
    if (!digits) return '';
    var ddi = String((g && g.phone_ddi) || '+55').replace(/\D+/g, '') || '55';
    if (ddi === '55' && digits.length >= 10) {
      var ddd = digits.slice(0, 2);
      var rest = digits.slice(2);
      if (rest.length === 9) return '+55 (' + ddd + ') ' + rest.slice(0, 5) + '-' + rest.slice(5);
      if (rest.length === 8) return '+55 (' + ddd + ') ' + rest.slice(0, 4) + '-' + rest.slice(4);
    }
    return '+' + ddi + ' ' + digits;
  }

  function guidePhotoUrl(g) {
    return (g && (g.photo_3x4_url || g.photo_url || g.avatar_url)) || '';
  }

  function guideListPhotoHtml(g) {
    var url = guidePhotoUrl(g);
    var name = String((g && (g.full_name || g.name || g.nickname)) || '?');
    var initial = name.charAt(0).toUpperCase();
    if (url) {
      return '<div class="gcv-cms-row__photo"><img src="' + esc(url) + '" alt="' + esc(name) + '" /></div>';
    }
    return '<div class="gcv-cms-row__photo"><span class="gcv-cms-row__photo-empty">' + esc(initial) + '</span></div>';
  }

  function guideListMetaHtml(g) {
    var city = String((g && g.base_city_name) || '').trim() || '—';
    var pix = String((g && g.pix_key) || '').trim();
    var pixHtml = pix ? ('Chave pix <strong>' + esc(pix) + '</strong>') : 'Chave pix —';
    var phone = formatGuidePhone(g);
    var wa = guideWaHref(g);
    var cel = phone
      ? (wa
        ? ('Celular <a href="' + esc(wa) + '" target="_blank" rel="noopener">' + esc(phone) + '</a>')
        : ('Celular <strong>' + esc(phone) + '</strong>'))
      : 'Celular —';
    return '<div class="gcv-cms-row__meta">' + esc(city) + ' | ' + pixHtml + ' | ' + cel + '</div>';
  }

  function reloadGuideForm(userId) {
    get('/api/admin/cms-guides.php?id=' + userId, function (e, r) {
      if (r && r.ok) openGuideForm(r.data);
      else renderGuides();
    });
  }

  var cachedRejectReasons = [];

  function askGuideReason(kind) {
    var isBlock = kind === 'block';
    var fn = window.gcvReasonDialog;
    var intro = isBlock
      ? 'Escolha uma mensagem pré-gravada ou escreva o motivo. O perfil será eliminado e este e-mail não poderá se cadastrar de novo.'
      : 'Escolha uma mensagem pré-gravada ou escreva o motivo. O perfil permanece. O guia não poderá solicitar nova aprovação por 45 dias, e o admin pode aprovar a qualquer momento.';
    if (typeof fn !== 'function') {
      var typed = window.prompt(intro);
      return Promise.resolve(typed && typed.trim() ? typed.trim() : null);
    }
    return fn({
      title: isBlock ? 'Bloquear cadastro' : 'Recusar cadastro',
      intro: intro,
      okText: isBlock ? 'Bloquear e eliminar' : 'Recusar cadastro',
      danger: true,
      reasons: cachedRejectReasons.length ? cachedRejectReasons : (window.GCV_REJECT_REASONS || [])
    });
  }

  function setGuideStatus(userId, status, extra) {
    extra = extra || {};
    var done = function () {
      refreshGuideBadges();
      if (extra.stayInEdit) reloadGuideForm(userId);
      else renderGuides();
    };
    if (status === 'active' && extra.fromPending) {
      sendJson('POST', '/api/admin/approve-guide.php', { user_id: userId }, function (e, r) {
        if (!r || !r.ok) { alert((r && r.error) || 'Erro ao aprovar'); return; }
        if (extra.stayInEdit) extra.stayInEdit = false;
        done();
      });
      return;
    }
    if (status === 'suspended' && extra.fromPending) {
      var goReject = function (reason) {
        if (!reason) return;
        sendJson('POST', '/api/admin/reject-guide.php', { user_id: userId, reason: reason }, function (e, r) {
          if (!r || !r.ok) { alert((r && r.error) || 'Erro ao recusar'); return; }
          extra.stayInEdit = true;
          done();
        });
      };
      if (extra.reason) goReject(extra.reason);
      else askGuideReason('reject').then(goReject);
      return;
    }
    if (status === 'blocked' && extra.fromPending) {
      var goBlock = function (reason) {
        if (!reason) return;
        sendJson('POST', '/api/admin/block-guide.php', { user_id: userId, reason: reason }, function (e, r) {
          if (!r || !r.ok) { alert((r && r.error) || 'Erro ao bloquear'); return; }
          extra.stayInEdit = false;
          done();
        });
      };
      if (extra.reason) goBlock(extra.reason);
      else askGuideReason('block').then(goBlock);
      return;
    }
    sendJson('POST', '/api/admin/cms-guides.php', {
      action: 'set_status',
      user_id: userId,
      status: status,
    }, function (e, r) {
      if (!r || !r.ok) { alert((r && r.error) || 'Erro ao alterar status'); return; }
      done();
    });
  }

  function guideStatusChip(value, current, uid, label, kind) {
    var on = current === value;
    var cls = 'gcv-exc-status gcv-exc-status--' + kind + (on ? ' is-on' : ' is-off');
    if (on) return '<span class="' + cls + '">' + label + '</span>';
    return '<button type="button" class="' + cls + '" data-guide-status="' + value + '" data-guide-id="' + uid + '">' + label + '</button>';
  }

  function guideFilterKey(g) {
    var st = String((g && g.status) || '');
    var approved = guideWasApproved(g);
    if (st === 'active') return 'approved';
    if (st === 'inactive') return 'inactive';
    if (st === 'cancelled' || (st === 'suspended' && approved)) return 'cancelled';
    if (st === 'suspended') return 'rejected';
    if (st === 'pending') {
      if (g && (g.needs_resubmit || g.profile_complete === false)) return 'draft';
      return 'awaiting';
    }
    return '';
  }

  function uniqueGuideCities(rows) {
    var seen = {};
    var out = [];
    (rows || []).forEach(function (g) {
      var city = String((g && g.base_city_name) || '').trim();
      if (!city || seen[city]) return;
      seen[city] = 1;
      out.push(city);
    });
    out.sort(function (a, b) { return a.localeCompare(b, 'pt'); });
    return out;
  }

  function filterGuideRows(rows) {
    var f = guideSheet.filters;
    var q = String(f.q || '').toLowerCase().trim();
    return (rows || []).filter(function (g) {
      if (f.status && guideFilterKey(g) !== f.status) return false;
      if (f.city && String((g && g.base_city_name) || '') !== f.city) return false;
      if (q) {
        var hay = [
          g.full_name, g.name, g.nickname, g.email, g.pix_key, g.phone, g.base_city_name, formatGuidePhone(g)
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function bindGuideSheetFilters() {
    var q = root('cms-guide-q');
    var st = root('cms-guide-status');
    var city = root('cms-guide-city');
    if (q) {
      q.value = guideSheet.filters.q || '';
      q.oninput = function () {
        guideSheet.filters.q = q.value;
        paintGuidesList();
      };
    }
    if (st) {
      st.value = guideSheet.filters.status || '';
      st.onchange = function () {
        guideSheet.filters.status = st.value;
        paintGuidesList();
      };
    }
    if (city) {
      city.value = guideSheet.filters.city || '';
      city.onchange = function () {
        guideSheet.filters.city = city.value;
        paintGuidesList();
      };
    }
  }

  function renderGuides() {
    var box = root('cms-guides-root');
    if (!box) return;
    var section = document.getElementById('section-cms-guides');
    if (section) section.classList.remove('is-editing');
    var hint = section ? section.querySelector('.gcv-dash-hint') : null;
    if (hint) hint.hidden = false;
    var newBtn = document.getElementById('cms-guide-new');
    if (newBtn) newBtn.onclick = function () { openGuideForm(null); };
    box.innerHTML =
      '<div class="gcv-exc-sheet-toolbar" id="cms-guide-toolbar">' +
      '<div class="gcv-exc-sheet-filters">' +
      '<div class="gcv-exc-sheet-filter gcv-exc-sheet-filter--q"><label for="cms-guide-q">Buscar</label>' +
      '<input class="gcv-dash-input" id="cms-guide-q" type="search" placeholder="Nome, e-mail, PIX ou celular" autocomplete="off" /></div>' +
      '<div class="gcv-exc-sheet-filter"><label for="cms-guide-status">Status</label>' +
      '<select class="gcv-dash-select" id="cms-guide-status">' +
      '<option value="">Todos</option>' +
      '<option value="awaiting">Aguardando</option>' +
      '<option value="approved">Aprovado</option>' +
      '<option value="draft">Rascunho</option>' +
      '<option value="rejected">Recusado</option>' +
      '<option value="inactive">Inativo</option>' +
      '<option value="cancelled">Cancelado</option>' +
      '</select></div>' +
      '<div class="gcv-exc-sheet-filter"><label for="cms-guide-city">Cidade</label>' +
      '<select class="gcv-dash-select" id="cms-guide-city"><option value="">Todas</option></select></div>' +
      '</div></div>' +
      '<p class="gcv-exc-sheet-meta" id="cms-guide-meta"></p>' +
      '<div id="cms-guide-form" class="gcv-cms-card" hidden></div>' +
      '<div class="gcv-exc-sheet-wrap gcv-guide-sheet-wrap" id="cms-guide-sheet-wrap">' +
      '<div id="cms-guide-list">Carregando…</div></div>' +
      '<div id="cms-blocked-wrap">' +
      '<h3 class="gcv-guide-sheet-sub">E-mails bloqueados</h3>' +
      '<div id="cms-blocked-emails">Carregando…</div></div>';
    bindGuideSheetFilters();
    get('/api/admin/cms-guides.php', function (err, res) {
      var list = root('cms-guide-list');
      if (!list) return;
      if (err || !res || !res.ok) {
        var gMsg = (res && res.error) ? String(res.error) : 'Erro ao carregar guias.';
        list.innerHTML = '<p class="gcv-dash-alert">' + esc(gMsg) + '</p>';
        return;
      }
      if (res.data && res.data.reject_reasons) {
        cachedRejectReasons = res.data.reject_reasons;
      }
      paintGuidesList((res.data && res.data.guides) || []);
      paintCmsBlockedEmails((res.data && res.data.blocked_emails) || []);
      refreshGuideBadges();
    });
  }

  function paintCmsBlockedEmails(rows) {
    var box = root('cms-blocked-emails');
    if (!box) return;
    rows = rows || [];
    if (!rows.length) {
      box.innerHTML = '<p class="gcv-cms-muted">Nenhum e-mail bloqueado.</p>';
      return;
    }
    box.innerHTML =
      '<div class="gcv-exc-sheet-wrap gcv-guide-sheet-wrap gcv-guide-sheet-wrap--blocked">' +
      '<table class="gcv-exc-sheet gcv-guide-sheet"><thead><tr>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">E-mail</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Motivo</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Status</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Ações</span></span></th>' +
      '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr>' +
          '<td><strong class="gcv-guide-sheet__name">' + esc(row.email) + '</strong></td>' +
          '<td class="gcv-guide-sheet__reason">' + esc(row.reason || 'Sem motivo registrado') + '</td>' +
          '<td><span class="gcv-badge gcv-badge--blocked">BLOQUEADO</span></td>' +
          '<td class="gcv-guide-sheet__actions"><button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-unblock-email="' + esc(row.email) + '">Desbloquear</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
    box.querySelectorAll('[data-unblock-email]').forEach(function (btn) {
      btn.onclick = function () {
        var email = btn.getAttribute('data-unblock-email') || '';
        gcvConfirm('Desbloquear ' + email + '? A pessoa poderá se cadastrar de novo.', { okText: 'Desbloquear' }).then(function (ok) {
          if (!ok) return;
          sendJson('POST', '/api/admin/block-guide.php', { action: 'unblock', email: email }, function (e, r) {
            if (!r || !r.ok) { alert((r && r.error) || 'Erro ao desbloquear'); return; }
            renderGuides();
          });
        });
      };
    });
  }

  function paintGuidesList(rows) {
    var list = root('cms-guide-list');
    if (!list) return;
    if (rows) {
      rows = rows.slice().sort(function (a, b) {
        function rank(g) {
          var st = String((g && g.status) || '');
          var complete = !!(g && g.profile_complete);
          var approved = guideWasApproved(g);
          var resubmit = !!(g && g.needs_resubmit);
          if (st === 'pending' && complete && !resubmit) return 0;
          if (st === 'active') return 1;
          if (st === 'pending') return 2;
          if (st === 'suspended' && !approved) return 3;
          if (st === 'inactive') return 4;
          return 5;
        }
        var pa = rank(a);
        var pb = rank(b);
        if (pa !== pb) return pa - pb;
        return String(a.full_name || a.name || '').localeCompare(String(b.full_name || b.name || ''), 'pt');
      });
      state.guides = rows;
    }
    var all = state.guides || [];
    var citySel = root('cms-guide-city');
    if (citySel) {
      var curCity = guideSheet.filters.city || citySel.value || '';
      citySel.innerHTML = '<option value="">Todas</option>' + uniqueGuideCities(all).map(function (city) {
        return '<option value="' + esc(city) + '">' + esc(city) + '</option>';
      }).join('');
      citySel.value = curCity;
      if (citySel.value !== curCity) {
        guideSheet.filters.city = '';
        citySel.value = '';
      }
    }
    var shown = filterGuideRows(all);
    var meta = root('cms-guide-meta');
    if (meta) {
      var noun = shown.length === 1 ? 'guia' : 'guias';
      meta.innerHTML = shown.length === all.length
        ? '<strong>' + shown.length + '</strong> ' + noun
        : '<strong>' + shown.length + '</strong> de ' + all.length + ' ' + noun;
    }
    if (!all.length) {
      list.innerHTML = '<p class="gcv-cms-muted" style="padding:0.9rem 1rem;">Nenhum guia credenciado. Clique em <strong>+ Novo guia</strong>.</p>';
      return;
    }
    if (!shown.length) {
      list.innerHTML = '<p class="gcv-cms-muted" style="padding:0.9rem 1rem;">Nenhum guia com estes filtros.</p>';
      return;
    }
    list.innerHTML =
      '<table class="gcv-exc-sheet gcv-guide-sheet"><thead><tr>' +
      '<th class="gcv-guide-sheet__th-photo"><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Foto</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Status</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Nome</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Cidade</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">PIX</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Celular</span></span></th>' +
      '<th><span class="gcv-exc-th"><span class="gcv-exc-th__txt">Ações</span></span></th>' +
      '</tr></thead><tbody>' +
      shown.map(function (g) {
        var pending = g.status === 'pending' && !!g.profile_complete && !g.needs_resubmit;
        var recusado = g.status === 'suspended' && !guideWasApproved(g);
        var draftReturn = g.status === 'pending' && !!g.needs_resubmit;
        var name = g.full_name || g.name || g.nickname || 'Guia';
        var email = String(g.email || '').trim();
        var city = String(g.base_city_name || '').trim() || '—';
        var pix = String(g.pix_key || '').trim();
        var phone = formatGuidePhone(g);
        var wa = guideWaHref(g);
        var decide = '';
        if (pending || draftReturn) {
          decide = '<div class="gcv-guide-sheet__decide">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-approve-guide="' + g.user_id + '">Aprovar</button>' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-reject-guide="' + g.user_id + '">Recusar</button>' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-block-guide="' + g.user_id + '">Bloquear</button>' +
            '</div>';
        } else if (recusado) {
          decide = '<div class="gcv-guide-sheet__decide">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-approve-guide="' + g.user_id + '">Aprovar</button>' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-block-guide="' + g.user_id + '">Bloquear</button>' +
            '</div>';
        }
        var phoneHtml = phone
          ? (wa
            ? '<a class="gcv-guide-sheet__phone" href="' + esc(wa) + '" target="_blank" rel="noopener">' + esc(phone) + '</a>'
            : '<strong class="gcv-guide-sheet__phone">' + esc(phone) + '</strong>')
          : '<span class="gcv-exc-sheet__muted">—</span>';
        return (
          '<tr class="' + (pending || recusado || draftReturn ? 'is-pending' : '') + '">' +
          '<td class="gcv-guide-sheet__photo">' + guideListPhotoHtml(g) + '</td>' +
          '<td class="gcv-guide-sheet__status">' + guideAccountBadge(g) + decide + '</td>' +
          '<td class="gcv-guide-sheet__name-cell">' +
          '<strong class="gcv-guide-sheet__name">' + esc(name) + '</strong>' +
          (email ? '<span class="gcv-guide-sheet__email">' + esc(email) + '</span>' : '') +
          '</td>' +
          '<td class="gcv-guide-sheet__city-cell"><strong class="gcv-guide-sheet__city">' + esc(city) + '</strong></td>' +
          '<td class="gcv-guide-sheet__pix-cell" title="' + esc(pix || 'PIX pendente') + '">' +
          '<strong class="gcv-guide-sheet__pix-key">' + esc(pix || '—') + '</strong>' +
          guidePixBadge(g) +
          '</td>' +
          '<td class="gcv-guide-sheet__phone-cell">' + phoneHtml + '</td>' +
          '<td class="gcv-guide-sheet__actions">' +
          cmsRowActions('data-edit-guide="' + g.user_id + '"') +
          '</td></tr>'
        );
      }).join('') +
      '</tbody></table>';

    list.querySelectorAll('[data-edit-guide]').forEach(function (btn) {
      btn.onclick = function () {
        get('/api/admin/cms-guides.php?id=' + btn.getAttribute('data-edit-guide'), function (e, r) {
          if (r && r.ok) openGuideForm(r.data);
        });
      };
    });
    list.querySelectorAll('[data-approve-guide]').forEach(function (btn) {
      btn.onclick = function () {
        var uid = parseInt(btn.getAttribute('data-approve-guide'), 10);
        var row = (state.guides || []).filter(function (x) { return parseInt(x.user_id, 10) === uid; })[0];
        gcvConfirm(
          gWord(row, 'Aprovar este guia? O status passará a Aprovado.', 'Aprovar esta guia? O status passará a Aprovada.'),
          { okText: 'Aprovar' }
        ).then(function (ok) {
          if (!ok) return;
          setGuideStatus(uid, 'active', { fromPending: true });
        });
      };
    });
    list.querySelectorAll('[data-reject-guide]').forEach(function (btn) {
      btn.onclick = function () {
        setGuideStatus(parseInt(btn.getAttribute('data-reject-guide'), 10), 'suspended', { fromPending: true });
      };
    });
    list.querySelectorAll('[data-block-guide]').forEach(function (btn) {
      btn.onclick = function () {
        setGuideStatus(parseInt(btn.getAttribute('data-block-guide'), 10), 'blocked', { fromPending: true });
      };
    });
  }

  function guideEditStatusHtml(g) {
    if (!g) return '';
    var uid = g.user_id;
    var approved = guideWasApproved(g);
    var awaiting = g.status === 'pending' && !!g.profile_complete && !g.needs_resubmit;
    var draft = g.status === 'pending' && !g.profile_complete && !g.needs_resubmit;
    var draftReturn = g.status === 'pending' && !!g.needs_resubmit;
    var recusado = g.status === 'suspended' && !approved;
    var actions;
    if (awaiting || draftReturn) {
      actions =
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-guide-edit-status="active" data-from-pending="1">Aprovar</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-guide-edit-status="suspended" data-from-pending="1">Recusar</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-guide-edit-status="blocked" data-from-pending="1">Bloquear</button>';
      if (draftReturn) {
        actions += '<p class="gcv-cms-muted" style="flex-basis:100%;margin:0.35rem 0 0;">Devolvido ao rascunho para correção. O guia sai do site até ser aprovado de novo.</p>';
      }
    } else if (draft) {
      actions = '<span class="gcv-cms-muted">' + gWord(g, 'Aguardando o guia completar o cadastro.', 'Aguardando a guia completar o cadastro.') + '</span>';
    } else if (recusado) {
      actions =
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-guide-edit-status="active" data-from-pending="1">Aprovar</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-guide-edit-status="blocked" data-from-pending="1">Bloquear</button>';
      if (g.rejected_reason) {
        actions += '<p class="gcv-cms-muted" style="flex-basis:100%;margin:0.35rem 0 0;">Motivo: ' + esc(g.rejected_reason) + '</p>';
      }
    } else if (approved) {
      actions =
        guideStatusChip('active', g.status, uid, gWord(g, 'Aprovado', 'Aprovada'), 'ok') +
        guideStatusChip('pending', g.status, uid, 'Rascunho', 'draft') +
        guideStatusChip('inactive', g.status, uid, gWord(g, 'Inativo', 'Inativa'), 'muted') +
        guideStatusChip('cancelled', g.status, uid, gWord(g, 'Cancelado', 'Cancelada'), 'no');
    } else {
      actions = '<span class="gcv-exc-status gcv-exc-status--no is-on">' + gWord(g, 'Recusado', 'Recusada') + '</span>';
    }
    return (
      '<div class="gcv-cms-guide-status-box">' +
      '<div class="gcv-cms-guide-status-box__head">' +
      '<h4>Status da conta</h4>' +
      guideAccountBadge(g) +
      '</div>' +
      '<div class="gcv-cms-row__decide" style="margin-top:0.55rem;">' + actions + '</div>' +
      '<p class="gcv-cms-muted" style="margin:0.65rem 0 0;">Rascunho tira o guia do site para correção; depois precisa ser aprovado de novo. Recusar mantém o perfil e trava novo pedido de aprovação por 45 dias. O admin pode aprovar a qualquer momento. Bloquear elimina o perfil e impede novo cadastro deste e-mail.</p>' +
      '</div>'
    );
  }

  function bindGuideEditStatus(form, g) {
    if (!form || !g || !g.user_id) return;
    var uid = parseInt(g.user_id, 10);
    function run(status, fromPending) {
      var extra = { stayInEdit: true, fromPending: !!fromPending };
      if (status === 'suspended' && fromPending) {
        setGuideStatus(uid, 'suspended', extra);
        return;
      }
      if (status === 'blocked' && fromPending) {
        setGuideStatus(uid, 'blocked', extra);
        return;
      }
      if (status === 'cancelled') {
        gcvConfirm(
          gWord(g, 'Cancelar este perfil? O guia não poderá mais publicar.', 'Cancelar este perfil? A guia não poderá mais publicar.'),
          { danger: true, okText: 'Cancelar perfil' }
        ).then(function (ok) {
          if (!ok) return;
          setGuideStatus(uid, 'cancelled', extra);
        });
        return;
      }
      if (status === 'inactive') {
        gcvConfirm(
          gWord(g, 'Inativar este guia? Ele deixa de aparecer no site até ser reativado.', 'Inativar esta guia? Ela deixa de aparecer no site até ser reativada.'),
          { okText: 'Inativar' }
        ).then(function (ok) {
          if (!ok) return;
          setGuideStatus(uid, 'inactive', extra);
        });
        return;
      }
      if (status === 'pending') {
        gcvConfirm(
          gWord(
            g,
            'Devolver este guia ao rascunho? Ele sai do site até corrigir o cadastro e ser aprovado de novo.',
            'Devolver esta guia ao rascunho? Ela sai do site até corrigir o cadastro e ser aprovada de novo.'
          ),
          { okText: 'Devolver ao rascunho' }
        ).then(function (ok) {
          if (!ok) return;
          setGuideStatus(uid, 'pending', extra);
        });
        return;
      }
      if (status === 'active' && fromPending) {
        gcvConfirm(
          gWord(g, 'Aprovar este guia? O status passará a Aprovado.', 'Aprovar esta guia? O status passará a Aprovada.'),
          { okText: 'Aprovar' }
        ).then(function (ok) {
          if (!ok) return;
          setGuideStatus(uid, 'active', extra);
        });
        return;
      }
      setGuideStatus(uid, status, extra);
    }
    form.querySelectorAll('[data-guide-edit-status], [data-guide-status]').forEach(function (btn) {
      btn.onclick = function () {
        var st = btn.getAttribute('data-guide-edit-status') || btn.getAttribute('data-guide-status');
        var fromPending = btn.getAttribute('data-from-pending') === '1';
        if (!st) return;
        run(st, fromPending);
      };
    });
  }

  function isAllowedGuideCity(name) {
    var n = String(name || '').toLowerCase()
      .replace(/[áàãâ]/g, 'a').replace(/[éê]/g, 'e').replace(/í/g, 'i')
      .replace(/[óôõ]/g, 'o').replace(/ú/g, 'u').replace(/ç/g, 'c');
    return n.indexOf('alto paraiso') >= 0 || n.indexOf('sao jorge') >= 0 || n.indexOf('cavalcante') >= 0;
  }

  function cityOptionsHtml(selected) {
    return (state.cities || []).filter(function (c) {
      return isAllowedGuideCity(c && c.name);
    }).map(function (c) {
      return '<option value="' + c.id + '"' + (String(selected) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }

  function ensureCities(cb) {
    if (state.cities && state.cities.length) return cb();
    get('/api/admin/cities.php', function (e, r) {
      state.cities = (r && r.data && r.data.cities) || [];
      cb();
    });
  }

  function pixPhoneApi() {
    return global.GcvPixReceipt || null;
  }

  function mountGuidePhoneField(wrapEl, initialIso, initialPhone) {
    var api = pixPhoneApi();
    var iso = (initialIso || 'br').toLowerCase();
    var stateIso = iso;
    var getCountry = function (key) {
      if (api && api.findPhoneCountry) return api.findPhoneCountry(key);
      return { iso: 'br', dial: '55', min: 10, max: 11, mask: 'br', name: { pt: 'Brasil' } };
    };
    var formatMask = function (phone, isoCode) {
      if (api && api.formatPhoneMask) return api.formatPhoneMask(phone, isoCode);
      return String(phone || '');
    };
    var nationalDigits = function (phone, isoCode) {
      if (api && api.nationalPhoneDigits) return api.nationalPhoneDigits(phone, isoCode);
      return String(phone || '').replace(/\D+/g, '');
    };
    var countryName = function (c) {
      if (api && api.phoneCountryName) return api.phoneCountryName(c, 'pt');
      return (c && c.name && (c.name.pt || c.name.en)) || c.iso;
    };

    function renderList(filter) {
      var list = wrapEl.querySelector('#g-ddi-list');
      if (!list) return;
      var countries = (api && api.getPhoneCountries) ? api.getPhoneCountries() : [{ iso: 'br', dial: '55', name: { pt: 'Brasil' } }];
      var q = String(filter || '').trim().toLowerCase();
      list.innerHTML = countries.filter(function (c) {
        if (!q) return true;
        var label = countryName(c).toLowerCase();
        return label.indexOf(q) >= 0 || c.iso.indexOf(q) >= 0 || String(c.dial).indexOf(q) >= 0;
      }).map(function (c) {
        return (
          '<button type="button" class="gcv-cms-ddi-option' + (c.iso === stateIso ? ' is-selected' : '') + '" data-iso="' + c.iso + '">' +
          '<span class="fi fi-' + c.iso + ' gcv-cms-phone-flag" aria-hidden="true"></span>' +
          '<span class="gcv-cms-ddi-option-name">' + esc(countryName(c)) + '</span>' +
          '<span class="gcv-cms-ddi-option-dial">+' + esc(c.dial) + '</span></button>'
        );
      }).join('');
      list.querySelectorAll('[data-iso]').forEach(function (btn) {
        btn.onclick = function () {
          setIso(btn.getAttribute('data-iso'));
          closeDrop();
        };
      });
    }

    function syncUi() {
      var c = getCountry(stateIso);
      var flag = wrapEl.querySelector('#g-phone-flag');
      var dial = wrapEl.querySelector('#g-phone-dial');
      var hidden = wrapEl.querySelector('#g-phone-iso');
      var phone = wrapEl.querySelector('#g-phone');
      if (hidden) hidden.value = c.iso;
      if (flag) flag.className = 'fi fi-' + c.iso + ' gcv-cms-phone-flag';
      if (dial) dial.textContent = '+' + c.dial;
      if (phone) {
        if (document.activeElement === phone && api && api.applyPhoneMaskToInput) {
          api.applyPhoneMaskToInput(phone, c.iso);
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
      renderList(wrapEl.querySelector('#g-ddi-search') ? wrapEl.querySelector('#g-ddi-search').value : '');
    }

    function closeDrop() {
      var drop = wrapEl.querySelector('#g-ddi-dropdown');
      var trigger = wrapEl.querySelector('#g-ddi-trigger');
      if (drop) { drop.hidden = true; drop.setAttribute('aria-hidden', 'true'); }
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    function openDrop() {
      var drop = wrapEl.querySelector('#g-ddi-dropdown');
      var trigger = wrapEl.querySelector('#g-ddi-trigger');
      if (drop) { drop.hidden = false; drop.setAttribute('aria-hidden', 'false'); }
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      renderList('');
      var search = wrapEl.querySelector('#g-ddi-search');
      if (search) { search.value = ''; search.focus(); }
    }

    var c0 = getCountry(stateIso);
    wrapEl.innerHTML =
      '<div class="gcv-cms-phone-row"><div class="gcv-cms-phone-wrap">' +
      '<div class="gcv-cms-phone-prefix">' +
      '<button type="button" class="gcv-cms-ddi-trigger" id="g-ddi-trigger" aria-haspopup="listbox" aria-expanded="false">' +
      '<span class="fi fi-' + c0.iso + ' gcv-cms-phone-flag" id="g-phone-flag" aria-hidden="true"></span>' +
      '<span class="gcv-cms-phone-dial" id="g-phone-dial">+' + c0.dial + '</span>' +
      '<span class="gcv-cms-ddi-caret" aria-hidden="true"></span></button>' +
      '<input type="hidden" id="g-phone-iso" value="' + esc(c0.iso) + '" />' +
      '<div class="gcv-cms-ddi-dropdown" id="g-ddi-dropdown" hidden aria-hidden="true">' +
      '<input type="search" class="gcv-cms-ddi-search" id="g-ddi-search" placeholder="Buscar país ou DDI…" autocomplete="off" />' +
      '<div class="gcv-cms-ddi-list" id="g-ddi-list" role="listbox"></div></div></div>' +
      '<input type="tel" class="gcv-dash-input gcv-cms-phone-input" id="g-phone" autocomplete="tel-national" inputmode="numeric" />' +
      '</div></div>';

    var phoneInput = wrapEl.querySelector('#g-phone');
    if (phoneInput) {
      phoneInput.value = formatMask(initialPhone || '', stateIso);
      phoneInput.addEventListener('input', function () {
        if (api && api.applyPhoneMaskToInput) {
          api.applyPhoneMaskToInput(phoneInput, stateIso);
          return;
        }
        phoneInput.value = formatMask(phoneInput.value, stateIso);
      });
    }
    wrapEl.querySelector('#g-ddi-trigger').onclick = function () {
      var drop = wrapEl.querySelector('#g-ddi-dropdown');
      if (drop && !drop.hidden) closeDrop();
      else openDrop();
    };
    wrapEl.querySelector('#g-ddi-search').addEventListener('input', function () {
      renderList(wrapEl.querySelector('#g-ddi-search').value);
    });
    document.addEventListener('click', function onDoc(ev) {
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
    };
  }

  function openGuideForm(g) {
    ensureCities(function () {
      var form = root('cms-guide-form');
      if (!form) return;
      setGuideBrowseVisible(false);
      form.hidden = false;
      window.scrollTo(0, 0);

      var photoUrl = g ? (g.photo_url || g.photo_3x4_url || g.avatar_url || '') : '';
      var bioVal = g ? (g.bio_pt || '') : '';
      var guideName = (g && (g.full_name || g.name || g.nickname)) || '';
      var phoneIso = (g && g.phone_iso) || 'br';
      var phoneVal = (g && g.phone) || '';
      if (g && g.phone_ddi && (!g.phone_iso || g.phone_iso === '')) {
        phoneIso = String(g.phone_ddi).replace(/\D+/g, '') === '55' ? 'br' : phoneIso;
      }

      form.innerHTML =
        '<h3 class="gcv-cms-guide-edit-name">' + (g ? esc(guideName) : 'Novo guia') + '</h3>' +
        '<p class="gcv-cms-muted" style="margin:0 0 1rem;">' +
        (g ? 'Perfil do guia — edite os dados e o PIX neste formulário.' : 'Cadastro em branco. Nada é copiado de outro perfil.') +
        '</p>' +
        guideEditStatusHtml(g) +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome completo *</label><input class="gcv-dash-input" id="g-full" value="' + esc(g && g.full_name || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Apelido *</label><input class="gcv-dash-input" id="g-nick" value="' + esc(g && g.nickname || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">E-mail *</label><input class="gcv-dash-input" id="g-email" type="email" value="' + esc(g && g.email || '') + '" ' + (g ? 'readonly' : '') + ' /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento *</label><input class="gcv-dash-input" id="g-birth" type="date" value="' + esc(g && g.birth_date || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Sexo *</label>' +
        '<select class="gcv-dash-select" id="g-sexo">' +
        '<option value="">Selecione…</option>' +
        '<option value="M"' + (g && String(g.sexo).toUpperCase() === 'M' ? ' selected' : '') + '>Masculino</option>' +
        '<option value="F"' + (g && String(g.sexo).toUpperCase() === 'F' ? ' selected' : '') + '>Feminino</option>' +
        '</select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone / WhatsApp *</label><div id="g-phone-wrap"></div></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade base *</label><select class="gcv-dash-select" id="g-city"><option value="">Selecione…</option>' + cityOptionsHtml(g && g.base_city_id) + '</select></div>' +
        '<div class="gcv-cms-pix-box">' +
        '<h4>Recebimento PIX</h4>' +
        '<p class="gcv-cms-muted" style="margin:0 0 0.75rem;">Pagamentos só são permitidos para guias <strong>ativos</strong> com PIX verificado.</p>' +
        (g
          ? (guidePixBadge(g) + guideAccountBadge(g))
          : '') +
        '<div class="gcv-dash-field-row" style="margin-top:0.75rem;">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo da chave *</label><select class="gcv-dash-select" id="g-pix-type"><option value="">Selecione…</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX *</label><input class="gcv-dash-input" id="g-pix" value="' + esc(g && g.pix_key || '') + '" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" /></div>' +
        '</div>' +
        (g
          ? '<div style="margin-top:0.75rem;"><button type="button" class="gcv-dash-btn gcv-dash-btn--sm" id="g-verify-pix"' + (g.pix_key && g.status === 'active' ? '' : ' disabled') + '>Verificar PIX</button></div>'
          : '') +
        '</div>' +
        '<div class="gcv-dash-field">' +
        '<label class="gcv-dash-label">Foto *</label>' +
        '<div class="gcv-cms-photo-preview">' +
        (photoUrl
          ? '<img id="g-photo-preview" src="' + esc(photoUrl) + '" alt="Foto do guia" />'
          : '<div class="gcv-cms-photo-placeholder" id="g-photo-placeholder">Sem foto</div><img id="g-photo-preview" alt="Foto do guia" hidden />') +
        '<div>' +
        '<input type="hidden" id="g-photo-url" value="' + esc(photoUrl) + '" />' +
        '<input type="file" id="g-photo-file" accept="image/*" />' +
        '<p class="gcv-cms-muted" style="margin:0.35rem 0 0;">' + (g ? 'Anexe uma nova ou mantenha a foto atual.' : 'Anexe a foto do guia.') + '</p></div></div></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Idiomas falados</label>' +
        languagesPickerHtml(g && g.languages) +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Bio</label><textarea class="gcv-dash-input" id="g-bio" rows="8" placeholder="Biografia do guia">' + esc(bioVal) + '</textarea></div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="g-save">Salvar</button>' +
        '<button type="button" class="gcv-dash-btn" id="g-cancel">Cancelar</button></div>';

      if (g && g.pix_key_type) root('g-pix-type').value = g.pix_key_type;

      var phoneCtl = mountGuidePhoneField(root('g-phone-wrap'), phoneIso, phoneVal);
      bindGuideEditStatus(form, g);

      function showPhoto(url) {
        var img = root('g-photo-preview');
        var ph = root('g-photo-placeholder');
        if (root('g-photo-url')) root('g-photo-url').value = url;
        if (img) { img.src = url; img.hidden = false; }
        if (ph) ph.hidden = true;
      }

      root('g-photo-file').onchange = function () {
        var f = root('g-photo-file').files && root('g-photo-file').files[0];
        if (!f) return;
        uploadFile(f, 'guias', function (e, r) {
          if (!(r && r.ok && r.data && r.data.url)) {
            alert((r && r.error) || 'Falha no upload da foto');
            return;
          }
          showPhoto(r.data.url);
        });
      };

      var verifyBtn = root('g-verify-pix');
      if (verifyBtn) {
        verifyBtn.onclick = function () {
          if (!g || !g.user_id) return;
          if (g.status !== 'active') {
            alert('Só é possível verificar PIX de guia ativo.');
            return;
          }
          var pixVal = root('g-pix').value.trim();
          if (!pixVal) {
            alert('Informe a chave PIX antes de verificar.');
            return;
          }
          gcvConfirm('Confirmar que esta chave PIX pertence ao guia? Só após isso será possível pagar.').then(function (ok) {
            if (!ok) return;
          verifyBtn.disabled = true;
          sendJson('PUT', '/api/admin/guides.php', {
            user_id: g.user_id,
            pix_key: pixVal,
            pix_holder_name: root('g-full').value.trim(),
            verify_pix: true,
          }, function (e, r) {
            verifyBtn.disabled = false;
            alert(r && r.ok ? 'PIX verificado.' : ((r && r.error) || 'Erro ao verificar PIX'));
            if (r && r.ok) {
              get('/api/admin/cms-guides.php?id=' + g.user_id, function (e2, r2) {
                if (r2 && r2.ok) openGuideForm(r2.data);
              });
            }
          });
          });
        };
      }

      root('g-cancel').onclick = function () { closeGuideForm(); };
      root('g-save').onclick = function () {
        var savedPhoto = root('g-photo-url').value.trim();
        if (!savedPhoto) {
          alert('Anexe a foto do guia.');
          return;
        }
        var phoneDigits = phoneCtl.getPhoneDigits();
        if (!phoneDigits) {
          alert('Informe o telefone.');
          return;
        }
        if (!root('g-pix-type').value) {
          alert('Selecione o tipo da chave PIX.');
          return;
        }
        if (!root('g-pix').value.trim()) {
          alert('Informe a chave PIX.');
          return;
        }
        if (!root('g-sexo').value) {
          alert('Selecione o sexo.');
          return;
        }
        var payload = {
          user_id: g && g.user_id,
          full_name: root('g-full').value.trim(),
          nickname: root('g-nick').value.trim(),
          email: root('g-email').value.trim(),
          birth_date: root('g-birth').value,
          sexo: root('g-sexo').value,
          phone_ddi: phoneCtl.getDial(),
          phone_iso: phoneCtl.getIso(),
          phone: phoneDigits,
          pix_key_type: root('g-pix-type').value,
          pix_key: root('g-pix').value.trim(),
          pix_holder_name: root('g-full').value.trim(),
          base_city_id: parseInt(root('g-city').value, 10) || 0,
          photo_url: savedPhoto,
          photo_3x4_url: savedPhoto,
          bio_pt: root('g-bio').value,
          languages: readLanguagesPicker(form),
        };
        if (!g) payload.status = 'active';
        sendJson(g ? 'PUT' : 'POST', '/api/admin/cms-guides.php', payload, function (e, r) {
          if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
          renderGuides();
        });
      };
    });
  }

  /* ---------- EXCURSÕES ---------- */
  var EX_ATTR_MIN = 1;
  var EX_ATTR_MAX = 4;

  function seedAttractions(done) {
    get('/api/admin/seed-attractions.php', function (err, res) {
      if (typeof done === 'function') done(err, res);
    });
  }

  function selectedAttractionIdsFromEx(ex) {
    if (ex && Array.isArray(ex.attraction_ids) && ex.attraction_ids.length) {
      return ex.attraction_ids.map(function (id) { return parseInt(id, 10); }).filter(Boolean).slice(0, EX_ATTR_MAX);
    }
    if (ex && Array.isArray(ex.attractions) && ex.attractions.length) {
      return ex.attractions.map(function (a) { return parseInt(a.id, 10); }).filter(Boolean).slice(0, EX_ATTR_MAX);
    }
    if (ex && ex.attraction_id) return [parseInt(ex.attraction_id, 10)];
    return [];
  }

  function renderAttractionPickerMulti(attrs, selectedIds) {
    var selected = (selectedIds || []).map(String);
    var usable = (attrs || []).filter(function (a) { return a.status !== 'archived'; });
    usable.sort(function (a, b) {
      return String(a.title_pt || '').localeCompare(String(b.title_pt || ''), 'pt');
    });
    if (!usable.length) {
      return (
        '<p class="gcv-dash-alert" id="ex-attr-empty">Nenhum atrativo no banco. Cadastre em <strong>Atrativos</strong> no menu.</p>'
      );
    }
    return (
      '<p class="gcv-cms-muted" style="margin:0 0 0.35rem;">Clique para marcar/desmarcar — mínimo ' + EX_ATTR_MIN + ', máximo ' + EX_ATTR_MAX + ' no dia.</p>' +
      '<div class="gcv-cms-attr-pick" id="ex-attr-pick" role="group" aria-label="Atrativos do dia">' +
      usable.map(function (a) {
        var active = selected.indexOf(String(a.id)) !== -1;
        var ord = active ? (selected.indexOf(String(a.id)) + 1) : 0;
        return (
          '<button type="button" class="gcv-cms-attr-chip' + (active ? ' is-active' : '') + '" data-attr-id="' + a.id + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
          (active ? '<span class="gcv-cms-attr-ord">' + ord + '</span> ' : '') +
          esc(a.title_pt || a.slug) +
          '</button>'
        );
      }).join('') +
      '</div>' +
      '<p class="gcv-cms-muted" id="ex-attr-selected-hint" style="margin:0.4rem 0 0;"></p>'
    );
  }

  function renderExcursions() {
    var box = root('cms-excursions-root');
    if (!box) return;
    if (!root('cms-exc-sheet-wrap')) {
      box.innerHTML =
        '<div class="gcv-exc-sheet-toolbar" id="cms-exc-toolbar">' +
        '<div class="gcv-exc-sheet-filters">' +
        '<div class="gcv-exc-sheet-filter gcv-exc-sheet-filter--q"><label for="cms-exc-q">Buscar</label>' +
        '<input class="gcv-dash-input" id="cms-exc-q" type="search" placeholder="Atrativo, guia, cidade…" /></div>' +
        '<div class="gcv-exc-sheet-filter"><label for="cms-exc-f-guide">Guia</label>' +
        '<select class="gcv-dash-select" id="cms-exc-f-guide"><option value="">Todos</option></select></div>' +
        '<div class="gcv-exc-sheet-filter"><label for="cms-exc-f-attr">Atrativo</label>' +
        '<select class="gcv-dash-select" id="cms-exc-f-attr"><option value="">Todos</option></select></div>' +
        '<div class="gcv-exc-sheet-filter gcv-exc-sheet-filter--date"><label for="cms-exc-f-ap-from">Aprovação de</label>' +
        '<input class="gcv-dash-input" id="cms-exc-f-ap-from" type="date" /></div>' +
        '<div class="gcv-exc-sheet-filter gcv-exc-sheet-filter--date"><label for="cms-exc-f-ap-to">Aprovação até</label>' +
        '<input class="gcv-dash-input" id="cms-exc-f-ap-to" type="date" /></div>' +
        '<div class="gcv-exc-sheet-filter"><label for="cms-exc-f-status">Status</label>' +
        '<select class="gcv-dash-select" id="cms-exc-f-status">' +
        '<option value="">Todos</option>' +
        '<option value="em_formacao">Em formação</option>' +
        '<option value="confirmada">Confirmada</option>' +
        '<option value="pending_approval">Aguardando aprovação</option>' +
        '<option value="approved">Aprovada</option>' +
        '<option value="rejected">Recusada</option>' +
        '<option value="draft">Rascunho</option>' +
        '<option value="soldout">Esgotada</option>' +
        '<option value="cancelled">Cancelada</option>' +
        '<option value="concluida">Concluída</option>' +
        '</select></div>' +
        '</div></div>' +
        '<p class="gcv-exc-sheet-meta" id="cms-exc-meta">Edite as células e clique em Salvar para validar.</p>' +
        '<div id="cms-exc-form" class="gcv-cms-card" hidden></div>' +
        '<div id="cms-exc-sheet-wrap" class="gcv-exc-sheet-wrap"><p class="gcv-exc-sheet-empty">Carregando…</p></div>';
      bindExcSheetChrome();
    }
    loadExcursionSheetData(paintExcSheet);
    try {
      if (sessionStorage.getItem('gcv_open_create_tour') === '1') {
        sessionStorage.removeItem('gcv_open_create_tour');
        openExcursionForm(null);
      }
    } catch (errOpen) {}
  }

  function bindExcSheetChrome() {
    var newBtn = root('cms-exc-new');
    if (newBtn) newBtn.onclick = function () { openExcursionForm(null); };
    var saveBtn = root('cms-exc-save');
    if (saveBtn) saveBtn.onclick = function () { promptSaveChanges(false); };
    var cancelBtn = root('cms-exc-cancel');
    if (cancelBtn) cancelBtn.onclick = function () { revertSheetDrafts(); };
    ['cms-exc-q', 'cms-exc-f-guide', 'cms-exc-f-attr', 'cms-exc-f-ap-from', 'cms-exc-f-ap-to', 'cms-exc-f-status'].forEach(function (id) {
      var el = root(id);
      if (!el) return;
      var ev = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
      el.addEventListener(ev, function () {
        readExcSheetFilters();
        paintExcSheet(true);
      });
    });
  }

  function readExcSheetFilters() {
    var f = excSheet.filters;
    f.q = (root('cms-exc-q') && root('cms-exc-q').value || '').trim();
    f.guide = (root('cms-exc-f-guide') && root('cms-exc-f-guide').value) || '';
    f.attraction = (root('cms-exc-f-attr') && root('cms-exc-f-attr').value) || '';
    f.approvedFrom = (root('cms-exc-f-ap-from') && root('cms-exc-f-ap-from').value) || '';
    f.approvedTo = (root('cms-exc-f-ap-to') && root('cms-exc-f-ap-to').value) || '';
    f.status = (root('cms-exc-f-status') && root('cms-exc-f-status').value) || '';
  }

  function writeExcSheetFilterOptions() {
    var gSel = root('cms-exc-f-guide');
    var aSel = root('cms-exc-f-attr');
    var f = excSheet.filters;
    if (gSel) {
      gSel.innerHTML = '<option value="">Todos</option>' + (excSheet.guides || []).map(function (g) {
        var id = g.user_id || g.id;
        var label = (g.full_name || g.nickname || g.name || '') + (g.nickname && g.full_name ? ' (' + g.nickname + ')' : '');
        return '<option value="' + id + '"' + (String(f.guide) === String(id) ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('');
    }
    if (aSel) {
      var usable = (excSheet.attractions || []).filter(function (a) { return a.status !== 'archived'; }).slice();
      usable.sort(function (a, b) {
        return String(a.title_pt || '').localeCompare(String(b.title_pt || ''), 'pt');
      });
      aSel.innerHTML = '<option value="">Todos</option>' + usable.map(function (a) {
        return '<option value="' + a.id + '"' + (String(f.attraction) === String(a.id) ? ' selected' : '') + '>' + esc(a.title_pt || a.slug) + '</option>';
      }).join('');
    }
    var map = {
      'cms-exc-q': f.q,
      'cms-exc-f-ap-from': f.approvedFrom,
      'cms-exc-f-ap-to': f.approvedTo,
      'cms-exc-f-status': f.status
    };
    Object.keys(map).forEach(function (id) {
      var el = root(id);
      if (el && map[id] != null && el.value !== map[id]) el.value = map[id];
    });
  }

  function loadExcursionSheetData(done) {
    var pending = 3;
    function tick() {
      pending -= 1;
      if (pending > 0) return;
      if (typeof done === 'function') done();
    }
    get('/api/admin/excursions.php', function (err, res) {
      excSheet.loadError = !!(err || !res || !res.ok);
      var rows = (res && res.data && res.data.excursions) || [];
      rows = rows.slice().sort(function (a, b) {
        var pa = a.status === 'pending_approval' ? 0 : 1;
        var pb = b.status === 'pending_approval' ? 0 : 1;
        if (pa !== pb) return pa - pb;
        var da = String(a.date_iso || '');
        var db = String(b.date_iso || '');
        if (da !== db) return db.localeCompare(da);
        return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
      });
      excSheet.rows = rows;
      tick();
    });
    get('/api/admin/cms-guides.php', function (e2, r2) {
      var guides = (r2 && r2.data && r2.data.guides) || [];
      excSheet.guides = guides.filter(function (g) { return !g.status || g.status === 'active'; });
      tick();
    });
    get('/api/admin/attractions.php', function (e3, r3) {
      excSheet.attractions = (r3 && r3.data && r3.data.attractions) || [];
      if (!excSheet.attractions.length) {
        seedAttractions(function (err, res) {
          if (res && res.ok) {
            get('/api/admin/attractions.php', function (e4, r4) {
              excSheet.attractions = (r4 && r4.data && r4.data.attractions) || [];
              tick();
            });
          } else tick();
        });
        return;
      }
      tick();
    });
  }

  function filterExcSheetRows(rows) {
    var f = excSheet.filters;
    var q = String(f.q || '').toLowerCase();
    return (rows || []).filter(function (e) {
      if (f.guide && String(e.guide_user_id || '') !== String(f.guide)) return false;
      if (f.attraction) {
        var ids = (e.attraction_ids || []).map(String);
        if (ids.indexOf(String(f.attraction)) === -1 && String(e.attraction_id || '') !== String(f.attraction)) return false;
      }
      var approvedDay = String(e.approved_at || '').slice(0, 10);
      if (f.approvedFrom && (!approvedDay || approvedDay < f.approvedFrom)) return false;
      if (f.approvedTo && (!approvedDay || approvedDay > f.approvedTo)) return false;
      if (f.status) {
        var st = String(e.status || '');
        var life = String(e.lifecycle || '');
        if (f.status === 'approved') {
          if (st !== 'published' && st !== 'soldout') return false;
        } else if (f.status === 'em_formacao' || f.status === 'confirmada' || f.status === 'concluida') {
          if (life !== f.status) return false;
        } else if (st !== f.status && life !== f.status) {
          return false;
        }
      }
      if (q) {
        var hay = [
          e.attraction_title, e.guide_name, e.departure_city_name, e.date_iso, e.status,
          e.lifecycle_label, e.lifecycle
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function fmtDateBr(iso) {
    var s = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—';
    return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  }

  function numSelectHtml(field, id, min, max, selected, extraClass) {
    var cur = parseInt(selected, 10);
    if (!Number.isFinite(cur)) cur = min;
    var html = '<select class="gcv-exc-sheet__in ' + (extraClass || 'gcv-exc-sheet__num') + '" data-field="' + field + '" data-exc-id="' + id + '">';
    var i;
    for (i = min; i <= max; i++) {
      html += '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + i + '</option>';
    }
    return html + '</select>';
  }

  function excGuideSelectHtml(e) {
    var html = '<select class="gcv-exc-sheet__in gcv-exc-sheet__guide" data-field="guide_user_id" data-exc-id="' + e.id + '"><option value="">Sem guia</option>';
    (excSheet.guides || []).forEach(function (g) {
      var id = g.user_id || g.id;
      var label = g.full_name || g.nickname || g.name || ('#' + id);
      html += '<option value="' + id + '"' + (String(e.guide_user_id) === String(id) ? ' selected' : '') + '>' + esc(label) + '</option>';
    });
    return html + '</select>';
  }

  function excHasTransport(e) {
    return !!(e && (Number(e.offer_transport) || Number(e.max_people_transport) > 0 || Number(e.price_transport_cents) > 0));
  }

  function excAttrSelectHtml(e) {
    var selected = (e.attraction_ids && e.attraction_ids[0]) || e.attraction_id || '';
    var extra = (e.attraction_ids && e.attraction_ids.length > 1) ? (e.attraction_ids.length - 1) : 0;
    var html = '<select class="gcv-exc-sheet__in gcv-exc-sheet__attr" data-field="attraction_id" data-exc-id="' + e.id + '" title="' + esc(e.attraction_title || e.departure_city_name || '') + '"><option value="">—</option>';
    var usable = (excSheet.attractions || []).filter(function (a) { return a.status !== 'archived'; }).slice();
    var seen = {};
    usable.forEach(function (a) { seen[String(a.id)] = 1; });
    if (selected && !seen[String(selected)]) {
      usable.unshift({ id: selected, title_pt: e.attraction_title || ('#' + selected) });
    }
    usable.sort(function (a, b) {
      return String(a.title_pt || '').localeCompare(String(b.title_pt || ''), 'pt');
    });
    usable.forEach(function (a) {
      html += '<option value="' + a.id + '"' + (String(a.id) === String(selected) ? ' selected' : '') + '>' + esc(a.title_pt || a.slug) + '</option>';
    });
    html += '</select>';
    if (extra) html += '<span class="gcv-exc-sheet__sub">+' + extra + '</span>';
    return html;
  }

  function walkQuorumMet(e) {
    var q = parseInt(e && e.quorum, 10);
    if (!Number.isFinite(q) || q < 0) q = 0;
    return (parseInt(e && e.booked_people, 10) || 0) >= q;
  }

  function transportQuorumMet(e) {
    if (!excHasTransport(e)) return true;
    var qT = parseInt(e && e.quorum_transport, 10);
    if (!Number.isFinite(qT) || qT <= 0) return true;
    return (parseInt(e && e.booked_people_transport, 10) || 0) >= qT;
  }

  function isTransportPendingOnConfirmed(e) {
    if (!e || !excHasTransport(e) || transportQuorumMet(e)) return false;
    var st = sheetStatusValue(e);
    return st === 'confirmada' || walkQuorumMet(e);
  }

  function grupoCellHtml(e) {
    var walk = parseInt(e.booked_people, 10) || 0;
    var withT = parseInt(e.booked_people_transport, 10) || 0;
    var html = '<div class="gcv-exc-insc">' +
      '<span class="gcv-exc-insc__item" title="Inscritos sem translado">' + icoPerson() + ' ' + walk + '</span>';
    if (excHasTransport(e)) {
      html += '<span class="gcv-exc-insc__item" title="Inscritos com translado">' + icoCar() + ' ' + withT + '</span>';
    }
    return html + '</div>';
  }

  function lifeBadgeHtml(e) {
    var life = e.lifecycle || '';
    var label = e.lifecycle_label || life || '—';
    var cls = 'gcv-exc-life';
    if (life === 'em_formacao') cls += ' gcv-exc-life--form';
    else if (life === 'confirmada') cls += ' gcv-exc-life--ok';
    else if (life === 'cancelada' || life === 'rejeitada') cls += ' gcv-exc-life--no';
    else cls += ' gcv-exc-life--muted';
    return '<span class="' + cls + '">' + esc(label) + '</span>';
  }

  function approvalHoverTitle(e) {
    if (e.status === 'pending_approval') {
      return e.created_at ? ('Enviada em ' + fmtDateBr(e.created_at)) : 'Aguardando aprovação';
    }
    if (e.status === 'published' || e.status === 'soldout') {
      return e.approved_at ? ('Aprovada em ' + fmtDateBr(e.approved_at)) : 'Aprovada';
    }
    if (e.status === 'rejected') {
      return e.approved_at ? ('Recusada em ' + fmtDateBr(e.approved_at)) : 'Recusada';
    }
    if (e.status === 'cancelled') {
      return 'Cancelada';
    }
    return e.status || '';
  }

  function approvalCellHtml(e) {
    var tip = approvalHoverTitle(e);
    if (e.status === 'pending_approval') {
      return (
        '<span class="gcv-exc-appr gcv-exc-appr--wait" title="' + esc(tip) + '">' + icoHourglass() + '</span>' +
        '<span class="gcv-exc-appr-btns">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-approve-exc="' + e.id + '">Aprovar</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-reject-exc="' + e.id + '">Recusar</button>' +
        '</span>'
      );
    }
    if (e.status === 'published' || e.status === 'soldout') {
      return '<span class="gcv-exc-appr gcv-exc-appr--ok" title="' + esc(tip) + '">' + icoCheck() + '</span>';
    }
    if (e.status === 'rejected') {
      return '<span class="gcv-exc-appr gcv-exc-appr--no" title="' + esc(tip) + '">' + icoCancel() + '</span>';
    }
    if (e.status === 'cancelled') {
      return '<span class="gcv-exc-appr gcv-exc-appr--no" title="' + esc(tip) + '">' + icoCancel() + '</span>';
    }
    if (e.status === 'draft') {
      return '<span class="gcv-exc-appr gcv-exc-appr--muted" title="Rascunho">—</span>';
    }
    return '<span class="gcv-exc-appr gcv-exc-appr--muted" title="' + esc(e.status || '') + '">—</span>';
  }

  function sheetStatusValue(e) {
    if (e && e._sheet_status) return e._sheet_status;
    var st = String((e && e.status) || '');
    var life = String((e && e.lifecycle) || '');
    if (st === 'rejected' || life === 'rejeitada') return 'recusada';
    if (st === 'cancelled' || life === 'cancelada') return 'cancelada';
    if (st === 'pending_approval' || life === 'aguardando_aprovacao') return 'aguardando';
    if (st === 'draft' || life === 'rascunho') return 'rascunho';
    if (life === 'concluida') return 'concluida';
    if (life === 'confirmada' || walkQuorumMet(e)) return 'confirmada';
    return 'em_formacao';
  }

  function sheetStatusLabel(val) {
    var map = {
      em_formacao: 'Em formação',
      confirmada: 'Confirmada',
      recusada: 'Recusada',
      cancelada: 'Cancelada',
      concluida: 'Concluída',
      aguardando: 'Aguardando aprovação',
      rascunho: 'Rascunho'
    };
    return map[val] || val || '—';
  }

  function sheetStatusClass(val) {
    if (val === 'confirmada' || val === 'concluida') return 'gcv-exc-status-sel--ok';
    if (val === 'recusada' || val === 'cancelada') return 'gcv-exc-status-sel--no';
    if (val === 'em_formacao') return 'gcv-exc-status-sel--form';
    if (val === 'aguardando') return 'gcv-exc-status-sel--wait';
    return 'gcv-exc-status-sel--muted';
  }

  function statusSelectHtml(e) {
    var cur = sheetStatusValue(e);
    var pending = e.status === 'pending_approval' || cur === 'aguardando';
    var vanPending = isTransportPendingOnConfirmed(e);
    var opts = [
      ['em_formacao', 'Em formação'],
      ['confirmada', 'Confirmada'],
      ['recusada', 'Recusada']
    ];
    if (cur === 'cancelada') opts.push(['cancelada', 'Cancelada']);
    if (cur === 'concluida') opts.push(['concluida', 'Concluída']);
    if (cur === 'aguardando') opts.unshift(['aguardando', 'Aguardando aprovação']);
    if (cur === 'rascunho') opts.unshift(['rascunho', 'Rascunho']);
    var html = '<div class="gcv-exc-status-wrap' + (vanPending ? ' is-van-pending' : '') + '">' +
      '<select class="gcv-exc-sheet__in gcv-exc-status-sel ' + sheetStatusClass(cur) + '" data-field="sheet_status" data-exc-id="' + e.id + '" title="' +
      (vanPending ? 'Confirmada. O quórum com transporte ainda não foi atingido.' : 'Status') + '"' +
      (pending ? ' disabled' : '') + '>';
    opts.forEach(function (o) {
      html += '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    });
    html += '</select>';
    if (vanPending) {
      html += '<span class="gcv-exc-status-van" title="Quórum com transporte ainda não atingido" aria-hidden="true">' +
        '<span class="gcv-exc-status-van__car">' + icoCar() + '</span>' +
        '<span class="gcv-exc-status-van__x">' + icoCancel() + '</span>' +
        '</span>';
    }
    return html + '</div>';
  }

  function sheetCommissionPct(e) {
    var pct = parseFloat(e && e.commission_pct_applied);
    if (!isFinite(pct) || pct < 0 || pct >= 100) pct = 10;
    return pct;
  }

  function commercialRoundReais(amount) {
    var n = Math.ceil(Number(amount) - 1e-9);
    if (!isFinite(n) || n < 0) n = 0;
    while (n % 5 !== 0 && n % 8 !== 0) n += 1;
    return n;
  }

  function finalCentsFromGuideNet(netCents, pct) {
    netCents = parseInt(netCents, 10) || 0;
    if (netCents < 100) return 0;
    var divisor = 1 - (Number(pct) / 100);
    if (!isFinite(divisor) || divisor <= 0) return 0;
    return commercialRoundReais(Math.round(netCents / divisor) / 100) * 100;
  }

  function displayedGuideNetCents(e, transport) {
    if (!e) return 0;
    var raw = transport ? e.guide_net_transport_cents : e.guide_net_cents;
    if (raw != null && raw !== '') return parseInt(raw, 10) || 0;
    var price = parseInt(transport ? e.price_transport_cents : e.price_cents, 10) || 0;
    if (price <= 0) return 0;
    var keep = 1 - (sheetCommissionPct(e) / 100);
    if (!(keep > 0 && keep < 1)) keep = 0.9;
    return Math.max(0, Math.round(price * keep));
  }

  function displayedPlatformCents(e, transport) {
    if (!e) return 0;
    var netField = transport ? 'guide_net_transport_cents' : 'guide_net_cents';
    var priceField = transport ? 'price_transport_cents' : 'price_cents';
    var draft = excSheet.drafts[String(e.id)];
    if (draft && Object.prototype.hasOwnProperty.call(draft, netField)) {
      return finalCentsFromGuideNet(draft[netField], sheetCommissionPct(e));
    }
    var stored = parseInt(e[priceField], 10) || 0;
    if (stored > 0) return stored;
    return finalCentsFromGuideNet(displayedGuideNetCents(e, transport), sheetCommissionPct(e));
  }

  function platformFeeHtml(cents) {
    if (!(parseInt(cents, 10) > 0)) {
      return '<span class="gcv-exc-sheet__fee" title="Valor na plataforma, com a taxa" hidden></span>';
    }
    return '<span class="gcv-exc-sheet__fee" title="Valor na plataforma, com a taxa">R$ ' + esc(centsToMoney(cents)) + '</span>';
  }

  function guideNetCellInner(e, field) {
    var transport = field === 'guide_net_transport_cents';
    var net = displayedGuideNetCents(e, transport);
    var title = transport
      ? 'Valor que o guia pediu, com translado'
      : 'Valor que o guia pediu, sem translado';
    return '<span class="gcv-exc-sheet__price">' +
      '<input class="gcv-exc-sheet__in gcv-exc-sheet__money" data-field="' + field + '" data-exc-id="' + e.id +
      '" inputmode="numeric" title="' + title + '" value="' + esc(net > 0 ? centsToMoney(net) : '') + '" />' +
      platformFeeHtml(displayedPlatformCents(e, transport)) +
      '</span>';
  }

  function paintSheetFeeLabel(input) {
    if (!input) return;
    var field = input.getAttribute('data-field');
    if (field !== 'guide_net_cents' && field !== 'guide_net_transport_cents') return;
    var fee = input.parentNode && input.parentNode.querySelector('.gcv-exc-sheet__fee');
    if (!fee) return;
    var id = parseInt(input.getAttribute('data-exc-id'), 10);
    var idx = findExcRow(id);
    var row = idx >= 0 ? excSheet.rows[idx] : null;
    var platform = finalCentsFromGuideNet(moneyToCents(input.value), sheetCommissionPct(row));
    if (platform > 0) {
      fee.hidden = false;
      fee.textContent = 'R$ ' + centsToMoney(platform);
    } else {
      fee.hidden = true;
      fee.textContent = '';
    }
  }

  function transportCellsHtml(e) {
    if (!excHasTransport(e)) {
      return (
        '<td class="gcv-exc-sheet__sem-t" colspan="3" data-col="transport">' +
        '<button type="button" class="gcv-exc-sheet__sem-btn" data-enable-t="' + e.id + '" title="Oferecer vagas com translado">' +
        icoCar() + ' Sem translado</button></td>'
      );
    }
    var maxT = parseInt(e.max_people_transport, 10);
    if (!Number.isFinite(maxT) || maxT < 1) maxT = 4;
    var qT = parseInt(e.quorum_transport, 10);
    if (!Number.isFinite(qT) || qT < 0) qT = 0;
    return (
      '<td class="gcv-exc-sheet__t" title="Vagas com translado">' + numSelectHtml('max_people_transport', e.id, 0, 4, maxT) + '</td>' +
      '<td class="gcv-exc-sheet__t" title="Quórum com translado">' + numSelectHtml('quorum_transport', e.id, 0, 4, Math.min(qT, 4)) + '</td>' +
      '<td class="gcv-exc-sheet__t gcv-exc-sheet__rs" title="Valor que o guia pediu, com translado. Em azul: valor na plataforma, com a taxa">' +
      guideNetCellInner(e, 'guide_net_transport_cents') + '</td>'
    );
  }

  function excSheetRowHtml(e) {
    e = rowWithDraft(e);
    var pending = e.status === 'pending_approval';
    var dirty = !!excSheet.drafts[String(e.id)];
    var timeVal = String(e.departure_time || '').slice(0, 5);
    var maxP = parseInt(e.max_people, 10);
    if (!Number.isFinite(maxP) || maxP < 1) maxP = 10;
    if (maxP > 12) maxP = 12;
    var q = parseInt(e.quorum, 10);
    if (!Number.isFinite(q) || q < 0) q = 4;
    var rowClass = [];
    if (pending) rowClass.push('is-pending');
    if (dirty) rowClass.push('is-dirty');
    return (
      '<tr data-exc-row="' + e.id + '"' + (rowClass.length ? ' class="' + rowClass.join(' ') + '"' : '') + '>' +
      '<td class="gcv-exc-sheet__appr" data-col="approval">' + approvalCellHtml(e) + '</td>' +
      '<td class="gcv-exc-sheet__status" data-col="status">' + statusSelectHtml(e) + '</td>' +
      '<td class="gcv-exc-sheet__datecell"><input class="gcv-exc-sheet__in gcv-exc-sheet__date" data-field="date_iso" data-exc-id="' + e.id + '" type="date" value="' + esc(e.date_iso || '') + '" /></td>' +
      '<td class="gcv-exc-sheet__timecell"><input class="gcv-exc-sheet__in gcv-exc-sheet__time" data-field="departure_time" data-exc-id="' + e.id + '" type="time" step="600" value="' + esc(timeVal) + '" /></td>' +
      '<td class="gcv-exc-sheet__clip gcv-exc-sheet__name" title="' + esc((e.attraction_title || '') + (e.departure_city_name ? ' · ' + e.departure_city_name : '')) + '">' + excAttrSelectHtml(e) + '</td>' +
      '<td class="gcv-exc-sheet__clip gcv-exc-sheet__name" title="' + esc(e.guide_name || '') + '">' + excGuideSelectHtml(e) + '</td>' +
      '<td class="gcv-exc-sheet__grupo" data-col="grupo">' + grupoCellHtml(e) + '</td>' +
      '<td title="Máximo de vagas">' + numSelectHtml('max_people', e.id, 1, 12, maxP) + '</td>' +
      '<td class="gcv-exc-sheet__walk" title="Quórum sem translado">' + numSelectHtml('quorum', e.id, 0, maxP, Math.min(q, maxP)) + '</td>' +
      '<td title="Inscritos por fora">' + numSelectHtml('preconfirmed_people', e.id, 0, 5, e.preconfirmed_people || 0) + '</td>' +
      transportCellsHtml(e) +
      '<td class="gcv-exc-sheet__walk gcv-exc-sheet__rs" title="Valor que o guia pediu, sem translado. Em azul: valor na plataforma, com a taxa">' +
      guideNetCellInner(e, 'guide_net_cents') + '</td>' +
      '<td class="gcv-exc-sheet__actions">' +
      cmsRowActions(
        'data-edit-exc="' + e.id + '"',
        'data-del-exc="' + e.id + '" data-del-label="' + esc((e.date_iso || '') + ' · ' + (e.attraction_title || '')) + '"'
      ) +
      '</td></tr>'
    );
  }

  function paintExcSheet(keepOptions) {
    var wrap = root('cms-exc-sheet-wrap');
    var meta = root('cms-exc-meta');
    if (!wrap) return;
    if (!keepOptions) writeExcSheetFilterOptions();
    if (excSheet.loadError) {
      wrap.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar excursões.</p>';
      return;
    }
    var rows = filterExcSheetRows(excSheet.rows);
    if (meta) {
      meta.innerHTML = '<strong>' + rows.length + '</strong> de ' + excSheet.rows.length +
        ' saídas · edite as células e clique em <strong>Salvar</strong> para validar';
    }
    if (!excSheet.rows.length) {
      wrap.innerHTML = '<p class="gcv-exc-sheet-empty">Nenhuma excursão. Clique em <strong>+ Criar passeio</strong> para publicar.</p>';
      return;
    }
    if (!rows.length) {
      wrap.innerHTML = '<p class="gcv-exc-sheet-empty">Nenhuma saída com esses filtros.</p>';
      return;
    }
    wrap.innerHTML =
      '<table class="gcv-exc-sheet">' +
      '<thead><tr>' +
      '<th>Aprovação</th><th>Status</th>' +
      '<th>Data</th><th>Hora</th><th class="gcv-exc-sheet__name">Atrativo</th><th class="gcv-exc-sheet__name">Guia</th>' +
      '<th>Inscrições</th><th>Máx.</th>' +
      '<th>' + thIco(icoPerson(), 'Quórum', 'Quórum sem translado') + '</th>' +
      '<th>Por fora</th>' +
      '<th>' + thIco(icoCar(), 'Vagas', 'Vagas com translado') + '</th>' +
      '<th>' + thIco(icoCar(), 'Quórum', 'Quórum com translado') + '</th>' +
      '<th class="gcv-exc-sheet__rs">' + thIco(icoCar(), 'R$', 'Valor que o guia pediu, com translado. Em azul: valor na plataforma') + '</th>' +
      '<th class="gcv-exc-sheet__rs">' + thIco(icoPerson(), 'R$', 'Valor que o guia pediu, sem translado. Em azul: valor na plataforma') + '</th>' +
      '<th class="gcv-exc-sheet__actions"></th>' +
      '</tr></thead><tbody>' +
      rows.map(excSheetRowHtml).join('') +
      '</tbody></table>';
    bindExcSheetTable(wrap);
    syncSheetSaveBar();
  }

  function findExcRow(id) {
    var i;
    for (i = 0; i < excSheet.rows.length; i++) {
      if (String(excSheet.rows[i].id) === String(id)) return i;
    }
    return -1;
  }

  function mergeExcRow(updated) {
    if (!updated || !updated.id) return;
    var idx = findExcRow(updated.id);
    if (idx >= 0) excSheet.rows[idx] = updated;
    else excSheet.rows.unshift(updated);
  }

  function patchValueFromInput(field, raw) {
    if (field === 'price_cents' || field === 'price_transport_cents' || field === 'guide_net_cents' || field === 'guide_net_transport_cents') return moneyToCents(raw);
    if (field === 'forming') return !(raw === '0' || raw === '' || raw === 'false');
    if (field === 'sheet_status') return String(raw || '');
    if (field === 'guide_user_id' || field === 'attraction_id') {
      var n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (field === 'max_people' || field === 'quorum' || field === 'preconfirmed_people' || field === 'max_people_transport' || field === 'quorum_transport') {
      return parseInt(raw, 10) || 0;
    }
    return raw;
  }

  function sameExcValue(e, field, next) {
    if (field === 'sheet_status') return sheetStatusValue(e) === String(next || '');
    if (field === 'forming') {
      var curForming = e.lifecycle === 'em_formacao';
      return !!next === !!curForming && !(next === false && parseInt(e.quorum, 10) !== 0) && !(next === true && parseInt(e.quorum, 10) === 0);
    }
    if (field === 'price_cents' || field === 'price_transport_cents') {
      return (parseInt(e[field], 10) || 0) === (parseInt(next, 10) || 0);
    }
    if (field === 'guide_net_cents' || field === 'guide_net_transport_cents') {
      return displayedGuideNetCents(e, field === 'guide_net_transport_cents') === (parseInt(next, 10) || 0);
    }
    if (field === 'departure_time') {
      return String(e.departure_time || '').slice(0, 5) === String(next || '').slice(0, 5);
    }
    if (field === 'guide_user_id' || field === 'attraction_id') {
      return String(e[field] || '') === String(next || '');
    }
    if (field === 'offer_transport') {
      return !!excHasTransport(e) === !!next;
    }
    return String(e[field] == null ? '' : e[field]) === String(next == null ? '' : next);
  }

  function payloadForField(field, value) {
    var payload = { patch: 1 };
    payload[field] = value;
    if (field === 'attraction_id') {
      payload.attraction_ids = value ? [value] : [];
    }
    if (field === 'max_people_transport') {
      payload.offer_transport = (parseInt(value, 10) || 0) > 0;
      if (!payload.offer_transport) {
        payload.quorum_transport = 0;
        payload.price_transport_cents = 0;
        payload.guide_net_transport_cents = 0;
      }
    }
    if (field === 'price_transport_cents' && (parseInt(value, 10) || 0) > 0) {
      payload.offer_transport = true;
    }
    if (field === 'guide_net_transport_cents' && (parseInt(value, 10) || 0) > 0) {
      payload.offer_transport = true;
    }
    if (field === 'forming') {
      payload.lifecycle = value ? 'em_formacao' : 'confirmada';
    }
    if (field === 'sheet_status') {
      delete payload.sheet_status;
      if (value === 'em_formacao') {
        payload.forming = true;
        payload.lifecycle = 'em_formacao';
      } else if (value === 'confirmada') {
        payload.forming = false;
        payload.lifecycle = 'confirmada';
      } else if (value === 'recusada') {
        payload.status = 'rejected';
      } else if (value === 'cancelada') {
        payload.status = 'cancelled';
      }
    }
    if (field === 'offer_transport') {
      payload.offer_transport = value ? 1 : 0;
      if (value) {
        payload.max_people_transport = payload.max_people_transport || 4;
        payload.quorum_transport = payload.quorum_transport || 4;
      } else {
        payload.max_people_transport = 0;
        payload.quorum_transport = 0;
        payload.price_transport_cents = 0;
        payload.guide_net_transport_cents = 0;
      }
    }
    return payload;
  }

  function fieldLabel(field) {
    var map = {
      date_iso: 'Data',
      departure_time: 'Hora',
      attraction_id: 'Atrativo',
      guide_user_id: 'Guia',
      max_people: 'Máximo',
      quorum: 'Quórum',
      preconfirmed_people: 'Por fora',
      max_people_transport: 'Vagas com translado',
      quorum_transport: 'Quórum com translado',
      price_transport_cents: 'Valor com translado',
      price_cents: 'Valor sem translado',
      guide_net_transport_cents: 'Valor do guia (com translado)',
      guide_net_cents: 'Valor do guia (sem translado)',
      sheet_status: 'Status',
      forming: 'Status',
      offer_transport: 'Translado'
    };
    return map[field] || field;
  }

  function findGuideLabel(id) {
    if (!id) return 'Sem guia';
    var i;
    for (i = 0; i < (excSheet.guides || []).length; i++) {
      var g = excSheet.guides[i];
      if (String(g.user_id || g.id) === String(id)) return g.full_name || g.nickname || g.name || ('#' + id);
    }
    return '#' + id;
  }

  function findAttrLabel(id) {
    if (!id) return '—';
    var i;
    for (i = 0; i < (excSheet.attractions || []).length; i++) {
      var a = excSheet.attractions[i];
      if (String(a.id) === String(id)) return a.title_pt || a.slug || ('#' + id);
    }
    return '#' + id;
  }

  function formatSheetValue(e, field, value) {
    if (field === 'sheet_status') return sheetStatusLabel(value);
    if (field === 'forming') return value ? 'Em formação' : 'Confirmada';
    if (field === 'date_iso') return fmtDateBr(value);
    if (field === 'departure_time') return String(value || '').slice(0, 5) || '—';
    if (field === 'guide_user_id') return findGuideLabel(value);
    if (field === 'attraction_id') return findAttrLabel(value);
    if (field === 'price_cents' || field === 'price_transport_cents' || field === 'guide_net_cents' || field === 'guide_net_transport_cents') return centsToMoney(value || 0);
    if (field === 'offer_transport') return value ? 'Com translado' : 'Sem translado';
    if (value == null || value === '') return '—';
    return String(value);
  }

  function currentFieldValue(e, field) {
    if (field === 'sheet_status') return sheetStatusValue(e);
    if (field === 'forming') return e.lifecycle === 'em_formacao';
    if (field === 'offer_transport') return excHasTransport(e) ? 1 : 0;
    if (field === 'departure_time') return String(e.departure_time || '').slice(0, 5);
    if (field === 'guide_user_id' || field === 'attraction_id') {
      var n = parseInt(e[field], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (field === 'guide_net_cents' || field === 'guide_net_transport_cents') {
      return displayedGuideNetCents(e, field === 'guide_net_transport_cents');
    }
    return e[field];
  }

  function rowWithDraft(e) {
    if (!e) return e;
    var d = excSheet.drafts[String(e.id)];
    if (!d) return e;
    var copy = {};
    Object.keys(e).forEach(function (k) { copy[k] = e[k]; });
    Object.keys(d).forEach(function (k) {
      if (k === 'sheet_status') {
        copy._sheet_status = d[k];
        return;
      }
      copy[k] = d[k];
    });
    if (d.sheet_status === 'recusada') {
      copy.status = 'rejected';
      copy.lifecycle = 'rejeitada';
    } else if (d.sheet_status === 'cancelada') {
      copy.status = 'cancelled';
      copy.lifecycle = 'cancelada';
    } else if (d.sheet_status === 'confirmada') {
      if (copy.status !== 'pending_approval') copy.status = 'published';
      copy.lifecycle = 'confirmada';
      copy.forming = false;
    } else if (d.sheet_status === 'em_formacao') {
      if (copy.status !== 'pending_approval') copy.status = 'published';
      copy.lifecycle = 'em_formacao';
      copy.forming = true;
    }
    if (d.attraction_id) {
      copy.attraction_id = d.attraction_id;
      copy.attraction_ids = [d.attraction_id];
      copy.attraction_title = findAttrLabel(d.attraction_id);
    }
    if (Object.prototype.hasOwnProperty.call(d, 'guide_user_id')) {
      copy.guide_user_id = d.guide_user_id;
      copy.guide_name = findGuideLabel(d.guide_user_id);
    }
    return copy;
  }

  function hasUnsavedSheet() {
    return Object.keys(excSheet.drafts).length > 0;
  }

  function countSheetChanges() {
    var n = 0;
    Object.keys(excSheet.changes).forEach(function (id) {
      n += Object.keys(excSheet.changes[id] || {}).length;
    });
    return n;
  }

  function syncSheetSaveBar() {
    var bar = root('cms-exc-savebar');
    var countEl = root('cms-exc-savebar-count');
    var n = countSheetChanges();
    var tours = Object.keys(excSheet.drafts).length;
    if (!bar) return;
    if (n < 1) {
      bar.classList.remove('is-on');
      return;
    }
    bar.classList.add('is-on');
    if (countEl) {
      countEl.textContent = n + (n === 1 ? ' alteração' : ' alterações') +
        (tours > 1 ? ' em ' + tours + ' passeios' : '');
    }
  }

  function clearSheetDrafts() {
    excSheet.drafts = {};
    excSheet.changes = {};
    syncSheetSaveBar();
  }

  function revertSheetDrafts() {
    clearSheetDrafts();
    paintExcSheet(true);
  }

  function queueExcSheetChange(id, field, next, extra) {
    extra = extra || {};
    var idx = findExcRow(id);
    if (idx < 0) return;
    var base = excSheet.rows[idx];
    var key = String(id);
    var fromVal = currentFieldValue(rowWithDraft(base), field);
    if (!excSheet.changes[key] || !excSheet.changes[key][field]) {
      fromVal = currentFieldValue(base, field);
    } else {
      fromVal = excSheet.changes[key][field].from;
    }
    if (!excSheet.drafts[key]) excSheet.drafts[key] = {};
    if (!excSheet.changes[key]) excSheet.changes[key] = {};
    if (sameExcValue(base, field, next)) {
      delete excSheet.drafts[key][field];
      delete excSheet.changes[key][field];
      if (!Object.keys(excSheet.drafts[key]).length) delete excSheet.drafts[key];
      if (!Object.keys(excSheet.changes[key] || {}).length) delete excSheet.changes[key];
    } else {
      excSheet.drafts[key][field] = next;
      excSheet.changes[key][field] = {
        from: fromVal,
        to: next,
        fromLabel: formatSheetValue(base, field, fromVal),
        toLabel: formatSheetValue(base, field, next),
        fieldLabel: fieldLabel(field)
      };
    }
    syncSheetSaveBar();
    var display = rowWithDraft(base);
    if (extra.replaceRow) {
      replaceExcSheetRow(display);
      return;
    }
    var tr = document.querySelector('[data-exc-row="' + id + '"]');
    if (tr) {
      tr.classList.toggle('is-dirty', !!excSheet.drafts[key]);
      if (field === 'sheet_status' || field === 'quorum' || field === 'quorum_transport' || field === 'max_people_transport' || field === 'offer_transport' || field === 'preconfirmed_people') {
        refreshStatusCell(tr, display);
      }
    }
  }

  function buildDiffHtml(leaving) {
    var lead = leaving
      ? 'Há alterações não salvas. Confirmar o salvamento destas mudanças?'
      : 'Confirmar o salvamento destas alterações?';
    var items = '';
    Object.keys(excSheet.changes).forEach(function (id) {
      var idx = findExcRow(id);
      var e = idx >= 0 ? rowWithDraft(excSheet.rows[idx]) : { id: id };
      var title = (e.attraction_title || ('Passeio #' + id)) + ' · ' + fmtDateBr(e.date_iso);
      var lis = '';
      Object.keys(excSheet.changes[id]).forEach(function (field) {
        var ch = excSheet.changes[id][field];
        lis += '<li>' + esc(ch.fieldLabel) + ': ' + esc(ch.fromLabel) + ' → ' + esc(ch.toLabel) + '</li>';
      });
      items += '<li><span class="gcv-exc-diff__tour">' + esc(title) + '</span><ul class="gcv-exc-diff__list">' + lis + '</ul></li>';
    });
    return '<p class="gcv-confirm__lead">' + lead + '</p><ul class="gcv-exc-diff">' + items + '</ul>';
  }

  function promptSaveChanges(leaving, onSaved) {
    if (!hasUnsavedSheet()) {
      if (typeof onSaved === 'function') onSaved(true);
      return;
    }
    if (excSheet.confirmOpen) return;
    excSheet.confirmOpen = true;
    gcvConfirm('', {
      html: buildDiffHtml(!!leaving),
      okText: 'Sim',
      cancelText: 'Cancelar'
    }).then(function (ok) {
      excSheet.confirmOpen = false;
      if (!ok) {
        revertSheetDrafts();
        return;
      }
      saveAllSheetDrafts(function (saved) {
        if (saved && typeof onSaved === 'function') onSaved(true);
      });
    });
  }

  function saveAllSheetDrafts(done) {
    var ids = Object.keys(excSheet.drafts);
    if (!ids.length) {
      if (typeof done === 'function') done(true);
      return;
    }
    var pending = ids.length;
    var failed = false;
    ids.forEach(function (id) {
      var d = excSheet.drafts[id] || {};
      var payload = { patch: 1, id: parseInt(id, 10) };
      Object.keys(d).forEach(function (field) {
        var part = payloadForField(field, d[field]);
        Object.keys(part).forEach(function (k) {
          if (k === 'patch') return;
          payload[k] = part[k];
        });
      });
      if (d.sheet_status === 'em_formacao' || d.sheet_status === 'confirmada') {
        var idxSt = findExcRow(id);
        var curSt = idxSt >= 0 ? String(excSheet.rows[idxSt].status || '') : '';
        if (curSt === 'rejected' || curSt === 'cancelled' || curSt === 'draft') {
          payload.status = 'published';
        }
      }
      var tr = document.querySelector('[data-exc-row="' + id + '"]');
      saveExcSheetPatch(parseInt(id, 10), payload, tr, {
        field: 'bundle',
        replaceRow: true,
        onSuccess: function () {
          delete excSheet.drafts[id];
          delete excSheet.changes[id];
          pending -= 1;
          if (pending > 0) return;
          syncSheetSaveBar();
          if (typeof done === 'function') done(!failed);
        },
        onError: function () {
          failed = true;
          pending -= 1;
          if (pending > 0) return;
          syncSheetSaveBar();
          if (typeof done === 'function') done(false);
        }
      });
    });
  }

  function guardLeave(proceed) {
    if (!hasUnsavedSheet()) return true;
    promptSaveChanges(true, function () {
      if (typeof proceed === 'function') proceed();
    });
    return false;
  }

  function refreshStatusCell(tr, e) {
    var cell = tr && tr.querySelector('[data-col="status"]');
    if (!cell) return;
    cell.innerHTML = statusSelectHtml(e);
    bindExcSheetTable(cell);
  }

  function applyDerivedCells(tr, e) {
    if (!tr || !e) return;
    var grupo = tr.querySelector('[data-col="grupo"]');
    if (grupo) grupo.innerHTML = grupoCellHtml(e);
    refreshStatusCell(tr, e);
  }

  function replaceExcSheetRow(e) {
    var tr = document.querySelector('[data-exc-row="' + e.id + '"]');
    if (!tr || !e) return;
    var tmp = document.createElement('tbody');
    tmp.innerHTML = excSheetRowHtml(e);
    var next = tmp.firstElementChild;
    if (!next) return;
    tr.parentNode.replaceChild(next, tr);
    bindExcSheetTable(next);
  }

  function saveExcSheetPatch(id, payload, tr, extra) {
    extra = extra || {};
    payload = payload || {};
    payload.patch = 1;
    payload.id = id;
    var key = id + ':' + (extra.field || 'patch');
    if (excSheet.saving[key]) {
      if (typeof extra.onError === 'function') extra.onError();
      return;
    }
    if (tr) {
      tr.classList.remove('is-saved', 'is-error');
      tr.classList.add('is-saving');
    }
    excSheet.saving[key] = true;
    sendJson('PUT', '/api/admin/excursions.php', payload, function (err, res) {
      delete excSheet.saving[key];
      if (!res || !res.ok) {
        if (tr) {
          tr.classList.remove('is-saving');
          tr.classList.add('is-error');
        }
        alert((res && res.error) || 'Não foi possível salvar');
        if (typeof extra.onError === 'function') extra.onError();
        return;
      }
      mergeExcRow(res.data);
      delete excSheet.drafts[String(id)];
      delete excSheet.changes[String(id)];
      if (typeof extra.onSuccess === 'function') extra.onSuccess(res.data);
      if (extra.replaceRow) {
        replaceExcSheetRow(res.data);
        return;
      }
      var rowEl = document.querySelector('[data-exc-row="' + id + '"]') || tr;
      if (rowEl) {
        rowEl.classList.remove('is-saving', 'is-error');
        rowEl.classList.add('is-saved');
        applyDerivedCells(rowEl, res.data);
        setTimeout(function () { rowEl.classList.remove('is-saved'); }, 900);
      }
    });
  }

  function effectiveSheetField(e, field) {
    var d = e && excSheet.drafts[String(e.id)];
    if (d && Object.prototype.hasOwnProperty.call(d, field)) return d[field];
    if (field === 'date_iso') return e.date_iso;
    if (field === 'guide_user_id') return e.guide_user_id;
    return e[field];
  }

  function guideDateConflict(exceptId, guideId, dateIso) {
    if (!guideId || !dateIso) return null;
    var i;
    for (i = 0; i < excSheet.rows.length; i++) {
      var row = excSheet.rows[i];
      if (String(row.id) === String(exceptId)) continue;
      var st = String(row.status || '');
      if (st === 'cancelled' || st === 'rejected') continue;
      var g = effectiveSheetField(row, 'guide_user_id');
      var d = String(effectiveSheetField(row, 'date_iso') || '').slice(0, 10);
      if (String(g || '') === String(guideId) && d === String(dateIso).slice(0, 10)) {
        return row;
      }
    }
    return null;
  }

  function warnGuideDateConflict(hit, dateIso) {
    var when = fmtDateBr(dateIso);
    var title = (hit && (hit.attraction_title || ('#' + hit.id))) || 'outro passeio';
    var msg = 'Este guia já possui um passeio em ' + when + ' (' + title + ').\nEscolha outra data.';
    if (typeof window.gcvAlert === 'function') window.gcvAlert(msg);
    else window.alert(msg);
  }

  function revertInputToCurrent(el, e, field) {
    var cur = currentFieldValue(rowWithDraft(e), field);
    if (field === 'guide_user_id' || field === 'attraction_id') {
      el.value = cur ? String(cur) : '';
    } else if (field === 'date_iso') {
      el.value = cur || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.value = cur == null ? '' : String(cur);
    }
  }

  function saveExcSheetField(el) {
    var id = parseInt(el.getAttribute('data-exc-id'), 10);
    var field = el.getAttribute('data-field');
    if (!id || !field) return;
    var idx = findExcRow(id);
    if (idx < 0) return;
    var next = patchValueFromInput(field, el.value);
    var e = excSheet.rows[idx];
    if (field === 'date_iso' || field === 'guide_user_id') {
      var nextDate = field === 'date_iso' ? next : effectiveSheetField(rowWithDraft(e), 'date_iso');
      var nextGuide = field === 'guide_user_id' ? next : effectiveSheetField(rowWithDraft(e), 'guide_user_id');
      var hit = guideDateConflict(id, nextGuide, nextDate);
      if (hit) {
        warnGuideDateConflict(hit, nextDate);
        revertInputToCurrent(el, e, field);
        return;
      }
    }
    var hadT = excHasTransport(rowWithDraft(e));
    var willDropT = field === 'max_people_transport' && !(parseInt(next, 10) > 0);
    var willAddT = field === 'max_people_transport' && (parseInt(next, 10) > 0) && !hadT;
    queueExcSheetChange(id, field, next, { replaceRow: willDropT || willAddT || field === 'sheet_status' });
  }

  function bindExcSheetTable(wrap) {
    if (!wrap || !wrap.querySelectorAll) return;
    wrap.querySelectorAll('[data-field]').forEach(function (el) {
      if (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time') {
        el.addEventListener('change', function () { saveExcSheetField(el); });
      } else {
        el.addEventListener('input', function () { paintSheetFeeLabel(el); });
        el.addEventListener('change', function () { saveExcSheetField(el); });
        el.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            el.blur();
          }
        });
      }
    });
    wrap.querySelectorAll('[data-enable-t]').forEach(function (btn) {
      btn.onclick = function () {
        var id = parseInt(btn.getAttribute('data-enable-t'), 10);
        queueExcSheetChange(id, 'offer_transport', 1, { replaceRow: true });
        queueExcSheetChange(id, 'max_people_transport', 4);
        queueExcSheetChange(id, 'quorum_transport', 4, { replaceRow: true });
      };
    });
    wrap.querySelectorAll('[data-approve-exc]').forEach(function (btn) {
      btn.onclick = function () {
        gcvConfirm('Aprovar este passeio e publicar no site?', { okText: 'Aprovar' }).then(function (ok) {
          if (!ok) return;
          btn.disabled = true;
          sendJson('POST', '/api/admin/excursion-approvals.php', {
            id: parseInt(btn.getAttribute('data-approve-exc'), 10),
            action: 'approve',
          }, function (e, r) {
            btn.disabled = false;
            if (!r || !r.ok) {
              alert((r && r.error) || 'Erro ao aprovar');
              return;
            }
            alert('Passeio aprovado. O guia foi avisado no WhatsApp cadastrado.');
            renderExcursions();
            if (window.GcvDashboard && typeof window.GcvDashboard.refreshApprovalBadge === 'function') {
              window.GcvDashboard.refreshApprovalBadge();
            }
          });
        });
      };
    });
    wrap.querySelectorAll('[data-reject-exc]').forEach(function (btn) {
      btn.onclick = function () {
        var reason = prompt('Motivo da rejeição:');
        if (!reason) return;
        btn.disabled = true;
        sendJson('POST', '/api/admin/excursion-approvals.php', {
          id: parseInt(btn.getAttribute('data-reject-exc'), 10),
          action: 'reject',
          rejection_reason: reason,
        }, function (e, r) {
          btn.disabled = false;
          if (!r || !r.ok) {
            alert((r && r.error) || 'Erro ao rejeitar');
            return;
          }
          alert('Passeio recusado. O guia foi avisado no WhatsApp' + (reason ? ' com a justificativa.' : '.'));
          renderExcursions();
          if (window.GcvDashboard && typeof window.GcvDashboard.refreshApprovalBadge === 'function') {
            window.GcvDashboard.refreshApprovalBadge();
          }
        });
      };
    });
    wrap.querySelectorAll('[data-edit-exc]').forEach(function (btn) {
      btn.onclick = function () {
        get('/api/admin/excursions.php?id=' + btn.getAttribute('data-edit-exc'), function (e, r) {
          if (r && r.ok) openExcursionForm(r.data);
        });
      };
    });
    wrap.querySelectorAll('[data-del-exc]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-del-exc');
        var label = btn.getAttribute('data-del-label') || ('#' + id);
        gcvConfirm('Excluir permanentemente a saída\n' + label + '?\n\nEsta ação não pode ser desfeita.', { danger: true, okText: 'Excluir' }).then(function (ok) {
          if (!ok) return;
          btn.disabled = true;
          sendJson('DELETE', '/api/admin/excursions.php', { id: parseInt(id, 10) }, function (e, r) {
            if (!r || !r.ok) {
              btn.disabled = false;
              alert((r && r.error) || 'Erro ao excluir');
              return;
            }
            var idx = findExcRow(id);
            if (idx >= 0) excSheet.rows.splice(idx, 1);
            delete excSheet.drafts[String(id)];
            delete excSheet.changes[String(id)];
            paintExcSheet(true);
          });
        });
      };
    });
    bindSheetDatePickers(wrap);
  }

  function bindSheetDatePickers(scope) {
    if (!scope || typeof window.gcvBindDatePicker !== 'function') return;
    var list = scope.querySelectorAll ? scope.querySelectorAll('.gcv-exc-sheet__date') : [];
    Array.prototype.forEach.call(list, function (input) {
      window.gcvBindDatePicker(input, { hideIcon: true, compact: true });
    });
  }

  function closeAdminPublishForm() {
    var host = root('cms-exc-form');
    if (host) {
      host.hidden = true;
      host.innerHTML = '';
      host.classList.remove('gcv-cms-card--publish');
    }
    ['cms-exc-toolbar', 'cms-exc-sheet-wrap', 'cms-exc-meta'].forEach(function (id) {
      var el = root(id);
      if (el) el.hidden = false;
    });
    var head = root('cms-exc-section-head');
    if (head) head.hidden = false;
    var title = head && head.querySelector('.gcv-dash-section-title');
    if (title) title.textContent = 'Excursões (próximas saídas)';
  }

  function openExcursionForm(ex) {
    var host = root('cms-exc-form');
    if (!host) return;
    if (!window.GcvDashRoles || typeof window.GcvDashRoles.loadGuidePublish !== 'function') {
      alert('Formulário de passeio indisponível. Recarregue a página.');
      return;
    }
    ['cms-exc-toolbar', 'cms-exc-sheet-wrap', 'cms-exc-meta'].forEach(function (id) {
      var el = root(id);
      if (el) el.hidden = true;
    });
    var pageHead = root('cms-exc-section-head');
    if (pageHead) pageHead.hidden = true;
    host.hidden = false;
    host.classList.add('gcv-cms-card--publish');
    host.innerHTML =
      '<div class="gcv-dash-section-head">' +
      '<h3 class="gcv-dash-section-title" style="margin:0;padding:0;border:0">' + (ex ? 'Editar passeio' : 'Criar passeio') + '</h3>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" id="cms-exc-form-back">Voltar</button>' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--blue gcv-dash-btn--sm" id="ge-clear-publish">' + (ex ? 'Cancelar' : 'Limpar') + '</button>' +
      '</div></div>' +
      '<form class="gcv-dash-form gcv-dash-form--publish" id="gcv-admin-create-tour-form" novalidate></form>';
    var back = root('cms-exc-form-back');
    if (back) back.onclick = function () { closeAdminPublishForm(); };
    window.GcvDashRoles.loadGuidePublish({
      admin: true,
      form: document.getElementById('gcv-admin-create-tour-form'),
      edit: ex || null,
      onDone: function () {
        closeAdminPublishForm();
        renderExcursions();
      }
    });
    try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) {}
  }

  function open(module) {
    state.module = module;
    if (module === 'cities') renderCities();
    else if (module === 'articles') renderArticles();
    else if (module === 'attractions') renderAttractions();
    else if (module === 'guides') renderGuides();
    else if (module === 'excursions') renderExcursions();
  }

  function boot() {
    if (window.__gcvExcSheetUnload) return;
    window.__gcvExcSheetUnload = true;
    window.addEventListener('beforeunload', function (ev) {
      if (!hasUnsavedSheet()) return;
      ev.preventDefault();
      ev.returnValue = '';
    });
  }

  global.GcvAdminCms = { open: open, boot: boot, guardLeave: guardLeave, hasUnsaved: hasUnsavedSheet };
})(typeof window !== 'undefined' ? window : globalThis);

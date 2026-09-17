/* gcv-admin-cms.js — CMS Admin: Revista, Atrativos, Guias, Cidades, Excursões */
(function (global) {
  'use strict';

  var state = { module: null, editingId: null, cities: [], attractions: [], guides: [] };

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
    return ((parseInt(c, 10) || 0) / 100).toFixed(2).replace('.', ',');
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
    var hint = section ? section.querySelector('.gcv-dash-hint') : null;
    if (section) section.classList.toggle('is-editing', !visible);
    if (list) {
      list.hidden = !visible;
      list.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    if (toolbar) {
      toolbar.hidden = !visible;
      toolbar.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
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
      if (g && g.profile_complete === false) return '<span class="gcv-badge gcv-badge--muted">RASCUNHO</span>';
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

  function renderGuides() {
    var box = root('cms-guides-root');
    if (!box) return;
    var section = document.getElementById('section-cms-guides');
    if (section) section.classList.remove('is-editing');
    var hint = section ? section.querySelector('.gcv-dash-hint') : null;
    if (hint) hint.hidden = false;
    box.innerHTML =
      '<div class="gcv-cms-toolbar" id="cms-guide-toolbar">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-guide-new">+ Novo guia</button>' +
      '</div>' +
      '<div id="cms-guide-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-guide-list" class="gcv-cms-list">Carregando…</div>' +
      '<h3 class="gcv-dash-section-title" style="margin-top:1.5rem;font-size:1.05rem;">E-mails bloqueados</h3>' +
      '<div id="cms-blocked-emails" class="gcv-cms-list">Carregando…</div>';
    root('cms-guide-new').onclick = function () { openGuideForm(null); };
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
    box.innerHTML = rows.map(function (row) {
      return '<article class="gcv-cms-row">' +
        '<div class="gcv-cms-row__body"><div class="gcv-cms-row__main">' +
        '<div class="gcv-cms-row__titleline"><strong>' + esc(row.email) + '</strong>' +
        '<span class="gcv-badge gcv-badge--blocked">BLOQUEADO</span></div>' +
        '<div class="gcv-cms-row__meta">' + esc(row.reason || 'Sem motivo registrado') + '</div>' +
        '</div></div>' +
        '<div class="gcv-cms-row-side">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-unblock-email="' + esc(row.email) + '">Desbloquear</button>' +
        '</div></article>';
    }).join('');
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
    rows = (rows || []).slice().sort(function (a, b) {
      function rank(g) {
        var st = String((g && g.status) || '');
        var complete = !!(g && g.profile_complete);
        var approved = guideWasApproved(g);
        if (st === 'pending' && complete) return 0;
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
    list.innerHTML = rows.length ? rows.map(function (g) {
      var pending = g.status === 'pending' && !!g.profile_complete;
      var recusado = g.status === 'suspended' && !guideWasApproved(g);
      var name = g.full_name || g.name || g.nickname || 'Guia';
      var decide = '';
      if (pending) {
        decide = '<div class="gcv-cms-row__decide" style="margin-top:0.45rem;">' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-approve-guide="' + g.user_id + '">Aprovar</button>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-reject-guide="' + g.user_id + '">Recusar</button>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-block-guide="' + g.user_id + '">Bloquear</button>' +
          '</div>';
      } else if (recusado) {
        decide = '<div class="gcv-cms-row__decide" style="margin-top:0.45rem;">' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-approve-guide="' + g.user_id + '">Aprovar</button>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-block-guide="' + g.user_id + '">Bloquear</button>' +
          '</div>';
      }
      return (
        '<article class="gcv-cms-row gcv-cms-row--guide' + (pending || recusado ? ' gcv-cms-row--pending' : '') + '">' +
        '<div class="gcv-cms-row__body">' +
        guideListPhotoHtml(g) +
        '<div class="gcv-cms-row__main">' +
        '<div class="gcv-cms-row__status">' + guideAccountBadge(g) + '</div>' +
        '<strong class="gcv-cms-row__name">' + esc(name) + '</strong>' +
        guideListMetaHtml(g) +
        decide +
        '</div></div>' +
        '<div class="gcv-cms-row-side">' +
        cmsRowActions('data-edit-guide="' + g.user_id + '"') +
        '</div></article>'
      );
    }).join('') : '<p>Nenhum guia credenciado. Clique em <strong>+ Novo guia</strong>.</p>';

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
    var awaiting = g.status === 'pending' && !!g.profile_complete;
    var draft = g.status === 'pending' && !g.profile_complete;
    var recusado = g.status === 'suspended' && !approved;
    var actions;
    if (awaiting) {
      actions =
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--success gcv-dash-btn--sm" data-guide-edit-status="active" data-from-pending="1">Aprovar</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-guide-edit-status="suspended" data-from-pending="1">Recusar</button>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--block gcv-dash-btn--sm" data-guide-edit-status="blocked" data-from-pending="1">Bloquear</button>';
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
      '<p class="gcv-cms-muted" style="margin:0.65rem 0 0;">Recusar mantém o perfil e trava novo pedido de aprovação por 45 dias. O admin pode aprovar a qualquer momento. Bloquear elimina o perfil e impede novo cadastro deste e-mail.</p>' +
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
    box.innerHTML =
      '<div class="gcv-cms-toolbar">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-exc-new">+ Nova saída</button>' +
      '</div>' +
      '<div id="cms-exc-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-exc-list" class="gcv-cms-list">Carregando…</div>';
    root('cms-exc-new').onclick = function () { openExcursionForm(null); };
    get('/api/admin/excursions.php', function (err, res) {
      var list = root('cms-exc-list');
      if (!list) return;
      if (err || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar excursões.</p>';
        return;
      }
      var rows = (res.data && res.data.excursions) || [];
      rows = rows.slice().sort(function (a, b) {
        var pa = a.status === 'pending_approval' ? 0 : 1;
        var pb = b.status === 'pending_approval' ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return String(a.date_iso || '').localeCompare(String(b.date_iso || ''));
      });
      list.innerHTML = rows.length ? rows.map(function (e) {
        var pending = e.status === 'pending_approval';
        var rejected = e.status === 'rejected';
        var approved = e.status === 'published' || e.status === 'soldout';
        var lead = '';
        if (pending) {
          lead =
            '<span class="gcv-cms-row__decide">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-approve-exc="' + e.id + '">Aprovar</button>' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-reject-exc="' + e.id + '">Recusar</button>' +
            '</span>';
        } else if (approved) {
          lead = '<span class="gcv-exc-status gcv-exc-status--ok">Aprovada</span>';
        } else if (rejected) {
          lead = '<span class="gcv-exc-status gcv-exc-status--no">Recusada</span>';
        }
        var metaStatus = pending
          ? '<strong>aguardando sua aprovação</strong>'
          : (approved || rejected ? '' : esc(e.status));
        return (
          '<article class="gcv-cms-row' + (pending ? ' gcv-cms-row--pending' : '') + '">' +
          '<div class="gcv-cms-row__main">' +
          '<div class="gcv-cms-row__titleline">' + lead +
          '<strong>' + esc(e.date_iso) + ' · ' + esc(e.attraction_title || '') + '</strong></div>' +
          '<div class="gcv-cms-muted">' + esc(e.departure_city_name || '') + ' · ' + esc(String(e.departure_time || '').slice(0, 5)) +
          ' · R$ ' + esc(centsToMoney(e.price_cents)) +
          (metaStatus ? ' · ' + metaStatus : '') +
          (e.guide_name ? ' · guia: ' + esc(e.guide_name) : ' · sem guia') +
          (e.attraction_ids && e.attraction_ids.length > 1 ? ' · ' + e.attraction_ids.length + ' atrativos' : '') +
          '</div></div>' +
          '<div class="gcv-cms-row-side">' +
          cmsRowActions(
            'data-edit-exc="' + e.id + '"',
            'data-del-exc="' + e.id + '" data-del-label="' + esc(e.date_iso + ' · ' + (e.attraction_title || '')) + '"'
          ) +
          '</div></article>'
        );
      }).join('') : '<p>Nenhuma excursão. Clique em <strong>+ Nova saída</strong> e escolha de 1 a 4 atrativos.</p>';
      list.querySelectorAll('[data-approve-exc]').forEach(function (btn) {
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
      list.querySelectorAll('[data-reject-exc]').forEach(function (btn) {
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
      list.querySelectorAll('[data-edit-exc]').forEach(function (btn) {
        btn.onclick = function () {
          get('/api/admin/excursions.php?id=' + btn.getAttribute('data-edit-exc'), function (e, r) {
            if (r && r.ok) openExcursionForm(r.data);
          });
        };
      });
      list.querySelectorAll('[data-del-exc]').forEach(function (btn) {
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
            renderExcursions();
          });
          });
        };
      });
    });
  }

  function openExcursionForm(ex) {
    ensureCities(function () {
      function loadForm(attrs) {
        function withGuides(guides) {
          guides = (guides || []).filter(function (g) { return !g.status || g.status === 'active'; });
          var form = root('cms-exc-form');
          if (!form) return;
          state.attractions = attrs || [];
          var selectedIds = selectedAttractionIdsFromEx(ex);
          form.hidden = false;
          form.innerHTML =
            '<h3>' + (ex ? 'Editar saída' : 'Nova saída de excursão') + '</h3>' +
            '<div class="gcv-dash-field-row">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Data *</label><input class="gcv-dash-input" id="ex-date" type="date" value="' + esc(ex && ex.date_iso || '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Horário de saída *</label>' +
            timeSelectHtml('ex-time-h', 'ex-time-m', ex && String(ex.departure_time || '').slice(0, 5) || '10:00') + '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Status</label><select class="gcv-dash-select" id="ex-status">' +
            [['draft','Rascunho'],['pending_approval','Aguardando aprovação'],['published','Publicada'],['soldout','Esgotada'],['rejected','Rejeitada'],['cancelled','Cancelada']].map(function (opt) {
              return '<option value="' + opt[0] + '">' + opt[1] + '</option>';
            }).join('') +
            '</select></div>' +
            '</div>' +
            '<div class="gcv-dash-field">' +
            '<label class="gcv-dash-label">Atrativos do dia * <span class="gcv-cms-muted" id="ex-attr-count"></span></label>' +
            '<div id="ex-attr-picker-wrap">' + renderAttractionPickerMulti(attrs, selectedIds) + '</div>' +
            '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade de saída *</label><select class="gcv-dash-select" id="ex-city"><option value="">Selecione…</option>' + cityOptionsHtml(ex && ex.departure_city_id) + '</select></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Ponto de encontro *</label>' +
            '<div class="gcv-meeting-point">' +
            '<div class="gcv-meeting-point__row">' +
            '<input class="gcv-dash-input" id="ex-meeting" maxlength="300" autocomplete="off" value="' + esc(ex && ex.meeting_point || '') + '" placeholder="Digite o endereço — ex.: Padaria Santa Maria" />' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-meeting-gps-btn" id="ex-meeting-gps-btn" hidden>Usar minha localização</button>' +
            '</div>' +
            '<div id="ex-meeting-suggest" class="gcv-cms-suggest"></div>' +
            '<p class="gcv-cms-muted" id="ex-meeting-gps">' +
            (ex && ex.meeting_point_lat != null && ex.meeting_point_lng != null
              ? 'GPS gravado'
              : 'Digite o endereço do ponto de encontro.') +
            '</p>' +
            '<div class="gcv-meeting-map" id="ex-meeting-map" hidden><iframe class="gcv-meeting-map__frame" title="Mapa do ponto de encontro" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>' +
            '<input type="hidden" id="ex-meeting-place" value="' + esc(ex && ex.meeting_point_place_id || '') + '" />' +
            '<input type="hidden" id="ex-meeting-lat" value="' + esc(ex && ex.meeting_point_lat != null ? ex.meeting_point_lat : '') + '" />' +
            '<input type="hidden" id="ex-meeting-lng" value="' + esc(ex && ex.meeting_point_lng != null ? ex.meeting_point_lng : '') + '" />' +
            '</div></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Guia * (obrigatório ao publicar)</label><select class="gcv-dash-select" id="ex-guide"><option value="">Selecione o guia…</option>' +
            (guides.length ? guides.map(function (g) {
              var label = (g.full_name || g.nickname || g.name || '') + (g.nickname && g.full_name ? ' (' + g.nickname + ')' : '');
              return '<option value="' + g.user_id + '"' + (ex && String(ex.guide_user_id) === String(g.user_id) ? ' selected' : '') + '>' + esc(label) + '</option>';
            }).join('') : '') +
            '</select>' +
            (guides.length ? '' : '<p class="gcv-dash-alert" style="margin-top:0.4rem;">Nenhum guia cadastrado. Cadastre em <strong>Guias credenciados</strong>.</p>') +
            '</div>' +
            '<div class="gcv-dash-field-row">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor/pessoa final (R$) *</label><input class="gcv-dash-input" id="ex-price" value="' + esc(ex ? centsToMoney(ex.price_cents) : '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Repasse previsto ao guia (R$) *</label><input class="gcv-dash-input" id="ex-guide-payout" value="' + esc(ex ? centsToMoney(ex.guide_payout_planned_cents != null ? ex.guide_payout_planned_cents : ex.guide_net_cents) : '') + '" /></div>' +
            '</div>' +
            '<div class="gcv-dash-confirm-quorum' + (ex && parseInt(ex.quorum, 10) === 0 ? ' is-confirmed' : ' is-unconfirmed') + '">' +
            '<div class="gcv-dash-field gcv-dash-confirm-quorum__confirmed">' +
            '<span class="gcv-dash-label">Passeio já confirmado?</span>' +
            '<div class="gcv-dash-yesno" role="group" aria-label="Passeio já confirmado?">' +
            '<label class="gcv-dash-yesno__opt"><input type="checkbox" id="ex-confirmed-yes"' + (ex && parseInt(ex.quorum, 10) === 0 ? ' checked' : '') + ' /> Sim</label>' +
            '<label class="gcv-dash-yesno__opt"><input type="checkbox" id="ex-confirmed-no"' + (ex && parseInt(ex.quorum, 10) === 0 ? '' : ' checked') + ' /> Não</label>' +
            '</div></div>' +
            '<div class="gcv-dash-field gcv-dash-confirm-quorum__quorum" id="ex-quorum-wrap">' +
            '<label class="gcv-dash-label" for="ex-quorum">Quórum <span class="gcv-dash-label__hint">(somente para as novas inscrições)</span></label>' +
            (function () {
              var sel = parseInt(ex && ex.quorum != null ? ex.quorum : 4, 10);
              if (!Number.isFinite(sel) || sel < 1) sel = 4;
              var opts = [
                { v: 1, t: '1' },
                { v: 2, t: '2' },
                { v: 3, t: '3' },
                { v: 4, t: '4' }
              ];
              return '<select class="gcv-dash-select" id="ex-quorum">' + opts.map(function (o) {
                return '<option value="' + o.v + '"' + (sel === o.v ? ' selected' : '') + '>' + o.t + '</option>';
              }).join('') + '</select>';
            }()) + '</div></div>' +
            '<div class="gcv-dash-field-row gcv-dash-field-row--2">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Pessoas confirmadas por fora (0 a 5)</label><input class="gcv-dash-input" id="ex-preconfirmed" type="number" min="0" max="5" value="' + esc(ex && ex.preconfirmed_people != null ? ex.preconfirmed_people : 0) + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Vagas * (máximo até 12)</label><input class="gcv-dash-input" id="ex-max" type="number" min="1" max="12" value="' + esc(ex && ex.max_people || 10) + '" /></div>' +
            '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Inscritos</label><input class="gcv-dash-input" id="ex-booked" type="number" min="0" value="' + esc(ex && ex.booked_people || 0) + '" readonly disabled tabindex="-1" title="Contador automático das reservas pagas no site" /><p class="gcv-cms-muted" style="margin:0.3rem 0 0;">Atualiza sozinho quando alguém paga no site. Não é editável.</p></div>' +
            '<label class="gcv-dash-label"><input type="checkbox" id="ex-transport"' + (ex && Number(ex.include_transport) ? ' checked' : '') + ' /> Transporte Incluso</label>' +
            '<p class="gcv-cms-muted" style="margin:0 0 0.75rem;">Modo ADMINISTRATIVE: você define o preço final e o repasse ao guia. A margem da plataforma é registrada automaticamente.</p>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Slug do carrinho (opcional)</label><input class="gcv-dash-input" id="ex-cart" value="' + esc(ex && ex.cart_slug || '') + '" placeholder="ex.: mirante-da-janela-2026-07-09" /></div>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="ex-save">Salvar</button>' +
            '<button type="button" class="gcv-dash-btn" id="ex-cancel">Fechar</button>' +
            (ex && ex.id
              ? '<button type="button" class="gcv-cms-icon-btn gcv-cms-icon-btn--danger" id="ex-delete" style="margin-left:auto;" title="Excluir" aria-label="Excluir">' + icoTrash() + '</button>'
              : '') +
            '</div>';

          var selected = selectedIds.slice();

          (function bindMeetingPlaces() {
            if (typeof global.gcvBindMeetingPoint !== 'function') return;
            global.gcvBindMeetingPoint({
              input: root('ex-meeting'),
              box: root('ex-meeting-suggest'),
              gpsEl: root('ex-meeting-gps'),
              mapEl: root('ex-meeting-map'),
              gpsBtn: root('ex-meeting-gps-btn'),
              placeEl: root('ex-meeting-place'),
              latEl: root('ex-meeting-lat'),
              lngEl: root('ex-meeting-lng'),
              getCityId: function () {
                return root('ex-city') ? root('ex-city').value : '';
              },
              get: get,
              esc: esc
            });
          })();

          (function bindConfirmedYesNo() {
            var yes = root('ex-confirmed-yes');
            var no = root('ex-confirmed-no');
            var wrap = root('ex-quorum-wrap');
            var sel = root('ex-quorum');
            function apply() {
              var confirmed = !!(yes && yes.checked);
              if (no) no.checked = !confirmed;
              if (wrap) wrap.hidden = confirmed;
              var row = wrap && wrap.closest ? wrap.closest('.gcv-dash-confirm-quorum') : null;
              if (row) {
                row.classList.toggle('is-confirmed', confirmed);
                row.classList.toggle('is-unconfirmed', !confirmed);
              }
              if (sel) {
                sel.disabled = confirmed;
                if (!confirmed) {
                  var v = parseInt(sel.value, 10);
                  if (!Number.isFinite(v) || v < 1) sel.value = '4';
                }
              }
            }
            if (yes) yes.onchange = function () {
              if (yes.checked && no) no.checked = false;
              if (!yes.checked && no) no.checked = true;
              apply();
            };
            if (no) no.onchange = function () {
              if (no.checked && yes) yes.checked = false;
              if (!no.checked && yes) yes.checked = true;
              apply();
            };
            apply();
          })();

          if (typeof global.gcvBindDatePicker === 'function') {
            global.gcvBindDatePicker(root('ex-date'), {
              min: typeof global.gcvTodayIso === 'function' ? global.gcvTodayIso() : ''
            });
          }

          function refreshPicker() {
            var wrap = root('ex-attr-picker-wrap');
            if (wrap) wrap.innerHTML = renderAttractionPickerMulti(attrs, selected);
            bindChips();
            updateHint();
          }

          function updateHint() {
            var hint = root('ex-attr-selected-hint');
            var countEl = root('ex-attr-count');
            if (countEl) countEl.textContent = '(' + selected.length + '/' + EX_ATTR_MAX + ')';
            if (!hint) return;
            if (selected.length === 0) {
              hint.textContent = 'Nenhum selecionado — escolha pelo menos 1.';
              hint.style.color = '#b91c1c';
            } else {
              var names = selected.map(function (id) {
                var found = (attrs || []).find(function (a) { return String(a.id) === String(id); });
                return found ? (found.title_pt || found.slug) : ('#' + id);
              });
              hint.textContent = 'Selecionados: ' + names.join(' + ');
              hint.style.color = '';
            }
          }

          function bindChips() {
            form.querySelectorAll('[data-attr-id]').forEach(function (chip) {
              chip.onclick = function () {
                var id = parseInt(chip.getAttribute('data-attr-id'), 10);
                var idx = selected.indexOf(id);
                if (idx !== -1) {
                  selected.splice(idx, 1);
                } else {
                  if (selected.length >= EX_ATTR_MAX) {
                    alert('Máximo de ' + EX_ATTR_MAX + ' atrativos por dia.');
                    return;
                  }
                  selected.push(id);
                }
                refreshPicker();
              };
            });
          }

          bindChips();
          updateHint();

          (function bindAdminAttrOverlay() {
            var wrap = root('ex-attr-picker-wrap');
            if (!wrap) return;
            var field = wrap.closest('.gcv-dash-field');
            if (!field) return;
            var scrim = field.querySelector(':scope > .gcv-dash-attr-ac__scrim');
            if (!scrim) {
              scrim = document.createElement('div');
              scrim.className = 'gcv-dash-attr-ac__scrim';
              scrim.hidden = true;
              field.insertBefore(scrim, field.firstChild);
            }
            function openOverlay() {
              field.classList.add('is-attr-picking');
              scrim.hidden = false;
              document.body.classList.add('gcv-attr-picking');
            }
            function closeOverlay() {
              field.classList.remove('is-attr-picking');
              scrim.hidden = true;
              if (!document.querySelector('.gcv-dash-attr-ac.is-open')) {
                document.body.classList.remove('gcv-attr-picking');
              }
            }
            wrap.addEventListener('click', openOverlay);
            scrim.onmousedown = function (ev) {
              ev.preventDefault();
              closeOverlay();
            };
          })();

          if (ex && ex.status) root('ex-status').value = ex.status;
          root('ex-cancel').onclick = function () { form.hidden = true; };

          var delBtn = root('ex-delete');
          if (delBtn && ex && ex.id) {
            delBtn.onclick = function () {
              var label = (ex.date_iso || '') + ' · ' + (ex.attraction_title || '');
              gcvConfirm('Excluir permanentemente a saída\n' + label + '?\n\nEsta ação não pode ser desfeita.', { danger: true, okText: 'Excluir' }).then(function (ok) {
                if (!ok) return;
              delBtn.disabled = true;
              sendJson('DELETE', '/api/admin/excursions.php', { id: ex.id }, function (e, r) {
                if (!r || !r.ok) {
                  delBtn.disabled = false;
                  alert((r && r.error) || 'Erro ao excluir');
                  return;
                }
                form.hidden = true;
                renderExcursions();
              });
              });
            };
          }

          root('ex-save').onclick = function () {
            var statusVal = root('ex-status').value;
            var guideId = parseInt(root('ex-guide').value, 10) || null;
            if (selected.length < EX_ATTR_MIN) {
              alert('Selecione pelo menos ' + EX_ATTR_MIN + ' atrativo.');
              return;
            }
            if (selected.length > EX_ATTR_MAX) {
              alert('Máximo de ' + EX_ATTR_MAX + ' atrativos por dia.');
              return;
            }
            if ((statusVal === 'published' || statusVal === 'soldout') && !guideId) {
              alert('Defina o guia antes de publicar a excursão.');
              return;
            }
            var confirmed = !!(root('ex-confirmed-yes') && root('ex-confirmed-yes').checked);
            var quorum = confirmed ? 0 : parseInt(root('ex-quorum').value, 10);
            if (!confirmed) {
              if (!Number.isFinite(quorum)) quorum = 4;
              if (quorum < 1 || quorum > 4) {
                alert('Quórum deve ser entre 1 e 4 pessoas.');
                return;
              }
            }
            var maxPeople = parseInt(root('ex-max').value, 10);
            if (!Number.isFinite(maxPeople) || maxPeople < 1) {
              alert('Informe o máximo de pessoas.');
              return;
            }
            if (maxPeople > 12) {
              alert('Máximo de pessoas é 12.');
              return;
            }
            var meetingPoint = (root('ex-meeting') && root('ex-meeting').value || '').trim();
            if (!meetingPoint) {
              alert('Informe o ponto de encontro.');
              return;
            }
            var timeVal = readTimeSelect('ex-time-h', 'ex-time-m');
            if (!timeVal) {
              alert('Informe o horário de saída.');
              return;
            }
            var meetingLat = (root('ex-meeting-lat') && root('ex-meeting-lat').value || '').trim();
            var meetingLng = (root('ex-meeting-lng') && root('ex-meeting-lng').value || '').trim();
            var payload = {
              id: ex && ex.id,
              date_iso: root('ex-date').value,
              departure_time: timeVal,
              status: statusVal,
              attraction_ids: selected.slice(),
              attraction_id: selected[0],
              departure_city_id: parseInt(root('ex-city').value, 10) || 0,
              meeting_point: meetingPoint,
              meeting_point_place_id: (root('ex-meeting-place') && root('ex-meeting-place').value || '').trim() || null,
              meeting_point_lat: meetingLat !== '' ? meetingLat : null,
              meeting_point_lng: meetingLng !== '' ? meetingLng : null,
              guide_user_id: guideId,
              price_cents: moneyToCents(root('ex-price').value),
              guide_payout_planned_cents: moneyToCents(root('ex-guide-payout').value),
              business_mode: 'ADMINISTRATIVE',
              created_by_origin: 'ADMIN',
              quorum: quorum,
              max_people: maxPeople,
              preconfirmed_people: Math.max(0, Math.min(5, parseInt(root('ex-preconfirmed').value, 10) || 0)),
              include_transport: !!(root('ex-transport') && root('ex-transport').checked),
              cart_slug: root('ex-cart').value.trim() || null,
            };
            if ((statusVal === 'published' || statusVal === 'soldout') && !payload.guide_payout_planned_cents) {
              alert('Informe o valor previsto de repasse ao guia.');
              return;
            }
            sendJson(ex ? 'PUT' : 'POST', '/api/admin/excursions.php', payload, function (e, r) {
              if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
              form.hidden = true;
              renderExcursions();
            });
          };
        }

        get('/api/admin/cms-guides.php', function (e2, r2) {
          withGuides((r2 && r2.data && r2.data.guides) || []);
        });
      }

      get('/api/admin/attractions.php', function (e1, r1) {
        var attrs = (r1 && r1.data && r1.data.attractions) || [];
        if (attrs.length === 0) {
          seedAttractions(function (err, res) {
            if (res && res.ok) {
              get('/api/admin/attractions.php', function (e3, r3) {
                loadForm((r3 && r3.data && r3.data.attractions) || []);
              });
            } else {
              loadForm([]);
            }
          });
          return;
        }
        loadForm(attrs);
      });
    });
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
    // no-op placeholder for future init
  }

  global.GcvAdminCms = { open: open, boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);

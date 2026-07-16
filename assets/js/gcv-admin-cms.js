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

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-city="' + c.id + '">Editar</button>' +
          '</article>'
        );
      }).join('');
      list.querySelectorAll('[data-edit-city]').forEach(function (btn) {
        btn.onclick = function () {
          var id = parseInt(btn.getAttribute('data-edit-city'), 10);
          var city = state.cities.find(function (x) { return Number(x.id) === id; });
          openCityForm(city || null);
        };
      });
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
      if (err || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar artigos. Rode migration_cms.sql.</p>';
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
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-article="' + a.id + '">Editar</button>' +
          '</article>'
        );
      }).join('');
      list.querySelectorAll('[data-edit-article]').forEach(function (btn) {
        btn.onclick = function () {
          get('/api/admin/articles.php?id=' + btn.getAttribute('data-edit-article'), function (e, r) {
            if (r && r.ok) openArticleForm(r.data);
          });
        };
      });
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
  function renderAttractions() {
    var box = root('cms-attractions-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-attr-new">+ Novo atrativo</button></div>' +
      '<div id="cms-attr-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-attr-list" class="gcv-cms-list">Carregando…</div>';
    root('cms-attr-new').onclick = function () { openAttractionForm(null); };
    get('/api/admin/attractions.php', function (err, res) {
      var list = root('cms-attr-list');
      if (!list) return;
      if (err || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar atrativos.</p>';
        return;
      }
      var rows = (res.data && res.data.attractions) || [];
      state.attractions = rows;
      list.innerHTML = rows.length ? rows.map(function (a) {
        return (
          '<article class="gcv-cms-row"><div><strong>' + esc(a.title_pt) + '</strong>' +
          '<div class="gcv-cms-muted">/' + esc(a.slug) + ' · ' + esc(a.status) +
          (a.entry_price_label ? ' · ' + esc(a.entry_price_label) : '') + '</div></div>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-attr="' + a.id + '">Editar</button></article>'
        );
      }).join('') : '<p>Nenhum atrativo.</p>';
      list.querySelectorAll('[data-edit-attr]').forEach(function (btn) {
        btn.onclick = function () {
          get('/api/admin/attractions.php?id=' + btn.getAttribute('data-edit-attr'), function (e, r) {
            if (r && r.ok) openAttractionForm(r.data);
          });
        };
      });
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
        if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
        form.hidden = true;
        renderAttractions();
      });
    };
  }

  /* ---------- GUIAS ---------- */
  function renderGuides() {
    var box = root('cms-guides-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-guide-new">+ Novo guia</button></div>' +
      '<div id="cms-guide-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-guide-list" class="gcv-cms-list">Carregando…</div>';
    root('cms-guide-new').onclick = function () { openGuideForm(null); };
    get('/api/admin/cms-guides.php', function (err, res) {
      var list = root('cms-guide-list');
      if (!list) return;
      if (err || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar guias.</p>';
        return;
      }
      var rows = (res.data && res.data.guides) || [];
      state.guides = rows;
      list.innerHTML = rows.length ? rows.map(function (g) {
        return (
          '<article class="gcv-cms-row"><div><strong>' + esc(g.full_name || g.name) + '</strong>' +
          '<div class="gcv-cms-muted">' + esc(g.nickname || '') + ' · ' + esc(g.email) +
          (g.base_city_name ? ' · ' + esc(g.base_city_name) : '') + '</div></div>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-guide="' + g.user_id + '">Editar</button></article>'
        );
      }).join('') : '<p>Nenhum guia.</p>';
      list.querySelectorAll('[data-edit-guide]').forEach(function (btn) {
        btn.onclick = function () {
          get('/api/admin/cms-guides.php?id=' + btn.getAttribute('data-edit-guide'), function (e, r) {
            if (r && r.ok) openGuideForm(r.data);
          });
        };
      });
    });
  }

  function cityOptionsHtml(selected) {
    return (state.cities || []).map(function (c) {
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

  function openGuideForm(g) {
    ensureCities(function () {
      var form = root('cms-guide-form');
      if (!form) return;
      form.hidden = false;
      form.innerHTML =
        '<h3>' + (g ? 'Editar guia' : 'Novo guia') + '</h3>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome completo *</label><input class="gcv-dash-input" id="g-full" value="' + esc(g && g.full_name || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Apelido *</label><input class="gcv-dash-input" id="g-nick" value="' + esc(g && g.nickname || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">E-mail *</label><input class="gcv-dash-input" id="g-email" type="email" value="' + esc(g && g.email || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento *</label><input class="gcv-dash-input" id="g-birth" type="date" value="' + esc(g && g.birth_date || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">DDI</label><input class="gcv-dash-input" id="g-ddi" value="' + esc(g && g.phone_ddi || '+55') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">ISO bandeira</label><input class="gcv-dash-input" id="g-iso" value="' + esc(g && g.phone_iso || 'br') + '" maxlength="2" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone *</label><input class="gcv-dash-input" id="g-phone" value="' + esc(g && g.phone || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo chave PIX *</label><select class="gcv-dash-select" id="g-pix-type"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX *</label><input class="gcv-dash-input" id="g-pix" value="' + esc(g && g.pix_key || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade base *</label><select class="gcv-dash-select" id="g-city"><option value="">Selecione…</option>' + cityOptionsHtml(g && g.base_city_id) + '</select></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">CADASTUR</label><input class="gcv-dash-input" id="g-cadastur" value="' + esc(g && g.cadastur || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Diploma URL *</label><input class="gcv-dash-input" id="g-diploma" value="' + esc(g && g.diploma_url || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Associação (opcional)</label><input class="gcv-dash-input" id="g-assoc" value="' + esc(g && g.association_doc_url || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Foto 3x4 URL *</label><input class="gcv-dash-input" id="g-photo34" value="' + esc(g && g.photo_3x4_url || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Upload diploma / foto / associação</label><input type="file" id="g-files" accept="image/*,application/pdf" multiple /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Bio PT</label><textarea class="gcv-dash-input" id="g-bio" rows="4">' + esc(g && g.bio_pt || '') + '</textarea></div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="g-save">Salvar</button>' +
        '<button type="button" class="gcv-dash-btn" id="g-cancel">Cancelar</button></div>';

      if (g && g.pix_key_type) root('g-pix-type').value = g.pix_key_type;
      root('g-files').onchange = function () {
        Array.prototype.slice.call(root('g-files').files || []).forEach(function (f) {
          uploadFile(f, 'guias', function (e, r) {
            if (!(r && r.ok && r.data)) return;
            var url = r.data.url;
            if (/\.pdf$/i.test(url) || r.data.mime === 'application/pdf') {
              if (!root('g-diploma').value) root('g-diploma').value = url;
              else root('g-assoc').value = url;
            } else if (!root('g-photo34').value) {
              root('g-photo34').value = url;
            } else if (!root('g-diploma').value) {
              root('g-diploma').value = url;
            } else {
              root('g-assoc').value = url;
            }
          });
        });
      };
      root('g-cancel').onclick = function () { form.hidden = true; };
      root('g-save').onclick = function () {
        var payload = {
          user_id: g && g.user_id,
          full_name: root('g-full').value.trim(),
          nickname: root('g-nick').value.trim(),
          email: root('g-email').value.trim(),
          birth_date: root('g-birth').value,
          phone_ddi: root('g-ddi').value.trim(),
          phone_iso: root('g-iso').value.trim(),
          phone: root('g-phone').value.trim(),
          pix_key_type: root('g-pix-type').value,
          pix_key: root('g-pix').value.trim(),
          base_city_id: parseInt(root('g-city').value, 10) || 0,
          cadastur: root('g-cadastur').value.trim(),
          diploma_url: root('g-diploma').value.trim(),
          association_doc_url: root('g-assoc').value.trim(),
          photo_3x4_url: root('g-photo34').value.trim(),
          bio_pt: root('g-bio').value,
          status: 'active',
        };
        sendJson(g ? 'PUT' : 'POST', '/api/admin/cms-guides.php', payload, function (e, r) {
          if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
          form.hidden = true;
          renderGuides();
        });
      };
    });
  }

  /* ---------- EXCURSÕES ---------- */
  function renderExcursions() {
    var box = root('cms-excursions-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-exc-new">+ Nova excursão</button></div>' +
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
      list.innerHTML = rows.length ? rows.map(function (e) {
        return (
          '<article class="gcv-cms-row"><div><strong>' + esc(e.date_iso) + ' · ' + esc(e.attraction_title || '') + '</strong>' +
          '<div class="gcv-cms-muted">' + esc(e.departure_city_name || '') + ' · ' + esc(String(e.departure_time || '').slice(0, 5)) +
          ' · R$ ' + esc(centsToMoney(e.price_cents)) + ' · ' + esc(e.status) +
          (e.guide_name ? ' · guia: ' + esc(e.guide_name) : ' · sem guia') + '</div></div>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-exc="' + e.id + '">Editar</button></article>'
        );
      }).join('') : '<p>Nenhuma excursão.</p>';
      list.querySelectorAll('[data-edit-exc]').forEach(function (btn) {
        btn.onclick = function () {
          get('/api/admin/excursions.php?id=' + btn.getAttribute('data-edit-exc'), function (e, r) {
            if (r && r.ok) openExcursionForm(r.data);
          });
        };
      });
    });
  }

  function openExcursionForm(ex) {
    ensureCities(function () {
      get('/api/admin/attractions.php', function (e1, r1) {
        get('/api/admin/cms-guides.php', function (e2, r2) {
          var attrs = (r1 && r1.data && r1.data.attractions) || [];
          var guides = (r2 && r2.data && r2.data.guides) || [];
          var form = root('cms-exc-form');
          if (!form) return;
          form.hidden = false;
          form.innerHTML =
            '<h3>' + (ex ? 'Editar excursão' : 'Nova excursão') + '</h3>' +
            '<div class="gcv-dash-field-row">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Data *</label><input class="gcv-dash-input" id="ex-date" type="date" value="' + esc(ex && ex.date_iso || '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Hora *</label><input class="gcv-dash-input" id="ex-time" type="time" value="' + esc(ex && String(ex.departure_time || '').slice(0, 5) || '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Status</label><select class="gcv-dash-select" id="ex-status"><option value="draft">Rascunho</option><option value="published">Publicada</option><option value="soldout">Esgotada</option><option value="cancelled">Cancelada</option></select></div>' +
            '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Atrativo *</label><select class="gcv-dash-select" id="ex-attr"><option value="">Selecione…</option>' +
            attrs.map(function (a) { return '<option value="' + a.id + '"' + (ex && String(ex.attraction_id) === String(a.id) ? ' selected' : '') + '>' + esc(a.title_pt) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade de saída *</label><select class="gcv-dash-select" id="ex-city"><option value="">Selecione…</option>' + cityOptionsHtml(ex && ex.departure_city_id) + '</select></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Guia * (obrigatório ao publicar)</label><select class="gcv-dash-select" id="ex-guide"><option value="">Selecione o guia…</option>' +
            guides.map(function (g) { return '<option value="' + g.user_id + '"' + (ex && String(ex.guide_user_id) === String(g.user_id) ? ' selected' : '') + '>' + esc(g.full_name || g.name) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="gcv-dash-field-row">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor/pessoa (R$) *</label><input class="gcv-dash-input" id="ex-price" value="' + esc(ex ? centsToMoney(ex.price_cents) : '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Quorum * (mín. 4)</label><input class="gcv-dash-input" id="ex-quorum" type="number" min="4" value="' + esc(ex && ex.quorum || 4) + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Máximo *</label><input class="gcv-dash-input" id="ex-max" type="number" min="1" value="' + esc(ex && ex.max_people || 10) + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Inscritos</label><input class="gcv-dash-input" id="ex-booked" type="number" min="0" value="' + esc(ex && ex.booked_people || 0) + '" /></div>' +
            '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Slug do carrinho (opcional)</label><input class="gcv-dash-input" id="ex-cart" value="' + esc(ex && ex.cart_slug || '') + '" placeholder="ex.: mirante-da-janela-2026-07-09" /></div>' +
            '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="ex-save">Salvar</button>' +
            '<button type="button" class="gcv-dash-btn" id="ex-cancel">Cancelar</button></div>';

          if (ex && ex.status) root('ex-status').value = ex.status;
          root('ex-cancel').onclick = function () { form.hidden = true; };
          root('ex-save').onclick = function () {
            var statusVal = root('ex-status').value;
            var guideId = parseInt(root('ex-guide').value, 10) || null;
            if ((statusVal === 'published' || statusVal === 'soldout') && !guideId) {
              alert('Defina o guia antes de publicar a excursão.');
              return;
            }
            var quorum = parseInt(root('ex-quorum').value, 10) || 0;
            if (quorum < 4) {
              alert('Quórum mínimo é 4 pessoas.');
              return;
            }
            var payload = {
              id: ex && ex.id,
              date_iso: root('ex-date').value,
              departure_time: root('ex-time').value,
              status: statusVal,
              attraction_id: parseInt(root('ex-attr').value, 10) || 0,
              departure_city_id: parseInt(root('ex-city').value, 10) || 0,
              guide_user_id: guideId,
              price_cents: moneyToCents(root('ex-price').value),
              quorum: quorum,
              max_people: parseInt(root('ex-max').value, 10) || 0,
              booked_people: parseInt(root('ex-booked').value, 10) || 0,
              cart_slug: root('ex-cart').value.trim() || null,
            };
            sendJson(ex ? 'PUT' : 'POST', '/api/admin/excursions.php', payload, function (e, r) {
              if (!r || !r.ok) { alert((r && r.error) || 'Erro'); return; }
              form.hidden = true;
              renderExcursions();
            });
          };
        });
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

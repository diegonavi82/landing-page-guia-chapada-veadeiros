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
  function paintAttractionsList(rows) {
    var list = root('cms-attr-list');
    if (!list) return;
    state.attractions = rows || [];
    list.innerHTML = rows.length ? rows.map(function (a) {
      return (
        '<article class="gcv-cms-row"><div><strong>' + esc(a.title_pt) + '</strong>' +
        '<div class="gcv-cms-muted">/' + esc(a.slug) + ' · ' + esc(a.status) +
        (a.entry_price_label ? ' · ' + esc(a.entry_price_label) : '') + '</div></div>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-attr="' + a.id + '">Editar</button></article>'
      );
    }).join('') : '<p>Nenhum atrativo. Use <strong>Importar do site</strong> para carregar os 18 atrativos atuais.</p>';
    list.querySelectorAll('[data-edit-attr]').forEach(function (btn) {
      btn.onclick = function () {
        get('/api/admin/attractions.php?id=' + btn.getAttribute('data-edit-attr'), function (e, r) {
          if (r && r.ok) openAttractionForm(r.data);
        });
      };
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
  function seedDiegoGuide(done) {
    get('/api/admin/seed-diego-guide.php', function (err, res) {
      if (typeof done === 'function') done(err, res);
    });
  }

  function renderGuides() {
    var box = root('cms-guides-root');
    if (!box) return;
    box.innerHTML =
      '<div class="gcv-cms-toolbar">' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="cms-guide-new">+ Novo guia</button>' +
      '<button type="button" class="gcv-dash-btn" id="cms-guide-seed-diego">Importar Diego Navi</button>' +
      '</div>' +
      '<div id="cms-guide-form" class="gcv-cms-card" hidden></div>' +
      '<div id="cms-guide-list" class="gcv-cms-list">Carregando…</div>';
    root('cms-guide-new').onclick = function () { openGuideForm(null); };
    root('cms-guide-seed-diego').onclick = function () {
      var btn = root('cms-guide-seed-diego');
      if (btn) { btn.disabled = true; btn.textContent = 'Importando…'; }
      seedDiegoGuide(function (err, res) {
        if (btn) { btn.disabled = false; btn.textContent = 'Importar Diego Navi'; }
        if (!res || !res.ok) {
          alert((res && res.error) || 'Falha ao importar guia');
          return;
        }
        alert(res.message || 'Guia Diego Navi pronto');
        renderGuides();
      });
    };
    get('/api/admin/cms-guides.php', function (err, res) {
      var list = root('cms-guide-list');
      if (!list) return;
      if (err || !res.ok) {
        list.innerHTML = '<p class="gcv-dash-alert">Erro ao carregar guias.</p>';
        return;
      }
      var rows = (res.data && res.data.guides) || [];
      state.guides = rows;
      if (rows.length === 0) {
        seedDiegoGuide(function (e2, r2) {
          if (r2 && r2.ok) {
            get('/api/admin/cms-guides.php', function (e3, r3) {
              paintGuidesList((r3 && r3.data && r3.data.guides) || []);
            });
          } else {
            paintGuidesList([]);
          }
        });
        return;
      }
      paintGuidesList(rows);
    });
  }

  function paintGuidesList(rows) {
    var list = root('cms-guide-list');
    if (!list) return;
    state.guides = rows || [];
    list.innerHTML = rows.length ? rows.map(function (g) {
      var langs = (g.languages || []).join(', ');
      return (
        '<article class="gcv-cms-row"><div><strong>' + esc(g.full_name || g.name) + '</strong>' +
        '<div class="gcv-cms-muted">' + esc(g.nickname || '') + ' · ' + esc(g.email) +
        (g.base_city_name ? ' · ' + esc(g.base_city_name) : '') +
        (langs ? ' · ' + esc(langs) : '') +
        ' · ' + esc(g.status || '') + '</div></div>' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-guide="' + g.user_id + '">Editar</button></article>'
      );
    }).join('') : '<p>Nenhum guia. Use <strong>Importar Diego Navi</strong>.</p>';
    list.querySelectorAll('[data-edit-guide]').forEach(function (btn) {
      btn.onclick = function () {
        get('/api/admin/cms-guides.php?id=' + btn.getAttribute('data-edit-guide'), function (e, r) {
          if (r && r.ok) openGuideForm(r.data);
        });
      };
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

  var DEFAULT_GUIDE_PHOTO = '/assets/img/imagens/guia-diego-navi.webp';
  var DEFAULT_GUIDE_BIO_PT = [
    'Diego Navi Marques Carvalho é analista de sistemas formado pela PUC-Rio, brasileiro naturalizado italiano e pai de um pré-adolescente. Nascido e criado no Rio de Janeiro, decidiu trocar a rotina dos escritórios pela natureza da Chapada dos Veadeiros em 2016, onde encontrou sua verdadeira vocação.',
    'Em 2017, concluiu sua formação como Condutor Local de Visitantes de Ecoturismo da Chapada dos Veadeiros. No mesmo ano, uniu sua experiência na área de tecnologia à paixão pelo turismo de natureza para fundar a Guia Chapada Veadeiros, uma agência virtual criada para orientar visitantes no planejamento de suas viagens, oferecer informações confiáveis sobre os atrativos da região, conectar turistas aos mais experientes guias locais e incentivar um turismo seguro, responsável e de alta qualidade, valorizando a natureza, a cultura e a comunidade da Chapada dos Veadeiros.',
    'Fluente em português, inglês e espanhol, já conduziu dezenas de grupos com segurança e profissionalismo, recebendo visitantes do Brasil e de diversos países. Frequentador da Chapada dos Veadeiros desde 2009, conhece profundamente a região em todas as épocas do ano. Das cachoeiras mais famosas aos recantos menos explorados, domina trilhas, atrativos, logística, condições climáticas e particularidades de cada destino, proporcionando roteiros personalizados, seguros e memoráveis.',
    'Com uma visão que une tecnologia, atendimento de excelência e profundo conhecimento da Chapada dos Veadeiros, Diego dedica-se a transformar cada viagem em uma experiência única. Sua missão é ir além de conduzir visitantes: é compartilhar a essência da Chapada, valorizando sua natureza, cultura e as comunidades locais para que cada viajante viva uma experiência autêntica, segura e inesquecível.',
  ].join('\n\n');

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
        phone.value = formatMask(phone.value, c.iso);
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
        var start = phoneInput.selectionStart;
        phoneInput.value = formatMask(phoneInput.value, stateIso);
        try { phoneInput.setSelectionRange(start, start); } catch (err) { /* */ }
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
      form.hidden = false;

      var inheritedPhoto = (g && (g.photo_url || g.photo_3x4_url || g.avatar_url)) || DEFAULT_GUIDE_PHOTO;
      var inheritedBio = (g && g.bio_pt) ? g.bio_pt : DEFAULT_GUIDE_BIO_PT;
      var phoneIso = (g && g.phone_iso) || 'br';
      var phoneVal = (g && g.phone) || '';
      if (g && g.phone_ddi && (!g.phone_iso || g.phone_iso === '')) {
        // se só tiver DDI numérico, tenta mapear
        phoneIso = String(g.phone_ddi).replace(/\D+/g, '') === '55' ? 'br' : phoneIso;
      }

      form.innerHTML =
        '<h3>' + (g ? 'Editar guia' : 'Novo guia') + '</h3>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nome completo *</label><input class="gcv-dash-input" id="g-full" value="' + esc(g && g.full_name || '') + '" /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Apelido *</label><input class="gcv-dash-input" id="g-nick" value="' + esc(g && g.nickname || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">E-mail *</label><input class="gcv-dash-input" id="g-email" type="email" value="' + esc(g && g.email || '') + '" ' + (g ? 'readonly' : '') + ' /></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Nascimento *</label><input class="gcv-dash-input" id="g-birth" type="date" value="' + esc(g && g.birth_date || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Telefone / WhatsApp *</label><div id="g-phone-wrap"></div></div>' +
        '<div class="gcv-dash-field-row">' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Tipo chave PIX *</label><select class="gcv-dash-select" id="g-pix-type"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Chave PIX *</label><input class="gcv-dash-input" id="g-pix" value="' + esc(g && g.pix_key || '') + '" /></div>' +
        '</div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade base *</label><select class="gcv-dash-select" id="g-city"><option value="">Selecione…</option>' + cityOptionsHtml(g && g.base_city_id) + '</select></div>' +
        '<div class="gcv-dash-field">' +
        '<label class="gcv-dash-label">Foto *</label>' +
        '<div class="gcv-cms-photo-preview"><img id="g-photo-preview" src="' + esc(inheritedPhoto) + '" alt="Foto do guia" /><div>' +
        '<input type="hidden" id="g-photo-url" value="' + esc(inheritedPhoto) + '" />' +
        '<input type="file" id="g-photo-file" accept="image/*" />' +
        '<p class="gcv-cms-muted" style="margin:0.35rem 0 0;">Anexe uma nova ou mantenha a foto atual.</p></div></div></div>' +
        '<div class="gcv-dash-field"><label class="gcv-dash-label">Bio (herdada do perfil atual)</label><textarea class="gcv-dash-input" id="g-bio" rows="8">' + esc(inheritedBio) + '</textarea></div>' +
        '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="g-save">Salvar</button>' +
        '<button type="button" class="gcv-dash-btn" id="g-cancel">Cancelar</button></div>';

      if (!(g && g.base_city_id) && state.cities && state.cities.length) {
        var alto = state.cities.find(function (c) { return /Alto Para/i.test(c.name); });
        if (alto) root('g-city').value = String(alto.id);
      }
      if (g && g.pix_key_type) root('g-pix-type').value = g.pix_key_type;
      else root('g-pix-type').value = 'cpf';

      var phoneCtl = mountGuidePhoneField(root('g-phone-wrap'), phoneIso, phoneVal);

      root('g-photo-file').onchange = function () {
        var f = root('g-photo-file').files && root('g-photo-file').files[0];
        if (!f) return;
        uploadFile(f, 'guias', function (e, r) {
          if (!(r && r.ok && r.data && r.data.url)) {
            alert((r && r.error) || 'Falha no upload da foto');
            return;
          }
          root('g-photo-url').value = r.data.url;
          root('g-photo-preview').src = r.data.url;
        });
      };

      root('g-cancel').onclick = function () { form.hidden = true; };
      root('g-save').onclick = function () {
        var photoUrl = root('g-photo-url').value.trim();
        if (!photoUrl) {
          alert('Anexe ou mantenha a foto do guia.');
          return;
        }
        var phoneDigits = phoneCtl.getPhoneDigits();
        if (!phoneDigits) {
          alert('Informe o telefone.');
          return;
        }
        var payload = {
          user_id: g && g.user_id,
          full_name: root('g-full').value.trim(),
          nickname: root('g-nick').value.trim(),
          email: root('g-email').value.trim(),
          birth_date: root('g-birth').value,
          phone_ddi: phoneCtl.getDial(),
          phone_iso: phoneCtl.getIso(),
          phone: phoneDigits,
          pix_key_type: root('g-pix-type').value,
          pix_key: root('g-pix').value.trim(),
          base_city_id: parseInt(root('g-city').value, 10) || 0,
          photo_url: photoUrl,
          photo_3x4_url: photoUrl,
          bio_pt: root('g-bio').value,
          languages: ['pt', 'en', 'es'],
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
      list.innerHTML = rows.length ? rows.map(function (e) {
        return (
          '<article class="gcv-cms-row"><div><strong>' + esc(e.date_iso) + ' · ' + esc(e.attraction_title || '') + '</strong>' +
          '<div class="gcv-cms-muted">' + esc(e.departure_city_name || '') + ' · ' + esc(String(e.departure_time || '').slice(0, 5)) +
          ' · R$ ' + esc(centsToMoney(e.price_cents)) + ' · ' + esc(e.status) +
          (e.guide_name ? ' · guia: ' + esc(e.guide_name) : ' · sem guia') +
          (e.attraction_ids && e.attraction_ids.length > 1 ? ' · ' + e.attraction_ids.length + ' atrativos' : '') +
          '</div></div>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm" data-edit-exc="' + e.id + '">Editar</button>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--danger" data-del-exc="' + e.id + '" data-del-label="' + esc(e.date_iso + ' · ' + (e.attraction_title || '')) + '">Excluir</button></article>'
        );
      }).join('') : '<p>Nenhuma excursão. Clique em <strong>+ Nova saída</strong> e escolha de 1 a 4 atrativos.</p>';
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
          if (!confirm('Excluir permanentemente a saída\n' + label + '?\n\nEsta ação não pode ser desfeita.')) return;
          btn.disabled = true;
          sendJson('DELETE', '/api/admin/excursions.php', { id: parseInt(id, 10) }, function (e, r) {
            if (!r || !r.ok) {
              btn.disabled = false;
              alert((r && r.error) || 'Erro ao excluir');
              return;
            }
            renderExcursions();
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
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Hora *</label><input class="gcv-dash-input" id="ex-time" type="time" value="' + esc(ex && String(ex.departure_time || '').slice(0, 5) || '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Status</label><select class="gcv-dash-select" id="ex-status"><option value="draft">Rascunho</option><option value="published">Publicada</option><option value="soldout">Esgotada</option><option value="cancelled">Cancelada</option></select></div>' +
            '</div>' +
            '<div class="gcv-dash-field">' +
            '<label class="gcv-dash-label">Atrativos do dia * <span class="gcv-cms-muted" id="ex-attr-count"></span></label>' +
            '<div id="ex-attr-picker-wrap">' + renderAttractionPickerMulti(attrs, selectedIds) + '</div>' +
            '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Cidade de saída *</label><select class="gcv-dash-select" id="ex-city"><option value="">Selecione…</option>' + cityOptionsHtml(ex && ex.departure_city_id) + '</select></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Guia * (obrigatório ao publicar)</label><select class="gcv-dash-select" id="ex-guide"><option value="">Selecione o guia…</option>' +
            (guides.length ? guides.map(function (g) {
              var label = (g.full_name || g.nickname || g.name || '') + (g.nickname && g.full_name ? ' (' + g.nickname + ')' : '');
              return '<option value="' + g.user_id + '"' + (ex && String(ex.guide_user_id) === String(g.user_id) ? ' selected' : '') + '>' + esc(label) + '</option>';
            }).join('') : '') +
            '</select>' +
            (guides.length ? '' : '<p class="gcv-dash-alert" style="margin-top:0.4rem;">Nenhum guia cadastrado. <button type="button" class="gcv-dash-btn gcv-dash-btn--sm gcv-dash-btn--primary" id="ex-seed-diego">Cadastrar Diego Navi</button></p>') +
            '</div>' +
            '<div class="gcv-dash-field-row">' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Valor/pessoa (R$) *</label><input class="gcv-dash-input" id="ex-price" value="' + esc(ex ? centsToMoney(ex.price_cents) : '') + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Quorum * (mín. 4)</label><input class="gcv-dash-input" id="ex-quorum" type="number" min="4" value="' + esc(ex && ex.quorum || 4) + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Máximo *</label><input class="gcv-dash-input" id="ex-max" type="number" min="1" value="' + esc(ex && ex.max_people || 10) + '" /></div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Inscritos</label><input class="gcv-dash-input" id="ex-booked" type="number" min="0" value="' + esc(ex && ex.booked_people || 0) + '" /></div>' +
            '</div>' +
            '<div class="gcv-dash-field"><label class="gcv-dash-label">Slug do carrinho (opcional)</label><input class="gcv-dash-input" id="ex-cart" value="' + esc(ex && ex.cart_slug || '') + '" placeholder="ex.: mirante-da-janela-2026-07-09" /></div>' +
            '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem;">' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="ex-save">Salvar</button>' +
            '<button type="button" class="gcv-dash-btn" id="ex-cancel">Fechar</button>' +
            (ex && ex.id
              ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger" id="ex-delete" style="margin-left:auto;">Excluir saída</button>'
              : '') +
            '</div>';

          var selected = selectedIds.slice();

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

          var seedDiegoBtn = root('ex-seed-diego');
          if (seedDiegoBtn) {
            seedDiegoBtn.onclick = function () {
              seedDiegoBtn.disabled = true;
              seedDiegoGuide(function (err, res) {
                if (!res || !res.ok) {
                  seedDiegoBtn.disabled = false;
                  alert((res && res.error) || 'Falha ao cadastrar guia');
                  return;
                }
                openExcursionForm(ex);
              });
            };
          }

          if (ex && ex.status) root('ex-status').value = ex.status;
          root('ex-cancel').onclick = function () { form.hidden = true; };

          var delBtn = root('ex-delete');
          if (delBtn && ex && ex.id) {
            delBtn.onclick = function () {
              var label = (ex.date_iso || '') + ' · ' + (ex.attraction_title || '');
              if (!confirm('Excluir permanentemente a saída\n' + label + '?\n\nEsta ação não pode ser desfeita.')) return;
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
              attraction_ids: selected.slice(),
              attraction_id: selected[0],
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
        }

        get('/api/admin/cms-guides.php', function (e2, r2) {
          var guides = (r2 && r2.data && r2.data.guides) || [];
          if (guides.length === 0) {
            seedDiegoGuide(function (err, res) {
              if (res && res.ok) {
                get('/api/admin/cms-guides.php', function (e3, r3) {
                  withGuides((r3 && r3.data && r3.data.guides) || []);
                });
              } else {
                withGuides([]);
              }
            });
            return;
          }
          withGuides(guides);
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

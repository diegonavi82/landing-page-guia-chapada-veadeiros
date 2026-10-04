/* gcv-admin-tarifario.js — menus PASSEIOS e TARIFÁRIO do admin
 *
 * Regras (as mesmas de api/helpers/tarifarios.php):
 * - Passeio unitário = um atrativo, com uma tarifa só.
 * - Relação = outro passeio (o roteiro muda), com tarifa nova. Nunca soma.
 * - Até N atrativos no mesmo dia. N fica em Configurações.
 * - Um tarifário pode ser usado por vários passeios.
 * - Sem tarifário, não aparece à venda no site.
 */
(function (global) {
  'use strict';

  var API = '/api/admin/tarifarios.php';
  var CAMPOS = [
    ['excursao_pessoa_cents', 'Excursão', 'sem translado'],
    ['excursao_transporte_cents', 'Excursão', 'com translado'],
    ['exclusivo_pessoa_cents', 'Privativo', 'sem translado'],
    ['exclusivo_transporte_cents', 'Privativo', 'com translado']
  ];
  var CIDADE_CURTA = { 'alto-paraiso': 'Alto Paraíso', 'sao-jorge': 'São Jorge', 'cavalcante': 'Cavalcante' };

  var st = { data: null, mode: 'tarifarios', rootId: 'cms-tarifario-root', editing: null, q: '', open: {} };

  /* ---------- utilidades ---------- */
  function $(id) {
    if (st.rootId && id !== st.rootId) {
      var box = document.getElementById(st.rootId);
      if (box) {
        var found = box.querySelector('#' + id);
        if (found) return found;
      }
    }
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function request(method, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, API);
    if (method !== 'GET') xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      var res = {};
      try { res = JSON.parse(xhr.responseText); } catch (e) { res = { ok: false, error: 'Resposta inválida do servidor' }; }
      cb(res);
    };
    xhr.onerror = function () { cb({ ok: false, error: 'Sem conexão com o servidor' }); };
    xhr.send(method === 'GET' ? null : JSON.stringify(data || {}));
  }

  function reais(cents) {
    var n = Math.round((parseInt(cents, 10) || 0) / 100);
    return 'R$ ' + n.toLocaleString('pt-BR');
  }

  function toCents(v) {
    var s = String(v == null ? '' : v).trim().replace(/[^\d,.-]/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var f = parseFloat(s);
    return Number.isFinite(f) && f > 0 ? Math.round(f * 100) : 0;
  }

  function moneyInput(cents) {
    var n = (parseInt(cents, 10) || 0) / 100;
    if (!n) return '';
    return n % 1 ? n.toFixed(2).replace('.', ',') : String(n);
  }

  /** "2h30", "2:30", "2,5", "150" (minutos) → minutos */
  function parseHoras(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return 0;
    var m = s.match(/^(\d{1,2})(?:h|:)(\d{1,2})?(?:min|m)?$/);
    if (m) return parseInt(m[1], 10) * 60 + (parseInt(m[2] || '0', 10) || 0);
    m = s.match(/^(\d+)(?:min|m)$/);
    if (m) return parseInt(m[1], 10);
    var f = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(f) || f <= 0) return 0;
    return f <= 24 ? Math.round(f * 60) : Math.round(f);
  }

  function horas(min) {
    min = parseInt(min, 10) || 0;
    if (!min) return '';
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (!h) return m + 'min';
    return h + 'h' + (m ? String(m).padStart(2, '0') : '');
  }

  function toast(msg, bad) {
    var el = $('tf-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'tf-toast is-on' + (bad ? ' is-bad' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.className = 'tf-toast'; }, 2600);
  }

  function confirmar(msg, okText) {
    if (typeof global.gcvConfirm === 'function') return global.gcvConfirm(msg, { danger: true, okText: okText || 'Confirmar' });
    return Promise.resolve(global.confirm(msg));
  }

  function tarifarioById(id) {
    id = parseInt(id, 10);
    return (st.data.tarifarios || []).filter(function (t) { return t.id === id; })[0] || null;
  }

  function attrById(id) {
    id = parseInt(id, 10);
    return (st.data.atrativos || []).filter(function (a) { return a.id === id; })[0] || null;
  }

  function passeioNome(p) {
    return (p.attractions || []).map(function (a) { return a.title_pt; }).join(' + ');
  }

  function passeiosDo(attrId) {
    return (st.data.passeios || []).filter(function (p) {
      return (p.attractions || []).some(function (a) { return a.id === attrId; });
    });
  }

  function aPartirDe(t) {
    if (!t) return '';
    var min = 0;
    Object.keys(t.cidades || {}).forEach(function (k) {
      var row = t.cidades[k];
      CAMPOS.forEach(function (c) {
        var v = parseInt(row[c[0]], 10) || 0;
        if (v && (!min || v < min)) min = v;
      });
    });
    return min ? 'a partir de ' + reais(min) + '/pessoa' : 'sem preço preenchido';
  }

  function tarifarioSelect(attrs, current, emptyLabel) {
    var list = (st.data.tarifarios || []).slice();
    return '<select class="gcv-dash-select tf-select" ' + attrs + '>' +
      '<option value="">' + esc(emptyLabel || '— sem tarifário (fora da venda) —') + '</option>' +
      list.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === current ? ' selected' : '') + '>' + esc(t.nome) + ' · ' + esc(aPartirDe(t)) + '</option>';
      }).join('') +
      '<option value="__novo">+ Criar tarifário novo…</option>' +
      '</select>';
  }

  function duracaoInputs(kind, id, duracao) {
    return '<div class="tf-dur" data-dur-kind="' + kind + '" data-dur-id="' + id + '">' +
      Object.keys(CIDADE_CURTA).map(function (k) {
        return '<label class="tf-dur__cell"><span>' + esc(CIDADE_CURTA[k]) + '</span>' +
          '<input class="gcv-dash-input" data-dur-city="' + k + '" value="' + esc(horas(duracao && duracao[k])) + '" placeholder="ex.: 4h30" inputmode="text" /></label>';
      }).join('') +
      '</div>';
  }

  /* ---------- carregar ---------- */
  function load(after) {
    request('GET', null, function (res) {
      if (!res.ok) {
        var box = $(st.rootId);
        if (box) box.innerHTML = '<p class="gcv-dash-alert">' + esc(res.error || 'Erro ao carregar.') + '</p>';
        return;
      }
      st.data = res.data;
      paint();
      if (after) after();
    });
  }

  function apply(res, okMsg) {
    if (!res.ok) { toast(res.error || 'Não salvou', true); return false; }
    st.data = res.data;
    paint();
    if (okMsg) toast(okMsg);
    return true;
  }

  /* ---------- tela ---------- */
  function paint() {
    var box = $(st.rootId);
    if (!box || !st.data) return;
    var max = esc(st.data.max_atrativos);
    var semPreco = (st.data.atrativos || []).filter(function (a) { return a.page && !a.tarifario_id; }).length;
    var passeiosSem = (st.data.passeios || []).filter(function (p) { return !p.tarifario_id; }).length;
    var aviso = (semPreco || passeiosSem)
      ? '<span class="tf-warn">' + (semPreco ? semPreco + ' passeio(s) unitário(s)' : '') + (semPreco && passeiosSem ? ' e ' : '') + (passeiosSem ? passeiosSem + ' relação(ões)' : '') + ' sem tarifa: não aparecem à venda.</span>'
      : '';
    var rules = st.mode === 'passeios'
      ? '<span>Cada linha é um <b>passeio unitário</b> e tem <b>uma tarifa só</b>.</span>' +
        '<span>As relações ficam dentro dele. Cada relação é outro passeio, com tarifa nova, porque o roteiro muda. Cabe de 1 a <b>' + max + '</b> atrativos no mesmo dia. <a href="#configuracoes">Mudar o máximo em Configurações</a>.</span>' +
        aviso
      : '<span>Cada tarifário é uma tabela de preços. Um passeio usa uma tarifa só. A mesma tabela pode servir a mais de um passeio.</span>';
    box.innerHTML =
      '<div class="tf-head">' +
        '<input class="gcv-dash-input tf-search" id="tf-search" type="search" placeholder="' + (st.mode === 'passeios' ? 'Buscar passeio' : 'Buscar tarifário') + '" value="' + esc(st.q) + '" />' +
      '</div>' +
      '<div class="tf-rules">' + rules + '</div>' +
      '<div id="tf-body"></div>' +
      '<div class="tf-toast" id="tf-toast" role="status" aria-live="polite"></div>';
    var search = $('tf-search');
    search.oninput = function () { st.q = search.value; paintBody(); };
    paintBody();
  }

  function paintBody() {
    if (st.editing) return paintEditor();
    if (st.mode === 'passeios') return paintAtrativos();
    return paintTarifarios();
  }

  function matches(text) {
    var q = String(st.q || '').trim().toLowerCase();
    if (!q) return true;
    var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    return norm(text).indexOf(norm(q)) >= 0;
  }

  function catChecks(selected) {
    var on = selected || [];
    var cats = st.data.categorias || { classicos: 'Clássicos', destaque: 'Destaque', 'lado-b': 'Lado B', familia: 'Família', aventura: 'Aventura' };
    return Object.keys(cats).map(function (key) {
      var checked = on.indexOf(key) >= 0 ? ' checked' : '';
      return '<label class="tf-check"><input type="checkbox" data-cat="' + esc(key) + '"' + checked + ' /> ' + esc(cats[key]) + '</label>';
    }).join('');
  }

  function saveOferta(wrap, extra) {
    var ids = [];
    wrap.querySelectorAll('[data-cat]').forEach(function (input) {
      if (input.checked) ids.push(input.getAttribute('data-cat'));
    });
    if (!ids.length) {
      toast('Marque pelo menos uma categoria', true);
      return;
    }
    var payload = { action: 'oferta', categorias: ids };
    if (wrap.getAttribute('data-cats') === 'passeio') payload.passeio_id = parseInt(wrap.getAttribute('data-cat-id'), 10);
    else payload.attraction_id = parseInt(wrap.getAttribute('data-cat-id'), 10);
    if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    request('PUT', payload, function (res) { apply(res, 'Passeio atualizado'); });
  }

  /* ---------- aba: atrativos e passeios do dia ---------- */
  function paintAtrativos() {
    var body = $('tf-body');
    var max = parseInt(st.data.max_atrativos, 10) || 3;
    var rows = (st.data.atrativos || []).filter(function (a) {
      if (!a.page) return false;
      if (matches(a.title_pt)) return true;
      return passeiosDo(a.id).some(function (p) { return matches(passeioNome(p)); });
    });
    if (!rows.length) {
      body.innerHTML = '<p class="gcv-cms-muted">Nenhum atrativo encontrado.</p>';
      return;
    }
    body.innerHTML = rows.map(function (a) {
      var t = tarifarioById(a.tarifario_id);
      var passeios = passeiosDo(a.id);
      var aberto = !!st.open[a.id];
      var outros = (st.data.atrativos || []).filter(function (x) { return x.page && x.id !== a.id; });
      var opts = '<option value="">—</option>' + outros.map(function (x) { return '<option value="' + x.id + '">' + esc(x.title_pt) + '</option>'; }).join('');
      var addSelects = '';
      for (var i = 1; i < max && i <= 4; i++) {
        addSelects += '<select class="gcv-dash-select" data-combo-pick="' + a.id + '" aria-label="Atrativo ' + (i + 1) + '">' + opts + '</select>';
      }
      return '<article class="tf-attr' + (aberto ? ' is-open' : '') + (t ? '' : ' is-off') + '" data-attr="' + a.id + '">' +
        '<button type="button" class="tf-attr__head" data-toggle-attr="' + a.id + '" aria-expanded="' + (aberto ? 'true' : 'false') + '">' +
          '<span class="tf-attr__name">' + esc(a.title_pt) + '</span>' +
          '<span class="tf-attr__meta">' +
            (t ? '<span class="tf-pill">' + esc(t.nome) + '</span><span>' + esc(aPartirDe(t)) + '</span>' : '<span class="tf-pill tf-pill--off">Sem tarifário</span>') +
            '<span>' + passeios.length + ' relação(ões)</span>' +
          '</span>' +
          '<span class="tf-attr__chev" aria-hidden="true">▾</span>' +
        '</button>' +
        (aberto ?
          '<div class="tf-attr__body">' +
            '<div class="tf-block">' +
              '<h4>Passeio unitário · ' + esc(a.title_pt) + '</h4>' +
              '<p class="gcv-cms-muted tf-small">Uma tarifa só para este passeio.</p>' +
              '<label class="tf-check"><input type="checkbox" data-tem-passeio="' + a.id + '"' + (a.tem_passeio === false ? '' : ' checked') + ' /> Esta atração tem passeio à venda</label>' +
              '<div class="tf-cats" data-cats="atrativo" data-cat-id="' + a.id + '">' + catChecks(a.categorias) + '</div>' +
              '<div class="tf-grid2">' +
                '<label class="tf-field"><span>Tarifário</span>' + tarifarioSelect('data-link-attr="' + a.id + '"', a.tarifario_id) + '</label>' +
                (t ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-btn--sm tf-edit-link" data-edit-tf="' + t.id + '">Editar preços de “' + esc(t.nome) + '”</button>' : '') +
              '</div>' +
              '<div class="tf-field"><span>Duração saindo de cada cidade</span>' + duracaoInputs('atrativo', a.id, a.duracao_cidades) + '</div>' +
            '</div>' +
            '<div class="tf-block">' +
              '<h4>Relações · tarifa nova em cada uma</h4>' +
              (passeios.length ? passeios.map(function (p) { return passeioCard(p, a.id); }).join('') : '<p class="gcv-cms-muted">Nenhum passeio junto ainda.</p>') +
              (max >= 2 ?
                '<div class="tf-add">' +
                  '<span class="tf-add__label">Juntar ' + esc(a.title_pt) + ' com</span>' +
                  addSelects +
                  '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-combo-add="' + a.id + '">Juntar</button>' +
                '</div>' +
                '<p class="gcv-cms-muted tf-small">A relação aparece dentro de cada passeio unitário dela. Escolha ou crie a tarifa própria: o preço nunca soma.</p>'
                : '<p class="gcv-cms-muted">Em Configurações o máximo é 1 atrativo por passeio. Não há relação.</p>') +
            '</div>' +
          '</div>' : '') +
      '</article>';
    }).join('');
    bindAtrativos(body);
  }

  function passeioCard(p, fromAttr) {
    var t = tarifarioById(p.tarifario_id);
    var nomes = (p.attractions || []).map(function (x) {
      return x.id === fromAttr ? '<span>' + esc(x.title_pt) + '</span>' : '<b>' + esc(x.title_pt) + '</b>';
    }).join(' <i>+</i> ');
    return '<div class="tf-combo' + (t ? '' : ' is-off') + '">' +
      '<div class="tf-combo__top"><p class="tf-combo__name">' + nomes + '</p>' +
      '<button type="button" class="tf-x" data-combo-del="' + p.id + '" title="Desfazer este passeio" aria-label="Desfazer ' + esc(passeioNome(p)) + '">×</button></div>' +
      '<div class="tf-grid2">' +
        '<label class="tf-field"><span>Tarifário do passeio</span>' + tarifarioSelect('data-link-passeio="' + p.id + '" data-passeio-nome="' + esc(passeioNome(p)) + '"', p.tarifario_id, '— sem tarifário (não vende) —') + '</label>' +
        (t ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-btn--sm tf-edit-link" data-edit-tf="' + t.id + '">Editar preços</button>' : '<span class="tf-warn tf-small">Escolha ou crie um tarifário para vender.</span>') +
      '</div>' +
      '<div class="tf-cats" data-cats="passeio" data-cat-id="' + p.id + '">' + catChecks(p.categorias) + '</div>' +
      '<div class="tf-field"><span>Duração saindo de cada cidade</span>' + duracaoInputs('passeio', p.id, p.duracao_cidades) + '</div>' +
    '</div>';
  }

  function bindAtrativos(body) {
    body.querySelectorAll('[data-toggle-attr]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-toggle-attr');
        st.open[id] = !st.open[id];
        paintBody();
      };
    });
    body.querySelectorAll('[data-edit-tf]').forEach(function (b) {
      b.onclick = function () { openEditor(tarifarioById(b.getAttribute('data-edit-tf'))); };
    });
    body.querySelectorAll('select[data-link-attr], select[data-link-passeio]').forEach(function (sel) {
      sel.onchange = function () {
        var payload = { action: 'link' };
        var nome;
        if (sel.hasAttribute('data-link-attr')) {
          payload.attraction_id = parseInt(sel.getAttribute('data-link-attr'), 10);
          nome = (attrById(payload.attraction_id) || {}).title_pt;
        } else {
          payload.passeio_id = parseInt(sel.getAttribute('data-link-passeio'), 10);
          nome = sel.getAttribute('data-passeio-nome');
        }
        if (sel.value === '__novo') {
          openEditor(null, { nome: nome, link: payload });
          return;
        }
        payload.tarifario_id = sel.value ? parseInt(sel.value, 10) : null;
        request('PUT', payload, function (res) { apply(res, payload.tarifario_id ? 'Tarifário ligado' : 'Tirado da venda'); });
      };
    });
    body.querySelectorAll('.tf-dur').forEach(function (wrap) {
      wrap.querySelectorAll('input').forEach(function (input) {
        input.onchange = function () {
          var duracao = {};
          wrap.querySelectorAll('input').forEach(function (i) { duracao[i.getAttribute('data-dur-city')] = parseHoras(i.value); });
          var payload = { action: 'duracao', duracao: duracao };
          payload[wrap.getAttribute('data-dur-kind') === 'passeio' ? 'passeio_id' : 'attraction_id'] = parseInt(wrap.getAttribute('data-dur-id'), 10);
          request('PUT', payload, function (res) { apply(res, 'Duração salva'); });
        };
      });
    });
    body.querySelectorAll('[data-tem-passeio]').forEach(function (input) {
      input.onchange = function () {
        var wrap = input.closest('.tf-attr__body').querySelector('[data-cats="atrativo"]');
        if (wrap) saveOferta(wrap, { tem_passeio: input.checked ? 1 : 0 });
      };
    });
    body.querySelectorAll('[data-cats]').forEach(function (wrap) {
      wrap.querySelectorAll('[data-cat]').forEach(function (input) {
        input.onchange = function () { saveOferta(wrap); };
      });
    });
    body.querySelectorAll('[data-combo-add]').forEach(function (b) {
      b.onclick = function () {
        var attrId = parseInt(b.getAttribute('data-combo-add'), 10);
        var ids = [attrId];
        body.querySelectorAll('[data-combo-pick="' + attrId + '"]').forEach(function (sel) {
          var v = parseInt(sel.value, 10);
          if (v && ids.indexOf(v) < 0) ids.push(v);
        });
        if (ids.length < 2) { toast('Escolha com qual atrativo juntar.', true); return; }
        request('PUT', { action: 'combo', attraction_ids: ids }, function (res) {
          if (apply(res, 'Passeio criado. Agora escolha o tarifário dele.')) {
            ids.forEach(function (id) { st.open[id] = true; });
            paintBody();
          }
        });
      };
    });
    body.querySelectorAll('[data-combo-del]').forEach(function (b) {
      b.onclick = function () {
        var p = (st.data.passeios || []).filter(function (x) { return x.id === parseInt(b.getAttribute('data-combo-del'), 10); })[0];
        confirmar('Desfazer o passeio\n' + (p ? passeioNome(p) : '') + '?\n\nEle sai da página de todos os atrativos dele. O tarifário continua salvo.', 'Desfazer').then(function (ok) {
          if (!ok) return;
          request('DELETE', { passeio_id: p.id }, function (res) { apply(res, 'Passeio desfeito'); });
        });
      };
    });
  }

  /* ---------- aba: tarifários ---------- */
  function paintTarifarios() {
    var body = $('tf-body');
    var list = (st.data.tarifarios || []).filter(function (t) {
      return matches(t.nome) || (t.atrativos || []).some(function (a) { return matches(a.title_pt); }) || (t.passeios || []).some(function (p) { return matches(p.title); });
    });
    body.innerHTML =
      '<div class="tf-toolbar"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="tf-new">+ Novo tarifário</button></div>' +
      (list.length ? '<div class="tf-cards">' + list.map(function (t) {
        var uso = (t.atrativos || []).map(function (a) { return '<span class="tf-chip">' + esc(a.title_pt) + '</span>'; })
          .concat((t.passeios || []).map(function (p) { return '<span class="tf-chip tf-chip--combo">' + esc(p.title) + '</span>'; }));
        var ap = t.cidades && t.cidades['alto-paraiso'] || {};
        return '<article class="tf-card">' +
          '<div class="tf-card__top"><h4>' + esc(t.nome) + '</h4>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-btn--sm" data-edit-tf="' + t.id + '">Editar</button></div>' +
          '<div class="tf-card__prices">' +
            '<span><small>Excursão</small><b>' + reais(ap.excursao_pessoa_cents) + '</b></span>' +
            '<span><small>Privativo</small><b>' + reais(ap.exclusivo_pessoa_cents) + '</b></span>' +
            '<span class="tf-card__note">por pessoa, saindo de Alto Paraíso, sem translado</span>' +
          '</div>' +
          '<div class="tf-card__use">' + (uso.length ? uso.join('') : '<span class="tf-warn tf-small">Não está em uso</span>') + '</div>' +
        '</article>';
      }).join('') + '</div>' : '<p class="gcv-cms-muted">Nenhum tarifário encontrado.</p>');
    $('tf-new').onclick = function () { openEditor(null); };
    body.querySelectorAll('[data-edit-tf]').forEach(function (b) {
      b.onclick = function () { openEditor(tarifarioById(b.getAttribute('data-edit-tf'))); };
    });
  }

  /* ---------- editor ---------- */
  function openEditor(t, opts) {
    st.editing = { t: t, opts: opts || {} };
    paintBody();
    var box = $(st.rootId);
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function paintEditor() {
    var body = $('tf-body');
    var t = st.editing.t;
    var opts = st.editing.opts;
    var cidades = (t && t.cidades) || {};
    var nome = t ? t.nome : (opts.nome || '');
    var usados = t ? (t.atrativos || []).map(function (a) { return { kind: 'attr', id: a.id, nome: a.title_pt }; })
      .concat((t.passeios || []).map(function (p) { return { kind: 'passeio', id: p.id, nome: p.title }; })) : [];
    var addOpts = '<option value="">Usar também em…</option><optgroup label="Atrativos">' +
      (st.data.atrativos || []).filter(function (a) { return a.page && (!t || a.tarifario_id !== t.id); }).map(function (a) {
        var atual = tarifarioById(a.tarifario_id);
        return '<option value="attr:' + a.id + '">' + esc(a.title_pt) + (atual ? ' (hoje: ' + esc(atual.nome) + ')' : '') + '</option>';
      }).join('') + '</optgroup><optgroup label="Passeios com mais de um atrativo">' +
      (st.data.passeios || []).filter(function (p) { return !t || p.tarifario_id !== t.id; }).map(function (p) {
        var atual = tarifarioById(p.tarifario_id);
        return '<option value="passeio:' + p.id + '">' + esc(passeioNome(p)) + (atual ? ' (hoje: ' + esc(atual.nome) + ')' : '') + '</option>';
      }).join('') + '</optgroup>';

    body.innerHTML =
      '<div class="gcv-cms-card tf-editor">' +
        '<div class="tf-editor__top">' +
          '<button type="button" class="tf-back" id="tf-back">← Voltar</button>' +
          '<h3>' + (t ? 'Editar tarifário' : 'Novo tarifário') + '</h3>' +
        '</div>' +
        '<div class="tf-grid2">' +
          '<label class="tf-field"><span>Nome</span><input class="gcv-dash-input" id="tf-nome" value="' + esc(nome) + '" placeholder="Ex.: Vale da Lua + Loquinhas" /></label>' +
          '<label class="tf-field tf-field--sm"><span>Privativo cobra no mínimo</span><div class="tf-suffix"><input class="gcv-dash-input" id="tf-quorum" inputmode="numeric" value="' + esc(t ? t.quorum : 4) + '" /><em>pessoas</em></div></label>' +
        '</div>' +
        '<div class="tf-table-wrap"><table class="tf-table">' +
          '<thead><tr><th scope="col">Saindo de</th>' + CAMPOS.map(function (c) {
            return '<th scope="col">' + esc(c[1]) + '<small>' + esc(c[2]) + '</small></th>';
          }).join('') + '</tr></thead><tbody>' +
          Object.keys(CIDADE_CURTA).map(function (k) {
            var row = cidades[k] || {};
            return '<tr><th scope="row">' + esc(st.data.cidades && st.data.cidades[k] || CIDADE_CURTA[k]) + '</th>' + CAMPOS.map(function (c) {
              return '<td><label class="tf-money"><em>R$</em><input inputmode="decimal" data-price="' + k + ':' + c[0] + '" value="' + esc(moneyInput(row[c[0]])) + '" aria-label="' + esc(CIDADE_CURTA[k] + ' ' + c[1] + ' ' + c[2]) + '" /></label></td>';
            }).join('') + '</tr>';
          }).join('') +
        '</tbody></table></div>' +
        '<div class="tf-editor__tools"><button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-btn--sm" id="tf-copy">Copiar Alto Paraíso para as outras cidades</button>' +
        '<span class="gcv-cms-muted tf-small">Valores por pessoa. Campo vazio = R$ 0 (não vende nessa opção).</span></div>' +
        (t ?
          '<div class="tf-field"><span>Usado em</span><div class="tf-card__use">' +
            (usados.length ? usados.map(function (u) {
              return '<span class="tf-chip' + (u.kind === 'passeio' ? ' tf-chip--combo' : '') + '">' + esc(u.nome) +
                '<button type="button" data-unlink="' + u.kind + ':' + u.id + '" aria-label="Tirar de ' + esc(u.nome) + '">×</button></span>';
            }).join('') : '<span class="tf-warn tf-small">Ainda não está em uso.</span>') +
            '</div><select class="gcv-dash-select tf-use-add" id="tf-use-add">' + addOpts + '</select></div>'
          : (opts.link ? '<p class="gcv-cms-muted">Ao salvar, este tarifário passa a valer para <b>' + esc(opts.nome || '') + '</b>.</p>' : '')) +
        '<div class="tf-editor__actions">' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="tf-save">Salvar tarifário</button>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary" id="tf-cancel">Cancelar</button>' +
          (t ? '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger tf-del" id="tf-del">Excluir</button>' : '') +
        '</div>' +
      '</div>';

    function back() { st.editing = null; paintBody(); }
    $('tf-back').onclick = back;
    $('tf-cancel').onclick = back;
    $('tf-copy').onclick = function () {
      CAMPOS.forEach(function (c) {
        var src = body.querySelector('[data-price="alto-paraiso:' + c[0] + '"]');
        ['sao-jorge', 'cavalcante'].forEach(function (k) {
          var dst = body.querySelector('[data-price="' + k + ':' + c[0] + '"]');
          if (src && dst) dst.value = src.value;
        });
      });
    };
    $('tf-save').onclick = function () {
      var payload = { nome: $('tf-nome').value.trim(), quorum: parseInt($('tf-quorum').value, 10) || 4, cidades: {} };
      if (!payload.nome) { toast('Dê um nome ao tarifário.', true); $('tf-nome').focus(); return; }
      body.querySelectorAll('[data-price]').forEach(function (input) {
        var parts = input.getAttribute('data-price').split(':');
        payload.cidades[parts[0]] = payload.cidades[parts[0]] || {};
        payload.cidades[parts[0]][parts[1]] = toCents(input.value);
      });
      if (t) payload.id = t.id;
      var btn = $('tf-save');
      btn.disabled = true;
      request(t ? 'PUT' : 'POST', payload, function (res) {
        btn.disabled = false;
        if (!res.ok) { toast(res.error || 'Não salvou', true); return; }
        st.data = res.data;
        var link = opts.link;
        if (!t && link && res.data.saved_id) {
          link.tarifario_id = res.data.saved_id;
          request('PUT', link, function (r2) { st.editing = null; apply(r2, 'Tarifário criado e ligado'); });
          return;
        }
        st.editing = null;
        paint();
        toast('Tarifário salvo');
      });
    };
    var del = $('tf-del');
    if (del) {
      del.onclick = function () {
        var n = usados.length;
        confirmar('Excluir o tarifário\n' + t.nome + '?' + (n ? '\n\n' + n + ' atrativo(s)/passeio(s) usam este tarifário e vão sair da venda.' : ''), 'Excluir').then(function (ok) {
          if (!ok) return;
          request('DELETE', { id: t.id }, function (res) { st.editing = null; apply(res, 'Tarifário excluído'); });
        });
      };
    }
    body.querySelectorAll('[data-unlink]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.getAttribute('data-unlink').split(':');
        var payload = { action: 'link', tarifario_id: null };
        payload[parts[0] === 'passeio' ? 'passeio_id' : 'attraction_id'] = parseInt(parts[1], 10);
        request('PUT', payload, function (res) {
          if (!res.ok) { toast(res.error || 'Não salvou', true); return; }
          st.data = res.data;
          st.editing.t = tarifarioById(t.id);
          paintBody();
          toast('Tirado deste tarifário: fica fora da venda até ter outro');
        });
      };
    });
    var add = $('tf-use-add');
    if (add) {
      add.onchange = function () {
        if (!add.value) return;
        var parts = add.value.split(':');
        var payload = { action: 'link', tarifario_id: t.id };
        payload[parts[0] === 'passeio' ? 'passeio_id' : 'attraction_id'] = parseInt(parts[1], 10);
        request('PUT', payload, function (res) {
          if (!res.ok) { toast(res.error || 'Não salvou', true); return; }
          st.data = res.data;
          st.editing.t = tarifarioById(t.id);
          paintBody();
          toast('Agora usa este tarifário');
        });
      };
    }
  }

  function openMode(mode, rootId) {
    st.mode = mode;
    st.rootId = rootId;
    st.editing = null;
    st.q = '';
    var box = $(rootId);
    if (!box) return;
    if (!st.data) box.innerHTML = '<p class="gcv-cms-muted">Carregando…</p>';
    load();
  }

  global.GcvAdminTarifario = {
    open: function () { openMode('tarifarios', 'cms-tarifario-root'); },
    openPasseios: function () { openMode('passeios', 'cms-passeios-root'); }
  };
})(typeof window !== 'undefined' ? window : this);

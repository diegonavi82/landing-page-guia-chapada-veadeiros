/* gcv-admin-tarifario.js — menus PASSEIOS e TARIFÁRIO do admin
 *
 * Regras (as mesmas de api/helpers/tarifarios.php):
 * - Passeio unitário = uma experiência de trilha, com ou sem página publicada.
 * - Relação = outro passeio (o roteiro muda), com tarifa nova. Nunca soma.
 * - Até N atrativos no mesmo dia. N fica em Configurações.
 * - Um tarifário pode ser usado por vários passeios.
 * - Sem tarifário, não aparece à venda no site.
 */
(function (global) {
  'use strict';

  var API = '/api/admin/tarifarios.php';
  var CAMPOS = [
    ['excursao_pessoa_cents', 'PAX 4- Excursão', 'sem translado'],
    ['excursao_pessoa_5_cents', 'PAX 5+ Excursão', 'sem translado'],
    ['excursao_transporte_cents', 'Excursão', 'com translado'],
    ['exclusivo_pessoa_cents', 'PAX 4- Privativo', 'sem translado'],
    ['exclusivo_pessoa_5_cents', 'PAX 5+ Privativo', 'sem translado'],
    ['exclusivo_transporte_cents', 'Privativo', 'com translado']
  ];
  var CIDADE_CURTA = { 'alto-paraiso': 'Alto Paraíso', 'sao-jorge': 'São Jorge', 'cavalcante': 'Cavalcante' };
  var TARIFAS_OFICIAIS = {
    guia: [
      ['g70', 70, 90], ['g80', 80, 100], ['g88', 88, 108], ['g100', 100, 120],
      ['g120', 120, 150], ['g150', 150, 200], ['g200', 200, 250]
    ],
    translado: [
      ['t120', 120, 150], ['t150', 150, 200], ['t200', 200, 250], ['t250', 250, 300],
      ['t280', 280, 360], ['t300', 300, 400], ['t350', 350, 440], ['t400', 400, 520],
      ['t480', 480, 600], ['t560', 560, 640]
    ]
  };

  var st = {
    data: null,
    mode: 'tarifarios',
    rootId: 'cms-tarifario-root',
    editing: null,
    q: '',
    open: {},
    passeioId: 0,
    relacaoId: 0,
    sortKey: 'passeio',
    sortDir: 1,
    filters: { passeio: '', tarifa_guia: '', tarifa_translado: '', categorias: '' }
  };

  var PASSEIO_COLS = [
    ['passeio', 'Passeio'],
    ['tarifa_guia', 'Tarifa Guia'],
    ['tarifa_translado', 'Tarifa Translado'],
    ['categorias', 'Categorias']
  ];

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

  var VEICULO = 4;

  function regrasAtuais() {
    var r = (st.data && st.data.regras) || {};
    var quorum = parseInt(r.quorum, 10);
    return {
      quorum: quorum >= 1 && quorum <= 20 ? quorum : 4,
      diariaReais: parseInt(r.diaria_minima_reais, 10) || 320,
      pagamentoReais: parseInt(r.pg_minimo_guia_reais, 10) || 280
    };
  }

  function erroGuia(exc4, exc5, pri4, pri5, quorum, diariaCents) {
    if (exc4 > 0 && pri4 > 0 && exc4 >= pri4) return 'PAX 4- Excursão tem que ser menor que o PAX 4- Privativo.';
    if (exc4 > 0 && (exc5 <= 0 || exc5 >= exc4)) return 'PAX 5+ Excursão tem que ser menor que o PAX 4- Excursão.';
    if (pri4 > 0 && (pri5 <= 0 || pri5 >= pri4)) return 'PAX 5+ Privativo tem que ser menor que o PAX 4- Privativo.';
    if (exc5 > 0 && pri5 > 0 && exc5 >= pri5) return 'PAX 5+ Excursão tem que ser menor que o PAX 5+ Privativo.';
    if (exc4 > 0 && diariaCents > 0 && exc4 * quorum < diariaCents) {
      return 'PAX 4- Excursão × quórum ' + quorum + ' = ' + reais(exc4 * quorum) + ' fica abaixo da diária mínima de guiagem (' + reais(diariaCents) + ').';
    }
    return '';
  }

  function erroTranslado(excT, priT) {
    if (excT > 0 && priT > 0 && excT >= priT) return 'Excursão com translado tem que ser menor que Privativo com translado.';
    return '';
  }

  /** Acréscimo único. Dado antigo por cidade usa Alto Paraíso. */
  function bilingueCentsOf(t) {
    if (!t) return 4000;
    if (t.bilingue_tipo === 'fixo' && t.bilingue_valor != null && t.bilingue_valor !== '') return Math.max(0, parseInt(t.bilingue_valor, 10) || 0);
    if (t.bilingue_cents != null && t.bilingue_cents !== '') return Math.max(0, parseInt(t.bilingue_cents, 10) || 0);
    var cidades = t.cidades || {};
    var seen = {};
    var keys = ['alto-paraiso'].concat(Object.keys(cidades));
    for (var i = 0; i < keys.length; i++) {
      if (seen[keys[i]]) continue;
      seen[keys[i]] = true;
      var row = cidades[keys[i]];
      if (!row || row.bilingue_tipo === 'percentual') continue;
      if (row.bilingue_valor != null && row.bilingue_valor !== '') return Math.max(0, parseInt(row.bilingue_valor, 10) || 0);
    }
    return 4000;
  }

  function bilingueOf(t) {
    var cidades = (t && t.cidades) || {};
    var ap = cidades['alto-paraiso'] || {};
    var tipo = t && t.bilingue_tipo;
    var valor = t && t.bilingue_valor;
    if (tipo !== 'percentual' && tipo !== 'fixo' && ap.bilingue_tipo === 'percentual') {
      tipo = 'percentual';
      valor = ap.bilingue_valor;
    }
    if (tipo === 'percentual') {
      var pct = Math.max(0, Math.min(100, parseInt(valor, 10) || 0));
      return { tipo: 'percentual', texto: pct ? String(pct) : '' };
    }
    return { tipo: 'fixo', texto: moneyInput(bilingueCentsOf(t)) };
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

  function tarifaAcima(row) {
    var acima = null;
    oficiaisDo(row.tipo).forEach(function (outra) {
      if (outra.codigo === row.codigo || outra.excursao <= row.excursao) return;
      if (!acima || outra.excursao < acima.excursao || (outra.excursao === acima.excursao && outra.privativo < acima.privativo)) acima = outra;
    });
    return acima;
  }

  function saidasDe(item) {
    return item && item.saidas_tarifas ? item.saidas_tarifas : [];
  }

  function cadaSaida(fn) {
    (st.data.atrativos || []).forEach(function (a) {
      saidasDe(a).forEach(function (s) { fn('atrativo', a.id, a.title_pt, s); });
    });
    (st.data.passeios || []).forEach(function (p) {
      if ((p.attractions || []).length < 2) return;
      saidasDe(p).forEach(function (s) { fn('passeio', p.id, passeioNome(p), s); });
    });
  }

  function experienciasDa(tipo, codigo) {
    var campo = tipo === 'guia' ? 'guia' : 'translado';
    var out = [];
    cadaSaida(function (kind, id, nome, s) {
      if ((s[campo] || '') !== codigo) return;
      out.push({ kind: kind, id: id, nome: nome, cidade: s.key || '', cidadeNome: s.nome || '' });
    });
    return out;
  }

  function nomesComTarifa(codigo) {
    var nomes = [];
    var visto = {};
    experienciasDa('guia', codigo).concat(experienciasDa('translado', codigo)).forEach(function (e) {
      var nome = e.nome + (e.cidadeNome ? ' · ' + e.cidadeNome : '');
      if (visto[nome]) return;
      visto[nome] = true;
      nomes.push(nome);
    });
    return nomes;
  }

  function oficiaisDo(tipo) {
    return ((st.data && st.data.tarifas_oficiais) || []).filter(function (r) { return r.tipo === tipo; }).sort(function (a, b) {
      return a.excursao - b.excursao || a.privativo - b.privativo;
    });
  }

  function oficialItem(tipo, codigo) {
    var rows = oficiaisDo(tipo);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].codigo === codigo) return rows[i];
    }
    return null;
  }

  /** EXC120(100) / PRI150(130): fora do parêntese é até 4 pessoas; dentro, da 5ª. */
  function nomeTarifaGuia(exc4, exc5, pri4, pri5) {
    exc4 = Math.round(Number(exc4) || 0);
    pri4 = Math.round(Number(pri4) || 0);
    if (exc4 < 1 && pri4 < 1) return '';
    var excShow = Math.round(Number(exc5) || 0);
    var priShow = Math.round(Number(pri5) || 0);
    if (excShow < 1 || priShow < 1) return 'EXC' + exc4 + ' / PRI' + pri4;
    return 'EXC' + exc4 + '(' + excShow + ') / PRI' + pri4 + '(' + priShow + ')';
  }

  function oficialLabel(item) {
    if (!item) return '';
    if (item.tipo === 'guia') return nomeTarifaGuia(item.excursao, item.excursao_5, item.privativo, item.privativo_5);
    return 'Excursão ' + reais(item.excursao_cents) + ' · Privativo ' + reais(item.privativo_cents);
  }

  function oficialSelect(tipo, current) {
    var rows = oficiaisDo(tipo);
    var attr = tipo === 'guia' ? 'data-oficial-guia' : 'data-oficial-translado';
    return '<select class="gcv-dash-select tf-select" ' + attr + '>' +
      '<option value="">— escolher —</option>' +
      rows.map(function (row) {
        return '<option value="' + esc(row.codigo) + '"' + (row.codigo === current ? ' selected' : '') + '>' + esc(oficialLabel(row)) + '</option>';
      }).join('') +
      '</select>';
  }

  function oficiaisFields(kind, id, guia, translado) {
    return '<div class="tf-grid2" data-oficiais="' + kind + '" data-oficial-id="' + id + '">' +
      '<label class="tf-field"><span>Tarifa Guia · sem translado</span>' + oficialSelect('guia', guia || '') + '</label>' +
      '<label class="tf-field"><span>Tarifa Translado · com translado</span>' + oficialSelect('translado', translado || '') + '</label>' +
      '</div>' +
      '<p class="gcv-cms-muted tf-small">Sem Tarifa Guia, o passeio fica fora do site. A Tarifa Translado pode ficar vazia. Cada cidade de saída se ajusta no Tarifário.</p>';
  }

  function tarifarioSelect(attrs, current, emptyLabel) {
    var list = (st.data.tarifarios || []).slice();
    return '<select class="gcv-dash-select tf-select" ' + attrs + '>' +
      '<option value="">' + esc(emptyLabel || '— sem tarifa (fora do site) —') + '</option>' +
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
    var focus = st.mode === 'passeios' && (st.passeioId || st.relacaoId || st.editing);
    if (focus) {
      box.innerHTML = '<div id="tf-body"></div><div class="tf-toast" id="tf-toast" role="status" aria-live="polite"></div>';
      paintBody();
      return;
    }
    box.innerHTML =
      (st.mode === 'passeios' ? '' :
        '<div class="tf-head">' +
          '<input class="gcv-dash-input tf-search" id="tf-search" type="search" placeholder="Buscar tarifa ou experiência" value="' + esc(st.q) + '" />' +
        '</div>') +
      '<div id="tf-body"></div>' +
      '<div class="tf-toast" id="tf-toast" role="status" aria-live="polite"></div>';
    var search = $('tf-search');
    if (search) search.oninput = function () { st.q = search.value; paintBody(); };
    paintBody();
  }

  function paintBody() {
    if (st.editing) return paintEditor();
    if (st.mode === 'passeios') {
      if (st.relacaoId) return paintRelacaoPage();
      if (st.passeioId) return paintPasseioPage();
      return paintPasseiosTable();
    }
    return paintTarifarios();
  }

  function passeioIdFromHash() {
    var m = String(location.hash || '').match(/^#passeio\/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function goPasseio(id) {
    st.passeioId = id;
    st.relacaoId = 0;
    st.editing = null;
    var next = '#passeio/' + id;
    if ((location.hash || '') !== next) {
      history.pushState(null, '', location.pathname + location.search + next);
    }
    paint();
    var box = $(st.rootId);
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function relacaoIdFromHash() {
    var m = String(location.hash || '').match(/^#relacao\/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function goRelacao(id) {
    st.relacaoId = id;
    st.passeioId = 0;
    st.editing = null;
    var next = '#relacao/' + id;
    if ((location.hash || '') !== next) {
      history.pushState(null, '', location.pathname + location.search + next);
    }
    paint();
    var box = $(st.rootId);
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function leavePasseio() {
    st.passeioId = 0;
    st.relacaoId = 0;
    st.editing = null;
    var h = String(location.hash || '');
    if (h.indexOf('#passeio/') === 0 || h.indexOf('#relacao/') === 0) {
      history.pushState(null, '', location.pathname + location.search + '#passeios');
    }
    paint();
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function apCents(t, field) {
    var row = t && t.cidades && t.cidades['alto-paraiso'];
    return row ? (parseInt(row[field], 10) || 0) : 0;
  }

  function reaisInteiro(cents) {
    return Math.round((parseInt(cents, 10) || 0) / 100);
  }

  function nomeTarifaTranslado(exc, pri) {
    exc = Math.round(Number(exc) || 0);
    pri = Math.round(Number(pri) || 0);
    if (exc < 1 && pri < 1) return '';
    return 'Excursão R$ ' + exc + ' · Privativo R$ ' + pri;
  }

  /** Oficial da Tarifa Guia, senão a parte sem translado da tabela antiga. */
  function tarifaSemTranslado(item) {
    var guia = oficialItem('guia', item && item.tarifa_guia);
    if (guia) return nomeTarifaGuia(guia.excursao, guia.excursao_5, guia.privativo, guia.privativo_5);
    var t = tarifarioById(item && item.tarifario_id);
    if (!t) return '';
    return nomeTarifaGuia(
      reaisInteiro(apCents(t, 'excursao_pessoa_cents')),
      reaisInteiro(apCents(t, 'excursao_pessoa_5_cents')),
      reaisInteiro(apCents(t, 'exclusivo_pessoa_cents')),
      reaisInteiro(apCents(t, 'exclusivo_pessoa_5_cents'))
    );
  }

  /** Oficial da Tarifa Translado, senão a parte com translado da tabela antiga. */
  function tarifaComTranslado(item) {
    var trans = oficialItem('translado', item && item.tarifa_translado);
    if (trans) return nomeTarifaTranslado(reaisInteiro(trans.excursao_cents), reaisInteiro(trans.privativo_cents));
    var t = tarifarioById(item && item.tarifario_id);
    if (!t) return '';
    return nomeTarifaTranslado(
      reaisInteiro(apCents(t, 'excursao_transporte_cents')),
      reaisInteiro(apCents(t, 'exclusivo_transporte_cents'))
    );
  }

  function catsTexto(lista) {
    var cats = st.data.categorias || {};
    return (lista || []).map(function (k) { return cats[k] || k; }).join(', ');
  }

  function linhaPasseio(item, kind) {
    var n = kind === 'relacao' ? (item.attractions || []).length : 1;
    return {
      id: item.id,
      kind: kind,
      atrativos: n,
      passeio: kind === 'relacao' ? passeioNome(item) : (item.title_pt || ''),
      tarifa_guia: tarifaSemTranslado(item),
      tarifa_translado: tarifaComTranslado(item),
      categorias: catsTexto(item.categorias)
    };
  }

  function listRows() {
    var unit = (st.data.atrativos || []).filter(function (a) {
      return String(a.title_pt || '').indexOf(' + ') < 0;
    }).map(function (a) { return linhaPasseio(a, 'atrativo'); });
    var combos = (st.data.passeios || []).filter(function (p) {
      return (p.attractions || []).length > 1;
    }).map(function (p) { return linhaPasseio(p, 'relacao'); });
    return unit.concat(combos);
  }

  function hasText(field, value) {
    var q = norm(st.filters[field] || '');
    if (!q) return true;
    return norm(value).indexOf(q) >= 0;
  }

  function rowVisible(r) {
    if (!hasText('passeio', r.passeio)) return false;
    if (!hasText('tarifa_guia', r.tarifa_guia || 'sem tarifa')) return false;
    if (!hasText('tarifa_translado', r.tarifa_translado || 'sem translado')) return false;
    if (!hasText('categorias', r.categorias)) return false;
    return true;
  }

  function compareRows(a, b) {
    var k = st.sortKey;
    var dir = st.sortDir;
    var va = a[k];
    var vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va || '').localeCompare(String(vb || ''), 'pt', { sensitivity: 'base', numeric: true }) * dir;
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

  /* ---------- lista: unitários e relações ---------- */
  function paintPasseiosTable() {
    var body = $('tf-body');
    body.innerHTML =
      '<div class="ps-board">' +
        '<div class="ps-board__top">' +
          '<p class="ps-count" id="ps-count"></p>' +
        '</div>' +
        '<div class="ps-scroll"><table class="ps-table">' +
          '<thead><tr>' + PASSEIO_COLS.map(function (c) {
            var on = st.sortKey === c[0];
            var arrow = on ? (st.sortDir > 0 ? '↑' : '↓') : '↕';
            var sortName = on ? (st.sortDir > 0 ? 'ascending' : 'descending') : 'none';
            return '<th scope="col" aria-sort="' + sortName + '"><button type="button" class="ps-sort' + (on ? ' is-on' : '') + '" data-sort="' + c[0] + '">' +
              '<span>' + esc(c[1]) + '</span>' +
              '<i aria-hidden="true">' + arrow + '</i></button></th>';
          }).join('') + '<th scope="col" class="ps-act-h"><span>Abrir</span></th></tr>' +
          '<tr class="ps-filters">' + PASSEIO_COLS.map(function (c) {
            return '<th><input class="gcv-dash-input ps-filter" data-filter="' + c[0] + '" value="' + esc(st.filters[c[0]] || '') + '" aria-label="Filtrar ' + esc(c[1]) + '" placeholder="Filtrar" /></th>';
          }).join('') + '<th></th></tr></thead>' +
          '<tbody id="ps-rows"></tbody></table></div></div>';

    body.querySelectorAll('[data-sort]').forEach(function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute('data-sort');
        if (st.sortKey === key) st.sortDir = -st.sortDir;
        else { st.sortKey = key; st.sortDir = 1; }
        paintPasseiosTable();
      };
    });
    body.querySelectorAll('[data-filter]').forEach(function (input) {
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', function () {
        st.filters[input.getAttribute('data-filter')] = input.value;
        fillPasseioRows();
      });
    });
    fillPasseioRows();
  }

  function fillPasseioRows() {
    var tbody = $('ps-rows');
    var count = $('ps-count');
    if (!tbody) return;
    var all = listRows();
    var rows = all.filter(rowVisible).sort(compareRows);
    var combos = all.filter(function (r) { return r.atrativos > 1; }).length;
    if (count) {
      var base = all.length + (all.length === 1 ? ' passeio' : ' passeios');
      if (combos) base += ' · ' + combos + ' com mais de um atrativo';
      count.textContent = rows.length === all.length ? base : (rows.length + ' de ' + all.length);
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td class="ps-empty" colspan="5">Nenhum passeio com esses filtros.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      var guia = r.tarifa_guia
        ? '<code class="ps-tarifa" title="Tarifa Guia, sem translado. Fora dos parênteses: até 4 pessoas. Dentro: da 5ª em diante.">' + esc(r.tarifa_guia) + '</code>'
        : '<span class="ps-missing">Sem tarifa</span>';
      var trans = r.tarifa_translado
        ? '<code class="ps-tarifa ps-tarifa--trans" title="Tarifa Translado.">' + esc(r.tarifa_translado) + '</code>'
        : '<span class="ps-missing">sem translado</span>';
      var chip = r.atrativos > 1 ? '<span class="ps-multi">' + r.atrativos + ' atrativos</span>' : '';
      return '<tr class="' + (r.atrativos > 1 ? 'ps-row--multi' : '') + '">' +
        '<td class="ps-passeio"><button type="button" class="ps-name" data-open-kind="' + r.kind + '" data-open-passeio="' + r.id + '">' + esc(r.passeio) + '</button>' + chip + '</td>' +
        '<td>' + guia + '</td>' +
        '<td>' + trans + '</td>' +
        '<td class="ps-cats">' + (r.categorias ? esc(r.categorias) : '<span class="ps-missing">—</span>') + '</td>' +
        '<td class="ps-act"><button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" data-open-kind="' + r.kind + '" data-open-passeio="' + r.id + '">Editar</button></td>' +
      '</tr>';
    }).join('');
    tbody.querySelectorAll('[data-open-passeio]').forEach(function (b) {
      b.onclick = function () {
        var id = parseInt(b.getAttribute('data-open-passeio'), 10);
        if (b.getAttribute('data-open-kind') === 'relacao') goRelacao(id);
        else goPasseio(id);
      };
    });
  }

  function paintRelacaoPage() {
    var body = $('tf-body');
    var p = (st.data.passeios || []).filter(function (x) { return x.id === st.relacaoId; })[0];
    if (!p || (p.attractions || []).length < 2) {
      body.innerHTML = '<div class="ps-page"><button type="button" class="tf-back" id="ps-back">← Passeios</button><p class="gcv-cms-muted">Essa relação não está na lista.</p></div>';
      $('ps-back').onclick = leavePasseio;
      return;
    }
    var n = (p.attractions || []).length;
    body.innerHTML =
      '<div class="ps-page">' +
        '<button type="button" class="tf-back" id="ps-back">← Passeios</button>' +
        '<header class="ps-hero">' +
          '<p class="ps-kicker">Passeio com ' + n + ' atrativos</p>' +
          '<h3>' + esc(passeioNome(p)) + '</h3>' +
          '<p class="ps-sub">A tarifa vale só para este roteiro. O preço não soma o dos atrativos.</p>' +
        '</header>' +
        '<section class="ps-card">' + passeioCard(p, 0) + '</section>' +
      '</div>';
    $('ps-back').onclick = leavePasseio;
    bindAtrativos(body);
  }

  /* ---------- página de um passeio unitário ---------- */
  function paintPasseioPage() {
    var body = $('tf-body');
    var a = attrById(st.passeioId);
    if (!a || String(a.title_pt || '').indexOf(' + ') >= 0) {
      body.innerHTML = '<div class="ps-page"><button type="button" class="tf-back" id="ps-back">← Passeios</button><p class="gcv-cms-muted">Esse passeio não está na lista de unitários.</p></div>';
      $('ps-back').onclick = leavePasseio;
      return;
    }
    var t = tarifarioById(a.tarifario_id);
    var max = parseInt(st.data.max_atrativos, 10) || 3;
    var passeios = passeiosDo(a.id);
    var outros = (st.data.atrativos || []).filter(function (x) {
      return x.id !== a.id && String(x.title_pt || '').indexOf(' + ') < 0;
    });
    var opts = '<option value="">— escolher atração —</option>' + outros.map(function (x) {
      return '<option value="' + x.id + '">' + esc(x.title_pt) + '</option>';
    }).join('');
    var addSelects = '';
    for (var i = 1; i < max && i <= 4; i++) {
      addSelects += '<label class="tf-field"><span>Atração ' + (i + 1) + '</span><select class="gcv-dash-select" data-combo-pick="' + a.id + '" aria-label="Atração ' + (i + 1) + '">' + opts + '</select></label>';
    }
    body.innerHTML =
      '<div class="ps-page">' +
        '<button type="button" class="tf-back" id="ps-back">← Passeios</button>' +
        '<header class="ps-hero">' +
          '<p class="ps-kicker">Passeio unitário · 1 atração</p>' +
          '<h3>' + esc(a.title_pt) + '</h3>' +
          '<p class="ps-sub">' + (oficialItem('guia', a.tarifa_guia) ? 'Tem tarifa de guia. O translado pode ficar vazio. Cada cidade de saída se ajusta no Tarifário.' : 'Sem tarifa de guia. O passeio fica fora do site.') + '</p>' +
        '</header>' +
        '<section class="ps-card">' +
          '<h4>Este passeio</h4>' +
          '<label class="tf-check"><input type="checkbox" data-tem-passeio="' + a.id + '"' + (a.tem_passeio === false ? '' : ' checked') + ' /> À venda no site</label>' +
          '<div class="tf-field"><span>Categorias</span><div class="tf-cats" data-cats="atrativo" data-cat-id="' + a.id + '">' + catChecks(a.categorias) + '</div></div>' +
          oficiaisFields('atrativo', a.id, a.tarifa_guia, a.tarifa_translado) +
          '<div class="tf-field"><span>Duração saindo de cada cidade</span>' + duracaoInputs('atrativo', a.id, a.duracao_cidades) + '</div>' +
        '</section>' +
        '<section class="ps-card">' +
          '<h4>Relações</h4>' +
          '<p class="gcv-cms-muted">Cada relação é outro passeio. A Tarifa Guia e, se houver, a Tarifa Translado valem para cada cidade de saída. O preço nunca soma. Elas ficam só nesta página.</p>' +
          (passeios.length ? passeios.map(function (p) { return passeioCard(p, a.id); }).join('') : '<p class="gcv-cms-muted">Nenhuma relação ainda.</p>') +
          (max >= 2
            ? '<div class="tf-add ps-join">' + addSelects +
                '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" data-combo-add="' + a.id + '">Criar relação</button></div>' +
                '<p class="gcv-cms-muted tf-small">Até ' + max + ' atrações no mesmo dia. <a href="#configuracoes">Mudar o máximo em Configurações</a>.</p>'
            : '<p class="gcv-cms-muted">Em Configurações o máximo é 1 atração por passeio. Não há relação.</p>') +
        '</section>' +
      '</div>';
    $('ps-back').onclick = leavePasseio;
    bindAtrativos(body);
  }

  function passeioCard(p, fromAttr) {
    var nomes = (p.attractions || []).map(function (x) {
      return x.id === fromAttr ? '<span>' + esc(x.title_pt) + '</span>' : '<b>' + esc(x.title_pt) + '</b>';
    }).join(' <i>+</i> ');
    return '<div class="tf-combo' + (p.tarifa_guia ? '' : ' is-off') + '">' +
      '<div class="tf-combo__top"><p class="tf-combo__name">' + nomes + '</p>' +
      '<button type="button" class="tf-x" data-combo-del="' + p.id + '" title="Desfazer este passeio" aria-label="Desfazer ' + esc(passeioNome(p)) + '">×</button></div>' +
      oficiaisFields('passeio', p.id, p.tarifa_guia, p.tarifa_translado) +
      (p.tarifa_guia ? '' : '<span class="tf-warn tf-small">Sem tarifa de guia, este passeio fica fora do site.</span>') +
      '<div class="tf-cats" data-cats="passeio" data-cat-id="' + p.id + '">' + catChecks(p.categorias) + '</div>' +
      '<div class="tf-field"><span>Duração saindo de cada cidade</span>' + duracaoInputs('passeio', p.id, p.duracao_cidades) + '</div>' +
    '</div>';
  }

  function bindAtrativos(body) {
    body.querySelectorAll('[data-edit-tf]').forEach(function (b) {
      b.onclick = function () { openEditor(tarifarioById(b.getAttribute('data-edit-tf'))); };
    });
    body.querySelectorAll('[data-oficiais]').forEach(function (box) {
      box.querySelectorAll('select').forEach(function (sel) {
        sel.onchange = function () {
          var payload = {
            action: 'oficiais',
            tarifa_guia: (box.querySelector('[data-oficial-guia]') || {}).value || '',
            tarifa_translado: (box.querySelector('[data-oficial-translado]') || {}).value || ''
          };
          if (box.getAttribute('data-oficiais') === 'passeio') payload.passeio_id = parseInt(box.getAttribute('data-oficial-id'), 10);
          else payload.attraction_id = parseInt(box.getAttribute('data-oficial-id'), 10);
          request('PUT', payload, function (res) {
            apply(res, payload.tarifa_guia ? 'Tarifa de guia salva. O translado pode ficar vazio.' : 'Sem tarifa de guia, fica fora do site');
          });
        };
      });
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
        var scope = input.closest('.ps-page') || input.closest('.tf-attr__body');
        var wrap = scope && scope.querySelector('[data-cats="atrativo"]');
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
          apply(res, 'Relação criada. A tarifa é opcional. Sem ela, o passeio não entra no site.');
        });
      };
    });
    body.querySelectorAll('[data-combo-del]').forEach(function (b) {
      b.onclick = function () {
        var p = (st.data.passeios || []).filter(function (x) { return x.id === parseInt(b.getAttribute('data-combo-del'), 10); })[0];
        confirmar('Desfazer o passeio\n' + (p ? passeioNome(p) : '') + '?\n\nEle sai da página de todos os atrativos dele.', 'Desfazer').then(function (ok) {
          if (!ok) return;
          request('DELETE', { passeio_id: p.id }, function (res) { apply(res, 'Passeio desfeito'); });
        });
      };
    });
  }

  /* ---------- aba: tarifários ---------- */
  function paintTarifarios() {
    var body = $('tf-body');
    var bi = bilingueOf({ bilingue_tipo: (st.data.bilingue || {}).tipo, bilingue_valor: (st.data.bilingue || {}).valor, bilingue_cents: (st.data.bilingue || {}).cents });
    function campoNova(attr, label) {
      return '<label class="tf-field"><span>' + label + '</span><span class="tf-cell"><span class="tf-money"><em>R$</em><input inputmode="decimal" ' + attr + ' aria-label="' + label + '" /></span><span class="tf-side" data-nova-side="' + attr + '"></span></span></label>';
    }
    function refreshNova(form) {
      var tipo = form.getAttribute('data-nova');
      var q = regrasAtuais().quorum;
      var exc = toCents((form.querySelector('[data-nova-exc]') || {}).value);
      var pri = toCents((form.querySelector('[data-nova-pri]') || {}).value);
      function set(attr, text) {
        var el = form.querySelector('[data-nova-side="' + attr + '"]');
        if (el) el.textContent = text;
      }
      if (tipo === 'guia') {
        set('data-nova-exc', exc > 0 ? 'Diária ' + reais(q * exc) : '');
        set('data-nova-pri', exc > 0 ? 'Diária ' + reais(q * exc) : '');
      } else {
        set('data-nova-exc', exc > 0 ? 'Veículo ' + reais(VEICULO * exc) : '');
        set('data-nova-pri', pri > 0 ? 'Veículo ' + reais(VEICULO * pri) : '');
      }
    }
    function cardCombina(tipo, row) {
      if (!st.q) return true;
      if (matches(oficialLabel(row)) || matches(row.codigo)) return true;
      return experienciasDa(tipo, row.codigo).some(function (e) { return matches(e.nome) || matches(e.cidadeNome); });
    }
    function experienciasHtml(tipo, row) {
      var ligadas = experienciasDa(tipo, row.codigo);
      var chips = ligadas.map(function (e) {
        var rotulo = e.nome + (e.cidadeNome ? ' · ' + e.cidadeNome : '');
        return '<span class="tf-chip' + (e.kind === 'passeio' ? ' tf-chip--combo' : '') + '">' + esc(rotulo) +
          '<button type="button" data-tirar-exp="' + esc(row.codigo) + '" data-kind="' + esc(e.kind) + '" data-id="' + e.id + '" data-cidade="' + esc(e.cidade) + '" data-nome="' + esc(rotulo) + '" data-tipo="' + tipo + '" aria-label="Tirar ' + esc(rotulo) + '">×</button></span>';
      }).join('');
      var opcoes = '';
      cadaSaida(function (kind, id, nome, s) {
        var campo = tipo === 'guia' ? 'guia' : 'translado';
        if ((s[campo] || '') === row.codigo) return;
        if (!s.key) return;
        var rotulo = nome + (s.nome ? ' · ' + s.nome : '');
        if (st.q && !matches(rotulo) && !matches(oficialLabel(row))) return;
        opcoes += '<option value="' + esc(kind + ':' + id + ':' + s.key) + '" data-atual="' + esc(s[campo] || '') + '">' + esc(rotulo) + '</option>';
      });
      return '<div class="tf-exps"><span>Experiências</span><div class="tf-card__use">' +
        (chips || '<span class="gcv-cms-muted tf-small">Nenhuma nesta tarifa.</span>') +
        '</div><select class="gcv-dash-select tf-use-add" data-add-exp="' + esc(row.codigo) + '" data-tipo="' + tipo + '" aria-label="Adicionar experiência">' +
        '<option value="">Adicionar experiência…</option>' + opcoes + '</select></div>';
    }
    function lista(tipo, titulo) {
      var guia = tipo === 'guia';
      var todas = oficiaisDo(tipo);
      var visiveis = todas.filter(function (row) { return cardCombina(tipo, row); });
      var cards = visiveis.map(function (row) {
          var paxEdit = guia
            ? campoCard('data-exc', 'PAX 4- Excursão', row.excursao_cents) +
              campoCard('data-pri', 'PAX 4- Privativo', row.privativo_cents) +
              campoCard('data-exc5', 'PAX 5+ Excursão', row.excursao_5_cents) +
              campoCard('data-pri5', 'PAX 5+ Privativo', row.privativo_5_cents)
            : campoCard('data-exc', 'Excursão', row.excursao_cents) + campoCard('data-pri', 'Privativo', row.privativo_cents);
          var ladoOficial = guia
            ? '<span class="tf-side">Diária ' + reais(regrasAtuais().quorum * row.excursao_cents) + '</span>'
            : '<span class="tf-side">Veículo ' + reais(VEICULO * row.excursao_cents) + ' · ' + reais(VEICULO * row.privativo_cents) + '</span>';
          return '<article class="tf-oficial__item" data-edit-tarifa="' + esc(row.codigo) + '"><b>' + esc(oficialLabel(row)) + '</b>' + ladoOficial +
            '<div class="tf-card-edit">' + paxEdit +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-btn--sm" data-save-tarifa="' + esc(row.codigo) + '">Salvar</button></div>' +
            experienciasHtml(tipo, row) +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-del-oficial="' + esc(row.codigo) + '">Excluir</button></article>';
      }).join('');
      return '<section class="tf-oficial"><h3>' + titulo + '</h3>' +
        '<form class="tf-oficial__new" data-nova="' + tipo + '">' +
          (guia
            ? campoNova('data-nova-exc', 'PAX 4- Excursão') + campoNova('data-nova-pri', 'PAX 4- Privativo') + campoNova('data-nova-exc5', 'PAX 5+ Excursão') + campoNova('data-nova-pri5', 'PAX 5+ Privativo')
            : campoNova('data-nova-exc', 'Excursão') + campoNova('data-nova-pri', 'Privativo')) +
          '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm">Criar tarifa</button>' +
        '</form>' +
        '<div class="tf-oficial__list' + (guia ? ' tf-oficial__list--guia' : '') + '">' +
        (cards || (todas.length ? '<p class="gcv-cms-muted tf-small">Nenhuma tarifa com esse filtro.</p>' : '')) +
        '</div></section>';
    }
    function campoCard(attr, label, cents) {
      return '<label class="tf-field"><span>' + label + '</span><span class="tf-money"><em>R$</em><input inputmode="decimal" ' + attr + ' value="' + esc(moneyInput(cents)) + '" aria-label="' + label + '" /></span></label>';
    }
    function selectOficial(tipo, atual, vazio) {
      return '<option value="">' + vazio + '</option>' + oficiaisDo(tipo).map(function (row) {
        return '<option value="' + esc(row.codigo) + '"' + (row.codigo === atual ? ' selected' : '') + '>' + esc(oficialLabel(row)) + '</option>';
      }).join('');
    }
    function orfasHtml() {
      var grupos = [];
      function por(kind, id) {
        for (var i = 0; i < grupos.length; i++) {
          if (grupos[i].kind === kind && grupos[i].id === id) return grupos[i];
        }
        return null;
      }
      (st.data.atrativos || []).forEach(function (a) {
        var faltam = saidasDe(a).filter(function (s) { return s.key && !s.guia; });
        var sem = !saidasDe(a).length;
        if (!faltam.length && !sem) return;
        if (st.q && !matches(a.title_pt)) return;
        grupos.push({ kind: 'atrativo', id: a.id, nome: a.title_pt, saidas: faltam, semCidade: sem });
      });
      (st.data.passeios || []).forEach(function (p) {
        if ((p.attractions || []).length < 2) return;
        var nome = passeioNome(p);
        var faltam = saidasDe(p).filter(function (s) { return s.key && !s.guia; });
        var sem = !saidasDe(p).length;
        if (!faltam.length && !sem) return;
        if (st.q && !matches(nome)) return;
        if (por('passeio', p.id)) return;
        grupos.push({ kind: 'passeio', id: p.id, nome: nome, saidas: faltam, semCidade: sem });
      });
      if (!grupos.length) {
        return '<section class="tf-orfas"><h3>Sem tarifa de guia</h3><p class="gcv-cms-muted tf-small">Todas as saídas têm tarifa de guia.</p></section>';
      }
      return '<section class="tf-orfas"><h3>Sem tarifa de guia</h3>' +
        grupos.map(function (g) {
          var linhas = g.semCidade
            ? '<p class="gcv-cms-muted tf-small">Nenhuma cidade de saída. Defina as saídas na experiência.</p>'
            : g.saidas.map(function (s) {
              return '<div class="tf-orfa__row" data-orfa-kind="' + esc(g.kind) + '" data-orfa-id="' + g.id + '" data-orfa-cidade="' + esc(s.key) + '">' +
                '<span>' + esc(s.nome) + '</span>' +
                '<label class="tf-field"><span>Tarifa Guia</span><select class="gcv-dash-select" data-orfa-guia>' + selectOficial('guia', '', '— escolher —') + '</select></label>' +
                '<label class="tf-field"><span>Tarifa Translado</span><select class="gcv-dash-select" data-orfa-trans>' + selectOficial('translado', s.translado || '', '— sem translado —') + '</select></label>' +
              '</div>';
            }).join('');
          return '<article class="tf-orfa' + (g.kind === 'passeio' ? ' tf-orfa--combo' : '') + '"><b>' + esc(g.nome) + '</b>' + linhas + '</article>';
        }).join('') +
      '</section>';
    }
    body.innerHTML =
      '<section class="tf-oficial tf-oficial--bi">' +
        '<h3>Guia em outro idioma</h3>' +
        '<div class="tf-bi">' +
          '<label class="tf-field"><span>Tipo</span><select class="gcv-dash-select" id="tf-bi-tipo" aria-label="Tipo do acréscimo do guia em outro idioma">' +
            '<option value="fixo"' + (bi.tipo === 'fixo' ? ' selected' : '') + '>Valor em R$</option>' +
            '<option value="percentual"' + (bi.tipo === 'percentual' ? ' selected' : '') + '>Percentual</option>' +
          '</select></label>' +
          '<label class="tf-field"><span id="tf-bi-leg">Valor</span><span class="tf-money"><em id="tf-bi-unit">' + (bi.tipo === 'percentual' ? '%' : 'R$') + '</em><input inputmode="decimal" id="tf-bilingue" value="' + esc(bi.texto) + '" aria-label="Valor do guia em outro idioma" /></span></label>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" id="tf-bi-save">Salvar</button>' +
        '</div></section>' +
      '<section class="tf-oficial tf-oficial--bi">' +
        '<h3>Diária mínima de guiagem</h3>' +
        '<p class="gcv-cms-muted tf-small">Vale para todas as tarifas, como o guia em outro idioma. O pacote do privativo sem translado é o PAX 4- Excursão × quórum e não pode ficar abaixo desta diária. O pagamento mínimo ao guia tem que ser menor que a diária.</p>' +
        '<div class="tf-bi">' +
          '<label class="tf-field"><span>Diária mínima de guiagem</span><span class="tf-money"><em>R$</em><input inputmode="decimal" id="tf-diaria" value="' + esc(String(regrasAtuais().diariaReais)) + '" aria-label="Diária mínima de guiagem" /></span></label>' +
          '<label class="tf-field"><span>Pagamento mínimo de guiagem</span><span class="tf-money"><em>R$</em><input inputmode="decimal" id="tf-pagamento" value="' + esc(String(regrasAtuais().pagamentoReais)) + '" aria-label="Pagamento mínimo de guiagem" /></span></label>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" id="tf-regras-save">Salvar</button>' +
        '</div>' +
      '</section>' +
      lista('guia', 'Tarifa Guia') +
      lista('translado', 'Tarifa Translado') +
      orfasHtml();
    $('tf-bi-tipo').onchange = function () {
      var unit = $('tf-bi-unit');
      if (unit) unit.textContent = this.value === 'percentual' ? '%' : 'R$';
    };
    $('tf-regras-save').onclick = function () {
      var diaria = Math.round(toCents($('tf-diaria').value) / 100);
      var pg = Math.round(toCents($('tf-pagamento').value) / 100);
      if (!diaria || !pg) { toast('Informe a diária mínima e o pagamento mínimo de guiagem.', true); return; }
      if (pg >= diaria) { toast('O pagamento mínimo de guiagem tem que ser menor que a diária mínima de guiagem.', true); return; }
      request('PUT', { action: 'regras', diaria_minima_reais: diaria, pg_minimo_guia_reais: pg }, function (res) {
        apply(res, 'Diária e pagamento mínimo salvos');
      });
    };
    $('tf-bi-save').onclick = function () {
      var tipo = $('tf-bi-tipo').value === 'percentual' ? 'percentual' : 'fixo';
      var raw = String($('tf-bilingue').value || '').trim();
      var valor = tipo === 'percentual'
        ? (raw === '' ? 0 : Math.max(0, Math.min(100, parseInt(raw.replace(',', '.'), 10) || 0)))
        : (raw === '' ? 4000 : toCents(raw));
      request('PUT', { action: 'bilingue', bilingue_tipo: tipo, bilingue_valor: valor }, function (res) {
        apply(res, 'Guia em outro idioma salvo para todas as tarifas');
      });
    };
    body.querySelectorAll('[data-nova]').forEach(function (form) {
      form.oninput = function () { refreshNova(form); };
      form.onsubmit = function (ev) {
        if (ev) ev.preventDefault();
        var tipo = form.getAttribute('data-nova');
        var excCents = toCents((form.querySelector('[data-nova-exc]') || {}).value);
        var priCents = toCents((form.querySelector('[data-nova-pri]') || {}).value);
        var exc5Cents = toCents((form.querySelector('[data-nova-exc5]') || {}).value);
        var pri5Cents = toCents((form.querySelector('[data-nova-pri5]') || {}).value);
        var exc = excCents / 100;
        var pri = priCents / 100;
        var exc5 = exc5Cents / 100;
        var pri5 = pri5Cents / 100;
        if (!exc || !pri || (tipo === 'guia' && (!exc5 || !pri5))) { toast('Preencha todos os valores da tarifa.', true); return; }
        var reg = regrasAtuais();
        var erro = tipo === 'guia'
          ? erroGuia(excCents, exc5Cents, priCents, pri5Cents, reg.quorum, reg.diariaReais * 100)
          : erroTranslado(excCents, priCents);
        if (erro) { toast(erro, true); return; }
        request('PUT', { action: 'tarifa_criar', tipo: tipo, excursao: exc, privativo: pri, excursao_5: exc5, privativo_5: pri5 }, function (res) {
          apply(res, 'Tarifa criada');
        });
      };
    });
    body.querySelectorAll('[data-save-tarifa]').forEach(function (btn) {
      btn.onclick = function () {
        var box = btn.closest('[data-edit-tarifa]');
        var codigo = btn.getAttribute('data-save-tarifa');
        var row = ((st.data && st.data.tarifas_oficiais) || []).filter(function (r) { return r.codigo === codigo; })[0];
        if (!box || !row) return;
        var exc = toCents((box.querySelector('[data-exc]') || {}).value) / 100;
        var pri = toCents((box.querySelector('[data-pri]') || {}).value) / 100;
        var exc5 = toCents((box.querySelector('[data-exc5]') || {}).value) / 100;
        var pri5 = toCents((box.querySelector('[data-pri5]') || {}).value) / 100;
        if (!exc || !pri || (row.tipo === 'guia' && (!exc5 || !pri5))) { toast('Preencha todos os valores da tarifa.', true); return; }
        var reg = regrasAtuais();
        var erro = row.tipo === 'guia'
          ? erroGuia(exc * 100, exc5 * 100, pri * 100, pri5 * 100, reg.quorum, reg.diariaReais * 100)
          : erroTranslado(exc * 100, pri * 100);
        if (erro) { toast(erro, true); return; }
        request('PUT', { action: 'tarifa_editar', codigo: codigo, excursao: exc, privativo: pri, excursao_5: exc5, privativo_5: pri5 }, function (res) {
          apply(res, 'Tarifa salva');
        });
      };
    });
    function salvarSaida(kind, id, cidade, campo, codigo, okMsg) {
      request('PUT', { action: 'tarifa_saida', kind: kind, id: id, cidade: cidade, campo: campo, codigo: codigo }, function (res) {
        apply(res, okMsg);
      });
    }
    body.querySelectorAll('[data-tirar-exp]').forEach(function (btn) {
      btn.onclick = function () {
        var tipo = btn.getAttribute('data-tipo');
        var nome = btn.getAttribute('data-nome') || 'esta experiência';
        var extra = tipo === 'guia' ? '\n\nSem tarifa de guia, essa saída fica fora do site.' : '';
        confirmar('Tirar\n' + nome + '\ndesta tarifa?' + extra, 'Tirar').then(function (ok) {
          if (!ok) return;
          salvarSaida(btn.getAttribute('data-kind'), parseInt(btn.getAttribute('data-id'), 10), btn.getAttribute('data-cidade') || '', tipo === 'guia' ? 'guia' : 'translado', '', 'Experiência tirada da tarifa');
        });
      };
    });
    body.querySelectorAll('[data-add-exp]').forEach(function (sel) {
      sel.onchange = function () {
        if (!sel.value) return;
        var parts = sel.value.split(':');
        var tipo = sel.getAttribute('data-tipo');
        var opt = sel.options[sel.selectedIndex];
        var atual = opt ? opt.getAttribute('data-atual') : '';
        function go() {
          salvarSaida(parts[0], parseInt(parts[1], 10), parts.slice(2).join(':'), tipo === 'guia' ? 'guia' : 'translado', sel.getAttribute('data-add-exp'), 'Experiência adicionada');
        }
        if (atual) {
          confirmar('Essa saída já está em outra tarifa.\n\nTrocar para esta?', 'Trocar').then(function (ok) {
            if (!ok) { sel.value = ''; return; }
            go();
          });
          return;
        }
        go();
      };
    });
    body.querySelectorAll('[data-orfa-guia], [data-orfa-trans]').forEach(function (sel) {
      sel.setAttribute('data-antes', sel.value || '');
      sel.onchange = function () {
        var row = sel.closest('[data-orfa-cidade]');
        if (!row) return;
        var antes = sel.getAttribute('data-antes') || '';
        var guia = sel.hasAttribute('data-orfa-guia');
        function go() {
          sel.setAttribute('data-antes', sel.value || '');
          salvarSaida(
            row.getAttribute('data-orfa-kind'),
            parseInt(row.getAttribute('data-orfa-id'), 10),
            row.getAttribute('data-orfa-cidade') || '',
            guia ? 'guia' : 'translado',
            sel.value,
            guia ? (sel.value ? 'Tarifa de guia definida' : 'Tarifa de guia tirada') : (sel.value ? 'Tarifa de translado definida' : 'Tarifa de translado tirada')
          );
        }
        if (antes && antes !== sel.value) {
          confirmar(sel.value ? 'Essa saída já está em outra tarifa.\n\nTrocar para esta?' : 'Tirar a tarifa desta saída?', sel.value ? 'Trocar' : 'Tirar').then(function (ok) {
            if (!ok) { sel.value = antes; return; }
            go();
          });
          return;
        }
        go();
      };
    });
    body.querySelectorAll('[data-del-oficial]').forEach(function (btn) {
      btn.onclick = function () {
        var codigo = btn.getAttribute('data-del-oficial');
        var row = ((st.data && st.data.tarifas_oficiais) || []).filter(function (r) { return r.codigo === codigo; })[0];
        if (!row) return;
        var nomes = nomesComTarifa(codigo);
        var acima = tarifaAcima(row);
        if (nomes.length && !acima) {
          confirmar('Não dá para excluir\n' + oficialLabel(row) + '.\n\nÉ a maior excursão desta lista. ' + nomes.length + (nomes.length === 1 ? ' passeio usa' : ' passeios usam') + ' esta tarifa e não há outra acima:\n\n' + nomes.join('\n'), 'Entendi');
          return;
        }
        var msg = 'Excluir a tarifa\n' + oficialLabel(row) + '?';
        if (nomes.length) {
          msg += '\n\n' + nomes.length + (nomes.length === 1 ? ' passeio usa' : ' passeios usam') + ' esta tarifa e ' + (nomes.length === 1 ? 'passa' : 'passam') + ' para ' + oficialLabel(acima) + ', a excursão imediatamente acima.\n\n' + nomes.join('\n');
        }
        confirmar(msg, 'Excluir').then(function (ok) {
          if (!ok) return;
          request('PUT', { action: 'tarifa_excluir', codigo: codigo }, function (res) {
            if (!res.ok) { toast(res.error || 'Não excluiu', true); return; }
            var n = res.data && res.data.moved;
            apply(res, n ? (n + (n === 1 ? ' passeio passou' : ' passeios passaram') + ' para ' + res.data.para_nome + '.') : 'Tarifa excluída');
          });
        });
      };
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
      (st.data.atrativos || []).filter(function (a) { return !t || a.tarifario_id !== t.id; }).map(function (a) {
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
          '<label class="tf-field tf-field--sm"><span>Quórum desta tarifa</span><div class="tf-suffix"><input class="gcv-dash-input" id="tf-quorum" inputmode="numeric" value="' + esc(t ? t.quorum : regrasAtuais().quorum) + '" /><em>pessoas</em></div></label>' +
        '</div>' +
        '<p class="gcv-cms-muted tf-small">O quórum novo começa no valor global. No privativo sem translado, de 1 pessoa até este quórum, o cliente paga o quórum × PAX 4- Excursão. O azul ao lado do campo é essa diária, ou o veículo cheio (4 × o valor com translado).</p>' +
        '<div class="tf-table-wrap"><table class="tf-table">' +
          '<thead><tr><th scope="col">Saindo de</th>' + CAMPOS.map(function (c) {
            return '<th scope="col">' + esc(c[1]) + '<small>' + esc(c[2]) + '</small></th>';
          }).join('') + '</tr></thead><tbody>' +
          Object.keys(CIDADE_CURTA).map(function (k) {
            var row = cidades[k] || {};
            return '<tr><th scope="row">' + esc(st.data.cidades && st.data.cidades[k] || CIDADE_CURTA[k]) + '</th>' + CAMPOS.map(function (c) {
              var lado = c[0] === 'excursao_pessoa_cents' || c[0] === 'exclusivo_pessoa_cents' || c[0] === 'excursao_transporte_cents' || c[0] === 'exclusivo_transporte_cents';
              return '<td><div class="tf-cell"><label class="tf-money"><em>R$</em><input inputmode="decimal" data-price="' + k + ':' + c[0] + '" value="' + esc(moneyInput(row[c[0]])) + '" aria-label="' + esc(CIDADE_CURTA[k] + ' ' + c[1] + ' ' + c[2]) + '" /></label>' +
                (lado ? '<span class="tf-side" data-side="' + k + ':' + c[0] + '"></span>' : '') +
                '</div></td>';
            }).join('') + '</tr>';
          }).join('') +
        '</tbody></table></div>' +
        '<div class="tf-editor__tools"><button type="button" class="gcv-dash-btn gcv-dash-btn--secondary gcv-dash-btn--sm" id="tf-copy">Copiar Alto Paraíso para as outras cidades</button>' +
        '<span class="gcv-cms-muted tf-small">PAX 5+ tem que ser preenchido e menor que o PAX 4- do mesmo tipo. Excursão menor que privativo. Campo vazio no translado = não vende essa opção.</span></div>' +
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

    function refreshLados() {
      var q = parseInt($('tf-quorum').value, 10);
      if (!(q >= 1 && q <= 20)) q = regrasAtuais().quorum;
      Object.keys(CIDADE_CURTA).forEach(function (city) {
        function cents(campo) {
          var input = body.querySelector('[data-price="' + city + ':' + campo + '"]');
          return toCents(input && input.value);
        }
        function set(campo, text) {
          var el = body.querySelector('[data-side="' + city + ':' + campo + '"]');
          if (el) el.textContent = text;
        }
        var exc = cents('excursao_pessoa_cents');
        set('excursao_pessoa_cents', exc > 0 ? 'Diária ' + reais(q * exc) : '');
        set('exclusivo_pessoa_cents', exc > 0 ? 'Diária ' + reais(q * exc) : '');
        var excT = cents('excursao_transporte_cents');
        var priT = cents('exclusivo_transporte_cents');
        set('excursao_transporte_cents', excT > 0 ? 'Veículo ' + reais(VEICULO * excT) : '');
        set('exclusivo_transporte_cents', priT > 0 ? 'Veículo ' + reais(VEICULO * priT) : '');
      });
    }
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
      refreshLados();
    };
    body.addEventListener('input', function (ev) {
      var alvo = ev.target;
      if (!alvo || !alvo.getAttribute) return;
      if (alvo.id === 'tf-quorum' || alvo.getAttribute('data-price')) refreshLados();
    });
    refreshLados();
    $('tf-save').onclick = function () {
      var payload = { nome: $('tf-nome').value.trim(), quorum: parseInt($('tf-quorum').value, 10) || regrasAtuais().quorum, cidades: {} };
      if (!payload.nome) { toast('Dê um nome ao tarifário.', true); $('tf-nome').focus(); return; }
      if (payload.quorum < 1 || payload.quorum > 20) { toast('O quórum fica entre 1 e 20 pessoas.', true); return; }
      body.querySelectorAll('[data-price]').forEach(function (input) {
        var parts = input.getAttribute('data-price').split(':');
        payload.cidades[parts[0]] = payload.cidades[parts[0]] || {};
        payload.cidades[parts[0]][parts[1]] = toCents(input.value);
      });
      var diariaCents = regrasAtuais().diariaReais * 100;
      var cidadesOrdem = Object.keys(CIDADE_CURTA);
      for (var ci = 0; ci < cidadesOrdem.length; ci++) {
        var cidade = cidadesOrdem[ci];
        var linha = payload.cidades[cidade] || {};
        var msg = erroGuia(linha.excursao_pessoa_cents || 0, linha.excursao_pessoa_5_cents || 0, linha.exclusivo_pessoa_cents || 0, linha.exclusivo_pessoa_5_cents || 0, payload.quorum, diariaCents)
          || erroTranslado(linha.excursao_transporte_cents || 0, linha.exclusivo_transporte_cents || 0);
        if (msg) { toast(CIDADE_CURTA[cidade] + ': ' + msg, true); return; }
      }
      if (t) {
        payload.id = t.id;
        payload.bilingue_tipo = t.bilingue_tipo || 'fixo';
        payload.bilingue_valor = t.bilingue_tipo === 'percentual' ? (parseInt(t.bilingue_valor, 10) || 0) : (t.bilingue_cents != null ? t.bilingue_cents : 4000);
        payload.bilingue_cents = payload.bilingue_tipo === 'percentual' ? 0 : payload.bilingue_valor;
      }
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
    st.passeioId = 0;
    st.relacaoId = 0;
    if (mode === 'passeios') {
      st.relacaoId = relacaoIdFromHash();
      st.passeioId = st.relacaoId ? 0 : passeioIdFromHash();
    }
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

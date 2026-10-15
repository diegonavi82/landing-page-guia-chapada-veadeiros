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
    ['excursao_pessoa_cents', 'PAX 4 Excursão', 'sem translado'],
    ['excursao_pessoa_5_cents', 'PAX 5+ Excursão', 'sem translado'],
    ['excursao_transporte_cents', 'Excursão', 'com translado'],
    ['exclusivo_pessoa_cents', 'PAX 4 Privativo', 'sem translado'],
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
    filters: { passeio: '', tarifa_guia: '', tarifa_translado: '' },
    tarifaSaveSeq: {}
  };

  var PASSEIO_COLS = [
    ['passeio', 'Passeio'],
    ['tarifa_guia', 'Tarifa Guia'],
    ['tarifa_translado', 'Tarifa Translado']
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
    if (exc4 > 0 && pri4 > 0 && exc4 >= pri4) return 'PAX 4 Excursão tem que ser menor que o PAX 4 Privativo.';
    if (exc4 > 0 && (exc5 <= 0 || exc5 >= exc4)) return 'PAX 5+ Excursão tem que ser menor que o PAX 4 Excursão.';
    if (pri4 > 0 && (pri5 <= 0 || pri5 >= pri4)) return 'PAX 5+ Privativo tem que ser menor que o PAX 4 Privativo.';
    if (exc5 > 0 && pri5 > 0 && exc5 >= pri5) return 'PAX 5+ Excursão tem que ser menor que o PAX 5+ Privativo.';
    if (exc4 > 0 && diariaCents > 0 && exc4 * quorum < diariaCents) {
      return 'PAX 4 Excursão × quórum ' + quorum + ' = ' + reais(exc4 * quorum) + ' fica abaixo da diária mínima de guiagem (' + reais(diariaCents) + ').';
    }
    return '';
  }

  function diariaDoGuia(excCents) {
    var reg = regrasAtuais();
    var total = reg.quorum * (parseInt(excCents, 10) || 0);
    var piso = reg.diariaReais * 100;
    return {
      total: total,
      piso: piso,
      abaixo: total > 0 && piso > 0 && total < piso
    };
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
    var col = tipo === 'guia' ? 'tarifa_guia' : 'tarifa_translado';
    var out = [];
    (st.data.atrativos || []).forEach(function (a) {
      if (String(a.title_pt || '').indexOf(' + ') >= 0) return;
      var colAtrativo = tipo === 'guia' ? 'tarifa_guia' : 'tarifa_translado';
      var mostrouCidade = false;
      saidasDe(a).forEach(function (s) {
        if (!s.key || (s[campo] || '') !== codigo) return;
        mostrouCidade = true;
        out.push({ kind: 'atrativo', id: a.id, nome: a.title_pt, cidade: s.key, cidadeNome: s.nome || '' });
      });
      if (!mostrouCidade && (a[colAtrativo] || '') === codigo) {
        out.push({ kind: 'atrativo', id: a.id, nome: a.title_pt, cidade: '', cidadeNome: '' });
      }
    });
    (st.data.passeios || []).forEach(function (p) {
      if ((p.attractions || []).length < 2) return;
      if ((p[col] || '') !== codigo) return;
      out.push({ kind: 'passeio', id: p.id, nome: passeioNome(p), cidade: '', cidadeNome: '' });
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
    return nomeTarifaTranslado(item.excursao, item.privativo);
  }

  function opcoesOficiais(tipo) {
    return oficiaisDo(tipo).slice();
  }

  function pisoExcursaoPasseio(p) {
    var maior = 0;
    (p.attractions || []).forEach(function (parte) {
      var a = attrById(parte.id) || parte;
      var saidas = a.saidas_tarifas || [];
      var teve = false;
      saidas.forEach(function (s) {
        if (!s || !s.guia) return;
        teve = true;
        var item = oficialItem('guia', s.guia);
        var n = item ? Math.round(Number(item.excursao) || 0) : 0;
        if (n > maior) maior = n;
      });
      if (!teve && a.tarifa_guia) {
        var direto = oficialItem('guia', a.tarifa_guia);
        var n2 = direto ? Math.round(Number(direto.excursao) || 0) : 0;
        if (n2 > maior) maior = n2;
      }
    });
    return maior;
  }

  function tarifaDashSelect(tipo, current, piso) {
    var rows = opcoesOficiais(tipo).filter(function (row) {
      if (tipo !== 'guia' || !(piso > 0) || row.codigo === current) return true;
      return Math.round(Number(row.excursao) || 0) > piso;
    });
    var vazio = tipo === 'guia' ? 'Sem tarifa' : 'sem translado';
    var rotulo = tipo === 'guia' ? 'Tarifa Guia' : 'Tarifa Translado';
    return '<select class="ps-tarifa-select' + (tipo === 'translado' ? ' ps-tarifa-select--trans' : '') + (current ? '' : ' is-empty') + '" data-tarifa-tipo="' + tipo + '" data-atual="' + esc(current || '') + '" aria-label="' + rotulo + '" title="Clique para escolher a ' + rotulo + '">' +
      '<option value="">' + vazio + '</option>' +
      rows.map(function (row) {
        return '<option value="' + esc(row.codigo) + '"' + (row.codigo === current ? ' selected' : '') + '>' + esc(oficialLabel(row)) + '</option>';
      }).join('') +
      '</select>';
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
      '<div id="tf-body"></div>' +
      '<div class="tf-toast" id="tf-toast" role="status" aria-live="polite"></div>';
    paintBody();
  }

  function paintBody() {
    if (st.editing) return paintEditor();
    if (st.mode === 'passeios') return paintPasseiosTable();
    return paintTarifarios();
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
    return 'EXC' + exc + 'T / PRI' + (pri * VEICULO) + 'T';
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

  function catsRotulo(lista) {
    var nomes = st.data.categorias || { classicos: 'Clássicos', destaque: 'Destaque', 'lado-b': 'Lado B', familia: 'Família', aventura: 'Aventura' };
    var texto = (lista || []).map(function (k) { return nomes[k] || k; }).filter(Boolean).join(', ');
    return texto || 'Clássicos';
  }

  function codigoAtual(item, tipo) {
    var col = tipo === 'guia' ? 'tarifa_guia' : 'tarifa_translado';
    var campo = tipo === 'guia' ? 'guia' : 'translado';
    var direto = String((item && item[col]) || '').trim();
    if (direto) return direto;
    var saidas = saidasDe(item);
    for (var i = 0; i < saidas.length; i++) {
      var cod = String((saidas[i] && saidas[i][campo]) || '').trim();
      if (cod) return cod;
    }
    return '';
  }

  function linhaPasseio(item, kind) {
    var n = kind === 'relacao' ? (item.attractions || []).length : 1;
    var guiaCodigo = codigoAtual(item, 'guia');
    var transCodigo = codigoAtual(item, 'translado');
    var guiaOf = oficialItem('guia', guiaCodigo);
    var transOf = oficialItem('translado', transCodigo);
    return {
      id: item.id,
      kind: kind,
      atrativos: n,
      passeio: kind === 'relacao' ? passeioNome(item) : (item.title_pt || ''),
      tarifa_guia: guiaOf ? oficialLabel(guiaOf) : tarifaSemTranslado(item),
      tarifa_translado: transOf ? oficialLabel(transOf) : tarifaComTranslado(item),
      guiaCodigo: guiaOf ? guiaCodigo : '',
      transCodigo: transOf ? transCodigo : '',
      piso: kind === 'relacao' ? pisoExcursaoPasseio(item) : 0
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
          }).join('') + '</tr>' +
          '<tr class="ps-filters">' + PASSEIO_COLS.map(function (c) {
            return '<th><input class="gcv-dash-input ps-filter" data-filter="' + c[0] + '" value="' + esc(st.filters[c[0]] || '') + '" aria-label="Filtrar ' + esc(c[1]) + '" placeholder="Filtrar" /></th>';
          }).join('') + '</tr></thead>' +
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
      tbody.innerHTML = '<tr><td class="ps-empty" colspan="3">Nenhum passeio com esses filtros.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      var chip = r.atrativos > 1 ? '<span class="ps-multi">' + r.atrativos + ' atrativos</span>' : '';
      return '<tr class="' + (r.atrativos > 1 ? 'ps-row--multi' : '') + '" data-kind="' + r.kind + '" data-id="' + r.id + '">' +
        '<td class="ps-passeio"><span class="ps-name">' + esc(r.passeio) + '</span>' + chip + '</td>' +
        '<td>' + tarifaDashSelect('guia', r.guiaCodigo, r.piso) + '</td>' +
        '<td>' + tarifaDashSelect('translado', r.transCodigo, 0) + '</td>' +
      '</tr>';
    }).join('');
    tbody.querySelectorAll('[data-tarifa-tipo]').forEach(function (sel) {
      sel.onchange = function () { salvarTarifaLinha(sel); };
    });
  }

  function salvarTarifaLinha(sel) {
    var tr = sel.closest('tr');
    if (!tr) return;
    var guia = tr.querySelector('[data-tarifa-tipo="guia"]');
    var trans = tr.querySelector('[data-tarifa-tipo="translado"]');
    var payload = {
      action: 'oficiais',
      tarifa_guia: guia ? guia.value : '',
      tarifa_translado: trans ? trans.value : ''
    };
    if (tr.getAttribute('data-kind') === 'relacao') payload.passeio_id = parseInt(tr.getAttribute('data-id'), 10);
    else payload.attraction_id = parseInt(tr.getAttribute('data-id'), 10);
    var anterior = sel.getAttribute('data-atual') || '';
    var escolhida = sel.value;
    sel.disabled = true;
    request('PUT', payload, function (res) {
      if (!res.ok) {
        sel.disabled = false;
        sel.value = anterior;
        sel.classList.toggle('is-empty', !anterior);
        toast(res.error || 'Não salvou', true);
        return;
      }
      st.data = res.data;
      fillPasseioRows();
      toast(escolhida ? 'Tarifa atualizada.' : 'Tarifa tirada.');
    });
  }

  /* ---------- aba: tarifários ---------- */
  function paintTarifarios() {
    var body = $('tf-body');
    var bi = bilingueOf({ bilingue_tipo: (st.data.bilingue || {}).tipo, bilingue_valor: (st.data.bilingue || {}).valor, bilingue_cents: (st.data.bilingue || {}).cents });
    function campoNova(attr, label, total) {
      var side = '';
      if (total === 'diaria') side = '<span class="tf-side" data-nova-side="' + attr + '">Diária <b class="tf-side__val">R$ 0</b></span>';
      if (total === 'translado') side = '<span class="tf-side tf-side--abaixo" data-nova-side="' + attr + '">Veículo <b class="tf-side__val">R$ 0</b></span>';
      return '<label class="tf-field"><span>' + label + '</span><span class="tf-money"><em>R$</em><input inputmode="decimal" ' + attr + ' aria-label="' + label + '" /></span>' + side + '</label>';
    }
    function refreshNova(form) {
      var tipo = form.getAttribute('data-nova');
      var exc = toCents((form.querySelector('[data-nova-exc]') || {}).value);
      var pri = toCents((form.querySelector('[data-nova-pri]') || {}).value);
      function set(attr, valor, baixo) {
        var side = form.querySelector('[data-nova-side="' + attr + '"]');
        if (!side) return;
        var val = side.querySelector('.tf-side__val');
        if (val) val.textContent = valor;
        side.classList.toggle('is-baixo', !!baixo);
      }
      if (tipo === 'guia') {
        var diaExc = diariaDoGuia(exc);
        var diaPri = diariaDoGuia(pri);
        set('data-nova-exc', reais(diaExc.total), diaExc.abaixo);
        set('data-nova-pri', reais(diaPri.total), false);
      } else {
        set('data-nova-exc', reais(VEICULO * exc), false);
        set('data-nova-pri', reais(VEICULO * pri), false);
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
      var campo = tipo === 'guia' ? 'guia' : 'translado';
      var col = tipo === 'guia' ? 'tarifa_guia' : 'tarifa_translado';
      function livre(valor) { return !String(valor || '').trim(); }
      var opcoesCidades = '';
      var opcoesPasseios = '';
      (st.data.atrativos || []).forEach(function (a) {
        if (String(a.title_pt || '').indexOf(' + ') >= 0) return;
        var cidades = saidasDe(a).filter(function (s) { return s && s.key; });
        if (!cidades.length) {
          if (!livre(a[col])) return;
          if (st.q && !matches(a.title_pt) && !matches(oficialLabel(row))) return;
          opcoesCidades += '<option value="atrativo:' + a.id + ':">' + esc(a.title_pt) + '</option>';
          return;
        }
        cidades.forEach(function (s) {
          if (!livre(s[campo])) return;
          var rotulo = a.title_pt + ' - ' + (s.nome || s.key);
          if (st.q && !matches(rotulo) && !matches(oficialLabel(row))) return;
          opcoesCidades += '<option value="atrativo:' + a.id + ':' + esc(s.key) + '">' + esc(rotulo) + '</option>';
        });
      });
      (st.data.passeios || []).forEach(function (p) {
        if ((p.attractions || []).length < 2) return;
        var saidas = saidasDe(p).filter(function (s) { return s && s.key; });
        var ocupado = !livre(p[col]) || saidas.some(function (s) { return !livre(s[campo]); });
        if (ocupado) return;
        var rotulo = passeioNome(p);
        if (st.q && !matches(rotulo) && !matches(oficialLabel(row))) return;
        opcoesPasseios += '<option value="passeio:' + p.id + ':">' + esc(rotulo) + '</option>';
      });
      return '<div class="tf-exps"><span>Onde vale</span><div class="tf-card__use">' +
        (chips || '<span class="gcv-cms-muted tf-small">Nenhuma experiência nem passeio relacionado.</span>') +
        '</div><select class="gcv-dash-select tf-use-add" data-add-exp="' + esc(row.codigo) + '" data-tipo="' + tipo + '" aria-label="Associar tarifa">' +
        '<option value="">Associar à cidade ou ao passeio relacionado…</option>' +
        (opcoesCidades ? '<optgroup label="Cidades de embarque da experiência">' + opcoesCidades + '</optgroup>' : '') +
        (opcoesPasseios ? '<optgroup label="Passeios relacionados">' + opcoesPasseios + '</optgroup>' : '') +
        '</select></div>';
    }
    function lista(tipo, titulo) {
      var guia = tipo === 'guia';
      var todas = oficiaisDo(tipo);
      var visiveis = todas.filter(function (row) { return cardCombina(tipo, row); });
      var cards = visiveis.map(function (row) {
          var paxEdit = guia
            ? campoCard('data-exc', 'PAX 4 Excursão', row.excursao_cents, 'diaria') +
              campoCard('data-pri', 'PAX 4 Privativo', row.privativo_cents, 'diaria') +
              campoCard('data-exc5', 'PAX 5+ Excursão', row.excursao_5_cents) +
              campoCard('data-pri5', 'PAX 5+ Privativo', row.privativo_5_cents)
            : campoCard('data-exc', 'Excursão', row.excursao_cents, 'translado') + campoCard('data-pri', 'Privativo', row.privativo_cents, 'translado');
          return '<article class="tf-oficial__item" data-edit-tarifa="' + esc(row.codigo) + '" data-tipo="' + tipo + '">' +
            '<button type="button" class="tf-oficial__del" data-del-oficial="' + esc(row.codigo) + '" aria-label="Excluir" title="Excluir">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>' +
            '</button>' +
            '<b>' + esc(oficialLabel(row)) + '</b>' +
            '<div class="tf-card-edit">' + paxEdit + '</div>' +
            experienciasHtml(tipo, row) +
            '</article>';
      }).join('');
      return '<section class="tf-oficial"><h3>' + titulo + '</h3>' +
        '<form class="tf-oficial__new" data-nova="' + tipo + '">' +
          (guia
            ? campoNova('data-nova-exc', 'PAX 4 Excursão', 'diaria') + campoNova('data-nova-pri', 'PAX 4 Privativo', 'diaria') + campoNova('data-nova-exc5', 'PAX 5+ Excursão') + campoNova('data-nova-pri5', 'PAX 5+ Privativo')
            : campoNova('data-nova-exc', 'Excursão', 'translado') + campoNova('data-nova-pri', 'Privativo', 'translado')) +
          '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm">Criar tarifa</button>' +
        '</form>' +
        '<div class="tf-oficial__list' + (guia ? ' tf-oficial__list--guia' : '') + '">' +
        (cards || (todas.length ? '<p class="gcv-cms-muted tf-small">Nenhuma tarifa com esse filtro.</p>' : '')) +
        '</div></section>';
    }
    function campoCard(attr, label, cents, total) {
      var side = '';
      if (total === 'diaria') side = '<span class="tf-side" data-side="diaria">Diária <b class="tf-side__val">' + esc(reais(regrasAtuais().quorum * (parseInt(cents, 10) || 0))) + '</b></span>';
      if (total === 'translado') side = '<span class="tf-side tf-side--abaixo" data-side="translado">Veículo <b class="tf-side__val">' + esc(reais(VEICULO * cents)) + '</b></span>';
      return '<label class="tf-field"><span>' + label + '</span><span class="tf-money"><em>R$</em><input inputmode="decimal" ' + attr + ' value="' + esc(moneyInput(cents)) + '" aria-label="' + label + '" /></span>' + side + '</label>';
    }
    body.innerHTML =
      '<div class="tf-regras-row">' +
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
      '<section class="tf-oficial tf-oficial--bi tf-oficial--diaria">' +
        '<h3>Diária mínima de guiagem</h3>' +
        '<div class="tf-bi">' +
          '<label class="tf-field"><span>Diária mínima de guiagem</span><span class="tf-money"><em>R$</em><input inputmode="decimal" id="tf-diaria" value="' + esc(String(regrasAtuais().diariaReais)) + '" aria-label="Diária mínima de guiagem" /></span></label>' +
          '<label class="tf-field"><span>Pagamento mínimo de guiagem</span><span class="tf-money"><em>R$</em><input inputmode="decimal" id="tf-pagamento" value="' + esc(String(regrasAtuais().pagamentoReais)) + '" aria-label="Pagamento mínimo de guiagem" /></span></label>' +
          '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" id="tf-regras-save">Salvar</button>' +
        '</div>' +
      '</section></div>' +
      lista('guia', 'Tarifa Guia') +
      lista('translado', 'Tarifa Translado');
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
      var excNova = form.querySelector('[data-nova-exc]');
      if (excNova && form.getAttribute('data-nova') === 'guia') {
        excNova.addEventListener('change', function () {
          var dia = diariaDoGuia(toCents(excNova.value));
          if (!dia.abaixo) return;
          excNova.value = '';
          refreshNova(form);
          toast('PAX 4 Excursão × quórum dá ' + reais(dia.total) + ', abaixo da diária mínima de ' + reais(dia.piso) + '.', true);
        });
      }
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
    function centsDo(box, attr) {
      return toCents((box.querySelector('[' + attr + ']') || {}).value);
    }
    function atualizarCard(box) {
      var tipo = box.getAttribute('data-tipo') === 'guia' ? 'guia' : 'translado';
      var exc = centsDo(box, 'data-exc');
      var pri = centsDo(box, 'data-pri');
      var exc5 = centsDo(box, 'data-exc5');
      var pri5 = centsDo(box, 'data-pri5');
      var titulo = box.querySelector('b');
      function pintarTotal(inputAttr, texto, baixo) {
        var input = box.querySelector('[' + inputAttr + ']');
        var field = input && input.closest ? input.closest('.tf-field') : null;
        var side = field ? field.querySelector('.tf-side') : null;
        if (!side) return;
        var val = side.querySelector('.tf-side__val');
        if (val) val.textContent = texto;
        side.classList.toggle('is-baixo', !!baixo);
      }
      if (tipo === 'guia') {
        var diaExcCard = diariaDoGuia(exc);
        var diaPriCard = diariaDoGuia(pri);
        pintarTotal('data-exc', reais(diaExcCard.total), diaExcCard.abaixo);
        pintarTotal('data-pri', reais(diaPriCard.total), false);
        var nome = nomeTarifaGuia(exc / 100, exc5 / 100, pri / 100, pri5 / 100);
        if (titulo && nome) titulo.textContent = nome;
      } else {
        pintarTotal('data-exc', reais(VEICULO * exc), false);
        pintarTotal('data-pri', reais(VEICULO * pri), false);
        var nomeTrans = nomeTarifaTranslado(exc / 100, pri / 100);
        if (titulo && nomeTrans) titulo.textContent = nomeTrans;
      }
    }
    function focoTarifa() {
      var el = document.activeElement;
      if (!el || !el.closest) return null;
      var box = el.closest('[data-edit-tarifa]');
      if (!box) return null;
      var attrs = ['data-exc', 'data-pri', 'data-exc5', 'data-pri5'];
      var attr = '';
      for (var i = 0; i < attrs.length; i++) {
        if (el.hasAttribute(attrs[i])) { attr = attrs[i]; break; }
      }
      if (!attr) return null;
      return {
        codigo: box.getAttribute('data-edit-tarifa') || '',
        attr: attr,
        value: el.value,
        start: el.selectionStart,
        end: el.selectionEnd
      };
    }
    function restaurarFoco(foco) {
      if (!foco || !foco.codigo) return;
      var boxes = document.querySelectorAll('[data-edit-tarifa]');
      var box = null;
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].getAttribute('data-edit-tarifa') === foco.codigo) { box = boxes[i]; break; }
      }
      if (!box) return;
      var el = box.querySelector('[' + foco.attr + ']');
      if (!el) return;
      el.value = foco.value;
      el.focus();
      if (el.setSelectionRange && foco.start != null) {
        try { el.setSelectionRange(foco.start, foco.end); } catch (e) { /* input numérico */ }
      }
      atualizarCard(box);
    }
    function salvarCard(box) {
      var codigo = box.getAttribute('data-edit-tarifa') || '';
      var row = ((st.data && st.data.tarifas_oficiais) || []).filter(function (r) { return r.codigo === codigo; })[0];
      if (!row) return;
      var exc = centsDo(box, 'data-exc') / 100;
      var pri = centsDo(box, 'data-pri') / 100;
      var exc5 = centsDo(box, 'data-exc5') / 100;
      var pri5 = centsDo(box, 'data-pri5') / 100;
      if (exc === row.excursao && pri === row.privativo && exc5 === (row.excursao_5 || 0) && pri5 === (row.privativo_5 || 0)) return;
      if (!exc || !pri || (row.tipo === 'guia' && (!exc5 || !pri5))) { toast('Preencha todos os valores da tarifa.', true); return; }
      var reg = regrasAtuais();
      var erro = row.tipo === 'guia'
        ? erroGuia(exc * 100, exc5 * 100, pri * 100, pri5 * 100, reg.quorum, reg.diariaReais * 100)
        : erroTranslado(exc * 100, pri * 100);
      if (erro) {
        toast(erro, true);
        if (row.tipo === 'guia' && diariaDoGuia(exc * 100).abaixo) {
          var campoExc = box.querySelector('[data-exc]');
          if (campoExc) campoExc.value = moneyInput(row.excursao_cents);
          atualizarCard(box);
        }
        return;
      }
      var seq = (st.tarifaSaveSeq[codigo] || 0) + 1;
      st.tarifaSaveSeq[codigo] = seq;
      request('PUT', { action: 'tarifa_editar', codigo: codigo, excursao: exc, privativo: pri, excursao_5: exc5, privativo_5: pri5 }, function (res) {
        if (st.tarifaSaveSeq[codigo] !== seq) return;
        var foco = focoTarifa();
        if (!apply(res, 'Tarifa salva')) return;
        restaurarFoco(foco);
      });
    }
    body.querySelectorAll('[data-edit-tarifa] input').forEach(function (input) {
      input.addEventListener('input', function () {
        var box = input.closest('[data-edit-tarifa]');
        if (box) atualizarCard(box);
      });
      input.addEventListener('change', function () {
        var box = input.closest('[data-edit-tarifa]');
        if (box) salvarCard(box);
      });
      input.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        input.blur();
      });
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
        '<p class="gcv-cms-muted tf-small">O quórum novo começa no valor global. No privativo sem translado, de 1 pessoa até este quórum, o cliente paga o quórum × PAX 4 Excursão. O azul embaixo de cada campo PAX 4 é o quórum × o valor daquele campo. No translado, é o veículo cheio (4 × o valor).</p>' +
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
        '<span class="gcv-cms-muted tf-small">PAX 5+ tem que ser preenchido e menor que o PAX 4 do mesmo tipo. Excursão menor que privativo. Campo vazio no translado = não vende essa opção.</span></div>' +
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
        var pri = cents('exclusivo_pessoa_cents');
        set('excursao_pessoa_cents', 'Diária ' + reais(q * exc));
        set('exclusivo_pessoa_cents', 'Diária ' + reais(q * pri));
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
      var h = String(location.hash || '');
      if (h.indexOf('#passeio/') === 0 || h.indexOf('#relacao/') === 0) {
        try { history.replaceState(null, '', location.pathname + location.search + '#passeios'); } catch (err) {}
      }
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

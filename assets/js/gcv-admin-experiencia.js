/* Ficha da experiência: abas, campos atuais e os novos combinados. */
(function (global) {
  'use strict';

  var SAIDAS = [
    { key: 'alto-paraiso', nome: 'Alto Paraíso de Goiás' },
    { key: 'sao-jorge', nome: 'São Jorge' },
    { key: 'cavalcante', nome: 'Cavalcante' }
  ];
  var CIDADES = [
    'Alto Paraíso de Goiás',
    'São Jorge',
    'Cavalcante',
    'Teresina de Goiás',
    "São João d'Aliança"
  ];
  var DIAS = [
    ['seg', 'Segunda-feira'],
    ['ter', 'Terça-feira'],
    ['qua', 'Quarta-feira'],
    ['qui', 'Quinta-feira'],
    ['sex', 'Sexta-feira'],
    ['sab', 'Sábado'],
    ['dom', 'Domingo']
  ];
  var MESES = [
    ['jan', 'Jan'], ['fev', 'Fev'], ['mar', 'Mar'], ['abr', 'Abr'],
    ['mai', 'Mai'], ['jun', 'Jun'], ['jul', 'Jul'], ['ago', 'Ago'],
    ['set', 'Set'], ['out', 'Out'], ['nov', 'Nov'], ['dez', 'Dez']
  ];
  var SECA = ['abr', 'mai', 'jun', 'jul', 'ago', 'set'];
  var CHUVA = ['out', 'nov', 'dez', 'jan', 'fev', 'mar'];
  var DIFICULDADES = [
    ['leve', 'Leve'],
    ['facil', 'Fácil'],
    ['moderado', 'Moderado'],
    ['dificil', 'Difícil'],
    ['desafiador', 'Desafiador']
  ];
  var PLANOS = [
    ['sem_custo', 'Sem custo', '0%. A entrada não aparece como opção de venda.'],
    ['padrao', 'Padrão', '8%. Pode entrar no checkout quando o extra estiver ligado.'],
    ['premium', 'Premium', '15%. Mais destaque, sugestão de passeio e prioridade.']
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function paginaCodigoHtml(a) {
    var slug = a && a.slug ? String(a.slug) : '';
    var page = a && a.page ? String(a.page) : '';
    var arquivo = page || (slug ? 'atrativos/' + slug + '.html' : '');
    if (!arquivo) {
      return '<p class="xp-note">Esta experiência ainda não tem código de página. O arquivo nasce em atrativos/ com o slug.</p>';
    }
    var abrir = page
      ? ' <a href="/' + esc(page) + '" target="_blank" rel="noopener">Abrir a página</a>'
      : '';
    var falta = page
      ? ''
      : ' O arquivo ainda não existe no projeto. Passeio com mais de um atrativo não ganha página própria: cada atrativo tem o HTML dele.';
    return (
      '<p class="xp-note"><strong>Código da página:</strong> ' + esc(arquivo) + '.' + abrir + falta +
      ' A descrição é o texto do meio da página. O texto lateral fica no bloco abaixo. Salvar grava esse texto na página.</p>'
    );
  }

  function obj(v) {
    if (!v) return {};
    if (typeof v === 'string') {
      try { return JSON.parse(v) || {}; } catch (e) { return {}; }
    }
    return typeof v === 'object' ? v : {};
  }

  function chaveCidade(nome) {
    var n = String(nome || '').trim().toLowerCase();
    if (n.normalize) n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var known = {
      'alto paraiso de goias': 'alto-paraiso',
      'alto paraiso': 'alto-paraiso',
      'sao jorge': 'sao-jorge',
      'cavalcante': 'cavalcante'
    };
    if (known[n]) return known[n];
    return n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cidade';
  }

  function cidadePeloSlug(slug) {
    slug = String(slug || '');
    if (slug.indexOf('sao-jorge') >= 0) return 'São Jorge';
    if (slug.indexOf('cavalcante') >= 0) return 'Cavalcante';
    if (slug.indexOf('teresina') >= 0) return 'Teresina de Goiás';
    if (slug.indexOf('sao-joao') >= 0) return "São João d'Aliança";
    if (slug.indexOf('alto-paraiso') >= 0) return 'Alto Paraíso de Goiás';
    return '';
  }

  function duracaoDe(a) {
    if (a.duracao && typeof a.duracao === 'object') return a.duracao;
    if (a.duracao_cidades && typeof a.duracao_cidades === 'object') return a.duracao_cidades;
    if (typeof a.duracao_json === 'string' && a.duracao_json) return obj(a.duracao_json);
    return {};
  }

  function horasDe(total) {
    var n = parseInt(total, 10) || 0;
    if (n <= 0) return '';
    var h = Math.round(n / 60);
    return String(h > 0 ? h : 1);
  }

  function rotuloTarifa(item) {
    var cod = String(item.codigo || '').toUpperCase();
    if (item.tipo === 'guia') {
      var exc = item.excursao_5 > 0 ? item.excursao + ' (' + item.excursao_5 + ')' : String(item.excursao);
      var pri = item.privativo_5 > 0 ? item.privativo + ' (' + item.privativo_5 + ')' : String(item.privativo);
      return cod + ' · excursão ' + exc + ' / privativo ' + pri;
    }
    return cod + ' · excursão ' + item.excursao + ' / privativo ' + item.privativo;
  }

  function ingressoInicial(a, x) {
    if (Array.isArray(x.ingressos) && x.ingressos.length) return x.ingressos.map(function (row) { return Object.assign({}, row); });
    var label = String((a && a.entry_price_label) || '');
    var cents = a && a.entry_price_cents;
    var preco = '';
    if (cents != null && cents !== '') preco = String(Math.round(Number(cents) / 100));
    else {
      var m = label.match(/(\d+(?:[.,]\d+)?)/);
      if (m) preco = m[1].replace(',', '.');
    }
    var nome = label && !/^r\$\s*\d/i.test(label.trim()) ? label : '';
    if (!nome && !preco && (cents == null || cents === '')) return [];
    return [{
      nome: nome,
      preco: preco,
      moeda: 'BRL',
      qtd: '',
      gratis: cents === 0 || cents === '0',
      validade: 'sempre',
      inicio: '',
      fim: ''
    }];
  }

  function mount(form, a, api) {
    a = a || {};
    var x = obj(a.experiencia);
    var log = obj(x.logistica);
    var diff = obj(log.diff);
    var horario = obj(x.horario);
    var embarques = obj(x.embarques);
    var duracao = duracaoDe(a);
    var principal = x.principal || 'alto-paraiso';
    var cidade = x.cidade || cidadePeloSlug(a.slug);
    var tags = Array.isArray(x.tags) ? x.tags.slice() : [];
    var ingressos = ingressoInicial(a, x);
    var gallery = Array.isArray(a.gallery) ? a.gallery.map(function (item) { return Object.assign({}, item); }) : [];
    if (!gallery.length && a.cover_url) gallery = [{ url: a.cover_url, alt_text: '' }];
    var mesesTocados = Array.isArray(log.meses) && log.meses.length > 0;

    function campo(id, valor) {
      return esc(valor == null ? '' : valor);
    }

    function langInputs(prefix, valores, kind) {
      var tag = kind === 'area' ? 'textarea' : 'input';
      var valor = campo(prefix, valores.pt);
        if (tag === 'textarea') {
        return '<' + tag + ' class="gcv-dash-input" id="' + prefix + '-pt" rows="8">' + valor + '</' + tag + '>';
        }
      return '<' + tag + ' class="gcv-dash-input" id="' + prefix + '-pt" value="' + valor + '" />';
    }

    function minutosIniciais(key) {
      var salvo = embarques[key] || {};
      if (salvo.minutos) return salvo.minutos;
      if (duracao[key]) return duracao[key];
      if (key === 'alto-paraiso' && a.duration_minutes) return a.duration_minutes;
      return '';
    }

    function kmInicial(key) {
      var salvo = embarques[key] || {};
      if (salvo.km != null && salvo.km !== '') return salvo.km;
      if (key === principal && a.distance_km) return a.distance_km;
      return '';
    }

    function tarifaInicial(key, tipo) {
      var salvo = embarques[key] || {};
      if (salvo[tipo]) return salvo[tipo];
      if (key === principal) return tipo === 'guia' ? (a.tarifa_guia || '') : (a.tarifa_translado || '');
      return '';
    }

    var cidadeOpts = '<option value="">— escolher —</option>' + CIDADES.map(function (nome) {
      return '<option value="' + esc(nome) + '"' + (nome === cidade ? ' selected' : '') + '>' + esc(nome) + '</option>';
    }).join('');

    var MINUTOS_HORA = ['00', '10', '15', '20', '30', '40', '45', '50'];

    function partirHora(valor) {
      var m = String(valor || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return { h: '', min: '' };
      var hora = parseInt(m[1], 10);
      var min = m[2];
      if (min === '60') {
        min = '00';
        hora = (hora + 1) % 24;
      }
      if (hora < 0 || hora > 23) return { h: '', min: '' };
      return { h: (hora < 10 ? '0' : '') + hora, min: min };
    }

    function campoHora(attr, rotulo, valor) {
      var p = partirHora(valor);
      var gravado = p.h && p.min ? p.h + ':' + p.min : '';
      return '<label class="xp-hora"><span>' + rotulo + '</span>' +
        '<button type="button" class="xp-hora__btn" data-' + attr + '-btn aria-label="' + rotulo + '">' +
        '<span class="xp-hora__text' + (gravado ? '' : ' is-placeholder') + '" data-' + attr + '-txt>' + (gravado || 'hh:mm') + '</span>' +
        '<svg class="xp-hora__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>' +
        '</button><input type="hidden" data-' + attr + ' value="' + esc(gravado) + '" /></label>';
    }

    var diasHtml = DIAS.map(function (dia) {
      var h = obj(horario[dia[0]]);
      return (
        '<div class="xp-day" data-dia="' + dia[0] + '">' +
        '<strong>' + dia[1] + '</strong>' +
        '<label class="xp-check"><input type="checkbox" data-fechado' + (h.fechado ? ' checked' : '') + ' /> Fechado</label>' +
        campoHora('abre', 'Das', h.abre || '') +
        campoHora('fecha', 'Até', h.fecha || '') +
        '</div>'
      );
    }).join('');

    var diaOpts = DIAS.map(function (dia, i) {
      return '<option value="' + dia[0] + '"' + (i === 0 ? ' selected' : '') + '>' + dia[1] + '</option>';
    }).join('');

    var mesesHtml = MESES.map(function (mes) {
      var on = Array.isArray(log.meses) && log.meses.indexOf(mes[0]) >= 0;
      return '<label class="xp-check"><input type="checkbox" data-mes="' + mes[0] + '"' + (on ? ' checked' : '') + ' /> ' + mes[1] + '</label>';
    }).join('');

    function opcoesMax(atual) {
      var n = parseInt(atual, 10);
      var html = '<option value="">—</option>';
      var i;
      for (i = 4; i <= 15; i++) html += '<option value="' + i + '"' + (n === i ? ' selected' : '') + '>' + i + '</option>';
      return html;
    }

    var diffHtml = DIFICULDADES.map(function (item) {
      return '<label><span>' + item[1] + '</span><input class="gcv-dash-input" data-diff="' + item[0] + '" inputmode="numeric" value="' + esc(diff[item[0]] == null ? '' : diff[item[0]]) + '" /></label>';
    }).join('');

    var planosHtml = PLANOS.map(function (p) {
      var on = (x.plano || 'sem_custo') === p[0];
      return (
        '<label class="xp-plano' + (on ? ' is-on' : '') + '">' +
        '<input type="radio" name="xp-plano" value="' + p[0] + '"' + (on ? ' checked' : '') + ' />' +
        '<span><strong>' + p[1] + '</strong><small>' + p[2] + '</small></span></label>'
      );
    }).join('');

    var catalogoSaida = SAIDAS.map(function (c) { return { key: c.key, nome: c.nome }; });
    CIDADES.forEach(function (nome) {
      var key = chaveCidade(nome);
      if (!catalogoSaida.some(function (c) { return c.key === key; })) catalogoSaida.push({ key: key, nome: nome });
    });
    Object.keys(embarques).forEach(function (key) {
      if (catalogoSaida.some(function (c) { return c.key === key; })) return;
      var salvo = embarques[key] || {};
      catalogoSaida.push({ key: key, nome: salvo.nome || key });
    });
    var chavesIniciais = Object.keys(embarques);
    if (!chavesIniciais.length) chavesIniciais = SAIDAS.map(function (c) { return c.key; });
    if (chavesIniciais.indexOf(principal) < 0) principal = chavesIniciais[0] || '';

    function nomeSaida(key) {
      var cat = catalogoSaida.filter(function (c) { return c.key === key; })[0];
      return cat ? cat.nome : key;
    }

    function cartaoCidade(key) {
      var horas = horasDe(minutosIniciais(key));
      return (
        '<div class="xp-city" data-city="' + esc(key) + '">' +
        '<div class="xp-city__top"><strong>' + esc(nomeSaida(key)) + '</strong>' +
        '<div class="xp-city__actions">' +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--danger gcv-dash-btn--sm" data-del-saida>Excluir</button>' +
        '</div></div>' +
        '<div class="xp-grid-4">' +
        '<label><span class="xp-req">Tarifa Guia</span><select class="gcv-dash-select" data-kind="guia" data-atual="' + esc(tarifaInicial(key, 'guia')) + '"><option value="">— escolher —</option></select></label>' +
        '<label><span>Tarifa Translado</span><select class="gcv-dash-select" data-kind="trans" data-atual="' + esc(tarifaInicial(key, 'trans')) + '"><option value="">— sem translado —</option></select></label>' +
        '<label><span>Distância de carro (km)</span><input class="gcv-dash-input" data-km inputmode="decimal" value="' + esc(kmInicial(key)) + '" /></label>' +
        '<label><span class="xp-req">Duração do passeio</span><span class="xp-dur"><input class="gcv-dash-input" data-h inputmode="numeric" value="' + esc(horas) + '" /> h</span></label>' +
        '</div></div>'
      );
    }

    var tours = Array.isArray(a.related_tours) ? a.related_tours.filter(function (t) { return t && (t.attractions || t.title); }) : [];

    var diffAtual = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }[a.difficulty] || '';
    var pesoSalvo = parseInt(x.peso, 10);
    var pesoAtual = pesoSalvo === 1 || pesoSalvo === 2 || pesoSalvo === 3
      ? pesoSalvo
      : (a.difficulty === 'easy' ? 1 : a.difficulty === 'hard' ? 3 : 2);

    form.classList.add('xp-ficha');
    form.innerHTML =
      '<div class="xp-head">' +
      '<div class="xp-head__status" role="group" aria-label="Status">' +
      '<select class="xp-status" id="xp-status" tabindex="-1" aria-hidden="true">' +
      '<option value="published"' + (a.status === 'published' ? ' selected' : '') + '>Ativada</option>' +
      '<option value="archived"' + (a.status === 'archived' ? ' selected' : '') + '>Desativada</option>' +
      '<option value="draft"' + (a.status === 'draft' || !a.status ? ' selected' : '') + '>Rascunho</option>' +
      '</select>' +
      '<button type="button" class="xp-status-btn" data-status="published">Ativada</button>' +
      '<button type="button" class="xp-status-btn" data-status="archived">Desativada</button>' +
      '<button type="button" class="xp-status-btn" data-status="draft">Rascunho</button>' +
      '</div>' +
      '<button type="button" class="gcv-dash-btn" id="xp-cancel">Cancelar</button>' +
      '<button type="button" class="gcv-dash-btn" id="xp-save">Salvar</button>' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="xp-publish">Publicar</button>' +
      '<p class="xp-erro" id="xp-erro" hidden></p></div>' +
      '<div class="xp-tabs" role="tablist">' +
      '<button type="button" class="xp-tab is-on" data-tab="geral">Informações gerais</button>' +
      '<button type="button" class="xp-tab" data-tab="ranking">Ranking</button>' +
      '<button type="button" class="xp-tab" data-tab="ingressos">Ingressos</button>' +
      '<button type="button" class="xp-tab" data-tab="local">Localização e tarifário</button>' +
      '<button type="button" class="xp-tab" data-tab="horario">Horário</button>' +
      '<button type="button" class="xp-tab" data-tab="logistica">Logística</button>' +
      '<button type="button" class="xp-tab" data-tab="relacionados">Relacionados</button>' +
      '<button type="button" class="xp-tab" data-tab="venda">Venda</button>' +
      '<button type="button" class="xp-tab" data-tab="imagens">Imagens</button>' +
      '</div>' +
      '<div class="xp-panel" data-panel="geral"><div class="xp-split"><div class="xp-card">' +
      '<h3>Informações gerais</h3>' +
      '<label class="xp-field"><span class="xp-req">Nome da experiência</span>' + langInputs('xp-title', { pt: a.title_pt, en: a.title_en, es: a.title_es }) + '</label>' +
      '<label class="xp-field"><span>Subtítulo</span>' + langInputs('xp-sub', { pt: x.subtitulo_pt, en: x.subtitulo_en, es: x.subtitulo_es }) + '</label>' +
      '<label class="xp-field"><span>Resumo</span>' + langInputs('xp-excerpt', { pt: a.excerpt_pt, en: a.excerpt_en, es: a.excerpt_es }, 'area') + '</label>' +
      '<label class="xp-field"><span class="xp-req">Descrição</span>' + langInputs('xp-content', { pt: a.content_pt, en: a.content_en, es: a.content_es }, 'area') + '</label>' +
      paginaCodigoHtml(a) +
      '<details class="xp-details"><summary>Endereço da página e texto lateral</summary>' +
      '<label class="xp-field"><span>Slug</span><input class="gcv-dash-input" id="xp-slug" value="' + esc(a.slug || '') + '" /></label>' +
      '<label class="xp-field"><span>Texto lateral</span>' + langInputs('xp-side', { pt: a.sidebar_html_pt, en: a.sidebar_html_en, es: a.sidebar_html_es }, 'area') + '</label>' +
      '</details></div><div>' +
      '<div class="xp-card"><h3>Classificação</h3>' +
      '<input type="hidden" id="xp-tipo" value="trilha" />' +
      '<div class="xp-pesos">' +
      '<label class="xp-peso' + (pesoAtual === 1 ? ' is-on' : '') + '"><input type="radio" name="xp-peso" value="1"' + (pesoAtual === 1 ? ' checked' : '') + ' /><strong>1 Fácil</strong></label>' +
      '<label class="xp-peso' + (pesoAtual === 2 ? ' is-on' : '') + '"><input type="radio" name="xp-peso" value="2"' + (pesoAtual === 2 ? ' checked' : '') + ' /><strong>2 Moderado</strong></label>' +
      '<label class="xp-peso' + (pesoAtual === 3 ? ' is-on' : '') + '"><input type="radio" name="xp-peso" value="3"' + (pesoAtual === 3 ? ' checked' : '') + ' /><strong>3 Difícil</strong></label>' +
      '</div>' +
      '<label class="xp-field"><span>Subcategoria</span><input class="gcv-dash-input" id="xp-subcat" list="xp-subcats" value="' + esc(x.subcategoria || 'Cachoeira') + '" /><datalist id="xp-subcats"><option value="Cachoeira"></option><option value="Poço"></option><option value="Mirante"></option><option value="Cânion"></option><option value="Vale"></option><option value="Parque"></option></datalist></label>' +
      '<label class="xp-field"><span>CNPJ</span><input class="gcv-dash-input" id="xp-cnpj" inputmode="numeric" placeholder="00.000.000/0001-00" value="' + esc(x.cnpj || '') + '" /></label>' +
      '<div class="xp-field"><span>Tags</span><div class="xp-tags" id="xp-tags"></div><div class="xp-inline"><input class="gcv-dash-input" id="xp-tag-input" placeholder="Nova tag" /><button type="button" class="gcv-dash-btn" id="xp-tag-add">Adicionar</button></div></div>' +
      '<label class="xp-field"><span>E-mail do anfitrião</span><input class="gcv-dash-input" id="xp-email" type="email" placeholder="quem administra esta experiência" value="' + esc(x.anfitriao_email || '') + '" /></label>' +
      '<p class="xp-note">O anfitrião entra com este e-mail. O admin aprova em Anfitriões e avisa no WhatsApp. Até a aprovação, o financeiro dele fica fechado.</p>' +
      '</div><div class="xp-card" style="margin-top:14px"><h3>Plano do anfitrião</h3>' + planosHtml +
      '<p class="xp-note">Trocar o plano não cobra ao salvar. A porcentagem vale na próxima venda do ingresso. O interruptor global do checkout fica em Configurações e ainda não liga a cobrança.</p></div></div></div></div>' +
      '<div class="xp-panel" data-panel="ranking" hidden><div id="xp-ranking"><p class="xp-note">Calculando o ranking…</p></div></div>' +
      '<div class="xp-panel" data-panel="ingressos" hidden><div class="xp-card"><h3>Ingressos da experiência</h3>' +
      '<p class="xp-note">Entrada do parque, separada da tarifa do guia. O primeiro ingresso em real continua na página pública. Meia-entrada e desconto variável não entram aqui.</p>' +
      '<div id="xp-ingressos"></div><button type="button" class="gcv-dash-btn" id="xp-ing-add">+ Adicionar tipo de ingresso</button></div></div>' +
      '<div class="xp-panel" data-panel="local" hidden><div class="xp-card"><h3>Localização e tarifário</h3>' +
      '<label class="xp-field"><span class="xp-req">Cidade da experiência</span><select class="gcv-dash-select" id="xp-cidade">' + cidadeOpts + '</select></label>' +
      '<p class="xp-note">Adicione ou exclua as cidades de onde este passeio embarca. Cada cidade adicionada já é uma saída. Rascunho e Desativada salvam sem tarifa e ficam fora do site. Ativada exige, em cada cidade, Tarifa Guia e duração, além dos campos marcados com *. Tarifa Translado pode ficar vazia. Sozinho, cada cidade usa a tarifa dela. Com duas ou três experiências, o widget mostra apenas a cidade presente em todas, e cada saída do conjunto tem a própria Tarifa Guia e, se houver, a própria Tarifa Translado.</p>' +
      '<div id="xp-saidas">' + chavesIniciais.map(cartaoCidade).join('') + '</div>' +
      '<div class="xp-saida-add"><select class="gcv-dash-select" id="xp-saida-nova"></select><button type="button" class="gcv-dash-btn" id="xp-saida-add">Adicionar cidade</button></div>' +
      '<label class="xp-field"><span>Estacionamento</span><input class="gcv-dash-input" id="xp-parking" value="' + esc(a.parking_info || '') + '" /></label>' +
      '</div></div>' +
      '<div class="xp-panel" data-panel="horario" hidden><div class="xp-card"><h3>Horário de funcionamento</h3>' +
      '<div class="xp-copy"><span>Copiar</span><select class="gcv-dash-select" id="xp-dia-modelo">' + diaOpts + '</select>' +
      '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary gcv-dash-btn--sm" id="xp-copiar-dia">Aplicar a todos os dias</button></div>' +
      diasHtml + '</div></div>' +
      '<div class="xp-panel" data-panel="logistica" hidden><div class="xp-card"><h3>Logística e nível de dificuldade</h3>' +
      '<div class="xp-pair">' +
      '<label class="xp-field"><span>Máximo de participantes por guia</span><select class="gcv-dash-select" id="xp-max">' + opcoesMax(log.max) + '</select></label>' +
      '<label class="xp-field"><span>Caminhada (trilha, km)</span><input class="gcv-dash-input" id="xp-trail" inputmode="decimal" value="' + esc(a.trail_distance_km || '') + '" /></label>' +
      '</div>' +
      '<p class="xp-note">Opcional. De 4 a 15. O passeio usa o menor máximo das experiências. Na compra, o grupo não passa desse número. Na excursão, as vagas já vêm com esse máximo e podem ser reduzidas até 4.</p>' +
      '<div class="xp-checks">' +
      '<label class="xp-check"><input type="checkbox" id="xp-pet"' + (log.pet ? ' checked' : '') + ' /> Pet friendly</label>' +
      '<label class="xp-check"><input type="checkbox" id="xp-4x4"' + (log.so4x4 ? ' checked' : '') + ' /> Somente veículos 4x4</label></div>' +
      '<p class="xp-note">Melhor período. Seca é abril a setembro. Chuvas é outubro a março.</p>' +
      '<div class="xp-checks">' +
      '<label class="xp-check"><input type="checkbox" data-estacao="ano" /> Ano todo</label>' +
      '<label class="xp-check"><input type="checkbox" data-estacao="seca" /> Seca (abr–set)</label>' +
      '<label class="xp-check"><input type="checkbox" data-estacao="chuva" /> Chuvas (out-mar)</label></div>' +
      '<div class="xp-meses">' + mesesHtml + '</div>' +
      '<p class="xp-note" style="margin-top:14px">Nível de dificuldade. Não é obrigatório. Se preencher algum, a soma dos cinco fecha em 100. ' + (diffAtual ? 'A página pública hoje mostra: ' + diffAtual + '.' : '') + '</p>' +
      '<div class="xp-diff">' + diffHtml + '</div><p class="xp-sum" id="xp-diff-sum"></p>' +
      '</div></div>' +
      '<div class="xp-panel" data-panel="relacionados" hidden><div class="xp-card"><h3>Relacionados e tarifário</h3>' +
      '<p class="xp-note">Cada experiência de trilha já é um passeio unitário. Relacionar com outra cria um passeio novo, com as experiências escolhidas. Máximo de 3 por passeio. A Tarifa Guia publica esse passeio. A Tarifa Translado pode ficar vazia.</p>' +
      '<div id="xp-rels"></div>' +
      '<button type="button" class="xp-rel-add" id="xp-rel-add">+ Adicionar relacionamento</button></div></div>' +
      '<div class="xp-panel" data-panel="venda" hidden><div class="xp-card"><h3>Venda de ingressos e passeio</h3>' +
      '<p class="xp-note">O teto do dia limita a lotação. Cancelar a venda tira o passeio do site. No período, a página some ou mostra o aviso. O guia bloqueado não vende este passeio. A premiação é o que o 1º, 2º e 3º recebem em cada temporada.</p>' +
      '<div id="xp-venda-slot"></div></div></div>' +
      '<div class="xp-panel" data-panel="imagens" hidden><div class="xp-card"><h3>Imagens</h3>' +
      '<p class="xp-note">A primeira imagem é a capa. Arraste não é obrigatório: o botão da esquerda traz a foto para a capa.</p>' +
      '<div class="xp-drop"><input type="file" id="xp-img-file" accept="image/*" multiple /><p class="xp-note">PNG ou JPG</p>' +
      '<div class="xp-inline"><input class="gcv-dash-input" id="xp-img-url" placeholder="Ou cole o endereço da imagem" /><button type="button" class="gcv-dash-btn" id="xp-img-add">Adicionar</button></div></div>' +
      '<div class="xp-gallery" id="xp-gallery"></div></div></div>';

    function q(id) { return form.querySelector('#' + id); }
    (function montarVenda() {
      var slot = q('xp-venda-slot');
      if (!slot || !window.GcvAnfitriao) return;
      var state = window.GcvAnfitriao.vendaVazia(x.venda || {}, a.tem_passeio !== false);
      slot.innerHTML = window.GcvAnfitriao.htmlVenda(state, 'xpv');
      var ligar = function (lista) {
        window.GcvAnfitriao.bindVenda(slot, 'xpv', lista || [], state.bloqueados);
      };
      if (api.loadGuias) api.loadGuias(ligar);
      else ligar([]);
    })();

    function mostrarErro(msg) {
      var box = q('xp-erro');
      box.classList.remove('is-ok');
      box.hidden = !msg;
      box.textContent = msg || '';
      if (msg) box.scrollIntoView({ block: 'nearest' });
    }

    function mostrarOk(msg) {
      var box = q('xp-erro');
      box.classList.add('is-ok');
      box.hidden = !msg;
      box.textContent = msg || '';
    }

    function pintarTags() {
      q('xp-tags').innerHTML = tags.map(function (tag, i) {
        return '<span class="xp-tag">' + esc(tag) + '<button type="button" data-tag="' + i + '" aria-label="Remover">×</button></span>';
      }).join('');
      q('xp-tags').querySelectorAll('[data-tag]').forEach(function (btn) {
        btn.onclick = function () {
          tags.splice(parseInt(btn.getAttribute('data-tag'), 10), 1);
          pintarTags();
        };
      });
    }

    function lerIngressos() {
      return Array.prototype.map.call(form.querySelectorAll('.xp-ing'), function (row) {
        return {
          nome: row.querySelector('[data-nome]').value.trim(),
          preco: row.querySelector('[data-preco]').value.trim(),
          moeda: row.querySelector('[data-moeda]').value,
          qtd: row.querySelector('[data-qtd]').value.trim(),
          gratis: row.querySelector('[data-gratis]').checked,
          validade: (row.querySelector('[data-validade]:checked') || {}).value || 'sempre',
          inicio: row.querySelector('[data-inicio]').value,
          fim: row.querySelector('[data-fim]').value
        };
      });
    }

    function pintarIngressos() {
      q('xp-ingressos').innerHTML = ingressos.map(function (ing, i) {
        return (
          '<div class="xp-ing" data-i="' + i + '">' +
          '<label><span>Nome do ingresso</span><input class="gcv-dash-input" data-nome value="' + esc(ing.nome || '') + '" placeholder="Inteira" /></label>' +
          '<label><span>Preço</span><input class="gcv-dash-input" data-preco inputmode="decimal" value="' + esc(ing.preco || '') + '"' + (ing.gratis ? ' disabled' : '') + ' /></label>' +
          '<label><span>Moeda</span><select class="gcv-dash-select" data-moeda><option value="BRL"' + (ing.moeda !== 'USD' && ing.moeda !== 'EUR' ? ' selected' : '') + '>BRL (R$)</option><option value="USD"' + (ing.moeda === 'USD' ? ' selected' : '') + '>USD</option><option value="EUR"' + (ing.moeda === 'EUR' ? ' selected' : '') + '>EUR</option></select></label>' +
          '<label><span>Quantidade máx.</span><input class="gcv-dash-input" data-qtd inputmode="numeric" value="' + esc(ing.qtd || '') + '" /></label>' +
          '<label class="xp-check"><input type="checkbox" data-gratis' + (ing.gratis ? ' checked' : '') + ' /> Entrada gratuita</label>' +
          '<label class="xp-check"><input type="radio" name="xp-val-' + i + '" data-validade value="sempre"' + (ing.validade !== 'periodo' ? ' checked' : '') + ' /> Sempre válido</label>' +
          '<label class="xp-check"><input type="radio" name="xp-val-' + i + '" data-validade value="periodo"' + (ing.validade === 'periodo' ? ' checked' : '') + ' /> Período</label>' +
          '<button type="button" class="gcv-dash-btn" data-rm-ing="' + i + '">Remover</button>' +
          '<label><span>Início</span><input class="gcv-dash-input" data-inicio type="date" value="' + esc(ing.inicio || '') + '" /></label>' +
          '<label><span>Fim</span><input class="gcv-dash-input" data-fim type="date" value="' + esc(ing.fim || '') + '" /></label>' +
          '</div>'
        );
      }).join('');
      q('xp-ingressos').querySelectorAll('[data-gratis]').forEach(function (box) {
        box.onchange = function () {
          var preco = box.closest('.xp-ing').querySelector('[data-preco]');
          preco.disabled = box.checked;
          if (box.checked) preco.value = '';
        };
      });
      q('xp-ingressos').querySelectorAll('[data-rm-ing]').forEach(function (btn) {
        btn.onclick = function () {
          ingressos = lerIngressos();
          ingressos.splice(parseInt(btn.getAttribute('data-rm-ing'), 10), 1);
          pintarIngressos();
        };
      });
    }

    function pintarGaleria() {
      q('xp-gallery').innerHTML = gallery.map(function (item, i) {
        return (
          '<div class="xp-shot" draggable="true" data-i="' + i + '">' +
          '<img src="' + esc(item.url) + '" alt="" />' +
          (i === 0 ? '<span class="xp-shot__badge">principal</span>' : '<button type="button" class="xp-shot__up" data-capa="' + i + '" title="Tornar capa">↑</button>') +
          '<button type="button" class="xp-shot__x" data-rm-img="' + i + '" aria-label="Remover">×</button></div>'
        );
      }).join('');
      q('xp-gallery').querySelectorAll('[data-rm-img]').forEach(function (btn) {
        btn.onclick = function () {
          gallery.splice(parseInt(btn.getAttribute('data-rm-img'), 10), 1);
          pintarGaleria();
        };
      });
      q('xp-gallery').querySelectorAll('[data-capa]').forEach(function (btn) {
        btn.onclick = function () {
          var i = parseInt(btn.getAttribute('data-capa'), 10);
          var item = gallery.splice(i, 1)[0];
          gallery.unshift(item);
          pintarGaleria();
        };
      });
      var drag = -1;
      q('xp-gallery').querySelectorAll('.xp-shot').forEach(function (shot) {
        shot.ondragstart = function () { drag = parseInt(shot.getAttribute('data-i'), 10); };
        shot.ondragover = function (ev) { ev.preventDefault(); };
        shot.ondrop = function (ev) {
          ev.preventDefault();
          var para = parseInt(shot.getAttribute('data-i'), 10);
          if (drag < 0 || drag === para) return;
          var item = gallery.splice(drag, 1)[0];
          gallery.splice(para, 0, item);
          pintarGaleria();
        };
      });
    }

    function mesesMarcados() {
      return MESES.filter(function (mes) {
        return form.querySelector('[data-mes="' + mes[0] + '"]').checked;
      }).map(function (mes) { return mes[0]; });
    }

    function sincronizarEstacoes() {
      var on = mesesMarcados();
      function igual(lista) {
        return lista.length === on.length && lista.every(function (k) { return on.indexOf(k) >= 0; });
      }
      form.querySelector('[data-estacao="ano"]').checked = on.length === 12;
      form.querySelector('[data-estacao="seca"]').checked = igual(SECA);
      form.querySelector('[data-estacao="chuva"]').checked = igual(CHUVA);
    }

    function atualizarSoma() {
      var soma = 0;
      var algum = false;
      DIFICULDADES.forEach(function (item) {
        var el = form.querySelector('[data-diff="' + item[0] + '"]');
        if (el.value === '') return;
        var n = parseInt(el.value, 10);
        if (!isNaN(n)) { algum = true; soma += n; }
      });
      var box = q('xp-diff-sum');
      if (!algum) {
        box.textContent = 'Vazio. Não é obrigatório. Se preencher algum, a soma fecha em 100.';
        box.className = 'xp-sum';
        return soma;
      }
      box.textContent = 'Soma ' + soma + (soma === 100 ? '.' : ' — precisa fechar 100.');
      box.className = 'xp-sum ' + (soma === 100 ? 'is-ok' : 'is-bad');
      return soma;
    }

    function lerDia(key) {
      var row = form.querySelector('[data-dia="' + key + '"]');
      return {
        fechado: row.querySelector('[data-fechado]').checked,
        abre: row.querySelector('[data-abre]').value,
        fecha: row.querySelector('[data-fecha]').value
      };
    }

    function pintarHora(row, attr, valor) {
      var p = partirHora(valor);
      var hidden = row.querySelector('[data-' + attr + ']');
      var text = row.querySelector('[data-' + attr + '-txt]');
      var gravado = p.h && p.min ? p.h + ':' + p.min : '';
      hidden.value = gravado;
      text.textContent = gravado || 'hh:mm';
      text.classList.toggle('is-placeholder', !gravado);
    }

    var horaPop = document.createElement('div');
    horaPop.className = 'xp-hora__pop';
    horaPop.hidden = true;
    document.querySelectorAll('.xp-hora__pop').forEach(function (el) { el.remove(); });
    document.body.appendChild(horaPop);
    var horaAlvo = null;

    function fecharHora() {
      horaPop.hidden = true;
      if (horaAlvo && horaAlvo.btn) horaAlvo.btn.classList.remove('is-open');
      horaAlvo = null;
    }

    function posicionarHora() {
      if (!horaAlvo || horaPop.hidden) return;
      var r = horaAlvo.btn.getBoundingClientRect();
      var gap = 6;
      horaPop.style.left = Math.max(8, r.left) + 'px';
      horaPop.style.top = (r.bottom + gap) + 'px';
      var pr = horaPop.getBoundingClientRect();
      var left = r.left;
      if (pr.right > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pr.width - 8);
      var top = r.bottom + gap;
      if (pr.bottom > window.innerHeight - 8 && r.top - pr.height - gap > 8) top = r.top - pr.height - gap;
      horaPop.style.left = left + 'px';
      horaPop.style.top = top + 'px';
    }

    function desenharHora() {
      if (!horaAlvo) return;
      var atual = partirHora(horaAlvo.row.querySelector('[data-' + horaAlvo.attr + ']').value);
      var horas = '';
      var i;
      for (i = 0; i < 24; i++) {
        var hv = (i < 10 ? '0' : '') + i;
        horas += '<button type="button" class="xp-hora__cell' + (hv === atual.h ? ' is-on' : '') + '" data-h="' + hv + '">' + hv + '</button>';
      }
      var minsLista = MINUTOS_HORA.slice();
      if (atual.min && minsLista.indexOf(atual.min) < 0) minsLista.push(atual.min);
      var mins = minsLista.map(function (mv) {
        return '<button type="button" class="xp-hora__cell' + (mv === atual.min ? ' is-on' : '') + '" data-m="' + mv + '">' + mv + '</button>';
      }).join('');
      horaPop.innerHTML =
        '<div class="xp-hora__head"><strong>' + (horaAlvo.attr === 'abre' ? 'Das' : 'Até') + '</strong>' +
        '<button type="button" class="xp-hora__clear" data-limpar>Limpar</button></div>' +
        '<p class="xp-hora__kicker">Hora</p><div class="xp-hora__grid">' + horas + '</div>' +
        '<p class="xp-hora__kicker">Minutos</p><div class="xp-hora__mins">' + mins + '</div>';
      horaPop.querySelectorAll('[data-h]').forEach(function (b) {
        b.onclick = function (ev) {
          ev.preventDefault();
          var min = atual.min || '00';
          pintarHora(horaAlvo.row, horaAlvo.attr, b.getAttribute('data-h') + ':' + min);
          desenharHora();
        };
      });
      horaPop.querySelectorAll('[data-m]').forEach(function (b) {
        b.onclick = function (ev) {
          ev.preventDefault();
          if (!atual.h) {
            horaAlvo.minEspera = b.getAttribute('data-m');
            horaPop.querySelectorAll('[data-m]').forEach(function (outro) {
              outro.classList.toggle('is-on', outro === b);
            });
            return;
          }
          pintarHora(horaAlvo.row, horaAlvo.attr, atual.h + ':' + b.getAttribute('data-m'));
          fecharHora();
        };
      });
      horaPop.querySelector('[data-limpar]').onclick = function (ev) {
        ev.preventDefault();
        pintarHora(horaAlvo.row, horaAlvo.attr, '');
        fecharHora();
      };
      if (horaAlvo.minEspera && atual.h) {
        pintarHora(horaAlvo.row, horaAlvo.attr, atual.h + ':' + horaAlvo.minEspera);
        fecharHora();
      }
    }

    function abrirHora(row, attr, btn) {
      if (btn.disabled) return;
      if (horaPop.hidden) horaAlvo = null;
      if (horaAlvo && horaAlvo.btn === btn) {
        fecharHora();
        return;
      }
      fecharHora();
      horaAlvo = { row: row, attr: attr, btn: btn, minEspera: '' };
      btn.classList.add('is-open');
      desenharHora();
      horaPop.hidden = false;
      posicionarHora();
    }

    function travarDia(row) {
      var off = row.querySelector('[data-fechado]').checked;
      row.classList.toggle('is-off', off);
      row.querySelectorAll('.xp-hora__btn').forEach(function (btn) {
        btn.disabled = off;
        if (off && horaAlvo && horaAlvo.btn === btn) fecharHora();
      });
    }

    function escreverDia(key, dia) {
      var row = form.querySelector('[data-dia="' + key + '"]');
      row.querySelector('[data-fechado]').checked = !!dia.fechado;
      pintarHora(row, 'abre', dia.abre || '');
      pintarHora(row, 'fecha', dia.fecha || '');
      travarDia(row);
    }

    function minutosDaCidade(key) {
      var row = form.querySelector('#xp-saidas [data-city="' + key + '"]');
      if (!row) return 0;
      var input = row.querySelector('[data-h]');
      if (!input || input.value.trim() === '') return 0;
      var h = parseInt(input.value, 10) || 0;
      if (h < 1) return 0;
      return Math.min(24, h) * 60;
    }

    function valorTarifa(select) {
      if (!select) return '';
      if (select.value) return select.value;
      if (select.options.length <= 1) return select.getAttribute('data-atual') || '';
      return '';
    }

    function faltasParaAtivar() {
      var faltas = [];
      if (!q('xp-title-pt').value.trim()) faltas.push('Nome da experiência');
      if (!q('xp-content-pt').value.trim()) faltas.push('Descrição');
      if (!q('xp-cidade').value) faltas.push('Cidade da experiência');
      var comSaida = 0;
      form.querySelectorAll('#xp-saidas [data-city]').forEach(function (row) {
        comSaida += 1;
        var nome = (row.querySelector('strong') || {}).textContent || 'cidade de saída';
        if (!valorTarifa(row.querySelector('[data-kind="guia"]'))) faltas.push('Tarifa Guia em ' + nome);
        if (!minutosDaCidade(row.getAttribute('data-city'))) faltas.push('Duração em ' + nome);
      });
      if (!comSaida) faltas.push('Pelo menos uma cidade de saída');
      return faltas;
    }

    function erroAtivar(faltas) {
      return 'Para ativar, preencha: ' + faltas.join(', ') + '.';
    }

    function dificuldade(soma) {
      if (!soma) return a.difficulty || '';
      var mapa = { leve: 'easy', facil: 'easy', moderado: 'medium', dificil: 'hard', desafiador: 'hard' };
      var melhor = '';
      var maior = -1;
      DIFICULDADES.forEach(function (item) {
        var n = parseInt(form.querySelector('[data-diff="' + item[0] + '"]').value, 10) || 0;
        if (n > maior) { maior = n; melhor = mapa[item[0]]; }
      });
      return melhor;
    }

    function periodoTexto(meses) {
      if (!mesesTocados) return a.recommended_period || '';
      if (meses.length === 12) return 'Ano todo';
      var seca = SECA.every(function (k) { return meses.indexOf(k) >= 0; }) && meses.length === 6 && CHUVA.every(function (k) { return meses.indexOf(k) < 0; });
      var chuva = CHUVA.every(function (k) { return meses.indexOf(k) >= 0; }) && meses.length === 6;
      if (seca) return 'Seca (abr–set)';
      if (chuva) return 'Chuvas (out-mar)';
      return meses.map(function (k) {
        var achou = MESES.filter(function (mes) { return mes[0] === k; })[0];
        return achou ? achou[1] : k;
      }).join(', ');
    }

    function coletar(statusForcado) {
      var title = q('xp-title-pt').value.trim();
      var email = q('xp-email').value.trim();
      var cnpj = q('xp-cnpj').value.replace(/\D/g, '');
      var maxRaw = q('xp-max').value.trim();
      var trilha = q('xp-trail').value.trim();
      var soma = atualizarSoma();
      var algumDiff = DIFICULDADES.some(function (item) { return form.querySelector('[data-diff="' + item[0] + '"]').value !== ''; });
      var statusPedido = statusForcado || q('xp-status').value;
      var exigirAtivacao = statusForcado === 'published' || (statusPedido === 'published' && a.status !== 'published');
      if (exigirAtivacao) {
        var faltas = faltasParaAtivar();
        if (faltas.length) return { erro: erroAtivar(faltas) };
      } else if (!title) {
        return { erro: 'O nome da experiência é obrigatório.' };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'O e-mail do anfitrião precisa ter o formato nome@dominio.' };
      if (q('xp-cnpj').value.trim() && cnpj.length !== 14) return { erro: 'O CNPJ precisa ter 14 números.' };
      if (maxRaw !== '' && !(parseInt(maxRaw, 10) >= 4 && parseInt(maxRaw, 10) <= 15)) return { erro: 'O máximo de participantes fica entre 4 e 15.' };
      if (algumDiff && soma !== 100) return { erro: 'A dificuldade precisa somar 100.' };
      if (trilha !== '' && !(parseFloat(trilha.replace(',', '.')) >= 0)) return { erro: 'A trilha em km precisa ser um número.' };

      ingressos = lerIngressos().filter(function (ing) {
        return ing.nome || ing.preco || ing.gratis || ing.qtd;
      });
      var primeiro = ingressos[0] || null;
      var cents = null;
      var label = null;
      if (primeiro) {
        label = primeiro.nome || 'Inteira';
        if (primeiro.gratis) cents = 0;
        else if (primeiro.moeda === 'BRL' && primeiro.preco !== '') {
          var preco = parseFloat(String(primeiro.preco).replace(',', '.'));
          if (!(preco >= 0)) return { erro: 'O preço do ingresso precisa ser um número.' };
          cents = Math.round(preco * 100);
        }
      }

      var saidas = {};
      var duracaoOut = {};
      var erroDist = '';
      form.querySelectorAll('#xp-saidas [data-city]').forEach(function (row) {
        var key = row.getAttribute('data-city');
        var minutos = minutosDaCidade(key);
        var km = row.querySelector('[data-km]').value.trim();
        if (!erroDist && km !== '' && !(parseFloat(km.replace(',', '.')) >= 0)) {
          erroDist = 'A distância de ' + nomeSaida(key) + ' precisa ser um número.';
        }
        saidas[key] = {
          nome: nomeSaida(key),
          guia: row.querySelector('[data-kind="guia"]').value,
          trans: row.querySelector('[data-kind="trans"]').value,
          km: km.replace(',', '.'),
          minutos: minutos || '',
          vende: true
        };
        if (minutos > 0) duracaoOut[key] = minutos;
      });
      if (erroDist) return { erro: erroDist };

      var principalKey = (x.principal && saidas[x.principal]) ? x.principal : (Object.keys(saidas)[0] || '');
      var baseSaida = principalKey ? saidas[principalKey] : { km: '', guia: '', trans: '', minutos: '' };
      var minutosBase = baseSaida.minutos || 0;
      if (!minutosBase) {
        Object.keys(saidas).some(function (key) {
          if (saidas[key].minutos) { minutosBase = saidas[key].minutos; return true; }
          return false;
        });
      }

      var horarioOut = {};
      DIAS.forEach(function (dia) { horarioOut[dia[0]] = lerDia(dia[0]); });
      var meses = mesesMarcados();
      var plano = (form.querySelector('input[name="xp-plano"]:checked') || {}).value || 'sem_custo';
      var vendaOut = window.GcvAnfitriao
        ? window.GcvAnfitriao.lerVenda(form, 'xpv')
        : { tem_passeio: a.tem_passeio !== false, venda: x.venda || {} };
      if (vendaOut.erro) return { erro: vendaOut.erro };

      var payload = {
        id: a.id,
        exigir_ativacao: statusForcado === 'published',
        title_pt: title,
        title_en: a.title_en || '',
        title_es: a.title_es || '',
        slug: q('xp-slug').value.trim(),
        status: statusForcado || q('xp-status').value,
        excerpt_pt: q('xp-excerpt-pt').value,
        excerpt_en: a.excerpt_en || '',
        excerpt_es: a.excerpt_es || '',
        content_pt: q('xp-content-pt').value,
        content_en: a.content_en || '',
        content_es: a.content_es || '',
        sidebar_html_pt: q('xp-side-pt').value,
        sidebar_html_en: a.sidebar_html_en || '',
        sidebar_html_es: a.sidebar_html_es || '',
        seo_title_pt: a.seo_title_pt || '',
        seo_title_en: a.seo_title_en || '',
        seo_title_es: a.seo_title_es || '',
        seo_desc_pt: a.seo_desc_pt || '',
        seo_desc_en: a.seo_desc_en || '',
        seo_desc_es: a.seo_desc_es || '',
        parking_info: q('xp-parking').value.trim(),
        recommended_period: periodoTexto(meses),
        trail_distance_km: trilha.replace(',', '.'),
        distance_km: String(baseSaida.km || '').replace(',', '.'),
        duration_minutes: minutosBase || '',
        duracao: duracaoOut,
        difficulty: dificuldade(algumDiff ? soma : 0),
        entry_price_cents: cents == null ? '' : cents,
        entry_price_label: label || '',
        cover_url: gallery[0] ? gallery[0].url : '',
        cover_media_id: gallery[0] && gallery[0].media_id ? gallery[0].media_id : '',
        gallery: gallery.map(function (item, i) {
          return { url: item.url, media_id: item.media_id || '', alt_text: item.alt_text || '', sort_order: i };
        }),
        tarifa_guia: baseSaida.guia || '',
        tarifa_translado: baseSaida.trans || '',
        cidade_nome: q('xp-cidade').value,
        tem_passeio: vendaOut.tem_passeio !== false,
        experiencia: {
          subtitulo_pt: q('xp-sub-pt').value.trim(),
          subtitulo_en: x.subtitulo_en || '',
          subtitulo_es: x.subtitulo_es || '',
          cnpj: q('xp-cnpj').value.trim(),
          tags: tags,
          anfitriao_email: email,
          tipo: 'trilha',
          peso: parseInt((form.querySelector('input[name="xp-peso"]:checked') || {}).value, 10) || pesoAtual,
          subcategoria: q('xp-subcat').value.trim() || 'Cachoeira',
          plano: plano,
          cidade: q('xp-cidade').value,
          principal: principalKey,
          ingressos: ingressos,
          embarques: saidas,
          horario: horarioOut,
          logistica: {
            max: maxRaw,
            pet: q('xp-pet').checked,
            so4x4: q('xp-4x4').checked,
            meses: meses,
            diff: DIFICULDADES.reduce(function (acc, item) {
              acc[item[0]] = form.querySelector('[data-diff="' + item[0] + '"]').value.trim();
              return acc;
            }, {})
          },
          venda: vendaOut.venda || {}
        }
      };
      return { payload: payload };
    }

    function salvar(statusForcado, aoFalhar) {
      mostrarErro('');
      var out = coletar(statusForcado);
      if (out.erro) {
        mostrarErro(out.erro);
        if (aoFalhar) aoFalhar();
        return;
      }
      q('xp-save').disabled = true;
      q('xp-publish').disabled = true;
      form.querySelectorAll('[data-status]').forEach(function (btn) { btn.disabled = true; });
      api.onSave(out.payload, function (err) {
        q('xp-save').disabled = false;
        q('xp-publish').disabled = false;
        form.querySelectorAll('[data-status]').forEach(function (btn) { btn.disabled = false; });
        if (err) {
          mostrarErro(err);
          if (aoFalhar) aoFalhar();
          return;
        }
        a.status = out.payload.status;
        mostrarOk('Salvo.');
      });
    }

    form.querySelectorAll('.xp-tab').forEach(function (tab) {
      tab.onclick = function () {
        form.querySelectorAll('.xp-tab').forEach(function (el) { el.classList.toggle('is-on', el === tab); });
        form.querySelectorAll('.xp-panel').forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-panel') !== tab.getAttribute('data-tab');
        });
      };
    });
    q('xp-title-pt').addEventListener('input', function () {
      if (api.onTitle) api.onTitle(q('xp-title-pt').value);
    });
    q('xp-tag-add').onclick = function () {
      var valor = q('xp-tag-input').value.trim();
      if (!valor) return;
      if (tags.some(function (tag) { return tag.toLowerCase() === valor.toLowerCase(); })) return;
      if (tags.length >= 20) { mostrarErro('No máximo 20 tags.'); return; }
      tags.push(valor.slice(0, 40));
      q('xp-tag-input').value = '';
      pintarTags();
    };
    q('xp-tag-input').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); q('xp-tag-add').click(); }
    });
    form.querySelectorAll('.xp-plano input').forEach(function (radio) {
      radio.onchange = function () {
        form.querySelectorAll('.xp-plano').forEach(function (card) {
          card.classList.toggle('is-on', card.querySelector('input').checked);
        });
      };
    });
    q('xp-ing-add').onclick = function () {
      ingressos = lerIngressos();
      ingressos.push({ nome: '', preco: '', moeda: 'BRL', qtd: '', gratis: false, validade: 'sempre', inicio: '', fim: '' });
      pintarIngressos();
    };
    q('xp-copiar-dia').onclick = function () {
      var origem = lerDia(q('xp-dia-modelo').value);
      DIAS.forEach(function (dia) { escreverDia(dia[0], origem); });
    };
    form.querySelectorAll('.xp-hora__btn').forEach(function (btn) {
      var row = btn.closest('.xp-day');
      var attr = btn.hasAttribute('data-abre-btn') ? 'abre' : 'fecha';
      btn.onclick = function () { abrirHora(row, attr, btn); };
    });
    if (!window.__gcvHoraDoc) {
      window.__gcvHoraDoc = true;
      document.addEventListener('mousedown', function (ev) {
        var pop = document.querySelector('.xp-hora__pop');
        if (!pop || pop.hidden) return;
        if (pop.contains(ev.target)) return;
        if (ev.target.closest && ev.target.closest('.xp-hora__btn')) return;
        pop.hidden = true;
        document.querySelectorAll('.xp-hora__btn.is-open').forEach(function (b) { b.classList.remove('is-open'); });
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Escape') return;
        var pop = document.querySelector('.xp-hora__pop');
        if (!pop || pop.hidden) return;
        pop.hidden = true;
        document.querySelectorAll('.xp-hora__btn.is-open').forEach(function (b) { b.classList.remove('is-open'); });
      });
      window.addEventListener('resize', function () {
        var pop = document.querySelector('.xp-hora__pop');
        var btn = document.querySelector('.xp-hora__btn.is-open');
        if (!pop || pop.hidden || !btn) return;
        var r = btn.getBoundingClientRect();
        pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
        pop.style.top = (r.bottom + 6) + 'px';
      });
    }
    form.querySelectorAll('[data-fechado]').forEach(function (box) {
      box.onchange = function () { travarDia(box.closest('.xp-day')); };
      travarDia(box.closest('.xp-day'));
    });
    form.querySelectorAll('[data-estacao]').forEach(function (box) {
      box.onchange = function () {
        var tipo = box.getAttribute('data-estacao');
        var lista = tipo === 'ano' ? MESES.map(function (mes) { return mes[0]; }) : (tipo === 'seca' ? SECA : CHUVA);
        mesesTocados = true;
        MESES.forEach(function (mes) {
          if (lista.indexOf(mes[0]) >= 0) form.querySelector('[data-mes="' + mes[0] + '"]').checked = box.checked;
        });
        sincronizarEstacoes();
      };
    });
    form.querySelectorAll('[data-mes]').forEach(function (box) {
      box.onchange = function () { mesesTocados = true; sincronizarEstacoes(); };
    });
    form.querySelectorAll('[data-diff]').forEach(function (input) {
      input.addEventListener('input', atualizarSoma);
    });
    q('xp-img-add').onclick = function () {
      var url = q('xp-img-url').value.trim();
      if (!url) return;
      gallery.push({ url: url, alt_text: '' });
      q('xp-img-url').value = '';
      pintarGaleria();
    };
    q('xp-img-file').onchange = function () {
      var files = Array.prototype.slice.call(q('xp-img-file').files || []);
      files.forEach(function (file) {
        api.upload(file, function (err, res) {
          if (res && res.ok && res.data && res.data.url) {
            gallery.push({ url: res.data.url, media_id: res.data.id, alt_text: '' });
            pintarGaleria();
          } else {
            mostrarErro((res && res.error) || 'Não foi possível enviar a imagem.');
          }
        });
      });
      q('xp-img-file').value = '';
    };
    q('xp-cancel').onclick = function () { api.onCancel(); };
    q('xp-save').onclick = function () { salvar(''); };
    function pintarStatus() {
      var valor = q('xp-status').value || 'draft';
      form.querySelectorAll('[data-status]').forEach(function (btn) {
        var on = btn.getAttribute('data-status') === valor;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    var statusAntes = q('xp-status').value;
    q('xp-status').addEventListener('change', function () {
      var pedido = q('xp-status').value;
      var anterior = statusAntes;
      if (pedido === 'published') {
        var faltasStatus = faltasParaAtivar();
        if (faltasStatus.length) {
          q('xp-status').value = anterior;
          pintarStatus();
          mostrarErro(erroAtivar(faltasStatus));
          return;
        }
      }
      statusAntes = pedido;
      pintarStatus();
      mostrarErro('');
      salvar(pedido, function () {
        q('xp-status').value = anterior;
        statusAntes = anterior;
        pintarStatus();
      });
    });
    form.querySelectorAll('[data-status]').forEach(function (btn) {
      btn.onclick = function () {
        var proximo = btn.getAttribute('data-status');
        if (q('xp-status').value === proximo) return;
        statusAntes = q('xp-status').value;
        q('xp-status').value = proximo;
        q('xp-status').dispatchEvent(new Event('change'));
      };
    });
    pintarStatus();
    q('xp-publish').onclick = function () {
      var faltasPub = faltasParaAtivar();
      if (faltasPub.length) {
        mostrarErro(erroAtivar(faltasPub));
        return;
      }
      q('xp-status').value = 'published';
      statusAntes = 'published';
      pintarStatus();
      salvar('published');
    };
    form.querySelectorAll('.xp-peso input').forEach(function (radio) {
      radio.onchange = function () {
        form.querySelectorAll('.xp-peso').forEach(function (card) {
          card.classList.toggle('is-on', card.querySelector('input').checked);
        });
      };
    });
    function mediaPt(n) {
      var v = Math.round((Number(n) + Number.EPSILON) * 10) / 10;
      return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    function resumoDeste(g) {
      var slug = a.slug || '';
      var pessoas = 0;
      var passeios = 0;
      if (!slug) return { pessoas: 0, passeios: 0, media: 0 };
      (g.dias || []).forEach(function (dia) {
        var saidas = dia.saidas || [];
        if (saidas.length) {
          saidas.forEach(function (saida) {
            var tem = (saida.atrativos || []).some(function (item) { return item.slug === slug; });
            if (!tem) return;
            passeios += 1;
            pessoas += Number(saida.pessoas) || 0;
          });
          return;
        }
        (dia.atrativos || []).forEach(function (item) {
          if (item.slug !== slug) return;
          passeios += 1;
          pessoas += Number(item.pessoas) || 0;
        });
      });
      return { pessoas: pessoas, passeios: passeios, media: passeios ? pessoas / passeios : 0 };
    }
    function cartaoRank(temp, chave) {
      var cabeca = '<h3>' + esc((temp && temp.nome) || '') + '</h3><p class="xp-note">' + esc((temp && temp.periodo) || '') + '</p>';
      var lista = ((temp && temp.guias) || []).map(function (g) {
        var r = resumoDeste(g);
        return { nome: g.nome, foto: g.foto, pessoas: r.pessoas, passeios: r.passeios, media: r.media };
      }).filter(function (g) { return g.passeios > 0; });
      lista.sort(function (x, y) {
        return y.pessoas - x.pessoas || y.media - x.media || String(x.nome).localeCompare(String(y.nome), 'pt');
      });
      if (!lista.length) {
        return '<article class="xp-rank__card xp-rank__' + chave + '">' + cabeca + '<p class="xp-note">Nenhum guia conduziu este atrativo nesta temporada.</p></article>';
      }
      var head = '<th class="xp-rank__pos">#</th><th class="xp-rank__quem">Guia</th><th class="xp-rank__pontos" scope="col">Pessoas</th><th class="xp-rank__media" scope="col">Média por passeio</th>';
      var body = lista.map(function (g, i) {
        var lugar = i + 1;
      var podium = lugar === 1 ? ' is-1' : lugar === 2 ? ' is-2' : lugar === 3 ? ' is-3' : '';
        return '<tr class="' + podium.trim() + '"><th class="xp-rank__pos" scope="row">' + lugar + 'º</th>' +
          '<td class="xp-rank__quem"><div class="xp-rank__pessoa"><img src="' + esc(g.foto) + '" alt="" /><span>' + esc(g.nome) + '</span></div></td>' +
          '<td class="xp-rank__pontos">' + esc(String(g.pessoas)) + '</td>' +
          '<td class="xp-rank__media">' + esc(mediaPt(g.media)) + '</td></tr>';
      }).join('');
      return '<article class="xp-rank__card xp-rank__' + chave + '">' + cabeca +
        '<div class="xp-rank__scroll"><table class="xp-rank__table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div></article>';
    }
    function pintarRanking() {
      var box = q('xp-ranking');
      if (!box) return;
      fetch('/api/admin/ranking.php', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.ok || !res.data) {
            box.innerHTML = '<p class="xp-note">Não foi possível calcular o ranking.</p>';
            return;
          }
          box.innerHTML = '<p class="xp-note">Só este atrativo. A coluna Pessoas soma quem foi guiado pelo site e por fora. A média divide esse total pelo número de passeios. Cancelado não entra. Atualiza todo dia às 16h20.</p><div class="xp-rank">' +
            cartaoRank(res.data.xango, 'xango') + cartaoRank(res.data.oxum, 'oxum') + '</div>';
        })
        .catch(function () {
          box.innerHTML = '<p class="xp-note">Não foi possível calcular o ranking.</p>';
        });
    }

    pintarTags();
    pintarIngressos();
    pintarRanking();
    pintarGaleria();
    sincronizarEstacoes();
    atualizarSoma();
    if (api.onTitle) api.onTitle(a.title_pt || '');

    var tarifasLista = [];

    function preencherSelectTarifa(select) {
        var tipo = select.getAttribute('data-kind') === 'guia' ? 'guia' : 'translado';
      var atual = select.value || select.getAttribute('data-atual') || '';
      var vazio = select.hasAttribute('data-rel-trans') ? '— sem translado —' : '— escolher —';
      var html = '<option value="">' + vazio + '</option>';
        var achou = !atual;
      tarifasLista.filter(function (row) { return row.tipo === tipo; }).forEach(function (row) {
          if (row.codigo === atual) achou = true;
          html += '<option value="' + esc(row.codigo) + '"' + (row.codigo === atual ? ' selected' : '') + '>' + esc(rotuloTarifa(row)) + '</option>';
        });
        if (atual && !achou) html += '<option value="' + esc(atual) + '" selected>' + esc(atual) + '</option>';
        select.innerHTML = html;
        select.value = atual;
    }

    function atualizarSelectSaidas() {
      var usadas = {};
      form.querySelectorAll('#xp-saidas [data-city]').forEach(function (row) {
        usadas[row.getAttribute('data-city')] = true;
      });
      var sel = q('xp-saida-nova');
      var livres = catalogoSaida.filter(function (c) { return !usadas[c.key]; });
      sel.innerHTML = livres.length
        ? livres.map(function (c) { return '<option value="' + esc(c.key) + '">' + esc(c.nome) + '</option>'; }).join('')
        : '<option value="">Nenhuma cidade disponível</option>';
      q('xp-saida-add').disabled = !livres.length;
      var vazio = q('xp-saidas').querySelector('.xp-saida-vazia');
      var tem = q('xp-saidas').querySelector('[data-city]');
      if (!tem && !vazio) {
        q('xp-saidas').insertAdjacentHTML('afterbegin', '<p class="xp-note xp-saida-vazia">Nenhuma cidade de saída. Adicione uma cidade.</p>');
      }
      if (tem && vazio) vazio.remove();
    }

    function incluirCidade(nome) {
      var key = chaveCidade(nome);
      if (!key || catalogoSaida.some(function (c) { return c.key === key; })) return;
      catalogoSaida.push({ key: key, nome: nome });
    }

    q('xp-saida-add').onclick = function () {
      var key = q('xp-saida-nova').value;
      if (!key || form.querySelector('#xp-saidas [data-city="' + key + '"]')) return;
      q('xp-saidas').insertAdjacentHTML('beforeend', cartaoCidade(key));
      var row = form.querySelector('#xp-saidas [data-city="' + key + '"]');
      if (row) row.querySelectorAll('[data-kind]').forEach(preencherSelectTarifa);
      atualizarSelectSaidas();
    };
    q('xp-saidas').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-del-saida]') : null;
      if (!btn) return;
      var row = btn.closest('[data-city]');
      if (!row) return;
      row.remove();
      atualizarSelectSaidas();
    });
    atualizarSelectSaidas();
    fetch('/api/admin/cities.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var rows = (res && res.data && res.data.cities) || [];
        rows.forEach(function (c) {
          if (c && c.name && c.status !== 'archived') incluirCidade(String(c.name));
        });
        atualizarSelectSaidas();
      })
      .catch(function () { atualizarSelectSaidas(); });

    function avisarSeAtivaIncompleta() {
      if (q('xp-status').value !== 'published' || a.status === 'published') return;
      var faltasAbertas = faltasParaAtivar();
      if (faltasAbertas.length) mostrarErro(erroAtivar(faltasAbertas) + ' Rascunho e Desativada salvam sem isso.');
    }

    var catalogoRel = [];
    var lixoRel = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2h4V4h-4v1zM6 9h2v10H6V9zm5 0h2v10h-2V9zm5 0h2v10h-2V9zM5 20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8H5v12z"/></svg>';

    function outrosDoPasseio(tour) {
      return (tour.attractions || []).filter(function (p) { return Number(p.id) !== Number(a.id); });
    }

    function horasDoPasseio(tour) {
      var n = parseInt(tour && tour.duration_minutes, 10) || 0;
      if (n <= 0) return '';
      var h = Math.round(n / 60);
      return String(h > 0 ? h : 1);
    }

    function opcoesExperiencia(atual) {
      var html = '<option value="">— escolher —</option>';
      catalogoRel.forEach(function (item) {
        html += '<option value="' + item.id + '"' + (String(item.id) === String(atual) ? ' selected' : '') + '>' + esc(item.title_pt) + '</option>';
      });
      if (atual && !catalogoRel.some(function (item) { return String(item.id) === String(atual); })) {
        html += '<option value="' + esc(atual) + '" selected>Experiência ' + esc(atual) + '</option>';
      }
      return html;
    }

    function linhaRelHtml(tour) {
      var outros = tour ? outrosDoPasseio(tour) : [];
      var qtd = outros.length > 1 ? 2 : 1;
      var exp1 = outros[0] ? outros[0].id : '';
      var exp2 = outros[1] ? outros[1].id : '';
      var id = tour && tour.id ? tour.id : '';
      var guia = tour && tour.tarifa_guia ? tour.tarifa_guia : '';
      var trans = tour && tour.tarifa_translado ? tour.tarifa_translado : '';
      return '<article class="xp-rel" data-rel="' + esc(id) + '">' +
        '<div class="xp-rel__grid' + (qtd > 1 ? ' is-2' : '') + '">' +
        '<label><span>Qtd</span><select class="gcv-dash-select" data-rel-qtd aria-label="Quantidade de experiências relacionadas">' +
        '<option value="1"' + (qtd === 1 ? ' selected' : '') + '>1</option>' +
        '<option value="2"' + (qtd === 2 ? ' selected' : '') + '>2</option></select></label>' +
        '<label><span>Experiência 1</span><select class="gcv-dash-select" data-rel-exp="0" aria-label="Experiência 1">' + opcoesExperiencia(exp1) + '</select></label>' +
        '<label data-rel-col="1"' + (qtd > 1 ? '' : ' hidden') + '><span>Experiência 2</span><select class="gcv-dash-select" data-rel-exp="1" aria-label="Experiência 2">' + opcoesExperiencia(exp2) + '</select></label>' +
        '<label><span>Tarifa Guia</span><select class="gcv-dash-select" data-kind="guia" data-rel-guia data-atual="' + esc(guia) + '" aria-label="Tarifa Guia"><option value="">— escolher —</option></select></label>' +
        '<label><span>Tarifa Translado</span><select class="gcv-dash-select" data-kind="trans" data-rel-trans data-atual="' + esc(trans) + '" aria-label="Tarifa Translado"><option value="">— sem translado —</option></select></label>' +
        '<label><span>Duração do passeio</span><span class="xp-dur"><input class="gcv-dash-input" data-rel-horas inputmode="numeric" value="' + esc(tour ? horasDoPasseio(tour) : '') + '" aria-label="Duração do passeio em horas" /> h</span></label>' +
        '<button type="button" class="xp-rel__del" data-rel-del aria-label="Excluir relacionamento">' + lixoRel + '</button>' +
        '</div></article>';
    }

    function pintarRelacionados() {
      var box = q('xp-rels');
      if (!box) return;
      box.innerHTML = tours.length
        ? tours.map(linhaRelHtml).join('')
        : '';
      box.querySelectorAll('[data-kind]').forEach(preencherSelectTarifa);
      box.querySelectorAll('.xp-rel').forEach(ligarLinhaRel);
    }

    function idsDaLinha(row) {
      var qtd = parseInt(row.querySelector('[data-rel-qtd]').value, 10) || 1;
      var ids = [];
      var i;
      for (i = 0; i < qtd; i++) {
        var v = parseInt(row.querySelector('[data-rel-exp="' + i + '"]').value, 10);
        if (v) ids.push(v);
      }
      return ids;
    }

    function linhaRelPronta(row) {
      var qtd = parseInt(row.querySelector('[data-rel-qtd]').value, 10) || 1;
      var ids = idsDaLinha(row);
      if (ids.length !== qtd) return false;
      return ids.length === new Set(ids).size && ids.indexOf(Number(a.id)) < 0;
    }

    function nomeLinha(row) {
      var nomes = [a.title_pt || 'Esta experiência'];
      idsDaLinha(row).forEach(function (id) {
        var item = catalogoRel.filter(function (x) { return Number(x.id) === id; })[0];
        nomes.push(item ? item.title_pt : ('Experiência ' + id));
      });
      return nomes.join(' + ');
    }

    function salvarLinhaRel(row) {
      row._fila = (row._fila || Promise.resolve()).catch(function () { return null; }).then(function () {
        return enviarLinhaRel(row);
      });
    }

    function enviarLinhaRel(row) {
      if (!a.id) {
        mostrarErro('Salve a experiência antes de criar o relacionamento.');
        return;
      }
      if (!linhaRelPronta(row)) return;
      var parceiros = idsDaLinha(row);
      if (parceiros.length !== new Set(parceiros).size) {
        mostrarErro('Escolha experiências diferentes no mesmo passeio.');
        return;
      }
      var ids = [Number(a.id)].concat(parceiros);
      var assinatura = ids.slice().sort(function (x, y) { return x - y; }).join('-');
      var repetida = false;
      q('xp-rels').querySelectorAll('.xp-rel').forEach(function (outra) {
        if (outra === row || !linhaRelPronta(outra)) return;
        var outras = [Number(a.id)].concat(idsDaLinha(outra)).sort(function (x, y) { return x - y; }).join('-');
        if (outras === assinatura) repetida = true;
      });
      if (repetida) {
        mostrarErro('Esse passeio já está na lista.');
        return;
      }
      var payload = {
        attraction_ids: ids,
        tarifa_guia: (row.querySelector('[data-rel-guia]') || {}).value || '',
        tarifa_translado: (row.querySelector('[data-rel-trans]') || {}).value || ''
      };
      var horas = row.querySelector('[data-rel-horas]');
      if (horas && horas.hasAttribute('data-touched')) payload.horas = horas.value.trim();
      var antigo = row.getAttribute('data-rel') || '';
      return fetch('/api/admin/related-tours.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res || !res.ok || !res.data) {
          mostrarErro((res && res.error) || 'Não foi possível salvar o passeio.');
          return;
        }
        var novo = String(res.data.id || '');
        row.setAttribute('data-rel', novo);
        if (horas && res.data.duration_minutes) horas.value = horasDoPasseio(res.data);
        var idx = tours.findIndex(function (t) { return String(t.id) === antigo || String(t.id) === novo; });
        if (idx >= 0) tours[idx] = res.data;
        else tours.push(res.data);
        if (antigo && antigo !== novo) {
          fetch('/api/admin/related-tours.php', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(antigo, 10) })
          });
          tours = tours.filter(function (t) { return String(t.id) !== antigo; });
        }
        mostrarErro('');
      }).catch(function () {
        mostrarErro('Não foi possível salvar o passeio.');
      });
    }

    function ligarLinhaRel(row) {
      function ajustarQtd() {
        var qtd = parseInt(row.querySelector('[data-rel-qtd]').value, 10) || 1;
        var grade = row.querySelector('.xp-rel__grid');
        var col = row.querySelector('[data-rel-col="1"]');
        if (grade) grade.classList.toggle('is-2', qtd > 1);
        if (col) col.hidden = qtd < 2;
        if (qtd < 2) {
          var segundo = row.querySelector('[data-rel-exp="1"]');
          if (segundo) segundo.value = '';
        }
      }
      row.querySelector('[data-rel-qtd]').onchange = function () {
        ajustarQtd();
        salvarLinhaRel(row);
      };
      row.querySelectorAll('[data-rel-exp]').forEach(function (sel) {
        sel.onchange = function () { salvarLinhaRel(row); };
      });
      row.querySelectorAll('[data-rel-guia], [data-rel-trans]').forEach(function (sel) {
        sel.onchange = function () { salvarLinhaRel(row); };
      });
      var horas = row.querySelector('[data-rel-horas]');
      horas.onchange = function () {
        horas.setAttribute('data-touched', '1');
        salvarLinhaRel(row);
      };
      row.querySelector('[data-rel-del]').onclick = function () {
        var id = row.getAttribute('data-rel');
        var pedir = function (ok) {
          if (!ok) return;
          if (!id) {
            row.remove();
            return;
          }
          fetch('/api/admin/related-tours.php', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(id, 10) })
          }).then(function (r) { return r.json(); }).then(function (res) {
            if (!res || !res.ok) {
              mostrarErro((res && res.error) || 'Não foi possível excluir o passeio.');
              return;
            }
            tours = tours.filter(function (t) { return String(t.id) !== String(id); });
            row.remove();
          }).catch(function () {
            mostrarErro('Não foi possível excluir o passeio.');
          });
        };
        var msg = 'Excluir o passeio\n' + nomeLinha(row) + '?';
        if (typeof global.gcvConfirm === 'function') {
          global.gcvConfirm(msg, { danger: true, okText: 'Excluir' }).then(pedir);
          return;
        }
        pedir(global.confirm(msg));
      };
    }

    q('xp-rel-add').onclick = function () {
      if (!a.id) {
        mostrarErro('Salve a experiência antes de criar o relacionamento.');
        return;
      }
      var box = q('xp-rels');
      box.insertAdjacentHTML('beforeend', linhaRelHtml(null));
      var row = box.lastElementChild;
      row.querySelectorAll('[data-kind]').forEach(preencherSelectTarifa);
      ligarLinhaRel(row);
      var primeiro = row.querySelector('[data-rel-exp="0"]');
      if (primeiro) primeiro.focus();
    };

    pintarRelacionados();
    fetch('/api/admin/attractions.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var rows = (res && res.data && (res.data.attractions || res.data)) || [];
        if (!Array.isArray(rows)) rows = [];
        catalogoRel = rows.filter(function (item) {
          return item && item.id && Number(item.id) !== Number(a.id) && String(item.title_pt || '').indexOf(' + ') < 0;
        }).sort(function (x, y) {
          return String(x.title_pt || '').localeCompare(String(y.title_pt || ''), 'pt');
        });
        pintarRelacionados();
      })
      .catch(function () { pintarRelacionados(); });

    api.loadTarifas(function (lista) {
      tarifasLista = lista || [];
      form.querySelectorAll('[data-kind]').forEach(preencherSelectTarifa);
      avisarSeAtivaIncompleta();
    });
  }

  global.GcvExperiencia = { mount: mount };
})(window);

/* Painel do anfitrião: aprovação, WhatsApp, financeiro de ingressos e venda. */
(function () {
  'use strict';

  function porta() {
    try {
      return new URLSearchParams(location.search).get('as') || sessionStorage.getItem('gcv_porta') || '';
    } catch (e) {
      return '';
    }
  }

  function comPorta(url) {
    var as = porta();
    if (!as || url.indexOf('as=') >= 0) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'as=' + encodeURIComponent(as);
  }

  function pedir(method, url, body, cb) {
    var opts = { method: method, headers: { Accept: 'application/json' } };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    opts.cache = 'no-store';
    fetch(comPorta(url), opts)
      .then(function (r) { return r.json(); })
      .then(function (data) { cb(null, data); })
      .catch(function (err) { cb(err || new Error('falha')); });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function reais(cents) {
    var n = (parseInt(cents, 10) || 0) / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function dataBr(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    if (p.length !== 3) return iso || '';
    return p[2] + '/' + p[1];
  }

  function planoNome(plano) {
    if (plano === 'premium') return 'Premium 15%';
    if (plano === 'padrao') return 'Padrão 8%';
    return 'Sem custo';
  }

  function statusNome(status) {
    if (status === 'active') return 'Aprovado';
    if (status === 'rejected') return 'Recusado';
    return 'Aguardando';
  }

  function vendaVazia(venda, temPasseio) {
    var v = venda && typeof venda === 'object' ? venda : {};
    var pausa = v.pausa && typeof v.pausa === 'object' ? v.pausa : {};
    var prem = v.premiacao && typeof v.premiacao === 'object' ? v.premiacao : {};
    var xango = prem.xango && typeof prem.xango === 'object' ? prem.xango : {};
    var oxum = prem.oxum && typeof prem.oxum === 'object' ? prem.oxum : {};
    return {
      max_dia: v.max_dia || '',
      sem_passeio: temPasseio === false || !!v.sem_passeio,
      inicio: pausa.inicio || '',
      fim: pausa.fim || '',
      modo: pausa.modo === 'aviso' ? 'aviso' : 'ocultar',
      mensagem: pausa.mensagem || '',
      bloqueados: Array.isArray(v.guias_bloqueados) ? v.guias_bloqueados : [],
      xango: xango,
      oxum: oxum
    };
  }

  function premio(obj, lugar) {
    return esc(obj && obj[lugar] ? obj[lugar] : '');
  }

  function htmlVenda(state, prefix) {
    var p = prefix || 'vd';
    var chips = (state.bloqueados || []).map(function (g) {
      return '<button type="button" class="fin-chip" data-guia="' + esc(g.id) + '">' + esc(g.nome || 'Guia') + ' <span aria-hidden="true">×</span></button>';
    }).join('');
    function lugares(nome, obj) {
      return '<div class="fin-premio"><h4>' + nome + '</h4>' +
        '<label><span>1º lugar</span><input class="gcv-dash-input" data-premio="' + p + '" data-temp="' + (nome === 'Fogo' ? 'xango' : 'oxum') + '" data-lugar="primeiro" value="' + premio(obj, 'primeiro') + '" placeholder="O que o 1º guia recebe" /></label>' +
        '<label><span>2º lugar</span><input class="gcv-dash-input" data-premio="' + p + '" data-temp="' + (nome === 'Fogo' ? 'xango' : 'oxum') + '" data-lugar="segundo" value="' + premio(obj, 'segundo') + '" placeholder="O que o 2º guia recebe" /></label>' +
        '<label><span>3º lugar</span><input class="gcv-dash-input" data-premio="' + p + '" data-temp="' + (nome === 'Fogo' ? 'xango' : 'oxum') + '" data-lugar="terceiro" value="' + premio(obj, 'terceiro') + '" placeholder="O que o 3º guia recebe" /></label></div>';
    }
    return '<div class="fin-venda" data-venda="' + p + '">' +
      '<label class="xp-field"><span>Máximo de ingressos por dia</span><input class="gcv-dash-input" id="' + p + '-max" inputmode="numeric" value="' + esc(state.max_dia) + '" /></label>' +
      '<label class="xp-check"><input type="checkbox" id="' + p + '-sem"' + (state.sem_passeio ? ' checked' : '') + ' /> Cancelar este atrativo para venda de passeio</label>' +
      '<h4 class="fin-sub">Fora do site neste período</h4>' +
      '<div class="fin-datas"><label><span>De</span><input class="gcv-dash-input" type="date" id="' + p + '-ini" value="' + esc(state.inicio) + '" /></label>' +
      '<label><span>Até</span><input class="gcv-dash-input" type="date" id="' + p + '-fim" value="' + esc(state.fim) + '" /></label></div>' +
      '<div class="fin-modos">' +
      '<label class="xp-check"><input type="radio" name="' + p + '-modo" value="ocultar"' + (state.modo !== 'aviso' ? ' checked' : '') + ' /> Ocultar a página no período</label>' +
      '<label class="xp-check"><input type="radio" name="' + p + '-modo" value="aviso"' + (state.modo === 'aviso' ? ' checked' : '') + ' /> Deixar um aviso na página</label></div>' +
      '<label class="xp-field"><span>Mensagem de aviso</span><textarea class="gcv-dash-input" id="' + p + '-msg" rows="3" placeholder="Texto que o visitante vê se você escolher o aviso">' + esc(state.mensagem) + '</textarea></label>' +
      '<h4 class="fin-sub">Guia bloqueado neste passeio</h4>' +
      '<p class="xp-note">O guia bloqueado não publica nem é atribuído a este passeio no site. O ranking continua contando só quem concluiu.</p>' +
      '<div class="fin-inline"><select class="gcv-dash-select" id="' + p + '-guia"><option value="">Escolha um guia ativo</option></select>' +
      '<button type="button" class="gcv-dash-btn" id="' + p + '-bloquear">Bloquear</button></div>' +
      '<div class="fin-chips" id="' + p + '-chips">' + chips + '</div>' +
      '<h4 class="fin-sub">Premiação oferecida na temporada</h4>' +
      '<p class="xp-note">É o prêmio prometido ao 1º, 2º e 3º. O pódio em si continua calculado por pessoa concluída: Fogo na seca e Água nas águas.</p>' +
      '<div class="fin-premios">' + lugares('Fogo', state.xango) + lugares('Água', state.oxum) + '</div></div>';
  }

  function lerVenda(root, prefix) {
    var p = prefix || 'vd';
    var box = root.querySelector('[data-venda="' + p + '"]') || root;
    function val(id) {
      var el = box.querySelector('#' + id);
      return el ? String(el.value || '').trim() : '';
    }
    var modoEl = box.querySelector('input[name="' + p + '-modo"]:checked');
    var bloqueados = [];
    box.querySelectorAll('#' + p + '-chips .fin-chip').forEach(function (chip) {
      bloqueados.push({ id: parseInt(chip.getAttribute('data-guia'), 10) || 0, nome: chip.textContent.replace('×', '').trim() });
    });
    function premioDe(temp) {
      var out = {};
      box.querySelectorAll('[data-premio="' + p + '"][data-temp="' + temp + '"]').forEach(function (input) {
        out[input.getAttribute('data-lugar')] = input.value.trim();
      });
      return out;
    }
    var maxRaw = val(p + '-max');
    var inicio = val(p + '-ini');
    var fim = val(p + '-fim');
    var modo = modoEl ? modoEl.value : 'ocultar';
    var mensagem = val(p + '-msg');
    if (maxRaw !== '' && (parseInt(maxRaw, 10) || 0) < 1) return { erro: 'O máximo de ingressos por dia precisa ser pelo menos 1.' };
    if ((inicio && !fim) || (!inicio && fim)) return { erro: 'Informe o começo e o fim do período.' };
    if (inicio && fim && fim < inicio) return { erro: 'O fim do período precisa ser igual ou depois do começo.' };
    if (inicio && modo === 'aviso' && !mensagem) return { erro: 'Escreva a mensagem de aviso ou escolha ocultar a página.' };
    var sem = box.querySelector('#' + p + '-sem');
    return {
      tem_passeio: !(sem && sem.checked),
      venda: {
        max_dia: maxRaw === '' ? '' : parseInt(maxRaw, 10),
        sem_passeio: !!(sem && sem.checked),
        pausa: { inicio: inicio, fim: fim, modo: modo, mensagem: mensagem },
        guias_bloqueados: bloqueados.filter(function (g) { return g.id; }),
        premiacao: { xango: premioDe('xango'), oxum: premioDe('oxum') }
      }
    };
  }

  function ligarCalendario(box, prefixo) {
    if (typeof window.gcvBindDatePicker !== 'function') return;
    ['ini', 'fim'].forEach(function (qual) {
      var input = box.querySelector('#' + prefixo + '-' + qual);
      if (!input) return;
      window.gcvBindDatePicker(input, {
        beforeOpen: function () {
          var outro = box.querySelector('#' + prefixo + '-' + (qual === 'ini' ? 'fim' : 'ini'));
          var limite = outro && outro.value ? outro.value : '';
          if (qual === 'ini') input.max = limite;
          else input.min = limite;
        }
      });
    });
  }

  function bindVenda(root, prefix, guias, bloqueados) {
    var p = prefix || 'vd';
    ligarCalendario(root, p);
    var sel = root.querySelector('#' + p + '-guia');
    var chips = root.querySelector('#' + p + '-chips');
    if (!sel || !chips) return;
    var usados = {};
    (bloqueados || []).forEach(function (g) { usados[String(g.id)] = true; });
    (guias || []).forEach(function (g) {
      if (usados[String(g.id)]) return;
      var op = document.createElement('option');
      op.value = String(g.id);
      op.textContent = g.nome;
      sel.appendChild(op);
    });
    var btn = root.querySelector('#' + p + '-bloquear');
    if (btn) btn.onclick = function () {
      var id = sel.value;
      if (!id) return;
      var nome = sel.options[sel.selectedIndex].textContent;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'fin-chip';
      chip.setAttribute('data-guia', id);
      chip.innerHTML = esc(nome) + ' <span aria-hidden="true">×</span>';
      chips.appendChild(chip);
      sel.remove(sel.selectedIndex);
      sel.value = '';
    };
    chips.onclick = function (e) {
      var chip = e.target.closest('.fin-chip');
      if (!chip) return;
      var op = document.createElement('option');
      op.value = chip.getAttribute('data-guia');
      op.textContent = chip.textContent.replace('×', '').trim();
      sel.appendChild(op);
      chip.remove();
    };
  }

  function pintarFinanceiro(root, data, voltar) {
    if (!root) return;
    if (!data || data.aguardando) {
      root.innerHTML = '<div class="fin-espera"><h2>Financeiro fechado</h2><p>O admin ainda não aprovou este anfitrião. O aviso já foi para o WhatsApp. Ingressos, provisão e lotação abrem depois da aprovação.</p></div>';
      return;
    }
    var r = data.resumo || {};
    var prev = data.previsao || {};
    var barras = (data.lotacao || []).map(function (dia) {
      var pct = dia.max ? Math.min(100, Math.round((dia.qtd / dia.max) * 100)) : 0;
      return '<div class="fin-bar"><span>' + dataBr(dia.data) + '</span><div><i style="width:' + pct + '%"></i></div><strong>' + dia.qtd + '/' + dia.max + '</strong></div>';
    }).join('');
    var linhas = (data.extrato || []).map(function (l) {
      return '<tr data-meio="' + esc(l.meio) + '" data-sit="' + esc(l.situacao) + '">' +
        '<td>' + dataBr(l.data) + '</td><td>' + esc(l.rotulo) + '</td><td>' + l.qtd + '</td>' +
        '<td>' + reais(l.bruto) + '</td><td>' + (l.desconto ? reais(l.desconto) : '—') + '</td>' +
        '<td>' + reais(l.taxa) + '</td><td>' + reais(l.receber) + '</td><td>' + dataBr(l.pagamento) + '</td>' +
        '<td><span class="fin-pill fin-pill--' + esc(l.situacao) + '">' + (l.situacao === 'liquidado' ? 'Liquidado' : 'Provisão') + '</span></td></tr>';
    }).join('');
    root.innerHTML =
      '<div class="fin">' +
      (voltar ? '<button type="button" class="gcv-dash-btn" id="fin-voltar">Voltar aos anfitriões</button>' : '') +
      '<header class="fin-head"><div><p class="fin-kicker">' + esc(data.experiencia || '') + ' · ' + planoNome(data.plano) + '</p>' +
      '<h2>Financeiro de ingressos</h2></div><p class="fin-regras">' + esc(data.regras || '') + '</p></header>' +
      '<div class="fin-kpis">' +
      kpi('Lotação do mês', (r.ocupacao_pct || 0) + '%', r.vendidos_mes + ' de ' + r.capacidade_mes + ' ingressos') +
      kpi('Descontos', reais(r.desconto_mes), 'Meia-entrada já abatida no mês') +
      kpi('A receber', reais(r.provisao), 'Ainda em provisão') +
      kpi('Já liquidado', reais(r.liquidado), 'Caiu na data prevista') +
      '</div>' +
      '<div class="fin-grid">' +
      '<section class="fin-card"><h3>Lotação dos últimos 7 dias</h3>' + barras +
      '<div class="fin-forecast"><p><strong>' + prev.media_dia + '</strong> ingressos por dia, em média</p>' +
      '<p>Próximos 7 dias: <strong>' + prev.proximos_7 + '</strong> previstos, teto de <strong>' + prev.capacidade_7 + '</strong>. Folga de <strong>' + prev.folga + '</strong>.</p></div></section>' +
      '<section class="fin-card"><h3>Provisão por meio</h3>' +
      meio('Cartão nacional', 'D+30', r.nacional_provisao, r.nacional_liquidado) +
      meio('Cartão internacional', 'D+14', r.internacional_provisao, r.internacional_liquidado) +
      meio('PIX e meia-entrada', 'D+1', 0, r.pix_liquidado) +
      '<p class="xp-note">Taxa do plano neste mês: ' + reais(r.taxa_mes) + ' sobre o líquido. Bruto do mês: ' + reais(r.bruto_mes) + '.</p></section></div>' +
      '<section class="fin-card"><div class="fin-extrato-head"><h3>Extrato</h3><div class="fin-filtros" role="tablist">' +
      filtro('todos', 'Tudo', true) + filtro('provisao', 'Provisão') + filtro('liquidado', 'Liquidado') +
      filtro('nacional', 'Nacional') + filtro('internacional', 'Internacional') + filtro('pix', 'PIX') +
      '</div></div><div class="fin-table-wrap"><table class="fin-table"><thead><tr>' +
      '<th>Venda</th><th>Meio</th><th>Qtd</th><th>Bruto</th><th>Desconto</th><th>Taxa</th><th>Líquido</th><th>Pagamento</th><th>Situação</th>' +
      '</tr></thead><tbody>' + (linhas || '<tr><td colspan="9">Nenhuma venda de ingresso ainda.</td></tr>') + '</tbody></table></div></section></div>';

    var voltarBtn = root.querySelector('#fin-voltar');
    if (voltarBtn && voltar) voltarBtn.onclick = voltar;
    root.querySelectorAll('[data-filtro]').forEach(function (btn) {
      btn.onclick = function () {
        root.querySelectorAll('[data-filtro]').forEach(function (el) { el.classList.toggle('is-on', el === btn); });
        var filtroNome = btn.getAttribute('data-filtro');
        root.querySelectorAll('.fin-table tbody tr').forEach(function (tr) {
          var meio = tr.getAttribute('data-meio');
          var sit = tr.getAttribute('data-sit');
          var ok = filtroNome === 'todos'
            || filtroNome === sit
            || (filtroNome === 'pix' && (meio === 'pix' || meio === 'meia'))
            || filtroNome === meio;
          tr.hidden = !ok;
        });
      };
    });
  }

  function kpi(titulo, valor, nota) {
    return '<article class="fin-kpi"><span>' + titulo + '</span><strong>' + valor + '</strong><small>' + nota + '</small></article>';
  }

  function meio(titulo, prazo, provisao, liquidado) {
    return '<div class="fin-meio"><div><strong>' + titulo + '</strong><span>' + prazo + '</span></div>' +
      '<p>Provisão ' + reais(provisao) + '</p><p>Liquidado ' + reais(liquidado) + '</p></div>';
  }

  function filtro(id, label, on) {
    return '<button type="button" class="fin-filtro' + (on ? ' is-on' : '') + '" data-filtro="' + id + '">' + label + '</button>';
  }

  function pintarAdmin(root) {
    if (!root) return;
    root.innerHTML = '<p class="xp-note">Carregando anfitriões…</p>';
    pedir('GET', '/api/admin/anfitrioes.php', null, function (err, res) {
      if (err || !res || !res.ok) {
        root.innerHTML = '<p class="xp-erro">Não foi possível carregar os anfitriões.</p>';
        return;
      }
      desenharLista(root, res.data || {});
    });
  }

  function desenharLista(root, data) {
    var hosts = data.anfitrioes || [];
    var wa = data.whatsapp || [];
    var cards = hosts.map(function (h) {
      var acoes = '';
      if (h.status === 'pending') {
        acoes = '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" data-aprovar="' + h.id + '">Aprovar</button>' +
          '<button type="button" class="gcv-dash-btn" data-recusar="' + h.id + '">Recusar</button>';
      } else if (h.status === 'active') {
        acoes = '<button type="button" class="gcv-dash-btn" data-fin="' + h.id + '">Ver financeiro</button>';
      }
      return '<article class="fin-host"><div><strong>' + esc(h.nome) + '</strong><span class="fin-pill fin-pill--' + esc(h.status || 'pending') + '">' + statusNome(h.status) + '</span>' +
        '<p>' + esc(h.email) + ' · ' + esc(h.telefone) + '</p><p>' + esc(h.experiencia || 'Experiência a definir') + '</p></div><div class="fin-host__acoes">' + acoes + '</div></article>';
    }).join('');
    var log = wa.map(function (item) {
      var dest = item.para === 'admin' ? 'WhatsApp do admin' : esc(item.para);
      return '<li><span>' + dest + '</span><p>' + esc(item.texto) + '</p></li>';
    }).join('');
    root.innerHTML =
      '<div class="fin-admin">' +
      '<form class="fin-card" id="fin-novo"><h3>Registrar anfitrião</h3>' +
      '<p class="xp-note">O cadastro nasce aguardando. O admin recebe o aviso no WhatsApp e o anfitrião não vê o financeiro até a aprovação.</p>' +
      '<div class="fin-form">' +
      '<label><span>Nome</span><input class="gcv-dash-input" name="nome" required /></label>' +
      '<label><span>E-mail</span><input class="gcv-dash-input" name="email" type="email" required /></label>' +
      '<label><span>WhatsApp</span><input class="gcv-dash-input" name="telefone" inputmode="tel" placeholder="62999999999" required /></label>' +
      '<label><span>Experiência</span><input class="gcv-dash-input" name="experiencia" placeholder="Nome do atrativo" /></label></div>' +
      '<p class="xp-erro" id="fin-novo-erro" hidden></p>' +
      '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">Registrar e avisar</button></form>' +
      '<section class="fin-card"><h3>Cadastros</h3><div class="fin-hosts">' + (cards || '<p>Nenhum anfitrião ainda.</p>') + '</div></section>' +
      '<section class="fin-card"><h3>WhatsApp enviado</h3><ul class="fin-wa">' + (log || '<li><p>Nenhum aviso ainda.</p></li>') + '</ul></section></div>';

    var form = root.querySelector('#fin-novo');
    form.onsubmit = function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var erro = root.querySelector('#fin-novo-erro');
      erro.hidden = true;
      pedir('POST', '/api/admin/anfitrioes.php', {
        nome: fd.get('nome'),
        email: fd.get('email'),
        telefone: fd.get('telefone'),
        experiencia: fd.get('experiencia')
      }, function (err2, res2) {
        if (err2 || !res2 || !res2.ok) {
          erro.textContent = (res2 && res2.error) || 'Não foi possível registrar.';
          erro.hidden = false;
          return;
        }
        desenharLista(root, res2.data || {});
      });
    };
    root.querySelectorAll('[data-aprovar], [data-recusar]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-aprovar') || btn.getAttribute('data-recusar');
        var action = btn.hasAttribute('data-aprovar') ? 'aprovar' : 'recusar';
        pedir('PUT', '/api/admin/anfitrioes.php', { id: parseInt(id, 10), action: action }, function (err2, res2) {
          if (res2 && res2.ok) desenharLista(root, res2.data || {});
        });
      };
    });
    root.querySelectorAll('[data-fin]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-fin');
        root.innerHTML = '<p class="xp-note">Abrindo o financeiro…</p>';
        pedir('GET', '/api/anfitriao/financeiro.php?id=' + encodeURIComponent(id), null, function (err2, res2) {
          if (err2 || !res2 || !res2.ok) {
            root.innerHTML = '<p class="xp-erro">Não foi possível abrir o financeiro.</p>';
            return;
          }
          pintarFinanceiro(root, res2.data, function () { pintarAdmin(root); });
        });
      };
    });
  }

  function openFinance() {
    var root = document.getElementById('host-finance-root');
    if (!root) return;
    root.innerHTML = '<p class="xp-note">Carregando o financeiro…</p>';
    pedir('GET', '/api/anfitriao/financeiro.php', null, function (err, res) {
      if (err || !res || !res.ok) {
        root.innerHTML = '<p class="xp-erro">Não foi possível abrir o financeiro.</p>';
        return;
      }
      pintarFinanceiro(root, res.data, null);
    });
  }

  function openVenda() {
    var root = document.getElementById('host-venda-root');
    if (!root) return;
    root.innerHTML = '<p class="xp-note">Carregando a venda…</p>';
    pedir('GET', '/api/anfitriao/venda.php', null, function (err, res) {
      if (err || !res || !res.ok || !res.data || res.data.aguardando) {
        root.innerHTML = '<div class="fin-espera"><h2>Venda fechada</h2><p>Aguarde a aprovação. O admin já foi avisado no WhatsApp.</p></div>';
        return;
      }
      var atra = res.data.atrativo || {};
      var state = vendaVazia(res.data.venda, atra.tem_passeio !== false);
      root.innerHTML = '<div class="fin-card"><h3>' + esc(atra.title_pt || res.data.anfitriao.experiencia || 'Sua experiência') + '</h3>' +
        '<p class="xp-erro" id="hv-erro" hidden></p>' +
        htmlVenda(state, 'hv') +
        '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" id="hv-save">Salvar venda</button></div>';
      bindVenda(root, 'hv', res.data.guias || [], state.bloqueados);
      root.querySelector('#hv-save').onclick = function () {
        var out = lerVenda(root, 'hv');
        var erro = root.querySelector('#hv-erro');
        if (out.erro) {
          erro.textContent = out.erro;
          erro.hidden = false;
          return;
        }
        erro.hidden = true;
        pedir('PUT', '/api/anfitriao/venda.php', out, function (err2, res2) {
          if (err2 || !res2 || !res2.ok) {
            erro.textContent = (res2 && res2.error) || 'Não foi possível salvar.';
            erro.hidden = false;
            return;
          }
          erro.textContent = 'Venda salva.';
          erro.hidden = false;
          erro.style.color = '#0f3d2e';
        });
      };
    });
  }

  function casa(n) {
    var v = Math.round((Number(n) + Number.EPSILON) * 10) / 10;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function premioLugar(prem, lugar) {
    if (!prem) return '';
    if (lugar === 1) return prem.primeiro || '';
    if (lugar === 2) return prem.segundo || '';
    if (lugar === 3) return prem.terceiro || '';
    return '';
  }

  function filtrarRanking(data, slugs, cidade) {
    var lista = Array.isArray(slugs) ? slugs : [];
    var cidadeKey = cidade && cidade !== 'chapada' ? cidade : '';
    if (!lista.length) {
      return { xango: { nome: data.xango.nome, periodo: data.xango.periodo, guias: [] }, oxum: { nome: data.oxum.nome, periodo: data.oxum.periodo, guias: [] } };
    }
    var quer = {};
    lista.forEach(function (slug) { quer[slug] = true; });
    function uma(temp) {
      var guias = ((temp && temp.guias) || []).map(function (g) {
        var pontos = 0;
        var pessoas = 0;
        var dias = [];
        (g.dias || []).forEach(function (dia) {
          var grupos = (dia.saidas || []).map(function (saida) {
            if (cidadeKey && saida.cidade !== cidadeKey) return null;
            var atrativos = (saida.atrativos || []).filter(function (item) { return quer[item.slug]; });
            if (!atrativos.length) return null;
            var pts = 0;
            atrativos.forEach(function (item) { pts += item.pontos; });
            return { pessoas: saida.pessoas, pontos: pts, atrativos: atrativos };
          }).filter(Boolean);
          if (!grupos.length) return;
          var diaPessoas = 0;
          var diaPontos = 0;
          var atrativos = [];
          grupos.forEach(function (grupo) {
            diaPessoas += grupo.pessoas;
            diaPontos += grupo.pontos;
            atrativos = atrativos.concat(grupo.atrativos);
          });
          pontos += diaPontos;
          pessoas += diaPessoas;
          dias.push({ data: dia.data, grupos: grupos.length, pessoas: diaPessoas, pontos: diaPontos, atrativos: atrativos });
        });
        if (!dias.length) return null;
        return {
          id: g.id,
          nome: g.nome,
          foto: g.foto,
          cidade: g.cidade || '',
          pontos: pontos,
          pessoas: pessoas,
          dias_guiados: dias.length,
          media_dia: casa(pessoas / dias.length),
          dias: dias
        };
      }).filter(Boolean);
      guias.sort(function (a, b) {
        return b.pontos - a.pontos || b.pessoas - a.pessoas || String(a.nome).localeCompare(String(b.nome), 'pt');
      });
      return { nome: temp.nome, periodo: temp.periodo, guias: guias };
    }
    return { xango: uma(data.xango), oxum: uma(data.oxum) };
  }

  function lugarDe(temp, guiaId) {
    var guias = (temp && temp.guias) || [];
    for (var i = 0; i < guias.length; i++) {
      if (String(guias[i].id) === String(guiaId)) return i + 1;
    }
    return 0;
  }

  function textoLugar(n) {
    return n ? n + 'º' : 'sem pontuação';
  }

  function linhaRanking(g, lugar, guiaId, premio, mostrarPremio) {
    var podium = lugar === 1 ? ' is-1' : lugar === 2 ? ' is-2' : lugar === 3 ? ' is-3' : '';
    var eu = guiaId && String(g.id) === String(guiaId) ? ' is-eu' : '';
    var recebe = mostrarPremio
      ? (premio
        ? '<p class="xp-rank__premio">No fim da temporada recebe ' + esc(premio) + '</p>'
        : (lugar <= 3 ? '<p class="xp-note">Premiação deste lugar ainda não foi definida.</p>' : ''))
      : '';
    var atua = g.cidade ? '<p>Atua em ' + esc(g.cidade) + '</p>' : '';
    return '<article class="xp-rank__guia' + podium + eu + '"><img src="' + esc(g.foto) + '" alt="Foto de ' + esc(g.nome) + '" /><div><header><strong>' + lugar + 'º ' + esc(g.nome) + (eu ? ' <span class="xp-rank__eu">você</span>' : '') + '</strong><span>' + g.pontos + ' pts</span></header>' +
      atua +
      '<p>' + g.pessoas + ' pessoas · ' + g.dias_guiados + ' dia' + (g.dias_guiados > 1 ? 's' : '') + ' · média ' + (typeof g.media_dia === 'number' ? casa(g.media_dia) : g.media_dia) + ' por dia</p>' +
      recebe + '</div></article>';
  }

  function cartaoTemporada(temp, chave, guiaId, prem) {
    var guias = (temp && temp.guias) || [];
    var miolo = guias.length
      ? guias.map(function (g, i) { return linhaRanking(g, i + 1, guiaId, premioLugar(prem, i + 1), !!prem); }).join('')
      : '<p class="xp-note">Nenhum guia pontuou nesta temporada.</p>';
    return '<article class="xp-rank__card xp-rank__' + chave + '"><h3>' + esc((temp && temp.nome) || '') + '</h3><p class="xp-note">' + esc((temp && temp.periodo) || '') + '</p>' + miolo + '</article>';
  }

  function colunasRank(guias) {
    var mapa = {};
    var lista = [];
    guias.forEach(function (g) {
      (g.dias || []).forEach(function (dia) {
        (dia.atrativos || []).forEach(function (item) {
          var slug = item.slug || item.nome || '';
          if (!slug || mapa[slug]) return;
          mapa[slug] = { slug: slug, nome: item.nome || slug };
          lista.push(mapa[slug]);
        });
      });
    });
    lista.sort(function (x, y) {
      return String(x.nome).localeCompare(String(y.nome), 'pt');
    });
    return lista;
  }

  function pontosCol(g, col) {
    var total = 0;
    var achou = false;
    (g.dias || []).forEach(function (dia) {
      (dia.atrativos || []).forEach(function (item) {
        var slug = item.slug || item.nome || '';
        if (slug !== col.slug) return;
        achou = true;
        total += Number(item.pontos) || 0;
      });
    });
    return achou ? total : null;
  }

  function tabelaRanking(temp, chave, guiaId, slugAqui) {
    var guias = (temp && temp.guias) || [];
    var cabeca = '<h3>' + esc((temp && temp.nome) || '') + '</h3><p class="xp-note">' + esc((temp && temp.periodo) || '') + '</p>';
    if (!guias.length) {
      return '<article class="xp-rank__card xp-rank__' + chave + '">' + cabeca + '<p class="xp-note">Nenhum guia pontuou nesta temporada.</p></article>';
    }
    var cols = colunasRank(guias);
    var head = '<th class="xp-rank__pos">#</th><th class="xp-rank__quem">Guia</th><th class="xp-rank__pontos" scope="col">Pontos</th>' + cols.map(function (col) {
      var aqui = slugAqui && col.slug === slugAqui ? ' is-aqui' : '';
      return '<th class="xp-rank__col' + aqui + '" scope="col"><strong>' + esc(col.nome) + '</strong></th>';
    }).join('');
    var body = guias.map(function (g, i) {
      var lugar = g.lugar || (i + 1);
      var podium = lugar === 1 ? ' is-1' : lugar === 2 ? ' is-2' : lugar === 3 ? ' is-3' : '';
      var eu = guiaId && String(g.id) === String(guiaId);
      var cells = cols.map(function (col) {
        var pts = pontosCol(g, col);
        var aqui = slugAqui && col.slug === slugAqui ? ' is-aqui' : '';
        return '<td class="xp-rank__col' + aqui + '">' + (pts == null ? '<span class="xp-rank__vazio">—</span>' : esc(String(pts))) + '</td>';
      }).join('');
      var voce = eu ? '<em class="xp-rank__eu">você</em>' : '';
      return '<tr class="' + (podium + (eu ? ' is-eu' : '')).trim() + '"><th class="xp-rank__pos" scope="row">' + lugar + 'º</th>' +
        '<td class="xp-rank__quem"><div class="xp-rank__pessoa"><img src="' + esc(g.foto) + '" alt="" /><span>' + esc(g.nome) + '</span>' + voce + '</div></td>' +
        '<td class="xp-rank__pontos">' + esc(String(g.pontos)) + '</td>' + cells + '</tr>';
    }).join('');
    return '<article class="xp-rank__card xp-rank__' + chave + '">' + cabeca +
      '<div class="xp-rank__scroll"><table class="xp-rank__table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div></article>';
  }

  function htmlPaga(atrativos) {
    if (!atrativos.length) return '';
    function cel(v) { return esc(v || '—'); }
    return '<section class="rk-premios-wrap"><h3 class="rk-kicker">Premiação</h3><div class="rk-premios">' + atrativos.map(function (a) {
      var f = (a.premiacao && a.premiacao.xango) || {};
      var g = (a.premiacao && a.premiacao.oxum) || {};
      return '<article class="rk-premio"><h4>' + esc(a.nome) + '</h4><table><thead><tr><th></th><th>1º</th><th>2º</th><th>3º</th></tr></thead><tbody>' +
        '<tr><th>Fogo</th><td>' + cel(f.primeiro) + '</td><td>' + cel(f.segundo) + '</td><td>' + cel(f.terceiro) + '</td></tr>' +
        '<tr><th>Água</th><td>' + cel(g.primeiro) + '</td><td>' + cel(g.segundo) + '</td><td>' + cel(g.terceiro) + '</td></tr>' +
        '</tbody></table></article>';
    }).join('') + '</div></section>';
  }

  function pintarRankingGuia(root, data) {
    var atrativos = data.atrativos || [];
    var cidades = (data.cidades && data.cidades.length) ? data.cidades : [
      { key: 'chapada', nome: 'Chapada dos Veadeiros' },
      { key: 'alto-paraiso', nome: 'Alto Paraíso' },
      { key: 'sao-jorge', nome: 'São Jorge' },
      { key: 'cavalcante', nome: 'Cavalcante' }
    ];
    var atra = '';
    var cidade = 'chapada';
    function lugarHero(n) {
      return '<strong>' + (n ? n + 'º' : '—') + '</strong>' + (n ? '' : '<small>sem pontuação</small>');
    }
    function chip(attrs, on, label) {
      return '<button type="button" ' + attrs + ' class="' + (on ? 'is-on' : '') + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>';
    }
    function desenhar() {
      var slugs = atra ? [atra] : atrativos.map(function (a) { return a.slug; });
      var escolha = atra ? atrativos.filter(function (a) { return a.slug === atra; }) : atrativos.slice();
      var filtrado = filtrarRanking(data, slugs, cidade);
      var fogo = lugarDe(filtrado.xango, data.guia_id);
      var agua = lugarDe(filtrado.oxum, data.guia_id);
      var linhasAtra = atrativos.map(function (a) {
        var so = filtrarRanking(data, [a.slug], cidade);
        var aqui = a.slug === atra ? ' class="is-aqui"' : '';
        return '<tr' + aqui + '><th>' + esc(a.nome) + '</th><td>' + textoLugar(lugarDe(so.xango, data.guia_id)) + '</td><td>' + textoLugar(lugarDe(so.oxum, data.guia_id)) + '</td></tr>';
      }).join('');
      var linhasCidade = cidades.filter(function (c) { return c.key && c.key !== 'chapada'; }).map(function (c) {
        var so = filtrarRanking(data, slugs, c.key);
        var aqui = c.key === cidade ? ' class="is-aqui"' : '';
        return '<tr' + aqui + '><th>' + esc(c.nome) + '</th><td>' + textoLugar(lugarDe(so.xango, data.guia_id)) + '</td><td>' + textoLugar(lugarDe(so.oxum, data.guia_id)) + '</td></tr>';
      }).join('');
      root.innerHTML =
        '<div class="rk-board">' +
        '<header class="rk-hero"><article class="rk-hero__fogo"><span>Ranking Fogo</span>' + lugarHero(fogo) + '</article><article class="rk-hero__agua"><span>Ranking Água</span>' + lugarHero(agua) + '</article></header>' +
        '<div class="rk-panel">' +
        '<div class="rk-row"><span class="rk-row__label">Atrativo</span><div class="rk-seg" role="radiogroup" aria-label="Atrativo">' +
        chip('data-rk=""', !atra, 'Todos atrativos') +
        atrativos.map(function (a) { return chip('data-rk="' + esc(a.slug) + '"', atra === a.slug, a.nome); }).join('') +
        '</div></div>' +
        '<div class="rk-row"><span class="rk-row__label">Saída</span><div class="rk-seg" role="radiogroup" aria-label="Cidade de saída">' +
        cidades.map(function (c) { return chip('data-cidade="' + esc(c.key) + '"', cidade === c.key, c.nome); }).join('') +
        '</div></div></div>' +
        '<div class="rk-glance">' +
        '<table class="rk-table"><caption>Por atrativo</caption><thead><tr><th></th><th>Fogo</th><th>Água</th></tr></thead><tbody>' + linhasAtra + '</tbody></table>' +
        '<table class="rk-table"><caption>Saindo de</caption><thead><tr><th></th><th>Fogo</th><th>Água</th></tr></thead><tbody>' + linhasCidade + '</tbody></table>' +
        '</div>' +
        htmlPaga(escolha) +
        '<div class="xp-rank">' + tabelaRanking(filtrado.xango, 'xango', data.guia_id, atra) + tabelaRanking(filtrado.oxum, 'oxum', data.guia_id, atra) + '</div>' +
        '</div>';
      root.querySelectorAll('[data-rk]').forEach(function (btn) {
        btn.onclick = function () {
          atra = btn.getAttribute('data-rk') || '';
          desenhar();
        };
      });
      root.querySelectorAll('[data-cidade]').forEach(function (btn) {
        btn.onclick = function () {
          cidade = btn.getAttribute('data-cidade') || 'chapada';
          desenhar();
        };
      });
    }
    desenhar();
  }

  function pintarRankingHost(root, pacote) {
    if (pacote.aguardando) {
      root.innerHTML = '<div class="fin-espera"><h2>Ranking fechado</h2><p>A premiação e o ranking abrem quando o admin aprovar o anfitrião.</p></div>';
      return;
    }
    var atra = pacote.atrativo;
    var ranking = pacote.ranking || {};
    if (!atra) {
      root.innerHTML = '<p class="xp-note">Este anfitrião ainda não tem experiência ligada.</p>';
      return;
    }
    var info = (ranking.atrativos || []).filter(function (a) { return a.slug === atra.slug; })[0] || { premiacao: { xango: {}, oxum: {} }, nome: atra.nome };
    var filtrado = filtrarRanking(ranking, [atra.slug]);
    root.innerHTML =
      '<h2 class="gcv-dash-section-title">Ranking de ' + esc(info.nome || atra.nome) + '</h2>' +
      '<p class="xp-note">Quem mais guiou esta experiência. No fim da temporada, o 1º, o 2º e o 3º recebem a premiação cadastrada nela.</p>' +
      htmlPaga([info]) +
      '<div class="xp-rank">' + cartaoTemporada(filtrado.xango, 'xango', 0, info.premiacao.xango) + cartaoTemporada(filtrado.oxum, 'oxum', 0, info.premiacao.oxum) + '</div>';
  }

  function openRankingHost() {
    var root = document.getElementById('host-ranking-root');
    if (!root) return;
    root.innerHTML = '<p class="xp-note">Calculando o ranking…</p>';
    pedir('GET', '/api/anfitriao/ranking.php', null, function (err, res) {
      if (err || !res || !res.ok) {
        root.innerHTML = '<p class="xp-note">Não foi possível carregar o ranking.</p>';
        return;
      }
      pintarRankingHost(root, res.data || {});
    });
  }

  function openRankingGuia() {
    var root = document.getElementById('guide-ranking-root');
    if (!root) return;
    root.innerHTML = '<p class="xp-note">Calculando o ranking…</p>';
    pedir('GET', '/api/guides/ranking.php', null, function (err, res) {
      if (err || !res || !res.ok || !res.data) {
        root.innerHTML = '<p class="xp-note">Não foi possível carregar o ranking.</p>';
        return;
      }
      pintarRankingGuia(root, res.data);
    });
  }

  function openPending(status) {
    var root = document.getElementById('host-pending-root');
    if (!root) return;
    if (status === 'rejected') {
      root.innerHTML = '<div class="fin-espera"><h2>Cadastro recusado</h2><p>O admin não aprovou este anfitrião. O aviso foi enviado no WhatsApp. O financeiro permanece fechado.</p></div>';
      return;
    }
    root.innerHTML = '<div class="fin-espera"><div class="fin-espera__icon">⏳</div><h2>Aguardando aprovação</h2><p>Seu cadastro de anfitrião já está com o admin. O aviso foi para o WhatsApp dele. Ingressos, lotação e o extrato abrem só depois da aprovação.</p></div>';
  }

  window.GcvAnfitriao = {
    openAdmin: function () { pintarAdmin(document.getElementById('admin-anfitrioes-root')); },
    openFinance: openFinance,
    openVenda: openVenda,
    openRankingHost: openRankingHost,
    openRankingGuia: openRankingGuia,
    openPending: openPending,
    htmlVenda: htmlVenda,
    lerVenda: lerVenda,
    bindVenda: bindVenda,
    vendaVazia: vendaVazia
  };
})();

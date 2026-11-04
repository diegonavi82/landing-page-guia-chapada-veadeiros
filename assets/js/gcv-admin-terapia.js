/* Terapia: categoria de experiência, vendida por hora. A ficha abre dentro de Experiências. */
(function (global) {
  'use strict';

  var API = '/api/admin/terapias.php';

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
      if (!res.ok) {
        cb(new Error(res.error || 'Não foi possível salvar a terapia'));
        return;
      }
      cb(null, res);
    };
    xhr.onerror = function () { cb(new Error('Sem conexão com o servidor')); };
    xhr.send(method === 'GET' ? null : JSON.stringify(data || {}));
  }

  function money(cents) {
    var n = (parseInt(String(cents), 10) || 0) / 100;
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function reaisInput(cents) {
    var n = (parseInt(String(cents), 10) || 0) / 100;
    return n ? n.toFixed(2).replace('.', ',') : '';
  }

  function statusLabel(status) {
    if (status === 'published') return 'Pronta';
    if (status === 'archived') return 'Arquivada';
    return 'Rascunho';
  }

  function carregar(cb) {
    request('GET', null, function (err, res) {
      if (err) { cb(err); return; }
      cb(null, ((res && res.data) || {}).terapias || []);
    });
  }

  function abrir(host, atual, callbacks) {
    callbacks = callbacks || {};
    atual = atual || null;
    var editId = atual && atual.id ? atual.id : 0;
    if (!host) return;
    host.hidden = false;
    host.innerHTML =
      '<form class="gcv-dash-form" id="terapia-form">' +
      '<h3 class="gcv-dash-section-title" style="font-size:1.05rem">' + (atual ? 'Editar terapia' : 'Nova terapia') + '</h3>' +
      '<p class="gcv-cms-muted">Terapia é a categoria vendida por hora. Ela não entra no site.</p>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label" for="terapia-nome">Nome</label>' +
      '<input class="gcv-dash-input" id="terapia-nome" data-terapia-nome maxlength="160" value="' + esc(atual ? atual.nome : '') + '" required /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label" for="terapia-desc">Descrição</label>' +
      '<textarea class="gcv-dash-textarea" id="terapia-desc" data-terapia-desc maxlength="4000">' + esc(atual ? atual.descricao : '') + '</textarea></div>' +
      '<div class="gcv-dash-field-row gcv-dash-field-row--3">' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label" for="terapia-preco">Preço por hora (R$)</label>' +
      '<input class="gcv-dash-input" id="terapia-preco" data-terapia-preco inputmode="decimal" placeholder="180,00" value="' + esc(atual ? reaisInput(atual.preco_hora_cents) : '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label" for="terapia-min">Duração padrão (min)</label>' +
      '<input class="gcv-dash-input" id="terapia-min" data-terapia-min type="number" min="15" max="720" step="15" placeholder="60" value="' + esc(atual && atual.duracao_padrao_min ? atual.duracao_padrao_min : '') + '" /></div>' +
      '<div class="gcv-dash-field"><label class="gcv-dash-label" for="terapia-status">No cadastro</label>' +
      '<select class="gcv-dash-select" id="terapia-status" data-terapia-status>' +
      '<option value="draft"' + (!atual || atual.status === 'draft' ? ' selected' : '') + '>Rascunho</option>' +
      '<option value="published"' + (atual && atual.status === 'published' ? ' selected' : '') + '>Pronta</option>' +
      '<option value="archived"' + (atual && atual.status === 'archived' ? ' selected' : '') + '>Arquivada</option>' +
      '</select></div></div>' +
      '<p class="gcv-cms-muted">Pronta vale só neste cadastro. A terapia continua fora do site.</p>' +
      '<p id="terapia-erro" class="gcv-dash-alert" hidden></p>' +
      '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary">' + (atual ? 'Salvar' : 'Cadastrar') + '</button> ' +
      '<button type="button" class="gcv-dash-btn" id="terapia-cancelar">Cancelar</button>' +
      '</form>';
    if (callbacks.onTitle) callbacks.onTitle(atual && atual.nome ? atual.nome : 'Nova terapia');
    var erro = host.querySelector('#terapia-erro');
    function showError(msg) {
      if (!erro) return;
      erro.classList.remove('is-ok');
      erro.hidden = !msg;
      erro.textContent = msg || '';
    }
    host.querySelector('#terapia-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = String((host.querySelector('[data-terapia-nome]') || {}).value || '').trim();
      if (!nome) {
        showError('Dê um nome à terapia.');
        return;
      }
      showError('');
      request(editId ? 'PUT' : 'POST', {
        id: editId || undefined,
        nome: nome,
        descricao: String((host.querySelector('[data-terapia-desc]') || {}).value || '').trim(),
        preco_hora_reais: String((host.querySelector('[data-terapia-preco]') || {}).value || '').trim(),
        duracao_padrao_min: String((host.querySelector('[data-terapia-min]') || {}).value || '').trim(),
        status: (host.querySelector('[data-terapia-status]') || {}).value || 'draft'
      }, function (err, res) {
        if (err) {
          showError(err.message);
          return;
        }
        if (res && res.data && res.data.id) editId = res.data.id;
        if (erro) {
          erro.classList.add('is-ok');
          erro.hidden = false;
          erro.textContent = 'Salvo.';
        }
        var botao = host.querySelector('#terapia-form button[type="submit"]');
        if (botao) botao.textContent = 'Salvar';
        if (callbacks.onSaved) callbacks.onSaved();
      });
    });
    host.querySelector('#terapia-cancelar').addEventListener('click', function () {
      if (callbacks.onCancel) callbacks.onCancel();
    });
    var nomeEl = host.querySelector('#terapia-nome');
    if (nomeEl) nomeEl.focus();
  }

  global.GcvAdminTerapia = {
    carregar: carregar,
    abrir: abrir,
    money: money,
    statusLabel: statusLabel
  };
}(window));

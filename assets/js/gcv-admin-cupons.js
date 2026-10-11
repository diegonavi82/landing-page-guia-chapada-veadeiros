/* gcv-admin-cupons.js — menu CUPONS do admin */
(function (global) {
  'use strict';

  var API = '/api/admin/cupons.php';
  var lista = [];
  var editId = '';

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
        cb(new Error(res.error || 'Não foi possível salvar o cupom'));
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

  function regra(c) {
    var valor = c.modo === 'percentual' ? (parseInt(String(c.valor), 10) || 0) + '%' : money(c.valor);
    var porPessoa = c.tipo === 'pessoa' || (c.tipo === 'grupo' && c.alcance === 'pessoa');
    var texto = porPessoa ? valor + ' por pessoa' : valor + ' no total do carrinho';
    if (c.tipo === 'grupo') {
      texto += ', quando há mais de ' + (parseInt(String(c.minimo_pessoas), 10) || 0) + ' pessoas';
    }
    return texto;
  }

  function root() {
    return document.getElementById('cms-cupons-root');
  }

  function formVals() {
    var box = root();
    if (!box) return null;
    var tipo = (box.querySelector('[data-cupom-tipo]') || {}).value || 'total';
    var modo = (box.querySelector('[data-cupom-modo]') || {}).value || 'fixo';
    var raw = String((box.querySelector('[data-cupom-valor]') || {}).value || '').replace(',', '.');
    var num = parseFloat(raw);
    if (!isFinite(num) || num <= 0) num = 0;
    var valor = modo === 'percentual' ? Math.round(num) : Math.round(num * 100);
    var min = parseInt(String((box.querySelector('[data-cupom-min]') || {}).value || ''), 10) || 0;
    var alcance = (box.querySelector('[data-cupom-alcance]') || {}).value || 'total';
    var ativo = !!((box.querySelector('[data-cupom-ativo]') || {}).checked);
    return {
      id: editId,
      codigo: String((box.querySelector('[data-cupom-codigo]') || {}).value || ''),
      tipo: tipo,
      modo: modo,
      valor: valor,
      minimo_pessoas: min,
      alcance: alcance,
      ativo: ativo
    };
  }

  function syncForm() {
    var box = root();
    if (!box) return;
    var tipo = (box.querySelector('[data-cupom-tipo]') || {}).value || 'total';
    var modo = (box.querySelector('[data-cupom-modo]') || {}).value || 'fixo';
    var grupo = box.querySelector('[data-cupom-grupo]');
    var valorLabel = box.querySelector('[data-cupom-valor-label]');
    if (grupo) grupo.hidden = tipo !== 'grupo';
    if (valorLabel) valorLabel.textContent = modo === 'percentual' ? 'Percentual' : 'Valor em R$';
  }

  function fillForm(c) {
    var box = root();
    if (!box || !c) return;
    editId = c.id || '';
    box.querySelector('[data-cupom-codigo]').value = c.codigo || '';
    box.querySelector('[data-cupom-tipo]').value = c.tipo || 'total';
    box.querySelector('[data-cupom-modo]').value = c.modo || 'fixo';
    var valor = c.modo === 'percentual' ? String(c.valor) : ((parseInt(String(c.valor), 10) || 0) / 100).toFixed(2);
    box.querySelector('[data-cupom-valor]').value = valor;
    box.querySelector('[data-cupom-min]').value = c.minimo_pessoas || 4;
    box.querySelector('[data-cupom-alcance]').value = c.alcance || 'total';
    box.querySelector('[data-cupom-ativo]').checked = c.ativo !== false;
    var title = box.querySelector('[data-cupom-form-title]');
    if (title) title.textContent = editId ? 'Editar cupom' : 'Novo cupom';
    syncForm();
  }

  function clearForm() {
    fillForm({ codigo: '', tipo: 'total', modo: 'fixo', valor: 0, minimo_pessoas: 4, alcance: 'total', ativo: true, id: '' });
    var box = root();
    if (box) box.querySelector('[data-cupom-valor]').value = '';
  }

  function paint() {
    var box = root();
    if (!box) return;
    var rows = lista.map(function (c) {
      return '<li class="gcv-cupom-item' + (c.ativo ? '' : ' is-off') + '">' +
        '<div><strong>' + esc(c.codigo) + '</strong>' +
        (c.ativo ? '' : ' <span class="gcv-cupom-off">desativado</span>') +
        '<p>' + esc(regra(c)) + '</p></div>' +
        '<div class="gcv-cupom-item__actions">' +
        '<button type="button" class="gcv-dash-btn" data-cupom-edit="' + esc(c.id) + '">Editar</button>' +
        '<button type="button" class="gcv-dash-btn" data-cupom-del="' + esc(c.id) + '">Excluir</button>' +
        '</div></li>';
    }).join('');
    var listEl = box.querySelector('[data-cupom-list]');
    if (listEl) {
      listEl.innerHTML = rows || '<li class="gcv-cupom-empty">Nenhum cupom ainda.</li>';
    }
  }

  function shell() {
    var box = root();
    if (!box || box.getAttribute('data-ready') === '1') return;
    box.setAttribute('data-ready', '1');
    box.innerHTML =
      '<p class="gcv-dash-hint">Um cupom por compra. O desconto sai do valor do Pix, antes do acréscimo do cartão. O pagamento fica com pelo menos R$ 1,00.</p>' +
      '<form class="gcv-cupom-form" data-cupom-form>' +
      '<h3 data-cupom-form-title>Novo cupom</h3>' +
      '<label>Código <input type="text" data-cupom-codigo maxlength="24" placeholder="BEMVINDO" autocomplete="off" /></label>' +
      '<label>Tipo <select data-cupom-tipo>' +
      '<option value="total">Desconto no total do carrinho</option>' +
      '<option value="pessoa">Desconto por pessoa</option>' +
      '<option value="grupo">A partir de mais de X pessoas</option>' +
      '</select></label>' +
      '<div class="gcv-cupom-form__row">' +
      '<label>Forma <select data-cupom-modo><option value="fixo">Valor em R$</option><option value="percentual">Percentual</option></select></label>' +
      '<label><span data-cupom-valor-label>Valor em R$</span> <input type="text" inputmode="decimal" data-cupom-valor placeholder="20" /></label>' +
      '</div>' +
      '<div class="gcv-cupom-form__grupo" data-cupom-grupo hidden>' +
      '<label>Vale com mais de <input type="number" min="1" step="1" data-cupom-min value="4" /> pessoas</label>' +
      '<label>O desconto incide <select data-cupom-alcance>' +
      '<option value="total">no total do carrinho</option>' +
      '<option value="pessoa">em cada pessoa</option>' +
      '</select></label></div>' +
      '<label class="gcv-cupom-form__check"><input type="checkbox" data-cupom-ativo checked /> Cupom ativo</label>' +
      '<div class="gcv-cupom-form__actions">' +
      '<button type="submit" class="gcv-dash-btn gcv-dash-btn--primary" data-cupom-save>Salvar cupom</button>' +
      '<button type="button" class="gcv-dash-btn" data-cupom-cancel>Limpar</button>' +
      '</div>' +
      '<p class="gcv-cupom-form__err" data-cupom-err hidden></p>' +
      '</form>' +
      '<ul class="gcv-cupom-list" data-cupom-list></ul>';
    injectCss();
    box.addEventListener('change', syncForm);
    box.addEventListener('submit', function (e) {
      if (!e.target.closest('[data-cupom-form]')) return;
      e.preventDefault();
      var err = box.querySelector('[data-cupom-err]');
      var payload = formVals();
      if (!payload || !String(payload.codigo).trim()) {
        if (err) { err.hidden = false; err.textContent = 'Informe o código.'; }
        return;
      }
      if (!payload.valor) {
        if (err) { err.hidden = false; err.textContent = 'Informe o valor do desconto.'; }
        return;
      }
      if (err) err.hidden = true;
      var method = editId ? 'PUT' : 'POST';
      request(method, payload, function (error, res) {
        if (error) {
          if (err) { err.hidden = false; err.textContent = error.message; }
          return;
        }
        lista = res.cupons || [];
        clearForm();
        paint();
      });
    });
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-cupom-cancel]')) {
        clearForm();
        var err = box.querySelector('[data-cupom-err]');
        if (err) err.hidden = true;
        return;
      }
      var edit = e.target.closest('[data-cupom-edit]');
      if (edit) {
        var id = edit.getAttribute('data-cupom-edit');
        var found = lista.filter(function (c) { return c.id === id; })[0];
        if (found) fillForm(found);
        return;
      }
      var del = e.target.closest('[data-cupom-del]');
      if (!del) return;
      var delId = del.getAttribute('data-cupom-del');
      var alvo = lista.filter(function (c) { return c.id === delId; })[0];
      var msg = 'Excluir o cupom ' + (alvo ? alvo.codigo : '') + '?';
      var go = function () {
        request('DELETE', { id: delId }, function (error, res) {
          if (error) {
            window.alert(error.message);
            return;
          }
          if (editId === delId) clearForm();
          lista = res.cupons || [];
          paint();
        });
      };
      if (typeof global.gcvConfirm === 'function') {
        global.gcvConfirm(msg, { danger: true, okText: 'Excluir' }).then(function (yes) {
          if (yes) go();
        });
      } else if (window.confirm(msg)) {
        go();
      }
    });
    syncForm();
  }

  function injectCss() {
    if (document.getElementById('gcv-cupom-admin-css')) return;
    var style = document.createElement('style');
    style.id = 'gcv-cupom-admin-css';
    style.textContent =
      '.gcv-cupom-form{display:grid;gap:.75rem;max-width:36rem;margin:0 0 1.25rem;padding:1rem;border:1px solid #e2e8f0;border-radius:14px;background:#fff}' +
      '.gcv-cupom-form h3{margin:0;font-size:1rem}' +
      '.gcv-cupom-form label{display:grid;gap:.3rem;font-size:.82rem;font-weight:700;color:#334155}' +
      '.gcv-cupom-form input,.gcv-cupom-form select{font:inherit;font-weight:600;padding:.55rem .7rem;border:1px solid #cbd5e1;border-radius:10px}' +
      '.gcv-cupom-form__row,.gcv-cupom-form__grupo{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}' +
      '.gcv-cupom-form__check{display:flex;align-items:center;gap:.45rem}' +
      '.gcv-cupom-form__actions{display:flex;gap:.5rem}' +
      '.gcv-cupom-form__err{margin:0;color:#b91c1c;font-weight:700}' +
      '.gcv-cupom-list{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}' +
      '.gcv-cupom-item{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.85rem 1rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}' +
      '.gcv-cupom-item p{margin:.2rem 0 0;color:#475569;font-size:.88rem}' +
      '.gcv-cupom-item.is-off{opacity:.65}' +
      '.gcv-cupom-off{font-size:.75rem;color:#b45309}' +
      '.gcv-cupom-item__actions{display:flex;gap:.4rem;flex-shrink:0}' +
      '.gcv-cupom-empty{color:#64748b;padding:.5rem 0}' +
      '@media(max-width:700px){.gcv-cupom-form__row,.gcv-cupom-form__grupo{grid-template-columns:1fr}.gcv-cupom-item{flex-direction:column;align-items:flex-start}}';
    document.head.appendChild(style);
  }

  function open() {
    shell();
    request('GET', null, function (error, res) {
      var box = root();
      var err = box && box.querySelector('[data-cupom-err]');
      if (error) {
        if (err) { err.hidden = false; err.textContent = error.message; }
        return;
      }
      lista = res.cupons || [];
      paint();
    });
  }

  global.GcvAdminCupons = { open: open };
})(window);

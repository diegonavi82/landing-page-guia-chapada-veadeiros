/**
 * Pergunta se o guia possui veículo. O padrão é não.
 * Com sim, o modelo (lista FIPE) e o ano ficam obrigatórios.
 */
(function (global) {
  var catalog = null;
  var folded = null;
  var loadPromise = null;
  var failed = false;

  function fold(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function lang() {
    var code = String((document.documentElement && document.documentElement.lang) || 'pt').slice(0, 2).toLowerCase();
    return (code === 'en' || code === 'es') ? code : 'pt';
  }

  function labels() {
    var all = {
      pt: {
        title: 'Veículo',
        question: 'Você possui veículo?',
        no: 'Não',
        yes: 'Sim',
        model: 'Modelo do veículo',
        year: 'Ano',
        ph: 'Digite para buscar o modelo',
        yearPh: 'Selecione…',
        empty: 'Nenhum modelo com esse nome.',
        loading: 'Carregando a lista de veículos…',
        loadFail: 'Não foi possível carregar a lista de veículos.',
        modelErr: 'Escolha o modelo na lista.',
        yearErr: 'Informe o ano do veículo.',
        modelNeed: 'Informe o modelo do veículo.',
        wait: 'Aguarde a lista de veículos carregar.'
      },
      en: {
        title: 'Vehicle',
        question: 'Do you have a vehicle?',
        no: 'No',
        yes: 'Yes',
        model: 'Vehicle model',
        year: 'Year',
        ph: 'Type to search the model',
        yearPh: 'Select…',
        empty: 'No model with that name.',
        loading: 'Loading the vehicle list…',
        loadFail: 'The vehicle list could not be loaded.',
        modelErr: 'Choose the model from the list.',
        yearErr: 'Enter the vehicle year.',
        modelNeed: 'Enter the vehicle model.',
        wait: 'Wait for the vehicle list to load.'
      },
      es: {
        title: 'Vehículo',
        question: '¿Tiene vehículo?',
        no: 'No',
        yes: 'Sí',
        model: 'Modelo del vehículo',
        year: 'Año',
        ph: 'Escriba para buscar el modelo',
        yearPh: 'Seleccione…',
        empty: 'Ningún modelo con ese nombre.',
        loading: 'Cargando la lista de vehículos…',
        loadFail: 'No se pudo cargar la lista de vehículos.',
        modelErr: 'Elija el modelo en la lista.',
        yearErr: 'Indique el año del vehículo.',
        modelNeed: 'Indique el modelo del vehículo.',
        wait: 'Espere a que cargue la lista de vehículos.'
      }
    };
    return all[lang()] || all.pt;
  }

  function load() {
    if (catalog) return Promise.resolve(catalog);
    if (loadPromise) return loadPromise;
    loadPromise = fetch('/assets/data/veiculos-fipe.json', { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('list');
        return res.json();
      })
      .then(function (list) {
        catalog = Array.isArray(list) ? list : [];
        folded = catalog.map(function (name) {
          return { name: name, key: fold(name) };
        });
        failed = false;
        return catalog;
      })
      .catch(function (err) {
        failed = true;
        loadPromise = null;
        throw err;
      });
    return loadPromise;
  }

  function canonical(value) {
    if (!folded) return '';
    var key = fold(value);
    if (!key) return '';
    for (var i = 0; i < folded.length; i++) {
      if (folded[i].key === key) return folded[i].name;
    }
    return '';
  }

  function search(query, limit) {
    var q = fold(query);
    if (q.length < 1 || !folded) return [];
    var tokens = q.split(' ').filter(Boolean);
    var starts = [];
    var words = [];
    var rest = [];
    var cap = limit || 12;
    for (var i = 0; i < folded.length; i++) {
      var key = folded[i].key;
      var ok = true;
      var t;
      for (t = 0; t < tokens.length; t++) {
        if (key.indexOf(tokens[t]) < 0) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      var name = folded[i].name;
      if (key.indexOf(q) === 0) starts.push(name);
      else if (key.indexOf(' ' + q) >= 0) words.push(name);
      else rest.push(name);
      if (starts.length >= cap) break;
    }
    return starts.concat(words, rest).slice(0, cap);
  }

  function hasSavedVehicle(model, year) {
    return !!(String(model || '').trim() && parseInt(year, 10) >= 1960);
  }

  function fieldsHtml(opts) {
    opts = opts || {};
    var t = labels();
    var model = String(opts.model || '');
    var year = opts.year ? String(opts.year) : '';
    var owns = hasSavedVehicle(model, year);
    var max = new Date().getFullYear() + 1;
    var years = '<option value="">' + esc(t.yearPh) + '</option>';
    var y;
    for (y = max; y >= 1960; y--) {
      years += '<option value="' + y + '"' + (String(y) === year ? ' selected' : '') + '>' + y + '</option>';
    }
    return (
      '<div class="gcv-vehicle' + (owns ? ' is-yes' : '') + '" data-vehicle data-has="' + (owns ? '1' : '0') + '">' +
        '<div class="gcv-vehicle__ask">' +
          '<p class="gcv-dash-label" id="gcv-vehicle-q">' + esc(t.question) + '</p>' +
          '<div class="gcv-vehicle__toggle" role="group" aria-labelledby="gcv-vehicle-q">' +
            '<button type="button" data-vehicle-no class="' + (owns ? '' : 'is-on') + '" aria-pressed="' + (owns ? 'false' : 'true') + '">' + esc(t.no) + '</button>' +
            '<button type="button" data-vehicle-yes class="' + (owns ? 'is-on' : '') + '" aria-pressed="' + (owns ? 'true' : 'false') + '">' + esc(t.yes) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="gcv-vehicle__fields"' + (owns ? '' : ' hidden') + '>' +
          '<div class="gcv-vehicle__row">' +
            '<div class="gcv-dash-field gcv-vehicle__model">' +
              '<label class="gcv-dash-label">' + esc(t.model) + '</label>' +
              '<div class="gcv-vehicle__combo">' +
                '<input class="gcv-dash-input" data-vehicle-input type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" placeholder="' + esc(t.ph) + '" value="' + esc(model) + '" data-saved="' + esc(model) + '"' + (owns ? '' : ' disabled') + ' />' +
                '<ul class="gcv-vehicle__list" data-vehicle-list role="listbox" hidden></ul>' +
              '</div>' +
              '<p class="gcv-dash-field-error" data-vehicle-model-error hidden></p>' +
            '</div>' +
            '<div class="gcv-dash-field gcv-vehicle__year">' +
              '<label class="gcv-dash-label">' + esc(t.year) + '</label>' +
              '<select class="gcv-dash-select" data-vehicle-year data-saved="' + esc(year) + '"' + (owns ? '' : ' disabled') + '>' + years + '</select>' +
              '<p class="gcv-dash-field-error" data-vehicle-year-error hidden></p>' +
            '</div>' +
          '</div>' +
          '<p class="gcv-cms-muted" data-vehicle-status hidden></p>' +
        '</div>' +
      '</div>'
    );
  }

  function bind(scope) {
    var root = scope && scope.querySelector ? scope.querySelector('[data-vehicle]') : null;
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');
    var input = root.querySelector('[data-vehicle-input]');
    var list = root.querySelector('[data-vehicle-list]');
    var combo = root.querySelector('.gcv-vehicle__combo');
    var status = root.querySelector('[data-vehicle-status]');
    var fields = root.querySelector('.gcv-vehicle__fields');
    var yearEl = root.querySelector('[data-vehicle-year]');
    var noBtn = root.querySelector('[data-vehicle-no]');
    var yesBtn = root.querySelector('[data-vehicle-yes]');
    var t = labels();
    var active = -1;
    var items = [];
    if (!input || !list || !combo || !noBtn || !yesBtn) return;

    function setOwns(yes) {
      root.setAttribute('data-has', yes ? '1' : '0');
      root.classList.toggle('is-yes', !!yes);
      noBtn.classList.toggle('is-on', !yes);
      yesBtn.classList.toggle('is-on', !!yes);
      noBtn.setAttribute('aria-pressed', yes ? 'false' : 'true');
      yesBtn.setAttribute('aria-pressed', yes ? 'true' : 'false');
      if (fields) fields.hidden = !yes;
      input.disabled = !yes;
      if (yearEl) yearEl.disabled = !yes;
      if (!yes) close();
    }

    function setStatus(text) {
      if (!status) return;
      status.hidden = !text;
      status.textContent = text || '';
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      combo.classList.remove('is-open');
      active = -1;
    }

    function paintActive() {
      var buttons = list.querySelectorAll('button');
      buttons.forEach(function (btn, i) {
        btn.classList.toggle('is-active', i === active);
        if (i === active) btn.setAttribute('aria-selected', 'true');
        else btn.removeAttribute('aria-selected');
      });
      var current = buttons[active];
      if (current && current.scrollIntoView) current.scrollIntoView({ block: 'nearest' });
    }

    function open(rows, query) {
      if (input.value.trim() !== query) return;
      items = rows;
      if (!rows.length) {
        list.innerHTML = '<li class="gcv-vehicle__empty">' + esc(t.empty) + '</li>';
      } else {
        list.innerHTML = rows.map(function (name, i) {
          return '<li><button type="button" role="option" data-i="' + i + '">' + esc(name) + '</button></li>';
        }).join('');
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      combo.classList.add('is-open');
      active = rows.length ? 0 : -1;
      paintActive();
    }

    function choose(name) {
      input.value = name;
      input.setAttribute('data-canonical', name);
      close();
    }

    function refresh() {
      var query = input.value.trim();
      if (query.length < 1) {
        close();
        return;
      }
      load().then(function () {
        open(search(query, 12), query);
      }).catch(function () {
        close();
      });
    }

    noBtn.addEventListener('click', function () { setOwns(false); });
    yesBtn.addEventListener('click', function () {
      setOwns(true);
      input.focus();
    });

    setStatus(t.loading);
    load().then(function () {
      var hit = canonical(input.value);
      if (hit) input.value = hit;
      setStatus('');
    }).catch(function () {
      setStatus(t.loadFail);
    });

    input.addEventListener('input', function () {
      input.removeAttribute('data-canonical');
      refresh();
    });
    input.addEventListener('focus', refresh);
    input.addEventListener('keydown', function (ev) {
      if (list.hidden) {
        if (ev.key === 'ArrowDown') refresh();
        return;
      }
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (items.length) {
          active = Math.min(items.length - 1, active + 1);
          paintActive();
        }
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (items.length) {
          active = Math.max(0, active - 1);
          paintActive();
        }
      } else if (ev.key === 'Enter' && active >= 0 && items[active]) {
        ev.preventDefault();
        choose(items[active]);
      } else if (ev.key === 'Escape') {
        close();
      }
    });
    list.addEventListener('mousedown', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!btn) return;
      ev.preventDefault();
      var i = parseInt(btn.getAttribute('data-i'), 10);
      if (items[i]) choose(items[i]);
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        var typed = input.value.trim();
        var hit = canonical(typed);
        if (hit) input.value = hit;
        close();
      }, 140);
    });
    if (!global.__gcvVehicleDoc) {
      global.__gcvVehicleDoc = true;
      document.addEventListener('click', function (ev) {
        var open = document.querySelectorAll('.gcv-vehicle__combo.is-open');
        open.forEach(function (box) {
          var wrap = box.closest('[data-vehicle]');
          if (wrap && wrap.contains(ev.target)) return;
          var listEl = box.querySelector('[data-vehicle-list]');
          var inputEl = box.querySelector('[data-vehicle-input]');
          box.classList.remove('is-open');
          if (listEl) listEl.hidden = true;
          if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function read(scope) {
    var t = labels();
    var root = scope && scope.querySelector ? scope.querySelector('[data-vehicle]') : null;
    if (!root) return { model: '', year: '', error: '' };
    if (root.getAttribute('data-has') !== '1') return { model: '', year: '', error: '' };
    var input = root.querySelector('[data-vehicle-input]');
    var yearEl = root.querySelector('[data-vehicle-year]');
    var model = input ? String(input.value || '').trim() : '';
    var year = yearEl ? String(yearEl.value || '').trim() : '';
    var savedModel = input ? String(input.getAttribute('data-saved') || '') : '';
    var savedYear = yearEl ? String(yearEl.getAttribute('data-saved') || '') : '';
    if (!model && !year) return { model: '', year: '', error: t.modelNeed };
    if (!catalog) {
      if (model === savedModel && year === savedYear) return { model: model, year: year, error: '' };
      return { model: model, year: year, error: failed ? t.loadFail : t.wait };
    }
    if (!model) return { model: '', year: year, error: t.modelNeed };
    var hit = canonical(model);
    if (!hit && savedModel && fold(model) === fold(savedModel)) hit = savedModel;
    if (!hit) return { model: model, year: year, error: t.modelErr };
    if (!year) return { model: hit, year: '', error: t.yearErr };
    return { model: hit, year: year, error: '' };
  }

  global.GcvVehicleCombo = {
    load: load,
    labels: labels,
    fieldsHtml: fieldsHtml,
    bind: bind,
    read: read
  };
})(window);

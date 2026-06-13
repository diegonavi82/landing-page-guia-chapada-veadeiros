/* gcv-tours.js — Excursões | Guia Chapada Veadeiros */
(function () {
  'use strict';

  var API = '/api/tours/list.php';
  var currentUser = null;
  var tours = [];

  function detectLang() {
    var path = window.location.pathname;
    if (path.indexOf('/en/') !== -1) return 'en';
    if (path.indexOf('/es/') !== -1) return 'es';
    return 'pt';
  }

  var lang = detectLang();

  function fetchUser(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/auth/me.php');
    xhr.onload = function () {
      try {
        var res = JSON.parse(xhr.responseText);
        currentUser = res.ok ? res.data : null;
      } catch (e) { currentUser = null; }
      cb();
    };
    xhr.onerror = function () { currentUser = null; cb(); };
    xhr.send();
  }

  function fetchTours(params, cb) {
    var qs = '?lang=' + lang + '&limit=' + (params.limit || 10) + '&page=1';
    if (params.difficulty) qs += '&difficulty=' + params.difficulty;
    if (params.region)     qs += '&region=' + params.region;
    if (params.date_from)  qs += '&date_from=' + params.date_from;
    if (params.date_to)    qs += '&date_to=' + params.date_to;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + qs);
    xhr.onload = function () {
      try {
        var res = JSON.parse(xhr.responseText);
        cb(null, res.ok ? res.data.tours : []);
      } catch (e) { cb(e, []); }
    };
    xhr.onerror = function () { cb(new Error('network'), []); };
    xhr.send();
  }

  var diffLabels = { pt: { easy: 'Fácil', medium: 'Moderada', hard: 'Difícil' }, en: { easy: 'Easy', medium: 'Medium', hard: 'Hard' }, es: { easy: 'Fácil', medium: 'Moderada', hard: 'Difícil' } };
  var regionLabels = { 'alto-paraiso': 'Alto Paraíso', 'sao-jorge': 'São Jorge', 'cavalcante': 'Cavalcante', 'teresina': 'Teresina', 'sao-joao': 'São João', 'outro': 'Outro' };

  function formatDate(d) {
    if (!d) return '';
    var parts = d.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function buildCtaHtml(tour) {
    var loginUrl = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    if (lang === 'en') loginUrl = '/en/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    if (lang === 'es') loginUrl = '/es/login.html?redirect=' + encodeURIComponent(window.location.pathname);

    var spotsLeft = parseInt(tour.spots_left || 0, 10);
    if (spotsLeft <= 0) {
      var sold = { pt: 'Esgotado', en: 'Sold Out', es: 'Agotado' };
      return '<button class="gcv-tour-card__cta" disabled>' + (sold[lang] || 'Esgotado') + '</button>';
    }

    if (!currentUser) {
      var labels = { pt: 'Reservar', en: 'Book Now', es: 'Reservar' };
      return '<a class="gcv-tour-card__cta" href="' + loginUrl + '">' + (labels[lang] || 'Reservar') + '</a>';
    }
    if (currentUser.role === 'admin' || currentUser.role === 'guide') {
      return '<button class="gcv-tour-card__cta gcv-tour-card__cta--outline" onclick="window.location.href=\'/dashboard/\'">Gerenciar</button>';
    }
    var bkLabels = { pt: 'Reservar', en: 'Book Now', es: 'Reservar' };
    return '<button class="gcv-tour-card__cta" data-book-tour="' + tour.id + '">' + (bkLabels[lang] || 'Reservar') + '</button>';
  }

  function renderCard(tour) {
    var spotsLeft   = parseInt(tour.spots_left || 0, 10);
    var diffLabel   = (diffLabels[lang] || diffLabels.pt)[tour.difficulty] || tour.difficulty;
    var regionLabel = regionLabels[tour.region] || tour.region;
    var imgHtml     = tour.cover_url
      ? '<img class="gcv-tour-card__img" src="' + tour.cover_url + '" alt="' + (tour.title || '') + '" loading="lazy" />'
      : '<div class="gcv-tour-card__img-placeholder">🌿</div>';
    var spotsClass  = spotsLeft <= 3 ? ' gcv-tour-card__spots--low' : '';
    var spotsLabel  = { pt: 'vagas disponíveis', en: 'spots left', es: 'lugares disponibles' };

    return '<article class="gcv-tour-card">'
      + imgHtml
      + '<div class="gcv-tour-card__body">'
      + '<div class="gcv-tour-card__badges">'
      + '<span class="gcv-chip gcv-chip--green">' + diffLabel + '</span>'
      + '<span class="gcv-chip gcv-chip--blue">' + regionLabel + '</span>'
      + '</div>'
      + '<h3 class="gcv-tour-card__title">' + (tour.title || '') + '</h3>'
      + '<div class="gcv-tour-card__meta">'
      + '<span class="gcv-tour-card__meta-item">📅 ' + formatDate(tour.departure_date) + '</span>'
      + '<span class="gcv-tour-card__meta-item">🕐 ' + (tour.departure_time || '').substr(0,5) + '</span>'
      + (tour.meeting_point ? '<span class="gcv-tour-card__meta-item">📍 ' + tour.meeting_point + '</span>' : '')
      + '</div>'
      + '<div class="gcv-tour-card__price">' + (tour.price_brl || '') + ' <small>/ pessoa</small></div>'
      + '<div class="gcv-tour-card__spots' + spotsClass + '">' + spotsLeft + ' ' + (spotsLabel[lang] || 'vagas') + '</div>'
      + buildCtaHtml(tour)
      + '</div>'
      + '<div class="gcv-tour-card__guide">'
      + (tour.guide_photo ? '<img class="gcv-tour-card__guide-avatar" src="' + tour.guide_photo + '" alt="' + (tour.guide_name||'') + '" />' : '')
      + '<span>' + (tour.guide_name || '') + (tour.guide_cadastur ? ' · Cadastur' : '') + '</span>'
      + '</div>'
      + '</article>';
  }

  function renderGrid(container, toursData) {
    if (!container) return;
    if (!toursData || toursData.length === 0) {
      var empty = { pt: 'Nenhuma excursão encontrada', en: 'No tours found', es: 'No se encontraron excursiones' };
      container.innerHTML = '<div class="gcv-tours-empty"><div class="gcv-tours-empty__icon">🌿</div><p class="gcv-tours-empty__title">' + (empty[lang] || 'Nenhuma excursão') + '</p></div>';
      return;
    }
    container.innerHTML = toursData.map(renderCard).join('');

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-book-tour]');
      if (!btn) return;
      var tourId = btn.getAttribute('data-book-tour');
      var tour   = toursData.filter(function (t) { return String(t.id) === tourId; })[0];
      if (tour) openBookingModal(tour);
    });
  }

  function openBookingModal(tour) {
    var modal = document.getElementById('gcv-booking-modal');
    var body  = document.getElementById('gcv-modal-body');
    var title = document.getElementById('gcv-modal-title');
    if (!modal || !body) return;

    if (title) title.textContent = tour.title || '';
    var spotsLeft = parseInt(tour.spots_left || 0, 10);

    body.innerHTML = '<p><strong>' + formatDate(tour.departure_date) + '</strong> às ' + (tour.departure_time || '').substr(0,5) + '</p>'
      + '<p>Preço por pessoa: <strong>' + (tour.price_brl||'') + '</strong></p>'
      + '<p>Vagas disponíveis: <strong>' + spotsLeft + '</strong></p>'
      + '<div class="gcv-auth-field" style="margin:16px 0;">'
      + '<label class="gcv-auth-label" for="modal-spots">Quantidade de vagas</label>'
      + '<input type="number" id="modal-spots" min="1" max="' + spotsLeft + '" value="1" class="gcv-auth-input" />'
      + '</div>'
      + '<div id="modal-book-error" class="gcv-auth-error" hidden></div>'
      + '<button class="gcv-auth-btn gcv-auth-btn--primary" id="modal-book-btn" data-tour-id="' + tour.id + '">Confirmar Reserva</button>';

    modal.hidden = false;

    var bookBtn = document.getElementById('modal-book-btn');
    if (bookBtn) {
      bookBtn.addEventListener('click', function () {
        var spotsInput = document.getElementById('modal-spots');
        var spots      = parseInt(spotsInput.value, 10);
        var bookErr    = document.getElementById('modal-book-error');
        if (!spots || spots < 1) return;

        bookBtn.disabled = true;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/bookings/create.php');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
          var res;
          try { res = JSON.parse(xhr.responseText); } catch (e) { res = {}; }
          if (!res.ok) {
            if (bookErr) { bookErr.textContent = res.error || 'Erro ao reservar'; bookErr.hidden = false; }
            bookBtn.disabled = false;
            return;
          }
          // Open payment flow
          modal.hidden = true;
          if (window.GCVPayment && window.GCVPayment.openPayment) {
            window.GCVPayment.openPayment(res.data.booking_id, tour);
          } else {
            window.location.href = '/dashboard/';
          }
        };
        xhr.onerror = function () { bookBtn.disabled = false; };
        xhr.send(JSON.stringify({ tour_id: parseInt(tour.id, 10), spots: spots }));
      });
    }
  }

  function initFilters() {
    var diffSelect = document.getElementById('filter-difficulty');
    var regSelect  = document.getElementById('filter-region');
    var dateFrom   = document.getElementById('filter-date-from');
    var dateTo     = document.getElementById('filter-date-to');
    var grid       = document.getElementById('gcv-tours-grid');

    function applyFilters() {
      var params = {
        limit: 20,
        difficulty: diffSelect ? diffSelect.value : '',
        region:     regSelect  ? regSelect.value  : '',
        date_from:  dateFrom   ? dateFrom.value   : '',
        date_to:    dateTo     ? dateTo.value      : '',
      };
      fetchTours(params, function (err, data) {
        tours = data || [];
        renderGrid(grid, tours);
      });
    }

    if (diffSelect) diffSelect.addEventListener('change', applyFilters);
    if (regSelect)  regSelect.addEventListener('change',  applyFilters);
    if (dateFrom)   dateFrom.addEventListener('change',   applyFilters);
    if (dateTo)     dateTo.addEventListener('change',     applyFilters);
  }

  function initHomeSection() {
    var homeGrid    = document.getElementById('home-tours-grid');
    var homeSection = document.getElementById('proximas-saidas');
    if (!homeGrid) return;

    fetchTours({ limit: 3 }, function (err, data) {
      if (!data || data.length === 0) return;
      if (homeSection) homeSection.hidden = false;
      renderGrid(homeGrid, data);
    });
  }

  function init() {
    var grid = document.getElementById('gcv-tours-grid');
    fetchUser(function () {
      if (grid) {
        fetchTours({ limit: 20 }, function (err, data) {
          tours = data || [];
          renderGrid(grid, tours);
          initFilters();
        });
      }
      initHomeSection();
    });

    // Modal close
    var modal     = document.getElementById('gcv-booking-modal');
    var closeBtn  = document.getElementById('gcv-modal-close');
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', function () { modal.hidden = true; });
    }
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.hidden = true;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

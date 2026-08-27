/* gcv-meeting-point.js — autocomplete + mapa + GPS só em celular */
(function (global) {
  'use strict';

  function canUseDeviceGps() {
    try {
      return !!(global.navigator && global.navigator.geolocation)
        && global.matchMedia
        && global.matchMedia('(max-width: 768px)').matches;
    } catch (e) {
      return false;
    }
  }

  function mapEmbedSrc(lat, lng) {
    return 'https://maps.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng) + '&z=16&output=embed';
  }

  function showMap(mapEl, lat, lng) {
    if (!mapEl) return;
    var frame = mapEl.querySelector('iframe');
    if (!frame || lat == null || lng == null || lat === '' || lng === '') {
      mapEl.hidden = true;
      return;
    }
    frame.src = mapEmbedSrc(lat, lng);
    mapEl.hidden = false;
  }

  function hideMap(mapEl) {
    if (!mapEl) return;
    var frame = mapEl.querySelector('iframe');
    if (frame) frame.src = 'about:blank';
    mapEl.hidden = true;
  }

  function applyPlace(cfg, pl, fallbackPlaceId) {
    var place = pl || {};
    var name = place.name || place.label || '';
    var lat = place.lat != null ? String(place.lat) : '';
    var lng = place.lng != null ? String(place.lng) : '';
    if (name && cfg.input) cfg.input.value = name;
    if (cfg.placeEl) cfg.placeEl.value = place.place_id || fallbackPlaceId || '';
    if (cfg.latEl) cfg.latEl.value = lat;
    if (cfg.lngEl) cfg.lngEl.value = lng;
    if (cfg.gpsEl) {
      if (lat && lng) {
        cfg.gpsEl.innerHTML = 'GPS gravado' +
          (place.maps_url
            ? ' · <a href="' + cfg.esc(place.maps_url) + '" target="_blank" rel="noopener">Abrir no Maps</a>'
            : '');
      } else {
        cfg.gpsEl.textContent = 'Local selecionado (sem coordenadas).';
      }
    }
    if (lat && lng) showMap(cfg.mapEl, lat, lng);
    else hideMap(cfg.mapEl);
  }

  function bindMeetingPoint(cfg) {
    var input = cfg.input;
    var box = cfg.box;
    var get = cfg.get;
    var esc = cfg.esc;
    if (!input || !box || !get || !esc) return;

    var hintDefault = canUseDeviceGps()
      ? 'Digite o endereço e escolha uma sugestão, ou use o GPS.'
      : 'Digite o endereço e escolha uma sugestão.';
    if (cfg.gpsEl && (!cfg.latEl || !cfg.latEl.value) && (!cfg.lngEl || !cfg.lngEl.value)) {
      cfg.gpsEl.textContent = hintDefault;
    }
    if (cfg.latEl && cfg.lngEl && cfg.latEl.value && cfg.lngEl.value) {
      showMap(cfg.mapEl, cfg.latEl.value, cfg.lngEl.value);
    }

    var gpsBtn = cfg.gpsBtn;
    if (gpsBtn) {
      if (canUseDeviceGps()) {
        gpsBtn.hidden = false;
        gpsBtn.classList.add('is-gps-ready');
        gpsBtn.onclick = function () {
          if (cfg.gpsEl) cfg.gpsEl.textContent = 'Obtendo sua localização…';
          global.navigator.geolocation.getCurrentPosition(function (pos) {
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            get('/api/places/reverse.php?lat=' + encodeURIComponent(String(lat)) +
              '&lng=' + encodeURIComponent(String(lng)), function (e, r) {
              box.innerHTML = '';
              if (r && r.ok && r.data) {
                applyPlace(cfg, r.data, r.data.place_id || '');
                return;
              }
              applyPlace(cfg, {
                name: 'Minha localização',
                lat: lat,
                lng: lng,
                maps_url: 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng)
              }, '');
            });
          }, function () {
            if (cfg.gpsEl) {
              cfg.gpsEl.textContent = 'Não foi possível obter o GPS. Digite o endereço.';
            }
          }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        };
      } else {
        gpsBtn.hidden = true;
        gpsBtn.classList.remove('is-gps-ready');
      }
    }

    var timer = null;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (cfg.placeEl) cfg.placeEl.value = '';
      if (cfg.latEl) cfg.latEl.value = '';
      if (cfg.lngEl) cfg.lngEl.value = '';
      hideMap(cfg.mapEl);
      if (cfg.gpsEl) cfg.gpsEl.textContent = hintDefault;
      timer = setTimeout(function () {
        if (q.length < 2) {
          box.innerHTML = '';
          return;
        }
        var cityId = cfg.getCityId ? (parseInt(cfg.getCityId(), 10) || 0) : 0;
        var url = '/api/places/autocomplete.php?q=' + encodeURIComponent(q);
        if (cityId) url += '&city_id=' + encodeURIComponent(String(cityId));
        get(url, function (e, r) {
          if (!r || !r.ok) {
            box.innerHTML = '<div class="gcv-cms-muted">' + esc((r && r.error) || 'Busca indisponível') + '</div>';
            return;
          }
          var preds = (r.data && r.data.predictions) || [];
          box.innerHTML = preds.map(function (pr) {
            return '<button type="button" class="gcv-cms-suggest__item"' +
              ' data-place="' + esc(pr.place_id || '') + '"' +
              ' data-main="' + esc(pr.main_text || '') + '"' +
              ' data-desc="' + esc(pr.description || '') + '"' +
              ' data-lat="' + esc(pr.lat != null ? String(pr.lat) : '') + '"' +
              ' data-lng="' + esc(pr.lng != null ? String(pr.lng) : '') + '"' +
              ' data-maps="' + esc(pr.maps_url || '') + '">' +
              esc(pr.description || pr.main_text || '') + '</button>';
          }).join('') || '<div class="gcv-cms-muted">Sem resultados</div>';
          box.querySelectorAll('[data-place], .gcv-cms-suggest__item').forEach(function (b) {
            b.onclick = function () {
              var placeId = b.getAttribute('data-place') || '';
              var lat = b.getAttribute('data-lat') || '';
              var lng = b.getAttribute('data-lng') || '';
              input.value = b.getAttribute('data-main') || b.getAttribute('data-desc') || '';
              box.innerHTML = '';
              if (cfg.placeEl) cfg.placeEl.value = placeId;
              if (lat && lng) {
                applyPlace(cfg, {
                  name: input.value,
                  place_id: placeId,
                  lat: lat,
                  lng: lng,
                  maps_url: b.getAttribute('data-maps') || ''
                }, placeId);
              }
              if (!placeId) return;
              get('/api/places/details.php?place_id=' + encodeURIComponent(placeId), function (e2, r2) {
                if (!r2 || !r2.ok || !r2.data) return;
                applyPlace(cfg, r2.data, placeId);
              });
            };
          });
        });
      }, 320);
    });
  }

  global.gcvBindMeetingPoint = bindMeetingPoint;
  global.gcvCanUseDeviceGps = canUseDeviceGps;
})(window);

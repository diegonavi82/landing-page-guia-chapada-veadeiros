/* gcv-meeting-point.js — digitação manual + GPS só no celular */
(function (global) {
  'use strict';

  function isPhoneLike() {
    try {
      var ua = String((global.navigator && global.navigator.userAgent) || '');
      var mobileUa = /Android.+Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      var coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
      var narrow = global.matchMedia && global.matchMedia('(max-width: 768px)').matches;
      return mobileUa || (narrow && coarse);
    } catch (e) {
      return false;
    }
  }

  function canUseDeviceGps() {
    return isPhoneLike()
      && !!(global.navigator && typeof global.navigator.geolocation === 'object');
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

  function hintDefault() {
    return canUseDeviceGps()
      ? 'Digite o endereço ou use o GPS do celular.'
      : 'Digite o endereço do ponto de encontro.';
  }

  function applyPlace(cfg, pl) {
    var place = pl || {};
    var name = place.name || place.label || '';
    var lat = place.lat != null ? String(place.lat) : '';
    var lng = place.lng != null ? String(place.lng) : '';
    if (name && cfg.input) cfg.input.value = name;
    if (cfg.placeEl) cfg.placeEl.value = place.place_id || '';
    if (cfg.latEl) cfg.latEl.value = lat;
    if (cfg.lngEl) cfg.lngEl.value = lng;
    if (cfg.gpsEl) {
      if (lat && lng) {
        cfg.gpsEl.innerHTML = 'GPS gravado' +
          (place.maps_url
            ? ' · <a href="' + cfg.esc(place.maps_url) + '" target="_blank" rel="noopener">Abrir no Maps</a>'
            : '');
      } else {
        cfg.gpsEl.textContent = hintDefault();
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
    if (!input) return;

    if (box) box.innerHTML = '';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'sentences');
    input.setAttribute('spellcheck', 'true');

    if (cfg.gpsEl && (!cfg.latEl || !cfg.latEl.value) && (!cfg.lngEl || !cfg.lngEl.value)) {
      cfg.gpsEl.textContent = hintDefault();
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
            var fallback = {
              name: lat.toFixed(6) + ', ' + lng.toFixed(6),
              lat: lat,
              lng: lng,
              maps_url: 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng)
            };
            if (typeof get !== 'function') {
              applyPlace(cfg, fallback);
              return;
            }
            get('/api/places/reverse.php?lat=' + encodeURIComponent(String(lat)) +
              '&lng=' + encodeURIComponent(String(lng)), function (e, r) {
              if (r && r.ok && r.data) {
                applyPlace(cfg, r.data);
                return;
              }
              applyPlace(cfg, fallback);
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

    input.addEventListener('input', function () {
      if (cfg.placeEl) cfg.placeEl.value = '';
      if (cfg.latEl) cfg.latEl.value = '';
      if (cfg.lngEl) cfg.lngEl.value = '';
      hideMap(cfg.mapEl);
      if (cfg.gpsEl) cfg.gpsEl.textContent = hintDefault();
      if (box) box.innerHTML = '';
    });
  }

  global.gcvBindMeetingPoint = bindMeetingPoint;
  global.gcvCanUseDeviceGps = canUseDeviceGps;
})(window);

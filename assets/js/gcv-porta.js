/* gcv-porta.js — sessão por aba (admin / guia / cliente) */
(function (w) {
  'use strict';

  var KEY = 'gcv_porta';
  var VALID = { admin: 1, guide: 1, client: 1 };

  function readFromUrl() {
    try {
      var q = new URLSearchParams(w.location.search);
      var v = String(q.get('as') || q.get('porta') || '').toLowerCase();
      return VALID[v] ? v : '';
    } catch (e) {
      return '';
    }
  }

  function guessFromPath() {
    var path = String(w.location.pathname || '');
    if (/\/admin\//.test(path)) return 'admin';
    if (/\/guia\//.test(path)) return 'guide';
    var form = document.getElementById('gcv-login-form') || document.getElementById('gcv-register-form');
    var ctx = form && form.getAttribute('data-context');
    ctx = String(ctx || '').toLowerCase();
    return VALID[ctx] ? ctx : '';
  }

  function current() {
    var fromUrl = readFromUrl();
    if (fromUrl) {
      set(fromUrl);
      return fromUrl;
    }
    try {
      var s = String(w.sessionStorage.getItem(KEY) || '').toLowerCase();
      if (VALID[s]) return s;
    } catch (e) {}
    return guessFromPath();
  }

  function set(role) {
    role = String(role || '').toLowerCase();
    if (!VALID[role]) return;
    try { w.sessionStorage.setItem(KEY, role); } catch (e) {}
  }

  function dashboardUrl(role, hash) {
    role = VALID[role] ? role : (current() || 'guide');
    var url = '/dashboard/?as=' + encodeURIComponent(role);
    if (hash) url += String(hash).charAt(0) === '#' ? hash : ('#' + hash);
    return url;
  }

  function loginUrl(role) {
    role = VALID[role] ? role : (current() || 'client');
    var dash = dashboardUrl(role);
    if (role === 'admin') return '/admin/login.html?redirect=' + encodeURIComponent(dash);
    if (role === 'guide') return '/guia/login.html?redirect=' + encodeURIComponent(dash);
    return '/login.html?redirect=' + encodeURIComponent(dash);
  }

  function withAs(url, porta) {
    if (!porta || typeof url !== 'string') return url;
    if (url.indexOf('/api/') === -1 && url.indexOf('api/') === -1) return url;
    if (/[?&]as=/.test(url)) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'as=' + encodeURIComponent(porta);
  }

  function patchXhr() {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      var porta = current();
      if (porta && typeof url === 'string') {
        url = withAs(url, porta);
        arguments[1] = url;
      }
      this._gcvPorta = porta;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var porta = this._gcvPorta || current();
      if (porta) {
        try { this.setRequestHeader('X-GCV-Porta', porta); } catch (e) {}
      }
      return origSend.apply(this, arguments);
    };
  }

  function patchFetch() {
    if (typeof w.fetch !== 'function') return;
    var orig = w.fetch.bind(w);
    w.fetch = function (input, init) {
      var porta = current();
      if (!porta) return orig(input, init);
      init = Object.assign({}, init || {});
      var headers;
      try {
        if (init.headers) headers = new Headers(init.headers);
        else if (w.Request && input instanceof Request) headers = new Headers(input.headers);
        else headers = new Headers();
        if (!headers.has('X-GCV-Porta')) headers.set('X-GCV-Porta', porta);
        init.headers = headers;
      } catch (e) {}
      if (typeof input === 'string') input = withAs(input, porta);
      return orig(input, init);
    };
  }

  patchXhr();
  patchFetch();

  var portaNow = current();
  if (portaNow && /\/dashboard\/?$/.test(String(w.location.pathname || '')) && !readFromUrl()) {
    try {
      var u = new URL(w.location.href);
      u.searchParams.set('as', portaNow);
      w.history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  w.GcvPorta = {
    current: current,
    set: set,
    dashboardUrl: dashboardUrl,
    loginUrl: loginUrl
  };
})(window);

/* Modal de confirmação padronizado (fundo preto, mensagem central). */
(function (global) {
  'use strict';

  var LABELS = {
    pt: { ok: 'Confirmar', cancel: 'Cancelar' },
    en: { ok: 'Confirm', cancel: 'Cancel' },
    es: { ok: 'Confirmar', cancel: 'Cancelar' }
  };

  var overlay = null;
  var msgEl = null;
  var okBtn = null;
  var cancelBtn = null;
  var pending = null;

  function lang() {
    var raw = (document.documentElement.getAttribute('lang') || 'pt').toLowerCase();
    if (raw.indexOf('en') === 0) return 'en';
    if (raw.indexOf('es') === 0) return 'es';
    return 'pt';
  }

  function ensure() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'gcv-confirm';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="gcv-confirm__dialog" role="dialog" aria-modal="true" aria-labelledby="gcv-confirm-msg">' +
      '<p class="gcv-confirm__msg" id="gcv-confirm-msg"></p>' +
      '<div class="gcv-confirm__actions">' +
      '<button type="button" class="gcv-confirm__btn gcv-confirm__btn--cancel" data-gcv-confirm-cancel></button>' +
      '<button type="button" class="gcv-confirm__btn gcv-confirm__btn--ok" data-gcv-confirm-ok></button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    msgEl = overlay.querySelector('.gcv-confirm__msg');
    okBtn = overlay.querySelector('[data-gcv-confirm-ok]');
    cancelBtn = overlay.querySelector('[data-gcv-confirm-cancel]');
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) finish(false);
    });
    cancelBtn.addEventListener('click', function () { finish(false); });
    okBtn.addEventListener('click', function () { finish(true); });
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    });
  }

  function finish(ok) {
    if (!pending) return;
    var done = pending;
    pending = null;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gcv-confirm-open');
    done(!!ok);
  }

  function gcvConfirm(message, opts) {
    opts = opts || {};
    ensure();
    return new Promise(function (resolve) {
      if (pending) finish(false);
      pending = resolve;
      var pack = LABELS[lang()] || LABELS.pt;
      msgEl.textContent = String(message == null ? '' : message);
      cancelBtn.textContent = opts.cancelText || pack.cancel;
      okBtn.textContent = opts.okText || pack.ok;
      okBtn.classList.toggle('gcv-confirm__btn--danger', !!opts.danger);
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('gcv-confirm-open');
      setTimeout(function () { okBtn.focus(); }, 0);
    });
  }

  global.gcvConfirm = gcvConfirm;
})(typeof window !== 'undefined' ? window : globalThis);

/* Modal de confirmação padronizado (fundo preto, mensagem central). */
(function (global) {
  'use strict';

  var LABELS = {
    pt: { ok: 'Confirmar', cancel: 'Cancelar', gotIt: 'Entendi', write: 'Escrever motivo', reasonErr: 'Informe o motivo.' },
    en: { ok: 'Confirm', cancel: 'Cancel', gotIt: 'Got it', write: 'Write a reason', reasonErr: 'Please enter a reason.' },
    es: { ok: 'Confirmar', cancel: 'Cancelar', gotIt: 'Entendido', write: 'Escribir motivo', reasonErr: 'Informe el motivo.' }
  };

  var DEFAULT_REASONS = [
    'Devido à alta demanda de guias cadastrados, não estamos aceitando novas inscrições. Entraremos em contato em breve ao lançarmos novas vagas',
    'Os dados enviados estão incompletos ou inconsistentes. Você pode se cadastrar novamente com as informações corretas.',
    'Não foi possível validar os documentos ou dados de identificação informados. Você pode tentar novamente com documentos atualizados.',
    'O perfil enviado não atende aos critérios atuais da plataforma. Você pode se cadastrar novamente em outro momento.'
  ];

  var overlay = null;
  var msgEl = null;
  var okBtn = null;
  var cancelBtn = null;
  var pending = null;

  var reasonOverlay = null;
  var reasonPending = null;

  function lang() {
    var raw = (document.documentElement.getAttribute('lang') || 'pt').toLowerCase();
    if (raw.indexOf('en') === 0) return 'en';
    if (raw.indexOf('es') === 0) return 'es';
    return 'pt';
  }

  function pack() {
    return LABELS[lang()] || LABELS.pt;
  }

  function injectCss() {
    if (document.getElementById('gcv-confirm-css-link')) return;
    var found = document.querySelector('link[href*="gcv-confirm.css"]');
    if (found) {
      found.id = found.id || 'gcv-confirm-css-link';
      return;
    }
    var link = document.createElement('link');
    link.id = 'gcv-confirm-css-link';
    link.rel = 'stylesheet';
    link.href = '/assets/css/gcv-confirm.css?v=1.0.4';
    (document.head || document.documentElement).appendChild(link);
  }

  function ensure() {
    injectCss();
    if (overlay) return;
    if (!document.body) return;
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
      if (e.target === overlay) finish(!!overlay._gcvAlert);
    });
    cancelBtn.addEventListener('click', function () { finish(false); });
    okBtn.addEventListener('click', function () { finish(true); });
    document.addEventListener('keydown', function (e) {
      if (reasonOverlay && !reasonOverlay.hidden) {
        if (e.key === 'Escape') {
          e.preventDefault();
          finishReason(null);
        }
        return;
      }
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(!!overlay._gcvAlert);
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
    return new Promise(function (resolve) {
      function start() {
        ensure();
        if (!overlay) {
          if (document.body) {
            resolve(false);
            return;
          }
          document.addEventListener('DOMContentLoaded', start, { once: true });
          return;
        }
        if (pending) finish(false);
        pending = resolve;
        var labels = pack();
        var isAlert = !!opts.alert;
        overlay._gcvAlert = isAlert;
        msgEl.textContent = String(message == null ? '' : message);
        cancelBtn.hidden = isAlert;
        cancelBtn.textContent = opts.cancelText || labels.cancel;
        okBtn.textContent = opts.okText || (isAlert ? labels.gotIt : labels.ok);
        okBtn.classList.toggle('gcv-confirm__btn--danger', !!opts.danger);
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('gcv-confirm-open');
        setTimeout(function () { okBtn.focus(); }, 0);
      }
      start();
    });
  }

  function gcvAlert(message, opts) {
    opts = opts || {};
    opts.alert = true;
    return gcvConfirm(message, opts);
  }

  function ensureReason() {
    if (reasonOverlay) return;
    ensure();
    reasonOverlay = document.createElement('div');
    reasonOverlay.className = 'gcv-confirm gcv-confirm--reason';
    reasonOverlay.hidden = true;
    reasonOverlay.setAttribute('aria-hidden', 'true');
    reasonOverlay.innerHTML =
      '<div class="gcv-confirm__dialog gcv-confirm__dialog--reason" role="dialog" aria-modal="true">' +
      '<h3 class="gcv-confirm__title" data-gcv-reason-title></h3>' +
      '<p class="gcv-confirm__intro" data-gcv-reason-intro></p>' +
      '<div class="gcv-confirm__reasons" data-gcv-reason-list></div>' +
      '<label class="gcv-confirm__custom">' +
      '<textarea data-gcv-reason-text rows="4" maxlength="500"></textarea>' +
      '</label>' +
      '<p class="gcv-confirm__err" data-gcv-reason-err hidden></p>' +
      '<div class="gcv-confirm__actions">' +
      '<button type="button" class="gcv-confirm__btn gcv-confirm__btn--cancel" data-gcv-reason-cancel></button>' +
      '<button type="button" class="gcv-confirm__btn gcv-confirm__btn--ok gcv-confirm__btn--danger" data-gcv-reason-ok></button>' +
      '</div></div>';
    document.body.appendChild(reasonOverlay);
    reasonOverlay.addEventListener('click', function (e) {
      if (e.target === reasonOverlay) finishReason(null);
    });
    reasonOverlay.querySelector('[data-gcv-reason-cancel]').addEventListener('click', function () {
      finishReason(null);
    });
    reasonOverlay.querySelector('[data-gcv-reason-ok]').addEventListener('click', function () {
      submitReason();
    });
  }

  function selectedReason() {
    var checked = reasonOverlay.querySelector('input[name="gcv-reason"]:checked');
    var text = String((reasonOverlay.querySelector('[data-gcv-reason-text]') || {}).value || '').trim();
    if (!checked) return text;
    if (checked.value === 'custom') return text;
    return String(checked.value || '').trim();
  }

  function submitReason() {
    var labels = pack();
    var err = reasonOverlay.querySelector('[data-gcv-reason-err]');
    var reason = selectedReason();
    if (!reason) {
      err.textContent = labels.reasonErr;
      err.hidden = false;
      var ta = reasonOverlay.querySelector('[data-gcv-reason-text]');
      if (ta) ta.focus();
      return;
    }
    finishReason(reason);
  }

  function finishReason(value) {
    if (!reasonPending) return;
    var done = reasonPending;
    reasonPending = null;
    reasonOverlay.hidden = true;
    reasonOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gcv-confirm-open');
    done(value);
  }

  function gcvReasonDialog(opts) {
    opts = opts || {};
    ensureReason();
    var labels = pack();
    var reasons = (opts.reasons && opts.reasons.length) ? opts.reasons : DEFAULT_REASONS;
    return new Promise(function (resolve) {
      if (reasonPending) finishReason(null);
      reasonPending = resolve;
      reasonOverlay.querySelector('[data-gcv-reason-title]').textContent = opts.title || 'Motivo';
      reasonOverlay.querySelector('[data-gcv-reason-intro]').textContent = opts.intro || '';
      reasonOverlay.querySelector('[data-gcv-reason-cancel]').textContent = opts.cancelText || labels.cancel;
      reasonOverlay.querySelector('[data-gcv-reason-ok]').textContent = opts.okText || labels.ok;
      reasonOverlay.querySelector('[data-gcv-reason-err]').hidden = true;
      var list = reasonOverlay.querySelector('[data-gcv-reason-list]');
      list.innerHTML = reasons.map(function (text, i) {
        var id = 'gcv-reason-' + i;
        return '<label class="gcv-confirm__reason" for="' + id + '">' +
          '<input type="radio" name="gcv-reason" id="' + id + '" value="' + String(text).replace(/"/g, '&quot;') + '"' + (i === 0 ? ' checked' : '') + '>' +
          '<span>' + String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></label>';
      }).join('') +
        '<label class="gcv-confirm__reason" for="gcv-reason-custom">' +
        '<input type="radio" name="gcv-reason" id="gcv-reason-custom" value="custom">' +
        '<span>' + labels.write + '</span></label>';
      var ta = reasonOverlay.querySelector('[data-gcv-reason-text]');
      ta.value = '';
      ta.placeholder = labels.write;
      list.querySelectorAll('input[name="gcv-reason"]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (input.value === 'custom') ta.focus();
        });
      });
      reasonOverlay.hidden = false;
      reasonOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('gcv-confirm-open');
      setTimeout(function () {
        var first = list.querySelector('input');
        if (first) first.focus();
      }, 0);
    });
  }

  global.gcvConfirm = gcvConfirm;
  global.gcvAlert = gcvAlert;
  global.gcvReasonDialog = gcvReasonDialog;
  global.GCV_REJECT_REASONS = DEFAULT_REASONS;
  try {
    global.alert = function (message) {
      gcvAlert(arguments.length ? String(message) : '');
    };
  } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : globalThis);

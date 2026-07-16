/* gcv-auth.js — Autenticação | Guia Chapada Veadeiros */
(function () {
  'use strict';

  var BASE = '/api/auth';
  var i18n = {};
  var lang = 'pt';

  function detectLang() {
    var path = window.location.pathname;
    if (path.indexOf('/en/') !== -1) return 'en';
    if (path.indexOf('/es/') !== -1) return 'es';
    return 'pt';
  }

  function loadI18n(cb) {
    lang = detectLang();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/assets/i18n/auth.' + lang + '.json');
    xhr.onload = function () {
      try { i18n = JSON.parse(xhr.responseText); } catch (e) { i18n = {}; }
      cb();
    };
    xhr.onerror = function () { cb(); };
    xhr.send();
  }

  function t(section, key) {
    return (i18n[section] && i18n[section][key]) || key;
  }

  function showError(el, msg) {
    if (!el) return;
    if (typeof msg === 'string' && msg.indexOf('<') !== -1) {
      el.innerHTML = msg;
    } else {
      el.textContent = msg;
    }
    el.hidden = false;
  }

  function hideError(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  function showSuccess(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function post(url, data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb(new Error('Resposta inválida')); }
    };
    xhr.onerror = function () { cb(new Error('Erro de rede')); };
    xhr.send(JSON.stringify(data));
  }

  function passwordStrength(pass) {
    var score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;
    if (score <= 1) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  }

  function bindStrength(inputId) {
    var input = document.getElementById(inputId);
    var bars  = document.getElementById('gcv-strength-bars');
    var label = document.getElementById('gcv-strength-label');
    if (!input || !bars) return;
    var labels = { weak: t('register','strength_weak'), medium: t('register','strength_medium'), strong: t('register','strength_strong') };
    input.addEventListener('input', function () {
      var s = passwordStrength(input.value);
      bars.className = 'gcv-auth-strength gcv-auth-strength--' + s;
      if (label) label.textContent = input.value ? labels[s] : '';
    });
  }

  function getContext() {
    var form = document.getElementById('gcv-login-form') || document.getElementById('gcv-register-form');
    return (form && form.getAttribute('data-context')) || 'client';
  }

  function getRedirect() {
    var params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/dashboard/';
  }

  /* ---- Login ---- */
  function initLogin() {
    var form  = document.getElementById('gcv-login-form');
    var err   = document.getElementById('gcv-auth-error');
    var btn   = document.getElementById('gcv-login-btn');
    if (!form) return;

    var context = form.getAttribute('data-context') || 'client';
    var btnDefault = btn ? (btn.textContent || 'Entrar') : 'Entrar';

    // Check error from OAuth redirect
    var params = new URLSearchParams(window.location.search);
    var oauthErr = params.get('error');
    if (oauthErr) {
      var oauthMsgs = {
        oauth_state: 'Sessão do Google expirou. Tente novamente.',
        oauth_token: 'Não foi possível validar o login Google. Tente novamente.',
        oauth_userinfo: 'Não foi possível ler seus dados no Google.',
        oauth_user: 'Conta Google sem e-mail disponível.',
        suspended: 'Esta conta está suspensa. Fale conosco no WhatsApp.',
        admin_only: 'Acesso restrito à administração. Use a conta admin cadastrada.',
        guide_area: 'Esta conta é de cliente. Use a <a href="/login.html">Área do Cliente</a>.',
        client_area: 'Esta conta é de guia. Use a <a href="/guia/login.html">Área do Guia</a>.',
        db: 'Erro ao entrar. Tente novamente em instantes.'
      };
      showError(err, oauthMsgs[oauthErr] || 'Erro no login com Google. Tente novamente.');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError(err);
      if (btn) btn.disabled = true;
      if (btn) btn.textContent = '...';

      var email = form.querySelector('[name=email]').value.trim();
      var pass  = form.querySelector('[name=password]').value;

      post(BASE + '/login.php', { email: email, password: pass }, function (error, res) {
        if (btn) btn.disabled = false;
        if (btn) btn.textContent = btnDefault;
        if (error || !res.ok) {
          showError(err, (res && res.error) || t('login', 'error_invalid'));
          return;
        }

        var role = res.data && res.data.role;

        // Validação de contexto: guia na área do cliente → redirecionar
        if (context === 'client' && (role === 'guide')) {
          showError(err, 'Esta área é para clientes. <a href="/guia/login.html">Entre pela Área do Guia →</a>');
          return;
        }
        // Cliente na área do guia → redirecionar
        if (context === 'guide' && role === 'client') {
          showError(err, 'Esta área é exclusiva para guias. <a href="/login.html">Entre pela Área do Cliente →</a>');
          return;
        }
        // Admin: só role admin
        if (context === 'admin' && role !== 'admin') {
          showError(err, 'Acesso restrito à administração.');
          return;
        }
        // Cliente/guia não entram pela porta admin (já bloqueado acima); admin na área cliente/guia segue para o painel
        if (context === 'client' && role === 'admin') {
          window.location.href = '/dashboard/';
          return;
        }
        if (context === 'guide' && role === 'admin') {
          window.location.href = '/dashboard/';
          return;
        }
        window.location.href = context === 'admin' ? '/dashboard/' : getRedirect();
      });
    });
  }

  /* ---- Register ---- */
  function initRegister() {
    var form  = document.getElementById('gcv-register-form');
    var err   = document.getElementById('gcv-auth-error');
    var suc   = document.getElementById('gcv-auth-success');
    var btn   = document.getElementById('gcv-register-btn');
    if (!form) return;

    bindStrength('register-password');

    // Role buttons
    var roleInput = document.getElementById('register-role');
    var roleBtns  = document.querySelectorAll('.gcv-auth-role-btn');
    var cadasturField = document.getElementById('cadastur-field');
    var guideNote     = document.getElementById('guide-note');

    roleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        roleBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var role = btn.getAttribute('data-role');
        if (roleInput) roleInput.value = role;
        if (cadasturField) cadasturField.hidden = role !== 'guide';
        if (guideNote) guideNote.hidden = role !== 'guide';
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError(err);
      if (suc) suc.hidden = true;

      var name     = form.querySelector('[name=name]').value.trim();
      var email    = form.querySelector('[name=email]').value.trim();
      var pass     = form.querySelector('[name=password]').value;
      var confirm  = form.querySelector('[name=password_confirm]').value;
      var role     = (roleInput && roleInput.value) || 'client';
      var cadastur = (form.querySelector('[name=cadastur]') && form.querySelector('[name=cadastur]').value) || '';

      if (pass !== confirm) {
        showError(err, t('register', 'error_mismatch'));
        return;
      }
      if (pass.length < 8) {
        showError(err, t('register', 'error_short'));
        return;
      }

      if (btn) btn.disabled = true;

      post(BASE + '/register.php', { name: name, email: email, password: pass, role: role, lang: lang, cadastur: cadastur }, function (error, res) {
        if (btn) btn.disabled = false;
        if (error || !res.ok) {
          showError(err, (res && res.error) || 'Erro ao criar conta');
          return;
        }
        if (suc) showSuccess(suc, (res.data && res.data.message) || 'Conta criada!');
        form.reset();
        setTimeout(function () { window.location.href = '/login.html'; }, 2500);
      });
    });
  }

  /* ---- Forgot Password ---- */
  function initForgot() {
    var form  = document.getElementById('gcv-forgot-form');
    var step2 = document.getElementById('gcv-forgot-step2');
    var step1 = document.getElementById('gcv-forgot-step1');
    var err   = document.getElementById('gcv-auth-error');
    if (!form) return;

    var emailSent = '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError(err);
      var email = form.querySelector('[name=email]').value.trim();
      emailSent = email;

      post(BASE + '/forgot-password.php', { email: email }, function (error, res) {
        if (error) { showError(err, 'Erro de rede'); return; }
        if (step1) step1.hidden = true;
        if (step2) step2.hidden = false;
      });
    });

    // Code inputs auto-advance
    var codeInputs = document.querySelectorAll('.gcv-auth-code-input');
    codeInputs.forEach(function (input, idx) {
      input.addEventListener('input', function () {
        if (input.value && idx < codeInputs.length - 1) {
          codeInputs[idx + 1].focus();
        }
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && idx > 0) {
          codeInputs[idx - 1].focus();
        }
      });
    });

    var codeForm = document.getElementById('gcv-code-form');
    var err2     = document.getElementById('gcv-auth-error2');
    if (!codeForm) return;

    codeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (err2) err2.hidden = true;
      var code = Array.from(codeInputs).map(function (i) { return i.value; }).join('');
      if (code.length !== 6) { showError(err2, 'Digite todos os 6 dígitos'); return; }

      post(BASE + '/reset-password.php', { code: code, email: emailSent, password: '___placeholder___', password_confirm: '___placeholder___' }, function (error, res) {
        // Just validate — redirect to reset page with code pre-filled
        window.location.href = '/resetar-senha.html?code=' + code + '&email=' + encodeURIComponent(emailSent);
      });
    });
  }

  /* ---- Reset Password ---- */
  function initReset() {
    var form = document.getElementById('gcv-reset-form');
    var err  = document.getElementById('gcv-auth-error');
    var suc  = document.getElementById('gcv-auth-success');
    if (!form) return;

    bindStrength('reset-password');

    var params = new URLSearchParams(window.location.search);
    var token  = params.get('token') || '';
    var code   = params.get('code')  || '';
    var email  = params.get('email') || '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError(err);
      if (suc) suc.hidden = true;

      var pass    = form.querySelector('[name=password]').value;
      var confirm = form.querySelector('[name=password_confirm]').value;

      if (pass !== confirm) { showError(err, t('reset', 'error_mismatch') || 'As senhas não coincidem'); return; }
      if (pass.length < 8)  { showError(err, t('reset', 'error_short') || 'Senha muito curta'); return; }

      var payload = { password: pass, password_confirm: confirm };
      if (token) payload.token = token;
      if (code && email) { payload.code = code; payload.email = email; }

      post(BASE + '/reset-password.php', payload, function (error, res) {
        if (error || !res.ok) {
          showError(err, (res && res.error) || t('reset', 'error_invalid'));
          return;
        }
        showSuccess(suc, t('reset', 'success') || 'Senha redefinida! Faça login.');
        setTimeout(function () { window.location.href = '/login.html'; }, 2000);
      });
    });
  }

  /* ---- Init ---- */
  function init() {
    loadI18n(function () {
      initLogin();
      initRegister();
      initForgot();
      initReset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

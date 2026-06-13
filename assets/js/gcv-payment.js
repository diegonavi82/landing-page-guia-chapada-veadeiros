/* gcv-payment.js — Pagamento Pix/Cartão | Guia Chapada Veadeiros */
(function () {
  'use strict';

  var pollInterval = null;

  function openPayment(bookingId, tour) {
    var modal = document.getElementById('gcv-payment-modal');
    var body  = document.getElementById('gcv-payment-modal-body');
    if (!modal || !body) {
      window.location.href = '/dashboard/';
      return;
    }

    body.innerHTML = buildMethodSelector(bookingId, tour);
    modal.hidden = false;

    document.getElementById('gcv-pay-method-pix').addEventListener('click', function () {
      selectMethod('pix', bookingId, tour);
    });
    document.getElementById('gcv-pay-method-card').addEventListener('click', function () {
      selectMethod('card', bookingId, tour);
    });

    var closeBtn = document.getElementById('gcv-pay-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        modal.hidden = true;
        if (pollInterval) clearInterval(pollInterval);
      });
    }
  }

  function buildMethodSelector(bookingId, tour) {
    var total = tour && tour.price_brl ? tour.price_brl : '';
    return '<div class="gcv-pay-page">'
      + '<h2 class="gcv-modal__title">Escolha como pagar</h2>'
      + (total ? '<div class="gcv-pay-summary"><div class="gcv-pay-summary__row gcv-pay-summary__row--total"><span>Total</span><span>' + total + '</span></div></div>' : '')
      + '<div class="gcv-pay-methods">'
      + '<div class="gcv-pay-method" id="gcv-pay-method-pix">'
      + '<div class="gcv-pay-method__icon">🔑</div>'
      + '<div class="gcv-pay-method__name">Pix</div>'
      + '<div class="gcv-pay-method__desc">Instantâneo e gratuito</div>'
      + '</div>'
      + '<div class="gcv-pay-method" id="gcv-pay-method-card">'
      + '<div class="gcv-pay-method__icon">💳</div>'
      + '<div class="gcv-pay-method__name">Cartão</div>'
      + '<div class="gcv-pay-method__desc">Crédito ou débito</div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function selectMethod(method, bookingId, tour) {
    var body = document.getElementById('gcv-payment-modal-body');
    if (!body) return;

    if (method === 'pix') {
      body.innerHTML = '<div class="gcv-pay-page"><p style="text-align:center;color:#666;margin:20px 0;">Gerando QR Code...</p></div>';
      generatePix(bookingId, tour);
    } else {
      renderCardForm(bookingId, tour);
    }
  }

  function generatePix(bookingId, tour) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/payments/pix.php');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      var res;
      try { res = JSON.parse(xhr.responseText); } catch (e) { res = {}; }
      if (!res.ok) {
        showPaymentError(res.error || 'Erro ao gerar Pix');
        return;
      }
      renderPixScreen(res.data, bookingId);
    };
    xhr.onerror = function () { showPaymentError('Erro de rede'); };
    xhr.send(JSON.stringify({ booking_id: bookingId }));
  }

  function renderPixScreen(data, bookingId) {
    var body = document.getElementById('gcv-payment-modal-body');
    if (!body) return;

    var qrImg = data.qr_code_base64
      ? '<img src="data:image/png;base64,' + data.qr_code_base64 + '" alt="QR Code Pix" style="width:100%;display:block;" />'
      : '';

    body.innerHTML = '<div class="gcv-pay-page">'
      + '<h2 class="gcv-modal__title" style="margin-bottom:16px;">Pagar com Pix</h2>'
      + '<div class="gcv-pay-pix">'
      + '<div class="gcv-pay-pix__timer" id="gcv-pix-timer">30:00</div>'
      + (qrImg ? '<div class="gcv-pay-pix__qr">' + qrImg + '</div>' : '')
      + (data.qr_code ? '<div class="gcv-pay-pix__copy"><span class="gcv-pay-pix__copy-code" id="gcv-pix-code">' + data.qr_code + '</span><button class="gcv-pay-pix__copy-btn" id="gcv-copy-pix">Copiar</button></div>' : '')
      + '<p class="gcv-pay-pix__instructions">Abra seu app do banco, selecione Pix e escaneie o QR code ou copie o código acima.</p>'
      + '<div id="gcv-pix-status" style="margin-top:16px;text-align:center;font-size:0.875rem;color:#888;">Aguardando pagamento...</div>'
      + '</div></div>';

    // Copy button
    var copyBtn = document.getElementById('gcv-copy-pix');
    var codeEl  = document.getElementById('gcv-pix-code');
    if (copyBtn && codeEl) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(codeEl.textContent).then(function () {
          copyBtn.textContent = 'Copiado!';
          setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 2000);
        });
      });
    }

    // Countdown timer
    var seconds = data.expires_in || 1800;
    var timerEl = document.getElementById('gcv-pix-timer');
    var countdownInterval = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(countdownInterval);
        if (timerEl) { timerEl.textContent = '00:00'; timerEl.classList.add('gcv-pay-pix__timer--expiring'); }
        return;
      }
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      if (timerEl) {
        timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        if (seconds <= 120) timerEl.classList.add('gcv-pay-pix__timer--expiring');
      }
    }, 1000);

    // Poll status
    pollInterval = setInterval(function () {
      pollStatus(bookingId, function (status) {
        var statusEl = document.getElementById('gcv-pix-status');
        if (status === 'paid') {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          renderSuccess();
        } else if (statusEl) {
          statusEl.textContent = 'Aguardando confirmação...';
        }
      });
    }, 5000);
  }

  function renderCardForm(bookingId) {
    var body = document.getElementById('gcv-payment-modal-body');
    if (!body) return;

    body.innerHTML = '<div class="gcv-pay-page">'
      + '<h2 class="gcv-modal__title" style="margin-bottom:16px;">Pagar com Cartão</h2>'
      + '<div id="gcv-card-error" class="gcv-auth-error" hidden></div>'
      + '<div class="gcv-pay-card-form">'
      + '<div class="gcv-pay-card-field"><label class="gcv-pay-card-label">Número do cartão</label><input class="gcv-pay-card-input" id="card-number" type="text" placeholder="0000 0000 0000 0000" maxlength="19" /></div>'
      + '<div class="gcv-pay-card-row">'
      + '<div class="gcv-pay-card-field"><label class="gcv-pay-card-label">Validade</label><input class="gcv-pay-card-input" id="card-expiry" type="text" placeholder="MM/AA" maxlength="5" /></div>'
      + '<div class="gcv-pay-card-field"><label class="gcv-pay-card-label">CVV</label><input class="gcv-pay-card-input" id="card-cvv" type="text" placeholder="000" maxlength="4" /></div>'
      + '</div>'
      + '<div class="gcv-pay-card-field"><label class="gcv-pay-card-label">Nome no cartão</label><input class="gcv-pay-card-input" id="card-name" type="text" placeholder="NOME SOBRENOME" /></div>'
      + '<button class="gcv-pay-btn" id="gcv-pay-card-btn">Pagar com Cartão</button>'
      + '<p class="gcv-pay-secure">🔒 Pagamento seguro via Mercado Pago</p>'
      + '</div></div>';

    var btn = document.getElementById('gcv-pay-card-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        var err = document.getElementById('gcv-card-error');
        if (err) { err.hidden = true; }
        btn.disabled = true;
        btn.textContent = 'Processando...';

        // SDK do MP deve tokenizar o cartão — simplificado aqui
        var mpPublicKey = document.querySelector('meta[name="mp-public-key"]');
        if (!mpPublicKey || !window.MercadoPago) {
          // Fallback: redirecionar para dashboard
          window.location.href = '/dashboard/';
          return;
        }

        var mp = new window.MercadoPago(mpPublicKey.getAttribute('content'));
        mp.createCardToken({
          cardNumber:    document.getElementById('card-number').value.replace(/\s/g, ''),
          cardholderName: document.getElementById('card-name').value,
          cardExpirationMonth: (document.getElementById('card-expiry').value.split('/')[0] || ''),
          cardExpirationYear: '20' + (document.getElementById('card-expiry').value.split('/')[1] || ''),
          securityCode: document.getElementById('card-cvv').value,
        }, function (status, response) {
          if (status !== 200 && status !== 201) {
            if (err) { err.textContent = 'Dados do cartão inválidos'; err.hidden = false; }
            btn.disabled = false;
            btn.textContent = 'Pagar com Cartão';
            return;
          }
          var xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/payments/card.php');
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.onload = function () {
            var res;
            try { res = JSON.parse(xhr.responseText); } catch (e) { res = {}; }
            if (!res.ok) {
              if (err) { err.textContent = res.error || 'Pagamento recusado'; err.hidden = false; }
              btn.disabled = false;
              btn.textContent = 'Pagar com Cartão';
              return;
            }
            if (res.data.status === 'approved') renderSuccess();
            else if (err) { err.textContent = 'Status: ' + res.data.status; err.hidden = false; }
          };
          xhr.send(JSON.stringify({
            booking_id: bookingId,
            card_token: response.id,
            payment_method_id: response.payment_method_id,
            installments: 1,
          }));
        });
      });
    }
  }

  function pollStatus(bookingId, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/payments/status.php?booking_id=' + bookingId);
    xhr.onload = function () {
      try {
        var res = JSON.parse(xhr.responseText);
        cb(res.ok ? res.data.status : 'unknown');
      } catch (e) { cb('unknown'); }
    };
    xhr.onerror = function () { cb('unknown'); };
    xhr.send();
  }

  function renderSuccess() {
    var body = document.getElementById('gcv-payment-modal-body');
    if (!body) return;
    body.innerHTML = '<div class="gcv-pay-success">'
      + '<div class="gcv-pay-success__icon">✅</div>'
      + '<h2 class="gcv-pay-success__title">Pagamento confirmado!</h2>'
      + '<p class="gcv-pay-success__body">Sua reserva está confirmada. Você receberá um email com os detalhes.</p>'
      + '<a class="gcv-auth-btn gcv-auth-btn--primary" href="/dashboard/" style="display:inline-block;max-width:260px;margin:0 auto;">Ver minhas reservas</a>'
      + '</div>';
  }

  function showPaymentError(msg) {
    var body = document.getElementById('gcv-payment-modal-body');
    if (!body) return;
    body.innerHTML = '<div style="padding:20px;text-align:center;"><p style="color:#e53e3e;">' + msg + '</p><button class="gcv-auth-btn gcv-auth-btn--secondary" onclick="document.getElementById(\'gcv-payment-modal\').hidden=true;">Fechar</button></div>';
  }

  window.GCVPayment = { openPayment: openPayment };

}());

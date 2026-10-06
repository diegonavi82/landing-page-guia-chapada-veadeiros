/**
 * confirmar-cartao.html — o cliente confirma o cartão salvo (link do e-mail) para manter a vaga.
 * Mercado Pago: digita só o CVV no formulário do MP. Stripe: abre o checkout seguro.
 * Nada é cobrado aqui: o valor fica reservado e só é cobrado quando o passeio confirmar.
 */
(function () {
  "use strict";

  var STRINGS = {
    pt: {
      title: "Confirme seu cartão",
      intro: "Para manter sua vaga, confirme o cartão usado na reserva. Nada é cobrado agora: o valor só é cobrado quando o passeio for confirmado.",
      code: "Reserva",
      amount: "Valor",
      card: "Cartão",
      confirmStripe: "Confirmar cartão",
      devSimulate: "Simular confirmação (só desenvolvimento)",
      done: "Tudo certo! Seu cartão foi confirmado.",
      invalid: "Link inválido ou expirado. Fale com a gente pelo WhatsApp.",
      notNeeded: "Esta reserva não precisa de confirmação.",
      seeBooking: "Ver minha reserva",
      error: "Não foi possível confirmar. Tente de novo.",
      people: "pessoa(s)",
    },
    en: {
      title: "Confirm your card",
      intro: "To keep your spot, confirm the card used for this booking. Nothing is charged now: you are only charged once the tour is confirmed.",
      code: "Booking",
      amount: "Amount",
      card: "Card",
      confirmStripe: "Confirm card",
      devSimulate: "Simulate confirmation (development only)",
      done: "All set! Your card is confirmed.",
      invalid: "Invalid or expired link. Please message us on WhatsApp.",
      notNeeded: "This booking does not need confirmation.",
      seeBooking: "See my booking",
      error: "Could not confirm. Please try again.",
      people: "person(s)",
    },
    es: {
      title: "Confirma tu tarjeta",
      intro: "Para mantener tu cupo, confirma la tarjeta usada en la reserva. No se cobra nada ahora: solo se cobra cuando el paseo se confirme.",
      code: "Reserva",
      amount: "Monto",
      card: "Tarjeta",
      confirmStripe: "Confirmar tarjeta",
      devSimulate: "Simular confirmación (solo desarrollo)",
      done: "¡Listo! Tu tarjeta fue confirmada.",
      invalid: "Enlace inválido o vencido. Escríbenos por WhatsApp.",
      notNeeded: "Esta reserva no necesita confirmación.",
      seeBooking: "Ver mi reserva",
      error: "No se pudo confirmar. Inténtalo de nuevo.",
      people: "persona(s)",
    },
  };

  var path = window.location.pathname;
  var loc = path.indexOf("/en/") >= 0 ? "en" : path.indexOf("/es/") >= 0 ? "es" : "pt";
  var L = STRINGS[loc];
  var root = document.getElementById("gcv-card-action");
  if (!root) return;
  var params = new URLSearchParams(window.location.search);
  var r = params.get("r") || "";
  var k = params.get("k") || "";
  var api = "/api/card_action.php";

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function confirmUrl(id) {
    return (loc === "pt" ? "/" : "/" + loc + "/") + "confirmacao.html?id=" + encodeURIComponent(id);
  }
  function card(inner) {
    root.innerHTML = '<article class="gcv-confirmacao-card"><header class="gcv-confirmacao-card__head">' +
      '<h1 class="gcv-confirmacao-card__title">' + esc(L.title) + "</h1></header>" + inner + "</article>";
  }
  function message(text, id) {
    card('<p class="gcv-confirmacao-note">' + esc(text) + "</p>" +
      (id ? '<p><a class="gcv-btn gcv-btn-main" href="' + confirmUrl(id) + '">' + esc(L.seeBooking) + "</a></p>" : ""));
  }
  function post(body) {
    return fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ r: r, k: k }, body)),
    }).then(function (res) { return res.json(); });
  }
  function showError(text) {
    var el = document.getElementById("gcv-ca-error");
    if (el) { el.hidden = false; el.textContent = text || L.error; }
  }
  function afterPost(res) {
    if (res && res.success && res.url) { window.location.href = res.url; return; }
    if (res && res.success && res.redirect) { window.location.href = res.redirect; return; }
    showError(res && res.message);
    throw new Error("fail");
  }

  if (!/^GCV-[A-Z0-9]{6}$/.test(r) || !k) {
    message(L.invalid);
    return;
  }

  fetch(api + "?r=" + encodeURIComponent(r) + "&k=" + encodeURIComponent(k), { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(function (res) { return res.json(); })
    .then(function (d) {
      if (!d || !d.success) { message((d && d.message) || L.invalid); return; }
      if (d.status !== "CARD_SAVED") { message(L.notNeeded, d.reservation_id); return; }
      var trips = (d.trips || []).map(function (t) {
        return "<li>" + esc(t.title || "") + (t.starts_at ? " · " + esc(String(t.starts_at).slice(0, 16)) : "") + " · " + esc(t.people) + " " + esc(L.people) + "</li>";
      }).join("");
      var html =
        '<p class="gcv-confirmacao-card__subtitle">' + esc(L.intro) + "</p>" +
        '<div class="gcv-confirmacao-meta">' +
        '<div class="gcv-confirmacao-meta__item"><span class="gcv-confirmacao-meta__label">' + esc(L.code) + '</span><span class="gcv-confirmacao-meta__value--code">' + esc(d.reservation_id) + "</span></div>" +
        (d.charged_label ? '<div class="gcv-confirmacao-meta__item"><span class="gcv-confirmacao-meta__label">' + esc(L.amount) + "</span><span>" + esc(d.charged_label) + "</span></div>" : "") +
        (d.mp && d.mp.last4 ? '<div class="gcv-confirmacao-meta__item"><span class="gcv-confirmacao-meta__label">' + esc(L.card) + "</span><span>•••• " + esc(d.mp.last4) + "</span></div>" : "") +
        "</div>" +
        (trips ? '<ul class="gcv-confirmacao-note">' + trips + "</ul>" : "") +
        '<div id="gcv-ca-action"></div>' +
        '<p class="gcv-confirmacao-note" id="gcv-ca-error" hidden style="color:#b91c1c"></p>';
      card(html);
      var box = document.getElementById("gcv-ca-action");

      if (d.gateway === "stripe") {
        box.innerHTML = '<button type="button" class="gcv-btn gcv-btn-main" id="gcv-ca-stripe">' + esc(L.confirmStripe) + "</button>";
        document.getElementById("gcv-ca-stripe").onclick = function () {
          this.disabled = true;
          var btn = this;
          post({ action: "stripe" }).then(afterPost).catch(function () { btn.disabled = false; });
        };
        return;
      }

      var mp = d.mp || {};
      if (!mp.public_key) {
        if (!/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) { message(L.error, d.reservation_id); return; }
        box.innerHTML = '<button type="button" class="gcv-btn gcv-btn-main" id="gcv-ca-dev">' + esc(L.devSimulate) + "</button>";
        document.getElementById("gcv-ca-dev").onclick = function () {
          post({ action: "mp", token: "dev-test-token" }).then(afterPost).catch(function () {});
        };
        return;
      }
      box.innerHTML = '<div id="gcv-ca-brick"></div>';
      var sc = document.createElement("script");
      sc.src = "https://sdk.mercadopago.com/js/v2";
      sc.onload = function () {
        var sdk = new window.MercadoPago(mp.public_key, { locale: loc === "en" ? "en-US" : loc === "es" ? "es-AR" : "pt-BR" });
        // Cartão salvo: o formulário pede só o código de segurança (CVV).
        sdk.bricks().create("cardPayment", "gcv-ca-brick", {
          initialization: {
            amount: mp.amount,
            payer: { customerId: mp.customer_id, cardsIds: mp.card_id ? [mp.card_id] : [] },
          },
          customization: { paymentMethods: { maxInstallments: 1 } },
          callbacks: {
            onReady: function () {},
            onSubmit: function (formData) {
              return post({ action: "mp", token: formData.token }).then(afterPost);
            },
            onError: function (e) { if (window.console) console.warn("[mp]", e); },
          },
        });
      };
      sc.onerror = function () { showError(L.error); };
      document.head.appendChild(sc);
    })
    .catch(function () { message(L.error); });
})();

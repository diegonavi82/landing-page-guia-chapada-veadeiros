/**
 * Avaliação do guia — token da reserva, 3 critérios, ocultar (não excluir).
 */
(function () {
  "use strict";

  var STRINGS = {
    pt: {
      loading: "Carregando…",
      invalid: "Este link de avaliação é inválido.",
      notPaid: "Esta reserva não está paga. Não é possível avaliar.",
      tooEarly: "O passeio ainda não ocorreu. Você poderá avaliar a partir da data da experiência.",
      expired: "O prazo de 1 ano para avaliar este passeio encerrou. Não é possível enviar uma nova avaliação.",
      expiredKeep: "Se você já avaliou, o registro permanece no sistema.",
      already: "Você já avaliou esta experiência.",
      error: "Não foi possível carregar. Tente novamente.",
      submitErr: "Não foi possível salvar a avaliação.",
      scoresErr: "Informe as 3 notas (1 a 5 estrelas).",
      duplicate: "Já existe uma avaliação para esta reserva.",
      tour: "Experiência",
      guide: "Guia",
      date: "Data do passeio",
      deadline: "Avaliar até",
      code: "Reserva",
      punctuality: "Pontualidade",
      knowledge: "Conhecimento local",
      service: "Atendimento",
      avg: "Média",
      comment: "Comentário (opcional)",
      commentPh: "Como foi a experiência com o guia?",
      photos: "Fotos (opcional, até 5)",
      photosHint: "JPG, PNG ou WEBP · máx. 8 MB cada",
      submit: "Enviar avaliação",
      sending: "Enviando…",
      thanks: "Obrigado! Sua avaliação foi registrada.",
      hide: "Ocultar minha avaliação",
      show: "Reexibir minha avaliação",
      hiddenTourist: "Sua avaliação está oculta no perfil público do guia. O administrador continua podendo vê-la.",
      hiddenAdmin: "Esta avaliação está oculta publicamente pela equipe. Ela permanece registrada.",
      hiddenBoth: "Esta avaliação está oculta publicamente.",
      visibleNote: "Sua avaliação aparece no perfil público do guia.",
      hideOk: "Avaliação ocultada. Ela continua registrada e você pode reexibi-la depois.",
      showOk: "Avaliação visível novamente no perfil do guia.",
      hideHint: "Ocultar retira a exibição pública. Não apaga a avaliação.",
      photoErr: "Não foi possível enviar a foto.",
      remove: "Remover",
    },
    en: {
      loading: "Loading…",
      invalid: "This review link is invalid.",
      notPaid: "This reservation is not paid. You cannot leave a review.",
      tooEarly: "The tour has not taken place yet. You can review from the tour date.",
      expired: "The 1-year window to review this tour has ended. You cannot submit a new review.",
      expiredKeep: "If you already left a review, it remains in the system.",
      already: "You have already reviewed this experience.",
      error: "Could not load. Please try again.",
      submitErr: "Could not save the review.",
      scoresErr: "Please rate all 3 criteria (1 to 5 stars).",
      duplicate: "This reservation already has a review.",
      tour: "Experience",
      guide: "Guide",
      date: "Tour date",
      deadline: "Review until",
      code: "Reservation",
      punctuality: "Punctuality",
      knowledge: "Local knowledge",
      service: "Service",
      avg: "Average",
      comment: "Comment (optional)",
      commentPh: "How was your experience with the guide?",
      photos: "Photos (optional, up to 5)",
      photosHint: "JPG, PNG or WEBP · max 8 MB each",
      submit: "Submit review",
      sending: "Sending…",
      thanks: "Thank you! Your review has been saved.",
      hide: "Hide my review",
      show: "Show my review again",
      hiddenTourist: "Your review is hidden from the guide’s public profile. Admins can still see it.",
      hiddenAdmin: "This review is hidden publicly by the team. It remains on file.",
      hiddenBoth: "This review is hidden from the public profile.",
      visibleNote: "Your review appears on the guide’s public profile.",
      hideOk: "Review hidden. It stays on file and you can show it again later.",
      showOk: "Review is visible on the guide’s profile again.",
      hideHint: "Hiding removes public display. It does not delete the review.",
      photoErr: "Could not upload the photo.",
      remove: "Remove",
    },
    es: {
      loading: "Cargando…",
      invalid: "Este enlace de evaluación no es válido.",
      notPaid: "Esta reserva no está pagada. No es posible evaluar.",
      tooEarly: "El paseo todavía no ocurrió. Podrás evaluar a partir de la fecha de la experiencia.",
      expired: "El plazo de 1 año para evaluar este paseo terminó. No es posible enviar una nueva evaluación.",
      expiredKeep: "Si ya evaluaste, el registro permanece en el sistema.",
      already: "Ya evaluaste esta experiencia.",
      error: "No se pudo cargar. Inténtalo de nuevo.",
      submitErr: "No se pudo guardar la evaluación.",
      scoresErr: "Indica las 3 notas (1 a 5 estrellas).",
      duplicate: "Esta reserva ya tiene una evaluación.",
      tour: "Experiencia",
      guide: "Guía",
      date: "Fecha del paseo",
      deadline: "Evaluar hasta",
      code: "Reserva",
      punctuality: "Puntualidad",
      knowledge: "Conocimiento local",
      service: "Atención",
      avg: "Promedio",
      comment: "Comentario (opcional)",
      commentPh: "¿Cómo fue la experiencia con el guía?",
      photos: "Fotos (opcional, hasta 5)",
      photosHint: "JPG, PNG o WEBP · máx. 8 MB cada una",
      submit: "Enviar evaluación",
      sending: "Enviando…",
      thanks: "¡Gracias! Tu evaluación quedó registrada.",
      hide: "Ocultar mi evaluación",
      show: "Volver a mostrar mi evaluación",
      hiddenTourist: "Tu evaluación está oculta en el perfil público del guía. El administrador sigue pudiendo verla.",
      hiddenAdmin: "Esta evaluación está oculta públicamente por el equipo. Sigue registrada.",
      hiddenBoth: "Esta evaluación está oculta en el perfil público.",
      visibleNote: "Tu evaluación aparece en el perfil público del guía.",
      hideOk: "Evaluación oculta. Sigue registrada y puedes mostrarla de nuevo después.",
      showOk: "Evaluación visible otra vez en el perfil del guía.",
      hideHint: "Ocultar retira la exhibición pública. No borra la evaluación.",
      photoErr: "No se pudo enviar la foto.",
      remove: "Quitar",
    },
  };

  function locOf(el) {
    var v = (el.getAttribute("data-locale") || "pt").toLowerCase();
    return STRINGS[v] ? v : "pt";
  }

  function t(loc, key) {
    return (STRINGS[loc] && STRINGS[loc][key]) || STRINGS.pt[key] || key;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    var raw = String(iso || "").slice(0, 10);
    var p = raw.split("-");
    if (p.length !== 3 || !p[0]) return iso || "—";
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function tokenFromUrl() {
    try {
      return String(new URLSearchParams(location.search).get("t") || "").toLowerCase().trim();
    } catch (e) {
      return "";
    }
  }

  function starsHtml(score, interactive, key) {
    var n = Math.max(0, Math.min(5, parseInt(score, 10) || 0));
    var html = '<div class="gcv-review-stars' + (interactive ? " gcv-review-stars--edit" : "") + '" data-star-key="' + esc(key || "") + '">';
    var i;
    for (i = 1; i <= 5; i++) {
      if (interactive) {
        html +=
          '<button type="button" class="gcv-review-star' + (i <= n ? " is-on" : "") + '" data-star="' + i + '" aria-label="' + i + '">' +
          "★</button>";
      } else {
        html += '<span class="gcv-review-star' + (i <= n ? " is-on" : "") + '">★</span>';
      }
    }
    html += "</div>";
    return html;
  }

  function tourMeta(loc, tour) {
    if (!tour) return "";
    return (
      '<dl class="gcv-review-meta">' +
      "<div><dt>" + esc(t(loc, "tour")) + "</dt><dd>" + esc(tour.title || "—") + "</dd></div>" +
      "<div><dt>" + esc(t(loc, "guide")) + "</dt><dd>" + esc(tour.guide_name || "—") + "</dd></div>" +
      "<div><dt>" + esc(t(loc, "date")) + "</dt><dd>" + esc(fmtDate(tour.tour_date)) + "</dd></div>" +
      "<div><dt>" + esc(t(loc, "deadline")) + "</dt><dd>" + esc(fmtDate(tour.deadline)) + "</dd></div>" +
      (tour.reservation_id
        ? "<div><dt>" + esc(t(loc, "code")) + "</dt><dd>" + esc(tour.reservation_id) + "</dd></div>"
        : "") +
      "</dl>"
    );
  }

  function scoresBlock(loc, review, readonly) {
    var p = review ? review.score_punctuality : 0;
    var k = review ? review.score_knowledge : 0;
    var s = review ? review.score_service : 0;
    var avg = review && review.score_avg != null ? Number(review.score_avg).toFixed(2) : "—";
    return (
      '<div class="gcv-review-criteria">' +
      '<div class="gcv-review-crit"><span>' + esc(t(loc, "punctuality")) + "</span>" + starsHtml(p, !readonly, "punctuality") + "</div>" +
      '<div class="gcv-review-crit"><span>' + esc(t(loc, "knowledge")) + "</span>" + starsHtml(k, !readonly, "knowledge") + "</div>" +
      '<div class="gcv-review-crit"><span>' + esc(t(loc, "service")) + "</span>" + starsHtml(s, !readonly, "service") + "</div>" +
      (readonly
        ? '<p class="gcv-review-avg">' + esc(t(loc, "avg")) + ": <strong>" + esc(avg) + "</strong></p>"
        : "") +
      "</div>"
    );
  }

  function photosHtml(photos) {
    if (!photos || !photos.length) return "";
    return (
      '<div class="gcv-review-photos">' +
      photos
        .map(function (ph) {
          var url = ph && ph.url ? ph.url : "";
          if (!url) return "";
          return '<a href="' + esc(url) + '" target="_blank" rel="noopener"><img src="' + esc(url) + '" alt="" /></a>';
        })
        .join("") +
      "</div>"
    );
  }

  function visibilityNote(loc, review) {
    if (!review) return "";
    if (review.hidden_by_admin && review.hidden_by_tourist) return t(loc, "hiddenBoth");
    if (review.hidden_by_admin) return t(loc, "hiddenAdmin");
    if (review.hidden_by_tourist) return t(loc, "hiddenTourist");
    return t(loc, "visibleNote");
  }

  function bindStars(root, scores) {
    root.querySelectorAll("[data-star-key]").forEach(function (row) {
      var key = row.getAttribute("data-star-key");
      row.querySelectorAll("[data-star]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          scores[key] = parseInt(btn.getAttribute("data-star"), 10) || 0;
          row.querySelectorAll("[data-star]").forEach(function (b) {
            var n = parseInt(b.getAttribute("data-star"), 10) || 0;
            b.classList.toggle("is-on", n <= scores[key]);
          });
        });
      });
    });
  }

  function renderAlready(root, loc, token, data) {
    var review = data.review || {};
    var hiddenTourist = !!review.hidden_by_tourist;
    root.innerHTML =
      tourMeta(loc, data.tour) +
      '<p class="gcv-review-lead">' + esc(t(loc, "already")) + "</p>" +
      scoresBlock(loc, review, true) +
      (review.comment ? '<p class="gcv-review-comment">' + esc(review.comment) + "</p>" : "") +
      photosHtml(review.photos) +
      '<p class="gcv-review-vis-note">' + esc(visibilityNote(loc, review)) + "</p>" +
      '<p class="gcv-review-vis-hint">' + esc(t(loc, "hideHint")) + "</p>" +
      '<button type="button" class="gcv-reserva-btn gcv-reserva-btn--secondary" data-gcv-review-toggle>' +
      esc(hiddenTourist ? t(loc, "show") : t(loc, "hide")) +
      "</button>" +
      '<p class="gcv-review-msg" data-gcv-review-msg hidden></p>';

    var btn = root.querySelector("[data-gcv-review-toggle]");
    var msg = root.querySelector("[data-gcv-review-msg]");
    btn.addEventListener("click", function () {
      btn.disabled = true;
      fetch("/api/reviews/visibility.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, hidden: !hiddenTourist }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (json) {
          if (!json || !json.ok) throw new Error("vis");
          data.review = json.review || data.review;
          renderAlready(root, loc, token, data);
          var note = root.querySelector("[data-gcv-review-msg]");
          if (note) {
            note.hidden = false;
            note.textContent = hiddenTourist ? t(loc, "showOk") : t(loc, "hideOk");
          }
        })
        .catch(function () {
          btn.disabled = false;
          if (msg) {
            msg.hidden = false;
            msg.textContent = t(loc, "error");
          }
        });
    });
  }

  function renderForm(root, loc, token, data) {
    var scores = { punctuality: 0, knowledge: 0, service: 0 };
    var photos = [];
    root.innerHTML =
      tourMeta(loc, data.tour) +
      '<form class="gcv-reserva-form gcv-review-form" data-gcv-review-form novalidate>' +
      scoresBlock(loc, null, false) +
      '<label for="gcv-review-comment">' + esc(t(loc, "comment")) + "</label>" +
      '<textarea id="gcv-review-comment" maxlength="2000" rows="5" placeholder="' + esc(t(loc, "commentPh")) + '"></textarea>' +
      '<label>' + esc(t(loc, "photos")) + "</label>" +
      '<p class="gcv-review-photos-hint">' + esc(t(loc, "photosHint")) + "</p>" +
      '<input id="gcv-review-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />' +
      '<div class="gcv-review-photo-list" data-gcv-photo-list></div>' +
      '<button type="submit" class="gcv-reserva-btn">' + esc(t(loc, "submit")) + "</button>" +
      '<p class="gcv-review-msg" data-gcv-review-msg hidden></p>' +
      "</form>";

    bindStars(root, scores);
    var list = root.querySelector("[data-gcv-photo-list]");
    var fileInput = root.querySelector("#gcv-review-photos");
    var msg = root.querySelector("[data-gcv-review-msg]");
    var form = root.querySelector("[data-gcv-review-form]");

    function paintPhotos() {
      list.innerHTML = photos
        .map(function (ph, i) {
          return (
            '<div class="gcv-review-photo-item">' +
            '<img src="' + esc(ph.url) + '" alt="" />' +
            '<button type="button" data-remove-photo="' + i + '">' + esc(t(loc, "remove")) + "</button>" +
            "</div>"
          );
        })
        .join("");
      list.querySelectorAll("[data-remove-photo]").forEach(function (b) {
        b.addEventListener("click", function () {
          photos.splice(parseInt(b.getAttribute("data-remove-photo"), 10) || 0, 1);
          paintPhotos();
        });
      });
    }

    fileInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(fileInput.files || []);
      fileInput.value = "";
      files.forEach(function (file) {
        if (photos.length >= 5) return;
        var fd = new FormData();
        fd.append("token", token);
        fd.append("file", file);
        fetch("/api/reviews/photo.php", { method: "POST", body: fd })
          .then(function (r) {
            return r.json();
          })
          .then(function (json) {
            if (!json || !json.ok || !json.data) throw new Error("up");
            if (photos.length < 5) photos.push(json.data);
            paintPhotos();
          })
          .catch(function () {
            msg.hidden = false;
            msg.textContent = t(loc, "photoErr");
          });
      });
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (scores.punctuality < 1 || scores.knowledge < 1 || scores.service < 1) {
        msg.hidden = false;
        msg.textContent = t(loc, "scoresErr");
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = t(loc, "sending");
      fetch("/api/reviews/submit.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          locale: loc,
          score_punctuality: scores.punctuality,
          score_knowledge: scores.knowledge,
          score_service: scores.service,
          comment: (document.getElementById("gcv-review-comment") || {}).value || "",
          photos: photos,
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { status: r.status, json: j };
          });
        })
        .then(function (pack) {
          var json = pack.json || {};
          if (!json.ok) {
            var st = json.state || "";
            msg.hidden = false;
            msg.textContent =
              st === "scores"
                ? t(loc, "scoresErr")
                : st === "duplicate"
                  ? t(loc, "duplicate")
                  : st === "expired"
                    ? t(loc, "expired")
                    : st === "too_early"
                      ? t(loc, "tooEarly")
                      : json.message || t(loc, "submitErr");
            btn.disabled = false;
            btn.textContent = t(loc, "submit");
            return;
          }
          data.review = json.review;
          data.state = "already";
          renderAlready(root, loc, token, data);
          var thanks = document.createElement("p");
          thanks.className = "gcv-review-thanks";
          thanks.textContent = t(loc, "thanks");
          root.insertBefore(thanks, root.firstChild);
        })
        .catch(function () {
          msg.hidden = false;
          msg.textContent = t(loc, "submitErr");
          btn.disabled = false;
          btn.textContent = t(loc, "submit");
        });
    });
  }

  function renderState(root, loc, token, data) {
    var state = (data && data.state) || "invalid";
    if (state === "form") {
      renderForm(root, loc, token, data);
      return;
    }
    if (state === "already") {
      renderAlready(root, loc, token, data);
      return;
    }
    var msg = t(loc, "invalid");
    if (state === "expired") msg = t(loc, "expired") + " " + t(loc, "expiredKeep");
    else if (state === "too_early") msg = t(loc, "tooEarly");
    else if (state === "not_paid") msg = t(loc, "notPaid");
    root.innerHTML = tourMeta(loc, data && data.tour) + '<p class="gcv-review-lead">' + esc(msg) + "</p>";
    if (state === "expired" && data && data.review) {
      root.innerHTML +=
        scoresBlock(loc, data.review, true) +
        (data.review.comment ? '<p class="gcv-review-comment">' + esc(data.review.comment) + "</p>" : "") +
        photosHtml(data.review.photos);
    }
  }

  function boot(root) {
    var loc = locOf(root);
    var token = tokenFromUrl();
    var q = location.search;
    if (q) {
      document.querySelectorAll(".lang-switch a[href]").forEach(function (a) {
        var href = a.getAttribute("href");
        if (!href || href === "#" || href.indexOf("?") >= 0) return;
        a.setAttribute("href", href + q);
      });
    }
    if (!/^[a-f0-9]{64}$/.test(token)) {
      root.innerHTML = '<p class="gcv-review-lead">' + esc(t(loc, "invalid")) + "</p>";
      return;
    }
    root.innerHTML = '<p class="gcv-review-lead">' + esc(t(loc, "loading")) + "</p>";
    fetch("/api/reviews/form.php?t=" + encodeURIComponent(token))
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        if (!json || !json.ok) {
          renderState(root, loc, token, json || { state: "invalid" });
          return;
        }
        renderState(root, loc, token, json);
      })
      .catch(function () {
        root.innerHTML = '<p class="gcv-review-lead">' + esc(t(loc, "error")) + "</p>";
      });
  }

  document.querySelectorAll("[data-gcv-review]").forEach(boot);
})();

/**
 * Slider da home — exclusivo, compartilhado e reserva online.
 */
(function () {
  var hero = document.querySelector(".gcv-hero--offers");
  if (!hero) return;
  var slides = hero.querySelectorAll(".gcv-slide");
  var tabs = hero.querySelectorAll(".gcv-tab");
  var pauseBtn = hero.querySelector(".gcv-pause");
  if (!slides.length || !tabs.length || !pauseBtn) return;

  var DUR = 7000;
  var i = 0;
  var timer = null;
  var paused = false;
  var labelPause = pauseBtn.getAttribute("data-label-pause") || "Pausar slider";
  var labelPlay = pauseBtn.getAttribute("data-label-play") || "Continuar slider";

  function go(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle("is-active", on);
      s.setAttribute("aria-hidden", on ? "false" : "true");
      if (on) {
        var im = s.querySelector("img");
        if (im) im.loading = "eager";
      }
    });
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-current", on ? "true" : "false");
      var b = t.querySelector(".gcv-bar");
      if (!b) return;
      b.style.animation = "none";
      void b.offsetWidth;
      b.style.animation = "";
    });
    var nextImg = slides[(i + 1) % slides.length].querySelector("img");
    if (nextImg) nextImg.loading = "eager";
    restart();
  }

  function restart() {
    clearTimeout(timer);
    if (!paused) timer = setTimeout(function () { go(i + 1); }, DUR);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { go(+t.dataset.go); });
  });

  pauseBtn.addEventListener("click", function () {
    paused = !paused;
    hero.classList.toggle("is-paused", paused);
    pauseBtn.textContent = paused ? "▶" : "❚❚";
    pauseBtn.setAttribute("aria-label", paused ? labelPlay : labelPause);
    if (paused) clearTimeout(timer);
    else go(i);
  });

  var x0 = null;
  hero.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  });

  go(0);
})();

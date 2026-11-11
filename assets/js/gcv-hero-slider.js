/**
 * Slider da home — cupom, exclusivo, compartilhado e reserva online.
 */
(function () {
  var hero = document.querySelector(".gcv-hero--offers");
  if (!hero) return;

  function hojeBrasil() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  var hoje = hojeBrasil();
  hero.querySelectorAll("[data-gcv-until]").forEach(function (el) {
    var ate = el.getAttribute("data-gcv-until") || "";
    if (ate && hoje >= ate) el.remove();
  });

  var slides = hero.querySelectorAll(".gcv-slide");
  if (!slides.length) return;
  if (!hero.querySelector(".gcv-slide.is-active")) {
    slides[0].classList.add("is-active");
    slides[0].setAttribute("aria-hidden", "false");
  }
  var lang = (document.documentElement.lang || "pt").slice(0, 2);
  var meio = lang === "en" ? " of " : " de ";
  slides.forEach(function (s, k) {
    s.setAttribute("aria-label", (k + 1) + meio + slides.length);
  });

  hero.addEventListener("click", function (e) {
    var copy = e.target.closest("[data-gcv-copy-cupom]");
    var use = e.target.closest("[data-gcv-use-cupom]");
    var code = copy
      ? copy.getAttribute("data-gcv-copy-cupom") || ""
      : use
        ? use.getAttribute("data-gcv-use-cupom") || ""
        : "";
    if (!code) return;
    try { sessionStorage.setItem("gcv-exc-cupom-code", code); } catch (err) {}
    var field = document.querySelector("[data-gcv-cart-cupom-code]");
    var apply = document.querySelector("[data-gcv-cart-cupom-apply]");
    if (field) field.value = code;
    if (apply && apply.getAttribute("data-gcv-cart-cupom-mode") !== "remove") apply.click();
    if (!copy) return;
    e.preventDefault();
    var done = function () {
      copy.classList.add("is-copied");
      copy.textContent = copy.getAttribute("data-copied") || "Copiado";
      setTimeout(function () {
        copy.textContent = copy.getAttribute("data-label") || code;
        copy.classList.remove("is-copied");
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(function () {});
    } else {
      done();
    }
  });
  var tabs = hero.querySelectorAll(".gcv-tab");
  var pauseBtn = hero.querySelector(".gcv-pause");
  if (!slides.length || !pauseBtn) return;

  var DUR = 7000;
  var FIRST_DUR = 12000;
  var i = 0;
  var timer = null;
  var paused = false;
  var firstWait = true;

  function mount(slide) {
    var pic = slide.querySelector("picture");
    if (!pic || pic.getAttribute("data-gcv-mounted")) return;
    pic.querySelectorAll("[data-srcset]").forEach(function (el) {
      el.srcset = el.getAttribute("data-srcset");
    });
    var img = pic.querySelector("img");
    var src = img && img.getAttribute("data-src");
    if (src) img.src = src;
    pic.setAttribute("data-gcv-mounted", "1");
  }
  var labelPause = pauseBtn.getAttribute("data-label-pause") || "Pausar slider";
  var labelPlay = pauseBtn.getAttribute("data-label-play") || "Continuar slider";

  function go(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle("is-active", on);
      s.setAttribute("aria-hidden", on ? "false" : "true");
      if (on) mount(s);
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
    restart();
  }

  function restart() {
    clearTimeout(timer);
    var wait = firstWait ? FIRST_DUR : DUR;
    firstWait = false;
    if (!paused) timer = setTimeout(function () { go(i + 1); }, wait);
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

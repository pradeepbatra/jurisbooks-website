/* Screenshot slider: autoplay (paused on hover/focus/off-screen, off for reduced-motion),
   arrows, dots, keyboard arrows and touch swipe. No dependencies. */
(function () {
  function init(root) {
    var slides = [].slice.call(root.querySelectorAll('.slide'));
    var caps = [].slice.call(root.querySelectorAll('.cap'));
    var dotWrap = root.querySelector('.slider-dots');
    if (!slides.length) return;
    var i = 0, timer = null, visible = true, hovering = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dots = slides.map(function (_, n) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Show screen ' + (n + 1) + ' of ' + slides.length);
      b.addEventListener('click', function () { go(n, true); });
      dotWrap.appendChild(b); return b;
    });
    function go(n, user) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      caps.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      var nxt = slides[(i + 1) % slides.length].querySelector('img'); if (nxt && nxt.loading === 'lazy') nxt.loading = 'eager';
      if (user) restart();
    }
    function tick() { if (visible && !hovering && !document.hidden) go(i + 1); }
    function restart() { stop(); if (!reduce) timer = setInterval(tick, 5500); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    root.querySelector('.prev').addEventListener('click', function () { go(i - 1, true); });
    root.querySelector('.next').addEventListener('click', function () { go(i + 1, true); });
    root.addEventListener('mouseenter', function () { hovering = true; });
    root.addEventListener('mouseleave', function () { hovering = false; });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(i - 1, true); } else if (e.key === 'ArrowRight') { go(i + 1, true); }
    });
    var x0 = null, frame = root.querySelector('.slides');
    frame.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    frame.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1), true);
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.25 }).observe(root);
    }
    go(0); restart();
  }
  document.addEventListener('DOMContentLoaded', function () {
    [].forEach.call(document.querySelectorAll('[data-slider]'), init);
  });
})();

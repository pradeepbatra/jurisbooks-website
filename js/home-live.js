/* Home page: colours that change by themselves in the hero, the colour picker, the dispatch steps, the social media
   gallery and the fade-in as the page scrolls. Without this file the page still reads in full. */
(function () {
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var all = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  // ---------- fade in while scrolling ----------
  if (!calm && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-live');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    all('.reveal').forEach(function (x) { io.observe(x); });
  }

  // ---------- the hero: the same screen in each colour ----------
  var THEMES = all('#themeSwatches button').map(function (b) { return { key: b.getAttribute('data-theme'), label: b.getAttribute('aria-label') }; });
  var fade = $('heroFade');
  if (fade && THEMES.length && !calm) {
    var at = 0, layers = THEMES.map(function (t, i) {
      if (i === 0) return fade.querySelector('img');
      var im = new Image(); im.alt = ''; im.decoding = 'async'; fade.appendChild(im); return im;
    });
    var load = function (i) { if (!layers[i].getAttribute('src')) layers[i].src = 'images/themes/' + THEMES[i].key + '.webp'; };
    load(1);
    setInterval(function () {
      if (document.hidden) return;
      var n = (at + 1) % layers.length;
      if (!layers[n].complete) return;
      layers[at].classList.remove('on'); layers[n].classList.add('on'); at = n;
      load((at + 1) % layers.length);
    }, 3600);
  }

  // ---------- the colour picker ----------
  var pick = $('themeShot'), name = $('themeName');
  all('#themeSwatches button').forEach(function (b) {
    b.addEventListener('click', function () {
      all('#themeSwatches button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      pick.src = 'images/themes/' + b.getAttribute('data-theme') + '.webp';
      pick.alt = 'Jurisbooks dashboard in ' + b.getAttribute('aria-label');
      name.textContent = b.getAttribute('aria-label');
    });
  });

  // ---------- the dispatch steps light up in turn ----------
  var steps = all('#dispatchSteps li');
  if (steps.length && !calm) {
    var s = 0;
    setInterval(function () { if (document.hidden) return; steps.forEach(function (x, i) { x.classList.toggle('on', i === s); }); s = (s + 1) % steps.length; }, 1700);
  }

  // ---------- the social media gallery ----------
  var rail = $('socialRail');
  if (!rail) return;
  var tiles = all('button', rail), box = $('socialBox'), stage = $('socialStage'), now = 0, held = false;
  var step = function (d) {
    var w = rail.querySelector('li').getBoundingClientRect().width + 16;
    if (d > 0 && rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8) rail.scrollLeft = 0;
    else rail.scrollLeft += d * w;
  };
  $('socialPrev').addEventListener('click', function () { step(-1); });
  $('socialNext').addEventListener('click', function () { step(1); });
  ['mouseenter', 'focusin', 'touchstart'].forEach(function (e) { rail.addEventListener(e, function () { held = true; }, { passive: true }); });
  rail.addEventListener('mouseleave', function () { held = false; });
  var seen = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(rail);
  if (!calm) setInterval(function () { if (seen && !held && !document.hidden && !(box.open)) step(1); }, 3200);

  function show(i) {
    now = (i + tiles.length) % tiles.length;
    var t = tiles[now], video = t.getAttribute('data-video');
    stage.textContent = '';
    if (video) {
      var v = document.createElement('video');
      v.src = video; v.controls = true; v.playsInline = true; v.autoplay = true; v.poster = t.querySelector('img').src;
      v.setAttribute('aria-label', t.querySelector('img').alt);
      stage.appendChild(v);
    } else {
      var im = new Image(); im.src = t.getAttribute('data-full'); im.alt = t.querySelector('img').alt; im.width = 1080; im.height = 1350;
      stage.appendChild(im);
    }
  }
  tiles.forEach(function (t, i) { t.addEventListener('click', function () { show(i); box.showModal(); }); });
  box.querySelector('.close').addEventListener('click', function () { box.close(); });
  box.querySelector('.prev').addEventListener('click', function () { show(now - 1); });
  box.querySelector('.next').addEventListener('click', function () { show(now + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('close', function () { stage.textContent = ''; tiles[now].focus(); });
  box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(now - 1); if (e.key === 'ArrowRight') show(now + 1); });
})();

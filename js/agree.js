/* ==========================================================================
   "I agree" prompts.

   1. A slim bar at the bottom of every page: "By using this website you agree to our
      Terms of Use and Privacy Notice.  [I agree]"  - shown until the visitor clicks
      I agree (remembered in their own browser; shown again if the terms change).
   2. A pop-up before any software download: the visitor must tick "I have read and
      agree" and press "I agree & download" before the file starts downloading.

   The agreement is remembered only in the visitor's own browser (no account or
   server is involved). Change TERMS_VERSION whenever terms.html / privacy.html
   change in a way people should agree to again - everyone will be asked once more.
   ========================================================================== */
(function () {
  var TERMS_VERSION = '2026-09-25';   // 25 Sep: Privacy Notice gained Google Drive + Google sign-in sections
  var KEY = 'jb_agreed';

  function agreed() { try { return (localStorage.getItem(KEY) || '').split('|')[0] === TERMS_VERSION; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(KEY, TERMS_VERSION + '|' + new Date().toISOString()); } catch (e) {} }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  /* ---------- 1. the bar ---------- */
  function showBar() {
    if (agreed() || document.getElementById('agreeBar')) return;
    var bar = document.createElement('div');
    bar.id = 'agreeBar'; bar.className = 'agree-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Terms and privacy');
    bar.innerHTML = '<p>By using this website you agree to our <a href="terms.html">Terms of Use</a> and <a href="privacy.html">Privacy Notice</a>.</p>' +
                    '<button type="button" class="agree-btn">I agree</button>';
    document.body.appendChild(bar);
    function size() { document.documentElement.style.setProperty('--agree-h', bar.offsetHeight + 'px'); }
    document.body.classList.add('has-agree-bar'); size(); window.addEventListener('resize', size);
    bar.querySelector('button').addEventListener('click', function () {
      remember(); bar.remove(); document.body.classList.remove('has-agree-bar');
      document.documentElement.style.removeProperty('--agree-h');
    });
  }

  /* ---------- 2. the download pop-up ---------- */
  var COPY = {
    'offline-windows': {
      title: 'Before you download',
      points: [
        'This is the free 7-day Trial Edition of Jurisbooks Offline for Windows.',
        'Your business data stays on your own computer. You are responsible for keeping your own backups.',
        'We take full care in building Jurisbooks, but we are not responsible for data loss, leaks or other events outside our control. Please read the full terms.'
      ]
    },
    'default': {
      title: 'Before you download',
      points: [
        'Please read the Terms of Use and Privacy Notice before installing Jurisbooks.',
        'You are responsible for keeping your own backups.',
        'We take full care, but we are not responsible for data loss, leaks or other events outside our control.'
      ]
    }
  };

  function startDownload(url) {
    var a = document.createElement('a');
    a.href = url; a.setAttribute('download', ''); a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function openDialog(url, key) {
    var c = COPY[key] || COPY['default'];
    var prev = document.activeElement;
    var wrap = document.createElement('div'); wrap.className = 'agree-overlay';
    wrap.innerHTML =
      '<div class="agree-dialog" role="dialog" aria-modal="true" aria-labelledby="agreeTitle">' +
        '<h2 id="agreeTitle">' + c.title + '</h2>' +
        '<ul>' + c.points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' +
        '<label class="agree-check"><input type="checkbox" id="agreeTick"><span>I have read and I agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and the <a href="privacy.html" target="_blank" rel="noopener">Privacy Notice</a>.</span></label>' +
        '<div class="agree-actions"><button type="button" class="btn btn-outline" data-act="cancel">Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-act="go" disabled>I agree &amp; download</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    document.body.classList.add('agree-open');
    var tick = wrap.querySelector('#agreeTick'), go = wrap.querySelector('[data-act="go"]');
    function close() { wrap.remove(); document.body.classList.remove('agree-open'); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    tick.addEventListener('change', function () { go.disabled = !tick.checked; });
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.getAttribute('data-act') === 'cancel') close(); });
    go.addEventListener('click', function () {
      if (!tick.checked) return;
      remember(); var bar = document.getElementById('agreeBar'); if (bar) { bar.remove(); document.body.classList.remove('has-agree-bar'); }
      close();
      // Next step: sign in with Google (js/download-gate.js), which then starts the download itself.
      if (window.JB_GATE) window.JB_GATE.begin(url, key); else startDownload(url);
    });
    tick.focus();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.btn-download.is-live') : null;
    if (!a || a.getAttribute('data-agreed') === '1') return;
    e.preventDefault();
    openDialog(a.getAttribute('href'), a.getAttribute('data-download') || 'default');
  });

  ready(showBar);
})();

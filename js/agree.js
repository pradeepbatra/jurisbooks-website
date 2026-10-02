/* ==========================================================================
   "I agree" prompts.

   1. A slim bar at the bottom of every page: "By using this website you agree to our
      Terms of Service and Privacy Notice.  [I agree]"  - shown until the visitor clicks
      I agree (remembered in their own browser; shown again if the terms change).

   The agreement is remembered only in the visitor's own browser (no account or
   server is involved). Change TERMS_VERSION whenever terms.html / privacy.html
   change in a way people should agree to again - everyone will be asked once more.
   ========================================================================== */
(function () {
  var TERMS_VERSION = '2026-09-27'; window.JB_TERMS_VERSION = TERMS_VERSION;  // also sent with a download record   // 27 Sep: Terms of Service rewritten in full (plans, data, offline use, disputes, grievance)
  var KEY = 'jb_agreed';

  function agreed() { try { return (localStorage.getItem(KEY) || '').split('|')[0] === TERMS_VERSION; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(KEY, TERMS_VERSION + '|' + new Date().toISOString()); } catch (e) {} }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  /* ---------- 1. the bar ---------- */
  function showBar() {
    if (agreed() || document.getElementById('agreeBar')) return;
    var bar = document.createElement('div');
    bar.id = 'agreeBar'; bar.className = 'agree-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Terms and privacy');
    bar.innerHTML = '<p>By using this website you agree to our <a href="terms.html">Terms of Service</a> and <a href="privacy.html">Privacy Notice</a>.</p>' +
                    '<button type="button" class="agree-btn">I agree</button>';
    document.body.appendChild(bar);
    function size() { document.documentElement.style.setProperty('--agree-h', bar.offsetHeight + 'px'); }
    document.body.classList.add('has-agree-bar'); size(); window.addEventListener('resize', size);
    bar.querySelector('button').addEventListener('click', function () {
      remember(); bar.remove(); document.body.classList.remove('has-agree-bar');
      document.documentElement.style.removeProperty('--agree-h');
    });
  }

  // (2 Oct 2026) Downloads are direct: the "Before you download" pop-up and the Google sign-in before a
  // download were removed. People accept the Terms and sign up inside the program after installing it.

  ready(showBar);
})();

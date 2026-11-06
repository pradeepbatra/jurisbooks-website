/* ==========================================================================
   Advertising measurement (Meta Pixel and Google Ads tag).

   SWITCHED OFF until the IDs below are filled in. With both blank this file does
   nothing: no bar, no cookies, nothing loaded.

   Once an ID is set, a slim bar asks the visitor to Allow or say No thanks, after
   the terms bar has gone. Nothing loads from Meta or Google unless they press Allow,
   and the choice is remembered in their own browser. A "lead" is counted when an
   allowed visitor opens the app, downloads, calls, WhatsApps or sends an enquiry.

   Only on the public pages: not on checkout, My Account, the sales page or the
   packer page.
   ========================================================================== */
(function () {
  var META_PIXEL_ID = '';        // numbers only, from Meta Events Manager
  var GOOGLE_ADS_ID = 'AW-18557889902'; // like AW-123456789, from Google Ads > Goals > Conversions
  var GOOGLE_LEAD_LABEL = '';    // the conversion label of the lead action in Google Ads

  if (!META_PIXEL_ID && !GOOGLE_ADS_ID) return;

  var KEY = 'jb_ads_choice';
  var live = false;

  function choice() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function addScript(src) {
    var s = document.createElement('script');
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }

  function start() {
    if (live) return;
    live = true;
    if (GOOGLE_ADS_ID) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GOOGLE_ADS_ID);
      addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GOOGLE_ADS_ID));
    }
    if (META_PIXEL_ID) {
      var fbq = window.fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments);
      };
      window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      addScript('https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', META_PIXEL_ID);
      fbq('track', 'PageView');
    }
  }

  function countLead() {
    if (!live) return;
    if (window.fbq && META_PIXEL_ID) window.fbq('track', 'Lead');
    if (window.gtag && GOOGLE_ADS_ID && GOOGLE_LEAD_LABEL) window.gtag('event', 'conversion', { send_to: GOOGLE_ADS_ID + '/' + GOOGLE_LEAD_LABEL });
  }

  function isLeadLink(a) {
    var href = a.getAttribute('href') || '';
    return /^https:\/\/app\.jurisbooks\.com/.test(href) || /^https:\/\/wa\.me\//.test(href) || /^tel:/.test(href) ||
      a.hasAttribute('data-direct-download') || a.hasAttribute('data-download');
  }

  function showBar() {
    if (document.getElementById('adsBar')) return;
    var bar = document.createElement('div');
    bar.id = 'adsBar'; bar.className = 'agree-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Advertising cookies');
    var who = GOOGLE_ADS_ID && META_PIXEL_ID ? 'Google and Meta' : (GOOGLE_ADS_ID ? 'Google' : 'Meta');
    bar.innerHTML = '<p>May we use ' + who + ' cookies to see which of our ads work? <a href="privacy.html#p11">Details</a></p>' +
                    '<button type="button" class="agree-btn" data-v="yes">Allow</button>' +
                    '<button type="button" class="agree-btn agree-btn-plain" data-v="no">No thanks</button>';
    document.body.appendChild(bar);
    function size() { document.documentElement.style.setProperty('--agree-h', bar.offsetHeight + 'px'); }
    document.body.classList.add('has-agree-bar'); size(); window.addEventListener('resize', size);
    bar.addEventListener('click', function (e) {
      var v = e.target.getAttribute('data-v');
      if (!v) return;
      remember(v); window.removeEventListener('resize', size); bar.remove();
      document.body.classList.remove('has-agree-bar');
      document.documentElement.style.removeProperty('--agree-h');
      if (v === 'yes') start();
    });
  }

  ready(function () {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && isLeadLink(a)) countLead();
    });
    document.addEventListener('jb-enquiry-sent', countLead);

    var said = choice();
    if (said === 'yes') { start(); return; }
    if (said === 'no') return;
    if (!document.getElementById('agreeBar')) { showBar(); return; }
    // The terms bar is still up: ask once it has been answered.
    document.addEventListener('click', function wait(e) {
      if (e.target.closest && e.target.closest('#agreeBar .agree-btn')) {
        document.removeEventListener('click', wait);
        setTimeout(showBar, 0);
      }
    });
  });
})();

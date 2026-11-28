/* The sales page as an app on the phone (owner, 28 Nov 2026): a box offering to put it on the home screen.
   Android Chrome asks through its own install prompt; an iPhone has none, so it gets the steps; inside another
   app's browser (WhatsApp, Instagram) it says to open the page in Chrome. "Not now" waits 7 days.
   Same way as the Packer page (js/packer.js). */
(function () {
  'use strict';
  var KEY = 'jb_sales_install', evt = null;
  var box = document.getElementById('slInstall');
  if (!box) return;
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function installed() { return get() === 'done' || window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }
  function snoozed() { return Number(get()) > Date.now(); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function hide() { box.hidden = true; }
  function show() {
    if (installed() || snoozed()) return hide();
    var ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), android = /Android/.test(ua);
    var inApp = android && /; wv\)|FBAN|FBAV|Instagram|WhatsApp/i.test(ua);
    if (!evt && !ios && !android) return hide();                     // a computer: nothing to offer
    box.textContent = '';
    var row = el('div', 'sl-install-row');
    box.appendChild(el('b', '', 'Put Jurisbooks Sales on your home screen?'));
    if (evt) {
      box.appendChild(el('span', '', 'It opens with one tap, like any other app - no need to find this page again.'));
      var yes = el('button', 'go', 'Yes, add it'); yes.type = 'button';
      yes.onclick = function () {
        var e = evt; evt = null; e.prompt();
        e.userChoice.then(function (c) { if (c.outcome === 'accepted') set('done'); hide(); });
      };
      row.appendChild(yes);
    } else if (inApp) {
      box.appendChild(el('span', '', 'Open this page in Chrome to add it to your home screen.'));
      var a = el('a', 'go', 'Open in Chrome'); a.href = 'intent://jurisbooks.com/sales.html#Intent;scheme=https;package=com.android.chrome;end';
      row.appendChild(a);
    } else if (ios) {
      box.appendChild(el('span', '', 'In Safari, tap the Share button (square with an arrow), then "Add to Home Screen".'));
    } else {
      box.appendChild(el('span', '', 'In Chrome, tap the three dots at the top right, then "Add to Home screen" or "Install app".'));
    }
    var no = el('button', '', 'Not now'); no.type = 'button';
    no.onclick = function () { set(String(Date.now() + 7 * 86400000)); hide(); };
    row.appendChild(no);
    box.appendChild(row);
    box.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); evt = e; show(); });
  window.addEventListener('appinstalled', function () { set('done'); hide(); });
  if (window.matchMedia('(display-mode: standalone)').matches) set('done');
  setTimeout(show, 2500);
})();

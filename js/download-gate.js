/* ==========================================================================
   Sign in with Google before downloading.

   Every working "Download" button on the site (made live by downloads.js) first
   asks the visitor to sign in with Google. Google confirms who they are; the
   Jurisbooks server then keeps their name, email, which program and the date
   (see the Privacy Notice), and the download starts. A visitor who has signed
   in on this device is remembered for 30 days and is not asked again.

   Until GOOGLE_WEB_CLIENT_ID below is filled in, downloads work directly,
   exactly as before - the site never ends up with a dead Download button.
   ========================================================================== */
(function () {
  var GOOGLE_WEB_CLIENT_ID = '260087848182-m75693l587livons99c0vueu0v7ve5b0.apps.googleusercontent.com';
  var RECORD_URL = 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/recordDownload';
  var REMEMBER_KEY = 'jb_download_signed_in';
  var REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
  var NAMES = { 'offline-windows': 'Jurisbooks (Offline) for Windows', 'online-windows': 'Jurisbooks Online for Windows' };

  function remembered() {
    try {
      var r = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      return r && r.until > Date.now() ? r : null;
    } catch (e) { return null; }
  }
  function remember(email) {
    try { localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email, until: Date.now() + REMEMBER_MS })); } catch (e) { /* private window: just ask again next time */ }
  }
  function startDownload(url) {
    var a = document.createElement('a');
    a.href = url; a.setAttribute('download', '');
    document.body.appendChild(a); a.click(); a.remove();
  }

  var gsiLoading = null;
  function loadGsi() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (gsiLoading) return gsiLoading;
    gsiLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { gsiLoading = null; reject(new Error('Google sign-in could not load')); };
      document.head.appendChild(s);
    });
    return gsiLoading;
  }

  var box = null;
  function closeBox() { if (box) { box.remove(); box = null; document.removeEventListener('keydown', onKey); } }
  function onKey(e) { if (e.key === 'Escape') closeBox(); }
  function setMsg(html, isError) {
    var m = box && box.querySelector('.jb-gate-msg');
    if (m) { m.innerHTML = html; m.style.color = isError ? '#b3261e' : ''; }
  }

  function openBox(edition, url) {
    closeBox();
    box = document.createElement('div');
    box.className = 'jb-gate';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'jbGateTitle');
    box.innerHTML =
      '<div class="jb-gate-card">' +
        '<button type="button" class="jb-gate-x" aria-label="Close">&times;</button>' +
        '<h2 id="jbGateTitle">Sign in to download</h2>' +
        '<p class="jb-gate-what">' + (NAMES[edition] || 'Jurisbooks') + '</p>' +
        '<p>Sign in with your Google account and your download starts straight away. We keep your name and email so we can help you get started &mdash; see our <a href="privacy.html">Privacy Notice</a>.</p>' +
        '<div class="jb-gate-btn"></div>' +
        '<p class="jb-gate-msg" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(box);
    box.querySelector('.jb-gate-x').onclick = closeBox;
    box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });
    document.addEventListener('keydown', onKey);

    loadGsi().then(function () {
      google.accounts.id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: function (resp) { onSignedIn(resp && resp.credential, edition, url); },
        ux_mode: 'popup', context: 'signin'
      });
      google.accounts.id.renderButton(box.querySelector('.jb-gate-btn'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: 280 });
    }).catch(function () {
      setMsg('Google sign-in could not load (check your internet connection). <a href="' + url + '" download>Download without signing in</a>.', true);
    });
  }

  function onSignedIn(credential, edition, url) {
    if (!credential) return setMsg('Google sign-in did not complete. Please try again.', true);
    setMsg('Checking with Google&hellip;');
    fetch(RECORD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { credential: credential, edition: edition } }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.result || !j.result.ok) {
          var why = j && j.error && j.error.message;
          return setMsg((why || 'Sign-in could not be confirmed.') + ' Please try again.', true);
        }
        remember(j.result.email);
        setMsg('Thank you' + (j.result.name ? ', ' + j.result.name.split(' ')[0] : '') + '! Your download is starting. If it does not, <a href="' + url + '" download>click here</a>.');
        startDownload(url);
      })
      .catch(function () {
        // Our server could not be reached: never leave a visitor stuck without the program.
        setMsg('We could not reach our server, so your download is starting anyway. <a href="' + url + '" download>Click here</a> if it does not.');
        startDownload(url);
      });
  }

  // The order is: Download button -> "Before you download / I agree" (agree.js) -> this sign-in -> the file.
  // agree.js calls JB_GATE.begin() when the visitor presses "I agree & download".
  // A visitor signed in on this device in the last 30 days: download at once, with a short note saying so.
  function rememberedNote(r, edition, url) {
    var n = document.createElement('div');
    n.className = 'jb-gate-note'; n.setAttribute('role', 'status');
    n.innerHTML = 'Downloading &mdash; signed in as <b></b>. <a href="#">Not you? Sign in again</a>';
    n.querySelector('b').textContent = r.email || 'you';
    n.querySelector('a').onclick = function (e) {
      e.preventDefault(); n.remove();
      try { localStorage.removeItem(REMEMBER_KEY); } catch (x) {}
      openBox(edition, url);
    };
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 12000);
  }
  window.JB_GATE = {
    begin: function (url, edition) {
      if (!GOOGLE_WEB_CLIENT_ID) return startDownload(url);   // not set up yet: plain direct download
      var r = remembered();
      if (r) { rememberedNote(r, edition, url); return startDownload(url); }
      openBox(edition, url);
    }
  };
})();

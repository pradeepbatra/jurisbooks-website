/* download.html: tells the visitor whether their copy of Jurisbooks is up to date.
   The program's "Check for Updates" tab opens this page with ?v=<version>&edition=<edition>
   (it sends nothing else). Everything is written with textContent, never as HTML. */
(function () {
  var V = window.JURISBOOKS_VERSIONS || { editions: {}, history: [] };
  function el(id) { return document.getElementById(id); }
  function cmp(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
    return 0;
  }
  function add(parent, tag, text, cls) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; parent.appendChild(n); return n; }

  document.addEventListener('DOMContentLoaded', function () {
    // ---- table of latest versions ----
    var tbody = el('verRows');
    if (tbody) Object.keys(V.editions).forEach(function (k) {
      var e = V.editions[k], tr = add(tbody, 'tr');
      add(tr, 'td', e.name).style.fontWeight = '600';
      add(tr, 'td', e.latest, 'mono');
      add(tr, 'td', e.released);
      var how = add(tr, 'td');
      if (k === 'trial') how.textContent = 'Free download (below)'; else how.textContent = 'We send it to you';
    });
    // ---- what's new ----
    var hist = el('verHistory');
    if (hist) V.history.forEach(function (h) {
      var box = add(hist, 'div', null, 'ver-entry');
      add(box, 'h3', 'Version ' + h.v + '  ·  ' + h.date);
      var ul = add(box, 'ul'); h.items.forEach(function (t) { add(ul, 'li', t); });
    });

    // ---- the visitor's own result ----
    var box = el('verResult'), q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var v = (q.get('v') || '').trim(), ed = (q.get('edition') || '').trim().toLowerCase();
    var info = V.editions[ed];
    if (!info || !/^\d+(\.\d+){1,3}$/.test(v)) return;              // no (or odd) details: just show the general page
    box.hidden = false;
    var c = cmp(v, info.latest);
    var head = el('verResultHead'), text = el('verResultText'), actions = el('verResultActions');
    if (c >= 0) {
      box.className = 'ver-result ok';
      head.textContent = '✔ You are up to date';
      text.textContent = 'You have Jurisbooks ' + v + ' — ' + info.name + ' edition. That is the latest version for your edition (' + info.latest + ', released ' + info.released + ').';
      return;
    }
    box.className = 'ver-result new';
    head.textContent = 'A newer version is available: ' + info.latest;
    text.textContent = 'You have Jurisbooks ' + v + ' — ' + info.name + ' edition. The latest for your edition is ' + info.latest + ' (released ' + info.released + '). Your data stays exactly as it is when you install it over your current version — see the steps below.';
    if (ed === 'trial') {
      var d = add(actions, 'a', 'Go to the Trial download', 'btn btn-primary'); d.href = '#trial-download';
      add(actions, 'span', 'The Trial edition is a free download.', 'small-note');
    } else {
      var a = add(actions, 'a', 'Ask us for the new version on WhatsApp', 'btn btn-primary');
      a.href = 'https://wa.me/919220499490?text=' + encodeURIComponent('Hello Jurisbooks! I use the ' + info.name + ' edition, version ' + v + '. Please send me the latest version (' + info.latest + '). My business name is: ');
      a.target = '_blank'; a.rel = 'noopener';
      var b = add(actions, 'a', 'Or send an enquiry', 'btn btn-outline'); b.href = 'contact.html#enquiry';
      add(actions, 'span', 'Paid editions are sent to you personally. Please have your business name ready.', 'small-note');
    }
  });
})();

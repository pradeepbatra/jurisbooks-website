/* "Ask Jurisbooks" - the help chat on help.html (9 Nov 2026). It answers ONLY from js/help-data.js by matching
   the words typed (English or Hindi in Latin letters) - no AI service, nothing typed leaves the page.
   It also draws the full feature list below the chat. Everything is written with textContent (never innerHTML). */
(function () {
  'use strict';
  var H = window.JB_HELP;
  if (!H) return;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var STOP = { a: 1, an: 1, the: 1, i: 1, me: 1, my: 1, to: 1, of: 1, in: 1, on: 1, is: 1, it: 1, do: 1, does: 1, can: 1, how: 1, what: 1, where: 1,
    for: 1, and: 1, or: 1, with: 1, we: 1, you: 1, your: 1, be: 1, are: 1, this: 1, that: 1, there: 1, please: 1, hai: 1, ka: 1, ki: 1, ke: 1,
    se: 1, me_: 1, mein: 1, kya: 1, kaise: 1, kahan: 1, ko: 1, kar: 1, karna: 1, karein: 1, hota: 1, jurisbooks: 1, app: 1, want: 1, need: 1 };
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ&+\- ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function words(s) { return norm(s).split(' ').filter(function (w) { return w.length > 1 && !STOP[w]; }); }
  // very small stemming, so "bills" finds "bill" and "printing" finds "print"
  function stem(w) { return w.replace(/(ings|ing|ies|es|s)$/, function (m) { return m === 'ies' ? 'y' : ''; }); }
  var INDEX = H.topics.map(function (t) {
    var keys = (t.keys || []).map(norm);
    return { t: t, keys: keys, title: words(t.title).map(stem), keyWords: [].concat.apply([], keys.map(words)).map(stem), body: words(t.text + ' ' + (t.where || '')).map(stem) };
  });
  function score(q) {
    var qn = ' ' + norm(q) + ' ', qw = words(q).map(stem);
    return INDEX.map(function (x) {
      var s = 0;
      x.keys.forEach(function (k) { if (k.length > 2 && qn.indexOf(' ' + k + ' ') >= 0) s += 3 + k.split(' ').length * 2; });
      qw.forEach(function (w) {
        if (x.title.indexOf(w) >= 0) s += 3;
        if (x.keyWords.indexOf(w) >= 0) s += 2.5;
        else if (w.length > 3 && x.body.indexOf(w) >= 0) s += 0.6;
      });
      return { x: x, s: s };
    }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; });
  }

  // ---- the chat ----
  var log = null;
  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function userSays(text) { var m = el('div', 'hc-msg hc-me'); m.appendChild(el('p', null, text)); log.appendChild(m); }
  function answerCard(t) {
    var m = el('div', 'hc-msg hc-bot');
    m.appendChild(el('b', 'hc-title', t.title));
    m.appendChild(el('p', null, t.text));
    if (t.steps && t.steps.length) { var ol = el('ol', 'hc-steps'); t.steps.forEach(function (s) { ol.appendChild(el('li', null, s)); }); m.appendChild(ol); }
    var meta = [];
    if (t.where) meta.push('Where: ' + t.where);
    if (t.plan && H.plans[t.plan] && t.plan !== 'all') meta.push('Plan: ' + H.plans[t.plan]);
    if (meta.length) m.appendChild(el('p', 'hc-meta', meta.join(' · ')));
    return m;
  }
  function chips(box, list, label) {
    if (!list.length) return;
    var w = el('div', 'hc-chips');
    if (label) w.appendChild(el('span', 'hc-chiplabel', label));
    list.forEach(function (t) {
      var b = el('button', 'hc-chip', t.title); b.type = 'button';
      b.addEventListener('click', function () { ask(t.title, t); });
      w.appendChild(b);
    });
    box.appendChild(w);
  }
  function ask(q, direct) {
    q = String(q || '').trim(); if (!q) return;
    userSays(q);
    var res = direct ? [{ x: { t: direct }, s: 99 }] : score(q);
    if (!res.length || res[0].s < 2.5) {
      var m = el('div', 'hc-msg hc-bot');
      m.appendChild(el('p', null, 'Sorry, I could not find that. Try other words (for example "GST report", "staff login", "e-way bill"), pick a topic below, or talk to us: call or WhatsApp ' + H.phone + '.'));
      chips(m, res.slice(0, 3).map(function (r) { return r.x.t; }), 'Maybe:');
      log.appendChild(m);
    } else {
      var best = res[0].x.t, card = answerCard(best);
      var more = res.slice(1).filter(function (r) { return r.s >= Math.max(2.5, res[0].s * 0.45); }).slice(0, 3).map(function (r) { return r.x.t; });
      chips(card, more, 'Also:');
      log.appendChild(card);
    }
    scrollDown();
  }
  function startChat() {
    log = $('hcLog');
    var hi = el('div', 'hc-msg hc-bot');
    hi.appendChild(el('p', null, 'Namaste! Ask me anything about Jurisbooks - in English or Hindi words. For example: "how to make a GST bill", "stock kaise dekhe", "staff login", "e-way bill".'));
    var popular = ['sale', 'gstreports', 'staff', 'devices', 'import', 'plans', 'ewaybill', 'support'].map(function (id) { return H.topics.filter(function (t) { return t.id === id; })[0]; }).filter(Boolean);
    chips(hi, popular, 'Popular:');
    log.appendChild(hi);
    var form = $('hcForm'), box = $('hcInput');
    form.addEventListener('submit', function (e) { e.preventDefault(); var q = box.value; box.value = ''; ask(q); box.focus(); });
  }

  // ---- the full list ----
  function drawList(filter) {
    var root = $('hlList'); root.textContent = '';
    var f = norm(filter), n = 0;
    H.groups.forEach(function (g) {
      var rows = H.topics.filter(function (t) { return t.group === g && (!f || norm(t.title + ' ' + t.text + ' ' + (t.keys || []).join(' ') + ' ' + (t.where || '')).indexOf(f) >= 0); });
      if (!rows.length) return;
      n += rows.length;
      var sec = el('section', 'hl-group');
      sec.appendChild(el('h3', null, g));
      rows.forEach(function (t) {
        var d = el('details', 'hl-item');
        var s = el('summary'); s.appendChild(el('span', null, t.title));
        if (t.plan && t.plan !== 'all') s.appendChild(el('span', 'hl-plan', H.plans[t.plan]));
        d.appendChild(s);
        d.appendChild(el('p', null, t.text));
        if (t.steps && t.steps.length) { var ol = el('ol'); t.steps.forEach(function (x) { ol.appendChild(el('li', null, x)); }); d.appendChild(ol); }
        if (t.where) d.appendChild(el('p', 'small-note', 'Where: ' + t.where));
        sec.appendChild(d);
      });
      root.appendChild(sec);
    });
    $('hlCount').textContent = n + ' feature' + (n === 1 ? '' : 's') + (f ? ' found' : '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    if ($('hcLog')) startChat();
    if ($('hlList')) { drawList(''); $('hlSearch').addEventListener('input', function () { drawList(this.value); }); }
    var q = new URLSearchParams(location.search).get('q');
    if (q && $('hcLog')) ask(q.slice(0, 200));
  });
  window.JB_HELP_SCORE = score;     // for tests
})();

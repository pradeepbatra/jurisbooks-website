/* Godown page (godown.html, 4 Nov 2026): staff tied to a godown by the owner (Jurisbooks > Godowns > Godown staff) sign in
   once with their mobile number and a code - the same sign-in as the Packer page, so one sign-in serves both pages on a
   phone. They see the stock of their godown (no rates), the stock transfers coming in and going out, and press Received
   when goods arrive: only then do the goods count in their godown. Each transfer prints as a challan.
   Everything shown is written with textContent (never innerHTML). */
(function () {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/' : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/';
  var KEY = 'jb_packer_pass';           // shared with the Packer page
  var $ = function (id) { return document.getElementById(id); };
  var phone = '', tab = '', place = 0, query = '', last = null;

  function call(name, data) {
    return fetch(BASE + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data || {} }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (j && j.error) { var e = new Error(j.error.message || 'Something went wrong.'); e.code = (j.error.details && j.error.details.code) || j.error.status; throw e; }
        if (!j || !('result' in j)) throw new Error('Jurisbooks could not be reached just now. Please try again in a minute.');
        return j.result;
      }, function () { throw new Error('Could not reach Jurisbooks. Check your internet connection.'); });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function msg(text, ok) { var m = $('pkMsg'); m.textContent = text || ''; m.className = 'pk-msg' + (ok ? ' ok' : ''); }
  function viewMsg(text, ok) { var m = $('pkViewMsg'); m.textContent = text || ''; m.className = 'pk-msg' + (ok ? ' ok' : ''); }
  function getPass() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setPass(p) { try { if (p) localStorage.setItem(KEY, p); else localStorage.removeItem(KEY); } catch (e) {} }
  function when(t) { return t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function day(d) { return d ? d.split('-').reverse().join('-') : ''; }

  // ---- sign in (same calls as the Packer page) ----
  function showSignIn(note) {
    $('pkView').hidden = true; $('pkRefresh').hidden = true; $('pkSignIn').hidden = false; $('pkWho').textContent = '';
    $('pkStepCode').hidden = true; $('pkStepPhone').hidden = false;
    msg(note || '');
  }
  function sendCode() {
    var p = $('pkPhone').value.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(p)) return msg('Please enter your 10-digit mobile number.');
    phone = p; $('pkSend').disabled = true; msg('Sending the code…', true);
    call('packerSendOtp', { phone: p }).then(function (r) {
      $('pkStepPhone').hidden = true; $('pkStepCode').hidden = false;
      $('pkCodeFor').textContent = '+91 ' + p;
      msg(r && r.devCode ? 'Test mode: your code is ' + r.devCode : 'We have sent a 6-digit code by SMS.', true);
      $('pkCode').value = ''; $('pkCode').focus();
    }).catch(function (e) { msg(e.message); }).then(function () { $('pkSend').disabled = false; });
  }
  function verifyCode() {
    var c = $('pkCode').value.replace(/\D/g, '');
    if (c.length < 4) return msg('Please enter the code from the SMS.');
    $('pkVerify').disabled = true; msg('Checking…', true);
    call('packerVerifyOtp', { phone: phone, code: c }).then(function (r) { setPass(r.pass); load(); })
      .catch(function (e) { msg(e.message); }).then(function () { $('pkVerify').disabled = false; });
  }

  // ---- the godown ----
  function expired(e) { return e.code === 'portal-expired' || /sign in again/i.test(e.message); }
  function load() {
    var p = getPass(); if (!p) return showSignIn();
    var btn = $('pkRefresh'); btn.disabled = true; btn.textContent = 'Refreshing…';
    call('godownView', { pass: p }).then(function (r) {
      $('pkSignIn').hidden = true; $('pkView').hidden = false; btn.hidden = false;
      $('pkWho').textContent = r.name || '';
      viewMsg('');
      last = r; if (place >= (r.places || []).length) place = 0;
      render();
    }).catch(function (e) {
      if (expired(e)) { setPass(''); return showSignIn('Please sign in again.'); }
      if (!$('pkView').hidden) return viewMsg(e.message);
      showSignIn(e.message);
    }).then(function () { btn.disabled = false; btn.textContent = 'Refresh'; });
  }
  function printCard(card) {
    card.classList.add('pk-printing');
    var done = function () { card.classList.remove('pk-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }
  function fact(box, label, value) { if (!value && value !== 0) return; box.appendChild(el('span', '', label)); box.appendChild(el('span', '', String(value))); }
  function transferCard(t, incoming, company) {
    var card = el('section', 'pk-job' + (t.status === 'received' ? ' pk-done' : ''));
    card.appendChild(el('div', 'pk-slip', 'DELIVERY CHALLAN — STOCK TRANSFER'));
    var head = el('div', 'pk-head');
    head.appendChild(el('b', '', t.no));
    head.appendChild(el('span', 'pk-badge' + (t.status === 'received' ? ' done' : ''), t.status === 'received' ? 'Received' : 'On the way'));
    card.appendChild(head);
    card.appendChild(el('div', 'pk-sub', 'Date: ' + day(t.date) + (company ? ' · ' + company : '')));
    card.appendChild(el('div', '', 'From ' + t.fromName + '  →  To ' + t.toName));
    var tb = el('table', 'pk-items');
    var hr = el('tr'); hr.appendChild(el('th', '', '#')); hr.appendChild(el('th', '', 'Item / design')); hr.appendChild(el('th', '', 'Qty')); tb.appendChild(hr);
    var total = 0;
    (t.items || []).forEach(function (l, i) {
      var tr = el('tr'), td = el('td', '', l.n);
      if (l.c) td.appendChild(el('small', '', 'No. ' + l.c));
      tr.appendChild(el('td', 'pk-n', i + 1)); tr.appendChild(td); tr.appendChild(el('td', '', l.q + (l.u ? ' ' + l.u : '')));
      tb.appendChild(tr); total += Number(l.q) || 0;
    });
    var tt = el('tr', 'pk-total'); tt.appendChild(el('td')); tt.appendChild(el('td', '', 'Total')); tt.appendChild(el('td', '', total)); tb.appendChild(tt);
    card.appendChild(tb);
    var facts = el('div', 'pk-facts');
    fact(facts, 'Vehicle', t.vehicle); fact(facts, 'Notes', t.notes);
    fact(facts, 'Sent', when(t.sentAt)); fact(facts, 'Received', t.receivedAt ? when(t.receivedAt) + (t.receivedBy ? ' · ' + t.receivedBy : '') : '');
    fact(facts, 'Remarks', t.receivedNote);
    card.appendChild(facts);
    if (incoming && t.status === 'transit') {
      var note = el('input'); note.maxLength = 200; note.placeholder = 'Remarks, e.g. 2 pieces short (if any)';
      card.appendChild(el('label', '', 'Remarks (if any)')); card.appendChild(note);
      var b = el('button', 'pk-main', 'Received'); b.type = 'button';
      b.onclick = function () {
        if (!window.confirm('All goods of ' + t.no + ' have arrived in ' + t.toName + '?')) return;
        b.disabled = true;
        call('godownUpdate', { pass: getPass(), id: t.id, note: note.value }).then(load).catch(function (e) {
          b.disabled = false;
          if (expired(e)) { setPass(''); return showSignIn('Please sign in again.'); }
          viewMsg(e.message);
        });
      };
      card.appendChild(b);
    }
    var sign = el('div', 'pk-facts pk-times'); fact(sign, 'Sent by', '________________'); fact(sign, 'Received by', '________________');
    card.appendChild(sign);
    var pr = el('button', 'pk-print', 'Print challan'); pr.type = 'button';
    pr.onclick = function () { printCard(card); };
    card.appendChild(pr);
    return card;
  }
  function render() {
    var box = $('pkJobs'); box.textContent = '';
    var places = (last && last.places) || [];
    if (!places.length) return box.appendChild(el('div', 'pk-empty', 'No godown yet. Ask your owner.'));
    if (places.length > 1) {        // tied to godowns of more than one business
      var pick = el('select'); pick.style.cssText = 'width:100%;font:inherit;padding:10px;border-radius:10px;margin-bottom:10px;';
      places.forEach(function (p, i) { var o = el('option', '', p.godown + ' · ' + p.company); o.value = i; if (i === place) o.selected = true; pick.appendChild(o); });
      pick.onchange = function () { place = Number(pick.value); render(); };
      box.appendChild(pick);
    }
    var P = places[place];
    var waiting = P.incoming.filter(function (t) { return t.status === 'transit'; }).length;
    if (!tab) tab = waiting ? 'in' : 'stock';
    var row = el('div', 'pk-stats');
    [['stock', 'Items in stock', P.items.length], ['in', 'Coming in', waiting], ['out', 'Sent out', P.outgoing.length]].forEach(function (s) {
      var c = el('button', 'pk-stat' + (tab === s[0] ? ' on' : '')); c.type = 'button';
      c.appendChild(el('b', '', s[2])); c.appendChild(el('span', '', s[1]));
      c.onclick = function () { tab = s[0]; render(); };
      row.appendChild(c);
    });
    box.appendChild(row);
    if (tab === 'stock') {
      var card = el('section', 'pk-job');
      card.appendChild(el('div', 'pk-head')).appendChild(el('b', '', P.godown));
      card.appendChild(el('div', 'pk-sub', P.company + (P.stockAt ? ' · as on ' + when(P.stockAt) : '')));
      var q = el('input'); q.placeholder = 'Search item or item no.'; q.value = query; q.style.marginTop = '10px';
      card.appendChild(q);
      var tb = el('table', 'pk-items');
      var draw = function () {
        tb.textContent = '';
        var words = query.toLowerCase().split(/\s+/).filter(Boolean);
        var list = P.items.filter(function (l) { var s = (l.n + ' ' + l.c).toLowerCase(); return words.every(function (w) { return s.indexOf(w) >= 0; }); });
        list.slice(0, 300).forEach(function (l) {
          var tr = el('tr'), td = el('td', '', l.n);
          if (l.c) td.appendChild(el('small', '', 'No. ' + l.c));
          tr.appendChild(td); var n = el('td', '', l.q + (l.u ? ' ' + l.u : '')); if (l.q < 0) n.style.color = '#c0392b'; tr.appendChild(n);
          tb.appendChild(tr);
        });
        if (!list.length) { var e = el('tr'); e.appendChild(el('td', '', query ? 'Not found - this item is not in stock here.' : 'No stock in this godown.')); tb.appendChild(e); }
      };
      q.oninput = function () { query = q.value; draw(); };
      draw();
      card.appendChild(tb);
      card.appendChild(el('div', 'pk-sub', 'Goods on the way count here only after you press Received.'));
      return box.appendChild(card);
    }
    var list = tab === 'in' ? P.incoming : P.outgoing;
    if (!list.length) return box.appendChild(el('div', 'pk-empty', tab === 'in' ? 'Nothing coming in. Press Refresh later.' : 'Nothing sent out in the last 30 days.'));
    list.forEach(function (t) { box.appendChild(transferCard(t, tab === 'in', P.company)); });
  }

  $('pkSend').onclick = sendCode;
  $('pkVerify').onclick = verifyCode;
  $('pkBack').onclick = function () { showSignIn(''); };
  $('pkRefresh').onclick = load;
  $('pkOut').onclick = function () { setPass(''); tab = ''; showSignIn('Signed out.'); };
  $('pkPhone').onkeydown = function (e) { if (e.key === 'Enter') sendCode(); };
  $('pkCode').onkeydown = function (e) { if (e.key === 'Enter') verifyCode(); };
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('pkView').hidden) load(); });
  load();
})();

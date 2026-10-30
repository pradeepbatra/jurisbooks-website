/* Packer page (packer.html): staff of a Premium or Business Premium business sign in once with their mobile number and a code,
   and see only the orders given to them as packing slips: bill no., items, item no., quantities, bags, transport, address -
   never a rate or an amount. Start packing > Packed (bags) > Handed to transport (LR no.), each with its time, so goods packed
   today can go tomorrow. Details can be changed for 24 hours after packing. A new phone signing in ends the old one.
   Everything shown is written with textContent (never innerHTML). */
(function () {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/' : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/';
  var KEY = 'jb_packer_pass';
  var STEP = { 'new': 'New', packing: 'Packing', packed: 'Packed', handed: 'With transport' };
  var $ = function (id) { return document.getElementById(id); };
  var phone = '';
  var tab = '', last = null;           // which list is open: left / done / all

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

  // ---- sign in ----
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

  // ---- the orders ----
  function expired(e) { return e.code === 'portal-expired' || /sign in again/i.test(e.message); }
  function load() {
    var p = getPass(); if (!p) return showSignIn();
    var btn = $('pkRefresh'); btn.disabled = true; btn.textContent = 'Refreshing…';
    call('packerJobs', { pass: p }).then(function (r) {
      $('pkSignIn').hidden = true; $('pkView').hidden = false; btn.hidden = false;
      $('pkWho').textContent = r.name || '';
      viewMsg('');
      render(r.jobs || [], r.stats);
    }).catch(function (e) {
      if (expired(e)) { setPass(''); return showSignIn('Please sign in again.'); }
      if (!$('pkView').hidden) return viewMsg(e.message);
      showSignIn(e.message);      // no internet just now: the sign-in is kept, reload to try again
    }).then(function () { btn.disabled = false; btn.textContent = 'Refresh'; });
  }
  function when(t) { return t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
  function field(box, label, value, type, max) {
    box.appendChild(el('label', '', label));
    var i = el('input'); i.value = value == null ? '' : value;
    if (type === 'number') { i.type = 'number'; i.min = '0'; i.inputMode = 'numeric'; } else if (max) i.maxLength = max;
    box.appendChild(i);
    return i;
  }
  function printSlip(card) {
    card.classList.add('pk-printing');
    var done = function () { card.classList.remove('pk-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }
  function editBox(j) {
    var d = el('details', 'pk-edit');
    d.appendChild(el('summary', '', 'Change details (until ' + when(j.editUntil) + ')'));
    var bags = field(d, 'Bags packed', j.bagsPacked != null ? j.bagsPacked : '', 'number');
    var lr = field(d, 'LR / GR no.', j.lr, '', 40);
    var veh = field(d, 'Vehicle no.', j.vehicle, '', 30);
    var note = field(d, 'Remarks', j.packerNote, '', 300);
    var b = el('button', 'pk-main', 'Save changes'); b.type = 'button';
    b.onclick = function () { act(j, 'edit', { bags: bags.value, lr: lr.value, vehicle: veh.value, note: note.value }, b); };
    d.appendChild(b);
    return d;
  }
  function fact(box, label, value) { if (!value && value !== 0) return; box.appendChild(el('span', '', label)); box.appendChild(el('span', '', String(value))); }
  function act(job, step, extra, button) {
    button.disabled = true;
    call('packerUpdate', Object.assign({ pass: getPass(), id: job.id, step: step }, extra || {})).then(load).catch(function (e) {
      button.disabled = false;
      if (expired(e)) { setPass(''); return showSignIn('Please sign in again.'); }
      viewMsg(e.message);
    });
  }
  function jobCard(j) {
    var card = el('section', 'pk-job' + (j.status === 'handed' ? ' pk-done' : ''));
    card.appendChild(el('div', 'pk-slip', 'PACKING SLIP'));
    var head = el('div', 'pk-head');
    head.appendChild(el('b', '', (j.sr ? j.sr + '. ' : '') + j.no));
    head.appendChild(el('span', 'pk-badge' + (j.status === 'handed' ? ' done' : ''), STEP[j.status] || j.status));
    card.appendChild(head);
    if (j.date) card.appendChild(el('div', 'pk-sub', 'Bill date: ' + j.date.split('-').reverse().join('-')));
    card.appendChild(el('div', '', j.customer));
    if (j.address) card.appendChild(el('div', 'pk-sub', j.address));
    if (j.customerPhone) { var a = el('a', 'pk-call', 'Call ' + j.customerPhone); a.href = 'tel:' + j.customerPhone.replace(/[^\d+]/g, ''); card.appendChild(a); }
    if (j.company) card.appendChild(el('div', 'pk-sub', j.company));
    var t = el('table', 'pk-items');
    var hr = el('tr'); hr.appendChild(el('th', '', '#')); hr.appendChild(el('th', '', 'Item / design')); hr.appendChild(el('th', '', 'Qty')); t.appendChild(hr);
    var total = 0;
    (j.items || []).forEach(function (l, i) {
      var tr = el('tr'), td = el('td', '', l.name);
      if (l.code) td.appendChild(el('small', '', 'No. ' + l.code));
      if (l.note) td.appendChild(el('small', '', l.note));
      tr.appendChild(el('td', 'pk-n', i + 1));
      tr.appendChild(td);
      tr.appendChild(el('td', '', l.qty + (l.unit ? ' ' + l.unit : '')));
      t.appendChild(tr);
      total += Number(l.qty) || 0;
    });
    var tt = el('tr', 'pk-total'); tt.appendChild(el('td')); tt.appendChild(el('td', '', 'Total')); tt.appendChild(el('td', '', total)); t.appendChild(tt);
    card.appendChild(t);
    var facts = el('div', 'pk-facts');
    fact(facts, 'Transport', j.transport); fact(facts, 'Vehicle', j.vehicle);
    fact(facts, 'Bags', j.bagsPacked != null ? j.bagsPacked : (j.bags || ''));
    fact(facts, 'E-way bill', j.eway); fact(facts, 'LR / GR no.', j.lr); fact(facts, 'Note', j.note); fact(facts, 'Remarks', j.packerNote);
    card.appendChild(facts);
    var times = el('div', 'pk-facts pk-times');
    fact(times, 'Sent to you', when(j.sentAt)); fact(times, 'Packing started', when(j.startedAt)); fact(times, 'Packed', when(j.packedAt)); fact(times, 'Handed over', when(j.handedAt));
    card.appendChild(times);
    if (j.status === 'new') {
      var b1 = el('button', 'pk-main', 'Start packing'); b1.type = 'button';
      b1.onclick = function () { act(j, 'start', null, b1); };
      card.appendChild(b1);
    } else if (j.status === 'packing') {
      card.appendChild(el('label', '', 'Bags packed'));
      var bags = el('input'); bags.type = 'number'; bags.min = '0'; bags.inputMode = 'numeric'; bags.value = j.bags || '';
      card.appendChild(bags);
      var rem = field(card, 'Remarks (if any)', '', '', 300);
      var b2 = el('button', 'pk-main', 'Packed'); b2.type = 'button';
      b2.onclick = function () { act(j, 'packed', { bags: bags.value, note: rem.value }, b2); };
      card.appendChild(b2);
    } else if (j.status === 'packed') {
      card.appendChild(el('label', '', 'LR / GR no. (if you have it)'));
      var lr = el('input'); lr.value = j.lr || ''; lr.maxLength = 40;
      card.appendChild(lr);
      var veh = field(card, 'Vehicle no. (if you have it)', j.vehicle, '', 30);
      var b3 = el('button', 'pk-main', 'Handed to transport'); b3.type = 'button';
      b3.onclick = function () { act(j, 'handed', { lr: lr.value, vehicle: veh.value }, b3); };
      card.appendChild(b3);
    }
    if (j.canEdit) card.appendChild(editBox(j));
    else if (j.packedAt) card.appendChild(el('div', 'pk-lock', 'Details are locked: 24 hours have passed since packing.'));
    var pr = el('button', 'pk-print', 'Print slip'); pr.type = 'button';
    pr.onclick = function () { printSlip(card); };
    card.appendChild(pr);
    return card;
  }
  function isDone(j) { return j.status === 'packed' || j.status === 'handed'; }
  function render(jobs, stats) {
    last = { jobs: jobs, stats: stats };
    var box = $('pkJobs'); box.textContent = '';
    if (!stats) tab = 'all';           // a server without the counts: show every order
    else if (!tab) tab = stats.remaining ? 'left' : 'done';
    if (stats) {
      var row = el('div', 'pk-stats');
      [['all', 'Assigned', stats.assigned], ['done', 'Packed', stats.done], ['left', 'Remaining', stats.remaining]].forEach(function (s) {
        var c = el('button', 'pk-stat' + (tab === s[0] ? ' on' : '')); c.type = 'button';
        c.appendChild(el('b', '', s[2])); c.appendChild(el('span', '', s[1]));
        c.onclick = function () { tab = s[0]; render(last.jobs, last.stats); };
        row.appendChild(c);
      });
      box.appendChild(row);
    }
    var shown = jobs.filter(function (j) { return tab === 'all' || (tab === 'done') === isDone(j); });
    if (tab !== 'left') shown = shown.slice().reverse();      // the newest finished slip first
    if (!shown.length) return box.appendChild(el('div', 'pk-empty', tab === 'left' ? 'Nothing left to pack. Press Refresh later.' : 'Nothing here yet.'));
    shown.forEach(function (j) { box.appendChild(jobCard(j)); });
  }

  // ---- keep it on the phone: Android asks through Chrome, an iPhone has no prompt, so it gets the steps ----
  var INSTALL_KEY = 'jb_packer_install', installEvt = null;
  function installState() { try { return localStorage.getItem(INSTALL_KEY) || ''; } catch (e) { return ''; } }
  function setInstallState(v) { try { localStorage.setItem(INSTALL_KEY, v); } catch (e) {} }
  function isInstalled() { return installState() === 'done' || window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }
  function snoozed() { return Number(installState()) > Date.now(); }
  function hideInstall() { $('pkInstall').hidden = true; }
  function showInstall() {
    if (isInstalled() || snoozed()) return hideInstall();
    var ua = navigator.userAgent, box = $('pkInstall'), row = el('div', 'pk-install-row');
    var ios = /iPhone|iPad|iPod/.test(ua), android = /Android/.test(ua), inApp = android && /; wv\)/.test(ua);
    box.textContent = '';
    box.appendChild(el('b', '', 'Install the Packer app on this phone?'));
    if (installEvt) {
      box.appendChild(el('span', '', 'It opens from your home screen like any other app.'));
      var yes = el('button', 'go', 'Yes, install'); yes.type = 'button';
      yes.onclick = function () {
        var e = installEvt; installEvt = null; e.prompt();
        e.userChoice.then(function (c) { if (c.outcome === 'accepted') setInstallState('done'); hideInstall(); });
      };
      row.appendChild(yes);
    } else if (ios) {
      box.appendChild(el('span', '', 'Tap the Share button in Safari, then Add to Home Screen.'));
    } else if (inApp) {
      box.appendChild(el('span', '', 'Open this page in Chrome to install it.'));
      var a = el('a', 'go', 'Open in Chrome'); a.href = 'intent://jurisbooks.com/packer.html#Intent;scheme=https;package=com.android.chrome;end';
      row.appendChild(a);
    } else if (android) {
      box.appendChild(el('span', '', 'Tap the three dots in Chrome, then Install app or Add to Home screen.'));
    } else return hideInstall();
    var no = el('button', '', 'Not now'); no.type = 'button';
    no.onclick = function () { setInstallState(String(Date.now() + 7 * 86400000)); hideInstall(); };
    row.appendChild(no);
    box.appendChild(row);
    box.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; showInstall(); });
  window.addEventListener('appinstalled', function () { setInstallState('done'); hideInstall(); });
  if (window.matchMedia('(display-mode: standalone)').matches) setInstallState('done');
  setTimeout(showInstall, 2500);       // no prompt came by now: an iPhone, or another browser - show the steps instead

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

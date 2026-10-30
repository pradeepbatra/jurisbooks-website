/* Packer page (packer.html): staff of a Business Premium business sign in once with their mobile number and a code,
   and see only the orders given to them: items, quantities, bags, transport, address - never a rate or an amount.
   Start packing > Packed (bags) > Handed to transport (LR no.). A new phone signing in ends the old one.
   Everything shown is written with textContent (never innerHTML). */
(function () {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/' : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/';
  var KEY = 'jb_packer_pass';
  var STEP = { 'new': 'New', packing: 'Packing', packed: 'Packed', handed: 'With transport' };
  var $ = function (id) { return document.getElementById(id); };
  var phone = '';

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
      render(r.jobs || []);
    }).catch(function (e) {
      if (expired(e)) { setPass(''); return showSignIn('Please sign in again.'); }
      if (!$('pkView').hidden) return viewMsg(e.message);
      showSignIn(e.message);      // no internet just now: the sign-in is kept, reload to try again
    }).then(function () { btn.disabled = false; btn.textContent = 'Refresh'; });
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
    var head = el('div', 'pk-head');
    head.appendChild(el('b', '', j.no));
    head.appendChild(el('span', 'pk-badge' + (j.status === 'handed' ? ' done' : ''), STEP[j.status] || j.status));
    card.appendChild(head);
    card.appendChild(el('div', '', j.customer));
    if (j.address) card.appendChild(el('div', 'pk-sub', j.address));
    if (j.customerPhone) { var a = el('a', 'pk-call', 'Call ' + j.customerPhone); a.href = 'tel:' + j.customerPhone.replace(/[^\d+]/g, ''); card.appendChild(a); }
    if (j.company) card.appendChild(el('div', 'pk-sub', j.company));
    var t = el('table', 'pk-items');
    (j.items || []).forEach(function (l) {
      var tr = el('tr'), td = el('td', '', l.name);
      if (l.note) td.appendChild(el('small', '', l.note));
      tr.appendChild(td);
      tr.appendChild(el('td', '', l.qty + (l.unit ? ' ' + l.unit : '')));
      t.appendChild(tr);
    });
    card.appendChild(t);
    var facts = el('div', 'pk-facts');
    fact(facts, 'Transport', j.transport); fact(facts, 'Vehicle', j.vehicle);
    fact(facts, 'Bags', j.bagsPacked != null ? j.bagsPacked : (j.bags || ''));
    fact(facts, 'E-way bill', j.eway); fact(facts, 'LR / GR no.', j.lr); fact(facts, 'Note', j.note);
    card.appendChild(facts);
    if (j.status === 'new') {
      var b1 = el('button', 'pk-main', 'Start packing'); b1.type = 'button';
      b1.onclick = function () { act(j, 'start', null, b1); };
      card.appendChild(b1);
    } else if (j.status === 'packing') {
      card.appendChild(el('label', '', 'Bags packed'));
      var bags = el('input'); bags.type = 'number'; bags.min = '0'; bags.inputMode = 'numeric'; bags.value = j.bags || '';
      card.appendChild(bags);
      var b2 = el('button', 'pk-main', 'Packed'); b2.type = 'button';
      b2.onclick = function () { act(j, 'packed', { bags: bags.value }, b2); };
      card.appendChild(b2);
    } else if (j.status === 'packed') {
      card.appendChild(el('label', '', 'LR / GR no. (if you have it)'));
      var lr = el('input'); lr.value = j.lr || ''; lr.maxLength = 40;
      card.appendChild(lr);
      var b3 = el('button', 'pk-main', 'Handed to transport'); b3.type = 'button';
      b3.onclick = function () { act(j, 'handed', { lr: lr.value }, b3); };
      card.appendChild(b3);
    }
    return card;
  }
  function render(jobs) {
    var box = $('pkJobs'); box.textContent = '';
    if (!jobs.length) return box.appendChild(el('div', 'pk-empty', 'No orders right now. Press Refresh later.'));
    jobs.forEach(function (j) { box.appendChild(jobCard(j)); });
  }

  $('pkSend').onclick = sendCode;
  $('pkVerify').onclick = verifyCode;
  $('pkBack').onclick = function () { showSignIn(''); };
  $('pkRefresh').onclick = load;
  $('pkOut').onclick = function () { setPass(''); showSignIn('Signed out.'); };
  $('pkPhone').onkeydown = function (e) { if (e.key === 'Enter') sendCode(); };
  $('pkCode').onkeydown = function (e) { if (e.key === 'Enter') verifyCode(); };
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('pkView').hidden) load(); });
  load();
})();

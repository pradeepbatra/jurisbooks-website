/* My Account (account.html): Jurisbooks customers sign in with a one-time code or Google and see their
   plan, companies, and their payments with printable receipts.
   Only EXISTING Online accounts can sign in here; it never creates an account or starts a trial.
   Everything shown is written with textContent (never innerHTML), except the receipt window, which escapes it. */
(function () {
  'use strict';
  var GOOGLE_WEB_CLIENT_ID = '260087848182-m75693l587livons99c0vueu0v7ve5b0.apps.googleusercontent.com';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/' : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/';
  var KEY = 'jb_account_pass';
  var PHONE = '919220499490';
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
  function msg(id, text, ok) { var m = $(id); m.textContent = text || ''; m.className = 'acct-msg' + (ok ? ' ok' : ''); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fDate(t) { if (!t && t !== 0) return '—'; var d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function fPhone(p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 12 && d.indexOf('91') === 0 ? '+91 ' + d.slice(2, 7) + ' ' + d.slice(7) : (p || ''); }
  function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function getPass() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setPass(p) { try { if (p) sessionStorage.setItem(KEY, p); else sessionStorage.removeItem(KEY); } catch (e) {} }

  // ---- sign in ----
  function showSignIn(note) {
    $('acctView').hidden = true; $('acctSignIn').hidden = false;
    $('acctStepCode').hidden = true; $('acctStepPhone').hidden = false;
    msg('acctMsg', note || '');
  }
  function sendCode() {
    var p = $('acctPhone').value.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(p)) return msg('acctMsg', 'Please enter your 10-digit mobile number.');
    phone = p; $('acctSend').disabled = true; msg('acctMsg', 'Sending the code…', true);
    call('portalSendOtp', { phone: p }).then(function (r) {
      $('acctStepPhone').hidden = true; $('acctStepCode').hidden = false;
      $('acctCodeFor').textContent = '+91 ' + p;
      msg('acctMsg', r && r.devCode ? 'Test mode: your code is ' + r.devCode : 'We have sent a 6-digit code by SMS.', true);
      $('acctCode').value = ''; $('acctCode').focus();
    }).catch(function (e) { msg('acctMsg', e.message); }).then(function () { $('acctSend').disabled = false; });
  }
  function verifyCode() {
    var c = $('acctCode').value.replace(/\D/g, '');
    if (c.length < 4) return msg('acctMsg', 'Please enter the code from the SMS.');
    $('acctVerify').disabled = true; msg('acctMsg', 'Checking…', true);
    call('portalVerifyOtp', { phone: phone, code: c }).then(function (r) { setPass(r.pass); load(); })
      .catch(function (e) { msg('acctMsg', e.message); }).then(function () { $('acctVerify').disabled = false; });
  }
  function googleReady() {
    if (!GOOGLE_WEB_CLIENT_ID) return;
    var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      google.accounts.id.initialize({ client_id: GOOGLE_WEB_CLIENT_ID, callback: function (resp) {
        msg('acctMsg', 'Checking with Google…', true);
        call('portalGoogle', { credential: resp.credential }).then(function (r) { setPass(r.pass); load(); }).catch(function (e) { msg('acctMsg', e.message); });
      } });
      google.accounts.id.renderButton($('acctGoogle'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 300 });
    };
    document.head.appendChild(s);
  }

  // ---- the account ----
  var DATA = null;
  function load() {
    var p = getPass(); if (!p) return showSignIn();
    msg('acctMsg', 'Loading your account…', true);
    call('portalAccount', { pass: p }).then(render).catch(function (e) {
      setPass(''); showSignIn(e.code === 'portal-expired' || /sign in again/i.test(e.message) ? 'Please sign in again.' : e.message);
    });
  }
  function kv(dl, k, v) { dl.appendChild(el('dt', null, k)); var dd = el('dd'); if (v instanceof Node) dd.appendChild(v); else dd.textContent = v; dl.appendChild(dd); }
  function render(a) {
    DATA = a;
    $('acctSignIn').hidden = true; $('acctView').hidden = false;
    var who = a.account.business || a.account.name || a.account.phone || a.account.email;
    $('acctWho').textContent = who;
    $('acctIdent').textContent = [fPhone(a.account.phone), a.account.email].filter(Boolean).join(' · ');
    // plan
    var pl = $('acctPlan'); pl.textContent = '';
    var dl = el('dl', 'acct-kv');
    var status = el('span', 'acct-badge ' + (a.plan.active ? 'ok' : 'bad'), a.plan.active ? 'Active' : (a.plan.reason === 'trial_expired' ? 'Trial ended' : 'Expired'));
    kv(dl, 'Plan', a.plan.label); kv(dl, 'Status', status);
    kv(dl, a.plan.active ? 'Valid until' : 'Ended on', a.plan.until >= 9e15 ? 'No end date' : fDate(a.plan.until) + (a.plan.active && a.plan.daysLeft != null ? '  (' + a.plan.daysLeft + ' day' + (a.plan.daysLeft === 1 ? '' : 's') + ' left)' : ''));
    kv(dl, 'Companies', (a.companies.filter(function (c) { return c.role === 'owner'; }).length) + ' of ' + a.plan.maxCompanies);
    kv(dl, 'Computers at a time', String(a.plan.maxSeats) + (a.plan.extraSeats ? '  (' + (a.plan.baseSeats || 1) + ' in the plan + ' + a.plan.extraSeats + ' extra)' : ''));
    (a.plan.seatGrants || []).forEach(function (g) { kv(dl, 'Extra seats', g.n + ' until ' + fDate(g.until) + (g.source === 'free' ? ' (given free)' : '')); });
    if (a.plan.messages) kv(dl, 'Customer messages', (a.plan.messages.active ? 'WhatsApp / SMS, until ' : 'Ended on ') + fDate(a.plan.messages.until));
    pl.appendChild(dl);
    var renew = el('a', 'btn btn-primary', a.plan.plan === 'trial' ? 'Choose a plan' : 'Renew or upgrade');
    renew.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent('Hello Jurisbooks, I would like to ' + (a.plan.plan === 'trial' ? 'choose a plan' : 'renew my ' + a.plan.label + ' plan') + '. My account: ' + (a.account.phone || a.account.email));
    renew.target = '_blank'; renew.rel = 'noopener';
    // Once online payment is switched on, Renew / upgrade goes straight to checkout (already signed in: no code needed).
    call('getPricing').then(function (pr) {
      if (!pr || !pr.payments || pr.payments.provider === 'none') return;
      renew.href = 'checkout.html?plan=' + (/^(basic|premium|business)$/.test(a.plan.plan) ? a.plan.plan : 'premium') + '&years=1';
      renew.removeAttribute('target'); renew.removeAttribute('rel');
    }).catch(function () {});
    var more = el('a', 'btn btn-outline', 'See plans & pricing'); more.href = 'pricing.html';
    var row = el('div', 'acct-actions'); row.appendChild(renew);
    if (a.plan.plan !== 'trial' && a.plan.active) { var seats = el('a', 'btn btn-outline', 'Add seats'); seats.href = 'checkout.html?plan=seats&seats=1&years=1'; row.appendChild(seats);
      var mm = el('a', 'btn btn-outline', a.plan.messages ? 'Renew customer messages' : 'Add customer messages'); mm.href = 'checkout.html?plan=messages&years=1'; row.appendChild(mm); }
    row.appendChild(more); pl.appendChild(row);
    // companies
    var co = $('acctCompanies'); co.textContent = '';
    if (!a.companies.length) co.appendChild(el('p', 'small-note', 'No companies yet. Create one in Jurisbooks.'));
    a.companies.forEach(function (c) { co.appendChild(el('li', null, c.name + (c.role === 'owner' ? '' : ' (shared with you)'))); });
    // payments
    var tb = $('acctPayments'); tb.textContent = '';
    if (!a.payments.length) { var tr0 = el('tr'); var td0 = el('td', 'small-note', 'No payments recorded yet.'); td0.colSpan = 5; tr0.appendChild(td0); tb.appendChild(tr0); }
    a.payments.forEach(function (p) {
      var tr = el('tr');
      tr.appendChild(el('td', null, fDate(p.date)));
      tr.appendChild(el('td', 'mono', p.receiptNo));
      tr.appendChild(el('td', null, p.what));
      tr.appendChild(el('td', 'num', money(p.amount)));
      var td = el('td'); var b = el('button', 'btn btn-outline btn-small', 'Receipt'); b.type = 'button';
      b.addEventListener('click', function () { openReceipt(p); }); td.appendChild(b); tr.appendChild(td);
      tb.appendChild(tr);
    });
    msg('acctMsg', '');
  }

  // ---- receipt (printable) ----
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function words(n) {   // Indian numbering, rupees only
    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); }
    function three(x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); }
    n = Math.floor(Number(n) || 0); if (!n) return 'Zero';
    var out = [], cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, rest = n % 1000;
    if (cr) out.push(three(cr) + ' Crore'); if (lk) out.push(two(lk) + ' Lakh'); if (th) out.push(two(th) + ' Thousand'); if (rest) out.push(three(rest));
    return out.join(' ');
  }
  var MODES = { upi: 'UPI', cash: 'Cash', bank: 'Bank transfer', cheque: 'Cheque', card: 'Card', razorpay: 'Online payment', other: 'Other' };
  function openReceipt(p) {
    var a = DATA, s = a.seller, w = window.open('', '_blank');
    if (!w) return alert('Please allow pop-ups for this page to view the receipt.');
    var to = [a.account.business, a.account.name].filter(Boolean).join(' — ') || (a.account.phone || a.account.email);
    var paise = Math.round((Number(p.amount) || 0) * 100) % 100;
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ' + esc(p.receiptNo) + '</title><style>' +
      'body{font:14px/1.5 "Segoe UI",system-ui,sans-serif;color:#16213A;margin:0;background:#f2f3ee}.r{max-width:720px;margin:24px auto;background:#fff;padding:40px 44px;border:1px solid #d5d9c4}' +
      'h1{font:600 26px Georgia,serif;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16213A;padding-bottom:16px;margin-bottom:18px}' +
      '.muted{color:#48546E;font-size:12.5px}.tag{font:600 11px monospace;letter-spacing:.15em;color:#93701F}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #e3e5da}' +
      'th{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#48546E}.num{text-align:right}.total td{font-weight:700;border-top:2px solid #16213A}.foot{margin-top:26px;font-size:12px;color:#48546E}' +
      '.btns{max-width:720px;margin:0 auto 30px;text-align:right}button{font:inherit;padding:8px 18px;border:1px solid #16213A;background:#16213A;color:#fff;border-radius:4px;cursor:pointer}@media print{body{background:#fff}.r{border:0;margin:0}.btns{display:none}}' +
      '</style></head><body><div class="r"><div class="top"><div><div class="tag">RECEIPT</div><h1>' + esc(s.name) + '</h1><div class="muted">' + esc(s.place) + ' &middot; ' + esc(s.email) + ' &middot; ' + esc(s.phone) + '</div><div class="muted">Jurisbooks &middot; www.jurisbooks.com</div></div>' +
      '<div style="text-align:right"><div class="muted">Receipt No.</div><div style="font:600 16px monospace">' + esc(p.receiptNo) + '</div><div class="muted" style="margin-top:6px">Date</div><div>' + esc(fDate(p.date)) + '</div></div></div>' +
      '<div class="muted">Received from</div><div style="font-weight:600">' + esc(to) + '</div><div class="muted">' + esc([fPhone(a.account.phone), a.account.email].filter(Boolean).join(' · ')) + (a.account.city ? ' &middot; ' + esc(a.account.city) : '') + '</div>' +
      '<table><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody><tr><td>' + esc(p.what) + '</td><td class="num">' + esc(money(p.amount)) + '</td></tr>' +
      '<tr class="total"><td>Total received</td><td class="num">' + esc(money(p.amount)) + '</td></tr></tbody></table>' +
      '<div><span class="muted">Amount in words:</span> Rupees ' + esc(words(p.amount)) + (paise ? ' and ' + esc(words(paise)) + ' Paise' : '') + ' only</div>' +
      '<div><span class="muted">Payment mode:</span> ' + esc(MODES[p.mode] || p.mode) + (p.ref ? ' &middot; <span class="muted">Reference:</span> ' + esc(p.ref) : '') + '</div>' +
      '<div class="foot">' + esc(s.gstNote) + ' &mdash; no GST has been charged. This is a computer-generated receipt and does not require a signature.</div>' +
      '</div><div class="btns"><button onclick="window.print()">Print or save as PDF</button></div></body></html>');
    w.document.close();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('acctSend').addEventListener('click', sendCode);
    $('acctVerify').addEventListener('click', verifyCode);
    $('acctPhone').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendCode(); });
    $('acctCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyCode(); });
    $('acctChange').addEventListener('click', function (e) { e.preventDefault(); showSignIn(); });
    $('acctSignOut').addEventListener('click', function () { setPass(''); DATA = null; showSignIn('You have signed out.'); });
    googleReady();
    if (getPass()) load(); else showSignIn();
  });
})();

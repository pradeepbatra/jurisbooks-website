/* Sales team page (sales.html): Jurisbooks' own sales people sign in with their mobile number and a one-time
   code, and see their referral link, the customers they brought and - a team leader - their team, and the
   leads handed to them to chase (stage, call-back, notes). Since 8 Nov 2026 it is also the CRM: "Customer has
   paid" sends a payment for approval (My requests), managers approve their team's, and a CRM admin / manager
   adds people and teams (cloud lib/crm.js). Nothing else of the Back Office is shown here.
   Only numbers the owner has added in Back Office (Referrals & sales teams) can sign in.
   Everything shown is written with textContent (never innerHTML). */
(function () {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/' : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/';
  var KEY = 'jb_sales_pass';
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
  function msg(text, ok) { var m = $('salesMsg'); m.textContent = text || ''; m.className = 'acct-msg' + (ok ? ' ok' : ''); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fDate(t) { if (!t) return ''; var d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function fPhone(p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 12 && d.indexOf('91') === 0 ? '+91 ' + d.slice(2, 7) + ' ' + d.slice(7) : (p || ''); }
  function money(n) { return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN'); }
  // Kept on this phone or computer until "Sign out" (the cloud ends it after 30 days, or when the owner removes the person).
  function getPass() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setPass(p) { try { if (p) localStorage.setItem(KEY, p); else localStorage.removeItem(KEY); } catch (e) {} }

  // ---- sign in ----
  function showSignIn(note) {
    $('salesView').hidden = true; $('salesSignIn').hidden = false;
    $('salesStepCode').hidden = true; $('salesStepPhone').hidden = false;
    msg(note || '');
  }
  function sendCode() {
    var p = $('salesPhone').value.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(p)) return msg('Please enter your 10-digit mobile number.');
    phone = p; $('salesSend').disabled = true; msg('Sending the code…', true);
    call('salesSendOtp', { phone: p }).then(function (r) {
      $('salesStepPhone').hidden = true; $('salesStepCode').hidden = false;
      $('salesCodeFor').textContent = '+91 ' + p;
      msg(r && r.devCode ? 'Test mode: your code is ' + r.devCode : 'We have sent a 6-digit code by SMS.', true);
      $('salesCode').value = ''; $('salesCode').focus();
    }).catch(function (e) { msg(e.message); }).then(function () { $('salesSend').disabled = false; });
  }
  function verifyCode() {
    var c = $('salesCode').value.replace(/\D/g, '');
    if (c.length < 4) return msg('Please enter the code from the SMS.');
    $('salesVerify').disabled = true; msg('Checking…', true);
    call('salesVerifyOtp', { phone: phone, code: c }).then(function (r) { setPass(r.pass); load(); })
      .catch(function (e) { msg(e.message); }).then(function () { $('salesVerify').disabled = false; });
  }

  // ---- the page ----
  function load() {
    var p = getPass(); if (!p) return showSignIn();
    msg('Loading…', true);
    // the Refresh button shows that it is working (the message above is on the sign-in card, hidden once signed in)
    var btn = $('salesRefresh'); btn.disabled = true; btn.textContent = 'Refreshing…';
    var done = function (text) { btn.disabled = false; btn.textContent = text; if (text !== 'Refresh') setTimeout(function () { btn.textContent = 'Refresh'; }, 2000); };
    call('salesPortal', { pass: p }).then(function (a) { render(a); done('Updated ✓'); }).catch(function (e) {
      done('Refresh');
      if (e.code === 'portal-expired' || /sign in again/i.test(e.message)) { setPass(''); return showSignIn('Please sign in again.'); }
      showSignIn(e.message);      // no internet just now: the sign-in is kept, "Try again" by reloading
    });
  }
  function tiles(box, t, amounts) {
    box.textContent = '';
    var add = function (n, label) { var d = el('div', 'sales-tile'); d.appendChild(el('b', null, n)); d.appendChild(el('span', null, label)); box.appendChild(d); };
    add(String(t.joined), 'Joined'); add(String(t.paid), 'Bought');
    if (amounts) add(money(t.amount), 'Paid by them');
  }
  // One customer: company in bold, the person's name and phone under it, and where they stand.
  function leadRow(l, shows) {
    var row = el('div', 'sales-lead');
    var who = el('div', 'sales-who');
    var parts = [l.business, l.name].filter(Boolean);
    who.appendChild(el('b', null, parts[0] || (l.phone ? fPhone(l.phone) : 'New customer')));
    var under = parts.slice(1);
    if (l.phone && parts.length) under.push(fPhone(l.phone));
    if (under.length) who.appendChild(el('div', 'small-note', under.join(' · ')));
    who.appendChild(el('div', 'small-note', 'Joined ' + fDate(l.at) + (l.by ? ' · by ' + l.by : '')));
    row.appendChild(who);
    var st = el('div', 'sales-status');
    var text, cls;
    if (l.gone) { text = 'Account closed'; cls = 'bad'; }
    else if (l.status === 'paid' || l.paidPlan) { text = 'Bought ' + l.plan; cls = 'ok'; }
    else if (l.active) { text = 'Free trial · ' + (l.daysLeft != null ? l.daysLeft + ' day' + (l.daysLeft === 1 ? '' : 's') + ' left' : 'running'); cls = 'wait'; }
    else { text = 'Trial ended'; cls = 'bad'; }
    st.appendChild(el('span', 'acct-badge ' + cls, text));
    if (shows.amounts && l.amount > 0) st.appendChild(el('div', 'small-note', 'Paid ' + money(l.amount)));
    if (l.phone) {
      var d = l.phone.replace(/\D/g, '');
      var acts = el('div', 'sales-acts');
      var w = el('a', 'btn btn-outline', 'WhatsApp'); w.href = 'https://wa.me/' + d; w.target = '_blank'; w.rel = 'noopener'; acts.appendChild(w);
      var c = el('a', 'btn btn-outline', 'Call'); c.href = 'tel:+' + d; acts.appendChild(c);
      st.appendChild(acts);
    }
    row.appendChild(st);
    return row;
  }
  function leadList(box, leads, shows, empty) {
    box.textContent = '';
    if (!leads.length) return box.appendChild(el('p', 'small-note', empty));
    leads.forEach(function (l) { box.appendChild(leadRow(l, shows)); });
  }
  // What this person has earned: on their own sales, and - a leader or distributor - their share of the team's.
  var SHARE = { seller: 'Your sale', leader: 'Team leader share', distributor: 'Distributor share' };
  var MODE = { upi: 'UPI', bank: 'Bank transfer', cash: 'Cash', cheque: 'Cheque', other: 'Other' };
  function commission(c) {
    $('salesCommCard').hidden = !c;
    if (!c) return;
    var box = $('salesCommTiles'); box.textContent = '';
    var add = function (n, label) { var d = el('div', 'sales-tile'); d.appendChild(el('b', null, n)); d.appendChild(el('span', null, label)); box.appendChild(d); };
    add(money(c.earned), 'Earned'); add(money(c.paid), 'Paid to you'); add(money(c.due), 'Due to you');
    var list = $('salesCommLines'); list.textContent = '';
    if (!c.lines.length) list.appendChild(el('p', 'small-note', 'Nothing yet. Commission is added here when a customer you brought pays for a plan.'));
    c.lines.forEach(function (l) {
      var row = el('div', 'sales-lead' + (l.status === 'void' ? ' sales-void' : ''));
      var who = el('div', 'sales-who');
      who.appendChild(el('b', null, l.customer || 'Customer'));
      who.appendChild(el('div', 'small-note', [fDate(l.at), SHARE[l.level] + (l.level !== 'seller' && l.seller ? ' (sold by ' + l.seller + ')' : ''), l.first ? '' : 'renewal'].filter(Boolean).join(' · ')));
      if (l.deduct > 0) who.appendChild(el('div', 'small-note', money(l.gross) + ' less ' + money(l.deduct) + ' you took off the price on your payment link'));
      row.appendChild(who);
      var st = el('div', 'sales-status');
      st.appendChild(el('b', null, money(l.commission)));
      st.appendChild(document.createTextNode(' '));
      st.appendChild(el('span', 'acct-badge ' + (l.status === 'paid' ? 'ok' : l.status === 'void' ? 'bad' : 'wait'), l.status === 'paid' ? 'Paid ' + fDate(l.paidAt) : l.status === 'void' ? 'Cancelled' : 'Due'));
      row.appendChild(st);
      list.appendChild(row);
    });
    var po = $('salesPayouts'); po.textContent = '';
    if (c.payouts.length) {
      po.appendChild(el('p', 'small-note', 'Paid to you: ' + c.payouts.map(function (p) { return money(p.amount) + ' on ' + fDate(p.date) + ' (' + (MODE[p.mode] || p.mode) + (p.ref ? ' ' + p.ref : '') + ')'; }).join('; ')));
    }
  }
  // ---- payment links: agree a price with a new customer and send them a link to pay (valid for one hour) ----
  var LINKS = null;
  function linkNormal() { var p = (LINKS.plans || []).filter(function (x) { return x.plan === $('slPlan').value; })[0]; return p ? p.prices[$('slYears').value] || 0 : 0; }
  function linkFloor(n) { var p = (LINKS.plans || []).filter(function (x) { return x.plan === $('slPlan').value; })[0], f = p && p.floors && p.floors[$('slYears').value]; return f != null ? f : Math.ceil(n * (100 - (LINKS.maxDiscount || 0)) / 100); }
  function linkHint(setPrice) {
    var n = linkNormal(), floor = linkFloor(n), max = floor < n ? LINKS.maxDiscount || 0 : 0;
    if (setPrice) $('slAmount').value = n || '';
    var a = Math.round(Number($('slAmount').value) || 0), off = n - a;
    var t = 'Normal price ' + money(n) + (LINKS.gstRate ? ' + ' + LINKS.gstRate + '% GST' : '') + '. ' + (max > 0 ? 'Lowest you can give: ' + money(floor) + '.' : 'A lower price is not allowed.');
    if (a > 0 && off > 0 && a >= floor) t += ' You are giving ' + money(off) + ' off - that comes out of your commission on this sale.';
    if (LINKS.gstRate && a > 0) t += ' The customer pays ' + money(a + Math.round(a * LINKS.gstRate / 100)) + ' with GST.';
    $('slHint').textContent = t;
  }
  function linkStatus(l) { return l.status === 'paid' ? ['Paid', 'ok'] : l.status === 'expired' ? ['Expired', 'bad'] : ['Waiting - ' + Math.max(1, Math.round((l.expiresAt - Date.now()) / 60000)) + ' min left', 'wait']; }
  // What happened to the price: Jurisbooks sent it by SMS, or the customer finds it on jurisbooks.com (the sales person
  // never gets a link to forward - owner, 26 Oct 2026).
  function sentText(l) {
    return l.sent === 'sms'
      ? 'Jurisbooks has sent the price by SMS to ' + fPhone(l.phone) + '. The customer opens it, verifies the number and pays on jurisbooks.com.'
      : 'Ask the customer to open jurisbooks.com, press Buy and verify ' + fPhone(l.phone) + ': the agreed price shows there by itself (for ' + (LINKS.minutes || 60) + ' minutes).';
  }
  function showLink(l) { $('slResult').hidden = false; $('slLink').textContent = sentText(l); }
  function drawLinks() {
    var box = $('slList'); box.textContent = '';
    if (!LINKS.links.length) return;
    box.appendChild(el('p', 'acct-label', 'Your links'));
    LINKS.links.forEach(function (l) {
      var row = el('div', 'sales-lead'), who = el('div', 'sales-who');
      who.appendChild(el('b', null, l.name));
      who.appendChild(el('div', 'small-note', [fPhone(l.phone), l.label + ' ' + l.years + 'y', money(l.amount) + (l.discount > 0 ? ' (' + money(l.discount) + ' off)' : '')].join(' · ')));
      row.appendChild(who);
      var st = el('div', 'sales-status'), s = linkStatus(l);
      st.appendChild(el('span', 'acct-badge ' + s[1], s[0]));
      if (l.status === 'open') {
        var acts = el('div', 'sales-acts'); var b = el('button', 'btn btn-outline', 'Send again'); b.type = 'button';
        b.addEventListener('click', function () {
          b.disabled = true;
          call('salesResendLink', { pass: getPass(), id: l.id }).then(function (n) { showLink(n); $('slResult').scrollIntoView({ block: 'center' }); })
            .catch(function (e) { $('slMsg').className = 'acct-msg'; $('slMsg').textContent = e.message; }).then(function () { b.disabled = false; });
        });
        acts.appendChild(b); st.appendChild(acts);
      }
      row.appendChild(st); box.appendChild(row);
    });
  }
  function loadLinks() {
    call('salesLinkOptions', { pass: getPass() }).then(function (o) {
      var first = !LINKS; LINKS = o;
      $('salesLinkCard').hidden = false;
      $('salesLinkRule').textContent = 'For a NEW customer only. Agree the plan and the price, then send the link: the customer verifies their mobile number and pays. A link works for ' + o.minutes + ' minutes.';
      if (first) {
        var ps = $('slPlan'), ys = $('slYears'); ps.textContent = ''; ys.textContent = '';
        o.plans.forEach(function (p) { var op = el('option', null, p.label); op.value = p.plan; ps.appendChild(op); });
        [1, 2, 3, 4, 5].forEach(function (n) { var op = el('option', null, n + ' year' + (n > 1 ? 's' : '')); op.value = n; ys.appendChild(op); });
        if (o.plans.some(function (p) { return p.plan === 'premium'; })) ps.value = 'premium';
        ps.addEventListener('change', function () { linkHint(true); }); ys.addEventListener('change', function () { linkHint(true); });
        $('slAmount').addEventListener('input', function () { linkHint(false); });
        $('slMake').addEventListener('click', makeLink);
        linkHint(true);
      } else linkHint(false);
      drawLinks();
    }).catch(function () { $('salesLinkCard').hidden = true; });
  }
  function makeLink() {
    var m = $('slMsg'); m.textContent = ''; m.className = 'acct-msg';
    var ph = $('slPhone').value.replace(/\D/g, '').slice(-10);
    if ($('slName').value.trim().length < 2) { m.textContent = 'Enter the customer\u2019s name.'; return; }
    if (!/^[6-9]\d{9}$/.test(ph)) { m.textContent = 'Enter the customer\u2019s 10-digit mobile number.'; return; }
    $('slMake').disabled = true; m.textContent = 'Making the link\u2026'; m.className = 'acct-msg ok';
    call('salesMakeLink', { pass: getPass(), name: $('slName').value.trim(), phone: ph, plan: $('slPlan').value, years: Number($('slYears').value), amount: Number($('slAmount').value) }).then(function (l) {
      m.textContent = 'Done. The price works for ' + (LINKS.minutes || 60) + ' minutes.';
      LINKS.links.unshift(l); showLink(l); drawLinks();
    }).catch(function (e) {
      if (e.code === 'portal-expired' || /sign in again/i.test(e.message)) { setPass(''); return showSignIn('Please sign in again.'); }
      m.className = 'acct-msg'; m.textContent = e.message;
    }).then(function () { $('slMake').disabled = false; });
  }
  // ---- Leads to chase (cloud lib/leads.js): only the leads handed to this person (a team leader: the team's).
  var CRM = null;
  var HEAT = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
  function stageName(id) { var s = (CRM.stages || []).filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; }
  function crmFail(e, box) {
    if (e.code === 'portal-expired' || /sign in again/i.test(e.message)) { setPass(''); return showSignIn('Please sign in again.'); }
    box.className = 'acct-msg'; box.textContent = e.message;
  }
  function opt(sel, value, text) { var o = el('option', null, text); o.value = value; sel.appendChild(o); }
  function crmLead(l) {
    var row = el('div', 'crm-lead');
    var top = el('div', 'crm-top');
    var who = el('div'); who.appendChild(el('b', null, l.business || l.name || fPhone(l.phone)));
    var sub = [l.business && l.name ? l.name : '', l.city, CRM.canHand && l.ownerName ? 'with ' + l.ownerName : ''].filter(Boolean).join(' · ');
    if (sub) who.appendChild(el('div', 'small-note', sub));
    top.appendChild(who);
    var bs = el('div', 'crm-badges');
    bs.appendChild(el('span', 'acct-badge ' + (l.stage === 'bought' ? 'ok' : l.stage === 'lost' ? 'bad' : 'wait'), stageName(l.stage)));
    if (l.heat) bs.appendChild(el('span', 'acct-badge ' + (l.heat === 'hot' ? 'hot' : 'info'), HEAT[l.heat]));
    if (l.callBackAt) bs.appendChild(el('span', 'acct-badge ' + (l.due ? 'bad' : 'info'), (l.due ? 'CALL TODAY · ' : 'Call back ') + fDate(new Date(l.callBackAt + 'T00:00:00').getTime())));
    top.appendChild(bs);
    row.appendChild(top);
    var lost = l.stage === 'lost' ? 'Lost: ' + ((CRM.lostReasons.filter(function (r) { return r.id === l.lostReason; })[0] || {}).label || '') + (l.lostNote ? ' - ' + l.lostNote : '') : '';
    row.appendChild(el('div', 'small-note', [l.callBackNote, lost, 'Last talked: ' + (l.lastContactAt ? fDate(l.lastContactAt) : 'never')].filter(Boolean).join(' · ')));
    var acts = el('div', 'sales-acts');
    if (l.phone) {
      var tel = el('a', 'btn btn-outline', 'Call'); tel.href = 'tel:' + l.phone;
      tel.addEventListener('click', function () { call('salesLeadNote', { pass: getPass(), id: l.id, kind: 'call', text: '' }).catch(function () {}); });
      var wa = el('a', 'btn btn-outline', 'WhatsApp'); wa.target = '_blank'; wa.rel = 'noopener';
      wa.href = 'https://wa.me/' + l.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent('Namaste ' + (l.name || '') + ', ');
      wa.addEventListener('click', function () { call('salesLeadNote', { pass: getPass(), id: l.id, kind: 'whatsapp', text: '' }).catch(function () {}); });
      acts.appendChild(tel); acts.appendChild(wa);
    }
    var upd = el('button', 'btn btn-primary', 'Update'); upd.type = 'button';
    acts.appendChild(upd);
    var payForm = null;
    if (l.stage !== 'lost') {
      var paidBtn = el('button', 'btn btn-outline', 'Customer has paid'); paidBtn.type = 'button';
      acts.appendChild(paidBtn);
      paidBtn.addEventListener('click', function () {
        if (payForm) { payForm.remove(); payForm = null; return; }
        payForm = paidForm(l); row.appendChild(payForm);
      });
    }
    row.appendChild(acts);
    var form = null;
    upd.addEventListener('click', function () {
      if (form) { form.remove(); form = null; return; }
      form = el('div', 'crm-edit');
      var lab = function (t, input, full) { var w = el('div', full ? 'full' : null); w.appendChild(el('label', null, t)); w.appendChild(input); form.appendChild(w); return input; };
      var st = lab('Stage', el('select'));
      (CRM.stages || []).filter(function (s) { return s.manual; }).forEach(function (s) { opt(st, s.id, s.label); });
      st.value = l.stage === 'bought' ? 'interested' : l.stage;
      var ht = lab('Hot / warm / cold', el('select')); opt(ht, '', '-'); opt(ht, 'hot', 'Hot'); opt(ht, 'warm', 'Warm'); opt(ht, 'cold', 'Cold'); ht.value = l.heat || '';
      var cb = lab('Next call-back', el('input')); cb.type = 'date'; cb.value = l.callBackAt || '';
      var cbn = lab('Call-back note', el('input')); cbn.maxLength = 200; cbn.value = l.callBackNote || '';
      var lr = lab('Why lost', el('select')); opt(lr, '', 'Choose why...'); (CRM.lostReasons || []).forEach(function (r) { opt(lr, r.id, r.label); }); lr.value = l.lostReason || '';
      var lrWrap = lr.parentNode;
      var hand = null;
      if (CRM.canHand) { hand = lab('Who works on it', el('select')); CRM.targets.forEach(function (t) { opt(hand, t.key, t.label); }); hand.value = l.owner; }
      var note = lab('What was said (saved as a note)', el('textarea'), true); note.rows = 2; note.maxLength = 1000;
      var show = function () { lrWrap.hidden = st.value !== 'lost'; }; st.addEventListener('change', show); show();
      var save = el('button', 'btn btn-primary', 'Save'); save.type = 'button';
      var m = el('p', 'acct-msg'); var w = el('div', 'full'); w.appendChild(save); w.appendChild(m); form.appendChild(w);
      save.addEventListener('click', function () {
        var f = { heat: ht.value, callBackAt: cb.value, callBackNote: cbn.value };
        if (l.stage !== 'bought' && st.value !== l.stage) f.stage = st.value;
        if (st.value === 'lost') { f.stage = 'lost'; f.lostReason = lr.value; }
        if (hand && hand.value !== l.owner) f.owner = hand.value;
        save.disabled = true; m.className = 'acct-msg ok'; m.textContent = 'Saving...';
        var p = note.value.trim() ? call('salesLeadNote', { pass: getPass(), id: l.id, kind: 'note', text: note.value.trim() }) : Promise.resolve();
        p.then(function () { return call('salesLeadSave', { pass: getPass(), id: l.id, fields: f }); }).then(load)
          .catch(function (e) { crmFail(e, m); save.disabled = false; });
      });
      row.appendChild(form);
    });
    if (l.log && l.log.length) {
      var ul = el('ul', 'crm-log');
      l.log.slice(0, 4).forEach(function (x) { ul.appendChild(el('li', null, fDate(x.at) + ' · ' + x.by + ': ' + x.text)); });
      row.appendChild(ul);
    }
    return row;
  }
  function drawCrm(c) {
    CRM = c || null;
    $('crmCard').hidden = !CRM;
    if (!CRM) return;
    var t = $('crmTiles'); t.textContent = '';
    var s = CRM.summary || {};
    var open = (CRM.leads || []).filter(function (l) { return l.stage !== 'bought' && l.stage !== 'lost'; });
    var tile = function (n, label) { var d = el('div', 'sales-tile'); d.appendChild(el('b', null, String(n))); d.appendChild(el('span', null, label)); t.appendChild(d); };
    tile((CRM.leads || []).filter(function (l) { return l.due; }).length, 'to call today');
    tile(open.length, 'open leads');
    tile(s.interested || 0, 'interested');
    tile(s.bought || 0, 'bought');
    tile(s.lost || 0, 'lost');
    var list = $('crmList'); list.textContent = '';
    var rows = $('crmOpenOnly').checked ? open : (CRM.leads || []);
    if (!rows.length) list.appendChild(el('p', 'small-note', 'No leads to chase right now. Your manager hands leads to you here - or add one you found.'));
    rows.forEach(function (l) { list.appendChild(crmLead(l)); });
  }
  function addLead() {
    var m = $('crmAddMsg'); m.className = 'acct-msg'; m.textContent = '';
    var ph = $('crmPhone').value.replace(/\D/g, '').slice(-10);
    if (!$('crmName').value.trim() && !$('crmBiz').value.trim()) { m.textContent = 'Enter the name or the business.'; return; }
    if (!/^[6-9]\d{9}$/.test(ph)) { m.textContent = 'Enter the 10-digit mobile number.'; return; }
    $('crmAddSave').disabled = true;
    call('salesLeadAdd', { pass: getPass(), fields: { name: $('crmName').value.trim(), business: $('crmBiz').value.trim(), phone: ph, city: $('crmCity').value.trim(), callBackAt: $('crmCb').value } })
      .then(function () { ['crmName', 'crmBiz', 'crmPhone', 'crmCity', 'crmCb'].forEach(function (id) { $(id).value = ''; }); $('crmAdd').hidden = true; load(); })
      .catch(function (e) { crmFail(e, m); }).then(function () { $('crmAddSave').disabled = false; });
  }
  // ---- CRM (cloud lib/crm.js, owner 8 Nov 2026): a sales person never switches a plan on or records money
  // themselves. "Customer has paid" sends a REQUEST to Jurisbooks (Back Office) - or to the manager - who checks
  // the money and approves; the answer comes back under "My requests". Once per customer, with a payment, the
  // sales person may give 7 free days at once so the customer can work while the request waits.
  var PAY_MODES = [['upi', 'UPI'], ['bank', 'Bank transfer'], ['cash', 'Cash'], ['cheque', 'Cheque'], ['card', 'Card'], ['other', 'Other']];
  var REQ_PLANS = [['', 'Only record the payment'], ['basic', 'Basic'], ['premium', 'Premium'], ['business', 'Business Premium'], ['androidbasic', 'Mobile Basic'], ['android', 'Mobile Premium']];
  var MODE_NAME = {}; PAY_MODES.forEach(function (m) { MODE_NAME[m[0]] = m[1]; });
  function today() { return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10); }
  function sessionGone(e) { if (e.code === 'portal-expired' || /sign in again/i.test(e.message)) { setPass(''); showSignIn('Please sign in again.'); return true; } return false; }
  function formLab(form, t, input, full) { var w = el('div', full ? 'full' : null); w.appendChild(el('label', null, t)); w.appendChild(input); form.appendChild(w); return input; }
  function formSave(form, text) {
    var save = el('button', 'btn btn-primary', text); save.type = 'button';
    var m = el('p', 'acct-msg'); var w = el('div', 'full'); w.appendChild(save); w.appendChild(m); form.appendChild(w);
    return { save: save, m: m, bad: function (t) { m.className = 'acct-msg'; m.textContent = t; }, ok: function (t) { m.className = 'acct-msg ok'; m.textContent = t; } };
  }
  function paidForm(l) {
    var form = el('div', 'crm-edit');
    var lab = function (t, input, full) { return formLab(form, t, input, full); };
    var intro = el('p', 'small-note', 'Send the payment to Jurisbooks for approval. Write it exactly as it came in - it is checked against the bank or UPI before the plan is switched on.');
    var iw = el('div', 'full'); iw.appendChild(intro); form.appendChild(iw);
    var amt = lab('Amount paid (₹, with GST)', el('input')); amt.type = 'number'; amt.min = '1'; amt.step = '1'; amt.inputMode = 'numeric';
    var md = lab('Paid by', el('select')); PAY_MODES.forEach(function (m) { opt(md, m[0], m[1]); });
    var rf = lab('UPI / bank reference number', el('input')); rf.maxLength = 120; rf.autocomplete = 'off';
    var dt = lab('Paid on', el('input')); dt.type = 'date'; dt.value = today(); dt.max = today();
    var pl = lab('Plan the payment is for', el('select')); REQ_PLANS.forEach(function (x) { opt(pl, x[0], x[1]); });
    var yr = lab('Years', el('select')); [1, 2, 3, 4, 5].forEach(function (n) { opt(yr, String(n), n + ' year' + (n > 1 ? 's' : '')); });
    var showYr = function () { yr.parentNode.hidden = !pl.value; }; pl.addEventListener('change', showYr); showYr();
    var showRf = function () { rf.parentNode.hidden = md.value === 'cash'; }; md.addEventListener('change', showRf); showRf();
    var bw = el('div', 'full'), bl = el('label', 'crm-tick'), bx = el('input'); bx.type = 'checkbox';
    bl.appendChild(bx); bl.appendChild(document.createTextNode(' Give the customer 7 days now, while the payment is approved (once per customer)'));
    bw.appendChild(bl);
    if (l.bridgeUsed) { bx.disabled = true; bw.appendChild(el('div', 'small-note', 'The 7 days were already given to this customer once.')); }
    else if (!l.hasAccount) { bx.disabled = true; bw.appendChild(el('div', 'small-note', 'Not possible yet: the customer has not signed in to the Jurisbooks app. Ask them to sign in first.')); }
    form.appendChild(bw);
    var nt = lab('Note for Jurisbooks (optional)', el('textarea'), true); nt.rows = 2; nt.maxLength = 500;
    var f = formSave(form, 'Send for approval');
    f.save.addEventListener('click', function () {
      if (!(Number(amt.value) > 0)) return f.bad('Type the amount the customer paid.');
      if (md.value !== 'cash' && !rf.value.trim()) return f.bad('Type the UPI / bank reference number.');
      if (bx.checked && !window.confirm('Give ' + (l.business || l.name || 'this customer') + ' 7 days now? This can be done only once for this customer.')) return;
      f.save.disabled = true; f.ok('Sending…');
      call('salesCrmRequest', { pass: getPass(), fields: { customerId: l.id, amount: Number(amt.value), mode: md.value, ref: md.value === 'cash' ? '' : rf.value.trim(), paidOn: dt.value,
        plan: pl.value, years: pl.value ? Number(yr.value) : 0, bridge: bx.checked, note: nt.value.trim() } })
        .then(function (r) {
          f.ok('Sent for approval.' + (r && r.bridge ? ' The customer has 7 days from now.' : '') + ' The answer shows under "My requests".');
          f.save.hidden = true; l.bridgeUsed = l.bridgeUsed || !!(r && r.bridge); loadRequests();
        })
        .catch(function (e) { if (!sessionGone(e)) f.bad(e.message); f.save.disabled = false; });
    });
    return form;
  }
  var REQ_STATUS = { pending: ['Waiting for approval', 'wait'], approving: ['Being approved', 'wait'], approved: ['Approved', 'ok'], refused: ['Refused', 'bad'] };
  function reqLine(r) {
    return [fDate(r.createdAt), money(r.amount) + ' by ' + (MODE_NAME[r.mode] || r.mode) + (r.ref ? ' ' + r.ref : ''), r.plan ? r.planLabel + ' ' + r.years + ' yr' : 'payment only',
      r.bridge ? '7 days given at once' : ''].filter(Boolean).join(' · ');
  }
  function reqRow(r, decide) {
    var row = el('div', 'sales-lead'), who = el('div', 'sales-who');
    who.appendChild(el('b', null, r.customerName || 'Customer'));
    who.appendChild(el('div', 'small-note', reqLine(r)));
    if (decide) who.appendChild(el('div', 'small-note', 'Sent by ' + r.salesName + (r.paidOn ? ' · paid on ' + fDate(new Date(r.paidOn + 'T00:00:00').getTime()) : '')));
    if (r.note) who.appendChild(el('div', 'small-note', 'Note: ' + r.note));
    if (!decide && r.answer) who.appendChild(el('div', 'small-note', (r.status === 'refused' ? 'Why: ' : 'Answer: ') + r.answer));
    row.appendChild(who);
    var st = el('div', 'sales-status'), s = REQ_STATUS[r.status] || [r.status, 'info'];
    st.appendChild(el('span', 'acct-badge ' + s[1], s[0]));
    if (!decide && r.decidedAt) st.appendChild(el('div', 'small-note', fDate(r.decidedAt) + (r.decidedBy ? ' · ' + String(r.decidedBy).replace(/@.*$/, '') : '')));
    if (decide) {
      var acts = el('div', 'sales-acts'), m = el('p', 'acct-msg');
      var ok = el('button', 'btn btn-primary', 'Approve'); ok.type = 'button';
      var no = el('button', 'btn btn-outline', 'Refuse'); no.type = 'button';
      var go = function (approve) {
        var answer = '';
        if (approve && !window.confirm('Approve ' + money(r.amount) + ' from ' + (r.customerName || 'this customer') + '? Approve only when the money has come in. It records the payment' + (r.plan ? ' and switches on ' + r.planLabel + ' for ' + r.years + ' year' + (r.years > 1 ? 's' : '') : '') + '.')) return;
        if (!approve) { answer = window.prompt('Why is it refused? The sales person sees this.') || ''; if (!answer.trim()) return; }
        ok.disabled = no.disabled = true; m.className = 'acct-msg ok'; m.textContent = 'Saving…';
        call('salesCrmDecide', { pass: getPass(), id: r.id, approve: approve, answer: answer.trim() }).then(loadRequests)
          .catch(function (e) { if (!sessionGone(e)) { m.className = 'acct-msg'; m.textContent = e.message; } ok.disabled = no.disabled = false; });
      };
      ok.addEventListener('click', function () { go(true); }); no.addEventListener('click', function () { go(false); });
      acts.appendChild(ok); acts.appendChild(no); st.appendChild(acts); st.appendChild(m);
    }
    row.appendChild(st);
    return row;
  }
  // one quiet second try: the first call after a while can be slow to start
  function retry(name) { return call(name, { pass: getPass() }).catch(function (e) { if (sessionGone(e)) throw e; return new Promise(function (r) { setTimeout(r, 3000); }).then(function () { return call(name, { pass: getPass() }); }); }); }
  function loadRequests() {
    return retry('salesCrmRequests').then(function (q) {
      var dl = $('crmDecideList');
      $('crmDecideCard').hidden = !q.toDecide.length; dl.textContent = '';
      q.toDecide.forEach(function (r) { dl.appendChild(reqRow(r, true)); });
      var ml = $('crmReqList'), mt = $('crmReqTiles');
      $('crmReqCard').hidden = false; ml.textContent = ''; mt.textContent = '';
      var pick = function (sts) { return q.mine.filter(function (r) { return sts.indexOf(r.status) >= 0; }); };
      var appr = pick(['approved']);
      [[pick(['pending', 'approving']).length, 'waiting'], [appr.length, 'approved'], [money(appr.reduce(function (a, r) { return a + r.amount; }, 0)), 'approved money'], [pick(['refused']).length, 'refused']]
        .forEach(function (x) { var d = el('div', 'sales-tile'); d.appendChild(el('b', null, String(x[0]))); d.appendChild(el('span', null, x[1])); mt.appendChild(d); });
      if (!q.mine.length) ml.appendChild(el('p', 'small-note', 'Nothing sent yet. When a customer pays, open the lead under "Leads to chase" and press "Customer has paid".'));
      q.mine.slice(0, 50).forEach(function (r) { ml.appendChild(reqRow(r, false)); });
    }).catch(function (e) { sessionGone(e); });
  }
  // ---- people and teams: a CRM admin makes teams, distributors, managers, staff and juniors; a manager adds juniors.
  var TEAM = null;
  function personForm(box, cur) {
    box.textContent = '';
    var form = el('div', 'crm-edit');
    var lab = function (t, input) { return formLab(form, t, input); };
    var nm = lab('Name', el('input')); nm.maxLength = 100; nm.value = cur ? cur.name : '';
    var ph = lab('Mobile number (they sign in with it)', el('input')); ph.type = 'tel'; ph.inputMode = 'numeric'; ph.maxLength = 14; ph.value = cur ? String(cur.phone).replace(/\D/g, '').slice(-10) : '';
    var rl = lab('Role', el('select')); TEAM.roles.forEach(function (r) { opt(rl, r, TEAM.roleLabels[r]); }); if (cur) rl.value = cur.role;
    var tm = null;
    if (TEAM.canMakeTeams) {
      tm = lab('Team', el('select')); opt(tm, '', 'Choose the team...'); TEAM.teams.forEach(function (t) { opt(tm, t.id, t.name); }); if (cur) tm.value = cur.teamId;
      var showTm = function () { tm.parentNode.hidden = rl.value === 'distributor'; }; rl.addEventListener('change', showTm); showTm();
    }
    var act = null;
    if (cur) { act = lab('Can sign in', el('select')); opt(act, '1', 'Yes'); opt(act, '0', 'No - switched off'); act.value = cur.active ? '1' : '0'; }
    var f = formSave(form, cur ? 'Save' : 'Add person');
    f.save.addEventListener('click', function () {
      var p = ph.value.replace(/\D/g, '').slice(-10);
      if (nm.value.trim().length < 2) return f.bad('Type the name.');
      if (!/^[6-9]\d{9}$/.test(p)) return f.bad('Type the 10-digit mobile number.');
      f.save.disabled = true; f.ok('Saving…');
      call('salesCrmSavePerson', { pass: getPass(), id: cur ? cur.id : '', fields: { name: nm.value.trim(), phone: p, role: rl.value, teamId: tm ? tm.value : '', active: act ? act.value === '1' : true } })
        .then(function () { box.textContent = ''; loadTeam(); })
        .catch(function (e) { if (!sessionGone(e)) f.bad(e.message); f.save.disabled = false; });
    });
    box.appendChild(form);
  }
  function teamForm(box, cur) {
    box.textContent = '';
    var form = el('div', 'crm-edit');
    var lab = function (t, input) { return formLab(form, t, input); };
    var nm = lab('Team name', el('input')); nm.maxLength = 80; nm.value = cur ? cur.name : '';
    var ar = lab('Area', el('input')); ar.maxLength = 80; ar.value = cur ? cur.area : '';
    var ds = lab('Distributor', el('select')); opt(ds, '', 'None');
    TEAM.people.filter(function (p) { return p.role === 'distributor'; }).forEach(function (p) { opt(ds, p.id, p.name); }); if (cur) ds.value = cur.distributorId;
    var act = null;
    if (cur) { act = lab('Working', el('select')); opt(act, '1', 'Yes'); opt(act, '0', 'No - closed'); act.value = cur.active ? '1' : '0'; }
    var f = formSave(form, cur ? 'Save team' : 'Add team');
    f.save.addEventListener('click', function () {
      if (nm.value.trim().length < 2) return f.bad('Type the team name.');
      f.save.disabled = true; f.ok('Saving…');
      call('salesCrmSaveTeam', { pass: getPass(), id: cur ? cur.id : '', fields: { name: nm.value.trim(), area: ar.value.trim(), distributorId: ds.value, active: act ? act.value === '1' : true } })
        .then(function () { box.textContent = ''; loadTeam(); })
        .catch(function (e) { if (!sessionGone(e)) f.bad(e.message); f.save.disabled = false; });
    });
    box.appendChild(form);
  }
  function rowWithChange(list, title, sub, dim, onChange) {
    var row = el('div', 'sales-lead' + (dim ? ' sales-void' : '')), who = el('div', 'sales-who');
    who.appendChild(el('b', null, title)); who.appendChild(el('div', 'small-note', sub));
    row.appendChild(who);
    var st = el('div', 'sales-status'), fb = el('div');
    if (onChange) {
      var acts = el('div', 'sales-acts'), b = el('button', 'btn btn-outline', 'Change'); b.type = 'button';
      b.addEventListener('click', function () { if (fb.firstChild) fb.textContent = ''; else onChange(fb); });
      acts.appendChild(b); st.appendChild(acts);
    }
    row.appendChild(st); list.appendChild(row); list.appendChild(fb);
  }
  function drawTeam() {
    var t = TEAM;
    $('salesTeam').textContent = t.me.roleLabel + (t.me.teamName ? ', ' + t.me.teamName : '');
    $('crmPeopleCard').hidden = !t.canManage;
    if (!t.canManage) return;
    $('crmPeopleNote').textContent = t.canMakeTeams
      ? 'As CRM admin you add teams, distributors, managers, staff and junior staff. Switch a person off when they leave: their sign-in stops at once.'
      : 'As manager you add junior staff to your team. Switch a junior off when they leave: their sign-in stops at once.';
    $('crmAddTeamBtn').hidden = !t.canMakeTeams;
    var tl = $('crmTeamsList'); tl.textContent = '';
    if (t.canMakeTeams) {
      tl.appendChild(el('p', 'acct-label', 'Teams'));
      if (!t.teams.length) tl.appendChild(el('p', 'small-note', 'No teams yet. Add the first team, then its people.'));
      t.teams.forEach(function (x) {
        var dist = t.people.filter(function (p) { return p.id === x.distributorId; })[0];
        var n = t.people.filter(function (p) { return p.teamId === x.id && p.active; }).length;
        rowWithChange(tl, x.name, [x.area, dist ? 'distributor ' + dist.name : '', n + (n === 1 ? ' person' : ' people'), x.active ? '' : 'closed'].filter(Boolean).join(' · '), !x.active, function (fb) { teamForm(fb, x); });
      });
      tl.appendChild(el('p', 'acct-label', 'People'));
    }
    var pl = $('crmPeopleList'); pl.textContent = '';
    var people = t.people.filter(function (p) { return p.id !== t.me.id; });
    if (!people.length) pl.appendChild(el('p', 'small-note', 'Nobody added yet.'));
    people.forEach(function (p) {
      var may = p.role !== 'admin' && t.roles.indexOf(p.role) >= 0;
      rowWithChange(pl, p.name, [p.roleLabel, p.teamName, fPhone(p.phone), p.active ? '' : 'switched off'].filter(Boolean).join(' · '), !p.active, may ? function (fb) { personForm(fb, p); } : null);
    });
  }
  function loadTeam() {
    return retry('salesCrmTeam').then(function (t) { TEAM = t; drawTeam(); }).catch(function (e) { sessionGone(e); });
  }
  function render(a) {
    msg('');
    $('salesSignIn').hidden = true; $('salesView').hidden = false;
    $('salesWho').textContent = a.me.name;
    $('salesTeam').textContent = [a.me.role === 'distributor' ? 'Distributor' : a.me.team ? (a.me.role === 'leader' ? 'Team leader, ' : 'Team ') + a.me.team : 'Jurisbooks sales', a.me.area].filter(Boolean).join(' · ');
    $('salesCodeText').textContent = a.me.code;
    $('salesLink').textContent = a.me.link;
    var shareText = 'Try Jurisbooks - GST billing and accounting, free for 7 days: ' + a.me.link;
    $('salesShare').href = 'https://wa.me/?text=' + encodeURIComponent(shareText);
    $('salesCopy').onclick = function () {
      var done = function () { $('salesCopy').textContent = 'Copied'; setTimeout(function () { $('salesCopy').textContent = 'Copy link'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(a.me.link).then(done, function () { window.prompt('Copy your link:', a.me.link); });
      else window.prompt('Copy your link:', a.me.link);
    };
    drawCrm(a.crm);
    tiles($('salesTiles'), a.totals, a.shows.amounts);
    leadList($('salesLeads'), a.leads, a.shows, 'Nobody has joined with your link yet. Share it - each person who signs up by it appears here.');
    commission(a.commission);
    loadLinks();
    loadRequests(); loadTeam();
    var t = a.team;
    $('salesTeamCard').hidden = !t; $('salesTeamLeadsCard').hidden = !t;
    if (t) {
      $('salesTeamName').textContent = (t.teams > 1 ? 'Your teams: ' : 'Your team: ') + t.name;
      tiles($('salesTeamTiles'), t.totals, a.shows.amounts);
      var body = $('salesPeople'); body.textContent = '';
      t.people.forEach(function (p) {
        var tr = el('tr');
        var td = el('td'); td.appendChild(el('b', null, p.name + (p.you ? ' (you)' : '')));
        var sub = [p.team, p.role === 'leader' ? 'team leader' : '', p.phone ? fPhone(p.phone) : '', p.active ? '' : 'left'].filter(Boolean).join(' · ');
        if (sub) td.appendChild(el('div', 'small-note', sub));
        tr.appendChild(td);
        tr.appendChild(el('td', 'num', String(p.joined))); tr.appendChild(el('td', 'num', String(p.paid)));
        if (a.shows.amounts) tr.appendChild(el('td', 'num', money(p.amount)));
        body.appendChild(tr);
      });
      $('salesPeopleAmt').hidden = !a.shows.amounts;
      leadList($('salesTeamLeads'), t.leads, a.shows, 'Nobody has joined through this team yet.');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('salesSignIn')) return;
    $('salesSend').addEventListener('click', sendCode);
    $('salesVerify').addEventListener('click', verifyCode);
    $('salesPhone').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendCode(); });
    $('salesCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyCode(); });
    $('salesChange').addEventListener('click', function (e) { e.preventDefault(); showSignIn(); });
    $('salesSignOut').addEventListener('click', function () { setPass(''); showSignIn(); });
    // Refresh starts clean: the customer details typed for a payment link or a new lead are cleared
    $('salesRefresh').addEventListener('click', function () {
      ['slName', 'slPhone', 'crmName', 'crmBiz', 'crmPhone', 'crmCity', 'crmCb'].forEach(function (id) { if ($(id)) $(id).value = ''; });
      ['slMsg', 'crmAddMsg'].forEach(function (id) { if ($(id)) { $(id).textContent = ''; $(id).className = 'acct-msg'; } });
      if ($('slResult')) $('slResult').hidden = true;
      if ($('crmAdd')) $('crmAdd').hidden = true;
      if (LINKS) linkHint(true);          // the price goes back to the plan's normal price
      load();
    });
    $('crmAddBtn').addEventListener('click', function () { $('crmAdd').hidden = !$('crmAdd').hidden; });
    $('crmAddSave').addEventListener('click', addLead);
    $('crmOpenOnly').addEventListener('change', function () { drawCrm(CRM); });
    $('crmAddPersonBtn').addEventListener('click', function () { var b = $('crmPersonForm'); if (b.firstChild) b.textContent = ''; else if (TEAM) personForm(b, null); });
    $('crmAddTeamBtn').addEventListener('click', function () { var b = $('crmPersonForm'); if (b.firstChild) b.textContent = ''; else if (TEAM) teamForm(b, null); });
    load();
  });
})();

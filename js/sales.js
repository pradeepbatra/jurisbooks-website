/* Sales team page (sales.html): Jurisbooks' own sales people sign in with their mobile number and a one-time
   code, and see their referral link, the customers they brought and - a team leader - their team, and the
   leads handed to them to chase (stage, call-back, notes). Nothing else of the Back Office is shown here.
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
  function linkHint(setPrice) {
    var n = linkNormal(), max = LINKS.maxDiscount || 0, floor = Math.ceil(n * (100 - max) / 100);
    if (setPrice) $('slAmount').value = n || '';
    var a = Math.round(Number($('slAmount').value) || 0), off = n - a;
    var t = 'Normal price ' + money(n) + (LINKS.gstRate ? ' + ' + LINKS.gstRate + '% GST' : '') + '. ' + (max > 0 ? 'Lowest you can give: ' + money(floor) + ' (' + max + '% off).' : 'A lower price is not allowed.');
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
    load();
  });
})();

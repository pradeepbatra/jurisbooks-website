/* Sales team page (sales.html): Jurisbooks' own sales people sign in with their mobile number and a one-time
   code, and see their referral link, the customers they brought and - a team leader - their team.
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
    call('salesPortal', { pass: p }).then(render).catch(function (e) {
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
  function render(a) {
    msg('');
    $('salesSignIn').hidden = true; $('salesView').hidden = false;
    $('salesWho').textContent = a.me.name;
    $('salesTeam').textContent = [a.me.team ? (a.me.role === 'leader' ? 'Team leader, ' : 'Team ') + a.me.team : 'Jurisbooks sales', a.me.area].filter(Boolean).join(' · ');
    $('salesCodeText').textContent = a.me.code;
    $('salesLink').textContent = a.me.link;
    var shareText = 'Try Jurisbooks - GST billing and accounting, free for 15 days: ' + a.me.link;
    $('salesShare').href = 'https://wa.me/?text=' + encodeURIComponent(shareText);
    $('salesCopy').onclick = function () {
      var done = function () { $('salesCopy').textContent = 'Copied'; setTimeout(function () { $('salesCopy').textContent = 'Copy link'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(a.me.link).then(done, function () { window.prompt('Copy your link:', a.me.link); });
      else window.prompt('Copy your link:', a.me.link);
    };
    tiles($('salesTiles'), a.totals, a.shows.amounts);
    leadList($('salesLeads'), a.leads, a.shows, 'Nobody has joined with your link yet. Share it - each person who signs up by it appears here.');
    var t = a.team;
    $('salesTeamCard').hidden = !t; $('salesTeamLeadsCard').hidden = !t;
    if (t) {
      $('salesTeamName').textContent = 'Your team: ' + t.name;
      tiles($('salesTeamTiles'), t.totals, a.shows.amounts);
      var body = $('salesPeople'); body.textContent = '';
      t.people.forEach(function (p) {
        var tr = el('tr');
        var td = el('td'); td.appendChild(el('b', null, p.name + (p.you ? ' (you)' : '')));
        var sub = [p.role === 'leader' ? 'team leader' : '', p.phone ? fPhone(p.phone) : '', p.active ? '' : 'left'].filter(Boolean).join(' · ');
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
    $('salesRefresh').addEventListener('click', load);
    load();
  });
})();

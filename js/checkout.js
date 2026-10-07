/* Checkout: choose plan + years -> mobile number (code) -> the cloud's price -> pay (Cashfree / Razorpay) ->
   back here with ?order=... -> confirmed -> (new customers) business details -> download.
   The cloud decides the price and switches the plan on only after asking the payment company (lib/shop.js). */
(function () {
  'use strict';
  var S = window.JBShop;
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var K_PASS = 'jb_buy_pass', K_ACCT = 'jb_account_pass', K_NAME = 'jb_buy_name', K_ORDER = 'jb_buy_order';
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k) || ''; if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) { return ''; } }
  function msg(id, text, ok) { var el = $(id); if (!el) return; el.textContent = text || ''; el.classList.toggle('ok', !!ok); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var state = { pricing: S.DEFAULT, plan: qs.get('plan') || 'premium', years: Math.min(5, Math.max(1, Number(qs.get('years')) || 1)), seats: Math.min(20, Math.max(1, Number(qs.get('seats')) || 1)), pass: '', account: null, quote: null, busy: false };
  if (!/^(basic|premium|business|android|androidbasic|seats|messages)$/.test(state.plan)) state.plan = 'premium';
  var cameForMobile = state.plan === 'android' || state.plan === 'androidbasic';
  var isSeats = function () { return state.plan === 'seats'; };
  // Customer messages: invoices and receipts to the customer's own customers by SMS (an add-on).
  var isMsg = function () { return state.plan === 'messages'; };
  var msgPrice = function () { return state.pricing.msgPrice || 500; };
  // before signing in the plan is not known: the price shown is for the plan named in the link (?for=), else Basic's;
  // after step 2 the cloud works it out for the customer's own plan.
  var seatFor = (function () { try { var f = new URLSearchParams(location.search).get('for'); return /^(basic|premium|business)$/.test(f || '') ? f : 'basic'; } catch (e) { return 'basic'; } })();
  var seatPrice = function () { return S.seatPriceOf(state.pricing, seatFor); };
  function whatLabel() { return isMsg() ? 'Customer messages' : isSeats() ? state.seats + ' extra seat' + (state.seats > 1 ? 's' : '') : ((S.planOf(state.pricing, state.plan) || {}).label || ''); }

  // ---------- step 1: plan + years ----------
  function renderPlans() {
    var box = $('coPlans'); box.innerHTML = '';
    state.pricing.plans.forEach(function (p) {
      // The mobile only plan is offered here only to someone who came for it (the app's own "Buy plan" button),
      // until the app is on Google Play.
      if (p.phoneOnly && !cameForMobile) return;
      var lp = S.listPrice(state.pricing, p.plan, 1);
      var b = el('button', 'co-plan' + (p.plan === state.plan ? ' is-on' : ''));
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', p.plan === state.plan ? 'true' : 'false');
      b.appendChild(el('span', 'co-plan-name', p.label.replace('Online ', '')));
      var yearly = p.renewal === p.price;   // the same price every year
      b.appendChild(el('span', 'co-plan-price', S.rs(lp.total) + (yearly ? ' a year' : ' first year')));
      b.appendChild(el('span', 'co-plan-renew', (yearly ? 'every year' : 'then ' + S.rs(p.renewal) + '/year') + (p.phoneOnly ? ' · phone app only' : '')));
      if (lp.discount) b.appendChild(el('span', 'co-plan-offer', (lp.offer.badge || S.offerHeadline(lp.offer))));
      b.addEventListener('click', function () { state.plan = p.plan; renderPlans(); refresh(); });
      box.appendChild(b);
    });
    var sb = el('button', 'co-plan' + (isSeats() ? ' is-on' : ''));
    sb.type = 'button'; sb.setAttribute('role', 'radio'); sb.setAttribute('aria-checked', isSeats() ? 'true' : 'false');
    sb.appendChild(el('span', 'co-plan-name', 'Extra seats'));
    sb.appendChild(el('span', 'co-plan-price', S.rs(seatPrice()) + ' per seat'));
    sb.appendChild(el('span', 'co-plan-renew', 'per year · for a paid plan'));
    sb.addEventListener('click', function () { state.plan = 'seats'; renderPlans(); refresh(); });
    box.appendChild(sb);
    var mb = el('button', 'co-plan' + (isMsg() ? ' is-on' : ''));
    mb.type = 'button'; mb.setAttribute('role', 'radio'); mb.setAttribute('aria-checked', isMsg() ? 'true' : 'false');
    mb.appendChild(el('span', 'co-plan-name', 'Customer messages'));
    mb.appendChild(el('span', 'co-plan-price', S.rs(msgPrice()) + ' per year'));
    mb.appendChild(el('span', 'co-plan-renew', 'SMS · for a paid plan'));
    mb.addEventListener('click', function () { state.plan = 'messages'; renderPlans(); refresh(); });
    box.appendChild(mb);
    $('coMsgBox').hidden = !isMsg();
    $('coSeatsBox').hidden = !isSeats();
    var sc = $('coSeats');
    if (!sc.options.length) {
      [1, 2, 3, 4, 5, 6, 8, 10, 15, 20].forEach(function (n) { var o = el('option', null, n + ' seat' + (n > 1 ? 's' : '')); o.value = n; sc.appendChild(o); });
      sc.addEventListener('change', function () { state.seats = Number(sc.value); refresh(); });
    }
    sc.value = String(state.seats);
    var y = $('coYears');
    if (!y.options.length) {
      state.pricing.years.forEach(function (n) { var o = el('option', null, n + ' year' + (n > 1 ? 's' : '')); o.value = n; y.appendChild(o); });
      y.addEventListener('change', function () { state.years = Number(y.value); refresh(); });
    }
    y.value = String(state.years);
  }

  // ---------- summary ----------
  function renderSummary() {
    var lines = $('coLines'); lines.innerHTML = '';
    var q = state.quote, label = whatLabel();
    $('coSumPlan').textContent = label + ' · ' + state.years + ' year' + (state.years > 1 ? 's' : '');
    var rows, total, note = '';
    if (q && q.ok) {
      rows = q.lines.map(function (l) { return [l.text.replace(/Rs /g, '₹'), l.amount]; });
      total = q.total;
      if (q.kind === 'messages') note = (q.renewal ? 'Added after your current end date. Customer messages then run until ' : 'Customer messages work from the day you pay until ') + S.fDate(q.expiresAt) + ', up to ' + (q.yearLimit || 2000).toLocaleString('en-IN') + ' messages a year' + (q.beyondPlan && q.planEndsAt ? ' — while your plan runs (it ends ' + S.fDate(q.planEndsAt) + ').' : '.');
      else if (q.kind === 'seats') note = 'The seats work from the day you pay until ' + S.fDate(q.expiresAt) + (q.beyondPlan && q.planEndsAt ? ' — while your plan runs (it ends ' + S.fDate(q.planEndsAt) + '; renew it to keep using the seats after that).' : '.');
      else if (q.kind === 'renewal') note = q.currentEndsAt ? 'Added after your current end date (' + S.fDate(q.currentEndsAt) + '). New end date: ' + S.fDate(q.expiresAt) + '.' : 'Your plan runs until ' + S.fDate(q.expiresAt) + '.';
      else if (q.kind === 'upgrade') note = 'Your plan changes to ' + q.label + ' today and runs until ' + S.fDate(q.expiresAt) + '.' +
        (q.endsEarlier ? ' ⚠ That is before your current plan would have ended (' + S.fDate(q.currentEndsAt) + ').' : '');
      else note = 'Your plan runs from the day you pay until ' + S.fDate(q.expiresAt) + '.';
    } else if (isMsg()) {
      rows = [['Customer messages: ' + state.years + ' year' + (state.years > 1 ? 's' : '') + ' × ' + S.rs(msgPrice()), state.years * msgPrice()]];
      total = state.years * msgPrice();
      note = q && !q.ok ? q.reason : 'Customer messages are for a paid plan you already have. Your account is checked after step 2.';
    } else if (isSeats()) {
      rows = [[state.seats + ' seat' + (state.seats > 1 ? 's' : '') + ' × ' + state.years + ' year' + (state.years > 1 ? 's' : '') + ' × ' + S.rs(seatPrice()), state.seats * state.years * seatPrice()]];
      total = state.seats * state.years * seatPrice();
      note = q && !q.ok ? q.reason : 'Extra seats are for a paid plan you already have. Your account is checked after step 2.';
    } else {
      var lp = S.listPrice(state.pricing, state.plan, state.years);
      var p = S.planOf(state.pricing, state.plan);
      if (p.renewal === p.price) rows = [[label + ': ' + state.years + ' year' + (state.years > 1 ? 's' : '') + ' × ' + S.rs(p.price), state.years * p.price]];
      else {
        rows = [[label + ': first year', p.price]];
        if (state.years > 1) rows.push([(state.years - 1) + ' more year' + (state.years > 2 ? 's' : '') + ' × ' + S.rs(p.renewal), (state.years - 1) * p.renewal]);
      }
      if (lp.discount) rows.push(['Offer: ' + lp.offer.title, -lp.discount]);
      total = lp.total;
      note = q && !q.ok ? q.reason : 'Price for a new plan. Renewals and upgrades are worked out for your account after step 2.';
    }
    rows.forEach(function (r) {
      var tr = el('tr'); tr.appendChild(el('td', null, r[0]));
      var td = el('td', 'num' + (r[1] < 0 ? ' neg' : ''), (r[1] < 0 ? '− ' : '') + S.rs(Math.abs(r[1]))); tr.appendChild(td); lines.appendChild(tr);
    });
    $('coTotal').textContent = S.rs(total);
    var sn = $('coSumNote');
    sn.textContent = note;
    sn.classList.toggle('co-warn', !!(q && (!q.ok || q.endsEarlier)));
    if (q && q.ok && q.endsEarlier && q.suggestYears && q.suggestYears !== state.years) {
      var fix = el('button', 'btn btn-outline co-fix', 'Choose ' + q.suggestYears + ' years instead');
      fix.type = 'button';
      fix.addEventListener('click', function () { state.years = q.suggestYears; $('coYears').value = String(state.years); refresh(); });
      sn.appendChild(document.createElement('br')); sn.appendChild(fix);
    }
  }

  // ---------- step 2: who ----------
  function showWho() {
    var a = state.account;
    var known = !!(state.pass && a);
    $('coWhoKnown').hidden = !known; $('coWhoForm').hidden = known;
    if (known) {
      var who = a.phone ? '+91 ' + a.phone.replace(/^\+91/, '') : (a.email || '');
      $('coWhoText').textContent = a.exists
        ? 'Paying for ' + who + ' — your plan now: ' + a.label + (a.until ? (a.active ? ' until ' : ', ended ') + S.fDate(a.until) : '') + '.'
        : 'Paying for ' + who + ' — a new account. It is set up the moment you pay.';
    }
    $('coPayLocked').hidden = known; $('coPayBox').hidden = !known;
    var n = ss(K_NAME); if (n && !$('coName').value) $('coName').value = n;
  }
  function usePass(p) {
    state.pass = p;
    return S.call('buyWho', { pass: p }).then(function (r) { state.account = r.account; showWho(); return refresh(); })
      .catch(function () { state.pass = ''; state.account = null; ss(K_PASS, null); showWho(); });
  }
  function phoneVal() { return $('coPhone').value.replace(/\D/g, '').slice(-10); }
  $('coSend').addEventListener('click', function () {
    var name = $('coName').value.trim();
    if (name.length < 2) return msg('coWhoMsg', 'Please enter your name.');
    if (phoneVal().length !== 10) return msg('coWhoMsg', 'Enter your 10-digit mobile number.');
    $('coSend').disabled = true; msg('coWhoMsg', '');
    S.call('portalSendOtp', { phone: phoneVal() }).then(function (r) {
      $('coCodeBox').hidden = false; $('coCodeFor').textContent = '+91 ' + phoneVal(); $('coCode').focus();
      msg('coWhoMsg', r && r.devCode ? 'Test mode: the code is ' + r.devCode : 'Code sent by SMS.', true);
    }).catch(function (e) { msg('coWhoMsg', e.message); }).then(function () { $('coSend').disabled = false; });
  });
  $('coVerify').addEventListener('click', function () {
    var code = $('coCode').value.replace(/\D/g, '');
    if (code.length !== 6) return msg('coWhoMsg', 'Enter the 6-digit code.');
    $('coVerify').disabled = true;
    S.call('buyVerifyOtp', { phone: phoneVal(), code: code, name: $('coName').value.trim() }).then(function (r) {
      ss(K_PASS, r.pass); ss(K_NAME, $('coName').value.trim()); msg('coWhoMsg', '');
      state.pass = r.pass; state.account = r.account; showWho(); return refresh();
    }).catch(function (e) { msg('coWhoMsg', e.message); }).then(function () { $('coVerify').disabled = false; });
  });
  $('coCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('coVerify').click(); });
  $('coWhoChange').addEventListener('click', function (e) { e.preventDefault(); ss(K_PASS, null); state.pass = ''; state.account = null; state.quote = null; showWho(); renderSummary(); updatePay(); });

  // ---------- step 3: price + pay ----------
  var seq = 0;
  function refresh() {
    renderSummary(); updatePay();
    if (!state.pass) return Promise.resolve();
    var my = ++seq;
    return S.call('buyQuote', { pass: state.pass, plan: state.plan, years: state.years, seats: isSeats() ? state.seats : undefined }).then(function (r) {
      if (my !== seq) return;
      state.quote = r.quote; state.account = r.account; showWho(); renderSummary(); updatePay();
    }).catch(function (e) {
      if (e.code === 'unauthenticated' || /sign in again/i.test(e.message)) { ss(K_PASS, null); state.pass = ''; state.account = null; showWho(); }
      msg('coPayMsg', e.message);
    });
  }
  function updatePay() {
    var q = state.quote, btn = $('coPay');
    var live = state.pricing.payments && state.pricing.payments.provider !== 'none';
    var match = q && q.ok && (isMsg() ? q.kind === 'messages' : isSeats() ? q.kind === 'seats' && q.seats === state.seats : q.plan === state.plan && q.kind !== 'seats' && q.kind !== 'messages');
    var ok = !!(state.pass && match && q.years === state.years && live);
    btn.disabled = !ok || !$('coAgree').checked || state.busy;
    btn.textContent = q && q.ok ? 'Pay ' + S.rs(q.total) : 'Pay';
    var what = $('coWhat');
    if (q && q.ok) what.textContent = { 'new': 'New plan: ', renewal: 'Renewal: ', upgrade: 'Upgrade: ', seats: 'Extra seats: ', messages: 'Add-on: ' }[q.kind] + q.label + ' for ' + q.years + ' year' + (q.years > 1 ? 's' : '') + ', valid until ' + S.fDate(q.expiresAt) + '.';
    else what.textContent = q ? q.reason : '';
    var OFF = 'Online payment is being switched on. Meanwhile, please contact us to buy — we activate plans the same day.';
    if (!live && state.pricingLoaded) msg('coPayMsg', OFF);
    else if ($('coPayMsg').textContent === OFF) msg('coPayMsg', '');
  }
  $('coAgree').addEventListener('change', updatePay);
  $('coPay').addEventListener('click', function () {
    if (state.busy) return;
    state.busy = true; updatePay(); msg('coPayMsg', 'Opening the payment page…', true);
    S.call('buyCreateOrder', { pass: state.pass, plan: state.plan, years: state.years, seats: isSeats() ? state.seats : undefined, name: ss(K_NAME) || $('coName').value.trim(), termsVersion: window.JB_TERMS_VERSION || '2026-10-04' })
      .then(function (r) { ss(K_ORDER, r.orderId); return openCheckout(r); })
      .catch(function (e) { state.busy = false; updatePay(); msg('coPayMsg', e.message); });
  });

  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('The payment page could not be loaded. Check your internet connection.')); }; document.head.appendChild(s); });
  }
  function goResult(orderId) { location.href = 'checkout.html?order=' + encodeURIComponent(orderId); }
  function openCheckout(r) {
    var c = r.checkout;
    if (c.provider === 'cashfree') {
      return loadScript('https://sdk.cashfree.com/js/v3/cashfree.js').then(function () {
        window.Cashfree({ mode: c.mode }).checkout({ paymentSessionId: c.paymentSessionId, redirectTarget: '_self' });
      });
    }
    if (c.provider === 'razorpay') {
      return loadScript('https://checkout.razorpay.com/v1/checkout.js').then(function () {
        var rz = new window.Razorpay({ key: c.keyId, amount: c.amount, currency: c.currency, order_id: c.orderId, name: c.name, description: c.description, prefill: c.prefill,
          theme: { color: '#16213A' }, handler: function () { goResult(r.orderId); },
          modal: { ondismiss: function () { state.busy = false; updatePay(); msg('coPayMsg', 'Payment window closed. You have not been charged.'); } } });
        rz.open();
      });
    }
    if (c.provider === 'fake') {
      $('coFakeAmt').textContent = S.rs(r.amount);
      $('coFake').hidden = false;
      var done = function (result) { S.call('devFakePay', { orderId: r.orderId, result: result }).then(function () { goResult(r.orderId); }); };
      $('coFakePay').onclick = function () { done('paid'); };
      $('coFakeFail').onclick = function () { done('failed'); };
      return Promise.resolve();
    }
    throw new Error('Unknown payment service.');
  }

  // ---------- after paying ----------
  function resultView(orderId) {
    $('coSteps').hidden = true; $('coSummary').hidden = true; $('coResult').hidden = false;
    $('coTitle').textContent = 'Your payment';
    var body = $('coResultBody'); var tries = 0;
    function show(html) { body.innerHTML = html; }
    function poll() {
      S.call('buyConfirm', { orderId: orderId }).then(function (v) {
        if (v.status === 'pending' && tries++ < 40) {
          show('<div class="co-state wait"><span class="co-spin" aria-hidden="true"></span><h2>Confirming your payment…</h2><p class="small-note">This usually takes a few seconds. Please keep this page open.</p></div>');
          return setTimeout(poll, 3000);
        }
        if (v.status === 'pending') return show('<div class="co-state wait"><h2>Still waiting for the payment company</h2><p>If money was taken, your plan switches on by itself as soon as they confirm it. You can close this page. Order <b>' + orderId + '</b>.</p></div>');
        if (v.status === 'failed') return show('<div class="co-state bad"><h2>The payment did not go through</h2><p>No plan was changed. If money was deducted, it is returned by your bank automatically, usually within a few days.</p><a class="btn btn-primary" href="checkout.html?plan=' + (v.kind === 'seats' ? 'seats&seats=' + (v.seats || 1) : (v.plan || '')) + '&years=' + (v.years || 1) + '">Try again</a></div>');
        if (v.status === 'problem') return show('<div class="co-state bad"><h2>We received your payment and are checking it</h2><p>Something about this payment needs a quick look from our side. We will call you shortly &mdash; or reach us on +91 92204 99490. Order <b>' + orderId + '</b>.</p></div>');
        ss(K_ORDER, null);
        paid(v, orderId);
      }).catch(function (e) { show('<div class="co-state bad"><h2>Could not check the payment</h2><p>' + e.message + '</p><button class="btn btn-outline" type="button" onclick="location.reload()">Check again</button></div>'); });
    }
    poll();
  }
  function paid(v, orderId) {
    var until = v.expiresAt ? S.fDate(v.expiresAt) : '';
    var head = '<div class="co-state good"><div class="co-tick" aria-hidden="true">✓</div><h2>Payment received — thank you!</h2>' +
      '<p><b>' + (v.label || 'Your plan') + '</b> ' + (v.kind === 'seats' && v.seats > 1 ? 'are' : 'is') + ' active' + (until ? ' until <b>' + until + '</b>' : '') + ' on ' + v.phone + '.</p></div>';
    var body = $('coResultBody');
    if (v.needsDetails) {
      body.innerHTML = head;
      var f = $('coDetails'); f.hidden = false;
      $('dName').value = ss(K_NAME);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        $('dSave').disabled = true; msg('dMsg', '');
        S.call('buySaveDetails', { orderId: orderId, fields: { name: $('dName').value, business: $('dBusiness').value, email: $('dEmail').value, city: $('dCity').value, state: $('dState').value, gstin: $('dGstin').value } })
          .then(function () { f.hidden = true; body.innerHTML = head + nextSteps(v, true); })
          .catch(function (er) { $('dSave').disabled = false; msg('dMsg', er.message); });
      });
      return;
    }
    body.innerHTML = head + (v.kind === 'messages'
      ? '<div class="co-next"><p><b>To start:</b> open Jurisbooks, go to <b>Settings</b>, find <b>Customer messages</b>, tick <b>Send automatically when I save</b> and press Save. From then on your customers get an SMS for each invoice and payment receipt, with a link to the PDF. Your receipt is on My Account.</p><a class="btn btn-primary" href="account.html">My Account &amp; receipt</a></div>'
      : v.kind === 'seats'
      ? '<div class="co-next"><p>Jurisbooks picks up the extra seats by itself within a few minutes: that many more computers (you or your staff) can now work at the same time. Your receipt is on My Account.</p><a class="btn btn-primary" href="account.html">My Account &amp; receipt</a></div>'
      : nextSteps(v, v.newAccount));
  }
  function nextSteps(v, isNew) {
    return isNew
      ? '<div class="co-next"><h3>Next: install Jurisbooks</h3><ol><li>Download and install Jurisbooks for Windows.</li><li>Open it and sign in with <b>' + v.phone + '</b> (a code is sent by SMS).</li><li>Choose a PIN and create your company &mdash; your paid plan is already on your account.</li></ol>' +
        '<a class="btn btn-primary" href="download.html">Download Jurisbooks</a> <a class="btn btn-outline" href="account.html">My Account &amp; receipt</a></div>'
      : '<div class="co-next"><p>Jurisbooks picks up the new plan by itself within a few minutes (or straight away when you next open it). Your receipt is on My Account.</p>' +
        '<a class="btn btn-primary" href="account.html">My Account &amp; receipt</a></div>';
  }

  // ---------- start ----------
  var orderId = qs.get('order') || qs.get('order_id');
  if (orderId) { resultView(orderId); return; }
  renderPlans(); renderSummary(); showWho(); updatePay();
  S.getPricing().then(function (pr) { state.pricing = pr; state.pricingLoaded = true; renderPlans(); renderSummary(); updatePay(); });
  // Opened from "Buy plan" inside the program or the phone app: the sign-in pass for that account comes after
  // the '#' (a browser never sends that part to any server). It is taken once and removed from the address.
  var hp = /[#&]pass=([A-Za-z0-9_.-]+)/.exec(location.hash || '');
  if (hp) {
    ss(K_PASS, hp[1]);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
  }
  var p = ss(K_PASS) || ss(K_ACCT);
  if (p) usePass(p);
})();

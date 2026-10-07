/* Pricing page: prices and offers from the cloud, the "Buy for N years" dropdown, and the Buy buttons.
   While online payment is not switched on, Buy still goes to the enquiry form (as before). */
(function () {
  'use strict';
  var S = window.JBShop;
  var cards = [].slice.call(document.querySelectorAll('.plan-card[data-plan]'));

  function renderOffers(pr) {
    var strip = document.getElementById('offerStrip');
    if (!strip) return;
    var offers = pr.offers || [];
    strip.innerHTML = '';
    strip.hidden = !offers.length;
    offers.forEach(function (o) {
      var c = document.createElement('div'); c.className = 'offer-card';
      var plans = o.plans.length >= 3 ? 'all plans' : o.plans.map(function (p) { return (S.planOf(pr, p) || {}).label || p; }).join(', ').replace(/Online /g, '');
      var kinds = o.appliesTo.map(function (k) { return { 'new': 'new plans', renewal: 'renewals', upgrade: 'upgrades' }[k]; }).join(' & ');
      c.innerHTML = (o.badge ? '<span class="tag"></span>' : '') + '<div class="big"></div><div class="ttl"></div><p class="txt"></p>' + (o.to ? '<span class="ends"></span>' : '');
      if (o.badge) c.querySelector('.tag').textContent = o.badge;
      c.querySelector('.big').textContent = S.offerHeadline(o);
      c.querySelector('.ttl').textContent = o.title;
      c.querySelector('.txt').textContent = o.note || ('On ' + plans + ' · ' + kinds + (o.minYears > 1 ? ' · when you buy ' + o.minYears + ' years or more' : '') + '.');
      if (o.to) c.querySelector('.ends').textContent = 'Offer ends ' + S.fDate(o.to - 1);
      strip.appendChild(c);
    });
  }

  function renderCard(pr, card) {
    var plan = card.getAttribute('data-plan');
    var sel = card.querySelector('.plan-years select');
    var years = Number(sel.value) || 1;
    var lp = S.listPrice(pr, plan, years);
    if (!lp) return;
    var was = card.querySelector('.plan-price .was');
    card.querySelector('.plan-price .amount').textContent = S.rs(lp.total);
    card.querySelector('.plan-price .period').textContent = 'for ' + years + ' year' + (years > 1 ? 's' : '');
    was.hidden = !lp.discount; was.textContent = lp.discount ? S.rs(lp.gross) : '';
    var save = card.querySelector('.plan-save');
    save.hidden = !lp.discount;
    save.textContent = lp.discount ? 'You save ' + S.rs(lp.discount) + [lp.offer ? lp.offer.title : '', lp.yearDiscount ? 'extra ' + lp.yearPercent + '% on added years' : ''].filter(Boolean).map(function (x) { return ' · ' + x; }).join('') : '';
    // the "Buy for" list says what each number of years saves
    [].slice.call(sel.options).forEach(function (o) { var y = Number(o.value), pct = S.yearPercent(pr, y); o.textContent = y + ' year' + (y > 1 ? 's' : '') + (pct ? ' — extra ' + pct + '% off' : ''); });
    // under the price: what it works out to a year when several years are bought (and a different later-years price, if one is ever set)
    var renew = card.querySelector('.plan-renew');
    renew.textContent = [years > 1 ? 'Works out to ' + S.rs(lp.perYear) + ' a year.' : '', lp.renewal !== lp.price ? 'Then ' + S.rs(lp.renewal) + ' a year.' : ''].filter(Boolean).join(' ');
    renew.hidden = !renew.textContent;
    // the ribbon: the offer on the years chosen if there is one, otherwise the best offer this plan can get
    var ribbon = card.querySelector('.plan-ribbon');
    var top = lp.offer, topYears = years;
    if (!top) (pr.offers || []).forEach(function (o) {
      if (o.plans.indexOf(plan) < 0 || o.appliesTo.indexOf('new') < 0) return;
      var y = Math.max(o.minYears || 1, 1), l2 = S.listPrice(pr, plan, y);
      if (l2 && l2.offer && l2.offer.id === o.id && (!top || l2.discount > S.listPrice(pr, plan, topYears).discount)) { top = o; topYears = y; }
    });
    // no offer to announce: say what buying more years saves, if anything
    var maxPct = 0; (pr.years || [1, 2, 3, 4, 5]).forEach(function (y) { maxPct = Math.max(maxPct, S.yearPercent(pr, y)); });
    ribbon.hidden = !top && !maxPct;
    ribbon.textContent = top ? (top.minYears > 1 && !lp.offer ? S.offerHeadline(top) + ' on ' + top.minYears + '+ years' : (top.badge || S.offerHeadline(top))) : maxPct ? 'Up to ' + maxPct + '% extra off on more years' : '';
    card.classList.toggle('has-offer', !!lp.offer);
    var buy = card.querySelector('[data-buy]');
    var label = (S.planOf(pr, plan) || {}).label || '';
    if (pr.payments && pr.payments.provider !== 'none') {
      buy.href = 'checkout.html?plan=' + plan + '&years=' + years;
      buy.textContent = 'Buy ' + label.replace('Online ', '') + ' · ' + S.rs(lp.total);
    } else {
      buy.href = 'contact.html?interest=pricing&plan=' + plan + '&years=' + years + '#enquiry';
      buy.textContent = 'Buy ' + label.replace('Online ', '');
    }
  }

  // Extra seats: seats x years x the seat price (the cloud works out the real amount at checkout).
  function renderSeats(pr) {
    var cnt = document.getElementById('seatCount'), yrs = document.getElementById('seatYears'), buy = document.getElementById('seatBuy');
    if (!cnt || !yrs || !buy) return;
    var forPlan = document.getElementById('seatPlan'), plan = (forPlan && forPlan.value) || 'basic';
    var each = S.seatPriceOf(pr, plan), n = Number(cnt.value) || 1, y = Number(yrs.value) || 1;
    document.getElementById('seatTotal').textContent = S.rs(n * y * each);
    document.getElementById('seatEach').textContent = S.rs(each) + ' per seat per year';
    // each plan card and each column of the table shows the seat price of ITS plan
    [].slice.call(document.querySelectorAll('.plan-card[data-plan]')).forEach(function (card) { var a = card.querySelector('.plan-addon'); if (a) a.textContent = '(add seats: ' + S.rs(S.seatPriceOf(pr, card.getAttribute('data-plan'))) + '/yr each)'; });
    // the comparison table further down the page: today's prices, not numbers typed into the page
    [].slice.call(document.querySelectorAll('.cmp-seat')).forEach(function (td) { td.textContent = S.rs(S.seatPriceOf(pr, td.getAttribute('data-seat-plan') || 'basic')) + ' / year'; });
    [].slice.call(document.querySelectorAll('[data-cmp-price]')).forEach(function (td) { var p = S.planOf(pr, td.getAttribute('data-cmp-price')); if (p) td.textContent = S.rs(p.price) + ' / year'; });
    if (pr.payments && pr.payments.provider !== 'none') { buy.href = 'checkout.html?plan=seats&seats=' + n + '&years=' + y + '&for=' + plan; buy.textContent = 'Buy ' + n + ' seat' + (n > 1 ? 's' : '') + ' · ' + S.rs(n * y * each); }
    else { buy.href = 'contact.html?interest=seats#enquiry'; buy.textContent = 'Buy extra seats'; }
  }
  // The two mobile plans (Mobile Basic, Mobile Premium): the price of a year, with the best running offer.
  function renderMobile(pr) {
    [['androidbasic', 'mobileBasicPrice', 'mobileBasicNote'], ['android', 'mobilePremiumPrice', 'mobilePremiumNote']].forEach(function (m) {
      var price = document.getElementById(m[1]), note = document.getElementById(m[2]), lp = S.listPrice(pr, m[0], 1);
      if (!price || !note || !lp) return;
      price.textContent = S.rs(lp.total);
      note.textContent = 'a year' + (lp.discount ? ' · ' + (lp.offer.badge || S.offerHeadline(lp.offer)) + ' (was ' + S.rs(lp.gross) + ')' : '') + (lp.renewal !== lp.price ? ' · then ' + S.rs(lp.renewal) + ' a year' : '');
    });
  }
  // Customer messages add-on: years x the yearly price.
  function renderMsg(pr) {
    var yrs = document.getElementById('msgYears'), buy = document.getElementById('msgBuy');
    if (!yrs || !buy) return;
    var each = pr.msgPrice || 500, y = Number(yrs.value) || 1;
    document.getElementById('msgTotal').textContent = S.rs(y * each);
    document.getElementById('msgEach').textContent = S.rs(each) + ' per year';
    document.getElementById('msgLimit').textContent = (pr.msgYearLimit || 2000).toLocaleString('en-IN');
    if (pr.payments && pr.payments.provider !== 'none') { buy.href = 'checkout.html?plan=messages&years=' + y; buy.textContent = 'Add customer messages · ' + S.rs(y * each); }
    else { buy.href = 'contact.html?interest=messages#enquiry'; buy.textContent = 'Add customer messages'; }
  }
  var my = document.getElementById('msgYears'); if (my) my.addEventListener('change', function () { renderMsg(current); });
  ['seatPlan', 'seatCount', 'seatYears'].forEach(function (id) { var e = document.getElementById(id); if (e) e.addEventListener('change', function () { renderSeats(current); }); });

  function renderAll(pr) {
    renderOffers(pr);
    renderSeats(pr);
    renderMsg(pr);
    renderMobile(pr);
    cards.forEach(function (c) { renderCard(pr, c); });
    var contact = document.getElementById('buyNoteContact');
    if (contact) contact.hidden = !!(pr.payments && pr.payments.provider !== 'none');
  }

  var current = S.DEFAULT;
  cards.forEach(function (c) { c.querySelector('.plan-years select').addEventListener('change', function () { renderCard(current, c); }); });
  renderAll(current);
  S.getPricing().then(function (pr) { current = pr; renderAll(pr); });
})();

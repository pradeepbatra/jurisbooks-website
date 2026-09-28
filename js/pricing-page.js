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
      var plans = o.plans.length === 3 ? 'all plans' : o.plans.map(function (p) { return (S.planOf(pr, p) || {}).label || p; }).join(', ').replace(/Online /g, '');
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
    save.textContent = lp.discount ? 'You save ' + S.rs(lp.discount) + (lp.offer ? ' · ' + lp.offer.title : '') : '';
    card.querySelector('.plan-renew').textContent = (years > 1 ? 'Works out to ' + S.rs(lp.perYear) + ' a year · ' : 'Paid in advance · ') + 'then renews at just ' + S.rs(lp.renewal) + ' a year.';
    // the ribbon: the offer on the years chosen if there is one, otherwise the best offer this plan can get
    var ribbon = card.querySelector('.plan-ribbon');
    var top = lp.offer, topYears = years;
    if (!top) (pr.offers || []).forEach(function (o) {
      if (o.plans.indexOf(plan) < 0 || o.appliesTo.indexOf('new') < 0) return;
      var y = Math.max(o.minYears || 1, 1), l2 = S.listPrice(pr, plan, y);
      if (l2 && l2.offer && l2.offer.id === o.id && (!top || l2.discount > S.listPrice(pr, plan, topYears).discount)) { top = o; topYears = y; }
    });
    ribbon.hidden = !top;
    ribbon.textContent = !top ? '' : (top.minYears > 1 && !lp.offer ? S.offerHeadline(top) + ' on ' + top.minYears + '+ years' : (top.badge || S.offerHeadline(top)));
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

  function renderAll(pr) {
    renderOffers(pr);
    cards.forEach(function (c) { renderCard(pr, c); });
    var contact = document.getElementById('buyNoteContact');
    if (contact) contact.hidden = !!(pr.payments && pr.payments.provider !== 'none');
  }

  var current = S.DEFAULT;
  cards.forEach(function (c) { c.querySelector('.plan-years select').addEventListener('change', function () { renderCard(current, c); }); });
  renderAll(current);
  S.getPricing().then(function (pr) { current = pr; renderAll(pr); });
})();

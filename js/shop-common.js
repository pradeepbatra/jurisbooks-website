/* Shared by the Pricing page and the checkout: talking to the Jurisbooks cloud, prices and offers.
   The amount actually charged is always worked out by the cloud (lib/pricing.js); the numbers here are only
   for showing prices, and follow the same rules:
     a yearly subscription - the same price every year (the cloud may still send a different price for later
     years, 'renewal'; it is then used as sent);  the best running offer applies. */
(function () {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/' : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/';
  // Used until the cloud answers (and if it cannot be reached): today's prices, no offers.
  var DEFAULT = {
    years: [1, 2, 3, 4, 5],
    plans: [
      { plan: 'basic', label: 'Basic', price: 10000, renewal: 10000 },
      { plan: 'premium', label: 'Premium', price: 15000, renewal: 15000 },
      { plan: 'business', label: 'Business Premium', price: 20000, renewal: 20000 },
      { plan: 'android', label: 'Mobile Premium', price: 3999, renewal: 3999, phoneOnly: true },
      { plan: 'androidbasic', label: 'Mobile Basic', price: 1999, renewal: 1999, phoneOnly: true }
    ],
    offers: [],
    seatDiscount: 10, msgPrice: 500, msgYearLimit: 2000,
    payments: { provider: 'none' }
  };

  function call(name, data) {
    return fetch(BASE + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data || {} }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) { var e = new Error(j.error.message || 'Something went wrong.'); e.code = (j.error.details && j.error.details.code) || j.error.status; throw e; }
        return j.result;
      });
  }
  var pricingPromise = null;
  function getPricing() {
    if (!pricingPromise) {
      pricingPromise = Promise.race([
        call('getPricing').catch(function () { return DEFAULT; }),
        new Promise(function (res) { setTimeout(function () { res(DEFAULT); }, 8000); })
      ]);
    }
    return pricingPromise;
  }
  function planOf(pr, plan) { for (var i = 0; i < pr.plans.length; i++) if (pr.plans[i].plan === plan) return pr.plans[i]; return null; }
  function bestOffer(pr, plan, kind, years, gross) {
    var best = null, off = 0;
    (pr.offers || []).forEach(function (o) {
      if (o.plans.indexOf(plan) < 0 || o.appliesTo.indexOf(kind) < 0 || years < (o.minYears || 1)) return;
      var d = Math.min(gross, o.kind === 'percent' ? Math.round(gross * o.value / 100) : o.value);
      if (d > off) { off = d; best = o; }
    });
    return { offer: best, discount: off };
  }
  function yearPercent(pr, years) { return (years > 1 && pr.yearDiscounts && Number(pr.yearDiscounts[years])) || 0; }
  // The list price of buying a plan new (not a renewal/upgrade - those need the account, so the cloud works them out).
  function listPrice(pr, plan, years) {
    var p = planOf(pr, plan);
    if (!p) return null;
    var gross = p.price + (years - 1) * p.renewal;
    // buying several years together: a % off by itself (set in Back Office), then the best running offer on what is left
    var yp = yearPercent(pr, years), yd = Math.round(gross * yp / 100);
    var b = bestOffer(pr, plan, 'new', years, gross - yd);
    var off = yd + b.discount;
    return { gross: gross, discount: off, yearDiscount: yd, yearPercent: yp, offerDiscount: b.discount, offer: b.offer, total: gross - off, perYear: Math.round((gross - off) / years), renewal: p.renewal, price: p.price };
  }
  function rs(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function fDate(t) { return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function offerHeadline(o) { return o.kind === 'percent' ? o.value + '% OFF' : rs(o.value) + ' OFF'; }

  // An extra seat on a plan, a year: that plan's own yearly price less the seat discount (10% unless the cloud says otherwise).
  function seatPriceOf(pr, plan) {
    var p = planOf(pr, plan) || planOf(pr, 'basic');
    if (!p) return 0;
    if (p.seatPrice != null) return p.seatPrice;
    return Math.round(p.price * (100 - (pr.seatDiscount == null ? 10 : pr.seatDiscount)) / 100);
  }
  window.JBShop = { call: call, getPricing: getPricing, planOf: planOf, seatPriceOf: seatPriceOf, yearPercent: yearPercent, bestOffer: bestOffer, listPrice: listPrice, rs: rs, fDate: fDate, offerHeadline: offerHeadline, DEFAULT: DEFAULT, LOCAL: LOCAL };
})();

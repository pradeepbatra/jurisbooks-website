document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }
});

/* Referral links: jurisbooks.com/?ref=CODE (a customer's or a sales person's code).
   The code is kept on this device for 60 days; "Open App" then carries it into the app (which adds it to the
   account after sign-in) and the checkout sends it with the order. The cloud decides whether it counts. */
(function () {
  try {
    var got = (new URLSearchParams(location.search).get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (got.length >= 4) localStorage.setItem('jb_ref', JSON.stringify({ code: got, at: Date.now() }));
    var saved = JSON.parse(localStorage.getItem('jb_ref') || 'null');
    if (!saved || !saved.code || Date.now() - saved.at > 60 * 86400000) return;
    window.JB_REF = saved.code;
    var mark = function () {
      [].forEach.call(document.querySelectorAll('a[href^="https://app.jurisbooks.com"]'), function (a) { a.href = 'https://app.jurisbooks.com/?ref=' + encodeURIComponent(saved.code); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
  } catch (e) { /* no storage (private window): the link simply does not carry over */ }
})();

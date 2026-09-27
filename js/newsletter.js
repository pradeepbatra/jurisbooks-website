/* Newsletter sign-up box in the footer of every page. Sends the address to our cloud, which adds it to the
   Brevo newsletter list (Brevo sends the newsletters and handles unsubscribing). */
(function () {
  'use strict';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var URL = LOCAL ? 'http://127.0.0.1:5001/jurisbooks-online-2609/asia-south1/subscribeNewsletter'
    : 'https://asia-south1-jurisbooks-online-2609.cloudfunctions.net/subscribeNewsletter';
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('newsForm');
    if (!form) return;
    var email = form.querySelector('input[type=email]'), trap = form.querySelector('.news-trap'), btn = form.querySelector('button'), note = document.getElementById('newsNote');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (email.value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { note.textContent = 'Please enter a valid email address.'; return; }
      btn.disabled = true; note.textContent = 'Subscribing…';
      fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { email: v, botcheck: trap ? trap.value : '', page: location.pathname } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (j && j.error) throw new Error(j.error.message || 'Please try again.');
          form.reset();
          note.textContent = j && j.result && j.result.already ? 'You are already subscribed — thank you.' : 'Thank you. You will hear from us with news and tips from Jurisbooks.';
        })
        .catch(function (err) { note.textContent = (err && err.message) || 'Could not subscribe just now. Please try again.'; })
        .then(function () { btn.disabled = false; });
    });
  });
})();

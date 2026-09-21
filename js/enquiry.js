/* ==========================================================================
   Enquiry form (contact page).

   HOW IT WORKS
   The form sends each enquiry to the Web3Forms service, which emails it to the
   address that was registered when the access key below was created (the
   owner's private Gmail). That address is NOT written anywhere on this
   website - only the access key is, and the key is designed to be public.

   The visitor never needs an email account or email program: the form posts the
   enquiry straight from the page. Until a key is pasted below the Send button is
   switched off and the page shows the phone / WhatsApp number instead.
   ========================================================================== */
window.JURISBOOKS_FORM = {
  accessKey: 'f02fa23f-a37e-4a5f-b95d-36ad00e78ce4',   // Web3Forms public access key (safe to publish; it only sends to the owner's inbox)
  fallbackEmail: 'info@jurisbooks.com'   // only shown in the "could not be sent" message
};

(function () {
  var LABELS = {
    demo: 'Request a demo',
    offline: 'Jurisbooks Offline',
    online: 'Jurisbooks Online',
    pricing: 'Pricing',
    other: 'Other question'
  };

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var form = document.getElementById('enquiryForm');
    if (!form) return;
    var status = document.getElementById('enquiryStatus');
    var btn = form.querySelector('button[type="submit"]');
    var interest = form.elements['interest'];
    var loadedAt = Date.now();

    function setInterest(v) { if (v && LABELS[v]) { interest.value = v; } }

    // Buttons elsewhere on the page ("Ask about Online" ...) pre-select the topic and jump to the form.
    document.querySelectorAll('[data-interest]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        setInterest(a.getAttribute('data-interest'));
        var target = document.getElementById('enquiry');
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (history.replaceState) history.replaceState(null, '', '#enquiry');
          setTimeout(function () { form.elements['name'].focus({ preventScroll: true }); }, 450);
        }
      });
    });
    // ...and links from other pages: contact.html?interest=online#enquiry
    try { setInterest(new URLSearchParams(location.search).get('interest')); } catch (e) {}

    function say(msg, kind) {
      status.textContent = msg;
      status.className = 'enquiry-status ' + (kind || '');
      status.hidden = !msg;
    }
    function digits(s) { return (s || '').replace(/\D/g, ''); }

    // "Chat on WhatsApp": opens WhatsApp with what the visitor has typed so far already written out.
    var wa = document.getElementById('enquiryWhatsApp');
    var TOPIC_TEXT = { demo: 'a demo of Jurisbooks', offline: 'Jurisbooks Offline', online: 'Jurisbooks Online', pricing: 'pricing', other: 'Jurisbooks' };
    function buildWhatsApp() {
      if (!wa) return;
      var f = form.elements, name = f['name'].value.trim(), biz = f['business'].value.trim(), msg = f['message'].value.trim();
      var t = 'Hello Jurisbooks! ' + (name ? 'I am ' + name + (biz ? ' from ' + biz : '') + '. ' : '') +
              'I would like to know about ' + (TOPIC_TEXT[interest.value] || 'Jurisbooks') + '.' + (msg ? ' ' + msg.slice(0, 600) : '');
      wa.href = 'https://wa.me/919220499490?text=' + encodeURIComponent(t);
    }
    if (wa) { wa.addEventListener('click', buildWhatsApp); wa.addEventListener('focus', buildWhatsApp); wa.addEventListener('mouseenter', buildWhatsApp); wa.addEventListener('touchstart', buildWhatsApp, { passive: true }); }

    var cfg0 = window.JURISBOOKS_FORM || {};
    if (!cfg0.accessKey) {
      btn.disabled = true;
      say('Online enquiries are being switched on. For now, please tap Chat on WhatsApp below, or call us on +91 92204 99490, and we will help you straight away.', 'ok');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      // Spam traps: a hidden box real people never tick, and forms filled in faster than a person can type.
      if (f['botcheck'].checked || Date.now() - loadedAt < 2500) { say('Thank you. We will be in touch.', 'ok'); return; }

      var name = f['name'].value.trim(), phone = f['phone'].value.trim();
      if (name.length < 2) { say('Please enter your name.', 'err'); f['name'].focus(); return; }
      if (digits(phone).length < 8) { say('Please enter a phone or WhatsApp number we can reach you on.', 'err'); f['phone'].focus(); return; }
      if (f['email'].value && !f['email'].checkValidity()) { say('That email address does not look right.', 'err'); f['email'].focus(); return; }
      if (!f['consent'].checked) { say('Please tick the box so we know we may contact you.', 'err'); f['consent'].focus(); return; }

      var last = 0; try { last = Number(localStorage.getItem('jb_enquiry_at')) || 0; } catch (x) {}
      if (Date.now() - last < 20000) { say('Your enquiry was just sent. Please wait a moment before sending another.', 'err'); return; }

      var data = {
        name: name, phone: phone, email: f['email'].value.trim(), business: f['business'].value.trim(),
        interest: LABELS[interest.value] || interest.value, message: f['message'].value.trim(), page: location.href
      };
      var subject = 'Jurisbooks enquiry - ' + data.interest + ' - ' + name;
      var cfg = window.JURISBOOKS_FORM || {};

      function done() {
        try { localStorage.setItem('jb_enquiry_at', String(Date.now())); } catch (x) {}
        form.hidden = true;
        var ok = document.getElementById('enquiryThanks'); ok.hidden = false; ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (!cfg.accessKey) { return; }   // form is switched off until a key is set

      // ---- normal path: send through Web3Forms ----
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending...'; say('', '');
      var payload = {
        access_key: cfg.accessKey, subject: subject, from_name: 'Jurisbooks website',
        name: data.name, phone: data.phone, email: data.email, business: data.business,
        interested_in: data.interest, message: data.message, page: data.page, botcheck: ''
      };
      if (!data.email) delete payload.email;
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload)
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.success) { done(); return; }
          throw new Error('rejected');
        })
        .catch(function () {
          say('Sorry, your enquiry could not be sent. Please call or WhatsApp us on +91 92204 99490, or email ' + (cfg.fallbackEmail) + '.', 'err');
        })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });
})();

/* ==========================================================================
   Download links for the two versions.

   Both are switched OFF ("Coming soon") until you are ready to publish.
   To turn a download on, paste the installer's public web address between the
   quotes below - nothing else needs to change; every "Download" button on the
   site (home page and the version's own page) switches from "Coming soon" to a
   working download link the next time the page loads.

     'offline-windows'  ->  the Jurisbooks (offline) installer for Windows
     'online-windows'   ->  the Jurisbooks Online installer for Windows
   ========================================================================== */
window.JURISBOOKS_DOWNLOADS = {
  'offline-windows': '',
  'online-windows': ''
};

document.addEventListener('DOMContentLoaded', function () {
  var cfg = window.JURISBOOKS_DOWNLOADS || {};
  document.querySelectorAll('[data-download]').forEach(function (el) {
    var url = cfg[el.getAttribute('data-download')];
    if (!url) return;                                   // still "Coming soon"
    var a = document.createElement('a');
    a.className = el.className.replace('is-soon', 'is-live');
    a.href = url;
    a.setAttribute('download', '');
    a.innerHTML = el.innerHTML.replace(/<span class="soon-badge">[\s\S]*?<\/span>/, '');
    el.parentNode.replaceChild(a, el);
  });
  // Text that only makes sense while a download is not yet available.
  document.querySelectorAll('[data-soon-only]').forEach(function (el) {
    if (cfg[el.getAttribute('data-soon-only')]) el.hidden = true;
  });
});

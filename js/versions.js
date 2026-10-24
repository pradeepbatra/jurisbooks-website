/* ==========================================================================
   Latest versions of Jurisbooks (Offline) - the ONE file to edit when a new
   version is released. download.html (the page the program's "Check for
   Updates" tab opens) and everything on it reads from here.

   TO RELEASE A NEW VERSION:
     1. Change "latest" and "released" for the editions that have a new build.
     2. Push the website. Customers who press "Check for Updates" in the
        program will now be told a newer version exists.

   "trial" is the only edition that is downloadable from the website. Basic,
   Premium and Business Premium installers are sent to customers personally.
   Keep "trial" at the version that is actually published on the website.
   ========================================================================== */
window.JURISBOOKS_VERSIONS = {
  editions: {
    trial:    { name: 'Trial',            latest: '1.5.26', released: '24 Oct 2026' },
    basic:    { name: 'Basic',            latest: '1.5.26', released: '24 Oct 2026' },
    premium:  { name: 'Premium',          latest: '1.5.26', released: '24 Oct 2026' },
    business: { name: 'Business Premium', latest: '1.5.26', released: '24 Oct 2026' }
  }
};

/* ==========================================================================
   Latest versions of Jurisbooks (Offline) - the ONE file to edit when a new
   version is released. download.html (the page the program's "Check for
   Updates" tab opens) and everything on it reads from here.

   TO RELEASE A NEW VERSION:
     1. Change "latest" and "released" for the editions that have a new build.
     2. Add a new entry at the TOP of "history" saying what is new.
     3. Push the website. Customers who press "Check for Updates" in the
        program will now be told a newer version exists.

   "trial" is the only edition that is downloadable from the website. Basic,
   Premium and Business Premium installers are sent to customers personally.
   Keep "trial" at the version that is actually published on the website.
   ========================================================================== */
window.JURISBOOKS_VERSIONS = {
  editions: {
    trial:    { name: 'Trial',            latest: '1.1.0', released: '20 Sep 2026' },
    basic:    { name: 'Basic',            latest: '1.2.0', released: '21 Sep 2026' },
    premium:  { name: 'Premium',          latest: '1.2.0', released: '21 Sep 2026' },
    business: { name: 'Business Premium', latest: '1.2.0', released: '21 Sep 2026' }
  },
  history: [
    { v: '1.2.0', date: '21 Sep 2026', items: [
      'Four separate editions: Trial, Basic, Premium and Business Premium, each with its own installer.',
      'Sharing over the office network is now part of Business Premium only.',
      'The version number is shown in the program, and there is a Check for Updates tab in the menu.'
    ] },
    { v: '1.1.0', date: 'up to 19 Sep 2026', items: [
      'Staff logins with a permission tick-list for each person.',
      'Sharing over the office network (one main computer, others connect to it).',
      'Formal GST invoice, dashboard widgets, and a print-only description on invoice lines.',
      'Automatic backup fixes: per company, and archived financial years backed up separately.'
    ] }
  ]
};

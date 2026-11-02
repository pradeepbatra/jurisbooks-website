/* Training videos page. Add the YouTube link of each video to en and hi; a blank link shows "Coming soon". */
(function () {
  var GUIDES = [
    { title: 'Getting started', text: 'Set up your business, then add your items, customers and suppliers.', en: '', hi: '' },
    { title: 'Selling and buying', text: 'Make sale and purchase bills and record money in and out.', en: '', hi: '' },
    { title: 'Stock, accounts and GST', text: 'See your stock, your accounts and your GST reports.', en: '', hi: '' },
    { title: 'Colours and icons', text: 'Make the program look the way you like.', en: '', hi: '' },
    { title: 'Bill design and printing', text: 'Choose a bill style and set up printing.', en: '', hi: '' },
    { title: 'Companies, staff and seats', text: 'Add more companies and give your staff their own login.', en: '', hi: '' },
    { title: 'Backup and restore', text: 'Keep a safe copy of your books and bring it back.', en: '', hi: '' },
    { title: 'Year closing and bill numbers', text: 'Close a financial year and set how your bills are numbered.', en: '', hi: '' }
  ];
  var grid = document.getElementById('guideGrid');
  if (!grid) return;
  function button(label, url) {
    if (!url) {
      var s = document.createElement('span');
      s.className = 'guide-soon';
      s.textContent = label + ': coming soon';
      return s;
    }
    var a = document.createElement('a');
    a.className = 'btn btn-outline';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Watch in ' + label;
    return a;
  }
  GUIDES.forEach(function (g) {
    var card = document.createElement('div');
    card.className = 'guide-card';
    var h = document.createElement('h2');
    h.textContent = g.title;
    var p = document.createElement('p');
    p.textContent = g.text;
    var row = document.createElement('div');
    row.className = 'guide-links';
    row.appendChild(button('English', g.en));
    row.appendChild(button('Hindi', g.hi));
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(row);
    grid.appendChild(card);
  });
})();

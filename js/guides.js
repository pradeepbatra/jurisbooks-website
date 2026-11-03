/* Training videos page. Add the YouTube link of each video to en and hi; a blank link shows "Coming soon". */
(function () {
  var GUIDES = [
    { title: 'Getting started', text: 'Set up your business, then add your items, customers and suppliers.', en: 'https://youtu.be/RLiXl-jBwQY', hi: 'https://youtu.be/8fOcEQDkubA' },
    { title: 'Selling and buying', text: 'Make sale and purchase bills and record money in and out.', en: 'https://youtu.be/4psgSjm4Lkw', hi: 'https://youtu.be/YlS6y-y6kmk' },
    { title: 'Stock, accounts and GST', text: 'See your stock, your accounts and your GST reports.', en: 'https://youtu.be/X8WPKfs5wsM', hi: 'https://youtu.be/iu6-o-3ai4Q' },
    { title: 'Colours and icons', text: 'Make the program look the way you like.', en: 'https://youtu.be/RcfRfDLLiF0', hi: 'https://youtu.be/4kQksWF-Vgs' },
    { title: 'Bill design and printing', text: 'Choose a bill style and set up printing.', en: 'https://youtu.be/qv2f_fKHQ8Q', hi: 'https://youtu.be/76ji1wXymw8' },
    { title: 'Companies, staff and seats', text: 'Add more companies and give your staff their own login.', en: 'https://youtu.be/Q_DhBAByxm0', hi: 'https://youtu.be/a17GtNh046s' },
    { title: 'Backup and restore', text: 'Keep a safe copy of your books and bring it back.', en: 'https://youtu.be/U4sWGMlU2A8', hi: 'https://youtu.be/AbchZISR5gw' },
    { title: 'Year closing and bill numbers', text: 'Close a financial year and set how your bills are numbered.', en: 'https://youtu.be/SLUx1I_eErg', hi: 'https://youtu.be/j6gt2vryeP4' }
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

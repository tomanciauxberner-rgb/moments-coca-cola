const DB = {
  "first apartment": {
    yearCity: "São Paulo · 2017",
    headline: "The first night alone. The fridge half-empty. A warm Coke from a bag.",
    quote: "The mattress was on the floor. The city was loud outside. I didn't know anyone. I had a Coke and somehow, it was fine.",
    meta: "Anonymous · São Paulo · 2017",
    connections: [
      { text: "First key. First quiet.", place: "Warsaw · 2019" },
      { text: "Empty walls. Full heart.", place: "Nairobi · 2021" },
      { text: "Finally mine.", place: "Lyon · 2015" }
    ]
  },
  "watching football with my father": {
    yearCity: "Tom \u00b7 Bruxelles \u00b7 1987",
    headline: "Ces petites ondulations sur le verre. On ne les fait plus comme \u00e7a.",
    quote: "L'\u00e9t\u00e9 dans le jardin de mes grands-parents, apr\u00e8s le tennis. Une bouteille de Coca en verre, bien froide \u2014 ces petites ondulations sur le verre sous mes doigts avant de l'ouvrir. Je sens encore tout \u00e7a.",
    meta: "Tom \u00b7 Bruxelles \u00b7 1987",
    connections: [
      { text: "Le frigo de papa, toujours un Coca pour apr\u00e8s l'\u00e9cole. Il le savait.", place: "Sarah \u00b7 Lyon \u00b7 1994" },
      { text: "Premier Coca partag\u00e9 avec elle, gare du Midi, avant qu'elle monte dans le train.", place: "Lucas \u00b7 Bruxelles \u00b7 2009" },
      { text: "Nuit de la finale. Coca ti\u00e8de dans un gobelet plastique. On s'en foutait.", place: "Ali \u00b7 Cairo \u00b7 1998" }
    ]
  },
  "breakup at 2am": {
    yearCity: "Paris · 2022",
    headline: "The city keeps going. You sit still. Something cold helps.",
    quote: "Train station. Empty platform. A machine still running at 2am. I was glad something was.",
    meta: "Anonymous · Paris · 2022",
    connections: [
      { text: "3am. No one left. Still here.", place: "Tokyo · 2020" },
      { text: "The silence after.", place: "Berlin · 2019" },
      { text: "I drove all night going nowhere.", place: "Los Angeles · 2021" }
    ]
  },
  "summer after graduation": {
    yearCity: "Athens · 1994",
    headline: "The summer before everything became something else.",
    quote: "We didn't know it was the last summer like that. We were too busy living it.",
    meta: "Anonymous · Athens · 1994",
    connections: [
      { text: "Hot road. No plan. Perfect.", place: "Cape Town · 2011" },
      { text: "We had nothing and it was enough.", place: "Mexico City · 2007" },
      { text: "The longest day of my life.", place: "Stockholm · 2016" }
    ]
  },
  "train station, leaving": {
    yearCity: "Milan · 2013",
    headline: "The platform empties. The train is already gone.",
    quote: "She waved until I couldn't see her anymore. I kept looking anyway.",
    meta: "Anonymous · Milan · 2013",
    connections: [
      { text: "Leaving to stay. Staying to leave.", place: "Lisbon · 2018" },
      { text: "The bag was heavy. The heart heavier.", place: "Mumbai · 2015" },
      { text: "One last look at everything.", place: "Dublin · 2022" }
    ]
  }
};

const years = ["1954","1961","1966","1971","1979","1985","1992","1998","2003","2011","2018"];
const places = ["Atlanta","London","Cairo","Tokyo","Mexico City","Lagos","Paris","Buenos Aires","Seoul","Brussels"];

let userName = '';

function goTo(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function fill(text) {
  document.getElementById('input-moment').value = text;
}
function fillAll(moment, name, city, year) {
  document.getElementById('input-moment').value = moment;
  document.getElementById('input-name').value = name;
  document.getElementById('input-city').value = city;
  document.getElementById('input-year').value = year;
}

function startSearch() {
  const name = document.getElementById('input-name').value.trim() || 'Toi';
  const city = document.getElementById('input-city').value.trim();
  const year = document.getElementById('input-year').value.trim();
  const moment = document.getElementById('input-moment').value.trim() || 'watching football with my father';
  userName = name;

  const cityYear = [city, year].filter(Boolean).join(' · ');
  document.getElementById('searching-msg').textContent = name !== 'Toi' ? `${name}${cityYear ? ' · ' + cityYear : ''} — searching 130 years of memory…` : 'Searching 130 years of memory…';

  goTo('pg-searching');

  let i = 0;
  const interval = setInterval(() => {
    document.getElementById('flash-year').textContent = years[i % years.length];
    document.getElementById('flash-place').textContent = places[i % places.length];
    i++;
  }, 500);

  setTimeout(() => {
    clearInterval(interval);
    showResult(moment.toLowerCase(), name, city, year);
  }, 3500);
}

function showResult(input, name, city, year) {
  let data = null;
  for (const key of Object.keys(DB)) {
    if (input.includes(key) || key.split(' ').some(w => w.length > 4 && input.includes(w))) {
      data = DB[key]; break;
    }
  }
  if (!data) {
    const keys = Object.keys(DB);
    data = DB[keys[Math.floor(Math.random() * keys.length)]];
  }

  const cityYear = [city, year].filter(Boolean).join(' · ');
  const userAttr = [name !== 'Toi' ? name : '', cityYear].filter(Boolean).join(' · ');

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // SECTION 1 — la quote utilisateur (son moment, raconté par lui)
  // On utilise le headline de la DB comme phrase poétique condensée du moment
  set('r-userquote', data.quote);
  set('r-userquote-meta', userAttr || data.yearCity || '');

  // SECTION 2 — twin moment (l'écho mondial)
  set('r-twin-headline', data.headline);
  set('r-match-quote', data.quote);
  set('r-match-attribution', data.meta || data.yearCity || '');

  // SECTION 3 — connections
  const grid = document.getElementById('r-connections');
  if (grid) {
    grid.innerHTML = '';
    data.connections.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'r-conn-card';
      card.style.animationDelay = (i * 0.12) + 's';
      card.innerHTML =
        '<div class="r-conn-place">' + (c.place || '') + '</div>' +
        '<div class="r-conn-text">' + (c.text || '') + '</div>';
      grid.appendChild(card);
    });
  }

  goTo('pg-result');
}


/* ===== next block ===== */


(function(){
  function startPgResult() {
    var pg = document.getElementById('pg-result');
    var v = document.getElementById('pgBgVideo');
    var a = document.getElementById('pgBgAudio');
    if (!pg || !v || !a) return;
    pg.classList.remove('video-ended');
    /* reset chain visuals */
    /* reset revealed sections */
    document.querySelectorAll('#pg-result .r-section').forEach(function(s){ s.classList.remove('revealed'); });
    pg.classList.remove('video-ended');

    var _v2 = document.getElementById('bgV2');
    var _v3 = document.getElementById('bgV3');
    var _img = document.getElementById('pgBgImage');
    if (_v2) { _v2.classList.remove('visible'); try { _v2.pause(); _v2.currentTime = 0; } catch(e){} }
    if (_v3) { _v3.classList.remove('visible'); try { _v3.pause(); _v3.currentTime = 0; } catch(e){} }
    if (_img) { _img.classList.remove('visible'); }


    try { v.currentTime = 0; v.play(); } catch(e){}
    try { a.currentTime = 0; a.play(); } catch(e){}
    v.addEventListener('ended', function(){
      var v2 = document.getElementById('bgV2');
      var v3 = document.getElementById('bgV3');
      var img = document.getElementById('pgBgImage');
      if (!v2 || !v3 || !img) {
        pg.classList.add('video-ended');
        return;
      }
      v2.classList.add('visible');
      v2.play().catch(function(){});
      v2.addEventListener('ended', function(){
        v3.classList.add('visible');
        v3.play().catch(function(){});
        v3.addEventListener('ended', function(){
          img.classList.add('visible');
          pg.classList.add('video-ended');
          if (window.__revealCascade) window.__revealCascade();
        }, { once: true });
      }, { once: true });
    }, { once: true });
  }
  window.startPgResult = startPgResult;

  var _origGoTo = window.goTo;
  if (typeof _origGoTo === 'function') {
    window.goTo = function(id) {
      _origGoTo(id);
      if (id === 'pg-result') {
        setTimeout(startPgResult, 50);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    var pg = document.getElementById('pg-result');
    if (pg && pg.classList.contains('active')) {
      startPgResult();
    }
  });
})();


/* ===== next block ===== */


(function(){
  var _origShow = window.showResult;
  if (typeof _origShow !== 'function') return;
  window.showResult = function(input, name, city, year) {
    _origShow(input, name, city, year);

    var userMoment = document.getElementById('input-moment');
    var userText = userMoment ? userMoment.value.trim() : '';
    if (userText) {
      var uq = document.getElementById('r-userquote');
      if (uq) uq.textContent = '"' + userText + '"';
    }

    var oldHeadline = document.getElementById('result-headline');
    var twinH = document.getElementById('r-twin-headline');
    if (oldHeadline && twinH) twinH.textContent = oldHeadline.textContent;

    var oldQuote = document.getElementById('result-quote');
    var matchQ = document.getElementById('r-match-quote');
    if (oldQuote && matchQ) matchQ.textContent = oldQuote.textContent;

    var oldMeta = document.getElementById('result-meta');
    var matchA = document.getElementById('r-match-attribution');
    if (oldMeta && matchA) matchA.textContent = oldMeta.textContent;

    var oldYearCity = document.getElementById('result-year-city');
    var matchId = document.getElementById('r-match-id');
    if (oldYearCity && matchId) matchId.textContent = oldYearCity.textContent;

    var oldGrid = document.getElementById('conn-grid');
    var newGrid = document.getElementById('r-connections');
    if (oldGrid && newGrid) {
      newGrid.innerHTML = '';
      var cells = oldGrid.querySelectorAll('.conn-cell');
      cells.forEach(function(cell, i){
        var text = cell.querySelector('.conn-text');
        var place = cell.querySelector('.conn-place');
        var card = document.createElement('div');
        card.className = 'r-conn-card';
        card.style.opacity = '0';
        card.style.animation = 'fadeUp 0.6s ease forwards';
        card.style.animationDelay = (i * 0.12) + 's';
        card.innerHTML =
          '<div class="r-conn-place">' + (place ? place.textContent : '') + '</div>' +
          '<div class="r-conn-text">' + (text ? text.textContent : '') + '</div>';
        newGrid.appendChild(card);
      });
    }
  };
})();



/* === REVEAL CASCADE === */
window.__revealCascade = function(){
  var sections = document.querySelectorAll('#pg-result .r-section');
  sections.forEach(function(sec, i){
    setTimeout(function(){
      sec.classList.add('revealed');
    }, 400 + i * 700);
  });
};


/* ===== AUTO-INJECTED: polaroid hook ===== */
(function(){
  var _origShowResult = window.showResult;
  if (typeof _origShowResult !== 'function') return;
  window.showResult = function(input, name, city, year){
    var ret = _origShowResult.apply(this, arguments);
    try {
      if (window.__generatePolaroid) {
        window.__generatePolaroid(input, name || '', city || '', year || '');
      }
    } catch(e) {}
    return ret;
  };
})();

/* The Marlene File: game logic. Plain JavaScript, no build step.
   All numbers come from the Django API (/api/sites/...). Nothing here invents data. */
(function () {
  'use strict';

  var API = '/api';
  var ART = 'assets/';

  // The three clues (variables). `api` must match Site.variable in the backend.
  var VARS = [
    { key: 'ppt', api: 'Precipitation', hunch: 'The rain is shifting', row: 'RAINFALL', label: 'Rainfall',
      plain: 'Precipitation is all the water that falls from the sky as rain or snow. We add up each year’s total, so the wet and dry seasons do not blur the picture.',
      source: 'NASA GPCP V3.3 (satellites and rain gauges)' },
    { key: 'aet', api: 'Actual evapotranspiration', hunch: 'More water is evaporating', row: 'EVAPORATION', label: 'Evaporation',
      plain: 'Evapotranspiration is the water that goes back up into the air, from the soil and from the leaves of plants. We add up each year’s total.',
      source: 'NASA FLDAS V001 (a land model fed by observed rainfall)' },
    { key: 'soil', api: 'Soil moisture (0-10 cm)', hunch: 'The soil is drying', row: 'SOIL', label: 'Soil moisture',
      plain: 'Soil moisture is how much water sits in the top 10 cm of the ground. We average the 12 months of each year.',
      source: 'NASA FLDAS V001 (a land model fed by observed rainfall)' }
  ];

  // The three places. `api` must be the start of Site.name in the backend.
  var PLACES = [
    { key: 'med', api: 'Mediterranean', label: 'The Mediterranean', short: 'MED.',
      affects: 'Farmers, cities and forests around the sea, where summers are long and dry and every wet winter counts.',
      background: 'Climate studies describe the Mediterranean as a place where warming raises the air’s thirst for water, while its rainfall swings a great deal from year to year, which makes trends hard to detect.' },
    { key: 'nile', api: 'Nile Delta', label: 'The Nile Delta', short: 'NILE',
      affects: 'The millions of people who farm and live in the delta, one of the most crowded farmlands on Earth.',
      background: 'The delta gets very little rain. Its farms live on Nile river water brought by irrigation, which these rain-based records do not see.' },
    { key: 'sahel', api: 'Sahel', label: 'The Sahel', short: 'SAHEL',
      affects: 'Herders and farmers who depend on a single short rainy season each year.',
      background: 'After severe droughts in the 1970s and 1980s, rainfall in the Sahel partly recovered. Scientists link this to changing ocean temperatures, among other causes.' }
  ];

  var state = { name: '', varKey: null, placeKey: null, solved: {}, step: 0 };
  var sitesIndex = null;      // "varKey-placeKey" -> site id
  var siteCache = {};         // id -> site detail
  var current = null;         // { site, slopeDecade, p, sig, start, end, n }

  // ---------- small helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function byKey(list, key) { return list.filter(function (x) { return x.key === key; })[0]; }
  function caseKey(v, p) { return v + '-' + p; }
  function units(u) { return String(u).replace('m3/m3', 'm³/m³'); }
  function num(v) {
    var a = Math.abs(v), d = a >= 100 ? 0 : a >= 1 ? 1 : a >= 0.01 ? 3 : 4;
    return v.toFixed(d).replace('-', '−');
  }
  function signed(v) { return (v > 0 ? '+' : '') + num(v); }
  function pText(p) { return p < 0.001 ? '< 0.001' : p.toFixed(3); }
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }

  function save() { try { localStorage.setItem('marlene-file-v1', JSON.stringify({ name: state.name, solved: state.solved })); } catch (e) { /* storage is optional */ } }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem('marlene-file-v1') || '{}');
      state.name = d.name || ''; state.solved = d.solved || {};
    } catch (e) { /* storage is optional */ }
  }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) { var err = new Error(body.error || ('The server answered ' + r.status)); err.status = r.status; throw err; }
        return body;
      });
    });
  }
  function loadIndex() {
    if (sitesIndex) return Promise.resolve(sitesIndex);
    return getJSON(API + '/sites/').then(function (sites) {
      sitesIndex = {};
      sites.forEach(function (s) {
        var v = VARS.filter(function (x) { return x.api === s.variable; })[0];
        var p = PLACES.filter(function (x) { return s.name.indexOf(x.api) === 0; })[0];
        if (v && p) sitesIndex[caseKey(v.key, p.key)] = s.id;
      });
      return sitesIndex;
    });
  }
  function loadSite(vKey, pKey) {
    return loadIndex().then(function (idx) {
      var id = idx[caseKey(vKey, pKey)];
      if (!id) throw new Error('This case is not in the records yet.');
      if (siteCache[id]) return siteCache[id];
      return getJSON(API + '/sites/' + id + '/').then(function (s) { siteCache[id] = s; return s; });
    });
  }

  // Optional artwork: if assets/<file> exists, use it; otherwise the CSS fallback stays.
  function loadArt() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-art]'), function (node) {
      var img = new Image();
      img.onload = function () { node.style.backgroundImage = 'url(' + ART + node.getAttribute('data-art') + ')'; node.classList.add('has-art'); };
      img.src = ART + node.getAttribute('data-art');
    });
  }

  // ---------- routing ----------
  var SCREENS = ['intro', 'meet', 'office', 'globe', 'evidence', 'casefile', 'compare'];
  function route() {
    var id = (location.hash || '#intro').slice(1);
    if (SCREENS.indexOf(id) < 0) id = 'intro';
    if (id === 'evidence' && !(state.varKey && state.placeKey)) id = 'globe';
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    document.body.setAttribute('data-screen', id);
    var navId = id === 'meet' ? 'intro' : id === 'office' ? 'globe' : id;
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      if (a.getAttribute('data-nav') === navId) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (id === 'meet') showMeet(1);
    if (id === 'office') renderOffice();
    if (id === 'globe') renderGlobe();
    if (id === 'evidence') renderEvidence();
    if (id === 'casefile') renderCaseFile();
    if (id === 'compare') renderCompare();
  }
  function go(id) { if (location.hash === '#' + id) route(); else location.hash = id; }

  // ---------- 2. meet Marlene ----------
  function showMeet(page) {
    $('meet-1').hidden = page !== 1; $('meet-2').hidden = page !== 2;
    $('meet-marlene').setAttribute('data-art', page === 1 ? 'marlene-wave.png' : 'marlene-think.png');
    if (page === 2) { $('name-input').value = state.name; $('name-input').focus(); }
  }

  // ---------- 3. office ----------
  function renderOffice() {
    $('office-bubble').textContent = 'Welcome to my office, ' + (state.name || 'detective') +
      '. Ready to investigate what Earth’s data has been hiding? Let’s start with the globe.';
  }

  // ---------- case file board (used on two screens) ----------
  function solvedCount() { return Object.keys(state.solved).length; }
  function boardHTML() {
    var h = '<h3>Case File (' + solvedCount() + '/9 solved)</h3><table><colgroup><col class="rowhead"><col><col><col></colgroup><thead><tr><th></th>' +
      PLACES.map(function (p) { return '<th scope="col">' + esc(p.short) + '</th>'; }).join('') + '</tr></thead><tbody>';
    VARS.forEach(function (v) {
      h += '<tr><th scope="row">' + v.row + '</th>' + PLACES.map(function (p) {
        var done = state.solved[caseKey(v.key, p.key)];
        return '<td class="' + (done ? 'is-done' : '') + '" aria-label="' + esc(v.label + ', ' + p.label + ': ' + (done ? 'solved' : 'not solved yet')) + '">' + (done ? '✔' : '?') + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table>';
  }

  // ---------- 4. globe ----------
  function chip(text, pressed, onClick) {
    var b = el('button', { 'class': 'chip', type: 'button', 'aria-pressed': pressed ? 'true' : 'false' }, esc(text));
    b.addEventListener('click', onClick);
    return b;
  }
  function renderGlobe() {
    var hunch = $('hunch-chips'), place = $('place-chips');
    hunch.innerHTML = ''; place.innerHTML = '';
    VARS.forEach(function (v) {
      hunch.appendChild(chip(v.hunch, state.varKey === v.key, function () { state.varKey = v.key; renderGlobe(); }));
    });
    PLACES.forEach(function (p) {
      place.appendChild(chip(p.label, state.placeKey === p.key, function () { state.placeKey = p.key; renderGlobe(); }));
    });
    $('place-block').hidden = !state.varKey;
    $('open-case').hidden = !(state.varKey && state.placeKey);
    $('globe').classList.toggle('has-hunch', !!state.varKey);
    $('mini-board').innerHTML = boardHTML();
  }

  // ---------- chart: yearly readings, optional trend line ----------
  function drawChart(box, points, opt) {
    var W = 720, H = 320, m = { t: 16, r: 86, b: 34, l: 58 };
    var xs = points.map(function (p) { return p.year; }), ys = points.map(function (p) { return p.value; });
    var x0 = xs[0], x1 = xs[xs.length - 1];
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    var step = niceStep((hi - lo) / 4);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    function X(v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - lo) / (hi - lo) * (H - m.t - m.b); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.title) + '">';
    for (var g = lo; g <= hi + step / 2; g += step) {
      s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/>' +
        '<text class="axis" x="' + (m.l - 8) + '" y="' + (Y(g) + 4) + '" text-anchor="end">' + num(g) + '</text>';
    }
    xs.forEach(function (yr) {
      if (yr % 5 === 0) s += '<text class="axis" x="' + X(yr) + '" y="' + (H - 10) + '" text-anchor="middle">' + yr + '</text>';
    });
    if (opt.trend) {
      var a = opt.trend.start, b = opt.trend.end;
      if (a !== x0 || b !== x1) s += '<rect class="band" x="' + X(a) + '" y="' + m.t + '" width="' + (X(b) - X(a)) + '" height="' + (H - m.t - m.b) + '"/>';
    }
    s += '<path class="line" d="' + points.map(function (p, i) { return (i ? 'L' : 'M') + X(p.year).toFixed(1) + ' ' + Y(p.value).toFixed(1); }).join('') + '"/>';
    var last = points[points.length - 1];
    s += '<circle class="dot" r="4" cx="' + X(last.year) + '" cy="' + Y(last.value) + '"/>';
    if (opt.trend) {
      var t = opt.trend, ya = t.intercept + t.slope * t.start, yb = t.intercept + t.slope * t.end;
      s += '<line class="trend" x1="' + X(t.start) + '" y1="' + Y(ya) + '" x2="' + X(t.end) + '" y2="' + Y(yb) + '"/>';
      var ly = Y(yb), dy = Y(last.value);
      if (t.end === x1 && Math.abs(ly - dy) < 16) ly = dy + (ly >= dy ? 16 : -16);
      s += '<text class="lbl" x="' + (X(t.end) + 8) + '" y="' + (ly + 4) + '">Trend</text>';
      if (t.end !== x1 || Math.abs(ly - dy) >= 14) s += '<text class="lbl" x="' + (X(x1) + 8) + '" y="' + (dy + 4) + '">' + (t.end === x1 ? 'Readings' : '') + '</text>';
    }
    s += '<g class="hover" style="display:none"><line class="cross" y1="' + m.t + '" y2="' + (H - m.b) + '"/><circle class="dot" r="5"/></g>' +
      '<rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + (W - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/></svg>';
    var legend = opt.trend ? '<div class="chart__legend"><span><i style="border-color:var(--series-data)"></i>Yearly readings</span><span><i style="border-color:var(--series-trend)"></i>Trend line (Sen’s slope)</span></div>' : '';
    box.innerHTML = legend + s + '<div class="chart__tip" style="display:none"></div>';

    var svg = box.querySelector('svg'), hov = svg.querySelector('.hover'), tip = box.querySelector('.chart__tip');
    function move(ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      var yr = Math.round(x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0));
      yr = Math.max(x0, Math.min(x1, yr));
      var p = points[yr - x0]; if (!p) return;
      hov.style.display = '';
      hov.querySelector('line').setAttribute('x1', X(p.year)); hov.querySelector('line').setAttribute('x2', X(p.year));
      hov.querySelector('circle').setAttribute('cx', X(p.year)); hov.querySelector('circle').setAttribute('cy', Y(p.value));
      tip.style.display = ''; tip.textContent = p.year + ': ' + num(p.value) + ' ' + opt.units;
      tip.style.left = (X(p.year) / W * r.width) + 'px';
      tip.style.top = (svg.offsetTop + Y(p.value) / H * r.height) + 'px';
    }
    function leave() { hov.style.display = 'none'; tip.style.display = 'none'; }
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerleave', leave);
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  // ---------- 5. evidence room ----------
  var STEP_LABELS = ['The case', 'Proof one: raw readings', 'Proof two: the trend', 'Proof three: the verdict'];
  function renderEvidence() {
    var v = byKey(VARS, state.varKey), p = byKey(PLACES, state.placeKey);
    $('ev-title').textContent = p.label + ': ' + v.label;
    $('ev-sub').textContent = 'Your hunch: “' + v.hunch + '”. Let us see what the evidence says.';
    $('ev-plain').innerHTML = '<b>In plain words:</b> ' + esc(v.plain);
    $('ev-board').innerHTML = boardHTML();
    $('ev-status').textContent = 'Fetching the records… (the first request can take up to a minute)';
    ['proof-1', 'proof-2', 'proof-3'].forEach(function (id) { $(id).hidden = true; });
    $('ev-next-wrap').hidden = true; $('ev-steps').innerHTML = '';
    current = null;
    loadSite(v.key, p.key).then(function (site) {
      if (state.varKey !== v.key || state.placeKey !== p.key) return;   // the player moved on
      $('ev-status').textContent = '';
      current = { site: site, slopeDecade: site.result.slope_per_decade, p: site.result.p_value, sig: site.result.is_significant,
        start: site.start_year, end: site.end_year, n: site.points.length, full: true };
      state.step = state.solved[caseKey(v.key, p.key)] ? 3 : 0;
      fillPeriodSelects(site);
      showStep();
    }).catch(function (e) {
      $('ev-status').textContent = 'I could not fetch the records: ' + e.message + ' Please try again in a moment.';
    });
  }
  function fillPeriodSelects(site) {
    var a = $('p-start'), b = $('p-end'); a.innerHTML = ''; b.innerHTML = '';
    site.points.forEach(function (pt) {
      a.appendChild(el('option', { value: pt.year }, pt.year)); b.appendChild(el('option', { value: pt.year }, pt.year));
    });
    a.value = site.start_year; b.value = site.end_year; $('period-msg').textContent = '';
  }
  function trendLine() {
    var pts = current.site.points.filter(function (pt) { return pt.year >= current.start && pt.year <= current.end; });
    var slope = current.slopeDecade / 10;
    return { slope: slope, intercept: median(pts.map(function (pt) { return pt.value - slope * pt.year; })), start: current.start, end: current.end };
  }
  function showStep() {
    var site = current.site, v = byKey(VARS, state.varKey), p = byKey(PLACES, state.placeKey), u = units(site.units), step = state.step;
    var steps = $('ev-steps'); steps.innerHTML = '';
    STEP_LABELS.forEach(function (label, i) {
      var b = el('button', { 'class': 'step', type: 'button', role: 'tab', 'aria-selected': i === step ? 'true' : 'false' }, esc(label));
      if (i > step) b.disabled = true;
      b.addEventListener('click', function () { state.step = i; showStep(); });
      steps.appendChild(b);
    });
    $('proof-1').hidden = step < 1; $('proof-2').hidden = step < 2; $('proof-3').hidden = step < 3;

    if (step >= 1) {
      $('chart-caption').textContent = v.label + ' in ' + p.label.replace(/^The /, 'the ') + ', one value per year, ' + site.start_year + '–' + site.end_year + ' (' + u + ').';
      drawChart($('chart'), site.points, { title: v.label + ' per year in ' + p.label, units: u, trend: step >= 2 ? trendLine() : null });
      $('chart-table').innerHTML = '<div class="scroll"><table><thead><tr><th>Year</th><th>' + esc(u) + '</th></tr></thead><tbody>' +
        site.points.map(function (pt) { return '<tr><td>' + pt.year + '</td><td>' + num(pt.value) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (step >= 2) {
      var avg = mean(site.points.filter(function (pt) { return pt.year >= current.start && pt.year <= current.end; }).map(function (pt) { return pt.value; }));
      $('st-slope').textContent = signed(current.slopeDecade) + ' ' + u;
      $('st-slope-label').textContent = 'change per decade, ' + current.start + '–' + current.end;
      $('st-pct').textContent = signed(current.slopeDecade / avg * 100).replace(/(\.\d)\d+$/, '$1') + '%';
    }
    if (step >= 3) {
      $('st-p').textContent = 'p = ' + pText(current.p);
      $('verdict').className = 'verdict ' + (current.sig ? 'is-sig' : 'is-wait');
      $('verdict').innerHTML = '<span class="verdict__icon" aria-hidden="true">' + (current.sig ? '✔' : '⌛') + '</span><div><small>The verdict' +
        (current.full ? '' : ' for ' + current.start + '–' + current.end) + '</small><strong>' +
        (current.sig ? 'Statistically significant' : 'Not enough evidence yet') + '</strong><p>' +
        (current.sig ? 'p is below 0.05, so the evidence is strong enough to call this a trend.'
          : 'p is above 0.05, so we cannot call this a trend yet. That is not the same as “no trend”.') + '</p></div>';
      $('context').innerHTML = contextHTML(site, v, p, u);
      var done = state.solved[caseKey(v.key, p.key)];
      $('close-case').textContent = done ? 'In the case file ✔' : 'Add to the case file ✔';
      $('close-case').disabled = !!done;
    }
    $('ev-says').textContent = marleneSays(step);
    $('ev-next-wrap').hidden = step >= 3;
    $('ev-next').textContent = ['Collect proof one: the raw readings', 'Proof one added ✔  Now, the trend', 'Proof two added ✔  Now, the verdict'][step] || '';
  }
  function marleneSays(step) {
    if (step === 0) return 'Every hunch deserves a fair trial, ' + (state.name || 'detective') + '. We shall collect three proofs before we say a word about trends.';
    if (step === 1) return 'Something may have changed here. But a picture alone cannot tell us how much, or whether the change is more than chance.';
    if (step === 2) return 'The pattern is becoming clearer, but we still need to test whether this change is statistically meaningful.';
    return current.sig
      ? 'The numbers support what we saw in the graph. We have found strong evidence of a trend. Mind you, that tells us what changed, not why.'
      : 'The line tilts, but the readings wobble too much for us to be sure. An honest detective says: not enough evidence yet.';
  }
  function contextHTML(site, v, p, u) {
    var up = current.slopeDecade > 0, period = current.start + ' and ' + current.end;
    var observed = current.sig
      ? v.label + ' here has ' + (up ? 'risen' : 'fallen') + ' by about ' + num(Math.abs(current.slopeDecade)) + ' ' + u + ' per decade between ' + period + '.'
      : 'The readings wobble from year to year, and the line through them tilts ' + (up ? 'up' : 'down') + ' only slightly between ' + period + '. The test cannot tell that apart from chance.';
    var h = '<div><b>What was observed:</b> ' + esc(observed) + '</div>' +
      '<div><b>How it was tested:</b> One value per year, then the Mann–Kendall trend test with Sen’s slope. We call a trend significant only when p is below 0.05.</div>' +
      '<div><b>Who this affects:</b> ' + esc(p.affects) + '</div>' +
      '<div><b>What scientists suggest</b> (background, not proven by our test): ' + esc(p.background) + '</div>';
    if (p.key === 'nile' && v.key !== 'ppt') {
      h += '<div class="warn"><b>A warning about this instrument:</b> it only sees rain, not irrigation, so it misses the river water farmers add. These readings describe a rain-fed delta, not the real one.</div>';
    }
    h += '<div><b>A note on the evidence:</b> ' + esc(v.source) + '. ' +
      (site.source_link ? '<a href="' + esc(site.source_link) + '" target="_blank" rel="noopener">Open the dataset record</a>' : '') + '</div>';
    return h;
  }
  function testPeriod(ev) {
    ev.preventDefault();
    var a = +$('p-start').value, b = +$('p-end').value, msg = $('period-msg');
    if (a > b) { msg.textContent = 'The first year must come before the last year.'; return; }
    msg.textContent = 'Testing ' + a + '–' + b + '…';
    var site = current.site;
    getJSON(API + '/sites/' + site.id + '/trend/?start=' + a + '&end=' + b).then(function (r) {
      if (!current || current.site.id !== site.id) return;
      current.slopeDecade = r.slope_per_decade; current.p = r.p_value; current.sig = r.is_significant;
      current.start = r.start; current.end = r.end; current.n = r.n_points;
      current.full = r.start === site.start_year && r.end === site.end_year;
      msg.textContent = 'Tested ' + r.n_points + ' years, ' + r.start + '–' + r.end + '. A shorter period gives the test less to work with.';
      showStep();
    }).catch(function (e) { msg.textContent = e.status === 400 ? e.message + '. Please choose a longer period.' : 'I could not run the test: ' + e.message; });
  }
  function resetPeriod() {
    var site = current.site;
    current.slopeDecade = site.result.slope_per_decade; current.p = site.result.p_value; current.sig = site.result.is_significant;
    current.start = site.start_year; current.end = site.end_year; current.full = true;
    fillPeriodSelects(site); showStep();
  }
  function closeCase() {
    var site = current.site;   // the case file always records the full-record verdict
    state.solved[caseKey(state.varKey, state.placeKey)] = { sig: site.result.is_significant };
    save(); $('ev-board').innerHTML = boardHTML(); showStep();
  }

  // ---------- 6. case file ----------
  function renderCaseFile() {
    var n = solvedCount();
    $('file-sub').textContent = n + ' of 9 cases solved. Each case needs three proofs: the raw readings, the trend and the verdict.';
    var grid = $('file-grid'); grid.innerHTML = '';
    VARS.forEach(function (v) {
      PLACES.forEach(function (p) {
        var done = state.solved[caseKey(v.key, p.key)];
        var card = el('article', { 'class': 'case' },
          '<div class="case__top"><span class="tag">' + v.row + '</span><span class="pill ' + (done ? (done.sig ? 'is-sig' : 'is-wait') : 'is-open') + '">' +
          (done ? (done.sig ? '✔ Significant trend' : '⌛ Not enough evidence yet') : 'Unsolved') + '</span></div>' +
          '<h3>' + esc(p.label) + '</h3><p>' + esc('Hunch: “' + v.hunch + '”') + '</p>');
        var b = el('button', { 'class': 'btn btn--small', type: 'button' }, done ? 'Review the evidence' : 'Investigate');
        b.addEventListener('click', function () { state.varKey = v.key; state.placeKey = p.key; go('evidence'); });
        card.appendChild(b); grid.appendChild(card);
      });
    });
    $('file-says').textContent = n === 0 ? 'An empty file, ' + (state.name || 'detective') + '. Pick a hunch and a place, and let us begin.'
      : n < 9 ? 'A fine start. Remember: a case closed with “not enough evidence yet” is still a case honestly closed.'
      : 'All nine cases closed. You judged every one by its evidence, and that is the whole of the craft.';
  }

  // ---------- 7. compare ----------
  var cmpVar = null;
  function renderCompare() {
    cmpVar = cmpVar || state.varKey || 'ppt';
    var chips = $('cmp-chips'); chips.innerHTML = '';
    VARS.forEach(function (v) { chips.appendChild(chip(v.label, cmpVar === v.key, function () { cmpVar = v.key; renderCompare(); })); });
    var v = byKey(VARS, cmpVar), want = cmpVar;
    $('cmp-status').textContent = 'Fetching the records…'; $('cmp-grid').innerHTML = ''; $('cmp-takeaways').innerHTML = ''; $('cmp-says').textContent = '';
    Promise.all(PLACES.map(function (p) { return loadSite(v.key, p.key); })).then(function (sites) {
      if (want !== cmpVar) return;
      $('cmp-status').textContent = '';
      sites.forEach(function (s, i) {
        var p = PLACES[i], r = s.result, u = units(s.units);
        $('cmp-grid').appendChild(el('article', { 'class': 'case' },
          '<div class="case__top"><span class="tag">' + v.row + '</span><span class="pill ' + (r.is_significant ? 'is-sig' : 'is-wait') + '">' +
          (r.is_significant ? '✔ Significant trend' : '⌛ Not enough evidence yet') + '</span></div><h3>' + esc(p.label) + '</h3>' +
          '<dl><dt>Slope</dt><dd>' + signed(r.slope_per_decade) + ' ' + esc(u) + ' per decade</dd><dt>p-value</dt><dd>' + pText(r.p_value) +
          '</dd><dt>Test</dt><dd>' + esc(r.test_used) + '</dd><dt>Years</dt><dd>' + s.start_year + '–' + s.end_year + '</dd></dl>' +
          (p.key === 'nile' && v.key !== 'ppt' ? '<p><b>Caution:</b> this instrument sees rain only, not irrigation.</p>' : '')));
      });
      var sig = sites.filter(function (s) { return s.result.is_significant; }), names = function (list) { return list.map(function (s) { return PLACES[sites.indexOf(s)].label; }).join(' and '); };
      var items = [sig.length + ' of 3 places show a statistically significant trend in ' + v.label.toLowerCase() + '.'];
      if (sig.length) {
        var top = sig.slice().sort(function (a, b) { return Math.abs(b.result.slope_per_decade) - Math.abs(a.result.slope_per_decade); })[0];
        items.push('The clearest change is in ' + PLACES[sites.indexOf(top)].label + ': ' + signed(top.result.slope_per_decade) + ' ' + units(top.units) + ' per decade.');
      }
      if (sig.length < 3) items.push('For ' + names(sites.filter(function (s) { return !s.result.is_significant; })) + ', there is not enough evidence yet. That is not the same as “no trend”.');
      $('cmp-takeaways').innerHTML = '<h3>Key takeaways</h3><ul>' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      $('cmp-says').textContent = sig.length === 0 || sig.length === 3
        ? 'The three places tell the same story this time. Agreement is evidence too, but do check each one on its own merits.'
        : 'One clue, three places, and they do not agree. That is why a detective never judges the whole Earth from a single spot.';
    }).catch(function (e) { $('cmp-status').textContent = 'I could not fetch the records: ' + e.message; });
  }

  // ---------- start ----------
  load();
  loadArt();
  $('meet-next-1').addEventListener('click', function () { showMeet(2); });
  $('meet-2').addEventListener('submit', function (ev) { ev.preventDefault(); state.name = $('name-input').value.trim(); save(); go('office'); });
  $('office-globe').addEventListener('click', function () { go('globe'); });
  $('open-case').addEventListener('click', function () { go('evidence'); });
  $('ev-next').addEventListener('click', function () { if (current) { state.step += 1; showStep(); } });
  $('period-form').addEventListener('submit', testPeriod);
  $('p-reset').addEventListener('click', resetPeriod);
  $('close-case').addEventListener('click', closeCase);
  window.addEventListener('hashchange', route);
  route();
})();

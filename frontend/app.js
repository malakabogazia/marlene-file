/* The Marlene File: game logic. Plain JavaScript, no build step.
   Every number shown comes from the backend API. Wording lives in content.js, settings in config.js. */
(function () {
  'use strict';

  var CFG = window.MARLENE_CONFIG || {};
  var API = (CFG.API_URL || '') + '/api';
  var VARS = MF.VARS, PLACES = MF.PLACES;
  var STAGES = ['intro', 'meet', 'office', 'choose', 'evidence', 'file', 'files'];
  var PAGES = ['compare', 'celebrate', 'final', 'connect', 'credits'];
  var DEV = /[?&]dev=1/.test(location.search);

  var state = { name: '', varKey: null, placeKey: null, proofs: {}, compared: {}, celebrated: false };
  var sitesIndex = null, siteCache = {};
  var ev = null;          // the case open in the Evidence Room
  var demoTimers = [];

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function byKey(list, key) { return list.filter(function (x) { return x.key === key; })[0]; }
  function ck(v, p) { return v + '-' + p; }
  function show(id, on) { $(id).hidden = !on; }
  function who() { return state.name || 'detective'; }
  function Who() { var w = who(); return w.charAt(0).toUpperCase() + w.slice(1); }
  function lower1(t) { return t.charAt(0).toLowerCase() + t.slice(1); }          // "Many people" -> "many people"
  function inPlace(p) { return p.label.replace(/^The /, 'the '); }        // "in the Sahel", not "in The Sahel"
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function minus(s) { return s.replace('-', '−'); }
  function signed(x, d) { return (x > 0 ? '+' : '') + minus(x.toFixed(d)); }

  // The cases in play. Two Nile Delta model cases can be switched off in config.js.
  function isHidden(v, p) { return CFG.SHOW_NILE_MODEL_CASES === false && p === 'nile' && v !== 'ppt'; }
  function isNileModel(v, p) { return p === 'nile' && v !== 'ppt'; }
  function cases() {
    var out = [];
    VARS.forEach(function (v) { PLACES.forEach(function (p) { if (!isHidden(v.key, p.key)) out.push({ v: v, p: p, key: ck(v.key, p.key) }); }); });
    return out;
  }
  function solved(key) { return state.proofs[key] === 3; }
  function solvedCount() { return cases().filter(function (c) { return solved(c.key); }).length; }
  function allSolved() { return solvedCount() === cases().length; }
  function varDone(vKey) { return cases().filter(function (c) { return c.v.key === vKey; }).every(function (c) { return solved(c.key); }); }
  function countWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] || String(n); }

  // ---------- numbers: everything is derived from what the API returns ----------
  function shown(v, x) { return x * v.scale; }                                  // soil moisture 0.20 -> 20 (%)
  function valueText(v, x) { return minus(shown(v, x).toFixed(1)) + (v.unit === '%' ? '%' : ' mm'); }
  function slopeText(v, slope) { return signed(shown(v, slope), 2) + ' ' + v.slopeUnit; }
  function pText(p) { return p < 0.001 ? 'p < 0.001' : 'p = ' + p.toFixed(4); }
  function verdictText(sig) { return sig ? 'Statistically significant' : 'Not enough evidence yet'; }
  function stats(site, from, to) {          // average and percent change for a span of years
    var pts = site.points.filter(function (q) { return q.year >= (from || site.start_year) && q.year <= (to || site.end_year); });
    return { mean: mean(pts.map(function (q) { return q.value; })) };
  }
  function full(site) {                     // the full-record result, exactly as stored by the backend
    var r = site.result, avg = stats(site).mean;
    return { slope: r.slope_per_decade, p: r.p_value, sig: r.is_significant, mean: avg, pct: r.slope_per_decade / avg * 100,
      start: site.start_year, end: site.end_year, n: site.points.length, isFull: true };
  }

  // ---------- storage ----------
  function save() { try { localStorage.setItem('marlene-file-v2', JSON.stringify({ name: state.name, proofs: state.proofs, compared: state.compared, celebrated: state.celebrated })); } catch (e) { /* optional */ } }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem('marlene-file-v2') || '{}');
      state.name = d.name || ''; state.proofs = d.proofs || {}; state.compared = d.compared || {}; state.celebrated = !!d.celebrated;
    } catch (e) { /* optional */ }
  }

  // ---------- API ----------
  function getJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) { var err = new Error(body.error || body.detail || ('The server answered ' + r.status)); err.status = r.status; throw err; }
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
        if (v && p) sitesIndex[ck(v.key, p.key)] = s.id;
      });
      return sitesIndex;
    });
  }
  function loadSite(key) {
    return loadIndex().then(function (idx) {
      var id = idx[key];
      if (!id) { var e = new Error('That case is not in the records.'); e.status = 404; throw e; }
      if (!siteCache[id]) siteCache[id] = getJSON(API + '/sites/' + id + '/').catch(function (e) { delete siteCache[id]; throw e; });
      return siteCache[id];
    });
  }
  function loadMany(list) { return Promise.all(list.map(function (c) { return loadSite(c.key); })); }
  // Fetch every case quietly in the background, one at a time, so later screens open without waiting.
  var prefetched = false;
  function prefetchAll() {
    if (prefetched) return; prefetched = true;
    cases().reduce(function (chain, c) { return chain.then(function () { return loadSite(c.key).catch(function () {}); }); }, Promise.resolve());
  }
  // Start downloading the big pictures early, so each screen's background is ready when the player arrives.
  function preloadImages(names) { names.forEach(function (n) { var i = new Image(); i.src = 'assets/' + n; }); }
  var WAIT = 'One moment, I’m fetching the files… The first request can take up to a minute.';
  function failText(e) { return e.status === 404 ? 'That file is not in my cabinet. Please go back and pick another case.' : 'I could not reach the records room. Please try again in a moment.'; }

  // ---------- layout: the 1440 x 900 design is scaled to fit the window ----------
  function fit() {
    var w = window.innerWidth, h = window.innerHeight, s = Math.min(w / 1440, h / 900);
    if (s < 0.72) s = Math.min(w / 1440, 0.72);
    STAGES.forEach(function (id) {
      var sec = $(id), st = sec.querySelector('.stage');
      st.style.transform = 'scale(' + s + ')';
      sec.style.width = 1440 * s + 'px'; sec.style.height = 900 * s + 'px';
      sec.style.marginTop = Math.max(0, (h - 900 * s) / 2) + 'px';
    });
  }

  // ---------- routing ----------
  var route = { id: 'intro', arg: null };
  function go(hash) { if (location.hash === '#' + hash) render(); else location.hash = hash; }
  function render() {
    var parts = (location.hash || '#intro').slice(1).split('/'), id = parts[0], arg = parts[1] || null;
    if (STAGES.concat(PAGES).indexOf(id) < 0) id = 'intro';
    if (id === 'evidence' && !(state.varKey && state.placeKey)) id = 'choose';
    stopDemo(true);
    route = { id: id, arg: arg };
    STAGES.concat(PAGES).forEach(function (s) { $(s).hidden = s !== id; });
    document.body.className = 'on-' + id + (PAGES.indexOf(id) >= 0 ? ' is-page' : ' is-stage');
    MF.hideTip(); closeModal(); window.scrollTo(0, 0);
    ({ meet: renderMeet, office: renderOffice, choose: renderChoose, evidence: renderEvidence, file: renderFile, files: renderFiles,
      compare: renderCompare, celebrate: renderCelebrate, final: renderFinal, connect: renderConnect, credits: renderCredits }[id] || function () {})(arg);
    if (DEV) $('dev-jump').value = id;
  }

  // ---------- small shared pieces ----------
  function brand(cls) { return '<div class="brand ' + (cls || 'brand--ink') + '"><b>THE MARLENE FILE</b><span>EARTH SYSTEM TREND DETECTIVE</span></div>'; }
  function icon(p) {
    var d = { wave: 'M1 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0M1 14c2-3 4-3 6 0s4 3 6 0 4-3 6 0', delta: 'M10 2v6M10 8l-6 9M10 8l6 9M10 8v9', sun: 'M10 5.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9M10 1v2M10 17v2M1 10h2M17 10h2M3.6 3.6l1.4 1.4M15 15l1.4 1.4M3.6 16.4l1.4-1.4M15 5l1.4-1.4' }[p.icon];
    return '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + p.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function badge(sig) { return '<span class="badge ' + (sig ? 'is-sig' : 'is-wait') + '">' + (sig ? '✔ ' : '⌛ ') + verdictText(sig) + '</span>'; }
  function boardHTML() {
    var n = cases().length, h = '<h3>Case File (' + solvedCount() + '/' + n + ' proofs)</h3><table><colgroup><col class="rowhead"><col><col><col></colgroup><thead><tr><th></th>' +
      PLACES.map(function (p) { return '<th scope="col">' + p.short + '</th>'; }).join('') + '</tr></thead><tbody>';
    VARS.forEach(function (v) {
      h += '<tr><th scope="row">' + v.row + '</th>' + PLACES.map(function (p) {
        var key = ck(v.key, p.key), done = solved(key), off = isHidden(v.key, p.key);
        return '<td class="' + (done ? 'is-done' : '') + (off ? ' is-off' : '') + '" aria-label="' + esc(v.title + ', ' + p.label + ': ' + (off ? 'not in play' : done ? 'solved' : 'not solved yet')) + '">' + (off ? '–' : done ? '✔' : '?') + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table><img class="board__pin" src="assets/pin.png" alt="">';
  }
  function openModal(title, html) { $('modal-title').textContent = title; $('modal-body').innerHTML = html; $('modal').hidden = false; $('modal-close').focus(); }
  function closeModal() { $('modal').hidden = true; }
  function photoHTML(key, place) {
    var name = key.split('-').reverse().join('-'), ph = MF.PHOTOS[name];      // "ppt-sahel" -> "sahel-ppt"
    if (!ph) return '<div class="ph-missing"><b>' + esc(place.label) + '</b><span>Photograph to be added</span></div>';
    return '<img src="assets/place-' + name + '.jpg" alt="' + esc(ph.alt) + '">' +
      '<figcaption>' + (ph.ai ? '<b>Illustration, AI-generated.</b> Not a photograph.' : esc(ph.credit)) + '</figcaption>';
  }

  // ---------- Screens 2 to 4 ----------
  function renderMeet() { show('meet-1', true); show('meet-2', false); }
  function renderOffice() {
    $('office-bubble').textContent = 'Welcome to my office, ' + who() + '. Ready to investigate what Earth’s data has been hiding? Let’s start with the globe.';
  }

  // ---------- Screen 5: choose the case ----------
  function chip(html, pressed, onClick, extra) {
    var b = document.createElement('button');
    b.className = 'chip' + (extra || ''); b.type = 'button'; b.setAttribute('aria-pressed', pressed ? 'true' : 'false'); b.innerHTML = html;
    b.addEventListener('click', onClick); return b;
  }
  function mapHTML(sel) {     // a simple latitude and longitude frame showing the three boxes (no coastlines)
    var W = 290, H = 150, lon0 = -25, lon1 = 50, lat0 = 5, lat1 = 52;
    function X(l) { return (l - lon0) / (lon1 - lon0) * W; } function Y(l) { return H - (l - lat0) / (lat1 - lat0) * H; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Map frame showing the three study boxes">';
    for (var lo = -20; lo <= 40; lo += 20) s += '<line class="m-grid" x1="' + X(lo) + '" x2="' + X(lo) + '" y1="0" y2="' + H + '"/><text class="m-tick" x="' + (X(lo) + 2) + '" y="' + (H - 3) + '">' + Math.abs(lo) + '°' + (lo < 0 ? 'W' : lo > 0 ? 'E' : '') + '</text>';
    for (var la = 10; la <= 50; la += 10) s += '<line class="m-grid" x1="0" x2="' + W + '" y1="' + Y(la) + '" y2="' + Y(la) + '"/><text class="m-tick" x="2" y="' + (Y(la) - 2) + '">' + la + '°N</text>';
    PLACES.forEach(function (p) {
      var on = p.key === sel, b = p.box;
      s += '<rect x="' + X(b.w) + '" y="' + Y(b.n) + '" width="' + (X(b.e) - X(b.w)) + '" height="' + (Y(b.s) - Y(b.n)) + '" fill="' + p.color + '" fill-opacity="' + (on ? 0.35 : 0.1) + '" stroke="' + p.color + '" stroke-width="' + (on ? 2.5 : 1.2) + '"/>';
    });
    var p = byKey(PLACES, sel);
    return '<h3>' + icon(p) + esc(p.label) + '</h3>' + s + '</svg><p>The study area is the land inside this box: <b>' + p.boxText + '</b>. The sea is left out.</p>';
  }
  function renderChoose() {
    var hunch = $('hunch-chips'), place = $('place-chips');
    hunch.innerHTML = ''; place.innerHTML = '';
    VARS.forEach(function (v) { hunch.appendChild(chip(esc(v.hunch), state.varKey === v.key, function () { state.varKey = v.key; if (state.placeKey && isHidden(v.key, state.placeKey)) state.placeKey = null; renderChoose(); })); });
    PLACES.forEach(function (p) {
      if (state.varKey && isHidden(state.varKey, p.key)) return;
      var done = state.varKey && solved(ck(state.varKey, p.key));
      place.appendChild(chip(icon(p) + esc(p.label) + (done ? ' ✔' : ''), state.placeKey === p.key, function () { state.placeKey = p.key; renderChoose(); }));
    });
    prefetchAll();
    show('place-block', !!state.varKey); show('open-case', !!(state.varKey && state.placeKey));
    $('choose').classList.toggle('has-hunch', !!state.varKey);
    $('choose-board').innerHTML = boardHTML();
    show('choose-map', !!state.placeKey);
    if (state.placeKey) $('choose-map').innerHTML = mapHTML(state.placeKey);
  }

  // ---------- Screen 6: the Evidence Room ----------
  var TRACK = ['Pick the variable', 'Choose the region', 'Set the time period', 'Examine the time series', 'Test significance'];
  function renderEvidence() {
    var v = byKey(VARS, state.varKey), p = byKey(PLACES, state.placeKey), key = ck(v.key, p.key);
    ev = { v: v, p: p, key: key, site: null, cur: null, step: 0, demo: false };
    $('ev-sub').textContent = v.title.toUpperCase() + ' · ' + p.label.replace(/^The /, '').toUpperCase() + ' · …';
    $('ev-plain').innerHTML = '<b>In Plain Words:</b> ' + esc(v.plain);
    $('ev-board').innerHTML = boardHTML();
    hideEvidenceParts();
    $('ev-wait').textContent = WAIT; show('ev-wait', true);
    $('ev-says').textContent = 'A new case, ' + who() + '. Let me find the file.';
    loadSite(key).then(function (site) {
      if (!ev || ev.key !== key) return;
      ev.site = site; ev.cur = full(site);
      var photo = key.split('-').reverse().join('-'); if (MF.PHOTOS[photo]) preloadImages(['place-' + photo + '.jpg']);
      var got = state.proofs[key] || 0;
      ev.step = got ? got + 1 : 0;
      $('ev-sub').textContent = v.title.toUpperCase() + ' · ' + p.label.replace(/^The /, '').toUpperCase() + ' · ' + site.start_year + '–' + site.end_year;
      var range = $('ev-range'); range.max = site.points.length - 1; range.value = 0;
      show('ev-wait', false);
      if (state.demoPending) { state.demoPending = false; runDemo(); } else paintEvidence();
    }).catch(function (e) { $('ev-wait').textContent = failText(e); $('ev-says').textContent = 'Something is amiss with the records.'; });
  }
  var EV_PARTS = ['ev-restart', 'ev-seal', 'ev-photo', 'ev-chart', 'ev-p1', 'ev-p2', 'ev-p3', 't-change', 't-p', 'ev-period', 't-test', 't-alpha', 'ev-verdict', 'ev-observed',
    'ev-confirm', 'ev-affects', 'ev-science', 'tag-1', 'tag-2', 'tag-3', 'ev-open-file', 'ev-continue', 'ev-table-btn'];
  function hideEvidenceParts() { EV_PARTS.forEach(function (id) { show(id, false); }); $('ev-tracker').innerHTML = ''; }
  function trendLine() {
    var c = ev.cur, v = ev.v, slope = shown(v, c.slope) / 10;
    var pts = ev.site.points.filter(function (q) { return q.year >= c.start && q.year <= c.end; });
    return { slope: slope, intercept: median(pts.map(function (q) { return shown(v, q.value) - slope * q.year; })), start: c.start, end: c.end };
  }
  function paintEvidence() {
    var s = ev.step, v = ev.v, p = ev.p, site = ev.site, c = ev.cur;
    // step 0 sealed, 1 photo and question, 2 proof one, 3 proof two, 4 proof three and the last panel
    show('ev-seal', s === 0); show('ev-photo', s >= 1); show('ev-p1', s === 1);
    show('ev-chart', s >= 2); show('ev-table-btn', s >= 2); show('ev-p2', s === 2); show('tag-1', s >= 2);
    ['t-change', 't-p', 'ev-period', 'tag-2'].forEach(function (id) { show(id, s >= 3); }); show('ev-p3', s === 3);
    ['t-test', 't-alpha', 'ev-verdict', 'ev-observed', 'ev-confirm', 'ev-affects', 'ev-science', 'tag-3', 'ev-open-file', 'ev-continue'].forEach(function (id) { show(id, s >= 4); });
    show('ev-open-file', s >= 4 && !ev.demo); show('ev-continue', s >= 4 && !ev.demo);
    show('ev-restart', s >= 1 && !ev.demo);

    var done = [true, true, s >= 1, s >= 2, s >= 4];
    $('ev-tracker').innerHTML = TRACK.map(function (t, i) { return '<li class="' + (done[i] ? 'is-done' : '') + '">' + (i + 1) + '. ' + t + '</li>'; }).join('');

    if (s >= 1) $('ev-photo').innerHTML = photoHTML(ev.key, p);
    if (s >= 2) {
      MF.lineChart($('ev-chart'), { w: 441, h: 242, unit: v.unit, title: v.title + ' per year in ' + inPlace(p),
        fmt: function (y) { return minus(y.toFixed(v.unit === '%' ? 2 : 1)); },
        series: [{ name: 'Yearly readings', color: p.color, dots: true, faint: true, points: site.points.map(function (q) { return { x: q.year, y: shown(v, q.value) }; }) }],
        trend: s >= 3 ? trendLine() : null });
    }
    if (s >= 3) {
      var avg = stats(site, c.start, c.end).mean;
      $('t-change').querySelector('b').textContent = slopeText(v, c.slope);
      $('t-change').querySelector('span').innerHTML = 'Change / Decade<br>' + signed(c.slope / avg * 100, 1) + '% of the average';
      $('t-p').querySelector('b').textContent = pText(c.p).replace('p', 'P');
      $('pbar-mark').style.left = Math.min(100, Math.sqrt(c.p) * 100) + '%';
      var i = +$('ev-range').value;
      $('ev-range-label').textContent = 'Choose your time period: from ' + site.points[i].year + ' (point ' + (i + 1) + ' of ' + site.points.length + ')';
    }
    if (s >= 4) {
      $('ev-verdict').className = 'verdict ' + (c.sig ? 'is-sig' : 'is-wait');
      $('ev-verdict').innerHTML = '<span aria-hidden="true">' + (c.sig ? '✔' : '⌛') + '</span><div><small>The Verdict' + (c.isFull ? '' : ' for ' + c.start + '–' + c.end) + ':</small><strong>' + verdictText(c.sig) + '</strong></div>';
      var up = c.slope > 0, src = site.source_link ? ' <a href="' + esc(site.source_link) + '" target="_blank" rel="noopener">Dataset record</a>' : '';
      $('ev-observed').innerHTML =
        '<p><b>What was Observed:</b> ' + (c.sig ? esc(v.title + ' ' + (up ? 'rose' : 'fell') + ' by ' + slopeText(v, Math.abs(c.slope)).slice(1) + ' per decade, ' + c.start + '–' + c.end + '.')
          : 'The line tilts ' + (up ? 'up' : 'down') + ', but the readings wobble too much for us to rule out luck.') + '</p>' +
        '<p><b>How it was Tested:</b> Mann–Kendall trend test with Sen’s slope, one value per year (' + c.n + ' years).</p>' +
        '<p><b>A Note on the Evidence:</b> ' + esc(v.dataset) + '.' + src + '</p>';
      $('ev-confirm').textContent = 'p-value: the chance of seeing a pattern this strong if there were really no trend. Below 0.05 counts as significant.';
      $('ev-affects').innerHTML = '<b>Who this affects:</b> ' + esc(MF.AFFECTS[v.key][p.key]);
      var warn = isNileModel(v.key, p.key);
      $('ev-science').className = 'note-box' + (warn ? ' note-box--warn' : '');
      $('ev-science').innerHTML = warn ? '<b>Marlene’s warning:</b> ' + esc(MF.NILE_WARNING)
        : '<b>What scientists suggest (background, not proven by our test):</b> ' + esc(p.background) + ' <i>' + MF.SOURCE_TBC + '</i>';
    }
    $('ev-says').textContent = marleneSays(s);
  }
  function marleneSays(s) {
    if (s === 0) return 'A sealed paper, ' + who() + '. Break the seal when you are ready.';
    if (s === 1) return Who() + ', ' + lower1(MF.QUESTIONS[ev.v.key][ev.p.key]);
    if (s === 2) return 'Look closely, ' + who() + ': one dot for each year. But dots alone cannot tell us whether the change is more than luck.';
    if (s === 3) return 'Now, ' + who() + ', move the start year and watch the verdict. A result that disappears with a small change is fragile.';
    return ev.cur.sig ? 'Well done, ' + who() + '. The numbers support what we saw: strong evidence of a trend. It tells us what changed, not why.'
      : 'Mind you, ' + who() + ': not enough evidence yet. That is not “nothing”: a longer record might reveal what this one cannot.';
  }
  function advance(to) {
    if (!ev || !ev.site) return;
    ev.step = to;
    if (!ev.demo && to >= 2) { state.proofs[ev.key] = Math.max(state.proofs[ev.key] || 0, to - 1); save(); $('ev-board').innerHTML = boardHTML(); }
    paintEvidence();
  }
  function testPeriod() {
    var site = ev.site, key = ev.key, i = +$('ev-range').value, start = site.points[i].year, label = $('ev-range-label');
    label.textContent = 'Testing ' + start + '–' + site.end_year + '…';
    var ticket = ev.ticket = (ev.ticket || 0) + 1;                       // only the newest request may update the screen
    getJSON(API + '/sites/' + site.id + '/trend/?start=' + start + '&end=' + site.end_year).then(function (r) {
      if (!ev || ev.key !== key || ev.ticket !== ticket) return;
      ev.cur = { slope: r.slope_per_decade, p: r.p_value, sig: r.is_significant, start: r.start, end: r.end, n: r.n_points, isFull: r.start === site.start_year && r.end === site.end_year };
      paintEvidence();
    }).catch(function (e) {
      if (!ev || ev.ticket !== ticket) return;
      label.textContent = e.status === 400 ? 'Pick at least 5 years to see a trend.' : failText(e);
    });
  }
  function showTable() {
    var v = ev.v, rows = ev.site.points.map(function (q) { return '<tr><td>' + q.year + '</td><td>' + valueText(v, q.value) + '</td></tr>'; }).join('');
    openModal(v.title + ' in ' + inPlace(ev.p) + ', one value per year', '<div class="scroll"><table class="data"><thead><tr><th>Year</th><th>' + esc(v.unit) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
  }
  function afterCase() {          // where "Continue Investigating" leads
    var vKey = ev ? ev.v.key : state.varKey;
    if (vKey && varDone(vKey) && !state.compared[vKey]) return go('compare/' + vKey);
    if (allSolved() && !state.celebrated) return go('celebrate');
    state.placeKey = null; go('choose');
  }

  // ---------- demo: Marlene solves one case by herself ----------
  function startDemo() { state.demoPending = true; state.varKey = 'ppt'; state.placeKey = 'sahel'; go('evidence'); }
  function runDemo() {            // called by the Evidence Room once the case has loaded
    ev.demo = true; ev.step = 0; ev.cur = full(ev.site); paintEvidence(); show('demo-banner', true);
    [2200, 5200, 8600, 12200].forEach(function (ms, i) { demoTimers.push(setTimeout(function () { if (ev && ev.demo) { ev.step = i + 1; paintEvidence(); } }, ms)); });
  }
  function stopDemo(silent) {
    demoTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); demoTimers = [];
    show('demo-banner', false);
    if (ev && ev.demo) { ev.demo = false; if (!silent) { ev.step = state.proofs[ev.key] ? state.proofs[ev.key] + 1 : 0; ev.cur = full(ev.site); paintEvidence(); } }
  }

  // ---------- one case file (the summary of a solved case) ----------
  function caseNumber(key) { var n = 0; cases().forEach(function (c, i) { if (c.key === key) n = i + 1; }); return ('00' + n).slice(-3); }
  function renderFile(key) {
    var c = cases().filter(function (x) { return x.key === key; })[0], box = $('file-stage');
    if (!c) return go('files');
    if (!solved(key)) { state.varKey = c.v.key; state.placeKey = c.p.key; return go('evidence'); }
    box.innerHTML = '<p class="page-wait" style="left:85px;top:200px">' + WAIT + '</p>';
    loadSite(key).then(function (site) {
      if (route.id !== 'file' || route.arg !== key) return;
      var v = c.v, p = c.p, f = full(site), up = f.slope > 0, warn = isNileModel(v.key, p.key);
      var pill = function (t, x, y) { return '<h2 class="pill" style="left:' + x + 'px;top:' + y + 'px">' + t + '</h2>'; };
      var card = function (x, y, w, h, html, cls) { return '<div class="fcard ' + (cls || '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px">' + html + '</div>'; };
      box.innerHTML = '<div style="position:absolute;left:85px;top:22px">' + brand() + '</div><div class="rule rule--orange" style="left:87px;top:78px;width:320px"></div>' +
        '<h1 class="page-title" style="left:85px;top:80px">Case File ' + caseNumber(key) + '#</h1>' +
        '<p class="page-sub" style="left:89px;top:140px">' + esc(v.title.toUpperCase() + ' · ' + p.label.replace(/^The /, '').toUpperCase() + ' · ' + site.start_year + '–' + site.end_year) + '</p>' +
        pill('01 – CASE SUMMARY', 83, 188) + '<img class="abs" src="assets/globe-round.png" alt="" style="left:84px;top:232px;width:118px">' +
        card(214, 234, 502, 110, '<p class="small">Our investigation focuses on the long-term trend of ' + esc(v.title.toLowerCase()) + ' in ' + esc(inPlace(p)) + ' (' + p.boxText + ', land only) and whether it shows a significant change over time. ' + esc(p.about) + '</p>') +
        pill('02 – EVIDENCE COLLECTED', 83, 361) +
        card(83, 406, 202, 171, '<b class="pf">PROOF 1</b><span>The Scene</span><figure class="thumb">' + photoHTML(key, p) + '</figure>') +
        card(294, 406, 203, 171, '<b class="pf">PROOF 2</b><span>The Timeline</span><div class="thumb" id="file-mini"></div>') +
        card(507, 406, 202, 171, '<b class="pf">PROOF 3</b><span>The Interpretation</span><div class="thumb thumb--verdict ' + (f.sig ? 'is-sig' : 'is-wait') + '">' + (f.sig ? '✔' : '⌛') + '<small>' + pText(f.p) + '</small></div>') +
        pill('03 – STATISTICAL FINDINGS', 83, 595) +
        card(83, 645, 202, 96, '<b class="lbl">Trend</b><span class="big">' + (f.sig ? (up ? '↑ Increasing' : '↓ Decreasing') : 'Not clear yet') + '</span>') +
        card(294, 645, 203, 96, '<b class="lbl">Slope</b><span class="big">' + slopeText(v, f.slope) + '</span><small>per decade</small>') +
        card(507, 645, 202, 96, '<b class="lbl">P-value</b><span class="big">' + minus(f.p < 0.001 ? '< 0.001' : f.p.toFixed(4)) + '</span>') +
        pill('04 – FINAL VERDICT', 736, 188) +
        '<div class="verdict verdict--big ' + (f.sig ? 'is-sig' : 'is-wait') + '" style="left:737px;top:235px;width:278px;height:109px"><span aria-hidden="true">' + (f.sig ? '✔' : '⌛') + '</span><div><strong>' + verdictText(f.sig).replace(' ', '<br>') + '</strong></div></div>' +
        card(1032, 235, 343, 109, '<p>' + (f.sig ? esc(v.title + ' in ' + inPlace(p) + ' has shown a significant ' + (up ? 'increasing' : 'decreasing') + ' trend from ' + site.start_year + ' to ' + site.end_year + '.')
          : 'The readings cannot rule out luck. A longer record might change this verdict.') + '</p>') +
        pill('05 — CONCLUSION', 736, 361) +
        card(737, 406, 638, 164, '<p>' + (f.sig ? 'Our data show a statistically significant ' + (up ? 'increase' : 'decrease') + ' in ' + esc(v.title.toLowerCase()) + ' over ' + site.start_year + '–' + site.end_year + ': about ' + slopeText(v, f.slope) + ' per decade, or ' + signed(f.pct, 1) + '% of the average. However, the statistical trend alone cannot establish its causes.'
          : 'The line through the readings tilts ' + (up ? 'up' : 'down') + ' by ' + slopeText(v, f.slope) + ' per decade, but ' + pText(f.p) + ' is above 0.05, so the data cannot rule out luck. That is not the same as nothing happening: a longer record might reveal what a short one cannot.') + '</p>') +
        pill('06 — SOURCES &amp; LIMITATIONS', 736, 595) +
        card(737, 645, 631, 96, '<ul class="small"><li><b>Source:</b> ' + esc(v.dataset) + ', NASA GES DISC.' + (site.source_link ? ' <a href="' + esc(site.source_link) + '" target="_blank" rel="noopener">Dataset record</a>' : '') + '</li><li><b>Limitation:</b> ' +
          (warn ? esc(MF.NILE_WARNING) : 'The analysis identifies a trend, but does not establish its cause.' + (v.modelled ? ' ' + MF.MODEL_NOTE : '')) + '</li></ul>') +
        '<h2 class="pill pill--note" style="left:83px;top:754px">07 —<br>MARLENE’S<br>FINAL NOTE</h2>' +
        card(241, 758, 1133, 87, '<img class="fcard__face" src="assets/marlene-portrait.png" alt="Marlene"><div><b class="lbl">Marlene</b><p>“Well, ' + esc(who()) + ', the evidence has spoken. But remember, every conclusion has its limits. A good investigator knows the difference between what the data reveals and what it cannot tell us.”</p></div>', 'fcard--note') +
        '<a class="btn btn--gold btn--sm" href="#choose" style="left:1224px;top:854px;width:150px;height:32px">Return To The Globe</a>' +
        '<a class="btn btn--cream btn--sm" href="#files" style="left:1060px;top:854px;width:150px;height:32px">All Case Files</a>';
      MF.lineChart($('file-mini'), { w: 184, h: 101, mini: true, series: [{ name: '', color: p.color, dots: true, faint: true, points: site.points.map(function (q) { return { x: q.year, y: shown(v, q.value) }; }) }] });
    }).catch(function (e) { box.innerHTML = '<p class="page-wait" style="left:85px;top:200px">' + failText(e) + '</p>'; });
  }

  // ---------- investigation files (all the cases) ----------
  function renderFiles() {
    var h = '';
    VARS.forEach(function (v, col) {
      PLACES.forEach(function (p, row) {
        if (isHidden(v.key, p.key)) return;
        var key = ck(v.key, p.key), done = solved(key), x = [230, 574, 916][col], y = [275, 431, 587][row];
        h += '<article class="filecard" style="left:' + x + 'px;top:' + y + 'px"><span class="filecard__no">CASE FILE ' + caseNumber(key) + '#</span>' +
          '<span class="filecard__status ' + (done ? 'is-done' : '') + '">' + (done ? '✔ Completed' : '<img src="assets/lock.png" alt=""> Closed') + '</span>' +
          '<h3>' + esc(v.cardTitle || v.title.toUpperCase()) + '</h3><p>' + icon(p) + esc(p.label.replace(/^The /, '').toUpperCase()) + '</p>' +
          '<button class="btn btn--cta btn--sm" data-key="' + key + '" data-done="' + (done ? 1 : 0) + '">' + (done ? 'Open Case File' : 'Start Investigate') + '</button></article>';
      });
    });
    $('files-grid').innerHTML = h;
    show('files-final', allSolved());
    Array.prototype.forEach.call($('files-grid').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-key').split('-');
        if (b.getAttribute('data-done') === '1') return go('file/' + k.join('-'));
        state.varKey = k[0]; state.placeKey = k[1]; go('evidence');
      });
    });
  }

  // ---------- comparison of the three regions for one variable ----------
  function pageHead(title, sub) { return brand() + '<div class="rule rule--orange rule--flow"></div><h1 class="page-title page-title--flow">' + title + '</h1>' + (sub ? '<p class="page-sub page-sub--flow">' + sub + '</p>' : ''); }
  function says(text) { return '<div class="says"><img src="assets/marlene-portrait.png" alt="Marlene"><p>' + text + '</p></div>'; }
  function legendHTML() { return '<div class="legend">' + PLACES.map(function (p) { return '<span><i style="background:' + p.color + '"></i>' + icon(p) + esc(p.label) + '</span>'; }).join('') + '</div>'; }
  function seriesFor(v, list, sites) { return list.map(function (c, i) { return { name: c.p.label.replace(/^The /, ''), color: c.p.color, points: sites[i].points.map(function (q) { return { x: q.year, y: shown(v, q.value) }; }) }; }); }
  function tipFor(c, site, f) {
    return '<b>' + esc(c.p.label + ', ' + c.v.title) + '</b><br>Average: ' + valueText(c.v, f.mean) + '<br>Change per decade: ' + slopeText(c.v, f.slope) + ' (' + signed(f.pct, 1) + '%)<br>' + pText(f.p) + '<br>' + verdictText(f.sig);
  }
  function renderCompare(vKey) {
    var v = byKey(VARS, vKey) || VARS[0], list = cases().filter(function (c) { return c.v.key === v.key; }), box = $('compare-sheet');
    var fromFinal = state.cmpFrom === 'final';
    box.innerHTML = pageHead(esc(v.title) + ': the three places side by side') + '<p class="page-wait">' + WAIT + '</p>';
    loadMany(list).then(function (sites) {
      if (route.id !== 'compare') return;
      var fs = sites.map(full), nSig = fs.filter(function (f) { return f.sig; }).length;
      var line = nSig === 0 ? 'Three places, one kind of water, and not one of them gives us enough evidence yet.'
        : nSig === fs.length ? 'Three places, one kind of water, and every one shows a significant trend. Agreement is a clue too.'
        : 'Three places, one kind of water. Look how differently they behave.';
      box.innerHTML = pageHead(esc(v.title) + ': the three places side by side', esc(v.title.toUpperCase()) + ' · ' + sites[0].start_year + '–' + sites[0].end_year) + says(esc(line)) +
        '<div class="grid2"><section class="pcard"><h2 class="pill pill--flow">YEAR BY YEAR</h2>' + legendHTML() + '<div id="cmp-lines" class="chart"></div><p class="cap">One value per year, in ' + esc(v.unit) + '. All three places share one axis.</p></section>' +
        '<section class="pcard"><h2 class="pill pill--flow">CHANGE PER DECADE</h2><div id="cmp-bars" class="chart"></div><p class="cap">As a percent of each place’s own average, so a dry place and a wet place can be compared fairly. A bar is solid only if p is below 0.05.</p></section></div>' +
        '<section class="pcard"><h2 class="pill pill--flow">THE THREE VERDICTS</h2><table class="data data--wide"><thead><tr><th>Place</th><th>Average</th><th>Change per decade</th><th>p-value</th><th>Verdict</th></tr></thead><tbody>' +
        list.map(function (c, i) { return '<tr><th scope="row">' + icon(c.p) + esc(c.p.label) + '</th><td>' + valueText(v, fs[i].mean) + '</td><td>' + slopeText(v, fs[i].slope) + ' (' + signed(fs[i].pct, 1) + '%)</td><td>' + pText(fs[i].p) + '</td><td>' + badge(fs[i].sig) + '</td></tr>'; }).join('') +
        '</tbody></table>' + (v.modelled ? '<p class="cap">' + MF.MODEL_NOTE + (list.some(function (c) { return c.p.key === 'nile'; }) ? ' For the Nile Delta the model ignores irrigation, so it describes a rain-only Delta.' : '') + '</p>' : '') + '</section>' +
        '<div class="actions"><button class="btn btn--gold" id="cmp-continue">' + (fromFinal ? 'Back to the final board' : 'Continue') + '</button></div>';
      MF.lineChart($('cmp-lines'), { w: 620, h: 300, unit: v.unit, endLabels: true, title: v.title + ' per year in the three places', series: seriesFor(v, list, sites), fmt: function (y) { return minus(y.toFixed(1)); } });
      MF.barChart($('cmp-bars'), { w: 480, h: 300, gap: 92, unit: '%', title: 'Change per decade as a percent of the average', groups: [{ label: v.title, bars: list.map(function (c, i) {
        return { color: c.p.color, value: fs[i].pct, sig: fs[i].sig, label: signed(fs[i].pct, 1) + '%', note: c.p.label.replace(/^The /, ''), tip: tipFor(c, sites[i], fs[i]) }; }) }] });
      $('cmp-continue').addEventListener('click', function () {
        state.cmpFrom = null;
        if (fromFinal) return go('final');
        state.compared[v.key] = true; save();
        if (allSolved() && !state.celebrated) return go('celebrate');
        state.placeKey = null; go('choose');
      });
    }).catch(function (e) { box.innerHTML = pageHead(esc(v.title)) + '<p class="page-wait">' + failText(e) + '</p>'; });
  }

  // ---------- celebration and the treasure box ----------
  function renderCelebrate() {
    var n = cases().length;
    $('celebrate-sheet').innerHTML = '<p class="stars" aria-hidden="true">★ ★ ★</p><h1 class="hero-title hero-title--flow">Case Solved, Detective!</h1>' +
      '<p class="hero-lead hero-lead--flow">' + (allSolved() ? 'All ' + countWord(n) + ' proofs now rest safely in your case file.' : 'You have solved ' + solvedCount() + ' of ' + n + ' cases so far. The box opens when the file is full.') + '</p>' +
      '<button class="chest" id="chest" aria-label="Open the treasure box"><i class="chest__lid"></i><i class="chest__body"></i><span>Open the treasure box</span></button>';
    $('chest').addEventListener('click', function () {
      $('chest').classList.add('is-open'); state.celebrated = true; save();
      setTimeout(function () { go('final'); }, 900);
    });
  }

  // ---------- the final conclusion page ----------
  function renderFinal() {
    var box = $('final-sheet'), list = cases();
    if (!allSolved() && !state.peek && !DEV) {
      box.innerHTML = pageHead('The mystery, solved') + says('The treasure box stays shut until every case is solved, ' + esc(who()) + '. You have ' + solvedCount() + ' of ' + list.length + '.') +
        '<div class="actions"><a class="btn btn--gold" href="#choose">Back to the globe</a><button class="btn btn--cream" id="peek">Open it anyway</button></div>';
      $('peek').addEventListener('click', function () { state.peek = true; renderFinal(); });
      return;
    }
    box.innerHTML = pageHead('The mystery, solved') + '<p class="page-wait">' + WAIT + '</p>';
    loadMany(list).then(function (sites) {
      if (route.id !== 'final') return;
      var fs = sites.map(full), sig = list.filter(function (c, i) { return fs[i].sig; });
      var at = function (v, p) { var i = -1; list.forEach(function (c, k) { if (c.v.key === v.key && c.p.key === p.key) i = k; }); return i; };
      var words = function (a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0]; };
      var perPlace = PLACES.map(function (p) {
        var yes = [], no = [];
        VARS.forEach(function (v) { var i = at(v, p); if (i < 0) return; (fs[i].sig ? yes : no).push(v.title.toLowerCase()); });
        return '<li>' + icon(p) + '<b>' + esc(p.label) + ':</b> ' + (!no.length ? 'every clue shows a significant trend.' : !yes.length ? 'not enough evidence yet for any clue.' : 'significant for ' + words(yes) + '; not enough evidence yet for ' + words(no) + '.') + '</li>';
      }).join('');
      var h = pageHead('The mystery, solved', 'ALL ' + countWord(list.length).toUpperCase() + ' CASES · ' + sites[0].start_year + '–' + sites[0].end_year) +
        says('Our data show ' + countWord(sig.length) + ' significant trends out of ' + countWord(list.length) + ' cases, ' + esc(who()) + '. Same water cycle, different answers: the data decides, not the hunch.');
      // 1. three variable comparisons
      h += '<section class="pcard"><h2 class="pill pill--flow">01 – THE THREE CLUES, SIDE BY SIDE</h2>' + legendHTML() + '<div class="grid3">' + VARS.map(function (v) {
        return '<button class="pinned" data-var="' + v.key + '"><img src="assets/pin.png" alt=""><b>' + esc(v.title) + '</b><div class="chart" id="fin-' + v.key + '"></div><small>' + esc(v.unit) + ' · click to enlarge</small></button>'; }).join('') + '</div></section>';
      // 2. the table of all cases
      h += '<section class="pcard"><h2 class="pill pill--flow">02 – EVERY CASE AT A GLANCE</h2><table class="data data--wide data--grid"><thead><tr><th></th>' + VARS.map(function (v) { return '<th>' + esc(v.title) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        PLACES.map(function (p) { return '<tr><th scope="row">' + icon(p) + esc(p.label) + '</th>' + VARS.map(function (v) { var i = at(v, p); return i < 0 ? '<td>not in play</td>' : '<td><span class="pnum">p = ' + fs[i].p.toFixed(4) + '</span>' + badge(fs[i].sig) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
        '<details class="more"><summary>Show the full detail for each case</summary><table class="data data--wide"><thead><tr><th>Case</th><th>Average</th><th>Change per decade</th><th>As % of average</th><th>p-value</th><th>Verdict</th><th>Years</th></tr></thead><tbody>' +
        list.map(function (c, i) { return '<tr><th scope="row">' + esc(c.p.label + ', ' + c.v.title) + '</th><td>' + valueText(c.v, fs[i].mean) + '</td><td>' + slopeText(c.v, fs[i].slope) + '</td><td>' + signed(fs[i].pct, 1) + '%</td><td>' + fs[i].p.toFixed(4) + '</td><td>' + verdictText(fs[i].sig) + '</td><td>' + sites[i].start_year + '–' + sites[i].end_year + '</td></tr>'; }).join('') + '</tbody></table></details></section>';
      // 3. the final bar chart
      h += '<section class="pcard"><h2 class="pill pill--flow">03 – SAME WATER CYCLE, DIFFERENT ANSWERS</h2><p class="cap cap--lead">Change per decade, as a percent of each case’s own average, so rain, evaporation and soil moisture can share one scale.</p>' + legendHTML() +
        '<div class="legend"><span><i class="sw sw--solid"></i>★ Statistically significant (solid)</span><span><i class="sw sw--hatch"></i>Not enough evidence yet (hatched)</span></div>' +
        '<div id="fin-bars" class="chart chart--wide"></div><p class="cap">A bar is solid only if p is below 0.05. Hover over a bar for the real numbers. Our data show these results; they do not prove a general law.</p>' +
        '<p class="sr-only">' + list.map(function (c, i) { return c.p.label + ', ' + c.v.title + ': ' + signed(fs[i].pct, 1) + ' percent per decade, ' + pText(fs[i].p) + ', ' + verdictText(fs[i].sig) + '.'; }).join(' ') + '</p></section>';
      // 4. the conclusion
      h += '<section class="pcard"><h2 class="pill pill--flow">04 – WHAT THE EVIDENCE SAYS</h2><p><b>' + sig.length + ' of ' + list.length + ' cases came out statistically significant.</b></p><ul class="plainlist">' + perPlace + '</ul>' +
        '<h3 class="sub">What you learned as a detective</h3><ol class="lessons"><li>A trend is not proof. The p-value tells us how far to trust it, and below 0.05 counts as significant.</li><li>“Not enough evidence yet” is not “nothing”. A longer record might reveal what a short one cannot.</li><li>Places differ. The same cause can show different outcomes, so always check the region.</li></ol></section>';
      // 5. the challenge checklist
      h += '<section class="pcard"><h2 class="pill pill--flow">05 – BE AN EARTH SYSTEM TREND DETECTIVE</h2><p class="cap cap--lead">The five steps of the NASA challenge, which you completed for every case:</p><ol class="checks">' + TRACK.map(function (t) { return '<li>✔ ' + t + '</li>'; }).join('') + '</ol></section>';
      // 6. honest notes
      h += '<section class="pcard"><h2 class="pill pill--flow">06 – HONEST NOTES</h2><ul class="plainlist plainlist--notes"><li>Evapotranspiration and soil moisture are model output, not direct measurements.</li>' +
        '<li>The three Sahel results are not three separate proofs: the same rainfall drives all three.</li>' +
        '<li>Nile Delta evapotranspiration and soil moisture are “check what the instrument can see” cases: the model ignores irrigation.</li>' +
        '<li>We ran ' + countWord(list.length) + ' tests at the 5% level, so one false positive is possible by chance.</li><li id="fin-fragile">Results can change with the start year.</li></ul></section>';
      // 7. buttons
      h += '<div class="actions"><a class="btn btn--gold" href="#choose">Open a case of your own</a><button class="btn btn--cta" id="fin-new">Begin a new case</button><a class="btn btn--cream" href="#connect">See how the clues connect</a><a class="btn btn--cream" href="#credits">Credits</a></div>';
      box.innerHTML = h;

      VARS.forEach(function (v) {
        var sub = list.filter(function (c) { return c.v.key === v.key; }), ss = sub.map(function (c) { return sites[list.indexOf(c)]; });
        MF.lineChart($('fin-' + v.key), { w: 330, h: 170, mini: true, series: seriesFor(v, sub, ss) });
      });
      Array.prototype.forEach.call(box.querySelectorAll('.pinned'), function (b) { b.addEventListener('click', function () { state.cmpFrom = 'final'; go('compare/' + b.getAttribute('data-var')); }); });
      MF.barChart($('fin-bars'), { w: 1040, h: 380, gap: 46, unit: '%', title: 'Change per decade as a percent of the average, for every case',
        groups: VARS.map(function (v) { return { label: v.title, bars: PLACES.filter(function (p) { return at(v, p) >= 0; }).map(function (p) {
          var i = at(v, p); return { color: p.color, value: fs[i].pct, sig: fs[i].sig, label: signed(fs[i].pct, 1) + '%', note: 'p ' + (fs[i].p < 0.001 ? '< 0.001' : '= ' + fs[i].p.toFixed(3)), tip: tipFor(list[i], sites[i], fs[i]) }; }) }; }) });
      $('fin-new').addEventListener('click', function () {
        if (!window.confirm('Begin again? This empties your case file.')) return;
        state.proofs = {}; state.compared = {}; state.celebrated = false; state.varKey = state.placeKey = null; state.peek = false; save(); go('choose');
      });
      // the start-year lesson, read live from the trend endpoint
      var k = at(VARS[1], PLACES[0]);
      if (k >= 0) getJSON(API + '/sites/' + sites[k].id + '/trend/?start=1995&end=' + sites[k].end_year).then(function (r) {
        var li = $('fin-fragile'); if (!li) return;
        li.textContent = 'Results can change with the start year. Mediterranean evapotranspiration: from ' + sites[k].start_year + ', ' + pText(fs[k].p) + ' (' + verdictText(fs[k].sig).toLowerCase() + '). From 1995, ' + pText(r.p_value) + ' (' + verdictText(r.is_significant).toLowerCase() + '). A result that disappears with a small change is fragile.';
      }).catch(function () { /* the general sentence stays */ });
    }).catch(function (e) { box.innerHTML = pageHead('The mystery, solved') + '<p class="page-wait">' + failText(e) + '</p>'; });
  }

  // ---------- one water cycle ----------
  function renderConnect() {
    var shownN = 1, box = $('connect-sheet');
    function paint() {
      box.innerHTML = pageHead('One Water Cycle', 'BACKGROUND FROM PUBLISHED SCIENCE, NOT PROVEN BY OUR TESTS') +
        '<div class="cycle">' + MF.CYCLE.slice(0, shownN).map(function (c, i) { return (i ? '<span class="cycle__arrow" aria-hidden="true">↓</span>' : '') + '<article class="pcard cycle__card"><b>' + (i + 1) + '</b><div><h3>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p></div></article>'; }).join('') + '</div>' +
        '<div class="actions">' + (shownN < MF.CYCLE.length ? '<button class="btn btn--gold" id="cycle-next">Follow the next clue</button>' : '<a class="btn btn--gold" href="#final">Back to the final board</a>') + '</div>';
      var n = $('cycle-next'); if (n) n.addEventListener('click', function () { shownN += 1; paint(); });
    }
    paint();
  }

  // ---------- credits ----------
  function renderCredits() {
    $('credits-sheet').innerHTML = pageHead('Credits') +
      '<section class="pcard"><h2 class="pill pill--flow">DATA</h2><p>Uses NASA data: GPCP Monthly V3.3 (precipitation, <a href="https://doi.org/10.5067/MEASURES/GPCP/DATA306" target="_blank" rel="noopener">doi:10.5067/MEASURES/GPCP/DATA306</a>) and FLDAS Noah V001 (evapotranspiration and soil moisture, <a href="https://doi.org/10.5067/5NHC22T9375G" target="_blank" rel="noopener">doi:10.5067/5NHC22T9375G</a>), both from NASA GES DISC. Years 1990–2020, one value per year, land only.</p>' +
      '<p>Trends are tested with the Mann–Kendall test and Sen’s slope. Significant means p below 0.05.</p><p class="cap">This is a student project for the NASA Space Apps Challenge 2026. NASA did not make or approve this app.</p></section>' +
      '<section class="pcard"><h2 class="pill pill--flow">PICTURES</h2><table class="data data--wide"><thead><tr><th>Picture</th><th>Credit</th></tr></thead><tbody>' +
      Object.keys(MF.PHOTOS).map(function (k) { return '<tr><td>' + esc(MF.PHOTOS[k].alt) + '</td><td>' + esc(MF.PHOTOS[k].credit) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="cap">Character art, backgrounds and interface design by the Marlene File team.</p></section>' +
      '<div class="actions"><a class="btn btn--gold" href="#intro">Back to the start</a></div>';
  }

  // ---------- developer menu (open the site with ?dev=1) ----------
  function setupDev() {
    var d = $('dev'); d.hidden = false;
    d.innerHTML = '<label>Jump to <select id="dev-jump">' + STAGES.concat(PAGES).map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></label>' +
      '<button id="dev-solve">Solve all</button><button id="dev-reset">Reset</button>';
    $('dev-jump').addEventListener('change', function () { var id = this.value; if (id === 'evidence' && !state.varKey) { state.varKey = 'ppt'; state.placeKey = 'sahel'; } go(id === 'compare' ? 'compare/ppt' : id === 'file' ? 'file/ppt-sahel' : id); });
    $('dev-solve').addEventListener('click', function () { cases().forEach(function (c) { state.proofs[c.key] = 3; }); VARS.forEach(function (v) { state.compared[v.key] = true; }); save(); render(); });
    $('dev-reset').addEventListener('click', function () { state.proofs = {}; state.compared = {}; state.celebrated = false; save(); render(); });
  }

  // ---------- restart ----------
  function restartCase() {         // this case only: back to the sealed paper, its proofs leave the case file
    if (!ev || !ev.site || !window.confirm('Restart this case from the sealed paper? Its proofs leave your case file.')) return;
    stopDemo(true);
    delete state.proofs[ev.key]; state.compared[ev.v.key] = false; state.celebrated = false; save();
    ev.step = 0; ev.ticket = (ev.ticket || 0) + 1; ev.cur = full(ev.site); $('ev-range').value = 0;
    $('ev-board').innerHTML = boardHTML(); paintEvidence();
  }
  function startOver() {           // the whole game: name and every case cleared, back to the Welcome page
    if (!window.confirm('Start the whole investigation again from the first page? Your name and every solved case will be cleared.')) return;
    stopDemo(true);
    state.name = ''; state.proofs = {}; state.compared = {}; state.celebrated = false; state.varKey = state.placeKey = null; state.peek = false; save();
    go('intro');
  }

  // ---------- start ----------
  load();
  if (DEV) setupDev();
  $('meet-next').addEventListener('click', function () { show('meet-1', false); show('meet-2', true); $('name-input').value = state.name; $('name-input').focus(); });
  $('meet-2').addEventListener('submit', function (e) { e.preventDefault(); var n = $('name-input').value.trim(); state.name = n.charAt(0).toUpperCase() + n.slice(1); save(); go('office'); });
  $('office-globe').addEventListener('click', function () { go('choose'); });
  $('open-case').addEventListener('click', function () { go('evidence'); });
  $('demo-btn').addEventListener('click', startDemo);
  $('demo-stop').addEventListener('click', function () { stopDemo(false); });
  $('ev-seal').addEventListener('click', function () { advance(1); });
  $('ev-p1').addEventListener('click', function () { advance(2); });
  $('ev-p2').addEventListener('click', function () { advance(3); });
  $('ev-p3').addEventListener('click', function () { advance(4); });
  $('ev-range').addEventListener('input', function () { var s = ev.site, i = +this.value; $('ev-range-label').textContent = 'Choose your time period: from ' + s.points[i].year + ' (point ' + (i + 1) + ' of ' + s.points.length + ')'; });
  $('ev-range').addEventListener('change', testPeriod);
  $('ev-period').addEventListener('submit', function (e) { e.preventDefault(); });
  $('ev-table-btn').addEventListener('click', showTable);
  $('ev-open-file').addEventListener('click', function () { go('file/' + ev.key); });
  $('ev-continue').addEventListener('click', afterCase);
  $('ev-restart').addEventListener('click', restartCase);
  $('choose-restart').addEventListener('click', startOver);
  $('modal-close').addEventListener('click', closeModal);
  $('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', render);
  // A first-time visitor always starts at the Welcome page, even if the link they were sent
  // ends in a later screen such as "#final". Returning players keep their place.
  var isNewVisitor = !state.name && !Object.keys(state.proofs).length;
  if (isNewVisitor && !DEV && location.hash && location.hash !== '#intro') history.replaceState(null, '', location.pathname + location.search + '#intro');
  fit(); render();
  preloadImages(['bg-space.jpg', 'paper.png', 'marlene-wave.png', 'marlene-think.png', 'bg-office.jpg', 'globe-stand.png', 'globe-round.png',
    'corkboard.png', 'bg-evidence.jpg', 'evidence-paper.png', 'envelope-closed.png', 'marlene-portrait.png', 'bg-casefile.jpg', 'bg-files.jpg']);
})();

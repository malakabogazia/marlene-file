/* Charts for the Marlene File, drawn as SVG from API data. Two kinds: line charts and bar charts. */
window.MF = window.MF || {};
(function () {
  'use strict';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function tickText(v, step) {
    var d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    return v.toFixed(d).replace('-', '−');
  }

  // One shared tooltip for every chart.
  var tip = null;
  function showTip(html, ev) {
    tip = tip || document.getElementById('tip');
    tip.innerHTML = html; tip.hidden = false;
    var w = tip.offsetWidth, x = Math.min(window.innerWidth - w - 8, Math.max(8, ev.clientX - w / 2));
    tip.style.left = x + 'px'; tip.style.top = (ev.clientY - tip.offsetHeight - 14) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  MF.showTip = showTip; MF.hideTip = hideTip;

  /* Line chart.
     opt.series: [{ name, color, points: [{x, y}], faint }]   (y already in display units)
     opt.trend:  { slope, intercept, start, end }             (optional; drawn for the first series)
     opt.unit, opt.title, opt.w, opt.h, opt.mini, opt.endLabels, opt.fmt(value) */
  MF.lineChart = function (box, opt) {
    var W = opt.w || 640, H = opt.h || 300, mini = !!opt.mini;
    var m = mini ? { t: 6, r: 6, b: 6, l: 6 } : { t: 12, r: opt.endLabels ? 96 : 14, b: 26, l: 46 };
    var all = [], xs = opt.series[0].points.map(function (p) { return p.x; });
    opt.series.forEach(function (s) { s.points.forEach(function (p) { all.push(p.y); }); });
    var x0 = xs[0], x1 = xs[xs.length - 1], lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (opt.zero) lo = Math.min(lo, 0);
    var step = niceStep((hi - lo || 1) / 4);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step; if (hi === lo) hi = lo + step;
    function X(v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - lo) / (hi - lo) * (H - m.t - m.b); }
    var fmt = opt.fmt || function (v) { return tickText(v, step / 10); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.title || '') + '">';
    if (!mini) {
      for (var g = lo; g <= hi + step / 2; g += step) {
        s += '<line class="c-grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/>' +
          '<text class="c-axis" x="' + (m.l - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end">' + tickText(g, step) + '</text>';
      }
      xs.forEach(function (yr) {
        if (yr % 5 === 0) s += '<line class="c-grid" x1="' + X(yr) + '" x2="' + X(yr) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/>' +
          '<text class="c-axis" x="' + X(yr) + '" y="' + (H - 8) + '" text-anchor="middle">' + yr + '</text>';
      });
      s += '<path class="c-frame" d="M' + m.l + ' ' + m.t + 'V' + (H - m.b) + 'H' + (W - m.r) + '"/>';
      if (opt.unit) s += '<text class="c-axis" x="' + (m.l + 6) + '" y="' + (m.t + 10) + '">' + esc(opt.unit) + '</text>';
    }
    var t = opt.trend;
    if (t && (t.start !== x0 || t.end !== x1)) {
      s += '<rect class="c-band" x="' + X(t.start) + '" y="' + m.t + '" width="' + (X(t.end) - X(t.start)) + '" height="' + (H - m.t - m.b) + '"/>';
    }
    var ends = [];
    opt.series.forEach(function (sr) {
      var d = sr.points.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join('');
      s += '<path class="c-line' + (sr.faint ? ' c-line--faint' : '') + '" stroke="' + sr.color + '" d="' + d + '"/>';
      if (sr.dots) sr.points.forEach(function (p) { s += '<circle class="c-dot" r="' + (mini ? 2 : 3.2) + '" fill="' + sr.color + '" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '"/>'; });
      var last = sr.points[sr.points.length - 1];
      if (!sr.dots && !mini) s += '<circle class="c-dot" r="4" fill="' + sr.color + '" cx="' + X(last.x) + '" cy="' + Y(last.y) + '"/>';
      ends.push({ y: Y(last.y), name: sr.name });
    });
    if (t) {
      s += '<line class="c-trend" x1="' + X(t.start) + '" y1="' + Y(t.intercept + t.slope * t.start) + '" x2="' + X(t.end) + '" y2="' + Y(t.intercept + t.slope * t.end) + '"/>';
    }
    if (opt.endLabels && !mini) {            // direct labels at the line ends, nudged apart so they never overlap
      ends.sort(function (a, b) { return a.y - b.y; });
      for (var i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
      ends.forEach(function (e) { s += '<text class="c-label" x="' + (W - m.r + 8) + '" y="' + (e.y + 4) + '">' + esc(e.name) + '</text>'; });
    }
    if (!mini) s += '<g class="c-hover" style="display:none"><line class="c-cross" y1="' + m.t + '" y2="' + (H - m.b) + '"/>' +
      opt.series.map(function (sr) { return '<circle class="c-dot" r="5" fill="' + sr.color + '"/>'; }).join('') + '</g>' +
      '<rect x="' + m.l + '" y="' + m.t + '" width="' + (W - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/>';
    box.innerHTML = s + '</svg>';
    if (mini) return;

    var svg = box.querySelector('svg'), hov = svg.querySelector('.c-hover'), dots = hov.querySelectorAll('circle');
    svg.addEventListener('pointermove', function (ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      var yr = Math.max(x0, Math.min(x1, Math.round(x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0))));
      var html = '<b>' + yr + '</b>';
      opt.series.forEach(function (sr, i) {
        var p = sr.points.filter(function (q) { return q.x === yr; })[0]; if (!p) return;
        dots[i].setAttribute('cx', X(p.x)); dots[i].setAttribute('cy', Y(p.y));
        html += '<br><i style="background:' + sr.color + '"></i>' + (opt.series.length > 1 ? esc(sr.name) + ': ' : '') + fmt(p.y) + ' ' + esc(opt.unit || '');
      });
      hov.style.display = ''; hov.querySelector('line').setAttribute('x1', X(yr)); hov.querySelector('line').setAttribute('x2', X(yr));
      showTip(html, ev);
    });
    svg.addEventListener('pointerleave', function () { hov.style.display = 'none'; hideTip(); });
  };

  /* Grouped bar chart of percentages (or any one unit).
     opt.groups: [{ label, bars: [{ name, color, value, sig, note, tip }] }]
     Solid bar = significant. Hatched, lighter bar = not enough evidence yet. */
  MF.barChart = function (box, opt) {
    var W = opt.w || 760, H = opt.h || 340, m = { t: 30, r: 14, b: 44, l: 46 };
    var vals = [0]; opt.groups.forEach(function (g) { g.bars.forEach(function (b) { vals.push(b.value); }); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), step = niceStep((hi - lo || 1) / 4);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step + step * 0.6;
    function Y(v) { return H - m.b - (v - lo) / (hi - lo) * (H - m.t - m.b); }
    var gw = (W - m.l - m.r) / opt.groups.length, uid = 'h' + Math.random().toString(36).slice(2, 7);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.title || '') + '"><defs>';
    var colors = {}; opt.groups.forEach(function (g) { g.bars.forEach(function (b) { colors[b.color] = 1; }); });
    Object.keys(colors).forEach(function (c, i) {
      s += '<pattern id="' + uid + i + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="' + c + '" opacity=".22"/><rect width="2.2" height="6" fill="' + c + '" opacity=".75"/></pattern>';
      colors[c] = uid + i;
    });
    s += '</defs>';
    for (var g = Math.ceil(lo / step) * step; g <= hi; g += step) {
      s += '<line class="c-grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/>' +
        '<text class="c-axis" x="' + (m.l - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end">' + tickText(g, step) + (opt.unit || '') + '</text>';
    }
    var hits = '';
    opt.groups.forEach(function (grp, gi) {
      var n = grp.bars.length, bw = Math.min(24, gw / (n + 2)), gap = opt.gap || 26, total = n * bw + (n - 1) * gap, start = m.l + gi * gw + (gw - total) / 2;
      grp.bars.forEach(function (b, bi) {
        var x = start + bi * (bw + gap), y0 = Y(0), y1 = Y(b.value), top = Math.min(y0, y1), h = Math.max(2, Math.abs(y1 - y0));
        var up = b.value >= 0, r = Math.min(4, h);
        var d = up ? 'M' + x + ' ' + y0 + 'V' + (top + r) + 'q0 -' + r + ' ' + r + ' -' + r + 'H' + (x + bw - r) + 'q' + r + ' 0 ' + r + ' ' + r + 'V' + y0 + 'Z'
          : 'M' + x + ' ' + y0 + 'V' + (top + h - r) + 'q0 ' + r + ' ' + r + ' ' + r + 'H' + (x + bw - r) + 'q' + r + ' 0 ' + r + ' -' + r + 'V' + y0 + 'Z';
        s += '<path d="' + d + '" fill="' + (b.sig ? b.color : 'url(#' + colors[b.color] + ')') + '"' + (b.sig ? '' : ' stroke="' + b.color + '" stroke-width="1"') + '/>';
        var ly = up ? top - 6 : top + h + 14;
        s += '<text class="c-label" text-anchor="middle" x="' + (x + bw / 2) + '" y="' + ly + '">' + (b.sig ? '★ ' : '') + esc(b.label) + '</text>';
        if (b.note) s += '<text class="c-axis" text-anchor="middle" x="' + (x + bw / 2) + '" y="' + (up ? ly - 13 : ly + 13) + '">' + esc(b.note) + '</text>';
        hits += '<rect class="c-hit" data-g="' + gi + '" data-b="' + bi + '" x="' + (x - gap / 2) + '" y="' + m.t + '" width="' + (bw + gap) + '" height="' + (H - m.t - m.b) + '" fill="transparent"/>';
      });
      s += '<text class="c-group" text-anchor="middle" x="' + (m.l + gi * gw + gw / 2) + '" y="' + (H - 12) + '">' + esc(grp.label) + '</text>';
    });
    s += '<line class="c-zero" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>' + hits + '</svg>';
    box.innerHTML = s;
    Array.prototype.forEach.call(box.querySelectorAll('.c-hit'), function (r) {
      var b = opt.groups[+r.getAttribute('data-g')].bars[+r.getAttribute('data-b')];
      r.addEventListener('pointermove', function (ev) { showTip(b.tip, ev); });
      r.addEventListener('pointerleave', hideTip);
    });
  };
})();

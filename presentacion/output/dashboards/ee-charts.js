/* Gráficas de los estudios estadísticos PATE. SVG sin dependencias.
   Paleta categórica validada (light, superficie blanca): verde, terracota, azul, ocre. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var PAL = ['#00806A', '#C2552E', '#3E63B0', '#9A6B00'];
  var GRID = '#E7E9EB', AXIS = '#6B7280', INK = '#1D1D1B', SURF = '#FFFFFF';
  var nf = function (d) { return new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var FMT = {
    int: function (v) { return nf(0).format(v); },
    dec1: function (v) { return nf(1).format(v); },
    dec2: function (v) { return nf(2).format(v); },
    pct0: function (v) { return nf(0).format(v) + '%'; },
    pct1: function (v) { return nf(1).format(v) + '%'; },
    pct2: function (v) { return nf(2).format(v) + '%'; },
    money2: function (v) { return (v < 0 ? '−$' : '$') + nf(2).format(Math.abs(v)); },
    money1: function (v) { return (v < 0 ? '−$' : '$') + nf(1).format(Math.abs(v)); },
    kg: function (v) { return (v < 0 ? '−' : '') + nf(0).format(Math.abs(v)) + ' kg'; },
    g: function (v) { return nf(0).format(v) + ' g'; }
  };
  function fmt(name) { return FMT[name] || FMT.int; }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, a) {
    var t = el('text', Object.assign({ x: x, y: y, fill: AXIS, 'font-size': 11, 'font-family': 'Inter, sans-serif' }, a || {}), parent);
    t.textContent = s; return t;
  }
  function niceTicks(min, max, n) {
    if (min === max) { max = min + 1; }
    var span = max - min, step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
    for (var v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }

  /* Contenedor: leyenda, lienzo, tooltip y tabla de datos */
  function frame(id, cfg) {
    var host = document.getElementById(id);
    host.classList.add('ee-chart');
    host.textContent = '';
    var items = cfg.legendItems || (cfg.series && cfg.series.length > 1 ? cfg.series.map(function (s, i) {
      return { name: s.name, color: s.color || PAL[i], kind: cfg.kind === 'line' ? 'ln' : 'bx' };
    }) : null);
    if (items) {
      var lg = document.createElement('div'); lg.className = 'ee-legend';
      items.forEach(function (s, i) {
        var it = document.createElement('span'); it.className = 'ee-key';
        var sw = document.createElement('i'); sw.style.background = s.color || PAL[i];
        sw.className = s.kind || 'bx';
        it.appendChild(sw); it.appendChild(document.createTextNode(s.name)); lg.appendChild(it);
      });
      host.appendChild(lg);
    }
    var wrap = document.createElement('div'); wrap.className = 'ee-canvas'; host.appendChild(wrap);
    var tip = document.createElement('div'); tip.className = 'ee-tip'; tip.hidden = true; wrap.appendChild(tip);
    if (cfg.table) host.appendChild(tableView(cfg.table));
    return { host: host, wrap: wrap, tip: tip };
  }
  function tableView(t) {
    var d = document.createElement('details'); d.className = 'ee-table';
    var s = document.createElement('summary'); s.textContent = 'Ver tabla de datos'; d.appendChild(s);
    var box = document.createElement('div'); box.className = 'ee-table-box';
    var tb = document.createElement('table'), th = document.createElement('thead'), tr = document.createElement('tr');
    t.head.forEach(function (h) { var c = document.createElement('th'); c.textContent = h; tr.appendChild(c); });
    th.appendChild(tr); tb.appendChild(th);
    var body = document.createElement('tbody');
    t.rows.forEach(function (r) {
      var row = document.createElement('tr');
      r.forEach(function (v) { var c = document.createElement('td'); c.textContent = v; row.appendChild(c); });
      body.appendChild(row);
    });
    tb.appendChild(body); box.appendChild(tb); d.appendChild(box); return d;
  }
  function showTip(f, x, y, title, rows) {
    var t = f.tip; t.textContent = '';
    var h = document.createElement('div'); h.className = 'tt-h'; h.textContent = title; t.appendChild(h);
    rows.forEach(function (r) {
      var row = document.createElement('div'); row.className = 'tt-r';
      if (r.color) { var k = document.createElement('i'); k.style.background = r.color; row.appendChild(k); }
      var v = document.createElement('b'); v.textContent = r.value; row.appendChild(v);
      if (r.name) { var n = document.createElement('span'); n.textContent = r.name; row.appendChild(n); }
      t.appendChild(row);
    });
    t.hidden = false;
    var W = f.wrap.clientWidth, tw = t.offsetWidth;
    t.style.left = Math.max(4, Math.min(W - tw - 4, x + 14)) + 'px';
    t.style.top = Math.max(4, y - 10) + 'px';
  }
  function hideTip(f) { f.tip.hidden = true; }

  function axesY(svg, m, W, H, ticks, y, f) {
    ticks.forEach(function (v) {
      var yy = y(v);
      el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: GRID, 'stroke-width': 1 }, svg);
      txt(svg, m.l - 8, yy + 4, f(v), { 'text-anchor': 'end', 'font-variant-numeric': 'tabular-nums' });
    });
  }
  function axesX(svg, labels, xpos, H, m, plotW) {
    var step = Math.max(1, Math.ceil(labels.length * 52 / plotW));
    labels.forEach(function (l, i) {
      var last = i === labels.length - 1;
      if (i % step && !last) return;
      if (!last && labels.length - 1 - i < step && i !== 0) return;   // evita que choque con la última etiqueta
      var edge = last && plotW + m.l - xpos(i) < 20 ? 'end' : 'middle';
      txt(svg, xpos(i), H - m.b + 18, l, { 'text-anchor': edge });
    });
  }
  function refLine(svg, m, W, y, ref, f) {
    if (!ref) return;
    var yy = y(ref.value);
    el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: .55 }, svg);
    txt(svg, W - m.r, yy - 6, ref.label, { 'text-anchor': 'end', fill: INK });
  }

  /* Líneas: series mensuales, crosshair con todas las series */
  function line(id, cfg) {
    cfg.kind = 'line';
    var f = frame(id, cfg), W = Math.max(300, f.wrap.clientWidth), H = cfg.height || 270;
    var m = { l: 58, r: 16, t: 14, b: 30 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var vals = [];
    cfg.series.forEach(function (s) { s.data.forEach(function (v) { if (v !== null) vals.push(v); }); });
    if (cfg.ref) vals.push(cfg.ref.value);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (cfg.zero) lo = Math.min(0, lo);
    var ticks = niceTicks(lo, hi, 5), y0 = ticks[0], y1 = ticks[ticks.length - 1];
    var n = cfg.labels.length, x = function (i) { return m.l + (n === 1 ? pw / 2 : i * pw / (n - 1)); };
    var y = function (v) { return m.t + ph - (v - y0) / (y1 - y0) * ph; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, role: 'img', 'aria-label': cfg.title || '' });
    var f1 = fmt(cfg.fmt);
    axesY(svg, m, W, H, ticks, y, f1);
    if (y0 < 0 && y1 > 0) el('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: AXIS, 'stroke-width': 1 }, svg);
    axesX(svg, cfg.labels, x, H, m, pw);
    refLine(svg, m, W, y, cfg.ref, f1);
    cfg.series.forEach(function (s, si) {
      var c = s.color || PAL[si], d = '', pen = false;
      s.data.forEach(function (v, i) {
        if (v === null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true;
      });
      el('path', { d: d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      var li = s.data.length - 1; while (li > 0 && s.data[li] === null) li--;
      el('circle', { cx: x(li), cy: y(s.data[li]), r: 4, fill: c, stroke: SURF, 'stroke-width': 2 }, svg);
    });
    var cross = el('line', { y1: m.t, y2: H - m.b, stroke: AXIS, 'stroke-width': 1, opacity: 0 }, svg);
    var hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0 }, svg);
    function at(i) {
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', .6);
      var rows = cfg.series.map(function (s, si) {
        return { color: s.color || PAL[si], value: s.data[i] === null ? 'sin dato' : f1(s.data[i]), name: cfg.series.length > 1 ? s.name : '' };
      });
      showTip(f, x(i) / W * f.wrap.clientWidth, m.t, cfg.labels[i], rows);
    }
    hit.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W;
      at(Math.max(0, Math.min(n - 1, Math.round((px - m.l) / pw * (n - 1)))));
    });
    hit.addEventListener('pointerleave', function () { cross.setAttribute('opacity', 0); hideTip(f); });
    hit.addEventListener('focus', function () { at(n - 1); });
    hit.addEventListener('blur', function () { cross.setAttribute('opacity', 0); hideTip(f); });
    f.wrap.appendChild(svg);
  }

  /* Columnas: una o dos series por categoría */
  function columns(id, cfg) {
    cfg.kind = 'bar';
    if (!cfg.series) cfg.series = [{ name: cfg.name || '', data: cfg.values }];
    var f = frame(id, cfg), W = Math.max(300, f.wrap.clientWidth), H = cfg.height || 260;
    var m = { l: 58, r: 16, t: 22, b: 30 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var vals = [0]; cfg.series.forEach(function (s) { vals = vals.concat(s.data); });
    var ticks = niceTicks(0, Math.max.apply(null, vals), 5), y1 = ticks[ticks.length - 1];
    var n = cfg.labels.length, band = pw / n, k = cfg.series.length;
    var bw = Math.min(24, (band * 0.7) / k), y = function (v) { return m.t + ph - v / y1 * ph; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, role: 'img', 'aria-label': cfg.title || '' });
    var f1 = fmt(cfg.fmt);
    axesY(svg, m, W, H, ticks, y, f1);
    axesX(svg, cfg.labels, function (i) { return m.l + band * (i + .5); }, H, m, pw);
    cfg.series.forEach(function (s, si) {
      var c = s.color || PAL[si];
      s.data.forEach(function (v, i) {
        var cx = m.l + band * (i + .5) - (k * bw + (k - 1) * 2) / 2 + si * (bw + 2);
        var top = y(v), h = Math.max(0, m.t + ph - top), r = Math.min(4, h, bw / 2);
        var d = 'M' + cx + ',' + (m.t + ph) + 'V' + (top + r) + 'Q' + cx + ',' + top + ' ' + (cx + r) + ',' + top +
          'H' + (cx + bw - r) + 'Q' + (cx + bw) + ',' + top + ' ' + (cx + bw) + ',' + (top + r) + 'V' + (m.t + ph) + 'Z';
        var bar = el('path', { d: d, fill: c, tabindex: 0 }, svg);
        if (cfg.capLabels && k === 1) txt(svg, cx + bw / 2, top - 6, f1(v), { 'text-anchor': 'middle', fill: INK, 'font-size': 10.5 });
        var hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ph, fill: 'transparent' }, svg);
        var on = function () {
          bar.setAttribute('opacity', .8);
          showTip(f, (cx + bw / 2) / W * f.wrap.clientWidth, top / H * H, cfg.labels[i],
            cfg.series.map(function (s2, sj) { return { color: s2.color || PAL[sj], value: f1(s2.data[i]), name: k > 1 ? s2.name : '' }; }));
        };
        var off = function () { bar.setAttribute('opacity', 1); hideTip(f); };
        hit.addEventListener('pointermove', on); hit.addEventListener('pointerleave', off);
        bar.addEventListener('focus', on); bar.addEventListener('blur', off);
      });
    });
    f.wrap.appendChild(svg);
  }

  /* Barras horizontales: categorías largas (granjas, accionistas) */
  function hbars(id, cfg) {
    cfg.kind = 'bar';
    if (!cfg.series) cfg.series = [{ name: cfg.name || '', data: cfg.values }];
    var f = frame(id, cfg), W = Math.max(300, f.wrap.clientWidth), k = cfg.series.length;
    var n = cfg.labels.length, lw = cfg.labelWidth || 150;
    var stacked = lw > W * 0.32;                       // pantalla angosta: el nombre va arriba de su barra
    var row = (k > 1 ? 34 : 24) + (stacked ? 16 : 0);
    var m = { l: stacked ? 8 : lw, r: 64, t: cfg.ref ? 22 : 8, b: 26 }, H = m.t + m.b + n * row, pw = W - m.l - m.r;
    var vals = [0]; cfg.series.forEach(function (s) { vals = vals.concat(s.data); });
    if (cfg.ref) vals.push(cfg.ref.value);
    var ticks = niceTicks(0, Math.max.apply(null, vals), 4), x1 = ticks[ticks.length - 1];
    var x = function (v) { return m.l + v / x1 * pw; }, bh = Math.min(12, (row - 8) / k);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, role: 'img', 'aria-label': cfg.title || '' });
    var f1 = fmt(cfg.fmt);
    ticks.forEach(function (v) {
      el('line', { x1: x(v), x2: x(v), y1: m.t, y2: H - m.b, stroke: GRID, 'stroke-width': 1 }, svg);
      txt(svg, x(v), H - m.b + 16, f1(v), { 'text-anchor': 'middle', 'font-variant-numeric': 'tabular-nums' });
    });
    cfg.labels.forEach(function (l, i) {
      var cy = stacked ? m.t + row * i + 16 + (row - 16) / 2 : m.t + row * (i + .5);
      if (stacked) txt(svg, m.l, m.t + row * i + 13, l, { fill: INK });
      else txt(svg, m.l - 8, cy + 4, l, { 'text-anchor': 'end', fill: INK });
      cfg.series.forEach(function (s, si) {
        var v = s.data[i], c = s.color || PAL[si], top = cy - (k * bh + (k - 1) * 2) / 2 + si * (bh + 2);
        var w = Math.max(0, x(v) - m.l), r = Math.min(4, w, bh / 2);
        var d = 'M' + m.l + ',' + top + 'H' + (m.l + w - r) + 'Q' + (m.l + w) + ',' + top + ' ' + (m.l + w) + ',' + (top + r) +
          'V' + (top + bh - r) + 'Q' + (m.l + w) + ',' + (top + bh) + ' ' + (m.l + w - r) + ',' + (top + bh) + 'H' + m.l + 'Z';
        el('path', { d: d, fill: c }, svg);
        if (cfg.endLabels) txt(svg, m.l + w + 6, top + bh / 2 + 4, f1(v), { fill: INK, 'font-size': 10.5 });
      });
      var hit = el('rect', { x: 0, y: cy - row / 2, width: W, height: row, fill: 'transparent', tabindex: 0 }, svg);
      var on = function () {
        showTip(f, x(Math.max.apply(null, cfg.series.map(function (s) { return s.data[i]; }))) / W * f.wrap.clientWidth, (cy - row / 2) / H * H, l,
          cfg.series.map(function (s, sj) { return { color: s.color || PAL[sj], value: f1(s.data[i]), name: k > 1 ? s.name : '' }; }));
      };
      hit.addEventListener('pointermove', on); hit.addEventListener('focus', on);
      hit.addEventListener('pointerleave', function () { hideTip(f); }); hit.addEventListener('blur', function () { hideTip(f); });
    });
    if (cfg.ref) {
      el('line', { x1: x(cfg.ref.value), x2: x(cfg.ref.value), y1: m.t, y2: H - m.b, stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: .55 }, svg);
      txt(svg, x(cfg.ref.value) + 4, m.t - 8, cfg.ref.label, { fill: INK });
    }
    f.wrap.appendChild(svg);
  }

  /* Dispersión: un punto por día, punto más cercano en el tooltip */
  function scatter(id, cfg) {
    cfg.kind = 'dot';
    var f = frame(id, cfg), W = Math.max(300, f.wrap.clientWidth), H = cfg.height || 300;
    var m = { l: 58, r: 16, t: 14, b: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    var xs = cfg.points.map(function (p) { return p[0]; }), ys = cfg.points.map(function (p) { return p[1]; });
    if (cfg.fit) cfg.fit.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
    var tx = niceTicks(Math.min.apply(null, xs), Math.max.apply(null, xs), 5), ty = niceTicks(Math.min.apply(null, ys), Math.max.apply(null, ys), 5);
    var x = function (v) { return m.l + (v - tx[0]) / (tx[tx.length - 1] - tx[0]) * pw; };
    var y = function (v) { return m.t + ph - (v - ty[0]) / (ty[ty.length - 1] - ty[0]) * ph; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, role: 'img', 'aria-label': cfg.title || '' });
    var fx = fmt(cfg.xfmt), fy = fmt(cfg.yfmt);
    axesY(svg, m, W, H, ty, y, fy);
    tx.forEach(function (v) { txt(svg, x(v), H - m.b + 18, fx(v), { 'text-anchor': 'middle', 'font-variant-numeric': 'tabular-nums' }); });
    if (cfg.xlabel) txt(svg, m.l + pw / 2, H - 6, cfg.xlabel, { 'text-anchor': 'middle', fill: INK });
    var c = PAL[0];
    cfg.points.forEach(function (p) { el('circle', { cx: x(p[0]), cy: y(p[1]), r: 3.5, fill: c, 'fill-opacity': .45 }, svg); });
    if (cfg.fit) el('line', { x1: x(cfg.fit[0][0]), y1: y(cfg.fit[0][1]), x2: x(cfg.fit[1][0]), y2: y(cfg.fit[1][1]), stroke: PAL[1], 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
    var mark = el('circle', { r: 5, fill: c, stroke: SURF, 'stroke-width': 2, opacity: 0 }, svg);
    var hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0 }, svg);
    function near(px, py) {
      var best = 0, bd = Infinity;
      cfg.points.forEach(function (p, i) { var d = Math.pow(x(p[0]) - px, 2) + Math.pow(y(p[1]) - py, 2); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function at(i) {
      var p = cfg.points[i];
      mark.setAttribute('cx', x(p[0])); mark.setAttribute('cy', y(p[1])); mark.setAttribute('opacity', 1);
      showTip(f, x(p[0]) / W * f.wrap.clientWidth, y(p[1]) / H * H, cfg.pointTitle || 'Día',
        [{ value: fy(p[1]), name: cfg.yname }, { value: fx(p[0]), name: cfg.xname }]);
    }
    hit.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      at(near((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H));
    });
    hit.addEventListener('pointerleave', function () { mark.setAttribute('opacity', 0); hideTip(f); });
    hit.addEventListener('blur', function () { mark.setAttribute('opacity', 0); hideTip(f); });
    f.wrap.appendChild(svg);
  }

  var KINDS = { line: line, columns: columns, hbars: hbars, scatter: scatter };
  function renderAll() {
    (window.EE_CHARTS || []).forEach(function (c) { KINDS[c.type](c.id, JSON.parse(JSON.stringify(c.cfg))); });
  }
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(renderAll, 150); });
  document.addEventListener('DOMContentLoaded', renderAll);
})();

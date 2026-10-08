/* Graphiques SVG légers (aucune bibliothèque externe, fonctionne hors ligne). */
(function (root) {
  const GREEN = '#70AD47';
  const RED = '#FF0000';
  const ORANGE = '#ED7D31';
  const GRID = 'rgba(255,255,255,0.14)';
  const TXT = '#d9d9d9';
  let uid = 0;

  const nf = (v, d) => v.toLocaleString('fr-FR', { maximumFractionDigits: d === undefined ? 2 : d });
  const fmtAxis = (v) => nf(+v.toFixed(6));
  const fmtDollar = (v) => (v < 0 ? '-$' : '$') + nf(Math.abs(v), 0);
  const fmtPctInt = (v) => Math.round(v * 100) + '%';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function niceNum(range, round) {
    const exp = Math.floor(Math.log10(range));
    const f = range / Math.pow(10, exp);
    let nf2;
    if (round) nf2 = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    else nf2 = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf2 * Math.pow(10, exp);
  }

  function ticks(min, max, count) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
    if (min === max) max = 1;
    const range = niceNum(max - min, false);
    const step = niceNum(range / (count - 1), true);
    const lo = Math.floor(min / step + 1e-9) * step;
    const hi = Math.ceil(max / step - 1e-9) * step;
    const t = [];
    for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }

  function size(el) {
    const W = el.clientWidth || 600;
    const H = el.clientHeight || 300;
    return { W, H };
  }

  function frame(W, H, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H +
      '" width="100%" height="100%" font-family="Calibri, Segoe UI, Arial, sans-serif">' + inner + '</svg>';
  }

  function titleSvg(o, W) {
    if (!o.title) return '';
    const fs = o.small ? 17 : 22;
    return '<text x="' + W / 2 + '" y="' + (o.small ? 26 : 34) + '" text-anchor="middle" fill="#fff" font-weight="700" font-size="' +
      fs + '" letter-spacing="1">' + esc(o.title) + '</text>';
  }

  function axes(o, m, W, H, tk, y) {
    let s = '';
    tk.forEach((t) => {
      const yy = y(t);
      s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + (t === 0 ? 'rgba(255,255,255,0.4)' : GRID) + '"/>';
      s += '<text x="' + (m.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end" fill="' + TXT + '" font-size="' + (o.small ? 11 : 13) + '">' +
        esc((o.yFmt || fmtAxis)(t)) + '</text>';
    });
    return s;
  }

  function xLabels(o, m, W, H, n, xAt, labels, dy) {
    let s = '';
    const step = Math.max(1, Math.ceil(n / (o.small ? 8 : 14)));
    for (let i = 0; i < n; i += step) {
      s += '<text x="' + xAt(i) + '" y="' + (H - m.b + (dy || 18)) + '" text-anchor="middle" fill="' + TXT + '" font-size="' + (o.small ? 11 : 13) + '">' +
        esc(labels ? labels[i] : i + 1) + '</text>';
    }
    return s;
  }

  /** Graphique en aire (P&L cumulé). */
  function area(el, o) {
    const { W, H } = size(el);
    const id = 'g' + ++uid;
    const m = { l: o.small ? 40 : 56, r: 18, t: o.title ? (o.small ? 40 : 52) : 14, b: 30 };
    let vals = o.values && o.values.length ? o.values.slice() : [0];
    if (vals.length < 2) vals = [vals[0], vals[0]];
    const tk = ticks(Math.min.apply(null, vals), Math.max.apply(null, vals), o.small ? 5 : 7);
    const lo = tk[0];
    const hi = tk[tk.length - 1];
    const pw = W - m.l - m.r;
    const ph = H - m.t - m.b;
    const y = (v) => m.t + ph - ((v - lo) / (hi - lo)) * ph;
    const n = vals.length;
    const x = (i) => m.l + (i / (n - 1)) * pw;
    let d = 'M' + x(0) + ',' + y(0);
    vals.forEach((v, i) => { d += ' L' + x(i) + ',' + y(v); });
    d += ' L' + x(n - 1) + ',' + y(0) + ' Z';
    const c1 = o.color || GREEN;
    const c2 = o.color2 || (o.color ? '#c55a11' : '#548235');
    const inner =
      '<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + c2 + '"/><stop offset="1" stop-color="' + c1 + '"/></linearGradient></defs>' +
      titleSvg(o, W) + axes(o, m, W, H, tk, y) +
      '<path d="' + d + '" fill="url(#' + id + ')"/>' +
      xLabels(o, m, W, H, n, x, o.labels);
    el.innerHTML = frame(W, H, inner);
  }

  /** Graphique en barres (vert si positif, rouge si négatif). */
  function bar(el, o) {
    const { W, H } = size(el);
    const vals = o.values && o.values.length ? o.values : [0];
    const hasNeg = vals.some((v) => v < 0) && o.dataLabels !== false;
    const m = { l: o.small ? 40 : 56, r: 18, t: o.title ? (o.small ? 40 : 52) : 14, b: hasNeg ? 46 : 30 };
    const tk = ticks(Math.min.apply(null, vals), Math.max.apply(null, vals), o.small ? 5 : 7);
    const lo = tk[0];
    const hi = tk[tk.length - 1];
    const pw = W - m.l - m.r;
    const ph = H - m.t - m.b;
    const y = (v) => m.t + ph - ((v - lo) / (hi - lo)) * ph;
    const n = vals.length;
    const band = pw / n;
    const bw = Math.min(band * 0.5, 120);
    const xc = (i) => m.l + band * i + band / 2;
    let bars = '';
    vals.forEach((v, i) => {
      const y0 = y(0);
      const y1 = y(v);
      const top = Math.min(y0, y1);
      const h = Math.abs(y0 - y1);
      const col = o.color || (v < 0 ? RED : GREEN);
      if (h > 0) bars += '<rect x="' + (xc(i) - bw / 2) + '" y="' + top + '" width="' + bw + '" height="' + h + '" fill="' + col + '"/>';
      if (o.dataLabels !== false) {
        const txt = (o.fmt || fmtAxis)(v);
        const ly = v < 0 ? y1 + 15 : y1 - 6;
        bars += '<text x="' + xc(i) + '" y="' + ly + '" text-anchor="middle" fill="' + TXT + '" font-size="' + (o.small ? 11 : 13) + '">' + esc(txt) + '</text>';
      }
    });
    const inner = titleSvg(o, W) + axes(o, m, W, H, tk, y) + bars + xLabels(o, m, W, H, n, xc, o.labels, hasNeg ? 34 : 18);
    el.innerHTML = frame(W, H, inner);
  }

  function pt(cx, cy, r, a) { return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }

  /** Anneau avec pourcentages (démarre en haut, sens horaire). */
  function donut(el, o) {
    const { W, H } = size(el);
    const topPad = o.title ? 52 : 10;
    const cx = W / 2;
    const cy = topPad + (H - topPad) / 2;
    const R = Math.max(20, Math.min(W / 2, (H - topPad) / 2) - 8);
    const r = R * 0.5;
    const vals = o.values.map((v) => (v === null || v === undefined || !isFinite(v) ? 0 : Math.max(0, v)));
    const total = vals.reduce((a, b) => a + b, 0);
    let s = titleSvg(o, W);
    if (total <= 0) {
      s += '<path fill-rule="evenodd" fill="rgba(255,255,255,0.08)" d="' + ring(cx, cy, R, r) + '"/>';
      el.innerHTML = frame(W, H, s);
      return;
    }
    let start = 0;
    const labels = [];
    vals.forEach((v, i) => {
      const frac = v / total;
      const a0 = start * 2 * Math.PI;
      const a1 = (start + frac) * 2 * Math.PI;
      const col = o.colors[i % o.colors.length];
      if (frac >= 0.9999) s += '<path fill-rule="evenodd" fill="' + col + '" d="' + ring(cx, cy, R, r) + '"/>';
      else if (frac > 0) {
        const p0 = pt(cx, cy, R, a0), p1 = pt(cx, cy, R, a1), q1 = pt(cx, cy, r, a1), q0 = pt(cx, cy, r, a0);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        s += '<path fill="' + col + '" d="M' + p0 + ' A' + R + ',' + R + ' 0 ' + large + ',1 ' + p1 + ' L' + q1 + ' A' + r + ',' + r + ' 0 ' + large + ',0 ' + q0 + ' Z"/>';
      }
      const mid = (a0 + a1) / 2;
      const lp = pt(cx, cy, (R + r) / 2, mid);
      labels.push('<text x="' + lp[0] + '" y="' + (lp[1] + 4) + '" text-anchor="middle" fill="#fff" font-weight="700" font-size="13">' + fmtPctInt(frac) + '</text>');
      start += frac;
    });
    el.innerHTML = frame(W, H, s + labels.join(''));
  }

  function ring(cx, cy, R, r) {
    return 'M' + (cx - R) + ',' + cy + ' a' + R + ',' + R + ' 0 1,0 ' + 2 * R + ',0 a' + R + ',' + R + ' 0 1,0 ' + (-2 * R) + ',0 Z ' +
      'M' + (cx - r) + ',' + cy + ' a' + r + ',' + r + ' 0 1,0 ' + 2 * r + ',0 a' + r + ',' + r + ' 0 1,0 ' + (-2 * r) + ',0 Z';
  }

  root.Charts = { area, bar, donut, GREEN, RED, ORANGE, fmtDollar, fmtAxis, nf };
})(typeof self !== 'undefined' ? self : this);

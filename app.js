/* Interface de l'application : reproduit les onglets du classeur Excel. */
(function () {
  const C = window.Calc;
  const CH = window.Charts;
  const view = document.getElementById('view');
  const tabsEl = document.getElementById('tabs');

  let state = C.defaultState();
  let current = 'outlook';
  let tlRows = 40;
  let updateCurrent = function () {};
  let saveTimer = null;

  /* ---------- Formats (locale française) ---------- */
  const nf = (v, d) => v.toLocaleString('fr-FR', { maximumFractionDigits: d === undefined ? 2 : d });
  const fmtNum = (v, d) => (v === null || v === undefined ? '-' : nf(v, d === undefined ? 2 : d));
  const fmtPct = (v, d) => (v === null || v === undefined ? '-' :
    (v * 100).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }) + '%');
  const fmtAcc = (v) => (v === null || v === undefined || Math.abs(v) < 1e-9 ? '-' : nf(Math.round(v), 0));
  const fmtMoney = (v) => (v < 0 ? '-$' : '$') + nf(Math.abs(Math.round(v)), 0);
  const fmtPlain = (v) => String(+v.toFixed(2)).replace('.', ',');
  const inputVal = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
  const balInput = (v) => (v === null || v === undefined ? '' : nf(v, 2));
  const pctInput = (v) => (v === null || v === undefined ? '' : (v * 100).toFixed(1).replace('.', ',') + '%');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const $ = (sel, root) => (root || document).querySelector(sel);

  /* ---------- Sauvegarde locale ---------- */
  function doSave() {
    const copy = JSON.parse(JSON.stringify(state));
    const trim = (a) => { while (a.length && (a[a.length - 1] === null || a[a.length - 1] === undefined)) a.pop(); return a; };
    trim(copy.global);
    C.MONTHS.forEach((m) => trim(copy.months[m]));
    if (window.api) window.api.save(copy);
    else { try { localStorage.setItem('fpt-data', JSON.stringify(copy)); } catch (e) { /* ignore */ } }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 400);
  }
  window.addEventListener('beforeunload', doSave);

  /* ---------- Onglets ---------- */
  const TABS = [{ id: 'outlook', label: 'P&L OUTLOOK', cls: 'tab-green' }, { id: 'tradelog', label: 'TRADE LOG', cls: 'tab-orange' }]
    .concat(C.MONTHS.map((m, i) => ({ id: m, label: C.TAB_LABELS[i], cls: '' })));

  function renderTabs() {
    tabsEl.innerHTML = TABS.map((t) =>
      '<button data-tab="' + t.id + '" class="' + t.cls + (t.id === current ? ' active' : '') + '">' + t.label + '</button>').join('');
  }
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    current = b.dataset.tab;
    render();
  });

  function render() {
    renderTabs();
    view.scrollTop = 0;
    view.scrollLeft = 0;
    if (current === 'outlook') renderOutlook();
    else if (current === 'tradelog') renderTradeLog();
    else renderMonth(C.MONTHS.indexOf(current));
  }

  /* ====================================================================
     P&L OUTLOOK
     ==================================================================== */
  function clientBlock(ci) {
    const c = state.clients[ci];
    let h = '<table><colgroup><col style="width:56px"><col style="width:64px"><col style="width:120px"><col style="width:120px">' +
      '<col style="width:100px"><col style="width:170px"><col style="width:70px"></colgroup>';
    h += '<tr><th class="hd yellow">Client</th><th class="hd yellow">Month</th><th class="hd yellow">Initial Balance</th>' +
      '<th class="hd yellow">Profit &amp; Loss</th><th class="hd yellow">Performance</th>' +
      '<th class="hd">' + esc(state.year) + ' Total Performance</th><th class="hd">Risk/trade</th></tr>';
    c.rows.forEach((row, i) => {
      h += '<tr>';
      if (i === 0) h += '<td class="name" rowspan="12"><span contenteditable="true" spellcheck="false" data-name="' + ci + '">' + esc(c.name) + '</span></td>';
      h += '<td class="m">' + C.MONTH_SHORT[i] + '</td>';
      if (i === 0) h += '<td class="bal"><input data-ci="' + ci + '" data-f="balance" value="' + balInput(c.balance) + '"></td>';
      else h += '<td class="bal" data-bal="' + ci + '-' + i + '"></td>';
      h += '<td><input data-ci="' + ci + '" data-i="' + i + '" data-f="pl" value="' + inputVal(row.pl) + '"></td>';
      h += '<td><input class="c" data-ci="' + ci + '" data-i="' + i + '" data-f="perf" value="' + pctInput(row.perf) + '"></td>';
      if (i === 0) h += '<td class="total" rowspan="12" data-total="' + ci + '"></td>';
      h += '<td class="risk"><input class="c" data-ci="' + ci + '" data-i="' + i + '" data-f="risk" value="' + inputVal(row.risk) + '"></td>';
      h += '</tr>';
    });
    return h + '</table>';
  }

  function renderOutlook() {
    let evo = '';
    let mpl = '';
    C.MONTHS.forEach((m, i) => {
      evo += '<div class="chart h-sm" id="evo-' + i + '"></div>';
      mpl += '<div class="chart h-sm" id="mpl-' + i + '"></div>';
    });
    view.innerHTML =
      '<div class="banner"><img src="assets/logo.png" alt="">' +
      '<div class="quotes">"The market is a device for transferring money from the impatient to the patient." – Warren Buffet<br>' +
      '"Trade what’s happening… Not what you think is gonna happen." – Doug Gregory</div>' +
      '<div class="yearbox">Année <input class="year" id="year" value="' + esc(state.year) + '"></div></div>' +
      '<div class="outlook">' +
      '<div class="col clients">' + clientBlock(0) + clientBlock(1) + clientBlock(2) +
      '<div class="notes-box"><h3>NOTES</h3><textarea id="notes" spellcheck="false">' + esc(state.notes) + '</textarea>' +
      '<table class="quarters" id="quarters"></table></div></div>' +
      '<div class="col">' +
      '<div class="kpis"><div>AuM/ Investors<div class="v"><input id="aum" class="year" style="width:110px" value="' + esc(state.aum) + '"></div></div>' +
      '<div>Return<div class="v g" id="k-ret"></div></div><div>Expectancy<div class="v" id="k-exp"></div></div>' +
      '<div>Monthly Average<div class="v g" id="k-avg"></div></div></div>' +
      '<div class="chart h-lg" id="c-main"></div><div class="chart h-md" id="c-pertrade"></div>' +
      '<div class="chart h-md" id="c-monthperf"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr"><div class="chart h-donut" id="c-wl"></div>' +
      '<div class="chart h-donut" id="c-pl"></div><div class="chart h-donut" id="c-q"></div></div></div>' +
      '<div class="col" id="evo">' + evo + '</div><div class="col" id="mpl">' + mpl + '</div></div>';
    updateCurrent = updateOutlook;
    updateOutlook();
  }

  function updateOutlook() {
    const g = C.stats(state.global, C.parseNum(state.risk) || 0);
    const y = state.year;
    // tableaux clients
    state.clients.forEach((c, ci) => {
      const t = C.clientTable(c);
      t.balances.forEach((b, i) => {
        if (i === 0) return;
        const cell = $('[data-bal="' + ci + '-' + i + '"]');
        if (cell) cell.textContent = b === null ? '' : nf(b, 0);
      });
      const tot = $('[data-total="' + ci + '"]');
      if (tot) tot.textContent = fmtPct(t.total, 2);
    });
    const usd = C.clientTable(state.clients[0]);
    $('#k-ret').textContent = fmtPct(usd.total, 2);
    $('#k-exp').textContent = fmtNum(g.expectancy, 2);
    $('#k-avg').textContent = fmtPct(C.monthlyAverage(state), 2);

    const q = C.quarters(state);
    $('#quarters').innerHTML = q.map((v, i) => '<tr><td>Q' + (i + 1) + '</td><td>' + fmtPct(v, 2) + '</td></tr>').join('');

    // graphiques
    CH.area($('#c-main'), { title: y + ' P&L General FX', values: g.series.cumPnl, yFmt: CH.fmtDollar, color: CH.ORANGE });
    CH.bar($('#c-pertrade'), { title: y + ' P&L per trade', values: g.series.rrLead, fmt: (v) => fmtNum(v, 2) });
    const perf = state.clients[0].rows.map((r) => C.parseNum(r.perf) || 0);
    CH.bar($('#c-monthperf'), {
      title: 'Monthly Performance', values: perf, labels: C.MONTH_SHORT,
      yFmt: (v) => fmtPct(v, 1), fmt: (v) => fmtPct(v, 1)
    });
    CH.donut($('#c-wl'), { title: 'Win / Loss', values: [g.wins, g.losses], colors: [CH.GREEN, CH.RED] });
    CH.donut($('#c-pl'), { title: 'Profit / Loss', values: [g.totalProfits, g.totalLosses], colors: [CH.GREEN, CH.RED] });
    CH.bar($('#c-q'), {
      title: 'Quarterly Performance', values: q, labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      yFmt: (v) => fmtPct(v, 0), fmt: (v) => fmtPct(v, 1), small: true
    });
    C.MONTHS.forEach((m, i) => {
      const s = C.stats(state.months[m], C.parseNum(state.risk) || 0).series;
      CH.area($('#evo-' + i), { title: C.MONTH_TITLE[i] + ' evolution', values: s.cumRR, small: true });
      CH.bar($('#mpl-' + i), { title: C.MONTH_TITLE[i] + ' P&L', values: s.pnlLead, small: true, fmt: (v) => fmtNum(v, 0) });
    });
  }

  /* ====================================================================
     Feuilles mensuelles (JAN … DEC)
     ==================================================================== */
  function renderMonth(i) {
    view.innerHTML =
      '<h1 class="month-title">' + C.MONTH_FULL[i] + ' PERFORMANCE</h1>' +
      '<div class="month"><div>' +
      '<div class="row3"><div class="hd">Return RR</div><div class="val" id="m-rr"></div>' +
      '<div class="hd">Return %</div><div class="val" id="m-pct"></div>' +
      '<div class="hd">Trade Expectancy</div><div class="val" id="m-exp"></div></div>' +
      '<div class="chart" style="height:340px" id="m-area"></div><div class="chart" style="height:340px" id="m-bar"></div></div>' +
      '<div><div class="grid5"><div class="hd">Total Trades</div><div class="hd">Losses</div><div class="hd">Wins</div><div class="hd">% Lost</div><div class="hd">% Won</div>' +
      '<div class="val" id="m-n"></div><div class="val" id="m-l"></div><div class="val" id="m-w"></div><div class="val" id="m-pl2"></div><div class="val" id="m-pw"></div></div>' +
      '<div class="chart h-donut" style="height:250px" id="m-hit"></div>' +
      '<div class="grid5"><div class="hd">Total Losses ($)</div><div class="hd">Total Profits ($)</div><div class="hd">NET $</div><div class="hd">Loss%</div><div class="hd">Profit%</div>' +
      '<div class="val" id="m-tl"></div><div class="val" id="m-tp"></div><div class="val" id="m-net"></div><div class="val" id="m-lp"></div><div class="val" id="m-pp"></div></div>' +
      '<div class="chart h-donut" style="height:250px" id="m-plc"></div></div></div>';
    updateCurrent = function () { updateMonth(i); };
    updateMonth(i);
  }

  function updateMonth(i) {
    const m = C.MONTHS[i];
    const s = C.stats(state.months[m], C.parseNum(state.risk) || 0);
    const perf = C.parseNum(state.clients[0].rows[i].perf);
    $('#m-rr').textContent = fmtNum(s.returnRR, 2);
    $('#m-pct').textContent = fmtPct(perf, 1);
    $('#m-exp').textContent = fmtNum(s.expectancy, 2);
    $('#m-n').textContent = s.totalTrades;
    $('#m-l').textContent = s.losses;
    $('#m-w').textContent = s.wins;
    $('#m-pl2').textContent = fmtPct(s.pctLost, 0);
    $('#m-pw').textContent = fmtPct(s.pctWon, 0);
    $('#m-tl').textContent = fmtAcc(s.totalLosses);
    $('#m-tp').textContent = fmtAcc(s.totalProfits);
    $('#m-net').textContent = s.net < 0 ? '- ' + nf(Math.abs(Math.round(s.net)), 0) : fmtAcc(s.net);
    $('#m-lp').textContent = fmtPct(s.lossPct, 0);
    $('#m-pp').textContent = fmtPct(s.profitPct, 0);
    CH.area($('#m-area'), { title: 'P & L', values: s.series.cumRR });
    CH.bar($('#m-bar'), { title: 'P & L per trade', values: s.series.rrLead, fmt: (v) => fmtNum(v, 2) });
    CH.donut($('#m-hit'), { title: 'Hit Rate', values: [s.pctLost || 0, s.pctWon || 0], colors: [CH.RED, CH.GREEN] });
    CH.donut($('#m-plc'), { title: 'Profit/Loss', values: [s.lossPct || 0, s.profitPct || 0], colors: [CH.RED, CH.GREEN] });
  }

  /* ====================================================================
     TRADE LOG
     ==================================================================== */
  const TL_NAMES = ['Jan', 'Feb', 'March', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  let tlRefs = [];

  function renderTradeLog() {
    const maxLen = Math.max(state.global.length, ...C.MONTHS.map((m) => state.months[m].length));
    tlRows = Math.max(tlRows, 40, maxLen + 10);
    let h = '<div class="tl-head"><img src="assets/logo.png" alt=""></div>' +
      '<div class="tl-risk"><div class="risk-label">Risk per trade ($)</div>' +
      '<input class="risk-input" id="risk" value="' + inputVal(state.risk) + '"></div>' +
      '<div class="tl-wrap"><table class="tl"><thead><tr><th>Global P&amp;L</th><th>P&amp;L per trade</th><th>Global RR</th><th class="y">RR/trade</th><th class="gap"></th>';
    TL_NAMES.forEach((n) => { h += '<th>' + n + ' P&amp;L</th><th>' + n + ' Total</th><th class="y">' + n + ' Trades</th>'; });
    h += '</tr></thead><tbody>';
    h += '<tr><td class="c0">$0</td><td class="c1">$0</td><td class="c0">0</td><td class="c1">0</td><td class="gap"></td>';
    for (let m = 0; m < 12; m++) { const k = m % 2 === 0 ? 'c0' : 'c1'; h += '<td class="' + k + '">0</td><td class="' + k + '">0</td><td class="' + k + '">0</td>'; }
    h += '</tr>';
    for (let r = 0; r < tlRows; r++) {
      h += '<tr><td class="c0" data-t="gpl" data-r="' + r + '"></td><td class="c1" data-t="gpt" data-r="' + r + '"></td>' +
        '<td class="c0" data-t="grr" data-r="' + r + '"></td>' +
        '<td class="in"><input data-g="1" data-r="' + r + '" value="' + inputVal(state.global[r]) + '"></td><td class="gap"></td>';
      for (let m = 0; m < 12; m++) {
        const k = m % 2 === 0 ? 'c0' : 'c1';
        const key = C.MONTHS[m];
        h += '<td class="' + k + '" data-t="p' + m + '" data-r="' + r + '"></td><td class="' + k + '" data-t="t' + m + '" data-r="' + r + '"></td>' +
          '<td class="in' + (m % 2 === 0 ? ' g' : '') + '"><input data-m="' + m + '" data-r="' + r + '" value="' + inputVal(state.months[key][r]) + '"></td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table><button class="tl-add" id="tl-add">+ Ajouter 30 lignes</button></div>';
    view.innerHTML = h;
    tlRefs = {};
    view.querySelectorAll('[data-t]').forEach((td) => { tlRefs[td.dataset.t + '-' + td.dataset.r] = td; });
    updateCurrent = refreshTradeLog;
    refreshTradeLog();
  }

  function refreshTradeLog() {
    const risk = C.parseNum(state.risk) || 0;
    const set = (k, r, txt) => { const td = tlRefs[k + '-' + r]; if (td) td.textContent = txt; };
    let cumP = 0;
    let cumR = 0;
    const cumM = new Array(12).fill(0);
    for (let r = 0; r < tlRows; r++) {
      const g = C.parseNum(state.global[r]);
      if (g === null) { set('gpl', r, '-'); set('gpt', r, '-'); set('grr', r, '-'); }
      else { cumP += risk * g; cumR += g; set('gpl', r, fmtMoney(cumP)); set('gpt', r, fmtMoney(risk * g)); set('grr', r, fmtPlain(cumR)); }
      for (let m = 0; m < 12; m++) {
        const v = C.parseNum(state.months[C.MONTHS[m]][r]);
        if (v === null) { set('p' + m, r, '-'); set('t' + m, r, '-'); }
        else { cumM[m] += v; set('p' + m, r, fmtPlain(risk * v)); set('t' + m, r, fmtPlain(cumM[m])); }
      }
    }
  }

  /* ====================================================================
     Événements (délégation)
     ==================================================================== */
  view.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'risk') { state.risk = C.parseNum(t.value); }
    else if (t.dataset && t.dataset.g) {
      const r = +t.dataset.r;
      while (state.global.length <= r) state.global.push(null);
      state.global[r] = C.parseNum(t.value);
    } else if (t.dataset && t.dataset.m !== undefined && t.dataset.r !== undefined && t.closest('.tl')) {
      const arr = state.months[C.MONTHS[+t.dataset.m]];
      const r = +t.dataset.r;
      while (arr.length <= r) arr.push(null);
      arr[r] = C.parseNum(t.value);
    } else if (t.dataset && t.dataset.f) {
      const c = state.clients[+t.dataset.ci];
      const v = C.parseNum(t.value);
      if (t.dataset.f === 'balance') c.balance = v;
      else {
        const row = c.rows[+t.dataset.i];
        if (t.dataset.f === 'perf') row.perf = v === null ? null : v / 100;
        else row[t.dataset.f] = v;
      }
    } else if (t.id === 'aum') { state.aum = t.value; }
    else if (t.id === 'notes') { state.notes = t.value; scheduleSave(); return; }
    else return;
    updateCurrent();
    scheduleSave();
  });

  view.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'year') {
      const y = parseInt(t.value, 10);
      if (y > 1900 && y < 3000) { state.year = y; scheduleSave(); render(); }
    } else if (t.dataset && t.dataset.f === 'perf') {
      t.value = pctInput(state.clients[+t.dataset.ci].rows[+t.dataset.i].perf);
    } else if (t.dataset && t.dataset.f === 'balance') {
      t.value = balInput(state.clients[+t.dataset.ci].balance);
    }
  });

  view.addEventListener('blur', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.name !== undefined) {
      state.clients[+t.dataset.name].name = t.textContent.trim() || state.clients[+t.dataset.name].name;
      scheduleSave();
    }
  }, true);

  view.addEventListener('click', (e) => {
    if (e.target.id === 'tl-add') {
      const sc = view.querySelector('.tl-wrap').scrollTop;
      tlRows += 30;
      renderTradeLog();
      view.querySelector('.tl-wrap').scrollTop = sc;
    }
  });

  let rz = null;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (current !== 'tradelog') updateCurrent(); }, 150);
  });

  /* ---------- Démarrage ---------- */
  async function init() {
    let saved = null;
    try {
      if (window.api) saved = await window.api.load();
      else saved = JSON.parse(localStorage.getItem('fpt-data') || 'null');
    } catch (e) { saved = null; }
    state = C.normalize(saved);
    if (window.api && window.api.onImported) {
      window.api.onImported((data) => { state = C.normalize(data); tlRows = 40; doSave(); render(); });
    }
    render();
  }
  init();
})();

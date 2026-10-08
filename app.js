/* Interface de l'application : onglets, années, P&L OUTLOOK, TRADE LOG et feuilles mensuelles (tout est relié). */
(function () {
  const C = window.Calc;
  const CH = window.Charts;
  const view = document.getElementById('view');
  const tabsEl = document.getElementById('tabs');
  const modal = document.getElementById('modal');
  const ySelect = document.getElementById('y-select');

  let db = C.defaultDb();      // toutes les années
  let state = db.years[db.currentYear]; // l'année affichée
  let model = null;            // résultats calculés de l'année affichée
  let current = 'outlook';
  let tlRows = 40;
  let updateCurrent = function () {};
  let saveTimer = null;
  let ready = false;           // n'écrit rien tant que les données du disque ne sont pas chargées

  /* ---------- Formats (locale française) ---------- */
  const nf = (v, d) => v.toLocaleString('fr-FR', { maximumFractionDigits: d === undefined ? 2 : d });
  const fmtNum = (v, d) => (v === null || v === undefined ? '-' : nf(v, d === undefined ? 2 : d));
  const fmtPct = (v, d) => (v === null || v === undefined ? '-' :
    (v * 100).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }) + '%');
  const fmtAcc = (v) => (v === null || v === undefined || Math.abs(v) < 1e-9 ? '-' : nf(Math.round(v), 0));
  const fmtMoney = (v) => (v < 0 ? '-$' : '$') + nf(Math.abs(Math.round(v)), 0);
  const fmtPlain = (v) => String(+v.toFixed(2)).replace('.', ',');
  const fmtSigned = (v) => (v === null || v === undefined ? '' : (v < 0 ? '-' : '') + nf(Math.abs(Math.round(v)), 0));
  const inputVal = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
  const balInput = (v) => (v === null || v === undefined ? '' : nf(v, 2));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const $ = (sel, root) => (root || document).querySelector(sel);
  const year = () => db.currentYear;

  /* ---------- Sauvegarde locale ---------- */
  function doSave() {
    if (!ready) return;
    const copy = JSON.parse(JSON.stringify(db));
    const trim = (a) => { while (a.length && (a[a.length - 1] === null || a[a.length - 1] === undefined)) a.pop(); return a; };
    Object.keys(copy.years).forEach((k) => C.MONTHS.forEach((m) => trim(copy.years[k].months[m])));
    if (window.api) window.api.save(copy);
    else { try { localStorage.setItem('fpt-data', JSON.stringify(copy)); } catch (e) { /* ignore */ } }
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 400); }
  window.addEventListener('beforeunload', doSave);

  /* ====================================================================
     Années
     ==================================================================== */
  function renderYearBar() {
    const keys = C.yearKeys(db);
    ySelect.innerHTML = keys.slice().reverse().map((k) =>
      '<option value="' + k + '"' + (k === db.currentYear ? ' selected' : '') + '>' + k + '</option>').join('');
    const i = keys.indexOf(db.currentYear);
    $('#y-prev').disabled = i <= 0;
    $('#y-next').disabled = i >= keys.length - 1;
    $('#y-del').disabled = keys.length <= 1;
  }

  function setYear(k) {
    if (!db.years[k]) return;
    db.currentYear = k;
    state = db.years[k];
    tlRows = 40;
    scheduleSave();
    renderYearBar();
    render();
  }

  function openModal(html) { modal.innerHTML = '<div class="mbox">' + html + '</div>'; modal.hidden = false; }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

  function newYearDialog() {
    const next = Math.max.apply(null, C.yearKeys(db).map(Number)) + 1;
    openModal('<h3>Nouvelle année</h3>' +
      '<p>Les soldes de départ (soldes de fin de l\'année précédente) et les réglages de risque sont repris automatiquement. ' +
      'Les trades commencent vides. Les années existantes ne sont pas modifiées.</p>' +
      '<label>Année <input type="number" id="ny" min="1990" max="2200" value="' + next + '"></label>' +
      '<div class="merr" id="nyerr"></div>' +
      '<div class="mbtns"><button class="btn ghost" id="m-cancel">Annuler</button><button class="btn" id="ny-ok">Créer l\'année</button></div>');
    $('#ny').focus();
  }

  function deleteYearDialog() {
    openModal('<h3>Supprimer l\'année ' + year() + ' ?</h3>' +
      '<p>Tous les trades et réglages de cette année seront supprimés définitivement. ' +
      'Pense à faire une sauvegarde avant (menu Fichier &gt; Exporter une sauvegarde).</p>' +
      '<div class="mbtns"><button class="btn ghost" id="m-cancel">Annuler</button><button class="btn" id="del-ok">Supprimer</button></div>');
  }

  modal.addEventListener('click', (e) => {
    const id = e.target.id;
    if (id === 'm-cancel' || e.target === modal) closeModal();
    else if (id === 'ny-ok') {
      const v = parseInt($('#ny').value, 10);
      if (!(v >= 1990 && v <= 2200)) { $('#nyerr').textContent = 'Entre une année valide (1990 à 2200).'; return; }
      if (db.years[String(v)]) { $('#nyerr').textContent = 'L\'année ' + v + ' existe déjà.'; return; }
      db.years[String(v)] = C.createYear(db, String(v));
      closeModal();
      setYear(String(v));
    } else if (id === 'del-ok') {
      delete db.years[db.currentYear];
      const keys = C.yearKeys(db);
      closeModal();
      setYear(keys[keys.length - 1]);
    }
  });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'Enter' && $('#ny-ok')) $('#ny-ok').click();
  });

  ySelect.addEventListener('change', () => setYear(ySelect.value));
  $('#y-prev').addEventListener('click', () => { const k = C.yearKeys(db); setYear(k[k.indexOf(db.currentYear) - 1]); });
  $('#y-next').addEventListener('click', () => { const k = C.yearKeys(db); setYear(k[k.indexOf(db.currentYear) + 1]); });
  $('#y-new').addEventListener('click', newYearDialog);
  $('#y-del').addEventListener('click', deleteYearDialog);

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
     P&L OUTLOOK  (alimenté par le TRADE LOG)
     ==================================================================== */
  function clientBlock(ci) {
    const c = state.clients[ci];
    let h = '<div class="tbl-wrap"><table class="ctbl"><colgroup><col style="width:7%"><col style="width:9%"><col style="width:19%"><col style="width:16%">' +
      '<col style="width:13%"><col style="width:24%"><col style="width:12%"></colgroup>';
    h += '<tr><th class="hd yellow">Client</th><th class="hd yellow">Month</th><th class="hd yellow">Initial Balance</th>' +
      '<th class="hd yellow">Profit &amp; Loss</th><th class="hd yellow">Performance</th>' +
      '<th class="hd">' + esc(year()) + ' Total Performance</th><th class="hd">Risk/trade %</th></tr>';
    c.rows.forEach((row, i) => {
      h += '<tr>';
      if (i === 0) h += '<td class="name" rowspan="12"><span contenteditable="true" spellcheck="false" data-name="' + ci + '">' + esc(c.name) + '</span></td>';
      h += '<td class="m">' + C.MONTH_SHORT[i] + '</td>';
      if (i === 0) h += '<td class="bal"><input data-ci="' + ci + '" data-f="balance" value="' + balInput(c.balance) + '"></td>';
      else h += '<td class="bal calc" data-bal="' + ci + '-' + i + '"></td>';
      h += '<td class="calc" data-pl="' + ci + '-' + i + '"></td>';
      h += '<td class="calc" data-perf="' + ci + '-' + i + '"></td>';
      if (i === 0) h += '<td class="total" rowspan="12" data-total="' + ci + '"></td>';
      if (ci === 0) h += '<td class="risk calc" data-risk="' + ci + '-' + i + '" style="text-align:center"></td>';
      else h += '<td class="risk"><input class="c" data-ci="' + ci + '" data-i="' + i + '" data-f="risk" value="' + inputVal(row.risk) + '"></td>';
      h += '</tr>';
    });
    return h + '</table></div>';
  }

  function renderOutlook() {
    let months = '';
    C.MONTHS.forEach((m, i) => {
      months += '<div class="mcard"><div class="chart h-sm" id="evo-' + i + '"></div><div class="chart h-sm" id="mpl-' + i + '"></div></div>';
    });
    view.innerHTML =
      '<div class="banner"><img src="logo.png" alt="">' +
      '<div class="quotes">"The market is a device for transferring money from the impatient to the patient." – Warren Buffet<br>' +
      '"Trade what’s happening… Not what you think is gonna happen." – Doug Gregory</div></div>' +
      '<div class="ol-pad">' +
      '<div class="kpis">' +
      '<div class="kpi">AuM / Investors<div class="v"><input id="aum" value="' + esc(state.aum) + '"></div></div>' +
      '<div class="kpi">Return ' + esc(year()) + '<div class="v g" id="k-ret"></div></div>' +
      '<div class="kpi">Expectancy<div class="v" id="k-exp"></div></div>' +
      '<div class="kpi">Monthly Average<div class="v g" id="k-avg"></div></div></div>' +
      '<div class="ol-grid"><div class="ol-left">' +
      clientBlock(0) + clientBlock(1) + clientBlock(2) +
      '<div class="hint">Profit &amp; Loss, Performance et Risk/trade % du 1er client sont calculés à partir du TRADE LOG. ' +
      'Pour les autres clients : Performance = RR du mois × Risk/trade %, puis P&amp;L = Performance × solde. ' +
      'Le solde du mois suivant = solde + P&amp;L.</div>' +
      '<div class="notes-box"><h3>NOTES</h3><textarea id="notes" spellcheck="false">' + esc(state.notes) + '</textarea>' +
      '<table class="quarters" id="quarters"></table></div></div>' +
      '<div class="ol-right"><div class="chart h-lg" id="c-main"></div><div class="chart h-md" id="c-pertrade"></div>' +
      '<div class="chart h-md" id="c-monthperf"></div>' +
      '<div class="donut-row"><div class="chart h-donut" id="c-wl"></div><div class="chart h-donut" id="c-pl"></div><div class="chart h-donut" id="c-q"></div></div>' +
      '</div></div>' +
      '<h2 class="sec">Évolution mensuelle</h2><div class="month-grid">' + months + '</div></div>';
    updateCurrent = updateOutlook;
    updateOutlook();
  }

  function updateOutlook() {
    model = C.compute(state);
    const y = year();
    const noTrades = (i) => model.ms[i].totalTrades === 0;
    model.clients.forEach((cl, ci) => {
      cl.balances.forEach((b, i) => {
        if (i > 0) { const cell = $('[data-bal="' + ci + '-' + i + '"]'); if (cell) cell.textContent = b === null ? '' : nf(b, 0); }
        const pl = $('[data-pl="' + ci + '-' + i + '"]');
        const pf = $('[data-perf="' + ci + '-' + i + '"]');
        const rk = $('[data-risk="' + ci + '-' + i + '"]');
        if (pl) pl.textContent = noTrades(i) ? '' : fmtSigned(cl.pnl[i]);
        if (pf) pf.textContent = noTrades(i) || cl.perf[i] === null ? '' : fmtPct(cl.perf[i], 1);
        if (rk) rk.textContent = cl.riskPct[i] === null ? '' : fmtNum(cl.riskPct[i], 2);
      });
      $('[data-total="' + ci + '"]').textContent = fmtPct(cl.total, 2);
    });
    $('#k-ret').textContent = fmtPct(model.clients[0].total, 2);
    $('#k-exp').textContent = fmtNum(model.global.expectancy, 2);
    $('#k-avg').textContent = fmtPct(model.monthlyAvg, 2);
    $('#quarters').innerHTML = model.quarters.map((v, i) => '<tr><td>Q' + (i + 1) + '</td><td>' + fmtPct(v, 2) + '</td></tr>').join('');

    const g = model.global;
    CH.area($('#c-main'), { title: y + ' P&L General FX', values: g.series.cumPnl, yFmt: CH.fmtDollar, color: CH.ORANGE });
    CH.bar($('#c-pertrade'), { title: y + ' P&L per trade', values: g.series.rrLead, fmt: (v) => fmtNum(v, 2) });
    CH.bar($('#c-monthperf'), {
      title: 'Monthly Performance', values: model.clients[0].perf.map((v) => v || 0), labels: C.MONTH_SHORT,
      yFmt: (v) => fmtPct(v, 1), fmt: (v) => fmtPct(v, 1)
    });
    CH.donut($('#c-wl'), { title: 'Win / Loss', values: [g.wins, g.losses], colors: [CH.GREEN, CH.RED] });
    CH.donut($('#c-pl'), { title: 'Profit / Loss', values: [g.totalProfits, g.totalLosses], colors: [CH.GREEN, CH.RED] });
    CH.bar($('#c-q'), {
      title: 'Quarterly Performance', values: model.quarters, labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      yFmt: (v) => fmtPct(v, 0), fmt: (v) => fmtPct(v, 1), small: true
    });
    C.MONTHS.forEach((m, i) => {
      const s = model.ms[i].series;
      CH.area($('#evo-' + i), { title: C.MONTH_TITLE[i] + ' evolution', values: s.cumRR, small: true });
      CH.bar($('#mpl-' + i), { title: C.MONTH_TITLE[i] + ' P&L', values: s.pnlLead, small: true, fmt: (v) => fmtNum(v, 0) });
    });
  }

  /* ====================================================================
     Feuilles mensuelles (JAN … DEC)
     ==================================================================== */
  function renderMonth(i) {
    view.innerHTML =
      '<h1 class="month-title">' + C.MONTH_FULL[i] + ' PERFORMANCE<small>' + esc(year()) + '</small></h1>' +
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
    model = C.compute(state);
    const s = model.ms[i];
    const perf = model.clients[0].perf[i];
    $('#m-rr').textContent = fmtNum(s.returnRR, 2);
    $('#m-pct').textContent = s.totalTrades === 0 ? '-' : fmtPct(perf, 1);
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
     TRADE LOG  (on saisit les trades dans les colonnes des mois ; le global se calcule tout seul)
     ==================================================================== */
  const TL_NAMES = ['Jan', 'Feb', 'March', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  let tlRefs = {};

  function tlRowHtml(r) {
    let h = '<tr><td class="c0" data-t="gpl" data-r="' + r + '"></td><td class="c1" data-t="gpt" data-r="' + r + '"></td>' +
      '<td class="c0" data-t="grr" data-r="' + r + '"></td><td class="c1" data-t="grt" data-r="' + r + '"></td><td class="gap"></td>';
    for (let m = 0; m < 12; m++) {
      const k = m % 2 === 0 ? 'c0' : 'c1';
      h += '<td class="' + k + '" data-t="p' + m + '" data-r="' + r + '"></td><td class="' + k + '" data-t="t' + m + '" data-r="' + r + '"></td>' +
        '<td class="in' + (m % 2 === 0 ? ' g' : '') + '"><input data-m="' + m + '" data-r="' + r + '" value="' + inputVal(state.months[C.MONTHS[m]][r]) + '"></td>';
    }
    return h + '</tr>';
  }

  function registerTlRefs() {
    tlRefs = {};
    view.querySelectorAll('[data-t]').forEach((td) => { tlRefs[td.dataset.t + '-' + td.dataset.r] = td; });
  }

  function renderTradeLog() {
    model = C.compute(state);
    const maxLen = Math.max.apply(null, C.MONTHS.map((m) => state.months[m].length));
    tlRows = Math.max(tlRows, 40, maxLen + 10, model.allRR.length + 10);
    let h = '<div class="tl-head"><img src="logo.png" alt=""><div class="tl-top"><div class="tl-risk"><div class="risk-label">Risk per trade ($)</div>' +
      '<input class="risk-input" id="risk" value="' + inputVal(state.risk) + '"></div>' +
      '<div class="tl-info">Année ' + esc(year()) + ' — saisis les trades (en RR) dans les colonnes « Trades » de chaque mois.<br>' +
      'Les colonnes globales, P&amp;L OUTLOOK et les feuilles JAN à DEC se mettent à jour automatiquement.</div></div></div>' +
      '<div class="tl-wrap"><table class="tl"><thead><tr><th>Global P&amp;L</th><th>P&amp;L per trade</th><th>Global RR</th><th>RR/trade</th><th class="gap"></th>';
    TL_NAMES.forEach((n) => { h += '<th>' + n + ' P&amp;L</th><th>' + n + ' Total</th><th class="y">' + n + ' Trades</th>'; });
    h += '</tr></thead><tbody>';
    h += '<tr><td class="c0">$0</td><td class="c1">$0</td><td class="c0">0</td><td class="c1">0</td><td class="gap"></td>';
    for (let m = 0; m < 12; m++) { const k = m % 2 === 0 ? 'c0' : 'c1'; h += '<td class="' + k + '">0</td><td class="' + k + '">0</td><td class="' + k + '">0</td>'; }
    h += '</tr>';
    for (let r = 0; r < tlRows; r++) h += tlRowHtml(r);
    h += '</tbody></table><button class="tl-add" id="tl-add">+ Ajouter 30 lignes</button></div>';
    view.innerHTML = h;
    registerTlRefs();
    updateCurrent = refreshTradeLog;
    refreshTradeLog();
  }

  function growTradeLog(n) {
    const tb = view.querySelector('.tl tbody');
    if (!tb) return;
    let h = '';
    for (let r = tlRows; r < tlRows + n; r++) h += tlRowHtml(r);
    tb.insertAdjacentHTML('beforeend', h);
    tlRows += n;
    registerTlRefs();
  }

  function refreshTradeLog() {
    model = C.compute(state);
    if (model.allRR.length + 1 > tlRows) growTradeLog(30);
    const risk = C.parseNum(state.risk) || 0;
    const set = (k, r, txt) => { const td = tlRefs[k + '-' + r]; if (td) td.textContent = txt; };
    let cumP = 0;
    let cumR = 0;
    const cumM = new Array(12).fill(0);
    for (let r = 0; r < tlRows; r++) {
      if (r < model.allRR.length) {
        const g = model.allRR[r];
        cumP += risk * g; cumR += g;
        set('gpl', r, fmtMoney(cumP)); set('gpt', r, fmtMoney(risk * g)); set('grr', r, fmtPlain(cumR)); set('grt', r, fmtPlain(g));
      } else { set('gpl', r, '-'); set('gpt', r, '-'); set('grr', r, '-'); set('grt', r, '-'); }
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
    if (t.id === 'risk') state.risk = C.parseNum(t.value) === null ? 0 : C.parseNum(t.value);
    else if (t.dataset && t.dataset.m !== undefined && t.closest('.tl')) {
      const arr = state.months[C.MONTHS[+t.dataset.m]];
      const r = +t.dataset.r;
      while (arr.length <= r) arr.push(null);
      arr[r] = C.parseNum(t.value);
    } else if (t.dataset && t.dataset.f) {
      const c = state.clients[+t.dataset.ci];
      const v = C.parseNum(t.value);
      if (t.dataset.f === 'balance') c.balance = v;
      else if (t.dataset.f === 'risk') c.rows[+t.dataset.i].risk = v;
    } else if (t.id === 'aum') state.aum = t.value;
    else if (t.id === 'notes') { state.notes = t.value; scheduleSave(); return; }
    else return;
    updateCurrent();
    scheduleSave();
  });

  view.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.f === 'balance') t.value = balInput(state.clients[+t.dataset.ci].balance);
  });

  view.addEventListener('blur', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.name !== undefined) {
      state.clients[+t.dataset.name].name = t.textContent.trim() || state.clients[+t.dataset.name].name;
      scheduleSave();
    }
  }, true);

  view.addEventListener('click', (e) => {
    if (e.target.id === 'tl-add') { growTradeLog(30); refreshTradeLog(); }
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
    db = C.normalizeDb(saved);
    state = db.years[db.currentYear];
    ready = true;
    if (window.api && window.api.onImported) {
      window.api.onImported((data) => {
        db = C.normalizeDb(data);
        state = db.years[db.currentYear];
        tlRows = 40;
        doSave();
        renderYearBar();
        render();
      });
    }
    renderYearBar();
    render();
  }
  init();
})();

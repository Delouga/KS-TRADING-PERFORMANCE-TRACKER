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

  /* ====================================================================
     Langues : français / anglais
     ==================================================================== */
  const I18N = {
    fr: {
      year: 'Année', prevYear: 'Année précédente', nextYear: 'Année suivante', chooseYear: 'Choisir une année',
      newYear: '+ Nouvelle année', delYear: 'Supprimer cette année',
      tabOutlook: 'SYNTHÈSE P&L', tabLog: 'JOURNAL DES TRADES',
      months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      monthsShort: ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
      tabMonths: ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'],
      tlMonths: ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'],
      mNewTitle: 'Nouvelle année',
      mNewText: 'Les soldes de départ (soldes de fin de l\'année précédente) et les réglages de risque sont repris automatiquement. Les trades commencent vides. Les années existantes ne sont pas modifiées.',
      mYearLbl: 'Année', errInvalid: 'Entre une année valide (1990 à 2200).', errExists: (y) => 'L\'année ' + y + ' existe déjà.',
      cancel: 'Annuler', create: 'Créer l\'année',
      mDelTitle: (y) => 'Supprimer l\'année ' + y + ' ?',
      mDelText: 'Tous les trades et réglages de cette année seront supprimés définitivement. Pense à faire une sauvegarde avant (menu Fichier &gt; Exporter une sauvegarde).',
      del: 'Supprimer',
      thClient: 'Client', thMonth: 'Mois', thBalance: 'Solde initial', thPL: 'Profit &amp; Perte', thPerf: 'Performance',
      thTotal: (y) => 'Performance totale ' + y, thRisk: 'Risque/trade %',
      kpiAum: 'AuM / Investisseurs', kpiReturn: (y) => 'Rendement ' + y, kpiExp: 'Espérance', kpiAvg: 'Moyenne mensuelle',
      hint: 'Profit &amp; Perte, Performance et Risque/trade % du 1er client sont calculés à partir du journal des trades. Pour les autres clients : Performance = RR du mois × Risque/trade %, puis P&amp;L = Performance × solde. Le solde du mois suivant = solde + P&amp;L.',
      notes: 'NOTES', secMonthly: 'Évolution mensuelle',
      chMain: (y) => y + ' P&L général FX', chPerTrade: (y) => y + ' P&L par trade', chMonthPerf: 'Performance mensuelle',
      chWL: 'Gains / Pertes', chPLoss: 'Profit / Perte', chQuarter: 'Performance trimestrielle', q: (i) => 'T' + i,
      chEvo: (m) => 'Évolution ' + m, chMPL: (m) => 'P&L ' + m,
      monthTitle: (m) => m.toUpperCase() + ' – PERFORMANCE',
      grpPerf: 'Performance', grpTrades: 'Trades', grpMoney: 'Profits &amp; pertes',
      mRR: 'Rendement RR', mPct: 'Rendement %', mExp: 'Espérance par trade', mTotal: 'Total trades', mWins: 'Gains', mLosses: 'Pertes',
      mPctWon: '% Gagnants', mPctLost: '% Perdants', mTotProfit: 'Total profits', mTotLoss: 'Total pertes', mNet: 'NET',
      mProfitPct: 'Profit %', mLossPct: 'Perte %',
      cPL: 'P&L', cPerTrade: 'P&L par trade', cHit: 'Taux de réussite', cProfitLoss: 'Profit / Perte',
      tlRisk: (s) => 'Risque par trade (' + s + ')',
      curLabel: 'Devise du compte',
      curNames: { USD: 'Dollar américain', EUR: 'Euro', GBP: 'Livre sterling', JPY: 'Yen japonais', CHF: 'Franc suisse', CAD: 'Dollar canadien', AUD: 'Dollar australien', NZD: 'Dollar néo-zélandais' },
      tlInfo: (y) => 'Année ' + y + ' — saisis les trades (en RR) dans les colonnes « Trades » de chaque mois.<br>Les colonnes globales, la synthèse P&amp;L et les feuilles JAN à DEC se mettent à jour automatiquement.',
      tlGPL: 'P&amp;L global', tlGPT: 'P&amp;L par trade', tlGRR: 'RR global', tlRRT: 'RR/trade', tlAdd: '+ Ajouter 30 lignes'
    },
    en: {
      year: 'Year', prevYear: 'Previous year', nextYear: 'Next year', chooseYear: 'Choose a year',
      newYear: '+ New year', delYear: 'Delete this year',
      tabOutlook: 'P&L OUTLOOK', tabLog: 'TRADE LOG',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'March', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      tabMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      tlMonths: ['Jan', 'Feb', 'March', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
      mNewTitle: 'New year',
      mNewText: 'Starting balances (previous year\'s closing balances) and risk settings are carried over automatically. Trades start empty. Existing years are not changed.',
      mYearLbl: 'Year', errInvalid: 'Enter a valid year (1990 to 2200).', errExists: (y) => 'Year ' + y + ' already exists.',
      cancel: 'Cancel', create: 'Create year',
      mDelTitle: (y) => 'Delete year ' + y + '?',
      mDelText: 'All trades and settings of this year will be permanently deleted. Consider making a backup first (File &gt; Export a backup).',
      del: 'Delete',
      thClient: 'Client', thMonth: 'Month', thBalance: 'Initial Balance', thPL: 'Profit &amp; Loss', thPerf: 'Performance',
      thTotal: (y) => y + ' Total Performance', thRisk: 'Risk/trade %',
      kpiAum: 'AuM / Investors', kpiReturn: (y) => 'Return ' + y, kpiExp: 'Expectancy', kpiAvg: 'Monthly Average',
      hint: 'Profit &amp; Loss, Performance and Risk/trade % of the 1st client are calculated from the trade log. For the other clients: Performance = the month\'s RR × Risk/trade %, then P&amp;L = Performance × balance. Next month\'s balance = balance + P&amp;L.',
      notes: 'NOTES', secMonthly: 'Monthly evolution',
      chMain: (y) => y + ' P&L General FX', chPerTrade: (y) => y + ' P&L per trade', chMonthPerf: 'Monthly Performance',
      chWL: 'Win / Loss', chPLoss: 'Profit / Loss', chQuarter: 'Quarterly Performance', q: (i) => 'Q' + i,
      chEvo: (m) => m + ' evolution', chMPL: (m) => m + ' P&L',
      monthTitle: (m) => m.toUpperCase() + ' PERFORMANCE',
      grpPerf: 'Performance', grpTrades: 'Trades', grpMoney: 'Profits &amp; losses',
      mRR: 'Return RR', mPct: 'Return %', mExp: 'Trade Expectancy', mTotal: 'Total Trades', mWins: 'Wins', mLosses: 'Losses',
      mPctWon: '% Won', mPctLost: '% Lost', mTotProfit: 'Total Profits', mTotLoss: 'Total Losses', mNet: 'NET',
      mProfitPct: 'Profit%', mLossPct: 'Loss%',
      cPL: 'P & L', cPerTrade: 'P & L per trade', cHit: 'Hit Rate', cProfitLoss: 'Profit/Loss',
      tlRisk: (s) => 'Risk per trade (' + s + ')',
      curLabel: 'Account currency',
      curNames: { USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', CHF: 'Swiss Franc', CAD: 'Canadian Dollar', AUD: 'Australian Dollar', NZD: 'New Zealand Dollar' },
      tlInfo: (y) => 'Year ' + y + ' — enter your trades (in RR) in each month\'s "Trades" column.<br>The global columns, P&amp;L OUTLOOK and the JAN–DEC sheets update automatically.',
      tlGPL: 'Global P&amp;L', tlGPT: 'P&amp;L per trade', tlGRR: 'Global RR', tlRRT: 'RR/trade', tlAdd: '+ Add 30 rows'
    }
  };
  let lang = 'fr';
  const LOCALES = { fr: 'fr-FR', en: 'en-US' };
  const t = (k, a) => { const v = I18N[lang][k]; return typeof v === 'function' ? v(a) : v; };

  /* ---------- Formats (selon la langue) ---------- */
  const nf = (v, d) => v.toLocaleString(LOCALES[lang], { maximumFractionDigits: d === undefined ? 2 : d });
  const dec = (str) => (lang === 'fr' ? str.replace('.', ',') : str);
  const fmtNum = (v, d) => (v === null || v === undefined ? '-' : nf(v, d === undefined ? 2 : d));
  const fmtPct = (v, d) => (v === null || v === undefined ? '-' :
    (v * 100).toLocaleString(LOCALES[lang], { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }) + '%');
  /* Devises : le symbole s'affiche à droite en français (1 600 €) et à gauche en anglais (€1,600). */
  const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'CHF', CAD: 'CA$', AUD: 'A$', NZD: 'NZ$' };
  const curOf = (ci) => (state.clients[ci] && state.clients[ci].currency) || 'USD';
  const symOf = (ci) => SYMBOLS[curOf(ci)];
  function moneyIn(v, code, decimals) {
    const d = decimals === undefined ? 0 : decimals;
    const n = d === 0 ? nf(Math.abs(Math.round(v)), 0) : Math.abs(v).toLocaleString(LOCALES[lang], { minimumFractionDigits: d, maximumFractionDigits: d });
    const neg = v < 0 && Math.abs(v) >= (d === 0 ? 0.5 : 0.005) ? '-' : '';
    const sy = SYMBOLS[code] || '$';
    if (lang === 'fr') return neg + n + '\u00a0' + sy;
    return neg + sy + (sy === 'CHF' ? '\u00a0' : '') + n;
  }
  const hasCents = (v) => Math.abs(v * 100 - Math.round(v) * 100) > 0.5;
  const money = (v, ci) => moneyIn(v, curOf(ci), 0);
  const fmtMoney = (v) => money(v, 0);
  const fmtAccC = (v) => (v === null || v === undefined || Math.abs(v) < 1e-9 ? '-' : money(v, 0));
  const fmtPlain = (v) => dec(String(+v.toFixed(2)));
  const inputVal = (v) => (v === null || v === undefined ? '' : dec(String(v)));
  const balInput = (v, ci) => (v === null || v === undefined ? '' : moneyIn(v, curOf(ci), hasCents(v) ? 2 : 0));
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
    openModal('<h3>' + t('mNewTitle') + '</h3><p>' + t('mNewText') + '</p>' +
      '<label>' + t('mYearLbl') + ' <input type="number" id="ny" min="1990" max="2200" value="' + next + '"></label>' +
      '<div class="merr" id="nyerr"></div>' +
      '<div class="mbtns"><button class="btn ghost" id="m-cancel">' + t('cancel') + '</button><button class="btn" id="ny-ok">' + t('create') + '</button></div>');
    $('#ny').focus();
  }

  function deleteYearDialog() {
    openModal('<h3>' + t('mDelTitle', year()) + '</h3><p>' + t('mDelText') + '</p>' +
      '<div class="mbtns"><button class="btn ghost" id="m-cancel">' + t('cancel') + '</button><button class="btn" id="del-ok">' + t('del') + '</button></div>');
  }

  modal.addEventListener('click', (e) => {
    const id = e.target.id;
    if (id === 'm-cancel' || e.target === modal) closeModal();
    else if (id === 'ny-ok') {
      const v = parseInt($('#ny').value, 10);
      if (!(v >= 1990 && v <= 2200)) { $('#nyerr').textContent = t('errInvalid'); return; }
      if (db.years[String(v)]) { $('#nyerr').textContent = t('errExists', v); return; }
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
  function renderTabs() {
    const tabs = [{ id: 'outlook', label: t('tabOutlook'), cls: 'tab-green' }, { id: 'tradelog', label: t('tabLog'), cls: 'tab-orange' }]
      .concat(C.MONTHS.map((m, i) => ({ id: m, label: I18N[lang].tabMonths[i], cls: '' })));
    tabsEl.innerHTML = tabs.map((x) =>
      '<button data-tab="' + x.id + '" class="' + x.cls + (x.id === current ? ' active' : '') + '">' + x.label + '</button>').join('');
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
    const names = I18N[lang].curNames;
    let h = '<div class="cblock"><div class="cur-row"><label>' + t('curLabel') + ' <select data-ci="' + ci + '" data-f="currency">' +
      C.CURRENCIES.map((k) => '<option value="' + k + '"' + (k === curOf(ci) ? ' selected' : '') + '>' + k + ' — ' + names[k] + ' (' + SYMBOLS[k] + ')</option>').join('') +
      '</select></label></div><div class="tbl-wrap"><table class="ctbl"><colgroup><col style="width:7%"><col style="width:9%"><col style="width:19%"><col style="width:16%">' +
      '<col style="width:13%"><col style="width:24%"><col style="width:12%"></colgroup>';
    h += '<tr><th class="hd yellow">' + t('thClient') + '</th><th class="hd yellow">' + t('thMonth') + '</th><th class="hd yellow">' + t('thBalance') + '</th>' +
      '<th class="hd yellow">' + t('thPL') + '</th><th class="hd yellow">' + t('thPerf') + '</th>' +
      '<th class="hd">' + t('thTotal', esc(year())) + '</th><th class="hd">' + t('thRisk') + '</th></tr>';
    c.rows.forEach((row, i) => {
      h += '<tr>';
      if (i === 0) h += '<td class="name" rowspan="12"><span contenteditable="true" spellcheck="false" data-name="' + ci + '">' + esc(c.name) + '</span></td>';
      h += '<td class="m">' + I18N[lang].monthsShort[i] + '</td>';
      if (i === 0) h += '<td class="bal"><input data-ci="' + ci + '" data-f="balance" value="' + balInput(c.balance, ci) + '"></td>';
      else h += '<td class="bal calc" data-bal="' + ci + '-' + i + '"></td>';
      h += '<td class="calc" data-pl="' + ci + '-' + i + '"></td>';
      h += '<td class="calc" data-perf="' + ci + '-' + i + '"></td>';
      if (i === 0) h += '<td class="total" rowspan="12" data-total="' + ci + '"></td>';
      if (ci === 0) h += '<td class="risk calc" data-risk="' + ci + '-' + i + '" style="text-align:center"></td>';
      else h += '<td class="risk"><input class="c" data-ci="' + ci + '" data-i="' + i + '" data-f="risk" value="' + inputVal(row.risk) + '"></td>';
      h += '</tr>';
    });
    return h + '</table></div></div>';
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
      '<div class="kpi">' + t('kpiAum') + '<div class="v"><input id="aum" value="' + esc(state.aum) + '"></div></div>' +
      '<div class="kpi">' + t('kpiReturn', esc(year())) + '<div class="v g" id="k-ret"></div></div>' +
      '<div class="kpi">' + t('kpiExp') + '<div class="v" id="k-exp"></div></div>' +
      '<div class="kpi">' + t('kpiAvg') + '<div class="v g" id="k-avg"></div></div></div>' +
      '<div class="ol-grid"><div class="ol-left">' +
      clientBlock(0) + clientBlock(1) + clientBlock(2) +
      '<div class="hint">' + t('hint') + '</div>' +
      '<div class="notes-box"><h3>' + t('notes') + '</h3><textarea id="notes" spellcheck="false">' + esc(state.notes) + '</textarea>' +
      '<table class="quarters" id="quarters"></table></div></div>' +
      '<div class="ol-right"><div class="chart h-lg" id="c-main"></div><div class="chart h-md" id="c-pertrade"></div>' +
      '<div class="chart h-md" id="c-monthperf"></div>' +
      '<div class="donut-row"><div class="chart h-donut" id="c-wl"></div><div class="chart h-donut" id="c-pl"></div><div class="chart h-donut" id="c-q"></div></div>' +
      '</div></div>' +
      '<h2 class="sec">' + t('secMonthly') + '</h2><div class="month-grid">' + months + '</div></div>';
    updateCurrent = updateOutlook;
    updateOutlook();
  }

  function updateOutlook() {
    model = C.compute(state);
    const y = year();
    const noTrades = (i) => model.ms[i].totalTrades === 0;
    model.clients.forEach((cl, ci) => {
      cl.balances.forEach((b, i) => {
        if (i > 0) { const cell = $('[data-bal="' + ci + '-' + i + '"]'); if (cell) cell.textContent = b === null ? '' : money(b, ci); }
        const pl = $('[data-pl="' + ci + '-' + i + '"]');
        const pf = $('[data-perf="' + ci + '-' + i + '"]');
        const rk = $('[data-risk="' + ci + '-' + i + '"]');
        if (pl) pl.textContent = noTrades(i) || cl.pnl[i] === null ? '' : money(cl.pnl[i], ci);
        if (pf) pf.textContent = noTrades(i) || cl.perf[i] === null ? '' : fmtPct(cl.perf[i], 1);
        if (rk) rk.textContent = cl.riskPct[i] === null ? '' : fmtNum(cl.riskPct[i], 2);
      });
      $('[data-total="' + ci + '"]').textContent = fmtPct(cl.total, 2);
    });
    $('#k-ret').textContent = fmtPct(model.clients[0].total, 2);
    $('#k-exp').textContent = fmtNum(model.global.expectancy, 2);
    $('#k-avg').textContent = fmtPct(model.monthlyAvg, 2);
    $('#quarters').innerHTML = model.quarters.map((v, i) => '<tr><td>' + t('q', i + 1) + '</td><td>' + fmtPct(v, 2) + '</td></tr>').join('');

    const g = model.global;
    CH.area($('#c-main'), { title: t('chMain', y), values: g.series.cumPnl, yFmt: (v) => money(v, 0), color: CH.ORANGE });
    CH.bar($('#c-pertrade'), { title: t('chPerTrade', y), values: g.series.rrLead, fmt: (v) => fmtNum(v, 2) });
    CH.bar($('#c-monthperf'), {
      title: t('chMonthPerf'), values: model.clients[0].perf.map((v) => v || 0), labels: I18N[lang].monthsShort,
      yFmt: (v) => fmtPct(v, 1), fmt: (v) => fmtPct(v, 1)
    });
    CH.donut($('#c-wl'), { title: t('chWL'), values: [g.wins, g.losses], colors: [CH.GREEN, CH.RED] });
    CH.donut($('#c-pl'), { title: t('chPLoss'), values: [g.totalProfits, g.totalLosses], colors: [CH.GREEN, CH.RED] });
    CH.bar($('#c-q'), {
      title: t('chQuarter'), values: model.quarters, labels: [1, 2, 3, 4].map((i) => t('q', i)),
      yFmt: (v) => fmtPct(v, 0), fmt: (v) => fmtPct(v, 1), small: true
    });
    C.MONTHS.forEach((m, i) => {
      const s = model.ms[i].series;
      CH.area($('#evo-' + i), { title: t('chEvo', I18N[lang].months[i]), values: s.cumRR, small: true });
      CH.bar($('#mpl-' + i), { title: t('chMPL', I18N[lang].months[i]), values: s.pnlLead, small: true, fmt: (v) => fmtNum(v, 0) });
    });
  }

  /* ====================================================================
     Feuilles mensuelles (JAN … DEC)
     ==================================================================== */
  function kpi(id, label) { return '<div class="kpi">' + label + '<div class="v" id="' + id + '"></div></div>'; }
  function setV(id, txt, sign) {
    const el = $('#' + id);
    el.textContent = txt;
    el.classList.remove('g', 'r');
    if (sign > 0) el.classList.add('g'); else if (sign < 0) el.classList.add('r');
  }

  function renderMonth(i) {
    view.innerHTML =
      '<h1 class="month-title">' + t('monthTitle', I18N[lang].months[i]) + '<small>' + esc(year()) + '</small></h1>' +
      '<div class="ol-pad">' +
      '<h3 class="sub">' + t('grpPerf') + '</h3><div class="kpis">' +
      kpi('m-rr', t('mRR')) + kpi('m-pct', t('mPct')) + kpi('m-exp', t('mExp')) + '</div>' +
      '<h3 class="sub">' + t('grpTrades') + '</h3><div class="kpis m5">' +
      kpi('m-n', t('mTotal')) + kpi('m-w', t('mWins')) + kpi('m-l', t('mLosses')) + kpi('m-pw', t('mPctWon')) + kpi('m-pl2', t('mPctLost')) + '</div>' +
      '<h3 class="sub">' + t('grpMoney') + '</h3><div class="kpis m5">' +
      kpi('m-tp', t('mTotProfit')) + kpi('m-tl', t('mTotLoss')) + kpi('m-net', t('mNet')) + kpi('m-pp', t('mProfitPct')) + kpi('m-lp', t('mLossPct')) + '</div>' +
      '<div class="mgrid"><div class="chart" id="m-area"></div><div class="chart" id="m-bar"></div>' +
      '<div class="chart" id="m-hit"></div><div class="chart" id="m-plc"></div></div></div>';
    updateCurrent = function () { updateMonth(i); };
    updateMonth(i);
  }

  function updateMonth(i) {
    model = C.compute(state);
    const s = model.ms[i];
    const perf = model.clients[0].perf[i];
    setV('m-rr', fmtNum(s.returnRR, 2), s.totalTrades ? s.returnRR : 0);
    setV('m-pct', s.totalTrades === 0 ? '-' : fmtPct(perf, 1), s.totalTrades && perf !== null ? perf : 0);
    setV('m-exp', fmtNum(s.expectancy, 2), s.expectancy || 0);
    setV('m-n', String(s.totalTrades));
    setV('m-w', String(s.wins), s.wins ? 1 : 0);
    setV('m-l', String(s.losses), s.losses ? -1 : 0);
    setV('m-pw', fmtPct(s.pctWon, 0));
    setV('m-pl2', fmtPct(s.pctLost, 0));
    setV('m-tp', fmtAccC(s.totalProfits), s.totalProfits ? 1 : 0);
    setV('m-tl', fmtAccC(s.totalLosses), s.totalLosses ? -1 : 0);
    setV('m-net', fmtAccC(s.net), s.net);
    setV('m-pp', fmtPct(s.profitPct, 0));
    setV('m-lp', fmtPct(s.lossPct, 0));
    CH.area($('#m-area'), { title: t('cPL'), values: s.series.cumRR });
    CH.bar($('#m-bar'), { title: t('cPerTrade'), values: s.series.rrLead, fmt: (v) => fmtNum(v, 2) });
    CH.donut($('#m-hit'), { title: t('cHit'), values: [s.pctLost || 0, s.pctWon || 0], colors: [CH.RED, CH.GREEN] });
    CH.donut($('#m-plc'), { title: t('cProfitLoss'), values: [s.lossPct || 0, s.profitPct || 0], colors: [CH.RED, CH.GREEN] });
  }

  /* ====================================================================
     TRADE LOG  (on saisit les trades dans les colonnes des mois ; le global se calcule tout seul)
     ==================================================================== */
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
    let h = '<div class="tl-head"><img src="logo.png" alt=""><div class="tl-top"><div class="tl-risk"><div class="risk-label">' + t('tlRisk', symOf(0)) + '</div>' +
      '<input class="risk-input" id="risk" value="' + inputVal(state.risk) + '"></div>' +
      '<div class="tl-info">' + t('tlInfo', esc(year())) + '</div></div></div>' +
      '<div class="tl-wrap"><table class="tl"><thead><tr><th>' + t('tlGPL') + '</th><th>' + t('tlGPT') + '</th><th>' + t('tlGRR') + '</th><th>' + t('tlRRT') + '</th><th class="gap"></th>';
    I18N[lang].tlMonths.forEach((n) => { h += '<th>' + n + ' P&amp;L</th><th>' + n + ' Total</th><th class="y">' + n + ' Trades</th>'; });
    h += '</tr></thead><tbody>';
    h += '<tr><td class="c0">' + money(0, 0) + '</td><td class="c1">' + money(0, 0) + '</td><td class="c0">0</td><td class="c1">0</td><td class="gap"></td>';
    for (let m = 0; m < 12; m++) { const k = m % 2 === 0 ? 'c0' : 'c1'; h += '<td class="' + k + '">0</td><td class="' + k + '">0</td><td class="' + k + '">0</td>'; }
    h += '</tr>';
    for (let r = 0; r < tlRows; r++) h += tlRowHtml(r);
    h += '</tbody></table><button class="tl-add" id="tl-add">' + t('tlAdd') + '</button></div>';
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
    if (t.dataset && t.dataset.f === 'currency') {
      state.clients[+t.dataset.ci].currency = t.value;
      scheduleSave();
      const st = view.scrollTop;
      render();
      view.scrollTop = st;
    } else if (t.dataset && t.dataset.f === 'balance') t.value = balInput(state.clients[+t.dataset.ci].balance, +t.dataset.ci);
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

  /* ---------- Changement de langue ---------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('.langsw .btn').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  }
  function applyLang(l) {
    lang = l === 'en' ? 'en' : 'fr';
    C.setLang(lang);
    CH.setLocale(LOCALES[lang]);
    if (window.api && window.api.setLang) window.api.setLang(lang);
    applyStatic();
  }
  document.querySelector('.langsw').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (!b || b.dataset.lang === lang) return;
    closeModal();
    applyLang(b.dataset.lang);
    db.lang = lang;
    scheduleSave();
    renderYearBar();
    render();
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
    applyLang(db.lang);
    ready = true;
    if (window.api && window.api.onImported) {
      window.api.onImported((data) => {
        db = C.normalizeDb(data);
        state = db.years[db.currentYear];
        applyLang(db.lang);
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

/* Calculs : reproduisent les formules du classeur Excel d'origine. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const TAB_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTH_FULL = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const MONTH_TITLE = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT = ['Jan', 'Feb', 'March', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseNum(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.').replace('%', ''));
    return isFinite(n) ? n : null;
  }

  function compact(arr) {
    return (arr || []).map(parseNum).filter((x) => x !== null);
  }

  function sum(a) { return a.reduce((s, x) => s + x, 0); }

  function cumulative(a) {
    const out = [0];
    a.forEach((x) => out.push(out[out.length - 1] + x));
    return out; // commence par 0 (ligne 4 du TRADE LOG)
  }

  /** Série d'un mois (ou globale) à partir des RR saisis et du risque par trade ($). */
  function series(arr, risk) {
    const rr = compact(arr);
    const pnl = rr.map((x) => x * risk);
    return {
      rr,
      pnl,
      rrLead: [0].concat(rr),
      pnlLead: [0].concat(pnl),
      cumRR: cumulative(rr),
      cumPnl: cumulative(pnl)
    };
  }

  function ratio(a, b) { return b ? a / b : null; }

  /** Statistiques d'un mois ou du global (feuilles JAN..DEC). */
  function stats(arr, risk) {
    const s = series(arr, risk);
    const n = s.rr.length;
    const losses = s.rr.filter((x) => x < 0).length;
    const wins = s.rr.filter((x) => x >= 0).length;
    const totLoss = 0 - sum(s.pnl.filter((x) => x < 0));
    const totProfit = sum(s.pnl.filter((x) => x >= 0));
    return {
      series: s,
      returnRR: sum(s.rr),
      expectancy: n ? sum(s.rr) / n : null,
      totalTrades: n,
      losses,
      wins,
      pctLost: ratio(losses, n),
      pctWon: ratio(wins, n),
      totalLosses: totLoss,
      totalProfits: totProfit,
      net: sum(s.pnl),
      lossPct: ratio(totLoss, totLoss + totProfit),
      profitPct: ratio(totProfit, totLoss + totProfit)
    };
  }

  /** Tableau client de P&L OUTLOOK : solde initial chaîné + performance totale. */
  function clientTable(client) {
    const balances = [];
    client.rows.forEach((row, i) => {
      if (i === 0) balances.push(parseNum(client.balance));
      else {
        const prev = balances[i - 1];
        balances.push(prev === null ? null : prev + (parseNum(client.rows[i - 1].pl) || 0));
      }
    });
    const total = sum(client.rows.map((r) => parseNum(r.perf)).filter((x) => x !== null));
    return { balances, total };
  }

  function quarters(state) {
    const perf = state.clients[0].rows.map((r) => parseNum(r.perf) || 0);
    return [0, 3, 6, 9].map((i) => sum(perf.slice(i, i + 3)));
  }

  function monthlyAverage(state) {
    const v = state.clients[0].rows.map((r) => parseNum(r.perf)).filter((x) => x !== null);
    return v.length ? sum(v) / v.length : null;
  }

  function emptyClient(name, balance, risks, perf) {
    return {
      name,
      balance,
      rows: Array.from({ length: 12 }, (_, i) => ({
        pl: null,
        perf: perf === undefined ? null : perf,
        risk: risks[i] === undefined ? null : risks[i]
      }))
    };
  }

  /** Données de départ = contenu du classeur Excel fourni. */
  function defaultState() {
    return {
      version: 1,
      year: 2022,
      risk: 500,
      global: [3.2],
      months: {
        jan: [3.2], feb: [-1], mar: [3.7], apr: [4.3], may: [-1], jun: [-1],
        jul: [3], aug: [-1], sep: [3.2], oct: [-0.6], nov: [-1], dec: [-1]
      },
      aum: '$100,000',
      notes: '',
      clients: [
        emptyClient('Elliot (USD)', 100000, new Array(12).fill(0.5), 0.02),
        emptyClient('Other (EUR)', null, [1, 1, 1, 1]),
        emptyClient('Other (GBP)', null, [3.5, 3.5, 3.5])
      ]
    };
  }

  /** Complète un état chargé depuis le disque avec les valeurs manquantes. */
  function normalize(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign({}, d, s);
    out.months = Object.assign({}, d.months, s.months || {});
    MONTHS.forEach((m) => { if (!Array.isArray(out.months[m])) out.months[m] = []; });
    if (!Array.isArray(out.global)) out.global = [];
    if (!Array.isArray(out.clients) || out.clients.length !== 3) out.clients = d.clients;
    out.clients.forEach((c, i) => {
      if (!Array.isArray(c.rows) || c.rows.length !== 12) c.rows = d.clients[i].rows;
    });
    return out;
  }

  return {
    MONTHS, TAB_LABELS, MONTH_FULL, MONTH_TITLE, MONTH_SHORT,
    parseNum, compact, sum, series, stats, clientTable, quarters, monthlyAverage,
    defaultState, normalize
  };
});

/* Calculs : modèle connecté TRADE LOG -> P&L OUTLOOK -> feuilles mensuelles, avec plusieurs années. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const TAB_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTH_FULL = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const MONTH_TITLE = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT = ['Jan', 'Feb', 'March', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- Utilitaires ---------- */
  let LANG = 'fr';
  function setLang(l) { LANG = l === 'en' ? 'en' : 'fr'; }

  /** Lit un nombre saisi : "3,2" et "3.2" fonctionnent ; en anglais, "100,000" = cent mille. */
  function parseNum(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let t = String(v).replace(/[\s\u00a0\u202f]/g, '').replace('%', '').replace(/(CA|NZ|A|US)?\$|[€£¥]|CHF/gi, '');
    if (LANG === 'en' && /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
    else t = t.replace(',', '.');
    const n = parseFloat(t);
    return isFinite(n) ? n : null;
  }
  function compact(arr) { return (arr || []).map(parseNum).filter((x) => x !== null); }
  function sum(a) { return a.reduce((s, x) => s + x, 0); }
  function cumulative(a) { const out = [0]; a.forEach((x) => out.push(out[out.length - 1] + x)); return out; }
  function ratio(a, b) { return b ? a / b : null; }
  const round2 = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);

  /** Série d'un mois (ou globale) : RR saisis -> P&L en $, cumuls (commencent par 0). */
  function series(arr, risk) {
    const rr = compact(arr);
    const pnl = rr.map((x) => x * risk);
    return { rr, pnl, rrLead: [0].concat(rr), pnlLead: [0].concat(pnl), cumRR: cumulative(rr), cumPnl: cumulative(pnl) };
  }

  /** Statistiques (feuilles JAN..DEC et indicateurs globaux). */
  function stats(arr, risk) {
    const s = series(arr, risk);
    const n = s.rr.length;
    const losses = s.rr.filter((x) => x < 0).length;
    const wins = s.rr.filter((x) => x >= 0).length;
    const totLoss = 0 - sum(s.pnl.filter((x) => x < 0));
    const totProfit = sum(s.pnl.filter((x) => x >= 0));
    return {
      series: s, returnRR: sum(s.rr), expectancy: n ? sum(s.rr) / n : null, totalTrades: n, losses, wins,
      pctLost: ratio(losses, n), pctWon: ratio(wins, n), totalLosses: totLoss, totalProfits: totProfit, net: sum(s.pnl),
      lossPct: ratio(totLoss, totLoss + totProfit), profitPct: ratio(totProfit, totLoss + totProfit)
    };
  }

  /** Devises majeures proposables pour un compte. */
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  const DEFAULT_CCY = ['USD', 'EUR', 'GBP'];

  /* ---------- Modèle d'une année ---------- */
  function blankClient(name, balance, risks, currency) {
    return {
      name, currency: currency || 'USD', balance: balance === undefined ? null : balance,
      rows: Array.from({ length: 12 }, (_, i) => ({ risk: risks && risks[i] !== undefined ? risks[i] : null }))
    };
  }

  /** Données du classeur Excel d'origine (année 2022). */
  function defaultYearData() {
    return {
      risk: 500, aum: '$100,000', notes: '',
      months: {
        jan: [3.2], feb: [-1], mar: [3.7], apr: [4.3], may: [-1], jun: [-1],
        jul: [3], aug: [-1], sep: [3.2], oct: [-0.6], nov: [-1], dec: [-1]
      },
      clients: [
        blankClient('Elliot (USD)', 100000, new Array(12).fill(0.5), 'USD'),
        blankClient('Other (EUR)', null, [1, 1, 1, 1], 'EUR'),
        blankClient('Other (GBP)', null, [3.5, 3.5, 3.5], 'GBP')
      ]
    };
  }

  function normalizeYear(y) {
    const d = defaultYearData();
    const out = {
      risk: parseNum(y && y.risk) === null ? 500 : parseNum(y.risk),
      aum: y && typeof y.aum === 'string' ? y.aum : '',
      notes: y && typeof y.notes === 'string' ? y.notes : '',
      months: {},
      clients: []
    };
    MONTHS.forEach((m) => { out.months[m] = y && y.months && Array.isArray(y.months[m]) ? y.months[m].slice() : []; });
    for (let i = 0; i < 3; i++) {
      const c = y && Array.isArray(y.clients) ? y.clients[i] : null;
      out.clients.push({
        name: c && c.name ? String(c.name) : d.clients[i].name,
        currency: c && CURRENCIES.indexOf(c.currency) >= 0 ? c.currency : DEFAULT_CCY[i],
        balance: c ? parseNum(c.balance) : null,
        rows: Array.from({ length: 12 }, (_, k) => ({ risk: c && c.rows && c.rows[k] ? parseNum(c.rows[k].risk) : null }))
      });
    }
    if (y && Array.isArray(y._ancienGlobal)) out._ancienGlobal = y._ancienGlobal.slice();
    return out;
  }

  /**
   * Calcule tout ce qui est affiché pour une année.
   *  - Le global = tous les trades des 12 mois mis bout à bout (plus de double saisie).
   *  - Client 1 (compte du TRADE LOG) : P&L $ = somme des P&L du mois ; Performance = P&L / solde ;
   *    Risk/trade % = risque $ / solde.
   *  - Autres clients : Performance = somme des RR du mois x Risk/trade % ; P&L $ = Performance x solde.
   *  - Solde initial du mois suivant = solde + P&L.
   */
  function compute(y) {
    const risk = parseNum(y.risk) || 0;
    const ms = MONTHS.map((m) => stats(y.months[m], risk));
    const allRR = [].concat.apply([], MONTHS.map((m) => compact(y.months[m])));
    const global = stats(allRR, risk);
    const clients = y.clients.map((c, ci) => {
      const balances = [], pnl = [], perf = [], riskPct = [];
      let b = parseNum(c.balance);
      for (let i = 0; i < 12; i++) {
        balances.push(b);
        let p = null, pc = null, rp = null;
        if (ci === 0) {
          p = ms[i].net;
          rp = b ? (risk / b) * 100 : null;
          pc = b ? p / b : null;
        } else {
          rp = parseNum(c.rows[i].risk);
          pc = rp === null ? null : (ms[i].returnRR * rp) / 100;
          p = pc === null || !b ? null : pc * b;
        }
        pnl.push(p); perf.push(pc); riskPct.push(rp);
        b = b === null ? null : b + (p || 0);
      }
      return { balances, pnl, perf, riskPct, total: sum(perf.filter((x) => x !== null)), closing: b };
    });
    const main = clients[0].perf;
    const withTrades = main.filter((v, i) => v !== null && ms[i].totalTrades > 0);
    const quarters = [0, 3, 6, 9].map((i) => sum(main.slice(i, i + 3).map((v) => v || 0)));
    return {
      ms, allRR, global, clients, quarters,
      monthlyAvg: withTrades.length ? sum(withTrades) / withTrades.length : null
    };
  }

  /* ---------- Base multi-années ---------- */
  function yearKeys(db) { return Object.keys(db.years).sort((a, b) => Number(a) - Number(b)); }

  function defaultDb() { return { version: 2, lang: 'fr', currentYear: '2022', years: { '2022': defaultYearData() } }; }

  /** Nouvelle année : soldes de départ = soldes de fin de l'année précédente, réglages de risque repris. */
  function createYear(db, yearKey) {
    const y = Number(yearKey);
    const keys = yearKeys(db).map(Number);
    const earlier = keys.filter((k) => k < y);
    const prevKey = String(earlier.length ? Math.max.apply(null, earlier) : Math.max.apply(null, keys));
    const base = db.years[prevKey];
    const comp = compute(base);
    return {
      risk: base.risk, aum: base.aum, notes: '',
      months: MONTHS.reduce((o, m) => { o[m] = []; return o; }, {}),
      clients: base.clients.map((c, ci) => ({
        name: c.name,
        currency: c.currency,
        balance: earlier.length ? round2(comp.clients[ci].closing) : c.balance,
        rows: c.rows.map((r) => ({ risk: r.risk }))
      }))
    };
  }

  /** Charge n'importe quelle sauvegarde (ancien format 1 année ou nouveau format multi-années). */
  function normalizeDb(saved) {
    if (!saved || typeof saved !== 'object') return defaultDb();
    if (saved.years && typeof saved.years === 'object' && Object.keys(saved.years).length) {
      const db = { version: 2, lang: saved.lang === 'en' ? 'en' : 'fr', currentYear: '', years: {} };
      Object.keys(saved.years).forEach((k) => { if (/^\d{4}$/.test(k)) db.years[k] = normalizeYear(saved.years[k]); });
      const keys = yearKeys(db);
      if (!keys.length) return defaultDb();
      db.currentYear = db.years[String(saved.currentYear)] ? String(saved.currentYear) : keys[keys.length - 1];
      return db;
    }
    if (saved.months) { // ancien format : une seule année
      const key = String(parseInt(saved.year, 10) || 2022);
      const yd = normalizeYear(saved);
      if (Array.isArray(saved.global) && saved.global.length) yd._ancienGlobal = saved.global.slice();
      const db = { version: 2, lang: saved.lang === 'en' ? 'en' : 'fr', currentYear: key, years: {} };
      db.years[key] = yd;
      if (key !== '2022') db.years['2022'] = defaultYearData();
      return db;
    }
    return defaultDb();
  }

  return {
    CURRENCIES, MONTHS, TAB_LABELS, MONTH_FULL, MONTH_TITLE, MONTH_SHORT,
    setLang, parseNum, compact, sum, series, stats, compute,
    defaultYearData, defaultDb, normalizeYear, normalizeDb, createYear, yearKeys
  };
});

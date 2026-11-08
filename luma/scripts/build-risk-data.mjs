#!/usr/bin/env node
/**
 * Builds luma/risk-data.json: real risk metrics for every ticker in Lu's universe.
 *
 *   node luma/scripts/build-risk-data.mjs
 *
 * For each ticker it pulls ~1 year of daily closes (Yahoo Finance chart API, no key needed),
 * then computes:
 *   vol    annualized volatility of daily log returns   (how much it swings)
 *   beta   sensitivity to the S&P 500 (SPY)              (how much it moves with the market)
 *   maxDD  worst peak-to-trough drop over the year       (how bad it got)
 *   ret1y  1-year price return
 * and turns those into a 1-5 risk score that the app uses for matching.
 *
 * It also writes luma/news.json: recent headlines per ticker, each tagged with a plain-English
 * "what this means" line so the Personalized feed stays easy to understand.
 *
 * Crypto (BTC, ETH, …) is priced as BTC-USD etc. and annualized over 365 days because it trades daily.
 *
 * Runs daily in GitHub Actions (.github/workflows/luma-risk-data.yml). Requires Node 18+.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LUMA = join(here, '..');
const UA = 'Mozilla/5.0 (compatible; LumaRiskData/1.0)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- universe: read tickers straight from the engine so the two never drift apart ----
async function loadTickers() {
  const src = await readFile(join(LUMA, 'lu-engine.js'), 'utf8');
  const block = src.slice(src.indexOf('const RAW = ['), src.indexOf('];', src.indexOf('const RAW = [')));
  const re = /^\s*\['([A-Z.]{1,6})','((?:[^'\\]|\\.)*)','#[0-9a-fA-F]{6}',\d,(?:true|false),'(\w+)',\[[^\]]*\],\[([^\]]*)\]/gm;
  const unq = x => x.replace(/\\'/g, "'");
  return [...block.matchAll(re)].map(m => ({
    t: m[1], name: unq(m[2]), crypto: m[3] === 'Crypto',
    aliases: [...m[4].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => unq(x[1]))
  }));
}
const yahooSymbol = a => a.crypto ? `${a.t}-USD` : a.t.replace('.', '-');

// ---- data source ----
async function fetchCloses(sym) {
  let lastErr;
  for (const host of ['query1', 'query2']) {
    try {
      const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d&includeAdjustedClose=true`;
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      if (!r) throw new Error(json?.chart?.error?.description || 'no result');
      const ts = r.timestamp || [];
      const adj = r.indicators?.adjclose?.[0]?.adjclose || r.indicators?.quote?.[0]?.close || [];
      const rows = ts.map((t, i) => [t, adj[i]]).filter(([, c]) => Number.isFinite(c) && c > 0);
      if (rows.length < 120) throw new Error(`only ${rows.length} days of data`);
      // Day change comes from the last two closes. (meta.chartPreviousClose is the close *before the
      // whole range*, i.e. a year ago, so it must not be used for a daily change.)
      const closes = r.indicators?.quote?.[0]?.close || [];
      const raw = closes.filter(c => Number.isFinite(c) && c > 0);
      return { rows, price: raw.at(-1) ?? rows.at(-1)[1], prevClose: raw.at(-2), currency: r.meta?.currency || 'USD' };
    } catch (e) { lastErr = e; await sleep(400); }
  }
  throw lastErr;
}

// ---- metrics (exported for tests) ----
export function logReturns(closes) {
  const out = [];
  for (let i = 1; i < closes.length; i++) out.push(Math.log(closes[i] / closes[i - 1]));
  return out;
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
export function stdev(a) { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); }
export function annualVol(closes, periodsPerYear = 252) { return stdev(logReturns(closes)) * Math.sqrt(periodsPerYear); }
export function maxDrawdown(closes) {
  let peak = closes[0], worst = 0;
  for (const c of closes) { peak = Math.max(peak, c); worst = Math.min(worst, c / peak - 1); }
  return -worst;
}
export function beta(stockRows, marketRows) {
  // align on shared trading days
  const m = new Map(marketRows.map(([t, c]) => [dayKey(t), c]));
  const pairs = stockRows.map(([t, c]) => [c, m.get(dayKey(t))]).filter(([, mc]) => mc);
  const s = logReturns(pairs.map(p => p[0])), k = logReturns(pairs.map(p => p[1]));
  const ms = mean(s), mk = mean(k);
  let cov = 0, vk = 0;
  for (let i = 0; i < s.length; i++) { cov += (s[i] - ms) * (k[i] - mk); vk += (k[i] - mk) ** 2; }
  return cov / vk;
}
const dayKey = t => new Date(t * 1000).toISOString().slice(0, 10);

/** 1-5 risk score. Volatility drives it; a deep drawdown or high beta can push it up a notch. */
export function riskScore({ vol, maxDD, beta }) {
  let r = vol < 0.18 ? 1 : vol < 0.26 ? 2 : vol < 0.36 ? 3 : vol < 0.52 ? 4 : 5;
  if (maxDD > 0.45 && r < 5) r += 1;
  else if (beta > 1.7 && r < 5) r += 1;
  return r;
}

/** Ten evenly spaced closes, scaled 0-1, for the card's trend bars. */
export function trendBars(closes, n = 10) {
  const pts = Array.from({ length: n }, (_, i) => closes[Math.round(i * (closes.length - 1) / (n - 1))]);
  const lo = Math.min(...pts), hi = Math.max(...pts);
  return pts.map(p => +(hi === lo ? 0.5 : (p - lo) / (hi - lo)).toFixed(3));
}
const r4 = x => Math.round(x * 1e4) / 1e4;

// ---- news: headline -> plain-English explainer ----
const EXPLAIN = [
  ['earnings', /\b(earnings|results|quarter(ly)?|q[1-4]\b|revenue|profit|eps|beats?|miss(es|ed)?|guidance|outlook|forecast)\b/i,
    'Earnings are the company\'s report card. The stock usually moves on whether results beat or miss what investors expected, not on whether they were "good".'],
  ['analyst', /\b(upgrade[sd]?|downgrade[sd]?|price target|rating|analysts?|overweight|underweight|outperform)\b/i,
    'A Wall Street analyst changed their opinion. That can move the price for a day or two, but analysts are often wrong, so it\'s one view, not a verdict.'],
  ['deal', /\b(acquir\w*|acquisition|merger|merge|buyout|takeover|to buy|deal|stake|partnership|partners with)\b/i,
    'A deal or partnership can open new markets, but big deals are expensive and don\'t always pay off. Investors will watch the price paid.'],
  ['legal', /\b(lawsuit|sues?|sued|probe|investigation|antitrust|regulators?|fine[sd]?|settle\w*|court|ban)\b/i,
    'Legal or regulatory trouble costs money and attention. It usually only matters long-term if it\'s big compared with the company.'],
  ['cash', /\b(dividends?|buybacks?|repurchase|payout|split)\b/i,
    'The company is returning cash to shareholders (or splitting its shares). That usually signals management feels confident.'],
  ['jobs', /\b(layoffs?|job cuts|cuts? \d[\d,]* jobs|restructur\w*|ceo (steps|resign|depart)\w*)\b/i,
    'Layoffs and leadership changes cut costs or change direction. Sometimes that helps profits; sometimes it signals business is slowing.'],
  ['product', /\b(launch\w*|unveil\w*|releases?|new (model|product|chip|phone|feature)|rollout|debut\w*)\b/i,
    'New products are how companies grow. The real test is whether people actually buy them over the next few quarters.'],
  ['macro', /\b(the fed|federal reserve|interest rates?|rate (cut|hike)s?|inflation|tariffs?|recession|jobs report|economy|treasury yields?)\b/i,
    'This is big-picture economy news. It tends to move the whole market, not just this one company.'],
];
const CRYPTO_EXPLAIN = 'Crypto prices react fast to headlines about regulation, big buyers and hype. Big moves either way are normal.';
const DEFAULT_EXPLAIN = 'Headlines can move a price for a day, but over years, returns follow how the business actually does.';
export function explainHeadline(title, crypto = false) {
  for (const [kind, re, text] of EXPLAIN) if (re.test(title)) return { kind, plain: text };
  return crypto ? { kind: 'crypto', plain: CRYPTO_EXPLAIN } : { kind: 'news', plain: DEFAULT_EXPLAIN };
}
const AMBIGUOUS_TICKERS = new Set(['COST', 'HOOD', 'NET', 'DIS', 'MA', 'PM', 'MO', 'GS', 'GM', 'EA', 'DAL', 'DUK', 'SOL', 'ETH']);
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** True when the headline actually names this asset (company name, brand alias or unambiguous ticker). */
export function headlineMentions(title, asset) {
  const names = [asset.name.split(/[\s(]/)[0], ...(asset.aliases || [])].filter(n => n.length >= 4);
  if (names.some(n => new RegExp(`(^|[^a-z])${esc(n.toLowerCase())}([^a-z]|$)`).test(title.toLowerCase()))) return true;
  return asset.t.length >= 2 && !AMBIGUOUS_TICKERS.has(asset.t) && new RegExp(`\\b${esc(asset.t)}\\b`).test(title);
}
async function fetchNews(asset) {
  const sym = yahooSymbol(asset);
  const q = asset.crypto ? asset.name : sym;
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=10&quotesCount=0`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const weekAgo = Date.now() / 1000 - 7 * 86400;
  return (json.news || [])
    // keep stories that are actually about this asset, not ones that merely list it among many tickers
    .filter(n => n.title && n.link && n.providerPublishTime > weekAgo)
    .filter(n => headlineMentions(n.title, asset))
    .slice(0, 3)
    .map(n => ({ title: n.title, publisher: n.publisher || '', link: n.link, time: n.providerPublishTime, ...explainHeadline(n.title, asset.crypto) }));
}

async function main() {
  const assets = await loadTickers();
  const tickers = assets.map(a => a.t);
  console.log(`Fetching ${tickers.length} tickers + SPY…`);
  const spy = await fetchCloses('SPY');
  const out = {}; const failed = []; const news = {};
  for (const a of assets) {
    const t = a.t;
    try {
      const d = await fetchCloses(yahooSymbol(a));
      const closes = d.rows.map(r => r[1]);
      const m = { vol: annualVol(closes, a.crypto ? 365 : 252), maxDD: maxDrawdown(closes), beta: beta(d.rows, spy.rows) };
      out[t] = {
        risk: riskScore(m), vol: r4(m.vol), beta: r4(m.beta), maxDD: r4(m.maxDD),
        ret1y: r4(closes.at(-1) / closes[0] - 1),
        price: +d.price.toFixed(2),
        chg1d: d.prevClose ? r4(d.price / d.prevClose - 1) : null,
        bars: trendBars(closes),
        days: closes.length,
        ...(a.crypto ? { crypto: true } : {})
      };
      console.log(`  ${t.padEnd(5)} risk ${out[t].risk}  vol ${(m.vol * 100).toFixed(1)}%  beta ${m.beta.toFixed(2)}  maxDD ${(m.maxDD * 100).toFixed(1)}%`);
    } catch (e) {
      failed.push(t); console.warn(`  ${t.padEnd(5)} FAILED: ${e.message}`);
    }
    if (out[t]) {
      try { const n = await fetchNews(a); if (n.length) news[t] = n; } catch (e) { console.warn(`  ${t.padEnd(5)} news skipped: ${e.message}`); }
    }
    await sleep(250);
  }
  // Yahoo's news search returns nothing for crypto, so borrow headlines that name a coin from the
  // stories collected for other tickers (Coinbase, Strategy, Robinhood stories often do).
  const allNews = Object.values(news).flat();
  for (const a of assets.filter(x => x.crypto && out[x.t])) {
    const seen = new Set();
    const hits = allNews.filter(n => headlineMentions(n.title, a) && !seen.has(n.link) && seen.add(n.link))
      .sort((x, y) => y.time - x.time).slice(0, 3)
      .map(n => ({ ...n, ...explainHeadline(n.title, true) }));
    if (hits.length) news[a.t] = hits;
  }

  if (Object.keys(out).length < tickers.length * 0.8) {
    console.error(`Too many failures (${failed.length}/${tickers.length}); not overwriting risk-data.json.`);
    process.exit(1);
  }
  const doc = {
    asOf: dayKey(spy.rows.at(-1)[0]),
    generatedAt: new Date().toISOString(),
    source: 'Yahoo Finance daily closes (1y), metrics computed by luma/scripts/build-risk-data.mjs',
    method: 'risk 1-5 from annualized volatility (<18% / <26% / <36% / <52% / higher), +1 if max drawdown > 45% or beta > 1.7',
    market: { ticker: 'SPY', vol: r4(annualVol(spy.rows.map(r => r[1]))), price: +spy.price.toFixed(2), chg1d: spy.prevClose ? r4(spy.price / spy.prevClose - 1) : null, ret1y: r4(spy.rows.at(-1)[1] / spy.rows[0][1] - 1) },
    failed,
    stocks: out
  };
  await writeFile(join(LUMA, 'risk-data.json'), JSON.stringify(doc, null, 1) + '\n');
  console.log(`Wrote risk-data.json (${Object.keys(out).length} stocks, as of ${doc.asOf}${failed.length ? `, failed: ${failed.join(', ')}` : ''}).`);
  const newsDoc = { generatedAt: doc.generatedAt, source: 'Yahoo Finance news search; explainers are rule-based', items: news };
  await writeFile(join(LUMA, 'news.json'), JSON.stringify(newsDoc, null, 1) + '\n');
  console.log(`Wrote news.json (${Object.values(news).flat().length} headlines across ${Object.keys(news).length} tickers).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });

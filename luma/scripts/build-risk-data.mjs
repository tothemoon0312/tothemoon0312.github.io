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
  return [...block.matchAll(/^\s*\['([A-Z.]{1,6})',/gm)].map(m => m[1]);
}

// ---- data source ----
async function fetchCloses(ticker) {
  const sym = ticker.replace('.', '-');
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
export function annualVol(closes) { return stdev(logReturns(closes)) * Math.sqrt(252); }
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

async function main() {
  const tickers = await loadTickers();
  console.log(`Fetching ${tickers.length} tickers + SPY…`);
  const spy = await fetchCloses('SPY');
  const out = {}; const failed = [];
  for (const t of tickers) {
    try {
      const d = await fetchCloses(t);
      const closes = d.rows.map(r => r[1]);
      const m = { vol: annualVol(closes), maxDD: maxDrawdown(closes), beta: beta(d.rows, spy.rows) };
      out[t] = {
        risk: riskScore(m), vol: r4(m.vol), beta: r4(m.beta), maxDD: r4(m.maxDD),
        ret1y: r4(closes.at(-1) / closes[0] - 1),
        price: +d.price.toFixed(2),
        chg1d: d.prevClose ? r4(d.price / d.prevClose - 1) : null,
        bars: trendBars(closes),
        days: closes.length
      };
      console.log(`  ${t.padEnd(5)} risk ${out[t].risk}  vol ${(m.vol * 100).toFixed(1)}%  beta ${m.beta.toFixed(2)}  maxDD ${(m.maxDD * 100).toFixed(1)}%`);
    } catch (e) {
      failed.push(t); console.warn(`  ${t.padEnd(5)} FAILED: ${e.message}`);
    }
    await sleep(250);
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
    market: { ticker: 'SPY', vol: r4(annualVol(spy.rows.map(r => r[1]))) },
    failed,
    stocks: out
  };
  await writeFile(join(LUMA, 'risk-data.json'), JSON.stringify(doc, null, 1) + '\n');
  console.log(`Wrote risk-data.json (${Object.keys(out).length} stocks, as of ${doc.asOf}${failed.length ? `, failed: ${failed.join(', ')}` : ''}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });

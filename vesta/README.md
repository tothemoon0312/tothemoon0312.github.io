# Vesta

Money app for Gen Z. Users chat with **Lu** instead of filling out a risk survey, Lu builds a swipeable deck of stock, ETF and crypto matches, and the Portfolio tab explains the market in plain English.

Live: https://tothemoon0312.github.io/vesta/

## What's real today

| Area | Status |
|---|---|
| Lu chat: interests, brands, exclusions, risk tone | Real. Runs in the browser (`lu-engine.js`), rule-based |
| Interest matching | Real. 168 hand-described companies, funds and coins; any word a user says ("skincare", "matcha", "nuclear") is matched against names, brands, descriptions and each company's real industry |
| TradingView | Real widgets: live chart and company profile in every stock sheet, using the exact exchange symbol (e.g. `NASDAQ:AAPL`), plus a link to the symbol page. TradingView has no data API and forbids scraping, so matching uses Yahoo data instead |
| Accounts | Sign up / sign in / sign out with validation. Stored on the user's device only (passwords as salted SHA-256 hashes). Blank sign-in opens the Charlotte demo |
| Circle (social) | Taste twins (match % from Lu profiles), blended decks, weekly "Call it" predictions scored with real closes, moments. Never shows dollar amounts. Friends are demo profiles |
| Lu answers questions (ETF, P/E, "is TSLA risky?", news) | Real. Rule-based explanations |
| Prices, day change, 12-month trend | Real. Daily close data (Yahoo Finance), refreshed each weekday |
| Risk scores (1–5) | Real. Computed from 1-year volatility, beta vs S&P 500, worst drawdown |
| Crypto (BTC, ETH, SOL, XRP, DOGE) | Real prices and risk |
| News + "What it means" | Real headlines; explanations are rule-based by headline type |
| 10 free right swipes/day, Premium unlock | Real logic. Payment needs a Stripe Payment Link (below) |
| 3% instant-withdrawal fee, free standard withdrawals | Real logic and math. No bank is connected, so no money moves |
| Deposits, investing, selling, balances, activity | Simulated, but consistent: one ledger drives everything (cash = deposits − buys + sells − withdrawals). Holdings are shares bought at the real price of that day, valued at the latest close |
| Plaid-linked bank numbers | Sample data, but it adds up: $3,200 income − $2,341 spending − $373 to savings = $486 available; $4,020 of $6,000 saved = 67%, on track for month 8 of 12 |

## Pricing (edit in `index.html` → `CONFIG`)

```js
freeRightSwipesPerDay: 10,     // passes are always free
instantWithdrawFeeRate: 0.03,  // 3% commission; standard withdrawals free
premium: { price: 4.99, period: 'month', checkoutUrl: '' }
```

### Turn on real Premium payments (Stripe Payment Link, no server needed)

1. In Stripe, create a product "Vesta Premium" with a recurring monthly price.
2. Create a **Payment Link** for it. Under *After payment*, redirect to
   `https://tothemoon0312.github.io/vesta/?premium=success`.
3. Paste the link into `CONFIG.premium.checkoutUrl`.

This works for launch, but anyone who knows the success URL could unlock Premium. To lock it down you need a small backend that verifies the Stripe webhook and stores the subscription on the user's account.

## Path to real money movement

Moving real money and placing real trades can't be done from a static site. It needs:

1. **A backend + user accounts** (e.g. Supabase or Firebase): login, server-side profile, Premium status, swipe counts.
2. **Bank linking:** Plaid (Auth + Balance) to connect the user's bank and power the spending stats.
3. **Brokerage partner:** a broker-dealer API such as Alpaca Broker API or DriveWealth handles KYC/identity checks, custody, fractional orders, deposits/withdrawals (ACH, instant via RTP/debit) and crypto. Your 3% instant-withdrawal fee is charged through this partner's fee/transfer API.
4. **Compliance:** the partner holds the licenses, but you'll need their approval, terms of service, privacy policy, disclosures ("not investment advice"), and likely a lawyer's review before launch.
5. **Licensed market data** for a commercial app (e.g. Polygon, Tiingo, or your broker's feed) instead of Yahoo's unofficial endpoints. Keys go in GitHub Actions secrets, never in the page.

## Data pipeline

`scripts/build-risk-data.mjs` → writes `risk-data.json` and `news.json`.
Runs weekdays after market close via `.github/workflows/vesta-risk-data.yml`, or manually:

```bash
node vesta/scripts/build-risk-data.mjs
```

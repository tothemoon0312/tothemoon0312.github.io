# luma — Build Spec for Claude Code

Put this file in the root of the project folder. Claude Code reads `CLAUDE.md` automatically at the start of every session, so it always knows what we're building and the rules.

## What luma is

An investing app for people with little or no investing knowledge. Instead of a risk survey, the user **talks to an AI in plain language** ("I have $1,000, I want to play it safe, and I'm really into AI and gaming"). The AI turns that into an investor profile, and the app shows a **swipeable feed of investment cards** matched to the user's interests, risk comfort, and timeline. Each card explains *why it matches you* in the user's own words. Users can save cards, build a practice portfolio, and later link a real brokerage.

Beachhead user: women college students at four-year schools who are not business majors, have never invested, and feel scared or behind (starting at Northeastern). The product works for anyone, but onboarding copy, examples, and tone are written for her: no jargon, no intimidation, no hype.

Second segment: international students. Many don't know whether they can open a US brokerage account without an SSN, so the "Get set up" guide (milestone 8) helps them with account setup.

Growth comes from visible confidence, not returns: users share progress (streaks, goals, "what I learned"), never their gains.

## Tech stack

- **App:** Expo (React Native) + TypeScript, Expo Router
- **Backend / auth / database:** Supabase (Postgres, auth, edge functions)
- **AI:** Claude API, called only from Supabase edge functions (never put API keys in the app)
- **Market data:** Massive (formerly Polygon.io) for prices, history, and basic fundamentals. See "Live market data" below.
- **Brokerage linking (phase 3):** SnapTrade, read-only first
- **Bank data (later phase):** Plaid

## Core rule: the AI does not pick stocks

The LLM has two jobs only:
1. **Extract** a structured profile from the user's conversation.
2. **Explain** a match in plain language, using only facts the app passes to it.

The actual matching is a **deterministic scoring function in code** over a curated, tagged list of investments. This keeps results consistent, testable, and explainable, and stops the AI from inventing facts or hyping a stock.

## User flow

1. **Welcome** → "Tell me about you and your money. No finance words needed."
2. **Chat onboarding** (3–6 messages). The AI asks short, friendly follow-ups only for missing fields: how much, what for, by when, how they'd feel if it dropped, what they're into.
3. **Profile summary card**: "Here's what I heard" with editable chips (e.g. `Play it safe`, `$1,000`, `12 months`, `AI`, `Gaming`). User confirms or edits.
4. **Swipe feed**: right = save, left = pass, tap = learn more.
5. **Saves / practice portfolio**: paper-trade the saved cards and track performance.
6. **Re-chat anytime**: "I'm feeling braver now" updates the profile and the feed.
7. **(Phase 3) Link brokerage** via SnapTrade to see real holdings.

## Profile schema (output of the extraction call)

```json
{
  "amount_usd": 1000,
  "goal": "grow savings for a trip",
  "horizon_months": 12,
  "risk_level": "conservative | moderate | aggressive",
  "risk_evidence": ["user said 'play it safe'", "user said 'I'd panic if it dropped'"],
  "interests": ["artificial intelligence", "gaming"],
  "experience": "none | some | experienced",
  "needs_money_soon": false,
  "has_us_brokerage_account": false,
  "has_ssn_or_itin": "ssn | itin | neither | unsure",
  "missing_fields": []
}
```

Extraction rules for the prompt:
- Return JSON only, validated with zod. If invalid, retry once, then ask the user a follow-up.
- Risk comes from the user's words: "safe", "can't lose it", "nervous" → conservative; "willing to wait", "some ups and downs" → moderate; "go big", "high risk is fine" → aggressive. When unclear, default to conservative and ask.
- Always store `risk_evidence` quotes so the explanation can reflect the user's own words back.
- Map free-text interests to the fixed theme list below.

## Live market data

Every card in the feed must show current information, never stale hardcoded numbers.

- **Provider abstraction:** wrap all market data calls in one `marketData` service so the provider or plan can change without touching UI code.
- **Prototype:** 15-minute delayed data is acceptable. Real-time requires a higher plan, and showing real-time data to the public in a commercial app may require a business data license. Check before launch.
- **Price on cards:** fetch a snapshot quote when the feed loads (batch all tickers in one call). For the card currently on screen, subscribe to the WebSocket stream and update the price live. Unsubscribe when the card is swiped away.
- **Timestamp:** every price shows "as of 2:41 PM ET" and, when markets are closed, "Market closed · last close." Never show a price without its time.
- **Sparkline:** daily bars for the last 12 months, cached for 24 hours.
- **Fundamentals** (P/E, 52-week high/low, market cap): refresh once per day via a scheduled edge function.
- **Explanations:** cache `explain-match` per user + ticker, and regenerate it when the underlying data changes meaningfully (e.g. daily refresh or a price move over 5%).
- **Failure state:** if data can't load, show "Price unavailable right now" rather than an old number.

## Investment universe

A curated table (start with ~60–100 items), each tagged:

| field | example |
|---|---|
| ticker, name, type | `BOTZ`, Global X Robotics & AI ETF, `etf` |
| themes | `["artificial intelligence", "robotics"]` |
| risk_tier | 1 (broad index ETF) → 5 (single volatile stock) |
| min_horizon_months | 12 |
| plain_description | one sentence a 19-year-old understands |

Theme list (v1): artificial intelligence, technology, gaming, entertainment & streaming, sports & fitness, fashion & retail, food & restaurants, clean energy, healthcare, finance, travel, broad market.

Include broad index ETFs in every theme bucket so every user can get a diversified option.

## Matching score

```
score = 0.45 * interest_match + 0.35 * risk_fit + 0.20 * horizon_fit
```

- `interest_match`: overlap between profile interests and item themes.
- `risk_fit`: conservative → tiers 1–2, moderate → 1–3, aggressive → 1–5. Items outside the range are excluded, not just down-ranked.
- `horizon_fit`: exclude items whose `min_horizon_months` is longer than the user's horizon.
- Feed mix: at least 1 in 3 cards is a diversified fund. Conservative users see mostly funds.
- Show the score as a match % on the card. Unit-test this function.

## Guardrails (non-negotiable)

- **Short horizon:** if `horizon_months < 12` or `needs_money_soon` is true, the AI says plainly that money needed soon usually belongs in savings, not stocks, and the feed shows savings-style and lowest-risk options first.
- **No promises:** never say or imply guaranteed returns or that a goal *will* be reached. If a user's goal implies an unrealistic return (e.g. doubling in 3 months), the AI gives a friendly reality check.
- **Language:** cards say "Save" and "Learn more," not "Buy." Match explanations describe fit, not predictions.
- **Explanations** may only use facts passed in from the database and the market data service. No invented numbers.
- **Disclaimer** on onboarding and card detail: educational tool, not personalized investment advice. (Legal review needed before real-money features.)
- Never store brokerage or bank credentials. SnapTrade and Plaid handle authentication.
- No day-trading features (no streaks for frequent trades, no intraday alerts). Long-term framing fits the mission, and frequent trading can raise visa questions for students on F-1.
- Account-setup and tax content for international students is general information that links to official sources and the university's international student office. Never tell a user what their tax status is.

## Build order (one milestone per Claude Code session)

1. Expo app scaffold, navigation, Supabase auth, design tokens (luma gold/cream palette from the deck mockups).
2. Chat onboarding UI + `extract-profile` edge function + profile summary card with editable chips.
3. Seeded investment universe table + matching function + unit tests.
4. `marketData` service + swipe feed with cards (live snapshot price, WebSocket updates on the visible card, "as of" timestamp, sparkline, match %, "why this matches you").
5. `explain-match` edge function, with caching per user + ticker.
6. Saves list + practice (paper) portfolio with daily value updates.
7. Re-chat to update profile; feed refreshes.
8. "Get set up" guide for international students: SSN vs. ITIN, documents needed, which brokerages accept which, links to official sources. The onboarding chat asks whether they have an SSN and routes them here if needed.
9. SnapTrade connection flow, read-only holdings view.
10. Social features: invite a roommate, shared savings goals, shareable "what I learned" and milestone cards. No leaderboards and never show another user's returns.

After each milestone: run tests, run the app, and list what's done and what's next.

## Do not

- Do not let the LLM choose tickers freely or rank stocks.
- Do not put API keys in the client app.
- Do not add real-money trading until legal review is done.
- Do not add features outside the current milestone without asking.

# Backtester Roadmap

Direction: an experimentation lab, not a trading terminal. Optimize for "try an idea in under a minute and understand why it won or lost." Live execution is deliberately last.

Reordered 2026-07-05: a candidate strategy (12/30 MA cross on BTC, 7% stop) passed the lab — vs-random, sweep plateau, walk-forward (OOS Sharpe 1.08). The 2021 lesson was that the strategy wasn't the failure point, following it was — so signals-forward (paper trading + alerts) moves ahead of the rule builder. The goal is a process that removes discretionary override, signal by signal.

## Phase 1 — Tape player (done)

Bar-by-bar replay, 4 canned strategies, metrics vs buy & hold, trade log.

## Phase 2 — Strategy customization (done)

The current `Strategy` interface (init → signalAt/explainAt) already supports all of this; it's about authoring, not engine rewrites.

- **More indicator blocks**: MACD, Bollinger bands, ATR, Donchian channel (breakout), rate-of-change, drawdown-from-peak. Each gets an overlay or strip rendering so the replay stays legible.
- **Exits as first-class rules**: stop-loss %, trailing stop, take-profit, time-based exit (N bars) — as strategy params (sliders/toggles) for now, folded into the rule builder when it lands. These change results more than entries do — good lesson to make visible.
  - Requires **honest intrabar fills** (the one structural engine upgrade): a stop triggers when `bar.low <= stop`, filled at the stop price — unless the bar *gapped open* below it, in which case you get the open, not your stop. Cheap backtesters fudge this and overstate how well stops work. We have full OHLC, so do it right.
- **Regime filter (signal compounding)**: gate one rule with another — e.g. only take RSI dip-buys while price is above the 200-day MA, or 50/200 cross + protective stop. For now a per-strategy toggle/param (e.g. "only long above N-day MA"); generalizes into the rule builder's AND/OR groups later. Called out explicitly because it's the most common and most instructive combo to test (stops on slow trend systems often *hurt* — see Kaminski & Lo, "When Do Stop-Loss Rules Stop Losses?").
- **Position sizing**: all-in → fixed fraction, volatility-targeted (ATR-based). Adds the "how much" axis to the "when" axis.
- **Friction**: per-trade fee + slippage bps setting. Default on, small — free trading flatters high-churn strategies.
- **Custom JS strategy** (escape hatch): a code editor for `(bars, i, state) => signal` with the built-in indicators importable. Sandboxed via Function constructor; run on a worker if it gets slow.

## Phase 3 — Robustness lab (the anti-overfitting phase) (done)

This is what separates a toy from a tool — every feature here answers "was that result luck?"

- **Parameter sweep heatmap**: grid over 2 params (e.g. fast × slow) → CAGR/Sharpe/maxDD heatmap. If your winning combo is a lone bright pixel in a dark field, it's overfit. Engine is already fast enough to brute-force thousands of runs.
- **Walk-forward split**: pick params on an in-sample window, replay shades the out-of-sample region so you watch the strategy meet data it never saw.
- **Monte Carlo on trades**: bootstrap-resample the trade sequence → distribution of end equity and max drawdown, not a single path. "Median outcome" and "5th percentile" cards next to the point estimates.
- **Multi-ticker scorecard**: run the current strategy across all tickers at once, small-multiples equity curves. A real edge survives asset changes; a curve-fit one doesn't.
- **Luck benchmark (null distribution)**: run ~1,000 random strategies (coin-flip entries, exposure-matched to yours) on the same ticker/period → histogram of their CAGR/Sharpe with your strategy's dot on it. "Beats 99% of random" means something; "beats 30%" means the asset did the work. Permutation-test intuition (White's Reality Check) made visual. Exposure matching is the key detail — an always-long random baseline isn't a fair null for a strategy that's in the market 40% of the time.
- **Richer analytics**: drawdown chart under the equity curve, per-trade MAE/MFE, holding-period and PnL histograms, exposure % (time in market).
- **Regime shading**: bear-market bands on the price chart so you can see *where* the strategy earns its keep.

## Polish backlog (from the post-Phase-3 layout review) (done)

Also shipped alongside: the gauntlet (one button runs the whole luck-test battery → pass/warn/fail scorecard, prepopulates the lab panels), plain-words verdict line (win-win / drawdown-insurance-priced / noise-trading), sidebar playbook (bundled presets + saved setups), end-of-tape outcome row, land-at-end replay (play = replay), hero equity chart with inlaid metric pills.

- **Time-axis mismatch**: price chart follows the cursor (trailing ~200 bars) while equity/drawdown pin to full history — three stacked charts, two time windows, no cue. Add a "you are here" cursor line on the full-range charts, or a shared-timeline toggle.
- **Pin headline metrics**: CAGR / Sharpe / max DD vs B&H belong in the sticky playback bar — the tweak-slider → check-verdict loop currently costs a scroll round-trip.
- **Sidebar hierarchy**: engine-level knobs (exits, sizing, regime, friction) render identically to strategy params. Collapse them into sections with active-state summaries ("Exits: stop 7%") so non-default settings are visible at a glance — a forgotten stop silently reshapes every strategy.
- **Compact strategy picker**: ten full-blurb cards is scroll tax; blurb on hover/selected only.
- **Lab discoverability + staleness**: the lab is buried below the trade log, and results silently vanish when inputs change — say "results cleared: inputs changed" instead of just emptying.
- **Heatmap color legend**: ramp is normalized to the grid's min/max with no scale shown — a dark cell might still beat B&H. Label the ramp ends with actual values.
- **Engine tests in-repo**: the intrabar-fill/sizing/friction smoke tests live outside the repo; promote to vitest (`engine.test.ts`).

### Shipped after the fact (2026-08-23, from an r/ai_trading thread)

The post's own strategies were unbuildable here — 5-minute MNQ futures, both sides of the market, and scaling in and out of a position, against a long-only daily engine holding one lot. The machinery in the comments transferred cleanly:

- **Structure trailing stop**: `stop = max(previous stop, rolling low(X) − mult × ATR)`, ratcheting, closed bars only — the trail that keeps a runner alive instead of choking it at a fixed %. Mode toggle next to the % trail; only one is ever live.
- **Exit-quality metrics** on the trade card: MFE captured, average given back from the peak, average R (needs the entry risk, now recorded per trade), and the premature-exit rate — a protective exit that fired while the strategy still wanted in, followed by a close a full R back above it inside 20 bars. Any close above the exit was the first cut and it read 60–100% everywhere; 1R is the threshold that discriminates.
- **Drawdown-scaled sizing**: entries shrink with the equity drawdown and stand down entirely at the budget. The transferable half of the thread's "risk governor" — the rest of it (prop-account trailing drawdown, force-flat, post-payout lockout) is prop-firm furniture.
- **Stochastic reversion strategy** — the oscillator, not the martingale scale-in that was actually doing the work in the original.

Still blocked, in order of cost: shorts (`Signal` is long/flat and it's load-bearing), scaling in/out (one scalar share count, one entry price — needs a lot model, which also touches the trade log and the Monte Carlo resample), intraday data.

## Lab backlog

- **Sweepable engine knobs**: the heatmap only sweeps strategy params — stop %, trailing %, and regime MA have never had a plateau test (the BTC 7% stop is a hand-tuned local peak: ~$50M/$70M/$50M at 6/7/8%, i.e. ±3% CAGR — a gentle ridge, but formalize it). Let the sweep axis picker offer engine settings alongside strategy params.
- **Knobs ↔ metrics distance** (pick one):
  - **Option A — sticky Settings**: pin the active strategy's sliders (+ exits summary) `sticky bottom-0` in the sidebar so they never scroll away; pairs with the CAGR/Sh/DD already pinned in the playback bar. Zero right-column cost, ~10 lines.
  - **Option B — tuning strip**: the active strategy's 2–3 params as compact horizontal sliders in a slim row under the gauntlet card, right next to the metric pills. Tightest drag→pills loop; costs ~48px of chart column and blurs the inputs-left/outputs-right split.

## Phase 4 — Signals forward (paper trading + alerts)

The point: prove the *process*, not the strategy — the strategy already passed the lab. Months of "did I follow it?" data before any real sizing.

- **On-demand / live data fetch** (prerequisite, pulled forward from data expansion): fetch fresh daily closes from the Yahoo chart API on demand — both "type any symbol → backtest it" and "refresh BTC to today." Needs a CORS story (proxy route or serverless fn — Yahoo won't answer browser fetches directly); cache fetched series locally (IndexedDB).
- **Paper trading journal**: pin a strategy+params as "live," evaluate it on each new daily close, log every signal it fires with the would-be fill. Track live equity vs the backtest's expectation from the same start date — drift between them is the honest report card.
- **Alerts, no execution**: notification when a signal fires ("12/30 cross went flat on BTC — sell at next open"). Email/push/whatever is cheapest; the delivery matters less than the audit trail.
- **Pre-committed tripwires**: write down, in the app, what invalidates the strategy (e.g. drawdown beyond the Monte Carlo worst-5%) vs what's normal pain (loss streaks inside the backtest envelope). The journal records overrides — the whole 2021 failure mode, instrumented.
- **Behavior report**: after N months, signals fired vs signals followed, live vs backtest drift. This is the go/no-go input for Phase 6, not the backtest numbers.

## Phase 5 — Rule builder + data expansion

- **Rule builder**: entry/exit as composable conditions instead of hardcoded strategies — `[indicator] [crosses above | crosses below | > | <] [indicator | value]`, AND/OR groups. MA cross and RSI become presets of the same builder, not special cases; the Phase 2 exit params and regime toggles fold in as rule types. Dominated by UX decisions (how conditions compose and render), not engine work — sketch the interaction model together before building.
- More bundled tickers (sector ETFs, EFA/EEM for non-US, a failed-stock cautionary tale or two for survivorship honesty).
- CSV upload → backtest anything (the column-JSON decode already isolates the format).
- Weekly bars toggle (resample client-side) for slower strategies and longer effective history.
- Portfolio mode: multiple tickers with target weights + rebalancing rules — turns the tool into an allocation tester (ties back to the rent-vs-buy "invest the difference" assumption).

## Phase 6 — Real money (later, maybe)

- Broker/exchange API execution (Alpaca, IBKR, or a crypto exchange for BTC) only after the Phase 4 behavior report shows months of followed signals — automation as a discipline tool, not a speed tool.
- If the journal shows overrides instead: the answer is the bot or nothing, not more willpower.

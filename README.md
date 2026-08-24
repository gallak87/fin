# fin

Personal finance lab. **[→ Open app](https://gallak87.github.io/fin/)**

## Backtester

Strategy experimentation lab — try an idea in under a minute and understand why it won or lost.

- **10 strategies** (MA cross, RSI, MACD, Donchian, Bollinger, stochastic, momentum, dip-buyer, B&H, DCA) + custom JS escape hatch
- **Honest engine**: next-open fills, intrabar stops (gap-aware), trailing/take-profit/time exits, position sizing, regime filter, friction — 29 vitest cases
- **Two trailing stops**: a fixed % under the peak, or a structure stop hung under the recent lows with an ATR buffer. Both ratchet, both read only closed bars
- **Exit quality**: what share of the profit a trade showed you survived to the exit, what it gave back, the payoff in units of entry risk, and how often a stop fired on a trade that came back
- **Robustness gauntlet**: one button runs vs-random → param-plateau sweep → walk-forward → Monte Carlo, with a pass/warn/fail scorecard and plain-words verdicts ("drawdown insurance, priced" / "trading noise")
- **Playbook**: bundled field-tested presets + your saved setups in localStorage
- Bar-by-bar replay with bear-market shading; lands at the end of the tape, replay is opt-in

Data: bundled daily OHLC (SPY/QQQ/GLD/AAPL/TLT/BTC) via `npm run data:ohlc`. Roadmap: `backtester-roadmap.md` — next up is signals-forward (paper trading + alerts).

## BTC Roulette

BIP39 seed phrase explorer. Pin the words you know, roll the rest, check what comes out against the chain.

- **One grid, two extremes**: pin nothing and it's a roulette, pin all 24 and it's a decoder, pin the 18 you remember and it's the only version that ever pays out
- **Real derivation**: BIP44/49/84, receive + change, verified against the published test vectors — 13 vitest cases
- **Live search space**: each pinned word visibly cuts it by 2048×, with honest odds and time-to-exhaust
- **Ludicrous mode**: a worker per core against a local Bloom filter, ~72 seeds/sec/core (~1,400× the manual spinner). bundles a filter of every address holding ≥ 1 BTC (971,337 of them, 3.5MB, no setup), and `npm run keys:filter` streams a public dump into a wider one
- Checksum solver runs on the raw bitstream, so a spin costs 0.03ms instead of 167ms

Engine notes and what partial recovery actually costs: `keys-roadmap.md`.

## Rent vs Buy

Home purchase scenario planner — configure assumptions, save named scenarios, compare buy-vs-rent on a 10-year projection.

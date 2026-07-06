# fin

Personal finance lab. **[→ Open app](https://gallak87.github.io/fin/)**

## Backtester

Strategy experimentation lab — try an idea in under a minute and understand why it won or lost.

- **9 strategies** (MA cross, RSI, MACD, Donchian, Bollinger, momentum, dip-buyer, B&H, DCA) + custom JS escape hatch
- **Honest engine**: next-open fills, intrabar stops (gap-aware), trailing/take-profit/time exits, position sizing, regime filter, friction — 25 vitest cases
- **Robustness gauntlet**: one button runs vs-random → param-plateau sweep → walk-forward → Monte Carlo, with a pass/warn/fail scorecard and plain-words verdicts ("drawdown insurance, priced" / "trading noise")
- **Playbook**: bundled field-tested presets + your saved setups in localStorage
- Bar-by-bar replay with bear-market shading; lands at the end of the tape, replay is opt-in

Data: bundled daily OHLC (SPY/QQQ/GLD/AAPL/TLT/BTC) via `npm run data:ohlc`. Roadmap: `backtester-roadmap.md` — next up is signals-forward (paper trading + alerts).

## Rent vs Buy

Home purchase scenario planner — configure assumptions, save named scenarios, compare buy-vs-rent on a 10-year projection.

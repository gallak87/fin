# Roadmap

## Vision
An honest **rent-vs-buy** tool for the Seattle Eastside. Two identical households —
one buys, one rents and invests the difference — simulated month by month, with real
Zillow price/rent data. Surfaces break-even horizon, equivalent rent, and net-worth
delta, then prices the intangibles (schools, stability) instead of faking a dollar
value for them.

## Shipped
- Two-households simulation engine (`compare.ts`) — break-even, wealth-delta, equivalent rent from one series
- Rent auto-derives from each home's price (like-for-like), overridable
- Real Eastside data (Zillow 4+BR), refreshable via `npm run data:pull`
- Multi-select location cards (hue per city) with per-city price + offset shade-lines (−25…+5%)
- Headline results + premium line; affordability (DTI/reserves/cashflow) as a secondary panel

## Next
- **Buy-now-vs-wait view**: plot buying today vs waiting 6/12/18mo, where the home is
  bought at the (possibly dipped) near-term price and the down payment stays invested +
  rent is paid in the meantime. Nets out the true cost/benefit of waiting for a dip —
  directly answers "should I hold off and buy cheaper later this year?"

## Future
- **Two-phase appreciation**: separate "next N years" rate from the long-run rate, so a
  near-term dip-then-recover can be modeled without assuming permanent decline
- **Downturn stress toggle**: one-click "−10% over 2 years" overlay vs the base case
- **Bottom-tier data option**: `data:pull --tier=bottom` to start prices at the entry end
  of the market (closer to what's actually on listings) rather than the typical-value median
- **Per-city rent ratio**: price-to-rent varies by city; let each carry its own
- **School ratings**: replace hand-set placeholders with verified GreatSchools values
- **Amortization / equity drilldown** for a selected scenario

# Build Plan

## Phase 1 — Scaffold + Financial Engine
- [x] Vite + React + TypeScript scaffold
- [x] Tailwind CSS + Recharts + Zustand installed
- [x] `src/types.ts` — all shared types
- [x] `src/lib/mortgage.ts` — pure financial functions
- [x] `src/store.ts` — Zustand store with localStorage persistence

## Phase 2 — Core UI (inputs + live metrics)
- [ ] Mobile-first layout with `md:` breakpoints from the start
- [ ] `InputPanel.tsx` — sliders, toggles, equity source list
- [ ] `MetricsCards.tsx` — PITI, DTI, cash reserve, break-even with color coding
- [ ] `LifestyleGoalBar.tsx` — discretionary budget gauge
- [ ] `CashFlowBreakdown.tsx` — monthly cost table
- [ ] `Tooltip.tsx` — wired to major decision points

## Phase 3 — Projection Chart
- [ ] `ProjectionChart.tsx` — 10-year net worth, multi-scenario overlay
- [ ] Wire to selected scenario IDs in store

## Phase 4 — Scenario Management
- [ ] `ScenarioList.tsx` — save, name, load, delete (confirm dialog), multi-select
- [ ] `CompareModal.tsx` — side-by-side table, highlight best/worst
- [ ] localStorage round-trip verified

## Phase 5 — Responsive / Mobile
- [ ] Two-column → single-column on mobile
- [ ] Collapsible input drawer on small screens
- [ ] Chart + cards readable at 375px
- [ ] Compare modal horizontal scroll on mobile

## Phase 6 — GitHub Repo + Pages Deploy
- [ ] `gh repo create` → public repo
- [ ] GitHub Actions: build on push to `main`, deploy to `gh-pages`
- [ ] `vite.config.ts` base path set to repo name
- [ ] Verify live URL on desktop + mobile

## Phase 7 (Future) — Excel Export
- [ ] Export scenario comparison to `.xlsx` with chart sheet
- [ ] Library: `exceljs`

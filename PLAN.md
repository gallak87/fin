# Build Plan

## Phase 1 — Scaffold + Financial Engine
- [x] Vite + React + TypeScript scaffold
- [x] Tailwind CSS + Recharts + Zustand installed
- [x] `src/types.ts` — all shared types
- [x] `src/lib/mortgage.ts` — pure financial functions
- [x] `src/store.ts` — Zustand store with localStorage persistence

## Phase 2 — Core UI (inputs + live metrics)
- [x] Mobile-first layout with `md:` breakpoints from the start
- [x] `InputPanel.tsx` — sliders, toggles, equity source list
- [x] `MetricsCards.tsx` — PITI, DTI, cash reserve, break-even with color coding
- [x] `LifestyleGoalBar.tsx` — discretionary budget gauge
- [x] `CashFlowBreakdown.tsx` — monthly cost table
- [x] `Tooltip.tsx` — wired to major decision points

## Phase 3 — Projection Chart
- [x] `ProjectionChart.tsx` — delta chart (buy advantage over renting), multi-scenario overlay
- [x] Wire to selected scenario IDs in store

## Phase 4 — Scenario Management
- [x] `ScenarioList.tsx` — save, name, load, delete (confirm dialog), multi-select as pills
- [x] `CompareModal.tsx` — side-by-side table, highlight best/worst
- [x] localStorage round-trip verified

## Phase 5 — Responsive / Mobile
- [x] Two-column → single-column on mobile
- [x] Collapsible input drawer on small screens
- [x] Chart + cards readable at 375px
- [x] Compare modal horizontal scroll on mobile

## Phase 6 — GitHub Repo + Pages Deploy
- [x] `gh repo create` → public repo (gallak87/fin)
- [x] GitHub Actions: build on push to `main`, deploy via actions/deploy-pages
- [x] `vite.config.ts` base path set to `/fin/`
- [ ] Verify live URL on desktop + mobile (pending Pages source → GitHub Actions switch)

## Phase 7 (Future) — Excel Export
- [ ] Export scenario comparison to `.xlsx` with chart sheet
- [ ] Library: `exceljs`

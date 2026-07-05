import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Inputs } from './types'
import { medianPrice } from './compare'

const DEFAULT_FOCUS = 'woodinville'
const DEFAULT_PRICE = 1_100_000

const DEFAULT_INPUTS: Inputs = {
  locationId: DEFAULT_FOCUS,
  housePrice: DEFAULT_PRICE,

  totalLiquidAssets: 800_000,
  liquidDownPayment: 600_000,
  equitySources: [
    { id: 'tn', name: 'TN House', amount: 204_000, include: false },
    { id: 'sea', name: 'Seattle Condo', amount: 270_000, include: false },
  ],
  income1: 240_000,
  income2: 200_000,
  income2Active: false,
  holdingPeriodYears: 10,

  mortgageRate: 7.0,
  loanTermYears: 30,

  propertyTaxRate: 0.9,
  insuranceRate: 0.4,
  maintenanceRate: 1.0,
  closingCostPct: 2.0,
  sellingCostPct: 7.0,
  pmiRate: 0.6,
  effectiveTaxRate: 28,
  taxRateOverride: false,

  rentToPriceRatio: 26,
  rentGrowth: 3.5,

  annualAppreciation: 3.5,
  investmentReturn: 6.0,

  monthlyNonHousingExpenses: 4_000,
  discretionaryGoal: 3_000,
}

interface Store {
  inputs: Inputs
  selectedLocations: string[]
  focusedLocation: string
  cityPrice: Record<string, number>
  priceOffsets: number[]
  setInputs: (patch: Partial<Inputs>) => void
  tapLocation: (id: string) => void
  setFocusedPrice: (price: number) => void
  toggleOffset: (offset: number) => void
  resetInputs: () => void
}

/** Keep inputs.housePrice / locationId mirrored to the focused city. */
function syncFocus(s: Store): Partial<Store> {
  const price = s.cityPrice[s.focusedLocation] ?? medianPrice(s.focusedLocation)
  return { inputs: { ...s.inputs, locationId: s.focusedLocation, housePrice: price } }
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      inputs: DEFAULT_INPUTS,
      selectedLocations: [DEFAULT_FOCUS],
      focusedLocation: DEFAULT_FOCUS,
      cityPrice: { [DEFAULT_FOCUS]: DEFAULT_PRICE },
      priceOffsets: [0],

      setInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch } })),

      // tap unselected → select+focus; tap selected non-focused → focus;
      // tap focused → deselect (focus shifts to another selected city)
      tapLocation: (id) =>
        set((s) => {
          const selected = s.selectedLocations.includes(id)
          if (!selected) {
            const cityPrice = { ...s.cityPrice }
            if (cityPrice[id] == null) cityPrice[id] = medianPrice(id)
            const next = { ...s, selectedLocations: [...s.selectedLocations, id], focusedLocation: id, cityPrice }
            return { selectedLocations: next.selectedLocations, focusedLocation: id, cityPrice, ...syncFocus(next) }
          }
          if (s.focusedLocation !== id) {
            return { focusedLocation: id, ...syncFocus({ ...s, focusedLocation: id }) }
          }
          // deselect focused (keep at least one selected)
          const remaining = s.selectedLocations.filter((x) => x !== id)
          if (remaining.length === 0) return {}
          const nextFocus = remaining[0]
          return {
            selectedLocations: remaining,
            focusedLocation: nextFocus,
            ...syncFocus({ ...s, focusedLocation: nextFocus }),
          }
        }),

      setFocusedPrice: (price) =>
        set((s) => ({
          cityPrice: { ...s.cityPrice, [s.focusedLocation]: price },
          inputs: { ...s.inputs, housePrice: price },
        })),

      toggleOffset: (offset) =>
        set((s) => {
          if (offset === 0) return {} // median line is always on
          return {
            priceOffsets: s.priceOffsets.includes(offset)
              ? s.priceOffsets.filter((o) => o !== offset)
              : [...s.priceOffsets, offset],
          }
        }),

      resetInputs: () =>
        set({
          inputs: DEFAULT_INPUTS,
          selectedLocations: [DEFAULT_FOCUS],
          focusedLocation: DEFAULT_FOCUS,
          cityPrice: { [DEFAULT_FOCUS]: DEFAULT_PRICE },
          priceOffsets: [0],
        }),
    }),
    {
      name: 'rent-vs-buy',
      version: 2,
      migrate: () => undefined, // older shapes are incompatible — fall back to defaults
      merge: (persisted, current) => {
        const ps = (persisted ?? {}) as Partial<Store>
        return {
          ...current,
          ...ps,
          inputs: { ...DEFAULT_INPUTS, ...(ps.inputs ?? {}) },
          selectedLocations: ps.selectedLocations ?? [DEFAULT_FOCUS],
          focusedLocation: ps.focusedLocation ?? DEFAULT_FOCUS,
          cityPrice: ps.cityPrice ?? { [DEFAULT_FOCUS]: DEFAULT_PRICE },
          priceOffsets: ps.priceOffsets ?? [0],
        }
      },
    },
  ),
)

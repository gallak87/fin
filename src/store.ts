import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Inputs, Scenario } from './types'

const DEFAULT_INPUTS: Inputs = {
  housePrice: 1_450_000,
  liquidAssets: 600_000,
  equitySources: [
    { id: 'tn', name: 'TN House', amount: 204_000, include: false },
    { id: 'sea', name: 'Seattle Condo', amount: 270_000, include: false },
  ],
  mortgageRate: 7.0,
  loanTermYears: 30,
  propertyTaxRate: 1.1,
  income1: 240_000,
  income2: 200_000,
  income2Active: false,
  monthlyTakeHome: 15_000,
  discretionaryGoal: 3_000,
  annualAppreciation: 3.5,
  investmentReturn: 6.0,
  currentRent: 3_550,
  monthlyNonHousingExpenses: 4_000,
}

interface Store {
  inputs: Inputs
  scenarios: Scenario[]
  selectedIds: string[]
  setInputs: (patch: Partial<Inputs>) => void
  resetInputs: () => void
  loadScenario: (id: string) => void
  saveScenario: (name: string) => void
  deleteScenario: (id: string) => void
  toggleSelected: (id: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      inputs: DEFAULT_INPUTS,
      scenarios: [],
      selectedIds: [],

      setInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch } })),

      resetInputs: () => set({ inputs: DEFAULT_INPUTS }),

      loadScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id)
        if (scenario) set({ inputs: { ...scenario.inputs } })
      },

      saveScenario: (name) => {
        const id = crypto.randomUUID()
        const scenario: Scenario = {
          id,
          name: name.trim() || 'Unnamed',
          inputs: { ...get().inputs, equitySources: get().inputs.equitySources.map(s => ({ ...s })) },
          createdAt: Date.now(),
        }
        set((s) => ({ scenarios: [...s.scenarios, scenario] }))
      },

      deleteScenario: (id) =>
        set((s) => ({
          scenarios: s.scenarios.filter((sc) => sc.id !== id),
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
        })),

      toggleSelected: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((sid) => sid !== id)
            : [...s.selectedIds, id],
        })),
    }),
    { name: 'home-planner' },
  ),
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Inputs, Scenario } from './types'

export const BASE_SCENARIO_ID = 'base'

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

const BASE_SCENARIO: Scenario = {
  id: BASE_SCENARIO_ID,
  name: 'base',
  inputs: DEFAULT_INPUTS,
  createdAt: 0,
}

interface Store {
  inputs: Inputs
  scenarios: Scenario[]
  selectedIds: string[]
  activeScenarioId: string
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
      scenarios: [BASE_SCENARIO],
      selectedIds: [],
      activeScenarioId: BASE_SCENARIO_ID,

      // auto-save edits back into the active scenario
      setInputs: (patch) =>
        set((s) => ({
          inputs: { ...s.inputs, ...patch },
          scenarios: s.scenarios.map((sc) =>
            sc.id === s.activeScenarioId
              ? { ...sc, inputs: { ...sc.inputs, ...patch } }
              : sc,
          ),
        })),

      resetInputs: () =>
        set((s) => ({
          inputs: DEFAULT_INPUTS,
          scenarios: s.scenarios.map((sc) =>
            sc.id === s.activeScenarioId ? { ...sc, inputs: DEFAULT_INPUTS } : sc,
          ),
        })),

      loadScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id)
        if (scenario) set({ inputs: { ...scenario.inputs }, activeScenarioId: id })
      },

      // fork current inputs as a new named scenario and switch to it
      saveScenario: (name) => {
        const id = crypto.randomUUID()
        const scenario: Scenario = {
          id,
          name: name.trim() || 'Unnamed',
          inputs: { ...get().inputs, equitySources: get().inputs.equitySources.map((s) => ({ ...s })) },
          createdAt: Date.now(),
        }
        set((s) => ({ scenarios: [...s.scenarios, scenario], activeScenarioId: id }))
      },

      deleteScenario: (id) => {
        if (id === BASE_SCENARIO_ID) return
        set((s) => ({
          scenarios: s.scenarios.filter((sc) => sc.id !== id),
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
          activeScenarioId: s.activeScenarioId === id ? BASE_SCENARIO_ID : s.activeScenarioId,
        }))
        // if we just deleted the active scenario, load base
        if (get().activeScenarioId === BASE_SCENARIO_ID) {
          const base = get().scenarios.find((s) => s.id === BASE_SCENARIO_ID)
          if (base) set({ inputs: { ...base.inputs } })
        }
      },

      toggleSelected: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((sid) => sid !== id)
            : [...s.selectedIds, id],
        })),
    }),
    {
      name: 'home-planner',
      merge: (persisted, current) => {
        const ps = persisted as Partial<Store>
        const raw = ps.scenarios ?? []
        // migrate old scenarios missing new fields
        const migrated = raw.map((sc) => ({
          ...sc,
          inputs: { ...DEFAULT_INPUTS, ...sc.inputs },
        }))
        const hasBase = migrated.some((s) => s.id === BASE_SCENARIO_ID)
        return {
          ...current,
          ...ps,
          inputs: { ...DEFAULT_INPUTS, ...(ps.inputs ?? {}) },
          scenarios: hasBase ? migrated : [BASE_SCENARIO, ...migrated],
          activeScenarioId: ps.activeScenarioId ?? BASE_SCENARIO_ID,
        }
      },
    },
  ),
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Knobs } from './model'
import { FIGURES } from './figures'

const DEFAULTS: Knobs = FIGURES.defaults

interface Store extends Knobs {
  set: (patch: Partial<Knobs>) => void
  reset: () => void
}

export const usePlanStore = create<Store>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'plan-knobs',
      version: 1,
      merge: (persisted, current) => ({ ...current, ...((persisted ?? {}) as Partial<Store>) }),
    },
  ),
)

export { DEFAULTS }

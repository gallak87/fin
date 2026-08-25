import type { Figures } from './types'
import { EXAMPLE } from './personal.example'

// Resolved at build time. Vite returns {} when the file is absent, so a clean
// checkout (i.e. CI) compiles fine and ships the placeholders.
const local = import.meta.glob<{ PERSONAL: Figures }>('./personal.local.ts', { eager: true })
const found = Object.values(local)[0]

export const FIGURES: Figures = found?.PERSONAL ?? EXAMPLE
export const IS_PERSONAL = Boolean(found)

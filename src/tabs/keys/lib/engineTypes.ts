/** Messages between the page and the derivation workers. */
export interface EngineSample {
  words: string[]
  address: string
}

export type EngineRequest =
  | { type: 'start'; pins: (string | null)[]; filter: ArrayBuffer }
  | { type: 'stop' }

export type EngineMessage =
  | { type: 'progress'; checked: number; ms: number; sample: EngineSample | null }
  | { type: 'candidate'; words: string[]; address: string }

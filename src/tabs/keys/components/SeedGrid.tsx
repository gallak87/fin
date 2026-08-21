import { useRef } from 'react'
import { WordSlot } from './WordSlot'
import type { Slot } from './WordSlot'

interface Props {
  slots: Slot[]
  spinning: boolean
  onSet: (i: number, word: string, pinned: boolean) => void
  onTogglePin: (i: number) => void
  onPasteMany: (start: number, words: string[]) => void
}

export function SeedGrid({ slots, spinning, onSet, onTogglePin, onPasteMany }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((slot, i) => (
        <WordSlot
          key={i}
          n={i + 1}
          slot={slot}
          spinning={spinning}
          inputRef={(el) => {
            inputs.current[i] = el
          }}
          onSet={(word, pinned) => onSet(i, word, pinned)}
          onTogglePin={() => onTogglePin(i)}
          onAdvance={() => inputs.current[i + 1]?.focus()}
          onPasteMany={(words) => onPasteMany(i, words)}
        />
      ))}
    </div>
  )
}

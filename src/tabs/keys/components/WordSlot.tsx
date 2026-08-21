import { useRef, useState } from 'react'
import { isWord, suggest } from '../lib/seed'

export interface Slot {
  word: string
  /** pinned words survive a spin; unpinned ones get rerolled */
  pinned: boolean
}

interface Props {
  n: number
  slot: Slot
  spinning: boolean
  inputRef: (el: HTMLInputElement | null) => void
  onSet: (word: string, pinned: boolean) => void
  onTogglePin: () => void
  onAdvance: () => void
  onPasteMany: (words: string[]) => void
}

export function WordSlot({ n, slot, spinning, inputRef, onSet, onTogglePin, onAdvance, onPasteMany }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const [hi, setHi] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const editing = draft !== null
  const text = draft ?? slot.word
  const options = editing ? suggest(draft) : []
  const bad = slot.word !== '' && !isWord(slot.word)

  // advance only on a keyboard/click commit — blurring away must not steal focus
  const commit = (word: string, advance = false) => {
    setDraft(null)
    onSet(word, word !== '')
    if (word && advance) onAdvance()
  }

  const state = bad
    ? 'border-red-500/60 text-red-300'
    : slot.pinned
      ? 'border-gray-600 bg-gray-900 text-white'
      : slot.word
        ? 'border-gray-800 bg-gray-900/40 text-amber-300/90'
        : 'border-gray-800/60 bg-gray-900/20 text-gray-600'

  return (
    <div className="relative" ref={boxRef}>
      <div
        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${state} ${
          spinning && !slot.pinned ? 'opacity-60' : ''
        } focus-within:border-blue-500/70`}
      >
        <span className="w-5 shrink-0 text-right font-mono text-[10px] tabular-nums text-gray-600">{n}</span>
        <input
          ref={inputRef}
          value={text}
          spellCheck={false}
          autoComplete="off"
          placeholder="—"
          aria-label={`word ${n}`}
          onChange={(e) => {
            setDraft(e.target.value.replace(/\s+/g, '').toLowerCase())
            setHi(0)
          }}
          onFocus={(e) => {
            setDraft(slot.word)
            setHi(0)
            e.target.select()
          }}
          onBlur={() => {
            if (draft !== null) commit(draft)
          }}
          onPaste={(e) => {
            const parts = e.clipboardData.getData('text').trim().toLowerCase().split(/\s+/).filter(Boolean)
            if (parts.length > 1) {
              e.preventDefault()
              setDraft(null)
              onPasteMany(parts)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && options.length) {
              e.preventDefault()
              setHi((h) => (h + 1) % options.length)
            } else if (e.key === 'ArrowUp' && options.length) {
              e.preventDefault()
              setHi((h) => (h - 1 + options.length) % options.length)
            } else if (e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
              const pick = options[hi] ?? (isWord(text) ? text : '')
              if (pick || text === '') {
                e.preventDefault()
                commit(pick, true)
              }
            } else if (e.key === 'Escape') {
              setDraft(null)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-gray-700"
        />
        <button
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onTogglePin}
          title={slot.pinned ? 'unpin — let it roll' : 'pin — keep this word'}
          className={`shrink-0 text-[11px] leading-none transition-opacity ${
            slot.word ? 'opacity-70 hover:opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {slot.pinned ? '🔒' : '🎲'}
        </button>
      </div>

      {editing && options.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
          {options.map((w, i) => (
            <li key={w}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  commit(w, true)
                }}
                onMouseEnter={() => setHi(i)}
                className={`block w-full px-2 py-1 text-left font-mono text-[12px] ${
                  i === hi ? 'bg-blue-600/25 text-white' : 'text-gray-400'
                }`}
              >
                {w}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

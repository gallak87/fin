import { useState } from 'react'
import { useBacktestStore } from '../store'
import { DEFAULT_CUSTOM_CODE } from '../engine/custom'

/** Editor for the custom JS strategy. Run applies the code; errors show inline. */
export function CustomCodePanel() {
  const customCode = useBacktestStore((s) => s.customCode)
  const customError = useBacktestStore((s) => s.customError)
  const setCustomCode = useBacktestStore((s) => s.setCustomCode)
  const [draft, setDraft] = useState(customCode)
  const dirty = draft !== customCode

  const run = () => setCustomCode(draft)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-2 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 flex-1">
          Custom strategy — body of init(bars, ind)
        </span>
        <button
          onClick={() => setDraft(DEFAULT_CUSTOM_CODE)}
          className="text-xs text-gray-400 border border-gray-700 rounded px-2 py-1 hover:text-white hover:border-gray-500"
        >
          Reset example
        </button>
        <button
          onClick={run}
          className={`text-xs rounded px-3 py-1 font-medium ${
            dirty ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-800 text-gray-500'
          }`}
        >
          Run ⌘↩
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            run()
          }
        }}
        spellCheck={false}
        className="w-full h-64 bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-gray-200 leading-relaxed resize-y focus:outline-none focus:border-blue-600"
      />
      {customError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-mono">
          {customError}
        </div>
      )}
    </div>
  )
}

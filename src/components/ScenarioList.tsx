import { useState } from 'react'
import { useStore } from '../store'

export function ScenarioList() {
  const { scenarios, selectedIds, loadScenario, deleteScenario, toggleSelected } = useStore()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="min-h-[32px] flex flex-wrap items-center gap-2">
      {scenarios.length === 0 ? (
        <span className="text-[11px] text-gray-700 italic">no scenarios yet — configure inputs and save ↙</span>
      ) : (
        scenarios.map((sc) => {
          const isSelected = selectedIds.includes(sc.id)
          return (
            <div
              key={sc.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors cursor-default ${
                isSelected
                  ? 'bg-blue-950 border-blue-700 text-blue-200'
                  : 'bg-gray-900 border-gray-700 text-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelected(sc.id)}
                className="w-3 h-3 accent-blue-500 shrink-0"
              />
              <button
                onClick={() => loadScenario(sc.id)}
                className="hover:text-white transition-colors cursor-pointer"
                title="Load into inputs"
              >
                {sc.name}
              </button>
              <button
                onClick={() => setConfirmDelete(sc.id)}
                className="text-gray-600 hover:text-red-400 leading-none ml-0.5"
                title="Delete"
              >
                ×
              </button>
            </div>
          )
        })
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 w-full max-w-sm space-y-3">
            <div className="text-sm font-semibold text-white">Delete scenario?</div>
            <div className="text-xs text-gray-400">
              "{scenarios.find((s) => s.id === confirmDelete)?.name}" will be permanently removed.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteScenario(confirmDelete); setConfirmDelete(null) }}
                className="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

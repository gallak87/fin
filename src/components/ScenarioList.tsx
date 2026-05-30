import { useState } from 'react'
import { useStore } from '../store'

export function ScenarioList() {
  const { scenarios, selectedIds, saveScenario, loadScenario, deleteScenario, toggleSelected } = useStore()
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleSave() {
    const n = name.trim() || 'Unnamed'
    saveScenario(n)
    setName('')
  }

  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 space-y-3">
      {/* Save current as scenario */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Scenario name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white placeholder-gray-500"
        />
        <button
          onClick={handleSave}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded whitespace-nowrap"
        >
          Save
        </button>
      </div>

      {scenarios.length === 0 && (
        <div className="text-xs text-gray-600 text-center py-2">No scenarios saved yet</div>
      )}

      {scenarios.map((sc) => {
        const isSelected = selectedIds.includes(sc.id)
        return (
          <div
            key={sc.id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-colors ${
              isSelected ? 'border-blue-600 bg-blue-900/20' : 'border-gray-700 bg-gray-900/30'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelected(sc.id)}
              className="w-4 h-4 accent-blue-600 shrink-0"
              title="Include in chart"
            />
            <span className="flex-1 text-xs text-white truncate">{sc.name}</span>
            <button
              onClick={() => loadScenario(sc.id)}
              className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
            >
              Load
            </button>
            <button
              onClick={() => setConfirmDelete(sc.id)}
              className="text-xs text-gray-600 hover:text-red-400 shrink-0"
              title="Delete"
            >
              ×
            </button>
          </div>
        )
      })}

      {/* Delete confirm dialog */}
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

      {selectedIds.length > 1 && (
        <div className="text-xs text-blue-400 text-center">
          {selectedIds.length} scenarios selected — visible on chart
        </div>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  Download,
  Shuffle,
  Play,
  CheckCircle,
  Circle,
  Target,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DOEMatrix, DOERun, DOEFactor } from '@/hooks/useDOE'

interface DOEMatrixViewProps {
  matrix: DOEMatrix
  onRunComplete?: (runNumber: number, response: number) => void
  onExportCSV?: () => void
  onRandomize?: () => void
  onLaunchSimulation?: (runs: DOERun[]) => void
}

export function DOEMatrixView({
  matrix,
  onRunComplete,
  onExportCSV,
  onRandomize,
  onLaunchSimulation,
}: DOEMatrixViewProps) {
  const [expandedRun, setExpandedRun] = useState<number | null>(null)
  const [selectedRuns, setSelectedRuns] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const toggleRunSelection = (runNumber: number) => {
    const newSelected = new Set(selectedRuns)
    if (newSelected.has(runNumber)) {
      newSelected.delete(runNumber)
    } else {
      newSelected.add(runNumber)
    }
    setSelectedRuns(newSelected)
  }

  const selectAll = () => {
    if (selectedRuns.size === matrix.runs.length) {
      setSelectedRuns(new Set())
    } else {
      setSelectedRuns(new Set(matrix.runs.map((r) => r.runNumber)))
    }
  }

  const handleSort = (factorId: string) => {
    if (sortBy === factorId) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(factorId)
      setSortAsc(true)
    }
  }

  const sortedRuns = React.useMemo(() => {
    if (!sortBy) return matrix.runs

    return [...matrix.runs].sort((a, b) => {
      const aVal = a.factorValues[sortBy] ?? 0
      const bVal = b.factorValues[sortBy] ?? 0
      return sortAsc ? aVal - bVal : bVal - aVal
    })
  }, [matrix.runs, sortBy, sortAsc])

  const completedRuns = matrix.runs.filter((r) => r.completed).length
  const progress = (completedRuns / matrix.runs.length) * 100

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-medium text-white">DOE Matrix</h3>
            <p className="text-xs text-zinc-400">
              {matrix.designType.replace('-', ' ')} design with {matrix.factors.length} factors
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">
              {completedRuns}/{matrix.runs.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRandomize && (
            <Button variant="outline" size="sm" onClick={onRandomize}>
              <Shuffle className="h-4 w-4 mr-1" />
              Randomize
            </Button>
          )}
          {onExportCSV && (
            <Button variant="outline" size="sm" onClick={onExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
          {onLaunchSimulation && selectedRuns.size > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onLaunchSimulation(matrix.runs.filter((r) => selectedRuns.has(r.runNumber)))
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Simulate ({selectedRuns.size})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 px-4 py-2 bg-zinc-800/50 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Total Runs:</span>
          <span className="text-white font-medium">{matrix.totalRuns}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Replicates:</span>
          <span className="text-white">{matrix.replicates}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Center Points:</span>
          <span className="text-white">{matrix.centerPoints}</span>
        </div>
        {matrix.runs.some((r) => r.isStar) && (
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 text-amber-500" />
            <span className="text-zinc-400">Star Points:</span>
            <span className="text-white">{matrix.runs.filter((r) => r.isStar).length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedRuns.size === matrix.runs.length}
                  onChange={selectAll}
                  className="rounded border-zinc-600"
                />
              </th>
              <th className="px-4 py-2 text-left text-zinc-400 font-medium">Run</th>
              <th className="px-4 py-2 text-left text-zinc-400 font-medium">Type</th>
              {matrix.factors.map((factor) => (
                <th
                  key={factor.id}
                  className="px-4 py-2 text-left text-zinc-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort(factor.id)}
                >
                  <div className="flex items-center gap-1">
                    {factor.name}
                    <span className="text-xs text-zinc-500">({factor.unit})</span>
                    {sortBy === factor.id && (
                      sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-2 text-left text-zinc-400 font-medium">Response</th>
              <th className="px-4 py-2 text-left text-zinc-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRuns.map((run) => (
              <React.Fragment key={run.runNumber}>
                <tr
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${
                    selectedRuns.has(run.runNumber) ? 'bg-emerald-900/20' : ''
                  }`}
                  onClick={() => setExpandedRun(expandedRun === run.runNumber ? null : run.runNumber)}
                >
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRuns.has(run.runNumber)}
                      onChange={() => toggleRunSelection(run.runNumber)}
                      className="rounded border-zinc-600"
                    />
                  </td>
                  <td className="px-4 py-2 text-white font-mono">{run.runNumber}</td>
                  <td className="px-4 py-2">
                    {run.isCenter ? (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Target className="h-3 w-3" />
                        Center
                      </span>
                    ) : run.isStar ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="h-3 w-3" />
                        Star
                      </span>
                    ) : (
                      <span className="text-zinc-400">Factorial</span>
                    )}
                  </td>
                  {matrix.factors.map((factor) => (
                    <td key={factor.id} className="px-4 py-2 text-white font-mono">
                      {run.factorValues[factor.id]?.toFixed(2)}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    {run.actualResponse !== undefined ? (
                      <span className="text-emerald-400 font-mono">
                        {run.actualResponse.toFixed(3)}
                      </span>
                    ) : run.estimatedResponse !== undefined ? (
                      <span className="text-zinc-500 font-mono">
                        ~{run.estimatedResponse.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {run.completed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-600" />
                    )}
                  </td>
                </tr>
                {/* Expanded Row */}
                {expandedRun === run.runNumber && (
                  <tr className="bg-zinc-800/20">
                    <td colSpan={matrix.factors.length + 5} className="px-4 py-3">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-zinc-400">Normalized Values:</span>
                          <div className="mt-1 space-y-1">
                            {matrix.factors.map((f) => {
                              const value = run.factorValues[f.id]
                              const normalized = ((value - f.min) / (f.max - f.min)) * 2 - 1
                              return (
                                <div key={f.id} className="flex justify-between">
                                  <span className="text-zinc-500">{f.name}:</span>
                                  <span className="text-white font-mono">
                                    {normalized.toFixed(2)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-400">Percentile Position:</span>
                          <div className="mt-1 space-y-1">
                            {matrix.factors.map((f) => {
                              const value = run.factorValues[f.id]
                              const percentile = ((value - f.min) / (f.max - f.min)) * 100
                              return (
                                <div key={f.id} className="flex justify-between items-center">
                                  <span className="text-zinc-500">{f.name}:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${percentile}%` }}
                                      />
                                    </div>
                                    <span className="text-white font-mono w-8">
                                      {percentile.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {onRunComplete && !run.completed && (
                          <div>
                            <span className="text-zinc-400">Record Response:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="number"
                                step="0.001"
                                placeholder="Enter value"
                                className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const value = parseFloat((e.target as HTMLInputElement).value)
                                    if (!isNaN(value)) {
                                      onRunComplete(run.runNumber, value)
                                    }
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                                  const value = parseFloat(input.value)
                                  if (!isNaN(value)) {
                                    onRunComplete(run.runNumber, value)
                                  }
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center justify-between">
          <span>
            {selectedRuns.size > 0
              ? `${selectedRuns.size} runs selected`
              : 'Click to select runs for batch simulation'}
          </span>
          <span>
            Design resolution:{' '}
            {matrix.designType === 'full-factorial'
              ? 'Full (all effects estimable)'
              : matrix.designType === 'fractional-factorial'
                ? 'III (main effects + some interactions)'
                : matrix.designType === 'taguchi'
                  ? 'Orthogonal (main effects)'
                  : 'Quadratic (main + interaction + quadratic)'}
          </span>
        </div>
      </div>
    </div>
  )
}

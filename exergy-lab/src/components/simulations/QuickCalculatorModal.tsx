'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { X, Calculator, BookOpen, Copy, Check, ExternalLink, History } from 'lucide-react'
import { useQuickCalculator } from '@/hooks/useQuickCalculator'
import type { CalculatorDefinition, CalculatorResult, CalculatorInput, CalculatorOutput } from '@/lib/simulation/quick-calculators'

interface QuickCalculatorModalProps {
  calculator: CalculatorDefinition
  isOpen: boolean
  onClose: () => void
  onCalculationComplete?: (result: CalculatorResult) => void
}

export function QuickCalculatorModal({
  calculator,
  isOpen,
  onClose,
  onCalculationComplete,
}: QuickCalculatorModalProps) {
  const { execute, isLoading, error, getRecentExecutions } = useQuickCalculator()

  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [result, setResult] = useState<CalculatorResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Initialize inputs with defaults
  useEffect(() => {
    if (calculator && isOpen) {
      const defaults: Record<string, number> = {}
      for (const input of calculator.inputs) {
        defaults[input.id] = input.defaultValue ?? 0
      }
      setInputs(defaults)
      setResult(null)
    }
  }, [calculator, isOpen])

  const handleInputChange = (inputId: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      setInputs((prev) => ({ ...prev, [inputId]: numValue }))
    }
  }

  const handleCalculate = async () => {
    const calcResult = await execute(calculator.id, inputs)
    if (calcResult) {
      setResult(calcResult)
      onCalculationComplete?.(calcResult)
    }
  }

  const handleCopyResult = () => {
    if (!result) return

    const text = Object.entries(result.outputs)
      .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toFixed(4) : value}`)
      .join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const recentExecutions = getRecentExecutions(calculator.id).slice(0, 5)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl
                    shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{calculator.name}</h2>
              <p className="text-sm text-zinc-400">{calculator.domain.replace('-', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Inputs</h3>
              <div className="space-y-4">
                {calculator.inputs.map((input: CalculatorInput) => (
                  <div key={input.id}>
                    <label className="block text-sm text-zinc-400 mb-1">
                      {input.name}
                      {input.unit && <span className="text-zinc-500 ml-1">({input.unit})</span>}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={inputs[input.id] ?? ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        min={input.min}
                        max={input.max}
                        step={input.step ?? 'any'}
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                                 text-white focus:outline-none focus:border-emerald-500"
                        placeholder={input.description}
                      />
                      {input.min !== undefined && input.max !== undefined && (
                        <input
                          type="range"
                          value={inputs[input.id] ?? input.defaultValue ?? input.min}
                          onChange={(e) => handleInputChange(input.id, e.target.value)}
                          min={input.min}
                          max={input.max}
                          step={input.step ?? (input.max - input.min) / 100}
                          className="w-24 accent-emerald-500"
                        />
                      )}
                    </div>
                    {input.description && (
                      <p className="text-xs text-zinc-500 mt-1">{input.description}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Calculate button */}
              <button
                onClick={handleCalculate}
                disabled={isLoading}
                className="w-full mt-6 px-4 py-3 bg-emerald-600 hover:bg-emerald-500
                         text-white font-medium rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Calculate
                  </>
                )}
              </button>

              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            {/* Results */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-300">Results</h3>
                {result && (
                  <button
                    onClick={handleCopyResult}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              {result ? (
                <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
                  {calculator.outputs.map((output: CalculatorOutput) => {
                    const value = result.outputs[output.id]
                    if (value === undefined) return null

                    return (
                      <div key={output.id} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">{output.name}</span>
                        <span className="text-lg font-mono text-white">
                          {typeof value === 'number' ? value.toFixed(4) : value}
                          {output.unit && (
                            <span className="text-sm text-zinc-500 ml-1">{output.unit}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}

                  {/* Notes */}
                  {result.notes && result.notes.length > 0 && (
                    <div className="pt-3 border-t border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-2">Notes:</p>
                      <ul className="space-y-1">
                        {result.notes.map((note, i) => (
                          <li key={i} className="text-xs text-zinc-500">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="pt-3 border-t border-zinc-700">
                      <p className="text-xs text-amber-400 mb-2">Warnings:</p>
                      <ul className="space-y-1">
                        {result.warnings.map((warning, i) => (
                          <li key={i} className="text-xs text-amber-500">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-800 rounded-lg p-8 text-center">
                  <Calculator className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">
                    Enter values and click Calculate
                  </p>
                </div>
              )}

              {/* Formula */}
              {calculator.formula && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                    <BookOpen className="w-3 h-3" />
                    Formula
                  </div>
                  <code className="text-sm text-emerald-400 font-mono">
                    {calculator.formula}
                  </code>
                </div>
              )}

              {/* Citation */}
              {calculator.citation && (
                <div className="mt-3 text-xs text-zinc-500">
                  <span className="text-zinc-400">Reference: </span>
                  {calculator.citation}
                </div>
              )}
            </div>
          </div>

          {/* History */}
          {recentExecutions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
              >
                <History className="w-4 h-4" />
                Recent Calculations ({recentExecutions.length})
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2">
                  {recentExecutions.map((exec) => (
                    <div
                      key={exec.id}
                      className="p-3 bg-zinc-800 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4 text-sm">
                          {Object.entries(exec.inputs).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="text-zinc-400">
                              {key}: <span className="text-white">{value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setInputs(exec.inputs)
                          setResult(exec.result)
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-500">
            {calculator.description}
          </p>
        </div>
      </div>
    </div>
  )
}

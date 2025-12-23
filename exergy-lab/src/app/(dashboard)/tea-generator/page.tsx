'use client'

import * as React from 'react'
import { Calculator, Settings, Download, Eye, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ValidationReportCard, CompactValidationSummary } from '@/components/tea/ValidationReportCard'
import { TEAInputForm } from '@/components/tea/TEAInputForm'
import type { Domain } from '@/types/discovery'
import type { TEAInput_v2, TEAResult_v2 } from '@/types/tea'

const DOMAINS: Domain[] = [
  'solar-energy',
  'wind-energy',
  'battery-storage',
  'hydrogen-fuel',
  'geothermal',
  'biomass',
  'carbon-capture',
  'energy-efficiency',
  'grid-optimization',
  'materials-science',
]

// Debug/Developer Mode Hook
function useDebugMode() {
  const [debugMode, setDebugMode] = React.useState(false)
  const [logs, setLogs] = React.useState<Array<{ timestamp: Date; level: string; message: string; data?: any }>>([])

  const log = React.useCallback((level: string, message: string, data?: any) => {
    const entry = { timestamp: new Date(), level, message, data }
    setLogs(prev => [...prev, entry])
    console.log(`[TEA ${level.toUpperCase()}]`, message, data || '')
  }, [])

  React.useEffect(() => {
    // Check for debug mode in URL or localStorage
    const params = new URLSearchParams(window.location.search)
    const debugParam = params.get('debug')
    const debugLocal = localStorage.getItem('tea_debug_mode')

    if (debugParam === 'true' || debugLocal === 'true') {
      setDebugMode(true)
    }
  }, [])

  const toggleDebug = () => {
    const newValue = !debugMode
    setDebugMode(newValue)
    localStorage.setItem('tea_debug_mode', String(newValue))
    log('info', `Debug mode ${newValue ? 'enabled' : 'disabled'}`)
  }

  const clearLogs = () => setLogs([])

  const exportLogs = () => {
    const logText = logs.map(l =>
      `[${l.timestamp.toISOString()}] ${l.level.toUpperCase()}: ${l.message}${l.data ? '\n' + JSON.stringify(l.data, null, 2) : ''}`
    ).join('\n\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tea-debug-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { debugMode, logs, log, toggleDebug, clearLogs, exportLogs }
}

export default function TEAGeneratorPage() {
  const { debugMode, logs, log, toggleDebug, clearLogs, exportLogs } = useDebugMode()
  const [isPremium, setIsPremium] = React.useState(true) // TODO: Get from user subscription - SET TO TRUE FOR TESTING
  const [step, setStep] = React.useState<'input' | 'calculating' | 'results'>('input')
  const [teaInput, setTeaInput] = React.useState<Partial<TEAInput_v2>>({})
  const [teaResults, setTeaResults] = React.useState<TEAResult_v2 | null>(null)
  const [validationResult, setValidationResult] = React.useState<any>(null)
  const [qualityScore, setQualityScore] = React.useState<any>(null)
  const [showDebugPanel, setShowDebugPanel] = React.useState(false)

  React.useEffect(() => {
    log('info', 'TEA Generator page loaded', { version: '0.0.3.1' })
  }, [log])

  const handleGenerateTEAWithInput = async (input: TEAInput_v2) => {
    log('info', 'Starting TEA generation', { input })
    setStep('calculating')

    try {
      // Call the new enhanced TEA API
      log('debug', 'Calling TEA calculation API with input', {
        capacity: input.capacity_mw,
        technology: input.technology_type
      })

      // Add 30-second timeout to prevent hanging
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        const response = await fetch('/api/v2/tea/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            input: input,  // Use the input parameter directly, not state
            options: {
              runValidation: true,
              runSensitivity: true,
              runMonteCarlo: isPremium, // Only for premium users
            },
          }),
        })

        clearTimeout(timeout) // Clear timeout on success

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const data = await response.json()
        log('success', 'TEA calculation completed', {
          lcoe: data.results.lcoe,
          npv: data.results.npv,
          irr: data.results.irr,
          qualityScore: data.validation?.qualityScore
        })

        setTeaResults(data.results)
        setValidationResult(data.validation)
        setQualityScore(data.qualityAssessment)
        setStep('results')

      } catch (fetchError) {
        clearTimeout(timeout) // Clear timeout on error
        throw fetchError // Re-throw to outer catch
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        log('error', 'TEA generation timed out after 30 seconds')
        alert('TEA generation timed out. The calculation is taking too long. Please try again or contact support.')
      } else {
        log('error', 'TEA generation failed', { error: String(error) })
        alert('TEA generation failed. Check debug logs for details.')
      }
      setStep('input')
    }
  }

  // Keep old function for backwards compatibility
  const handleGenerateTEA = () => handleGenerateTEAWithInput(teaInput)

  const handleDownloadPDF = async () => {
    if (!isPremium) {
      log('warn', 'Download attempted without premium subscription')

      // Show upgrade dialog
      const shouldUpgrade = confirm(
        '🔒 Premium Subscription Required\n\n' +
        'To download professional PDF reports with:\n' +
        '✓ 18 comprehensive sections\n' +
        '✓ Monte Carlo uncertainty analysis\n' +
        '✓ Sensitivity analysis with tornado plots\n' +
        '✓ Process flow diagrams\n' +
        '✓ Material & energy balances\n' +
        '✓ Multi-agent validation\n\n' +
        'Click OK to upgrade to Premium, or Cancel to continue with free tier.'
      )

      if (shouldUpgrade) {
        // TODO: Navigate to upgrade page
        alert('Upgrade functionality coming soon!')
      }
      return
    }

    if (!teaResults) {
      alert('No TEA results available. Please run analysis first.')
      return
    }

    log('info', 'Generating PDF report')

    try {
      const response = await fetch('/api/tea/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: teaInput,
          results: teaResults,
          validation: validationResult,
          template: 'academic', // User selectable
        }),
      })

      if (!response.ok) {
        throw new Error('PDF generation failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TEA-Report-${teaInput.project_name || 'Analysis'}-${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      log('success', 'PDF downloaded successfully')
    } catch (error) {
      log('error', 'PDF generation failed', { error: String(error) })
      alert('Failed to generate PDF. Check debug logs.')
    }
  }

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Floating Debug Bug Icon (Bottom Right) */}
      {debugMode && (
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-warning text-slate-900 shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
          title="Toggle Debug Panel"
        >
          <Settings className="w-6 h-6" />
          {logs.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs rounded-full flex items-center justify-center font-bold">
              {logs.length > 99 ? '99+' : logs.length}
            </div>
          )}
        </button>
      )}

      {/* Floating Debug Panel */}
      {debugMode && showDebugPanel && (
        <div className="fixed bottom-24 right-6 z-40 w-96 max-h-[600px] bg-slate-900 border-2 border-warning rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-warning/20 border-b border-warning px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Debug Console
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={clearLogs} className="text-xs h-7">
                Clear
              </Button>
              <Button size="sm" variant="ghost" onClick={exportLogs} className="text-xs h-7">
                Export
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDebugPanel(false)}
                className="text-xs h-7"
              >
                ✕
              </Button>
            </div>
          </div>

          <div className="p-4 bg-black/50 max-h-[500px] overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="mb-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-600">{log.timestamp.toLocaleTimeString()}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                    log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                    log.level === 'success' ? 'bg-green-500/20 text-green-400' :
                    log.level === 'debug' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                </div>
                <div className="text-slate-300">{log.message}</div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="text-slate-500 cursor-pointer hover:text-slate-400">
                      Data ▼
                    </summary>
                    <pre className="text-slate-400 ml-2 mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                No logs yet. Logs will appear here when you use the TEA system.
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 px-4 py-2 border-t border-slate-700">
            <div className="text-xs text-slate-400">
              Total logs: {logs.length} | Debug mode: ON
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-elevated px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">TEA Generator</h1>
              <p className="text-sm text-muted">Industry-standard techno-economic analysis with multi-agent validation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Version Badge */}
            <Badge variant="secondary" className="text-xs">
              v0.0.3.1 Enhanced
            </Badge>

            {/* Premium Badge */}
            {isPremium && (
              <Badge className="bg-amber-500 text-white">
                Premium
              </Badge>
            )}

            {/* Debug Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDebug}
              className={debugMode ? 'bg-warning/20' : ''}
            >
              <Settings className="w-4 h-4 mr-2" />
              {debugMode ? 'Debug ON' : 'Debug'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="w-full space-y-6">

          {/* Debug Panel */}
          {debugMode && (
            <Card className="bg-slate-900 border-warning p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Developer Debug Panel
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={clearLogs} className="text-xs">
                    Clear
                  </Button>
                  <Button size="sm" variant="ghost" onClick={exportLogs} className="text-xs">
                    Export Logs
                  </Button>
                </div>
              </div>

              <div className="bg-black/50 rounded p-3 max-h-60 overflow-y-auto font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-slate-500">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                    <span className={
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'success' ? 'text-green-400' :
                      log.level === 'debug' ? 'text-blue-400' :
                      'text-slate-300'
                    }>
                      {log.level.toUpperCase()}
                    </span>
                    : {log.message}
                    {log.data && (
                      <pre className="text-slate-400 ml-4 mt-1">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-slate-500">No logs yet...</div>
                )}
              </div>
            </Card>
          )}


          {/* Main Content Based on Step */}
          {step === 'input' && (
            <TEAInputForm
              onSubmit={async (input) => {
                // Set input first
                setTeaInput(input)

                // Log the input being submitted
                log('info', 'Form submitted with input', { input })

                // Then trigger calculation with the input directly
                await handleGenerateTEAWithInput(input)
              }}
              initialData={teaInput}
              isPremium={isPremium}
              onLog={log}
            />
          )}

          {step === 'calculating' && (
            <Card className="p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Running Multi-Agent Validation...
              </h3>
              <p className="text-sm text-muted">
                Validating calculations against industry standards (NETL, ICAO, IEA)
              </p>
            </Card>
          )}

          {step === 'results' && teaResults && (
            <>
              {/* Validation Results */}
              {validationResult && qualityScore && (
                <div className="space-y-4">
                  <CompactValidationSummary
                    overallConfidence={validationResult.overallConfidence}
                    qualityScore={qualityScore.overallScore}
                    shouldGenerateReport={validationResult.shouldGenerateReport}
                  />

                  {debugMode && (
                    <ValidationReportCard
                      orchestrationResult={validationResult}
                      qualityAssessment={qualityScore}
                      showDetails={true}
                    />
                  )}
                </div>
              )}

              {/* Results Summary */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  TEA Results Summary
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-elevated rounded-lg border border-border">
                    <div className="text-xs text-muted mb-1">LCOE</div>
                    <div className="text-2xl font-bold text-foreground">
                      ${teaResults.lcoe.toFixed(3)}
                      <span className="text-sm font-normal text-muted">/kWh</span>
                    </div>
                  </div>
                  <div className="p-4 bg-elevated rounded-lg border border-border">
                    <div className="text-xs text-muted mb-1">NPV</div>
                    <div className="text-2xl font-bold text-foreground">
                      ${(teaResults.npv / 1e6).toFixed(2)}
                      <span className="text-sm font-normal text-muted">M</span>
                    </div>
                  </div>
                  <div className="p-4 bg-elevated rounded-lg border border-border">
                    <div className="text-xs text-muted mb-1">IRR</div>
                    <div className="text-2xl font-bold text-foreground">
                      {teaResults.irr.toFixed(1)}
                      <span className="text-sm font-normal text-muted">%</span>
                    </div>
                  </div>
                </div>

                {/* Report Preview (Always Visible) */}
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4 bg-elevated/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Report Contents Preview</span>
                    </div>
                    <div className="bg-background/50 rounded p-4 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">1. Cover Page</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">2. Table of Contents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">3. Executive Summary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">4. Methodology with Formulas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">5. Economic Analysis (CAPEX/OPEX breakdown)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">6. Performance Analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">7. Market Analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span className="text-foreground">8. Results & Discussion</span>
                      </div>
                      {!isPremium && (
                        <div className="flex items-center gap-2 text-warning">
                          <Lock className="w-3 h-3" />
                          <span>... 10 more sections (Premium only)</span>
                        </div>
                      )}
                      {isPremium && (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            <span className="text-foreground">9. Monte Carlo Uncertainty Analysis</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            <span className="text-foreground">10. Sensitivity Analysis with Tornado Plots</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            <span className="text-foreground">11. Process Flow Diagrams</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            <span className="text-foreground">12. Material & Energy Balances</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            <span className="text-foreground">13-18. Equipment Lists, Emissions, References, etc.</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Download/Upgrade Button */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDownloadPDF}
                      className="flex-1"
                      disabled={!teaResults}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isPremium ? 'Download Professional PDF Report' : 'Download Report (Upgrade Required)'}
                    </Button>
                    {isPremium && (
                      <Button variant="outline" disabled={!teaResults}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Report
                      </Button>
                    )}
                  </div>

                  {/* Premium Upgrade Card (for non-premium users) */}
                  {!isPremium && (
                    <div className="border-2 border-warning/30 rounded-lg p-4 bg-warning/5">
                      <div className="flex items-start gap-3">
                        <Lock className="w-6 h-6 text-warning flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">
                            Premium Features
                          </h4>
                          <p className="text-xs text-muted mb-3">
                            Upgrade to access the complete 18-section industry-standard TEA report with:
                          </p>
                          <ul className="text-xs text-muted space-y-1 mb-3">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              Monte Carlo uncertainty analysis (10,000 iterations)
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              Tornado plots and sensitivity analysis
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              Process flow diagrams and material balances
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              Multi-agent validation with 95%+ confidence
                            </li>
                          </ul>
                          <Button size="sm" className="bg-warning text-slate-900 hover:bg-warning/90">
                            Upgrade to Premium
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Debug: Show raw results */}
              {debugMode && teaResults && (
                <Card className="p-4 bg-slate-900 border-warning">
                  <h4 className="text-sm font-semibold text-warning mb-3">Debug: Raw TEA Results</h4>
                  <pre className="text-xs text-slate-300 overflow-auto max-h-96 bg-black/50 p-3 rounded">
                    {JSON.stringify(teaResults, null, 2)}
                  </pre>
                </Card>
              )}
            </>
          )}


        </div>
      </div>
    </div>
  )
}

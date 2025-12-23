'use client'

import * as React from 'react'
import { Calculator, Settings, Download, Eye, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ValidationReportCard, CompactValidationSummary } from '@/components/tea/ValidationReportCard'
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
  const [isPremium, setIsPremium] = React.useState(false) // TODO: Get from user subscription
  const [step, setStep] = React.useState<'input' | 'calculating' | 'results'>('input')
  const [teaInput, setTeaInput] = React.useState<Partial<TEAInput_v2>>({})
  const [teaResults, setTeaResults] = React.useState<TEAResult_v2 | null>(null)
  const [validationResult, setValidationResult] = React.useState<any>(null)
  const [qualityScore, setQualityScore] = React.useState<any>(null)

  React.useEffect(() => {
    log('info', 'TEA Generator page loaded', { version: '0.0.3.1' })
  }, [log])

  const handleGenerateTEA = async () => {
    log('info', 'Starting TEA generation', { input: teaInput })
    setStep('calculating')

    try {
      // Call the new enhanced TEA API
      log('debug', 'Calling TEA calculation API')

      const response = await fetch('/api/v2/tea/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: teaInput,
          options: {
            runValidation: true,
            runSensitivity: true,
            runMonteCarlo: isPremium, // Only for premium users
          },
        }),
      })

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

    } catch (error) {
      log('error', 'TEA generation failed', { error: String(error) })
      alert('TEA generation failed. Check debug logs for details.')
      setStep('input')
    }
  }

  const handleDownloadPDF = async () => {
    if (!isPremium) {
      log('warn', 'Download attempted without premium subscription')
      alert('Premium subscription required to download professional PDF reports')
      return
    }

    log('info', 'Generating PDF report')

    try {
      const response = await fetch('/api/v2/tea/generate-pdf', {
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
    <div className="h-full flex flex-col bg-background">
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
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

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

          {/* Status Banner */}
          <Card className="bg-info/10 border-info/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">Enhanced TEA System v0.0.3.1</h4>
                <p className="text-sm text-muted">
                  Now featuring multi-agent validation, industry-standard calculations (NETL, ICAO, IEA),
                  and publication-quality reports.
                  {!isPremium && (
                    <span className="text-warning ml-2">
                      Upgrade to Premium to download professional PDF reports.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* Main Content Based on Step */}
          {step === 'input' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Configure TEA Analysis
              </h2>
              <p className="text-sm text-muted mb-6">
                Upload project data or enter parameters manually. The enhanced TEA system will
                validate all calculations through a multi-agent pipeline before generating reports.
              </p>

              {/* TODO: Add proper TEA input form here */}
              <div className="space-y-4">
                <div className="p-8 border-2 border-dashed border-border rounded-lg text-center">
                  <Calculator className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">
                    TEA input form will be implemented here
                  </p>
                  <p className="text-xs text-muted mt-2">
                    For now, using the enhanced TEA system requires API integration
                  </p>
                </div>

                <Button
                  onClick={handleGenerateTEA}
                  className="w-full"
                  disabled={true}
                >
                  Generate TEA Analysis (Coming Soon)
                </Button>
              </div>
            </Card>
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

                {/* Premium Gate */}
                {!isPremium ? (
                  <div className="border-2 border-warning/30 rounded-lg p-6 bg-warning/5">
                    <div className="flex items-start gap-4">
                      <Lock className="w-8 h-8 text-warning flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-2">
                          Upgrade to Premium for Full Report
                        </h3>
                        <p className="text-sm text-muted mb-4">
                          Get access to the complete 18-section industry-standard TEA report with:
                        </p>
                        <ul className="text-sm text-muted space-y-1 mb-4">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Publication-quality PDF (academic, government, or executive format)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Monte Carlo uncertainty analysis (10,000 iterations)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Tornado plots and sensitivity analysis
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Process flow diagrams and material balances
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Multi-agent validation with 95%+ confidence
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Full calculation provenance and references
                          </li>
                        </ul>
                        <Button className="bg-warning text-slate-900 hover:bg-warning/90">
                          Upgrade to Premium
                        </Button>
                      </div>
                    </div>

                    {/* Preview of what they'd get */}
                    <div className="mt-6 pt-6 border-t border-warning/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-muted">Report Preview</span>
                      </div>
                      <div className="bg-black/20 rounded p-4 text-xs text-muted space-y-1">
                        <div>📄 1. Cover Page</div>
                        <div>📄 2. Table of Contents</div>
                        <div>📄 3. Executive Summary</div>
                        <div>📄 4. Methodology with Formulas</div>
                        <div>📄 5. Economic Analysis (CAPEX/OPEX breakdown)</div>
                        <div className="text-warning">🔒 ... 13 more sections (Premium only)</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button onClick={handleDownloadPDF} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download Professional PDF Report
                    </Button>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Report
                    </Button>
                  </div>
                )}
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

          {/* System Info (Debug Mode) */}
          {debugMode && (
            <Card className="p-4 bg-slate-900 border-info/30">
              <h4 className="text-sm font-semibold text-info mb-3">System Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">Version</div>
                  <div className="text-slate-300 font-mono">v0.0.3.1</div>
                </div>
                <div>
                  <div className="text-slate-500">Calculation Engine</div>
                  <div className="text-slate-300 font-mono">TEA v2</div>
                </div>
                <div>
                  <div className="text-slate-500">Quality Framework</div>
                  <div className="text-slate-300 font-mono">Multi-Agent</div>
                </div>
                <div>
                  <div className="text-slate-500">Standards</div>
                  <div className="text-slate-300 font-mono">NETL/ICAO/IEA</div>
                </div>
                <div>
                  <div className="text-slate-500">Total Metrics</div>
                  <div className="text-slate-300 font-mono">21</div>
                </div>
                <div>
                  <div className="text-slate-500">Validation Checks</div>
                  <div className="text-slate-300 font-mono">50+</div>
                </div>
                <div>
                  <div className="text-slate-500">Report Sections</div>
                  <div className="text-slate-300 font-mono">18</div>
                </div>
                <div>
                  <div className="text-slate-500">Templates</div>
                  <div className="text-slate-300 font-mono">5</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-xs text-slate-500 mb-2">Recent Logs ({logs.length}):</div>
                <div className="bg-black/50 rounded p-2 max-h-40 overflow-y-auto">
                  {logs.slice(-5).reverse().map((log, i) => (
                    <div key={i} className="text-xs mb-1">
                      <span className={
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        log.level === 'success' ? 'text-green-400' :
                        'text-slate-400'
                      }>
                        [{log.level}]
                      </span>{' '}
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Feature Info */}
          <Card className="p-6 bg-elevated/50">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              What's New in v0.0.3.1
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-foreground mb-2">Quality Assurance</h4>
                <ul className="text-muted space-y-1 text-xs">
                  <li>• Multi-agent validation (Research → Refinement → Self-Critique)</li>
                  <li>• 10-point quality rubric (min 7/10 to pass)</li>
                  <li>• 95% confidence threshold</li>
                  <li>• 50+ validation checks</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Advanced Analysis</h4>
                <ul className="text-muted space-y-1 text-xs">
                  <li>• Monte Carlo simulation (10,000 iterations)</li>
                  <li>• Tornado plots (sensitivity analysis)</li>
                  <li>• Risk metrics (VaR, Expected Shortfall)</li>
                  <li>• Pro-forma income statements</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Process Engineering</h4>
                <ul className="text-muted space-y-1 text-xs">
                  <li>• Material & energy balances</li>
                  <li>• Process flow diagrams (SVG)</li>
                  <li>• Equipment specifications</li>
                  <li>• 3 technology models (Solar, H2, SAF)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Industry Standards</h4>
                <ul className="text-muted space-y-1 text-xs">
                  <li>• NETL QGESS methodology</li>
                  <li>• ICAO CORSIA standards</li>
                  <li>• IEA/NREL benchmarks</li>
                  <li>• 5 report templates</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

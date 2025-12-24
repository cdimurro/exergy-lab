/**
 * Exergy Results Card Component
 *
 * Displays device-level exergy analysis results including:
 * - Applied Exergy Leverage score (prominent display)
 * - Second-law and first-law efficiency metrics
 * - Fossil fuel comparison statement
 * - Data confidence indicator
 */

'use client'

import { Zap, TrendingUp, Info, AlertTriangle, Flame } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ExergyAnalysisResult } from '@/lib/tea/exergy'

interface ExergyResultsCardProps {
  result: ExergyAnalysisResult
  showDetails?: boolean
}

/**
 * Get color class based on leverage score
 */
function getLeverageColor(score: number): string {
  if (score >= 0.7) return 'bg-green-500'
  if (score >= 0.5) return 'bg-blue-500'
  if (score >= 0.3) return 'bg-yellow-500'
  return 'bg-orange-500'
}

/**
 * Get category label for leverage score
 */
function getLeverageCategory(score: number): string {
  if (score >= 0.7) return 'Excellent'
  if (score >= 0.5) return 'Good'
  if (score >= 0.3) return 'Moderate'
  return 'Low'
}

/**
 * Get badge variant based on confidence level
 */
function getConfidenceBadgeVariant(confidence: 'high' | 'medium' | 'low'): 'default' | 'secondary' | 'warning' {
  switch (confidence) {
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'warning'
  }
}

export function ExergyResultsCard({ result, showDetails = true }: ExergyResultsCardProps) {
  const leverageCategory = getLeverageCategory(result.appliedExergyLeverage)
  const leverageColor = getLeverageColor(result.appliedExergyLeverage)

  return (
    <Card className="bg-elevated border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Exergy Analysis
            </h3>
            <p className="text-sm text-muted mt-1">
              Second-law thermodynamic efficiency for {result.technology}
            </p>
          </div>

          {/* Confidence Badge */}
          <Badge variant={getConfidenceBadgeVariant(result.confidence)} className="text-sm px-3 py-1">
            {result.confidence === 'high' ? 'High' : result.confidence === 'medium' ? 'Medium' : 'Low'} Confidence
          </Badge>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-background/50">
        {/* Applied Exergy Leverage - Primary Metric */}
        <div className="flex flex-col md:col-span-1">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            Applied Exergy Leverage
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-foreground">
              {result.appliedExergyLeverage.toFixed(2)}
            </span>
            <Badge className={`${leverageColor} text-white`}>{leverageCategory}</Badge>
          </div>
          <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${leverageColor}`}
              style={{ width: `${Math.min(result.appliedExergyLeverage * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            Combines device efficiency with output energy quality
          </p>
        </div>

        {/* Efficiency Metrics */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            Second-Law Efficiency
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-foreground">
              {(result.secondLawEfficiency * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted mt-2">
            Exergy output / Exergy input
          </p>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            First-Law Efficiency
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-foreground">
              {(result.firstLawEfficiency * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted mt-2">
            Energy output / Energy input
          </p>
        </div>
      </div>

      {/* Fossil Comparison Statement - Highlighted Callout */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500 rounded-r-lg">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {result.fossilComparison.statement}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Compared to: {result.fossilComparison.equivalentTechnology} ({result.fossilComparison.leverageMultiple.toFixed(2)}x)
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics - Collapsible */}
      {showDetails && (
        <div className="px-6 pb-6 space-y-4">
          {/* Exergy Destruction */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-foreground">Exergy Destruction</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {(result.exergyDestructionRatio * 100).toFixed(1)}%
            </span>
          </div>

          {/* Output Quality Factor */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-foreground">Output Quality Factor</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {result.outputQualityFactor.toFixed(2)}
            </span>
          </div>

          {/* Carnot Factor (if applicable) */}
          {result.carnotFactor !== undefined && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-foreground">Carnot Factor</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {(result.carnotFactor * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* Data Source */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted">
              <span className="font-medium">Data Source:</span> {result.dataSource}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

/**
 * Compact version for inline display
 */
export function ExergyResultsCompact({ result }: { result: ExergyAnalysisResult }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">Exergy Leverage:</span>
        <Badge className={getLeverageColor(result.appliedExergyLeverage) + ' text-white'}>
          {result.appliedExergyLeverage.toFixed(2)}
        </Badge>
      </div>
      <div className="text-sm text-muted">
        {(result.secondLawEfficiency * 100).toFixed(0)}% 2nd-law eff.
      </div>
      <div className="text-sm text-muted">
        {result.fossilComparison.leverageMultiple.toFixed(1)}x vs fossil
      </div>
    </div>
  )
}

export default ExergyResultsCard

/**
 * Validation Report Card Component
 *
 * Displays comprehensive validation results from the multi-agent quality pipeline
 * Shows confidence scores, quality rubric results, and recommendations
 */

'use client'

import { CheckCircle2, XCircle, AlertCircle, TrendingUp, FileCheck, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { QualityOrchestrationResult } from '@/lib/tea/quality-orchestrator'
import type { TEAQualityAssessment } from '@/lib/tea/quality-rubric'

interface ValidationReportCardProps {
  orchestrationResult: QualityOrchestrationResult
  qualityAssessment: TEAQualityAssessment
  showDetails?: boolean
}

export function ValidationReportCard({
  orchestrationResult,
  qualityAssessment,
  showDetails = true,
}: ValidationReportCardProps) {
  const {
    overallConfidence = 0,
    qualityScore = 0,
    stages = [],
    shouldGenerateReport = false,
    recommendations = []
  } = orchestrationResult || {}

  return (
    <Card className="bg-elevated border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              TEA Quality Validation Report
            </h3>
            <p className="text-sm text-muted mt-1">
              Multi-agent validation pipeline with industry standards compliance
            </p>
          </div>

          {/* Overall Status Badge */}
          <Badge
            variant={shouldGenerateReport ? 'default' : 'error'}
            className="text-sm px-3 py-1"
          >
            {shouldGenerateReport ? '✓ Approved' : '✗ Needs Review'}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-background/50">
        {/* Confidence Score */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            Overall Confidence
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-foreground">{overallConfidence}%</span>
            <ConfidenceBadge confidence={overallConfidence} />
          </div>
          <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getConfidenceColor(overallConfidence)}`}
              style={{ width: `${overallConfidence}%` }}
            />
          </div>
        </div>

        {/* Quality Score */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            Quality Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-foreground">
              {qualityScore?.toFixed(1) || '0.0'}/10
            </span>
            <Badge variant={qualityAssessment?.grade === 'A' ? 'default' : 'secondary'}>
              Grade {qualityAssessment?.grade || 'N/A'}
            </Badge>
          </div>
          <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getQualityColor(qualityScore || 0)}`}
              style={{ width: `${((qualityScore || 0) / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Validation Stages */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            Validation Stages
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-foreground">
              {stages.filter(s => s.status === 'complete').length}/{stages.length}
            </span>
            <span className="text-sm text-muted">completed</span>
          </div>
          <div className="flex gap-1 mt-2">
            {stages.map((stage, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  stage.status === 'complete'
                    ? 'bg-success'
                    : stage.status === 'in_progress'
                      ? 'bg-warning'
                      : stage.status === 'failed'
                        ? 'bg-error'
                        : 'bg-border'
                }`}
                title={`${stage.stage}: ${stage.status}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quality Rubric Breakdown */}
      {showDetails && (
        <div className="p-6 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Quality Rubric Breakdown
          </h4>

          <div className="space-y-3">
            {qualityAssessment?.criteriaScores?.map((score, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      score.percentage >= 80
                        ? 'bg-success/20 text-success'
                        : score.percentage >= 60
                          ? 'bg-warning/20 text-warning'
                          : 'bg-error/20 text-error'
                    }`}
                  >
                    {score.percentage >= 80 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : score.percentage >= 60 ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{score.criterion}</span>
                      <span className="text-sm text-muted">
                        {score.pointsAwarded}/{score.maxPoints} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{score.rationale}</p>
                  </div>
                </div>

                <div className="ml-4 w-24">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        score.percentage >= 80
                          ? 'bg-success'
                          : score.percentage >= 60
                            ? 'bg-warning'
                            : 'bg-error'
                      }`}
                      style={{ width: `${score.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Stages Detail */}
      {showDetails && (
        <div className="p-6 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Validation Pipeline Stages
          </h4>

          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        stage.status === 'complete'
                          ? 'default'
                          : stage.status === 'failed'
                            ? 'error'
                            : 'secondary'
                      }
                    >
                      {stage.stage.replace('-', ' ')}
                    </Badge>
                    <span className="text-xs text-muted">
                      {new Date(stage.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {stage.confidence}% confidence
                  </span>
                </div>

                {stage.findings.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-muted mb-1">Findings:</p>
                    <ul className="text-xs text-foreground space-y-1">
                      {stage.findings.slice(0, 3).map((finding, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-success mt-0.5">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {stage.discrepancies.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-warning mb-1">Discrepancies:</p>
                    <ul className="text-xs text-foreground space-y-1">
                      {stage.discrepancies.slice(0, 3).map((disc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-warning mt-0.5">•</span>
                          <span>{disc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {stage.corrections.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-info mb-1">Corrections Applied:</p>
                    <ul className="text-xs text-foreground space-y-1">
                      {stage.corrections.slice(0, 2).map((correction, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-info mt-0.5">•</span>
                          <span>{correction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-6 border-t border-border bg-background/30">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {shouldGenerateReport ? 'Optional Improvements' : 'Required Actions'}
        </h4>

        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 text-sm p-3 rounded-lg ${
                rec.includes('CRITICAL') || rec.includes('PRIORITY')
                  ? 'bg-error/10 text-error border border-error/30'
                  : shouldGenerateReport
                    ? 'bg-success/10 text-success border border-success/30'
                    : 'bg-warning/10 text-warning border border-warning/30'
              }`}
            >
              {rec.includes('CRITICAL') || rec.includes('PRIORITY') ? (
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : shouldGenerateReport ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span className="flex-1">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Status */}
      <div
        className={`p-4 ${
          shouldGenerateReport
            ? 'bg-success/10 border-t border-success/30'
            : 'bg-error/10 border-t border-error/30'
        }`}
      >
        <p
          className={`text-sm font-medium text-center ${
            shouldGenerateReport ? 'text-success' : 'text-error'
          }`}
        >
          {shouldGenerateReport
            ? '✓ Quality validation passed. Report generation approved.'
            : '✗ Quality validation incomplete. Address issues before generating report.'}
        </p>
      </div>
    </Card>
  )
}

/**
 * Confidence level badge
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 95) {
    return (
      <Badge variant="default" className="bg-success">
        Excellent
      </Badge>
    )
  } else if (confidence >= 85) {
    return (
      <Badge variant="default" className="bg-info">
        Good
      </Badge>
    )
  } else if (confidence >= 70) {
    return (
      <Badge variant="secondary" className="bg-warning text-gray-900">
        Fair
      </Badge>
    )
  } else {
    return (
      <Badge variant="error" className="bg-error">
        Poor
      </Badge>
    )
  }
}

/**
 * Get confidence level color for progress bar
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 95) return 'bg-success'
  if (confidence >= 85) return 'bg-info'
  if (confidence >= 70) return 'bg-warning'
  return 'bg-error'
}

/**
 * Get quality score color for progress bar
 */
function getQualityColor(score: number): string {
  if (score >= 9) return 'bg-success'
  if (score >= 7) return 'bg-primary'
  if (score >= 5) return 'bg-warning'
  return 'bg-error'
}

/**
 * Detailed Validation Metrics Component
 * Shows metrics-level validation details
 */
interface DetailedValidationMetricsProps {
  qualityAssessment: TEAQualityAssessment
}

export function DetailedValidationMetrics({ qualityAssessment }: DetailedValidationMetricsProps) {
  return (
    <Card className="bg-elevated border-border">
      <div className="p-6">
        <h4 className="text-lg font-semibold text-foreground mb-4">Detailed Quality Assessment</h4>

        {/* Summary */}
        <div className="mb-6 p-4 bg-background rounded-lg border border-border">
          <p className="text-sm text-foreground whitespace-pre-line">{qualityAssessment?.summary || 'No summary available'}</p>
        </div>

        {/* Strengths */}
        {qualityAssessment?.strengths && qualityAssessment.strengths.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Strengths
            </h5>
            <ul className="space-y-1">
              {qualityAssessment.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-success mt-1">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {qualityAssessment?.weaknesses && qualityAssessment.weaknesses.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-warning mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Areas for Improvement
            </h5>
            <ul className="space-y-1">
              {qualityAssessment.weaknesses.map((weakness, index) => (
                <li key={index} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-warning mt-1">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Criteria Details */}
        {qualityAssessment?.criteriaScores && qualityAssessment.criteriaScores.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-foreground mb-3">Criteria Evidence</h5>
            <div className="space-y-4">
              {qualityAssessment.criteriaScores.map((score, index) => (
              <details key={index} className="group">
                <summary className="cursor-pointer p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">{score.criterion}</span>
                      <Badge variant="secondary" className="text-xs">
                        {score.pointsAwarded}/{score.maxPoints}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{score.percentage.toFixed(0)}%</span>
                      <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
                    </div>
                  </div>
                </summary>

                <div className="mt-2 p-4 bg-background/50 rounded-lg border border-border ml-4">
                  {/* Evidence */}
                  {score.evidence.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-success mb-1">Evidence:</p>
                      <ul className="text-xs text-foreground space-y-1">
                        {score.evidence.map((ev, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {score.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-warning mb-1">Improvements:</p>
                      <ul className="text-xs text-foreground space-y-1">
                        {score.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Compact Validation Summary Component
 * For displaying in dashboards
 */
interface CompactValidationSummaryProps {
  overallConfidence: number
  qualityScore: number
  shouldGenerateReport: boolean
}

export function CompactValidationSummary({
  overallConfidence,
  qualityScore,
  shouldGenerateReport,
}: CompactValidationSummaryProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-elevated rounded-lg border border-border">
      <div className="flex items-center gap-2">
        {shouldGenerateReport ? (
          <CheckCircle2 className="w-5 h-5 text-success" />
        ) : (
          <XCircle className="w-5 h-5 text-error" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {shouldGenerateReport ? 'Validation Passed' : 'Validation Failed'}
          </p>
          <p className="text-xs text-muted">
            {overallConfidence}% confidence • {qualityScore.toFixed(1)}/10 quality
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface SectionCardProps {
  title: string
  icon?: LucideIcon
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  requiredFieldsCount?: number
  filledFieldsCount?: number
  errorCount?: number
  onLoadDefaults?: () => void
  showLoadDefaults?: boolean
  description?: string
  disabled?: boolean
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  collapsible = true,
  defaultExpanded = true,
  requiredFieldsCount,
  filledFieldsCount,
  errorCount = 0,
  onLoadDefaults,
  showLoadDefaults = false,
  description,
  disabled = false,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const isComplete = requiredFieldsCount !== undefined &&
                     filledFieldsCount !== undefined &&
                     filledFieldsCount >= requiredFieldsCount

  const hasErrors = errorCount > 0

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className={`
          px-4 py-3 border-b border-border bg-elevated
          ${collapsible ? 'cursor-pointer hover:bg-elevated/80' : ''}
          transition-colors
        `}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>

                {/* Progress Badge */}
                {requiredFieldsCount !== undefined && filledFieldsCount !== undefined && (
                  <Badge
                    variant={isComplete ? 'default' : 'secondary'}
                    className={`text-xs ${
                      isComplete ? 'bg-success text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {filledFieldsCount}/{requiredFieldsCount}
                    {isComplete && <CheckCircle2 className="w-3 h-3 ml-1" />}
                  </Badge>
                )}

                {/* Error Badge */}
                {hasErrors && (
                  <Badge variant="error" className="text-xs">
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </Badge>
                )}
              </div>

              {description && (
                <p className="text-xs text-muted mt-0.5">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {showLoadDefaults && onLoadDefaults && !disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onLoadDefaults()
                }}
                className="text-xs"
              >
                Load Defaults
              </Button>
            )}

            {collapsible && (
              <div className="text-muted">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <div className="p-6">
          {children}
        </div>
      )}
    </Card>
  )
}

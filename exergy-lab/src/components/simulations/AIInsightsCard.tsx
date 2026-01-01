'use client'

import * as React from 'react'
import {
  Eye,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import type { StructuredInsights } from '@/types/simulation'

interface AIInsightsCardProps {
  insights?: string
  structuredInsights?: StructuredInsights
}

/**
 * AIInsightsCard - Displays AI-generated insights in organized sections
 * Falls back to raw text display if structured insights are not available
 */
export function AIInsightsCard({ insights, structuredInsights }: AIInsightsCardProps) {
  // Fallback to raw text display if no structured insights
  if (!structuredInsights) {
    if (!insights) return null
    return (
      <div className="text-sm text-foreground whitespace-pre-wrap">
        {insights}
      </div>
    )
  }

  const sections = [
    {
      title: 'Observations',
      icon: Eye,
      items: structuredInsights.observations,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Recommendations',
      icon: Lightbulb,
      items: structuredInsights.recommendations,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Warnings',
      icon: AlertTriangle,
      items: structuredInsights.warnings,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Next Steps',
      icon: ArrowRight,
      items: structuredInsights.nextSteps,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Summary */}
      {structuredInsights.summary && (
        <p className="text-sm text-foreground leading-relaxed">
          {structuredInsights.summary}
        </p>
      )}

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          if (!section.items || section.items.length === 0) return null

          const Icon = section.icon

          return (
            <div
              key={section.title}
              className={`p-4 rounded-xl ${section.bgColor} border border-transparent`}
            >
              <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${section.color}`}>
                <Icon className="h-4 w-4" />
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-foreground-muted flex items-start gap-2"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${section.color.replace('text-', 'bg-')} flex-shrink-0`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

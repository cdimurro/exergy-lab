/**
 * GuidanceSidebar Component
 *
 * Reusable sidebar with "How It Works" and "Pro Tips" cards.
 */

'use client'

import { Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface HowItWorksStep {
  step: number
  title: string
  description: string
}

export interface GuidanceSidebarProps {
  howItWorks?: HowItWorksStep[]
  tips?: string[]
  howItWorksTitle?: string
  tipsTitle?: string
  className?: string
}

export function GuidanceSidebar({
  howItWorks,
  tips,
  howItWorksTitle = 'How It Works',
  tipsTitle = 'Pro Tips',
  className,
}: GuidanceSidebarProps) {
  return (
    <div className={className}>
      {/* How It Works Card */}
      {howItWorks && howItWorks.length > 0 && (
        <Card className="p-4 bg-elevated border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {howItWorksTitle}
          </h3>
          <div className="space-y-3 text-xs text-muted">
            {howItWorks.map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-semibold">
                  {item.step}
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">
                    {item.title}
                  </div>
                  <div>{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pro Tips Card */}
      {tips && tips.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20 mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            {tipsTitle}
          </h3>
          <ul className="space-y-2 text-xs text-muted">
            {tips.map((tip, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-primary">-</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

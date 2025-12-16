'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface Tab {
  value: string
  label: string
  content: React.ReactNode
}

export interface TabsProps {
  tabs: Tab[]
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
}

export function Tabs({ tabs, defaultValue, onChange, className }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(
    defaultValue || tabs[0]?.value || ''
  )

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    onChange?.(value)
  }

  const activeContent = tabs.find((tab) => tab.value === activeTab)?.content

  return (
    <div className={cn('w-full', className)}>
      {/* Tab List */}
      <div className="border-b border-border">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                activeTab === tab.value
                  ? 'bg-background-elevated text-foreground border-b-2 border-primary'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-surface/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">{activeContent}</div>
    </div>
  )
}

'use client'

import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { Button } from '@/components/ui/button'
import { useChatWorkflow } from '@/hooks/use-chat-workflow'
import { buildPromptFromFormData } from '@/types/wizard'
import type { ChatInterfaceProps, QuickAction } from '@/types/chat'
import type { Domain } from '@/types/discovery'
import type { PageType } from '@/types/wizard'

const DEFAULT_PLACEHOLDERS: Record<string, string> = {
  discovery: 'What would you like to discover? Describe your research goal...',
  search: 'Search for papers, patents, or datasets...',
  experiments: 'Describe the experiment you want to design...',
  simulations: 'What system or process would you like to simulate?',
  tea: 'Describe the technology for techno-economic analysis...',
}

const DEFAULT_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  discovery: [
    { id: 'efficiency', label: 'Solar efficiency records', value: 'What are the latest efficiency records for perovskite solar cells?' },
    { id: 'storage', label: 'Battery breakthroughs', value: 'What are the most promising solid-state battery technologies?' },
    { id: 'hydrogen', label: 'Green hydrogen', value: 'What are the current costs and challenges for green hydrogen production?' },
  ],
  search: [
    { id: 'recent', label: 'Recent papers', value: 'Show me papers from the last 6 months on' },
    { id: 'patents', label: 'Find patents', value: 'Search for patents related to' },
    { id: 'datasets', label: 'Find datasets', value: 'Find datasets for' },
  ],
  experiments: [
    { id: 'synthesis', label: 'Material synthesis', value: 'Design an experiment to synthesize' },
    { id: 'characterization', label: 'Characterization', value: 'Design a characterization protocol for' },
    { id: 'optimization', label: 'Process optimization', value: 'Design experiments to optimize' },
  ],
  simulations: [
    { id: 'pv', label: 'Solar cell', value: 'Simulate the performance of a' },
    { id: 'battery', label: 'Battery', value: 'Simulate charging/discharging cycles for' },
    { id: 'thermal', label: 'Thermal', value: 'Run a thermal simulation for' },
  ],
  tea: [
    { id: 'lcoe', label: 'Calculate LCOE', value: 'Calculate the levelized cost of energy for' },
    { id: 'npv', label: 'NPV analysis', value: 'Perform NPV analysis for' },
    { id: 'sensitivity', label: 'Sensitivity analysis', value: 'Run sensitivity analysis on' },
  ],
}

export function ChatInterface({
  pageTitle,
  pageSubtitle,
  pageIcon,
  pageType,
  showDomainSelector = false,
  showFileUpload = false,
  domains = [],
  quickActions,
  placeholder,
  initialMessages = [],
  initialFormData,
  autoStart = false,
  onWorkflowComplete,
  onError,
  onBack,
}: ChatInterfaceProps) {
  const [selectedDomains, setSelectedDomains] = React.useState<Domain[]>([])
  const [hasAutoStarted, setHasAutoStarted] = React.useState(false)

  const {
    messages,
    workflowState,
    isLoading,
    sendMessage,
    approvePlan,
    rejectPlan,
    modifyPlan,
    cancelExecution,
    retry,
    modifications,
  } = useChatWorkflow({
    pageType,
    onWorkflowComplete: (results) => {
      console.log('Workflow completed:', results)
      onWorkflowComplete?.(results)
    },
    onError: (error) => {
      console.error('Workflow error:', error)
      onError?.(error)
    },
  })

  // Auto-start with form data when autoStart is true
  // Use state (not ref) to track initialization - this survives StrictMode remounts properly
  React.useEffect(() => {
    // Skip if conditions aren't met
    if (!autoStart || !initialFormData || hasAutoStarted) {
      console.log('[ChatInterface] Auto-start skipped:', { autoStart, hasFormData: !!initialFormData, hasAutoStarted })
      return
    }

    console.log('[ChatInterface] Auto-start conditions met, preparing to send message')
    setHasAutoStarted(true)

    // Build prompt from form data
    const prompt = buildPromptFromFormData(pageType as PageType, initialFormData)
    console.log('[ChatInterface] Built prompt:', prompt)

    // Use a microtask to ensure state has settled before calling sendMessage
    // This prevents issues with React 18's automatic batching
    queueMicrotask(() => {
      console.log('[ChatInterface] Microtask executing, calling sendMessage now')
      sendMessage(prompt, {
        formData: initialFormData,
        domains: initialFormData.domain ? [initialFormData.domain as Domain] : [],
      }).then(() => {
        console.log('[ChatInterface] sendMessage completed')
      }).catch((err) => {
        console.error('[ChatInterface] sendMessage error:', err)
      })
    })
  }, [autoStart, initialFormData, hasAutoStarted, pageType, sendMessage])

  const handleDomainToggle = (domain: Domain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    )
  }

  const handleSubmit = async (content: string, context?: any) => {
    await sendMessage(content, {
      ...context,
      domains: selectedDomains,
    })
  }

  const handleFileUpload = (files: File[]) => {
    // Handle file upload - could store in state or upload immediately
    console.log('Files uploaded:', files)
  }

  const effectiveQuickActions = quickActions || DEFAULT_QUICK_ACTIONS[pageType] || []
  const effectivePlaceholder = placeholder || DEFAULT_PLACEHOLDERS[pageType] || 'Type your message...'

  // Determine if we should show quick actions (only in idle state with no messages and no autoStart)
  const showQuickActions = workflowState === 'idle' && messages.length === 0 && !autoStart

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-10 w-10 p-0 mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {pageIcon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {pageIcon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        className="flex-1"
        onPlanApprove={approvePlan}
        onPlanReject={rejectPlan}
        onPlanModify={modifyPlan}
        onRetry={retry}
        onCancel={cancelExecution}
      />

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSubmit={handleSubmit}
          disabled={workflowState === 'executing'}
          isLoading={isLoading}
          placeholder={effectivePlaceholder}
          showDomainSelector={showDomainSelector}
          domains={domains}
          selectedDomains={selectedDomains}
          onDomainToggle={handleDomainToggle}
          showFileUpload={showFileUpload}
          onFileUpload={handleFileUpload}
          quickActions={showQuickActions ? effectiveQuickActions : []}
        />
      </div>
    </div>
  )
}

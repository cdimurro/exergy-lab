'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType, PlanModification } from '@/types/chat'

interface MessageListProps {
  messages: ChatMessageType[]
  className?: string
  onPlanApprove?: (modifications?: PlanModification[]) => void
  onPlanReject?: (reason?: string) => void
  onPlanModify?: (phaseId: string, parameter: string, value: any) => void
  onMakeChanges?: (feedback: string) => void
  onRetry?: () => void
  onCancel?: () => void
  /** Current plan modifications to pass to PlanCard */
  modifications?: PlanModification[]
}

export function MessageList({
  messages,
  className,
  onPlanApprove,
  onPlanReject,
  onPlanModify,
  onMakeChanges,
  onRetry,
  onCancel,
  modifications,
}: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isUserScrolling, setIsUserScrolling] = React.useState(false)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (!isUserScrolling && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isUserScrolling])

  // Detect user scrolling
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

      if (!isAtBottom) {
        setIsUserScrolling(true)
        // Reset after user stops scrolling near bottom
        clearTimeout(scrollTimeout)
        scrollTimeout = setTimeout(() => {
          const { scrollTop: st, scrollHeight: sh, clientHeight: ch } = container
          if (sh - st - ch < 100) {
            setIsUserScrolling(false)
          }
        }, 150)
      } else {
        setIsUserScrolling(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  // Empty state
  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex-1 flex items-center justify-center p-6',
          className
        )}
      >
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">
            Start a Conversation
          </h3>
          <p className="text-base text-muted-foreground">
            Describe what you'd like to discover, search, or analyze.
            I'll create a plan and walk you through it step by step.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
        className
      )}
    >
      <div className="w-full px-2 py-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            onPlanApprove={onPlanApprove}
            onPlanReject={onPlanReject}
            onPlanModify={onPlanModify}
            onMakeChanges={onMakeChanges}
            onRetry={onRetry}
            onCancel={onCancel}
            isLastMessage={index === messages.length - 1}
            modifications={modifications}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

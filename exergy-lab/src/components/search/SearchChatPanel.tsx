'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  Send,
  Loader2,
  History,
  Trash2,
  MessageSquare,
  Sparkles,
  Clock,
} from 'lucide-react'
import { useSearchChat } from '@/hooks/use-search-chat'
import { formatRelativeTime, useSearchUIStore } from '@/lib/store/search-ui-store'
import { ChatHistoryDropdown } from './ChatHistoryDropdown'

/**
 * SearchChatPanel props
 */
interface SearchChatPanelProps {
  query: string
  onBack: () => void
  initialQuestion?: string
}

/**
 * Message bubble component
 */
function MessageBubble({
  message,
  isLast,
}: {
  message: { role: 'user' | 'assistant'; content: string; timestamp: number }
  isLast: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-muted/10 text-foreground rounded-bl-sm'
        }`}
      >
        {/* Message content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={`${isUser ? 'text-white' : 'text-foreground'} m-0`}>
              {line || <br />}
            </p>
          ))}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 ${
            isUser ? 'text-white/70' : 'text-muted'
          }`}
        >
          {formatRelativeTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}

/**
 * Typing indicator component
 */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted/10 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted">Thinking...</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty state component
 */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Ask a follow-up question
      </h3>
      <p className="text-sm text-muted max-w-sm">
        Continue exploring "{query}" by asking questions about the search results,
        requesting clarification, or diving deeper into specific topics.
      </p>
    </div>
  )
}

/**
 * Search Chat Panel
 * Slide-in panel for follow-up questions using Gemini 3 Flash
 */
export function SearchChatPanel({
  query,
  onBack,
  initialQuestion,
}: SearchChatPanelProps) {
  const [input, setInput] = useState(initialQuestion || '')
  const [showHistory, setShowHistory] = useState(false)
  const [hasTriggeredPending, setHasTriggeredPending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { pendingQuestion, clearPendingQuestion } = useSearchUIStore()

  const {
    session,
    messages,
    isGenerating,
    sendMessage,
    startChat,
    recentChats,
    resumeChat,
  } = useSearchChat()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isGenerating])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Send pending question from store (when user clicks a follow-up question)
  useEffect(() => {
    if (pendingQuestion && !hasTriggeredPending && !isGenerating) {
      setHasTriggeredPending(true)
      startChat(pendingQuestion)
      clearPendingQuestion()
      setInput('')
    }
  }, [pendingQuestion, hasTriggeredPending, isGenerating, startChat, clearPendingQuestion])

  // Send initial question if provided via prop (legacy support)
  useEffect(() => {
    if (initialQuestion && !session && messages.length === 0 && !pendingQuestion) {
      startChat(initialQuestion)
      setInput('')
    }
  }, [initialQuestion, session, messages.length, startChat, pendingQuestion])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return

    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-elevated border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Results</span>
          </button>

          <div className="flex items-center gap-2">
            {/* History dropdown trigger */}
            {recentChats.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                           bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20
                           rounded-lg transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>

                {showHistory && (
                  <ChatHistoryDropdown
                    sessions={recentChats}
                    onSelect={(id) => {
                      resumeChat(id)
                      setShowHistory(false)
                    }}
                    onClose={() => setShowHistory(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Context */}
        <div className="mt-2 text-xs text-muted">
          <span className="font-medium">Search context:</span> {query}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !isGenerating ? (
          <EmptyState query={query} />
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            {isGenerating && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <footer className="sticky bottom-0 bg-elevated border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-background border border-border rounded-xl p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..."
              className="flex-1 resize-none bg-transparent text-foreground placeholder-muted
                       outline-none text-sm min-h-[40px] max-h-[120px] py-2 px-2"
              rows={1}
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className={`p-2 rounded-lg transition-colors ${
                input.trim() && !isGenerating
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-muted/20 text-muted cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-muted text-center mt-2">
            Powered by Gemini. Responses may not always be accurate.
          </p>
        </form>
      </footer>
    </div>
  )
}

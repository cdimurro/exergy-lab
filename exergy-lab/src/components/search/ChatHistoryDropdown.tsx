'use client'

import * as React from 'react'
import { useEffect, useRef } from 'react'
import { MessageSquare, Clock, Trash2, X } from 'lucide-react'
import type { SearchChatSession } from '@/lib/store/search-ui-store'
import { formatRelativeTime, useSearchUIStore } from '@/lib/store/search-ui-store'

/**
 * ChatHistoryDropdown props
 */
interface ChatHistoryDropdownProps {
  sessions: SearchChatSession[]
  onSelect: (sessionId: string) => void
  onClose: () => void
}

/**
 * Chat History Dropdown
 * Shows recent chat sessions for the search page
 */
export function ChatHistoryDropdown({
  sessions,
  onSelect,
  onClose,
}: ChatHistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { deleteChat } = useSearchUIStore()

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteChat(sessionId)
  }

  if (sessions.length === 0) {
    return null
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-elevated border border-border
               rounded-xl shadow-lg overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Chat History</h3>
        <button
          onClick={onClose}
          className="p-1 text-muted hover:text-foreground transition-colors rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions list */}
      <div className="max-h-80 overflow-y-auto">
        {sessions.map((session) => {
          // Get first user message for preview
          const firstMessage = session.messages.find((m) => m.role === 'user')
          const messageCount = session.messages.length

          return (
            <button
              key={session.id}
              onClick={() => onSelect(session.id)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/10
                       transition-colors text-left border-b border-border last:border-0"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {firstMessage?.content || 'Empty chat'}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(session.updatedAt)}
                  </span>
                  <span>-</span>
                  <span>{messageCount} messages</span>
                </div>
                {session.searchQuery && (
                  <p className="text-xs text-muted mt-1 line-clamp-1">
                    Search: {session.searchQuery}
                  </p>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(session.id, e)}
                className="flex-shrink-0 p-1.5 text-muted hover:text-error
                         hover:bg-error/10 rounded transition-colors"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-muted/5 border-t border-border">
        <p className="text-[10px] text-muted text-center">
          Showing last {sessions.length} conversations
        </p>
      </div>
    </div>
  )
}

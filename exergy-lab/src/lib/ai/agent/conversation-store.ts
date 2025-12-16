import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  ConversationSession,
  Message,
  MessageRole,
  Checkpoint,
  AgentConfig,
} from '@/types/agent'
import { countTokens } from '../gemini'

/**
 * Conversation State Management
 *
 * Manages conversation sessions with:
 * - Message history tracking
 * - Context window management
 * - Message prioritization
 * - Session persistence
 * - Multi-session support
 */

interface ConversationStore {
  // State
  sessions: Map<string, ConversationSession>
  activeSessionId: string | null

  // Actions
  createSession: (userId: string, initialMessage?: string, config?: Partial<AgentConfig>) => string
  getSession: (sessionId: string) => ConversationSession | undefined
  setActiveSession: (sessionId: string) => void
  addMessage: (sessionId: string, message: Message) => void
  addCheckpoint: (sessionId: string, checkpoint: Checkpoint) => void
  updateSessionMetadata: (sessionId: string, metadata: Partial<ConversationSession['metadata']>) => void
  deleteSession: (sessionId: string) => void
  listUserSessions: (userId: string) => ConversationSession[]
  clearOldSessions: (maxAge: number) => void
}

/**
 * Create Zustand store for conversation management
 */
export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      sessions: new Map(),
      activeSessionId: null,

      createSession: (userId: string, initialMessage?: string, config?: Partial<AgentConfig>) => {
        const sessionId = generateSessionId()
        const now = Date.now()

        const messages: Message[] = []
        if (initialMessage) {
          messages.push({
            role: 'user',
            content: initialMessage,
            timestamp: now,
          })
        }

        const session: ConversationSession = {
          id: sessionId,
          userId,
          messages,
          checkpoints: [],
          createdAt: now,
          updatedAt: now,
          metadata: {
            domain: 'general',
            complexity: 5,
            totalTokens: 0,
            config,
          },
        }

        set((state) => ({
          sessions: new Map(state.sessions).set(sessionId, session),
          activeSessionId: sessionId,
        }))

        return sessionId
      },

      getSession: (sessionId: string) => {
        return get().sessions.get(sessionId)
      },

      setActiveSession: (sessionId: string) => {
        set({ activeSessionId: sessionId })
      },

      addMessage: (sessionId: string, message: Message) => {
        const session = get().sessions.get(sessionId)
        if (!session) {
          console.error(`[ConversationStore] Session ${sessionId} not found`)
          return
        }

        const updatedMessages = [...session.messages, message]

        set((state) => ({
          sessions: new Map(state.sessions).set(sessionId, {
            ...session,
            messages: updatedMessages,
            updatedAt: Date.now(),
          }),
        }))
      },

      addCheckpoint: (sessionId: string, checkpoint: Checkpoint) => {
        const session = get().sessions.get(sessionId)
        if (!session) return

        set((state) => ({
          sessions: new Map(state.sessions).set(sessionId, {
            ...session,
            checkpoints: [...session.checkpoints, checkpoint],
            updatedAt: Date.now(),
          }),
        }))
      },

      updateSessionMetadata: (sessionId: string, metadata: Partial<ConversationSession['metadata']>) => {
        const session = get().sessions.get(sessionId)
        if (!session) return

        set((state) => ({
          sessions: new Map(state.sessions).set(sessionId, {
            ...session,
            metadata: { ...session.metadata, ...metadata },
            updatedAt: Date.now(),
          }),
        }))
      },

      deleteSession: (sessionId: string) => {
        set((state) => {
          const newSessions = new Map(state.sessions)
          newSessions.delete(sessionId)
          return {
            sessions: newSessions,
            activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
          }
        })
      },

      listUserSessions: (userId: string) => {
        return Array.from(get().sessions.values())
          .filter((session) => session.userId === userId)
          .sort((a, b) => b.updatedAt - a.updatedAt)
      },

      clearOldSessions: (maxAge: number) => {
        const now = Date.now()
        set((state) => {
          const newSessions = new Map(state.sessions)
          for (const [sessionId, session] of newSessions.entries()) {
            if (now - session.updatedAt > maxAge) {
              newSessions.delete(sessionId)
            }
          }
          return { sessions: newSessions }
        })
      },
    }),
    {
      name: 'conversation-store',
      storage: createJSONStorage(() => localStorage),
      // Custom serialization to handle Map
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          sessions: Array.from(state.sessions.entries()),
        })
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str)
        return {
          ...parsed,
          sessions: new Map(parsed.sessions || []),
        }
      },
    }
  )
)

/**
 * Context Window Manager
 *
 * Manages token limits by:
 * - Tracking total tokens
 * - Summarizing old messages
 * - Prioritizing important messages
 * - Trimming to fit within limits
 */
export class ContextManager {
  private maxTokens: number

  constructor(maxTokens: number = 8000) {
    this.maxTokens = maxTokens
  }

  /**
   * Trim messages to fit within token limit
   */
  async trimToTokenLimit(messages: Message[]): Promise<Message[]> {
    let totalTokens = 0
    const keptMessages: Message[] = []

    // Always keep system messages and recent messages
    const systemMessages = messages.filter((m) => m.role === 'system')
    const recentMessages = messages.slice(-10) // Keep last 10 messages

    // Count tokens for system and recent messages
    for (const msg of [...systemMessages, ...recentMessages]) {
      const tokens = await this.estimateTokens(msg.content)
      totalTokens += tokens
    }

    // If we're under the limit, return all messages
    if (totalTokens < this.maxTokens) {
      return messages
    }

    // Otherwise, summarize older messages
    const olderMessages = messages.slice(0, -10).filter((m) => m.role !== 'system')

    if (olderMessages.length > 0) {
      const summary = await this.summarizeMessages(olderMessages)
      const summaryMessage: Message = {
        role: 'system',
        content: `[Previous conversation summary]: ${summary}`,
        timestamp: olderMessages[0].timestamp,
      }

      return [...systemMessages, summaryMessage, ...recentMessages]
    }

    // If still over limit, trim recent messages
    const trimmedRecent: Message[] = []
    totalTokens = 0

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const tokens = await this.estimateTokens(recentMessages[i].content)
      if (totalTokens + tokens < this.maxTokens) {
        trimmedRecent.unshift(recentMessages[i])
        totalTokens += tokens
      } else {
        break
      }
    }

    return [...systemMessages, ...trimmedRecent]
  }

  /**
   * Prioritize messages by importance
   */
  prioritizeMessages(messages: Message[]): Message[] {
    // Priority order: system > user > assistant > tool
    const priority: Record<MessageRole, number> = {
      system: 4,
      user: 3,
      assistant: 2,
      tool: 1,
      function: 1,
    }

    return messages.sort((a, b) => {
      const priorityDiff = priority[b.role] - priority[a.role]
      if (priorityDiff !== 0) return priorityDiff
      // If same priority, sort by timestamp (newer first)
      return b.timestamp - a.timestamp
    })
  }

  /**
   * Summarize old messages to save tokens
   */
  private async summarizeMessages(messages: Message[]): Promise<string> {
    // Simple summarization - in production, use AI
    const userMessages = messages.filter((m) => m.role === 'user')
    const assistantMessages = messages.filter((m) => m.role === 'assistant')

    const topics = userMessages.map((m) => m.content.substring(0, 50)).join(', ')

    return `User discussed: ${topics}. ${assistantMessages.length} responses provided covering these topics.`
  }

  /**
   * Estimate tokens for a message
   */
  private async estimateTokens(content: string): Promise<number> {
    try {
      return await countTokens(content)
    } catch (error) {
      // Fallback estimation: ~4 characters per token
      return Math.ceil(content.length / 4)
    }
  }

  /**
   * Get total token count for messages
   */
  async getTotalTokens(messages: Message[]): Promise<number> {
    let total = 0
    for (const message of messages) {
      total += await this.estimateTokens(message.content)
    }
    return total
  }
}

/**
 * Message Builder Utility
 */
export class MessageBuilder {
  private messages: Message[] = []

  addSystem(content: string): this {
    this.messages.push({
      role: 'system',
      content,
      timestamp: Date.now(),
    })
    return this
  }

  addUser(content: string): this {
    this.messages.push({
      role: 'user',
      content,
      timestamp: Date.now(),
    })
    return this
  }

  addAssistant(content: string): this {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: Date.now(),
    })
    return this
  }

  addTool(content: string, toolName?: string): this {
    this.messages.push({
      role: 'tool',
      content,
      timestamp: Date.now(),
      metadata: toolName ? { toolName } : undefined,
    })
    return this
  }

  addFunction(name: string, args: Record<string, any>): this {
    this.messages.push({
      role: 'function',
      content: JSON.stringify({ name, args }),
      timestamp: Date.now(),
    })
    return this
  }

  build(): Message[] {
    return this.messages
  }

  reset(): this {
    this.messages = []
    return this
  }
}

/**
 * Session Management Helpers
 */

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

/**
 * Export conversation to JSON
 */
export function exportConversation(session: ConversationSession): string {
  return JSON.stringify(session, null, 2)
}

/**
 * Import conversation from JSON
 */
export function importConversation(json: string): ConversationSession {
  return JSON.parse(json)
}

/**
 * Get conversation statistics
 */
export function getConversationStats(session: ConversationSession): {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  toolCalls: number
  checkpoints: number
  duration: number
} {
  const userMessages = session.messages.filter((m) => m.role === 'user').length
  const assistantMessages = session.messages.filter((m) => m.role === 'assistant').length
  const toolCalls = session.messages.filter((m) => m.role === 'tool').length

  return {
    totalMessages: session.messages.length,
    userMessages,
    assistantMessages,
    toolCalls,
    checkpoints: session.checkpoints.length,
    duration: session.updatedAt - session.createdAt,
  }
}

/**
 * API Integration for Server-Side Persistence
 */

/**
 * Save conversation to server
 */
export async function saveConversationToServer(session: ConversationSession): Promise<void> {
  try {
    const response = await fetch('/api/conversations/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })

    if (!response.ok) {
      throw new Error(`Failed to save conversation: ${response.statusText}`)
    }
  } catch (error) {
    console.error('[ConversationStore] Failed to save to server:', error)
    throw error
  }
}

/**
 * Load conversation from server
 */
export async function loadConversationFromServer(sessionId: string): Promise<ConversationSession> {
  try {
    const response = await fetch(`/api/conversations/${sessionId}`)

    if (!response.ok) {
      throw new Error(`Failed to load conversation: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[ConversationStore] Failed to load from server:', error)
    throw error
  }
}

/**
 * List user conversations from server
 */
export async function listUserConversationsFromServer(userId: string): Promise<ConversationSession[]> {
  try {
    const response = await fetch(`/api/conversations/user/${userId}`)

    if (!response.ok) {
      throw new Error(`Failed to list conversations: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[ConversationStore] Failed to list from server:', error)
    throw error
  }
}

/**
 * Delete conversation from server
 */
export async function deleteConversationFromServer(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`/api/conversations/${sessionId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.statusText}`)
    }
  } catch (error) {
    console.error('[ConversationStore] Failed to delete from server:', error)
    throw error
  }
}

/**
 * Create global context manager instance
 */
export const globalContextManager = new ContextManager(8000)

/**
 * Create message builder instance
 */
export function createMessageBuilder(): MessageBuilder {
  return new MessageBuilder()
}

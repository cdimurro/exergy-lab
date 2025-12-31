/**
 * useSearchChat Hook
 *
 * Manages chat state and interactions for search follow-up questions.
 * Uses Gemini 3 Flash Preview for responses.
 */

import { useState, useCallback, useRef } from 'react'
import type { Source } from '@/types/sources'
import {
  useSearchUIStore,
  type ChatMessage,
  type SearchChatSession,
} from '@/lib/store/search-ui-store'

/**
 * Hook return type
 */
interface UseSearchChatReturn {
  /**
   * Current chat session
   */
  session: SearchChatSession | null
  /**
   * Messages in current session
   */
  messages: ChatMessage[]
  /**
   * Whether response is being generated
   */
  isGenerating: boolean
  /**
   * Send a message and get AI response
   */
  sendMessage: (content: string) => Promise<void>
  /**
   * Start a new chat with a question
   */
  startChat: (question: string) => void
  /**
   * Clear the current chat
   */
  clearChat: () => void
  /**
   * Get recent chat sessions
   */
  recentChats: SearchChatSession[]
  /**
   * Resume a previous chat session
   */
  resumeChat: (sessionId: string) => void
}

/**
 * Build system prompt with search context
 */
function buildSystemPrompt(query: string, papers: Array<{ id: string; title: string }>): string {
  const paperContext = papers
    .slice(0, 10)
    .map((p, i) => `[${i + 1}] ${p.title}`)
    .join('\n')

  return `You are a helpful research assistant for Exergy Lab, a clean energy research platform.

The user is asking follow-up questions about their search for: "${query}"

Relevant papers from the search results:
${paperContext}

Guidelines:
- Provide clear, accurate, and well-structured responses
- Reference specific papers by number when relevant (e.g., "Paper [1] discusses...")
- Focus on clean energy, renewable technology, and scientific concepts
- If you don't have enough information, say so clearly
- Keep responses concise but informative
- Use markdown formatting for better readability`
}

/**
 * Hook for managing search chat
 */
export function useSearchChat(): UseSearchChatReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    activeChatId,
    chatSessions,
    currentSearchQuery,
    currentSearchPapers,
    createChatSession,
    addMessage,
    getChatSession,
    resumeChat: storeResumeChat,
  } = useSearchUIStore()

  // Get current session
  const session = activeChatId ? getChatSession(activeChatId) || null : null
  const messages = session?.messages || []

  // Get recent chats (last 5)
  const recentChats = chatSessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return

      let sessionId = activeChatId

      // Create new session if needed
      if (!sessionId) {
        sessionId = createChatSession(content)
      } else {
        // Add user message to existing session
        addMessage(sessionId, {
          role: 'user',
          content: content.trim(),
        })
      }

      setIsGenerating(true)

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      try {
        // Get referenced papers for context
        const session = getChatSession(sessionId)
        const papers = session?.referencedPapers || currentSearchPapers.slice(0, 10).map((p) => ({
          id: p.id,
          title: p.title,
        }))

        // Build messages for API
        const apiMessages = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

        // Add the new user message
        apiMessages.push({
          role: 'user',
          content: content.trim(),
        })

        // Call the chat API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            systemPrompt: buildSystemPrompt(
              session?.searchQuery || currentSearchQuery,
              papers
            ),
            model: 'gemini-2.0-flash',
            stream: false,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.status}`)
        }

        const data = await response.json()

        // Add assistant response
        addMessage(sessionId, {
          role: 'assistant',
          content: data.content || data.message || 'I apologize, but I could not generate a response.',
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled
          return
        }

        console.error('[useSearchChat] Error:', error)

        // Add error message
        addMessage(sessionId, {
          role: 'assistant',
          content: 'I apologize, but I encountered an error generating a response. Please try again.',
        })
      } finally {
        setIsGenerating(false)
        abortControllerRef.current = null
      }
    },
    [
      activeChatId,
      isGenerating,
      messages,
      currentSearchQuery,
      currentSearchPapers,
      createChatSession,
      addMessage,
      getChatSession,
    ]
  )

  /**
   * Start a new chat with a question
   */
  const startChat = useCallback(
    (question: string) => {
      if (!question.trim()) return

      const sessionId = createChatSession(question)

      // Automatically send the question
      // Note: The session already has the user message from createChatSession
      // We just need to get the AI response
      sendMessage(question)
    },
    [createChatSession, sendMessage]
  )

  /**
   * Clear the current chat
   */
  const clearChat = useCallback(() => {
    // Cancel any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsGenerating(false)
  }, [])

  /**
   * Resume a previous chat session
   */
  const resumeChat = useCallback(
    (sessionId: string) => {
      storeResumeChat(sessionId)
    },
    [storeResumeChat]
  )

  return {
    session,
    messages,
    isGenerating,
    sendMessage,
    startChat,
    clearChat,
    recentChats,
    resumeChat,
  }
}

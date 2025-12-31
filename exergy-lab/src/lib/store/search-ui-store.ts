/**
 * Search UI Store
 *
 * Manages state for the enhanced search page including:
 * - View state (results, paper viewer, chat panel)
 * - Selected paper and content
 * - Chat sessions and history
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Source } from '@/types/sources'
import type { PaperContent } from '@/lib/paper-content'

/**
 * Active view in the search UI
 */
export type SearchView = 'results' | 'paper' | 'chat' | 'pdf'

/**
 * Chat message
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  citations?: Array<{
    paperId: string
    title: string
    excerpt?: string
  }>
}

/**
 * Chat session linked to a search
 */
export interface SearchChatSession {
  id: string
  searchQuery: string
  messages: ChatMessage[]
  referencedPapers: Array<{ id: string; title: string }>
  createdAt: number
  updatedAt: number
}

/**
 * Search UI state
 */
export interface SearchUIState {
  // View state
  activeView: SearchView
  previousView: SearchView | null

  // Paper viewer state
  selectedPaper: Source | null
  paperContent: PaperContent | null
  isLoadingContent: boolean
  contentError: string | null

  // PDF viewer state
  showPdfViewer: boolean
  pdfUrl: string | null

  // Chat state
  chatSessions: SearchChatSession[]
  activeChatId: string | null
  currentSearchQuery: string
  currentSearchPapers: Source[]

  // Actions - View
  setActiveView: (view: SearchView) => void
  goBack: () => void

  // Actions - Paper Viewer
  openPaperViewer: (paper: Source) => void
  closePaperViewer: () => void
  setPaperContent: (content: PaperContent | null) => void
  setContentLoading: (loading: boolean) => void
  setContentError: (error: string | null) => void

  // Actions - PDF Viewer
  openPdfViewer: (url: string) => void
  closePdfViewer: () => void

  // Actions - Chat
  openChat: (question?: string) => void
  closeChat: () => void
  setSearchContext: (query: string, papers: Source[]) => void
  createChatSession: (question: string) => string
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  resumeChat: (sessionId: string) => void
  deleteChat: (sessionId: string) => void
  getChatSession: (sessionId: string) => SearchChatSession | undefined

  // Actions - Reset
  reset: () => void
}

const MAX_CHAT_SESSIONS = 10

const initialState = {
  activeView: 'results' as SearchView,
  previousView: null as SearchView | null,
  selectedPaper: null as Source | null,
  paperContent: null as PaperContent | null,
  isLoadingContent: false,
  contentError: null as string | null,
  showPdfViewer: false,
  pdfUrl: null as string | null,
  chatSessions: [] as SearchChatSession[],
  activeChatId: null as string | null,
  currentSearchQuery: '',
  currentSearchPapers: [] as Source[],
}

export const useSearchUIStore = create<SearchUIState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // View actions
      setActiveView: (view) =>
        set((state) => ({
          previousView: state.activeView,
          activeView: view,
        })),

      goBack: () =>
        set((state) => ({
          activeView: state.previousView || 'results',
          previousView: null,
          // Close paper/PDF when going back
          ...(state.activeView === 'paper' && { selectedPaper: null, paperContent: null }),
          ...(state.activeView === 'pdf' && { showPdfViewer: false, pdfUrl: null }),
        })),

      // Paper viewer actions
      openPaperViewer: (paper) =>
        set({
          selectedPaper: paper,
          paperContent: null,
          contentError: null,
          isLoadingContent: true,
          activeView: 'paper',
          previousView: 'results',
        }),

      closePaperViewer: () =>
        set({
          selectedPaper: null,
          paperContent: null,
          contentError: null,
          isLoadingContent: false,
          activeView: 'results',
          previousView: null,
        }),

      setPaperContent: (content) =>
        set({
          paperContent: content,
          isLoadingContent: false,
        }),

      setContentLoading: (loading) =>
        set({ isLoadingContent: loading }),

      setContentError: (error) =>
        set({
          contentError: error,
          isLoadingContent: false,
        }),

      // PDF viewer actions
      openPdfViewer: (url) =>
        set((state) => ({
          showPdfViewer: true,
          pdfUrl: url,
          activeView: 'pdf',
          previousView: state.activeView,
        })),

      closePdfViewer: () =>
        set((state) => ({
          showPdfViewer: false,
          pdfUrl: null,
          activeView: state.previousView || 'paper',
          previousView: null,
        })),

      // Chat actions
      openChat: (question) => {
        const state = get()
        let chatId = state.activeChatId

        // Create new session if we have a question and no active chat
        if (question && !chatId) {
          chatId = get().createChatSession(question)
        }

        set({
          activeView: 'chat',
          previousView: state.activeView,
          activeChatId: chatId,
        })
      },

      closeChat: () =>
        set((state) => ({
          activeView: state.previousView || 'results',
          previousView: null,
        })),

      setSearchContext: (query, papers) =>
        set({
          currentSearchQuery: query,
          currentSearchPapers: papers,
        }),

      createChatSession: (question) => {
        const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const state = get()

        const session: SearchChatSession = {
          id,
          searchQuery: state.currentSearchQuery,
          messages: [
            {
              id: `msg-${Date.now()}`,
              role: 'user',
              content: question,
              timestamp: Date.now(),
            },
          ],
          referencedPapers: state.currentSearchPapers.slice(0, 10).map((p) => ({
            id: p.id,
            title: p.title,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // Add session and trim to max
        const sessions = [session, ...state.chatSessions].slice(0, MAX_CHAT_SESSIONS)

        set({
          chatSessions: sessions,
          activeChatId: id,
        })

        return id
      },

      addMessage: (sessionId, message) =>
        set((state) => ({
          chatSessions: state.chatSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [
                    ...session.messages,
                    {
                      ...message,
                      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                      timestamp: Date.now(),
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : session
          ),
        })),

      resumeChat: (sessionId) =>
        set({
          activeChatId: sessionId,
          activeView: 'chat',
          previousView: 'results',
        }),

      deleteChat: (sessionId) =>
        set((state) => ({
          chatSessions: state.chatSessions.filter((s) => s.id !== sessionId),
          activeChatId: state.activeChatId === sessionId ? null : state.activeChatId,
        })),

      getChatSession: (sessionId) => {
        return get().chatSessions.find((s) => s.id === sessionId)
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'exergy-lab-search-ui-storage',
      partialize: (state) => ({
        // Only persist chat sessions, not view state
        chatSessions: state.chatSessions,
      }),
    }
  )
)

/**
 * Get the most recent chat sessions
 */
export function getRecentChats(limit = 5): SearchChatSession[] {
  const { chatSessions } = useSearchUIStore.getState()
  return chatSessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
}

/**
 * Format relative time for chat history
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

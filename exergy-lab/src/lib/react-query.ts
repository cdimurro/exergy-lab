import { QueryClient, DefaultOptions } from '@tanstack/react-query'

const queryConfig: DefaultOptions = {
  queries: {
    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,

    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 30000)
    },

    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

    // Network mode
    networkMode: 'online',
  },
  mutations: {
    // Retry configuration for mutations
    retry: false, // Don't retry mutations by default
    networkMode: 'online',
  },
}

// Create the QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
})

// Query key factory for consistent key naming
export const queryKeys = {
  // Search
  search: (query: string, filters?: any) => ['search', query, filters] as const,
  papers: (paperId: string) => ['papers', paperId] as const,

  // TEA Reports
  tea: {
    all: ['tea'] as const,
    upload: (fileId: string) => ['tea', 'upload', fileId] as const,
    analyze: (dataId: string) => ['tea', 'analyze', dataId] as const,
  },

  // Experiments
  experiments: {
    all: ['experiments'] as const,
    design: (goalId: string) => ['experiments', 'design', goalId] as const,
    analyze: (protocolId: string) => ['experiments', 'analyze', protocolId] as const,
  },

  // Simulations
  simulations: {
    all: ['simulations'] as const,
    execute: (configId: string) => ['simulations', 'execute', configId] as const,
    results: (resultId: string) => ['simulations', 'results', resultId] as const,
  },

  // Discovery
  discovery: {
    all: ['discovery'] as const,
    report: (promptId: string) => ['discovery', 'report', promptId] as const,
  },
}

// Cache time presets for different data types
export const cachePresets = {
  // Very long cache - data that rarely changes
  veryLong: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Long cache - search results, academic papers
  long: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Medium cache - AI-generated content
  medium: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  // Short cache - real-time data
  short: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },

  // No cache - always fresh
  none: {
    staleTime: 0,
    gcTime: 0,
  },
}

// Prefetch helper
export async function prefetchQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: {
    staleTime?: number
    gcTime?: number
  }
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    ...options,
  })
}

// Invalidate helper
export function invalidateQueries(queryKey: unknown[]) {
  return queryClient.invalidateQueries({ queryKey })
}

// Remove query helper
export function removeQuery(queryKey: unknown[]) {
  return queryClient.removeQueries({ queryKey })
}

// Clear all cache
export function clearCache() {
  return queryClient.clear()
}

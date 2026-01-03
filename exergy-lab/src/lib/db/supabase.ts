/**
 * Supabase Client
 *
 * Database client for persistent storage of user data,
 * workflows, reports, and saved items.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Simplified database types for runtime use
// Full typed schema is in @/types/database.ts
export interface DatabaseTables {
  users: {
    id: string
    email: string
    name: string | null
    tier: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    created_at: string
    updated_at: string
  }
  workflows: {
    id: string
    user_id: string
    type: string
    name: string | null
    status: string
    phase: string | null
    progress: Record<string, unknown>
    input: Record<string, unknown>
    result: Record<string, unknown> | null
    error: string | null
    started_at: string
    completed_at: string | null
    created_at: string
    updated_at: string
  }
  reports: {
    id: string
    user_id: string
    workflow_id: string | null
    type: string
    title: string
    summary: string | null
    sections: unknown[]
    metadata: Record<string, unknown>
    pdf_url: string | null
    created_at: string
  }
  searches: {
    id: string
    user_id: string
    query: string
    filters: Record<string, unknown>
    results: Record<string, unknown> | null
    result_count: number
    created_at: string
  }
  saved_items: {
    id: string
    user_id: string
    type: string
    data: Record<string, unknown>
    tags: string[]
    notes: string | null
    created_at: string
  }
  usage_tracking: {
    id: string
    user_id: string
    feature: string
    count: number
    period_start: string
    period_type: string
    created_at: string
  }
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not configured. Database features will be disabled.'
  )
}

// Create Supabase client (browser-safe) - untyped for flexibility
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false, // We use Clerk for auth
    },
  }
)

// Server-side client with service role (for API routes)
export function createServerClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

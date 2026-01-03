/**
 * Clerk Webhook Handler
 *
 * Syncs user data from Clerk to Supabase on user events.
 */

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'

// Clerk webhook event types we care about
type ClerkWebhookEvent = {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string; id: string }>
    first_name?: string | null
    last_name?: string | null
    created_at?: number
    updated_at?: number
    deleted?: boolean
  }
}

export async function POST(request: NextRequest) {
  // Get the webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  if (!isSupabaseConfigured()) {
    console.error('[Clerk Webhook] Supabase not configured')
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  // Get headers for verification
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    )
  }

  // Get the body
  const payload = await request.text()

  // Verify the webhook signature
  const wh = new Webhook(webhookSecret)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('[Clerk Webhook] Verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  // Handle different event types
  switch (event.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name } = event.data
      const email = email_addresses?.[0]?.email_address || ''
      const name = [first_name, last_name].filter(Boolean).join(' ') || null

      const { error } = await supabase.from('users').insert({
        id,
        email,
        name,
        tier: 'free',
      })

      if (error) {
        console.error('[Clerk Webhook] Error creating user:', error)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      console.log('[Clerk Webhook] User created:', id)
      break
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name } = event.data
      const email = email_addresses?.[0]?.email_address || ''
      const name = [first_name, last_name].filter(Boolean).join(' ') || null

      const { error } = await supabase
        .from('users')
        .update({ email, name })
        .eq('id', id)

      if (error) {
        console.error('[Clerk Webhook] Error updating user:', error)
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        )
      }

      console.log('[Clerk Webhook] User updated:', id)
      break
    }

    case 'user.deleted': {
      const { id } = event.data

      // User data will be cascade deleted due to foreign key constraints
      const { error } = await supabase.from('users').delete().eq('id', id)

      if (error) {
        console.error('[Clerk Webhook] Error deleting user:', error)
        return NextResponse.json(
          { error: 'Failed to delete user' },
          { status: 500 }
        )
      }

      console.log('[Clerk Webhook] User deleted:', id)
      break
    }

    default:
      console.log('[Clerk Webhook] Unhandled event type:', event.type)
  }

  return NextResponse.json({ success: true })
}

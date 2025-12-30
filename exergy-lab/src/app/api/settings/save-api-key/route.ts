import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

/**
 * Save API key for a data source
 *
 * POST /api/settings/save-api-key
 * Body: { source: string, key: string }
 *
 * Note: In production, this should be integrated with a proper
 * secrets management service. This implementation uses Vercel KV
 * for storage, which is suitable for development and simple deployments.
 *
 * For enterprise deployments, consider:
 * - HashiCorp Vault
 * - AWS Secrets Manager
 * - Azure Key Vault
 * - GCP Secret Manager
 */

interface SaveKeyRequest {
  source: string
  key: string
}

const VALID_SOURCES = ['nrel', 'semantic-scholar', 'serp', 'modal']

export async function POST(request: NextRequest) {
  try {
    const body: SaveKeyRequest = await request.json()

    if (!body.source || !body.key) {
      return NextResponse.json(
        { error: 'Source and key are required' },
        { status: 400 }
      )
    }

    if (!VALID_SOURCES.includes(body.source)) {
      return NextResponse.json(
        { error: 'Invalid source' },
        { status: 400 }
      )
    }

    // Check if KV is available
    const kvAvailable = await isKVAvailable()

    if (kvAvailable) {
      // Store in Vercel KV
      const storageKey = `api-keys:${body.source}`
      await kv.set(storageKey, body.key, {
        // API keys don't expire, but we use a very long TTL
        ex: 365 * 24 * 60 * 60, // 1 year
      })

      return NextResponse.json({
        success: true,
        message: 'API key saved to secure storage',
        storage: 'kv',
      })
    } else {
      // KV not available - provide instructions
      return NextResponse.json(
        {
          success: false,
          message: 'Vercel KV not configured. Add API key to environment variables instead.',
          instructions: getEnvInstructions(body.source),
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Failed to save API key:', error)
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

async function isKVAvailable(): Promise<boolean> {
  try {
    await kv.ping()
    return true
  } catch {
    return false
  }
}

function getEnvInstructions(source: string): string {
  const envMapping: Record<string, string> = {
    nrel: 'NREL_API_KEY',
    'semantic-scholar': 'SEMANTIC_SCHOLAR_API_KEY',
    serp: 'SERPAPI_API_KEY',
    modal: 'MODAL_TOKEN_ID and MODAL_TOKEN_SECRET',
  }

  const envVar = envMapping[source] || source.toUpperCase() + '_API_KEY'

  return `Add ${envVar} to your .env.local file for local development, or to your Vercel project environment variables for production.`
}

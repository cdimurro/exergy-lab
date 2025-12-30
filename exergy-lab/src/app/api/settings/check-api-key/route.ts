import { NextRequest, NextResponse } from 'next/server'

/**
 * Check API key status for a data source
 *
 * GET /api/settings/check-api-key?source=nrel
 */

interface ApiKeyCheckResult {
  source: string
  configured: boolean
  valid: boolean | null
  error?: string
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source')

  if (!source) {
    return NextResponse.json(
      { error: 'Source parameter is required' },
      { status: 400 }
    )
  }

  const result = await checkApiKey(source)
  return NextResponse.json(result)
}

async function checkApiKey(source: string): Promise<ApiKeyCheckResult> {
  switch (source) {
    case 'nrel':
      return checkNREL()
    case 'semantic-scholar':
      return checkSemanticScholar()
    case 'serp':
      return checkSerpAPI()
    case 'modal':
      return checkModal()
    default:
      return {
        source,
        configured: false,
        valid: null,
        error: 'Unknown source',
      }
  }
}

async function checkNREL(): Promise<ApiKeyCheckResult> {
  const apiKey = process.env.NREL_API_KEY

  if (!apiKey) {
    return {
      source: 'nrel',
      configured: false,
      valid: null,
    }
  }

  try {
    // Test with a simple PVWatts request
    const url = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${apiKey}&lat=39.7&lon=-105.2&system_capacity=1&module_type=0&losses=14&array_type=0&tilt=20&azimuth=180`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    const data = await response.json()

    if (data.errors && data.errors.length > 0) {
      return {
        source: 'nrel',
        configured: true,
        valid: false,
        error: data.errors[0],
      }
    }

    return {
      source: 'nrel',
      configured: true,
      valid: response.ok && data.outputs,
    }
  } catch (error) {
    return {
      source: 'nrel',
      configured: true,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function checkSemanticScholar(): Promise<ApiKeyCheckResult> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY

  if (!apiKey) {
    return {
      source: 'semantic-scholar',
      configured: false,
      valid: null,
    }
  }

  try {
    const response = await fetch(
      'https://api.semanticscholar.org/graph/v1/paper/search?query=solar+cell&limit=1&fields=paperId,title',
      {
        headers: {
          'Accept': 'application/json',
          'x-api-key': apiKey,
        },
      }
    )

    return {
      source: 'semantic-scholar',
      configured: true,
      valid: response.ok,
    }
  } catch (error) {
    return {
      source: 'semantic-scholar',
      configured: true,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function checkSerpAPI(): Promise<ApiKeyCheckResult> {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    return {
      source: 'serp',
      configured: false,
      valid: null,
    }
  }

  try {
    // Test with account info endpoint
    const response = await fetch(
      `https://serpapi.com/account.json?api_key=${apiKey}`
    )

    return {
      source: 'serp',
      configured: true,
      valid: response.ok,
    }
  } catch (error) {
    return {
      source: 'serp',
      configured: true,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function checkModal(): Promise<ApiKeyCheckResult> {
  const tokenId = process.env.MODAL_TOKEN_ID
  const tokenSecret = process.env.MODAL_TOKEN_SECRET

  if (!tokenId || !tokenSecret) {
    return {
      source: 'modal',
      configured: false,
      valid: null,
    }
  }

  // Modal doesn't have a simple validation endpoint
  // We just check if both values are configured
  return {
    source: 'modal',
    configured: true,
    valid: null, // Cannot validate without running a Modal function
  }
}

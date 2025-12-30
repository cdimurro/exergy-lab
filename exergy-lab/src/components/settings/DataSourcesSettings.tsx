'use client'

import * as React from 'react'
import { Card, Button, Input, Badge } from '@/components/ui'
import {
  Database,
  Key,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react'

/**
 * Data source configuration with API key requirements
 */
interface DataSourceConfig {
  id: string
  name: string
  description: string
  envKey: string
  documentationUrl: string
  required: boolean
  category: 'academic' | 'government' | 'search' | 'simulation'
}

const DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'nrel',
    name: 'NREL APIs',
    description: 'Solar resource data (NSRDB), PV performance (PVWatts), and technology costs (ATB)',
    envKey: 'NREL_API_KEY',
    documentationUrl: 'https://developer.nrel.gov/',
    required: false,
    category: 'government',
  },
  {
    id: 'semantic-scholar',
    name: 'Semantic Scholar',
    description: 'Academic paper search with citation graphs. Optional key increases rate limits (1/sec to 10/sec)',
    envKey: 'SEMANTIC_SCHOLAR_API_KEY',
    documentationUrl: 'https://www.semanticscholar.org/product/api',
    required: false,
    category: 'academic',
  },
  {
    id: 'serp',
    name: 'SerpAPI',
    description: 'Powers Google Patents and Web Search integrations',
    envKey: 'SERPAPI_API_KEY',
    documentationUrl: 'https://serpapi.com/',
    required: false,
    category: 'search',
  },
  {
    id: 'modal',
    name: 'Modal Labs',
    description: 'GPU compute for advanced simulations (Monte Carlo, PhysX, MuJoCo)',
    envKey: 'MODAL_TOKEN_ID',
    documentationUrl: 'https://modal.com/',
    required: false,
    category: 'simulation',
  },
]

interface ApiKeyStatus {
  configured: boolean
  valid: boolean | null
  checking: boolean
  error?: string
}

export function DataSourcesSettings() {
  const [keyStatuses, setKeyStatuses] = React.useState<Record<string, ApiKeyStatus>>({})
  const [showKeys, setShowKeys] = React.useState<Record<string, boolean>>({})
  const [localKeys, setLocalKeys] = React.useState<Record<string, string>>({})

  // Check status on mount
  React.useEffect(() => {
    checkAllStatuses()
  }, [])

  const checkAllStatuses = async () => {
    const statuses: Record<string, ApiKeyStatus> = {}

    for (const source of DATA_SOURCES) {
      statuses[source.id] = {
        configured: false,
        valid: null,
        checking: true,
      }
    }
    setKeyStatuses(statuses)

    // Check each source
    for (const source of DATA_SOURCES) {
      try {
        const response = await fetch(`/api/settings/check-api-key?source=${source.id}`)
        const data = await response.json()

        setKeyStatuses(prev => ({
          ...prev,
          [source.id]: {
            configured: data.configured,
            valid: data.valid,
            checking: false,
            error: data.error,
          },
        }))
      } catch (error) {
        setKeyStatuses(prev => ({
          ...prev,
          [source.id]: {
            configured: false,
            valid: null,
            checking: false,
            error: 'Failed to check status',
          },
        }))
      }
    }
  }

  const getStatusBadge = (status: ApiKeyStatus | undefined) => {
    if (!status || status.checking) {
      return (
        <Badge variant="secondary" size="sm" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking
        </Badge>
      )
    }

    if (!status.configured) {
      return (
        <Badge variant="secondary" size="sm">
          Not Configured
        </Badge>
      )
    }

    if (status.valid === true) {
      return (
        <Badge variant="success" size="sm" className="gap-1">
          <Check className="w-3 h-3" />
          Connected
        </Badge>
      )
    }

    if (status.valid === false) {
      return (
        <Badge variant="error" size="sm" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Invalid
        </Badge>
      )
    }

    return (
      <Badge variant="warning" size="sm">
        Configured
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      academic: 'Academic Sources',
      government: 'Government Data',
      search: 'Search & Patents',
      simulation: 'Simulation Compute',
    }
    return labels[category] || category
  }

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleKeyChange = (id: string, value: string) => {
    setLocalKeys(prev => ({ ...prev, [id]: value }))
  }

  const saveKey = async (source: DataSourceConfig) => {
    const key = localKeys[source.id]
    if (!key) return

    try {
      const response = await fetch('/api/settings/save-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: source.id,
          key: key,
        }),
      })

      if (response.ok) {
        // Clear local key and recheck status
        setLocalKeys(prev => ({ ...prev, [source.id]: '' }))
        checkAllStatuses()
      }
    } catch (error) {
      console.error('Failed to save API key:', error)
    }
  }

  // Group sources by category
  const sourcesByCategory = DATA_SOURCES.reduce((acc, source) => {
    if (!acc[source.category]) {
      acc[source.category] = []
    }
    acc[source.category].push(source)
    return acc
  }, {} as Record<string, DataSourceConfig[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-background-elevated border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database className="w-5 h-5" />
              External Data Sources
            </h3>
            <p className="text-sm text-foreground-muted mt-1 max-w-2xl">
              Configure API keys for external services. Some features require these keys to access
              real-time data from scientific databases, government resources, and simulation providers.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={checkAllStatuses}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Status
          </Button>
        </div>
      </Card>

      {/* Sources by Category */}
      {Object.entries(sourcesByCategory).map(([category, sources]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-medium text-foreground-muted uppercase tracking-wider">
            {getCategoryLabel(category)}
          </h4>

          {sources.map((source) => {
            const status = keyStatuses[source.id]
            const isShown = showKeys[source.id]
            const localKey = localKeys[source.id] || ''

            return (
              <Card key={source.id} className="bg-background-elevated border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-foreground">{source.name}</h4>
                      {getStatusBadge(status)}
                    </div>
                    <p className="text-sm text-foreground-muted mb-3">
                      {source.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                      <code className="px-2 py-0.5 bg-background-surface rounded">
                        {source.envKey}
                      </code>
                      <a
                        href={source.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Get API Key
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status?.configured && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowKey(source.id)}
                      >
                        {isShown ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Key Input (for adding/updating) */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        type={isShown ? 'text' : 'password'}
                        placeholder={status?.configured ? 'Enter new key to update...' : 'Enter API key...'}
                        value={localKey}
                        onChange={(e) => handleKeyChange(source.id, e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!localKey}
                      onClick={() => saveKey(source)}
                      leftIcon={<Key className="w-4 h-4" />}
                    >
                      {status?.configured ? 'Update' : 'Save'}
                    </Button>
                  </div>

                  {status?.error && (
                    <p className="text-xs text-danger mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {status.error}
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ))}

      {/* Environment Variables Info */}
      <Card className="bg-background-surface border-border">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-foreground-subtle shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Environment Variables</p>
            <p className="text-sm text-foreground-muted mt-1">
              API keys entered here are securely stored in your deployment environment.
              For local development, add keys to your <code className="px-1 py-0.5 bg-background-elevated rounded">.env.local</code> file.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

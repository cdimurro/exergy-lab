'use client'

import * as React from 'react'
import { Card, Metric, Text, Flex, ProgressBar } from '@tremor/react'
import { Button, Badge } from '@/components/ui'
import {
  Database,
  Upload,
  Download,
  Search,
  Filter,
  FileText,
  Table,
  BarChart3,
  Clock,
  HardDrive,
  RefreshCw,
  ExternalLink,
  Plus,
} from 'lucide-react'

// Sample datasets
const DATASETS = [
  {
    id: 1,
    name: 'Global Energy Statistics 2024',
    type: 'Energy Data',
    format: 'CSV',
    size: '45.2 MB',
    records: '1.2M rows',
    lastUpdated: '2 hours ago',
    source: 'IEA',
    status: 'synced',
  },
  {
    id: 2,
    name: 'Solar Irradiance - North America',
    type: 'Climate Data',
    format: 'NetCDF',
    size: '128.5 MB',
    records: '5.8M points',
    lastUpdated: '1 day ago',
    source: 'NREL',
    status: 'synced',
  },
  {
    id: 3,
    name: 'Wind Capacity Factors',
    type: 'Performance Data',
    format: 'Parquet',
    size: '22.8 MB',
    records: '450K rows',
    lastUpdated: '3 days ago',
    source: 'Custom',
    status: 'synced',
  },
  {
    id: 4,
    name: 'Carbon Intensity by Region',
    type: 'Emissions Data',
    format: 'JSON',
    size: '8.3 MB',
    records: '85K rows',
    lastUpdated: '1 week ago',
    source: 'EPA',
    status: 'outdated',
  },
]

const DATA_SOURCES = [
  { name: 'IEA', connected: true, datasets: 12 },
  { name: 'NREL', connected: true, datasets: 8 },
  { name: 'EIA', connected: true, datasets: 15 },
  { name: 'IRENA', connected: false, datasets: 0 },
]

export default function DatasetsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Datasets</h1>
          <p className="text-foreground-muted mt-1">
            Manage energy datasets, import data sources, and track data freshness.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Sync All
          </Button>
          <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />}>
            Upload Dataset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Total Datasets</Text>
              <Metric className="text-foreground">{DATASETS.length}</Metric>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Database className="w-6 h-6 text-primary" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Total Records</Text>
              <Metric className="text-foreground">7.5M</Metric>
            </div>
            <div className="p-3 rounded-lg bg-accent-blue/10">
              <Table className="w-6 h-6 text-accent-blue" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Storage Used</Text>
              <Metric className="text-foreground">204.8 MB</Metric>
            </div>
            <div className="p-3 rounded-lg bg-accent-purple/10">
              <HardDrive className="w-6 h-6 text-accent-purple" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Data Sources</Text>
              <Metric className="text-foreground">
                {DATA_SOURCES.filter((s) => s.connected).length}
              </Metric>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <BarChart3 className="w-6 h-6 text-success" />
            </div>
          </Flex>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Datasets List */}
        <div className="xl:col-span-2 space-y-6">
          {/* Search and Filter */}
          <Card className="bg-background-elevated border-border">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
                <input
                  type="text"
                  placeholder="Search datasets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-background-surface border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
                Filter
              </Button>
            </div>
          </Card>

          {/* Dataset Cards */}
          <div className="space-y-3">
            {DATASETS.map((dataset) => (
              <Card
                key={dataset.id}
                className="bg-background-elevated border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-background-surface">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{dataset.name}</h3>
                      <p className="text-sm text-foreground-muted mt-1">
                        {dataset.type} • {dataset.format}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-foreground-subtle">
                          {dataset.size}
                        </span>
                        <span className="text-xs text-foreground-subtle">
                          {dataset.records}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-foreground-subtle">
                          <Clock className="w-3 h-3" />
                          {dataset.lastUpdated}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={dataset.status === 'synced' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {dataset.status}
                    </Badge>
                    <Badge variant="secondary" size="sm">
                      {dataset.source}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Connected Sources */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Data Sources
            </h3>
            <div className="space-y-3">
              {DATA_SOURCES.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-background-surface"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        source.connected ? 'bg-success' : 'bg-foreground-subtle'
                      }`}
                    />
                    <span className="text-sm text-foreground">{source.name}</span>
                  </div>
                  {source.connected ? (
                    <span className="text-xs text-foreground-muted">
                      {source.datasets} datasets
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm">
                      Connect
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              className="w-full mt-4"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Source
            </Button>
          </Card>

          {/* Storage Usage */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Storage Usage
            </h3>
            <div className="space-y-4">
              <div>
                <Flex>
                  <Text className="text-foreground-muted">Used</Text>
                  <Text className="text-foreground">204.8 MB / 1 GB</Text>
                </Flex>
                <ProgressBar value={20.48} color="blue" className="mt-2" />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="space-y-2">
                  <Flex>
                    <Text className="text-foreground-muted text-sm">Energy Data</Text>
                    <Text className="text-foreground text-sm">45.2 MB</Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted text-sm">Climate Data</Text>
                    <Text className="text-foreground text-sm">128.5 MB</Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted text-sm">Other</Text>
                    <Text className="text-foreground text-sm">31.1 MB</Text>
                  </Flex>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-background-surface border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV/Excel
              </Button>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Import from API
              </Button>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <Database className="w-4 h-4 mr-2" />
                Connect Database
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

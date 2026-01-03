'use client'

/**
 * Report Detail Page
 *
 * View a single report with full content, table of contents,
 * and export options.
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  FileText,
  Printer,
  Clock,
  Cpu,
  Microscope,
  FlaskConical,
  Bot,
  Calculator,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Check,
  AlertTriangle,
  Info,
  Lightbulb,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import type { ReportType, ReportSection } from '@/types/database'

// Report from API
interface ReportDetail {
  id: string
  user_id: string
  workflow_id: string | null
  type: ReportType
  title: string
  summary: string | null
  sections: ReportSection[]
  metadata: Record<string, unknown>
  pdf_url: string | null
  created_at: string
}

// Icon mapping
const REPORT_TYPE_ICONS: Record<ReportType, React.ComponentType<{ className?: string }>> = {
  discovery: Cpu,
  breakthrough: Microscope,
  experiment: FlaskConical,
  simulation: Bot,
  tea: Calculator,
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  discovery: 'Discovery Report',
  breakthrough: 'Breakthrough Report',
  experiment: 'Experiment Report',
  simulation: 'Simulation Report',
  tea: 'TEA Analysis Report',
}

const SECTION_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  metrics: Check,
  list: ChevronRight,
  table: FileText,
  chart: FileText,
  warning: AlertTriangle,
  info: Info,
  recommendation: Lightbulb,
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  // State
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // Fetch report
  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/user/reports/${reportId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Report not found')
            return
          }
          throw new Error('Failed to fetch report')
        }

        const data = await response.json()
        setReport(data.report)

        // Set first section as active
        if (data.report?.sections?.length > 0) {
          setActiveSection(data.report.sections[0].id)
        }
      } catch (err) {
        console.error('[Report] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setIsLoading(false)
      }
    }

    if (reportId) {
      fetchReport()
    }
  }, [reportId])

  // Format date
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Export handlers
  const handleExportJSON = () => {
    if (!report) return

    const dataStr = JSON.stringify(report, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', `report-${report.id}.json`)
    linkElement.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    if (report?.pdf_url) {
      window.open(report.pdf_url, '_blank')
    }
  }

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(`section-${sectionId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Render section content based on type
  const renderSectionContent = (section: ReportSection) => {
    const content = section.content as unknown

    switch (section.type) {
      case 'text':
        return (
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="whitespace-pre-wrap">{content as string}</p>
          </div>
        )

      case 'list':
        const listItems = content as string[]
        return (
          <ul className="space-y-2">
            {listItems?.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        )

      case 'metrics':
        const metrics = content as Record<string, string | number>
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(metrics || {}).map(([key, value]) => (
              <div
                key={key}
                className="p-3 bg-background-elevated rounded-lg border border-border"
              >
                <div className="text-xs text-foreground-muted mb-1">{key}</div>
                <div className="text-lg font-semibold text-foreground">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              </div>
            ))}
          </div>
        )

      case 'table':
        const tableData = content as { headers: string[]; rows: (string | number)[][] }
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {tableData?.headers?.map((header, i) => (
                    <th key={i} className="text-left py-2 px-3 text-foreground font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData?.rows?.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {row.map((cell, j) => (
                      <td key={j} className="py-2 px-3 text-foreground-muted">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      default:
        // Fallback for unknown types - render as JSON
        return (
          <pre className="p-4 bg-background-elevated rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        )
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <Card className="p-12 bg-background-surface border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-foreground-muted">Loading report...</p>
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <Card className="p-12 bg-background-surface border-border">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{error}</h3>
              <p className="text-foreground-muted">
                The report may have been deleted or you may not have access.
              </p>
            </div>
            <Button onClick={() => router.push('/reports')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!report) return null

  const Icon = REPORT_TYPE_ICONS[report.type] || FileText

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Back Button and Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.push('/reports')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reports
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          {report.pdf_url && (
            <Button variant="outline" onClick={handleDownloadPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents (Sidebar) */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-background-surface border-border sticky top-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Contents</h3>
            <nav className="space-y-1">
              {report.sections.map((section) => {
                const SectionIcon = SECTION_TYPE_ICONS[section.type] || FileText
                const isActive = activeSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground-muted hover:bg-background-hover hover:text-foreground'
                    }`}
                  >
                    <SectionIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </button>
                )
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header Card */}
          <Card className="p-6 bg-background-surface border-border">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <Badge className="mb-2">{REPORT_TYPE_LABELS[report.type]}</Badge>
                <h1 className="text-2xl font-bold text-foreground mb-2">{report.title}</h1>
                {report.summary && (
                  <p className="text-foreground-muted mb-4">{report.summary}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-foreground-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(report.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>{report.sections.length} sections</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Sections */}
          {report.sections.map((section) => (
            <Card
              key={section.id}
              id={`section-${section.id}`}
              className="p-6 bg-background-surface border-border scroll-mt-6"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                {(() => {
                  const SIcon = SECTION_TYPE_ICONS[section.type] || FileText
                  return <SIcon className="w-5 h-5 text-primary" />
                })()}
                {section.title}
              </h2>
              {renderSectionContent(section)}

              {/* Subsections */}
              {section.subsections && section.subsections.length > 0 && (
                <div className="mt-6 space-y-4 pl-4 border-l-2 border-border">
                  {section.subsections.map((subsection) => (
                    <div key={subsection.id}>
                      <h3 className="text-base font-medium text-foreground mb-3">
                        {subsection.title}
                      </h3>
                      {renderSectionContent(subsection)}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {/* Metadata */}
          {report.metadata && Object.keys(report.metadata).length > 0 && (
            <Card className="p-6 bg-background-surface border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Report Metadata
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(report.metadata).map(([key, value]) => (
                  <div key={key} className="p-3 bg-background-elevated rounded-lg">
                    <div className="text-xs text-foreground-muted mb-1">{key}</div>
                    <div className="text-sm font-medium text-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

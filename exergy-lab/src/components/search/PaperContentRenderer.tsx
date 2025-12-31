'use client'

import * as React from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronRight, ImageOff, Table } from 'lucide-react'
import type { ContentSection, Figure, Table as TableType } from '@/lib/paper-content'

/**
 * PaperContentRenderer props
 */
interface PaperContentRendererProps {
  sections: ContentSection[]
  figures?: Figure[]
  tables?: TableType[]
}

/**
 * SectionRenderer component
 * Renders a single content section with proper heading levels
 */
function SectionRenderer({
  section,
  level = 1,
}: {
  section: ContentSection
  level?: 1 | 2 | 3
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  // Heading styles based on level
  const headingStyles = {
    1: 'text-lg font-semibold text-foreground mt-8 mb-4',
    2: 'text-base font-semibold text-foreground mt-6 mb-3',
    3: 'text-base font-medium text-foreground mt-4 mb-2',
  }

  const HeadingTag = `h${level + 1}` as 'h2' | 'h3' | 'h4'

  return (
    <section className="space-y-4">
      {/* Section Heading */}
      {section.heading && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center gap-2 w-full text-left ${headingStyles[level]}`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
          )}
          <HeadingTag className="flex-1">{section.heading}</HeadingTag>
        </button>
      )}

      {/* Section Content */}
      {!isCollapsed && (
        <div className="space-y-4 pl-6">
          {/* Main content paragraphs */}
          {section.content && (
            <div className="space-y-4">
              {section.content.split('\n\n').map((paragraph, idx) => (
                <p
                  key={idx}
                  className="text-base text-foreground leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* Subsections */}
          {section.subsections && section.subsections.length > 0 && (
            <div className="space-y-4 mt-4">
              {section.subsections.map((subsection, idx) => (
                <SectionRenderer
                  key={subsection.id || idx}
                  section={subsection}
                  level={Math.min(level + 1, 3) as 1 | 2 | 3}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * FigureRenderer component
 * Renders a figure with image and caption
 */
function FigureRenderer({ figure }: { figure: Figure }) {
  const [imageError, setImageError] = React.useState(false)

  return (
    <figure className="my-6 mx-auto max-w-2xl">
      <div className="bg-muted/10 rounded-lg overflow-hidden border border-border">
        {figure.url && !imageError ? (
          <div className="relative aspect-video bg-muted/5">
            <Image
              src={figure.url}
              alt={figure.caption || figure.label}
              fill
              className="object-contain"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-muted/10">
            <div className="text-center text-muted">
              <ImageOff className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Image not available</p>
            </div>
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-muted text-center">
        <span className="font-medium">{figure.label}:</span> {figure.caption}
      </figcaption>
    </figure>
  )
}

/**
 * TableRenderer component
 * Renders a table with caption
 */
function TableRenderer({ table }: { table: TableType }) {
  return (
    <figure className="my-6 overflow-x-auto">
      <div className="border border-border rounded-lg overflow-hidden">
        {table.html ? (
          <div
            className="p-4 prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: table.html }}
          />
        ) : table.data && table.data.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/10">
              <tr>
                {table.data[0].map((cell, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-2 text-left font-medium text-foreground border-b border-border"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.data.slice(1).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border last:border-0">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2 text-muted">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-muted">
            <Table className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">Table data not available</p>
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-muted text-center">
        <span className="font-medium">{table.label}:</span> {table.caption}
      </figcaption>
    </figure>
  )
}

/**
 * PaperContentRenderer
 * Renders full paper content with proper typography and spacing
 */
export function PaperContentRenderer({
  sections,
  figures,
  tables,
}: PaperContentRendererProps) {
  // Create a map of figures by ID for inline references
  const figureMap = React.useMemo(() => {
    const map = new Map<string, Figure>()
    figures?.forEach((fig) => {
      map.set(fig.id, fig)
    })
    return map
  }, [figures])

  // Create a map of tables by ID for inline references
  const tableMap = React.useMemo(() => {
    const map = new Map<string, TableType>()
    tables?.forEach((tbl) => {
      map.set(tbl.id, tbl)
    })
    return map
  }, [tables])

  if (!sections || sections.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Main Sections */}
      {sections.map((section, idx) => (
        <SectionRenderer
          key={section.id || idx}
          section={section}
          level={section.level}
        />
      ))}

      {/* Figures Section (if not embedded) */}
      {figures && figures.length > 0 && (
        <section className="mt-8 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Figures ({figures.length})
          </h2>
          <div className="space-y-8">
            {figures.map((figure) => (
              <FigureRenderer key={figure.id} figure={figure} />
            ))}
          </div>
        </section>
      )}

      {/* Tables Section (if not embedded) */}
      {tables && tables.length > 0 && (
        <section className="mt-8 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Tables ({tables.length})
          </h2>
          <div className="space-y-8">
            {tables.map((table) => (
              <TableRenderer key={table.id} table={table} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

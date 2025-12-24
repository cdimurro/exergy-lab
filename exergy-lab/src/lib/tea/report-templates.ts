/**
 * TEA Report Template Engine
 *
 * Provides customizable report templates for different audiences:
 * - Academic/Research Report (full methodology, peer-review ready)
 * - Executive Summary Report (high-level, investor-focused)
 * - Regulatory Compliance Report (emissions, environmental, permits)
 * - Technical Feasibility Report (engineering-focused, detailed specs)
 * - Government/DOE Standard Report (NETL-style, public disclosure)
 *
 * Each template defines which sections to include and customization options
 */

import type { TEAReportConfig } from '@/types/tea'

/**
 * Template presets
 */
export const REPORT_TEMPLATES: Record<string, TEAReportConfig> = {
  academic: {
    reportType: 'academic',
    title: 'Techno-Economic Analysis',
    date: new Date(),
    version: '1.0',
    confidential: false,

    sections: {
      coverPage: true,
      tableOfContents: true,
      listOfExhibits: true,
      acronymsAndAbbreviations: true,
      glossary: true,
      executiveSummary: true,
      introduction: true,
      methodology: true,
      processDescription: true,
      performanceAnalysis: true,
      economicAnalysis: true,
      marketAnalysis: true,
      resultsAndDiscussion: true,
      aiInsights: true,
      conclusions: true,
      limitations: true,
      references: true,
      appendices: true,
    },

    customization: {
      includeFormulas: true,
      includePFDs: true,
      includeStreamTables: true,
      includeMaterialBalances: true,
      includeEquipmentLists: true,
      includeSensitivityAnalysis: true,
      includeMonteCarloResults: true,
      includeValidationDetails: true,
      detailLevel: 'exhaustive',
    },

    visualizations: {
      chartStyle: 'academic',
      colorScheme: 'default',
      includeCharts: [
        'tornado',
        'cashFlow',
        'costBreakdown',
        'sensitivity',
        'monteCarlo',
        'waterfall',
        'pfd',
      ],
      chartResolution: 'publication',
    },

    branding: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#3b82f6',
        accent: '#10b981',
      },
    },
  },

  executive: {
    reportType: 'executive',
    title: 'Executive Summary - Investment Analysis',
    date: new Date(),
    version: '1.0',
    confidential: true,

    sections: {
      coverPage: true,
      tableOfContents: false,
      listOfExhibits: false,
      acronymsAndAbbreviations: false,
      glossary: false,
      executiveSummary: true,
      introduction: true,
      methodology: false,
      processDescription: false,
      performanceAnalysis: false,
      economicAnalysis: true,
      marketAnalysis: true,
      resultsAndDiscussion: true,
      aiInsights: true,
      conclusions: true,
      limitations: false,
      references: false,
      appendices: false,
    },

    customization: {
      includeFormulas: false,
      includePFDs: false,
      includeStreamTables: false,
      includeMaterialBalances: false,
      includeEquipmentLists: false,
      includeSensitivityAnalysis: true,
      includeMonteCarloResults: true,
      includeValidationDetails: false,
      detailLevel: 'minimal',
    },

    visualizations: {
      chartStyle: 'professional',
      colorScheme: 'default',
      includeCharts: ['costBreakdown', 'cashFlow', 'tornado'],
      chartResolution: 'screen',
    },

    branding: {
      colors: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#10b981',
      },
    },
  },

  government: {
    reportType: 'government',
    title: 'Basis for Techno-Economic Analysis',
    date: new Date(),
    version: '1.0',
    confidential: false,

    sections: {
      coverPage: true,
      tableOfContents: true,
      listOfExhibits: true,
      acronymsAndAbbreviations: true,
      glossary: true,
      executiveSummary: true,
      introduction: true,
      methodology: true,
      processDescription: true,
      performanceAnalysis: true,
      economicAnalysis: true,
      marketAnalysis: true,
      resultsAndDiscussion: true,
      aiInsights: false,
      conclusions: true,
      limitations: true,
      references: true,
      appendices: true,
    },

    customization: {
      includeFormulas: true,
      includePFDs: true,
      includeStreamTables: true,
      includeMaterialBalances: true,
      includeEquipmentLists: true,
      includeSensitivityAnalysis: true,
      includeMonteCarloResults: true,
      includeValidationDetails: false,
      detailLevel: 'comprehensive',
    },

    visualizations: {
      chartStyle: 'professional',
      colorScheme: 'colorblind-safe',
      includeCharts: ['all'],
      chartResolution: 'publication',
    },

    branding: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#0891b2',
      },
    },
  },

  regulatory: {
    reportType: 'regulatory',
    title: 'Environmental and Economic Compliance Report',
    date: new Date(),
    version: '1.0',
    confidential: false,

    sections: {
      coverPage: true,
      tableOfContents: true,
      listOfExhibits: true,
      acronymsAndAbbreviations: true,
      glossary: false,
      executiveSummary: true,
      introduction: true,
      methodology: true,
      processDescription: true,
      performanceAnalysis: true,
      economicAnalysis: true,
      marketAnalysis: false,
      resultsAndDiscussion: true,
      aiInsights: false,
      conclusions: true,
      limitations: true,
      references: true,
      appendices: true,
    },

    customization: {
      includeFormulas: true,
      includePFDs: true,
      includeStreamTables: true,
      includeMaterialBalances: true,
      includeEquipmentLists: true,
      includeSensitivityAnalysis: false,
      includeMonteCarloResults: false,
      includeValidationDetails: false,
      detailLevel: 'standard',
    },

    visualizations: {
      chartStyle: 'simple',
      colorScheme: 'colorblind-safe',
      includeCharts: ['pfd', 'emissions'],
      chartResolution: 'print',
    },

    branding: {
      colors: {
        primary: '#065f46',
        secondary: '#10b981',
        accent: '#34d399',
      },
    },
  },

  technical: {
    reportType: 'technical',
    title: 'Technical Feasibility Study',
    date: new Date(),
    version: '1.0',
    confidential: false,

    sections: {
      coverPage: true,
      tableOfContents: true,
      listOfExhibits: true,
      acronymsAndAbbreviations: true,
      glossary: true,
      executiveSummary: false,
      introduction: true,
      methodology: true,
      processDescription: true,
      performanceAnalysis: true,
      economicAnalysis: true,
      marketAnalysis: false,
      resultsAndDiscussion: true,
      aiInsights: false,
      conclusions: true,
      limitations: true,
      references: true,
      appendices: true,
    },

    customization: {
      includeFormulas: true,
      includePFDs: true,
      includeStreamTables: true,
      includeMaterialBalances: true,
      includeEquipmentLists: true,
      includeSensitivityAnalysis: true,
      includeMonteCarloResults: false,
      includeValidationDetails: true,
      detailLevel: 'comprehensive',
    },

    visualizations: {
      chartStyle: 'professional',
      colorScheme: 'default',
      includeCharts: ['pfd', 'processFlows', 'equipment'],
      chartResolution: 'print',
    },

    branding: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#475569',
        accent: '#0ea5e9',
      },
    },
  },
}

/**
 * Get template by name
 */
export function getReportTemplate(
  templateName: keyof typeof REPORT_TEMPLATES
): TEAReportConfig {
  return { ...REPORT_TEMPLATES[templateName] }
}

/**
 * Customize template
 */
export function customizeTemplate(
  baseTemplate: keyof typeof REPORT_TEMPLATES,
  customizations: Partial<TEAReportConfig>
): TEAReportConfig {
  const template = getReportTemplate(baseTemplate)
  const defaultColors = { primary: '#1e3a8a', secondary: '#3b82f6', accent: '#10b981' }

  return {
    ...template,
    ...customizations,
    sections: { ...template.sections, ...customizations.sections },
    customization: { ...template.customization, ...customizations.customization },
    visualizations: { ...template.visualizations, ...customizations.visualizations },
    branding: {
      ...template.branding,
      ...customizations.branding,
      colors: {
        ...defaultColors,
        ...template.branding?.colors,
        ...customizations.branding?.colors,
      },
    },
  }
}

/**
 * List available templates
 */
export function listAvailableTemplates(): Array<{
  name: string
  type: string
  description: string
  detailLevel: string
}> {
  return [
    {
      name: 'academic',
      type: 'Academic/Research',
      description: 'Full methodology, peer-review ready, extensive references',
      detailLevel: 'Exhaustive',
    },
    {
      name: 'executive',
      type: 'Executive Summary',
      description: 'High-level findings, investor-focused, minimal technical detail',
      detailLevel: 'Minimal',
    },
    {
      name: 'government',
      type: 'Government/DOE Standard',
      description: 'NETL-style formatting, public disclosure ready',
      detailLevel: 'Comprehensive',
    },
    {
      name: 'regulatory',
      type: 'Regulatory Compliance',
      description: 'Environmental focus, emissions, permit application support',
      detailLevel: 'Standard',
    },
    {
      name: 'technical',
      type: 'Technical Feasibility',
      description: 'Engineering-focused, detailed process specifications',
      detailLevel: 'Comprehensive',
    },
  ]
}

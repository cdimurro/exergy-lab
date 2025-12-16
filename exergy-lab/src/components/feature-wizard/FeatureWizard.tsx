'use client'

import * as React from 'react'
import { ChatInterface } from '@/components/chat'
import type { FeatureWizardProps, PageType, WizardPage } from '@/types/wizard'
import { buildPromptFromFormData } from '@/types/wizard'

// Import form components
import { DiscoveryForm } from './forms/DiscoveryForm'
import { SearchForm } from './forms/SearchForm'
import { ExperimentsForm } from './forms/ExperimentsForm'
import { SimulationsForm } from './forms/SimulationsForm'
import { TEAForm } from './forms/TEAForm'

interface FormDataState {
  domain: string | null
  description: string
  [key: string]: any
}

export function FeatureWizard({
  pageType,
  pageTitle,
  pageSubtitle,
  pageIcon,
  domains,
}: FeatureWizardProps) {
  const [currentPage, setCurrentPage] = React.useState<WizardPage>('form')
  const [formData, setFormData] = React.useState<FormDataState | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleFormSubmit = React.useCallback(
    async (data: FormDataState) => {
      setIsSubmitting(true)
      // Store form data and transition to chat
      setFormData(data)
      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300))
      setCurrentPage('chat')
      setIsSubmitting(false)
    },
    []
  )

  const handleBackToForm = React.useCallback(() => {
    setCurrentPage('form')
  }, [])

  // Build initial prompt from form data
  const initialPrompt = React.useMemo(() => {
    if (!formData) return undefined
    return buildPromptFromFormData(pageType, formData)
  }, [formData, pageType])

  // Render form page
  if (currentPage === 'form') {
    return (
      <div className="h-full flex flex-col">
        {renderForm(pageType, {
          pageTitle,
          pageSubtitle,
          pageIcon,
          domains,
          onSubmit: handleFormSubmit,
          isSubmitting,
          initialData: formData,
        })}
      </div>
    )
  }

  // Render chat page
  return (
    <div className="h-full flex flex-col">
      <ChatInterface
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        pageIcon={pageIcon}
        pageType={pageType}
        showDomainSelector={false}
        showFileUpload={pageType === 'tea'}
        domains={domains}
        initialFormData={formData || undefined}
        autoStart={!!initialPrompt}
        onBack={handleBackToForm}
      />
    </div>
  )
}

// Helper function to render the correct form based on page type
function renderForm(
  pageType: PageType,
  props: {
    pageTitle: string
    pageSubtitle: string
    pageIcon: React.ReactNode
    domains: any[]
    onSubmit: (data: any) => void
    isSubmitting: boolean
    initialData: any
  }
) {
  switch (pageType) {
    case 'discovery':
      return <DiscoveryForm {...props} />
    case 'search':
      return <SearchForm {...props} />
    case 'experiments':
      return <ExperimentsForm {...props} />
    case 'simulations':
      return <SimulationsForm {...props} />
    case 'tea':
      return <TEAForm {...props} />
    default:
      return <DiscoveryForm {...props} />
  }
}

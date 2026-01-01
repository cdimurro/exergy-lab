'use client'

import * as React from 'react'
import { Save, AlertCircle, CheckCircle2, Zap, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTEAFormState } from '@/hooks/useTEAFormState'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { useTechnologyDefaults } from '@/hooks/useTechnologyDefaults'
import { validateForm } from '@/lib/tea/validation-rules'
import { WorkflowLayout, GuidanceSidebar } from '@/components/shared/workflow'
import type { TEAInput_v2 } from '@/types/tea'

// Section imports
import { BasicInformationSection } from './sections/BasicInformationSection'
import { FileUploadSection } from './sections/FileUploadSection'
import { CapacityProductionSection } from './sections/CapacityProductionSection'
import { CapitalCostsSection } from './sections/CapitalCostsSection'
import { OperatingCostsSection } from './sections/OperatingCostsSection'
import { FinancialParametersSection } from './sections/FinancialParametersSection'
import { RevenueAssumptionsSection } from './sections/RevenueAssumptionsSection'

// Guidance sidebar content
const HOW_IT_WORKS = [
  { step: 1, title: 'Basic Information', description: 'Enter project name, select technology type, and describe your project.' },
  { step: 2, title: 'Technical Parameters', description: 'Provide capacity, production, and cost estimates for your system.' },
  { step: 3, title: 'Financial Details', description: 'Enter financial parameters like discount rate, debt ratio, and revenue assumptions.' },
]

const TIPS = [
  'Start with Quick Mode for faster analysis, switch to Expert Mode for detailed inputs',
  'Upload supporting documents (PDFs, spreadsheets) for AI-enhanced analysis',
  'Use "Load Defaults" to populate typical values for your technology type',
  'All inputs are auto-saved locally in case you need to return later',
]

export interface TEAInputFormProps {
  onSubmit: (input: TEAInput_v2) => void
  initialData?: Partial<TEAInput_v2>
  isPremium: boolean
  onLog?: (level: string, message: string, data?: any) => void
}

export function TEAInputForm({
  onSubmit,
  initialData,
  isPremium,
  onLog,
}: TEAInputFormProps) {
  const [formMode, setFormMode] = React.useState<'quick' | 'expert'>('quick')
  const [uploadedFiles, setUploadedFiles] = React.useState<any[]>([])
  const [extractedFileData, setExtractedFileData] = React.useState<any[]>([])
  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false)
  const [showDefaultsDialog, setShowDefaultsDialog] = React.useState(false)

  const {
    formData,
    errors,
    touched,
    isValid,
    isDirty,
    updateField,
    setError,
    touchField,
    validateAll,
    resetForm,
    loadDefaults: loadDefaultsToForm,
    setFormData,
  } = useTEAFormState(initialData)

  const { getDefaults, hasDefaults } = useTechnologyDefaults()

  const { isSaving, lastSaved, hasSavedData, restoreSaved, clearSaved } = useFormPersistence({
    key: 'tea-form-draft',
    data: formData,
    enabled: true,
  })

  // Check for saved data on mount
  React.useEffect(() => {
    const saved = restoreSaved()
    if (saved && !initialData) {
      setShowRestoreDialog(true)
    }
  }, [])

  // Handle restore saved data
  const handleRestoreSaved = () => {
    const saved = restoreSaved()
    if (saved) {
      setFormData(saved)
      onLog?.('info', 'Restored form data from previous session')
    }
    setShowRestoreDialog(false)
  }

  // Handle load defaults
  const handleLoadDefaults = () => {
    if (!formData.technology_type) return

    if (hasDefaults(formData.technology_type)) {
      const defaults = getDefaults(formData.technology_type)
      setShowDefaultsDialog(true)
      // Dialog will call loadDefaultsToForm when user confirms
    }
  }

  const confirmLoadDefaults = () => {
    if (formData.technology_type) {
      const defaults = getDefaults(formData.technology_type)
      loadDefaultsToForm(formData.technology_type, defaults)
      onLog?.('info', `Loaded defaults for ${formData.technology_type}`, defaults)
    }
    setShowDefaultsDialog(false)
  }

  // Handle files uploaded
  const handleFilesUploaded = (files: any[]) => {
    setUploadedFiles((prev) => [...prev, ...files])

    // Store extracted data from files
    const newExtractedData = files.map(f => f.data).filter(Boolean)
    setExtractedFileData((prev) => [...prev, ...newExtractedData])

    onLog?.('info', `Uploaded ${files.length} file(s)`, {
      files: files.map(f => f.file?.name),
      extractedDataCount: newExtractedData.length
    })
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onLog?.('info', 'Validating TEA form')

    // Validate all fields
    const validation = validateForm(formData)

    if (!validation.isValid) {
      onLog?.('error', 'Form validation failed', {
        errorCount: Object.keys(validation.errors).length,
        errors: validation.errors,
      })

      // Show error summary
      alert(
        `Please fix ${Object.keys(validation.errors).length} error(s) before submitting:\n\n` +
          Object.entries(validation.errors)
            .slice(0, 5)
            .map(([field, error]) => `• ${field}: ${error}`)
            .join('\n') +
          (Object.keys(validation.errors).length > 5
            ? `\n... and ${Object.keys(validation.errors).length - 5} more`
            : '')
      )
      return
    }

    // Show warnings if any
    if (Object.keys(validation.warnings).length > 0) {
      const proceed = confirm(
        `Form has ${Object.keys(validation.warnings).length} warning(s). Continue anyway?\n\n` +
          Object.entries(validation.warnings)
            .slice(0, 3)
            .map(([field, warning]) => `• ${warning}`)
            .join('\n')
      )

      if (!proceed) return
    }

    // Clear saved draft on successful submission
    clearSaved()

    // Include extracted file data with form submission
    const enrichedInput = {
      ...formData,
      _uploadedFileData: extractedFileData, // Pass to API for AI analysis
    }

    onLog?.('success', 'Form validated successfully', {
      formData,
      attachedFiles: uploadedFiles.length,
      extractedDataSources: extractedFileData.length
    })

    onSubmit(enrichedInput as TEAInput_v2)
  }

  // Calculate progress
  const calculateProgress = (): number => {
    const totalRequiredFields = formMode === 'quick' ? 15 : 30
    const filledRequiredFields = [
      formData.project_name,
      formData.technology_type,
      formData.project_description,
      formData.capacity_mw,
      formData.capacity_factor,
      formData.capex_per_kw,
      formData.installation_factor,
      formData.opex_per_kw_year,
      formData.variable_opex_per_mwh,
      formData.insurance_rate,
      formData.project_lifetime_years,
      formData.discount_rate,
      formData.debt_ratio,
      formData.interest_rate,
      formData.tax_rate,
      formData.depreciation_years,
      formData.electricity_price_per_mwh,
      formData.price_escalation_rate,
    ].filter((v) => v !== undefined && v !== '').length

    return (filledRequiredFields / totalRequiredFields) * 100
  }

  const progress = calculateProgress()

  // Sidebar content
  const sidebar = (
    <GuidanceSidebar
      howItWorks={HOW_IT_WORKS}
      tips={TIPS}
    />
  )

  return (
    <WorkflowLayout sidebar={sidebar}>
      {/* Restore Dialog */}
      {showRestoreDialog && (
        <Card className="p-4 bg-info/10 border-info/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">
                Restore Previous Session?
              </h4>
              <p className="text-sm text-muted mb-3">
                We found unsaved form data from a previous session. Would you like to restore it?
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRestoreSaved}>
                  Restore Data
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearSaved()
                    setShowRestoreDialog(false)
                  }}
                >
                  Start Fresh
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Defaults Dialog */}
      {showDefaultsDialog && formData.technology_type && (
        <Card className="p-4 bg-primary/10 border-primary/30">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">
                Load Default Values for {formData.technology_type}?
              </h4>
              <p className="text-sm text-muted mb-3">
                This will populate empty fields with typical values for this technology type.
                Your existing entries will not be overwritten.
              </p>
              <div className="text-xs text-muted mb-3 space-y-1">
                {formData.technology_type && hasDefaults(formData.technology_type) && (
                  <>
                    <div>✓ Equipment cost, O&M costs</div>
                    <div>✓ Capacity factor, lifetime</div>
                    <div>✓ Technology-specific parameters</div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmLoadDefaults}>
                  Load Defaults
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDefaultsDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Mode Toggle */}
      <div className="flex items-center gap-3 p-4 bg-elevated border border-border rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-base font-medium text-foreground">Form Mode:</span>
          <Button
            type="button"
            variant={formMode === 'quick' ? 'primary' : 'outline'}
            onClick={(e) => {
              e.preventDefault()
              setFormMode('quick')
            }}
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            Quick Mode
          </Button>
          <Button
            type="button"
            variant={formMode === 'expert' ? 'primary' : 'outline'}
            onClick={(e) => {
              e.preventDefault()
              setFormMode('expert')
            }}
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Expert Mode
          </Button>
          <Badge variant="secondary" className="ml-2 text-sm">
            {formMode === 'quick' ? '~15 essential fields' : '~50 comprehensive fields'}
          </Badge>
        </div>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-2 text-xs text-muted">
          {isSaving && (
            <>
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              Saving...
            </>
          )}
          {!isSaving && lastSaved && (
            <>
              <CheckCircle2 className="w-3 h-3 text-success" />
              Saved {Math.round((Date.now() - lastSaved.getTime()) / 1000 / 60)}m ago
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Form Progress</span>
          <span className="text-xs text-muted">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </Card>

      {/* Form Sections */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <BasicInformationSection
          formData={formData}
          onChange={updateField}
          errors={errors}
          onTouch={touchField}
          onLoadDefaults={handleLoadDefaults}
        />

        <FileUploadSection
          onFilesUploaded={handleFilesUploaded}
          uploadedCount={uploadedFiles.length}
        />

        <CapacityProductionSection
          formData={formData}
          onChange={updateField}
          errors={errors}
          warnings={{}}
          onTouch={touchField}
          formMode={formMode}
        />

        <CapitalCostsSection
          formData={formData}
          onChange={updateField}
          errors={errors}
          warnings={{}}
          onTouch={touchField}
          formMode={formMode}
        />

        <OperatingCostsSection
          formData={formData}
          onChange={updateField}
          errors={errors}
          warnings={{}}
          onTouch={touchField}
          formMode={formMode}
        />

        <FinancialParametersSection
          formData={formData}
          onChange={updateField}
          errors={errors}
          warnings={{}}
          onTouch={touchField}
          formMode={formMode}
        />

        <RevenueAssumptionsSection
          formData={formData}
          onChange={updateField}
          errors={errors}
          warnings={{}}
          onTouch={touchField}
          formMode={formMode}
        />

        {/* Submit Button */}
        <Card className="p-6 bg-elevated/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Ready to Analyze?</h4>
              <p className="text-sm text-muted">
                {progress < 100 ? (
                  <>
                    Complete all required fields ({Math.round(progress)}% done) to generate your TEA report
                  </>
                ) : (
                  <>
                    All required fields complete. Click Generate to run multi-agent validation and analysis.
                  </>
                )}
              </p>
              {Object.keys(errors).length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {Object.keys(errors).length} error(s) must be fixed
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={progress < 60 || Object.keys(errors).length > 0}
              className="ml-4"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Generate TEA Analysis
            </Button>
          </div>
        </Card>

        {/* Debug Info */}
        {onLog && formMode === 'expert' && (
          <Card className="p-4 bg-slate-900 border-slate-700">
            <details>
              <summary className="text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-300">
                Debug: Form State (Expert Mode)
              </summary>
              <pre className="mt-2 text-xs text-slate-400 overflow-auto max-h-60">
                {JSON.stringify(
                  {
                    formData,
                    errors,
                    progress: `${Math.round(progress)}%`,
                    mode: formMode,
                    uploadedFiles: uploadedFiles.length,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </Card>
        )}
      </form>
    </WorkflowLayout>
  )
}

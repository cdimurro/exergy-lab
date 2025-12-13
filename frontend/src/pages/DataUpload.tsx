import { useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Upload, FileSpreadsheet, Check, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedFile {
  name: string
  size: number
  type: string
  status: 'uploading' | 'success' | 'error' | 'validating'
  progress?: number
  preview?: { columns: string[]; rows: number }
  errors?: string[]
  warnings?: string[]
}

export function DataUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...uploadedFiles])

    // Simulate upload process
    uploadedFiles.forEach((file, index) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, progress } : f
          )
        )

        if (progress >= 100) {
          clearInterval(interval)
          // Simulate validation
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? {
                    ...f,
                    status: 'validating',
                    progress: 100,
                  }
                : f
            )
          )

          setTimeout(() => {
            setFiles((prev) =>
              prev.map((f) =>
                f.name === file.name
                  ? {
                      ...f,
                      status: 'success',
                      preview: {
                        columns: ['Year', 'CAPEX', 'OPEX', 'Production', 'Revenue'],
                        rows: 25,
                      },
                      warnings: index === 0 ? ['Column "OPEX" has 3 missing values'] : undefined,
                    }
                  : f
              )
            )
          }, 1500)
        }
      }, 100)
    })
  }

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      <Header
        title="Data Upload"
        subtitle="Upload CSV or Excel files for TEA analysis"
      />

      <div className="p-6 space-y-6">
        {/* Upload Zone */}
        <div
          className={cn(
            'card border-2 border-dashed transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-text-muted'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Drop files here or click to upload
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Supports CSV, XLS, and XLSX files up to 50MB
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".csv,.xls,.xlsx"
                multiple
                onChange={handleFileInput}
              />
              <span className="btn btn-primary">
                Select Files
              </span>
            </label>
          </div>
        </div>

        {/* Uploaded Files */}
        {files.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Uploaded Files
            </h3>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-start gap-4 p-4 rounded-lg bg-surface-elevated"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-accent-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {file.name}
                      </p>
                      {file.status === 'success' && (
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                      )}
                      {file.status === 'error' && (
                        <X className="w-4 h-4 text-error flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatFileSize(file.size)}
                      {file.preview && (
                        <span>
                          {' '}
                          • {file.preview.rows} rows • {file.preview.columns.length} columns
                        </span>
                      )}
                    </p>

                    {/* Progress Bar */}
                    {(file.status === 'uploading' || file.status === 'validating') && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-300',
                              file.status === 'validating'
                                ? 'bg-warning animate-pulse'
                                : 'bg-primary'
                            )}
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          {file.status === 'validating'
                            ? 'Validating data...'
                            : `Uploading... ${file.progress}%`}
                        </p>
                      </div>
                    )}

                    {/* Warnings */}
                    {file.warnings && file.warnings.length > 0 && (
                      <div className="mt-2 flex items-start gap-2 p-2 rounded bg-warning/10">
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-warning">
                          {file.warnings.map((w, i) => (
                            <p key={i}>{w}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Column Preview */}
                    {file.preview && file.status === 'success' && (
                      <div className="mt-3">
                        <p className="text-xs text-text-muted mb-1">Detected columns:</p>
                        <div className="flex flex-wrap gap-1">
                          {file.preview.columns.map((col) => (
                            <span
                              key={col}
                              className="px-2 py-0.5 text-xs rounded bg-surface text-text-secondary"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-1 rounded hover:bg-border transition-colors"
                  >
                    <X className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              ))}
            </div>

            {files.some((f) => f.status === 'success') && (
              <div className="mt-4 flex gap-3">
                <Button>Map Columns to TEA</Button>
                <Button variant="secondary">Preview Data</Button>
              </div>
            )}
          </div>
        )}

        {/* Data Format Guide */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Supported Data Formats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">
                Required Columns
              </h4>
              <ul className="space-y-1 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  Year or Time Period
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  Capital Expenditure (CAPEX)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  Operating Expenditure (OPEX)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-2">
                Optional Columns
              </h4>
              <ul className="space-y-1 text-sm text-text-secondary">
                <li>• Production / Output</li>
                <li>• Revenue</li>
                <li>• Capacity Factor</li>
                <li>• Electricity Price</li>
                <li>• Carbon Credits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

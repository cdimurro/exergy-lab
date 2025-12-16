'use client'

import * as React from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button, Progress } from '@/components/ui'
import { formatFileSize, getFileIcon, type SupportedFileType } from '@/lib/file-upload'

export interface UploadedFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  result?: any
}

export interface FileUploaderProps {
  onFilesUploaded: (results: any[]) => void
  maxFiles?: number
  maxFileSize?: number
  allowedTypes?: SupportedFileType[]
}

export function FileUploader({
  onFilesUploaded,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['pdf', 'xlsx', 'csv', 'docx', 'png', 'jpg', 'jpeg'],
}: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    handleFiles(files)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFiles = (files: File[]) => {
    // Validate number of files
    const totalFiles = uploadedFiles.length + files.length
    if (totalFiles > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Add files to state
    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      status: 'pending',
      progress: 0,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    // Start upload
    uploadFiles(newFiles)
  }

  const uploadFiles = async (files: UploadedFile[]) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f.file))

    // Update status to uploading
    setUploadedFiles((prev) =>
      prev.map((f) => (files.includes(f) ? { ...f, status: 'uploading', progress: 50 } : f))
    )

    try {
      const response = await fetch('/api/tea/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()

      // Update file statuses
      setUploadedFiles((prev) =>
        prev.map((f) => {
          const uploadResult = result.results?.find(
            (r: any) => r.file === f.file.name
          )

          if (uploadResult) {
            return {
              ...f,
              status: uploadResult.success ? 'success' : 'error',
              progress: 100,
              error: uploadResult.error,
              result: uploadResult.data,
            }
          }

          return f
        })
      )

      // Notify parent of successful uploads
      const successfulResults = result.results
        ?.filter((r: any) => r.success)
        .map((r: any) => r.data)

      if (successfulResults && successfulResults.length > 0) {
        onFilesUploaded(successfulResults)
      }
    } catch (error) {
      console.error('Upload error:', error)

      // Mark all uploading files as error
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      )
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background-surface hover:border-primary/50 hover:bg-background-surface/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.map((t) => `.${t}`).join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Upload className="w-8 h-8 text-primary" />
          </div>

          <div>
            <p className="text-base font-medium text-foreground mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-foreground-muted">
              Support for PDF, Excel, CSV, Word, and images
            </p>
          </div>

          <div className="text-xs text-foreground-muted space-y-1">
            <p>• Maximum {maxFiles} files</p>
            <p>• Maximum {formatFileSize(maxFileSize)} per file</p>
            <p>• Allowed types: {allowedTypes.join(', ').toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Uploaded Files ({uploadedFiles.length})
          </h4>

          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg bg-background-elevated border border-border"
            >
              {/* File Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background-surface shrink-0">
                <span className="text-2xl">
                  {getFileIcon(
                    uploadedFile.file.name.split('.').pop()?.toLowerCase() as SupportedFileType
                  )}
                </span>
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-foreground-muted">
                  {formatFileSize(uploadedFile.file.size)}
                </p>

                {/* Progress Bar */}
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-2">
                    <Progress value={uploadedFile.progress} size="sm" />
                  </div>
                )}

                {/* Error Message */}
                {uploadedFile.error && (
                  <p className="mt-1 text-xs text-red-500">{uploadedFile.error}</p>
                )}
              </div>

              {/* Status Icon */}
              <div className="shrink-0">
                {uploadedFile.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {uploadedFile.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {uploadedFile.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {uploadedFile.status === 'pending' && (
                  <FileText className="w-5 h-5 text-foreground-muted" />
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                disabled={uploadedFile.status === 'uploading'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

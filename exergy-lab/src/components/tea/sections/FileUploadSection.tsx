'use client'

import * as React from 'react'
import { Upload } from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FileUploader } from '../file-uploader'

export interface FileUploadSectionProps {
  onFilesUploaded: (files: any[]) => void
  uploadedCount: number
}

export function FileUploadSection({
  onFilesUploaded,
  uploadedCount,
}: FileUploadSectionProps) {
  return (
    <SectionCard
      title="Supporting Documents"
      icon={Upload}
      collapsible={true}
      defaultExpanded={true}
      filledFieldsCount={uploadedCount}
      requiredFieldsCount={0}
      description="Upload documents for AI analysis - reports, cost data, specifications (optional but recommended)"
    >
      <FileUploader
        onFilesUploaded={onFilesUploaded}
        maxFiles={5}
        maxFileSize={50 * 1024 * 1024}
      />
    </SectionCard>
  )
}

'use client'

import * as React from 'react'
import { Send, Loader2, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Badge, Textarea } from '@/components/ui'
import type { ChatInputProps } from '@/types/chat'
import type { Domain } from '@/types/discovery'

const DOMAIN_LABELS: Record<Domain, string> = {
  'solar-energy': 'Solar',
  'wind-energy': 'Wind',
  'battery-storage': 'Battery',
  'hydrogen-fuel': 'Hydrogen',
  'geothermal': 'Geothermal',
  'biomass': 'Biomass',
  'carbon-capture': 'Carbon Capture',
  'energy-efficiency': 'Efficiency',
  'grid-optimization': 'Grid',
  'materials-science': 'Materials',
  'other': 'Other',
}

export function ChatInput({
  onSubmit,
  disabled = false,
  isLoading = false,
  placeholder = 'Type your message...',
  showDomainSelector = false,
  domains = [],
  selectedDomains = [],
  onDomainToggle,
  showFileUpload = false,
  onFileUpload,
  quickActions = [],
}: ChatInputProps) {
  const [value, setValue] = React.useState('')
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!value.trim() || disabled || isLoading) return

    onSubmit(value.trim(), {
      domains: selectedDomains,
      files: uploadedFiles,
    })
    setValue('')
    setUploadedFiles([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files])
      onFileUpload?.(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  return (
    <div className="border-t border-border bg-background p-4">
      {/* Domain selector */}
      {showDomainSelector && domains.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {domains.map((domain) => {
            const isSelected = selectedDomains.includes(domain)
            return (
              <button
                key={domain}
                type="button"
                onClick={() => onDomainToggle?.(domain)}
                disabled={disabled}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-background-elevated text-muted-foreground border-border hover:border-foreground/30'
                )}
              >
                {DOMAIN_LABELS[domain]}
              </button>
            )
          })}
        </div>
      )}

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 px-3 py-1 text-xs bg-background-elevated border border-border rounded-full"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="hover:text-foreground text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        {/* File upload button */}
        {showFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xlsx,.csv,.json"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'min-h-[48px] max-h-[200px] resize-none pr-12',
              'bg-background-elevated border-border'
            )}
            rows={1}
          />
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={!value.trim() || disabled || isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                setValue(action.value)
                textareaRef.current?.focus()
              }}
              disabled={disabled}
              className="px-3 py-1 text-xs text-muted-foreground bg-background-elevated border border-border rounded-full hover:border-foreground/30 transition-colors"
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

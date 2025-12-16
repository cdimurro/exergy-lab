/**
 * File Upload Handler
 * Supports: PDF, XLSX, CSV, DOCX, images (PNG, JPG, JPEG)
 * Features: Validation, parsing, AI analysis integration
 */

// Type definitions
export type SupportedFileType = 'pdf' | 'xlsx' | 'csv' | 'docx' | 'png' | 'jpg' | 'jpeg'

export interface FileMetadata {
  name: string
  size: number
  type: string
  extension: SupportedFileType
  uploadedAt: string
}

export interface ExtractedData {
  text?: string
  tables?: Array<{
    headers: string[]
    rows: string[][]
  }>
  images?: string[] // base64 encoded
  metadata: FileMetadata
  structured?: Record<string, any> // For spreadsheet data
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  metadata?: FileMetadata
}

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES: Record<SupportedFileType, string[]> = {
  pdf: ['application/pdf'],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  csv: ['text/csv', 'text/plain'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  // Check file size minimum
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  // Extract extension
  const extension = file.name.split('.').pop()?.toLowerCase() as SupportedFileType
  if (!extension) {
    return {
      valid: false,
      error: 'Unable to determine file type',
    }
  }

  // Check if extension is supported
  if (!ALLOWED_TYPES[extension]) {
    return {
      valid: false,
      error: `File type .${extension} is not supported. Allowed types: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
    }
  }

  // Validate MIME type
  const allowedMimeTypes = ALLOWED_TYPES[extension]
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type for .${extension} file. Expected: ${allowedMimeTypes.join(' or ')}`,
    }
  }

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')

  return {
    valid: true,
    metadata: {
      name: sanitizedName,
      size: file.size,
      type: file.type,
      extension,
      uploadedAt: new Date().toISOString(),
    },
  }
}

/**
 * Convert File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert File to ArrayBuffer
 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Convert File to text
 */
export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Parse CSV file
 */
export async function parseCSV(file: File): Promise<ExtractedData> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const text = await fileToText(file)
  const lines = text.split('\n').filter((line) => line.trim())

  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse CSV (simple implementation, doesn't handle quoted commas)
  const rows = lines.map((line) => line.split(',').map((cell) => cell.trim()))
  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Convert to structured data
  const structured = dataRows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] || ''
    })
    return obj
  })

  return {
    text,
    tables: [{ headers, rows: dataRows }],
    metadata: validation.metadata!,
    structured,
  }
}

/**
 * Parse spreadsheet (XLSX) file
 * Note: This is a placeholder. In production, use the 'xlsx' library
 */
export async function parseSpreadsheet(file: File): Promise<ExtractedData> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // This would use the 'xlsx' library in production
  // For now, return a placeholder
  return {
    text: 'Spreadsheet parsing requires xlsx library',
    tables: [],
    metadata: validation.metadata!,
    structured: {},
  }
}

/**
 * Parse PDF file
 * Note: This is a placeholder. In production, use 'pdf-parse' library
 */
export async function parsePDF(file: File): Promise<ExtractedData> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // This would use pdf-parse library in production
  // For now, return file as base64 for AI processing
  const base64 = await fileToBase64(file)

  return {
    text: 'PDF parsing requires pdf-parse library or AI multimodal analysis',
    metadata: validation.metadata!,
    structured: { base64 },
  }
}

/**
 * Parse Word document (DOCX)
 * Note: This is a placeholder. In production, use 'mammoth' library
 */
export async function parseWord(file: File): Promise<ExtractedData> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // This would use mammoth library in production
  const arrayBuffer = await fileToArrayBuffer(file)

  return {
    text: 'Word document parsing requires mammoth library',
    metadata: validation.metadata!,
    structured: {},
  }
}

/**
 * Process image file
 */
export async function processImage(file: File): Promise<ExtractedData> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const base64 = await fileToBase64(file)

  return {
    text: 'Image analysis requires AI multimodal capabilities (Gemini Vision)',
    images: [base64],
    metadata: validation.metadata!,
    structured: { base64 },
  }
}

/**
 * Main file processing function
 * Routes to appropriate parser based on file type
 */
export async function processFile(file: File): Promise<ExtractedData> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const extension = validation.metadata!.extension

  switch (extension) {
    case 'csv':
      return parseCSV(file)

    case 'xlsx':
      return parseSpreadsheet(file)

    case 'pdf':
      return parsePDF(file)

    case 'docx':
      return parseWord(file)

    case 'png':
    case 'jpg':
    case 'jpeg':
      return processImage(file)

    default:
      throw new Error(`Unsupported file type: ${extension}`)
  }
}

/**
 * Process multiple files
 */
export async function processFiles(files: File[]): Promise<ExtractedData[]> {
  const results: ExtractedData[] = []

  for (const file of files) {
    try {
      const data = await processFile(file)
      results.push(data)
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      // Continue processing other files
      results.push({
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          extension: file.name.split('.').pop()?.toLowerCase() as SupportedFileType,
          uploadedAt: new Date().toISOString(),
        },
      })
    }
  }

  return results
}

/**
 * Extract TEA parameters from processed file data using AI
 * This is a helper that would call the AI model router
 */
export interface TEAParameters {
  capacity?: number
  capacityUnit?: string
  projectLifetime?: number
  discountRate?: number
  capitalCosts?: {
    equipment?: number
    installation?: number
    infrastructure?: number
    other?: number
  }
  operationalCosts?: {
    maintenance?: number
    labor?: number
    materials?: number
    utilities?: number
  }
  revenue?: {
    energyPrice?: number
    annualProduction?: number
  }
  [key: string]: any
}

export async function extractTEAParameters(data: ExtractedData): Promise<TEAParameters> {
  // This function would use the AI model router to analyze the extracted data
  // and identify TEA-relevant parameters
  // For now, return a placeholder
  return {
    capacity: undefined,
    capacityUnit: undefined,
    projectLifetime: 25,
    discountRate: 8,
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(extension: SupportedFileType): string {
  const icons: Record<SupportedFileType, string> = {
    pdf: '📄',
    xlsx: '📊',
    csv: '📈',
    docx: '📝',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
  }
  return icons[extension] || '📁'
}

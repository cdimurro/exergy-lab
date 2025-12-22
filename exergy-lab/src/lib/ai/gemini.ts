import { GoogleGenerativeAI, GenerativeModel, FunctionDeclaration as GeminiFunctionDeclaration, FunctionCallPart } from '@google/generative-ai'
import { FunctionDeclaration, FunctionCall, GenerateResult } from '@/types/agent'

// Initialize Gemini client
const apiKey = process.env.GOOGLE_AI_API_KEY || ''

// Log API key status (without exposing the key)
if (!apiKey) {
  console.error('[Gemini] WARNING: GOOGLE_AI_API_KEY is not set!')
} else {
  console.log('[Gemini] API key configured (length:', apiKey.length, ', starts with:', apiKey.substring(0, 10) + '...)')
}

const genAI = new GoogleGenerativeAI(apiKey)

// Model selection
export type GeminiModel = 'flash' | 'flash-lite' | 'pro'

const MODELS: Record<GeminiModel, string> = {
  'flash-lite': 'gemini-3-flash-preview', // Gemini 3 Flash - fast with Pro-grade reasoning
  flash: 'gemini-3-flash-preview', // Gemini 3 Flash - 3x faster than 2.5 Pro
  pro: 'gemini-3-flash-preview', // Use Flash for all models - most reliable
}

// Gemini 3 thinking levels for adaptive reasoning depth
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high'

export interface GeminiOptions {
  model?: GeminiModel
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  tools?: FunctionDeclaration[] // Function declarations for tool use
  responseMimeType?: string // For structured output (e.g., 'application/json')
  thinkingLevel?: ThinkingLevel // Gemini 3 adaptive thinking (minimal/low/medium/high)
}

// Default timeout for API calls (2 minutes)
const DEFAULT_API_TIMEOUT_MS = 120000

// Timeout based on thinking level (higher thinking = longer timeout)
const THINKING_LEVEL_TIMEOUTS: Record<ThinkingLevel, number> = {
  minimal: 60000,   // 1 minute
  low: 90000,       // 1.5 minutes
  medium: 120000,   // 2 minutes
  high: 180000,     // 3 minutes
}

/**
 * Helper to wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

/**
 * Generate text using Gemini
 */
export async function generateText(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const {
    model = 'flash',
    temperature = 1.0, // Gemini 3 recommended default
    maxOutputTokens = 2048,
    topP = 0.95,
    topK = 40,
    responseMimeType,
    thinkingLevel,
  } = options

  // Determine timeout based on thinking level
  const timeoutMs = thinkingLevel
    ? THINKING_LEVEL_TIMEOUTS[thinkingLevel]
    : DEFAULT_API_TIMEOUT_MS

  console.log(`[Gemini] === API Call ===`)
  console.log(`[Gemini] Model: ${MODELS[model]}`)
  console.log(`[Gemini] Config: temp=${temperature}, maxTokens=${maxOutputTokens}${thinkingLevel ? `, thinking=${thinkingLevel}` : ''}, timeout=${timeoutMs}ms`)
  console.log(`[Gemini] Prompt length: ${prompt.length} chars`)
  if (responseMimeType) {
    console.log(`[Gemini] Response MIME type: ${responseMimeType}`)
  }

  try {
    const generationConfig: any = {
      temperature,
      maxOutputTokens,
      topP,
      topK,
    }

    // Add responseMimeType if specified (for JSON output)
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType
    }

    // Add Gemini 3 thinking level for adaptive reasoning depth
    if (thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: thinkingLevel === 'high' ? 24576 : thinkingLevel === 'medium' ? 8192 : thinkingLevel === 'low' ? 2048 : 1024
      }
    }

    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig,
    })

    console.log(`[Gemini] Sending request to ${MODELS[model]}...`)
    const startTime = Date.now()

    // Wrap the API call with a timeout
    const result = await withTimeout(
      generativeModel.generateContent(prompt),
      timeoutMs,
      `Gemini ${model} generation`
    )

    const response = result.response
    const text = response.text()
    const duration = Date.now() - startTime

    console.log(`[Gemini] === Response Received ===`)
    console.log(`[Gemini] Duration: ${duration}ms`)
    console.log(`[Gemini] Response length: ${text.length} chars`)
    console.log(`[Gemini] Response preview (first 500 chars):`)
    console.log(text.substring(0, 500))
    if (text.length > 500) {
      console.log(`[Gemini] ... (${text.length - 500} more chars)`)
    }

    return text
  } catch (error: any) {
    console.error('[Gemini] === API ERROR ===')
    console.error('[Gemini] Error message:', error?.message || String(error))
    console.error('[Gemini] Error type:', error?.constructor?.name)
    if (error?.response) {
      console.error('[Gemini] Response status:', error.response?.status)
    }
    throw new Error(`Gemini generation failed: ${error?.message || error}`)
  }
}

/**
 * Generate text with streaming (for real-time responses)
 */
export async function* streamText(
  prompt: string,
  options: GeminiOptions = {}
): AsyncGenerator<string> {
  const {
    model = 'flash',
    temperature = 1.0, // Gemini 3 recommended default
    maxOutputTokens = 2048,
    topP = 0.95,
    topK = 40,
    thinkingLevel,
  } = options

  try {
    const generationConfig: any = {
      temperature,
      maxOutputTokens,
      topP,
      topK,
    }

    // Add Gemini 3 thinking level for adaptive reasoning depth
    if (thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: thinkingLevel === 'high' ? 24576 : thinkingLevel === 'medium' ? 8192 : thinkingLevel === 'low' ? 2048 : 1024
      }
    }

    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig,
    })

    const result = await generativeModel.generateContentStream(prompt)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      yield text
    }
  } catch (error) {
    console.error('Gemini streaming error:', error)
    throw new Error(`Gemini streaming failed: ${error}`)
  }
}

/**
 * Analyze an image using Gemini Vision
 */
export async function analyzeImage(
  imageData: string | Uint8Array,
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const {
    model = 'flash',
    temperature = 1.0, // Gemini 3 recommended default
    maxOutputTokens = 2048,
    thinkingLevel,
  } = options

  try {
    const generationConfig: any = {
      temperature,
      maxOutputTokens,
    }

    // Add Gemini 3 thinking level for adaptive reasoning depth
    if (thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: thinkingLevel === 'high' ? 24576 : thinkingLevel === 'medium' ? 8192 : thinkingLevel === 'low' ? 2048 : 1024
      }
    }

    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig,
    })

    // Convert image data to proper format
    const imagePart = typeof imageData === 'string'
      ? {
          inlineData: {
            data: imageData.split(',')[1] || imageData, // Remove data:image/... prefix if present
            mimeType: 'image/jpeg', // Default, adjust as needed
          },
        }
      : {
          inlineData: {
            data: Buffer.from(imageData).toString('base64'),
            mimeType: 'image/jpeg',
          },
        }

    const result = await generativeModel.generateContent([prompt, imagePart])
    const response = result.response
    return response.text()
  } catch (error) {
    console.error('Gemini vision error:', error)
    throw new Error(`Gemini vision analysis failed: ${error}`)
  }
}

/**
 * Chat interface for multi-turn conversations
 */
export async function createChat(options: GeminiOptions = {}) {
  const { model = 'flash', temperature = 1.0 } = options

  const generationConfig: any = {
    temperature,
  }

  const generativeModel: GenerativeModel = genAI.getGenerativeModel({
    model: MODELS[model],
    generationConfig,
  })

  const chat = generativeModel.startChat({
    history: [],
  })

  return {
    async sendMessage(message: string): Promise<string> {
      try {
        const result = await chat.sendMessage(message)
        return result.response.text()
      } catch (error) {
        console.error('Gemini chat error:', error)
        throw new Error(`Gemini chat failed: ${error}`)
      }
    },

    async *streamMessage(message: string): AsyncGenerator<string> {
      try {
        const result = await chat.sendMessageStream(message)
        for await (const chunk of result.stream) {
          yield chunk.text()
        }
      } catch (error) {
        console.error('Gemini chat streaming error:', error)
        throw new Error(`Gemini chat streaming failed: ${error}`)
      }
    },
  }
}

/**
 * Count tokens for a prompt (useful for staying within limits)
 */
export async function countTokens(
  text: string,
  model: GeminiModel = 'flash'
): Promise<number> {
  try {
    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
    })

    const result = await generativeModel.countTokens(text)
    return result.totalTokens
  } catch (error) {
    console.error('Token counting error:', error)
    // Return estimate if counting fails
    return Math.ceil(text.length / 4)
  }
}

// ============================================================================
// Function Calling Support
// ============================================================================

/**
 * Convert our FunctionDeclaration format to Gemini's format
 */
function convertToGeminiFunctionDeclaration(
  func: FunctionDeclaration
): GeminiFunctionDeclaration {
  return {
    name: func.name,
    description: func.description,
    // Cast parameters to any to handle type differences between our schema and Gemini's
    parameters: func.parameters as any,
  }
}

/**
 * Generate text with function calling support
 */
export async function generateWithTools(
  prompt: string,
  tools: FunctionDeclaration[],
  options: GeminiOptions = {}
): Promise<GenerateResult> {
  const {
    model = 'flash',
    temperature = 1.0, // Gemini 3 recommended default
    maxOutputTokens = 2048,
    topP = 0.95,
    topK = 40,
    responseMimeType,
    thinkingLevel,
  } = options

  // Determine timeout based on thinking level
  const timeoutMs = thinkingLevel
    ? THINKING_LEVEL_TIMEOUTS[thinkingLevel]
    : DEFAULT_API_TIMEOUT_MS

  try {
    // Build generation config with Gemini 3 thinking level
    const generationConfig: any = {
      temperature,
      maxOutputTokens,
      topP,
      topK,
      ...(responseMimeType && { responseMimeType }),
    }

    // Add Gemini 3 thinking level for adaptive reasoning depth
    if (thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: thinkingLevel === 'high' ? 24576 : thinkingLevel === 'medium' ? 8192 : thinkingLevel === 'low' ? 2048 : 1024
      }
    }

    // Build model configuration
    const modelConfig: any = {
      model: MODELS[model],
      generationConfig,
    }

    // Only add tools if we have valid function declarations
    // This prevents the "tool_type required" error when tools array is empty or malformed
    if (tools && tools.length > 0) {
      const geminiTools = tools.map(convertToGeminiFunctionDeclaration)
      // Ensure all tools have required fields
      const validTools = geminiTools.filter(t => t.name && t.description)
      if (validTools.length > 0) {
        modelConfig.tools = [{ functionDeclarations: validTools }]
      }
    }

    const generativeModel: GenerativeModel = genAI.getGenerativeModel(modelConfig)

    // Wrap the API call with a timeout
    const result = await withTimeout(
      generativeModel.generateContent(prompt),
      timeoutMs,
      `Gemini ${model} generation with tools`
    )
    const response = result.response

    // Check if AI decided to call functions
    const functionCalls = response.functionCalls()

    if (functionCalls && functionCalls.length > 0) {
      // AI wants to call functions - FunctionCallPart has functionCall.name and functionCall.args
      const calls: FunctionCall[] = (functionCalls as any[]).map((fc) => ({
        name: fc.functionCall?.name || fc.name,
        args: (fc.functionCall?.args || fc.args) as Record<string, any>,
      }))

      return {
        type: 'function_call',
        calls,
      }
    }

    // Regular text response
    return {
      type: 'text',
      content: response.text(),
    }
  } catch (error) {
    console.error('Gemini function calling error:', error)
    throw new Error(`Gemini generation with tools failed: ${error}`)
  }
}

/**
 * Continue conversation after function calls with results
 */
export async function continueWithFunctionResponse(
  prompt: string,
  tools: FunctionDeclaration[],
  previousCalls: FunctionCall[],
  functionResponses: Array<{ name: string; response: any }>,
  options: GeminiOptions = {}
): Promise<string> {
  const {
    model = 'flash',
    temperature = 1.0, // Gemini 3 recommended default
    maxOutputTokens = 2048,
    thinkingLevel,
  } = options

  try {
    // Build generation config with Gemini 3 thinking level
    const generationConfig: any = {
      temperature,
      maxOutputTokens,
    }

    // Add Gemini 3 thinking level for adaptive reasoning depth
    if (thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: thinkingLevel === 'high' ? 24576 : thinkingLevel === 'medium' ? 8192 : thinkingLevel === 'low' ? 2048 : 1024
      }
    }

    // Build model configuration
    const modelConfig: any = {
      model: MODELS[model],
      generationConfig,
    }

    // Only add tools if we have valid function declarations
    if (tools && tools.length > 0) {
      const geminiTools = tools.map(convertToGeminiFunctionDeclaration)
      const validTools = geminiTools.filter(t => t.name && t.description)
      if (validTools.length > 0) {
        modelConfig.tools = [{ functionDeclarations: validTools }]
      }
    }

    const generativeModel: GenerativeModel = genAI.getGenerativeModel(modelConfig)

    // Build the conversation history
    const history = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
      {
        role: 'model',
        parts: previousCalls.map((call) => ({
          functionCall: {
            name: call.name,
            args: call.args,
          },
        })),
      },
      {
        role: 'function',
        parts: functionResponses.map((fr) => ({
          functionResponse: {
            name: fr.name,
            response: fr.response,
          },
        })),
      },
    ]

    // Create chat with history
    const chat = generativeModel.startChat({
      history: history as any,
    })

    // Get final response
    const result = await chat.sendMessage('')
    return result.response.text()
  } catch (error) {
    console.error('Gemini function response continuation error:', error)
    throw new Error(`Failed to continue with function response: ${error}`)
  }
}

/**
 * Generate structured JSON output
 */
export async function generateStructuredOutput<T = any>(
  prompt: string,
  schema: string, // JSON schema description
  options: GeminiOptions = {}
): Promise<T> {
  const {
    model = 'flash',
    temperature = 0.3, // Keep lower temperature for structured JSON output
    maxOutputTokens = 2048,
    thinkingLevel,
  } = options

  try {
    const fullPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${schema}`

    const generationConfig: any = {
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
    }

    // Add Gemini 3 thinking level for adaptive reasoning depth
    if (thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: thinkingLevel === 'high' ? 24576 : thinkingLevel === 'medium' ? 8192 : thinkingLevel === 'low' ? 2048 : 1024
      }
    }

    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig,
    })

    const result = await generativeModel.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    // Parse JSON
    return JSON.parse(text) as T
  } catch (error) {
    console.error('Gemini structured output error:', error)
    throw new Error(`Structured output generation failed: ${error}`)
  }
}

/**
 * Helper to extract function calls from response (if any)
 */
export function extractFunctionCalls(response: any): FunctionCall[] | null {
  if (!response.functionCalls || response.functionCalls().length === 0) {
    return null
  }

  return (response.functionCalls() as any[]).map((fc) => ({
    name: fc.functionCall?.name || fc.name,
    args: (fc.functionCall?.args || fc.args) as Record<string, any>,
  }))
}

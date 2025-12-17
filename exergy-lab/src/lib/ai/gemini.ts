import { GoogleGenerativeAI, GenerativeModel, FunctionDeclaration as GeminiFunctionDeclaration, FunctionCallPart } from '@google/generative-ai'
import { FunctionDeclaration, FunctionCall, GenerateResult } from '@/types/agent'

// Initialize Gemini client
const apiKey = process.env.GOOGLE_AI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

// Model selection
export type GeminiModel = 'flash' | 'flash-lite' | 'pro'

const MODELS: Record<GeminiModel, string> = {
  'flash-lite': 'gemini-2.0-flash-lite', // Fastest, for dev/testing
  flash: 'gemini-2.0-flash', // Fast, good for most tasks
  pro: 'gemini-1.5-pro', // Slower, better quality
}

export interface GeminiOptions {
  model?: GeminiModel
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  tools?: FunctionDeclaration[] // Function declarations for tool use
  responseMimeType?: string // For structured output (e.g., 'application/json')
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
    temperature = 0.7,
    maxOutputTokens = 2048,
    topP = 0.95,
    topK = 40,
    responseMimeType,
  } = options

  console.log(`[Gemini] === API Call ===`)
  console.log(`[Gemini] Model: ${MODELS[model]}`)
  console.log(`[Gemini] Config: temp=${temperature}, maxTokens=${maxOutputTokens}`)
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

    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig,
    })

    console.log(`[Gemini] Sending request to ${MODELS[model]}...`)
    const result = await generativeModel.generateContent(prompt)
    const response = result.response
    const text = response.text()

    console.log(`[Gemini] === Response Received ===`)
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
    temperature = 0.7,
    maxOutputTokens = 2048,
    topP = 0.95,
    topK = 40,
  } = options

  try {
    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig: {
        temperature,
        maxOutputTokens,
        topP,
        topK,
      },
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
    temperature = 0.7,
    maxOutputTokens = 2048,
  } = options

  try {
    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
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
  const { model = 'flash', temperature = 0.7 } = options

  const generativeModel: GenerativeModel = genAI.getGenerativeModel({
    model: MODELS[model],
    generationConfig: {
      temperature,
    },
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
    temperature = 0.7,
    maxOutputTokens = 2048,
    topP = 0.95,
    topK = 40,
    responseMimeType,
  } = options

  try {
    // Build model configuration
    const modelConfig: any = {
      model: MODELS[model],
      generationConfig: {
        temperature,
        maxOutputTokens,
        topP,
        topK,
        ...(responseMimeType && { responseMimeType }),
      },
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

    const result = await generativeModel.generateContent(prompt)
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
    temperature = 0.7,
    maxOutputTokens = 2048,
  } = options

  try {
    // Build model configuration
    const modelConfig: any = {
      model: MODELS[model],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
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
    temperature = 0.3, // Lower temperature for structured output
    maxOutputTokens = 2048,
  } = options

  try {
    const fullPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${schema}`

    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: MODELS[model],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
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

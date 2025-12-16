import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// Initialize Gemini client
const apiKey = process.env.GOOGLE_AI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

// Model selection
export type GeminiModel = 'flash' | 'pro'

const MODELS: Record<GeminiModel, string> = {
  flash: 'gemini-1.5-flash', // Fast, good for most tasks
  pro: 'gemini-1.5-pro', // Slower, better quality
}

export interface GeminiOptions {
  model?: GeminiModel
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
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

    const result = await generativeModel.generateContent(prompt)
    const response = result.response
    return response.text()
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error(`Gemini generation failed: ${error}`)
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

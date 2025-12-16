import OpenAI from 'openai'

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY || ''
const openai = new OpenAI({ apiKey })

export type OpenAIModel = 'gpt-3.5-turbo' | 'gpt-4'

export interface OpenAIOptions {
  model?: OpenAIModel
  temperature?: number
  maxTokens?: number
  topP?: number
}

/**
 * Generate text using OpenAI
 */
export async function generateText(
  prompt: string,
  options: OpenAIOptions = {}
): Promise<string> {
  const {
    model = 'gpt-3.5-turbo',
    temperature = 0.7,
    maxTokens = 2048,
    topP = 1,
  } = options

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI generation failed: ${error}`)
  }
}

/**
 * Generate text with streaming
 */
export async function* streamText(
  prompt: string,
  options: OpenAIOptions = {}
): AsyncGenerator<string> {
  const {
    model = 'gpt-3.5-turbo',
    temperature = 0.7,
    maxTokens = 2048,
    topP = 1,
  } = options

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    console.error('OpenAI streaming error:', error)
    throw new Error(`OpenAI streaming failed: ${error}`)
  }
}

/**
 * Create a chat session
 */
export async function createChat(options: OpenAIOptions = {}) {
  const { model = 'gpt-3.5-turbo', temperature = 0.7 } = options

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

  return {
    async sendMessage(message: string): Promise<string> {
      try {
        messages.push({ role: 'user', content: message })

        const completion = await openai.chat.completions.create({
          model,
          messages,
          temperature,
        })

        const response = completion.choices[0]?.message?.content || ''
        messages.push({ role: 'assistant', content: response })

        return response
      } catch (error) {
        console.error('OpenAI chat error:', error)
        throw new Error(`OpenAI chat failed: ${error}`)
      }
    },

    async *streamMessage(message: string): AsyncGenerator<string> {
      try {
        messages.push({ role: 'user', content: message })

        const stream = await openai.chat.completions.create({
          model,
          messages,
          temperature,
          stream: true,
        })

        let fullResponse = ''
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            fullResponse += content
            yield content
          }
        }

        messages.push({ role: 'assistant', content: fullResponse })
      } catch (error) {
        console.error('OpenAI chat streaming error:', error)
        throw new Error(`OpenAI chat streaming failed: ${error}`)
      }
    },

    getMessages() {
      return messages
    },

    clearHistory() {
      messages.length = 0
    },
  }
}

/**
 * Generate embeddings for semantic search
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    })

    return response.data.map((item) => item.embedding)
  } catch (error) {
    console.error('OpenAI embeddings error:', error)
    throw new Error(`OpenAI embeddings failed: ${error}`)
  }
}

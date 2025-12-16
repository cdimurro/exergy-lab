import { HfInference } from '@huggingface/inference'

// Initialize HuggingFace client
const apiKey = process.env.HUGGINGFACE_API_KEY || ''
const hf = new HfInference(apiKey)

/**
 * Summarize text using BART
 */
export async function summarizeText(
  text: string,
  options: {
    maxLength?: number
    minLength?: number
  } = {}
): Promise<string> {
  const { maxLength = 150, minLength = 50 } = options

  try {
    const result = await hf.summarization({
      model: 'facebook/bart-large-cnn',
      inputs: text,
      parameters: {
        max_length: maxLength,
        min_length: minLength,
      },
    })

    return result.summary_text
  } catch (error) {
    console.error('HuggingFace summarization error:', error)
    throw new Error(`Summarization failed: ${error}`)
  }
}

/**
 * Generate embeddings for semantic search
 */
export async function generateEmbeddings(
  text: string | string[]
): Promise<number[] | number[][]> {
  try {
    const inputs = Array.isArray(text) ? text : [text]

    const results = await Promise.all(
      inputs.map(async (input) => {
        const output = await hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: input,
        })
        return output as number[]
      })
    )

    // Return single array if single input, array of arrays if multiple
    return Array.isArray(text) ? results : results[0]
  } catch (error) {
    console.error('HuggingFace embeddings error:', error)
    throw new Error(`Embeddings generation failed: ${error}`)
  }
}

/**
 * Text classification
 */
export async function classifyText(
  text: string
): Promise<Array<{ label: string; score: number }>> {
  try {
    const result = await hf.textClassification({
      model: 'distilbert-base-uncased-finetuned-sst-2-english',
      inputs: text,
    })

    return result
  } catch (error) {
    console.error('HuggingFace classification error:', error)
    throw new Error(`Text classification failed: ${error}`)
  }
}

/**
 * Question answering
 */
export async function answerQuestion(
  question: string,
  context: string
): Promise<string> {
  try {
    const result = await hf.questionAnswering({
      model: 'deepset/roberta-base-squad2',
      inputs: {
        question,
        context,
      },
    })

    return result.answer
  } catch (error) {
    console.error('HuggingFace QA error:', error)
    throw new Error(`Question answering failed: ${error}`)
  }
}

/**
 * Zero-shot classification
 * Useful for categorizing content without training
 */
export async function zeroShotClassify(
  text: string,
  labels: string[]
): Promise<Array<{ label: string; score: number }>> {
  try {
    const result = (await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: text,
      parameters: { candidate_labels: labels },
    })) as unknown as { labels: string[]; scores: number[] }

    return result.labels.map((label, i) => ({
      label,
      score: result.scores[i],
    }))
  } catch (error) {
    console.error('HuggingFace zero-shot error:', error)
    throw new Error(`Zero-shot classification failed: ${error}`)
  }
}

/**
 * Calculate similarity between two texts using embeddings
 */
export async function calculateSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  try {
    const embeddings = await generateEmbeddings([text1, text2])

    if (!Array.isArray(embeddings[0])) {
      throw new Error('Invalid embeddings format')
    }

    const [emb1, emb2] = embeddings as number[][]

    // Cosine similarity
    const dotProduct = emb1.reduce((sum, val, i) => sum + val * emb2[i], 0)
    const magnitude1 = Math.sqrt(emb1.reduce((sum, val) => sum + val * val, 0))
    const magnitude2 = Math.sqrt(emb2.reduce((sum, val) => sum + val * val, 0))

    return dotProduct / (magnitude1 * magnitude2)
  } catch (error) {
    console.error('Similarity calculation error:', error)
    throw new Error(`Similarity calculation failed: ${error}`)
  }
}

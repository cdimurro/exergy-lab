import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ============================================================================
// Types
// ============================================================================

interface PaperInput {
  id: string
  title: string
  authors: string[]
  abstract?: string
  year?: number
  citationCount?: number
}

interface SynthesizeRequest {
  query: string
  results: PaperInput[]
}

interface CitedPaper {
  id: string
  title: string
  authors: string[]
  year: number
  url?: string
  citationCount?: number
  relevanceScore?: number
}

interface KeyFinding {
  finding: string
  confidence: 'high' | 'medium' | 'low'
  paperIds: string[]
}

interface AISearchSummary {
  query: string
  summary: string
  keyFindings: KeyFinding[]
  citedPapers: CitedPaper[]
  methodology?: string
  limitations?: string
  suggestedFollowUp?: string[]
  generatedAt: string
}

// ============================================================================
// AI Synthesis
// ============================================================================

async function generateSynthesis(
  query: string,
  papers: PaperInput[]
): Promise<AISearchSummary> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Fallback to basic synthesis without AI
    return generateBasicSynthesis(query, papers)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Build context from papers
    const paperContext = papers.slice(0, 10).map((p, idx) =>
      `[${idx + 1}] "${p.title}" (${p.year || 'n.d.'}) by ${p.authors.slice(0, 2).join(', ')}${p.authors.length > 2 ? ' et al.' : ''}
Abstract: ${p.abstract?.slice(0, 500) || 'No abstract available'}
Citations: ${p.citationCount || 0}`
    ).join('\n\n')

    const prompt = `You are a scientific research assistant. Based on the following academic papers, provide a comprehensive answer to the user's query.

USER QUERY: "${query}"

RELEVANT PAPERS:
${paperContext}

Provide a response in the following JSON format (and ONLY JSON, no markdown):
{
  "summary": "A clear, informative 2-4 paragraph summary that directly answers the user's query. Use inline citations like [1], [2] to reference specific papers. Be specific about findings, numbers, and conclusions from the papers.",
  "keyFindings": [
    {
      "finding": "A specific key finding from the research",
      "confidence": "high|medium|low",
      "paperIds": ["paper_id_1"]
    }
  ],
  "suggestedFollowUp": ["Related question 1", "Related question 2", "Related question 3"]
}

Guidelines:
- Write the summary in a clear, accessible style suitable for researchers
- Include specific numbers, percentages, or metrics when available
- Use [1], [2], etc. to cite papers inline within the summary
- Extract 3-5 key findings with their supporting paper IDs
- Indicate confidence based on how strongly the finding is supported
- Suggest 3 follow-up questions the user might want to explore
- Focus on directly answering the user's query
- Be objective and note any conflicting findings`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Map paper IDs and build cited papers list
    const citedPapers: CitedPaper[] = papers.slice(0, 10).map((p, idx) => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      year: p.year || new Date().getFullYear(),
      citationCount: p.citationCount,
      relevanceScore: Math.max(0.5, 1 - idx * 0.05), // Simple relevance decay
    }))

    // Map key findings paper IDs
    const keyFindings: KeyFinding[] = (parsed.keyFindings || []).map((f: any) => ({
      finding: f.finding,
      confidence: f.confidence || 'medium',
      paperIds: (f.paperIds || []).map((id: string) => {
        // If ID is a number reference like "1", map to actual paper ID
        const numMatch = id.match(/^(\d+)$/)
        if (numMatch) {
          const idx = parseInt(numMatch[1]) - 1
          return papers[idx]?.id || id
        }
        return id
      }),
    }))

    return {
      query,
      summary: parsed.summary || 'Unable to generate summary.',
      keyFindings,
      citedPapers,
      suggestedFollowUp: parsed.suggestedFollowUp || [],
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('AI synthesis error:', error)
    // Fall back to basic synthesis
    return generateBasicSynthesis(query, papers)
  }
}

function generateBasicSynthesis(query: string, papers: PaperInput[]): AISearchSummary {
  // Generate a basic synthesis without AI
  const topPapers = papers.slice(0, 10)

  // Extract years for trend analysis
  const years = topPapers.map(p => p.year).filter(Boolean) as number[]
  const avgYear = years.length > 0 ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null

  // Extract citation counts
  const citations = topPapers.map(p => p.citationCount).filter(Boolean) as number[]
  const totalCitations = citations.reduce((a, b) => a + b, 0)

  // Build basic summary
  const summaryParts: string[] = []

  summaryParts.push(
    `Based on ${topPapers.length} relevant papers found for "${query}", here is an overview of the current research:`
  )

  if (topPapers[0]) {
    summaryParts.push(
      `The most relevant paper is "${topPapers[0].title}" [1], which ${topPapers[0].abstract?.slice(0, 200) || 'provides relevant insights on this topic'}...`
    )
  }

  if (topPapers.length >= 3) {
    summaryParts.push(
      `Other notable research includes work by ${topPapers[1]?.authors[0] || 'various researchers'} [2] and ${topPapers[2]?.authors[0] || 'others'} [3].`
    )
  }

  if (avgYear) {
    summaryParts.push(
      `The research spans from ${Math.min(...years)} to ${Math.max(...years)}, with an average publication year of ${avgYear}, indicating ${avgYear >= 2022 ? 'active recent research' : 'established research'} in this area.`
    )
  }

  if (totalCitations > 0) {
    summaryParts.push(
      `The top papers have accumulated ${totalCitations.toLocaleString()} total citations, demonstrating significant impact in the field.`
    )
  }

  // Build key findings from abstracts
  const keyFindings: KeyFinding[] = topPapers.slice(0, 4).map((p, idx) => ({
    finding: p.abstract
      ? p.abstract.split('. ').slice(0, 2).join('. ') + '.'
      : `Research by ${p.authors[0] || 'researchers'} on ${p.title.toLowerCase().slice(0, 50)}`,
    confidence: (idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    paperIds: [p.id],
  }))

  // Build cited papers
  const citedPapers: CitedPaper[] = topPapers.map((p, idx) => ({
    id: p.id,
    title: p.title,
    authors: p.authors,
    year: p.year || new Date().getFullYear(),
    citationCount: p.citationCount,
    relevanceScore: Math.max(0.5, 1 - idx * 0.05),
  }))

  // Generate follow-up questions
  const suggestedFollowUp = [
    `What are the latest advancements in ${query.split(' ').slice(0, 3).join(' ')}?`,
    `What are the challenges in ${query.split(' ').slice(0, 3).join(' ')}?`,
    `How does ${query.split(' ').slice(0, 2).join(' ')} compare to alternatives?`,
  ]

  return {
    query,
    summary: summaryParts.join(' '),
    keyFindings,
    citedPapers,
    suggestedFollowUp,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: SynthesizeRequest = await request.json()
    const { query, results } = body

    if (!query || !results || results.length === 0) {
      return NextResponse.json(
        { error: 'Query and results are required' },
        { status: 400 }
      )
    }

    const synthesis = await generateSynthesis(query, results)

    return NextResponse.json(synthesis)
  } catch (error) {
    console.error('Synthesis API error:', error)
    return NextResponse.json(
      { error: 'Failed to synthesize results' },
      { status: 500 }
    )
  }
}

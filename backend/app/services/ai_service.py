"""
Claude AI Service for generating insights and powering Discovery Engine.

Model Selection Strategy:
- Haiku: Fast validation, input parsing (low cost)
- Sonnet: TEA insights, exergy explanations, chat (balanced)
- Opus 4.5: Hypothesis generation, literature synthesis, discovery (best reasoning)
"""

from typing import AsyncGenerator, Literal
from anthropic import AsyncAnthropic

from app.core.config import settings

# Model identifiers
MODELS = {
    "haiku": "claude-3-5-haiku-20241022",
    "sonnet": "claude-sonnet-4-20250514",
    "opus": "claude-opus-4-5-20251101",
}

ModelType = Literal["haiku", "sonnet", "opus"]


class ClaudeAIService:
    """
    Service for interacting with Claude AI models.

    Provides methods for:
    - Generating TEA insights (Sonnet)
    - Explaining exergy analysis (Sonnet)
    - Generating hypotheses (Opus)
    - Synthesizing literature (Opus)
    - General chat with tools (Sonnet)
    """

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate(
        self,
        prompt: str,
        system: str | None = None,
        model: ModelType = "sonnet",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a response from Claude.

        Args:
            prompt: The user prompt
            system: Optional system prompt
            model: Which model to use (haiku, sonnet, opus)
            max_tokens: Maximum tokens in response
            temperature: Response randomness (0-1)

        Returns:
            The generated text response
        """
        messages = [{"role": "user", "content": prompt}]

        response = await self.client.messages.create(
            model=MODELS[model],
            max_tokens=max_tokens,
            system=system or "",
            messages=messages,
            temperature=temperature,
        )

        return response.content[0].text

    async def stream(
        self,
        prompt: str,
        system: str | None = None,
        model: ModelType = "sonnet",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a response from Claude.

        Args:
            prompt: The user prompt
            system: Optional system prompt
            model: Which model to use
            max_tokens: Maximum tokens in response
            temperature: Response randomness

        Yields:
            Text chunks as they are generated
        """
        messages = [{"role": "user", "content": prompt}]

        async with self.client.messages.stream(
            model=MODELS[model],
            max_tokens=max_tokens,
            system=system or "",
            messages=messages,
            temperature=temperature,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def generate_tea_insights(
        self,
        technology: str,
        tea_results: dict,
    ) -> str:
        """
        Generate AI insights for TEA analysis results.

        Uses Sonnet for balanced speed and quality.
        """
        system = """You are an expert energy economist specializing in techno-economic analysis (TEA)
of clean energy technologies. Provide clear, actionable insights based on the TEA results provided.
Focus on:
1. Key cost drivers and sensitivities
2. Comparison to industry benchmarks
3. Risk factors and mitigation strategies
4. Investment recommendations

Be concise but thorough. Use specific numbers from the data provided."""

        prompt = f"""Analyze these TEA results for {technology}:

**Results:**
- LCOE: ${tea_results.get('lcoe', 'N/A')}/MWh
- NPV: ${tea_results.get('npv', 'N/A'):,.0f}
- IRR: {tea_results.get('irr', 'N/A'):.1%}
- Payback Period: {tea_results.get('payback_years', 'N/A')} years
- Capacity Factor: {tea_results.get('capacity_factor', 'N/A'):.1%}

**Inputs:**
- CAPEX: ${tea_results.get('capex', 'N/A'):,.0f}/kW
- OPEX: ${tea_results.get('opex', 'N/A')}/kW/year
- Capacity: {tea_results.get('capacity_mw', 'N/A')} MW
- Project Life: {tea_results.get('project_life', 'N/A')} years
- Discount Rate: {tea_results.get('discount_rate', 'N/A'):.1%}

Provide 3-4 key insights and actionable recommendations."""

        return await self.generate(prompt, system=system, model="sonnet")

    async def explain_exergy_analysis(
        self,
        process_name: str,
        exergy_results: dict,
    ) -> str:
        """
        Generate plain-English explanations of exergy analysis results.

        Uses Sonnet for clear technical writing.
        """
        system = """You are a thermodynamics expert who excels at explaining complex concepts
in plain English. Explain exergy analysis results to engineers and investors who may not
have deep thermodynamics backgrounds. Be accurate but accessible."""

        prompt = f"""Explain these exergy analysis results for {process_name}:

**Results:**
- Exergy Efficiency: {exergy_results.get('exergy_efficiency', 'N/A'):.1%}
- Exergy Destruction: {exergy_results.get('exergy_destruction', 'N/A')} kW
- Exergy Input: {exergy_results.get('exergy_input', 'N/A')} kW
- Exergy Output: {exergy_results.get('exergy_output', 'N/A')} kW

**Carrier Breakdown:**
{exergy_results.get('carrier_breakdown', {})}

Explain:
1. What the exergy efficiency means in practical terms
2. Where the largest inefficiencies occur and why
3. How this compares to typical industry values
4. Specific improvements that could increase efficiency"""

        return await self.generate(prompt, system=system, model="sonnet")

    async def generate_hypotheses(
        self,
        problem_statement: str,
        constraints: dict | None = None,
        context: str | None = None,
        num_hypotheses: int = 50,
    ) -> str:
        """
        Generate research hypotheses for the Discovery Engine.

        Uses Opus 4.5 for deep reasoning and novel insights.
        """
        system = """You are a world-class research scientist with expertise across chemistry,
materials science, physics, and engineering. Your task is to generate novel, testable hypotheses
for clean energy breakthroughs.

For each hypothesis:
1. State it clearly and specifically
2. Explain the scientific rationale
3. Assess feasibility (1-10)
4. Assess novelty (1-10)
5. Assess potential impact (1-10)

Think deeply. Connect ideas across disciplines. Prioritize hypotheses that are:
- Scientifically grounded but innovative
- Testable with current technology
- Potentially high-impact if successful"""

        constraints_text = ""
        if constraints:
            constraints_text = f"\n**Constraints:**\n{constraints}"

        context_text = ""
        if context:
            context_text = f"\n**Additional Context:**\n{context}"

        prompt = f"""Generate {num_hypotheses} research hypotheses for this problem:

**Problem Statement:**
{problem_statement}
{constraints_text}
{context_text}

For each hypothesis, provide:
- Hypothesis statement
- Scientific rationale (2-3 sentences)
- Feasibility score (1-10)
- Novelty score (1-10)
- Impact score (1-10)

Format as JSON array for easy parsing."""

        return await self.generate(
            prompt,
            system=system,
            model="opus",
            max_tokens=8192,
            temperature=0.8,  # Higher temperature for creativity
        )

    async def synthesize_literature(
        self,
        papers: list[dict],
        focus_question: str,
    ) -> str:
        """
        Synthesize findings from multiple research papers.

        Uses Opus 4.5 for complex multi-document understanding.
        """
        system = """You are a senior research scientist writing a literature synthesis.
Analyze the provided papers and synthesize key findings related to the focus question.
Be thorough, cite specific papers, and identify:
1. Areas of consensus
2. Contradictory findings
3. Knowledge gaps
4. Emerging trends"""

        papers_text = "\n\n".join([
            f"**{p.get('title', 'Unknown')}** ({p.get('year', 'N/A')})\n"
            f"Authors: {p.get('authors', 'Unknown')}\n"
            f"Abstract: {p.get('abstract', 'N/A')}"
            for p in papers[:20]  # Limit to 20 papers
        ])

        prompt = f"""Synthesize these research papers in relation to:

**Focus Question:** {focus_question}

**Papers:**
{papers_text}

Provide:
1. Summary of key findings (with citations)
2. Areas of consensus
3. Contradictory findings and possible explanations
4. Knowledge gaps that need further research
5. Emerging trends and future directions"""

        return await self.generate(
            prompt,
            system=system,
            model="opus",
            max_tokens=4096,
        )

    async def validate_input(
        self,
        input_text: str,
        expected_format: str,
    ) -> dict:
        """
        Validate and parse user input.

        Uses Haiku for fast, low-cost validation.
        """
        system = """You are a data validation assistant. Parse and validate user input.
Return a JSON object with:
- valid: boolean
- parsed_data: the extracted data if valid
- errors: list of error messages if invalid"""

        prompt = f"""Validate this input:

**Expected Format:** {expected_format}

**Input:** {input_text}

Return JSON with valid, parsed_data, and errors fields."""

        response = await self.generate(
            prompt,
            system=system,
            model="haiku",
            max_tokens=1024,
            temperature=0.1,  # Low temperature for consistent parsing
        )

        # Parse JSON response
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"valid": False, "errors": ["Failed to parse validation response"]}


# Singleton instance
ai_service = ClaudeAIService()

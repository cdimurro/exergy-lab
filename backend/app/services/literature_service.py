"""
Literature Synthesis Service.

Provides AI-powered analysis of scientific literature for clean energy research.

Features:
- Literature search across Semantic Scholar and arXiv
- AI-powered synthesis of key findings
- Citation graph analysis
- Research gap identification
- White space opportunity detection
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

from app.services.dataset_hub import dataset_hub, Paper
from app.services.ai_service import ai_service


@dataclass
class CitationNode:
    """Node in citation graph."""

    paper_id: str
    title: str
    year: Optional[int]
    citation_count: int
    cited_by: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)


@dataclass
class ResearchGap:
    """Identified research gap or opportunity."""

    topic: str
    description: str
    evidence: List[str]  # Paper IDs supporting this gap
    opportunity_score: float  # 0-1 score
    suggested_approaches: List[str]


@dataclass
class LiteratureSynthesis:
    """Complete literature synthesis result."""

    query: str
    papers_analyzed: int
    key_findings: List[str]
    research_themes: Dict[str, List[str]]  # theme -> paper titles
    methodology_trends: List[str]
    research_gaps: List[ResearchGap]
    citation_leaders: List[Dict[str, Any]]
    synthesis_narrative: str
    generated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "papers_analyzed": self.papers_analyzed,
            "key_findings": self.key_findings,
            "research_themes": self.research_themes,
            "methodology_trends": self.methodology_trends,
            "research_gaps": [
                {
                    "topic": g.topic,
                    "description": g.description,
                    "evidence": g.evidence,
                    "opportunity_score": g.opportunity_score,
                    "suggested_approaches": g.suggested_approaches,
                }
                for g in self.research_gaps
            ],
            "citation_leaders": self.citation_leaders,
            "synthesis_narrative": self.synthesis_narrative,
            "generated_at": self.generated_at.isoformat(),
        }


class LiteratureService:
    """
    AI-powered literature synthesis for clean energy research.

    Uses:
    - Dataset Hub for paper search (Semantic Scholar + arXiv)
    - Claude AI for synthesis and analysis
    """

    def __init__(self):
        self.dataset_hub = dataset_hub
        self.ai = ai_service

    async def search_literature(
        self,
        query: str,
        limit: int = 50,
        year_range: Optional[tuple[int, int]] = None,
    ) -> List[Paper]:
        """
        Search for relevant literature across multiple sources.

        Args:
            query: Research topic or question
            limit: Maximum papers to retrieve
            year_range: Optional (start_year, end_year) filter
        """
        # Search Semantic Scholar
        papers = await self.dataset_hub.search_papers(
            query=query,
            limit=limit,
            year_range=year_range,
        )

        # Also search arXiv for preprints
        arxiv_papers = await self.dataset_hub.search_arxiv(
            query=query,
            limit=limit // 2,
        )

        # Combine and deduplicate (by title similarity)
        seen_titles = {p.title.lower() for p in papers}
        for arxiv_paper in arxiv_papers:
            if arxiv_paper.title.lower() not in seen_titles:
                papers.append(arxiv_paper)
                seen_titles.add(arxiv_paper.title.lower())

        # Sort by citation count (most cited first)
        papers.sort(key=lambda p: p.citation_count, reverse=True)

        return papers[:limit]

    async def synthesize_literature(
        self,
        query: str,
        papers: Optional[List[Paper]] = None,
        limit: int = 30,
    ) -> LiteratureSynthesis:
        """
        Generate comprehensive literature synthesis.

        Args:
            query: Research topic or question
            papers: Optional pre-fetched papers (will search if not provided)
            limit: Maximum papers to analyze
        """
        # Get papers if not provided
        if papers is None:
            papers = await self.search_literature(query, limit)

        if not papers:
            return LiteratureSynthesis(
                query=query,
                papers_analyzed=0,
                key_findings=["No papers found for this query."],
                research_themes={},
                methodology_trends=[],
                research_gaps=[],
                citation_leaders=[],
                synthesis_narrative="No literature found for synthesis.",
            )

        # Prepare paper summaries for AI analysis
        paper_summaries = self._prepare_paper_summaries(papers)

        # Generate synthesis using AI
        synthesis_prompt = f"""Analyze the following collection of {len(papers)} scientific papers on the topic: "{query}"

PAPERS:
{paper_summaries}

Provide a comprehensive literature synthesis including:

1. KEY FINDINGS (5-7 bullet points):
List the most important discoveries and conclusions across the papers.

2. RESEARCH THEMES:
Identify 3-5 major research themes and list which papers address each theme.

3. METHODOLOGY TRENDS:
Describe the main experimental and computational approaches being used.

4. RESEARCH GAPS:
Identify 2-4 areas that are underexplored or have conflicting results. For each gap:
- What is the gap?
- What evidence suggests this is a gap?
- What approaches might address it?

5. SYNTHESIS NARRATIVE:
Write a 2-3 paragraph narrative that synthesizes the state of research on this topic.
Include:
- What is well established
- What is still debated
- Where the field is heading
- What breakthrough would have the most impact

Format your response as structured sections with clear headings."""

        try:
            synthesis_text = await self.ai.generate(
                prompt=synthesis_prompt,
                model="sonnet",  # Sonnet for quality synthesis
                max_tokens=4000,
            )

            # Parse AI response into structured data
            synthesis = self._parse_synthesis_response(
                query=query,
                papers=papers,
                ai_response=synthesis_text,
            )

        except Exception as e:
            # Fallback to basic synthesis
            synthesis = self._generate_basic_synthesis(query, papers)

        return synthesis

    def _prepare_paper_summaries(self, papers: List[Paper]) -> str:
        """Prepare paper information for AI analysis."""
        summaries = []
        for i, paper in enumerate(papers, 1):
            authors_str = ", ".join(paper.authors[:3])
            if len(paper.authors) > 3:
                authors_str += " et al."

            abstract = paper.abstract[:500] if paper.abstract else "No abstract available"

            summaries.append(f"""
Paper {i}: {paper.title}
Authors: {authors_str}
Year: {paper.year or 'N/A'}
Citations: {paper.citation_count}
Abstract: {abstract}
""")

        return "\n---\n".join(summaries)

    def _parse_synthesis_response(
        self,
        query: str,
        papers: List[Paper],
        ai_response: str,
    ) -> LiteratureSynthesis:
        """Parse AI response into structured synthesis."""
        # Extract sections from AI response
        sections = self._extract_sections(ai_response)

        # Parse key findings
        key_findings = self._parse_bullet_list(
            sections.get("key_findings", sections.get("findings", ""))
        )

        # Parse research themes
        research_themes = self._parse_themes(sections.get("research_themes", ""), papers)

        # Parse methodology trends
        methodology_trends = self._parse_bullet_list(
            sections.get("methodology_trends", sections.get("methodology", ""))
        )

        # Parse research gaps
        research_gaps = self._parse_research_gaps(sections.get("research_gaps", ""))

        # Get synthesis narrative
        synthesis_narrative = sections.get(
            "synthesis_narrative",
            sections.get("synthesis", sections.get("narrative", ai_response[-1500:]))
        )

        # Identify citation leaders
        citation_leaders = [
            {
                "title": p.title,
                "authors": p.authors[:3],
                "year": p.year,
                "citations": p.citation_count,
                "paper_id": p.paper_id,
            }
            for p in sorted(papers, key=lambda x: x.citation_count, reverse=True)[:5]
        ]

        return LiteratureSynthesis(
            query=query,
            papers_analyzed=len(papers),
            key_findings=key_findings if key_findings else ["Analysis pending"],
            research_themes=research_themes,
            methodology_trends=methodology_trends,
            research_gaps=research_gaps,
            citation_leaders=citation_leaders,
            synthesis_narrative=synthesis_narrative,
        )

    def _extract_sections(self, text: str) -> Dict[str, str]:
        """Extract named sections from AI response."""
        sections = {}
        current_section = None
        current_content = []

        lines = text.split("\n")
        for line in lines:
            line_lower = line.lower().strip()

            # Check for section headers
            if "key finding" in line_lower or "finding" in line_lower and ":" in line_lower:
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = "key_findings"
                current_content = []
            elif "research theme" in line_lower or "theme" in line_lower and ":" in line_lower:
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = "research_themes"
                current_content = []
            elif "methodology" in line_lower:
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = "methodology_trends"
                current_content = []
            elif "research gap" in line_lower or "gap" in line_lower and ":" in line_lower:
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = "research_gaps"
                current_content = []
            elif "synthesis" in line_lower or "narrative" in line_lower:
                if current_section:
                    sections[current_section] = "\n".join(current_content)
                current_section = "synthesis_narrative"
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_section:
            sections[current_section] = "\n".join(current_content)

        return sections

    def _parse_bullet_list(self, text: str) -> List[str]:
        """Parse bullet points from text."""
        items = []
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith(("-", "*", "+")):
                items.append(line[1:].strip())
            elif line and line[0].isdigit() and "." in line[:3]:
                items.append(line.split(".", 1)[1].strip())
            elif line and len(line) > 20:  # Non-empty substantial line
                items.append(line)

        return items[:10]  # Limit to 10 items

    def _parse_themes(self, text: str, papers: List[Paper]) -> Dict[str, List[str]]:
        """Parse research themes and associated papers."""
        themes = {}
        current_theme = None

        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue

            # Check if this is a theme header
            if line.endswith(":") or (line[0].isdigit() and "." in line[:3]):
                theme_name = line.rstrip(":").strip()
                if theme_name[0].isdigit():
                    theme_name = theme_name.split(".", 1)[1].strip()
                current_theme = theme_name
                themes[current_theme] = []
            elif current_theme and line.startswith(("-", "*", "+")):
                themes[current_theme].append(line[1:].strip())

        # If no themes parsed, create default themes from papers
        if not themes:
            themes = self._generate_default_themes(papers)

        return themes

    def _generate_default_themes(self, papers: List[Paper]) -> Dict[str, List[str]]:
        """Generate default themes based on paper keywords."""
        themes = {"General Research": [p.title for p in papers[:5]]}
        return themes

    def _parse_research_gaps(self, text: str) -> List[ResearchGap]:
        """Parse research gaps from AI response."""
        gaps = []
        current_gap = None
        current_description = []

        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue

            # Check for new gap
            if line[0].isdigit() and "." in line[:3]:
                if current_gap:
                    gaps.append(ResearchGap(
                        topic=current_gap,
                        description=" ".join(current_description),
                        evidence=[],
                        opportunity_score=0.7,
                        suggested_approaches=[],
                    ))
                current_gap = line.split(".", 1)[1].strip()
                current_description = []
            elif current_gap:
                current_description.append(line)

        # Add last gap
        if current_gap:
            gaps.append(ResearchGap(
                topic=current_gap,
                description=" ".join(current_description),
                evidence=[],
                opportunity_score=0.7,
                suggested_approaches=[],
            ))

        return gaps

    def _generate_basic_synthesis(
        self,
        query: str,
        papers: List[Paper],
    ) -> LiteratureSynthesis:
        """Generate basic synthesis without AI."""
        # Extract years for trend analysis
        years = [p.year for p in papers if p.year]
        year_range = f"{min(years)}-{max(years)}" if years else "N/A"

        # Top cited papers
        top_cited = sorted(papers, key=lambda p: p.citation_count, reverse=True)[:5]

        key_findings = [
            f"Found {len(papers)} relevant papers on '{query}'",
            f"Research spans {year_range}",
            f"Most cited work: '{top_cited[0].title}' ({top_cited[0].citation_count} citations)" if top_cited else "",
        ]

        return LiteratureSynthesis(
            query=query,
            papers_analyzed=len(papers),
            key_findings=[f for f in key_findings if f],
            research_themes={"All Papers": [p.title for p in papers[:10]]},
            methodology_trends=["Various experimental and computational approaches"],
            research_gaps=[],
            citation_leaders=[
                {
                    "title": p.title,
                    "authors": p.authors[:3],
                    "year": p.year,
                    "citations": p.citation_count,
                }
                for p in top_cited
            ],
            synthesis_narrative=f"Analysis of {len(papers)} papers on {query}. The most influential work is '{top_cited[0].title if top_cited else 'N/A'}' with {top_cited[0].citation_count if top_cited else 0} citations.",
        )

    async def identify_white_space(
        self,
        research_area: str,
        existing_work: Optional[List[Paper]] = None,
    ) -> Dict[str, Any]:
        """
        Identify white space opportunities in a research area.

        White space = areas with unmet needs or limited competition.
        """
        # Get literature if not provided
        if existing_work is None:
            existing_work = await self.search_literature(research_area, limit=50)

        if not existing_work:
            return {
                "research_area": research_area,
                "white_spaces": [],
                "analysis": "Insufficient data for white space analysis",
            }

        # Prepare context for AI analysis
        paper_titles = [p.title for p in existing_work[:30]]

        white_space_prompt = f"""Analyze the following research area and published papers to identify WHITE SPACE opportunities.

RESEARCH AREA: {research_area}

EXISTING WORK (titles of {len(existing_work)} papers):
{chr(10).join(f"- {title}" for title in paper_titles)}

Identify 3-5 WHITE SPACE OPPORTUNITIES where:
1. There is clear market/research need
2. Limited or no existing solutions
3. Technical feasibility is reasonable
4. Clean energy impact would be significant

For each white space, provide:
- OPPORTUNITY: Brief description (1-2 sentences)
- GAP EVIDENCE: What's missing from current research
- POTENTIAL IMPACT: Why this matters for clean energy
- SUGGESTED APPROACH: How to address this gap
- CONFIDENCE: High/Medium/Low

Format as structured list."""

        try:
            analysis = await self.ai.generate(
                prompt=white_space_prompt,
                model="sonnet",
                max_tokens=2000,
            )

            return {
                "research_area": research_area,
                "papers_analyzed": len(existing_work),
                "white_spaces": self._parse_white_spaces(analysis),
                "analysis": analysis,
            }

        except Exception as e:
            return {
                "research_area": research_area,
                "papers_analyzed": len(existing_work),
                "white_spaces": [],
                "analysis": f"Analysis unavailable: {str(e)}",
            }

    def _parse_white_spaces(self, text: str) -> List[Dict[str, str]]:
        """Parse white space opportunities from AI response."""
        opportunities = []
        current = {}

        for line in text.split("\n"):
            line = line.strip()
            if not line:
                if current:
                    opportunities.append(current)
                    current = {}
                continue

            line_lower = line.lower()
            if "opportunity:" in line_lower:
                current["opportunity"] = line.split(":", 1)[1].strip()
            elif "gap evidence:" in line_lower or "evidence:" in line_lower:
                current["gap_evidence"] = line.split(":", 1)[1].strip()
            elif "impact:" in line_lower:
                current["potential_impact"] = line.split(":", 1)[1].strip()
            elif "approach:" in line_lower:
                current["suggested_approach"] = line.split(":", 1)[1].strip()
            elif "confidence:" in line_lower:
                current["confidence"] = line.split(":", 1)[1].strip()

        if current:
            opportunities.append(current)

        return opportunities

    async def get_citation_analysis(
        self,
        papers: List[Paper],
    ) -> Dict[str, Any]:
        """
        Analyze citation patterns and identify influential papers.
        """
        # Sort by citations
        sorted_by_citations = sorted(papers, key=lambda p: p.citation_count, reverse=True)

        # Calculate citation statistics
        citation_counts = [p.citation_count for p in papers]
        total_citations = sum(citation_counts)
        avg_citations = total_citations / len(papers) if papers else 0

        # Identify highly cited papers (>2x average)
        highly_cited = [p for p in papers if p.citation_count > 2 * avg_citations]

        # Year distribution
        year_distribution = {}
        for paper in papers:
            if paper.year:
                year_distribution[paper.year] = year_distribution.get(paper.year, 0) + 1

        return {
            "total_papers": len(papers),
            "total_citations": total_citations,
            "average_citations": round(avg_citations, 1),
            "highly_cited_papers": len(highly_cited),
            "top_papers": [
                {
                    "title": p.title,
                    "year": p.year,
                    "citations": p.citation_count,
                    "authors": p.authors[:3],
                }
                for p in sorted_by_citations[:10]
            ],
            "year_distribution": dict(sorted(year_distribution.items())),
            "research_momentum": "increasing" if year_distribution.get(2024, 0) > year_distribution.get(2022, 0) else "stable",
        }


# Singleton instance
literature_service = LiteratureService()

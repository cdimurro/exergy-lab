"""
Literature Agent - Core Agent for Scientific Literature Search

Searches academic databases (arXiv, PubMed) and synthesizes findings.
Used by all specialized workflows.
"""

import logging
from typing import List, Dict, Any, Optional

from crewai import Agent, Task
from langchain_anthropic import ChatAnthropic
from sqlalchemy.orm import Session

from src.tools.literature.arxiv_search import ArxivSearchTool
from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LiteratureAgent:
    """
    Agent for searching and analyzing scientific literature.

    Capabilities:
    - Search arXiv for relevant papers
    - Summarize key findings
    - Identify research gaps
    - Extract technical details
    """

    def __init__(
        self,
        llm: Optional[ChatAnthropic] = None,
        db: Optional[Session] = None,
        domain_focus: Optional[str] = None
    ):
        """
        Initialize Literature Agent.

        Args:
            llm: Language model for agent reasoning
            db: Database session for caching
            domain_focus: Optional domain specialization (e.g., "solar photovoltaics")
        """
        self.llm = llm or ChatAnthropic(
            model=settings.agent_model,
            temperature=settings.agent_temperature
        )
        self.db = db
        self.domain_focus = domain_focus or "clean energy technologies"

        # Initialize tools
        self.arxiv_tool = ArxivSearchTool(db=db)

        # Create CrewAI agent
        self.agent = self._create_agent()

    def _create_agent(self) -> Agent:
        """Create CrewAI agent instance."""
        return Agent(
            role="Scientific Literature Researcher",
            goal=f"Find and synthesize the most relevant research on {self.domain_focus}",
            backstory=f"""You are an expert researcher specializing in {self.domain_focus}.
            You have deep knowledge of scientific databases and can quickly identify
            the most relevant and impactful papers. You excel at synthesizing findings
            from multiple sources and identifying research gaps.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

    def search_literature(
        self,
        query: str,
        max_results: int = 10,
        focus_areas: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Search literature and provide structured summary.

        Args:
            query: Research question or topic
            max_results: Maximum papers to retrieve
            focus_areas: Optional list of specific focus areas

        Returns:
            Dictionary with papers and analysis
        """
        logger.info(f"Literature search for: {query}")

        # Search arXiv
        papers = self.arxiv_tool.search(query, max_results=max_results)

        if not papers:
            logger.warning(f"No papers found for query: {query}")
            return {
                "query": query,
                "papers_found": 0,
                "papers": [],
                "summary": "No relevant papers found.",
                "key_findings": [],
                "research_gaps": []
            }

        # Create analysis task
        task = Task(
            description=f"""Analyze the following {len(papers)} papers on '{query}':

Papers:
{self._format_papers_for_analysis(papers)}

Provide a comprehensive analysis including:
1. **Summary**: Brief overview of the current state of research
2. **Key Findings**: 5-7 most important discoveries or trends
3. **Research Gaps**: Areas that need more investigation
4. **Technical Details**: Important parameters, methods, or materials mentioned
5. **Recent Breakthroughs**: Any major advances in the last 2 years

Focus on: {focus_areas if focus_areas else 'general trends'}
""",
            agent=self.agent,
            expected_output="Comprehensive literature analysis with structured findings"
        )

        # Execute task
        try:
            analysis = task.execute()

            return {
                "query": query,
                "papers_found": len(papers),
                "papers": papers,
                "analysis": analysis,
                "focus_areas": focus_areas,
                "metadata": {
                    "agent": "Literature Agent",
                    "model": settings.agent_model,
                    "sources": ["arXiv"]
                }
            }

        except Exception as e:
            logger.error(f"Literature analysis failed: {str(e)}")
            return {
                "query": query,
                "papers_found": len(papers),
                "papers": papers,
                "analysis": f"Analysis failed: {str(e)}",
                "error": str(e)
            }

    def _format_papers_for_analysis(self, papers: List[Dict[str, Any]]) -> str:
        """Format papers for LLM analysis."""
        formatted = []

        for i, paper in enumerate(papers, 1):
            formatted.append(f"""
Paper {i}:
Title: {paper.get('title', 'Unknown')}
Authors: {', '.join(paper.get('authors', [])[:3])}
Published: {paper.get('published', 'Unknown')}
arXiv ID: {paper.get('arxiv_id', 'Unknown')}

Abstract:
{paper.get('summary', 'No abstract available')[:500]}...

Categories: {', '.join(paper.get('categories', [])[:3])}
---
""")

        return '\n'.join(formatted)

    def extract_technical_details(
        self,
        papers: List[Dict[str, Any]],
        detail_type: str
    ) -> List[str]:
        """
        Extract specific technical details from papers.

        Args:
            papers: List of paper dictionaries
            detail_type: Type of details to extract (e.g., "materials", "methods", "parameters")

        Returns:
            List of extracted details
        """
        task = Task(
            description=f"""Extract all {detail_type} mentioned in these papers:

{self._format_papers_for_analysis(papers)}

List each {detail_type} with:
- Name/description
- Context (which paper, what application)
- Key properties or values mentioned

Format as a bulleted list.""",
            agent=self.agent,
            expected_output=f"List of {detail_type} found in papers"
        )

        try:
            result = task.execute()
            return self._parse_extracted_details(result)

        except Exception as e:
            logger.error(f"Detail extraction failed: {str(e)}")
            return []

    def _parse_extracted_details(self, text: str) -> List[str]:
        """Parse extracted details into list."""
        # Simple parsing - split by bullet points or newlines
        lines = text.split('\n')
        details = []

        for line in lines:
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*')):
                details.append(line.lstrip('-•* '))
            elif line and len(line) > 10:  # Non-empty substantial lines
                details.append(line)

        return details


def create_literature_agent(
    llm: Optional[ChatAnthropic] = None,
    tools: Optional[List] = None,
    domain_focus: Optional[str] = None,
    db: Optional[Session] = None
) -> Agent:
    """
    Factory function to create a CrewAI Literature Agent.

    Args:
        llm: Language model
        tools: List of tools (arXiv, PubMed, etc.)
        domain_focus: Domain specialization
        db: Database session

    Returns:
        CrewAI Agent instance
    """
    if llm is None:
        llm = ChatAnthropic(
            model=settings.agent_model,
            temperature=settings.agent_temperature
        )

    domain = domain_focus or "clean energy technologies"

    agent = Agent(
        role="Scientific Literature Researcher",
        goal=f"Find and synthesize the most relevant research on {domain}",
        backstory=f"""You are an expert researcher specializing in {domain}.
        You have deep knowledge of scientific databases and can quickly identify
        the most relevant and impactful papers. You excel at synthesizing findings
        from multiple sources and identifying research gaps.

        You focus on:
        - Recent publications (last 2-3 years preferred)
        - High-impact findings
        - Practical applications
        - Technical details and parameters
        - Research trends and gaps""",
        verbose=True,
        allow_delegation=False,
        llm=llm,
        tools=tools or []
    )

    return agent

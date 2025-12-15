"""
Solar PV Specialized Workflow

End-to-end agent crew for perovskite and tandem solar cell research.
Coordinates Literature → Design → Simulation → Protocol → TEA pipeline.

This is the FULLY IMPLEMENTED workflow for the MVP.
"""

import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime

from crewai import Agent, Task, Crew, Process
from langchain_anthropic import ChatAnthropic
from sqlalchemy.orm import Session

from src.agents.core.literature_agent import create_literature_agent
from src.tools.literature.arxiv_search import ArxivSearchTool
from src.tools.simulations.bandgap_model import BandgapCalculator
from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SolarPVWorkflow:
    """
    Orchestrates the complete Solar PV research workflow.

    Workflow stages:
    1. Literature Review: Search arXiv for relevant papers
    2. Material Design: Propose perovskite compositions
    3. Simulations: Calculate bandgaps and efficiency limits
    4. Lab Protocols: Generate synthesis procedures (stub)
    5. TEA Report: Cost analysis (stub)

    All agents stream intermediate results for real-time user feedback.
    """

    def __init__(
        self,
        db: Optional[Session] = None,
        stream_callback: Optional[Callable] = None
    ):
        """
        Initialize Solar PV workflow.

        Args:
            db: Database session for caching
            stream_callback: Function to receive intermediate results
        """
        self.db = db
        self.stream_callback = stream_callback
        self.llm = ChatAnthropic(
            model=settings.agent_model,
            temperature=settings.agent_temperature
        )

        # Initialize tools
        self.arxiv_tool = ArxivSearchTool(db=db)
        self.bandgap_calc = BandgapCalculator()

        # Create agents
        self.agents = self._initialize_agents()

        logger.info("Solar PV workflow initialized")

    def _initialize_agents(self) -> Dict[str, Agent]:
        """Create all agents needed for Solar PV workflow."""
        return {
            "literature": create_literature_agent(
                llm=self.llm,
                domain_focus="solar photovoltaics, perovskite solar cells, tandem cells",
                db=self.db
            ),
            "design": self._create_design_agent(),
            "simulations": self._create_simulations_agent(),
            "protocols": self._create_protocols_agent(),
            "tea": self._create_tea_agent()
        }

    def _create_design_agent(self) -> Agent:
        """Create Material Design Agent."""
        return Agent(
            role="Materials Design Engineer",
            goal="Propose optimal perovskite compositions and device architectures",
            backstory="""You are an expert in perovskite solar cell design with deep knowledge
            of material science, crystal structures, and device physics. You can propose
            novel compositions, predict their properties, and recommend device architectures.
            You understand the trade-offs between efficiency, stability, and cost.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

    def _create_simulations_agent(self) -> Agent:
        """Create Simulations Agent."""
        return Agent(
            role="Computational Materials Scientist",
            goal="Perform bandgap calculations and efficiency modeling for proposed materials",
            backstory="""You are a computational scientist specializing in solar cell simulations.
            You can calculate bandgaps using empirical models, estimate theoretical efficiency
            limits, and predict device performance. You understand Shockley-Queisser theory
            and can assess material quality based on computational results.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

    def _create_protocols_agent(self) -> Agent:
        """Create Lab Protocol Agent (stub for MVP)."""
        return Agent(
            role="Experimental Chemist",
            goal="Generate detailed laboratory protocols for material synthesis and device fabrication",
            backstory="""You are an expert experimental chemist with extensive experience
            in perovskite synthesis and solar cell fabrication. You can write detailed
            step-by-step protocols with specific parameters, safety considerations,
            and troubleshooting tips.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

    def _create_tea_agent(self) -> Agent:
        """Create TEA Report Agent (stub for MVP)."""
        return Agent(
            role="Techno-Economic Analyst",
            goal="Perform cost analysis and evaluate commercial viability of proposed solar cells",
            backstory="""You are a techno-economic analyst specializing in renewable energy.
            You can estimate manufacturing costs, calculate levelized cost of electricity (LCOE),
            and assess market competitiveness. You understand exergy analysis and can evaluate
            overall system efficiency.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

    def run(
        self,
        query: str,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute complete Solar PV research workflow.

        Args:
            query: User's research question
            user_preferences: Optional configuration

        Returns:
            Comprehensive report with all workflow outputs
        """
        logger.info(f"Starting Solar PV workflow for query: {query[:100]}...")

        # Default preferences
        preferences = user_preferences or {}
        include_simulations = preferences.get("include_simulations", True)
        include_protocols = preferences.get("include_protocols", False)  # Stub
        include_tea = preferences.get("include_tea", False)  # Stub

        start_time = datetime.utcnow()

        if self.stream_callback:
            self.stream_callback({
                "event": "workflow_started",
                "data": {
                    "workflow_type": "solar_pv",
                    "timestamp": start_time.isoformat(),
                    "query": query
                }
            })

        try:
            # Task 1: Literature Review
            if self.stream_callback:
                self.stream_callback({
                    "event": "agent_progress",
                    "data": {
                        "stage": "literature_review",
                        "agent": "Literature Agent",
                        "status": "running"
                    }
                })

            literature_task = Task(
                description=f"""Search and analyze recent literature on Solar PV related to:
                "{query}"

                Focus on:
                - Perovskite solar cells (efficiency, stability, composition)
                - Tandem cell architectures (perovskite-silicon, all-perovskite)
                - Novel absorber materials
                - Device engineering and optimization

                Retrieve at least 10 relevant papers from arXiv.
                Summarize key findings, recent breakthroughs, and research gaps.
                Extract important material compositions and performance metrics.""",
                agent=self.agents["literature"],
                expected_output="Structured literature review with paper summaries and key insights"
            )

            # Execute literature review
            literature_result = literature_task.execute()

            if self.stream_callback:
                self.stream_callback({
                    "event": "partial_result",
                    "data": {
                        "stage": "literature_review",
                        "content": f"Found and analyzed literature on {query}",
                        "status": "completed"
                    }
                })

            # Task 2: Material Design
            if self.stream_callback:
                self.stream_callback({
                    "event": "agent_progress",
                    "data": {
                        "stage": "material_design",
                        "agent": "Design Agent",
                        "status": "running"
                    }
                })

            design_task = Task(
                description=f"""Based on the literature review, propose optimal perovskite compositions:

                Literature Insights:
                {literature_result[:1000]}...

                Propose:
                1. 3-5 candidate perovskite compositions (e.g., FA0.8Cs0.2PbI3)
                2. Device architecture recommendations (n-i-p vs p-i-n)
                3. Charge transport layer materials (ETL/HTL)
                4. Stability enhancement strategies

                Provide rationale for each design choice based on literature.""",
                agent=self.agents["design"],
                expected_output="List of material compositions with design rationale"
            )

            design_result = design_task.execute()

            if self.stream_callback:
                self.stream_callback({
                    "event": "partial_result",
                    "data": {
                        "stage": "material_design",
                        "content": "Proposed material compositions and device architecture",
                        "status": "completed"
                    }
                })

            # Task 3: Simulations (if requested)
            simulations_result = None
            if include_simulations:
                if self.stream_callback:
                    self.stream_callback({
                        "event": "agent_progress",
                        "data": {
                            "stage": "simulations",
                            "agent": "Simulations Agent",
                            "status": "running"
                        }
                    })

                # Extract compositions and calculate bandgaps
                bandgap_results = self._run_bandgap_calculations(design_result)

                simulation_task = Task(
                    description=f"""Analyze the proposed materials using computational results:

                    Proposed Materials:
                    {design_result[:800]}...

                    Bandgap Calculations:
                    {self._format_bandgap_results(bandgap_results)}

                    Provide:
                    1. Analysis of bandgap suitability for solar applications
                    2. Theoretical efficiency estimates (Shockley-Queisser limits)
                    3. Recommendations for single-junction vs tandem architectures
                    4. Performance predictions with uncertainty estimates""",
                    agent=self.agents["simulations"],
                    expected_output="Simulation results with efficiency predictions"
                )

                simulations_result = simulation_task.execute()
                simulations_result = f"{simulations_result}\n\nComputational Data:\n{self._format_bandgap_results(bandgap_results)}"

                if self.stream_callback:
                    self.stream_callback({
                        "event": "partial_result",
                        "data": {
                            "stage": "simulations",
                            "content": "Completed bandgap calculations and efficiency modeling",
                            "status": "completed"
                        }
                    })

            # Task 4: Lab Protocols (stub)
            protocols_result = None
            if include_protocols:
                protocols_result = "Lab protocols feature coming soon. Will include detailed synthesis and fabrication procedures."

            # Task 5: TEA Report (stub)
            tea_result = None
            if include_tea:
                tea_result = "Techno-economic analysis feature coming soon. Will include cost modeling and LCOE calculations."

            # Compile final results
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()

            result = {
                "query": query,
                "workflow": "solar_pv",
                "timestamp": end_time.isoformat(),
                "duration_seconds": duration,
                "results": {
                    "literature_review": literature_result,
                    "material_design": design_result,
                    "simulations": simulations_result,
                    "lab_protocols": protocols_result,
                    "tea_report": tea_result
                },
                "metadata": {
                    "agents_used": ["literature", "design", "simulations"],
                    "workflow_version": "1.0.0-mvp"
                }
            }

            if self.stream_callback:
                self.stream_callback({
                    "event": "workflow_completed",
                    "data": {
                        "timestamp": end_time.isoformat(),
                        "duration_seconds": duration,
                        "success": True
                    }
                })

            logger.info(f"Solar PV workflow completed in {duration:.2f}s")
            return result

        except Exception as e:
            logger.error(f"Solar PV workflow failed: {str(e)}", exc_info=True)

            if self.stream_callback:
                self.stream_callback({
                    "event": "workflow_failed",
                    "data": {
                        "timestamp": datetime.utcnow().isoformat(),
                        "error": str(e)
                    }
                })

            raise

    def _run_bandgap_calculations(self, design_result: str) -> list:
        """Extract compositions and calculate bandgaps."""
        # Simple regex to find perovskite formulas
        import re
        formulas = re.findall(r'[A-Z][a-z]?(?:\d*\.?\d*[A-Z][a-z]?)*Pb[IBC][a-z]?\d*', design_result)

        # Filter to likely perovskite compositions
        perovskite_formulas = []
        for formula in formulas:
            if 'Pb' in formula and any(x in formula for x in ['I', 'Br', 'Cl']):
                perovskite_formulas.append(formula)

        # Deduplicate
        perovskite_formulas = list(set(perovskite_formulas))[:5]  # Max 5

        # Calculate bandgaps
        results = []
        for formula in perovskite_formulas:
            try:
                result = self.bandgap_calc.calculate(formula)
                results.append(result)
            except Exception as e:
                logger.warning(f"Bandgap calculation failed for {formula}: {str(e)}")

        return results

    def _format_bandgap_results(self, results: list) -> str:
        """Format bandgap results for display."""
        if not results:
            return "No bandgap calculations performed."

        formatted = []
        for result in results:
            formatted.append(
                f"- {result.composition}: {result.bandgap_eV} eV "
                f"(± {result.uncertainty_eV} eV) [{result.method}]"
            )

        return "\n".join(formatted)


def create_solar_pv_workflow(
    db: Optional[Session] = None,
    stream_callback: Optional[Callable] = None
) -> SolarPVWorkflow:
    """Factory function to create Solar PV workflow instance."""
    return SolarPVWorkflow(db=db, stream_callback=stream_callback)

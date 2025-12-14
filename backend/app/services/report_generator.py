"""
PDF Report Generation Service

Generates professional PDF reports for:
- TEA Analysis
- Exergy Analysis
- Discovery Reports
"""

import io
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

# WeasyPrint requires system libraries (GTK+, Pango, etc.)
# Make it optional to not block server startup
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    HTML = None
    CSS = None
    WEASYPRINT_AVAILABLE = False
    import logging
    logging.warning(f"WeasyPrint not available: {e}. PDF generation will be disabled.")

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "reports"


class ReportGenerator:
    """
    Service for generating PDF reports using Jinja2 and WeasyPrint.
    """

    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=True,
        )
        # Add custom filters
        self.env.filters["currency"] = self._format_currency
        self.env.filters["percent"] = self._format_percent
        self.env.filters["number"] = self._format_number

    @staticmethod
    def _format_currency(value: float | None, decimals: int = 0) -> str:
        """Format value as currency."""
        if value is None:
            return "N/A"
        if decimals == 0:
            return f"${value:,.0f}"
        return f"${value:,.{decimals}f}"

    @staticmethod
    def _format_percent(value: float | None, decimals: int = 1) -> str:
        """Format value as percentage."""
        if value is None:
            return "N/A"
        return f"{value * 100:.{decimals}f}%"

    @staticmethod
    def _format_number(value: float | None, decimals: int = 2) -> str:
        """Format number with thousands separator."""
        if value is None:
            return "N/A"
        return f"{value:,.{decimals}f}"

    def _render_template(self, template_name: str, context: dict[str, Any]) -> str:
        """Render a Jinja2 template to HTML."""
        template = self.env.get_template(template_name)
        return template.render(**context)

    def _html_to_pdf(self, html_content: str) -> bytes:
        """Convert HTML to PDF using WeasyPrint."""
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError(
                "PDF generation is not available. WeasyPrint requires system libraries "
                "(GTK+, Pango, etc.) that are not installed. Please install them or use "
                "HTML export instead."
            )

        # Base CSS for all reports
        base_css = CSS(string="""
            @page {
                size: A4;
                margin: 2cm;
                @top-right {
                    content: "Clean Energy Intelligence Platform";
                    font-size: 9pt;
                    color: #666;
                }
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 9pt;
                    color: #666;
                }
            }
            body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                color: #333;
            }
            h1 { font-size: 24pt; color: #1a1a2e; margin-bottom: 0.5em; }
            h2 { font-size: 18pt; color: #16213e; margin-top: 1.5em; }
            h3 { font-size: 14pt; color: #0f3460; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 1em 0;
            }
            th, td {
                padding: 8px 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            th {
                background-color: #f5f5f5;
                font-weight: 600;
            }
            .metric-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1em;
                margin: 0.5em 0;
            }
            .metric-value {
                font-size: 24pt;
                font-weight: 700;
                color: #10b981;
            }
            .metric-label {
                font-size: 10pt;
                color: #666;
            }
            .insight-box {
                background: #e8f4f8;
                border-left: 4px solid #0ea5e9;
                padding: 1em;
                margin: 1em 0;
            }
            .warning-box {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 1em;
                margin: 1em 0;
            }
        """)

        html = HTML(string=html_content)
        pdf_buffer = io.BytesIO()
        html.write_pdf(pdf_buffer, stylesheets=[base_css])
        return pdf_buffer.getvalue()

    async def generate_tea_report(
        self,
        project_name: str,
        technology: str,
        tea_results: dict[str, Any],
        ai_insights: str | None = None,
        user_name: str | None = None,
    ) -> bytes:
        """
        Generate a professional TEA report PDF.

        Args:
            project_name: Name of the project
            technology: Technology type
            tea_results: TEA calculation results
            ai_insights: AI-generated insights (optional)
            user_name: Name of the user generating the report

        Returns:
            PDF bytes
        """
        context = {
            "project_name": project_name,
            "technology": technology,
            "tea_results": tea_results,
            "ai_insights": ai_insights,
            "user_name": user_name,
            "generated_at": datetime.utcnow().strftime("%B %d, %Y"),
            "platform_name": "Clean Energy Intelligence Platform",
        }

        html_content = self._render_template("tea_report.html", context)
        return self._html_to_pdf(html_content)

    async def generate_exergy_report(
        self,
        process_name: str,
        technology_type: str,
        exergy_results: dict[str, Any],
        ai_insights: str | None = None,
        user_name: str | None = None,
    ) -> bytes:
        """
        Generate a professional Exergy Analysis report PDF.

        Args:
            process_name: Name of the process analyzed
            technology_type: Type of technology
            exergy_results: Exergy analysis results
            ai_insights: AI-generated insights (optional)
            user_name: Name of the user generating the report

        Returns:
            PDF bytes
        """
        context = {
            "process_name": process_name,
            "technology_type": technology_type,
            "exergy_results": exergy_results,
            "ai_insights": ai_insights,
            "user_name": user_name,
            "generated_at": datetime.utcnow().strftime("%B %d, %Y"),
            "platform_name": "Clean Energy Intelligence Platform",
        }

        html_content = self._render_template("exergy_report.html", context)
        return self._html_to_pdf(html_content)

    async def generate_discovery_report(
        self,
        discovery_id: str,
        problem_title: str,
        problem_statement: str,
        discovery_status: str,
        hypotheses: list[dict[str, Any]],
        total_hypotheses: int,
        high_priority_count: int,
        papers_analyzed: int,
        patents_reviewed: int,
        executive_summary: str,
        top_recommendation: str | None = None,
        constraints: dict[str, Any] | None = None,
        scope_analysis: str | None = None,
        literature_synthesis: dict[str, Any] | None = None,
        patent_landscape: dict[str, Any] | None = None,
        materials_analysis: dict[str, Any] | None = None,
        tea_candidates: list[dict[str, Any]] | None = None,
        immediate_actions: list[str] | None = None,
        medium_term_actions: list[str] | None = None,
        long_term_vision: str | None = None,
        risk_factors: list[dict[str, Any]] | None = None,
        processing_time: str | None = None,
        user_name: str | None = None,
    ) -> bytes:
        """
        Generate a comprehensive Discovery report PDF.

        Args:
            discovery_id: Unique identifier for the discovery
            problem_title: Short title for the problem
            problem_statement: The research problem
            discovery_status: Current status (completed, in_progress, etc.)
            hypotheses: List of generated hypotheses (top ranked)
            total_hypotheses: Total number of hypotheses generated
            high_priority_count: Number of high-priority hypotheses
            papers_analyzed: Number of papers analyzed
            patents_reviewed: Number of patents reviewed
            executive_summary: Summary of findings
            top_recommendation: Primary recommendation
            constraints: Problem constraints
            scope_analysis: Analysis of the problem scope
            literature_synthesis: Literature review data
            patent_landscape: Patent analysis data
            materials_analysis: Materials search data
            tea_candidates: TEA analysis for candidates
            immediate_actions: Short-term next steps
            medium_term_actions: Medium-term actions
            long_term_vision: Long-term strategic vision
            risk_factors: Key risks and mitigations
            processing_time: Total processing time
            user_name: Name of the user

        Returns:
            PDF bytes
        """
        context = {
            "discovery_id": discovery_id,
            "problem_title": problem_title,
            "problem_statement": problem_statement,
            "discovery_status": discovery_status,
            "hypotheses": hypotheses[:20],  # Top 20 for the report
            "total_hypotheses": total_hypotheses,
            "high_priority_count": high_priority_count,
            "papers_analyzed": papers_analyzed,
            "patents_reviewed": patents_reviewed,
            "executive_summary": executive_summary,
            "top_recommendation": top_recommendation,
            "constraints": constraints,
            "scope_analysis": scope_analysis,
            "literature_synthesis": literature_synthesis,
            "patent_landscape": patent_landscape,
            "materials_analysis": materials_analysis,
            "tea_candidates": tea_candidates,
            "immediate_actions": immediate_actions,
            "medium_term_actions": medium_term_actions,
            "long_term_vision": long_term_vision,
            "risk_factors": risk_factors,
            "processing_time": processing_time or "N/A",
            "user_name": user_name,
            "generated_at": datetime.utcnow().strftime("%B %d, %Y"),
            "platform_name": "Clean Energy Intelligence Platform",
        }

        html_content = self._render_template("discovery_report.html", context)
        return self._html_to_pdf(html_content)


# Singleton instance
report_generator = ReportGenerator()

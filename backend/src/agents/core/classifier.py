"""
LLM-Based Few-Shot Classifier for Technology Domain Routing

This classifier uses Claude Haiku with few-shot prompting to categorize user queries
into one of six specialized technology workflows or a general research path.

Classification Categories:
1. solar_pv: Photovoltaic solar cells (perovskites, tandems, silicon)
2. battery: Li-ion, solid-state, Na-ion batteries
3. heat_pump: Heat pump systems and thermal management
4. electric_vehicle: EV batteries, motors, power electronics
5. electrolyzer: Hydrogen production (Alkaline, PEM, SOEC)
6. wind_turbine: Wind energy systems
7. general: General research queries or multi-domain questions

Target Accuracy: 95%+ on validation set
"""

import json
import logging
from typing import Dict, List, Literal, Optional
from pathlib import Path

from pydantic import BaseModel, Field
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from langchain_core.output_parsers import JsonOutputParser

logger = logging.getLogger(__name__)

# Type definitions
TechnologyDomain = Literal[
    "solar_pv",
    "battery",
    "heat_pump",
    "electric_vehicle",
    "electrolyzer",
    "wind_turbine",
    "general"
]


class ClassificationResult(BaseModel):
    """Structured output from classifier."""
    domain: TechnologyDomain = Field(
        description="Predicted technology domain"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score between 0 and 1"
    )
    reasoning: str = Field(
        description="Brief explanation for classification decision"
    )
    keywords: List[str] = Field(
        default_factory=list,
        description="Key terms that influenced classification"
    )


class FewShotClassifier:
    """
    LLM-based classifier using few-shot prompting with Claude Haiku.

    This approach avoids the need for fine-tuning or traditional ML training,
    enabling rapid iteration and transparency in classification decisions.
    """

    def __init__(
        self,
        model_name: str = "claude-3-haiku-20240307",
        temperature: float = 0.0,
        training_data_path: Optional[Path] = None
    ):
        """
        Initialize classifier with LLM and training examples.

        Args:
            model_name: Anthropic model identifier (Haiku for speed/cost)
            temperature: Sampling temperature (0 for deterministic)
            training_data_path: Path to few-shot examples JSON
        """
        self.model = ChatAnthropic(
            model=model_name,
            temperature=temperature,
            max_tokens=500
        )

        # Load training examples
        if training_data_path is None:
            training_data_path = Path(__file__).parent.parent.parent / "data" / "classifier" / "training_examples.json"

        self.training_examples = self._load_training_data(training_data_path)

        # Setup few-shot prompt template
        self.prompt = self._build_prompt_template()

        # Output parser for structured results
        self.output_parser = JsonOutputParser(pydantic_object=ClassificationResult)

        # Build classification chain
        self.chain = self.prompt | self.model | self.output_parser

    def _load_training_data(self, path: Path) -> List[Dict[str, str]]:
        """Load few-shot training examples from JSON file."""
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded {len(data)} training examples from {path}")
            return data
        except FileNotFoundError:
            logger.warning(f"Training data not found at {path}, using default examples")
            return self._get_default_examples()

    def _get_default_examples(self) -> List[Dict[str, str]]:
        """
        Default few-shot training examples (embedded fallback).

        Each example maps a user query to a technology domain with reasoning.
        """
        return [
            # Solar PV examples
            {
                "query": "What are the latest perovskite solar cell efficiency records?",
                "domain": "solar_pv",
                "confidence": "0.98",
                "reasoning": "Explicitly mentions perovskite solar cells and efficiency, core Solar PV topic",
                "keywords": "perovskite, solar cell, efficiency"
            },
            {
                "query": "How can I improve tandem solar cell stability?",
                "domain": "solar_pv",
                "confidence": "0.96",
                "reasoning": "Tandem solar cells are a specialized Solar PV architecture",
                "keywords": "tandem, solar cell, stability"
            },
            {
                "query": "Best materials for low-cost photovoltaic absorbers",
                "domain": "solar_pv",
                "confidence": "0.95",
                "reasoning": "Photovoltaic absorbers directly relate to solar cell technology",
                "keywords": "photovoltaic, absorbers, materials"
            },

            # Battery examples
            {
                "query": "What solid-state electrolytes have the highest ionic conductivity?",
                "domain": "battery",
                "confidence": "0.97",
                "reasoning": "Solid-state electrolytes and ionic conductivity are key battery topics",
                "keywords": "solid-state, electrolyte, ionic conductivity"
            },
            {
                "query": "Compare energy density of Na-ion vs Li-ion batteries",
                "domain": "battery",
                "confidence": "0.99",
                "reasoning": "Direct comparison of battery chemistries",
                "keywords": "Na-ion, Li-ion, energy density, batteries"
            },
            {
                "query": "Cathode degradation mechanisms in lithium batteries",
                "domain": "battery",
                "confidence": "0.96",
                "reasoning": "Cathode degradation is a core battery research topic",
                "keywords": "cathode, degradation, lithium batteries"
            },

            # Heat Pump examples
            {
                "query": "Optimal refrigerants for high-temperature heat pumps",
                "domain": "heat_pump",
                "confidence": "0.97",
                "reasoning": "Refrigerants and heat pumps directly mentioned",
                "keywords": "refrigerants, heat pumps, high-temperature"
            },
            {
                "query": "COP improvements for residential heating systems",
                "domain": "heat_pump",
                "confidence": "0.92",
                "reasoning": "COP (Coefficient of Performance) is a key heat pump metric, residential heating context",
                "keywords": "COP, residential heating"
            },

            # Electric Vehicle examples
            {
                "query": "Fast charging impact on EV battery degradation",
                "domain": "electric_vehicle",
                "confidence": "0.98",
                "reasoning": "EV batteries and fast charging are specific to electric vehicles",
                "keywords": "EV, battery, fast charging, degradation"
            },
            {
                "query": "Permanent magnet motor efficiency for electric cars",
                "domain": "electric_vehicle",
                "confidence": "0.94",
                "reasoning": "Permanent magnet motors used in electric vehicle drivetrains",
                "keywords": "permanent magnet, motor, electric cars"
            },
            {
                "query": "Power electronics for vehicle-to-grid integration",
                "domain": "electric_vehicle",
                "confidence": "0.93",
                "reasoning": "Vehicle-to-grid is an EV-specific technology",
                "keywords": "power electronics, vehicle-to-grid, V2G"
            },

            # Electrolyzer examples
            {
                "query": "PEM electrolyzer membrane durability under cycling",
                "domain": "electrolyzer",
                "confidence": "0.99",
                "reasoning": "PEM electrolyzer explicitly mentioned",
                "keywords": "PEM, electrolyzer, membrane, durability"
            },
            {
                "query": "Alkaline vs SOEC efficiency for green hydrogen production",
                "domain": "electrolyzer",
                "confidence": "0.97",
                "reasoning": "Alkaline and SOEC are electrolyzer types, green hydrogen context",
                "keywords": "alkaline, SOEC, hydrogen production, electrolyzer"
            },
            {
                "query": "Oxygen evolution catalysts for water splitting",
                "domain": "electrolyzer",
                "confidence": "0.90",
                "reasoning": "Water splitting catalysts are core to electrolyzer technology",
                "keywords": "oxygen evolution, catalysts, water splitting"
            },

            # Wind Turbine examples
            {
                "query": "Blade pitch control optimization for offshore wind",
                "domain": "wind_turbine",
                "confidence": "0.96",
                "reasoning": "Blade pitch control is specific to wind turbine technology",
                "keywords": "blade pitch, offshore wind, turbine"
            },
            {
                "query": "Fatigue analysis of wind turbine tower structures",
                "domain": "wind_turbine",
                "confidence": "0.94",
                "reasoning": "Wind turbine tower fatigue is a structural wind energy topic",
                "keywords": "fatigue, tower, wind turbine"
            },

            # General examples
            {
                "query": "What are the key challenges in clean energy transition?",
                "domain": "general",
                "confidence": "0.85",
                "reasoning": "Broad question spanning multiple technologies, no specific domain",
                "keywords": "clean energy, transition, challenges"
            },
            {
                "query": "Compare exergy efficiency across renewable technologies",
                "domain": "general",
                "confidence": "0.88",
                "reasoning": "Cross-domain comparison requiring multiple specialty areas",
                "keywords": "exergy, renewable technologies, comparison"
            },
            {
                "query": "Energy storage options for grid stabilization",
                "domain": "general",
                "confidence": "0.80",
                "reasoning": "Could involve batteries, thermal storage, or other technologies - too broad",
                "keywords": "energy storage, grid stabilization"
            },
            {
                "query": "What is the carbon footprint of manufacturing solar panels vs wind turbines?",
                "domain": "general",
                "confidence": "0.82",
                "reasoning": "Comparative analysis across two different technology domains",
                "keywords": "carbon footprint, solar panels, wind turbines, comparison"
            }
        ]

    def _build_prompt_template(self) -> ChatPromptTemplate:
        """
        Construct few-shot prompt template with examples and instructions.

        Returns:
            ChatPromptTemplate configured for classification task
        """
        # Example prompt structure
        example_prompt = ChatPromptTemplate.from_messages([
            ("human", "{query}"),
            ("ai", "{{\"domain\": \"{domain}\", \"confidence\": {confidence}, \"reasoning\": \"{reasoning}\", \"keywords\": \"{keywords}\"}}")
        ])

        # Few-shot wrapper
        few_shot_prompt = FewShotChatMessagePromptTemplate(
            example_prompt=example_prompt,
            examples=self.training_examples,
            input_variables=["query"]
        )

        # Complete system prompt
        system_message = """You are an expert classifier for clean energy technology queries.

Your task is to categorize user questions into one of these technology domains:

1. **solar_pv**: Photovoltaic solar cells, perovskites, tandem cells, silicon PV, solar efficiency
2. **battery**: Li-ion batteries, solid-state batteries, Na-ion, cathodes, anodes, electrolytes, energy storage
3. **heat_pump**: Heat pumps, refrigerants, thermal management, COP, heating/cooling systems
4. **electric_vehicle**: EV batteries, electric motors, power electronics, charging infrastructure, vehicle-to-grid
5. **electrolyzer**: Hydrogen production, PEM electrolyzers, alkaline electrolyzers, SOEC, water splitting, catalysts
6. **wind_turbine**: Wind turbines, blade design, offshore wind, turbine control systems, structural analysis
7. **general**: Broad questions spanning multiple domains, policy, economics, or topics not fitting above categories

**Classification Guidelines:**
- Focus on PRIMARY technology domain (if query mentions solar + batteries, determine which is the main focus)
- Use high confidence (>0.9) only when domain is unambiguous
- Use general category for comparative or policy questions across multiple domains
- Extract 2-4 key keywords that drove your decision
- Provide clear reasoning explaining why you chose the domain

**Output Format (JSON):**
{{
  "domain": "<one of the 7 domains>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<1-2 sentence explanation>",
  "keywords": "<comma-separated key terms>"
}}

Study these examples carefully:
"""

        # Combine into final template
        final_prompt = ChatPromptTemplate.from_messages([
            ("system", system_message),
            few_shot_prompt,
            ("human", "{query}")
        ])

        return final_prompt

    def classify(self, query: str) -> ClassificationResult:
        """
        Classify a user query into a technology domain.

        Args:
            query: User's natural language question

        Returns:
            ClassificationResult with domain, confidence, reasoning, and keywords

        Raises:
            ValueError: If query is empty or invalid
            Exception: If LLM call fails
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")

        try:
            logger.info(f"Classifying query: {query[:100]}...")

            # Invoke LLM chain
            result = self.chain.invoke({"query": query})

            # Parse and validate result
            classification = ClassificationResult(**result)

            logger.info(
                f"Classification: domain={classification.domain}, "
                f"confidence={classification.confidence:.2f}"
            )

            return classification

        except Exception as e:
            logger.error(f"Classification failed: {str(e)}", exc_info=True)
            # Fallback to general domain on error
            return ClassificationResult(
                domain="general",
                confidence=0.5,
                reasoning=f"Classification error, defaulting to general: {str(e)}",
                keywords=[]
            )

    def classify_batch(self, queries: List[str]) -> List[ClassificationResult]:
        """
        Classify multiple queries in batch.

        Args:
            queries: List of user questions

        Returns:
            List of ClassificationResult objects
        """
        return [self.classify(q) for q in queries]

    def evaluate(self, validation_data_path: Path) -> Dict[str, float]:
        """
        Evaluate classifier accuracy on labeled validation set.

        Args:
            validation_data_path: Path to JSON file with labeled test cases

        Returns:
            Dictionary with accuracy metrics
        """
        with open(validation_data_path, 'r') as f:
            validation_data = json.load(f)

        correct = 0
        total = len(validation_data)
        per_domain_correct = {domain: 0 for domain in TechnologyDomain.__args__}
        per_domain_total = {domain: 0 for domain in TechnologyDomain.__args__}

        for example in validation_data:
            query = example["query"]
            true_domain = example["domain"]

            result = self.classify(query)
            predicted_domain = result.domain

            per_domain_total[true_domain] += 1

            if predicted_domain == true_domain:
                correct += 1
                per_domain_correct[true_domain] += 1

        overall_accuracy = correct / total if total > 0 else 0.0

        per_domain_accuracy = {
            domain: (per_domain_correct[domain] / per_domain_total[domain]
                    if per_domain_total[domain] > 0 else 0.0)
            for domain in per_domain_correct
        }

        metrics = {
            "overall_accuracy": overall_accuracy,
            "total_examples": total,
            "correct_predictions": correct,
            **{f"accuracy_{domain}": acc for domain, acc in per_domain_accuracy.items()}
        }

        logger.info(f"Classifier evaluation: {overall_accuracy:.2%} accuracy on {total} examples")

        return metrics


# Singleton instance for reuse across requests
_classifier_instance: Optional[FewShotClassifier] = None

def get_classifier() -> FewShotClassifier:
    """Factory function to get singleton classifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = FewShotClassifier()
    return _classifier_instance

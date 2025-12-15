#!/usr/bin/env python3
"""
Classifier Accuracy Test Script

Tests the few-shot LLM classifier against the validation set.
Target: 95%+ accuracy on 25 validation examples.

Usage:
    python scripts/test_classifier_accuracy.py
"""

import sys
import os
from pathlib import Path
import json
from typing import Dict, List

# Add backend src to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from src.agents.core.classifier import FewShotClassifier, ClassificationResult


def load_validation_data(path: Path) -> List[Dict[str, str]]:
    """Load validation dataset."""
    with open(path, 'r') as f:
        return json.load(f)


def evaluate_classifier(classifier: FewShotClassifier, validation_data: List[Dict]) -> Dict:
    """
    Evaluate classifier on validation set.

    Returns:
        Dictionary with accuracy metrics and detailed results
    """
    total = len(validation_data)
    correct = 0
    results = []

    # Per-domain metrics
    domain_stats = {}

    print(f"\n{'='*80}")
    print(f"Testing Classifier on {total} Validation Examples")
    print(f"{'='*80}\n")

    for i, example in enumerate(validation_data, 1):
        query = example["query"]
        true_domain = example["domain"]

        # Classify
        try:
            result = classifier.classify(query)
            predicted_domain = result.domain
            confidence = result.confidence

            # Check if correct
            is_correct = predicted_domain == true_domain
            if is_correct:
                correct += 1

            # Track per-domain stats
            if true_domain not in domain_stats:
                domain_stats[true_domain] = {"total": 0, "correct": 0}
            domain_stats[true_domain]["total"] += 1
            if is_correct:
                domain_stats[true_domain]["correct"] += 1

            # Store result
            results.append({
                "query": query,
                "true_domain": true_domain,
                "predicted_domain": predicted_domain,
                "confidence": confidence,
                "correct": is_correct,
                "reasoning": result.reasoning
            })

            # Print progress
            status = "✓" if is_correct else "✗"
            print(f"{i:2d}. {status} Query: {query[:60]}...")
            print(f"    True: {true_domain:20s} | Predicted: {predicted_domain:20s} | Confidence: {confidence:.2f}")
            if not is_correct:
                print(f"    Reasoning: {result.reasoning}")
            print()

        except Exception as e:
            print(f"{i:2d}. ERROR: {str(e)}")
            results.append({
                "query": query,
                "true_domain": true_domain,
                "error": str(e),
                "correct": False
            })

    # Calculate overall accuracy
    accuracy = correct / total if total > 0 else 0.0

    # Calculate per-domain accuracy
    domain_accuracy = {
        domain: stats["correct"] / stats["total"] if stats["total"] > 0 else 0.0
        for domain, stats in domain_stats.items()
    }

    # Print summary
    print(f"\n{'='*80}")
    print("RESULTS SUMMARY")
    print(f"{'='*80}\n")
    print(f"Overall Accuracy: {accuracy:.2%} ({correct}/{total})")
    print(f"\nPer-Domain Accuracy:")
    for domain, acc in sorted(domain_accuracy.items()):
        stats = domain_stats[domain]
        print(f"  {domain:20s}: {acc:.2%} ({stats['correct']}/{stats['total']})")

    # Check if meets target
    print(f"\n{'='*80}")
    target_met = accuracy >= 0.95
    if target_met:
        print("✓ TARGET MET: Classifier achieves 95%+ accuracy!")
    else:
        print(f"✗ TARGET MISSED: Classifier accuracy {accuracy:.2%} < 95%")
        print(f"  Need to improve by: {(0.95 - accuracy)*total:.0f} correct predictions")
    print(f"{'='*80}\n")

    return {
        "overall_accuracy": accuracy,
        "total_examples": total,
        "correct_predictions": correct,
        "incorrect_predictions": total - correct,
        "domain_accuracy": domain_accuracy,
        "domain_stats": domain_stats,
        "target_met": target_met,
        "results": results
    }


def save_results(metrics: Dict, output_path: Path):
    """Save detailed results to JSON file."""
    with open(output_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Detailed results saved to: {output_path}")


def main():
    """Run classifier evaluation."""
    print("\n" + "="*80)
    print("EXERGY LAB - CLASSIFIER ACCURACY TEST")
    print("="*80 + "\n")

    # Paths
    validation_path = backend_path / "src" / "data" / "classifier" / "validation_set.json"
    output_path = backend_path / "src" / "tests" / "classifier_test_results.json"

    # Check validation file exists
    if not validation_path.exists():
        print(f"ERROR: Validation file not found at {validation_path}")
        sys.exit(1)

    # Load validation data
    print(f"Loading validation data from: {validation_path}")
    validation_data = load_validation_data(validation_path)
    print(f"Loaded {len(validation_data)} validation examples\n")

    # Initialize classifier
    print("Initializing FewShotClassifier...")
    try:
        classifier = FewShotClassifier()
        print("Classifier initialized successfully\n")
    except Exception as e:
        print(f"ERROR: Failed to initialize classifier: {str(e)}")
        print("\nMake sure ANTHROPIC_API_KEY is set in your .env file")
        sys.exit(1)

    # Run evaluation
    try:
        metrics = evaluate_classifier(classifier, validation_data)

        # Save results
        save_results(metrics, output_path)

        # Exit with appropriate code
        sys.exit(0 if metrics["target_met"] else 1)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

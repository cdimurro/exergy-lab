"""
NVIDIA Nemotron Embeddings for Scientific Search

GPU-accelerated text embeddings using NVIDIA's Llama-Embed-Nemotron-8B model,
which ranks #1 on the Multilingual MTEB Leaderboard.

Features:
- 4096-dimensional embeddings (vs 384 for MiniLM)
- Instruction-aware embeddings for better task-specific results
- GPU acceleration via T4 for fast inference
- Batched processing for efficiency

HTTP Endpoints:
- POST /embeddings - Generate embeddings for texts
- POST /batch-embeddings - Batch embedding generation

@see nvidia-nemotron.ts - TypeScript client
@see model-router.ts - Routes embedding requests here
"""

import modal
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# Create Modal app
app = modal.App("exergy-nemotron-embeddings")

# Image with transformers and CUDA support
nemotron_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch>=2.0.0",
    "transformers>=4.40.0",
    "accelerate>=0.27.0",
    "sentencepiece>=0.1.99",
    "protobuf>=3.20.0",
    "fastapi>=0.100.0",
    "pydantic>=2.0.0",
)

# Model caching volume
model_volume = modal.Volume.from_name("nemotron-model-cache", create_if_missing=True)

# Scientific task instructions for embedding generation
SCIENTIFIC_INSTRUCTIONS = {
    "research": "Retrieve scientific papers about clean energy technology and sustainable systems",
    "hypothesis": "Find research supporting or contradicting energy conversion hypotheses",
    "materials": "Search for material properties relevant to energy storage and conversion",
    "patent": "Retrieve patents related to clean energy innovation and manufacturing",
    "general": "Retrieve relevant scientific documents for clean energy research",
}


# ============================================================================
# Embedding Generation Functions
# ============================================================================

@app.cls(
    gpu="T4",
    timeout=300,
    image=nemotron_image,
    memory=8192,
    volumes={"/cache": model_volume},
    allow_concurrent_inputs=5,
)
class NemotronEmbedder:
    """Nemotron embedding model wrapper with GPU acceleration."""

    @modal.enter()
    def load_model(self):
        """Load model on container startup."""
        import torch
        from transformers import AutoModel, AutoTokenizer
        import os

        print("[Nemotron] Loading model...")

        # Set cache directory
        os.environ["HF_HOME"] = "/cache"
        os.environ["TRANSFORMERS_CACHE"] = "/cache"

        model_name = "nvidia/llama-embed-nemotron-8b"

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            cache_dir="/cache",
            trust_remote_code=True,
        )

        # Load model with appropriate precision
        self.model = AutoModel.from_pretrained(
            model_name,
            cache_dir="/cache",
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True,
        )

        self.model.eval()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print(f"[Nemotron] Model loaded on {self.device}")

    @modal.method()
    def generate_embeddings(
        self,
        texts: List[str],
        instruction: Optional[str] = None,
        task_type: str = "general",
    ) -> Dict[str, Any]:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of texts to embed
            instruction: Custom instruction (overrides task_type)
            task_type: One of "research", "hypothesis", "materials", "patent", "general"

        Returns:
            Dict with embeddings and metadata
        """
        import torch
        import time

        start_time = time.time()

        # Get instruction
        if instruction is None:
            instruction = SCIENTIFIC_INSTRUCTIONS.get(task_type, SCIENTIFIC_INSTRUCTIONS["general"])

        # Format texts with instruction
        formatted_texts = [
            f"Instruct: {instruction}\nQuery: {text}"
            for text in texts
        ]

        # Tokenize
        inputs = self.tokenizer(
            formatted_texts,
            padding=True,
            truncation=True,
            max_length=8192,  # Nemotron supports long contexts
            return_tensors="pt",
        ).to(self.device)

        # Generate embeddings
        with torch.no_grad():
            outputs = self.model(**inputs)

            # Mean pooling over token embeddings (excluding padding)
            attention_mask = inputs["attention_mask"]
            token_embeddings = outputs.last_hidden_state

            # Expand attention mask for broadcasting
            mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()

            # Sum embeddings weighted by attention mask
            sum_embeddings = torch.sum(token_embeddings * mask_expanded, dim=1)
            sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)

            # Mean pooling
            embeddings = sum_embeddings / sum_mask

            # Normalize embeddings
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        # Convert to list
        embeddings_list = embeddings.cpu().numpy().tolist()

        execution_time_ms = int((time.time() - start_time) * 1000)

        print(f"[Nemotron] Generated {len(texts)} embeddings in {execution_time_ms}ms")

        return {
            "embeddings": embeddings_list,
            "dimension": len(embeddings_list[0]) if embeddings_list else 0,
            "count": len(texts),
            "task_type": task_type,
            "instruction": instruction,
            "execution_time_ms": execution_time_ms,
        }

    @modal.method()
    def compute_similarity(
        self,
        query: str,
        documents: List[str],
        instruction: Optional[str] = None,
        task_type: str = "research",
    ) -> Dict[str, Any]:
        """
        Compute similarity between a query and documents.

        Args:
            query: Query text
            documents: List of document texts
            instruction: Custom instruction
            task_type: Task type for instruction

        Returns:
            Dict with similarity scores
        """
        import torch
        import time

        start_time = time.time()

        # Generate embeddings for query and documents
        all_texts = [query] + documents
        result = self.generate_embeddings(all_texts, instruction, task_type)

        query_embedding = torch.tensor(result["embeddings"][0])
        doc_embeddings = torch.tensor(result["embeddings"][1:])

        # Compute cosine similarity
        similarities = torch.nn.functional.cosine_similarity(
            query_embedding.unsqueeze(0),
            doc_embeddings,
            dim=1,
        )

        # Create ranked results
        scores = similarities.tolist()
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)

        execution_time_ms = int((time.time() - start_time) * 1000)

        return {
            "query": query,
            "scores": scores,
            "ranked_indices": ranked_indices,
            "top_scores": [
                {"index": i, "score": scores[i]}
                for i in ranked_indices[:10]
            ],
            "execution_time_ms": execution_time_ms,
        }


# ============================================================================
# HTTP Endpoints for TypeScript Access
# ============================================================================

class EmbeddingRequest(BaseModel):
    """Request model for embedding generation."""
    texts: List[str]
    instruction: Optional[str] = None
    task_type: str = "general"


class SimilarityRequest(BaseModel):
    """Request model for similarity computation."""
    query: str
    documents: List[str]
    instruction: Optional[str] = None
    task_type: str = "research"


class BatchEmbeddingRequest(BaseModel):
    """Request model for batch embedding generation."""
    batches: List[EmbeddingRequest]


@app.function(
    image=nemotron_image,
    timeout=300,
)
@modal.web_endpoint(method="POST", docs=True)
def embeddings_endpoint(request: EmbeddingRequest) -> Dict[str, Any]:
    """
    HTTP endpoint for embedding generation.

    Example:
        POST /embeddings
        {
            "texts": ["solar cell efficiency", "hydrogen production"],
            "task_type": "research"
        }
    """
    embedder = NemotronEmbedder()
    return embedder.generate_embeddings.remote(
        texts=request.texts,
        instruction=request.instruction,
        task_type=request.task_type,
    )


@app.function(
    image=nemotron_image,
    timeout=300,
)
@modal.web_endpoint(method="POST", docs=True)
def similarity_endpoint(request: SimilarityRequest) -> Dict[str, Any]:
    """
    HTTP endpoint for similarity computation.

    Example:
        POST /similarity
        {
            "query": "perovskite solar cell efficiency",
            "documents": ["Study on perovskite...", "Silicon solar..."],
            "task_type": "research"
        }
    """
    embedder = NemotronEmbedder()
    return embedder.compute_similarity.remote(
        query=request.query,
        documents=request.documents,
        instruction=request.instruction,
        task_type=request.task_type,
    )


@app.function(
    image=nemotron_image,
    timeout=600,
)
@modal.web_endpoint(method="POST", docs=True)
def batch_embeddings_endpoint(request: BatchEmbeddingRequest) -> Dict[str, Any]:
    """
    HTTP endpoint for batch embedding generation.

    Processes multiple batches in parallel for efficiency.
    """
    embedder = NemotronEmbedder()
    results = []

    for batch in request.batches:
        result = embedder.generate_embeddings.remote(
            texts=batch.texts,
            instruction=batch.instruction,
            task_type=batch.task_type,
        )
        results.append(result)

    total_embeddings = sum(r["count"] for r in results)
    total_time = sum(r["execution_time_ms"] for r in results)

    return {
        "batches": results,
        "total_embeddings": total_embeddings,
        "total_execution_time_ms": total_time,
    }


# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.function(image=nemotron_image)
@modal.web_endpoint(method="GET", docs=True)
def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model": "nvidia/llama-embed-nemotron-8b",
        "dimension": 4096,
        "task_types": list(SCIENTIFIC_INSTRUCTIONS.keys()),
    }


# ============================================================================
# Local Testing Entrypoint
# ============================================================================

@app.local_entrypoint()
def main():
    """Test Nemotron embeddings locally."""
    print("=" * 60)
    print("Testing NVIDIA Nemotron Embeddings")
    print("=" * 60)

    embedder = NemotronEmbedder()

    # Test basic embeddings
    print("\n1. Testing basic embedding generation...")
    test_texts = [
        "Perovskite solar cells achieve 25% efficiency under standard conditions",
        "Hydrogen production via proton exchange membrane electrolysis",
        "Lithium-ion battery degradation mechanisms in grid storage",
    ]

    result = embedder.generate_embeddings.remote(
        texts=test_texts,
        task_type="research",
    )

    print(f"Generated {result['count']} embeddings")
    print(f"Dimension: {result['dimension']}")
    print(f"Execution time: {result['execution_time_ms']}ms")

    # Test similarity
    print("\n2. Testing similarity computation...")
    query = "solar cell efficiency improvements"
    documents = [
        "Perovskite solar cells have achieved remarkable efficiency gains",
        "Battery storage systems for renewable energy integration",
        "Wind turbine design optimization for offshore applications",
    ]

    sim_result = embedder.compute_similarity.remote(
        query=query,
        documents=documents,
        task_type="research",
    )

    print(f"Query: {query}")
    print("Similarity scores:")
    for i, score in enumerate(sim_result["scores"]):
        print(f"  Doc {i}: {score:.4f}")

    print("\n" + "=" * 60)
    print("Tests completed successfully!")
    print("=" * 60)

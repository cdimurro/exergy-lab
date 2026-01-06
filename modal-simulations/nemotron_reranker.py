"""
NVIDIA Nemotron Reranker for Enhanced RAG

Modal function for reranking search results using NVIDIA's Nemotron reranker model.
Improves scientific search quality by reranking documents based on semantic relevance.

Features:
- Cross-encoder reranking for better relevance scoring
- Batch processing for efficiency
- Scientific domain optimization
- GPU-accelerated inference on Modal T4

Model: nvidia/nv-rerankqa-mistral-4b-v3 (or fallback to cross-encoder)

Usage:
    modal deploy nemotron_reranker.py
    modal run nemotron_reranker.py::rerank_endpoint

References:
- NVIDIA CES 2026: https://blogs.nvidia.com/blog/open-models-data-tools-accelerate-ai/
- Nemotron on HuggingFace: https://huggingface.co/nvidia
"""

import modal
import time
from typing import Optional

# Modal app definition
app = modal.App("exergy-nemotron-reranker")

# Image with reranker dependencies
reranker_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch>=2.0.0",
        "transformers>=4.36.0",
        "sentence-transformers>=2.2.0",
        "accelerate>=0.25.0",
        "numpy>=1.24.0",
    )
    .env({
        "HF_HOME": "/cache/huggingface",
        "TRANSFORMERS_CACHE": "/cache/huggingface",
    })
)

# Volume for model caching
model_volume = modal.Volume.from_name("nemotron-reranker-cache", create_if_missing=True)


class NemotronReranker:
    """
    NVIDIA Nemotron-based reranker for scientific document retrieval.

    Uses a cross-encoder architecture for accurate relevance scoring.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.cross_encoder = None
        self.model_name = None

    def load_model(self):
        """Load the reranker model with fallback options."""
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        # Try NVIDIA reranker first, fall back to cross-encoder
        model_options = [
            "nvidia/nv-rerankqa-mistral-4b-v3",
            "BAAI/bge-reranker-v2-m3",
            "cross-encoder/ms-marco-MiniLM-L-12-v2",
        ]

        for model_name in model_options:
            try:
                print(f"[NemotronReranker] Loading model: {model_name}")

                self.tokenizer = AutoTokenizer.from_pretrained(
                    model_name,
                    cache_dir="/cache/huggingface"
                )
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    model_name,
                    cache_dir="/cache/huggingface",
                    torch_dtype=torch.float16,
                    device_map="auto"
                )
                self.model.eval()
                self.model_name = model_name

                print(f"[NemotronReranker] Successfully loaded: {model_name}")
                return

            except Exception as e:
                print(f"[NemotronReranker] Failed to load {model_name}: {e}")
                continue

        # Final fallback: sentence-transformers cross-encoder
        try:
            from sentence_transformers import CrossEncoder
            print("[NemotronReranker] Falling back to CrossEncoder")
            self.cross_encoder = CrossEncoder(
                "cross-encoder/ms-marco-MiniLM-L-12-v2",
                max_length=512,
                device="cuda" if torch.cuda.is_available() else "cpu"
            )
            self.model_name = "cross-encoder/ms-marco-MiniLM-L-12-v2"
        except Exception as e:
            raise RuntimeError(f"Failed to load any reranker model: {e}")

    def rerank(
        self,
        query: str,
        documents: list[dict],
        top_k: Optional[int] = None
    ) -> dict:
        """
        Rerank documents based on relevance to query.

        Args:
            query: The search query
            documents: List of dicts with 'id' and 'text' fields
            top_k: Number of top results to return (None = all)

        Returns:
            Dict with reranked results and scores
        """
        import torch

        start_time = time.time()

        if not documents:
            return {
                "results": [],
                "query": query,
                "model": self.model_name,
                "execution_time_ms": 0
            }

        # Extract texts
        doc_texts = [doc.get("text", "") for doc in documents]
        doc_ids = [doc.get("id", str(i)) for i, doc in enumerate(documents)]

        # Score using cross-encoder
        if self.cross_encoder is not None:
            # Use sentence-transformers CrossEncoder
            pairs = [[query, text] for text in doc_texts]
            scores = self.cross_encoder.predict(pairs)
            scores = scores.tolist() if hasattr(scores, 'tolist') else list(scores)
        else:
            # Use transformers model
            scores = []
            batch_size = 8

            for i in range(0, len(doc_texts), batch_size):
                batch_texts = doc_texts[i:i + batch_size]

                # Prepare inputs
                inputs = self.tokenizer(
                    [query] * len(batch_texts),
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors="pt"
                ).to(self.model.device)

                with torch.no_grad():
                    outputs = self.model(**inputs)
                    # Get relevance scores (usually logits[:, 1] for binary classification)
                    if outputs.logits.shape[-1] == 1:
                        batch_scores = outputs.logits.squeeze(-1)
                    else:
                        batch_scores = outputs.logits[:, 1]
                    scores.extend(batch_scores.cpu().tolist())

        # Combine results
        results = [
            {"id": doc_id, "score": score, "text": text[:200]}
            for doc_id, score, text in zip(doc_ids, scores, doc_texts)
        ]

        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)

        # Apply top_k
        if top_k is not None and top_k > 0:
            results = results[:top_k]

        execution_time_ms = (time.time() - start_time) * 1000

        return {
            "results": results,
            "query": query,
            "model": self.model_name,
            "total_documents": len(documents),
            "returned_documents": len(results),
            "execution_time_ms": execution_time_ms
        }

    def batch_rerank(
        self,
        queries: list[str],
        documents_list: list[list[dict]],
        top_k: Optional[int] = None
    ) -> dict:
        """
        Rerank multiple query-document pairs.

        Args:
            queries: List of search queries
            documents_list: List of document lists (one per query)
            top_k: Number of top results per query

        Returns:
            Dict with batch results
        """
        start_time = time.time()

        results = []
        for query, documents in zip(queries, documents_list):
            result = self.rerank(query, documents, top_k)
            results.append(result)

        total_time_ms = (time.time() - start_time) * 1000

        return {
            "batch_results": results,
            "batch_size": len(queries),
            "total_execution_time_ms": total_time_ms
        }


# Singleton instance
reranker_instance: Optional[NemotronReranker] = None


def get_reranker() -> NemotronReranker:
    """Get or create the reranker instance."""
    global reranker_instance
    if reranker_instance is None:
        reranker_instance = NemotronReranker()
        reranker_instance.load_model()
    return reranker_instance


# =============================================================================
# Modal Endpoints
# =============================================================================

@app.function(
    image=reranker_image,
    gpu="T4",
    timeout=300,
    volumes={"/cache": model_volume},
    container_idle_timeout=120,
)
def rerank_documents(
    query: str,
    documents: list[dict],
    top_k: Optional[int] = None
) -> dict:
    """
    Rerank documents based on relevance to query.

    Args:
        query: The search query
        documents: List of dicts with 'id' and 'text' fields
        top_k: Number of top results to return

    Returns:
        Dict with reranked results
    """
    reranker = get_reranker()
    return reranker.rerank(query, documents, top_k)


@app.function(
    image=reranker_image,
    gpu="T4",
    timeout=600,
    volumes={"/cache": model_volume},
    container_idle_timeout=120,
)
def batch_rerank_documents(
    queries: list[str],
    documents_list: list[list[dict]],
    top_k: Optional[int] = None
) -> dict:
    """
    Rerank multiple query-document pairs.

    Args:
        queries: List of search queries
        documents_list: List of document lists
        top_k: Number of top results per query

    Returns:
        Dict with batch results
    """
    reranker = get_reranker()
    return reranker.batch_rerank(queries, documents_list, top_k)


# =============================================================================
# HTTP Endpoints (for TypeScript integration)
# =============================================================================

@app.function(
    image=reranker_image,
    gpu="T4",
    timeout=300,
    volumes={"/cache": model_volume},
    container_idle_timeout=120,
)
@modal.web_endpoint(method="POST")
def rerank_endpoint(request: dict) -> dict:
    """
    HTTP endpoint for reranking documents.

    Request body:
    {
        "query": "search query",
        "documents": [{"id": "1", "text": "document text"}, ...],
        "top_k": 10  // optional
    }

    Response:
    {
        "results": [{"id": "1", "score": 0.95, "text": "..."}, ...],
        "query": "search query",
        "model": "model-name",
        "execution_time_ms": 123
    }
    """
    query = request.get("query", "")
    documents = request.get("documents", [])
    top_k = request.get("top_k")

    if not query:
        return {"error": "Missing 'query' field"}

    if not documents:
        return {"error": "Missing 'documents' field"}

    reranker = get_reranker()
    return reranker.rerank(query, documents, top_k)


@app.function(
    image=reranker_image,
    gpu="T4",
    timeout=600,
    volumes={"/cache": model_volume},
    container_idle_timeout=120,
)
@modal.web_endpoint(method="POST")
def batch_rerank_endpoint(request: dict) -> dict:
    """
    HTTP endpoint for batch reranking.

    Request body:
    {
        "queries": ["query1", "query2", ...],
        "documents_list": [[{...}], [{...}], ...],
        "top_k": 10  // optional
    }
    """
    queries = request.get("queries", [])
    documents_list = request.get("documents_list", [])
    top_k = request.get("top_k")

    if not queries:
        return {"error": "Missing 'queries' field"}

    if len(queries) != len(documents_list):
        return {"error": "queries and documents_list must have same length"}

    reranker = get_reranker()
    return reranker.batch_rerank(queries, documents_list, top_k)


@app.function(
    image=reranker_image,
    gpu="T4",
    timeout=60,
    volumes={"/cache": model_volume},
)
@modal.web_endpoint(method="GET")
def health_endpoint() -> dict:
    """Health check endpoint."""
    try:
        reranker = get_reranker()
        return {
            "status": "healthy",
            "model": reranker.model_name,
            "gpu": "T4"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# =============================================================================
# Local Testing
# =============================================================================

@app.local_entrypoint()
def main():
    """Test the reranker locally."""
    # Test query and documents
    query = "How do perovskite solar cells achieve high efficiency?"
    documents = [
        {
            "id": "1",
            "text": "Perovskite solar cells have achieved power conversion efficiencies exceeding 25% through optimized crystal structure and interface engineering."
        },
        {
            "id": "2",
            "text": "Wind turbines convert kinetic energy from wind into electrical power using large rotating blades."
        },
        {
            "id": "3",
            "text": "The bandgap tunability of perovskite materials allows for optimal light absorption across the solar spectrum."
        },
        {
            "id": "4",
            "text": "Lithium-ion batteries store energy through electrochemical reactions between lithium ions and electrode materials."
        },
        {
            "id": "5",
            "text": "Defect passivation in perovskite films reduces non-radiative recombination losses, improving cell efficiency."
        }
    ]

    print(f"\nQuery: {query}")
    print(f"Documents: {len(documents)}")
    print("\nReranking...")

    result = rerank_documents.remote(query, documents, top_k=3)

    print(f"\nModel: {result['model']}")
    print(f"Execution time: {result['execution_time_ms']:.1f}ms")
    print("\nTop results:")
    for r in result["results"]:
        print(f"  [{r['id']}] Score: {r['score']:.4f} - {r['text'][:80]}...")

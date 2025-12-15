"""
Chat API Endpoints

Handles user queries, classification, workflow routing, and SSE streaming.
"""

import logging
import asyncio
import json
from typing import AsyncGenerator
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from src.database import get_db
from src.schemas import ChatRequest, ChatResponse, ClassificationInfo
from src.models import Conversation, Message, WorkflowExecution
from src.agents.core.classifier import get_classifier
from src.agents.workflows.solar_pv_workflow import create_solar_pv_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])

# Store for SSE event queues (in production, use Redis)
_event_queues = {}


@router.post("/chat", response_model=ChatResponse)
async def create_chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Submit a new query and start agent workflow.

    Args:
        request: Chat request with query and optional conversation_id
        db: Database session

    Returns:
        ChatResponse with IDs for tracking and classification info
    """
    try:
        logger.info(f"Received chat request: {request.query[:100]}...")

        # Get or create conversation
        if request.conversation_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == request.conversation_id
            ).first()
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            # Create new conversation
            conversation = Conversation(
                title=request.query[:100],  # Use first 100 chars as title
                user_id=None,  # Demo mode - no auth
                metadata={}
            )
            db.add(conversation)
            db.flush()

        # Create user message
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=request.query,
            metadata={}
        )
        db.add(user_message)
        db.flush()

        # Classify query
        logger.info("Classifying query...")
        classifier = get_classifier()
        classification = classifier.classify(request.query)

        # Store classification in message metadata
        user_message.metadata = {
            "classification": {
                "domain": classification.domain,
                "confidence": classification.confidence,
                "reasoning": classification.reasoning,
                "keywords": classification.keywords
            }
        }

        # Create workflow execution record
        workflow_exec = WorkflowExecution(
            message_id=user_message.id,
            workflow_type=classification.domain,
            status="pending",
            results=None
        )
        db.add(workflow_exec)
        db.commit()

        logger.info(
            f"Query classified as '{classification.domain}' "
            f"(confidence: {classification.confidence:.2f})"
        )

        # Create event queue for SSE streaming
        event_queue = asyncio.Queue()
        _event_queues[str(workflow_exec.id)] = event_queue

        # Start workflow in background
        asyncio.create_task(
            _run_workflow_async(
                workflow_id=workflow_exec.id,
                domain=classification.domain,
                query=request.query,
                preferences=request.preferences,
                db_session_factory=get_db
            )
        )

        # Return response
        return ChatResponse(
            conversation_id=conversation.id,
            message_id=user_message.id,
            workflow_id=workflow_exec.id,
            classification=ClassificationInfo(
                domain=classification.domain,
                confidence=classification.confidence,
                reasoning=classification.reasoning,
                keywords=classification.keywords
            ),
            status="processing"
        )

    except Exception as e:
        logger.error(f"Chat request failed: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/stream/{workflow_id}")
async def stream_workflow_progress(
    workflow_id: UUID,
    request: Request
):
    """
    Server-Sent Events endpoint for real-time workflow updates.

    Args:
        workflow_id: Workflow execution ID
        request: FastAPI request (for disconnect detection)

    Returns:
        EventSourceResponse with SSE stream
    """
    logger.info(f"Starting SSE stream for workflow {workflow_id}")

    async def event_generator() -> AsyncGenerator:
        """Generate SSE events from workflow queue."""
        workflow_id_str = str(workflow_id)

        # Wait for queue to be created (up to 5 seconds)
        for _ in range(50):
            if workflow_id_str in _event_queues:
                break
            await asyncio.sleep(0.1)
        else:
            # Queue not found
            yield {
                "event": "error",
                "data": json.dumps({"error": "Workflow not found"})
            }
            return

        queue = _event_queues[workflow_id_str]

        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from workflow {workflow_id}")
                    break

                # Get next event from queue (with timeout)
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)

                    # Send event
                    yield {
                        "event": event.get("event", "message"),
                        "data": json.dumps(event.get("data", {}))
                    }

                    # If workflow completed or failed, stop streaming
                    if event.get("event") in ["workflow_completed", "workflow_failed"]:
                        logger.info(f"Workflow {workflow_id} finished: {event.get('event')}")
                        break

                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({"timestamp": datetime.utcnow().isoformat()})
                    }

        finally:
            # Cleanup
            if workflow_id_str in _event_queues:
                del _event_queues[workflow_id_str]
            logger.info(f"Cleaned up SSE stream for workflow {workflow_id}")

    return EventSourceResponse(event_generator())


async def _run_workflow_async(
    workflow_id: UUID,
    domain: str,
    query: str,
    preferences: dict,
    db_session_factory
):
    """
    Run workflow asynchronously and push events to queue.

    Args:
        workflow_id: Workflow execution ID
        domain: Technology domain
        query: User query
        preferences: User preferences
        db_session_factory: Database session factory
    """
    workflow_id_str = str(workflow_id)

    # Get event queue
    if workflow_id_str not in _event_queues:
        logger.error(f"Event queue not found for workflow {workflow_id}")
        return

    queue = _event_queues[workflow_id_str]

    # Callback to push events to queue
    def stream_callback(event: dict):
        """Push event to SSE queue."""
        try:
            asyncio.create_task(queue.put(event))
        except Exception as e:
            logger.error(f"Failed to push event: {str(e)}")

    # Get database session
    db = next(db_session_factory())

    try:
        # Update workflow status
        workflow = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == workflow_id
        ).first()
        workflow.status = "running"
        db.commit()

        # Route to appropriate workflow
        if domain == "solar_pv":
            workflow_instance = create_solar_pv_workflow(
                db=db,
                stream_callback=stream_callback
            )
            result = await asyncio.to_thread(
                workflow_instance.run,
                query,
                preferences
            )
        else:
            # Stub for other workflows
            result = {
                "query": query,
                "workflow": domain,
                "message": f"Workflow for {domain} is coming soon. For now, try solar PV related queries!",
                "status": "not_implemented"
            }

        # Update workflow with results
        workflow.status = "completed"
        workflow.results = result
        workflow.completed_at = datetime.utcnow()
        workflow.duration_seconds = result.get("duration_seconds")

        # Create assistant message
        assistant_message = Message(
            conversation_id=db.query(Message).filter(
                Message.id == workflow.message_id
            ).first().conversation_id,
            role="assistant",
            content=_format_workflow_results(result),
            metadata={"workflow_results": result}
        )
        db.add(assistant_message)
        db.commit()

        logger.info(f"Workflow {workflow_id} completed successfully")

    except Exception as e:
        logger.error(f"Workflow {workflow_id} failed: {str(e)}", exc_info=True)

        # Update workflow with error
        workflow = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == workflow_id
        ).first()
        workflow.status = "failed"
        workflow.error_message = str(e)
        workflow.completed_at = datetime.utcnow()
        db.commit()

    finally:
        db.close()


def _format_workflow_results(result: dict) -> str:
    """Format workflow results as markdown for display."""
    formatted = f"# {result.get('workflow', 'Research').replace('_', ' ').title()} Results\n\n"

    if result.get("status") == "not_implemented":
        return formatted + result.get("message", "")

    formatted += f"**Query:** {result.get('query', 'Unknown')}\n\n"
    formatted += f"**Duration:** {result.get('duration_seconds', 0):.1f} seconds\n\n"

    results = result.get("results", {})

    if results.get("literature_review"):
        formatted += "## Literature Review\n\n"
        formatted += f"{results['literature_review']}\n\n"

    if results.get("material_design"):
        formatted += "## Material Design\n\n"
        formatted += f"{results['material_design']}\n\n"

    if results.get("simulations"):
        formatted += "## Computational Analysis\n\n"
        formatted += f"{results['simulations']}\n\n"

    if results.get("lab_protocols"):
        formatted += "## Lab Protocols\n\n"
        formatted += f"{results['lab_protocols']}\n\n"

    if results.get("tea_report"):
        formatted += "## Techno-Economic Analysis\n\n"
        formatted += f"{results['tea_report']}\n\n"

    return formatted

"""
Pydantic Schemas for Request/Response Validation

Defines data validation models for API endpoints.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID

from pydantic import BaseModel, Field, validator


# ============================================================================
# Chat Schemas
# ============================================================================

class ChatRequest(BaseModel):
    """Request schema for chat endpoint."""
    query: str = Field(..., min_length=1, max_length=5000, description="User query")
    conversation_id: Optional[UUID] = Field(None, description="Existing conversation ID")
    preferences: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="User preferences for workflow execution"
    )

    @validator('query')
    def validate_query(cls, v):
        """Ensure query is not just whitespace."""
        if not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()


class ClassificationInfo(BaseModel):
    """Classification result information."""
    domain: str = Field(..., description="Classified technology domain")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    reasoning: str = Field(..., description="Classification reasoning")
    keywords: List[str] = Field(default_factory=list, description="Key terms")


class ChatResponse(BaseModel):
    """Response schema for chat endpoint."""
    conversation_id: UUID = Field(..., description="Conversation ID")
    message_id: UUID = Field(..., description="User message ID")
    workflow_id: UUID = Field(..., description="Workflow execution ID")
    classification: ClassificationInfo = Field(..., description="Query classification")
    status: str = Field(default="processing", description="Current status")

    class Config:
        json_schema_extra = {
            "example": {
                "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
                "message_id": "123e4567-e89b-12d3-a456-426614174001",
                "workflow_id": "123e4567-e89b-12d3-a456-426614174002",
                "classification": {
                    "domain": "solar_pv",
                    "confidence": 0.98,
                    "reasoning": "Query mentions perovskite solar cells",
                    "keywords": ["perovskite", "solar cell", "efficiency"]
                },
                "status": "processing"
            }
        }


# ============================================================================
# Conversation Schemas
# ============================================================================

class MessageBase(BaseModel):
    """Base message schema."""
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., description="Message text")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class MessageCreate(MessageBase):
    """Schema for creating a message."""
    conversation_id: UUID


class MessageResponse(MessageBase):
    """Schema for message response."""
    id: UUID
    conversation_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    """Base conversation schema."""
    title: Optional[str] = Field(None, max_length=500)
    metadata: Optional[Dict[str, Any]] = None


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""
    user_id: Optional[str] = None


class ConversationResponse(ConversationBase):
    """Schema for conversation response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    user_id: Optional[str]
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class ConversationDetail(ConversationResponse):
    """Detailed conversation with messages."""
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# Feedback Schemas
# ============================================================================

class FeedbackCreate(BaseModel):
    """Schema for creating feedback."""
    message_id: UUID = Field(..., description="Message being rated")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    comment: Optional[str] = Field(None, max_length=2000, description="Optional comment")

    @validator('rating')
    def validate_rating(cls, v):
        """Ensure rating is 1 (thumbs down) or 5 (thumbs up) for MVP."""
        if v not in [1, 5]:
            raise ValueError("Rating must be 1 (thumbs down) or 5 (thumbs up)")
        return v


class FeedbackResponse(BaseModel):
    """Schema for feedback response."""
    id: UUID
    message_id: UUID
    rating: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Workflow Schemas
# ============================================================================

class WorkflowStatus(BaseModel):
    """Workflow execution status."""
    workflow_id: UUID
    status: str = Field(..., description="pending, running, completed, failed")
    workflow_type: str = Field(..., description="solar_pv, battery, etc.")
    created_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# SSE Event Schemas
# ============================================================================

class SSEEvent(BaseModel):
    """Server-Sent Event schema."""
    event: str = Field(..., description="Event type")
    data: Dict[str, Any] = Field(..., description="Event data")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentProgressEvent(BaseModel):
    """Agent progress update event."""
    stage: str = Field(..., description="Current workflow stage")
    agent: str = Field(..., description="Agent name")
    status: str = Field(..., description="running, completed, failed")
    message: Optional[str] = None
    progress: Optional[float] = Field(None, ge=0.0, le=1.0, description="Progress 0-1")


class PartialResultEvent(BaseModel):
    """Partial result streaming event."""
    content: str = Field(..., description="Partial content")
    content_type: str = Field(default="text", description="Type of content")
    append: bool = Field(default=True, description="Append to existing content")


# ============================================================================
# Health Check Schemas
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(default="healthy")
    version: str
    environment: str
    database_connected: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class APIStatusResponse(BaseModel):
    """API status response."""
    status: str
    classifier_model: str
    agent_model: str
    max_arxiv_results: int
    rate_limit_enabled: bool
    cache_enabled: bool = True

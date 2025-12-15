"""
SQLAlchemy ORM Models for Exergy Lab

Database schema for conversations, messages, workflows, feedback, and caching.
"""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Conversation(Base):
    """Conversation session grouping multiple messages."""

    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    user_id = Column(String(255), nullable=True, comment="For demo mode, can be null")
    title = Column(String(500), nullable=True, comment="Auto-generated from first message")
    metadata = Column(JSONB, nullable=True, comment="Additional session data")

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_conversations_user_id", "user_id"),
        Index("idx_conversations_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<Conversation(id={self.id}, title='{self.title}')>"


class Message(Base):
    """Individual user or assistant message in a conversation."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    role = Column(String(50), nullable=False, comment="user or assistant")
    content = Column(Text, nullable=False, comment="Message text")
    metadata = Column(
        JSONB,
        nullable=True,
        comment="Classification results, workflow info, etc."
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    workflow_executions = relationship(
        "WorkflowExecution",
        back_populates="message",
        cascade="all, delete-orphan"
    )
    feedback = relationship("Feedback", back_populates="message", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_messages_conversation_id", "conversation_id"),
        Index("idx_messages_created_at", "created_at"),
        Index("idx_messages_role", "role"),
    )

    def __repr__(self):
        return f"<Message(id={self.id}, role='{self.role}', content='{self.content[:50]}...')>"


class WorkflowExecution(Base):
    """Track agent workflow executions for analytics."""

    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    workflow_type = Column(
        String(100),
        nullable=False,
        comment="solar_pv, battery, general, etc."
    )
    status = Column(
        String(50),
        nullable=False,
        comment="pending, running, completed, failed"
    )
    results = Column(JSONB, nullable=True, comment="Structured workflow outputs")
    error_message = Column(Text, nullable=True, comment="Error details if failed")
    duration_seconds = Column(Float, nullable=True, comment="Execution time")

    # Relationships
    message = relationship("Message", back_populates="workflow_executions")

    # Indexes
    __table_args__ = (
        Index("idx_workflow_executions_message_id", "message_id"),
        Index("idx_workflow_executions_status", "status"),
        Index("idx_workflow_executions_workflow_type", "workflow_type"),
        Index("idx_workflow_executions_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<WorkflowExecution(id={self.id}, type='{self.workflow_type}', status='{self.status}')>"


class Feedback(Base):
    """User feedback ratings for messages."""

    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    rating = Column(
        Integer,
        nullable=False,
        comment="1 (thumbs down) or 5 (thumbs up)"
    )
    comment = Column(Text, nullable=True, comment="Optional user feedback text")
    metadata = Column(JSONB, nullable=True, comment="Additional feedback context")

    # Relationships
    message = relationship("Message", back_populates="feedback")

    # Indexes
    __table_args__ = (
        Index("idx_feedback_message_id", "message_id"),
        Index("idx_feedback_rating", "rating"),
        Index("idx_feedback_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<Feedback(id={self.id}, rating={self.rating})>"


class APICache(Base):
    """Cache for external API calls to reduce rate limiting."""

    __tablename__ = "api_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    cache_key = Column(
        String(500),
        nullable=False,
        unique=True,
        comment="Hash of API request"
    )
    api_source = Column(
        String(100),
        nullable=False,
        comment="arxiv, pubmed, pubchem, etc."
    )
    response_data = Column(JSONB, nullable=False, comment="Cached API response")
    hit_count = Column(Integer, default=0, comment="Number of cache hits")
    last_accessed = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Indexes
    __table_args__ = (
        Index("idx_api_cache_cache_key", "cache_key"),
        Index("idx_api_cache_expires_at", "expires_at"),
        Index("idx_api_cache_api_source", "api_source"),
        Index("idx_api_cache_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<APICache(id={self.id}, source='{self.api_source}', hits={self.hit_count})>"

    @property
    def is_expired(self) -> bool:
        """Check if cache entry is expired."""
        return datetime.utcnow() > self.expires_at

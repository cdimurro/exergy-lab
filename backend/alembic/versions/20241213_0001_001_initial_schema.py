"""Initial database schema.

Revision ID: 001
Revises:
Create Date: 2024-12-13

Creates all core tables:
- users: User accounts with Clerk integration
- subscriptions: Stripe subscription management
- projects: TEA and Exergy analysis projects
- uploads: File upload tracking
- api_usage: API usage tracking for rate limiting
- discoveries: AI-powered discovery runs
- discovery_hypotheses: Hypotheses generated during discoveries
- materials_searches: Materials Project search cache
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === USERS TABLE ===
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("clerk_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column(
            "tier",
            sa.Enum("free", "professional", "discovery", name="usertier"),
            nullable=False,
            server_default="free",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_clerk_id", "users", ["clerk_id"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # === SUBSCRIPTIONS TABLE ===
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column(
            "tier",
            sa.Enum("free", "professional", "discovery", name="subscriptiontier"),
            nullable=False,
            server_default="free",
        ),
        sa.Column(
            "status",
            sa.Enum(
                "active", "canceled", "incomplete", "incomplete_expired",
                "past_due", "paused", "trialing", "unpaid",
                name="subscriptionstatus"
            ),
            nullable=False,
            server_default="active",
        ),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_stripe_customer_id", "subscriptions", ["stripe_customer_id"], unique=True)
    op.create_index("ix_subscriptions_stripe_subscription_id", "subscriptions", ["stripe_subscription_id"], unique=True)

    # === PROJECTS TABLE ===
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "technology_type",
            sa.Enum(
                "solar_pv", "wind_onshore", "wind_offshore", "battery_storage",
                "hydrogen_green", "hydrogen_blue", "nuclear_smr", "geothermal",
                "hydropower", "biomass", "ccs", "dac", "heat_pump", "ev_charging", "custom",
                name="technologytype"
            ),
            nullable=False,
            server_default="custom",
        ),
        sa.Column(
            "status",
            sa.Enum("draft", "active", "archived", name="projectstatus"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("tea_data", sa.JSON(), nullable=True),
        sa.Column("exergy_data", sa.JSON(), nullable=True),
        sa.Column("ai_insights", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])

    # === UPLOADS TABLE ===
    op.create_table(
        "uploads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("validation_results", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_uploads_user_id", "uploads", ["user_id"])
    op.create_index("ix_uploads_project_id", "uploads", ["project_id"])

    # === API USAGE TABLE ===
    op.create_table(
        "api_usage",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("endpoint", sa.String(255), nullable=False),
        sa.Column("method", sa.String(10), nullable=False, server_default="GET"),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_api_usage_user_id", "api_usage", ["user_id"])
    op.create_index("ix_api_usage_created_at", "api_usage", ["created_at"])

    # === DISCOVERIES TABLE ===
    op.create_table(
        "discoveries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("problem_statement", sa.Text(), nullable=False),
        sa.Column("constraints", sa.JSON(), nullable=True),
        sa.Column("context_files", sa.JSON(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "ingesting", "generating", "screening",
                "researching", "synthesizing", "completed", "failed", "cancelled",
                name="discoverystatus"
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_step", sa.String(100), nullable=True),
        sa.Column("results", sa.JSON(), nullable=True),
        sa.Column("report_path", sa.String(512), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_discoveries_user_id", "discoveries", ["user_id"])
    op.create_index("ix_discoveries_status", "discoveries", ["status"])

    # === DISCOVERY HYPOTHESES TABLE ===
    op.create_table(
        "discovery_hypotheses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("discovery_id", sa.Integer(), nullable=False),
        sa.Column("hypothesis_text", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("feasibility_score", sa.Float(), nullable=True),
        sa.Column("novelty_score", sa.Float(), nullable=True),
        sa.Column("impact_score", sa.Float(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "screening", "passed", "failed", "selected", name="hypothesisstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("simulation_results", sa.JSON(), nullable=True),
        sa.Column("literature_refs", sa.JSON(), nullable=True),
        sa.Column("patent_refs", sa.JSON(), nullable=True),
        sa.Column("tea_summary", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["discovery_id"], ["discoveries.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_discovery_hypotheses_discovery_id", "discovery_hypotheses", ["discovery_id"])
    op.create_index("ix_discovery_hypotheses_score", "discovery_hypotheses", ["score"])

    # === MATERIALS SEARCHES TABLE ===
    op.create_table(
        "materials_searches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("query_params", sa.JSON(), nullable=False),
        sa.Column("results_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("results", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_materials_searches_user_id", "materials_searches", ["user_id"])
    op.create_index("ix_materials_searches_created_at", "materials_searches", ["created_at"])


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table("materials_searches")
    op.drop_table("discovery_hypotheses")
    op.drop_table("discoveries")
    op.drop_table("api_usage")
    op.drop_table("uploads")
    op.drop_table("projects")
    op.drop_table("subscriptions")
    op.drop_table("users")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS hypothesisstatus")
    op.execute("DROP TYPE IF EXISTS discoverystatus")
    op.execute("DROP TYPE IF EXISTS projectstatus")
    op.execute("DROP TYPE IF EXISTS technologytype")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
    op.execute("DROP TYPE IF EXISTS subscriptiontier")
    op.execute("DROP TYPE IF EXISTS usertier")

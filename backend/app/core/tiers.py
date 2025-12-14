"""
Tier-based feature access system.

Pricing:
- Starter: $19.99/month - Basic TEA, global energy dashboard
- Professional: $99/month - Exergy analysis, custom insights, full scenarios
- Discovery: $499/month - AI discovery engine, materials databases, full API
"""

from enum import Enum
from typing import Set


class Tier(str, Enum):
    """Subscription tiers."""

    FREE = "free"  # Limited access for trial
    STARTER = "starter"  # $19.99/month
    PROFESSIONAL = "professional"  # $99/month
    DISCOVERY = "discovery"  # $499/month


class Feature(str, Enum):
    """Platform features mapped to tiers."""

    # === STARTER TIER ($19.99) ===
    # Basic TEA
    BASIC_TEA_CALCULATOR = "basic_tea_calculator"
    TECHNOLOGY_TEMPLATES = "technology_templates"
    LCOE_CALCULATION = "lcoe_calculation"
    PDF_EXPORT_BASIC = "pdf_export_basic"

    # Global Energy Dashboard (View Only)
    ENERGY_DASHBOARD_VIEW = "energy_dashboard_view"
    HISTORICAL_TRENDS = "historical_trends"
    CURRENT_ENERGY_MIX = "current_energy_mix"

    # Data Upload (Limited)
    DATA_UPLOAD_CSV = "data_upload_csv"
    PROJECTS_LIMIT_3 = "projects_limit_3"

    # === PROFESSIONAL TIER ($99) ===
    # Advanced TEA
    FULL_TEA_ENGINE = "full_tea_engine"
    NPV_IRR_ANALYSIS = "npv_irr_analysis"
    SENSITIVITY_ANALYSIS = "sensitivity_analysis"
    SCENARIO_COMPARISON = "scenario_comparison"
    MONTE_CARLO = "monte_carlo"

    # Exergy Analysis (THE MOAT)
    EXERGY_ECONOMIC_ANALYSIS = "exergy_economic_analysis"
    EXERGY_EFFICIENCY_CALC = "exergy_efficiency_calc"
    WORK_DESTRUCTION_ANALYSIS = "work_destruction_analysis"
    THERMODYNAMIC_OPTIMIZATION = "thermodynamic_optimization"

    # Full Global Energy Access
    REGIONAL_ANALYSIS = "regional_analysis"
    SECTORAL_BREAKDOWN = "sectoral_breakdown"
    SCENARIO_PROJECTIONS = "scenario_projections"
    DISPLACEMENT_TRACKING = "displacement_tracking"

    # Custom Insights
    AI_INSIGHTS = "ai_insights"
    CUSTOM_REPORTS = "custom_reports"
    INVESTOR_READY_PDF = "investor_ready_pdf"

    # Collaboration
    TEAM_SEATS_5 = "team_seats_5"
    PROJECT_SHARING = "project_sharing"
    UNLIMITED_PROJECTS = "unlimited_projects"

    # === DISCOVERY TIER ($499) ===
    # AI Discovery Engine
    DISCOVERY_ENGINE = "discovery_engine"
    OUTCOME_BASED_SEARCH = "outcome_based_search"
    CROSS_DOMAIN_SYNTHESIS = "cross_domain_synthesis"
    NOVEL_MATERIAL_DISCOVERY = "novel_material_discovery"

    # Scientific Databases
    MATERIALS_PROJECT_ACCESS = "materials_project_access"
    OPEN_CATALYST_ACCESS = "open_catalyst_access"
    NIST_REFERENCE_DATA = "nist_reference_data"
    CUSTOM_DATASET_UPLOAD = "custom_dataset_upload"

    # Advanced Features
    IP_LANDSCAPE_ANALYSIS = "ip_landscape_analysis"
    LITERATURE_SYNTHESIS = "literature_synthesis"
    TECHNOLOGY_ROADMAPPING = "technology_roadmapping"

    # Enterprise
    API_ACCESS = "api_access"
    UNLIMITED_USERS = "unlimited_users"
    WEBHOOK_NOTIFICATIONS = "webhook_notifications"
    DEDICATED_SUPPORT = "dedicated_support"


# Feature sets by tier
TIER_FEATURES: dict[Tier, Set[Feature]] = {
    Tier.FREE: {
        Feature.BASIC_TEA_CALCULATOR,
        Feature.TECHNOLOGY_TEMPLATES,
        Feature.ENERGY_DASHBOARD_VIEW,
    },
    Tier.STARTER: {
        # All Free features
        Feature.BASIC_TEA_CALCULATOR,
        Feature.TECHNOLOGY_TEMPLATES,
        Feature.LCOE_CALCULATION,
        Feature.PDF_EXPORT_BASIC,
        Feature.ENERGY_DASHBOARD_VIEW,
        Feature.HISTORICAL_TRENDS,
        Feature.CURRENT_ENERGY_MIX,
        Feature.DATA_UPLOAD_CSV,
        Feature.PROJECTS_LIMIT_3,
    },
    Tier.PROFESSIONAL: {
        # All Starter features
        Feature.BASIC_TEA_CALCULATOR,
        Feature.TECHNOLOGY_TEMPLATES,
        Feature.LCOE_CALCULATION,
        Feature.PDF_EXPORT_BASIC,
        Feature.ENERGY_DASHBOARD_VIEW,
        Feature.HISTORICAL_TRENDS,
        Feature.CURRENT_ENERGY_MIX,
        Feature.DATA_UPLOAD_CSV,
        # Professional features
        Feature.FULL_TEA_ENGINE,
        Feature.NPV_IRR_ANALYSIS,
        Feature.SENSITIVITY_ANALYSIS,
        Feature.SCENARIO_COMPARISON,
        Feature.MONTE_CARLO,
        Feature.EXERGY_ECONOMIC_ANALYSIS,
        Feature.EXERGY_EFFICIENCY_CALC,
        Feature.WORK_DESTRUCTION_ANALYSIS,
        Feature.THERMODYNAMIC_OPTIMIZATION,
        Feature.REGIONAL_ANALYSIS,
        Feature.SECTORAL_BREAKDOWN,
        Feature.SCENARIO_PROJECTIONS,
        Feature.DISPLACEMENT_TRACKING,
        Feature.AI_INSIGHTS,
        Feature.CUSTOM_REPORTS,
        Feature.INVESTOR_READY_PDF,
        Feature.TEAM_SEATS_5,
        Feature.PROJECT_SHARING,
        Feature.UNLIMITED_PROJECTS,
    },
    Tier.DISCOVERY: set(),  # Populated below
}

# Fix the recursive reference
TIER_FEATURES[Tier.DISCOVERY] = TIER_FEATURES[Tier.PROFESSIONAL] | {
    Feature.DISCOVERY_ENGINE,
    Feature.OUTCOME_BASED_SEARCH,
    Feature.CROSS_DOMAIN_SYNTHESIS,
    Feature.NOVEL_MATERIAL_DISCOVERY,
    Feature.MATERIALS_PROJECT_ACCESS,
    Feature.OPEN_CATALYST_ACCESS,
    Feature.NIST_REFERENCE_DATA,
    Feature.CUSTOM_DATASET_UPLOAD,
    Feature.IP_LANDSCAPE_ANALYSIS,
    Feature.LITERATURE_SYNTHESIS,
    Feature.TECHNOLOGY_ROADMAPPING,
    Feature.API_ACCESS,
    Feature.UNLIMITED_USERS,
    Feature.WEBHOOK_NOTIFICATIONS,
    Feature.DEDICATED_SUPPORT,
}


def has_feature(user_tier: Tier, feature: Feature) -> bool:
    """Check if a tier has access to a feature."""
    return feature in TIER_FEATURES.get(user_tier, set())


def get_tier_features(tier: Tier) -> Set[Feature]:
    """Get all features available for a tier."""
    return TIER_FEATURES.get(tier, set())


def get_missing_features(user_tier: Tier, required_features: Set[Feature]) -> Set[Feature]:
    """Get features the user is missing."""
    user_features = get_tier_features(user_tier)
    return required_features - user_features


def get_upgrade_tier(feature: Feature) -> Tier:
    """Get the minimum tier required for a feature."""
    for tier in [Tier.STARTER, Tier.PROFESSIONAL, Tier.DISCOVERY]:
        if feature in TIER_FEATURES[tier]:
            return tier
    return Tier.DISCOVERY


# Tier pricing
TIER_PRICING = {
    Tier.FREE: {"monthly": 0, "annual": 0},
    Tier.STARTER: {"monthly": 19.99, "annual": 199},
    Tier.PROFESSIONAL: {"monthly": 99, "annual": 990},
    Tier.DISCOVERY: {"monthly": 499, "annual": 4990},
}

# Project limits by tier
PROJECT_LIMITS = {
    Tier.FREE: 1,
    Tier.STARTER: 3,
    Tier.PROFESSIONAL: -1,  # Unlimited
    Tier.DISCOVERY: -1,  # Unlimited
}

# Team seat limits
SEAT_LIMITS = {
    Tier.FREE: 1,
    Tier.STARTER: 1,
    Tier.PROFESSIONAL: 5,
    Tier.DISCOVERY: -1,  # Unlimited
}

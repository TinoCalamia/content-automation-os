"""Pydantic models for content strategy API."""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List


FunnelStageType = Literal["tofu", "mofu", "bofu"]


class ClassifyRequest(BaseModel):
    """Request to classify a single post."""

    workspace_id: str = Field(..., description="Workspace ID")
    draft_id: str = Field(..., description="Draft ID to classify")


class ClassifyBatchRequest(BaseModel):
    """Request to classify all untagged posts in a workspace."""

    workspace_id: str = Field(..., description="Workspace ID")


class RecommendRequest(BaseModel):
    """Request for content strategy recommendation."""

    workspace_id: str = Field(..., description="Workspace ID")
    time_period: Literal["7d", "30d", "90d", "all"] = Field(
        "30d", description="Time period for analysis"
    )


class ClassificationResult(BaseModel):
    """Result of a single post classification."""

    draft_id: str = Field(..., description="Draft ID")
    funnel_stage: FunnelStageType = Field(..., description="Classified funnel stage")
    confidence: float = Field(..., description="Classification confidence 0-1")
    reasoning: Optional[str] = Field(None, description="Explanation")


class BatchClassificationResult(BaseModel):
    """Result of batch classification."""

    classified: int = Field(..., description="Number of posts classified")
    results: List[ClassificationResult] = Field(
        default_factory=list, description="Individual results"
    )


class FunnelStageCounts(BaseModel):
    """Counts per funnel stage."""

    tofu: int = Field(0, description="TOFU post count")
    mofu: int = Field(0, description="MOFU post count")
    bofu: int = Field(0, description="BOFU post count")
    unclassified: int = Field(0, description="Unclassified post count")


class PlatformDistribution(BaseModel):
    """Funnel distribution for a single platform."""

    platform: str = Field(..., description="Platform name")
    counts: FunnelStageCounts = Field(
        default_factory=FunnelStageCounts, description="Counts per stage"
    )


class FunnelDistribution(BaseModel):
    """Complete funnel distribution response."""

    total: FunnelStageCounts = Field(
        default_factory=FunnelStageCounts, description="Total counts"
    )
    by_platform: List[PlatformDistribution] = Field(
        default_factory=list, description="Per-platform breakdown"
    )
    time_period: str = Field("all", description="Analysis time period")


class StrategyGap(BaseModel):
    """An identified gap in content strategy."""

    stage: FunnelStageType = Field(..., description="Funnel stage with gap")
    severity: Literal["low", "medium", "high"] = Field(
        ..., description="Gap severity"
    )
    description: str = Field(..., description="Gap description")


class ContentRecommendation(BaseModel):
    """A specific content recommendation."""

    stage: FunnelStageType = Field(..., description="Target funnel stage")
    content_type: str = Field(..., description="Suggested content type/angle")
    title: str = Field(..., description="Suggested topic/title")
    description: str = Field(..., description="Why and how")
    platform: str = Field(..., description="Best platform for this")


class PostIdea(BaseModel):
    """A concrete post idea."""

    stage: FunnelStageType = Field(..., description="Target funnel stage")
    platform: str = Field(..., description="Target platform")
    angle: str = Field(..., description="Content angle")
    hook: str = Field(..., description="Suggested opening hook")
    outline: str = Field(..., description="Brief content outline")


class StrategyAnalysis(BaseModel):
    """AI analysis summary."""

    tofu_percentage: float = Field(0, description="TOFU percentage")
    mofu_percentage: float = Field(0, description="MOFU percentage")
    bofu_percentage: float = Field(0, description="BOFU percentage")
    balance_score: int = Field(0, description="Balance score 1-10")
    summary: str = Field("", description="Overall assessment")


class StrategyRecommendation(BaseModel):
    """Complete strategy recommendation response."""

    analysis: StrategyAnalysis = Field(
        default_factory=StrategyAnalysis, description="Distribution analysis"
    )
    gaps: List[StrategyGap] = Field(
        default_factory=list, description="Identified gaps"
    )
    recommendations: List[ContentRecommendation] = Field(
        default_factory=list, description="Content recommendations"
    )
    post_ideas: List[PostIdea] = Field(
        default_factory=list, description="Concrete post ideas"
    )
    distribution: FunnelDistribution = Field(
        default_factory=FunnelDistribution, description="Current distribution"
    )

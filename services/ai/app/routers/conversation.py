"""Conversation analysis endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.scam_analyzer import ScamAnalyzer

router = APIRouter()
analyzer = ScamAnalyzer()


class ConversationRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Conversation text to analyze")
    caller_number: str | None = Field(None, description="Caller phone number")


class AnalysisResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    scam_type: str
    summary: str
    keywords_found: list[str]
    model_version: str


@router.post("/analyze/conversation", response_model=AnalysisResponse)
async def analyze_conversation(request: ConversationRequest):
    """Analyze a phone conversation for potential scam indicators."""
    result = analyzer.analyze(request.text, request.caller_number)
    return result


class QuickCheckRequest(BaseModel):
    text: str = Field(..., min_length=1)


class QuickCheckResponse(BaseModel):
    is_suspicious: bool
    risk_score: int = Field(..., ge=0, le=100)
    reason: str


@router.post("/analyze/quick-check", response_model=QuickCheckResponse)
async def quick_check(request: QuickCheckRequest):
    """Quick scam check for the 'これ詐欺？' button."""
    result = analyzer.analyze(request.text)
    return QuickCheckResponse(
        is_suspicious=result["risk_score"] >= 50,
        risk_score=result["risk_score"],
        reason=result["summary"],
    )

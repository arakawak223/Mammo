"""Call/SMS metadata analysis endpoints (F2)."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.metadata_analyzer import MetadataAnalyzer

router = APIRouter()
analyzer = MetadataAnalyzer()


class MetadataRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number of caller/sender")
    call_type: str = Field("call", description="Type: 'call' or 'sms'")
    sms_content: str | None = Field(None, description="SMS content if applicable")


class MetadataResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    scam_type: str
    summary: str
    keywords_found: list[str]
    reasons: list[str]
    model_version: str


@router.post("/analyze/call-metadata", response_model=MetadataResponse)
async def analyze_call_metadata(request: MetadataRequest):
    """Analyze call or SMS metadata for scam risk indicators."""
    result = analyzer.analyze(
        phone_number=request.phone_number,
        call_type=request.call_type,
        sms_content=request.sms_content,
    )
    return result

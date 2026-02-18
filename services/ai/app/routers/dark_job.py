"""Dark job (闇バイト) checking endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.dark_job_checker import DarkJobChecker

router = APIRouter()
checker = DarkJobChecker()


class DarkJobCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Message or job posting text")
    source: str | None = Field(None, description="Source of the text (sms, sns, etc.)")


class DarkJobCheckResponse(BaseModel):
    is_dark_job: bool
    risk_level: str = Field(..., description="high / medium / low")
    risk_score: int = Field(..., ge=0, le=100)
    keywords_found: list[str]
    explanation: str
    model_version: str


@router.post("/check/dark-job", response_model=DarkJobCheckResponse)
async def check_dark_job(request: DarkJobCheckRequest):
    """Check if a message or job posting is a dark job recruitment."""
    result = checker.check(request.text, request.source)
    return result

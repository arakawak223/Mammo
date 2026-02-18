"""Conversation summary analysis endpoint (F5)."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.scam_analyzer import ScamAnalyzer

router = APIRouter()
analyzer = ScamAnalyzer()

# Recommended actions based on risk level
RECOMMENDED_ACTIONS_BY_RISK = {
    "high": [
        "すぐに電話を切ってください",
        "家族に相談してください",
        "警察相談ダイヤル（#9110）に連絡してください",
        "ATMや銀行には絶対に行かないでください",
    ],
    "medium": [
        "相手の身元を確認してください",
        "家族に内容を共有してください",
        "不審な点があれば消費者ホットライン（188）に相談",
    ],
    "low": [
        "引き続き注意してください",
        "定期的に家族と連絡を取りましょう",
    ],
}


class ConversationSummaryRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Conversation text to summarize")


class ConversationSummaryResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    scam_type: str
    summary: str
    key_points: list[str]
    recommended_actions: list[str]
    keywords_found: list[str]
    model_version: str


def extract_key_points(text: str) -> list[str]:
    """Extract key points from conversation text."""
    points = []
    sentences = [s.strip() for s in text.replace("。", "。\n").split("\n") if s.strip()]

    # Pick important sentences (those containing key indicators)
    important_markers = [
        "お金", "振り込", "送金", "口座", "カード", "暗証番号",
        "今すぐ", "急いで", "警察", "役所", "銀行",
        "息子", "娘", "孫", "事故", "病院",
    ]

    for sentence in sentences[:10]:  # Limit to first 10 sentences
        for marker in important_markers:
            if marker in sentence:
                points.append(sentence[:80])
                break

    if not points and sentences:
        # If no important markers found, just take first few sentences
        points = [s[:80] for s in sentences[:3]]

    return points[:5]  # Max 5 key points


@router.post("/analyze/conversation-summary", response_model=ConversationSummaryResponse)
async def analyze_conversation_summary(request: ConversationSummaryRequest):
    """Analyze and summarize a conversation report from elderly user."""
    result = analyzer.analyze(request.text)

    risk_score = result["risk_score"]
    key_points = extract_key_points(request.text)

    if risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return ConversationSummaryResponse(
        risk_score=risk_score,
        scam_type=result["scam_type"],
        summary=result["summary"],
        key_points=key_points,
        recommended_actions=RECOMMENDED_ACTIONS_BY_RISK[risk_level],
        keywords_found=result["keywords_found"],
        model_version=result["model_version"],
    )

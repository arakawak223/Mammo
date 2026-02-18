"""着信/SMSメタデータ解析エンドポイント（F2）"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.metadata_analyzer import MetadataAnalyzer

router = APIRouter()
analyzer = MetadataAnalyzer()


class MetadataRequest(BaseModel):
    phone_number: str = Field(..., description="発信者/送信者の電話番号")
    call_type: str = Field("call", description="種類: 'call'（着信）または 'sms'（SMS）")
    sms_content: str | None = Field(None, description="SMSの本文（該当する場合）")


class MetadataResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100, description="リスクスコア（0〜100）")
    scam_type: str = Field(..., description="検出された詐欺タイプ")
    summary: str = Field(..., description="解析結果の要約")
    keywords_found: list[str] = Field(..., description="検出されたキーワード一覧")
    reasons: list[str] = Field(..., description="判定理由の一覧")
    model_version: str = Field(..., description="使用モデルのバージョン")


@router.post(
    "/analyze/call-metadata",
    response_model=MetadataResponse,
    summary="着信メタデータ解析",
    description="着信やSMSのメタデータ（電話番号、SMS内容等）から詐欺リスクを判定します。",
)
async def analyze_call_metadata(request: MetadataRequest):
    """着信やSMSのメタデータから詐欺リスクを判定します。"""
    result = analyzer.analyze(
        phone_number=request.phone_number,
        call_type=request.call_type,
        sms_content=request.sms_content,
    )
    return result

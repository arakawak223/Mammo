"""会話解析エンドポイント"""

from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.services.scam_analyzer import ScamAnalyzer

router = APIRouter()
analyzer = ScamAnalyzer()


class ConversationRequest(BaseModel):
    model_config = {"json_schema_extra": {"title": "会話解析リクエスト"}}
    text: str = Field(..., min_length=1, description="解析対象の会話テキスト")
    caller_number: str | None = Field(None, description="発信者の電話番号")


class AnalysisResponse(BaseModel):
    model_config = {"json_schema_extra": {"title": "会話解析レスポンス"}}
    risk_score: int = Field(..., ge=0, le=100, description="リスクスコア（0〜100）")
    scam_type: str = Field(..., description="検出された詐欺タイプ")
    summary: str = Field(..., description="解析結果の要約")
    keywords_found: list[str] = Field(..., description="検出されたキーワード一覧")
    model_version: str = Field(..., description="使用モデルのバージョン")


@router.post(
    "/analyze/conversation",
    response_model=AnalysisResponse,
    summary="会話テキスト解析",
    description="通話内容のテキストを解析し、詐欺の可能性を判定します。",
    responses={
        200: {"description": "解析成功"},
        422: {"description": "入力値バリデーションエラー"},
    },
)
async def analyze_conversation(request: ConversationRequest):
    """通話内容のテキストを解析し、詐欺の可能性を判定します。"""
    result = analyzer.analyze(request.text, request.caller_number)
    return result


class QuickCheckRequest(BaseModel):
    model_config = {"json_schema_extra": {"title": "クイックチェックリクエスト"}}
    text: str = Field(..., min_length=1, description="チェック対象のテキスト")


class QuickCheckResponse(BaseModel):
    model_config = {"json_schema_extra": {"title": "クイックチェックレスポンス"}}
    is_suspicious: bool = Field(..., description="詐欺の疑いがあるか")
    risk_score: int = Field(..., ge=0, le=100, description="リスクスコア（0〜100）")
    reason: str = Field(..., description="判定理由")


@router.post(
    "/analyze/quick-check",
    response_model=QuickCheckResponse,
    summary="クイックチェック",
    description="「これ詐欺？」ボタン用の簡易チェックを実行します。",
    responses={
        200: {"description": "チェック成功"},
        422: {"description": "入力値バリデーションエラー"},
    },
)
async def quick_check(request: QuickCheckRequest):
    """「これ詐欺？」ボタン用の簡易チェックを実行します。"""
    result = analyzer.analyze(request.text)
    return QuickCheckResponse(
        is_suspicious=result["risk_score"] >= 50,
        risk_score=result["risk_score"],
        reason=result["summary"],
    )

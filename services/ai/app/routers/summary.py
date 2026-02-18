"""会話サマリー解析エンドポイント（F5）"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.scam_analyzer import ScamAnalyzer

router = APIRouter()
analyzer = ScamAnalyzer()

# リスクレベル別の推奨アクション
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
    model_config = {"json_schema_extra": {"title": "会話サマリーリクエスト"}}
    text: str = Field(..., min_length=1, description="要約対象の会話テキスト")


class ConversationSummaryResponse(BaseModel):
    model_config = {"json_schema_extra": {"title": "会話サマリーレスポンス"}}
    risk_score: int = Field(..., ge=0, le=100, description="リスクスコア（0〜100）")
    scam_type: str = Field(..., description="検出された詐欺タイプ")
    summary: str = Field(..., description="会話内容の要約")
    key_points: list[str] = Field(..., description="会話の重要ポイント")
    recommended_actions: list[str] = Field(..., description="推奨アクション一覧")
    keywords_found: list[str] = Field(..., description="検出されたキーワード一覧")
    model_version: str = Field(..., description="使用モデルのバージョン")


def extract_key_points(text: str) -> list[str]:
    """会話テキストから重要ポイントを抽出する。"""
    points = []
    sentences = [s.strip() for s in text.replace("。", "。\n").split("\n") if s.strip()]

    important_markers = [
        "お金", "振り込", "送金", "口座", "カード", "暗証番号",
        "今すぐ", "急いで", "警察", "役所", "銀行",
        "息子", "娘", "孫", "事故", "病院",
    ]

    for sentence in sentences[:10]:
        for marker in important_markers:
            if marker in sentence:
                points.append(sentence[:80])
                break

    if not points and sentences:
        points = [s[:80] for s in sentences[:3]]

    return points[:5]


@router.post(
    "/analyze/conversation-summary",
    response_model=ConversationSummaryResponse,
    summary="会話サマリー解析",
    description="高齢者から報告された通話内容を要約し、リスク評価・重要ポイント・推奨アクションを返します。",
    responses={
        200: {"description": "解析成功"},
        422: {"description": "入力値バリデーションエラー"},
    },
)
async def analyze_conversation_summary(request: ConversationSummaryRequest):
    """高齢者から報告された通話内容を要約し、リスク評価と推奨アクションを返します。"""
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

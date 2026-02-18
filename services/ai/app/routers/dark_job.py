"""闇バイトチェックエンドポイント"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.dark_job_checker import DarkJobChecker

router = APIRouter()
checker = DarkJobChecker()


class DarkJobCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, description="チェック対象のメッセージまたは求人テキスト")
    source: str | None = Field(None, description="テキストの出典（sms, sns など）")


class DarkJobCheckResponse(BaseModel):
    is_dark_job: bool = Field(..., description="闇バイトの疑いがあるか")
    risk_level: str = Field(..., description="リスクレベル（high / medium / low）")
    risk_score: int = Field(..., ge=0, le=100, description="リスクスコア（0〜100）")
    keywords_found: list[str] = Field(..., description="検出されたキーワード一覧")
    explanation: str = Field(..., description="判定結果の説明")
    model_version: str = Field(..., description="使用モデルのバージョン")


@router.post(
    "/check/dark-job",
    response_model=DarkJobCheckResponse,
    summary="闇バイトチェック",
    description="メッセージや求人投稿が闇バイト（犯罪的アルバイト）の勧誘かどうかを判定します。",
)
async def check_dark_job(request: DarkJobCheckRequest):
    """メッセージや求人投稿が闇バイトの勧誘かどうかを判定します。"""
    result = checker.check(request.text, request.source)
    return result

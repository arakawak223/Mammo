"""闇バイトチェックエンドポイント"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.dark_job_checker import DarkJobChecker
from app.services.ocr_service import OcrService

router = APIRouter()
checker = DarkJobChecker()
ocr_service = OcrService()


class DarkJobCheckRequest(BaseModel):
    model_config = {"json_schema_extra": {"title": "闇バイトチェックリクエスト"}}
    text: str = Field(..., min_length=1, description="チェック対象のメッセージまたは求人テキスト")
    source: str | None = Field(None, description="テキストの出典（sms, sns など）")


class DarkJobImageCheckRequest(BaseModel):
    model_config = {"json_schema_extra": {"title": "闇バイト画像チェックリクエスト"}}
    image_base64: str = Field(..., min_length=1, description="Base64エンコードされた画像データ")
    source: str | None = Field(None, description="画像の出典（screenshot, photo など）")


class DarkJobCheckResponse(BaseModel):
    model_config = {"json_schema_extra": {"title": "闇バイトチェックレスポンス"}}
    is_dark_job: bool = Field(..., description="闇バイトの疑いがあるか")
    risk_level: str = Field(..., description="リスクレベル（high / medium / low）")
    risk_score: int = Field(..., ge=0, le=100, description="リスクスコア（0〜100）")
    keywords_found: list[str] = Field(..., description="検出されたキーワード一覧")
    explanation: str = Field(..., description="判定結果の説明")
    model_version: str = Field(..., description="使用モデルのバージョン")
    extracted_text: str | None = Field(None, description="OCRで抽出されたテキスト（画像入力時のみ）")


@router.post(
    "/check/dark-job",
    response_model=DarkJobCheckResponse,
    summary="闇バイトチェック",
    description="メッセージや求人投稿が闇バイト（犯罪的アルバイト）の勧誘かどうかを判定します。",
    responses={
        200: {"description": "チェック成功"},
        422: {"description": "入力値バリデーションエラー"},
    },
)
async def check_dark_job(request: DarkJobCheckRequest):
    """メッセージや求人投稿が闇バイトの勧誘かどうかを判定します。"""
    result = checker.check(request.text, request.source)
    return result


@router.post(
    "/check/dark-job-image",
    response_model=DarkJobCheckResponse,
    summary="闇バイト画像チェック（OCR付き）",
    description="スクリーンショットや写真からOCRでテキストを抽出し、闇バイト判定を実行します。",
    responses={
        200: {"description": "チェック成功"},
        422: {"description": "入力値バリデーションエラー"},
    },
)
async def check_dark_job_image(request: DarkJobImageCheckRequest):
    """画像からOCRでテキスト抽出→闇バイト判定"""
    extracted_text = ocr_service.extract_text(request.image_base64)

    if not extracted_text:
        return DarkJobCheckResponse(
            is_dark_job=False,
            risk_level="low",
            risk_score=0,
            keywords_found=[],
            explanation="画像からテキストを抽出できませんでした。テキスト入力をお試しください。",
            model_version="ocr-fallback-v0.1.0",
            extracted_text="",
        )

    result = checker.check(extracted_text, request.source or "image_ocr")
    result["extracted_text"] = extracted_text
    return result

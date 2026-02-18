"""ヘルスチェックエンドポイント"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="ヘルスチェック", description="サービスの稼働状態を確認します。")
async def health_check():
    """サービスの稼働状態を確認します。"""
    return {"status": "ok", "service": "mamoritalk-ai"}

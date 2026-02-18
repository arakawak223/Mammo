"""ヘルスチェックエンドポイント"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()

_start_time = time.time()


@router.get(
    "/health",
    summary="ヘルスチェック",
    description="サービスの稼働状態を確認します。",
    responses={200: {"description": "正常稼働中"}},
)
async def health_check():
    """サービスの稼働状態を確認します。"""
    return {
        "status": "ok",
        "service": "mamoritalk-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": int(time.time() - _start_time),
    }

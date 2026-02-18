"""構造化ログ設定"""

import logging
import sys

from pythonjsonlogger.json import JsonFormatter

from app.config import get_settings


def setup_logging() -> None:
    """アプリケーションのログ設定を初期化する。"""
    settings = get_settings()
    is_production = settings.is_production
    log_level = settings.log_level

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # 既存ハンドラをクリア
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if is_production:
        formatter = JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # uvicornのログも統一
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uv_logger = logging.getLogger(logger_name)
        uv_logger.handlers.clear()
        uv_logger.propagate = True

"""アプリケーション設定（環境変数から自動読み込み）

起動時に環境変数をバリデーションし、型安全な設定オブジェクトとして提供します。
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定（環境変数から自動読み込み）"""

    # AI モデル設定
    ai_model_name: str = Field(
        default="gemini-pro",
        description="使用するAIモデル名",
    )

    # ログ設定
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="ログレベル",
    )

    # サーバー設定
    port: int = Field(
        default=8000,
        ge=1,
        le=65535,
        description="サーバーポート番号",
    )

    # 環境
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="実行環境",
    )

    # CORS設定（本番環境用）
    cors_origins: str = Field(
        default="",
        description="許可するCORSオリジン（カンマ区切り）",
    )

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
    }

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, v: str) -> str:
        """ログレベルを大文字に正規化する。"""
        if isinstance(v, str):
            return v.upper()
        return v

    @property
    def is_production(self) -> bool:
        """本番環境かどうかを返す。"""
        return self.environment == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        """CORSオリジンをリストで返す。"""
        if not self.cors_origins:
            return []
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを返す（キャッシュ付き）。"""
    return Settings()

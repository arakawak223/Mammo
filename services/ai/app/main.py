"""まもりトーク AI解析サービス"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import conversation, dark_job, health, metadata, summary

app = FastAPI(
    title="まもりトーク AI解析サービス",
    description="詐欺検知・闇バイトチェック・会話サマリーなどのAI解析APIを提供します。",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["ヘルスチェック"])
app.include_router(conversation.router, prefix="/api/v1", tags=["会話解析"])
app.include_router(dark_job.router, prefix="/api/v1", tags=["闇バイトチェック"])
app.include_router(metadata.router, prefix="/api/v1", tags=["着信メタデータ解析"])
app.include_router(summary.router, prefix="/api/v1", tags=["会話サマリー"])

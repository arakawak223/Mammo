"""MamoriTalk AI Analysis Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import conversation, dark_job, health, metadata

app = FastAPI(
    title="MamoriTalk AI Service",
    version="0.1.0",
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

app.include_router(health.router, tags=["health"])
app.include_router(conversation.router, prefix="/api/v1", tags=["conversation"])
app.include_router(dark_job.router, prefix="/api/v1", tags=["dark_job"])
app.include_router(metadata.router, prefix="/api/v1", tags=["metadata"])

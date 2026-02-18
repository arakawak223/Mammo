"""まもりトーク AI解析サービス"""

import json
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import HTMLResponse

from app.logging_config import setup_logging
from app.routers import conversation, dark_job, health, metadata, summary

# ログ初期化
setup_logging()
logger = logging.getLogger(__name__)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"


# グレースフルシャットダウン
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI service starting up")
    yield
    logger.info("AI service shutting down gracefully")


# リクエストサイズ制限ミドルウェア（1MB）
MAX_REQUEST_SIZE = 1 * 1024 * 1024  # 1MB


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_SIZE:
            return JSONResponse(
                status_code=413,
                content={"detail": "リクエストボディが大きすぎます（上限: 1MB）"},
            )
        return await call_next(request)


# WP-1: セキュリティヘッダーミドルウェア
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


# WP-3: 相関IDミドルウェア
class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        # ログにリクエストID付与
        logger_ctx = logging.LoggerAdapter(
            logging.getLogger("request"),
            {"request_id": request_id},
        )
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# WP-6: Prometheusメトリクスミドルウェア
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"],
)
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response: Response = await call_next(request)
        duration = time.time() - start
        path = request.url.path
        http_requests_total.labels(
            method=request.method, path=path, status_code=response.status_code
        ).inc()
        http_request_duration_seconds.labels(
            method=request.method, path=path
        ).observe(duration)
        return response


# WP-2: リクエストログミドルウェア
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response: Response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 2)
        request_id = getattr(request.state, "request_id", "-")
        logger.info(
            "request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "request_id": request_id,
            },
        )
        return response


app = FastAPI(
    title="まもりトーク AI解析サービス",
    description="詐欺検知・闇バイトチェック・会話サマリーなどのAI解析APIを提供します。",
    version="0.2.0",
    docs_url=None,  # カスタムdocsを使用するため無効化
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ミドルウェア登録（逆順で実行される）
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(CorrelationIdMiddleware)

# WP-3: CORS環境別ホワイトリスト
if IS_PRODUCTION:
    cors_origins_str = os.getenv("CORS_ORIGINS", "")
    cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]
else:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# WP-4: グローバル例外ハンドラ
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception: %s",
        str(exc),
        extra={"request_id": request_id},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "statusCode": 500,
            "error": "Internal Server Error",
            "message": "予期しないエラーが発生しました",
            "requestId": request_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime()),
        },
    )


app.include_router(health.router, tags=["ヘルスチェック"])
app.include_router(conversation.router, prefix="/api/v1", tags=["会話解析"])
app.include_router(dark_job.router, prefix="/api/v1", tags=["闇バイトチェック"])
app.include_router(metadata.router, prefix="/api/v1", tags=["着信メタデータ解析"])
app.include_router(summary.router, prefix="/api/v1", tags=["会話サマリー"])


# WP-6: Prometheusメトリクスエンドポイント
@app.get("/metrics", include_in_schema=False)
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ── スキーマ名の日本語マッピング ──
SCHEMA_RENAMES = {
    "AnalysisResponse": "会話解析レスポンス",
    "ConversationRequest": "会話解析リクエスト",
    "ConversationSummaryRequest": "会話サマリーリクエスト",
    "ConversationSummaryResponse": "会話サマリーレスポンス",
    "DarkJobCheckRequest": "闇バイトチェックリクエスト",
    "DarkJobCheckResponse": "闘バイトチェックレスポンス",
    "MetadataRequest": "メタデータ解析リクエスト",
    "MetadataResponse": "メタデータ解析レスポンス",
    "QuickCheckRequest": "クイックチェックリクエスト",
    "QuickCheckResponse": "クイックチェックレスポンス",
    "HTTPValidationError": "HTTPバリデーションエラー",
    "ValidationError": "バリデーションエラー詳細",
}

_original_openapi = app.openapi


def custom_openapi():
    schema = _original_openapi()

    # スキーマキー名を日本語に書き換え
    components = schema.get("components", {}).get("schemas", {})
    schema_json = json.dumps(schema, ensure_ascii=False)
    for old_name, new_name in SCHEMA_RENAMES.items():
        # $ref パスと schemas キーの両方を置換
        schema_json = schema_json.replace(
            f'"#/components/schemas/{old_name}"', f'"#/components/schemas/{new_name}"'
        )
    schema = json.loads(schema_json)

    # スキーマオブジェクト自体のキーを書き換え
    components = schema.get("components", {}).get("schemas", {})
    new_components = {}
    for key, value in components.items():
        new_key = SCHEMA_RENAMES.get(key, key)
        value["title"] = SCHEMA_RENAMES.get(key, value.get("title", key))
        new_components[new_key] = value
    schema["components"]["schemas"] = new_components

    return schema


app.openapi = custom_openapi


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    """Swagger UIを日本語化したカスタムページ"""
    return HTMLResponse(
        content=f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>{app.title}</title>
    <link rel="stylesheet" type="text/css"
          href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        html {{ box-sizing: border-box; overflow-y: scroll; }}
        *, *:before, *:after {{ box-sizing: inherit; }}
        body {{ margin: 0; background: #fafafa; }}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {{
        const ui = SwaggerUIBundle({{
            url: "/openapi.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
        }});

        // DOM書き換えによる日本語化（MutationObserver）
        const translations = {{
            // セクション見出し
            'Parameters': 'パラメータ',
            'No parameters': 'パラメータなし',
            'Responses': 'レスポンス',
            'Response body': 'レスポンスボディ',
            'Request body': 'リクエストボディ',
            'Request body - required': 'リクエストボディ（必須）',
            'Description': '説明',
            'Schemas': 'スキーマ一覧',

            // ボタン・操作
            'Try it out': '試してみる',
            'Execute': '実行',
            'Cancel': 'キャンセル',
            'Clear': 'クリア',
            'Download': 'ダウンロード',
            'Authorize': '認証',
            'Copy to clipboard': 'クリップボードにコピー',
            'Copied!': 'コピーしました！',

            // 展開・折りたたみ
            'Expand all': 'すべて展開',
            'Collapse all': 'すべて折りたたむ',
            'Expand operation': '操作を展開',
            'Collapse operation': '操作を折りたたむ',

            // レスポンス関連
            'Request URL': 'リクエストURL',
            'Server response': 'サーバーレスポンス',
            'Response headers': 'レスポンスヘッダー',
            'Media type': 'メディアタイプ',
            'Controls Accept header.': 'Acceptヘッダーを制御します。',
            'Example Value': '例',
            'Schema': 'スキーマ',
            'No links': 'リンクなし',
            'Links': 'リンク',
            'No headers': 'ヘッダーなし',
            'Headers': 'ヘッダー',

            // 型名
            'object': 'オブジェクト',
            'array': '配列',
            'string': '文字列',
            'integer': '整数',
            'number': '数値',
            'boolean': '真偽値',
            'null': 'null値',

            // その他
            'required': '必須',
            'Items': '要素',
            'Any of': 'いずれか',
            'One of': 'いずれか一つ',
            'All of': 'すべて',
            'Default': 'デフォルト',
            'Loading...': '読み込み中...',
            'Failed to load API definition.': 'API定義の読み込みに失敗しました。',

            // Successful Response はOpenAPIで上書き済だが念のため
            'Successful Response': '正常レスポンス',
            'Validation Error': '入力値バリデーションエラー',
        }};

        function translateNode(node) {{
            if (node.nodeType === Node.TEXT_NODE) {{
                const text = node.textContent.trim();
                if (text && translations[text]) {{
                    node.textContent = node.textContent.replace(text, translations[text]);
                }}
            }} else if (node.nodeType === Node.ELEMENT_NODE) {{
                if (node.placeholder && translations[node.placeholder]) {{
                    node.placeholder = translations[node.placeholder];
                }}
                if (node.title && translations[node.title]) {{
                    node.title = translations[node.title];
                }}
                node.childNodes.forEach(translateNode);
            }}
        }}

        const observer = new MutationObserver(function(mutations) {{
            mutations.forEach(function(mutation) {{
                mutation.addedNodes.forEach(function(node) {{
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {{
                        translateNode(node);
                    }}
                }});
            }});
        }});

        observer.observe(document.body, {{
            childList: true,
            subtree: true
        }});

        // 初回＋遅延翻訳（Swagger UIのレンダリング完了を待つ）
        [500, 1500, 3000, 5000].forEach(function(ms) {{
            setTimeout(function() {{
                const root = document.getElementById('swagger-ui');
                if (root) translateNode(root);
            }}, ms);
        }});

        window.ui = ui;
    }};
    </script>
</body>
</html>
""",
        status_code=200,
    )

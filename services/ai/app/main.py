"""まもりトーク AI解析サービス"""

import json
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse

from app.routers import conversation, dark_job, health, metadata, summary

app = FastAPI(
    title="まもりトーク AI解析サービス",
    description="詐欺検知・闇バイトチェック・会話サマリーなどのAI解析APIを提供します。",
    version="0.2.0",
    docs_url=None,  # カスタムdocsを使用するため無効化
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

# ── スキーマ名の日本語マッピング ──
SCHEMA_RENAMES = {
    "AnalysisResponse": "会話解析レスポンス",
    "ConversationRequest": "会話解析リクエスト",
    "ConversationSummaryRequest": "会話サマリーリクエスト",
    "ConversationSummaryResponse": "会話サマリーレスポンス",
    "DarkJobCheckRequest": "闇バイトチェックリクエスト",
    "DarkJobCheckResponse": "闇バイトチェックレスポンス",
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

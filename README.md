# まもりトーク (MamoriTalk)

特殊詐欺・強盗対策アプリ — 高齢者と家族をつなぐ安心プラットフォーム

## 概要

まもりトークは、高齢者を特殊詐欺や闇バイトなどの犯罪から守るためのモバイルアプリケーションです。AI音声解析、リアルタイムアラート、緊急SOS機能を備え、家族と連携して高齢者の安全を支援します。

## アーキテクチャ

```
Mammo/
├── apps/
│   └── mobile/              # React Native (Expo) モバイルアプリ
├── services/
│   ├── api/                 # NestJS バックエンドAPI
│   └── ai/                  # FastAPI AI解析サービス
├── packages/
│   └── shared/              # 共有型定義・定数
├── infrastructure/
│   └── terraform/           # Terraform IaC (AWS)
├── .github/
│   └── workflows/           # CI/CD (GitHub Actions)
└── docker-compose.yml       # ローカル開発環境
```

### 技術スタック

| レイヤー | 技術 |
|----------|------|
| モバイル | React Native (Expo), TypeScript, Zustand |
| バックエンドAPI | NestJS 10, Prisma ORM, Socket.IO |
| AI サービス | FastAPI, Pydantic v2 |
| データベース | PostgreSQL 16, Redis 7 |
| 認証 | JWT + bcrypt, 電話番号ベース登録 |
| インフラ | AWS (ECS Fargate, RDS, ElastiCache, ALB, WAF) |
| CI/CD | GitHub Actions |
| 監視 | Prometheus (prom-client), CloudWatch |

## 主な機能

| 機能 | 説明 |
|------|------|
| F1: 詐欺ボタン | 「これ詐欺？」ワンタップ通報 |
| F2: 自動転送 | 不審な着信・SMSの自動検出 |
| F3: AI音声解析 | 通話内容のリアルタイム詐欺判定 |
| F4: リアルタイムアラート | WebSocketによる即座の家族通知 |
| F5: 会話サマリー | AI要約+リスクスコア |
| F6: リモートブロック | 家族からの遠隔着信拒否 |
| F7: 闇バイトチェッカー | 求人メッセージの危険度判定 |
| F8: 被害統計 | 都道府県別の詐欺被害データ |
| F9: 緊急SOS | 位置情報+音声のリアルタイム共有 |

## セットアップ

### 前提条件

- Node.js >= 20
- Python >= 3.11
- PostgreSQL 16+
- Redis 7+

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd Mammo

# 依存関係のインストール（ワークスペース全体）
npm install

# Prismaクライアント生成
cd services/api && npx prisma generate

# データベースマイグレーション
npx prisma migrate dev

# 統計シードデータ投入（任意）
npm run seed:statistics
```

### Docker によるセットアップ（推奨）

Docker Compose を使用すると、PostgreSQL・Redis・API・AIサービスをまとめて起動できます。

```bash
docker compose up -d
```

サービス一覧:

| サービス | ポート | 説明 |
|----------|--------|------|
| `api` | 3000 | NestJS バックエンドAPI |
| `ai` | 8000 | FastAPI AI解析サービス |
| `postgres` | 5432 | PostgreSQL データベース |
| `redis` | 6379 | Redis キャッシュ |

### 環境変数

`.env` ファイルを各サービスディレクトリに作成してください。テンプレートをコピーして編集します。

```bash
# API サービスの環境変数テンプレート
cp services/api/.env.example services/api/.env
```

#### 開発環境の設定例

```bash
# services/api/.env
DATABASE_URL=postgresql://mamori:mamori_dev@localhost:5432/mamori_talk
JWT_SECRET=change-this-in-production
JWT_REFRESH_SECRET=change-this-refresh-in-production
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
PORT=3000
NODE_ENV=development

# services/ai/.env
ENVIRONMENT=development
LOG_LEVEL=INFO
```

本番環境の設定例はルートの `.env.production.example` を参照してください。

### 開発サーバー起動

```bash
# APIサーバー（NestJS）
npm run api:dev

# AIサービス（FastAPI）
cd services/ai && uvicorn app.main:app --reload --port 8000

# モバイルアプリ（Expo）
npm run mobile:start
```

## テスト

### API テスト（Jest）

17のユニットテストスイート + E2Eテスト:

```bash
# ユニットテスト
npm run api:test

# カバレッジ付きテスト
cd services/api && npm run test:cov

# E2Eテスト（PostgreSQL + Redis が必要）
cd services/api && npm run test:e2e
```

### AI テスト（pytest）

```bash
cd services/ai && python -m pytest tests/ -v
```

### 全テスト一括実行

```bash
# API + AI テスト
npm run api:test && cd services/ai && python -m pytest tests/ -v
```

## API ドキュメント

開発サーバー起動後、Swagger UIにアクセスできます（日本語対応済み）:

```
http://localhost:3000/docs
```

API プレフィックス: `/api/v1`

主要エンドポイント:

| エンドポイント | 説明 |
|----------------|------|
| `POST /api/v1/auth/register` | ユーザー登録 |
| `POST /api/v1/auth/login` | ログイン |
| `POST /api/v1/ai/analyze-voice` | AI音声解析 |
| `POST /api/v1/ai/check-dark-job` | 闇バイトチェック |
| `POST /api/v1/sos/activate` | 緊急SOS発動 |
| `GET /api/v1/statistics/prefectures` | 都道府県別統計 |
| `GET /api/v1/health` | ヘルスチェック |

## インフラストラクチャ

AWS上のインフラはTerraformで管理:

| コンポーネント | 説明 |
|----------------|------|
| **ECS Fargate** | API + AIサービス（オートスケーリング付き） |
| **RDS PostgreSQL** | データベース（Multi-AZ、自動バックアップ） |
| **ElastiCache Redis** | キャッシュ・レート制限・セッション |
| **ALB** | ロードバランサー（HTTPS/TLS 1.3） |
| **WAF v2** | SQLi/XSS防御、レート制限 |
| **CloudWatch** | ログ・メトリクス・アラーム |
| **S3** | 静的アセット・バックアップ |
| **VPC** | ネットワーク分離・セキュリティグループ |

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

設定例は `infrastructure/terraform/terraform.tfvars.example` を参照してください。

## セキュリティ

- **JWT認証**: アクセストークン15分 + リフレッシュトークン30日
- **トークンブラックリスト**: Redis管理、ログアウト時即座無効化
- **アカウントロック**: 5回失敗で30分ロック
- **パスワードハッシュ**: bcrypt（コスト12）
- **セキュリティヘッダー**: Helmet
- **入力サニタイズ**: HTML/XSSストリップ
- **レート制限**: グローバル60req/min、AI 5-10req/min（@nestjs/throttler）
- **監査ログ**: 認証・ペアリング・SOS操作の記録
- **WAF**: SQLインジェクション・XSS防御（AWS WAF v2）
- **TLS**: HTTPS強制、TLS 1.3
- **ネットワーク分離**: VPC内プライベートサブネット

## CI/CD

GitHub Actionsで自動化:

### CI パイプライン（`ci.yml`）

PRおよびmain/developブランチへのプッシュ時に実行:

- API ユニットテスト（Jest）
- API E2Eテスト（PostgreSQL + Redis連携）
- API ビルドチェック
- AI テスト（pytest）
- 共有パッケージ型チェック（TypeScript）
- モバイル型チェック（TypeScript）
- Docker イメージビルド（API + AI）
- セキュリティスキャン（npm audit, pip-audit, Trivy, GitLeaks）

### CD パイプライン（`cd.yml`）

mainブランチへのマージ時に自動デプロイ:

1. テスト（最終確認）
2. Docker イメージビルド
3. ECR へプッシュ
4. ECS サービス更新（ローリングデプロイ）
5. デプロイ完了待機

## プロジェクト構成の詳細

```
services/api/src/
├── auth/              # 認証（JWT, ログイン, 登録）
├── users/             # ユーザー管理
├── pairings/          # 家族ペアリング
├── ai/                # AI解析連携（音声解析, 闇バイト）
├── events/            # イベント・自動転送
├── sos/               # 緊急SOS（WebSocket）
├── blocklist/         # リモートブロック
├── statistics/        # 被害統計
├── notifications/     # プッシュ通知（Firebase）
├── health/            # ヘルスチェック
├── tasks/             # 定期タスク（クリーンアップ）
├── prisma/            # Prismaデータベースモジュール
└── common/            # 共通ユーティリティ（サーキットブレーカー、パイプ等）
```

## ライセンス

Private -- All rights reserved.

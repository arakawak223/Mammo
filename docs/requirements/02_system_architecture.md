# システム構成・技術スタック

---

## 1. 全体アーキテクチャ

```
┌──────────────────────────────────────────────────────────────────┐
│                        クライアント層                              │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │  高齢者アプリ (A)    │    │  家族アプリ (B)                  │  │
│  │  ─────────────────   │    │  ────────────────────────────   │  │
│  │  React Native        │    │  React Native                  │  │
│  │  (Android主軸/iOS)   │    │  (iOS / Android)               │  │
│  │                      │    │                                │  │
│  │  • 巨大ボタンUI      │    │  • ダッシュボード               │  │
│  │  • バックグラウンド   │    │  • アラート一覧                │  │
│  │    監視サービス       │    │  • リモートブロック管理         │  │
│  │  • 音声アシスタント   │    │  • 会話サマリー閲覧            │  │
│  │  • 緊急SOS           │    │  • 統計・アドバイス            │  │
│  │                      │    │  • 闇バイトチェッカー           │  │
│  └──────────┬───────────┘    └──────────────┬──────────────────┘  │
│             │                                │                    │
└─────────────┼────────────────────────────────┼────────────────────┘
              │          HTTPS / WSS           │
              ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API Gateway 層                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  API Gateway (AWS API Gateway or Cloud Endpoints)        │    │
│  │  • 認証 (JWT)                                            │    │
│  │  • レート制限                                             │    │
│  │  • WebSocket 管理（緊急SOS用）                            │    │
│  └──────────────────────────────┬───────────────────────────┘    │
│                                 │                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      バックエンド層                                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ アラート      │  │ ユーザー      │  │ AI解析              │     │
│  │ サービス      │  │ サービス      │  │ サービス            │     │
│  │ (Node.js)    │  │ (Node.js)    │  │ (Python/FastAPI)   │     │
│  │              │  │              │  │                    │     │
│  │ • イベント   │  │ • 認証/認可  │  │ • STT              │     │
│  │   受信・配信 │  │ • ペアリング │  │ • テキスト解析     │     │
│  │ • プッシュ   │  │ • プロフィル │  │ • スコアリング     │     │
│  │   通知       │  │ • ブロック   │  │ • 闇バイト判定     │     │
│  │ • 緊急SOS   │  │   リスト管理 │  │                    │     │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘     │
│         │                 │                     │                │
│         ▼                 ▼                     ▼                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  メッセージキュー (Amazon SQS / Cloud Pub/Sub)            │    │
│  │  • 非同期処理                                             │    │
│  │  • イベント駆動                                           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       データ層                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ PostgreSQL   │  │ Redis        │  │ Cloud Storage      │     │
│  │              │  │              │  │ (S3 / GCS)         │     │
│  │ • ユーザー   │  │ • セッション │  │ • 音声ファイル     │     │
│  │ • ペアリング │  │ • リアル     │  │ • OCR画像          │     │
│  │ • イベント   │  │   タイム     │  │ • 統計データ       │     │
│  │   ログ       │  │   位置情報   │  │                    │     │
│  │ • ブロック   │  │ • キャッシュ │  │                    │     │
│  │   リスト     │  │              │  │                    │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      外部サービス連携                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ FCM / APNs   │  │ LLM API      │  │ Speech-to-Text     │     │
│  │ (Push通知)   │  │ (Claude /    │  │ (Whisper /         │     │
│  │              │  │  GPT-4)      │  │  Google STT)       │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ Google       │  │ 警察庁       │                              │
│  │ ML Kit (OCR) │  │ オープン     │                              │
│  │              │  │ データ       │                              │
│  └──────────────┘  └──────────────┘                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 技術スタック詳細

### 2.1 フロントエンド（モバイルアプリ）

| 項目 | 選定技術 | 選定理由 |
|------|----------|----------|
| フレームワーク | **React Native** (Expo managed → bare workflow) | iOS/Android 同時開発、ネイティブモジュールアクセス可能 |
| 言語 | **TypeScript** | 型安全性、開発効率 |
| 状態管理 | **Zustand** | 軽量、ボイラープレート少 |
| ナビゲーション | **React Navigation** | React Native の標準的選択 |
| プッシュ通知 | **Notifee** + **FCM/APNs** | ローカル通知＋リモート通知の高度な制御 |
| バックグラウンド処理 | **react-native-background-actions** | Android Foreground Service / iOS Background Task |
| 音声関連 | **react-native-voice** (STT)、**react-native-tts** (TTS) | 音声アシスタント用 |
| 位置情報 | **react-native-geolocation-service** | 高精度・バックグラウンド対応 |
| 通話検知 | ネイティブモジュール（Kotlin/Swift） | OS APIへの直接アクセスが必要 |

**iOS/Android 固有のネイティブモジュール（Kotlin / Swift で個別実装）**

| 機能 | Android | iOS |
|------|---------|-----|
| 通話状態検知 | TelephonyManager + PhoneStateListener | CXCallObserver |
| 着信拒否 | BlockedNumberContract | CallDirectory Extension |
| SMS検知 | SmsReceiver (BroadcastReceiver) | MessageFilter Extension |
| 通話ログ取得 | CallLog.Calls | 制限あり（CallKit経由で限定的） |
| 緊急SOS連携 | 独自実装 | 独自実装 |

### 2.2 バックエンド

| 項目 | 選定技術 | 選定理由 |
|------|----------|----------|
| ランタイム | **Node.js 20 LTS** | フロントとの技術統一、非同期I/O |
| フレームワーク | **NestJS** | 構造化されたアーキテクチャ、DI、モジュール化 |
| 言語 | **TypeScript** | フロントと統一 |
| ORM | **Prisma** | 型安全なDB操作、マイグレーション管理 |
| リアルタイム通信 | **Socket.io** | WebSocket 抽象化、フォールバック |
| 認証 | **Passport.js** + **JWT** | 業界標準の認証基盤 |
| バリデーション | **class-validator / zod** | リクエストの入力検証 |

### 2.3 AI解析エンジン

| 項目 | 選定技術 | 選定理由 |
|------|----------|----------|
| ランタイム | **Python 3.12** | AI/MLエコシステムの充実 |
| フレームワーク | **FastAPI** | 高速、非同期、OpenAPI自動生成 |
| Speech-to-Text | **OpenAI Whisper API** (primary) / **Google Cloud STT** (fallback) | 日本語精度の高さ |
| テキスト解析 | **Claude API** (primary) / **GPT-4 API** (fallback) | 日本語理解力、コンテキスト長 |
| キーワード検出 | **ルールエンジン** (独自実装) | 高速、確定的な判定 |
| OCR | **Google ML Kit** (オンデバイス) / **Google Vision API** (サーバー) | |

### 2.4 インフラ・クラウド

| 項目 | 選定技術 | 選定理由 |
|------|----------|----------|
| クラウド | **AWS** (primary) | 日本リージョン、実績 |
| コンテナ | **ECS Fargate** | サーバーレスコンテナ、運用負荷低 |
| DB | **Amazon RDS (PostgreSQL)** | マネージドDB |
| キャッシュ | **Amazon ElastiCache (Redis)** | セッション、リアルタイムデータ |
| ストレージ | **Amazon S3** | 音声ファイル、画像 |
| メッセージキュー | **Amazon SQS** | 非同期処理 |
| CDN | **Amazon CloudFront** | 静的コンテンツ配信 |
| CI/CD | **GitHub Actions** | コード管理と統合 |
| IaC | **Terraform** | インフラのコード管理 |
| 監視 | **Amazon CloudWatch** + **Sentry** | ログ、メトリクス、エラー追跡 |

---

## 3. データベース設計（主要エンティティ）

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   users      │     │   pairings       │     │   users      │
│ (高齢者/家族) │────→│                  │←────│ (高齢者/家族) │
├─────────────┤     ├─────────────────┤     ├─────────────┤
│ id (PK)      │     │ id (PK)          │     │              │
│ role          │     │ elderly_id (FK)  │     │              │
│ name          │     │ family_id (FK)   │     │              │
│ phone         │     │ role (owner/     │     │              │
│ prefecture    │     │       member)    │     │              │
│ device_token  │     │ created_at       │     │              │
│ created_at    │     └─────────────────┘     └─────────────┘
└─────────────┘
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│   events         │     │   blocked_numbers │
├─────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)           │
│ elderly_id (FK)  │     │ elderly_id (FK)   │
│ type (F1〜F9)    │     │ phone_number      │
│ severity         │     │ added_by (FK)     │
│ payload (JSONB)  │     │ reason            │
│ status           │     │ synced            │
│ resolved_by (FK) │     │ created_at        │
│ created_at       │     └──────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│   ai_analyses    │     │  scam_statistics  │
├─────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)           │
│ event_id (FK)    │     │ prefecture        │
│ summary          │     │ year_month        │
│ risk_score       │     │ scam_type         │
│ scam_type        │     │ amount            │
│ raw_text         │     │ count             │
│ model_version    │     │ created_at        │
│ created_at       │     └──────────────────┘
└─────────────────┘

┌──────────────────┐
│  sos_sessions     │
├──────────────────┤
│ id (PK)           │
│ elderly_id (FK)   │
│ mode (alarm/      │
│       silent)     │
│ status (active/   │
│         resolved) │
│ locations (JSONB) │
│ audio_url         │
│ resolved_by (FK)  │
│ started_at        │
│ ended_at          │
└──────────────────┘

┌──────────────────┐
│  sos_settings     │
├──────────────────┤
│ id (PK)           │
│ elderly_id (FK)   │
│ default_mode      │
│  (alarm/silent)   │
│ updated_by (FK)   │
│ updated_at        │
└──────────────────┘
```

---

## 4. API 設計（主要エンドポイント）

### 4.1 認証

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/v1/auth/register` | ユーザー登録 |
| POST | `/api/v1/auth/login` | ログイン（JWT発行） |
| POST | `/api/v1/auth/refresh` | トークンリフレッシュ |
| POST | `/api/v1/auth/verify-phone` | 電話番号SMS認証 |

### 4.2 ペアリング

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/v1/pairings` | ペアリング作成（招待コード発行） |
| POST | `/api/v1/pairings/join` | 招待コードで参加 |
| GET | `/api/v1/pairings` | ペアリング一覧取得 |
| DELETE | `/api/v1/pairings/:id` | ペアリング解除 |

### 4.3 イベント・アラート

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/v1/events` | イベント送信（高齢者端末から） |
| GET | `/api/v1/events` | イベント一覧（家族が閲覧） |
| PATCH | `/api/v1/events/:id/resolve` | 対応済みマーク |
| GET | `/api/v1/events/:id/analysis` | AI解析結果取得 |

### 4.4 ブロックリスト

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/v1/elderly/:id/blocklist` | ブロックリスト取得 |
| POST | `/api/v1/elderly/:id/blocklist` | 番号追加 |
| DELETE | `/api/v1/elderly/:id/blocklist/:numberId` | 番号削除 |
| POST | `/api/v1/elderly/:id/blocklist/import` | 一括インポート |

### 4.5 緊急SOS

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/v1/sos/start` | SOS開始（mode: alarm/silent） |
| POST | `/api/v1/sos/:id/location` | 位置情報更新 |
| POST | `/api/v1/sos/:id/audio` | 音声チャンク送信 |
| PATCH | `/api/v1/sos/:id/mode` | SOSモード切替（家族のみ、alarm↔silent） |
| POST | `/api/v1/sos/:id/resolve` | SOS解除（家族のみ） |
| GET | `/api/v1/elderly/:id/sos-settings` | SOSモード設定取得 |
| PUT | `/api/v1/elderly/:id/sos-settings` | SOSモード設定変更（家族のみ） |
| WS | `/ws/sos/:id` | リアルタイムストリーミング＋モード変更通知 |

### 4.6 AI解析

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/v1/analyze/conversation` | 会話テキスト解析 |
| POST | `/api/v1/analyze/dark-job` | 闇バイト判定 |
| POST | `/api/v1/analyze/dark-job/image` | 画像（OCR→闇バイト判定） |

### 4.7 統計データ

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/v1/statistics/:prefecture` | 都道府県別統計 |
| GET | `/api/v1/statistics/:prefecture/advice` | 地域別アドバイス |
| GET | `/api/v1/statistics/trends` | 全国トレンド |

---

## 5. 通信プロトコルと遅延要件

| 通信 | プロトコル | 遅延要件 |
|------|-----------|----------|
| 通常API | HTTPS (REST) | < 500ms (p95) |
| プッシュ通知 | FCM / APNs | < 5s (p95) |
| 緊急SOS | WebSocket | < 1s (p95) |
| 音声ストリーミング | WebSocket (binary) | < 3s (p95) |
| 位置情報追跡 | WebSocket | < 2s (p95) |

---

## 6. スケーラビリティ設計

### 初期想定

| 項目 | 値 |
|------|-----|
| ユーザー数（初年度） | 10,000ペア |
| 同時接続数 | 1,000 |
| イベント数/日 | 50,000 |
| AI解析リクエスト/日 | 5,000 |
| 緊急SOS同時セッション | 10 |

### スケーリング方針

- **水平スケーリング**：ECS Fargate のタスク数で対応
- **DB**: Read Replica 追加、将来的にはイベントテーブルのパーティショニング
- **AI解析**：キューイングで負荷分散、バースト時はLambdaでオーバーフロー処理
- **WebSocket**：Redis Pub/Sub でサーバー間のメッセージ中継

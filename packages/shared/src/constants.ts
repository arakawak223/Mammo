// ─── Alert Severity → Priority Mapping ───
export const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 0, // F9: 緊急SOS
  high: 1,     // F1: 詐欺ボタン, F2: 高リスク着信
  medium: 2,   // F2: 中リスク着信, F3: AI判定
  low: 3,      // 日次レポート
};

// ─── Risk Score Thresholds ───
export const RISK_THRESHOLDS = {
  SAFE_MAX: 30,
  CAUTION_MAX: 60,
  WARNING_MAX: 80,
  // 81〜100 = DANGER
} as const;

// ─── Call Classification Rules ───
export const INTERNATIONAL_PREFIX_JAPAN = '+81';

// ─── SMS Scam Keywords (Initial Set) ───
export const SMS_SCAM_KEYWORDS_JA = [
  '当選', '未払い', '口座', '振込', '至急', '本日中',
  '最終通告', '裁判', '差し押さえ', '支払い期限',
  '不正アクセス', '不正利用', 'アカウント停止',
  'ログイン確認', '本人確認', 'お届け物',
  '還付金', '払い戻し', '投資', '高収益',
] as const;

// ─── Dark Job Keywords ───
export const DARK_JOB_KEYWORDS = {
  HIGH_RISK: [
    '受け取り', '運搬', '見張り', '出し子', '受け子',
    'テレグラム', 'シグナル', '身分証', '免許証の写真',
    '前科なし', '即日現金', '高額日払い',
  ],
  MEDIUM_RISK: [
    '簡単な作業', '誰でもできる', '日給5万',
    '日給10万', '副業', '在宅ワーク',
    '詳細はDMで', 'LINE追加',
  ],
} as const;

// ─── SOS Configuration ───
export const SOS_CONFIG = {
  DEFAULT_MODE: 'silent' as const,
  CANCEL_COUNTDOWN_SECONDS: 5,
  LOCATION_INTERVAL_MS: 10_000,
  AUDIO_CHUNK_DURATION_MS: 5_000,
  MAX_AUDIO_DURATION_MS: 600_000, // 10 minutes (silent mode)
  ALARM_AUDIO_DURATION_MS: 300_000, // 5 minutes (alarm mode)
} as const;

// ─── Consultation Contacts ───
export const CONSULTATION_CONTACTS = [
  {
    name: '警察相談ダイヤル',
    phone: '#9110',
    description: '犯罪被害の相談、防犯に関する相談',
  },
  {
    name: '消費者ホットライン',
    phone: '188',
    description: '消費生活に関するトラブルの相談',
  },
  {
    name: '法テラス',
    phone: '0570-078374',
    description: '法的トラブルの総合案内',
  },
] as const;

// ─── Pairing ───
export const PAIRING_CONFIG = {
  INVITE_CODE_LENGTH: 6,
  INVITE_CODE_EXPIRY_MINUTES: 30,
  MAX_FAMILY_MEMBERS: 5,
} as const;

// ─── JWT ───
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '30d',
} as const;

// ─── Data Retention (days) ───
export const DATA_RETENTION = {
  SOS_AUDIO: 7,
  SOS_LOCATION: 30,
  CALL_METADATA: 90,
  AI_ANALYSIS: 90,
  VOICE_TEXT: 7,
} as const;

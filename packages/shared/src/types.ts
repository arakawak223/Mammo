// ─── User Roles ───
export type UserRole = 'elderly' | 'family_owner' | 'family_member';

// ─── Event Types (F1〜F9) ───
export type EventType =
  | 'scam_button'       // F1: 「これ詐欺？」ボタン
  | 'auto_forward'      // F2: 自動転送（不審着信/SMS）
  | 'ai_assistant'      // F3: AI音声アシスタント判定
  | 'realtime_alert'    // F4: リアルタイム・アラート
  | 'conversation_ai'   // F5: 会話サマリー
  | 'remote_block'      // F6: リモート・ブロック操作
  | 'statistics'        // F7: 被害額データ連動
  | 'dark_job_check'    // F8: 闇バイトチェッカー
  | 'emergency_sos';    // F9: 緊急SOS

// ─── Alert Severity ───
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

// ─── Event Status ───
export type EventStatus = 'pending' | 'acknowledged' | 'resolved';

// ─── SOS Mode ───
export type SosMode = 'alarm' | 'silent';

// ─── SOS Session Status ───
export type SosSessionStatus = 'active' | 'resolved';

// ─── Risk Level ───
export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

// ─── Scam Type ───
export type ScamType =
  | 'ore_ore'           // オレオレ詐欺
  | 'refund'            // 還付金詐欺
  | 'fictitious_billing'// 架空請求
  | 'investment'        // 投資詐欺
  | 'romance'           // ロマンス詐欺
  | 'unknown';

// ─── Call Risk Classification ───
export type CallRisk = 'high' | 'medium' | 'low';

// ─── API Request/Response Types ───

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateEventRequest {
  type: EventType;
  severity: AlertSeverity;
  payload: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
}

export interface EventResponse {
  id: string;
  elderlyId: string;
  type: EventType;
  severity: AlertSeverity;
  status: EventStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface StartSosRequest {
  mode: SosMode;
  latitude: number;
  longitude: number;
}

export interface SosLocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery?: number;
}

export interface SosSessionResponse {
  id: string;
  elderlyId: string;
  mode: SosMode;
  status: SosSessionStatus;
  locations: SosLocationUpdate[];
  audioUrl?: string;
  startedAt: string;
  endedAt?: string;
}

export interface BlockedNumberRequest {
  phoneNumber: string;
  reason?: string;
}

export interface AiAnalysisResponse {
  id: string;
  eventId: string;
  summary: string;
  riskScore: number;
  scamType: ScamType;
  recommendedActions?: string[];
  createdAt: string;
}

export interface DarkJobCheckRequest {
  text?: string;
  imageBase64?: string;
}

export interface DarkJobCheckResponse {
  riskLevel: RiskLevel;
  score: number;
  reasons: string[];
  detectedKeywords: string[];
  advice: string;
  consultationContacts: ConsultationContact[];
}

export interface ConsultationContact {
  name: string;
  phone: string;
  description: string;
}

// ─── Conversation Summary (F5) ───
export interface ConversationSummaryResponse {
  riskScore: number;
  scamType: string;
  summary: string;
  keyPoints: string[];
  recommendedActions: string[];
  modelVersion: string;
}

// ─── Voice Analyze (F3) ───
export interface VoiceAnalyzeRequest {
  transcript: string;
}

export interface VoiceAnalyzeResponse {
  eventId: string;
  riskScore: number;
  scamType: string;
  summary: string;
  keyPoints: string[];
  recommendedActions: string[];
  modelVersion: string;
}

// ─── WebSocket Event Types ───

export interface WsSosUpdate {
  type: 'location' | 'audio_chunk' | 'mode_change' | 'resolved';
  sessionId: string;
  data: unknown;
}

export interface WsAlertNotification {
  type: 'new_alert';
  event: EventResponse;
}

// ─── Trend (F7) ───
export interface TrendMonth {
  yearMonth: string;
  totalAmount: number;
  totalCount: number;
  changeRate: number | null;
}

export interface TrendResponse {
  months: TrendMonth[];
  byScamType: { scamType: string; months: TrendMonth[] }[];
}

// ─── Regional Advice (F7) ───
export interface RegionalAdviceResponse {
  prefecture: string;
  yearMonth?: string;
  advice: string;
  topScamTypes: { scamType: string; amount: number; count: number }[];
}

// ─── Dark Job Check History (F8) ───
export interface DarkJobCheckHistoryItem {
  id: string;
  inputText: string;
  inputType: 'text' | 'image';
  riskLevel: string;
  riskScore: number;
  result: Record<string, unknown>;
  createdAt: string;
}

export type DarkJobCheckHistoryResponse = DarkJobCheckHistoryItem[];

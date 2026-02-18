/**
 * Auto-forward orchestrator for F2.
 * Processes incoming calls/SMS, classifies risk, sends events to API.
 */

import { api } from './api';
import { enqueueEvent } from './offlineQueue';
import { CallDetector, IncomingCall } from '../native/CallDetector';
import { SmsDetector, IncomingSms } from '../native/SmsDetector';

const SMS_SCAM_KEYWORDS = [
  '当選', '未払い', '口座', '振込', '至急', '本日中',
  '最終通告', '裁判', '差し押さえ', '支払い期限',
  '不正アクセス', '不正利用', 'アカウント停止',
  'ログイン確認', '本人確認', 'お届け物',
  '還付金', '払い戻し', '投資', '高収益',
];

type NumberRisk = 'high' | 'medium' | 'low';

function classifyNumber(phoneNumber: string): NumberRisk {
  // International
  if (phoneNumber.startsWith('+') && !phoneNumber.startsWith('+81')) {
    return 'high';
  }
  // Hidden
  if (['非通知', 'unknown', 'private', ''].includes(phoneNumber)) {
    return 'high';
  }
  // IP phone
  if (phoneNumber.startsWith('050')) return 'medium';
  // Toll-free
  if (phoneNumber.startsWith('0120')) return 'medium';

  return 'low';
}

function scanKeywords(text: string): string[] {
  return SMS_SCAM_KEYWORDS.filter((kw) => text.includes(kw));
}

function determineSeverity(numberRisk: NumberRisk, keywordCount: number): string {
  if (numberRisk === 'high' && keywordCount >= 2) return 'critical';
  if (numberRisk === 'high' || keywordCount >= 3) return 'high';
  if (numberRisk === 'medium' || keywordCount >= 1) return 'medium';
  return 'low';
}

async function sendAutoForwardEvent(
  phoneNumber: string,
  callType: 'call' | 'sms',
  severity: string,
  smsContent?: string,
) {
  const payload = {
    phoneNumber,
    callType,
    smsContent,
    detectedAt: new Date().toISOString(),
  };

  try {
    await api.createEvent({
      type: 'auto_forward',
      severity,
      payload,
    });
  } catch {
    // Offline: queue the event
    await enqueueEvent({
      type: 'auto_forward',
      severity,
      payload,
    });
  }
}

function handleIncomingCall(call: IncomingCall) {
  const risk = classifyNumber(call.phoneNumber);
  // Only auto-forward medium+ risk calls
  if (risk === 'low' && call.isInContacts) return;

  const severity = determineSeverity(risk, 0);
  sendAutoForwardEvent(call.phoneNumber, 'call', severity);
}

function handleIncomingSms(sms: IncomingSms) {
  const risk = classifyNumber(sms.sender);
  const keywords = scanKeywords(sms.body);

  // Only auto-forward if there's some suspicion
  if (risk === 'low' && keywords.length === 0) return;

  const severity = determineSeverity(risk, keywords.length);
  sendAutoForwardEvent(sms.sender, 'sms', severity, sms.body);
}

let callUnsub: (() => void) | null = null;
let smsUnsub: (() => void) | null = null;

export async function startAutoForward(): Promise<void> {
  // Call detection
  const hasCallPerm = await CallDetector.hasPermission();
  if (hasCallPerm || (await CallDetector.requestPermission())) {
    await CallDetector.startListening();
    callUnsub = CallDetector.onIncomingCall(handleIncomingCall);
  }

  // SMS detection (Android only)
  const hasSmsPerm = await SmsDetector.hasPermission();
  if (hasSmsPerm || (await SmsDetector.requestPermission())) {
    await SmsDetector.startListening();
    smsUnsub = SmsDetector.onIncomingSms(handleIncomingSms);
  }
}

export async function stopAutoForward(): Promise<void> {
  callUnsub?.();
  smsUnsub?.();
  callUnsub = null;
  smsUnsub = null;
  await CallDetector.stopListening();
  await SmsDetector.stopListening();
}

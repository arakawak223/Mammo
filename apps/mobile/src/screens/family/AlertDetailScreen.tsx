import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { api } from '../../services/api';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskScoreGauge } from '../../components/RiskScoreGauge';
import { COLORS } from '../../utils/theme';

const EVENT_TYPE_LABELS: Record<string, string> = {
  scam_button: '「これ詐欺？」ボタン',
  auto_forward: '不審な着信/SMS',
  ai_assistant: 'AI音声判定',
  emergency_sos: '緊急SOS',
  realtime_alert: 'リアルタイムアラート',
  conversation_ai: '会話サマリー',
  remote_block: 'リモートブロック',
  dark_job_check: '闇バイトチェック',
  statistics: '統計情報',
};

const SCAM_TYPE_LABELS: Record<string, string> = {
  ore_ore: 'オレオレ詐欺',
  refund: '還付金詐欺',
  fictitious_billing: '架空請求',
  investment: '投資詐欺',
  romance: 'ロマンス詐欺',
  cash_card_fraud: 'キャッシュカード詐欺',
  sms_phishing: 'SMSフィッシング',
  suspicious_call: '不審な着信',
  unknown: '不明',
};

interface EventDetail {
  id: string;
  elderlyId: string;
  type: string;
  severity: string;
  status: string;
  payload: Record<string, any>;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  resolvedAt?: string;
  aiAnalysis?: {
    riskScore: number;
    scamType: string;
    summary: string;
    modelVersion: string;
  } | null;
}

export function AlertDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data: any = await api.getEvent(eventId);
        setEvent(data);
      } catch {
        Alert.alert('エラー', 'イベントの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const handleResolve = useCallback(async () => {
    try {
      await api.resolveEvent(eventId);
      setEvent((prev) => (prev ? { ...prev, status: 'resolved', resolvedAt: new Date().toISOString() } : null));
    } catch {
      Alert.alert('エラー', '対応済みマークに失敗しました');
    }
  }, [eventId]);

  const handleBlock = useCallback(async () => {
    if (!event?.payload?.phoneNumber || !event.elderlyId) return;
    try {
      await api.addBlockedNumber(
        event.elderlyId,
        event.payload.phoneNumber as string,
        `アラートからブロック: ${event.type}`,
      );
      Alert.alert('完了', '番号をブロックリストに追加しました');
    } catch {
      Alert.alert('エラー', 'ブロックに失敗しました');
    }
  }, [event]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>イベントが見つかりません</Text>
      </View>
    );
  }

  const isResolved = event.status === 'resolved';
  const ai = event.aiAnalysis;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <SeverityBadge severity={event.severity} />
        <Text style={styles.statusText}>
          {isResolved ? '対応済み' : '未対応'}
        </Text>
      </View>

      <Text style={styles.title}>{EVENT_TYPE_LABELS[event.type] || event.type}</Text>
      <Text style={styles.time}>
        {new Date(event.createdAt).toLocaleString('ja-JP')}
      </Text>

      {/* AI Analysis */}
      {ai && (
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiTitle}>AI解析結果</Text>
            <RiskScoreGauge score={ai.riskScore} size="large" />
          </View>

          {ai.scamType !== 'unknown' && (
            <View style={styles.aiRow}>
              <Text style={styles.aiLabel}>検出タイプ</Text>
              <Text style={styles.aiValue}>{SCAM_TYPE_LABELS[ai.scamType] || ai.scamType}</Text>
            </View>
          )}

          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>解析結果</Text>
            <Text style={styles.aiSummary}>{ai.summary}</Text>
          </View>

          <Text style={styles.aiVersion}>モデル: {ai.modelVersion}</Text>
        </View>
      )}

      {/* Payload details */}
      {event.payload?.phoneNumber && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>詳細情報</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>電話番号</Text>
            <Text style={styles.detailValue}>{event.payload.phoneNumber}</Text>
          </View>
          {event.payload.callType && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>種類</Text>
              <Text style={styles.detailValue}>
                {event.payload.callType === 'sms' ? 'SMS' : '着信'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Location */}
      {event.latitude && event.longitude && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>位置情報</Text>
          <Text style={styles.detailValue}>
            {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {event.payload?.phoneNumber && (
          <Pressable style={[styles.button, styles.blockButton]} onPress={handleBlock}>
            <Text style={styles.buttonText}>ブロック</Text>
          </Pressable>
        )}
        {!isResolved && (
          <Pressable style={[styles.button, styles.safeButton]} onPress={handleResolve}>
            <Text style={styles.buttonText}>対応済みにする</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: COLORS.subText },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: { fontSize: 14, color: COLORS.subText },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  time: { fontSize: 14, color: COLORS.subText, marginBottom: 20 },
  aiCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  aiRow: { marginBottom: 8 },
  aiLabel: { fontSize: 13, color: COLORS.subText, marginBottom: 2 },
  aiValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  aiSummary: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  aiVersion: { fontSize: 12, color: COLORS.subText, marginTop: 8 },
  detailCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontSize: 14, color: COLORS.subText },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  blockButton: { backgroundColor: COLORS.danger },
  safeButton: { backgroundColor: COLORS.safe },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

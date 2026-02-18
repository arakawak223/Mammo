import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SeverityBadge } from './SeverityBadge';
import { RiskScoreGauge } from './RiskScoreGauge';
import { COLORS } from '../utils/theme';

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

interface AlertCardProps {
  event: {
    id: string;
    type: string;
    severity: string;
    status: string;
    createdAt: string;
    aiAnalysis?: { riskScore: number } | null;
  };
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}時間前`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}日前`;
}

export function AlertCard({ event, onPress }: AlertCardProps) {
  const isResolved = event.status === 'resolved';

  return (
    <Pressable
      style={[styles.card, isResolved && styles.cardResolved]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <SeverityBadge severity={event.severity} />
        <Text style={styles.time}>{formatTime(event.createdAt)}</Text>
      </View>

      <Text style={[styles.type, isResolved && styles.typeResolved]}>
        {EVENT_TYPE_LABELS[event.type] || event.type}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={[styles.status, isResolved && styles.statusResolved]}>
          {isResolved ? '対応済み' : '未対応'}
        </Text>
        {event.aiAnalysis && (
          <RiskScoreGauge score={event.aiAnalysis.riskScore} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardResolved: {
    borderLeftColor: COLORS.safe,
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    fontSize: 13,
    color: COLORS.subText,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  typeResolved: {
    color: COLORS.subText,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },
  statusResolved: {
    color: COLORS.safe,
  },
});

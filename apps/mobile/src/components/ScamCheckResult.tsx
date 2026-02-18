import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

interface AiAnalysis {
  riskScore: number;
  scamType: string;
  summary: string;
}

interface ScamCheckResultProps {
  analysis: AiAnalysis | null;
  loading?: boolean;
}

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

export function ScamCheckResult({ analysis, loading }: ScamCheckResultProps) {
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>AI解析中...</Text>
        <Text style={styles.loadingSubText}>しばらくお待ちください</Text>
      </View>
    );
  }

  if (!analysis) {
    return null;
  }

  const isHighRisk = analysis.riskScore >= 50;
  const riskColor = isHighRisk ? COLORS.danger : COLORS.safe;
  const riskLabel = isHighRisk ? '危険' : '安全';
  const scamTypeLabel = SCAM_TYPE_LABELS[analysis.scamType] || analysis.scamType;

  return (
    <View style={[styles.container, { borderColor: riskColor }]}>
      {/* Risk Score Header */}
      <View style={[styles.header, { backgroundColor: riskColor }]}>
        <Text style={styles.headerLabel}>AI判定結果</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{analysis.riskScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.riskLabel}>{riskLabel}</Text>
      </View>

      {/* Details */}
      <View style={styles.body}>
        {analysis.scamType !== 'unknown' && (
          <View style={styles.row}>
            <Text style={styles.label}>検出タイプ</Text>
            <Text style={[styles.value, { color: riskColor }]}>{scamTypeLabel}</Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>AI解析</Text>
          <Text style={styles.summary}>{analysis.summary}</Text>
        </View>
      </View>

      {/* Action hint */}
      <View style={[styles.footer, { backgroundColor: isHighRisk ? '#FFEBEE' : '#E8F5E9' }]}>
        <Text style={[styles.footerText, { color: riskColor }]}>
          {isHighRisk
            ? '注意: この通話は詐欺の可能性が高いです。\n電話を切り、家族に相談してください。'
            : '安心: 現時点で詐欺の兆候は低いです。\n引き続き注意してください。'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 3,
    overflow: 'hidden',
    marginVertical: 16,
  },
  loadingContainer: {
    borderColor: COLORS.primary,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  loadingSubText: {
    fontSize: 16,
    color: COLORS.subText,
    marginTop: 8,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreMax: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.8,
    marginLeft: 4,
  },
  riskLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  body: {
    padding: 16,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: COLORS.subText,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  summary: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  footer: {
    padding: 16,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
});

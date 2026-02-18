import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { RiskScoreGauge } from '../../components/RiskScoreGauge';
import { COLORS } from '../../utils/theme';

interface DarkJobResult {
  isDarkJob: boolean;
  riskLevel: string;
  riskScore: number;
  keywordsFound: string[];
  explanation: string;
  modelVersion: string;
  consultationContacts: { name: string; phone: string; description: string }[];
}

export function DarkJobCheckerScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DarkJobResult | null>(null);

  const handleCheck = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const data: any = await api.checkDarkJob(trimmed);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const riskColor =
    result?.riskLevel === 'high'
      ? COLORS.danger
      : result?.riskLevel === 'medium'
      ? COLORS.warning
      : COLORS.safe;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>闇バイトチェッカー</Text>
        <Text style={styles.subtitle}>
          怪しい求人メッセージを貼り付けてチェックしましょう
        </Text>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="求人メッセージやSNSの投稿をここに貼り付け..."
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.checkButton, (!text.trim() || loading) && styles.checkButtonDisabled]}
          onPress={handleCheck}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.checkButtonText}>チェックする</Text>
          )}
        </Pressable>

        {result && (
          <View style={[styles.resultCard, { borderColor: riskColor }]}>
            <View style={styles.resultHeader}>
              <RiskScoreGauge score={result.riskScore} size="large" />
              <View style={styles.resultHeaderText}>
                <Text style={[styles.riskLevel, { color: riskColor }]}>
                  {result.riskLevel === 'high'
                    ? '危険度：高'
                    : result.riskLevel === 'medium'
                    ? '危険度：中'
                    : '危険度：低'}
                </Text>
                <Text style={styles.isDarkJob}>
                  {result.isDarkJob ? '闇バイトの可能性があります' : '闇バイトの兆候なし'}
                </Text>
              </View>
            </View>

            <Text style={styles.explanation}>{result.explanation}</Text>

            {result.keywordsFound.length > 0 && (
              <View style={styles.keywordsSection}>
                <Text style={styles.keywordsTitle}>検出キーワード</Text>
                <View style={styles.keywordsList}>
                  {result.keywordsFound.map((kw) => (
                    <View key={kw} style={[styles.keyword, { backgroundColor: riskColor + '20' }]}>
                      <Text style={[styles.keywordText, { color: riskColor }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {result.consultationContacts.length > 0 && (
              <View style={styles.contactsSection}>
                <Text style={styles.contactsTitle}>相談先</Text>
                {result.consultationContacts.map((c) => (
                  <View key={c.phone} style={styles.contactItem}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactPhone}>{c.phone}</Text>
                    <Text style={styles.contactDesc}>{c.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.subText, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundGray,
    minHeight: 120,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkButtonDisabled: { opacity: 0.5 },
  checkButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  resultCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  resultHeaderText: { marginLeft: 16, flex: 1 },
  riskLevel: { fontSize: 18, fontWeight: 'bold' },
  isDarkJob: { fontSize: 14, color: COLORS.text, marginTop: 4 },
  explanation: { fontSize: 15, color: COLORS.text, lineHeight: 22, marginBottom: 12 },
  keywordsSection: { marginTop: 8 },
  keywordsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.subText, marginBottom: 8 },
  keywordsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keyword: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  keywordText: { fontSize: 13, fontWeight: '500' },
  contactsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  contactsTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  contactItem: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  contactName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  contactPhone: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
  contactDesc: { fontSize: 12, color: COLORS.subText, marginTop: 2 },
});

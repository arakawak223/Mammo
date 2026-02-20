import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { RiskScoreGauge } from '../../components/RiskScoreGauge';
import { COLORS } from '../../utils/theme';

type TabType = 'text' | 'image';

interface DarkJobResult {
  isDarkJob: boolean;
  riskLevel: string;
  riskScore: number;
  keywordsFound: string[];
  explanation: string;
  modelVersion: string;
  extractedText?: string;
  consultationContacts: { name: string; phone: string; description: string }[];
}

interface HistoryItem {
  id: string;
  inputText: string;
  inputType: string;
  riskLevel: string;
  riskScore: number;
  createdAt: string;
}

export function DarkJobCheckerScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [text, setText] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DarkJobResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data: any = await api.getDarkJobHistory(5);
      setHistory(data || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCheckText = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const data: any = await api.checkDarkJob(trimmed);
      setResult(data);
      fetchHistory();
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [text, fetchHistory]);

  const handleCheckImage = useCallback(async () => {
    // expo-image-picker を使用（Codespaces環境ではスタブ）
    try {
      let ImagePicker: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ImagePicker = require('expo-image-picker');
      } catch {
        Alert.alert('画像選択', 'この環境では画像選択がサポートされていません。テキスト入力をお試しください。');
        return;
      }

      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('権限エラー', 'ギャラリーへのアクセス権限が必要です。');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.7,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return;

      const base64Data = pickerResult.assets[0].base64;
      setImageBase64(base64Data);
      setLoading(true);
      setResult(null);

      const data: any = await api.checkDarkJobImage(base64Data, 'gallery');
      setResult(data);
      fetchHistory();
    } catch {
      Alert.alert('エラー', '画像チェックに失敗しました。テキスト入力をお試しください。');
    } finally {
      setLoading(false);
    }
  }, [fetchHistory]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    const riskLabel = result.riskLevel === 'high' ? '危険度：高' : result.riskLevel === 'medium' ? '危険度：中' : '危険度：低';
    const message = [
      `【闇バイトチェック結果】`,
      `${riskLabel}（スコア: ${result.riskScore}/100）`,
      ``,
      result.explanation,
      ``,
      `検出キーワード: ${result.keywordsFound.join(', ') || 'なし'}`,
      ``,
      `相談先: 警察相談ダイヤル #9110 / 消費者ホットライン 188`,
      ``,
      `※ まもりトークで判定しました`,
    ].join('\n');

    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  }, [result]);

  const riskColor =
    result?.riskLevel === 'high'
      ? COLORS.danger
      : result?.riskLevel === 'medium'
      ? COLORS.warning
      : COLORS.safe;

  const historyRiskColor = (level: string) =>
    level === 'high' ? COLORS.danger : level === 'medium' ? COLORS.warning : COLORS.safe;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>闇バイトチェッカー</Text>
        <Text style={styles.subtitle}>
          怪しい求人メッセージを貼り付けてチェックしましょう
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'text' && styles.tabActive]}
            onPress={() => setActiveTab('text')}
          >
            <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>
              テキスト入力
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'image' && styles.tabActive]}
            onPress={() => setActiveTab('image')}
          >
            <Text style={[styles.tabText, activeTab === 'image' && styles.tabTextActive]}>
              画像入力
            </Text>
          </Pressable>
        </View>

        {/* Text Input Tab */}
        {activeTab === 'text' && (
          <>
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
              onPress={handleCheckText}
              disabled={!text.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkButtonText}>チェックする</Text>
              )}
            </Pressable>
          </>
        )}

        {/* Image Input Tab */}
        {activeTab === 'image' && (
          <>
            <View style={styles.imageInputArea}>
              <Text style={styles.imageInputIcon}>
                {imageBase64 ? '(画像選択済み)' : ''}
              </Text>
              <Text style={styles.imageInputHint}>
                スクリーンショットや写真から{'\n'}闇バイトの勧誘を検出します
              </Text>
            </View>
            <Pressable
              style={[styles.checkButton, loading && styles.checkButtonDisabled]}
              onPress={handleCheckImage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkButtonText}>画像を選択してチェック</Text>
              )}
            </Pressable>
          </>
        )}

        {/* Result */}
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

            {result.extractedText ? (
              <View style={styles.extractedTextSection}>
                <Text style={styles.extractedTextTitle}>抽出テキスト</Text>
                <Text style={styles.extractedText} numberOfLines={5}>
                  {result.extractedText}
                </Text>
              </View>
            ) : null}

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

            {/* Share Button */}
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>結果を共有</Text>
            </Pressable>
          </View>
        )}

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>チェック履歴</Text>
          {historyLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : history.length === 0 ? (
            <Text style={styles.historyEmpty}>履歴はありません</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <View style={[styles.historyBadge, { backgroundColor: historyRiskColor(item.riskLevel) + '20' }]}>
                    <Text style={[styles.historyBadgeText, { color: historyRiskColor(item.riskLevel) }]}>
                      {item.riskLevel === 'high' ? '高' : item.riskLevel === 'medium' ? '中' : '低'}
                    </Text>
                  </View>
                  <Text style={styles.historyScore}>スコア: {item.riskScore}</Text>
                  <Text style={styles.historyType}>
                    {item.inputType === 'image' ? '画像' : 'テキスト'}
                  </Text>
                </View>
                <Text style={styles.historyText} numberOfLines={2}>
                  {item.inputText}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.subText, marginBottom: 16 },
  // Tab
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.subText },
  tabTextActive: { color: '#FFFFFF' },
  // Text input
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
  // Image input
  imageInputArea: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
  },
  imageInputIcon: { fontSize: 14, color: COLORS.subText, marginBottom: 8 },
  imageInputHint: { fontSize: 14, color: COLORS.subText, textAlign: 'center', lineHeight: 22 },
  // Result
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
  extractedTextSection: { marginBottom: 12 },
  extractedTextTitle: { fontSize: 13, fontWeight: '600', color: COLORS.subText, marginBottom: 4 },
  extractedText: { fontSize: 13, color: COLORS.text, backgroundColor: COLORS.backgroundGray, padding: 8, borderRadius: 8 },
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
  // Share
  shareButton: {
    marginTop: 16,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  shareButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  // History
  historySection: { marginTop: 28, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  historyEmpty: { fontSize: 14, color: COLORS.subText, textAlign: 'center', marginTop: 8 },
  historyItem: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  historyBadgeText: { fontSize: 12, fontWeight: '700' },
  historyScore: { fontSize: 12, color: COLORS.subText, marginRight: 8 },
  historyType: { fontSize: 11, color: COLORS.subText },
  historyText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  historyDate: { fontSize: 11, color: COLORS.subText, marginTop: 4, textAlign: 'right' },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { COLORS } from '../../utils/theme';

const PREFECTURES = [
  '全国', '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const SCAM_TYPE_LABELS: Record<string, string> = {
  ore_ore: 'オレオレ',
  refund_fraud: '還付金',
  billing_fraud: '架空請求',
  investment_fraud: '投資',
  cash_card_fraud: 'カード',
  unknown: 'その他',
};

const BAR_COLORS = ['#C62828', '#E65100', '#F9A825', '#1565C0', '#2E7D32', '#757575'];

interface StatEntry {
  prefecture?: string;
  scamType?: string;
  yearMonth?: string;
  totalAmount?: number;
  totalCount?: number;
  amount?: number;
  count?: number;
}

export function StatisticsScreen({ navigation }: any) {
  const [selectedPrefecture, setSelectedPrefecture] = useState('全国');
  const [showPrefPicker, setShowPrefPicker] = useState(false);
  const [data, setData] = useState<StatEntry[]>([]);
  const [topPrefectures, setTopPrefectures] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedPrefecture === '全国') {
        const [top, national]: any = await Promise.all([
          api.getTopPrefectures(10),
          api.getStatisticsNational(),
        ]);
        setTopPrefectures(top);
        setData(national);
      } else {
        const stats: any = await api.getStatistics({ prefecture: selectedPrefecture });
        setData(stats);
        setTopPrefectures([]);
      }
    } catch {
      // ignore errors for stats display
    } finally {
      setLoading(false);
    }
  }, [selectedPrefecture]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxAmount = Math.max(
    ...topPrefectures.map((d) => d.totalAmount || 0),
    1,
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>詐欺統計ダッシュボード</Text>

        {/* Prefecture Selector */}
        <Pressable style={styles.prefSelector} onPress={() => setShowPrefPicker(!showPrefPicker)}>
          <Text style={styles.prefSelectorText}>{selectedPrefecture}</Text>
          <Text style={styles.prefArrow}>{showPrefPicker ? '▲' : '▼'}</Text>
        </Pressable>

        {showPrefPicker && (
          <View style={styles.prefList}>
            <ScrollView style={styles.prefScroll} nestedScrollEnabled>
              {PREFECTURES.map((pref) => (
                <Pressable
                  key={pref}
                  style={[
                    styles.prefItem,
                    selectedPrefecture === pref && styles.prefItemActive,
                  ]}
                  onPress={() => {
                    setSelectedPrefecture(pref);
                    setShowPrefPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.prefItemText,
                      selectedPrefecture === pref && styles.prefItemTextActive,
                    ]}
                  >
                    {pref}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <>
            {/* Top Prefectures Bar Chart */}
            {topPrefectures.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>被害額ワーストランキング</Text>
                {topPrefectures.map((item, i) => {
                  const amount = item.totalAmount || 0;
                  const barWidth = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                  return (
                    <View key={item.prefecture} style={styles.barRow}>
                      <Text style={styles.barLabel}>{item.prefecture}</Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              width: `${barWidth}%`,
                              backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barValue}>
                        {(amount / 10000).toFixed(0)}万円
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Data Table */}
            {data.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>
                  {selectedPrefecture === '全国' ? '全国集計' : `${selectedPrefecture}の統計`}
                </Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.headerCell]}>詐欺種類</Text>
                  <Text style={[styles.tableCell, styles.headerCell]}>件数</Text>
                  <Text style={[styles.tableCell, styles.headerCell]}>被害額</Text>
                </View>
                {data.slice(0, 20).map((item, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>
                      {SCAM_TYPE_LABELS[item.scamType || ''] || item.scamType}
                    </Text>
                    <Text style={styles.tableCell}>
                      {item.totalCount ?? item.count ?? 0}件
                    </Text>
                    <Text style={styles.tableCell}>
                      {(((item.totalAmount ?? item.amount ?? 0)) / 10000).toFixed(0)}万円
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {data.length === 0 && topPrefectures.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>統計データがありません</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  prefSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  prefSelectorText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  prefArrow: { fontSize: 14, color: COLORS.subText },
  prefList: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 10,
    marginBottom: 12,
    maxHeight: 200,
  },
  prefScroll: { padding: 8 },
  prefItem: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  prefItemActive: { backgroundColor: COLORS.primary },
  prefItemText: { fontSize: 15, color: COLORS.text },
  prefItemTextActive: { color: '#FFFFFF', fontWeight: '600' },
  loader: { marginTop: 40 },
  chartSection: { marginTop: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: { width: 70, fontSize: 12, color: COLORS.text },
  barContainer: {
    flex: 1,
    height: 22,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 4 },
  barValue: { width: 70, fontSize: 12, color: COLORS.subText, textAlign: 'right' },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: { flex: 1, fontSize: 14, color: COLORS.text },
  headerCell: { fontWeight: '600', color: COLORS.subText },
  emptyContainer: { marginTop: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.subText },
});

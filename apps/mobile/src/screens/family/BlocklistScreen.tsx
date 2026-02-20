import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { COLORS } from '../../utils/theme';

interface BlockedItem {
  id: string;
  phoneNumber: string;
  reason: string | null;
  source: string;
  synced: boolean;
  createdAt: string;
}

export function BlocklistScreen({ navigation }: any) {
  const [items, setItems] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For family users, elderlyId comes from pairings; simplified: use first pairing
  const [elderlyId, setElderlyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const pairings: any = await api.getPairings();
        if (pairings.length > 0) {
          setElderlyId(pairings[0].elderlyId);
        }
      } catch {
        setError('ペアリング情報の取得に失敗しました');
      }
    })();
  }, []);

  const fetchList = useCallback(async () => {
    if (!elderlyId) return;
    try {
      const data: any = await api.getBlocklist(elderlyId);
      setItems(data);
    } catch {
      Alert.alert('エラー', 'ブロックリストの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [elderlyId]);

  useEffect(() => {
    if (elderlyId) fetchList();
  }, [elderlyId, fetchList]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchList();
  }, [fetchList]);

  const handleDelete = useCallback(
    async (item: BlockedItem) => {
      if (!elderlyId) return;
      Alert.alert('ブロック解除', `${item.phoneNumber} のブロックを解除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeBlockedNumber(elderlyId, item.id);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]);
    },
    [elderlyId],
  );

  const handleSync = useCallback(async () => {
    if (!elderlyId) return;
    const unsyncedIds = items.filter((i) => !i.synced).map((i) => i.id);
    if (unsyncedIds.length === 0) {
      Alert.alert('情報', '同期が必要な番号はありません');
      return;
    }
    try {
      await api.syncBlocklist(elderlyId, unsyncedIds);
      setItems((prev) => prev.map((i) => ({ ...i, synced: true })));
      Alert.alert('完了', `${unsyncedIds.length}件を同期しました`);
    } catch {
      Alert.alert('エラー', '同期に失敗しました');
    }
  }, [elderlyId, items]);

  const SOURCE_LABELS: Record<string, string> = {
    manual: '手動追加',
    auto_block: '自動ブロック',
  };

  const renderItem = ({ item }: { item: BlockedItem }) => (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.phoneNumber}>{item.phoneNumber}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.source}>{SOURCE_LABELS[item.source] || item.source}</Text>
          <View style={[styles.syncBadge, item.synced ? styles.syncedBadge : styles.unsyncedBadge]}>
            <Text style={styles.syncText}>{item.synced ? '同期済' : '未同期'}</Text>
          </View>
        </View>
        {item.reason && <Text style={styles.reason}>{item.reason}</Text>}
      </View>
      <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Text style={styles.deleteText}>削除</Text>
      </Pressable>
    </View>
  );

  if (!elderlyId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>ペアリングされた高齢者がいません</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>着信拒否リスト</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.syncButton} onPress={handleSync}>
            <Text style={styles.syncButtonText}>同期</Text>
          </Pressable>
          <Pressable
            style={styles.addButton}
            onPress={() => navigation.navigate('BlocklistAdd', { elderlyId })}
          >
            <Text style={styles.addButtonText}>+ 追加</Text>
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ブロックリストは空です</Text>
          <Text style={styles.emptySubText}>「+ 追加」から番号を追加できます</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  headerButtons: { flexDirection: 'row', gap: 8 },
  syncButton: {
    backgroundColor: COLORS.backgroundGray,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  loader: { marginTop: 40 },
  list: { padding: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemInfo: { flex: 1 },
  phoneNumber: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  source: { fontSize: 12, color: COLORS.subText },
  syncBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  syncedBadge: { backgroundColor: '#E8F5E9' },
  unsyncedBadge: { backgroundColor: '#FFF3E0' },
  syncText: { fontSize: 11, fontWeight: '600' },
  reason: { fontSize: 13, color: COLORS.subText, marginTop: 2 },
  deleteButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginHorizontal: 16, marginTop: 12 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: COLORS.subText, textAlign: 'center' },
  emptySubText: { fontSize: 14, color: COLORS.subText, marginTop: 8 },
});

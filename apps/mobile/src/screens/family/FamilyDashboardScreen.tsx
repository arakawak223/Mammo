import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useFamilyStore } from '../../store/familyStore';
import { useSocketStore } from '../../store/socketStore';
import { getAlertsSocket } from '../../services/socket';
import { COLORS } from '../../utils/theme';

export function FamilyDashboardScreen({ navigation }: any) {
  const { elderlyList, setElderlyList, selectedElderlyId, selectElderly, selectedElderly } =
    useFamilyStore();
  const realtimeAlerts = useSocketStore((s) => s.realtimeAlerts);
  const addAlert = useSocketStore((s) => s.addAlert);

  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState('--');

  const fetchData = useCallback(async () => {
    try {
      // Fetch pairings to get elderly list
      const pairings: any = await api.getPairings();
      const elderlyMap = new Map<string, any>();
      for (const p of pairings) {
        if (p.elderly) {
          elderlyMap.set(p.elderly.id, {
            id: p.elderly.id,
            name: p.elderly.name,
            phone: p.elderly.phone,
          });
        }
      }
      const list = Array.from(elderlyMap.values());
      setElderlyList(list);

      // Fetch event count for selected elderly
      if (selectedElderlyId || list.length > 0) {
        const eid = selectedElderlyId || list[0]?.id;
        if (eid) {
          const events: any = await api.getEvents(eid, 1);
          const pending = events.data?.filter((e: any) => e.status !== 'resolved') || [];
          setPendingCount(pending.length);
        }
      }

      setLastCheck(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // Silent fail on refresh
    }
  }, [selectedElderlyId, setElderlyList]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to WebSocket alerts
  useEffect(() => {
    if (!selectedElderlyId) return;

    const socket = getAlertsSocket();
    if (socket) {
      socket.emit('subscribe_elderly', selectedElderlyId);
      socket.on('new_alert', (event: any) => {
        addAlert(event);
        setPendingCount((prev) => prev + 1);
      });
    }

    return () => {
      if (socket) {
        socket.emit('unsubscribe_elderly', selectedElderlyId);
        socket.off('new_alert');
      }
    };
  }, [selectedElderlyId, addAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const elderly = selectedElderly();
  const elderlyName = elderly?.name || '高齢者';
  const isConnected = elderlyList.length > 0;
  const newAlerts = realtimeAlerts.filter((a) => a.status !== 'resolved');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Elderly Selector (if multiple) */}
        {elderlyList.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
            {elderlyList.map((e) => (
              <Pressable
                key={e.id}
                style={[styles.selectorItem, e.id === selectedElderlyId && styles.selectorActive]}
                onPress={() => selectElderly(e.id)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    e.id === selectedElderlyId && styles.selectorTextActive,
                  ]}
                >
                  {e.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            pendingCount > 0 ? styles.statusDanger : styles.statusSafe,
          ]}
          accessibilityRole="summary"
          accessibilityLabel={
            pendingCount > 0
              ? `${elderlyName}さんに${pendingCount}件の未対応アラート`
              : `${elderlyName}さんは安心です`
          }
        >
          <Text style={styles.statusEmoji}>{pendingCount > 0 ? '!' : ''}</Text>
          <Text style={styles.statusText}>
            {pendingCount > 0
              ? `${elderlyName}さんに${pendingCount}件の未対応アラート`
              : `${elderlyName}さんは安心です`}
          </Text>
          <Text style={styles.statusSub}>最終確認: {lastCheck}</Text>
        </View>

        {/* Real-time alerts */}
        {newAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>新着アラート</Text>
            {newAlerts.slice(0, 3).map((alert) => (
              <Pressable
                key={alert.id}
                style={styles.alertItem}
                onPress={() =>
                  (navigation as any).navigate('Alerts', {
                    screen: 'AlertDetail',
                    params: { eventId: alert.id },
                  })
                }
              >
                <View style={styles.alertDot} />
                <Text style={styles.alertText}>
                  {alert.type === 'scam_button'
                    ? '「これ詐欺？」ボタンが押されました'
                    : alert.type === 'emergency_sos'
                      ? '緊急SOSが発信されました'
                      : '新しいアラート'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Alert Section */}
        <View style={styles.section}>
          <Pressable onPress={() => (navigation as any).navigate('Alerts')}>
            <Text style={styles.sectionTitle}>
              アラート（{pendingCount}件未対応）→
            </Text>
          </Pressable>
          {pendingCount === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>未対応のアラートはありません</Text>
            </View>
          ) : (
            <Pressable
              style={styles.viewAllButton}
              onPress={() => (navigation as any).navigate('Alerts')}
              accessibilityRole="button"
              accessibilityLabel={`すべてのアラートを見る。${pendingCount}件未対応`}
            >
              <Text style={styles.viewAllText}>すべてのアラートを見る</Text>
            </Pressable>
          )}
        </View>

        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.section}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                まだ高齢者とペアリングしていません。{'\n'}設定画面からペアリングしてください。
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16 },
  selector: { marginBottom: 16 },
  selectorItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundGray,
    marginRight: 8,
  },
  selectorActive: { backgroundColor: COLORS.primary },
  selectorText: { fontSize: 14, color: COLORS.text },
  selectorTextActive: { color: '#FFFFFF', fontWeight: '600' },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusSafe: { backgroundColor: '#E8F5E9' },
  statusDanger: { backgroundColor: '#FFEBEE' },
  statusEmoji: { fontSize: 32, marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  statusSub: { fontSize: 14, color: COLORS.subText, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  emptyCard: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: COLORS.subText, textAlign: 'center' },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 12,
  },
  alertText: { fontSize: 14, color: COLORS.text, flex: 1 },
  viewAllButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  viewAllText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

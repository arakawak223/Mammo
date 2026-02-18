import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { useFamilyStore } from '../../store/familyStore';
import { useSocketStore } from '../../store/socketStore';
import { getAlertsSocket } from '../../services/socket';
import { AlertCard } from '../../components/AlertCard';
import { COLORS } from '../../utils/theme';

interface EventItem {
  id: string;
  type: string;
  severity: string;
  status: string;
  createdAt: string;
  aiAnalysis?: { riskScore: number } | null;
}

export function AlertListScreen({ navigation }: any) {
  const selectedElderlyId = useFamilyStore((s) => s.selectedElderlyId);
  const addAlert = useSocketStore((s) => s.addAlert);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(
    async (pageNum = 1, append = false) => {
      if (!selectedElderlyId) return;
      setLoading(true);
      try {
        const result: any = await api.getEvents(selectedElderlyId, pageNum);
        if (append) {
          setEvents((prev) => [...prev, ...result.data]);
        } else {
          setEvents(result.data);
        }
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [selectedElderlyId],
  );

  useEffect(() => {
    fetchEvents(1);
  }, [fetchEvents]);

  // Listen for real-time new alerts
  useEffect(() => {
    if (!selectedElderlyId) return;

    const socket = getAlertsSocket();
    if (!socket) return;

    const handleNewAlert = (event: any) => {
      setEvents((prev) => [event, ...prev]);
      addAlert(event);
    };

    const handleResolved = ({ eventId }: { eventId: string }) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: 'resolved' } : e)),
      );
    };

    socket.on('new_alert', handleNewAlert);
    socket.on('alert_resolved', handleResolved);

    return () => {
      socket.off('new_alert', handleNewAlert);
      socket.off('alert_resolved', handleResolved);
    };
  }, [selectedElderlyId, addAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents(1);
    setRefreshing(false);
  }, [fetchEvents]);

  const onEndReached = useCallback(() => {
    if (!loading && page < totalPages) {
      fetchEvents(page + 1, true);
    }
  }, [loading, page, totalPages, fetchEvents]);

  if (!selectedElderlyId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>高齢者を選択してください</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertCard
            event={item}
            onPress={() => navigation.navigate('AlertDetail', { eventId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>アラートはありません</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, color: COLORS.subText },
});

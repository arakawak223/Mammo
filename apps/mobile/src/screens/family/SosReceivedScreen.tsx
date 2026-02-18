import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { getSosSocket } from '../../services/socket';
import { COLORS } from '../../utils/theme';

interface LocationPoint {
  lat: number;
  lng: number;
  ts: string;
  accuracy?: number;
  battery?: number;
}

export function SosReceivedScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const [currentMode, setCurrentMode] = useState<'silent' | 'alarm'>('silent');
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [resolved, setResolved] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  // Fetch initial session data
  useEffect(() => {
    (async () => {
      try {
        const session: any = await api.getSosSession(sessionId);
        if (session) {
          setSessionData(session);
          setCurrentMode(session.mode || 'silent');
          if (session.locations) {
            setLocations(session.locations);
          }
          if (session.status === 'resolved') {
            setResolved(true);
          }
        }
      } catch {
        // silent
      }
    })();
  }, [sessionId]);

  // WebSocket: real-time updates
  useEffect(() => {
    const socket = getSosSocket();
    if (!socket) return;

    socket.emit('join_session', sessionId);

    socket.on('location_update', (location: LocationPoint) => {
      setLocations((prev) => [...prev, location]);
    });

    socket.on('mode_change', ({ mode }: { mode: string }) => {
      setCurrentMode(mode as 'alarm' | 'silent');
    });

    socket.on('resolved', () => {
      setResolved(true);
    });

    return () => {
      socket.emit('leave_session', sessionId);
      socket.off('location_update');
      socket.off('mode_change');
      socket.off('resolved');
    };
  }, [sessionId]);

  const handleModeChange = useCallback(
    async (mode: 'silent' | 'alarm') => {
      try {
        await api.changeSosMode(sessionId, mode);
        setCurrentMode(mode);
      } catch {
        Alert.alert('エラー', 'モード変更に失敗しました');
      }
    },
    [sessionId],
  );

  const handleResolve = useCallback(() => {
    Alert.alert(
      'SOS解除',
      '本当にSOSを解除しますか？\n高齢者の安全を確認してから解除してください。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解除する',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.resolveSos(sessionId);
              setResolved(true);
            } catch {
              Alert.alert('エラー', 'SOS解除に失敗しました');
            }
          },
        },
      ],
    );
  }, [sessionId]);

  const latestLocation = locations[locations.length - 1];

  if (resolved) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.safe }]}>
        <View style={styles.resolvedContent}>
          <Text style={styles.resolvedText}>SOSは解除されました</Text>
          <Text style={styles.resolvedSub}>位置情報: {locations.length}件記録</Text>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>緊急SOS</Text>
        <Text style={styles.message}>緊急SOSが発信されました</Text>

        {/* Mode Toggle */}
        <View style={styles.modeContainer}>
          <Text style={styles.modeLabel}>
            モード: {currentMode === 'silent' ? 'サイレント' : 'アラーム'}
          </Text>
          <View style={styles.modeButtons}>
            <Pressable
              style={[styles.modeBtn, currentMode === 'silent' && styles.modeBtnActive]}
              onPress={() => handleModeChange('silent')}
            >
              <Text style={styles.modeBtnText}>サイレント</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, currentMode === 'alarm' && styles.modeBtnActive]}
              onPress={() => handleModeChange('alarm')}
            >
              <Text style={styles.modeBtnText}>アラーム</Text>
            </Pressable>
          </View>
        </View>

        {/* Map area - shows location data */}
        <View style={styles.mapContainer}>
          {latestLocation ? (
            <View style={styles.mapContent}>
              <Text style={styles.mapLabel}>最新の位置</Text>
              <Text style={styles.mapCoords}>
                {latestLocation.lat.toFixed(6)}, {latestLocation.lng.toFixed(6)}
              </Text>
              {latestLocation.accuracy && (
                <Text style={styles.mapAccuracy}>
                  精度: {latestLocation.accuracy.toFixed(0)}m
                </Text>
              )}
              {latestLocation.battery !== undefined && (
                <Text style={styles.mapBattery}>
                  バッテリー: {latestLocation.battery}%
                </Text>
              )}
              <Text style={styles.mapCount}>
                位置履歴: {locations.length}件
              </Text>
              <Text style={styles.mapHint}>
                (react-native-maps で地図表示 - 実機でテスト)
              </Text>
            </View>
          ) : (
            <Text style={styles.mapPlaceholderText}>位置情報を受信中...</Text>
          )}
        </View>

        {/* Location history */}
        {locations.length > 1 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>位置履歴（最新5件）</Text>
            {locations
              .slice(-5)
              .reverse()
              .map((loc, i) => (
                <View key={i} style={styles.historyItem}>
                  <Text style={styles.historyCoords}>
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(loc.ts).toLocaleTimeString('ja-JP')}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.callButton} onPress={() => Linking.openURL('tel:110')}>
          <Text style={styles.callButtonText}>110番</Text>
        </Pressable>
        <Pressable style={styles.resolveButton} onPress={handleResolve}>
          <Text style={styles.resolveButtonText}>解除する</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.danger },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: { fontSize: 18, color: '#FFF', textAlign: 'center', marginBottom: 20 },
  modeContainer: { marginBottom: 16 },
  modeLabel: { fontSize: 16, color: '#FFF', marginBottom: 8 },
  modeButtons: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.5)' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  mapContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    minHeight: 200,
    justifyContent: 'center',
  },
  mapContent: { alignItems: 'center' },
  mapLabel: { fontSize: 14, color: '#FFF', opacity: 0.8, marginBottom: 4 },
  mapCoords: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  mapAccuracy: { fontSize: 14, color: '#FFF', opacity: 0.8 },
  mapBattery: { fontSize: 14, color: '#FFF', opacity: 0.8 },
  mapCount: { fontSize: 14, color: '#FFF', opacity: 0.8, marginTop: 8 },
  mapHint: { fontSize: 12, color: '#FFF', opacity: 0.5, marginTop: 12, fontStyle: 'italic' },
  mapPlaceholderText: { fontSize: 18, color: '#FFF', textAlign: 'center' },
  historyContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  historyTitle: { fontSize: 14, color: '#FFF', fontWeight: '600', marginBottom: 8 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  historyCoords: { fontSize: 13, color: '#FFF', opacity: 0.8 },
  historyTime: { fontSize: 13, color: '#FFF', opacity: 0.6 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  callButtonText: { fontSize: 18, fontWeight: 'bold', color: COLORS.danger },
  resolveButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  resolveButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  resolvedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resolvedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  resolvedSub: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.8,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.safe,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/theme';

interface Pairing {
  id: string;
  elderly: { id: string; name: string; phone: string };
  role: string;
}

export function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data: any = await api.getPairings();
        setPairings(data);
      } catch {
        setError('ペアリング情報の取得に失敗しました');
      }
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: logout },
    ]);
  };

  const handleAddPairing = () => {
    (navigation as any).navigate('FamilyJoin');
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>
        <View style={styles.card}>
          <Text style={styles.label}>名前</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <Text style={styles.label}>電話番号</Text>
          <Text style={styles.value}>{user?.phone}</Text>
          <Text style={styles.label}>ロール</Text>
          <Text style={styles.value}>
            {user?.role === 'family_owner' ? '家族（オーナー）' : '家族'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>見守り対象</Text>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {pairings.length > 0 ? (
          <View style={styles.card}>
            {pairings.map((p) => (
              <View key={p.id} style={styles.pairingRow}>
                <View>
                  <Text style={styles.pairingName}>{p.elderly.name}</Text>
                  <Text style={styles.pairingPhone}>{p.elderly.phone}</Text>
                </View>
                <Text style={styles.pairingRole}>
                  {p.role === 'owner' ? 'オーナー' : 'メンバー'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>ペアリングがありません</Text>
          </View>
        )}
        <Pressable style={styles.addButton} onPress={handleAddPairing}>
          <Text style={styles.addText}>+ 新しい見守り対象を追加</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>ログアウト</Text>
      </Pressable>

      <Text style={styles.version}>まもりトーク v0.1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  card: { backgroundColor: COLORS.backgroundGray, borderRadius: 12, padding: 16 },
  label: { fontSize: 14, color: COLORS.subText, marginTop: 8 },
  value: { fontSize: 16, color: COLORS.text, marginTop: 2 },
  pairingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pairingName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  pairingPhone: { fontSize: 14, color: COLORS.subText },
  pairingRole: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  emptyText: { fontSize: 15, color: COLORS.subText, textAlign: 'center' },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  addButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  version: { fontSize: 14, color: COLORS.subText, textAlign: 'center', marginTop: 24 },
});

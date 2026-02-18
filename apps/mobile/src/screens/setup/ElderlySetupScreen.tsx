import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/theme';

export function ElderlySetupScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateCode = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result: any = await api.createInvite(user.id);
      setInviteCode(result.code);
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'コードの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const shareCode = useCallback(async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `まもりトークの招待コード: ${inviteCode}\nこのコードを使って家族登録してください。（30分以内有効）`,
      });
    } catch {
      // user cancelled share
    }
  }, [inviteCode]);

  const handleDone = () => {
    navigation.reset({ index: 0, routes: [{ name: 'ElderlyMain' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>家族を招待</Text>
        <Text style={styles.subtitle}>
          家族にあなたを見守ってもらうために{'\n'}招待コードを生成します
        </Text>

        {!inviteCode ? (
          <Pressable
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={generateCode}
            disabled={loading}
          >
            <Text style={styles.generateText}>
              {loading ? '生成中...' : '招待コードを生成'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>招待コード</Text>
            <Text style={styles.code}>{inviteCode}</Text>
            <Text style={styles.codeHint}>30分間有効です</Text>

            <Pressable style={styles.shareButton} onPress={shareCode}>
              <Text style={styles.shareText}>家族に共有する</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.skipButton} onPress={handleDone}>
          <Text style={styles.skipText}>
            {inviteCode ? '完了' : 'あとで設定する'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.subText,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  generateText: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  codeContainer: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  codeLabel: { fontSize: 16, color: COLORS.subText, marginBottom: 8 },
  code: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 8,
    marginBottom: 8,
  },
  codeHint: { fontSize: 14, color: COLORS.subText, marginBottom: 16 },
  shareButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  shareText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipText: { fontSize: 18, color: COLORS.primary },
});

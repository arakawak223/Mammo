import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { COLORS } from '../../utils/theme';

export function FamilyJoinScreen({ navigation }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [elderlyName, setElderlyName] = useState('');

  const handleJoin = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('入力エラー', '6桁の招待コードを入力してください');
      return;
    }

    setLoading(true);
    try {
      const result: any = await api.joinPairing(trimmed);
      setJoined(true);
      setElderlyName(result.elderly?.name || '高齢者');
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ペアリングに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [code]);

  const handleDone = () => {
    navigation.reset({ index: 0, routes: [{ name: 'FamilyMain' }] });
  };

  if (joined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.successEmoji}>{'🎉'}</Text>
          <Text style={styles.title}>ペアリング完了</Text>
          <Text style={styles.subtitle}>
            {elderlyName}さんの見守りを{'\n'}開始しました
          </Text>
          <Pressable style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneText}>はじめる</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>家族を見守る</Text>
        <Text style={styles.subtitle}>
          高齢者から受け取った{'\n'}招待コードを入力してください
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="XXXXXX"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          textAlign="center"
        />

        <Pressable
          style={[styles.joinButton, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
        >
          <Text style={styles.joinText}>
            {loading ? '接続中...' : 'ペアリングする'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.skipButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'FamilyMain' }] })}
        >
          <Text style={styles.skipText}>あとで設定する</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  successEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
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
  codeInput: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 16,
    padding: 20,
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 8,
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  joinText: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipText: { fontSize: 18, color: COLORS.primary },
  doneButton: {
    backgroundColor: COLORS.safe,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  doneText: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
});

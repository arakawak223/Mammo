import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/theme';

export function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('入力エラー', '電話番号とパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      const result: any = await api.login(phone, password);
      setAuth(result.user, result.accessToken, result.refreshToken);
    } catch (e: any) {
      Alert.alert('ログインエラー', e.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>まもりトーク</Text>
        <Text style={styles.subtitle}>特殊詐欺・強盗対策アプリ</Text>

        <TextInput
          style={styles.input}
          placeholder="電話番号"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel="電話番号"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="パスワード"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? 'ログイン中' : 'ログイン'}
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          <Text style={styles.buttonText}>{loading ? 'ログイン中...' : 'ログイン'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 32 },
  title: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
  subtitle: {
    fontSize: 16,
    color: COLORS.subText,
    textAlign: 'center',
    marginBottom: 48,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
});

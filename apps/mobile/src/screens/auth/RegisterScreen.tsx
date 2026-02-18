import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/theme';

type Role = 'elderly' | 'family_member';

export function RegisterScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('elderly');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleRegister = async () => {
    if (!phone || !name || !password) {
      Alert.alert('入力エラー', '全ての項目を入力してください');
      return;
    }

    if (password.length < 6) {
      Alert.alert('入力エラー', 'パスワードは6文字以上にしてください');
      return;
    }

    setLoading(true);
    try {
      const result: any = await api.register({ phone, name, password, role });
      setAuth(result.user, result.accessToken, result.refreshToken);
    } catch (error: any) {
      Alert.alert('登録エラー', error.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>まもりトーク</Text>
          <Text style={styles.subtitle}>新規登録</Text>

          {/* Role Selection */}
          <Text style={styles.label}>あなたは？</Text>
          <View style={styles.roleContainer}>
            <Pressable
              style={[styles.roleButton, role === 'elderly' && styles.roleActive]}
              onPress={() => setRole('elderly')}
            >
              <Text style={[styles.roleEmoji]}>👴</Text>
              <Text
                style={[styles.roleText, role === 'elderly' && styles.roleTextActive]}
              >
                高齢者
              </Text>
              <Text style={styles.roleDesc}>見守られる方</Text>
            </Pressable>
            <Pressable
              style={[styles.roleButton, role === 'family_member' && styles.roleActive]}
              onPress={() => setRole('family_member')}
            >
              <Text style={[styles.roleEmoji]}>👨‍👩‍👧</Text>
              <Text
                style={[
                  styles.roleText,
                  role === 'family_member' && styles.roleTextActive,
                ]}
              >
                家族
              </Text>
              <Text style={styles.roleDesc}>見守る方</Text>
            </Pressable>
          </View>

          {/* Input Fields */}
          <Text style={styles.label}>電話番号</Text>
          <TextInput
            style={styles.input}
            placeholder="09012345678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Text style={styles.label}>お名前</Text>
          <TextInput
            style={styles.input}
            placeholder="山田太郎"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            placeholder="6文字以上"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerText}>
              {loading ? '登録中...' : '登録する'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              既にアカウントをお持ちの方はこちら
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
  subtitle: {
    fontSize: 18,
    color: COLORS.subText,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  roleContainer: { flexDirection: 'row', gap: 12 },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleActive: { borderColor: COLORS.primary, backgroundColor: '#E3F2FD' },
  roleEmoji: { fontSize: 32, marginBottom: 8 },
  roleText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  roleTextActive: { color: COLORS.primary },
  roleDesc: { fontSize: 13, color: COLORS.subText, marginTop: 2 },
  input: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.text,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  registerText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  loginLink: { marginTop: 16, alignItems: 'center' },
  loginLinkText: { fontSize: 16, color: COLORS.primary },
});

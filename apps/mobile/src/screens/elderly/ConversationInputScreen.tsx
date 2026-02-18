import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { ScamCheckResult } from '../../components/ScamCheckResult';
import { COLORS, ELDERLY_UI } from '../../utils/theme';

export function ConversationInputScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [aiResult, setAiResult] = useState<{
    riskScore: number;
    scamType: string;
    summary: string;
  } | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('入力してください', '通話の内容を教えてください');
      return;
    }
    setSending(true);
    try {
      const event: any = await api.reportConversation({ text: trimmed });
      setSent(true);

      // Wait for AI analysis
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const detail: any = await api.getEvent(event.id);
        if (detail.aiAnalysis) {
          setAiResult(detail.aiAnalysis);
        }
      } catch {
        // AI not ready yet
      }
    } catch {
      Alert.alert('エラー', '送信に失敗しました。もう一度お試しください。');
    } finally {
      setSending(false);
    }
  }, [text]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>通話を報告する</Text>
        <Text style={styles.subtitle}>
          今の通話の内容を{'\n'}教えてください
        </Text>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="相手が何と言っていたか、どんな内容だったか書いてください..."
          multiline
          textAlignVertical="top"
          editable={!sent}
        />

        {!sent ? (
          <Pressable
            style={[styles.submitButton, (sending || !text.trim()) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={sending || !text.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <Text style={styles.submitText}>家族に報告する</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.sentMessage}>
            <Text style={styles.sentText}>家族に報告しました</Text>
            <Text style={styles.sentSubText}>安心してください</Text>
          </View>
        )}

        {(aiResult || sending) && (
          <ScamCheckResult analysis={aiResult} loading={sending} />
        )}

        {sent && (
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>ホームに戻る</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: ELDERLY_UI.MIN_FONT_SIZE,
    color: COLORS.subText,
    marginBottom: 20,
    lineHeight: 32,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 20,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundGray,
    minHeight: 180,
    lineHeight: 30,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sentMessage: {
    backgroundColor: COLORS.safe,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
  },
  sentText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sentSubText: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  backButton: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
});

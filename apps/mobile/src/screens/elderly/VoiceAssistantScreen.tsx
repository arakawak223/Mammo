import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speechRecognizer } from '../../native/SpeechRecognizer';
import { api } from '../../services/api';
import { ScamCheckResult } from '../../components/ScamCheckResult';
import { COLORS, ELDERLY_UI } from '../../utils/theme';

type VoiceState = 'idle' | 'listening' | 'processing' | 'result';

export function VoiceAssistantScreen({ navigation }: any) {
  const [state, setState] = useState<VoiceState>('idle');
  const [partialText, setPartialText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [aiResult, setAiResult] = useState<{
    riskScore: number;
    scamType: string;
    summary: string;
  } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for recording
  useEffect(() => {
    if (state === 'listening') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const handleStartListening = useCallback(async () => {
    setPartialText('');
    setTranscript('');
    setAiResult(null);
    setState('listening');

    speechRecognizer.onPartialResult?.((text) => {
      setPartialText(text);
    });

    await speechRecognizer.startListening({ language: 'ja-JP' });
  }, []);

  const handleStopListening = useCallback(async () => {
    setState('processing');
    try {
      const text = await speechRecognizer.stopListening();
      setTranscript(text);

      // Send to AI for analysis
      const result: any = await api.voiceAnalyze(text);
      setAiResult({
        riskScore: result.riskScore,
        scamType: result.scamType,
        summary: result.summary,
      });
      setState('result');
    } catch {
      setState('idle');
    }
  }, []);

  const handleCancel = useCallback(() => {
    speechRecognizer.cancelListening();
    setState('idle');
    setPartialText('');
  }, []);

  const handleReset = useCallback(() => {
    setState('idle');
    setPartialText('');
    setTranscript('');
    setAiResult(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI音声チェック</Text>

        {state === 'idle' && (
          <>
            <Text style={styles.instruction}>
              マイクボタンを押して{'\n'}通話の内容を話してください
            </Text>
            <View style={styles.micContainer}>
              <Pressable style={styles.micButton} onPress={handleStartListening}>
                <Text style={styles.micIcon}>🎤</Text>
                <Text style={styles.micLabel}>タップして開始</Text>
              </Pressable>
            </View>
          </>
        )}

        {state === 'listening' && (
          <>
            <Animated.View
              style={[styles.micContainer, { transform: [{ scale: pulseAnim }] }]}
            >
              <Pressable style={[styles.micButton, styles.micListening]} onPress={handleStopListening}>
                <Text style={styles.micIcon}>🔴</Text>
                <Text style={styles.micLabel}>タップして終了</Text>
              </Pressable>
            </Animated.View>

            <Text style={styles.listeningLabel}>聞いています...</Text>

            {partialText ? (
              <View style={styles.partialBox}>
                <Text style={styles.partialText}>{partialText}</Text>
              </View>
            ) : null}

            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </Pressable>
          </>
        )}

        {state === 'processing' && (
          <View style={styles.processingContainer}>
            <Text style={styles.processingText}>AI解析中...</Text>
            <Text style={styles.processingSubText}>しばらくお待ちください</Text>
          </View>
        )}

        {state === 'result' && (
          <>
            {transcript ? (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>認識テキスト</Text>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </View>
            ) : null}

            <ScamCheckResult analysis={aiResult} />

            <Pressable style={styles.retryButton} onPress={handleReset}>
              <Text style={styles.retryText}>もう一度チェック</Text>
            </Pressable>

            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>ホームに戻る</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  instruction: {
    fontSize: ELDERLY_UI.MIN_FONT_SIZE,
    color: COLORS.subText,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 30,
  },
  micContainer: { marginVertical: 20 },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  micListening: {
    backgroundColor: COLORS.danger,
  },
  micIcon: { fontSize: 48 },
  micLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
  },
  listeningLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginTop: 16,
  },
  partialBox: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '100%',
  },
  partialText: { fontSize: 18, color: COLORS.text, lineHeight: 26 },
  cancelButton: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: { fontSize: 18, fontWeight: '600', color: COLORS.subText },
  processingContainer: { marginTop: 60, alignItems: 'center' },
  processingText: { fontSize: 26, fontWeight: 'bold', color: COLORS.primary },
  processingSubText: { fontSize: 18, color: COLORS.subText, marginTop: 8 },
  transcriptBox: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 8,
  },
  transcriptLabel: { fontSize: 13, color: COLORS.subText, marginBottom: 6 },
  transcriptText: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  retryText: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  backButton: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  backText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
});

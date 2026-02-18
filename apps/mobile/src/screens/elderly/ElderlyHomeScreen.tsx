import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { enqueueEvent } from '../../services/offlineQueue';
import { CancelCountdown } from '../../components/CancelCountdown';
import { ScamCheckResult } from '../../components/ScamCheckResult';
import { COLORS } from '../../utils/theme';

interface AiAnalysis {
  riskScore: number;
  scamType: string;
  summary: string;
}

export function ElderlyHomeScreen({ navigation }: any) {
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const pendingEventRef = useRef<{
    latitude?: number;
    longitude?: number;
  } | null>(null);

  // ─── F1: 「これ詐欺？」ボタン ───
  const handleScamButton = useCallback(async () => {
    Vibration.vibrate(200);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      pendingEventRef.current = { latitude, longitude };
      setShowCountdown(true);
    } catch {
      setStatusMessage('位置情報の取得に失敗しました');
      setTimeout(() => setStatusMessage(''), 5000);
    }
  }, []);

  const handleCountdownComplete = useCallback(async () => {
    setShowCountdown(false);
    setIsSending(true);
    setAiLoading(true);

    const loc = pendingEventRef.current;
    pendingEventRef.current = null;

    try {
      const event: any = await api.createEvent({
        type: 'scam_button',
        severity: 'high',
        payload: { triggeredAt: new Date().toISOString() },
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });

      setStatusMessage('家族に連絡しました。\n安心してください。');
      AccessibilityInfo.announceForAccessibility('家族に連絡しました。安心してください。');

      // Try to fetch AI analysis result
      try {
        // Wait a moment for AI analysis to complete
        await new Promise((r) => setTimeout(r, 2000));
        const detail: any = await api.getEvent(event.id);
        if (detail.aiAnalysis) {
          setAiResult(detail.aiAnalysis);
        }
      } catch {
        // AI result not available yet
      }
    } catch {
      // Offline: queue the event
      await enqueueEvent({
        type: 'scam_button',
        severity: 'high',
        payload: { triggeredAt: new Date().toISOString() },
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });
      setStatusMessage('オフラインのため保存しました。\n接続回復時に送信されます。');
    } finally {
      setIsSending(false);
      setAiLoading(false);
      setTimeout(() => {
        setStatusMessage('');
        setAiResult(null);
      }, 15000);
    }
  }, []);

  const handleCountdownCancel = useCallback(() => {
    setShowCountdown(false);
    pendingEventRef.current = null;
    setStatusMessage('キャンセルしました');
    setTimeout(() => setStatusMessage(''), 3000);
  }, []);

  // ─── F9: 緊急SOS ───
  const handleSosLongPress = useCallback(async () => {
    Vibration.vibrate([0, 500, 200, 500]);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = 0;
      let longitude = 0;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      const session: any = await api.startSos({ latitude, longitude });
      navigation.navigate('SosActive', { sessionId: session.id });
    } catch {
      Alert.alert('エラー', '緊急SOSの送信に失敗しました');
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Cancel Countdown Overlay */}
      {showCountdown && (
        <CancelCountdown
          seconds={3}
          onComplete={handleCountdownComplete}
          onCancel={handleCountdownCancel}
          label="家族に連絡します"
        />
      )}

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.appTitle}>まもりトーク</Text>
        <Text style={styles.statusDot}>安心</Text>
      </View>

      {/* Status Message */}
      {statusMessage ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* AI Result */}
      {(aiResult || aiLoading) && (
        <ScamCheckResult analysis={aiResult} loading={aiLoading} />
      )}

      {/* F1: Scam Button */}
      <View style={styles.mainButtonContainer}>
        <Pressable
          style={({ pressed }) => [styles.scamButton, pressed && styles.scamButtonPressed]}
          onLongPress={handleScamButton}
          delayLongPress={500}
          disabled={isSending || showCountdown}
          accessibilityLabel="これ詐欺ボタン。長押しで家族に連絡します"
          accessibilityRole="button"
        >
          <Text style={styles.scamButtonText}>
            {isSending ? '送信中...' : 'これ 詐欺？'}
          </Text>
          <Text style={styles.scamButtonSub}>長押しで家族に{'\n'}連絡します</Text>
        </Pressable>
      </View>

      {/* F9: SOS Button */}
      <Pressable
        style={({ pressed }) => [styles.sosButton, pressed && styles.sosButtonPressed]}
        onLongPress={handleSosLongPress}
        delayLongPress={3000}
        accessibilityLabel="緊急SOSボタン。3秒長押しで緊急連絡します"
        accessibilityRole="button"
      >
        <Text style={styles.sosButtonText}>SOS（緊急）</Text>
        <Text style={styles.sosButtonSub}>長押し3秒</Text>
      </Pressable>

      {/* Simple Status */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>家族とつながっています</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusDot: {
    fontSize: 20,
    color: COLORS.safe,
  },
  messageBox: {
    backgroundColor: COLORS.safe,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  mainButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  scamButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 24,
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scamButtonPressed: {
    backgroundColor: '#B71C1C',
    transform: [{ scale: 0.97 }],
  },
  scamButtonText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scamButtonSub: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  sosButton: {
    backgroundColor: COLORS.warning,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
  },
  sosButtonPressed: {
    backgroundColor: '#E65100',
  },
  sosButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sosButtonSub: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  footer: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  footerText: {
    fontSize: 20,
    color: COLORS.text,
    textAlign: 'center',
  },
});

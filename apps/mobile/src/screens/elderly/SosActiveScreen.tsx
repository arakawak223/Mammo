import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { getSosSocket } from '../../services/socket';
import { alarmPlayer, speakAlarmMessage } from '../../services/alarmPlayer';
import { audioRecorder } from '../../services/audioRecorder';
import { COLORS } from '../../utils/theme';

const LOCATION_INTERVAL_MS = 10_000;

export function SosActiveScreen({ route, navigation }: any) {
  const { sessionId } = route.params;
  const [mode, setMode] = useState<'alarm' | 'silent'>('silent');
  const [resolved, setResolved] = useState(false);
  const [locationCount, setLocationCount] = useState(0);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const locationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start location tracking
  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Immediately send first update
      sendLocation();

      // Then send every 10 seconds
      locationTimer.current = setInterval(sendLocation, LOCATION_INTERVAL_MS);
    };

    startTracking();

    return () => {
      if (locationTimer.current) clearInterval(locationTimer.current);
    };
  }, [sessionId]);

  const sendLocation = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await api.updateSosLocation(sessionId, {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocationCount((c) => c + 1);
    } catch {
      // Silent - location updates are best-effort
    }
  }, [sessionId]);

  // WebSocket listener for mode changes and resolution
  useEffect(() => {
    const socket = getSosSocket();
    if (!socket) return;

    socket.emit('join_session', sessionId);

    socket.on('mode_change', ({ mode: newMode }: { mode: string }) => {
      setMode(newMode as 'alarm' | 'silent');
    });

    socket.on('resolved', () => {
      setResolved(true);
      alarmPlayer.stopAlarm();
      audioRecorder.stopRecording();
    });

    return () => {
      socket.emit('leave_session', sessionId);
      socket.off('mode_change');
      socket.off('resolved');
    };
  }, [sessionId]);

  // Alarm mode effects
  useEffect(() => {
    if (mode === 'alarm' && !resolved) {
      alarmPlayer.startAlarm();
      speakAlarmMessage('緊急事態です。助けを求めています。');
      startFlashAnimation();
    } else {
      alarmPlayer.stopAlarm();
      flashAnim.stopAnimation();
      flashAnim.setValue(0);
    }

    return () => {
      alarmPlayer.stopAlarm();
    };
  }, [mode, resolved]);

  // Start audio recording
  useEffect(() => {
    if (!resolved) {
      audioRecorder.startRecording();
    }
    return () => {
      audioRecorder.stopRecording();
    };
  }, [resolved]);

  const startFlashAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  };

  const flashColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.danger, '#FF6F00'],
  });

  if (resolved) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.safe }]}>
        <View style={styles.content}>
          <Text style={styles.resolvedText}>SOSが解除されました</Text>
          <Text style={styles.resolvedSub}>安全を確認してください</Text>
        </View>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>ホームに戻る</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Silent mode: minimal banner
  if (mode === 'silent') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.silentBanner}>
          <Text style={styles.silentText}>緊急連絡中（サイレント）</Text>
          <Text style={styles.silentSub}>
            位置情報を共有中 ({locationCount}回送信)
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.mainText}>家族に緊急連絡{'\n'}しました</Text>
          <Text style={styles.subText}>位置情報を共有中です</Text>
        </View>

        <Pressable style={styles.callButton} onPress={() => Linking.openURL('tel:110')}>
          <Text style={styles.callButtonText}>110番に電話する</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Alarm mode: flashing, loud
  return (
    <Animated.View style={[styles.alarmContainer, { backgroundColor: flashColor }]}>
      <SafeAreaView style={styles.alarmInner}>
        <Text style={styles.alarmHeader}>緊急モード</Text>

        <View style={styles.content}>
          <Text style={styles.alarmMainText}>助けを呼んでいます</Text>
          <Text style={styles.alarmSubText}>
            位置情報を共有中 ({locationCount}回送信)
          </Text>
        </View>

        <View style={styles.alarmActions}>
          <Pressable style={styles.callButton} onPress={() => Linking.openURL('tel:110')}>
            <Text style={styles.callButtonText}>110番に電話する</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.danger,
    padding: 24,
  },
  alarmContainer: {
    flex: 1,
  },
  alarmInner: {
    flex: 1,
    padding: 24,
  },
  silentBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  silentText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  silentSub: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  alarmHeader: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  alarmMainText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  subText: {
    fontSize: 22,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  alarmSubText: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  callButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  callButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.danger,
  },
  alarmActions: {
    marginBottom: 24,
  },
  resolvedText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resolvedSub: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.safe,
  },
});

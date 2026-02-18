import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../utils/theme';

interface CancelCountdownProps {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
  label?: string;
}

export function CancelCountdown({
  seconds,
  onComplete,
  onCancel,
  label = '送信中...',
}: CancelCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const handleCancel = useCallback(() => {
    setRemaining(0);
    onCancel();
  }, [onCancel]);

  const progress = (seconds - remaining) / seconds;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.countdown}>{remaining}</Text>
        <Text style={styles.subLabel}>秒後に送信されます</Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 32,
    width: '80%',
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  countdown: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 18,
    color: COLORS.subText,
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.danger,
    borderRadius: 4,
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  cancelText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
});

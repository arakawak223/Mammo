import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

interface SeverityBadgeProps {
  severity: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '緊急', color: '#FFFFFF', bg: COLORS.danger },
  high: { label: '高', color: '#FFFFFF', bg: COLORS.warning },
  medium: { label: '中', color: '#FFFFFF', bg: COLORS.caution },
  low: { label: '低', color: COLORS.text, bg: COLORS.backgroundGray },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

interface RiskScoreGaugeProps {
  score: number;
  size?: 'small' | 'large';
}

function getScoreColor(score: number): string {
  if (score >= 81) return COLORS.danger;
  if (score >= 61) return COLORS.warning;
  if (score >= 31) return COLORS.caution;
  return COLORS.safe;
}

function getScoreLabel(score: number): string {
  if (score >= 81) return '危険';
  if (score >= 61) return '警告';
  if (score >= 31) return '注意';
  return '安全';
}

export function RiskScoreGauge({ score, size = 'small' }: RiskScoreGaugeProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const isLarge = size === 'large';

  return (
    <View style={[styles.container, isLarge && styles.containerLarge, { borderColor: color }]}>
      <Text style={[styles.score, isLarge && styles.scoreLarge, { color }]}>{score}</Text>
      <Text style={[styles.label, isLarge && styles.labelLarge, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLarge: {
    fontSize: 28,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 12,
  },
});

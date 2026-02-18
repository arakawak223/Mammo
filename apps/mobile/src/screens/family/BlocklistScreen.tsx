import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/theme';

export function BlocklistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>着信拒否リスト</Text>
      <Text style={styles.placeholder}>Phase 2 で実装予定</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  placeholder: { fontSize: 16, color: COLORS.subText },
});

/**
 * Lazy-loaded screen components for performance.
 * Reduces initial bundle load by deferring non-critical screens.
 */
import React, { Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

function LoadingFallback() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export function withSuspense<P extends Record<string, unknown>>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
): React.FC<P> {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

export const LazyStatisticsScreen = withSuspense(
  React.lazy(() =>
    import('../screens/family/StatisticsScreen').then((m) => ({
      default: m.StatisticsScreen,
    })),
  ),
);

export const LazyDarkJobCheckerScreen = withSuspense(
  React.lazy(() =>
    import('../screens/family/DarkJobCheckerScreen').then((m) => ({
      default: m.DarkJobCheckerScreen,
    })),
  ),
);

export const LazyBlocklistScreen = withSuspense(
  React.lazy(() =>
    import('../screens/family/BlocklistScreen').then((m) => ({
      default: m.BlocklistScreen,
    })),
  ),
);

export const LazySettingsScreen = withSuspense(
  React.lazy(() =>
    import('../screens/family/SettingsScreen').then((m) => ({
      default: m.SettingsScreen,
    })),
  ),
);

export const LazyConversationInputScreen = withSuspense(
  React.lazy(() =>
    import('../screens/elderly/ConversationInputScreen').then((m) => ({
      default: m.ConversationInputScreen,
    })),
  ),
);

export const LazyVoiceAssistantScreen = withSuspense(
  React.lazy(() =>
    import('../screens/elderly/VoiceAssistantScreen').then((m) => ({
      default: m.VoiceAssistantScreen,
    })),
  ),
);

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { connectSosSocket, connectAlertsSocket, disconnectAll } from './services/socket';
import { flushQueue } from './services/offlineQueue';
import { startAutoForward, stopAutoForward } from './services/autoForward';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (isAuthenticated) {
      connectSosSocket();
      connectAlertsSocket();
      // Flush any queued offline events
      flushQueue().then(({ sent, failed }) => {
        if (sent > 0) console.log(`[Offline] Flushed ${sent} events, ${failed} remaining`);
      });
      // Start auto-forward for elderly users (F2)
      if (userRole === 'elderly') {
        startAutoForward().catch((err) =>
          console.warn('[AutoForward] Failed to start:', err),
        );
      }
    } else {
      disconnectAll();
      stopAutoForward().catch(() => {});
    }

    return () => {
      disconnectAll();
      stopAutoForward().catch(() => {});
    };
  }, [isAuthenticated, userRole]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

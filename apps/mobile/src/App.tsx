import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { useAuthStore } from './store/authStore';
import { connectSosSocket, connectAlertsSocket, disconnectAll } from './services/socket';
import { flushQueue } from './services/offlineQueue';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      connectSosSocket();
      connectAlertsSocket();
      // Flush any queued offline events
      flushQueue().then(({ sent, failed }) => {
        if (sent > 0) console.log(`[Offline] Flushed ${sent} events, ${failed} remaining`);
      });
    } else {
      disconnectAll();
    }

    return () => {
      disconnectAll();
    };
  }, [isAuthenticated]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

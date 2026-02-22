import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator, RootStackParamList } from './navigation/RootNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/authStore';
import { connectSosSocket, connectAlertsSocket, disconnectAll } from './services/socket';
import { flushQueue } from './services/offlineQueue';
import { startAutoForward, stopAutoForward } from './services/autoForward';
import { initSentry, setUser, clearUser } from './services/sentry';
import {
  registerForPushNotifications,
  setupNotificationChannels,
  startNotificationListeners,
  clearDeviceToken,
} from './services/notifications';

// Initialize Sentry as early as possible
initSentry();

const linking: any = {
  prefixes: ['mamoritalk://', 'https://mamoritalk.jp'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ElderlyMain: {
        screens: {
          Home: 'elderly/home',
          SosActive: 'elderly/sos/:sessionId',
          VoiceAssistant: 'elderly/voice',
          ConversationInput: 'elderly/conversation',
        },
      },
      FamilyMain: {
        screens: {
          Dashboard: 'family/dashboard',
          Alerts: {
            screens: {
              AlertList: 'family/alerts',
              AlertDetail: 'family/alerts/:eventId',
            },
          },
          SosReceived: 'family/sos/:sessionId',
          Blocklist: 'family/blocklist',
          Statistics: 'family/statistics',
          DarkJobChecker: 'family/dark-job',
          Settings: 'family/settings',
        },
      },
      ElderlySetup: 'setup/elderly',
      FamilyJoin: 'setup/family-join',
    },
  },
};

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Set up Android notification channels once on mount
  useEffect(() => {
    setupNotificationChannels();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Set Sentry user context
      if (userId && userRole) {
        setUser(userId, userRole);
      }
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

      // Register for push notifications
      registerForPushNotifications().catch((err) =>
        console.warn('[Push] Registration failed:', err),
      );

      // Start notification listeners with navigation handling
      const removeListeners = startNotificationListeners((data) => {
        if (!navigationRef.current) return;
        const nav = navigationRef.current;

        if (data.type === 'sos' && data.sessionId) {
          nav.navigate('FamilyMain', {
            screen: 'SosReceived',
            params: { sessionId: data.sessionId },
          } as any);
        } else if (data.type === 'alert' && data.eventId) {
          nav.navigate('FamilyMain', {
            screen: 'Alerts',
            params: { screen: 'AlertDetail', params: { eventId: data.eventId } },
          } as any);
        }
      });

      return () => {
        removeListeners();
      };
    } else {
      clearUser();
      clearDeviceToken();
      disconnectAll();
      stopAutoForward().catch(() => {});
    }

    return () => {
      disconnectAll();
      stopAutoForward().catch(() => {});
    };
  }, [isAuthenticated, userRole, userId]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} linking={linking}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

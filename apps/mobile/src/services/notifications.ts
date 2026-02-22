import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  try {
    // Use getDevicePushTokenAsync for FCM token (backend uses firebase-admin directly)
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    const tokenStr = typeof token === 'string' ? token : String(token);
    console.log('[Push] Device token obtained');

    // Send token to backend
    await api.updateDeviceToken(tokenStr);
    console.log('[Push] Token registered with backend');

    return tokenStr;
  } catch (error) {
    console.error('[Push] Failed to get/register token:', error);
    return null;
  }
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('alerts', {
    name: 'Alerts',
    description: 'Fraud alerts and notifications',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableLights: true,
    lightColor: '#1565C0',
  });

  await Notifications.setNotificationChannelAsync('emergency', {
    name: 'Emergency',
    description: 'SOS and critical alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarm.mp3',
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    enableLights: true,
    lightColor: '#D32F2F',
    bypassDnd: true,
  });
}

export function startNotificationListeners(
  onNotificationTap?: (data: Record<string, string>) => void,
): () => void {
  // Listener for notifications received while app is in foreground
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Push] Received:', notification.request.content.title);
  });

  // Listener for when user taps a notification
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, string>;
    console.log('[Push] Tapped:', data);
    onNotificationTap?.(data);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

export async function clearDeviceToken(): Promise<void> {
  try {
    await api.updateDeviceToken('');
    console.log('[Push] Device token cleared');
  } catch {
    // Best-effort on logout
  }
}

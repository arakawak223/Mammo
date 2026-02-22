import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'まもりトーク',
  slug: 'mamori-talk',
  version: '0.1.0',
  scheme: 'mamoritalk',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1565C0',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.mamoritalk.app',
    googleServicesFile: './GoogleService-Info.plist',
    associatedDomains: ['applinks:mamoritalk.jp'],
    infoPlist: {
      NSLocationWhenInUseUsageDescription: '緊急時に家族に現在地を知らせるために使用します',
      NSLocationAlwaysAndWhenInUseUsageDescription: '緊急SOS時に位置情報を家族に送信するために使用します',
      NSMicrophoneUsageDescription: '緊急SOS時に周囲の音声を家族に送るために使用します',
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1565C0',
    },
    googleServicesFile: './google-services.json',
    package: 'com.mamoritalk.app',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'mamoritalk.jp', pathPrefix: '/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'READ_PHONE_STATE',
      'READ_CALL_LOG',
      'READ_SMS',
      'RECEIVE_SMS',
      'RECORD_AUDIO',
      'FOREGROUND_SERVICE',
      'POST_NOTIFICATIONS',
    ],
  },
  plugins: [
    'expo-location',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#1565C0',
        sounds: ['./assets/alarm.mp3'],
      },
    ],
  ],
};

export default config;

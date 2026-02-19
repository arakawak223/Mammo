import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'まもりトーク',
  slug: 'mamori-talk',
  version: '0.1.0',
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
    infoPlist: {
      NSLocationWhenInUseUsageDescription: '緊急時に家族に現在地を知らせるために使用します',
      NSLocationAlwaysAndWhenInUseUsageDescription: '緊急SOS時に位置情報を家族に送信するために使用します',
      NSMicrophoneUsageDescription: '緊急SOS時に周囲の音声を家族に送るために使用します',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1565C0',
    },
    package: 'com.mamoritalk.app',
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
  plugins: ['expo-location'],
};

export default config;

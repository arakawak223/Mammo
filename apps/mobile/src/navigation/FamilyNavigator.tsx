import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FamilyDashboardScreen } from '../screens/family/FamilyDashboardScreen';
import { AlertListScreen } from '../screens/family/AlertListScreen';
import { AlertDetailScreen } from '../screens/family/AlertDetailScreen';
import { BlocklistScreen } from '../screens/family/BlocklistScreen';
import { BlocklistAddScreen } from '../screens/family/BlocklistAddScreen';
import { DarkJobCheckerScreen } from '../screens/family/DarkJobCheckerScreen';
import { StatisticsScreen } from '../screens/family/StatisticsScreen';
import { SosReceivedScreen } from '../screens/family/SosReceivedScreen';
import { SettingsScreen } from '../screens/family/SettingsScreen';

// ─── Tab Navigator ───
export type FamilyTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Shield: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<FamilyTabParamList>();

// ─── Alert Stack ───
export type AlertStackParamList = {
  AlertList: undefined;
  AlertDetail: { eventId: string };
  SosReceived: { sessionId: string };
  Statistics: undefined;
};

const AlertStack = createNativeStackNavigator<AlertStackParamList>();

function AlertNavigator() {
  return (
    <AlertStack.Navigator>
      <AlertStack.Screen name="AlertList" component={AlertListScreen} options={{ title: '通知' }} />
      <AlertStack.Screen
        name="AlertDetail"
        component={AlertDetailScreen}
        options={{ title: 'アラート詳細' }}
      />
      <AlertStack.Screen
        name="SosReceived"
        component={SosReceivedScreen}
        options={{ headerShown: false }}
      />
      <AlertStack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{ title: '統計ダッシュボード' }}
      />
    </AlertStack.Navigator>
  );
}

// ─── Shield Stack (Blocklist + DarkJobChecker) ───
export type ShieldStackParamList = {
  BlocklistMain: undefined;
  BlocklistAdd: { elderlyId: string };
  DarkJobChecker: undefined;
};

const ShieldStack = createNativeStackNavigator<ShieldStackParamList>();

function ShieldNavigator() {
  return (
    <ShieldStack.Navigator>
      <ShieldStack.Screen
        name="BlocklistMain"
        component={BlocklistScreen}
        options={{ title: '防御' }}
      />
      <ShieldStack.Screen
        name="BlocklistAdd"
        component={BlocklistAddScreen}
        options={{ title: '番号追加' }}
      />
      <ShieldStack.Screen
        name="DarkJobChecker"
        component={DarkJobCheckerScreen}
        options={{ title: '闇バイトチェッカー' }}
      />
    </ShieldStack.Navigator>
  );
}

export function FamilyNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1565C0',
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={FamilyDashboardScreen}
        options={{ title: 'ホーム' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertNavigator}
        options={{ headerShown: false, title: '通知' }}
      />
      <Tab.Screen
        name="Shield"
        component={ShieldNavigator}
        options={{ headerShown: false, title: '防御' }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}

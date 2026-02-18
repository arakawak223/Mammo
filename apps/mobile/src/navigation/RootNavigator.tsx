import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ElderlySetupScreen } from '../screens/setup/ElderlySetupScreen';
import { FamilyJoinScreen } from '../screens/setup/FamilyJoinScreen';
import { ElderlyNavigator } from './ElderlyNavigator';
import { FamilyNavigator } from './FamilyNavigator';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ElderlySetup: undefined;
  FamilyJoin: undefined;
  ElderlyMain: undefined;
  FamilyMain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  if (user?.role === 'elderly') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ElderlyMain" component={ElderlyNavigator} />
        <Stack.Screen name="ElderlySetup" component={ElderlySetupScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FamilyMain" component={FamilyNavigator} />
      <Stack.Screen name="FamilyJoin" component={FamilyJoinScreen} />
    </Stack.Navigator>
  );
}

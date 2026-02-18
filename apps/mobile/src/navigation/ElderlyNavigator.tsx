import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ElderlyHomeScreen } from '../screens/elderly/ElderlyHomeScreen';
import { SosActiveScreen } from '../screens/elderly/SosActiveScreen';

export type ElderlyStackParamList = {
  ElderlyHome: undefined;
  SosActive: { sessionId: string };
};

const Stack = createNativeStackNavigator<ElderlyStackParamList>();

export function ElderlyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ElderlyHome" component={ElderlyHomeScreen} />
      <Stack.Screen name="SosActive" component={SosActiveScreen} />
    </Stack.Navigator>
  );
}

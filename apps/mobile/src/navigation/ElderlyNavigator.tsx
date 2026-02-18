import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ElderlyHomeScreen } from '../screens/elderly/ElderlyHomeScreen';
import { SosActiveScreen } from '../screens/elderly/SosActiveScreen';
import { ConversationInputScreen } from '../screens/elderly/ConversationInputScreen';
import { VoiceAssistantScreen } from '../screens/elderly/VoiceAssistantScreen';

export type ElderlyStackParamList = {
  ElderlyHome: undefined;
  SosActive: { sessionId: string };
  ConversationInput: undefined;
  VoiceAssistant: undefined;
};

const Stack = createNativeStackNavigator<ElderlyStackParamList>();

export function ElderlyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ElderlyHome" component={ElderlyHomeScreen} />
      <Stack.Screen name="SosActive" component={SosActiveScreen} />
      <Stack.Screen
        name="ConversationInput"
        component={ConversationInputScreen}
        options={{ headerShown: true, title: '通話報告' }}
      />
      <Stack.Screen
        name="VoiceAssistant"
        component={VoiceAssistantScreen}
        options={{ headerShown: true, title: 'AI音声チェック' }}
      />
    </Stack.Navigator>
  );
}

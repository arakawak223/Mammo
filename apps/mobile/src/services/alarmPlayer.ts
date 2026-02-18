/**
 * Alarm player service for SOS alarm mode.
 * Uses expo-av for audio playback and screen flash effect.
 * Note: Actual audio playback requires a real device with expo-av.
 */

// Interface for alarm player (actual implementation needs expo-av on device)
export interface AlarmPlayer {
  startAlarm: () => Promise<void>;
  stopAlarm: () => Promise<void>;
  isPlaying: () => boolean;
}

let playing = false;

export const alarmPlayer: AlarmPlayer = {
  startAlarm: async () => {
    if (playing) return;
    playing = true;
    console.log('[AlarmPlayer] Alarm started (stub - needs real device for audio)');
    // On real device:
    // const { Sound } = await import('expo-av').then(m => m.Audio);
    // const { sound } = await Sound.createAsync(require('../../assets/alarm.mp3'));
    // await sound.setIsLoopingAsync(true);
    // await sound.playAsync();
  },

  stopAlarm: async () => {
    if (!playing) return;
    playing = false;
    console.log('[AlarmPlayer] Alarm stopped');
    // On real device: sound.stopAsync(), sound.unloadAsync()
  },

  isPlaying: () => playing,
};

/**
 * Text-to-Speech for alarm mode announcements.
 * Stub: needs expo-speech on real device.
 */
export async function speakAlarmMessage(message: string): Promise<void> {
  console.log(`[TTS] ${message}`);
  // On real device:
  // import * as Speech from 'expo-speech';
  // await Speech.speak(message, { language: 'ja', rate: 0.8, pitch: 1.2 });
}

/**
 * Alarm player service for SOS alarm mode.
 * Uses expo-av for audio playback and expo-speech for TTS.
 */
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export interface AlarmPlayer {
  startAlarm: () => Promise<void>;
  stopAlarm: () => Promise<void>;
  isPlaying: () => boolean;
}

let playing = false;
let soundInstance: Audio.Sound | null = null;

export const alarmPlayer: AlarmPlayer = {
  startAlarm: async () => {
    if (playing) return;
    playing = true;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      // Speak alarm message immediately
      speakAlarmMessage('緊急SOSが発信されました。周囲の方、助けてください。');

      // Try to play alarm audio file if available
      try {
        const { sound } = await Audio.Sound.createAsync(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../assets/alarm.mp3'),
          { isLooping: true, volume: 1.0 },
        );
        soundInstance = sound;
        await sound.playAsync();
      } catch {
        // No alarm.mp3 available — rely on TTS repeating
        startRepeatingTts();
      }
    } catch {
      // expo-av not functional (e.g. Codespaces) — TTS fallback
      startRepeatingTts();
    }
  },

  stopAlarm: async () => {
    if (!playing) return;
    playing = false;
    stopRepeatingTts();

    if (soundInstance) {
      try {
        await soundInstance.stopAsync();
        await soundInstance.unloadAsync();
      } catch {
        // ignore
      }
      soundInstance = null;
    }

    Speech.stop();
  },

  isPlaying: () => playing,
};

// ─── TTS-based alarm (fallback when no audio file) ───

let ttsInterval: ReturnType<typeof setInterval> | null = null;

function startRepeatingTts(): void {
  stopRepeatingTts();
  ttsInterval = setInterval(() => {
    if (playing) {
      speakAlarmMessage('緊急SOS。助けてください。');
    } else {
      stopRepeatingTts();
    }
  }, 5000);
}

function stopRepeatingTts(): void {
  if (ttsInterval) {
    clearInterval(ttsInterval);
    ttsInterval = null;
  }
}

/**
 * Text-to-Speech for alarm mode announcements.
 */
export function speakAlarmMessage(message: string): void {
  try {
    Speech.speak(message, {
      language: 'ja',
      rate: Platform.OS === 'ios' ? 0.5 : 0.8,
      pitch: 1.2,
      volume: 1.0,
    });
  } catch {
    console.warn(`[TTS] Speech not available: ${message}`);
  }
}

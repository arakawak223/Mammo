/**
 * Audio recorder service for SOS evidence capture.
 * Uses expo-av on real devices.
 */
import { Audio } from 'expo-av';

export interface AudioRecorder {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  isRecording: () => boolean;
}

let isCurrentlyRecording = false;
let recordingInstance: Audio.Recording | null = null;

export const audioRecorder: AudioRecorder = {
  startRecording: async () => {
    if (isCurrentlyRecording) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn('[AudioRecorder] Microphone permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingInstance = recording;
      isCurrentlyRecording = true;
    } catch {
      console.warn('[AudioRecorder] Recording not available on this device');
    }
  },

  stopRecording: async () => {
    if (!isCurrentlyRecording || !recordingInstance) {
      isCurrentlyRecording = false;
      return null;
    }

    try {
      await recordingInstance.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingInstance.getURI();
      recordingInstance = null;
      isCurrentlyRecording = false;
      return uri || null;
    } catch {
      console.warn('[AudioRecorder] Error stopping recording');
      recordingInstance = null;
      isCurrentlyRecording = false;
      return null;
    }
  },

  isRecording: () => isCurrentlyRecording,
};

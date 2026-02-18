/**
 * Audio recorder service for SOS evidence capture.
 * Stub implementation for Codespaces (no device mic).
 * Uses expo-av on real devices.
 */

export interface AudioRecorder {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  isRecording: () => boolean;
}

let recording = false;

export const audioRecorder: AudioRecorder = {
  startRecording: async () => {
    if (recording) return;
    recording = true;
    console.log('[AudioRecorder] Recording started (stub - needs real device)');
    // On real device:
    // import { Audio } from 'expo-av';
    // await Audio.requestPermissionsAsync();
    // await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    // const { recording } = await Audio.Recording.createAsync(
    //   Audio.RecordingOptionsPresets.HIGH_QUALITY
    // );
  },

  stopRecording: async () => {
    if (!recording) return null;
    recording = false;
    console.log('[AudioRecorder] Recording stopped');
    return null;
    // On real device:
    // await recording.stopAndUnloadAsync();
    // return recording.getURI();
  },

  isRecording: () => recording,
};

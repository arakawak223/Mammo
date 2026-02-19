jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

import { alarmPlayer, speakAlarmMessage } from '../alarmPlayer';
import * as Speech from 'expo-speech';

beforeEach(async () => {
  jest.clearAllMocks();
  // Reset state
  if (alarmPlayer.isPlaying()) {
    await alarmPlayer.stopAlarm();
  }
});

describe('alarmPlayer', () => {
  it('should start alarm', async () => {
    await alarmPlayer.startAlarm();
    expect(alarmPlayer.isPlaying()).toBe(true);
  });

  it('should stop alarm', async () => {
    await alarmPlayer.startAlarm();
    await alarmPlayer.stopAlarm();
    expect(alarmPlayer.isPlaying()).toBe(false);
  });

  it('should not start if already playing', async () => {
    await alarmPlayer.startAlarm();
    await alarmPlayer.startAlarm();
    expect(alarmPlayer.isPlaying()).toBe(true);
  });
});

describe('speakAlarmMessage', () => {
  it('should call Speech.speak with Japanese language', () => {
    speakAlarmMessage('テスト');
    expect(Speech.speak).toHaveBeenCalledWith(
      'テスト',
      expect.objectContaining({ language: 'ja' }),
    );
  });
});

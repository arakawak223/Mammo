import { audioRecorder } from '../audioRecorder';

beforeEach(async () => {
  jest.clearAllMocks();
  if (audioRecorder.isRecording()) {
    await audioRecorder.stopRecording();
  }
});

describe('audioRecorder', () => {
  it('should start recording', async () => {
    await audioRecorder.startRecording();
    expect(audioRecorder.isRecording()).toBe(true);
  });

  it('should stop recording and return URI', async () => {
    await audioRecorder.startRecording();
    const uri = await audioRecorder.stopRecording();
    expect(uri).toBe('file://test.m4a');
    expect(audioRecorder.isRecording()).toBe(false);
  });

  it('should return null when stopping without recording', async () => {
    const uri = await audioRecorder.stopRecording();
    expect(uri).toBeNull();
  });

  it('should not start if already recording', async () => {
    await audioRecorder.startRecording();
    await audioRecorder.startRecording();
    expect(audioRecorder.isRecording()).toBe(true);
  });
});

/**
 * SpeechRecognizer — real implementation using expo-speech-recognition
 * with graceful fallback to stub for environments without microphone.
 *
 * On real devices: attempts to use expo-speech-recognition for live STT.
 * On Codespaces / simulator without mic: falls back to hardcoded test phrases.
 */
import { Platform } from 'react-native';

export interface SpeechRecognizerInterface {
  startListening: (options?: { language?: string }) => Promise<void>;
  stopListening: () => Promise<string>;
  cancelListening: () => void;
  isListening: () => boolean;
  onPartialResult?: (callback: (text: string) => void) => void;
}

// ─── Real implementation using expo-speech-recognition ───

class RealSpeechRecognizer implements SpeechRecognizerInterface {
  private _isListening = false;
  private _partialCallback: ((text: string) => void) | null = null;
  private _module: any = null;
  private _transcript = '';
  private _resolveStop: ((text: string) => void) | null = null;

  async startListening(options?: { language?: string }): Promise<void> {
    this._isListening = true;
    this._transcript = '';

    if (!this._module) {
      // Dynamic import — only loaded on device where the module exists
      // @ts-expect-error — expo-speech-recognition types unavailable in Codespaces
      this._module = await import('expo-speech-recognition').catch(() => null);
    }

    if (!this._module) {
      console.warn('[SpeechRecognizer] expo-speech-recognition not available');
      return;
    }

    const { ExpoSpeechRecognitionModule } = this._module;
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn('[SpeechRecognizer] Permission denied');
      this._isListening = false;
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: options?.language || 'ja-JP',
      interimResults: true,
      continuous: true,
    });
  }

  async stopListening(): Promise<string> {
    this._isListening = false;

    if (this._module) {
      const { ExpoSpeechRecognitionModule } = this._module;
      ExpoSpeechRecognitionModule.stop();
    }

    return this._transcript || '';
  }

  cancelListening(): void {
    this._isListening = false;
    this._transcript = '';

    if (this._module) {
      try {
        const { ExpoSpeechRecognitionModule } = this._module;
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore
      }
    }
  }

  isListening(): boolean {
    return this._isListening;
  }

  onPartialResult(callback: (text: string) => void): void {
    this._partialCallback = callback;
  }

  /** Called from event handlers to update transcript */
  handleResult(text: string, isFinal: boolean): void {
    if (isFinal) {
      this._transcript = text;
    }
    if (this._partialCallback && this._isListening) {
      this._partialCallback(text);
    }
  }
}

// ─── Stub for development / Codespaces ───

const TEST_PHRASES = [
  '先ほど電話がありまして、市役所の者だと名乗っていました。還付金があるのでATMに行くように言われました。',
  '息子を名乗る人から電話がありました。会社のお金を使い込んでしまったので今日中に200万円必要だと言われています。',
  '今日は特に怪しい電話はありませんでした。友人と世間話をしただけです。',
  '知らない番号から着信がありました。投資の話で必ず儲かると言われましたが、よく分かりませんでした。',
];

class SpeechRecognizerStub implements SpeechRecognizerInterface {
  private _isListening = false;
  private _partialCallback: ((text: string) => void) | null = null;
  private _timeoutIds: ReturnType<typeof setTimeout>[] = [];

  async startListening(_options?: { language?: string }): Promise<void> {
    this._isListening = true;

    if (this._partialCallback) {
      const phrase = TEST_PHRASES[Math.floor(Math.random() * TEST_PHRASES.length)];
      const words = phrase.split('');
      let partial = '';
      words.forEach((char, i) => {
        const id = setTimeout(() => {
          if (this._isListening) {
            partial += char;
            this._partialCallback?.(partial);
          }
        }, i * 50);
        this._timeoutIds.push(id);
      });
    }
  }

  async stopListening(): Promise<string> {
    this._isListening = false;
    this._clearTimeouts();
    return TEST_PHRASES[Math.floor(Math.random() * TEST_PHRASES.length)];
  }

  cancelListening(): void {
    this._isListening = false;
    this._clearTimeouts();
  }

  isListening(): boolean {
    return this._isListening;
  }

  onPartialResult(callback: (text: string) => void): void {
    this._partialCallback = callback;
  }

  private _clearTimeouts(): void {
    this._timeoutIds.forEach(clearTimeout);
    this._timeoutIds = [];
  }
}

// ─── Export: real on device, stub in development ───

function createSpeechRecognizer(): SpeechRecognizerInterface {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return new RealSpeechRecognizer();
  }
  return new SpeechRecognizerStub();
}

export const speechRecognizer: SpeechRecognizerInterface = createSpeechRecognizer();

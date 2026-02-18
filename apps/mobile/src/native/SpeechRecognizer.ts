/**
 * SpeechRecognizer interface and development stub (F3: AI Voice Assistant).
 * Real STT implementation requires native modules not available in Codespaces.
 */

export interface SpeechRecognizerInterface {
  startListening: (options?: { language?: string }) => Promise<void>;
  stopListening: () => Promise<string>;
  cancelListening: () => void;
  isListening: () => boolean;
  onPartialResult?: (callback: (text: string) => void) => void;
}

// Development stub with hardcoded Japanese test phrases
const TEST_PHRASES = [
  '先ほど電話がありまして、市役所の者だと名乗っていました。還付金があるのでATMに行くように言われました。',
  '息子を名乗る人から電話がありました。会社のお金を使い込んでしまったので今日中に200万円必要だと言われています。',
  '今日は特に怪しい電話はありませんでした。友人と世間話をしただけです。',
  '知らない番号から着信がありました。投資の話で必ず儲かると言われましたが、よく分かりませんでした。',
];

class SpeechRecognizerStub implements SpeechRecognizerInterface {
  private _isListening = false;
  private _partialCallback: ((text: string) => void) | null = null;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;

  async startListening(_options?: { language?: string }): Promise<void> {
    this._isListening = true;

    // Simulate partial results
    if (this._partialCallback) {
      const phrase = TEST_PHRASES[Math.floor(Math.random() * TEST_PHRASES.length)];
      const words = phrase.split('');
      let partial = '';
      words.forEach((char, i) => {
        setTimeout(() => {
          if (this._isListening) {
            partial += char;
            this._partialCallback?.(partial);
          }
        }, i * 50);
      });
    }
  }

  async stopListening(): Promise<string> {
    this._isListening = false;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    // Return a random test phrase
    return TEST_PHRASES[Math.floor(Math.random() * TEST_PHRASES.length)];
  }

  cancelListening(): void {
    this._isListening = false;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  isListening(): boolean {
    return this._isListening;
  }

  onPartialResult(callback: (text: string) => void): void {
    this._partialCallback = callback;
  }
}

export const speechRecognizer: SpeechRecognizerInterface = new SpeechRecognizerStub();

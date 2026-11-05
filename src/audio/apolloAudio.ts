/**
 * NoboTara-71: Procedural Web Audio Engine
 * Features authentic Apollo 11 Quindar tones (2525Hz / 2475Hz),
 * radio static bursts, bandpass-filtered speech, rover engine synthesis,
 * laser pulse sounds, and server-side Gemini TTS / male astronaut synthesis.
 */

class ApolloAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private roverOsc: OscillatorNode | null = null;
  private roverGain: GainNode | null = null;
  private ambientNoiseNode: AudioNode | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private initialized: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public init() {
    if (this.initialized) return;
    try {
      const ctx = this.getContext();
      this.setupRoverHum(ctx);
      this.setupBackgroundCosmicStatic(ctx);
      this.initialized = true;
    } catch {
      // AudioContext might require user gesture
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.roverGain && this.ctx) {
      if (muted) {
        this.roverGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
    if (muted) {
      this.stopSpeaking();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play Apollo Quindar Tone
   * Type 'intro': 2525 Hz for 250ms (mic key-down)
   * Type 'outro': 2475 Hz for 250ms (mic unkey)
   */
  public playQuindarTone(type: 'intro' | 'outro' = 'intro') {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const freq = type === 'intro' ? 2525 : 2475;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
      gain.gain.setValueAtTime(0.08, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);

      // Squelch static burst along with Quindar tone
      this.playStaticBurst(0.18, 0.03);
    } catch {
      // Audio failure fallback
    }
  }

  /**
   * Radio static / squelch burst
   */
  public playStaticBurst(durationSec = 0.2, volume = 0.04) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const bufferSize = Math.floor(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch {
      // Audio failure fallback
    }
  }

  /**
   * Laser pulse sound (frequency sweep for retroreflector firing)
   */
  public playLaserPulse() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.45);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.45);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.52);

      // Return pulse echo after 0.8s
      setTimeout(() => {
        if (this.isMuted) return;
        const echoOsc = ctx.createOscillator();
        const echoGain = ctx.createGain();
        echoOsc.type = 'sine';
        echoOsc.frequency.setValueAtTime(880, ctx.currentTime);
        echoGain.gain.setValueAtTime(0.08, ctx.currentTime);
        echoGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        echoOsc.connect(echoGain);
        echoGain.connect(ctx.destination);
        echoOsc.start();
        echoOsc.stop(ctx.currentTime + 0.35);
      }, 700);
    } catch {
      // Audio failure fallback
    }
  }

  /**
   * Rover drive hum setup
   */
  private setupRoverHum(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 45; // baseline idle hum
    gain.gain.value = 0.0;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    this.roverOsc = osc;
    this.roverGain = gain;
  }

  /**
   * Update rover sound based on normalized speed (0 to 1)
   */
  public updateRoverSpeed(speedNormalized: number) {
    if (this.isMuted || !this.roverOsc || !this.roverGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const targetFreq = 45 + speedNormalized * 85;
    const targetGain = speedNormalized > 0.05 ? 0.02 + speedNormalized * 0.04 : 0.005;

    this.roverOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.roverGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  /**
   * Faint ambient cosmic microwave silence
   */
  private setupBackgroundCosmicStatic(ctx: AudioContext) {
    try {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.01;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 1.0;

      const gain = ctx.createGain();
      gain.gain.value = 0.006;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      this.ambientNoiseNode = noise;
    } catch {
      // Audio setup failure fallback
    }
  }

  /**
   * Puzzle success or item matched chime
   */
  public playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.38);
      });
    } catch {
      // Audio failure fallback
    }
  }

  /**
   * UI click feedback
   */
  public playClickSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio failure fallback
    }
  }

  /**
   * Select best male English voice for Neil Armstrong from browser speech synthesis
   */
  private getBestMaleVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
    if (englishVoices.length === 0) return null;

    const femaleKeywords = [
      'female', 'samantha', 'victoria', 'karen', 'zira', 'fiona', 
      'veena', 'susan', 'allison', 'ava', 'catherine', 'jenny', 'monica', 'stephanie', 'girl', 'woman'
    ];

    const maleKeywords = [
      'male', 'david', 'mark', 'george', 'daniel', 'james', 'richard', 
      'guy', 'bruce', 'tom', 'alex', 'fred', 'junior', 'wavenet-b', 'wavenet-d',
      'standard-b', 'standard-c', 'standard-d', 'en-us-standard-b', 'natural'
    ];

    // 1. Try to find an explicitly named male voice
    for (const v of englishVoices) {
      const name = v.name.toLowerCase();
      const isFemale = femaleKeywords.some(f => name.includes(f));
      if (!isFemale && maleKeywords.some(m => name.includes(m))) {
        return v;
      }
    }

    // 2. Fall back to any English voice that is NOT marked female
    const nonFemale = englishVoices.filter(v => {
      const name = v.name.toLowerCase();
      return !femaleKeywords.some(f => name.includes(f));
    });

    if (nonFemale.length > 0) return nonFemale[0];
    return englishVoices[0];
  }

  /**
   * Speak dialogue using server-side Gemini TTS (Fenrir grounded male voice)
   * with seamless fallback to client-side male Web Speech API.
   */
  public async speakDialogue(text: string, speaker: string, onEnd?: () => void) {
    if (this.isMuted) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();
    this.playQuindarTone('intro');

    // 1. Attempt to fetch authentic audio from /api/narrator (Gemini TTS Fenrir male voice)
    try {
      const response = await fetch('/api/narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioData && !data.useFallback) {
          await this.playBase64Wav(data.audioData, onEnd);
          return;
        }
      }
    } catch {
      // Network or API unavailable, fall back seamlessly to client-side male voice
    }

    // 2. Client-side fallback with strictly male voice selection & Apollo tuning
    this.speakClientFallback(text, speaker, onEnd);
  }

  /**
   * Play base64 WAV audio through Apollo radio bandpass filter
   */
  private async playBase64Wav(base64Data: string, onEnd?: () => void) {
    try {
      const ctx = this.getContext();
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Apollo radio communication bandpass filter (cuts off <300Hz and >3000Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1650;
      filter.Q.value = 1.1;

      const gain = ctx.createGain();
      gain.gain.value = 1.1;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      this.currentAudioSource = source;

      source.onended = () => {
        this.currentAudioSource = null;
        this.playQuindarTone('outro');
        if (onEnd) onEnd();
      };

      source.start();
    } catch (err) {
      console.warn('WAV playback failed, using fallback:', err);
      if (onEnd) onEnd();
    }
  }

  /**
   * Client-side Web Speech API strictly configured for male astronaut voice
   */
  private speakClientFallback(text: string, speaker: string, onEnd?: () => void) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) {
        const wordCount = text.split(' ').length;
        const durationMs = Math.max(2500, (wordCount / 2.5) * 1000);
        setTimeout(() => {
          this.playQuindarTone('outro');
          onEnd();
        }, durationMs);
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isNeil = speaker.includes('Neil');

    // Neil Armstrong vocal profile: grounded mid-baritone, calm deliberate pacing
    if (isNeil) {
      utterance.pitch = 0.76; // grounded lower baritone pitch
      utterance.rate = 0.86;  // steady, deliberate astronaut cadence
    } else {
      utterance.pitch = 0.95;
      utterance.rate = 0.95;
    }

    // Select strictly male English voice
    const maleVoice = this.getBestMaleVoice();
    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    utterance.onend = () => {
      this.playQuindarTone('outro');
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.playQuindarTone('outro');
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // already stopped
      }
      this.currentAudioSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const apolloAudio = new ApolloAudioSystem();

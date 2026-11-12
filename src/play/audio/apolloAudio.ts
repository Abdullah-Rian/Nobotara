/**
 * NoboTara-71: Procedural Web Audio Engine
 * Features authentic Apollo 11 Quindar tones (2525Hz / 2475Hz),
 * radio static bursts, bandpass-filtered speech, rover engine synthesis,
 * laser pulse sounds, and server-side Gemini TTS / male astronaut synthesis.
 */

class ApolloAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private themeGain: GainNode | null = null;
  private radioBeeps = true;
  private windGain: GainNode | null = null;
  private windNodes: AudioScheduledSourceNode[] = [];
  private roverOsc: OscillatorNode | null = null;
  private roverGain: GainNode | null = null;
  private ambientNoiseNode: AudioNode | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private speakGeneration = 0;
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

  /**
   * Start audio. Call it inside a click or tap, so the browser allows sound.
   * After pause() it wakes the audio up again.
   */
  public init() {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const ctx = this.getContext();
      this.setupRoverHum(ctx);
      this.setupBackgroundCosmicStatic(ctx);
      this.initialized = true;
    } catch {
      // AudioContext might require user gesture
    }
  }

  /** Leaving a mission: stop every voice and sound, and put the audio to sleep until init() runs again. */
  public pause() {
    this.stopSpeaking();
    this.stopClosingTheme();
    this.stopWind();
    this.updateRoverSpeed(0);
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
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
      this.stopClosingTheme();
      this.stopWind();
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
    if (this.isMuted || !this.radioBeeps) return;
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
   * Short high beep for the intro typewriter.
   */
  public playTypeBeep() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.027);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
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
   * A slow, quiet pad for the last shot: four held chords, built from sine and
   * triangle tones. No recording is used.
   */
  public playClosingTheme() {
    if (this.isMuted) return;
    this.stopClosingTheme();
    try {
      const ctx = this.getContext();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 3);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      master.connect(filter);
      filter.connect(ctx.destination);
      this.themeGain = master;
      // A minor 9, F major 7, C major, G sus: rising and unresolved until the last chord.
      const chords = [
        [110, 164.81, 220, 261.63, 329.63, 493.88],
        [87.31, 174.61, 220, 261.63, 329.63, 440],
        [130.81, 196, 261.63, 329.63, 392, 523.25],
        [98, 196, 293.66, 392, 440, 587.33]
      ];
      const hold = 9;
      chords.forEach((chord, index) => {
        const start = ctx.currentTime + index * hold;
        chord.forEach((freq, voice) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = voice < 2 ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          osc.detune.value = (voice % 2 === 0 ? 1 : -1) * 4;
          const level = voice < 2 ? 0.05 : 0.032;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(level, start + 2.6);
          gain.gain.setValueAtTime(level, start + hold - 1);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + hold + 3.5);
          osc.connect(gain);
          gain.connect(master);
          osc.start(start);
          osc.stop(start + hold + 3.6);
        });
      });
    } catch {
      // Audio failure fallback
    }
  }

  /** Thin Martian wind: filtered noise that slowly swells and drops. Loops until stopped. */
  public startWind() {
    if (this.isMuted || this.windGain) return;
    try {
      const ctx = this.getContext();
      const seconds = 4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        // Brown-ish noise: each sample leans on the one before it.
        last = (last + 0.03 * (Math.random() * 2 - 1)) / 1.03;
        data[i] = last * 3.2;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 420;
      band.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 2.5);
      // A slow gust: the level and the pitch of the wind drift together.
      const gust = ctx.createOscillator();
      gust.frequency.value = 0.11;
      const gustDepth = ctx.createGain();
      gustDepth.gain.value = 0.025;
      const pitchDepth = ctx.createGain();
      pitchDepth.gain.value = 160;
      gust.connect(gustDepth);
      gustDepth.connect(gain.gain);
      gust.connect(pitchDepth);
      pitchDepth.connect(band.frequency);
      source.connect(band);
      band.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      gust.start();
      this.windGain = gain;
      this.windNodes = [source, gust];
    } catch {
      // Audio failure fallback
    }
  }

  public stopWind() {
    const gain = this.windGain;
    const nodes = this.windNodes;
    this.windGain = null;
    this.windNodes = [];
    if (!gain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      window.setTimeout(() => {
        for (const node of nodes) {
          try {
            node.stop();
          } catch {
            // Already stopped.
          }
        }
        gain.disconnect();
      }, 1700);
    } catch {
      // Audio failure fallback
    }
  }

  /** The moment the plan goes dark: one low tone that sinks and fades. */
  public playRevealCue() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      [110, 164.81].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 6);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.07 : 0.04, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 7.1);
      });
    } catch {
      // Audio failure fallback
    }
  }

  public stopClosingTheme() {
    const gain = this.themeGain;
    this.themeGain = null;
    if (!gain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      window.setTimeout(() => gain.disconnect(), 1500);
    } catch {
      // Audio failure fallback
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

  /** A named female English voice, when the device has one. */
  private getBestFemaleVoice(): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    const english = this.voices.filter(v => v.lang.startsWith('en'));
    const femaleNames = [
      'female', 'samantha', 'victoria', 'karen', 'zira', 'fiona', 'veena', 'susan', 'allison', 'ava',
      'catherine', 'jenny', 'monica', 'stephanie', 'serena', 'moira', 'tessa', 'kate', 'aria', 'libby',
      'sonia', 'natasha', 'emma', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy', 'woman', 'girl'
    ];
    return english.find(v => femaleNames.some(n => v.name.toLowerCase().includes(n))) ?? null;
  }

  /**
   * Speak dialogue prioritizing local offline MP3 assets (/assets/audio/voiceovers/*.mp3),
   * with seamless fallback to server-side Gemini TTS and client-side male Web Speech API.
   */
  public async speakDialogue(
    text: string,
    speaker: string,
    onEnd?: () => void,
    clipId?: string,
    onStart?: (duration: number) => void
  ) {
    const guess = Math.max(8, text.split(/\s+/).filter(Boolean).length / 2.2);
    if (this.isMuted) {
      onStart?.(0);
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();
    const generation = this.speakGeneration;
    // Apollo radio beeps belong to the Moon and Voyager voices. Tara and the Mars narrator speak without them.
    this.radioBeeps = !/Tara|^Narrator$/.test(speaker);
    this.playQuindarTone('intro');

    // 1. First priority: Check for pre-rendered local offline audio asset
    if (clipId) {
      const localLoaded = await this.playLocalAudioClip(clipId, onEnd, generation, onStart, guess);
      if (generation !== this.speakGeneration) return;
      if (localLoaded) {
        return;
      }
    }

    if (generation !== this.speakGeneration) return;

    // 2. Second priority: Attempt to fetch authentic audio from /api/narrator (Gemini TTS)
    try {
      const response = await fetch('/api/narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker })
      });

      if (generation !== this.speakGeneration) return;

      if (response.ok) {
        const data = await response.json();
        if (data.audioData && !data.useFallback) {
          await this.playBase64Wav(data.audioData, onEnd, generation, onStart, guess);
          return;
        }
      }
    } catch {
      // Network or API unavailable, fall back seamlessly to client-side male voice
    }

    if (generation !== this.speakGeneration) return;

    // 3. Third priority: Client-side fallback with strictly male voice selection & Apollo tuning
    this.speakClientFallback(text, speaker, onEnd, onStart, guess);
  }

  /**
   * Play pre-rendered local offline MP3 audio file with Quindar beeps & radio filter
   */
  private async playLocalAudioClip(
    clipId: string,
    onEnd: (() => void) | undefined,
    generation: number,
    onStart?: (duration: number) => void,
    guess = 8
  ): Promise<boolean> {
    try {
      const localUrl = `/assets/audio/voiceovers/${clipId}.mp3`;

      return new Promise<boolean>((resolve) => {
        const audio = new Audio();
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        const startPlayback = async () => {
          if (settled || generation !== this.speakGeneration) {
            finish(false);
            return;
          }
          settled = true;
          try {
            this.currentAudioElement = audio;
            audio.onended = () => {
              if (this.currentAudioElement === audio) this.currentAudioElement = null;
              this.playQuindarTone('outro');
              if (onEnd) onEnd();
            };
            const duration = audio.duration;
            onStart?.(Number.isFinite(duration) && duration > 0.35 ? duration : guess);
            await audio.play();
            resolve(true);
          } catch (playErr) {
            console.warn(`Local audio play error for ${clipId}:`, playErr);
            audio.onended = null;
            if (this.currentAudioElement === audio) this.currentAudioElement = null;
            resolve(false);
          }
        };

        // Listen before assigning src so a cached clip cannot finish loading unheard.
        audio.preload = 'auto';
        audio.oncanplaythrough = () => {
          void startPlayback();
        };
        audio.onerror = () => finish(false);
        audio.src = localUrl;
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          void startPlayback();
        }

        window.setTimeout(() => finish(false), 5000);
      });
    } catch (err) {
      console.warn(`Local audio clip ${clipId} unavailable, falling back:`, err);
      return false;
    }
  }

  /**
   * Play generated WAV at full bandwidth, matching the opening MP3.
   */
  private async playBase64Wav(
    base64Data: string,
    onEnd: (() => void) | undefined,
    generation: number,
    onStart?: (duration: number) => void,
    guess = 8
  ) {
    try {
      const ctx = this.getContext();
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      if (generation !== this.speakGeneration) return;
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = 1.0;

      source.connect(gain);
      gain.connect(ctx.destination);

      this.currentAudioSource = source;

      source.onended = () => {
        this.currentAudioSource = null;
        this.playQuindarTone('outro');
        if (onEnd) onEnd();
      };

      const duration = audioBuffer.duration;
      onStart?.(Number.isFinite(duration) && duration > 0.35 ? duration : guess);
      source.start();
    } catch (err) {
      console.warn('WAV playback failed, using fallback:', err);
      if (onEnd) onEnd();
    }
  }

  /**
   * Client-side Web Speech API strictly configured for male astronaut voice
   */
  private speakClientFallback(
    text: string,
    speaker: string,
    onEnd?: () => void,
    onStart?: (duration: number) => void,
    guess = 8
  ) {
    onStart?.(guess);
    if (!('speechSynthesis' in window)) {
      if (onEnd) {
        setTimeout(() => {
          this.playQuindarTone('outro');
          onEnd();
        }, guess * 1000);
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

    // Tara is a woman. Everyone else keeps the male English voice.
    if (/Tara/.test(speaker)) {
      utterance.pitch = 1.08;
      const femaleVoice = this.getBestFemaleVoice();
      if (femaleVoice) utterance.voice = femaleVoice;
    } else {
      const maleVoice = this.getBestMaleVoice();
      if (maleVoice) utterance.voice = maleVoice;
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
    this.speakGeneration += 1;
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch {
        // already stopped
      }
      this.currentAudioSource = null;
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // already stopped
      }
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const apolloAudio = new ApolloAudioSystem();

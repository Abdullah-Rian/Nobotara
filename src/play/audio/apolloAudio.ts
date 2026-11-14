/**
 * NoboTara-71: Procedural Web Audio Engine
 * Features authentic Apollo 11 Quindar tones (2525Hz / 2475Hz),
 * radio static bursts, bandpass-filtered speech, rover engine synthesis,
 * laser pulse sounds, and playback of the pre-recorded voice clips.
 */

import { gameClock, gameTimeout } from '../utils/gameClock';

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
  private speakGeneration = 0;
  private initialized: boolean = false;
  /**
   * Voice clips being fetched and decoded. A clip leaves this map once it starts playing: decoded audio is
   * large (about 5 MB for a 25-second line), and keeping every line would use too much memory on an iPhone.
   * A replayed line comes back quickly from the browser's file cache.
   */
  private clipCache = new Map<string, Promise<AudioBuffer>>();
  private unlockArmed = false;
  /** pause() was called (the player left the mission): don't wake up until init(). */
  private sleeping = false;



  private getContext(): AudioContext {
    if (!this.ctx) {
      // iOS: play like media (as the old <audio> voices did), so the ring/silent switch doesn't mute the game.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) {
        try {
          session.type = 'playback';
        } catch {
          // older Safari: no audio session control
        }
      }
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.armUnlock();
    }
    // Never restart sound on a hidden page (Android keeps playing it in the background).
    if (this.ctx.state === 'suspended' && !gameClock.hidden() && !this.sleeping) {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * iOS only lets audio start inside a tap, and suspends ("interrupts") it after a call, Siri or
   * switching apps. Every tap or key press wakes the audio context if it is asleep, and plays one
   * silent sample, which is what unlocks it for good on older iPhones.
   */
  private armUnlock() {
    if (this.unlockArmed || typeof document === 'undefined') return;
    this.unlockArmed = true;
    const wake = () => {
      const ctx = this.ctx;
      if (!ctx || ctx.state === 'running' || this.sleeping) return;
      void ctx.resume().catch(() => {});
      try {
        const silent = ctx.createBufferSource();
        silent.buffer = ctx.createBuffer(1, 1, 22050);
        silent.connect(ctx.destination);
        silent.start(0);
      } catch {
        // nothing to unlock
      }
    };
    for (const type of ['touchend', 'pointerdown', 'keydown']) {
      document.addEventListener(type, wake, { capture: true, passive: true });
    }
    // Hidden page (another app, home screen, screen off): every sound, and the line being spoken, pauses
    // where it is. Back on the page, it carries on, unless the player had left the mission.
    gameClock.onVisibility(hidden => {
      const ctx = this.ctx;
      if (!ctx) return;
      if (hidden) {
        if (ctx.state === 'running') void ctx.suspend().catch(() => {});
      } else if (this.initialized && !this.sleeping) {
        void ctx.resume().catch(() => {});
      }
    });
  }

  /**
   * Start audio. Call it inside a click or tap, so the browser allows sound.
   * After pause() it wakes the audio up again.
   */
  public init() {
    this.sleeping = false;
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
    this.sleeping = true;
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
   * Speak a line from its pre-recorded clip (/assets/audio/voiceovers/<clipId>.mp3).
   * If the clip can't play, the line stays on screen silently for about as long as it takes to read.
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

    // Every line is pre-recorded (public/assets/audio/voiceovers, checked by scripts/check-voiceovers.ts).
    // Nothing is synthesized while playing. If a clip is missing or fails to load, the line stays
    // on screen silently for about as long as it takes to read, then the game moves on.
    if (import.meta.env.DEV) console.warn(`No voice clip played for "${clipId ?? 'no clip id'}": ${text.slice(0, 60)}`);
    onStart?.(guess);
    gameTimeout(() => {
      if (generation !== this.speakGeneration) return;
      this.playQuindarTone('outro');
      onEnd?.();
    }, guess * 1000);
  }

  /** Fetch and decode a voice clip once. Callback form of decodeAudioData, for older Safari. */
  private loadClip(clipId: string): Promise<AudioBuffer> {
    let pending = this.clipCache.get(clipId);
    if (!pending) {
      const ctx = this.getContext();
      pending = fetch(`/assets/audio/voiceovers/${clipId}.mp3`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then(data => new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)));
      pending.catch(() => this.clipCache.delete(clipId));
      this.clipCache.set(clipId, pending);
    }
    return pending;
  }

  /** Start fetching a line before it is needed. */
  public preloadClip(clipId: string) {
    try {
      void this.loadClip(clipId).catch(() => {});
    } catch {
      // no audio here
    }
  }

  /**
   * Play a pre-recorded voice clip through the Web Audio context.
   *
   * Not through an <audio> element: iOS ignores preloading (so its "ready" event never came) and refuses
   * play() on a new element that isn't started by a tap, and voice lines start from timers. The audio
   * context is unlocked by the START MISSION tap (and any later tap), so it can play at any moment.
   */
  private async playLocalAudioClip(
    clipId: string,
    onEnd: (() => void) | undefined,
    generation: number,
    onStart?: (duration: number) => void,
    _guess = 8
  ): Promise<boolean> {
    let ctx: AudioContext;
    let buffer: AudioBuffer;
    try {
      ctx = this.getContext();
      buffer = await Promise.race([
        this.loadClip(clipId),
        new Promise<never>((_, reject) => gameTimeout(() => reject(new Error('timed out')), 8000))
      ]);
    } catch (err) {
      console.warn(`Voice clip ${clipId} unavailable:`, err);
      return false;
    }
    if (generation !== this.speakGeneration) return false;
    // A line that comes due while the page is hidden waits for the player to come back.
    if (gameClock.hidden()) {
      await gameClock.whenVisible();
      if (generation !== this.speakGeneration) return false;
    }
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        // stays asleep until the next tap
      }
      if (generation !== this.speakGeneration) return false;
    }
    if (ctx.state !== 'running') {
      console.warn(`Voice clip ${clipId}: audio is asleep (no tap yet)`);
      return false;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    this.currentAudioSource = source;
    source.onended = () => {
      // stopSpeaking() clears currentAudioSource first, so a stopped line doesn't count as finished.
      if (this.currentAudioSource !== source) return;
      this.currentAudioSource = null;
      this.playQuindarTone('outro');
      onEnd?.();
    };
    onStart?.(buffer.duration);
    source.start();
    this.clipCache.delete(clipId);
    return true;
  }

  public stopSpeaking() {
    this.speakGeneration += 1;
    if (this.currentAudioSource) {
      const source = this.currentAudioSource;
      this.currentAudioSource = null;
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }



  }
}

export const apolloAudio = new ApolloAudioSystem();

// StudyOS Centralized Sound & Haptic Manager
// Synthesizes high-fidelity, professional, deeply satisfying UI sounds using the browser Web Audio API.
// This guarantees zero-latency, offline capability, and zero asset loading issues.

export type SoundEffectType =
  | 'click'
  | 'topic_complete'
  | 'xp_gain'
  | 'module_complete'
  | 'subject_complete'
  | 'semester_complete'
  | 'badge_unlock'
  | 'level_up'
  | 'timer_start'
  | 'timer_pause'
  | 'timer_end'
  | 'streak_secured'
  | 'notification'
  | 'error';

export type HapticPatternType =
  | 'light'
  | 'medium'
  | 'success'
  | 'longSuccess'
  | 'error';

class SoundManagerService {
  private audioCtx: AudioContext | null = null;
  private volume: number = 0.7; // 0 to 1
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;
  private focusMode: boolean = false;
  private isUnlocked: boolean = false;

  constructor() {
    this.setupUnlockListeners();
  }

  // Pre-emptively register user interaction listeners to unlock Web Audio API instantly.
  // This completely bypasses browser autoplay/silent block policies on all devices.
  private setupUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.unlock();
      // Remove listeners once unlocked successfully
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('mousedown', unlock);
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('mousedown', unlock, { passive: true });
  }

  // Resumes and primes the AudioContext with a short, completely silent buffer play
  private unlock() {
    if (this.isUnlocked) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        try {
          // Play a silent buffer to prime/unlock the audio device on mobile and desktop browsers
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          this.isUnlocked = true;
          console.log("Centralized SoundManager: Web Audio successfully unlocked on user interaction.");
        } catch (e) {
          console.warn("Could not play silent priming buffer:", e);
        }
      }).catch(err => {
        console.warn("Failed to resume AudioContext during unlock:", err);
      });
    } else {
      this.isUnlocked = true;
    }
  }

  // Initialize and retrieve the AudioContext lazily on demand
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    // Attempt asynchronous resume if suspended
    if (this.audioCtx && this.audioCtx.state === 'suspended' && this.isUnlocked) {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Update manager configurations from userState settings
  public updateSettings(settings: {
    soundEffectsEnabled?: boolean;
    hapticFeedbackEnabled?: boolean;
    soundVolume?: number; // 0 to 100
    soundFocusModeEnabled?: boolean;
  }) {
    if (settings.soundEffectsEnabled !== undefined) {
      this.soundEnabled = settings.soundEffectsEnabled;
    }
    if (settings.hapticFeedbackEnabled !== undefined) {
      this.hapticsEnabled = settings.hapticFeedbackEnabled;
    }
    if (settings.soundVolume !== undefined) {
      this.volume = settings.soundVolume / 100;
    }
    if (settings.soundFocusModeEnabled !== undefined) {
      this.focusMode = settings.soundFocusModeEnabled;
    }
  }

  // High-fidelity synthesizer engine utilizing resonant bandpass/lowpass filters,
  // custom amplitude envelopes (attack/decay), pitch sweeps, and optional LFO modulation.
  private createOscillator(
    type: OscillatorType,
    freq: number,
    startVol: number,
    durationMs: number,
    options?: {
      endFreq?: number;
      frequencyRamp?: 'linear' | 'exponential';
      vibratoFreq?: number;
      vibratoGain?: number;
      delayMs?: number;
      attackMs?: number;
      filterType?: BiquadFilterType;
      filterFreq?: number;
      filterEndFreq?: number;
      filterQ?: number;
      tremoloFreq?: number;
      tremoloDepth?: number;
    }
  ) {
    const ctx = this.getAudioContext();
    if (!ctx) return null;

    const delay = options?.delayMs ? options.delayMs / 1000 : 0;
    const startTime = ctx.currentTime + delay;
    const duration = durationMs / 1000;
    const endTime = startTime + duration;
    const attack = options?.attackMs ? options.attackMs / 1000 : 0.015;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Apply frequency sweeps (pitch bends)
    if (options?.endFreq) {
      if (options.frequencyRamp === 'exponential' && freq > 0 && options.endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(options.endFreq, endTime);
      } else {
        osc.frequency.linearRampToValueAtTime(options.endFreq, endTime);
      }
    }

    // Apply high-fidelity filter sweeps (e.g. warm subtractive or bright sweeps)
    filter.type = options?.filterType || 'lowpass';
    const filterStart = options?.filterFreq || (type === 'sine' ? 3000 : 1500);
    filter.frequency.setValueAtTime(filterStart, startTime);
    if (options?.filterEndFreq) {
      filter.frequency.exponentialRampToValueAtTime(options.filterEndFreq, endTime);
    } else {
      filter.frequency.exponentialRampToValueAtTime(Math.max(100, filterStart * 0.15), endTime);
    }
    filter.Q.setValueAtTime(options?.filterQ !== undefined ? options.filterQ : 2, startTime);

    // Dynamic tremolo beating (amplitude modulation) for deep acoustic physical models
    if (options?.tremoloFreq && options?.tremoloDepth) {
      const tremoloOsc = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      tremoloOsc.frequency.setValueAtTime(options.tremoloFreq, startTime);
      tremoloGain.gain.setValueAtTime(options.tremoloDepth * startVol * this.volume, startTime);
      
      tremoloOsc.connect(tremoloGain);
      tremoloGain.connect(gainNode.gain);
      
      tremoloOsc.start(startTime);
      tremoloOsc.stop(endTime);
    }

    // High-precision custom amplitude AD envelope (Attack-Decay) to prevent clicking and ensure warmth
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(startVol * this.volume, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    // Dynamic vibrato (frequency modulation)
    if (options?.vibratoFreq && options?.vibratoGain) {
      const vibrato = ctx.createOscillator();
      const vibratoGainNode = ctx.createGain();
      vibrato.frequency.setValueAtTime(options.vibratoFreq, startTime);
      vibratoGainNode.gain.setValueAtTime(options.vibratoGain, startTime);
      
      vibrato.connect(vibratoGainNode);
      vibratoGainNode.connect(osc.frequency);
      
      vibrato.start(startTime);
      vibrato.stop(endTime);
    }

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(endTime);

    return { osc, gainNode };
  }

  // Synthesizes dynamic wind/ignition noise for streaks and flame visuals
  private createFlameIgnition(delayMs: number = 0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const delay = delayMs / 1000;
    const startTime = ctx.currentTime + delay;
    const duration = 0.35; // 350ms
    const endTime = startTime + duration;

    // Generate organic white noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Resonant bandpass filter to shape white noise into a physical fire swoosh
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, startTime);
    filter.frequency.exponentialRampToValueAtTime(120, endTime);
    filter.Q.setValueAtTime(5, startTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.18 * this.volume, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseNode.start(startTime);
    noiseNode.stop(endTime);
  }

  // Plays custom synthesized sound effects designed with exquisite acoustics
  public play(effect: SoundEffectType) {
    if (!this.soundEnabled) return;

    // In focus mode, silence non-critical alerts to maintain absolute deep work flow
    if (this.focusMode && effect !== 'timer_end' && effect !== 'notification') {
      return;
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      switch (effect) {
        case 'click':
          // Warm physical wooden bubble pop click
          this.createOscillator('sine', 1100, 0.28, 45, {
            endFreq: 140,
            frequencyRamp: 'exponential',
            filterType: 'bandpass',
            filterFreq: 800,
            filterEndFreq: 150,
            filterQ: 4,
            attackMs: 2,
          });
          break;

        case 'topic_complete':
          // Beautiful sparkling glass chimes arpeggio (A-major 9th)
          // Clean, resonant frequencies decaying elegantly
          this.createOscillator('sine', 440.00, 0.32, 450, { // A4
            filterType: 'lowpass', filterFreq: 1800, filterEndFreq: 300, filterQ: 3
          });
          this.createOscillator('sine', 554.37, 0.28, 480, { // C#5
            delayMs: 60, filterType: 'lowpass', filterFreq: 1800, filterEndFreq: 300, filterQ: 3
          });
          this.createOscillator('sine', 659.25, 0.26, 500, { // E5
            delayMs: 120, filterType: 'lowpass', filterFreq: 1800, filterEndFreq: 300, filterQ: 3
          });
          this.createOscillator('sine', 827.63, 0.24, 600, { // G#5 (Maj 7)
            delayMs: 180, filterType: 'lowpass', filterFreq: 2200, filterEndFreq: 400, filterQ: 4,
            vibratoFreq: 5, vibratoGain: 4
          });
          break;

        case 'xp_gain':
          // Crisp, high-fidelity crystal ting coin pop
          this.createOscillator('sine', 1580, 0.28, 120, {
            endFreq: 2100,
            frequencyRamp: 'exponential',
            filterType: 'bandpass',
            filterFreq: 2400,
            filterQ: 5,
            attackMs: 3,
          });
          this.createOscillator('sine', 1940, 0.22, 100, {
            delayMs: 15,
            endFreq: 2400,
            frequencyRamp: 'exponential',
            filterType: 'bandpass',
            filterFreq: 2600,
            filterQ: 5,
            attackMs: 3,
          });
          break;

        case 'module_complete':
          // Triumphant ascending scale with rich harmonics
          this.createOscillator('triangle', 349.23, 0.28, 400, { // F4
            filterType: 'lowpass', filterFreq: 800, filterQ: 2
          });
          this.createOscillator('sine', 440.00, 0.30, 420, { // A4
            delayMs: 80, filterType: 'lowpass', filterFreq: 1000, filterQ: 2
          });
          this.createOscillator('sine', 523.25, 0.28, 450, { // C5
            delayMs: 160, filterType: 'lowpass', filterFreq: 1200, filterQ: 3
          });
          this.createOscillator('sine', 659.25, 0.32, 500, { // E5
            delayMs: 240, filterType: 'lowpass', filterFreq: 1500, filterQ: 3
          });
          this.createOscillator('triangle', 880.00, 0.35, 650, { // A5 final bell
            delayMs: 320, filterType: 'lowpass', filterFreq: 2000, filterEndFreq: 200, filterQ: 4,
            vibratoFreq: 6, vibratoGain: 8
          });
          break;

        case 'subject_complete':
          // Exquisite music box / mechanical marimba celebratory melody
          const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
          notes.forEach((freq, idx) => {
            this.createOscillator('sine', freq, 0.30 - (idx * 0.02), 700 - (idx * 30), {
              delayMs: idx * 85,
              filterType: 'lowpass',
              filterFreq: 2500,
              filterEndFreq: 350,
              filterQ: 5,
              vibratoFreq: 5.5,
              vibratoGain: 6,
            });
          });
          break;

        case 'semester_complete':
          // Legendary warm subtractive analog-style orchestral brass progression
          // Deep comforting drone foundation
          this.createOscillator('triangle', 130.81, 0.35, 1200, { // C3
            filterType: 'lowpass', filterFreq: 400, filterQ: 1.5, attackMs: 100
          });
          this.createOscillator('triangle', 196.00, 0.30, 1200, { // G3
            delayMs: 50, filterType: 'lowpass', filterFreq: 400, filterQ: 1.5, attackMs: 100
          });

          // Tonal Progression of Chords (C Maj -> F Maj -> G Maj -> Triumphant C Maj)
          // C Major Chord
          this.createOscillator('sine', 261.63, 0.25, 600, { delayMs: 100, attackMs: 80 }); // C4
          this.createOscillator('sine', 329.63, 0.25, 600, { delayMs: 150, attackMs: 80 }); // E4
          this.createOscillator('sine', 392.00, 0.25, 600, { delayMs: 200, attackMs: 80 }); // G4

          // F Major Chord
          this.createOscillator('sine', 349.23, 0.25, 600, { delayMs: 600, attackMs: 80 }); // F4
          this.createOscillator('sine', 440.00, 0.25, 600, { delayMs: 650, attackMs: 80 }); // A4
          this.createOscillator('sine', 523.25, 0.25, 600, { delayMs: 700, attackMs: 80 }); // C5

          // G Major Chord
          this.createOscillator('sine', 392.00, 0.25, 600, { delayMs: 1100, attackMs: 80 }); // G4
          this.createOscillator('sine', 493.88, 0.25, 600, { delayMs: 1150, attackMs: 80 }); // B4
          this.createOscillator('sine', 587.33, 0.25, 600, { delayMs: 1200, attackMs: 80 }); // D5

          // Finale: Triumphant Sparkle resolution on C5, G5, C6, E6, C7
          const resolutionDelay = 1650;
          this.createOscillator('triangle', 523.25, 0.38, 1400, { delayMs: resolutionDelay, attackMs: 50 }); // C5
          this.createOscillator('sine', 783.99, 0.32, 1400, { delayMs: resolutionDelay + 80, attackMs: 50 }); // G5
          this.createOscillator('sine', 1046.50, 0.30, 1600, { delayMs: resolutionDelay + 160, attackMs: 50 }); // C6
          this.createOscillator('sine', 1318.51, 0.28, 1800, { delayMs: resolutionDelay + 240, attackMs: 50 }); // E6
          this.createOscillator('sine', 2093.00, 0.35, 2200, { // Sparkle C7
            delayMs: resolutionDelay + 320,
            attackMs: 30,
            filterType: 'lowpass',
            filterFreq: 3500,
            filterEndFreq: 500,
            filterQ: 6,
            vibratoFreq: 6.5,
            vibratoGain: 12
          });
          break;

        case 'badge_unlock':
          // Golden stardust magical sweep cascade
          const sweepFreqs = [1200, 1420, 1640, 1860, 2080, 2300, 2520];
          sweepFreqs.forEach((freq, idx) => {
            this.createOscillator('sine', freq, 0.26 - (idx * 0.02), 400, {
              delayMs: idx * 45,
              filterType: 'bandpass',
              filterFreq: freq + 200,
              filterQ: 5,
              attackMs: 8,
            });
          });
          break;

        case 'level_up':
          // Heroic power sweep with an integrated triumphant middle major chord
          this.createOscillator('triangle', 220, 0.38, 550, {
            endFreq: 660,
            frequencyRamp: 'exponential',
            filterType: 'lowpass',
            filterFreq: 1200,
            filterQ: 3,
            attackMs: 40,
          });
          this.createOscillator('sine', 440, 0.32, 600, {
            delayMs: 40,
            endFreq: 1320,
            frequencyRamp: 'exponential',
            filterType: 'lowpass',
            filterFreq: 1600,
            filterQ: 3,
            attackMs: 40,
          });
          // Mid-sweep power chord strikes
          this.createOscillator('sine', 523.25, 0.30, 500, { delayMs: 250 }); // C5
          this.createOscillator('sine', 659.25, 0.30, 500, { delayMs: 250 }); // E5
          this.createOscillator('sine', 783.99, 0.35, 600, { delayMs: 250, vibratoFreq: 7, vibratoGain: 10 }); // G5
          break;

        case 'timer_start':
          // Soft, reassuring, non-disruptive room-entry sweep (Major 3rd interval)
          this.createOscillator('sine', 392.00, 0.22, 110, {
            endFreq: 493.88,
            frequencyRamp: 'linear',
            filterType: 'lowpass',
            filterFreq: 1000,
            filterEndFreq: 400,
            filterQ: 2,
            attackMs: 15,
          });
          break;

        case 'timer_pause':
          // Soft, non-disruptive room-exit downward sweep (Major 3rd release)
          this.createOscillator('sine', 493.88, 0.20, 130, {
            endFreq: 392.00,
            frequencyRamp: 'linear',
            filterType: 'lowpass',
            filterFreq: 800,
            filterEndFreq: 300,
            filterQ: 2,
            attackMs: 15,
          });
          break;

        case 'timer_end':
          // Premium, ultra-relaxing physical modeled Tibetan Singing Bowl / Mindfulness Gong.
          // Recreates deep grounded fundamentals, physical brass metal partials, and a realistic beating (tremolo) LFO.
          
          // Deep Grounded Root (G3)
          this.createOscillator('sine', 196.00, 0.45, 4000, {
            filterType: 'lowpass', filterFreq: 600, filterQ: 1.5, attackMs: 250,
            tremoloFreq: 2.1, tremoloDepth: 0.25
          });
          
          // Harmonic Perfect Fifth (D4)
          this.createOscillator('sine', 293.66, 0.35, 3600, {
            delayMs: 40, filterType: 'lowpass', filterFreq: 800, filterQ: 2, attackMs: 220,
            tremoloFreq: 2.5, tremoloDepth: 0.30
          });
          
          // Harmonic Octave (G4)
          this.createOscillator('sine', 392.00, 0.32, 3200, {
            delayMs: 80, filterType: 'lowpass', filterFreq: 1000, filterQ: 2, attackMs: 180,
            tremoloFreq: 2.8, tremoloDepth: 0.35
          });

          // Brass Bowl Physical Metallic Partials (non-integer ratios simulating real metal clang)
          this.createOscillator('sine', 587.33, 0.22, 2600, { // Perfect 12th
            delayMs: 120, filterType: 'lowpass', filterFreq: 1200, filterQ: 3, attackMs: 120,
            tremoloFreq: 3.2, tremoloDepth: 0.40
          });
          this.createOscillator('sine', 811.44, 0.18, 2200, { // Sharp partial
            delayMs: 180, filterType: 'bandpass', filterFreq: 1500, filterQ: 4, attackMs: 100,
            tremoloFreq: 3.7, tremoloDepth: 0.45
          });
          this.createOscillator('sine', 1117.20, 0.12, 1800, { // Flat partial shimmer
            delayMs: 240, filterType: 'bandpass', filterFreq: 2000, filterQ: 5, attackMs: 80,
            vibratoFreq: 4.5, vibratoGain: 3
          });
          break;

        case 'streak_secured':
          // Crackling wood fire whoosh combined with a warm, glowing A-major progress chord
          this.createFlameIgnition(0);
          
          // Glow Chord
          this.createOscillator('triangle', 220.00, 0.25, 500, { delayMs: 150, attackMs: 80 }); // A3
          this.createOscillator('sine', 329.63, 0.28, 500, { delayMs: 200, attackMs: 80 }); // E4
          this.createOscillator('sine', 440.00, 0.26, 550, { delayMs: 250, attackMs: 80 }); // A4
          this.createOscillator('sine', 554.37, 0.30, 600, { delayMs: 300, attackMs: 60 }); // C#5
          break;

        case 'notification':
          // Polite, double chirp ring
          this.createOscillator('sine', 880.00, 0.26, 110, {
            filterType: 'lowpass', filterFreq: 2200, filterQ: 2, attackMs: 8
          });
          this.createOscillator('sine', 1109.73, 0.24, 130, { // C#6
            delayMs: 70, filterType: 'lowpass', filterFreq: 2500, filterQ: 3, attackMs: 8
          });
          break;

        case 'error':
          // Extremely supportive, gentle low-frequency physical "bloop" warning (no harsh buzz)
          this.createOscillator('triangle', 164.81, 0.40, 220, { // E3
            filterType: 'lowpass', filterFreq: 300, filterQ: 2
          });
          this.createOscillator('triangle', 155.56, 0.28, 220, { // Eb3 slight friction harmonic
            delayMs: 15,
            filterType: 'lowpass', filterFreq: 300, filterQ: 2
          });
          break;
      }
    } catch (e) {
      console.warn('Web Audio synthesis failed gracefully:', e);
    }
  }

  // Triggers browser standard haptic feedback vibration patterns if supported
  public vibrate(pattern: HapticPatternType) {
    if (!this.hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) {
      return;
    }

    try {
      switch (pattern) {
        case 'light':
          navigator.vibrate(35);
          break;
        case 'medium':
          navigator.vibrate(75);
          break;
        case 'success':
          navigator.vibrate([60, 40, 60]);
          break;
        case 'longSuccess':
          navigator.vibrate([100, 50, 150, 50, 200]);
          break;
        case 'error':
          navigator.vibrate(120);
          break;
      }
    } catch (e) {
      console.warn('Haptic vibration failed or unsupported on device:', e);
    }
  }
}

export const SoundManager = new SoundManagerService();

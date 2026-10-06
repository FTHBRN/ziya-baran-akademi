// Web Audio API Synthesizer for Kelime Patlat - Zero external audio file dependency

let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('zb_kelime_patlat_muted', muted ? '1' : '0');
  }
}

export function getSoundMuted(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('zb_kelime_patlat_muted') === '1';
  }
  return false;
}

// 1. Soft click / tap sound
export function playTapSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

// 2. Correct match pop sound
export function playMatchSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.08); // E5

    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.14); // G5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.04);
    osc1.stop(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.18);
  } catch {}
}

// 3. Golden match shimmer sound
export function playGoldenMatchSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.15);
    });
  } catch {}
}

// 4. Streak combo chime
export function playComboSound(multiplier: number) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseFreq = multiplier >= 3 ? 659.25 : 523.25;
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.06);
      osc.stop(ctx.currentTime + idx * 0.06 + 0.16);
    });
  } catch {}
}

// 5. Coşku Modu (Fever mode activated fanfare)
export function playFeverModeSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
    arpeggio.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0.09, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.22);
    });
  } catch {}
}

// 6. Gentle error sound (thud / buzz)
export function playErrorSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {}
}

// 7. Victory / game over fanfares
export function playGameOverSound(isNewRecord: boolean) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = isNewRecord
      ? [523.25, 659.25, 783.99, 1046.5]
      : [659.25, 587.33, 523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
    });
  } catch {}
}

// 8. Crisp coin pickup sound
export function playCoinSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Fast ascending two-tone 'ding' (B5 987Hz to E6 1318Hz)
    osc.frequency.setValueAtTime(987, ctx.currentTime);
    osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

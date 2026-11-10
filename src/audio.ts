/* OpenLife — procedural audio (no external assets) */
let audioCtx: AudioContext | null = null;
let audioMaster: GainNode | null = null;
let audioUnlocked = false;
let musicTimer: number | null = null;
let musicStep = 0;
let soundEnabled = true;

try {
  soundEnabled = localStorage.getItem('openlife.sound') !== 'off';
} catch (e) {
  soundEnabled = true;
}

const MUSIC_CHORDS = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66]
];

function ensureAudio(): void {
  if (audioCtx) return;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  audioMaster = audioCtx.createGain();
  audioMaster.gain.value = soundEnabled ? 1 : 0;
  audioMaster.connect(audioCtx.destination);
}

function musicTick(): void {
  if (!soundEnabled || !audioCtx || !audioMaster) return;
  const chord = MUSIC_CHORDS[musicStep % MUSIC_CHORDS.length];
  const now = audioCtx.currentTime;
  chord.forEach((freq) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.014, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.9);
    osc.connect(gain);
    gain.connect(audioMaster!);
    osc.start(now);
    osc.stop(now + 4);
  });
  musicStep += 1;
}

function startMusic(): void {
  if (!soundEnabled || musicTimer !== null || !audioCtx) return;
  musicTick();
  musicTimer = window.setInterval(musicTick, 4000);
}

function stopMusic(): void {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function applySoundState(): void {
  ensureAudio();
  if (audioMaster) audioMaster.gain.value = soundEnabled ? 1 : 0;
  if (soundEnabled) startMusic();
  else stopMusic();
}

export function unlockAudio(): void {
  ensureAudio();
  if (!audioUnlocked) {
    audioUnlocked = true;
    applySoundState();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem('openlife.sound', soundEnabled ? 'on' : 'off');
  } catch (e) {
    /* ignore */
  }
  applySoundState();
  if (soundEnabled) playSfx('notify');
  return soundEnabled;
}

export function setPageVisible(visible: boolean): void {
  if (!visible) stopMusic();
  else if (soundEnabled && audioUnlocked) startMusic();
}

export function playSfx(name: string): void {
  if (!soundEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const presets: Record<string, [number, number, OscillatorType, number]> = {
    click: [620, 0.045, 'square', 0.025],
    coin: [980, 0.09, 'sine', 0.05],
    notify: [520, 0.12, 'triangle', 0.045],
    honk: [240, 0.18, 'square', 0.05],
    error: [170, 0.16, 'sawtooth', 0.04],
    page: [300, 0.06, 'square', 0.02]
  };
  const p = presets[name] || presets.click;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = p[2];
  osc.frequency.value = p[0];
  gain.gain.setValueAtTime(p[3], audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + p[1]);
  osc.connect(gain);
  gain.connect(audioMaster || audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + p[1]);
}

export function initSoundButton(): void {
  const btn = document.getElementById('soundBtn');
  if (!btn) return;
  const refresh = () => {
    btn.textContent = soundEnabled ? '🔊' : '🔇';
  };
  refresh();
  btn.addEventListener('click', () => {
    toggleSound();
    refresh();
  });
}

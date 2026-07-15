// Move Quest — synthesized sound effects (Web Audio, no audio files).

const MUTE_KEY = "move-quest-muted";

let ctx = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch (err) {
  muted = false;
}

function audioCtx() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function note(freq, startOffset, duration, type, volume) {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const start = ac.currentTime + startOffset;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sound = {
  isMuted() {
    return muted;
  },

  toggleMuted() {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch (err) {
      // Persistence unavailable — the toggle still works for this page load.
    }
    return muted;
  },

  // One rep counted (also the soft once-per-second timer tick).
  tick() {
    if (muted) return;
    note(720, 0, 0.05, "triangle", 0.18);
  },

  // Countdown warning for the last seconds of a timed hold.
  beep() {
    if (muted) return;
    note(988, 0, 0.12, "square", 0.14);
  },

  // Rep target reached — Claim XP is ready.
  chime() {
    if (muted) return;
    note(659, 0, 0.14, "sine", 0.2);
    note(880, 0.11, 0.2, "sine", 0.2);
  },

  // XP claimed.
  fanfare() {
    if (muted) return;
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.16, "triangle", 0.16));
  },

  // New badge unlocked.
  badge() {
    if (muted) return;
    [784, 988, 1319].forEach((f, i) => note(f, i * 0.12, 0.22, "sine", 0.18));
  },
};

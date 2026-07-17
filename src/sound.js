// Move Quest — synthesized sound effects (Web Audio, no audio files).

const MUTE_KEY = "move-quest-muted";

let ctx = null;
let muted = false;
let calm = null;

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

  // Dance-party beat: a soft kick thump.
  thump() {
    if (muted) return;
    note(130, 0, 0.1, "sine", 0.22);
  },

  // Munch munch.
  chomp() {
    if (muted) return;
    note(180, 0, 0.06, "square", 0.14);
    note(150, 0.1, 0.06, "square", 0.14);
    note(165, 0.2, 0.06, "square", 0.12);
  },

  // A tiny comedy burp. Excuse me!
  burp() {
    if (muted) return;
    note(95, 0, 0.22, "sawtooth", 0.12);
  },

  // Boop reaction: a quick happy giggle.
  giggle() {
    if (muted) return;
    note(523, 0, 0.09, "triangle", 0.16);
    note(784, 0.09, 0.12, "triangle", 0.16);
  },

  // Calm music: a generative lullaby — a soft drifting pad with occasional
  // pentatonic bell notes. Fully synthesized, loops until stopped.
  startCalm() {
    if (calm || muted) return;
    const ac = audioCtx();
    if (!ac) return;

    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.linearRampToValueAtTime(1, ac.currentTime + 2);
    master.connect(ac.destination);

    const padGain = ac.createGain();
    padGain.gain.value = 0.035;
    padGain.connect(master);
    const oscs = [130.81, 196.0].map((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = i === 0 ? -4 : 4;
      osc.connect(padGain);
      osc.start();
      return osc;
    });
    // slow breathing swell on the pad
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(padGain.gain);
    lfo.start();

    const BELLS = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const bellTimer = setInterval(() => {
      if (muted) return;
      const freq = BELLS[Math.floor(Math.random() * BELLS.length)];
      note(freq, 0, 2.8, "triangle", 0.045);
    }, 3400);

    calm = { master, oscs, lfo, bellTimer };
  },

  stopCalm() {
    if (!calm) return;
    const { master, oscs, lfo, bellTimer } = calm;
    calm = null;
    clearInterval(bellTimer);
    try {
      const ac = audioCtx();
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        master.disconnect();
      }, 700);
    } catch (err) {
      // best-effort teardown
    }
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

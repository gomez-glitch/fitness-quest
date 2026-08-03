// Move Quest — synthesized audio engine (Web Audio, no audio files).
//
// Phase-1 "life" architecture:
//  - Buses: sfx and music gains feed a master compressor, so overlapping
//    sounds sit in a mix instead of clipping. The voice channel gates the
//    speech coach (speechSynthesis can't route through Web Audio).
//  - Expression: every note gets a real attack envelope plus tiny random
//    detune and velocity, so no two plays are ever byte-identical.
//  - Timbre: FM bells for chimes and fanfares, filtered-noise transients
//    for ticks and claps, a pitch-dropping kick for the dance thump.
//  - Musicality: all UI tones live in C-major pentatonic; rep taps climb
//    the scale toward the target (progress you can hear).

const MUTE_KEY = "move-quest-muted";
const MIX_KEY = "move-quest-mix";

let ctx = null;
let master = null;
let buses = null; // { sfx, music }
let muted = false;
let calm = null;
let duckTimer = null;

const channels = { sfx: true, music: true, voice: true };

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
  const mix = JSON.parse(localStorage.getItem(MIX_KEY) || "{}");
  for (const k of Object.keys(channels)) {
    if (typeof mix[k] === "boolean") channels[k] = mix[k];
  }
} catch (err) {
  // defaults are fine
}

function audioCtx() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    compressor.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.95;
    master.connect(compressor);

    buses = {
      sfx: ctx.createGain(),
      music: ctx.createGain(),
    };
    buses.sfx.connect(master);
    buses.music.connect(master);
    buses.music.gain.value = 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const jitter = (amt) => (Math.random() * 2 - 1) * amt;

// One expressive note: attack ramp, exponential decay, ±10 cents of drift,
// small velocity variation. The building block for almost everything.
function note(freq, startOffset, duration, type, volume, { bus = "sfx", attack = 0.008, drift = 10 } = {}) {
  const ac = audioCtx();
  if (!ac || !channels[bus]) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const start = ac.currentTime + startOffset;
  const vel = volume * (1 + jitter(0.12));
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.detune.setValueAtTime(jitter(drift), start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(vel, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(buses[bus]);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// FM bell: carrier + modulator gives chimes a glassy, musical ring.
function bell(freq, startOffset, duration, volume) {
  const ac = audioCtx();
  if (!ac || !channels.sfx) return;
  const start = ac.currentTime + startOffset;
  const carrier = ac.createOscillator();
  const mod = ac.createOscillator();
  const modGain = ac.createGain();
  const gain = ac.createGain();
  carrier.frequency.setValueAtTime(freq * (1 + jitter(0.004)), start);
  mod.frequency.setValueAtTime(freq * 2.4, start);
  modGain.gain.setValueAtTime(freq * 1.6, start);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05, start + duration * 0.7);
  mod.connect(modGain).connect(carrier.frequency);
  const vel = volume * (1 + jitter(0.1));
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(vel, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  carrier.connect(gain).connect(buses.sfx);
  mod.start(start);
  carrier.start(start);
  mod.stop(start + duration + 0.05);
  carrier.stop(start + duration + 0.05);
}

// Short filtered-noise burst: the "touch" in ticks and the body of claps.
let noiseBuffer = null;

function noiseBurst(startOffset, duration, volume, filterFreq, q = 1) {
  const ac = audioCtx();
  if (!ac || !channels.sfx) return;
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = ac.currentTime + startOffset;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq * (1 + jitter(0.06));
  filter.Q.value = q;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume * (1 + jitter(0.15)), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(filter).connect(gain).connect(buses.sfx);
  src.start(start, Math.random() * 0.3);
  src.stop(start + duration + 0.05);
}

// C-major pentatonic across two octaves — the app's musical home.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0, 880.0, 1046.5];

function persistMix() {
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(channels));
  } catch (err) {
    // toggle still works for this page load
  }
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
      // persistence unavailable — the toggle still works for this page load
    }
    if (muted) this.stopCalm();
    return muted;
  },

  // --- mixer channels (sfx / music / voice) ---
  channelOn(name) {
    return channels[name] !== false;
  },

  setChannel(name, on) {
    if (!(name in channels)) return;
    channels[name] = Boolean(on);
    if (name === "music" && !on) this.stopCalm();
    persistMix();
  },

  // Music dips politely while the voice coach speaks.
  duck() {
    if (!ctx || !buses) return;
    buses.music.gain.cancelScheduledValues(ctx.currentTime);
    buses.music.gain.setTargetAtTime(0.3, ctx.currentTime, 0.08);
    if (duckTimer) clearTimeout(duckTimer);
    duckTimer = setTimeout(() => {
      if (ctx && buses) buses.music.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    }, 1400);
  },

  // One rep counted (also the soft once-per-second timer tick).
  tick() {
    if (muted) return;
    noiseBurst(0, 0.03, 0.1, 2600, 2);
    note(720, 0, 0.05, "triangle", 0.16);
  },

  // Rep taps climb the pentatonic scale toward the target.
  progressTick(ratio) {
    if (muted) return;
    const idx = Math.max(0, Math.min(SCALE.length - 1, Math.floor(ratio * (SCALE.length - 1))));
    noiseBurst(0, 0.03, 0.09, 2800, 2);
    note(SCALE[idx], 0, 0.09, "triangle", 0.17);
  },

  // Countdown warning for the last seconds of a timed hold.
  beep() {
    if (muted) return;
    note(988, 0, 0.12, "square", 0.13);
  },

  // Dance-party beat: a kick with a real pitch drop.
  thump() {
    if (muted) return;
    const ac = audioCtx();
    if (!ac || !channels.sfx) return;
    const start = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, start);
    osc.frequency.exponentialRampToValueAtTime(48, start + 0.11);
    gain.gain.setValueAtTime(0.32, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
    osc.connect(gain).connect(buses.sfx);
    osc.start(start);
    osc.stop(start + 0.2);
  },

  // Munch munch.
  chomp() {
    if (muted) return;
    note(180, 0, 0.06, "square", 0.13);
    note(150, 0.1, 0.06, "square", 0.13);
    note(165, 0.2, 0.06, "square", 0.11);
  },

  // A tiny comedy burp. Excuse me!
  burp() {
    if (muted) return;
    note(95, 0, 0.22, "sawtooth", 0.11, { drift: 30 });
  },

  // Boop reaction: a quick happy giggle.
  giggle() {
    if (muted) return;
    note(523, 0, 0.09, "triangle", 0.15);
    note(784, 0.09, 0.12, "triangle", 0.15);
  },

  // High five! A real hand-slap: noise crack plus bright ring.
  clap() {
    if (muted) return;
    noiseBurst(0, 0.09, 0.3, 1500, 0.8);
    bell(1046, 0.02, 0.18, 0.12);
  },

  // A rising "wheee!" slide for jumps.
  whee() {
    if (muted) return;
    const ac = audioCtx();
    if (!ac || !channels.sfx) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = ac.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(392, start);
    osc.frequency.exponentialRampToValueAtTime(1046, start + 0.35);
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
    osc.connect(gain).connect(buses.sfx);
    osc.start(start);
    osc.stop(start + 0.5);
  },

  // Ah… ah… ACHOO! Two little inhales, one big sneeze.
  achoo() {
    if (muted) return;
    note(700, 0, 0.08, "triangle", 0.11);
    note(950, 0.16, 0.08, "triangle", 0.13);
    noiseBurst(0.36, 0.12, 0.2, 900, 0.7);
    note(320, 0.36, 0.24, "sawtooth", 0.14, { drift: 25 });
  },

  // A tiny squeaky hiccup blip.
  hic() {
    if (muted) return;
    note(880, 0, 0.05, "square", 0.12);
    note(1245, 0.05, 0.07, "square", 0.1);
  },

  // A four-beat mini groove for dance breaks.
  groove() {
    if (muted) return;
    [0, 0.3, 0.6, 0.9].forEach((t) => {
      this.thumpAt(t);
      noiseBurst(t + 0.15, 0.04, 0.08, 6000, 1.5);
    });
    [SCALE[5], SCALE[7], SCALE[8], SCALE[7]].forEach((f, i) => note(f, i * 0.3 + 0.15, 0.12, "triangle", 0.1));
  },

  thumpAt(offset) {
    const ac = audioCtx();
    if (!ac || !channels.sfx) return;
    const start = ac.currentTime + offset;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, start);
    osc.frequency.exponentialRampToValueAtTime(48, start + 0.11);
    gain.gain.setValueAtTime(0.28, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
    osc.connect(gain).connect(buses.sfx);
    osc.start(start);
    osc.stop(start + 0.2);
  },

  // Calm music: a generative lullaby — a soft drifting pad with occasional
  // pentatonic bell notes. Fully synthesized, loops until stopped.
  startCalm() {
    if (calm || muted || !channels.music) return;
    const ac = audioCtx();
    if (!ac) return;

    const musicMaster = ac.createGain();
    musicMaster.gain.setValueAtTime(0, ac.currentTime);
    musicMaster.gain.linearRampToValueAtTime(1, ac.currentTime + 2);
    musicMaster.connect(buses.music);

    const padGain = ac.createGain();
    padGain.gain.value = 0.035;
    padGain.connect(musicMaster);
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

    const bellTimer = setInterval(() => {
      if (muted || !channels.music) return;
      const freq = SCALE[Math.floor(Math.random() * 6)];
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const start = ac.currentTime;
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = jitter(6);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 2.8);
      osc.connect(gain).connect(musicMaster);
      osc.start(start);
      osc.stop(start + 2.9);
    }, 3400);

    calm = { musicMaster, oscs, lfo, bellTimer };
  },

  stopCalm() {
    if (!calm) return;
    const { musicMaster, oscs, lfo, bellTimer } = calm;
    calm = null;
    clearInterval(bellTimer);
    try {
      const ac = audioCtx();
      musicMaster.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        musicMaster.disconnect();
      }, 700);
    } catch (err) {
      // best-effort teardown
    }
  },

  // Rep target reached — Claim XP is ready. Resolves the scale home.
  chime() {
    if (muted) return;
    bell(SCALE[8], 0, 0.35, 0.16);
    bell(SCALE[10], 0.12, 0.5, 0.16);
  },

  // XP claimed: the pentatonic run resolves upward.
  fanfare() {
    if (muted) return;
    [SCALE[5], SCALE[7], SCALE[8], SCALE[10]].forEach((f, i) => bell(f, i * 0.09, 0.3, 0.14));
  },

  // New badge unlocked.
  badge() {
    if (muted) return;
    [SCALE[8], SCALE[9], SCALE[10]].forEach((f, i) => bell(f, i * 0.12, 0.42, 0.15));
  },
};

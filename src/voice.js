// Move Quest — voice coach (browser speech synthesis, no assets).
//
// Expression comes from three layers:
//  1. Voice selection: devices hide much nicer voices than the default —
//     we rank installed voices and pick the warmest kid-friendly English one.
//  2. Per-hero character: each profile gets its own pitch/rate fingerprint,
//     so every sibling's coach sounds subtly like *theirs*.
//  3. Mood prosody: excited lines lift and quicken, calm lines slow and
//     soften, countdown numbers stay snappy.
//
// Follows the sound mute toggle and the voice channel of the mixer.

import { sound } from "./sound.js";

const available = typeof window !== "undefined" && "speechSynthesis" in window;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// --- voice selection ---------------------------------------------------

// Known-good warm voices, best first. Matched case-insensitively by name.
const PREFERRED = [
  "samantha", "karen", "martha", "moira", "tessa", "catherine", "stephanie",
  "aria", "jenny", "sonia", "libby", "michelle", "natasha",
  "google uk english female", "google us english", "google english",
];

// Apple ships joke voices (Zarvox, Bubbles, Trinoids…). They must never win
// by default — a robot reading the countdown is worse than the plain default.
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|hysterical|pipe organ|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|junior|ralph|fred|kathy|princess|agnes|victoria|novelty|eloquence/;

let chosenVoice = null;
let voicesReady = false;

function scoreVoice(v) {
  if (!/^en/i.test(v.lang)) return -1;
  const name = v.name.toLowerCase();
  if (NOVELTY.test(name)) return -1; // never a joke voice
  let score = 0;
  if (/natural|neural|premium|enhanced/.test(name)) score += 40;
  const idx = PREFERRED.findIndex((p) => name.includes(p));
  if (idx >= 0) score += 30 - idx; // earlier in the list = better
  if (v.localService) score += 5; // no network stutter mid-countdown
  if (/en-(gb|au|us)/i.test(v.lang)) score += 3;
  return score;
}

function refreshVoices() {
  if (!available) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  voicesReady = true;
  chosenVoice = voices
    .map((v) => ({ v, score: scoreVoice(v) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.v)[0] || null;
}

if (available) {
  refreshVoices();
  if (typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  }
}

// --- per-hero character -------------------------------------------------

let heroPitch = 0;
let heroRate = 0;

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Mood recipes layered on top of the hero fingerprint.
const MOODS = {
  normal: { pitch: 1.12, rate: 1.02 },
  excited: { pitch: 1.24, rate: 1.1 },
  calm: { pitch: 1.0, rate: 0.86 },
  count: { pitch: 1.1, rate: 1.12 },
};

export const voice = {
  active() {
    return available && !sound.isMuted() && sound.channelOn("voice");
  },

  // Give this hero their own coach character (deterministic per profile).
  // The spread is continuous, not bucketed — with only a handful of buckets
  // two siblings could draw the same voice.
  setProfile(profileId) {
    const h = hashCode(String(profileId || ""));
    heroPitch = ((h % 997) / 997 - 0.5) * 0.18; // ±0.09
    heroRate = (((h >> 7) % 991) / 991 - 0.5) * 0.07; // ±0.035
  },

  // interrupt=true cancels anything still being spoken — right for countdown
  // numbers, where a backlog would lag behind the clock.
  say(text, { interrupt = true, mood = "normal" } = {}) {
    if (!this.active()) return;
    try {
      if (!voicesReady) refreshVoices();
      if (interrupt) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const m = MOODS[mood] || MOODS.normal;
      if (chosenVoice) utterance.voice = chosenVoice;
      utterance.pitch = Math.max(0.5, Math.min(2, m.pitch + heroPitch));
      utterance.rate = Math.max(0.6, Math.min(1.6, m.rate + heroRate));
      sound.duck(); // music dips politely while the coach speaks
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      // Voice is a bonus — never let it break the app.
    }
  },

  ready() {
    this.say("Ready?", { mood: "normal" });
  },

  go() {
    this.say("Go!", { mood: "excited" });
  },

  count(n) {
    this.say(String(n), { mood: "count" });
  },

  halfway() {
    this.say(pick([
      "Halfway there — keep going!",
      "You're doing great!",
      "Nearly there, keep it up!",
    ]), { mood: "excited" });
  },

  breatheIn() {
    this.say("Breathe in…", { interrupt: false, mood: "calm" });
  },

  breatheOut() {
    this.say("And breathe out…", { interrupt: false, mood: "calm" });
  },

  stretchDone() {
    this.say(pick([
      "Beautiful stretching.",
      "So calm and strong.",
      "Lovely — your muscles say thank you.",
    ]), { mood: "calm" });
  },

  holdDone() {
    this.say(pick([
      "Amazing hold! Well done!",
      "You did it! Super strong!",
      "Wow, what a hold!",
    ]), { mood: "excited" });
  },

  repsDone() {
    this.say(pick([
      "Wow, great effort!",
      "Well done, superstar!",
      "Fantastic work!",
      "You did it! Amazing!",
    ]), { mood: "excited" });
  },

  rest() {
    this.say("Wonderful. Shake it out and breathe.", { interrupt: false, mood: "calm" });
  },

  questComplete() {
    this.say("Quest complete! You're a hero!", { mood: "excited" });
  },

  levelUp() {
    this.say("Level up! Amazing!", { mood: "excited" });
  },
};

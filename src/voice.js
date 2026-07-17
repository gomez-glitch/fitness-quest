// Move Quest — voice coach (browser speech synthesis, no assets).
// Follows the sound mute toggle: muting the app silences the coach too.

import { sound } from "./sound.js";

const available = typeof window !== "undefined" && "speechSynthesis" in window;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export const voice = {
  active() {
    return available && !sound.isMuted();
  },

  // interrupt=true cancels anything still being spoken — right for countdown
  // numbers, where a backlog would lag behind the clock.
  say(text, { interrupt = true } = {}) {
    if (!this.active()) return;
    try {
      if (interrupt) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.15;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      // Voice is a bonus — never let it break the app.
    }
  },

  ready() {
    this.say("Ready?");
  },

  go() {
    this.say("Go!");
  },

  count(n) {
    this.say(String(n));
  },

  halfway() {
    this.say(pick([
      "Halfway there — keep going!",
      "You're doing great!",
      "Nearly there, keep it up!",
    ]));
  },

  breatheIn() {
    this.say("Breathe in…", { interrupt: false });
  },

  breatheOut() {
    this.say("And breathe out…", { interrupt: false });
  },

  stretchDone() {
    this.say(pick([
      "Beautiful stretching!",
      "So calm and strong!",
      "Lovely — your muscles say thank you!",
    ]));
  },

  holdDone() {
    this.say(pick([
      "Amazing hold! Well done!",
      "You did it! Super strong!",
      "Wow, what a hold!",
    ]));
  },

  repsDone() {
    this.say(pick([
      "Wow, great effort!",
      "Well done, superstar!",
      "Fantastic work!",
      "You did it! Amazing!",
    ]));
  },

  rest() {
    this.say("Wonderful! Shake it out and breathe.", { interrupt: false });
  },

  questComplete() {
    this.say("Quest complete! You're a hero!");
  },

  levelUp() {
    this.say("Level up! Amazing!");
  },
};

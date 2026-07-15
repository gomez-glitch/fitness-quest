// Move Quest — app logic (vanilla JS, no dependencies)

import { createMascot, renderStaticMascot } from "./mascot.js";
import { sound } from "./sound.js";

const STORAGE_KEY = "move-quest-progress-v3";
const LEGACY_KEY = "move-quest-progress-v2";
const HISTORY_LIMIT = 12;
const XP_PER_LEVEL = 150;
const MAX_PROFILES = 4;
const DEG_PER_REP = 22.5; // clicker ring rotation per rep
const SPIN_STEP_DEG = 24; // drag angle needed per rep while spinning

const PERSONAS = [
  { id: "spark-sprinter", name: "Spark Sprinter", boost: "Fast feet and brave starts" },
  { id: "core-captain", name: "Core Captain", boost: "Strong middle and steady balance" },
  { id: "power-pixie", name: "Power Pixie", boost: "Tiny weights, mighty effort" },
  { id: "rainbow-ranger", name: "Rainbow Ranger", boost: "Cheerful streak builder" },
];

const AVATARS = ["👟", "🦄", "🐯", "🦊", "🐼", "🛼", "🌟", "🚀"];

const GROUPS = ["All", "Core", "Arms", "Legs", "Whole body"];

const EXERCISES = [
  {
    id: "sit-ups", title: "Sit Ups", target: 5, xp: 35, icon: "🧘", group: "Core",
    muscles: "Core", cue: "Cross arms, curl up slowly, and lower with control.",
    steps: ["Feet planted", "Belly button gently tucked", "Exhale as you sit up"],
  },
  {
    id: "push-ups", title: "Push Ups", target: 3, xp: 35, icon: "💪", group: "Arms",
    muscles: "Chest + arms", cue: "Keep a straight body line. Knees-down push ups count too.",
    steps: ["Hands under shoulders", "Lower like an elevator", "Press the floor away"],
  },
  {
    id: "squats", title: "Squats", target: 8, xp: 50, icon: "🐸", group: "Legs",
    muscles: "Legs + glutes", cue: "Sit back like there's an invisible chair behind you.",
    steps: ["Feet shoulder-width", "Knees track over toes", "Push the floor to stand"],
  },
  {
    id: "side-lunges", title: "Side Lunges", target: 8, xp: 50, icon: "↔️", group: "Legs",
    muscles: "Legs", cue: "Step wide, bend one knee, and keep the other leg long.",
    steps: ["Toes point forward", "Hips move back", "Switch sides each rep"],
  },
  {
    id: "jumping-jacks", title: "Jumping Jacks", target: 12, xp: 55, icon: "⭐", group: "Whole body",
    muscles: "Whole body", cue: "Jump feet wide while your arms make a star, then back together.",
    steps: ["Soft bouncy knees", "Arms like a star", "Find a steady rhythm"],
  },
  {
    id: "high-knees", title: "High Knees", target: 16, xp: 60, icon: "🏃", group: "Whole body",
    muscles: "Legs + heart", cue: "Run on the spot, lifting your knees toward hip height.",
    steps: ["Stand tall", "Drive knees up", "Pump your arms"],
  },
  {
    id: "mountain-climbers", title: "Mountain Climbers", target: 10, xp: 55, icon: "⛰️", group: "Whole body",
    muscles: "Whole body", cue: "In a push up position, walk or run your knees toward your chest.",
    steps: ["Strong straight back", "One knee in at a time", "Go your own speed"],
  },
  {
    id: "flutter-kicks", title: "Flutter Kicks", target: 10, xp: 55, icon: "🏊", group: "Core",
    muscles: "Lower core", cue: "Small quick kicks while your back stays comfortable.",
    steps: ["Hands under hips", "Tiny alternating kicks", "Rest if your back arches"],
  },
  {
    id: "glute-bridge", title: "Glute Bridge", target: 8, xp: 45, icon: "🌉", group: "Legs",
    muscles: "Glutes + back", cue: "Lie on your back and lift your hips up like a bridge.",
    steps: ["Feet flat near bottom", "Squeeze as you lift", "Lower slowly"],
  },
  {
    id: "superman", title: "Superman", target: 5, xp: 40, icon: "🦸", group: "Core",
    muscles: "Back + core", cue: "Lie on your tummy and lift arms and legs like flying.",
    steps: ["Look at the floor", "Reach long, not high", "Hold for one breath"],
  },
  {
    id: "chair-dips", title: "Chair Dips", target: 5, xp: 45, icon: "🪑", group: "Arms",
    muscles: "Triceps", cue: "Use a sturdy chair and bend elbows straight back.",
    steps: ["Chair against a wall", "Shoulders relaxed", "Move slowly"],
  },
  {
    id: "oblique-raises", title: "Oblique Raises", target: 8, xp: 45, icon: "🌙", group: "Core",
    muscles: "Side core", cue: "Reach tall, then lift through one side of your waist.",
    steps: ["Stand proud", "Slide hand toward knee", "Switch sides"],
  },
  {
    id: "russian-twists", title: "Russian Twists", target: 10, xp: 60, icon: "🔄", group: "Core",
    muscles: "Core rotation", cue: "Sit tall and rotate side to side with gentle control.",
    steps: ["Heels can stay down", "Chest stays lifted", "Tap both sides"],
  },
  {
    id: "weight-curls", title: "Light Weight Curls", target: 8, xp: 50, icon: "🏋️", group: "Arms",
    muscles: "Biceps", cue: "Use small weights or water bottles and move smoothly.",
    steps: ["Elbows near ribs", "Curl to shoulders", "Lower for two counts"],
  },
  {
    id: "overhead-press", title: "Mini Overhead Press", target: 6, xp: 50, icon: "🙆", group: "Arms",
    muscles: "Shoulders", cue: "Press light weights upward without shrugging.",
    steps: ["Soft knees", "Start at shoulders", "Press and return"],
  },
  {
    id: "calf-raises", title: "Calf Raises", target: 10, xp: 45, icon: "🦶", group: "Legs",
    muscles: "Calves", cue: "Rise up onto tiptoes slowly, then lower with control.",
    steps: ["Hold a wall if wobbly", "Pause at the top", "Heels down softly"],
  },
];

const DAILY_QUEST_COUNT = 3;
const DAILY_BONUS_XP = 40;

// Rotates one per day — movement, amazing-body, food, calm, and kindness facts.
const FUN_FACTS = [
  "Your heart is a muscle about the size of your fist — and it gets a little stronger every time you play! ❤️",
  "Jumping and skipping make your bones grow stronger. Bones love a bounce! 🦴",
  "Kids' hearts beat faster than grown-ups' — around 70 to 100 beats every minute!",
  "Your muscles work in pairs: when one pulls, its partner rests. Teamwork! 🤝",
  "Moving your body releases happy brain chemicals called endorphins. 😊",
  "Stretching after moving keeps your muscles bendy, like a cat. 🐱",
  "Balancing on one leg is a secret workout — your body makes hundreds of tiny fixes to keep you steady!",
  "Playing tag is real athlete training — bursts of running, then rest. Champions train like that on purpose! 🏃",
  "You have more than 600 muscles, and every single one likes to be used.",
  "Your bones are alive! They quietly rebuild themselves all the time.",
  "Kids have about 300 bones, but grown-ups have 206 — some of yours will join together as you grow!",
  "Your blood zooms all the way around your body in about one minute. 🚀",
  "You breathe about 20,000 times every day. Your lungs are champions! 🌬️",
  "For its weight, your thigh bone is stronger than concrete. 🏗️",
  "Carrots really do help your eyes — they're packed with vitamin A. 🥕",
  "Your brain is about three-quarters water, so drinking water is like watering your thoughts! 💧",
  "A rainbow plate is a power plate: every colour of fruit and veggie has its own superpower. 🌈",
  "Bananas are famous for quick energy — tennis stars munch them between games! 🍌",
  "Breakfast is like plugging in your body's charger for the whole day. 🔌",
  "Crunchy apples wake up your brain AND give your teeth a mini clean. 🍎",
  "Five slow belly breaths tell your brain 'all is well.' Try it tonight! 🧘",
  "Sleep is when your muscles grow and your brain files away everything you learned today. 😴",
  "Smiling — even a pretend smile — can nudge your brain toward happy. 🙂",
  "Time outside in green places helps your mind feel calm and fresh. 🌳",
  "Closing your eyes and just listening for ten seconds is a mini vacation for your mind. 🎧",
  "Everyone's body is different — and yours is exactly right for being you. 💜",
  "Saying 'I can't do it YET' turns a wall into a staircase. 🪜",
  "Cheering for a friend gives YOUR brain a happiness boost too. 📣",
  "Trying new things grows your brain — mistakes are proof you're learning!",
  "A high-five in the mirror is scientifically silly AND fun. Try one! 🖐️",
  "Being kind releases the same feel-good chemicals as exercise. Double points for kind movers! ✨",
  "Dancing counts as exercise — even the silly kind. Especially the silly kind! 🕺",
];

const ADVENTURES = [
  { id: "morning-spark", name: "Morning Spark", emoji: "🌅", moves: ["jumping-jacks", "squats", "sit-ups"] },
  { id: "power-play", name: "Power Play", emoji: "⚡", moves: ["push-ups", "mountain-climbers", "high-knees", "flutter-kicks"] },
  { id: "super-five", name: "Super Hero Five", emoji: "🦸", moves: ["jumping-jacks", "squats", "push-ups", "russian-twists", "superman"] },
  { id: "surprise", name: "Surprise Me!", emoji: "🎲", moves: null },
];

const BADGES = [
  { id: "xp-35", emoji: "✨", label: "First Move", need: "Earn 35 XP", test: (s) => s.xp >= 35 },
  { id: "xp-160", emoji: "🔢", label: "Rep Rookie", need: "Earn 160 XP", test: (s) => s.xp >= 160 },
  { id: "xp-320", emoji: "💜", label: "Core Hero", need: "Earn 320 XP", test: (s) => s.xp >= 320 },
  { id: "xp-520", emoji: "🏆", label: "Quest Champion", need: "Earn 520 XP", test: (s) => s.xp >= 520 },
  { id: "streak-3", emoji: "🔥", label: "On Fire", need: "3-day streak", test: (s) => s.streak >= 3 },
  { id: "streak-7", emoji: "⚡", label: "Unstoppable Week", need: "7-day streak", test: (s) => s.streak >= 7 },
  { id: "tried-all", emoji: "🗺️", label: "Move Master", need: "Try every move", test: (s) => s.stats.tried.length >= EXERCISES.length },
  { id: "legs-5", emoji: "🦵", label: "Leg Legend", need: "5 leg quests", test: (s) => (s.stats.groups.Legs || 0) >= 5 },
  { id: "core-5", emoji: "🌀", label: "Core Commander", need: "5 core quests", test: (s) => (s.stats.groups.Core || 0) >= 5 },
  { id: "arms-5", emoji: "🦾", label: "Arm Ace", need: "5 arm quests", test: (s) => (s.stats.groups.Arms || 0) >= 5 },
  { id: "day-3", emoji: "🎯", label: "Triple Play", need: "3 quests in one day", test: (s) => s.stats.bestDay >= 3 },
  { id: "day-5", emoji: "🚀", label: "Super Session", need: "5 quests in one day", test: (s) => s.stats.bestDay >= 5 },
  { id: "lvl-5", emoji: "🏅", label: "Level 5 Hero", need: "Reach level 5", test: (s) => levelForXp(s.xp) >= 5 },
  { id: "lvl-10", emoji: "👑", label: "Level 10 Legend", need: "Reach level 10", test: (s) => levelForXp(s.xp) >= 10 },
  { id: "reps-500", emoji: "⛰️", label: "Rep Mountain", need: "500 total reps", test: (s) => s.reps >= 500 },
];

// ---------------------------------------------------------------------------
// State: storage, migration, normalization
// ---------------------------------------------------------------------------

function defaultProfileState(nickname = "Spark") {
  const counters = {};
  EXERCISES.forEach((ex) => { counters[ex.id] = 0; });
  return {
    xp: 0,
    streak: 0,
    reps: 0,
    completed: [],
    lastCompletedDate: null,
    counters,
    profile: { nickname, persona: "spark-sprinter", avatar: "👟" },
    stats: { tried: [], groups: {}, todayDate: null, todayCount: 0, bestDay: 0, bestStreak: 0 },
    daily: { date: null, done: [], bonusClaimed: false },
    days: {},
  };
}

function isValidLogEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.icon === "string" &&
    typeof entry.date === "string" &&
    typeof entry.xp === "number" &&
    typeof entry.reps === "number"
  );
}

function normalizeProfile(parsed) {
  const state = defaultProfileState();
  if (!parsed || typeof parsed !== "object") return state;

  if (typeof parsed.xp === "number" && parsed.xp >= 0) state.xp = parsed.xp;
  if (typeof parsed.streak === "number" && parsed.streak >= 0) state.streak = parsed.streak;
  if (typeof parsed.reps === "number" && parsed.reps >= 0) state.reps = parsed.reps;
  if (typeof parsed.lastCompletedDate === "string") state.lastCompletedDate = parsed.lastCompletedDate;

  state.completed = Array.isArray(parsed.completed)
    ? parsed.completed.filter(isValidLogEntry).slice(0, HISTORY_LIMIT)
    : [];

  if (parsed.counters && typeof parsed.counters === "object") {
    EXERCISES.forEach((ex) => {
      const val = parsed.counters[ex.id];
      state.counters[ex.id] = typeof val === "number" && val >= 0 && val <= ex.target ? val : 0;
    });
  }

  if (parsed.profile && typeof parsed.profile === "object") {
    const p = parsed.profile;
    if (typeof p.nickname === "string" && p.nickname.trim()) {
      state.profile.nickname = p.nickname.trim().slice(0, 16);
    }
    if (PERSONAS.some((persona) => persona.id === p.persona)) state.profile.persona = p.persona;
    if (AVATARS.includes(p.avatar)) state.profile.avatar = p.avatar;
  }

  const st = parsed.stats;
  if (st && typeof st === "object") {
    const ids = EXERCISES.map((ex) => ex.id);
    if (Array.isArray(st.tried)) {
      state.stats.tried = [...new Set(st.tried.filter((id) => ids.includes(id)))];
    }
    if (st.groups && typeof st.groups === "object") {
      GROUPS.forEach((g) => {
        if (typeof st.groups[g] === "number" && st.groups[g] >= 0) state.stats.groups[g] = st.groups[g];
      });
    }
    if (typeof st.todayDate === "string") state.stats.todayDate = st.todayDate;
    if (typeof st.todayCount === "number" && st.todayCount >= 0) state.stats.todayCount = st.todayCount;
    if (typeof st.bestDay === "number" && st.bestDay >= 0) state.stats.bestDay = st.bestDay;
    if (typeof st.bestStreak === "number" && st.bestStreak >= 0) state.stats.bestStreak = st.bestStreak;
  }

  const dl = parsed.daily;
  if (dl && typeof dl === "object") {
    const ids = EXERCISES.map((ex) => ex.id);
    if (typeof dl.date === "string") state.daily.date = dl.date;
    if (Array.isArray(dl.done)) state.daily.done = dl.done.filter((id) => ids.includes(id));
    state.daily.bonusClaimed = dl.bonusClaimed === true;
  }

  if (parsed.days && typeof parsed.days === "object") {
    for (const [date, entry] of Object.entries(parsed.days)) {
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        entry && typeof entry === "object" &&
        typeof entry.xp === "number" && typeof entry.reps === "number"
      ) {
        state.days[date] = { xp: entry.xp, reps: entry.reps };
      }
    }
  }

  return state;
}

function newProfileId() {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function defaultData() {
  const id = newProfileId();
  return { activeProfileId: id, profiles: { [id]: defaultProfileState() } };
}

function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return defaultData();
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.profiles && typeof parsed.profiles === "object") {
        const data = { activeProfileId: null, profiles: {} };
        for (const [id, prof] of Object.entries(parsed.profiles).slice(0, MAX_PROFILES)) {
          data.profiles[id] = normalizeProfile(prof);
        }
        if (Object.keys(data.profiles).length === 0) return defaultData();
        data.activeProfileId = Object.prototype.hasOwnProperty.call(data.profiles, parsed.activeProfileId)
          ? parsed.activeProfileId
          : Object.keys(data.profiles)[0];
        return data;
      }
    } catch (err) {
      return defaultData();
    }
    return defaultData();
  }

  // One-time migration from single-profile v2 data.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const id = newProfileId();
      const data = { activeProfileId: id, profiles: { [id]: normalizeProfile(JSON.parse(legacyRaw)) } };
      localStorage.removeItem(LEGACY_KEY);
      return data;
    }
  } catch (err) {
    // fall through to defaults
  }

  return defaultData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Storage unavailable (private mode, quota, etc). Fail silently — the
    // app still works for the current page load.
  }
}

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function wasYesterday(lastDateStr, currentTodayStr) {
  if (!lastDateStr) return false;
  const parts = lastDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = parts;
  const last = new Date(y, m - 1, d);
  last.setDate(last.getDate() + 1);
  return currentTodayStr === todayStr(last);
}

function levelForXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// Deterministic PRNG so every device shows the same daily quests for a date.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyQuestIds(dateStr = todayStr()) {
  const rand = mulberry32(Number(dateStr.replace(/-/g, "")));
  const pool = EXERCISES.map((ex) => ex.id);
  const picked = [];
  while (picked.length < DAILY_QUEST_COUNT && pool.length) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picked;
}

function ensureDailyFresh(st) {
  const today = todayStr();
  if (st.daily.date !== today) {
    st.daily = { date: today, done: [], bonusClaimed: false };
  }
}

function pruneDays(st) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = todayStr(cutoff);
  for (const date of Object.keys(st.days)) {
    if (date < cutoffStr) delete st.days[date];
  }
}

function findExercise(id) {
  return EXERCISES.find((ex) => ex.id === id) || null;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

let data = loadData();
saveData(); // persist immediately so migrated/repaired data survives a reload
let activeExerciseId = EXERCISES[0].id;
let activeFilter = "All";
let profileDraft = null;

function activeProfile() {
  return data.profiles[data.activeProfileId];
}

profileDraft = { ...activeProfile().profile };

const REDUCED_MOTION =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const el = {
  heroAvatar: document.getElementById("hero-avatar"),
  startMovingBtn: document.getElementById("start-moving-btn"),
  customizeHeroBtn: document.getElementById("customize-hero-btn"),

  profileSwitcher: document.getElementById("profile-switcher"),
  switcherToggle: document.getElementById("switcher-toggle"),
  switcherPanel: document.getElementById("switcher-panel"),
  switcherSummary: document.getElementById("switcher-summary"),
  customizeToggle: document.getElementById("customize-toggle"),
  customizePanel: document.getElementById("customize-panel"),
  profileForm: document.getElementById("profile-form"),
  nicknameInput: document.getElementById("nickname-input"),
  personaSelect: document.getElementById("persona-select"),
  personaBoost: document.getElementById("persona-boost"),
  avatarGrid: document.getElementById("avatar-grid"),
  removeProfileBtn: document.getElementById("remove-profile-btn"),

  statLevel: document.getElementById("stat-level"),
  statXp: document.getElementById("stat-xp"),
  statStreak: document.getElementById("stat-streak"),
  statReps: document.getElementById("stat-reps"),
  levelProgressFill: document.getElementById("level-progress-fill"),
  levelProgressLabel: document.getElementById("level-progress-label"),

  filterChips: document.getElementById("filter-chips"),
  exerciseBoard: document.getElementById("exercise-board"),

  activeHeadingText: document.getElementById("active-heading-text"),
  activeIllustration: document.getElementById("active-illustration"),
  activeCue: document.getElementById("active-cue"),
  activeSteps: document.getElementById("active-steps"),

  dialArea: document.getElementById("quest-dial-area"),
  clicker: document.getElementById("rep-clicker"),
  clickerRing: document.getElementById("clicker-ring"),
  clickerProgress: document.getElementById("clicker-progress"),
  dialCount: document.getElementById("dial-count"),
  dialTarget: document.getElementById("dial-target"),
  dialMinus: document.getElementById("dial-minus"),
  muteBtn: document.getElementById("mute-btn"),
  claimBtn: document.getElementById("claim-xp-btn"),

  tabBar: document.querySelector(".tab-bar"),
  heroFactText: document.getElementById("hero-fact-text"),
  detailOverlay: document.getElementById("detail-overlay"),
  dailyBoard: document.getElementById("daily-board"),
  weekChart: document.getElementById("week-chart"),
  weekBests: document.getElementById("week-bests"),
  adventurePresets: document.getElementById("adventure-presets"),
  adventureOverlay: document.getElementById("adventure-overlay"),

  moveLibrary: document.getElementById("move-library"),
  badgeCase: document.getElementById("badge-case"),
  questLog: document.getElementById("quest-log"),
  resetBtn: document.getElementById("reset-btn"),
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderHero() {
  el.heroAvatar.textContent = activeProfile().profile.avatar;
}

function renderDailyFact() {
  // Sequential daily rotation: every fact gets its turn before any repeats.
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  el.heroFactText.textContent = FUN_FACTS[daysSinceEpoch % FUN_FACTS.length];
}

function renderProfileSwitcher() {
  const ids = Object.keys(data.profiles);
  const chips = ids.map((id) => {
    const p = data.profiles[id].profile;
    const active = id === data.activeProfileId;
    return `
      <button type="button" class="profile-chip" data-profile="${id}" aria-pressed="${active}">
        <span class="profile-chip-avatar" aria-hidden="true">${p.avatar}</span>
        <span>${escapeHtml(p.nickname)}</span>
      </button>
    `;
  });
  if (ids.length < MAX_PROFILES) {
    chips.push(`
      <button type="button" class="profile-chip profile-chip-add" id="add-profile-btn">
        <span class="profile-chip-avatar" aria-hidden="true">＋</span>
        <span>New hero</span>
      </button>
    `);
  }
  el.profileSwitcher.innerHTML = chips.join("");
  el.removeProfileBtn.style.display = ids.length > 1 ? "" : "none";

  const p = activeProfile().profile;
  el.switcherSummary.innerHTML =
    `<span class="profile-chip-avatar" aria-hidden="true">${p.avatar}</span> <span>${escapeHtml(p.nickname)}</span>`;
}

function setSwitcherOpen(open) {
  el.switcherPanel.hidden = !open;
  el.switcherToggle.setAttribute("aria-expanded", String(open));
  el.switcherToggle.classList.toggle("open", open);
}

function setCustomizeOpen(open) {
  el.customizePanel.hidden = !open;
  el.customizeToggle.setAttribute("aria-expanded", String(open));
  el.customizeToggle.classList.toggle("open", open);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = ["home", "play", "adventure", "library", "awards"];

function switchTab(name) {
  if (!TABS.includes(name)) return;
  TABS.forEach((t) => {
    document.getElementById(`view-${t}`).hidden = t !== name;
  });
  el.tabBar.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.setAttribute("aria-selected", String(btn.dataset.tab === name));
  });
  window.scrollTo({ top: 0 });
  // Don't burn rAF frames animating a mascot nobody can see.
  if (mascot) {
    if (name === "play") mascot.start();
    else mascot.stop();
  }
}

function renderProfileForm() {
  el.nicknameInput.value = profileDraft.nickname;

  el.personaSelect.innerHTML = PERSONAS.map(
    (p) => `<option value="${p.id}">${p.name}</option>`
  ).join("");
  el.personaSelect.value = profileDraft.persona;
  updatePersonaBoost();

  el.avatarGrid.innerHTML = AVATARS.map((avatar) => {
    const checked = avatar === profileDraft.avatar;
    return `<button type="button" class="avatar-option" role="radio" aria-checked="${checked}" data-avatar="${avatar}" aria-label="Avatar ${avatar}">${avatar}</button>`;
  }).join("");
}

function updatePersonaBoost() {
  const persona = PERSONAS.find((p) => p.id === profileDraft.persona);
  el.personaBoost.textContent = persona ? persona.boost : "";
}

function renderDashboard() {
  const st = activeProfile();
  const level = levelForXp(st.xp);
  const xpIntoLevel = st.xp % XP_PER_LEVEL;
  const pct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

  el.statLevel.textContent = String(level);
  el.statXp.textContent = String(st.xp);
  el.statStreak.innerHTML = `${st.streak} <span class="flame">🔥</span>`;
  el.statReps.textContent = String(st.reps);

  el.levelProgressFill.style.width = `${pct}%`;
  el.levelProgressLabel.textContent = `${xpIntoLevel} / ${XP_PER_LEVEL} XP to next level`;
}

function renderFilterChips() {
  el.filterChips.innerHTML = GROUPS.map((g) => `
    <button type="button" class="filter-chip" data-filter="${g}" aria-pressed="${g === activeFilter}">${g}</button>
  `).join("");
}

function renderExerciseBoard() {
  const list = EXERCISES.filter((ex) => activeFilter === "All" || ex.group === activeFilter);
  el.exerciseBoard.innerHTML = list.map((ex) => {
    const pressed = ex.id === activeExerciseId;
    return `
      <button type="button" class="exercise-tile" data-exercise="${ex.id}" aria-pressed="${pressed}">
        <span class="exercise-tile-icon" aria-hidden="true">${ex.icon}</span>
        <span class="exercise-tile-body">
          <span class="exercise-tile-title">${ex.title}</span>
          <span class="exercise-tile-meta">${ex.target} reps · ${ex.xp} XP · ${ex.muscles}</span>
        </span>
      </button>
    `;
  }).join("");
}

let mascot = null;

function renderActivePanel() {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;

  el.activeHeadingText.textContent = `${activeProfile().profile.nickname}'s move: ${exercise.title}`;
  el.activeIllustration.setAttribute(
    "aria-label",
    `Spark demonstrating the ${exercise.title} movement`
  );
  el.activeCue.textContent = exercise.cue;
  el.activeSteps.innerHTML = exercise.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");

  if (!mascot) {
    mascot = createMascot(el.activeIllustration, exercise.id);
  } else {
    mascot.setExercise(exercise.id);
  }

  renderClicker();
}

// ---------------------------------------------------------------------------
// Clicker (rotating tally counter)
// ---------------------------------------------------------------------------

const RING_RADIUS = 86;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;
let spinAngleOffset = 0; // live extra rotation while dragging

function buildRingNotches() {
  const NOTCHES = 16;
  let html = "";
  for (let i = 0; i < NOTCHES; i++) {
    const a = (i * 360) / NOTCHES;
    const major = i % 4 === 0;
    html += `<line x1="100" y1="${major ? 18 : 22}" x2="100" y2="30" transform="rotate(${a} 100 100)" />`;
  }
  el.clickerRing.innerHTML = html;
}

function renderClicker() {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const st = activeProfile();
  const count = st.counters[exercise.id] || 0;
  const pct = exercise.target > 0 ? count / exercise.target : 0;

  el.dialCount.textContent = String(count);
  el.dialTarget.textContent = String(exercise.target);
  el.clicker.setAttribute("aria-valuemax", String(exercise.target));
  el.clicker.setAttribute("aria-valuenow", String(count));
  el.clicker.classList.toggle("clicker-full", count >= exercise.target);

  el.clickerProgress.style.strokeDasharray = String(RING_CIRC);
  el.clickerProgress.style.strokeDashoffset = String(RING_CIRC * (1 - pct));

  const angle = count * DEG_PER_REP + spinAngleOffset;
  el.clickerRing.setAttribute("transform", `rotate(${angle} 100 100)`);

  el.claimBtn.disabled = count < exercise.target;
}

function changeCount(delta, opts = {}) {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const st = activeProfile();
  const current = st.counters[exercise.id] || 0;
  const next = Math.max(0, Math.min(exercise.target, current + delta));
  if (next === current) return;

  st.counters[exercise.id] = next;
  saveData();

  if (delta > 0) {
    sound.tick();
    if (navigator.vibrate && !opts.quiet) navigator.vibrate(8);
    if (!REDUCED_MOTION) {
      el.clicker.classList.remove("clicker-bump");
      void el.clicker.offsetWidth; // restart animation
      el.clicker.classList.add("clicker-bump");
    }
    if (next === exercise.target) {
      sound.chime();
      spawnConfetti();
    }
  }

  renderClicker();
}

// Pointer interaction: tap = +1, spin around the centre = ratchet up/down.
(function setupClickerPointer() {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let lastAngle = 0;
  let accumulated = 0;
  let moved = false;

  function pointerAngle(event) {
    const rect = el.clicker.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
  }

  el.clicker.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
    lastAngle = pointerAngle(event);
    accumulated = 0;
    el.clicker.setPointerCapture(event.pointerId);
  });

  el.clicker.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) moved = true;
    if (!moved) return;

    let delta = pointerAngle(event) - lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle = pointerAngle(event);
    accumulated += delta;
    spinAngleOffset = accumulated % SPIN_STEP_DEG;

    while (accumulated >= SPIN_STEP_DEG) {
      accumulated -= SPIN_STEP_DEG;
      changeCount(1);
    }
    while (accumulated <= -SPIN_STEP_DEG) {
      accumulated += SPIN_STEP_DEG;
      changeCount(-1);
    }
    renderClicker();
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    spinAngleOffset = 0;
    const quick = performance.now() - startTime < 400;
    if (!moved && quick) changeCount(1);
    renderClicker();
  }

  el.clicker.addEventListener("pointerup", endDrag);
  el.clicker.addEventListener("pointercancel", endDrag);
})();

el.clicker.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowRight", " ", "Enter"].includes(event.key)) {
    event.preventDefault();
    changeCount(1);
  } else if (["ArrowDown", "ArrowLeft"].includes(event.key)) {
    event.preventDefault();
    changeCount(-1);
  }
});

function spawnConfetti(host = el.dialArea, count = 14) {
  if (REDUCED_MOTION) return;
  const colors = ["#7c3aed", "#ec4899", "#fde68a", "#a78bfa", "#f9a8d4"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 220}px`);
    piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 540}deg`);
    piece.style.setProperty("--clr", colors[i % colors.length]);
    piece.style.setProperty("--delay", `${Math.random() * 0.12}s`);
    host.appendChild(piece);
    setTimeout(() => piece.remove(), 1300);
  }
}

// ---------------------------------------------------------------------------
// Library, badges, quest log
// ---------------------------------------------------------------------------

function renderMoveLibrary() {
  const groups = GROUPS.filter((g) => g !== "All");
  el.moveLibrary.innerHTML = groups.map((group) => {
    const cards = EXERCISES.filter((ex) => ex.group === group).map((ex) => `
      <button type="button" class="library-card" data-exercise="${ex.id}"
              aria-label="See how to do ${ex.title}">
        <span class="library-illustration" role="img" aria-label="Spark demonstrating the ${ex.title} movement" data-exercise="${ex.id}"></span>
        <span class="library-card-title">${ex.icon} ${ex.title}</span>
        <span class="library-card-meta">${ex.target} reps · ${ex.muscles}</span>
      </button>
    `).join("");
    return `
      <h3 class="library-group-heading">${group}</h3>
      <div class="h-row library-row">${cards}</div>
    `;
  }).join("");
  el.moveLibrary.querySelectorAll(".library-illustration").forEach((node) => {
    renderStaticMascot(node, node.dataset.exercise);
  });
}

function earnedBadgeIds(st) {
  return BADGES.filter((b) => b.test(st)).map((b) => b.id);
}

function renderBadges() {
  const st = activeProfile();
  el.badgeCase.innerHTML = BADGES.map((badge) => {
    const earned = badge.test(st);
    return `
      <div class="badge ${earned ? "" : "locked"}">
        <span class="badge-emoji" aria-hidden="true">${badge.emoji}</span>
        <span>${badge.label}</span>
        <span class="badge-req">${earned ? "Unlocked!" : badge.need}</span>
      </div>
    `;
  }).join("");
}

function renderQuestLog() {
  const st = activeProfile();
  if (st.completed.length === 0) {
    el.questLog.innerHTML = `<li class="quest-log-empty">No quests completed yet — go earn some XP!</li>`;
    return;
  }
  el.questLog.innerHTML = st.completed.map((entry) => `
    <li class="quest-log-item">
      <span class="quest-log-icon" aria-hidden="true">${entry.icon}</span>
      <span class="quest-log-body">
        <span class="quest-log-title">${escapeHtml(entry.title)}</span>
        <span class="quest-log-meta">${entry.date} · +${entry.xp} XP · ${entry.reps} reps</span>
      </span>
    </li>
  `).join("");
}

function renderDaily() {
  const st = activeProfile();
  ensureDailyFresh(st);
  const quests = dailyQuestIds();
  const allDone = st.daily.done.length >= quests.length;

  const cards = quests.map((id) => {
    const ex = findExercise(id);
    const done = st.daily.done.includes(id);
    return `
      <button type="button" class="daily-quest ${done ? "done" : ""}" data-exercise="${id}">
        <span class="daily-quest-icon" aria-hidden="true">${done ? "✅" : ex.icon}</span>
        <span class="daily-quest-title">${ex.title}</span>
        <span class="daily-quest-meta">${done ? "Done!" : `${ex.target} reps`}</span>
      </button>
    `;
  });

  cards.push(`
    <div class="daily-chest ${allDone ? "open" : ""}" role="img"
         aria-label="${allDone ? `Bonus chest opened: +${DAILY_BONUS_XP} XP earned` : `Complete all three quests to open the bonus chest for +${DAILY_BONUS_XP} XP`}">
      <span class="daily-chest-emoji" aria-hidden="true">${allDone ? "🎁" : "📦"}</span>
      <span class="daily-quest-meta">${allDone ? `+${DAILY_BONUS_XP} XP earned!` : `All 3 = +${DAILY_BONUS_XP} XP`}</span>
    </div>
  `);

  el.dailyBoard.innerHTML = cards.join("");
  el.dailyBoard.closest("section").classList.toggle("daily-complete", allDone);
}

function renderWeekChart() {
  const st = activeProfile();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayStr(d);
    days.push({
      key,
      label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
      xp: (st.days[key] && st.days[key].xp) || 0,
      isToday: i === 0,
    });
  }
  const max = Math.max(...days.map((d) => d.xp), 1);

  el.weekChart.innerHTML = days.map((d) => `
    <div class="week-col ${d.isToday ? "today" : ""}">
      <span class="week-xp">${d.xp || ""}</span>
      <div class="week-bar" style="height:${Math.max(4, Math.round((d.xp / max) * 100))}%"></div>
      <span class="week-day">${d.label}</span>
    </div>
  `).join("");

  const bestDayXp = Math.max(...Object.values(st.days).map((d) => d.xp), 0);
  el.weekBests.textContent =
    `Best day: ${bestDayXp} XP · Longest streak: ${st.stats.bestStreak} day${st.stats.bestStreak === 1 ? "" : "s"}`;
}

function renderAll() {
  renderHero();
  renderProfileSwitcher();
  renderProfileForm();
  renderDashboard();
  renderFilterChips();
  renderExerciseBoard();
  renderActivePanel();
  renderBadges();
  renderQuestLog();
  renderDaily();
  renderWeekChart();
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

el.tabBar.addEventListener("click", (event) => {
  const btn = event.target.closest(".tab-btn");
  if (btn) switchTab(btn.dataset.tab);
});

el.startMovingBtn.addEventListener("click", () => {
  switchTab("play");
});

el.customizeHeroBtn.addEventListener("click", () => {
  setSwitcherOpen(true);
  setCustomizeOpen(true);
  el.nicknameInput.focus();
});

el.switcherToggle.addEventListener("click", () => {
  setSwitcherOpen(el.switcherPanel.hidden);
});

el.customizeToggle.addEventListener("click", () => {
  setCustomizeOpen(el.customizePanel.hidden);
});

el.profileSwitcher.addEventListener("click", (event) => {
  const addBtn = event.target.closest("#add-profile-btn");
  if (addBtn) {
    const count = Object.keys(data.profiles).length;
    if (count >= MAX_PROFILES) return;
    const id = newProfileId();
    data.profiles[id] = defaultProfileState(`Hero ${count + 1}`);
    data.activeProfileId = id;
    profileDraft = { ...activeProfile().profile };
    saveData();
    renderAll();
    setCustomizeOpen(true); // straight into naming the new hero
    el.nicknameInput.focus();
    return;
  }

  const chip = event.target.closest(".profile-chip[data-profile]");
  if (!chip || chip.dataset.profile === data.activeProfileId) return;
  data.activeProfileId = chip.dataset.profile;
  profileDraft = { ...activeProfile().profile };
  saveData();
  renderAll();
  setSwitcherOpen(false); // hero picked — tuck the drawer away
});

el.removeProfileBtn.addEventListener("click", () => {
  const ids = Object.keys(data.profiles);
  if (ids.length <= 1) return;
  const name = activeProfile().profile.nickname;
  if (!window.confirm(`Remove hero "${name}" and all of their progress? This cannot be undone.`)) return;
  delete data.profiles[data.activeProfileId];
  data.activeProfileId = Object.keys(data.profiles)[0];
  profileDraft = { ...activeProfile().profile };
  saveData();
  renderAll();
});

el.personaSelect.addEventListener("change", () => {
  profileDraft.persona = el.personaSelect.value;
  updatePersonaBoost();
});

el.avatarGrid.addEventListener("click", (event) => {
  const btn = event.target.closest(".avatar-option");
  if (!btn) return;
  profileDraft.avatar = btn.dataset.avatar;
  // Only update the checked state — a full re-render would wipe out
  // whatever the nickname field currently holds before it's saved.
  el.avatarGrid.querySelectorAll(".avatar-option").forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.avatar === profileDraft.avatar));
  });
});

el.profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nickname = el.nicknameInput.value.trim() || "Spark";
  profileDraft.nickname = nickname.slice(0, 16);
  activeProfile().profile = { ...profileDraft };
  saveData();
  renderAll();
});

el.filterChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".filter-chip");
  if (!chip) return;
  activeFilter = chip.dataset.filter;
  renderFilterChips();
  renderExerciseBoard();
});

el.exerciseBoard.addEventListener("click", (event) => {
  const btn = event.target.closest(".exercise-tile");
  if (!btn) return;
  activeExerciseId = btn.dataset.exercise;
  renderExerciseBoard();
  renderActivePanel();
  document.getElementById("active-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

el.dialMinus.addEventListener("click", () => changeCount(-1));

el.dailyBoard.addEventListener("click", (event) => {
  const quest = event.target.closest(".daily-quest[data-exercise]");
  if (!quest) return;
  activeExerciseId = quest.dataset.exercise;
  renderExerciseBoard();
  renderActivePanel();
  switchTab("play");
});

// ---------------------------------------------------------------------------
// Adventure mode: a guided quest chain with rest breaks and a finale.
// ---------------------------------------------------------------------------

const adventure = {
  active: false,
  name: "",
  moves: [],
  index: 0,
  count: 0,
  xpEarned: 0,
  mascot: null,
  restTimer: null,
};

function renderAdventurePresets() {
  el.adventurePresets.innerHTML = ADVENTURES.map((a) => {
    const moves = a.moves
      ? a.moves.map((id) => findExercise(id).icon).join(" ")
      : "❓ ❓ ❓";
    return `
      <button type="button" class="adventure-preset" data-adventure="${a.id}">
        <span class="adventure-preset-emoji" aria-hidden="true">${a.emoji}</span>
        <span class="adventure-preset-name">${a.name}</span>
        <span class="adventure-preset-moves">${moves}</span>
      </button>
    `;
  }).join("");
}

function randomMoves(count) {
  const pool = EXERCISES.map((ex) => ex.id);
  const picked = [];
  while (picked.length < count && pool.length) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked;
}

function adventureProgressDots() {
  return `<div class="adventure-dots">${adventure.moves.map((id, i) => {
    const cls = i < adventure.index ? "done" : i === adventure.index ? "current" : "";
    return `<span class="adventure-dot ${cls}"></span>`;
  }).join("")}</div>`;
}

function stopAdventureExtras() {
  if (adventure.mascot) {
    adventure.mascot.stop();
    adventure.mascot = null;
  }
  if (adventure.restTimer) {
    clearInterval(adventure.restTimer);
    adventure.restTimer = null;
  }
}

function startAdventure(preset) {
  adventure.active = true;
  adventure.name = preset.name;
  adventure.moves = preset.moves ? preset.moves.slice() : randomMoves(3);
  adventure.index = 0;
  adventure.xpEarned = 0;
  el.adventureOverlay.hidden = false;
  document.body.classList.add("no-scroll");
  showAdventureMove();
}

function closeAdventure() {
  stopAdventureExtras();
  adventure.active = false;
  el.adventureOverlay.hidden = true;
  el.adventureOverlay.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

function adventureHeader() {
  return `
    <div class="adventure-header">
      <span class="adventure-title">${escapeHtml(adventure.name)}</span>
      ${adventureProgressDots()}
      <button type="button" class="btn btn-round adventure-close" data-action="close" aria-label="Leave adventure">✕</button>
    </div>
  `;
}

function showAdventureMove() {
  stopAdventureExtras();
  adventure.count = 0;
  const ex = findExercise(adventure.moves[adventure.index]);

  el.adventureOverlay.innerHTML = `
    <div class="adventure-card" role="dialog" aria-modal="true" aria-label="Adventure: ${escapeHtml(ex.title)}">
      ${adventureHeader()}
      <div class="adventure-stage">
        <div class="adventure-mascot" id="adventure-mascot" role="img"
             aria-label="Spark demonstrating the ${ex.title} movement"></div>
        <h3 class="adventure-move-title">${ex.icon} ${ex.title}</h3>
        <p class="adventure-cue">${ex.cue}</p>
        <div class="adventure-counter">
          <button type="button" class="btn btn-round" data-action="minus" aria-label="Remove one rep">−</button>
          <span class="adventure-count" aria-live="polite"><b id="adventure-count">0</b> / ${ex.target}</span>
          <button type="button" class="btn adventure-plus" data-action="plus" aria-label="Count one rep">+1</button>
        </div>
      </div>
    </div>
  `;

  adventure.mascot = createMascot(document.getElementById("adventure-mascot"), ex.id);
}

function adventureTap(delta) {
  const ex = findExercise(adventure.moves[adventure.index]);
  const next = Math.max(0, Math.min(ex.target, adventure.count + delta));
  if (next === adventure.count) return;
  adventure.count = next;
  if (delta > 0) {
    sound.tick();
    if (navigator.vibrate) navigator.vibrate(8);
  }
  const countEl = document.getElementById("adventure-count");
  if (countEl) countEl.textContent = String(adventure.count);

  if (adventure.count >= ex.target) {
    sound.chime();
    awardCompletion(ex, ex.target);
    adventure.xpEarned += ex.xp;
    adventure.index += 1;
    if (adventure.index >= adventure.moves.length) {
      showAdventureCelebration();
    } else {
      showAdventureRest();
    }
  }
}

function showAdventureRest() {
  stopAdventureExtras();
  let remaining = 15;

  el.adventureOverlay.innerHTML = `
    <div class="adventure-card" role="dialog" aria-modal="true" aria-label="Rest break">
      ${adventureHeader()}
      <div class="adventure-stage adventure-rest">
        <div class="adventure-rest-circle"><span id="rest-count">${remaining}</span></div>
        <h3 class="adventure-move-title">Shake it out! 🌬️</h3>
        <p class="adventure-cue">Wiggle, breathe, and get ready for the next move.</p>
        <button type="button" class="btn btn-primary" data-action="skip-rest">I'm ready!</button>
      </div>
    </div>
  `;

  adventure.restTimer = setInterval(() => {
    remaining -= 1;
    const node = document.getElementById("rest-count");
    if (node) node.textContent = String(remaining);
    if (remaining <= 0) {
      clearInterval(adventure.restTimer);
      adventure.restTimer = null;
      showAdventureMove();
    }
  }, 1000);
}

function showAdventureCelebration() {
  stopAdventureExtras();
  const combo = adventure.moves.length * 10;
  const st = activeProfile();
  st.xp += combo;
  const today = todayStr();
  if (!st.days[today]) st.days[today] = { xp: 0, reps: 0 };
  st.days[today].xp += combo;
  saveData();
  renderDashboard();
  renderBadges();
  renderWeekChart();

  el.adventureOverlay.innerHTML = `
    <div class="adventure-card" role="dialog" aria-modal="true" aria-label="Adventure complete">
      <div class="adventure-stage adventure-finale">
        <span class="adventure-trophy" aria-hidden="true">🏆</span>
        <h3 class="adventure-move-title">Quest complete!</h3>
        <p class="adventure-cue">
          ${adventure.moves.length} moves finished · ${adventure.xpEarned} XP earned
          <br /><strong>+${combo} combo bonus XP!</strong>
        </p>
        <button type="button" class="btn btn-primary" data-action="close">Amazing! Done</button>
      </div>
    </div>
  `;

  sound.fanfare();
  spawnConfetti(el.adventureOverlay.querySelector(".adventure-stage"), 22);
}

el.adventurePresets.addEventListener("click", (event) => {
  const btn = event.target.closest(".adventure-preset");
  if (!btn) return;
  const preset = ADVENTURES.find((a) => a.id === btn.dataset.adventure);
  if (preset) startAdventure(preset);
});

el.adventureOverlay.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "close") closeAdventure();
  else if (action === "plus") adventureTap(1);
  else if (action === "minus") adventureTap(-1);
  else if (action === "skip-rest") showAdventureMove();
});

// ---------------------------------------------------------------------------
// Move detail pop-up (opened from the Library)
// ---------------------------------------------------------------------------

let detailMascot = null;

function openMoveDetail(id) {
  const ex = findExercise(id);
  if (!ex) return;

  el.detailOverlay.innerHTML = `
    <div class="adventure-card" role="dialog" aria-modal="true" aria-label="How to do ${ex.title}">
      <div class="adventure-header">
        <span class="adventure-title">${ex.icon} ${ex.title}</span>
        <button type="button" class="btn btn-round adventure-close" data-action="close" aria-label="Close">✕</button>
      </div>
      <div class="adventure-stage">
        <div class="adventure-mascot" id="detail-mascot" role="img"
             aria-label="Spark demonstrating the ${ex.title} movement"></div>
        <p class="detail-meta">${ex.target} reps · ${ex.xp} XP · ${ex.muscles}</p>
        <p class="adventure-cue">${ex.cue}</p>
        <ul class="quest-steps detail-steps">
          ${ex.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ul>
        <button type="button" class="btn btn-primary detail-try" data-action="try" data-exercise="${ex.id}">
          Try it now! 🎯
        </button>
      </div>
    </div>
  `;
  el.detailOverlay.hidden = false;
  document.body.classList.add("no-scroll");
  detailMascot = createMascot(document.getElementById("detail-mascot"), ex.id);
  el.detailOverlay.querySelector(".adventure-close").focus();
}

function closeMoveDetail() {
  if (detailMascot) {
    detailMascot.stop();
    detailMascot = null;
  }
  el.detailOverlay.hidden = true;
  el.detailOverlay.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

el.moveLibrary.addEventListener("click", (event) => {
  const card = event.target.closest(".library-card[data-exercise]");
  if (card) openMoveDetail(card.dataset.exercise);
});

el.detailOverlay.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  if (btn.dataset.action === "close") {
    closeMoveDetail();
  } else if (btn.dataset.action === "try") {
    activeExerciseId = btn.dataset.exercise;
    closeMoveDetail();
    renderExerciseBoard();
    renderActivePanel();
    switchTab("play");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (adventure.active) closeAdventure();
  if (!el.detailOverlay.hidden) closeMoveDetail();
});

el.muteBtn.addEventListener("click", () => {
  const muted = sound.toggleMuted();
  el.muteBtn.textContent = muted ? "🔇" : "🔊";
  el.muteBtn.setAttribute("aria-pressed", String(muted));
  el.muteBtn.setAttribute("aria-label", muted ? "Turn sounds on" : "Turn sounds off");
});

// Shared completion pipeline used by both the main Claim button and
// Adventure mode: XP, streak, log, lifetime stats, daily quests, day history.
function awardCompletion(exercise, reps) {
  const st = activeProfile();
  const today = todayStr();
  const badgesBefore = earnedBadgeIds(st);

  st.xp += exercise.xp;
  st.reps += reps;

  st.completed.unshift({
    id: exercise.id,
    title: exercise.title,
    icon: exercise.icon,
    date: today,
    xp: exercise.xp,
    reps,
  });
  st.completed = st.completed.slice(0, HISTORY_LIMIT);

  if (st.lastCompletedDate === today) {
    // already logged a completion today — streak unchanged
  } else if (wasYesterday(st.lastCompletedDate, today)) {
    st.streak += 1;
  } else {
    st.streak = 1;
  }
  st.lastCompletedDate = today;

  // Lifetime stats for badges
  if (!st.stats.tried.includes(exercise.id)) st.stats.tried.push(exercise.id);
  st.stats.groups[exercise.group] = (st.stats.groups[exercise.group] || 0) + 1;
  if (st.stats.todayDate === today) {
    st.stats.todayCount += 1;
  } else {
    st.stats.todayDate = today;
    st.stats.todayCount = 1;
  }
  st.stats.bestDay = Math.max(st.stats.bestDay, st.stats.todayCount);
  st.stats.bestStreak = Math.max(st.stats.bestStreak, st.streak);

  // Per-day history for the weekly chart
  if (!st.days[today]) st.days[today] = { xp: 0, reps: 0 };
  st.days[today].xp += exercise.xp;
  st.days[today].reps += reps;
  pruneDays(st);

  // Daily quests
  ensureDailyFresh(st);
  const quests = dailyQuestIds(today);
  let dailyBonusEarned = false;
  if (quests.includes(exercise.id) && !st.daily.done.includes(exercise.id)) {
    st.daily.done.push(exercise.id);
    if (st.daily.done.length >= quests.length && !st.daily.bonusClaimed) {
      st.daily.bonusClaimed = true;
      st.xp += DAILY_BONUS_XP;
      st.days[today].xp += DAILY_BONUS_XP;
      dailyBonusEarned = true;
    }
  }

  saveData();

  if (dailyBonusEarned) setTimeout(() => sound.badge(), 600);
  const badgesAfter = earnedBadgeIds(st);
  if (badgesAfter.length > badgesBefore.length) {
    setTimeout(() => sound.badge(), 450);
  }

  renderDashboard();
  renderBadges();
  renderQuestLog();
  renderDaily();
  renderWeekChart();
  return dailyBonusEarned;
}

el.claimBtn.addEventListener("click", () => {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const st = activeProfile();
  const current = st.counters[exercise.id] || 0;
  if (current < exercise.target) return;

  awardCompletion(exercise, current);
  st.counters[exercise.id] = 0;
  saveData();

  sound.fanfare();
  spawnConfetti();
  renderClicker();
});

el.resetBtn.addEventListener("click", () => {
  const name = activeProfile().profile.nickname;
  const confirmed = window.confirm(
    `Reset all progress for "${name}" on this device? This clears their XP, streak, badges, and quest history (their name and avatar are kept).`
  );
  if (!confirmed) return;

  const kept = { ...activeProfile().profile };
  data.profiles[data.activeProfileId] = defaultProfileState();
  data.profiles[data.activeProfileId].profile = kept;
  profileDraft = { ...kept };
  activeExerciseId = EXERCISES[0].id;
  saveData();
  renderAll();
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

buildRingNotches();
el.muteBtn.textContent = sound.isMuted() ? "🔇" : "🔊";
el.muteBtn.setAttribute("aria-pressed", String(sound.isMuted()));
setSwitcherOpen(false); // drawer starts tucked away — the summary shows who's playing
setCustomizeOpen(false);
renderDailyFact();
renderAdventurePresets();
renderAll();
renderMoveLibrary();

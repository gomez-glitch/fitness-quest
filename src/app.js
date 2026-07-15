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
    stats: { tried: [], groups: {}, todayDate: null, todayCount: 0, bestDay: 0 },
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

function spawnConfetti() {
  if (REDUCED_MOTION) return;
  const colors = ["#7c3aed", "#ec4899", "#fde68a", "#a78bfa", "#f9a8d4"];
  for (let i = 0; i < 14; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 220}px`);
    piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 540}deg`);
    piece.style.setProperty("--clr", colors[i % colors.length]);
    piece.style.setProperty("--delay", `${Math.random() * 0.12}s`);
    el.dialArea.appendChild(piece);
    setTimeout(() => piece.remove(), 1300);
  }
}

// ---------------------------------------------------------------------------
// Library, badges, quest log
// ---------------------------------------------------------------------------

function renderMoveLibrary() {
  el.moveLibrary.innerHTML = EXERCISES.map((ex) => `
    <div class="library-card">
      <div class="library-illustration" role="img" aria-label="Spark demonstrating the ${ex.title} movement" data-exercise="${ex.id}"></div>
      <p class="library-card-title">${ex.icon} ${ex.title}</p>
      <p class="library-card-meta">${ex.target} reps · ${ex.muscles}</p>
    </div>
  `).join("");
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
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

el.startMovingBtn.addEventListener("click", () => {
  el.exerciseBoard.closest("section").scrollIntoView({ behavior: "smooth", block: "start" });
});

el.customizeHeroBtn.addEventListener("click", () => {
  document.getElementById("profile-section").scrollIntoView({ behavior: "smooth", block: "start" });
  el.nicknameInput.focus();
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
    document.getElementById("profile-section").scrollIntoView({ behavior: "smooth", block: "start" });
    el.nicknameInput.focus();
    return;
  }

  const chip = event.target.closest(".profile-chip[data-profile]");
  if (!chip || chip.dataset.profile === data.activeProfileId) return;
  data.activeProfileId = chip.dataset.profile;
  profileDraft = { ...activeProfile().profile };
  saveData();
  renderAll();
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

el.muteBtn.addEventListener("click", () => {
  const muted = sound.toggleMuted();
  el.muteBtn.textContent = muted ? "🔇" : "🔊";
  el.muteBtn.setAttribute("aria-pressed", String(muted));
  el.muteBtn.setAttribute("aria-label", muted ? "Turn sounds on" : "Turn sounds off");
});

el.claimBtn.addEventListener("click", () => {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const st = activeProfile();
  const current = st.counters[exercise.id] || 0;
  if (current < exercise.target) return;

  const today = todayStr();
  const badgesBefore = earnedBadgeIds(st);

  st.xp += exercise.xp;
  st.reps += current;

  st.completed.unshift({
    id: exercise.id,
    title: exercise.title,
    icon: exercise.icon,
    date: today,
    xp: exercise.xp,
    reps: current,
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

  st.counters[exercise.id] = 0;

  saveData();
  sound.fanfare();
  spawnConfetti();

  const badgesAfter = earnedBadgeIds(st);
  if (badgesAfter.length > badgesBefore.length) {
    setTimeout(() => sound.badge(), 450);
  }

  renderDashboard();
  renderClicker();
  renderBadges();
  renderQuestLog();
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
renderAll();
renderMoveLibrary();

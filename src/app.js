// Move Quest — app logic (vanilla JS, no dependencies)

const STORAGE_KEY = "move-quest-progress-v2";
const HISTORY_LIMIT = 12;
const XP_PER_LEVEL = 150;

const PERSONAS = [
  { id: "spark-sprinter", name: "Spark Sprinter", boost: "Fast feet and brave starts" },
  { id: "core-captain", name: "Core Captain", boost: "Strong middle and steady balance" },
  { id: "power-pixie", name: "Power Pixie", boost: "Tiny weights, mighty effort" },
  { id: "rainbow-ranger", name: "Rainbow Ranger", boost: "Cheerful streak builder" },
];

const AVATARS = ["👟", "🦄", "🐯", "🦊", "🐼", "🛼", "🌟", "🚀"];

const EXERCISES = [
  {
    id: "sit-ups", title: "Sit Ups", target: 5, xp: 35, icon: "🧘", image: "core",
    muscles: "Core", cue: "Cross arms, curl up slowly, and lower with control.",
    steps: ["Feet planted", "Belly button gently tucked", "Exhale as you sit up"],
  },
  {
    id: "push-ups", title: "Push Ups", target: 3, xp: 35, icon: "💪", image: "plank",
    muscles: "Chest + arms", cue: "Keep a straight body line. Knees-down push ups count too.",
    steps: ["Hands under shoulders", "Lower like an elevator", "Press the floor away"],
  },
  {
    id: "side-lunges", title: "Side Lunges", target: 8, xp: 50, icon: "↔️", image: "lunge",
    muscles: "Legs", cue: "Step wide, bend one knee, and keep the other leg long.",
    steps: ["Toes point forward", "Hips move back", "Switch sides each rep"],
  },
  {
    id: "flutter-kicks", title: "Flutter Kicks", target: 10, xp: 55, icon: "🏊", image: "flutter",
    muscles: "Lower core", cue: "Small quick kicks while your back stays comfortable.",
    steps: ["Hands under hips", "Tiny alternating kicks", "Rest if your back arches"],
  },
  {
    id: "chair-dips", title: "Chair Dips", target: 5, xp: 45, icon: "🪑", image: "dip",
    muscles: "Triceps", cue: "Use a sturdy chair and bend elbows straight back.",
    steps: ["Chair against a wall", "Shoulders relaxed", "Move slowly"],
  },
  {
    id: "oblique-raises", title: "Oblique Raises", target: 8, xp: 45, icon: "🌙", image: "sidebend",
    muscles: "Side core", cue: "Reach tall, then lift through one side of your waist.",
    steps: ["Stand proud", "Slide hand toward knee", "Switch sides"],
  },
  {
    id: "russian-twists", title: "Russian Twists", target: 10, xp: 60, icon: "🔄", image: "twist",
    muscles: "Core rotation", cue: "Sit tall and rotate side to side with gentle control.",
    steps: ["Heels can stay down", "Chest stays lifted", "Tap both sides"],
  },
  {
    id: "weight-curls", title: "Light Weight Curls", target: 8, xp: 50, icon: "🏋️", image: "curl",
    muscles: "Biceps", cue: "Use small weights or water bottles and move smoothly.",
    steps: ["Elbows near ribs", "Curl to shoulders", "Lower for two counts"],
  },
  {
    id: "overhead-press", title: "Mini Overhead Press", target: 6, xp: 50, icon: "🙆", image: "press",
    muscles: "Shoulders", cue: "Press light weights upward without shrugging.",
    steps: ["Soft knees", "Start at shoulders", "Press and return"],
  },
];

const BADGES = [
  { xp: 35, label: "First Move", emoji: "✨" },
  { xp: 160, label: "Rep Rookie", emoji: "🔢" },
  { xp: 320, label: "Core Hero", emoji: "💜" },
  { xp: 520, label: "Quest Champion", emoji: "🏆" },
];

function defaultState() {
  const counters = {};
  EXERCISES.forEach((ex) => { counters[ex.id] = 0; });
  return {
    xp: 0,
    streak: 0,
    reps: 0,
    completed: [],
    lastCompletedDate: null,
    counters,
    profile: { nickname: "Spark", persona: "spark-sprinter", avatar: "👟" },
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

function normalizeState(parsed) {
  const base = defaultState();
  if (!parsed || typeof parsed !== "object") return base;

  const state = defaultState();

  state.xp = typeof parsed.xp === "number" && parsed.xp >= 0 ? parsed.xp : base.xp;
  state.streak = typeof parsed.streak === "number" && parsed.streak >= 0 ? parsed.streak : base.streak;
  state.reps = typeof parsed.reps === "number" && parsed.reps >= 0 ? parsed.reps : base.reps;
  state.lastCompletedDate = typeof parsed.lastCompletedDate === "string" ? parsed.lastCompletedDate : null;

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
    if (PERSONAS.some((persona) => persona.id === p.persona)) {
      state.profile.persona = p.persona;
    }
    if (AVATARS.includes(p.avatar)) {
      state.profile.avatar = p.avatar;
    }
  }

  return state;
}

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return defaultState();
  }
  if (!raw) return defaultState();
  try {
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

let state = loadState();
let activeExerciseId = EXERCISES[0].id;
let profileDraft = { ...state.profile };

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const el = {
  heroAvatar: document.getElementById("hero-avatar"),
  startMovingBtn: document.getElementById("start-moving-btn"),
  customizeHeroBtn: document.getElementById("customize-hero-btn"),

  profileForm: document.getElementById("profile-form"),
  nicknameInput: document.getElementById("nickname-input"),
  personaSelect: document.getElementById("persona-select"),
  personaBoost: document.getElementById("persona-boost"),
  avatarGrid: document.getElementById("avatar-grid"),

  statLevel: document.getElementById("stat-level"),
  statXp: document.getElementById("stat-xp"),
  statStreak: document.getElementById("stat-streak"),
  statReps: document.getElementById("stat-reps"),
  levelProgressFill: document.getElementById("level-progress-fill"),
  levelProgressLabel: document.getElementById("level-progress-label"),

  exerciseBoard: document.getElementById("exercise-board"),

  activeHeadingText: document.getElementById("active-heading-text"),
  activeIllustration: document.getElementById("active-illustration"),
  activeCue: document.getElementById("active-cue"),
  activeSteps: document.getElementById("active-steps"),
  dial: document.getElementById("rep-dial"),
  dialCount: document.getElementById("dial-count"),
  dialTarget: document.getElementById("dial-target"),
  dialMinus: document.getElementById("dial-minus"),
  dialPlus: document.getElementById("dial-plus"),
  claimBtn: document.getElementById("claim-xp-btn"),

  moveLibrary: document.getElementById("move-library"),
  badgeCase: document.getElementById("badge-case"),

  questLog: document.getElementById("quest-log"),
  questLogEmpty: document.getElementById("quest-log-empty"),

  resetBtn: document.getElementById("reset-btn"),
};

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------

function illustrationHtml(exercise) {
  return `
    <div class="illu-figure illu-${exercise.image}">
      <div class="illu-head"></div>
      <div class="illu-body"></div>
      <div class="illu-arm left"></div>
      <div class="illu-arm right"></div>
      <div class="illu-leg left"></div>
      <div class="illu-leg right"></div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderHero() {
  el.heroAvatar.textContent = state.profile.avatar;
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
  const level = levelForXp(state.xp);
  const xpIntoLevel = state.xp % XP_PER_LEVEL;
  const pct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

  el.statLevel.textContent = String(level);
  el.statXp.textContent = String(state.xp);
  el.statStreak.textContent = `${state.streak} 🔥`;
  el.statReps.textContent = String(state.reps);

  el.levelProgressFill.style.width = `${pct}%`;
  el.levelProgressLabel.textContent = `${xpIntoLevel} / ${XP_PER_LEVEL} XP to next level`;
}

function renderExerciseBoard() {
  el.exerciseBoard.innerHTML = EXERCISES.map((ex) => {
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

function renderActivePanel() {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;

  el.activeHeadingText.textContent = `${state.profile.nickname}'s move: ${exercise.title}`;
  el.activeIllustration.innerHTML = illustrationHtml(exercise);
  el.activeIllustration.setAttribute(
    "aria-label",
    `Illustration showing the ${exercise.title} movement`
  );
  el.activeCue.textContent = exercise.cue;
  el.activeSteps.innerHTML = exercise.steps.map((step) => `<li>${step}</li>`).join("");

  renderDial();
}

function renderDial() {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const count = state.counters[exercise.id] || 0;
  const pct = exercise.target > 0 ? Math.round((count / exercise.target) * 100) : 0;

  el.dial.style.setProperty("--pct", String(pct));
  el.dialCount.textContent = String(count);
  el.dialTarget.textContent = String(exercise.target);
  el.claimBtn.disabled = count < exercise.target;
}

function renderMoveLibrary() {
  el.moveLibrary.innerHTML = EXERCISES.map((ex) => `
    <div class="library-card">
      <div class="library-illustration" role="img" aria-label="Illustration showing the ${ex.title} movement">
        ${illustrationHtml(ex)}
      </div>
      <p class="library-card-title">${ex.icon} ${ex.title}</p>
      <p class="library-card-meta">${ex.target} reps · ${ex.muscles}</p>
    </div>
  `).join("");
}

function renderBadges() {
  el.badgeCase.innerHTML = BADGES.map((badge) => {
    const earned = state.xp >= badge.xp;
    return `
      <div class="badge ${earned ? "" : "locked"}">
        <span class="badge-emoji" aria-hidden="true">${badge.emoji}</span>
        <span>${badge.label}</span>
        <span class="badge-req">${earned ? "Unlocked!" : `Earn ${badge.xp} XP`}</span>
      </div>
    `;
  }).join("");
}

function renderQuestLog() {
  if (state.completed.length === 0) {
    el.questLog.innerHTML = `<li class="quest-log-empty" id="quest-log-empty">No quests completed yet — go earn some XP!</li>`;
    return;
  }
  el.questLog.innerHTML = state.completed.map((entry) => `
    <li class="quest-log-item">
      <span class="quest-log-icon" aria-hidden="true">${entry.icon}</span>
      <span class="quest-log-body">
        <span class="quest-log-title">${entry.title}</span>
        <span class="quest-log-meta">${entry.date} · +${entry.xp} XP · ${entry.reps} reps</span>
      </span>
    </li>
  `).join("");
}

function renderAll() {
  renderHero();
  renderProfileForm();
  renderDashboard();
  renderExerciseBoard();
  renderActivePanel();
  renderMoveLibrary();
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

  state.profile = { ...profileDraft };
  saveState(state);
  renderAll();
});

el.exerciseBoard.addEventListener("click", (event) => {
  const btn = event.target.closest(".exercise-tile");
  if (!btn) return;
  activeExerciseId = btn.dataset.exercise;
  renderExerciseBoard();
  renderActivePanel();
  document.getElementById("active-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

el.dialPlus.addEventListener("click", () => {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const current = state.counters[exercise.id] || 0;
  state.counters[exercise.id] = Math.min(exercise.target, current + 1);
  saveState(state);
  renderDial();
});

el.dialMinus.addEventListener("click", () => {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const current = state.counters[exercise.id] || 0;
  state.counters[exercise.id] = Math.max(0, current - 1);
  saveState(state);
  renderDial();
});

el.claimBtn.addEventListener("click", () => {
  const exercise = findExercise(activeExerciseId);
  if (!exercise) return;
  const current = state.counters[exercise.id] || 0;
  if (current < exercise.target) return;

  const today = todayStr();

  state.xp += exercise.xp;
  state.reps += current;

  state.completed.unshift({
    id: exercise.id,
    title: exercise.title,
    icon: exercise.icon,
    date: today,
    xp: exercise.xp,
    reps: current,
  });
  state.completed = state.completed.slice(0, HISTORY_LIMIT);

  if (state.lastCompletedDate === today) {
    // already logged a completion today — streak unchanged
  } else if (wasYesterday(state.lastCompletedDate, today)) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }
  state.lastCompletedDate = today;

  state.counters[exercise.id] = 0;

  saveState(state);
  renderDashboard();
  renderDial();
  renderBadges();
  renderQuestLog();
});

el.resetBtn.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset all Move Quest progress on this device? This clears XP, streaks, badges, and quest history."
  );
  if (!confirmed) return;

  state = defaultState();
  profileDraft = { ...state.profile };
  activeExerciseId = EXERCISES[0].id;
  saveState(state);
  renderAll();
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

renderAll();

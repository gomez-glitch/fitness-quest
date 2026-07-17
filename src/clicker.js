// Move Quest — reusable rotating clicker dial.
//
// One component drives both the Play panel and Adventure mode:
//  - rep exercises: tap = +1, spin the ring to ratchet up/down, keyboard arrows
//  - timed holds: tap GO -> 3-2-1 get-ready lead-in -> automatic countdown
//    with ticks, urgent beeps for the last seconds, and a finish jingle.

import { sound } from "./sound.js";
import { voice } from "./voice.js";

const RING_RADIUS = 86;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;
const DEG_PER_REP = 22.5;
const SPIN_STEP_DEG = 24;
const NOTCHES = 16;

const REDUCED_MOTION =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createClicker(container, { onChange = () => {}, onComplete = () => {} } = {}) {
  let target = 1;
  let timed = false;
  let calm = false; // stretch holds: breathing cues instead of ticking
  let count = 0;
  let phase = "idle"; // idle | ready | counting (timed only)
  let readyLeft = 0;
  let remaining = 0;
  let intervalId = null;
  let spinOffset = 0;
  let completeFired = false;

  let ticks = "";
  for (let i = 0; i < NOTCHES; i++) {
    const a = (i * 360) / NOTCHES;
    const major = i % 4 === 0;
    ticks += `<line x1="100" y1="${major ? 18 : 22}" x2="100" y2="30" transform="rotate(${a} 100 100)" />`;
  }

  container.innerHTML = `
    <div class="clicker" role="spinbutton" tabindex="0" aria-valuemin="0" aria-valuenow="0"
         aria-label="Rep counter — tap the dial or spin it to count reps">
      <svg class="clicker-svg" viewBox="0 0 200 200" aria-hidden="true">
        <circle class="clicker-track" cx="100" cy="100" r="${RING_RADIUS}" />
        <circle class="clicker-progress" cx="100" cy="100" r="${RING_RADIUS}" />
        <g class="clicker-ring">${ticks}</g>
      </svg>
      <div class="clicker-center">
        <span class="dial-count" aria-live="polite">0</span>
        <span class="dial-target">/ <span class="dial-target-val">0</span></span>
        <span class="clicker-hint">tap or spin</span>
      </div>
    </div>
  `;

  const root = container.querySelector(".clicker");
  const ring = container.querySelector(".clicker-ring");
  const progress = container.querySelector(".clicker-progress");
  const countEl = container.querySelector(".dial-count");
  const targetEl = container.querySelector(".dial-target-val");
  const hintEl = container.querySelector(".clicker-hint");

  function done() {
    return count >= target;
  }

  function emit() {
    onChange({ count, target, timed, phase, remaining, done: done() });
    if (done() && !completeFired) {
      completeFired = true;
      onComplete(target);
    }
  }

  function render() {
    const isDone = done();
    const pct = timed
      ? (isDone ? 1 : remaining > 0 && phase === "counting" ? (target - remaining) / target : 0)
      : Math.min(1, target > 0 ? count / target : 0);

    if (timed) {
      if (isDone) {
        countEl.textContent = "✓";
        hintEl.textContent = "amazing hold!";
      } else if (phase === "ready") {
        countEl.textContent = String(readyLeft);
        hintEl.textContent = "get ready…";
      } else if (phase === "counting") {
        countEl.textContent = String(remaining);
        hintEl.textContent = "hold on!";
      } else {
        countEl.textContent = remaining > 0 ? String(remaining) : "GO";
        hintEl.textContent = remaining > 0 ? "tap to keep going" : "tap to start";
      }
      targetEl.textContent = `${target}s`;
      root.setAttribute("aria-valuenow", String(isDone ? target : target - (remaining || target)));
      if (!REDUCED_MOTION && (phase === "ready" || phase === "counting")) {
        countEl.classList.remove("count-pop");
        void countEl.offsetWidth;
        countEl.classList.add("count-pop");
      }
      countEl.classList.toggle("count-urgent", phase === "counting" && remaining <= 3);
    } else {
      countEl.textContent = String(count);
      targetEl.textContent = String(target);
      hintEl.textContent = "tap or spin";
      root.setAttribute("aria-valuenow", String(count));
      countEl.classList.remove("count-pop", "count-urgent");
    }
    root.setAttribute("aria-valuemax", String(target));
    root.classList.toggle("clicker-full", isDone);
    root.classList.toggle("timed-mode", timed);

    progress.style.strokeDasharray = String(RING_CIRC);
    progress.style.strokeDashoffset = String(RING_CIRC * (1 - pct));
    ring.setAttribute("transform", `rotate(${count * DEG_PER_REP + spinOffset} 100 100)`);
  }

  function bump() {
    if (REDUCED_MOTION) return;
    root.classList.remove("clicker-bump");
    void root.offsetWidth;
    root.classList.add("clicker-bump");
  }

  function changeBy(delta) {
    if (timed) return;
    const next = Math.max(0, Math.min(target, count + delta));
    if (next === count) return;
    count = next;
    if (delta > 0) {
      sound.tick();
      if (navigator.vibrate) navigator.vibrate(8);
      bump();
      if (count === target) {
        sound.chime();
        voice.repsDone();
      } else if (count === Math.ceil(target / 2) && target >= 8) {
        voice.halfway();
      }
    }
    render();
    emit();
  }

  function pauseTimer() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    phase = "idle"; // banked `remaining` seconds survive a pause
  }

  function toggleTimer() {
    if (!timed) return;
    if (phase !== "idle") {
      pauseTimer();
      render();
      emit();
      return;
    }
    if (done()) return;

    phase = "ready";
    readyLeft = 3;
    sound.beep();
    voice.ready();
    intervalId = setInterval(() => {
      if (phase === "ready") {
        readyLeft -= 1;
        if (readyLeft > 0) {
          sound.beep();
          voice.count(readyLeft);
        } else {
          phase = "counting";
          if (remaining <= 0) remaining = target;
          sound.chime();
          voice.go();
        }
      } else if (phase === "counting") {
        remaining -= 1;
        if (calm) {
          // Stretch holds: no ticking — gentle alternating breath cues.
          const elapsed = target - remaining;
          if (remaining > 2 && elapsed % 4 === 1) {
            if (Math.floor(elapsed / 4) % 2 === 0) voice.breatheIn();
            else voice.breatheOut();
          }
          if (remaining > 0 && remaining <= 3 && voice.active()) voice.count(remaining);
        } else {
          // Voice takes over the countdown for the last five seconds;
          // the beeps stay as a fallback when the coach is muted/unavailable.
          if (remaining > 0 && remaining <= 5 && voice.active()) {
            voice.count(remaining);
          } else if (remaining > 3) {
            sound.tick();
          } else if (remaining > 0) {
            sound.beep();
          }
          if (remaining === Math.ceil(target / 2) && remaining > 5) voice.halfway();
        }
        if (remaining <= 0) {
          pauseTimer();
          remaining = 0;
          count = target;
          if (calm) {
            sound.chime();
            voice.stretchDone();
          } else {
            sound.badge(); // triumphant finish jingle
            voice.holdDone();
          }
        }
      }
      render();
      emit();
    }, 1000);
    render();
    emit();
  }

  // --- pointer: tap (and spin, for rep exercises) ---
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let lastAngle = 0;
  let accumulated = 0;
  let moved = false;

  function pointerAngle(event) {
    const rect = root.getBoundingClientRect();
    return (Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
  }

  root.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
    lastAngle = pointerAngle(event);
    accumulated = 0;
    root.setPointerCapture(event.pointerId);
  });

  root.addEventListener("pointermove", (event) => {
    if (!dragging || timed) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) moved = true;
    if (!moved) return;

    let delta = pointerAngle(event) - lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle = pointerAngle(event);
    accumulated += delta;
    spinOffset = accumulated % SPIN_STEP_DEG;

    while (accumulated >= SPIN_STEP_DEG) {
      accumulated -= SPIN_STEP_DEG;
      changeBy(1);
    }
    while (accumulated <= -SPIN_STEP_DEG) {
      accumulated += SPIN_STEP_DEG;
      changeBy(-1);
    }
    render();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    spinOffset = 0;
    const quick = performance.now() - startTime < 400;
    if (!moved && timed) toggleTimer(); // any press length counts as GO
    else if (!moved && quick) changeBy(1);
    render();
  }

  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);

  root.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowRight", " ", "Enter"].includes(event.key)) {
      event.preventDefault();
      if (timed) toggleTimer();
      else changeBy(1);
    } else if (["ArrowDown", "ArrowLeft"].includes(event.key)) {
      event.preventDefault();
      if (!timed) changeBy(-1);
    }
  });

  return {
    root,
    configure(opts) {
      pauseTimer();
      target = Math.max(1, opts.target);
      timed = Boolean(opts.timed);
      calm = Boolean(opts.calm);
      count = Math.max(0, Math.min(target, opts.count || 0));
      readyLeft = 0;
      remaining = 0;
      spinOffset = 0;
      completeFired = count >= target;
      render();
    },
    changeBy,
    pauseTimer() {
      pauseTimer();
      render();
    },
    getCount: () => count,
    isDone: done,
  };
}

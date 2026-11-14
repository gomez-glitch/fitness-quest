// Move Quest — keep the screen awake while a child is mid-exercise.
//
// A 30-second plank, a 45-second dance or a whole adventure has long
// stretches with no taps, and phones (and some iPad settings) dim or lock the
// screen in the middle of the countdown. Several features can want the screen
// awake at once, so each asks with a reason; the lock is held while any reason
// is active. Browsers drop the lock whenever the page is hidden, so it is
// re-requested on return. Where the Screen Wake Lock API is missing, or a
// request is refused (battery saver, say), the screen simply behaves as normal.

const reasons = new Set();
let sentinel = null;
let pending = false;

function supported() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

async function acquire() {
  if (!supported() || sentinel || pending) return;
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  pending = true;
  try {
    const lock = await navigator.wakeLock.request("screen");
    pending = false;
    if (!reasons.size) {
      // Everything was released while the request was in flight.
      lock.release().catch(() => {});
      return;
    }
    sentinel = lock;
    lock.addEventListener("release", () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch (err) {
    pending = false; // refused — carry on without it
  }
}

function drop() {
  if (!sentinel) return;
  const lock = sentinel;
  sentinel = null;
  lock.release().catch(() => {});
}

export const wake = {
  hold(reason) {
    reasons.add(reason);
    acquire();
  },
  release(reason) {
    reasons.delete(reason);
    if (!reasons.size) drop();
  },
  isHeld() {
    return sentinel !== null;
  },
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && reasons.size) acquire();
  });
}

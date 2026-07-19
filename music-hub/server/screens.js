// Video screens — any device with a browser (smart TV, streaming stick, a
// mini PC behind the telly) opens /screen, registers with a name, and polls
// for commands. The iPad then pushes muted music videos to it while Sonos
// carries the audio.

const crypto = require("crypto");

const ACTIVE_MS = 15 * 1000; // considered gone after 15s without a poll

class ScreenRegistry {
  constructor() {
    this.screens = new Map(); // id -> { id, name, lastSeen, pending: [] }
  }

  register(name) {
    const clean = String(name || "").trim().slice(0, 40) || `Screen ${this.screens.size + 1}`;
    // Re-registering the same name replaces the old entry (TV reloaded).
    for (const [id, s] of this.screens) {
      if (s.name.toLowerCase() === clean.toLowerCase()) this.screens.delete(id);
    }
    const id = `scr-${crypto.randomBytes(6).toString("hex")}`;
    this.screens.set(id, { id, name: clean, lastSeen: Date.now(), pending: [] });
    return { id, name: clean };
  }

  poll(id) {
    const s = this.screens.get(id);
    if (!s) throw new Error("Unknown screen — register again");
    s.lastSeen = Date.now();
    const commands = s.pending;
    s.pending = [];
    return { commands };
  }

  list() {
    const now = Date.now();
    return [...this.screens.values()]
      .filter((s) => now - s.lastSeen < ACTIVE_MS)
      .map((s) => ({ id: s.id, name: s.name }));
  }

  send(id, command) {
    const s = this.screens.get(id);
    if (!s) throw new Error("Screen not connected");
    if (Date.now() - s.lastSeen >= ACTIVE_MS) throw new Error("Screen not connected");
    s.pending.push(command);
  }
}

module.exports = { ScreenRegistry };

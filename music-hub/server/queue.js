// Server-side play queue, one per Sonos group. Sonos itself only ever holds
// the current track (a single x-sonos-spotify URI); the hub owns the queue,
// watches playback position, and advances automatically — including endless
// autoplay: when the queue runs out it keeps picking tracks from the context
// the music started from (the playlist, search results, or shuffle pool).

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class QueueManager {
  // backend must provide: playTrack(groupId, track) and state(groupId)
  // (state returns { playing, positionSec, durationSec, ... }).
  constructor(backend) {
    this.backend = backend;
    this.queues = new Map(); // groupId -> queue
  }

  queue(groupId) {
    return this.queues.get(groupId) || null;
  }

  ensure(groupId) {
    if (!this.queues.has(groupId)) {
      this.queues.set(groupId, {
        items: [],
        index: -1,
        context: [], // pool autoplay draws from
        autoplay: true,
        shuffle: false,
        last: { playing: false, positionSec: 0 },
      });
    }
    return this.queues.get(groupId);
  }

  snapshot(groupId) {
    const q = this.queue(groupId);
    if (!q) {
      return { items: [], index: -1, autoplay: true, shuffle: false, current: null };
    }
    return {
      items: q.items.slice(0, 200),
      index: q.index,
      autoplay: q.autoplay,
      shuffle: q.shuffle,
      current: q.items[q.index] || null,
    };
  }

  // Start playing `tracks[index]` now; the rest of the list becomes the
  // queue and the full list becomes the autoplay context.
  async playNow(groupId, tracks, index = 0, opts = {}) {
    if (!tracks || !tracks.length) throw new Error("Empty track list");
    const q = this.ensure(groupId);
    q.context = tracks.slice();
    q.shuffle = Boolean(opts.shuffle);
    if (q.shuffle) {
      q.items = shuffled(tracks);
      q.index = 0;
    } else {
      q.items = tracks.slice();
      q.index = Math.max(0, Math.min(index, tracks.length - 1));
    }
    if (opts.autoplay != null) q.autoplay = Boolean(opts.autoplay);
    await this.playCurrent(groupId);
    return this.snapshot(groupId);
  }

  async add(groupId, track) {
    const q = this.ensure(groupId);
    if (q.index === -1 || !q.items.length) {
      return this.playNow(groupId, [track], 0);
    }
    q.items.push(track);
    if (!q.context.some((t) => t.uri === track.uri)) q.context.push(track);
    return this.snapshot(groupId);
  }

  // Move forward; refill from context when the queue is exhausted.
  async next(groupId) {
    const q = this.queue(groupId);
    if (!q || !q.items.length) throw new Error("Nothing queued");
    if (q.index + 1 < q.items.length) {
      q.index += 1;
    } else if (q.autoplay && q.context.length) {
      q.items.push(this.pickAutoplay(q));
      q.index += 1;
    } else {
      return this.snapshot(groupId); // end of the line
    }
    await this.playCurrent(groupId);
    return this.snapshot(groupId);
  }

  async prev(groupId) {
    const q = this.queue(groupId);
    if (!q || !q.items.length) throw new Error("Nothing queued");
    if (q.index > 0) q.index -= 1;
    await this.playCurrent(groupId);
    return this.snapshot(groupId);
  }

  async jump(groupId, index) {
    const q = this.queue(groupId);
    if (!q || index < 0 || index >= q.items.length) throw new Error("Bad queue index");
    q.index = index;
    await this.playCurrent(groupId);
    return this.snapshot(groupId);
  }

  clear(groupId) {
    this.queues.delete(groupId);
  }

  setOptions(groupId, opts) {
    const q = this.ensure(groupId);
    if (opts.autoplay != null) q.autoplay = Boolean(opts.autoplay);
    if (opts.shuffle != null) q.shuffle = Boolean(opts.shuffle);
    return this.snapshot(groupId);
  }

  // Random pick from the context, avoiding the most recent plays so autoplay
  // feels like radio, not a broken record.
  pickAutoplay(q) {
    const recent = new Set(
      q.items.slice(Math.max(0, q.items.length - 8)).map((t) => t.uri)
    );
    const fresh = q.context.filter((t) => !recent.has(t.uri));
    const pool = fresh.length ? fresh : q.context;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async playCurrent(groupId) {
    const q = this.queue(groupId);
    const track = q.items[q.index];
    await this.backend.playTrack(groupId, track);
    q.last = { playing: true, positionSec: 0 };
  }

  // Called on a short interval: watch each active queue's playback and
  // advance when the current track has finished.
  async tick() {
    for (const [groupId, q] of this.queues) {
      if (q.index === -1 || !q.items.length) continue;
      let st;
      try {
        st = await this.backend.state(groupId);
      } catch (_) {
        continue; // group vanished (regrouped); leave the queue alone
      }
      const ended =
        st.durationSec > 0 &&
        !st.playing &&
        q.last.playing &&
        q.last.positionSec >= st.durationSec - 6;
      q.last = { playing: st.playing, positionSec: st.positionSec };
      if (ended) {
        try {
          await this.next(groupId);
        } catch (_) {}
      }
    }
  }
}

module.exports = { QueueManager, shuffled };

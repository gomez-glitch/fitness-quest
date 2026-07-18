// Demo mode: an in-memory stand-in for both Spotify and Sonos with the same
// API surface the real backends expose. Lets the full UI (and the Playwright
// suite) run with zero configuration, no network, and no hardware.

const ART_COLORS = [
  ["#f97316", "#7c2d12"], ["#22d3ee", "#164e63"], ["#a78bfa", "#4c1d95"],
  ["#4ade80", "#14532d"], ["#f472b6", "#831843"], ["#facc15", "#713f12"],
  ["#60a5fa", "#1e3a8a"], ["#fb7185", "#881337"],
];

function art(i, label) {
  const [a, b] = ART_COLORS[i % ART_COLORS.length];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/>` +
    `</linearGradient></defs><rect width='300' height='300' fill='url(#g)'/>` +
    `<text x='150' y='168' font-family='sans-serif' font-size='120' ` +
    `text-anchor='middle' fill='rgba(255,255,255,.85)'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeTracks(playlistIdx, names) {
  return names.map(([name, artist, dur], i) => ({
    id: `demo-t-${playlistIdx}-${i}`,
    uri: `spotify:track:demo${playlistIdx}x${i}`,
    name,
    artist,
    album: `${artist} — Singles`,
    image: art(playlistIdx + i, "♪"),
    durationSec: dur,
  }));
}

const PLAYLISTS = [
  {
    id: "demo-p-hits", name: "Today's Top Hits", owner: "Spotify",
    description: "The hottest tracks right now.",
    tracks: makeTracks(0, [
      ["Neon Skyline", "The Marquee Lights", 214],
      ["Gravity Well", "Nova Reyes", 197],
      ["Paper Planes at Midnight", "Junes", 233],
      ["Slow Motion Gold", "Aria Vale", 208],
      ["Static Hearts", "The Copper Kids", 189],
      ["Fireproof", "Malin & The Echo", 221],
    ]),
  },
  {
    id: "demo-p-chill", name: "Chill Hits", owner: "Spotify",
    description: "Kick back to the best new and recent chill hits.",
    tracks: makeTracks(1, [
      ["Driftwood", "Low Tide Collective", 245],
      ["Amber Hour", "Sena", 231],
      ["Soft Focus", "Cloudberry", 204],
      ["Harbor Lights", "The Quiet Parade", 259],
      ["Sunday Slow", "Pale Blue", 218],
    ]),
  },
  {
    id: "demo-p-rock", name: "Rock Classics", owner: "Spotify",
    description: "Rock legends and epic songs.",
    tracks: makeTracks(2, [
      ["Thunder Road Revival", "Iron Meridian", 262],
      ["Kings of the Overpass", "The Vandellas", 248],
      ["Chrome & Smoke", "Redline Saints", 235],
      ["Last Train Anthem", "Hollow Crown", 271],
      ["Voltage", "The Night Watch", 226],
    ]),
  },
  {
    id: "demo-p-dance", name: "Dance Party", owner: "Spotify",
    description: "Non-stop bangers for the whole house.",
    tracks: makeTracks(3, [
      ["Mirrorball Run", "Disco Atlas", 201],
      ["4AM Confetti", "Klara Volt", 195],
      ["Bassline Bloom", "Metronome City", 212],
      ["Heat Index", "DJ Solstice", 188],
      ["Strobe Season", "Nightglass", 206],
    ]),
  },
  {
    id: "demo-p-dinner", name: "Dinner Jazz", owner: "You",
    description: "Warm standards for the kitchen at seven.",
    tracks: makeTracks(4, [
      ["Blue Hour Ballad", "The Verlaine Trio", 287],
      ["Brushes & Candlelight", "Etta Monroe", 254],
      ["Two for the Stairs", "Cal Whitfield", 243],
      ["Velvet Corner", "The Verlaine Trio", 266],
    ]),
  },
  {
    id: "demo-p-focus", name: "Deep Focus", owner: "You",
    description: "Instrumentals to keep you in the zone.",
    tracks: makeTracks(5, [
      ["Glass Rooms", "Meridian Fields", 312],
      ["Northern Line", "Ola Brandt", 289],
      ["Slow Architecture", "Tidesmith", 334],
      ["Winter Light Study", "Meridian Fields", 301],
    ]),
  },
  {
    id: "demo-p-road", name: "Road Trip Gold", owner: "You",
    description: "Windows down, volume up.",
    tracks: makeTracks(6, [
      ["Interstate Chorus", "The Golden Miles", 229],
      ["Gas Station Sunglasses", "Petra & The Vons", 217],
      ["Big Sky Radio", "Canyon Drive", 241],
      ["Odometer Hearts", "The Golden Miles", 224],
    ]),
  },
  {
    id: "demo-p-kids", name: "Kitchen Dance Break", owner: "You",
    description: "Family-approved bops for cooking chaos.",
    tracks: makeTracks(7, [
      ["Spaghetti Shuffle", "The Whisk Brigade", 176],
      ["Broccoli Bounce", "Miss Mango", 168],
      ["Pancake Parade", "The Whisk Brigade", 182],
    ]),
  },
];

const PLAYERS = [
  { id: "RINCON_DEMO_LIVING", name: "Living Room" },
  { id: "RINCON_DEMO_KITCHEN", name: "Kitchen" },
  { id: "RINCON_DEMO_DINING", name: "Dining Room" },
  { id: "RINCON_DEMO_OFFICE", name: "Office" },
  { id: "RINCON_DEMO_PATIO", name: "Patio" },
];

class DemoBackend {
  constructor() {
    // groupOf: playerId -> coordinatorId. Start with Living+Kitchen grouped.
    this.groupOf = new Map(PLAYERS.map((p) => [p.id, p.id]));
    this.groupOf.set("RINCON_DEMO_KITCHEN", "RINCON_DEMO_LIVING");
    this.volumes = new Map([
      ["RINCON_DEMO_LIVING", 34], ["RINCON_DEMO_KITCHEN", 28],
      ["RINCON_DEMO_DINING", 22], ["RINCON_DEMO_OFFICE", 18],
      ["RINCON_DEMO_PATIO", 45],
    ]);
    // coordinatorId -> { track, playing, startedAt, pausedAt }
    this.nowPlaying = new Map();
  }

  // ---- Spotify surface ----
  get spotifyStatus() {
    return { configured: true, authed: true, user: "Demo Household" };
  }

  shelves() {
    const byOwner = (o) =>
      PLAYLISTS.filter((p) => p.owner === o).map((p, i) => ({
        id: p.id, name: p.name, description: p.description,
        image: art(PLAYLISTS.indexOf(p), "♫"),
        tracks: p.tracks.length, owner: p.owner,
      }));
    return { mine: byOwner("You"), curated: byOwner("Spotify") };
  }

  playlistTracks(id) {
    const p = PLAYLISTS.find((pl) => pl.id === id);
    if (!p) throw new Error("Unknown playlist");
    return p.tracks;
  }

  searchTracks(q) {
    const needle = q.toLowerCase();
    return PLAYLISTS.flatMap((p) => p.tracks).filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.artist.toLowerCase().includes(needle)
    );
  }

  trackByUri(uri) {
    return PLAYLISTS.flatMap((p) => p.tracks).find((t) => t.uri === uri) || null;
  }

  // ---- Sonos surface ----
  zones() {
    const byCoord = new Map();
    for (const p of PLAYERS) {
      const c = this.groupOf.get(p.id);
      if (!byCoord.has(c)) byCoord.set(c, []);
      byCoord.get(c).push(p);
    }
    const groups = [];
    for (const [coordId, members] of byCoord) {
      const coord = PLAYERS.find((p) => p.id === coordId);
      const ordered = [coord, ...members.filter((m) => m.id !== coordId)];
      groups.push({
        id: `${coordId}:g`,
        coordinatorId: coordId,
        name:
          ordered.length > 1
            ? `${coord.name} + ${ordered.length - 1}`
            : coord.name,
        members: ordered.map((m) => ({ id: m.id, name: m.name, ip: "demo" })),
      });
    }
    return groups;
  }

  groupById(id) {
    return (
      this.zones().find((g) => g.id === id || g.coordinatorId === id) || null
    );
  }

  playSpotify(groupId, uri, title) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const track = this.trackByUri(uri) || {
      name: title || "Unknown", artist: "", album: "", durationSec: 200, uri,
    };
    this.nowPlaying.set(g.coordinatorId, {
      track,
      playing: true,
      startedAt: Date.now(),
      pausedPosition: 0,
    });
  }

  transport(groupId, action) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const np = this.nowPlaying.get(g.coordinatorId);
    if (!np) return;
    if (action === "Pause" && np.playing) {
      np.pausedPosition = this.position(np);
      np.playing = false;
    } else if (action === "Play" && !np.playing) {
      np.startedAt = Date.now() - np.pausedPosition * 1000;
      np.playing = true;
    } else if (action === "Next" || action === "Previous") {
      const all = PLAYLISTS.flatMap((p) => p.tracks);
      const idx = all.findIndex((t) => t.uri === np.track.uri);
      const step = action === "Next" ? 1 : all.length - 1;
      np.track = all[(idx + step + all.length) % all.length];
      np.startedAt = Date.now();
      np.pausedPosition = 0;
      np.playing = true;
    }
  }

  position(np) {
    const pos = np.playing
      ? (Date.now() - np.startedAt) / 1000
      : np.pausedPosition;
    return Math.min(pos, np.track.durationSec);
  }

  state(groupId) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const np = this.nowPlaying.get(g.coordinatorId);
    const volumes = {};
    for (const m of g.members) volumes[m.id] = this.volumes.get(m.id);
    if (!np) {
      return {
        groupId: g.id, playing: false, title: null, artist: null, album: null,
        positionSec: 0, durationSec: 0, volumes,
      };
    }
    return {
      groupId: g.id,
      playing: np.playing,
      title: np.track.name,
      artist: np.track.artist,
      album: np.track.album,
      positionSec: Math.round(this.position(np)),
      durationSec: np.track.durationSec,
      volumes,
    };
  }

  setVolume(playerId, volume) {
    if (!this.volumes.has(playerId)) throw new Error("Unknown player");
    this.volumes.set(playerId, Math.max(0, Math.min(100, Math.round(volume))));
  }

  setGroupVolume(groupId, volume) {
    const g = this.groupById(groupId);
    if (!g) throw new Error("Unknown group");
    const current = g.members.map((m) => this.volumes.get(m.id));
    const avg = current.reduce((a, b) => a + b, 0) / current.length || 1;
    const factor = avg ? volume / avg : 1;
    for (const m of g.members) {
      this.setVolume(m.id, Math.min(100, this.volumes.get(m.id) * factor));
    }
  }

  join(playerId, coordinatorId) {
    if (!this.groupOf.has(playerId) || !this.groupOf.has(coordinatorId)) {
      throw new Error("Unknown player");
    }
    // If the target is itself joined somewhere, follow to its coordinator.
    const target = this.groupOf.get(coordinatorId);
    // Anyone this player was coordinating gets promoted to standalone.
    for (const [pid, coord] of this.groupOf) {
      if (coord === playerId && pid !== playerId) this.groupOf.set(pid, pid);
    }
    this.groupOf.set(playerId, target);
  }

  unjoin(playerId) {
    if (!this.groupOf.has(playerId)) throw new Error("Unknown player");
    for (const [pid, coord] of this.groupOf) {
      if (coord === playerId && pid !== playerId) this.groupOf.set(pid, pid);
    }
    this.groupOf.set(playerId, playerId);
  }
}

module.exports = { DemoBackend, PLAYLISTS, PLAYERS };

// Soundstage server — serves the iPad frontend, the TV screen page, and a
// JSON API that fronts Spotify (cloud) and Sonos (local UPnP), plus the
// hub-owned play queue, hub playlists, and video screens.
// Zero runtime dependencies.
//
// Usage:
//   node server/index.js                # live mode (needs SPOTIFY_CLIENT_ID)
//   DEMO=1 node server/index.js         # demo mode: mock Spotify + Sonos
//
// Env: PORT (5599), SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, YOUTUBE_API_KEY,
//      SONOS_SPOTIFY_SID (2311), SONOS_SPOTIFY_SN (1), SONOS_IP, DATA_DIR.

const http = require("http");
const fs = require("fs");
const path = require("path");

const { SpotifyClient } = require("./spotify");
const { SonosSystem } = require("./sonos");
const { DemoBackend } = require("./demo");
const { QueueManager } = require("./queue");
const { HubPlaylists } = require("./store");
const { ScreenRegistry } = require("./screens");

const PORT = Number(process.env.PORT || 5599);
const DEMO = process.env.DEMO === "1";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", ".data");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const YT_KEY = process.env.YOUTUBE_API_KEY || null;

const demo = DEMO ? new DemoBackend() : null;
const spotify = DEMO
  ? null
  : new SpotifyClient({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      redirectUri:
        process.env.SPOTIFY_REDIRECT_URI ||
        `http://localhost:${PORT}/api/spotify/callback`,
      dataDir: DATA_DIR,
    });
const sonos = DEMO
  ? null
  : new SonosSystem({
      sid: Number(process.env.SONOS_SPOTIFY_SID || 2311),
      sn: Number(process.env.SONOS_SPOTIFY_SN || 1),
    });

const hubPlaylists = new HubPlaylists(DATA_DIR);
const screens = new ScreenRegistry();

// The queue drives whichever backend is live through one tiny interface.
const queueBackend = {
  playTrack: (groupId, track) =>
    DEMO
      ? Promise.resolve(demo.playSpotify(groupId, track.uri, track.name))
      : sonos.playSpotify(groupId, track.uri, track.name),
  state: (groupId) =>
    DEMO ? Promise.resolve(demo.state(groupId)) : sonos.state(groupId),
};
const queues = new QueueManager(queueBackend);
const queueTicker = setInterval(() => queues.tick(), 2000);
queueTicker.unref();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error("Bad JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function resolveVideo(query) {
  if (YT_KEY) {
    const q = new URLSearchParams({
      part: "snippet", type: "video", maxResults: "1",
      videoCategoryId: "10", q: query, key: YT_KEY,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`);
    const data = await res.json();
    const item = data.items && data.items[0];
    if (item && item.id && item.id.videoId) {
      return {
        mode: "video",
        videoId: item.id.videoId,
        title: item.snippet ? item.snippet.title : query,
        embedUrl: `https://www.youtube-nocookie.com/embed/${item.id.videoId}?autoplay=1&playsinline=1`,
      };
    }
  }
  // No API key (or no hit): the YouTube iframe player can run a search
  // playlist itself — first result plays, no key or scraping needed.
  return {
    mode: "search",
    query,
    embedUrl:
      "https://www.youtube-nocookie.com/embed?listType=search&autoplay=1&playsinline=1" +
      `&list=${encodeURIComponent(query)}`,
  };
}

async function handleApi(req, res, url) {
  const p = url.pathname;
  const method = req.method;

  // ---- status ----
  if (p === "/api/status" && method === "GET") {
    if (DEMO) {
      return sendJson(res, 200, {
        demo: true,
        spotify: demo.spotifyStatus,
        youtube: { apiKey: Boolean(YT_KEY) },
      });
    }
    let user = null;
    if (spotify.authed) {
      try {
        user = (await spotify.me()).name;
      } catch (_) {}
    }
    return sendJson(res, 200, {
      demo: false,
      spotify: {
        configured: spotify.configured,
        authed: spotify.authed,
        user,
        redirectUri: spotify.redirectUri,
      },
      youtube: { apiKey: Boolean(YT_KEY) },
    });
  }

  // ---- spotify ----
  if (p === "/api/spotify/login" && method === "GET") {
    if (DEMO || !spotify.configured) {
      return sendJson(res, 400, { error: "Spotify client id not configured" });
    }
    return sendJson(res, 200, { url: spotify.loginUrl() });
  }
  if (p === "/api/spotify/callback" && method === "GET") {
    try {
      await spotify.exchangeCode(
        url.searchParams.get("code"),
        url.searchParams.get("state")
      );
      res.writeHead(302, { Location: "/" });
      return res.end();
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }
  if (p === "/api/spotify/logout" && method === "POST") {
    if (!DEMO) spotify.logout();
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/spotify/shelves" && method === "GET") {
    const shelves = DEMO ? demo.shelves() : await spotify.shelves();
    shelves.hub = hubPlaylists.list();
    return sendJson(res, 200, shelves);
  }
  const tracksMatch = /^\/api\/spotify\/playlist\/([\w-]+)\/tracks$/.exec(p);
  if (tracksMatch && method === "GET") {
    const id = tracksMatch[1];
    const tracks = id.startsWith("hub-")
      ? hubPlaylists.get(id).tracks
      : DEMO
        ? demo.playlistTracks(id)
        : await spotify.playlistTracks(id);
    return sendJson(res, 200, { tracks });
  }
  if (p === "/api/spotify/search" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    if (!q.trim()) return sendJson(res, 200, { tracks: [], playlists: [] });
    const result = DEMO ? demo.search(q) : await spotify.search(q);
    return sendJson(res, 200, result);
  }
  if (p === "/api/spotify/suggest" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    if (q.trim().length < 2) {
      return sendJson(res, 200, {
        tracks: [], artists: [], albums: [], playlists: [], genres: [],
      });
    }
    const result = DEMO ? demo.suggest(q) : await spotify.suggest(q);
    return sendJson(res, 200, result);
  }
  if (p === "/api/spotify/browse" && method === "GET") {
    const type = url.searchParams.get("type") || "";
    const q = url.searchParams.get("q") || "";
    if (!q.trim()) return sendJson(res, 400, { error: "Missing q" });
    const result = DEMO ? demo.browse(type, q) : await spotify.browse(type, q);
    return sendJson(res, 200, result);
  }

  // ---- hub playlists ----
  if (p === "/api/hub-playlists" && method === "GET") {
    return sendJson(res, 200, { playlists: hubPlaylists.list() });
  }
  if (p === "/api/hub-playlists" && method === "POST") {
    const b = await readBody(req);
    const created = hubPlaylists.create(b.name);
    return sendJson(res, 200, { id: created.id, name: created.name });
  }
  const hubMatch = /^\/api\/hub-playlists\/(hub-[\w]+)(\/tracks)?$/.exec(p);
  if (hubMatch) {
    const id = hubMatch[1];
    if (!hubMatch[2] && method === "DELETE") {
      hubPlaylists.remove(id);
      return sendJson(res, 200, { ok: true });
    }
    if (hubMatch[2] && method === "POST") {
      const b = await readBody(req);
      const pl = hubPlaylists.addTrack(id, b.track);
      return sendJson(res, 200, { tracks: pl.tracks.length });
    }
    if (hubMatch[2] && method === "DELETE") {
      const b = await readBody(req);
      const pl = hubPlaylists.removeTrack(id, b.uri);
      return sendJson(res, 200, { tracks: pl.tracks.length });
    }
  }

  // ---- queue ----
  if (p === "/api/queue" && method === "GET") {
    return sendJson(res, 200, queues.snapshot(url.searchParams.get("groupId")));
  }
  if (p === "/api/queue/play" && method === "POST") {
    const b = await readBody(req);
    return sendJson(
      res, 200,
      await queues.playNow(b.groupId, b.tracks, b.index || 0, {
        shuffle: b.shuffle,
      })
    );
  }
  if (p === "/api/queue/add" && method === "POST") {
    const b = await readBody(req);
    return sendJson(res, 200, await queues.add(b.groupId, b.track));
  }
  if (p === "/api/queue/next" && method === "POST") {
    const b = await readBody(req);
    if (queues.queue(b.groupId)) {
      return sendJson(res, 200, await queues.next(b.groupId));
    }
    // No hub queue (e.g. music started from the Sonos app) — plain skip.
    if (!DEMO) await sonos.transport(b.groupId, "Next");
    else demo.transport(b.groupId, "Next");
    return sendJson(res, 200, queues.snapshot(b.groupId));
  }
  if (p === "/api/queue/prev" && method === "POST") {
    const b = await readBody(req);
    if (queues.queue(b.groupId)) {
      return sendJson(res, 200, await queues.prev(b.groupId));
    }
    if (!DEMO) await sonos.transport(b.groupId, "Previous");
    else demo.transport(b.groupId, "Previous");
    return sendJson(res, 200, queues.snapshot(b.groupId));
  }
  if (p === "/api/queue/jump" && method === "POST") {
    const b = await readBody(req);
    return sendJson(res, 200, await queues.jump(b.groupId, b.index));
  }
  if (p === "/api/queue/clear" && method === "POST") {
    const b = await readBody(req);
    queues.clear(b.groupId);
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/queue/options" && method === "POST") {
    const b = await readBody(req);
    return sendJson(res, 200, queues.setOptions(b.groupId, b));
  }

  // ---- sonos ----
  if (p === "/api/sonos/zones" && method === "GET") {
    if (DEMO) return sendJson(res, 200, { zones: demo.zones() });
    if (!sonos.groups.length || Date.now() - sonos.lastDiscovery > 5 * 60 * 1000) {
      try {
        await sonos.refreshTopology();
      } catch (_) {}
    }
    return sendJson(res, 200, {
      zones: sonos.groups.map((g) => ({
        id: g.id, coordinatorId: g.coordinatorId, name: g.name,
        members: g.members,
      })),
    });
  }
  if (p === "/api/sonos/refresh" && method === "POST") {
    if (DEMO) return sendJson(res, 200, { zones: demo.zones() });
    await sonos.refreshTopology();
    return sendJson(res, 200, { zones: sonos.groups });
  }
  if (p === "/api/sonos/state" && method === "GET") {
    const groupId = url.searchParams.get("groupId");
    const state = DEMO ? demo.state(groupId) : await sonos.state(groupId);
    return sendJson(res, 200, state);
  }
  if (p === "/api/sonos/transport" && method === "POST") {
    const b = await readBody(req);
    const action = { play: "Play", pause: "Pause" }[b.action];
    if (!action) return sendJson(res, 400, { error: "Bad action" });
    if (DEMO) demo.transport(b.groupId, action);
    else await sonos.transport(b.groupId, action);
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/sonos/volume" && method === "POST") {
    const b = await readBody(req);
    if (DEMO) demo.setVolume(b.playerId, b.volume);
    else await sonos.setVolume(b.playerId, b.volume);
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/sonos/group-volume" && method === "POST") {
    const b = await readBody(req);
    if (DEMO) demo.setGroupVolume(b.groupId, b.volume);
    else await sonos.setGroupVolume(b.groupId, b.volume);
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/sonos/join" && method === "POST") {
    const b = await readBody(req);
    if (DEMO) demo.join(b.playerId, b.coordinatorId);
    else await sonos.join(b.playerId, b.coordinatorId);
    return sendJson(res, 200, { zones: DEMO ? demo.zones() : sonos.groups });
  }
  if (p === "/api/sonos/unjoin" && method === "POST") {
    const b = await readBody(req);
    if (DEMO) demo.unjoin(b.playerId);
    else await sonos.unjoin(b.playerId);
    return sendJson(res, 200, { zones: DEMO ? demo.zones() : sonos.groups });
  }

  // ---- screens ----
  if (p === "/api/screens" && method === "GET") {
    return sendJson(res, 200, { screens: screens.list() });
  }
  if (p === "/api/screens/register" && method === "POST") {
    const b = await readBody(req);
    return sendJson(res, 200, screens.register(b.name));
  }
  if (p === "/api/screens/poll" && method === "GET") {
    return sendJson(res, 200, screens.poll(url.searchParams.get("id")));
  }
  if (p === "/api/screens/send" && method === "POST") {
    const b = await readBody(req);
    screens.send(b.screenId, b.command);
    return sendJson(res, 200, { ok: true });
  }

  // ---- video ----
  if (p === "/api/video/resolve" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    if (!q.trim()) return sendJson(res, 400, { error: "Missing q" });
    return sendJson(res, 200, await resolveVideo(q));
  }

  return sendJson(res, 404, { error: "Not found" });
}

function serveStatic(res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  if (rel === "/screen") rel = "/screen.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(res, url.pathname);
  } catch (err) {
    return sendJson(res, 500, { error: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(
      `Soundstage ${DEMO ? "(demo mode) " : ""}running at http://localhost:${PORT}/`
    );
    console.log(`TV screens connect at http://<this-host>:${PORT}/screen`);
    if (!DEMO && !process.env.SPOTIFY_CLIENT_ID) {
      console.log(
        "No SPOTIFY_CLIENT_ID set — the hub will show the setup panel. " +
          "Tip: DEMO=1 for a full mock demo."
      );
    }
  });
}

module.exports = { server, resolveVideo };

// Soundstage server — serves the iPad frontend and a JSON API that fronts
// Spotify (cloud) and Sonos (local UPnP). Zero runtime dependencies.
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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
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
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${q}`
    );
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
    return sendJson(res, 200, shelves);
  }
  const tracksMatch = /^\/api\/spotify\/playlist\/([\w-]+)\/tracks$/.exec(p);
  if (tracksMatch && method === "GET") {
    const tracks = DEMO
      ? demo.playlistTracks(tracksMatch[1])
      : await spotify.playlistTracks(tracksMatch[1]);
    return sendJson(res, 200, { tracks });
  }
  if (p === "/api/spotify/search" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    if (!q.trim()) return sendJson(res, 200, { tracks: [] });
    const tracks = DEMO ? demo.searchTracks(q) : await spotify.searchTracks(q);
    return sendJson(res, 200, { tracks });
  }

  // ---- sonos ----
  if (p === "/api/sonos/zones" && method === "GET") {
    if (DEMO) return sendJson(res, 200, { zones: demo.zones() });
    if (
      !sonos.groups.length ||
      Date.now() - sonos.lastDiscovery > 5 * 60 * 1000
    ) {
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
  if (p === "/api/sonos/play-spotify" && method === "POST") {
    const b = await readBody(req);
    if (DEMO) demo.playSpotify(b.groupId, b.uri, b.title);
    else await sonos.playSpotify(b.groupId, b.uri, b.title);
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/sonos/transport" && method === "POST") {
    const b = await readBody(req);
    const action = { play: "Play", pause: "Pause", next: "Next", prev: "Previous" }[
      b.action
    ];
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
    return sendJson(res, 200, {
      zones: DEMO ? demo.zones() : sonos.groups,
    });
  }
  if (p === "/api/sonos/unjoin" && method === "POST") {
    const b = await readBody(req);
    if (DEMO) demo.unjoin(b.playerId);
    else await sonos.unjoin(b.playerId);
    return sendJson(res, 200, {
      zones: DEMO ? demo.zones() : sonos.groups,
    });
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
    if (!DEMO && !process.env.SPOTIFY_CLIENT_ID) {
      console.log(
        "No SPOTIFY_CLIENT_ID set — the hub will show the setup panel. " +
          "Tip: DEMO=1 for a full mock demo."
      );
    }
  });
}

module.exports = { server, resolveVideo };

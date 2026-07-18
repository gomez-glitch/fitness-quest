// Spotify Web API — Authorization Code with PKCE. Needs only a client id
// (create an app at developer.spotify.com, add the redirect URI shown on the
// hub's setup panel). Tokens persist to DATA_DIR and refresh automatically.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

// Playlist searches used to build the "Best of Spotify" shelf (the official
// featured-playlists endpoint is deprecated for new API apps).
const CURATED_QUERIES = [
  "Today's Top Hits",
  "RapCaviar",
  "Rock Classics",
  "All Out 2000s",
  "Chill Hits",
  "Dance Party",
];

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pkcePair() {
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function simplifyPlaylist(p) {
  return {
    id: p.id,
    name: p.name,
    description: (p.description || "").replace(/<[^>]+>/g, ""),
    image: p.images && p.images.length ? p.images[0].url : null,
    tracks: p.tracks ? p.tracks.total : null,
    owner: p.owner ? p.owner.display_name : null,
  };
}

function simplifyTrack(t) {
  if (!t) return null;
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artist: (t.artists || []).map((a) => a.name).join(", "),
    album: t.album ? t.album.name : null,
    image:
      t.album && t.album.images && t.album.images.length
        ? t.album.images[t.album.images.length > 1 ? 1 : 0].url
        : null,
    durationSec: Math.round((t.duration_ms || 0) / 1000),
  };
}

class SpotifyClient {
  constructor(opts) {
    this.clientId = opts.clientId || null;
    this.redirectUri = opts.redirectUri;
    this.tokenFile = path.join(opts.dataDir, "spotify-tokens.json");
    this.pending = new Map(); // state -> verifier
    this.tokens = null;
    try {
      this.tokens = JSON.parse(fs.readFileSync(this.tokenFile, "utf8"));
    } catch (_) {}
  }

  get configured() {
    return Boolean(this.clientId);
  }

  get authed() {
    return Boolean(this.tokens && this.tokens.refresh_token);
  }

  loginUrl() {
    const { verifier, challenge } = pkcePair();
    const state = b64url(crypto.randomBytes(12));
    this.pending.set(state, verifier);
    const q = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      state,
      scope:
        "playlist-read-private playlist-read-collaborative user-library-read",
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    return `${ACCOUNTS}/authorize?${q}`;
  }

  async exchangeCode(code, state) {
    const verifier = this.pending.get(state);
    if (!verifier) throw new Error("Unknown OAuth state — restart login");
    this.pending.delete(state);
    await this.tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: verifier,
    });
  }

  async tokenRequest(params) {
    const res = await fetch(`${ACCOUNTS}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Spotify token error: ${data.error_description || data.error}`);
    }
    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || (this.tokens && this.tokens.refresh_token),
      expires_at: Date.now() + (data.expires_in - 60) * 1000,
    };
    fs.mkdirSync(path.dirname(this.tokenFile), { recursive: true });
    fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokens));
  }

  logout() {
    this.tokens = null;
    try {
      fs.unlinkSync(this.tokenFile);
    } catch (_) {}
  }

  async accessToken() {
    if (!this.tokens) throw new Error("Not logged in to Spotify");
    if (Date.now() >= this.tokens.expires_at) {
      await this.tokenRequest({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refresh_token,
        client_id: this.clientId,
      });
    }
    return this.tokens.access_token;
  }

  async api(pathAndQuery) {
    const token = await this.accessToken();
    const res = await fetch(`${API}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Spotify API ${res.status}: ${(data.error && data.error.message) || "error"}`
      );
    }
    return data;
  }

  async me() {
    const d = await this.api("/me");
    return { name: d.display_name, id: d.id };
  }

  // { mine: [...], curated: [...] }
  async shelves() {
    const mine = [];
    let url = "/me/playlists?limit=50";
    while (url && mine.length < 200) {
      const page = await this.api(url);
      for (const p of page.items || []) if (p) mine.push(simplifyPlaylist(p));
      url = page.next ? page.next.replace(API, "") : null;
    }
    const curated = [];
    const seen = new Set(mine.map((p) => p.id));
    for (const q of CURATED_QUERIES) {
      try {
        const d = await this.api(
          `/search?type=playlist&limit=3&q=${encodeURIComponent(q)}`
        );
        const hit = ((d.playlists && d.playlists.items) || []).find(
          (p) => p && !seen.has(p.id)
        );
        if (hit) {
          seen.add(hit.id);
          curated.push(simplifyPlaylist(hit));
        }
      } catch (_) {
        // A missing curated result never breaks the shelf.
      }
    }
    return { mine, curated };
  }

  async playlistTracks(playlistId) {
    const tracks = [];
    let url = `/playlists/${playlistId}/tracks?limit=100`;
    while (url && tracks.length < 400) {
      const page = await this.api(url);
      for (const item of page.items || []) {
        const t = simplifyTrack(item.track);
        if (t && t.uri && t.uri.startsWith("spotify:track:")) tracks.push(t);
      }
      url = page.next ? page.next.replace(API, "") : null;
    }
    return tracks;
  }

  async searchTracks(q) {
    const d = await this.api(
      `/search?type=track&limit=25&q=${encodeURIComponent(q)}`
    );
    return ((d.tracks && d.tracks.items) || []).map(simplifyTrack).filter(Boolean);
  }
}

module.exports = { SpotifyClient, pkcePair, simplifyTrack, simplifyPlaylist };

# Soundstage

An iPad-centric music hub for the whole house: browse the best of your
Spotify playlists on a big, glanceable screen, pull up the music video from
YouTube when one exists, and send the music to any combination of Sonos
zones — grouped, ungrouped, and mixed per room from the iPad.

Zero runtime dependencies: one plain Node.js server, one static frontend.

## Quick start (demo — no accounts, no hardware)

```bash
cd music-hub
npm run demo          # http://localhost:5599/
```

Demo mode mocks Spotify and a five-room Sonos house with a real state
machine — every screen, control, and flow works exactly like live mode.

## Live setup

Run the server on any always-on box on the same network as your Sonos
system (Mac mini, Raspberry Pi, NAS), then open its URL on the iPad and
"Add to Home Screen" for the full-screen app.

1. **Spotify** — create an app at
   [developer.spotify.com](https://developer.spotify.com/dashboard), add the
   redirect URI the setup screen shows you (default
   `http://localhost:5599/api/spotify/callback` — use your server's LAN
   hostname), then:

   ```bash
   SPOTIFY_CLIENT_ID=xxxxxxxx node server/index.js
   ```

   Tap **Connect Spotify** on the hub — it uses Authorization Code with
   PKCE, so no client secret is needed. Tokens persist in `.data/`.

2. **Sonos** — discovered automatically via SSDP on the LAN. If multicast
   discovery is blocked on your network, point at any one player with
   `SONOS_IP=192.168.x.x`. Starting Spotify tracks on Sonos requires that
   your Sonos system already has Spotify linked in the official Sonos app.
   If tracks refuse to start, your household's Spotify service id differs
   from the default — set `SONOS_SPOTIFY_SID` (try 12 or 9 on older
   systems; default 2311) and `SONOS_SPOTIFY_SN`.

3. **YouTube videos** — work with zero configuration: the video overlay
   uses the YouTube iframe player's built-in search playlist. For exact
   video matching, set `YOUTUBE_API_KEY` (a free Data API v3 key) and the
   hub resolves the precise official video instead.

### All environment variables

| Variable             | Default                          | Purpose                          |
| -------------------- | -------------------------------- | -------------------------------- |
| `PORT`               | `5599`                           | HTTP port                        |
| `DEMO`               | unset                            | `1` = mock Spotify + Sonos       |
| `SPOTIFY_CLIENT_ID`  | —                                | Spotify app client id (PKCE)     |
| `SPOTIFY_REDIRECT_URI` | `http://localhost:PORT/api/spotify/callback` | Must match the Spotify app |
| `YOUTUBE_API_KEY`    | —                                | Optional exact video resolution  |
| `SONOS_IP`           | —                                | Skip SSDP, use this player       |
| `SONOS_SPOTIFY_SID`  | `2311`                           | Household Spotify service id     |
| `SONOS_SPOTIFY_SN`   | `1`                              | Household Spotify serial number  |
| `DATA_DIR`           | `music-hub/.data`                | Token storage                    |

## Using the hub

- **Home** — two shelves: *Your playlists* (your Spotify library) and
  *Best of Spotify* (Today's Top Hits, RapCaviar, and friends).
- **Play** — tap any track (or its **Play** button) and it starts on the
  highlighted zone group; the bottom bar shows live position, transport
  controls, and the target room.
- **Zones** (right rail) — tap a group to make it the play target. Each
  room has its own volume slider. **Edit groups** exposes one-tap
  *Join*/*Remove* to build party mode (everything grouped) or split rooms.
- **Video** — every track row has a **▶ Video** button: full-screen
  YouTube overlay on the iPad. *Mute video · audio to Sonos* mutes the
  embed and starts the same song in the room (best-effort vibe, not
  frame-accurate sync — that isn't possible across these APIs).
- **Search** — top bar searches all of Spotify; results play and video
  just like playlist tracks.

## Testing

```bash
npm run lint       # syntax-check all JS
node tests/unit.js # topology parsing, URI/DIDL builders, demo state machine
node tests/e2e.js  # Playwright drives the real UI against demo mode
```

The e2e suite uses the repo root's `playwright` install; set
`CHROMIUM_PATH` if Playwright's own browser download isn't available.

## Architecture

See [`docs/PLAN.md`](docs/PLAN.md) for the full plan and decisions.

```
server/index.js    HTTP server: static frontend + JSON API
server/spotify.js  Spotify Web API (Authorization Code + PKCE, auto-refresh)
server/sonos.js    Sonos UPnP: SSDP discovery, SOAP control, grouping,
                   x-sonos-spotify playback
server/demo.js     In-memory mock of both backends (demo mode + tests)
public/            iPad frontend (installable web app)
tests/             unit.js + e2e.js
```

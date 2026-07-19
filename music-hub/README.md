# Soundstage

An iPad-centric music hub for the whole house: browse and search the best of
your Spotify playlists on a big, glanceable screen, make your own playlists on
the hub, watch the music video on any TV in the house, and send the music to
any combination of Sonos zones — grouped, ungrouped, and mixed per room.

Zero runtime dependencies: one plain Node.js server, one static frontend.

## Quick start (demo — no accounts, no hardware)

```bash
cd music-hub
npm run demo          # http://localhost:5599/
```

Demo mode mocks Spotify and a five-room Sonos house with a real state
machine — every screen, control, and flow works exactly like live mode.
Open `http://localhost:5599/screen` in a second window to play with the TV
screen flow.

## What it does

- **Play anywhere** — tap a song and it plays on the highlighted Sonos zone
  group. The hub owns a real queue: the rest of the playlist lines up behind
  it, the bottom bar shows live progress, and **Queue** shows what's up next.
- **Autoplay** — when the queue runs out, Soundstage keeps the music going
  with tracks from wherever you were listening (radio-style, no repeats of
  the last few songs). Toggle it in the queue sheet.
- **Shuffle & Surprise** — every playlist has **🔀 Shuffle**; the home screen
  has **🔀 Surprise me**, which picks a random playlist and shuffles it.
- **Make playlists on the hub** — the **＋ New playlist** card, or ＋ on any
  song → add to an existing hub playlist or type a name to create one.
  Hub playlists live on the server (they survive restarts), show a HUB badge,
  and are playable/shuffleable like any other playlist.
- **Search everything** — the top bar searches Spotify songs *and* playlists.
- **Videos on any screen** — every song has **▶ Video**. Point any TV with a
  browser (smart TV, Fire stick, mini PC, spare tablet) at
  `http://<hub>:5599/screen`, pick it under **Video screen** on the iPad, and
  videos play there — muted on the TV, audio through Sonos. Turn on
  **Auto-play videos** and every new song pushes its clip to the TV
  automatically. With "This iPad" selected, videos play full-screen on the
  iPad instead.
- **Multi-zone Sonos** — live zone list, tap-to-target playback, per-room and
  group volume, and one-tap **Edit groups** join/remove for party mode.

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

3. **YouTube videos** — work with zero configuration: the player uses the
   YouTube iframe's built-in search playlist. For exact video matching, set
   `YOUTUBE_API_KEY` (a free Data API v3 key) and the hub resolves the
   precise official clip instead.

4. **TV screens** — open `http://<hub-host>:5599/screen?name=Lounge%20TV` on
   the TV's browser (the name is remembered). Most TV browsers only allow
   *muted* video autoplay, which is exactly how Soundstage uses them.

### Docker

```bash
cd music-hub
docker build -t soundstage .
docker run --net=host -e SPOTIFY_CLIENT_ID=... -v soundstage-data:/app/.data soundstage
```

`--net=host` is required for Sonos SSDP discovery. `DEMO=1` runs anywhere.

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
| `DATA_DIR`           | `music-hub/.data`                | Tokens + hub playlists           |

## Testing

```bash
npm run lint       # syntax-check all JS
node tests/unit.js # 67 checks: topology parsing, URI/DIDL builders, queue
                   # manager (autoplay/shuffle/tick), hub playlist store,
                   # screen registry, demo state machine
node tests/e2e.js  # 39 checks: Playwright drives the real UI in demo mode,
                   # including a second browser page acting as the TV screen
```

The e2e suite uses the repo root's `playwright` install; set
`CHROMIUM_PATH` if Playwright's own browser download isn't available.

## Architecture

See [`docs/PLAN.md`](docs/PLAN.md) for the full plan and decisions.

```
server/index.js    HTTP server: static frontend + JSON API
server/queue.js    Hub-owned play queue: ordering, shuffle, autoplay, and
                   the tick that advances tracks as they finish
server/spotify.js  Spotify Web API (Authorization Code + PKCE, auto-refresh)
server/sonos.js    Sonos UPnP: SSDP discovery, SOAP control, grouping,
                   x-sonos-spotify playback
server/store.js    Hub playlists (JSON on disk, survives restarts)
server/screens.js  TV screen registry (register / poll / push commands)
server/demo.js     In-memory mock of Spotify + Sonos (demo mode + tests)
public/            iPad frontend (installable web app)
public/screen.html TV screen page (idle clock → full-screen muted video)
tests/             unit.js + e2e.js
Dockerfile         Container packaging (--net=host for Sonos discovery)
```

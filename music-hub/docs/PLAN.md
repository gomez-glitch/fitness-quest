# Soundstage — Plan

An iPad-centric music hub: browse the best of your Spotify playlists on a
wall-mounted or kitchen-counter iPad, watch the music video on screen when one
exists on YouTube, and send the music to any combination of Sonos zones in the
house.

## Product goals

1. **iPad first.** Landscape, full-screen home-screen web app. Big touch
   targets, glanceable now-playing, no tiny desktop chrome.
2. **Spotify as the library.** Your own playlists plus a curated "best of"
   shelf (Today's Top Hits, RapCaviar, etc., found via Spotify search since the
   featured-playlists endpoint is deprecated for new apps).
3. **Video on screen.** Any track can pull up its YouTube video in a
   full-screen overlay. With a YouTube API key we resolve the exact video; with
   no key we fall back to the YouTube iframe player's built-in search playlist
   (`listType=search`) — zero-config, no scraping.
4. **Multi-zone Sonos.** Discover players on the LAN, show live zone topology,
   group/ungroup zones from the iPad, per-player and group volume, and start
   Spotify tracks on any group.

## Architecture

A single dependency-free Node.js server (matches this repo's ethos — zero
runtime deps) that runs on any always-on box on the same LAN as the Sonos
system (Mac mini, Raspberry Pi, NAS). The iPad just opens a URL.

```
music-hub/
  server/index.js    HTTP server: static frontend + JSON API + config
  server/spotify.js  Spotify Web API — Authorization Code + PKCE, token refresh
  server/sonos.js    Sonos over local UPnP: SSDP discovery, SOAP control,
                     zone topology, grouping, x-sonos-spotify playback
  server/demo.js     Full in-memory mock of both backends (drives tests + demo)
  public/            iPad frontend: index.html, app.js, styles.css, manifest
  tests/unit.js      Topology parsing, URI/DIDL builders, demo state machine
  tests/e2e.js       Playwright drive of the real UI against DEMO mode
```

### Why a local server (not a pure client app)?

- Sonos control is local-network UPnP/SOAP — a browser page cannot send SSDP
  multicast or cross-origin SOAP. A LAN server can.
- Spotify tokens live server-side and survive iPad reloads.
- The iPad stays a thin, instantly-loading screen.

### Key technical decisions

- **Sonos**: raw SSDP (`M-SEARCH` for `ZonePlayer:1`) + SOAP over
  `http://<player>:1400`. Topology from `ZoneGroupTopology#GetZoneGroupState`.
  Grouping = `SetAVTransportURI("x-rincon:<coordinatorUUID>")`; ungrouping =
  `BecomeCoordinatorOfStandaloneGroup`. Spotify tracks start via
  `x-sonos-spotify:` URIs with DIDL-Lite metadata carrying the service token.
  The Spotify service id varies per household — configurable via
  `SONOS_SPOTIFY_SID` (default 2311) and `SONOS_SPOTIFY_SN` (default 1); the
  Sonos S2 system must already have Spotify linked in the official app once.
- **Spotify**: Authorization Code with PKCE — needs only a client id, no
  secret. Tokens persisted to `music-hub/.data/` (gitignored), auto-refreshed.
- **Demo mode** (`DEMO=1` or zero config): the same API surface backed by an
  in-memory model — 8 playlists, 5 zones with a real state machine (positions
  advance, groups merge/split, volumes stick). The UI is pixel-identical in
  demo and live mode, so tests exercise the real frontend end to end.

## Test plan

- `npm run lint` — syntax-check every JS file (repo convention).
- `node tests/unit.js` — pure-logic tests: zone topology XML parsing (real
  captured fixture shape), x-sonos-spotify URI + DIDL escaping, PKCE challenge
  shape, demo state machine (play/pause/next, group/ungroup, volume).
- `node tests/e2e.js` — boots the server in DEMO mode on an ephemeral port and
  drives it with Playwright: shelves render, playlist opens, track plays to the
  selected group, now-playing bar updates, zone grouping UI merges two rooms,
  group volume propagates, video overlay opens with the right embed URL, and
  the Spotify setup panel appears when unconfigured.

## v2 additions (shipped)

- **Hub-owned queue** (`server/queue.js`): Sonos only ever holds the current
  track; the hub owns ordering, shuffle, jump, and a 2-second tick that
  watches playback and advances when a track finishes. **Autoplay** refills
  the queue radio-style from the context the music started from (the
  playlist, search results, or shuffle pool), avoiding the last few plays.
- **Hub playlists** (`server/store.js`): playlists created on the hub itself,
  stored as full track objects in `.data/hub-playlists.json` — identical in
  demo and live mode, persistent across restarts. Created from the ＋ card or
  inline from any song's action sheet.
- **Video screens** (`server/screens.js`, `public/screen.html`): any browser
  opens `/screen`, registers by name, and polls for commands. The iPad picks
  a target under "Video screen"; manual ▶ Video and the auto-play-videos
  toggle push muted clips to the TV while Sonos carries audio. Muted
  autoplay is deliberate — it's the only autoplay TV browsers allow, and the
  room's audio belongs to Sonos anyway.
- **Search returns playlists and songs** (one `type=track,playlist` query).
- **Shuffle / Surprise me**: per-playlist shuffle and a random-playlist
  shuffle from home.
- **Docker packaging**: `music-hub/Dockerfile`, `--net=host` for SSDP.

## Out of scope (v1)

- Perfect audio/video sync between the iPad video and Sonos audio (physically
  impossible over these APIs; we offer "video muted on screen + Sonos audio"
  as best effort).
- Sonos queue management UI, alarms, EQ, S1 systems.
- Multi-user accounts — this is a household appliance screen.

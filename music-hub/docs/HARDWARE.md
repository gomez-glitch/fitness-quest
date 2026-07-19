# Soundstage — Hardware & Network Guide

Soundstage is a *remote control*, not a music player: it tells Sonos what to
play, and Sonos streams the audio itself over your network. Nothing streams
through the iPad or the hub. That single fact drives every hardware choice
below — especially the Bluetooth question at the end.

## What you need (shopping list)

| Piece | Purpose | Recommended | Also works |
| --- | --- | --- | --- |
| **Hub host** | Runs the Soundstage server 24/7 | **Raspberry Pi 4/5** (2 GB+) wired to the router | Mac mini, Intel NUC, a NAS via Docker, any always-on PC/laptop |
| **Controller/screen** | The iPad running the app | Any modern iPad, wall mount or counter stand | iPhone, Android tablet, any browser |
| **Speakers** | Play the audio | Sonos S2 speakers, one per zone you want | Any Sonos S2 (One, Era, Five, Beam, Arc, Amp, Port…) |
| **TV screens** *(optional)* | Show music videos | Any smart-TV browser | Fire TV Stick, Chromecast w/ Google TV, Android TV box, a spare tablet |
| **Network** | Ties it together | One flat WiFi/LAN with wired hub | Mesh WiFi (ensure one subnet) |

The server itself is tiny — Node 18+ and about 50 MB of RAM. A Raspberry Pi is
the sweet spot: silent, low-power, always on. Install Node, copy `music-hub/`,
run `node server/index.js` (or use the Dockerfile). See the main README for
the Spotify/YouTube/Sonos environment variables.

## Network requirements (the part that actually bites people)

1. **Hub and Sonos on the same subnet.** Sonos is discovered with SSDP
   multicast. If the hub can't multicast to the speakers, discovery finds
   nothing. Put both on the same LAN/VLAN.
2. **Don't use a "guest" network** for either device — guest networks and
   "client isolation"/"AP isolation" block the device-to-device traffic
   Soundstage and Sonos rely on.
3. **Wire the hub** to the router by Ethernet if you can. It makes discovery
   and control rock-solid and takes the hub off the WiFi contention entirely.
4. **If discovery still fails**, set `SONOS_IP` to any one speaker's IP —
   Soundstage reads the whole zone topology from that one player, no
   multicast needed.
5. **Mesh WiFi is fine** as long as it presents a single subnet (most consumer
   mesh systems do). Segmented "IoT VLANs" need the hub on the same segment as
   Sonos, or a multicast/mDNS reflector between them.

## The iPad and TV screens

- **iPad**: open the hub URL, then Share → *Add to Home Screen* for the
  full-screen landscape app. Wall-mount it in the kitchen/lounge as the house
  music panel.
- **TV screens**: open `http://<hub-host>:5599/screen?name=Lounge%20TV` in the
  TV's browser (or a Fire Stick / Chromecast-with-Google-TV browser). Pick it
  under **Video screen** on the iPad. Note: TV browsers only allow **muted**
  video autoplay — which is exactly how Soundstage uses them, since the room's
  audio is Sonos's job.

## Bluetooth — read this before buying anything

**Short version: keep everything on WiFi. Sonos multi-room is WiFi/LAN by
design, and Soundstage never touches the audio stream, so there is nothing for
it to send over Bluetooth.** Control is WiFi, TV video is WiFi, and Sonos
audio is WiFi. Bluetooth is single-source, ~10 m, and cannot keep rooms in
sync — the opposite of what a whole-house system needs.

Most mains-powered Sonos (One, Era 100/300, Five, Beam, Arc, Amp, Port) have
**no Bluetooth audio input** at all; only the portable **Move** and **Roam**
do, and only for a single paired source.

If you specifically want audio in a room that has **no Sonos speaker**, that's
the only case where Bluetooth makes sense — and it needs a *separate audio
player*, because Soundstage doesn't produce an audio stream. Options, each
single-room, no Sonos-sync, and requiring **Spotify Premium**:

1. **`librespot` on the hub** *(most practical)* — run the open-source Spotify
   Connect endpoint on the Pi and output to a Bluetooth or wired speaker
   attached to it. The hub then appears as a normal Spotify Connect target.
   Trade-off: adds a native binary and a Bluetooth stack to the hub (the
   Soundstage server itself stays dependency-free).
2. **iPad plays it** — use the native Spotify app / iOS SDK on the iPad and
   pair a Bluetooth speaker. Trade-off: the iPad becomes the player and can't
   leave the room.
3. **Line-in bridge** — plug a Bluetooth receiver into a Sonos with a line-in
   jack (Five, Amp, Port); Sonos can even rebroadcast line-in to other zones.
   Pure hardware, no app involvement.

None of these are built into Soundstage today — they're documented here so you
can decide the hardware. For the whole-house vision, WiFi + Sonos is both the
recommended and the natively-supported path.

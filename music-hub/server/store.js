// Hub playlists — playlists created on the hub itself, stored as full track
// objects in a JSON file so they work identically in live and demo mode and
// survive restarts. Deliberately simple: this is a household appliance, not
// a multi-tenant service.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

class HubPlaylists {
  constructor(dataDir) {
    this.file = path.join(dataDir, "hub-playlists.json");
    this.playlists = [];
    try {
      this.playlists = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch (_) {}
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.playlists, null, 1));
  }

  list() {
    return this.playlists.map((p) => ({
      id: p.id,
      name: p.name,
      tracks: p.tracks.length,
      owner: "Hub",
      hub: true,
      image: p.tracks.length ? p.tracks[0].image : null,
      description: `${p.tracks.length} track${p.tracks.length === 1 ? "" : "s"} · made on this hub`,
    }));
  }

  get(id) {
    const p = this.playlists.find((x) => x.id === id);
    if (!p) throw new Error("Unknown hub playlist");
    return p;
  }

  create(name) {
    const clean = String(name || "").trim().slice(0, 60);
    if (!clean) throw new Error("Playlist needs a name");
    const p = { id: `hub-${crypto.randomBytes(5).toString("hex")}`, name: clean, tracks: [] };
    this.playlists.unshift(p);
    this.save();
    return p;
  }

  remove(id) {
    const before = this.playlists.length;
    this.playlists = this.playlists.filter((p) => p.id !== id);
    if (this.playlists.length === before) throw new Error("Unknown hub playlist");
    this.save();
  }

  addTrack(id, track) {
    const p = this.get(id);
    if (!track || !track.uri) throw new Error("Bad track");
    if (p.tracks.some((t) => t.uri === track.uri)) return p; // no dupes
    p.tracks.push({
      uri: track.uri,
      name: track.name,
      artist: track.artist || "",
      album: track.album || "",
      image: track.image || null,
      durationSec: track.durationSec || 0,
    });
    this.save();
    return p;
  }

  removeTrack(id, uri) {
    const p = this.get(id);
    p.tracks = p.tracks.filter((t) => t.uri !== uri);
    this.save();
    return p;
  }
}

module.exports = { HubPlaylists };

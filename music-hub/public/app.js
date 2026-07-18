/* Soundstage frontend — iPad-first music hub.
   Talks only to the local server's JSON API; identical in demo and live mode. */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const state = {
    status: null,
    shelves: null,
    zones: [],
    activeGroupId: null,
    editGroups: false,
    playlist: null, // { id, name, description, image, tracks }
    nowState: null,
    pollTimer: null,
    videoTrack: null,
  };

  // ---------- helpers ----------

  async function api(path, opts) {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  const post = (path, body) =>
    api(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2600);
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }

  function showView(id) {
    for (const v of document.querySelectorAll(".view")) {
      v.classList.toggle("hidden", v.id !== id);
    }
    $("#content").scrollTop = 0;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---------- status / setup ----------

  async function loadStatus() {
    state.status = await api("/api/status");
    $("#demo-pill").classList.toggle("hidden", !state.status.demo);
    const sp = $("#spotify-pill");
    const s = state.status.spotify;
    if (s.authed) {
      sp.textContent = s.user ? `♫ ${s.user}` : "♫ Spotify";
      sp.classList.add("pill-ok");
    } else {
      sp.textContent = "Spotify: not connected";
      sp.classList.remove("pill-ok");
    }
    return state.status;
  }

  // ---------- shelves / playlists ----------

  function playlistCard(p) {
    const card = el("button", "playlist-card");
    card.dataset.playlistId = p.id;
    const art = el("div", "card-art");
    if (p.image) {
      const img = el("img");
      img.src = p.image;
      img.alt = "";
      art.appendChild(img);
    } else {
      art.textContent = "♫";
    }
    card.appendChild(art);
    card.appendChild(el("div", "card-name", p.name));
    card.appendChild(
      el("div", "card-sub", p.tracks != null ? `${p.tracks} tracks` : p.owner || "")
    );
    card.addEventListener("click", () => openPlaylist(p));
    return card;
  }

  async function loadShelves() {
    state.shelves = await api("/api/spotify/shelves");
    const mine = $("#shelf-mine");
    const curated = $("#shelf-curated");
    mine.textContent = "";
    curated.textContent = "";
    for (const p of state.shelves.mine) mine.appendChild(playlistCard(p));
    for (const p of state.shelves.curated) curated.appendChild(playlistCard(p));
    if (!state.shelves.mine.length) {
      mine.appendChild(el("div", "shelf-empty", "No playlists in your library yet."));
    }
  }

  async function openPlaylist(p) {
    const { tracks } = await api(`/api/spotify/playlist/${p.id}/tracks`);
    state.playlist = { ...p, tracks };
    $("#playlist-name").textContent = p.name;
    $("#playlist-desc").textContent = p.description || "";
    const art = $("#playlist-art");
    if (p.image) {
      art.src = p.image;
      art.classList.remove("hidden");
    } else {
      art.classList.add("hidden");
    }
    renderTracks($("#track-list"), tracks);
    showView("view-playlist");
  }

  function trackRow(t, idx) {
    const li = el("li", "track-row");
    li.dataset.trackUri = t.uri;
    const num = el("span", "track-num", String(idx + 1));
    const meta = el("div", "track-meta");
    meta.appendChild(el("div", "track-name", t.name));
    meta.appendChild(el("div", "track-artist", t.artist));
    const dur = el("span", "track-dur", fmtTime(t.durationSec));
    const videoBtn = el("button", "row-btn video-btn", "▶ Video");
    videoBtn.setAttribute("aria-label", `Watch video for ${t.name}`);
    videoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openVideo(t);
    });
    const playBtn = el("button", "row-btn play-btn", "Play");
    playBtn.setAttribute("aria-label", `Play ${t.name} on Sonos`);
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playOnSonos(t);
    });
    li.append(num, meta, dur, videoBtn, playBtn);
    li.addEventListener("click", () => playOnSonos(t));
    return li;
  }

  function renderTracks(listEl, tracks) {
    listEl.textContent = "";
    tracks.forEach((t, i) => listEl.appendChild(trackRow(t, i)));
    if (!tracks.length) listEl.appendChild(el("li", "shelf-empty", "No tracks."));
  }

  // ---------- search ----------

  async function runSearch(q) {
    const { tracks } = await api(`/api/spotify/search?q=${encodeURIComponent(q)}`);
    $("#search-title").textContent = `Search: “${q}”`;
    renderTracks($("#search-results"), tracks);
    showView("view-search");
  }

  // ---------- zones ----------

  function activeGroup() {
    return (
      state.zones.find((g) => g.id === state.activeGroupId) || state.zones[0] || null
    );
  }

  function renderZones() {
    const list = $("#zone-list");
    list.textContent = "";
    const active = activeGroup();
    for (const g of state.zones) {
      const card = el("div", "zone-card");
      card.dataset.groupId = g.id;
      if (active && g.id === active.id) card.classList.add("zone-active");

      const head = el("button", "zone-head");
      head.appendChild(el("span", "zone-name", g.name));
      head.appendChild(
        el("span", "zone-count", g.members.length > 1 ? `${g.members.length} rooms` : "")
      );
      head.addEventListener("click", () => {
        state.activeGroupId = g.id;
        renderZones();
        restartPolling();
      });
      card.appendChild(head);

      const members = el("div", "zone-members");
      for (const m of g.members) {
        const row = el("div", "member-row");
        row.dataset.playerId = m.id;
        row.appendChild(el("span", "member-name", m.name));
        const vol = el("input", "member-vol");
        vol.type = "range";
        vol.min = "0";
        vol.max = "100";
        const vols = (state.nowState && state.nowState.volumes) || {};
        vol.value = vols[m.id] != null ? vols[m.id] : 25;
        vol.addEventListener("change", () =>
          post("/api/sonos/volume", { playerId: m.id, volume: Number(vol.value) }).catch(
            (e) => toast(e.message)
          )
        );
        row.appendChild(vol);
        if (state.editGroups) {
          if (g.members.length > 1 && m.id !== g.coordinatorId) {
            const btn = el("button", "ghost-btn tiny", "Remove");
            btn.addEventListener("click", async () => {
              await post("/api/sonos/unjoin", { playerId: m.id }).catch((e) =>
                toast(e.message)
              );
              await loadZones();
            });
            row.appendChild(btn);
          }
        }
        members.appendChild(row);
      }
      card.appendChild(members);

      if (state.editGroups && active && g.id !== active.id) {
        const joinBtn = el("button", "ghost-btn join-btn", `→ Join ${active.name}`);
        joinBtn.addEventListener("click", async () => {
          await post("/api/sonos/join", {
            playerId: g.coordinatorId,
            coordinatorId: active.coordinatorId,
          }).catch((e) => toast(e.message));
          await loadZones();
        });
        card.appendChild(joinBtn);
      }
      list.appendChild(card);
    }
    if (!state.zones.length) {
      const empty = el("div", "shelf-empty", "No Sonos zones found on this network.");
      const retry = el("button", "ghost-btn", "Search again");
      retry.addEventListener("click", async () => {
        await post("/api/sonos/refresh").catch((e) => toast(e.message));
        await loadZones();
      });
      list.append(empty, retry);
    }
  }

  async function loadZones() {
    const { zones } = await api("/api/sonos/zones");
    state.zones = zones;
    if (!zones.some((g) => g.id === state.activeGroupId)) {
      state.activeGroupId = zones.length ? zones[0].id : null;
    }
    renderZones();
    restartPolling();
  }

  // ---------- playback ----------

  async function playOnSonos(track) {
    const g = activeGroup();
    if (!g) return toast("No Sonos zone selected");
    try {
      await post("/api/sonos/play-spotify", {
        groupId: g.id,
        uri: track.uri,
        title: track.name,
      });
      toast(`Playing “${track.name}” in ${g.name}`);
      await pollNow();
    } catch (err) {
      toast(err.message);
    }
  }

  async function pollNow() {
    const g = activeGroup();
    if (!g) return;
    try {
      state.nowState = await api(
        `/api/sonos/state?groupId=${encodeURIComponent(g.id)}`
      );
      renderNow();
    } catch (_) {
      // Zone may have regrouped under us; refresh topology next tick.
    }
  }

  function renderNow() {
    const s = state.nowState;
    const bar = $("#nowbar");
    if (!s || (!s.title && !s.playing)) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    $("#now-title").textContent = s.title || "—";
    $("#now-sub").textContent = [s.artist, s.album].filter(Boolean).join(" · ");
    $("#playpause-btn").textContent = s.playing ? "⏸" : "▶";
    $("#pos-label").textContent = fmtTime(s.positionSec);
    $("#dur-label").textContent = fmtTime(s.durationSec);
    $("#progress-fill").style.width = s.durationSec
      ? `${Math.min(100, (s.positionSec / s.durationSec) * 100)}%`
      : "0%";
    const g = activeGroup();
    $("#now-zone-name").textContent = g ? g.name : "—";
    // Keep sliders in sync without fighting an in-progress drag.
    for (const [pid, v] of Object.entries(s.volumes || {})) {
      const slider = document.querySelector(
        `.member-row[data-player-id="${pid}"] .member-vol`
      );
      if (slider && v != null && document.activeElement !== slider) {
        slider.value = v;
      }
    }
  }

  function restartPolling() {
    clearInterval(state.pollTimer);
    pollNow();
    state.pollTimer = setInterval(pollNow, 2500);
  }

  async function transport(action) {
    const g = activeGroup();
    if (!g) return;
    await post("/api/sonos/transport", { groupId: g.id, action }).catch((e) =>
      toast(e.message)
    );
    await pollNow();
  }

  // ---------- video ----------

  async function openVideo(track) {
    state.videoTrack = track;
    const q = `${track.name} ${track.artist} official video`;
    const overlay = $("#video-overlay");
    $("#video-title").textContent = `${track.name} — ${track.artist}`;
    overlay.classList.remove("hidden");
    try {
      const v = await api(`/api/video/resolve?q=${encodeURIComponent(q)}`);
      $("#video-frame").src = v.embedUrl;
    } catch (err) {
      toast(err.message);
    }
  }

  function closeVideo() {
    $("#video-overlay").classList.add("hidden");
    $("#video-frame").src = "";
    state.videoTrack = null;
  }

  // Best effort "video on screen, audio in the room": mute the embed and
  // start the same song on the active Sonos group. (Frame-accurate sync is
  // not possible across these APIs — this is a vibe, not a cinema.)
  async function videoToSonos() {
    const t = state.videoTrack;
    if (!t) return;
    const frame = $("#video-frame");
    if (frame.src && !/[?&]mute=1/.test(frame.src)) {
      frame.src = `${frame.src}${frame.src.includes("?") ? "&" : "?"}mute=1`;
    }
    await playOnSonos(t);
  }

  // ---------- wiring ----------

  function wire() {
    $("#home-btn").addEventListener("click", () => showView("view-home"));
    $("#playlist-back").addEventListener("click", () => showView("view-home"));
    $("#search-back").addEventListener("click", () => showView("view-home"));
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#search-input").value.trim();
      if (q) runSearch(q).catch((err) => toast(err.message));
    });
    $("#edit-groups-btn").addEventListener("click", () => {
      state.editGroups = !state.editGroups;
      $("#edit-groups-btn").textContent = state.editGroups ? "Done" : "Edit groups";
      renderZones();
    });
    $("#playpause-btn").addEventListener("click", () =>
      transport(state.nowState && state.nowState.playing ? "pause" : "play")
    );
    $("#prev-btn").addEventListener("click", () => transport("prev"));
    $("#next-btn").addEventListener("click", () => transport("next"));
    $("#video-close").addEventListener("click", closeVideo);
    $("#video-to-sonos").addEventListener("click", videoToSonos);
    $("#spotify-login-btn").addEventListener("click", async () => {
      try {
        const { url } = await api("/api/spotify/login");
        location.href = url;
      } catch (err) {
        toast(err.message);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeVideo();
    });
  }

  async function init() {
    wire();
    const status = await loadStatus().catch(() => null);
    if (!status) {
      toast("Cannot reach the Soundstage server");
      return;
    }
    if (!status.demo && !status.spotify.authed) {
      $("#setup-redirect").textContent = status.spotify.redirectUri || "";
      showView("view-setup");
    } else {
      await loadShelves().catch((err) => toast(err.message));
    }
    await loadZones().catch(() => renderZones());
  }

  init();
})();

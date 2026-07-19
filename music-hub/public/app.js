/* Soundstage frontend — iPad-first music hub.
   Talks only to the local server's JSON API; identical in demo and live mode. */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const state = {
    status: null,
    shelves: { mine: [], curated: [], hub: [] },
    zones: [],
    activeGroupId: null,
    editGroups: false,
    playlist: null, // currently open playlist { id, name, hub, tracks }
    nowState: null,
    queue: { items: [], index: -1, current: null, autoplay: true },
    pollTimer: null,
    pollCount: 0,
    videoTrack: null,
    screens: [],
    videoTarget: localStorage.getItem("ss-video-target") || "ipad",
    autoVideo: localStorage.getItem("ss-auto-video") === "1",
    lastAutoUri: null,
    sheetTrack: null,
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

  const del = (path, body) =>
    api(path, {
      method: "DELETE",
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
    if (p.hub) card.dataset.hub = "1";
    const art = el("div", "card-art");
    if (p.image) {
      const img = el("img");
      img.src = p.image;
      img.alt = "";
      img.loading = "lazy";
      art.appendChild(img);
    } else {
      art.textContent = "♫";
    }
    if (p.hub) art.appendChild(el("span", "hub-badge", "HUB"));
    card.appendChild(art);
    card.appendChild(el("div", "card-name", p.name));
    card.appendChild(
      el("div", "card-sub", p.tracks != null ? `${p.tracks} tracks` : p.owner || "")
    );
    card.addEventListener("click", () => openPlaylist(p).catch((e) => toast(e.message)));
    return card;
  }

  function newPlaylistCard() {
    const card = el("button", "playlist-card new-playlist-card");
    card.id = "new-playlist-card";
    const art = el("div", "card-art new-art", "＋");
    card.appendChild(art);
    card.appendChild(el("div", "card-name", "New playlist"));
    card.appendChild(el("div", "card-sub", "Make your own"));
    card.addEventListener("click", async () => {
      const name = prompt("Name your playlist");
      if (!name || !name.trim()) return;
      try {
        await post("/api/hub-playlists", { name: name.trim() });
        await loadShelves();
        toast(`Created “${name.trim()}” — use ＋ on any song to fill it`);
      } catch (err) {
        toast(err.message);
      }
    });
    return card;
  }

  async function loadShelves() {
    state.shelves = await api("/api/spotify/shelves");
    const mine = $("#shelf-mine");
    const curated = $("#shelf-curated");
    mine.textContent = "";
    curated.textContent = "";
    mine.appendChild(newPlaylistCard());
    for (const p of state.shelves.hub || []) mine.appendChild(playlistCard(p));
    for (const p of state.shelves.mine) mine.appendChild(playlistCard(p));
    for (const p of state.shelves.curated) curated.appendChild(playlistCard(p));
  }

  async function openPlaylist(p) {
    const { tracks } = await api(`/api/spotify/playlist/${p.id}/tracks`);
    state.playlist = { ...p, tracks };
    $("#playlist-name").textContent = p.name;
    $("#playlist-desc").textContent = p.description || "";
    $("#playlist-delete-btn").classList.toggle("hidden", !p.hub);
    const art = $("#playlist-art");
    if (p.image) {
      art.src = p.image;
      art.classList.remove("hidden");
    } else {
      art.classList.add("hidden");
    }
    renderTracks($("#track-list"), tracks, { hubId: p.hub ? p.id : null });
    showView("view-playlist");
  }

  function trackRow(t, idx, list, opts = {}) {
    const li = el("li", "track-row");
    li.dataset.trackUri = t.uri;
    const num = el("span", "track-num", String(idx + 1));
    const meta = el("div", "track-meta");
    meta.appendChild(el("div", "track-name", t.name));
    meta.appendChild(el("div", "track-artist", t.artist));
    const dur = el("span", "track-dur", fmtTime(t.durationSec));
    const moreBtn = el("button", "row-btn more-btn", "＋");
    moreBtn.setAttribute("aria-label", `Add ${t.name} to queue or playlist`);
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openTrackSheet(t, opts.hubId || null);
    });
    const videoBtn = el("button", "row-btn video-btn", "▶ Video");
    videoBtn.setAttribute("aria-label", `Watch video for ${t.name}`);
    videoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Keep the surrounding list as queue context so "next" keeps rolling.
      requestVideo(t, { manual: true, list, index: idx });
    });
    const playBtn = el("button", "row-btn play-btn", "Play");
    playBtn.setAttribute("aria-label", `Play ${t.name} on Sonos`);
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playList(list, idx);
    });
    li.append(num, meta, dur, moreBtn, videoBtn, playBtn);
    li.addEventListener("click", () => playList(list, idx));
    return li;
  }

  function renderTracks(listEl, tracks, opts = {}) {
    listEl.textContent = "";
    tracks.forEach((t, i) => listEl.appendChild(trackRow(t, i, tracks, opts)));
    if (!tracks.length) {
      listEl.appendChild(
        el("li", "shelf-empty", "Nothing here yet — use ＋ on any song to add it.")
      );
    }
  }

  // ---------- search ----------

  async function runSearch(q) {
    const result = await api(`/api/spotify/search?q=${encodeURIComponent(q)}`);
    $("#search-title").textContent = `Search: “${q}”`;
    const plWrap = $("#search-playlists-wrap");
    const plShelf = $("#search-playlists");
    plShelf.textContent = "";
    const playlists = result.playlists || [];
    plWrap.classList.toggle("hidden", !playlists.length);
    for (const p of playlists) plShelf.appendChild(playlistCard(p));
    renderTracks($("#search-results"), result.tracks || []);
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

  // ---------- screens ----------

  async function loadScreens() {
    try {
      const { screens } = await api("/api/screens");
      state.screens = screens;
    } catch (_) {
      state.screens = [];
    }
    if (
      state.videoTarget !== "ipad" &&
      !state.screens.some((s) => s.id === state.videoTarget)
    ) {
      // Chosen TV went away — try to re-match by name, else fall back.
      state.videoTarget = "ipad";
    }
    renderScreens();
  }

  function renderScreens() {
    const list = $("#screen-list");
    list.textContent = "";
    const options = [{ id: "ipad", name: "This iPad" }, ...state.screens];
    for (const s of options) {
      const row = el("button", "screen-row");
      row.dataset.screenId = s.id;
      if (s.id === state.videoTarget) row.classList.add("screen-on");
      row.appendChild(el("span", "screen-dot"));
      row.appendChild(el("span", null, s.name));
      row.addEventListener("click", () => {
        state.videoTarget = s.id;
        localStorage.setItem("ss-video-target", s.id);
        renderScreens();
      });
      list.appendChild(row);
    }
  }

  // ---------- playback / queue ----------

  async function playList(tracks, index, opts = {}) {
    const g = activeGroup();
    if (!g) return toast("No Sonos zone selected");
    try {
      const snap = await post("/api/queue/play", {
        groupId: g.id,
        tracks,
        index,
        shuffle: Boolean(opts.shuffle),
      });
      state.queue = snap;
      const t = snap.current;
      toast(
        opts.shuffle
          ? `Shuffling ${tracks.length} tracks in ${g.name}`
          : `Playing “${t.name}” in ${g.name}`
      );
      await pollNow();
    } catch (err) {
      toast(err.message);
    }
  }

  async function surpriseMe() {
    const pool = [
      ...(state.shelves.hub || []).filter((p) => p.tracks > 0),
      ...state.shelves.mine,
      ...state.shelves.curated,
    ];
    if (!pool.length) return toast("No playlists to surprise you with yet");
    const pick = pool[Math.floor(Math.random() * pool.length)];
    try {
      const { tracks } = await api(`/api/spotify/playlist/${pick.id}/tracks`);
      if (!tracks.length) return toast(`“${pick.name}” is empty — spin again`);
      await playList(tracks, 0, { shuffle: true });
      toast(`🔀 Surprise: “${pick.name}”`);
    } catch (err) {
      toast(err.message);
    }
  }

  async function pollNow() {
    const g = activeGroup();
    if (!g) return;
    state.pollCount += 1;
    try {
      const [now, queue] = await Promise.all([
        api(`/api/sonos/state?groupId=${encodeURIComponent(g.id)}`),
        api(`/api/queue?groupId=${encodeURIComponent(g.id)}`),
      ]);
      state.nowState = now;
      state.queue = queue;
      renderNow();
      maybeAutoVideo();
    } catch (_) {
      // Zone may have regrouped under us; refresh topology next tick.
    }
    if (state.pollCount % 3 === 1) await loadScreens();
  }

  function renderNow() {
    const s = state.nowState;
    const bar = $("#nowbar");
    const current = state.queue.current;
    if ((!s || (!s.title && !s.playing)) && !current) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    $("#now-title").textContent = (s && s.title) || (current && current.name) || "—";
    $("#now-sub").textContent = s
      ? [s.artist, s.album].filter(Boolean).join(" · ")
      : "";
    const art = $("#now-art");
    if (current && current.image) {
      art.style.backgroundImage = `url("${current.image}")`;
      art.classList.add("has-img");
    } else {
      art.style.backgroundImage = "";
      art.classList.remove("has-img");
    }
    const playing = Boolean(s && s.playing);
    $("#icon-play").classList.toggle("hidden", playing);
    $("#icon-pause").classList.toggle("hidden", !playing);
    $("#pos-label").textContent = fmtTime(s ? s.positionSec : 0);
    $("#dur-label").textContent = fmtTime(s ? s.durationSec : 0);
    $("#progress-fill").style.width =
      s && s.durationSec
        ? `${Math.min(100, (s.positionSec / s.durationSec) * 100)}%`
        : "0%";
    const g = activeGroup();
    $("#now-zone-name").textContent = g ? g.name : "—";
    const upcoming = Math.max(0, state.queue.items.length - state.queue.index - 1);
    const badge = $("#queue-count");
    badge.textContent = String(upcoming);
    badge.classList.toggle("hidden", upcoming === 0);
    // Keep sliders in sync without fighting an in-progress drag.
    for (const [pid, v] of Object.entries((s && s.volumes) || {})) {
      const slider = document.querySelector(
        `.member-row[data-player-id="${pid}"] .member-vol`
      );
      if (slider && v != null && document.activeElement !== slider) {
        slider.value = v;
      }
    }
    if (!$("#queue-sheet").classList.contains("hidden")) renderQueueSheet();
  }

  function restartPolling() {
    clearInterval(state.pollTimer);
    pollNow();
    state.pollTimer = setInterval(pollNow, 2500);
  }

  async function transportPlayPause() {
    const g = activeGroup();
    if (!g) return;
    const playing = state.nowState && state.nowState.playing;
    await post("/api/sonos/transport", {
      groupId: g.id,
      action: playing ? "pause" : "play",
    }).catch((e) => toast(e.message));
    await pollNow();
  }

  async function skip(dir) {
    const g = activeGroup();
    if (!g) return;
    try {
      state.queue = await post(`/api/queue/${dir}`, { groupId: g.id });
      await pollNow();
    } catch (err) {
      toast(err.message);
    }
  }

  // ---------- queue sheet ----------

  function renderQueueSheet() {
    const list = $("#queue-list");
    list.textContent = "";
    const { items, index } = state.queue;
    $("#autoplay-toggle").checked = Boolean(state.queue.autoplay);
    if (!items.length) {
      list.appendChild(el("li", "shelf-empty", "Queue is empty — play something."));
      return;
    }
    items.forEach((t, i) => {
      const li = el("li", "queue-row");
      if (i === index) li.classList.add("queue-now");
      if (i < index) li.classList.add("queue-done");
      li.appendChild(el("span", "queue-pos", i === index ? "▶" : String(i + 1)));
      const meta = el("div", "track-meta");
      meta.appendChild(el("div", "track-name", t.name));
      meta.appendChild(el("div", "track-artist", t.artist));
      li.appendChild(meta);
      li.appendChild(el("span", "track-dur", fmtTime(t.durationSec)));
      li.addEventListener("click", async () => {
        const g = activeGroup();
        if (!g) return;
        state.queue = await post("/api/queue/jump", { groupId: g.id, index: i }).catch(
          (e) => (toast(e.message), state.queue)
        );
        await pollNow();
      });
      list.appendChild(li);
    });
  }

  function openQueueSheet() {
    renderQueueSheet();
    openSheet("#queue-sheet");
  }

  // ---------- track action sheet ----------

  function openTrackSheet(track, hubContextId) {
    state.sheetTrack = track;
    $("#sheet-track-label").textContent = `${track.name} — ${track.artist}`;
    const wrap = $("#sheet-playlists");
    wrap.textContent = "";
    for (const p of state.shelves.hub || []) {
      const row = el("button", "sheet-row", `♫ ${p.name}`);
      row.dataset.hubId = p.id;
      row.addEventListener("click", async () => {
        try {
          await post(`/api/hub-playlists/${p.id}/tracks`, { track });
          toast(`Added to “${p.name}”`);
          closeSheets();
          await loadShelves();
        } catch (err) {
          toast(err.message);
        }
      });
      wrap.appendChild(row);
    }
    if (hubContextId) {
      const rm = el("button", "sheet-row danger", "− Remove from this playlist");
      rm.addEventListener("click", async () => {
        try {
          await del(`/api/hub-playlists/${hubContextId}/tracks`, { uri: track.uri });
          closeSheets();
          await loadShelves();
          const p = (state.shelves.hub || []).find((x) => x.id === hubContextId);
          const current = state.playlist;
          if (current && current.id === hubContextId && p) await openPlaylist(p);
          toast("Removed");
        } catch (err) {
          toast(err.message);
        }
      });
      wrap.appendChild(rm);
    }
    openSheet("#track-sheet");
  }

  function openSheet(sel) {
    $("#sheet-scrim").classList.remove("hidden");
    $(sel).classList.remove("hidden");
    requestAnimationFrame(() => $(sel).classList.add("sheet-in"));
  }

  function closeSheets() {
    $("#sheet-scrim").classList.add("hidden");
    for (const s of document.querySelectorAll(".sheet")) {
      s.classList.add("hidden");
      s.classList.remove("sheet-in");
    }
  }

  // ---------- video ----------

  function videoQuery(track) {
    return `${track.name} ${track.artist} official video`;
  }

  // Manual "▶ Video" tap. On the iPad: full-screen overlay with sound. On a
  // TV screen: muted clip on the TV + the song on Sonos (the room is the
  // speaker, the TV is the picture).
  async function requestVideo(track, opts = {}) {
    try {
      const v = await api(`/api/video/resolve?q=${encodeURIComponent(videoQuery(track))}`);
      if (state.videoTarget === "ipad") {
        state.videoTrack = track;
        $("#video-title").textContent = `${track.name} — ${track.artist}`;
        $("#video-overlay").classList.remove("hidden");
        $("#video-frame").src = opts.muted
          ? `${v.embedUrl}&mute=1`
          : v.embedUrl;
      } else {
        const screen = state.screens.find((s) => s.id === state.videoTarget);
        await post("/api/screens/send", {
          screenId: state.videoTarget,
          command: {
            action: "video",
            embedUrl: `${v.embedUrl}&mute=1`,
            title: `${track.name} — ${track.artist}`,
          },
        });
        state.lastAutoUri = track.uri;
        if (opts.manual) {
          await playList(opts.list || [track], opts.index || 0);
          toast(`Video on ${screen ? screen.name : "TV"} · audio on Sonos`);
        }
      }
    } catch (err) {
      toast(err.message);
    }
  }

  // Auto-play the video for whatever just started, on the chosen screen.
  function maybeAutoVideo() {
    if (!state.autoVideo) return;
    const current = state.queue.current;
    if (!current || current.uri === state.lastAutoUri) return;
    state.lastAutoUri = current.uri;
    requestVideo(current, { muted: true });
  }

  function closeVideo() {
    $("#video-overlay").classList.add("hidden");
    $("#video-frame").src = "";
    state.videoTrack = null;
  }

  // Best effort "video on screen, audio in the room" for the iPad overlay.
  async function videoToSonos() {
    const t = state.videoTrack;
    if (!t) return;
    const frame = $("#video-frame");
    if (frame.src && !/[?&]mute=1/.test(frame.src)) {
      frame.src = `${frame.src}${frame.src.includes("?") ? "&" : "?"}mute=1`;
    }
    await playList([t], 0);
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
    $("#surprise-btn").addEventListener("click", surpriseMe);
    $("#playlist-play-btn").addEventListener("click", () => {
      if (state.playlist) playList(state.playlist.tracks, 0);
    });
    $("#playlist-shuffle-btn").addEventListener("click", () => {
      if (state.playlist) playList(state.playlist.tracks, 0, { shuffle: true });
    });
    $("#playlist-delete-btn").addEventListener("click", async () => {
      const p = state.playlist;
      if (!p || !p.hub) return;
      if (!confirm(`Delete “${p.name}”? The songs stay on Spotify.`)) return;
      try {
        await del(`/api/hub-playlists/${p.id}`);
        await loadShelves();
        showView("view-home");
        toast("Playlist deleted");
      } catch (err) {
        toast(err.message);
      }
    });
    $("#edit-groups-btn").addEventListener("click", () => {
      state.editGroups = !state.editGroups;
      $("#edit-groups-btn").textContent = state.editGroups ? "Done" : "Edit groups";
      renderZones();
    });
    $("#playpause-btn").addEventListener("click", transportPlayPause);
    $("#prev-btn").addEventListener("click", () => skip("prev"));
    $("#next-btn").addEventListener("click", () => skip("next"));
    $("#queue-btn").addEventListener("click", openQueueSheet);
    $("#queue-clear-btn").addEventListener("click", async () => {
      const g = activeGroup();
      if (!g) return;
      await post("/api/queue/clear", { groupId: g.id }).catch((e) => toast(e.message));
      await pollNow();
      renderQueueSheet();
    });
    $("#autoplay-toggle").addEventListener("change", async (e) => {
      const g = activeGroup();
      if (!g) return;
      state.queue = await post("/api/queue/options", {
        groupId: g.id,
        autoplay: e.target.checked,
      }).catch(() => state.queue);
    });
    $("#auto-video-toggle").checked = state.autoVideo;
    $("#auto-video-toggle").addEventListener("change", (e) => {
      state.autoVideo = e.target.checked;
      localStorage.setItem("ss-auto-video", state.autoVideo ? "1" : "0");
      if (state.autoVideo) {
        state.lastAutoUri = null;
        maybeAutoVideo();
      }
    });
    $("#video-close").addEventListener("click", closeVideo);
    $("#video-to-sonos").addEventListener("click", videoToSonos);
    $("#sheet-scrim").addEventListener("click", closeSheets);
    $("#sheet-add-queue").addEventListener("click", async () => {
      const g = activeGroup();
      const t = state.sheetTrack;
      if (!g || !t) return;
      try {
        state.queue = await post("/api/queue/add", { groupId: g.id, track: t });
        toast(`Queued “${t.name}”`);
        closeSheets();
        renderNow();
      } catch (err) {
        toast(err.message);
      }
    });
    $("#sheet-new-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#sheet-new-name").value.trim();
      const t = state.sheetTrack;
      if (!name || !t) return;
      try {
        const created = await post("/api/hub-playlists", { name });
        await post(`/api/hub-playlists/${created.id}/tracks`, { track: t });
        $("#sheet-new-name").value = "";
        toast(`Created “${name}” with “${t.name}”`);
        closeSheets();
        await loadShelves();
      } catch (err) {
        toast(err.message);
      }
    });
    $("#spotify-login-btn").addEventListener("click", async () => {
      try {
        const { url } = await api("/api/spotify/login");
        location.href = url;
      } catch (err) {
        toast(err.message);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeVideo();
        closeSheets();
      }
    });
    $("#screen-url").textContent = `${location.host}/screen`;
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
    await loadScreens();
    await loadZones().catch(() => renderZones());
  }

  init();
})();

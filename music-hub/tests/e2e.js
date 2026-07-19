// Soundstage end-to-end suite: boots the server in DEMO mode and drives the
// real frontend with Playwright at iPad landscape resolution — including the
// queue, hub playlists, playlist search, and a simulated TV screen.
//
// Usage: node tests/e2e.js
// Requires the repo's `playwright` devDependency and a Chromium binary —
// either Playwright's own download or CHROMIUM_PATH pointing at one.

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.PORT || 5641;
const BASE = `http://localhost:${PORT}/`;

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (err) {
  console.error("Playwright is not installed. Run: npm install (repo root)");
  process.exit(1);
}

function launchOptions() {
  const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return { executablePath: p };
  }
  return {};
}

const failures = [];
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  ok - ${name}`);
  } else {
    failures.push(name);
    console.error(`  FAIL - ${name}${detail ? ` (${detail})` : ""}`);
  }
}

async function waitForServer(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not come up`);
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ss-e2e-"));
  const serverProc = spawn(
    process.execPath,
    [path.join(__dirname, "..", "server", "index.js")],
    {
      env: { ...process.env, DEMO: "1", PORT: String(PORT), DATA_DIR: dataDir },
      stdio: "ignore",
    }
  );
  try {
    await waitForServer(`${BASE}api/status`);
    const browser = await chromium.launch(launchOptions());
    try {
      const page = await browser.newPage({
        viewport: { width: 1180, height: 820 }, // iPad Air landscape
      });
      await page.goto(BASE);
      await page.waitForSelector(".playlist-card");

      // ---- shelves ----
      console.log("shelves");
      check("demo pill shown", await page.isVisible("#demo-pill"));
      const mineCount = await page.locator("#shelf-mine .playlist-card").count();
      const curatedCount = await page
        .locator("#shelf-curated .playlist-card")
        .count();
      check("personal shelf renders", mineCount >= 4, `got ${mineCount}`);
      check("curated shelf renders", curatedCount >= 3, `got ${curatedCount}`);
      check("new-playlist card present", await page.isVisible("#new-playlist-card"));

      // ---- zones rail ----
      console.log("zones");
      await page.waitForSelector(".zone-card");
      const zoneCount = await page.locator(".zone-card").count();
      check("four zone groups listed", zoneCount === 4, `got ${zoneCount}`);
      check("first group selected by default", await page.isVisible(".zone-active"));
      check("screens section shows This iPad", await page.isVisible(".screen-row.screen-on"));

      // ---- playlist open + queue playback ----
      console.log("playback + queue");
      await page.click('#shelf-curated .playlist-card[data-playlist-id="demo-p-hits"]');
      await page.waitForSelector("#view-playlist:not(.hidden) .track-row");
      const trackCount = await page.locator("#track-list .track-row").count();
      check("playlist tracks render", trackCount === 6, `got ${trackCount}`);
      const firstName = await page.textContent(
        "#track-list .track-row:first-child .track-name"
      );
      const secondName = await page.textContent(
        "#track-list .track-row:nth-child(2) .track-name"
      );

      await page.click("#track-list .track-row:first-child .play-btn");
      await page.waitForSelector("#nowbar:not(.hidden)");
      check(
        "now playing shows the track",
        (await page.textContent("#now-title")) === firstName
      );
      check(
        "now playing names the zone",
        (await page.textContent("#now-zone-name")).includes("Living Room")
      );
      await page.waitForSelector("#queue-count:not(.hidden)");
      check(
        "queue badge counts the rest of the playlist",
        (await page.textContent("#queue-count")) === "5"
      );

      await page.click("#next-btn");
      await page.waitForFunction(
        (prev) => document.querySelector("#now-title").textContent !== prev,
        firstName
      );
      check(
        "next plays the next queued track in order",
        (await page.textContent("#now-title")) === secondName
      );

      await page.click("#playpause-btn");
      await page.waitForSelector("#icon-play:not(.hidden)");
      check("pause reflects in transport", true);
      await page.click("#playpause-btn");
      await page.waitForSelector("#icon-pause:not(.hidden)");

      // Queue sheet
      await page.click("#queue-btn");
      await page.waitForSelector("#queue-sheet.sheet-in .queue-row");
      const queueRows = await page.locator(".queue-row").count();
      check("queue sheet lists the playlist", queueRows === 6, `got ${queueRows}`);
      check(
        "current row highlighted",
        (await page.locator(".queue-now .track-name").textContent()) === secondName
      );
      check("autoplay toggle on by default", await page.isChecked("#autoplay-toggle"));
      await page.locator(".queue-row").nth(4).click();
      await page.waitForFunction(
        () => document.querySelectorAll(".queue-done").length === 4
      );
      check("tapping a queue row jumps playback", true);
      await page.click("#sheet-scrim");
      await page.waitForSelector("#queue-sheet", { state: "hidden" });

      // ---- hub playlist via track sheet ----
      console.log("hub playlists");
      await page.click("#track-list .track-row:first-child .more-btn");
      await page.waitForSelector("#track-sheet.sheet-in");
      await page.fill("#sheet-new-name", "Party Mix");
      await page.click("#sheet-new-form button[type=submit]");
      await page.waitForSelector("#track-sheet", { state: "hidden" });
      await page.waitForSelector('#shelf-mine .playlist-card[data-hub="1"]', {
        state: "attached", // home view is hidden while the playlist is open
      });
      check(
        "hub playlist appears on the shelf",
        (await page.textContent('#shelf-mine .playlist-card[data-hub="1"] .card-name')) ===
          "Party Mix"
      );

      // add a second song from the same list
      await page.click("#track-list .track-row:nth-child(3) .more-btn");
      await page.waitForSelector("#track-sheet.sheet-in .sheet-row[data-hub-id]");
      await page.click(".sheet-row[data-hub-id]");
      await page.waitForSelector("#track-sheet", { state: "hidden" });

      await page.click("#home-btn");
      await page.click('#shelf-mine .playlist-card[data-hub="1"]');
      await page.waitForSelector("#view-playlist:not(.hidden) .track-row");
      const hubTracks = await page.locator("#track-list .track-row").count();
      check("hub playlist holds both songs", hubTracks === 2, `got ${hubTracks}`);
      check("hub playlist shows delete", await page.isVisible("#playlist-delete-btn"));

      // shuffle-play the hub playlist
      await page.click("#playlist-shuffle-btn");
      await page.waitForFunction(() =>
        document.querySelector("#toast").textContent.includes("Shuffling")
      );
      check("shuffle play starts", true);

      // ---- search: songs + playlists ----
      console.log("search");
      await page.fill("#search-input", "chill");
      await page.press("#search-input", "Enter");
      await page.waitForSelector("#view-search:not(.hidden)");
      await page.waitForSelector("#search-playlists .playlist-card");
      check(
        "search returns playlists",
        (await page.textContent("#search-playlists .card-name")) === "Chill Hits"
      );
      await page.fill("#search-input", "Driftwood");
      await page.press("#search-input", "Enter");
      await page.waitForSelector("#search-results .track-row");
      check(
        "search returns songs",
        (await page.textContent("#search-results .track-name")).includes("Driftwood")
      );

      // ---- surprise me ----
      console.log("surprise");
      await page.click("#home-btn");
      await page.click("#surprise-btn");
      await page.waitForFunction(() =>
        document.querySelector("#toast").textContent.includes("Surprise")
      );
      check("surprise-me starts a shuffled playlist", true);

      // ---- TV screen ----
      console.log("tv screen");
      const tv = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await tv.goto(`${BASE}screen?name=Lounge%20TV`);
      await tv.waitForFunction(
        () => document.getElementById("screen-name").textContent === "Lounge TV"
      );
      check("tv registers with its name", true);

      await page.reload();
      await page.waitForSelector(".playlist-card");
      await page.waitForSelector('.screen-row[data-screen-id^="scr-"]');
      check(
        "tv appears in the screen picker",
        (await page.textContent('.screen-row[data-screen-id^="scr-"]')) === "Lounge TV"
      );
      await page.click('.screen-row[data-screen-id^="scr-"]');
      check(
        "tv can be selected as video target",
        await page.isVisible('.screen-row[data-screen-id^="scr-"].screen-on')
      );

      // Manual video → muted clip on the TV + song on Sonos
      await page.click('#shelf-curated .playlist-card[data-playlist-id="demo-p-hits"]');
      await page.waitForSelector("#view-playlist:not(.hidden) .track-row");
      await page.click("#track-list .track-row:first-child .video-btn");
      await tv.waitForFunction(() =>
        document.getElementById("player").classList.contains("on")
      );
      const tvSrc = await tv.getAttribute("#frame", "src");
      check(
        "tv shows the muted youtube embed",
        tvSrc.includes("youtube") && /[?&]mute=1/.test(tvSrc),
        tvSrc
      );
      check(
        "ipad overlay stays closed when tv is the target",
        await page.isHidden("#video-overlay")
      );
      await page.waitForFunction(
        (name) => document.querySelector("#now-title").textContent === name,
        firstName
      );
      check("song plays on sonos while tv shows video", true);

      // Auto-video: enable, skip to next track, tv should get a new command
      await page.check("#auto-video-toggle");
      await page.click("#next-btn");
      await tv.waitForFunction(
        (prev) => document.getElementById("frame").src !== prev,
        tvSrc
      );
      check("auto-video pushes the next track's clip", true);
      await tv.close();

      // Back to iPad target: overlay flow still works
      await page.click('.screen-row[data-screen-id="ipad"]');
      await page.uncheck("#auto-video-toggle");
      await page.click("#track-list .track-row:nth-child(2) .video-btn");
      await page.waitForSelector("#video-overlay:not(.hidden)");
      await page.waitForFunction(() =>
        document.querySelector("#video-frame").src.includes("youtube")
      );
      const frameSrc = await page.getAttribute("#video-frame", "src");
      check(
        "ipad video embed uses keyless search playlist",
        frameSrc.includes("listType=search") && frameSrc.includes("list="),
        frameSrc
      );
      await page.click("#video-to-sonos");
      await page.waitForFunction(() =>
        /[?&]mute=1/.test(document.querySelector("#video-frame").src)
      );
      check("audio-to-sonos mutes the embed", true);
      await page.click("#video-close");
      check("overlay closes", await page.isHidden("#video-overlay"));

      // ---- grouping ----
      console.log("grouping");
      await page.click("#edit-groups-btn");
      const officeCard = page.locator('.zone-card[data-group-id^="RINCON_DEMO_OFFICE"]');
      await officeCard.locator(".join-btn").click();
      await page.waitForFunction(
        () => document.querySelectorAll(".zone-card").length === 3
      );
      const zoneNames = await page
        .locator(".zone-card .zone-name")
        .allTextContents();
      check(
        "office joins the living room group",
        zoneNames.filter((n) => n === "Living Room + 2").length === 1,
        JSON.stringify(zoneNames)
      );
      const livingCard = page.locator(".zone-card", {
        has: page.locator('.zone-name:text-is("Living Room + 2")'),
      });
      await livingCard
        .locator('.member-row[data-player-id="RINCON_DEMO_OFFICE"] .ghost-btn')
        .click();
      await page.waitForFunction(
        () => document.querySelectorAll(".zone-card").length === 4
      );
      check("office removed back to standalone", true);
      await page.click("#edit-groups-btn");

      // ---- volume ----
      console.log("volume");
      const kitchenSlider = page.locator(
        '.member-row[data-player-id="RINCON_DEMO_KITCHEN"] .member-vol'
      );
      await kitchenSlider.evaluate((elm) => {
        elm.value = 61;
        elm.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.waitForTimeout(200);
      const volRes = await fetch(
        `${BASE}api/sonos/state?groupId=${encodeURIComponent("RINCON_DEMO_LIVING:g")}`
      ).then((r) => r.json());
      check(
        "kitchen volume persisted server-side",
        volRes.volumes.RINCON_DEMO_KITCHEN === 61,
        JSON.stringify(volRes.volumes)
      );

      // ---- setup panel appears when unconfigured (live mode) ----
      console.log("setup panel (live mode, no credentials)");
      const setupPort = Number(PORT) + 1;
      const liveProc = spawn(
        process.execPath,
        [path.join(__dirname, "..", "server", "index.js")],
        {
          env: {
            ...process.env,
            DEMO: "0",
            PORT: String(setupPort),
            DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "ss-live-")),
          },
          stdio: "ignore",
        }
      );
      try {
        await waitForServer(`http://localhost:${setupPort}/api/status`);
        const page2 = await browser.newPage({
          viewport: { width: 1180, height: 820 },
        });
        await page2.goto(`http://localhost:${setupPort}/`);
        await page2.waitForSelector("#view-setup:not(.hidden)");
        check("setup panel shown", await page2.isVisible("#spotify-login-btn"));
        check(
          "redirect uri displayed",
          (await page2.textContent("#setup-redirect")).includes("/api/spotify/callback")
        );
        await page2.close();
      } finally {
        liveProc.kill();
      }
    } finally {
      await browser.close();
    }
  } finally {
    serverProc.kill();
  }

  console.log(`\n${checks - failures.length}/${checks} checks passed`);
  if (failures.length) {
    console.error(`Failed: ${failures.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

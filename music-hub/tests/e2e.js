// Soundstage end-to-end suite: boots the server in DEMO mode and drives the
// real frontend with Playwright at iPad landscape resolution.
//
// Usage: node tests/e2e.js
// Requires the repo's `playwright` devDependency and a Chromium binary —
// either Playwright's own download or CHROMIUM_PATH pointing at one.

const { spawn } = require("child_process");
const fs = require("fs");
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
  const serverProc = spawn(
    process.execPath,
    [path.join(__dirname, "..", "server", "index.js")],
    { env: { ...process.env, DEMO: "1", PORT: String(PORT) }, stdio: "ignore" }
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
      check("personal shelf renders", mineCount >= 3, `got ${mineCount}`);
      check("curated shelf renders", curatedCount >= 3, `got ${curatedCount}`);

      // ---- zones rail ----
      console.log("zones");
      await page.waitForSelector(".zone-card");
      const zoneCount = await page.locator(".zone-card").count();
      check("four zone groups listed", zoneCount === 4, `got ${zoneCount}`);
      check(
        "living room group shows two rooms",
        (await page.locator(".zone-card", { hasText: "Living Room + 1" }).count()) === 1
      );
      check("first group selected by default", await page.isVisible(".zone-active"));

      // ---- playlist open + play ----
      console.log("playback");
      await page.click('#shelf-curated .playlist-card[data-playlist-id="demo-p-hits"]');
      await page.waitForSelector("#view-playlist:not(.hidden) .track-row");
      const trackCount = await page.locator("#track-list .track-row").count();
      check("playlist tracks render", trackCount === 6, `got ${trackCount}`);
      const firstName = await page.textContent(
        "#track-list .track-row:first-child .track-name"
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
      check(
        "play/pause shows pause icon",
        (await page.textContent("#playpause-btn")) === "⏸"
      );

      await page.click("#playpause-btn");
      await page.waitForFunction(
        () => document.querySelector("#playpause-btn").textContent === "▶"
      );
      check("pause reflects in transport", true);

      await page.click("#next-btn");
      await page.waitForFunction(
        (prev) => document.querySelector("#now-title").textContent !== prev,
        firstName
      );
      check(
        "next advances the track",
        (await page.textContent("#now-title")) !== firstName
      );

      // ---- video overlay ----
      console.log("video");
      await page.click("#track-list .track-row:nth-child(2) .video-btn");
      await page.waitForSelector("#video-overlay:not(.hidden)");
      await page.waitForFunction(() =>
        document.querySelector("#video-frame").src.includes("youtube")
      );
      const frameSrc = await page.getAttribute("#video-frame", "src");
      check(
        "video embed uses keyless search playlist",
        frameSrc.includes("listType=search") && frameSrc.includes("list="),
        frameSrc
      );
      check(
        "video search includes track query",
        decodeURIComponent(frameSrc).includes("official video")
      );
      await page.click("#video-to-sonos");
      await page.waitForFunction(() =>
        /[?&]mute=1/.test(document.querySelector("#video-frame").src)
      );
      check("audio-to-sonos mutes the embed", true);
      await page.click("#video-close");
      check("overlay closes", await page.isHidden("#video-overlay"));
      check(
        "closing clears the iframe",
        (await page.getAttribute("#video-frame", "src")) === ""
      );

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

      // ---- search ----
      console.log("search");
      await page.fill("#search-input", "Driftwood");
      await page.press("#search-input", "Enter");
      await page.waitForSelector("#view-search:not(.hidden) .track-row");
      check(
        "search finds the track",
        (await page.textContent("#search-results .track-name")).includes("Driftwood")
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
            DATA_DIR: fs.mkdtempSync(path.join(require("os").tmpdir(), "ss-")),
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

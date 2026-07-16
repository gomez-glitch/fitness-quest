// Move Quest end-to-end test suite.
//
// Usage: npm test  (builds dist/, serves it, drives it with Playwright)
// Requires the `playwright` devDependency (npm install) and a Chromium
// binary — either Playwright's own download or CHROMIUM_PATH pointing at one.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5199;
const BASE = `http://localhost:${PORT}/`;

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (err) {
  console.error("Playwright is not installed. Run: npm install");
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
    } catch (err) {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not come up`);
}

async function freshPage(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".tab-bar");
}

async function seedProfile(page, patch) {
  await page.evaluate((patch) => {
    const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
    Object.assign(d.profiles[d.activeProfileId], patch);
    localStorage.setItem("move-quest-progress-v3", JSON.stringify(d));
  }, patch);
  await page.reload();
  await page.waitForSelector(".tab-bar");
}

async function claimReps(page, exerciseId) {
  await page.click("#tab-play");
  await page.click(`.exercise-tile[data-exercise="${exerciseId}"]`);
  const target = Number(await page.textContent("#dial-target"));
  await page.focus("#rep-clicker");
  for (let i = 0; i < target; i++) await page.keyboard.press("ArrowUp");
  await page.click("#claim-xp-btn");
  await page.waitForTimeout(80);
  const levelUp = await page.$(".levelup-card");
  if (levelUp) await page.click('[data-action="close-levelup"]');
}

async function main() {
  const server = spawn("node", [path.join(__dirname, "..", "scripts", "dev-server.js"), "dist"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });

  let browser;
  try {
    await waitForServer(BASE);
    browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ viewport: { width: 420, height: 850 } });
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e.message)));

    await page.goto(BASE);
    await freshPage(page);

    console.log("# App shell");
    check("home tab visible, others hidden", await page.evaluate(() =>
      !document.getElementById("view-home").hidden &&
      document.getElementById("view-play").hidden));
    check("daily fact rendered", (await page.textContent("#hero-fact-text")).trim().length > 10);
    check("rank pill shows level 1", (await page.textContent("#hero-rank")).includes("Lv 1"));

    await page.goto(`${BASE}?tab=adventure`);
    await page.waitForSelector(".tab-bar");
    check("deep link opens requested tab", await page.evaluate(() =>
      !document.getElementById("view-adventure").hidden));
    await page.goto(BASE);
    await page.waitForSelector(".tab-bar");

    console.log("# Level curve & migration");
    await seedProfile(page, { xp: 400, curve: 2 });
    check("400 XP = level 3", (await page.textContent("#stat-level")) === "3");
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      const p = d.profiles[d.activeProfileId];
      p.xp = 850;
      delete p.curve;
      localStorage.setItem("move-quest-progress-v3", JSON.stringify(d));
    });
    await page.reload();
    await page.waitForSelector(".tab-bar");
    check("flat-curve migration keeps level 6", (await page.textContent("#stat-level")) === "6");
    check("migration tops XP to threshold", (await page.textContent("#stat-xp")) === "1750");

    console.log("# Scaled targets");
    await page.click("#tab-play");
    await page.click('.exercise-tile[data-exercise="squats"]');
    check("squats scale with level", (await page.textContent("#dial-target")) === "10");
    await page.click('.exercise-tile[data-exercise="push-ups"]');
    check("push-ups exempt from scaling", (await page.textContent("#dial-target")) === "3");

    console.log("# Rep clicker & claim");
    await freshPage(page);
    const xpBefore = Number(await page.textContent("#stat-xp"));
    await claimReps(page, "sit-ups");
    check("claim awards XP", Number(await page.textContent("#stat-xp")) === xpBefore + 35);
    check("counter resets after claim", (await page.textContent("#dial-count")) === "0");
    check("quest log has entry", (await page.$$(".quest-log-item")).length === 1);

    console.log("# Timed hold challenge");
    await page.click('.exercise-tile[data-exercise="flamingo-balance"]');
    check("timed hint shows tap to start", (await page.textContent("#clicker-hint")) === "tap to start");
    check("timed dial shows GO", (await page.textContent("#dial-count")) === "GO");
    const holdSeconds = Number((await page.textContent("#dial-target")).replace("s", ""));
    await page.click("#rep-clicker", { position: { x: 85, y: 85 } });
    await page.waitForTimeout(1200);
    check("get-ready phase runs first", (await page.textContent("#clicker-hint")) === "get ready…");
    // 3s ready lead-in + the hold itself + a little slack
    await page.waitForTimeout((holdSeconds + 3.5) * 1000);
    check("hold completes and is claimable", !(await page.$eval("#claim-xp-btn", (b) => b.disabled)));
    await page.click("#claim-xp-btn");
    await page.waitForTimeout(80);
    check("timed claim recorded", (await page.$$(".quest-log-item")).length === 2);

    console.log("# Energy taper");
    await freshPage(page);
    const xpGains = [];
    for (let i = 0; i < 7; i++) {
      const before = Number(await page.textContent("#stat-xp"));
      await claimReps(page, "sit-ups");
      xpGains.push(Number(await page.textContent("#stat-xp")) - before);
    }
    check("first 6 claims full XP", xpGains.slice(0, 6).every((g) => g === 35), xpGains.join(","));
    check("7th claim half XP", xpGains[6] === 18, String(xpGains[6]));

    console.log("# Adventure story flow");
    await freshPage(page);
    await page.click("#tab-adventure");
    await page.click('.adventure-preset[data-adventure="lava-volcano"]');
    await page.waitForSelector(".adventure-card");
    check("story line shown", (await page.textContent(".story-line")).includes("mountain"));
    for (let move = 0; move < 4; move++) {
      await page.waitForSelector('[data-action="plus"]');
      const targetTxt = await page.textContent(".adventure-count");
      const target = Number(targetTxt.split("/")[1]);
      for (let i = 0; i < target; i++) await page.click('[data-action="plus"]');
      await page.waitForTimeout(100);
      if (move < 3) await page.click('[data-action="skip-rest"]');
    }
    await page.waitForSelector(".adventure-trophy");
    check("celebration reached", true);
    await page.click('[data-action="close"]');
    await page.waitForTimeout(150);
    const heldLevelUp = await page.$(".levelup-card");
    check("level-up held until adventure closed", !!heldLevelUp);
    if (heldLevelUp) await page.click('[data-action="close-levelup"]');
    const advStats = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      return d.profiles[d.activeProfileId].stats.adventuresDone;
    });
    check("adventuresDone tracked", advStats === 1, String(advStats));

    console.log("# Library detail");
    await page.click("#tab-library");
    await page.click('.library-card[data-exercise="skater-hops"]');
    await page.waitForSelector("#detail-mascot svg");
    check("detail dialog opens with mascot", true);
    await page.click('[data-action="try"]');
    check("try-it-now lands on play", await page.evaluate(() => !document.getElementById("view-play").hidden));

    console.log("# Badges");
    await seedProfile(page, {
      xp: 2500, streak: 7, reps: 600,
      stats: { tried: [], groups: { Legs: 5, Core: 5, Arms: 5, "Whole body": 5 }, todayDate: null, todayCount: 0, bestDay: 5, bestStreak: 7, timedDone: 5, adventuresDone: 3 },
    });
    await page.click("#tab-awards");
    const earned = (await page.$$(".badge:not(.locked)")).length;
    const total = (await page.$$(".badge")).length;
    check("badge case has 21 badges", total === 21, String(total));
    check("seeded state earns 18 badges", earned === 18, String(earned));

    console.log("# Hygiene");
    check("no page errors", pageErrors.length === 0, pageErrors.join(" | "));
  } finally {
    if (browser) await browser.close();
    server.kill();
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

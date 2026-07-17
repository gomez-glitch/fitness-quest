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
  const target = Number(await page.textContent("#view-play .dial-target-val"));
  await page.focus("#view-play .clicker");
  for (let i = 0; i < target; i++) await page.keyboard.press("ArrowUp");
  await page.click("#claim-xp-btn");
  await page.waitForTimeout(80);
  const discovery = await page.$(".discovery-card");
  if (discovery) await page.click('[data-action="close-discovery"]');
  await page.waitForTimeout(60);
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

    console.log("# Home pager");
    check("home has 5 swipe panels", (await page.$$(".home-panel")).length === 5);
    check("pager dots present", (await page.$$(".home-dot")).length === 5);
    check("energy meter renders", (await page.textContent("#energy-mood")).length > 5);
    await page.click('.home-dot[data-panel="4"]');
    await page.waitForTimeout(700);
    const panelIdx = await page.evaluate(() =>
      Math.round(document.getElementById("home-pager").scrollLeft / document.getElementById("home-pager").clientWidth));
    check("dot navigation reaches spinner panel", panelIdx === 4, String(panelIdx));

    console.log("# Spark's Corner (pet)");
    await page.evaluate(() => { window.__MQ_TEST_FORCE_NAP = false; }); // no surprise naps mid-test
    await page.click('.home-dot[data-panel="1"]');
    await page.waitForTimeout(700);
    check("pet mascot lives on its panel", !!(await page.$("#pet-stage svg")));
    check("pet speech bubble talks", (await page.textContent("#pet-bubble")).trim().length > 3);
    await page.click("#pet-scene");
    await page.waitForTimeout(300);
    const boops = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      return d.profiles[d.activeProfileId].stats.boops;
    });
    check("boop is counted", boops === 1, String(boops));
    check("boop stat shown", (await page.textContent("#pet-stats")).includes("Booped 1"));

    console.log("# Tamagotchi: snacks & naps");
    check("snack tray offers 12 foods", (await page.$$("#pet-tray .pet-food")).length === 12);
    await page.waitForTimeout(1300); // let the boop reaction finish (busy flag)
    await page.click('#pet-tray .pet-food[data-food="apple"]');
    await page.waitForTimeout(400);
    const petState = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      return d.profiles[d.activeProfileId].pet;
    });
    check("feeding fills tummy and counts the meal", petState.meals === 1 && petState.tummy > 60,
      JSON.stringify(petState));
    check("meal stat shown", (await page.textContent("#pet-stats")).includes("1 snack"));
    await page.waitForTimeout(2600); // let the munch sequence finish
    await page.evaluate(() => { window.__MQ_TEST_FORCE_NAP = true; });
    await page.waitForTimeout(7400); // behaviour tick fires every 7s
    check("Spark takes a nap (zzz visible)", await page.evaluate(() =>
      !document.getElementById("pet-zzz").hidden));
    await page.evaluate(() => { window.__MQ_TEST_FORCE_NAP = false; });
    await page.click("#pet-scene");
    await page.waitForTimeout(200);
    check("boop wakes Spark gently", (await page.textContent("#pet-bubble")).includes("yaw"));
    await page.waitForTimeout(1600); // let the wake-up finish

    await page.click('.home-dot[data-panel="0"]');
    await page.waitForTimeout(500);
    await page.click('.home-dot[data-panel="0"]');
    await page.waitForTimeout(700);

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
    check("squats scale with level", (await page.textContent("#view-play .dial-target-val")) === "12");
    await page.click('.exercise-tile[data-exercise="push-ups"]');
    check("push-ups exempt from scaling", (await page.textContent("#view-play .dial-target-val")) === "3");

    console.log("# Rep clicker & claim");
    await freshPage(page);
    const xpBefore = Number(await page.textContent("#stat-xp"));
    await claimReps(page, "sit-ups");
    check("claim awards XP", Number(await page.textContent("#stat-xp")) === xpBefore + 35);
    check("counter resets after claim", (await page.textContent("#view-play .dial-count")) === "0");
    check("quest log has entry", (await page.$$(".quest-log-item")).length === 1);

    console.log("# Timed hold challenge");
    await page.click('.exercise-tile[data-exercise="flamingo-balance"]');
    check("timed hint shows tap to start", (await page.textContent("#view-play .clicker-hint")) === "tap to start");
    check("timed dial shows GO", (await page.textContent("#view-play .dial-count")) === "GO");
    const holdSeconds = Number((await page.textContent("#view-play .dial-target-val")).replace("s", ""));
    await page.click("#view-play .clicker", { position: { x: 85, y: 85 } });
    await page.waitForTimeout(1200);
    check("get-ready phase runs first", (await page.textContent("#view-play .clicker-hint")) === "get ready…");
    // 3s ready lead-in + the hold itself + a little slack
    await page.waitForTimeout((holdSeconds + 3.5) * 1000);
    check("hold completes and is claimable", !(await page.$eval("#claim-xp-btn", (b) => b.disabled)));
    await page.click("#claim-xp-btn");
    await page.waitForTimeout(80);
    check("timed claim recorded", (await page.$$(".quest-log-item")).length === 2);

    console.log("# Stretch & calm");
    await page.click('.exercise-tile[data-exercise="cobra"]');
    check("stretch hold shows GO dial", (await page.textContent("#view-play .dial-count")) === "GO");
    check("stretch target label", (await page.textContent("#view-play .dial-target-val")) === "20s");
    await page.click("#tab-adventure");
    check("sunset stretch adventure listed", !!(await page.$('.adventure-preset[data-adventure="sunset-stretch"]')));
    await page.click("#tab-play");

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
    check("adventure uses the rotating dial", !!(await page.$(".adventure-card .clicker")));
    for (let move = 0; move < 4; move++) {
      await page.waitForSelector(".adventure-card .clicker");
      const target = Number(await page.textContent(".adventure-card .dial-target-val"));
      for (let i = 0; i < target; i++) {
        await page.click(".adventure-card .clicker", { position: { x: 75, y: 75 } });
      }
      await page.waitForTimeout(900); // completion advances after a short beat
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

    console.log("# Intensity filter");
    await page.click("#tab-play");
    await page.click('.filter-chip[data-filter-intensity="3"]');
    check("spicy filter shows 6 moves", (await page.$$("#exercise-board .exercise-tile")).length === 6,
      String((await page.$$("#exercise-board .exercise-tile")).length));
    await page.click('.filter-chip[data-filter-intensity="1"]');
    check("easy filter shows 18 moves", (await page.$$("#exercise-board .exercise-tile")).length === 18,
      String((await page.$$("#exercise-board .exercise-tile")).length));
    await page.click('.filter-chip[data-filter-intensity="All"]');
    check("all levels shows 43 moves", (await page.$$("#exercise-board .exercise-tile")).length === 43,
      String((await page.$$("#exercise-board .exercise-tile")).length));
    await page.click('.filter-chip[data-filter-group="Stretch"]');
    check("stretch group shows 10 moves", (await page.$$("#exercise-board .exercise-tile")).length === 10,
      String((await page.$$("#exercise-board .exercise-tile")).length));
    await page.click('.filter-chip[data-filter-group="All"]');

    console.log("# Mystery Spinner");
    await freshPage(page);
    await page.click("#spin-btn");
    await page.waitForTimeout(3800);
    const spinState = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      return d.profiles[d.activeProfileId].daily.spin;
    });
    check("spin stores a result", spinState && typeof spinState.exerciseId === "string");
    check("second spin blocked", await page.$eval("#spin-btn", (b) => b.disabled));
    // Seed a double-XP prize on sit-ups and claim it
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      const p = d.profiles[d.activeProfileId];
      p.daily.spin = { exerciseId: "sit-ups", modifier: "double-xp", claimed: false };
      localStorage.setItem("move-quest-progress-v3", JSON.stringify(d));
    });
    await page.reload();
    await page.waitForSelector(".tab-bar");
    const xpBeforeSpin = Number(await page.textContent("#stat-xp"));
    await claimReps(page, "sit-ups");
    check("double-XP prize pays 70", Number(await page.textContent("#stat-xp")) - xpBeforeSpin === 70,
      String(Number(await page.textContent("#stat-xp")) - xpBeforeSpin));

    console.log("# Dance Party");
    await freshPage(page);
    await page.evaluate(() => { window.__MQ_TEST_DANCE_SECONDS = 3; });
    await page.click("#tab-adventure");
    await page.click("#dance-btn");
    await page.waitForSelector(".dance-card");
    check("dance overlay opens with countdown", (await page.textContent("#dance-countdown")) === "3");
    await page.waitForSelector(".adventure-trophy", { timeout: 8000 });
    check("dance finishes with reward screen", true);
    await page.click('[data-action="dance-close"]');
    check("dance awards XP", (await page.textContent("#stat-xp")) === "45");
    await page.click("#tab-awards");
    const danceLog = await page.textContent(".quest-log-item .quest-log-meta");
    check("dance logged in seconds", danceLog.includes("seconds"), danceLog.trim());

    console.log("# Spark's Journey");
    await freshPage(page);
    await page.click("#tab-adventure");
    check("journey map renders 36 nodes", (await page.$$("#journey-map .journey-node, #journey-map circle.journey-node")).length >= 36,
      String((await page.$$("#journey-map circle.journey-node, #journey-map g.journey-node")).length));
    check("journey status at start", (await page.textContent("#journey-status")).includes("Sunny Meadows"));
    await claimReps(page, "sit-ups");
    const journeyStep = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      return d.profiles[d.activeProfileId].stats.journey;
    });
    check("completion advances the journey", journeyStep === 1, String(journeyStep));

    // Zone crossing: seed to step 5, one more claim crosses into Lava Volcano
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      const p = d.profiles[d.activeProfileId];
      p.stats.journey = 5;
      p.stats.seenJourney = 5;
      localStorage.setItem("move-quest-progress-v3", JSON.stringify(d));
    });
    await page.reload();
    await page.waitForSelector(".tab-bar");
    await page.click("#tab-play");
    await page.click('.exercise-tile[data-exercise="sit-ups"]');
    const zt = Number(await page.textContent("#view-play .dial-target-val"));
    await page.focus("#view-play .clicker");
    for (let i = 0; i < zt; i++) await page.keyboard.press("ArrowUp");
    await page.click("#claim-xp-btn");
    await page.waitForSelector(".discovery-card");
    check("zone crossing shows discovery screen",
      (await page.textContent(".discovery-card .levelup-heading")).includes("Lava Volcano"));
    check("discovery shows zone scenery", !!(await page.$("#discovery-scene svg")));
    await page.click('[data-action="close-discovery"]');
    check("discovery closes", await page.$eval("#discovery-overlay", (e) => e.hidden));

    // Hop animation: visiting the map animates and updates seenJourney
    await page.click("#tab-adventure");
    await page.waitForTimeout(1500);
    const seenAfter = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("move-quest-progress-v3"));
      return d.profiles[d.activeProfileId].stats.seenJourney;
    });
    check("map visit records hop progress", seenAfter === 6, String(seenAfter));

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

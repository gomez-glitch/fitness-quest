# Move Quest

A playful, kid-friendly fitness adventure game for the browser. Kids pick a hero
persona, nickname, and avatar, then take on short exercise challenges — tapping a
circular rep dial as they go — to earn XP, level up, build daily streaks, unlock
badges, and look back at their quest history.

Move Quest feels like a movement adventure, not a serious workout tracker: bright
colors, big buttons, and encouraging, positive language throughout.

## Features

- Installable PWA: a web app manifest plus an offline-first service worker
  means Move Quest can be added to a phone or tablet home screen and works
  fully offline after the first visit
- Level-up celebrations: crossing a level triggers a full-screen confetti
  moment, and heroes earn evolving titles (Rookie Mover → Quest Explorer →
  Fitness Hero → Mighty Champion → Move Quest Legend) with an avatar ring that
  upgrades from bronze to silver, gold, and rainbow
- App-style shell: a fixed bottom tab bar (Home / Play / Adventure / Library /
  Awards) keeps every screen short, and long card sets (exercise picker, move
  library, badge case) are swipeable horizontal snap rows
- Swipeable Home: five full-screen panels (Welcome + daily fact → Spark's
  Corner → My Hero with stats → Today's quests + weekly chart → a super-sized
  Mystery Spinner) with snap paging and dot navigation
- Spark's Corner, a full tamagotchi home for the mascot: Spark lives in a
  scene that shifts with the real time of day (sunny day → sunset → starry
  night with a nightcap), his mood follows the energy meter, and he chats in
  a speech bubble about streaks, quests, and snacks. Booping him spins a
  reaction roulette — tickle giggles, high fives, a dance break with its own
  mini groove, a jump for joy with a rising "whee!", a muscle flex, or super
  mode, each with matching sounds, lines, and emoji bursts. Rare rolls
  (~1 in 17) land a sparkly sneeze or a case of the hiccups; night boops
  lean cosy and stretchy while morning boops are extra bouncy; and three
  quick boops in a row unlock a boop party that leaves Spark spiral-eyed
  and dizzy. A spinning 3D snack wheel holds 12 foods — it idles with a slow
  show-off spin, drag it to whirl with momentum, and tapping a food swings it
  round to the front and feeds his tummy meter (which slowly empties over
  real hours): he munches with a chomp animation and sound, occasionally
  burps ("…excuse me! 🤭"), politely refuses food when full, and hides a
  secret favourite food each day per hero — find it for a jackpot celebration.
  Sometimes he simply lies down for a nap (more likely when sleepy); booping
  a napping Spark wakes him gently with a yawn
- Spark's energy meter: a colorful bar that fills with today's activity and
  drains on quiet days, with mood messages ("Spark is SUPERCHARGED!" /
  "Spark is sleepy — let's move!")
- Multiple hero profiles (up to 4) so siblings can play side by side, each with
  their own XP, streaks, badges, and quest history — tucked into a collapsible
  drawer once a hero is picked, with hero customization nested inside it as a
  sub-drawer
- Daily Quests: three featured moves picked fresh each day (same picks on every
  device), with a +40 XP bonus chest for finishing all three
- Adventure mode: story-driven guided workouts (Lava Volcano Escape, Deep Sea
  Dive, Space Station Rescue, Jungle Jamboree, the calm Sunset Stretch, or a
  surprise mix) — every move carries a
  narrative line, chains open with a warm-up, halfway cheer bubbles pop up,
  and a combo-bonus celebration ends the quest
- 22 badges and 52 rotating daily fun facts
- A last-7-days activity chart on the dashboard with best-day and
  longest-streak callouts
- Hero customization: nickname, persona, and avatar, saved to the browser
- 59 short kid-friendly exercises with muscle-group AND intensity filters
  (🌱 Easy / ⚡ Steady / 🔥 Spicy), including four timed "hold" challenges
  (wall sit, plank hold, flamingo balance, farmer hold) with a GO → 3-2-1
  get-ready lead-in and automatic countdown, small-free-weight moves
  (curls, presses, wing raises, rows, farmer hold) marked with 🏋️, and an
  eight-move foam roller set (calf/thigh/hamstring rolls, back massage roll,
  superhero side roll, foot wake-up, rolling bridge, roller reach-over)
  marked with 🛞 — gentle timed rolls with calm music, breathing cues, and
  a blue roller drawn into each animation — plus an eight-move Animal pack
  with its own 🐾 filter group (bunny hops, bear crawl, crab walk, frog hops,
  inchworm, duck waddle, cheetah sprint, kangaroo jumps) and an Animal Antics
  badge
- Spark, an articulated mascot with real elbow and knee joints, demonstrates
  each exercise with anatomically-faithful looping animation in the active
  quest card (side or front view, whichever reads best per move)
- One shared rotating clicker dial in both the Play panel and Adventure mode:
  tap it or spin it like a tally counter, with a ratcheting notched ring,
  springy feedback, and optional sounds
- Synthesized sound effects (rep tick, target chime, XP fanfare, badge jingle)
  via the Web Audio API — no audio files — with a persistent mute toggle
- A voice coach (browser speech synthesis, no assets): counts down the last
  five seconds of holds, calls "Ready? 3, 2, 1, Go!", cheers at halfway, and
  celebrates finishes, rests, quest completions, and level-ups — silenced by
  the same mute toggle
- Progress dashboard: level, XP, streak, and total reps, with a level-up progress bar
- Balanced progression: a quadratic level curve (level n costs 50×(n²−1) total
  XP) keeps early levels quick and later ones earned; rep targets grow +1 per
  2 levels (capped at 2× base, push ups exempt); and an "energy" system pays
  full XP for the first 6 claims each day, then half, then a quarter — a
  gentle nudge to rest and come back tomorrow
- Daily streak tracking (based on local calendar dates)
- 22 badges: XP milestones, streaks, daily goals, variety/explorer, levels,
  holds, adventures, and animal moves
- Move library of illustrated cards for every exercise
- Quest log of the most recent completed challenges
- Per-hero "reset progress" (with confirmation) that keeps the hero's identity

## Testing

```bash
npm install
npm test
```

`npm test` builds `dist/`, serves it locally, and drives the real app with
Playwright: level curve and migration, the shared clicker dial and claim flow,
a full timed hold with its get-ready lead-in, the energy taper, a complete
story adventure, intensity filters, the library detail dialog, and badge
unlocks. Set `CHROMIUM_PATH` if Playwright's own browser download isn't
available.

## Tech

Move Quest is a static, dependency-free app: plain HTML, CSS, and JavaScript, with
progress saved in `localStorage`. There is no backend, database, authentication, or
external API — it works entirely offline once loaded.

## Local development

```bash
npm install
npm run dev
```

This serves the project root (not a build) at `http://localhost:5173/` — useful
while editing `index.html`, `src/app.js`, or `src/styles.css` directly.

## Production build

```bash
npm run build
npm run preview
```

`npm run build` copies `index.html` and `src/` into a `dist/` folder. `npm run
preview` serves that `dist/` folder at `http://localhost:5173/` so you can check
exactly what will be deployed.

Run `npm run lint` to syntax-check all the project's JavaScript files.

## Deploying to GitHub Pages

A GitHub Actions workflow at `.github/workflows/deploy.yml` builds the app and
deploys the `dist/` folder to GitHub Pages on every push to `main` (or via manual
workflow dispatch).

All asset references in `index.html` use **relative paths**
(`./src/styles.css`, `./src/app.js`) rather than root-relative paths, so the app
works correctly when served from a subpath such as:

```
https://<owner>.github.io/move-quest/
```

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — modules, data model, economy, conventions
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — prioritized backlog and ideas shelf
- [`docs/ART.md`](docs/ART.md) — art pipeline: specs and copy-paste image-generation prompts

## Project structure

```
index.html                    Page shell
src/app.js                    App logic, state, and rendering
src/mascot.js                 Articulated Spark mascot (FK motion engine)
src/clicker.js                Shared rotating clicker dial component
src/sound.js                  Web Audio sound effects
src/voice.js                  Speech-synthesis voice coach
src/styles.css                Design system and styles
tests/e2e.js                  Playwright end-to-end suite (npm test)
scripts/build.js              Builds dist/
scripts/dev-server.js         Dependency-free static file server
manifest.webmanifest, sw.js   PWA install + offline support
.github/workflows/deploy.yml  GitHub Pages deployment workflow
```

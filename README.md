# Move Quest

A playful, kid-friendly fitness adventure game for the browser. Kids pick a hero
persona, nickname, and avatar, then take on short exercise challenges — tapping a
circular rep dial as they go — to earn XP, level up, build daily streaks, unlock
badges, and look back at their quest history.

Move Quest feels like a movement adventure, not a serious workout tracker: bright
colors, big buttons, and encouraging, positive language throughout.

## Features

- Multiple hero profiles (up to 4) so siblings can play side by side, each with
  their own XP, streaks, badges, and quest history
- Hero customization: nickname, persona, and avatar, saved to the browser
- 16 short kid-friendly exercises with a muscle-group filter (Core / Arms /
  Legs / Whole body)
- Spark, an articulated mascot with real elbow and knee joints, demonstrates
  each exercise with anatomically-faithful looping animation in the active
  quest card (side or front view, whichever reads best per move)
- A rotating clicker-style rep counter: tap it or spin it like a tally counter,
  with a ratcheting notched ring, springy feedback, and optional sounds
- Synthesized sound effects (rep tick, target chime, XP fanfare, badge jingle)
  via the Web Audio API — no audio files — with a persistent mute toggle
- Progress dashboard: level, XP, streak, and total reps, with a level-up progress bar
- Daily streak tracking (based on local calendar dates)
- 15 badges: XP milestones, streaks, daily goals, variety/explorer, and levels
- Move library of illustrated cards for every exercise
- Quest log of the most recent completed challenges
- Per-hero "reset progress" (with confirmation) that keeps the hero's identity

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

## Project structure

```
index.html                    Page shell
src/app.js                    App logic, state, and rendering
src/styles.css                Design system and styles
scripts/build.js              Builds dist/
scripts/dev-server.js         Dependency-free static file server
.github/workflows/deploy.yml  GitHub Pages deployment workflow
```

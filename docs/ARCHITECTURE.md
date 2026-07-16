# Move Quest — architecture

A static, dependency-free PWA: plain HTML/CSS/JS modules, localStorage
persistence, deployed to GitHub Pages by CI on every push to `main`.

## Modules

| File | Responsibility |
|---|---|
| `index.html` | App shell: 5 tab views (Home / Play / Adventure / Library / Awards), overlays, bottom tab bar. All asset paths are **relative** (GitHub Pages subpath). |
| `src/app.js` | Everything stateful: storage + migrations, profiles, exercises data, XP/levels/streaks/energy, badges, daily quests, spinner, dance party, adventure engine, journey wiring, rendering, and event handlers. |
| `src/mascot.js` | Spark, the articulated mascot: an SVG skeleton posed by forward kinematics from per-exercise joint-angle keyframes (`MOTIONS`). `createMascot` animates via rAF; `renderStaticMascot` draws poster poses. |
| `src/clicker.js` | The shared rotating dial: tap/spin rep counting, and the GO → 3-2-1 → countdown engine for timed holds. Used by both the Play panel and Adventure mode via `createClicker(container, {onChange, onComplete})`. |
| `src/journey.js` | The world-map campaign: six hand-drawn SVG zones, a 36-node serpentine path, Spark token. `renderJourneyMap(container, steps)`. |
| `src/sound.js` | Web Audio synthesized SFX (tick/beep/chime/fanfare/badge/thump) + the persistent mute flag. |
| `src/voice.js` | Speech-synthesis voice coach (countdowns, encouragement, celebrations). Honours the sound mute flag. |
| `sw.js` | Network-first service worker with precached shell → full offline support. Bump `CACHE_NAME` when precache list changes. |
| `manifest.webmanifest` | PWA install: icons, shortcuts (deep links `./?tab=...`), standalone display. |
| `scripts/build.js` | Copies the shell into `dist/` (no bundler). |
| `scripts/dev-server.js` | Zero-dependency static file server (`npm run dev` / `preview`). |
| `tests/e2e.js` | Playwright end-to-end suite (`npm test`), 40+ checks. |

## Data model (localStorage)

Key `move-quest-progress-v3`:

```
{
  activeProfileId,
  profiles: {
    [id]: {
      xp, streak, reps, lastCompletedDate,
      completed: [ {id,title,icon,date,xp,reps,unit} ],   // last 12
      counters: { [exerciseId]: reps },
      profile: { nickname, persona, avatar },
      stats: { tried[], groups{}, todayDate, todayCount,
               bestDay, bestStreak, timedDone, adventuresDone, journey },
      daily: { date, done[], bonusClaimed, spin },
      days: { [yyyy-mm-dd]: {xp, reps} },                  // pruned to 14d
      curve: 2
    }
  }
}
```

Migrations: v2 (single-profile) auto-wraps into the first v3 profile; the
`curve` flag tops XP up so the old flat level curve never demotes anyone.
`normalizeProfile()` defensively re-shapes everything on load — never trust
stored data.

## Game economy

- Level thresholds: `50 × (level² − 1)` total XP.
- Rep targets: +1 per 2 levels (holds +2s per level), capped at 2× base;
  push-ups exempt. Spinner "half-reps" prize halves today's spun move.
- Energy: first 6 claims/day full XP, next 4 half, then quarter.
- `awardCompletion(exercise, reps)` is the single completion pipeline —
  everything (claims, adventures, dance) goes through it. Pseudo-moves
  (no `group`) are supported.

## Conventions

- No external requests of any kind (fonts, CDNs, images). Repo-local files
  only.
- Every feature lands with e2e checks in `tests/e2e.js`.
- `npm run lint` = `node --check` on every JS file; run before commits.
- Sounds/voice must respect the mute flag; animation must respect
  `prefers-reduced-motion`.
- Kid-facing copy: positive, playful, never guilt-based.

## Workflow

```
npm install      # once (installs the playwright devDependency)
npm run dev      # serve source at :5173
npm test         # build + full Playwright suite
```

Deploys: push to `main` → `.github/workflows/deploy.yml` builds and
publishes `dist/` to GitHub Pages (installs with `--omit=dev`).

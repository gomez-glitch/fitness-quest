# Move Quest — architecture

A static, dependency-free PWA: plain HTML/CSS/JS modules, localStorage
persistence, deployed to GitHub Pages by CI on every push to `main`.

## Modules

| File | Responsibility |
|---|---|
| `index.html` | App shell: 5 tab views (Home / Play / Adventure / Library / Awards), overlays, bottom tab bar. All asset paths are **relative** (GitHub Pages subpath). |
| `src/app.js` | Everything stateful: storage + migrations, profiles, exercises data, XP/levels/streaks/energy, badges, daily quests, spinner, dance party, adventure engine, journey wiring, Spark's Corner (pet moods, boop roulette, feeding, naps, costumes), home pager, rendering, and event handlers. ~3,300 lines — see `RETROSPECTIVE.md` §7. |
| `src/mascot.js` | Spark, the articulated mascot: an SVG skeleton posed by forward kinematics from per-exercise joint-angle keyframes (`MOTIONS`). `createMascot` animates via rAF; `renderStaticMascot` draws poster poses. |
| `src/clicker.js` | The shared rotating dial: tap/spin rep counting, and the GO → 3-2-1 → countdown engine for timed holds. Used by both the Play panel and Adventure mode via `createClicker(container, {onChange, onComplete})`. |
| `src/journey.js` | The world-map campaign: six hand-drawn SVG zones, a 36-node serpentine path, Spark token. `renderJourneyMap(container, steps)`. |
| `src/sound.js` | Web Audio engine. `sfx` + `music` gain buses → master compressor. Every note carries an attack envelope, ±10 cents detune and velocity jitter; FM bells for chime/fanfare/badge, filtered-noise transients for ticks/claps, pitch-dropping kick for the dance thump. All tones sit in C-major pentatonic, and `progressTick(ratio)` climbs that scale toward the rep target. `setChannel()` gates sfx/music/voice (persisted); `duck()` dips music while the coach speaks. |
| `src/voice.js` | Expressive speech-synthesis coach. Ranks installed voices (premium/neural first, joke voices like Zarvox excluded, local preferred) and picks the best; `setProfile(id)` gives each hero a continuous pitch/pace fingerprint; mood presets (`excited` / `calm` / `count`) shape delivery. Honours mute and the `voice` channel. |
| `sw.js` | Network-first service worker with precached shell → full offline support. Bump `CACHE_NAME` when precache list changes. |
| `manifest.webmanifest` | PWA install: icons, shortcuts (deep links `./?tab=...`), standalone display. |
| `scripts/build.js` | Copies the shell into `dist/` (no bundler). |
| `scripts/dev-server.js` | Zero-dependency static file server (`npm run dev` / `preview`). |
| `tests/e2e.js` | Playwright end-to-end suite (`npm test`), 75 checks. Test hooks: `__MQ_TEST_FREEZE_TRAY`, `__MQ_TEST_NO_TWEEN`, `__MQ_TEST_FORCE_NAP`, `__MQ_TEST_DANCE_SECONDS`. |

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
      stats: { tried[], groups{}, todayDate, todayCount, bestDay, bestStreak,
               timedDone, adventuresDone, journey, seenJourney, boops },
      pet: { tummy, tummyAt, meals, favDate, costume:{id,date} },
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
- Daily quests are date-seeded *and* balanced: one easy rep move, exactly one
  timed hold, one rep wildcard, never two from the same muscle group.
- `awardCompletion(exercise, reps)` is the single completion pipeline —
  everything (claims, adventures, dance) goes through it. Pseudo-moves
  (no `group`) are supported.

## Conventions

- No external requests of any kind (fonts, CDNs, images). Repo-local files
  only.
- Every feature lands with e2e checks in `tests/e2e.js`.
- `npm run lint` = `node --check` on every JS file; run before commits.
- Sounds/voice must respect the mute flag and their mixer channel; animation
  must respect `prefers-reduced-motion`.
- Icons: line-art SVG is **chrome only** (the tab bar). Content icons —
  exercises, badges, foods, spinner, avatars — are always colour emoji, and
  their containers declare an emoji-first font stack so no text font can
  substitute a monochrome glyph. Ambiguous characters (⚡, ⏰) carry U+FE0F.
- Kid-facing copy: positive, playful, never guilt-based. Exclamation marks are
  earned — reserved for Spark's speech and celebrations, not instructions.

## Workflow

```
npm install      # once (installs the playwright devDependency)
npm run dev      # serve source at :5173
npm test         # build + full Playwright suite
```

Deploys: push to `main` → `.github/workflows/deploy.yml` runs lint + the full
Playwright suite first; build and Pages publish only run if that job passes, so
a broken push can't reach a child's iPad. Bump `CACHE_NAME` in `sw.js` on every
user-visible change or installed devices keep the old shell.

## Further reading

- `BACKLOG.md` — prioritised work, shipped items kept for reference.
- `RETROSPECTIVE.md` — what we'd do differently starting over, and why.
- `ART.md` — image-generation prompts and file specs for painted art.

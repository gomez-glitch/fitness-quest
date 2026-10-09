# Move Quest — backlog

Living list, roughly priority-ordered. Move items up/down freely.

See `RETROSPECTIVE.md` for the "what we'd do differently" review that produced
items 2 and 3 below.

## Next up

1. **Protection pack** (⏸️ PAUSED — parked by request 2026-07-18; still the
   highest-value unbuilt item now that progress is precious):
   - Export/import saves ("Save my heroes" downloads a small file or shows a
     copyable code; import restores). Guards against cleared browser data,
     iOS storage eviction, and device switches.
   - Grown-up gate: a small arithmetic question before Reset progress and
     Remove hero, so siblings can't wipe each other.
   - Streak shield: earn one per active week; auto-spends to protect one
     missed day (Duolingo-style kindness).
2. **Local activity log** (from the retrospective — we design blind today).
   A local-only event log: exercise started / completed / abandoned, session
   length, time of day, panel visited. Stored in localStorage, never sent
   anywhere, exportable as CSV from the (future) grown-up area. Answers the
   questions we currently guess at: are the roller moves ever used? does she
   abandon 30s holds, and at what second? is the spinner a daily ritual?
   Roughly an afternoon of work; pairs naturally with the protection pack's
   export plumbing.
3. **Economy simulator** (from the retrospective — the 850-XP incident should
   not have needed a live child to surface). Pull the level curve, target
   scaling and energy taper into a pure `economy.js`, then a harness that
   simulates "20 minutes a day for 90 days" and prints level, targets and XP
   per session. Unit-test the curve and the daily quest picker (never two
   holds, never two same-group) while the logic is out in the open. Tells us
   what level 30 feels like *before* the 10-year-old gets there.
4. **Painted art integration** — prompts delivered ✅ (done); images being
   generated now. Once PNGs land in `art/` (see `ART.md`): layer paintings
   under the journey map path, adventure cards, hero banner, dance overlay,
   and level-up screen, with SVG fallback when a file is missing. Update the
   service-worker precache list.
5. **World expansion: zones 7–19** — NOT in the live build (by design).
   Ship as staged content drops so the app keeps feeling new:
   - **Live today:** zones 1–6 (through Rainbow Castle), 36 steps.
   - **Drop A — "Beneath the Castle":** Glow Crystal Caves, Dino Jungle,
     Bubblegum Canyon (zones 7–9).
   - **Drop B — "Into the Sky":** Firefly Forest, Frozen Wonderland,
     Cloud Kingdom, Moon Base (zones 10–13).
   - **Drop C — "The Strange Lands"** (older-kid drop): Upside-Down Land,
     Neon Cyber City, Dragon Peaks (zones 14–16).
   - **Drop D — "The Final Frontier":** Shipwreck Cove, Glitch Dimension,
     Galaxy Gardens finale (zones 17–19).
   Each drop: new zone-crossing voice lines, painted backgrounds from the
   ready-made prompts in `ART.md`, SVG fallback scenery per zone. Heroes
   already past the old finale roll their lap progress into the new lands.
6. **Stretch & Calm pack** ✅ SHIPPED — 10 poses live as a "Stretch" group
   with calm generative music, breathing cues, and the Sunset Stretch
   adventure. Original spec kept below for reference:
   - **Downward Dog** 🐕 (30s) — hands and feet down, hips high in a
     mountain shape. Side-view FK pose: inverted V.
   - **Cobra** 🐍 (20s) — lie on tummy, press chest up, look ahead.
     Side-view: prone with lifted torso arc.
   - **Child's Pose** 🧸 (30s) — kneel, fold forward, arms long. The rest
     pose — great adventure-ender.
   - **Tree Pose** 🌳 (20s/side) — one foot to the other leg, arms grow up
     like branches (Flamingo's calmer big sibling).
   - **Butterfly Stretch** 🦋 (25s) — seated, soles of feet together,
     knees flutter gently like wings.
   - **Star Pose** ⭐ (20s) — stand wide in a big X and shine.
   - **Brave Warrior** 🗡️ (20s/side) — strong lunge, arms reaching front
     and back, gaze forward.
   - **Sleepy Sloth Fold** 🦥 (25s) — stand and dangle forward, arms heavy,
     knees soft.
   - **Frog Pose** 🐸 (20s) — low squat hold, elbows inside knees, hips say
     hello.
   - **Cat-Cow** 🐱 (8 slow reps, not a hold) — on all fours, arch up like a
     scared cat, dip down like a happy cow. Lovely alternating FK animation.
   Extras that make it sing:
   - New **"Stretch" group filter** alongside Core/Arms/Legs/Whole body.
   - **Breathing cues in holds**: for stretch-mode holds the voice coach
     says "breathe in… breathe out…" every ~4 seconds instead of ticks.
   - **"Sunset Stretch" adventure**: a calm 3-pose wind-down chain (softer
     voice, no beat) — the bedtime counterpart to Morning Spark; opens with
     Sky Reach, ends in Child's Pose.
   - Warm-up tie-in: Marching + Arm Circles + two stretches could form an
     auto-suggested warm-up row at the top of Play.
7. **Foam roller set** ✅ SHIPPED — all eight moves live as 20–30s timed
   items in the Stretch group with a 🛞 roller gear marker, calm music +
   breathing cues, and a blue end-on roller drawn into each FK animation.
   Original spec kept below for reference:
   - **Calf Rollers** (30s) — sit, roller under calves, roll ankle-to-knee.
   - **Thigh Rollers** (30s) — face down, roller under thighs, slow rolls.
   - **Hamstring Rollers** (30s) — seated, roller under the backs of legs.
   - **Back Massage Roll** (30s) — lie back, roller under upper back,
     gentle up-and-down "massage machine".
   - **Superhero Side Roll** (20s/side) — roller under the side, arm
     stretched long like flying.
   - **Foot Wake-Up** (20s/foot) — standing, roll the sole of one foot
     (hold a wall!).
   - **Rolling Bridge** (20s) — bridge hold with feet resting on the roller
     (older kids — balance spice).
   - **Roller Reach-Over** (20s) — kneel, roller ahead, roll it away and
     reach into a long stretch.
   Safety copy: "roll slowly", "skip anything that hurts", "grown-up nearby".
8. **Animal Moves pack** ✅ SHIPPED — eight moves in their own "Animal"
   filter group (Bunny Hops, Bear Crawl, Crab Walk, Frog Hops, Inchworm,
   Duck Waddle, Cheetah Sprint, Kangaroo Jumps), Animal Antics 🐾 badge,
   Jungle Jamboree 🦁 adventure, bunny/frog moves added to Dance Party and
   Spark's idle show-off pool, and fancy-dress tie-in: each animal move
   dresses Spark in that costume for the day (8 costume accessories on the
   mascot, costume beats nightcap/crown, bragging bubble lines). (Idea sparked by reviewing the
   exercises-dataset repo — built natively, no external assets.)
9. **Stand Tall pack** ✅ SHIPPED — eight shoulder/upper-back/chest moves in
   their own "Stand Tall" group for young screen users, a Proud Peacock 🦚
   badge, and the calm Tall Tower Reset 🗼 adventure. Two constraints set by
   the user and worth preserving: **purely self-directed** (no reminders, no
   timers, no Spark slumping to prompt anyone — the app never raises posture
   unprompted) and **no neck work at all** (shoulders, upper back and chest
   only). The `tall-tower-check` motion carries the teaching: it starts
   slumped and grows tall against a wall, so nothing has to be said out loud.
10. **Documentation upkeep** — keep `ARCHITECTURE.md` current as modules are
   added; add a CONTRIBUTING-style note if anyone else joins the project.

## Audio roadmap (phases 2 and 4 remain)

- **Phase 2 — the living world** (planned, not built): generative ambience in
  Spark's Corner (birdsong by day, crickets at night), a real 4-bar dance
  groove with bass/hats/stabs, and per-zone adventure music themes (volcano
  rumbles, deep-sea plucks, airy space fifths). The bus architecture and
  ducking from phase 1 are the foundation for all of it.
- **Phase 4 — recorded audio** (not recommended): vendored CC0 packs or
  recorded voice clips would raise the ceiling but break the zero-asset,
  fully-offline philosophy and add licensing weight. Revisit only if phases
  1-3 leave something wanting.

## Ideas shelf

- **Magic Counting** — devicemotion/accelerometer auto-counts jumps for
  jumping jacks / high knees / butt kicks; falls back to the dial. Needs an
  iOS permission tap.
- **Weekly Boss Battle** — deterministic weekly boss with an HP bar; every
  rep from every hero on the device deals damage; beat it by Sunday for a
  boss badge + bonus chest.
- **Spark is alive** ✅ SHIPPED (and upgraded to a full tamagotchi) —
  Spark's Corner home panel: time-of-day scene, mood-driven idle animations,
  a boop reaction roulette (tickle / high five / dance break / jump for joy /
  flex / super mode + triple-boop party, rare sneeze & hiccup rolls,
  post-party dizzy spiral eyes, cosy night boops and bouncy morning boops),
  speech bubbles, a spinning 3D snack wheel + tummy meter with real-time hunger,
  a daily secret favourite food mini-game, comedy burps, and naps with a
  gentle boop-to-wake. Energy stays exercise-driven; food is pure fun
  (never sad/sick, treats always welcome).
- **Copy-me game** — Spark demonstrates a move in his corner ("Can YOU do
  3 star jumps?") and a boop confirms you did it, earning a heart.
- **Catch-me mode** — Spark scoots left/right across his scene and you have
  to boop the moving target.
- **Boop milestones** — the boop counter earns tiny titles at 50/100/500
  ("Boop Buddy" → "Boop Master" → "Boop Legend") shown in the stats line.
- **Tablet / landscape layout** — two-column grids on wide screens (Play:
  board left + quest card right; Home panels side by side); currently
  everything is portrait-phone stretched.
- **Sound mixer UI** — the three channels (effects / music / voice) are
  built and persist via `sound.setChannel()`; all that's left is the
  settings UI to expose them (today only the global mute is wired up).
- **Per-hero voice** ✅ SHIPPED — each profile gets a continuous, deterministic
  pitch/pace fingerprint, plus best-installed-voice selection and mood prosody.
- **Split app.js into modules** — ~3,300 lines now; carve out pet.js,
  spinner.js, adventure.js, state.js for faster, safer future work.
- **Trophy share cards** — canvas-generated celebration card (avatar, rank,
  stat) shared via the Web Share API on level-ups and boss kills.
- **Secret moves** — hidden exercises unlocked by feats ("all three holds in
  one day unlocks Crab Walk"); mystery "???" silhouette cards in the library.
- **Custom adventure builder** — kids assemble and name their own 3–5 move
  chains, saved alongside the presets.
- **Weekly challenge card** — "This week: 3 Spicy moves + 1 adventure",
  refreshes Mondays, earns a rotating badge.
- **Sibling team goal** — a shared weekly XP bar all heroes feed.
- **Seasonal themes** — month-driven decorations and seasonal badges
  (October pumpkins, December snow). Date-based, no server.
- **iOS splash screens** — ~12 device-specific PNGs for a polished install
  launch flash.
- **Fact collection ("Brain Gems")** — tapping the daily fact adds it to a
  collectible album.
- **Screen wake-lock** during adventures/holds so phones don't dim mid-plank.
- **Adaptive/seated exercise variants** for accessibility.

## Engineering debt / hygiene

- CI: run `npm test` in GitHub Actions on push (needs a Playwright browser
  install step in the workflow).
- Consider splitting `src/app.js` (~1,900 lines) into feature modules
  (profiles, badges, adventure, spinner/dance) now that patterns are stable.
- Periodic check of `sw.js` precache list vs. actual shipped files.

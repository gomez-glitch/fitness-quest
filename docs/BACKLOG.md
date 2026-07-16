# Move Quest — backlog

Living list, roughly priority-ordered. Move items up/down freely.

## Next up

1. **Protection pack** — the highest-value unbuilt item now that progress is
   precious:
   - Export/import saves ("Save my heroes" downloads a small file or shows a
     copyable code; import restores). Guards against cleared browser data,
     iOS storage eviction, and device switches.
   - Grown-up gate: a small arithmetic question before Reset progress and
     Remove hero, so siblings can't wipe each other.
   - Streak shield: earn one per active week; auto-spends to protect one
     missed day (Duolingo-style kindness).
2. **Painted art integration** — prompts delivered ✅ (done); images being
   generated now. Once PNGs land in `art/` (see `ART.md`): layer paintings
   under the journey map path, adventure cards, hero banner, dance overlay,
   and level-up screen, with SVG fallback when a file is missing. Update the
   service-worker precache list.
3. **World expansion: zones 7–19** — extend Spark's Journey past the Rainbow
   Castle with thirteen new lands: Glow Crystal Caves, Dino Jungle, Bubblegum
   Canyon, Firefly Forest, Frozen Wonderland, Cloud Kingdom, Moon Base,
   Upside-Down Land, Neon Cyber City (older kids), Dragon Peaks (older
   kids), Shipwreck Cove, the Glitch Dimension (older kids), and the Galaxy
   Gardens finale. 36 → 114 steps, new zone-crossing voice lines, painted
   backgrounds from the ready-made prompts in `ART.md`, SVG fallback scenery
   per zone.
4. **Documentation upkeep** — keep `ARCHITECTURE.md` current as modules are
   added; add a CONTRIBUTING-style note if anyone else joins the project.

## Ideas shelf

- **Magic Counting** — devicemotion/accelerometer auto-counts jumps for
  jumping jacks / high knees / butt kicks; falls back to the dial. Needs an
  iOS permission tap.
- **Weekly Boss Battle** — deterministic weekly boss with an HP bar; every
  rep from every hero on the device deals damage; beat it by Sunday for a
  boss badge + bonus chest.
- **Spark is alive** — tamagotchi-lite: exercise feeds Spark's energy; a
  quiet few days makes Spark sleepy (never sad/sick). Home-screen idle
  animations driven by the energy level.
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

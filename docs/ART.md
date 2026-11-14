# Art pipeline

Move Quest ships with hand-drawn inline SVG scenery (zero external assets).
This document is the upgrade path to richer painted artwork.

## How to add art

1. Generate images with any AI image tool (or commission/licence them).
2. On GitHub: **Add file → Upload files**, create the `art/` folder by naming
   files `art/<name>.png`, and commit.
3. Ask Claude to integrate — the app will layer the paintings under the
   existing paths/UI, falling back to the built-in SVG when a file is missing.

Only local repo files are allowed. Never hotlink external image URLs.

## Status

| Asset | State |
|---|---|
| `zone-1` … `zone-6` | ✅ shipped (2026-11-14) — 1080×720 WebP, 295 KB total |
| `adventure-<id>` × 7 | ✅ shipped (2026-11-14) — 256×256 WebP discs, 76 KB total |
| hero banner, dance, celebration | not started |
| `zone-7` … `zone-9` (Drop A) | ✅ shipped (2026-11-14) — caves 63 KB, jungle 109 KB (q85), canyon 67 KB |
| `zone-10`, `zone-11` (Drop E) | ✅ shipped (2026-11-14) — puppy 86 KB, water park 81 KB (q85) |
| expansion zones 10–19 | not started (staged drops, see BACKLOG) |

## Generation pipeline (proven on all six zones)

How the pilot was actually produced — follow this for the remaining assets.

1. **Generate** with the Figma connector's `generate_image` into the working
   file *Move Quest — zone art*: the shared style block + the asset prompt +
   the zone suffix below, at **1536×1024** (native 3:2). Model
   `gpt-image-2.5-flare`. Each call spends Figma AI credits.
2. **Retrieve.** The returned `image.url` lives on `www.figma.com`, which the
   cloud session's network does not allow. Instead call `get_screenshot` on
   the image's node with `maxDimension: 1536` and `enableBase64Response:
   true`; the full-resolution PNG comes back through the connector and is
   saved to disk.
3. **Resize** to the spec size (zones: **1080×720**, exactly 3× the 360×240
   zone, so crisp on retina) with ImageMagick, flattening alpha:
   `convert src.png -background "#e9e6fb" -alpha remove -alpha off
   -filter Lanczos -resize 1080x720! -strip ref.png`
4. **Encode WebP with ffmpeg, not ImageMagick.** ImageMagick's WebP encoder
   here silently ignores `-quality` (q75/q82/q88 produced byte-identical
   files). Use:
   `ffmpeg -i ref.png -c:v libwebp -quality 90 -compression_level 6
   -preset drawing art/<name>.webp`
   q90 is the sweet spot for this art: the meadow is **39 KB at 40.8 dB
   PSNR**, with no banding in the sky gradient at 2× zoom. q95 adds 46% for
   +0.6 dB.
5. **Wire it in** by adding the path to `ZONE_ART` in `src/journey.js`. The
   image layers over that zone's SVG painter, so a failed load falls back to
   the hand-drawn scenery with no JS. `scripts/build.js` copies `art/` into
   `dist/`, and a test fetches every listed file to prove it ships.

Don't ship a partial set: a painted zone beside flat SVG zones makes the
flat ones look noticeably worse than they did on their own.

### Lessons from producing the set

- **Keep a set consistent with words.** Figma's generator takes no reference
  image, so zones 2–6 carried this extra line after the style block, which
  describes the accepted meadow pilot. All five matched on the first try:
  > Match a soft pastel painterly storybook look: gentle airbrushed
  > gradients, soft hazy glow, rounded friendly shapes, and a soft misty fade
  > along the bottom edge.
- **Measure the seams, don't eyeball them.** Average the top and bottom
  40px rows of each image (`convert … -crop 1536x40+0+0 -resize 1x1!`) and
  compare each zone's top with the next zone's bottom. Five seams were
  pastel against pastel. Space's top stayed deep indigo (`#5243DC`) against
  the castle's near-white bottom (`#F4E8FC`), even though the prompt asked
  for a soft top edge.
- **Fix edges in post, not with credits.** Space got an eased haze over its
  top 120px in the castle's bottom tone (`#F4E8FC`, `gradient:white-black
  -evaluate pow 1.7` as the opacity mask). That moved its top edge to
  `#D6CAF6`, and it reads as rising out of mist, matching every other
  image's misty bottom edge. Free and deterministic, where a regeneration
  is neither.
- **Use `contentsOnly: true` when retrieving** once several image frames
  share the canvas; otherwise an overlapping frame can bleed into the
  render.

### Drop A zones (shipped)

- **Ask for pale edges explicitly when the subject is dark.** The caves
  prompt below was tightened to "soft violet rock walls framing the left
  and right sides … light and luminous", with a closing line asking that
  "the very top and very bottom rows should be pale, not dark rock". The
  result matched the castle on the first try: castle top `#F4E2F8`, caves
  bottom `#F5E2FC`. No haze pass was needed this time.
- **Measured seams:** caves top `#F0D8F9` / jungle bottom `#F6E9F6`, and
  jungle top `#F5EDF8` / canyon bottom `#FEF1EC`. The canyon's top is the
  top of the map.
- **Dense foliage costs bytes.** The jungle was 143 KB at q90 (35.3 dB), so
  it ships at q85: 109 KB at 34.6 dB, and no visible difference behind the
  path.
- **Clip the fallback, overlap the painting.** The first map render showed a
  green band over the caves and a pink blob over the jungle: the new SVG
  painters' hills and river caps reached past their zone, and the painting
  only covers its own zone. Each zone's SVG now draws into a nested `<svg>`
  that clips to the zone. That clipping left an anti-aliased hairline on
  the seam, where the half-covered row let the scenery underneath show
  through. The painting now sits outside the clip and overlaps each edge
  by one unit.

### Adventure card badges (shipped)

Seven square badges, one per adventure, generated at 1024×1024 with the
badge style block below. Every one landed on the first try.

- **Badge style block.** It is the shared style block, minus "background
  illustration" and "clear open space through the middle", plus the
  consistency line (without the misty bottom edge) and this framing line:
  > A single bold emblem centred on a softly glowing pastel circular
  > backdrop that fills most of the square; keep everything important
  > inside the central circle and nothing in the corners. Bold, simple and
  > readable at small size. Square 1:1.
- **Emblems used.** Volcano with a lava glow and smoke ring; cresting wave
  with bubbles; rocket with a star trail; a golden paw print framed by
  tropical leaves and hibiscus (Jungle Jamboree: no animals, per the style
  block); an upright fairytale tower in the clouds (Tall Tower Reset, where
  "upright" carries the quiet posture cue); a sunset with a crescent moon;
  and a glowing gift box with no question mark.
- **Crop to the disc, let CSS round it.** The generator draws the disc at a
  slightly different size each time (radius 338–364 px at 768). Each one
  was cropped to its own disc, inset a few pixels past the soft rim, resized
  to 256×256, and encoded at q90. The card applies `border-radius: 50%`, so
  no alpha channel is needed and all seven discs line up exactly.
- **Small images cap out near 32 dB PSNR, whatever the quality setting**:
  q90, q95 and q100 all scored 31.6–32.2 dB on the jungle badge. WebP's
  half-resolution colour sets the ceiling, not compression, so judge the
  result by eye on a contact sheet rather than chasing the number.
- **Fallback.** The emoji sits under each painting, and a failed load removes
  the `<img>` so it shows through. A test forces a 404 on purpose to check
  this.

## File spec

| File | Content | Aspect | Min size |
|---|---|---|---|
| `art/zone-1-meadow.png` | Sunny Meadows zone | 3:2 landscape | 1080×720 |
| `art/zone-2-volcano.png` | Lava Volcano zone | 3:2 landscape | 1080×720 |
| `art/zone-3-sea.png` | Deep Sea zone | 3:2 landscape | 1080×720 |
| `art/zone-4-mountains.png` | Crystal Mountains zone | 3:2 landscape | 1080×720 |
| `art/zone-5-space.png` | Outer Space zone | 3:2 landscape | 1080×720 |
| `art/zone-6-castle.png` | Rainbow Castle zone | 3:2 landscape | 1080×720 |
| `art/hero-banner.png` | Home hero backdrop | 16:9 | 1600×900 |
| `art/adventure-<id>.webp` | Adventure card badge (one per `ADVENTURES` id) | 1:1 disc | 256×256 shipped |
| `art/dance-party.png` | Dance overlay backdrop | 4:5 portrait | 1024×1280 |
| `art/celebration.png` | Level-up backdrop | 1:1 | 1024×1024 |
| `art/app-icon.png` | Painted app icon | 1:1 | 1024×1024 |
| `art/zone-7-caves.png` … `art/zone-19-galaxy.png` | Expansion zones (backlog) | 3:2 landscape | 1080×720 |

PNG or JPG (PNG preferred). Keep each file under ~400 KB if possible
(export at 80–85% quality) — the whole app currently weighs ~200 KB, and
the service worker precaches everything for offline use.

## Copy-paste prompts

**Status: prompt set below delivered ✅ — zone-1 generated as the pilot (see Status above).**
Future-zone prompts (world expansion, zones 7–14) are at the bottom, ready
for the next generation session.

### Shared style block — prepend to every prompt

> Children's mobile app background illustration, flat vector storybook style,
> soft rounded shapes, gentle gradients, thick clean edges, bright and
> cheerful. Colour palette: violet #7c3aed, pink #ec4899, lavender #ede9fe,
> warm yellow #fde68a, cream #fff7ed. Uncluttered composition with clear
> open space through the middle for UI overlay. No characters, no creatures,
> no people, no text, no letters, no logos, no watermark.

### Zone backgrounds (add: "landscape 3:2. Soften the top and bottom edges
toward a plain sky tone so tiles blend when stacked vertically.")

1. **zone-1-meadow** — "A sunny springtime meadow: rolling mint-green hills,
   a big friendly sun, scattered daisies and tulips, one round fluffy tree,
   puffy clouds, tiny butterflies as simple shapes."
2. **zone-2-volcano** — "A playful volcano landscape at golden hour: one big
   cartoon volcano with a gentle red-orange lava glow at the crater and one
   thin lava stream, puffy smoke rings, warm orange sky, dark rocky foreground
   with rounded boulders. Cosy, not scary."
3. **zone-3-sea** — "A magical underwater scene: layered blue water with soft
   light rays from above, gentle white wave bands, rising bubbles, swaying
   seaweed silhouettes at the edges, a hint of a sandy floor with a treasure
   chest silhouette."
4. **zone-4-mountains** — "Majestic crystal mountains: two or three tall
   purple peaks with white snow caps, small glowing gem clusters at their
   feet, wispy clouds around the summits, pale lavender sky."
5. **zone-5-space** — "Friendly outer space: deep indigo-violet sky full of
   tiny stars, one large ringed planet in orange and gold, a small crescent
   moon, soft nebula swirls in pink and purple."
6. **zone-6-castle** — "A rainbow castle finale: a pink fairytale castle with
   pointed turrets and flags, a full six-colour rainbow arching over it, soft
   pink clouds, sparkles in the air, pale rose sky. Triumphant and warm."

### Other assets

7. **hero-banner** — Style block + "A wide celebratory banner scene: sunrise
   gradient from violet to pink to warm yellow, silhouette hills at the
   bottom, floating confetti shapes and gentle sparkles, energetic and
   welcoming. Landscape 16:9. Keep the central third calm and uncluttered
   for overlaid text."
8. **adventure-volcano / adventure-sea / adventure-space** — Style block +
   "A square adventure badge illustration of [a cartoon volcano with a lava
   glow / a cresting ocean wave with bubbles / a launching rocket with a
   star trail], centred like an emblem, bold and readable at small size.
   Square 1:1."
9. **adventure-surprise** — Style block + "A square adventure badge
   illustration of a mystery gift box with a large question mark shape and
   sparkles bursting out, centred like an emblem. Square 1:1."
10. **dance-party** — Style block + "A disco dance floor scene: checkered
    glowing floor in purple and pink, a shiny disco ball with light beams,
    floating music-note shapes, confetti, dark violet background so bright
    UI pops. Portrait 4:5. Keep the centre clear."
11. **celebration** — Style block + "A burst of celebration: radiating sun
    rays in violet and pink from the centre, confetti, stars and sparkles
    around the edges, the very centre left calm and empty. Square 1:1."
12. **app-icon** — "A friendly round violet blob mascot face for a kids'
    fitness app icon: big happy eyes, a wide smile, one tiny yellow
    lightning-bolt tuft on top of its head, on a diagonal violet-to-pink
    gradient background, flat vector style, bold and readable at small
    sizes, centred, no text. Square 1:1."

## Future zones — world expansion (backlog, prompts ready)

The journey continues past the Rainbow Castle. Same rules: prepend the shared
style block, add *"Landscape 3:2. Soften the top and bottom edges toward a
plain sky tone so tiles blend when stacked vertically."* File names continue
the series.

13. **zone-7-caves** ✅ shipped (underground) — "A magical underground
    crystal cave: soft violet rock walls framing the left and right sides,
    clusters of glowing pink and turquoise crystals, softly glowing round
    mushrooms along the floor, gentle light shafts from an opening above,
    sparkling mineral dust in the air. Cosy and wonder-filled, light and
    luminous, not dark or scary." Edge line used: *"Soften the top and
    bottom edges toward a plain pale pink-lavender mist so tiles blend when
    stacked vertically; the very top and very bottom rows should be pale,
    not dark rock."*
14. **zone-8-jungle** ✅ shipped (with "No dinosaurs or animals shown, only their footprints.") — "A friendly dinosaur-age jungle: giant ferns and
    rounded prehistoric leaves in layered greens, a smoking volcano far in
    the background, big cartoon dinosaur footprints pressed into a mud path,
    hanging vines, warm dappled light."
15. **zone-9-canyon** ✅ shipped — "A playful bubblegum canyon: rounded rock towers in
    pastel pink and lavender stripes, giant swirly lollipop-shaped rock
    formations, a winding bubblegum-pink river, floating bubbles, soft peach
    sky."
16. **zone-10-forest** — "An enchanted firefly forest at dusk: giant friendly
    mushroom-trees with glowing spots, deep teal and violet foliage, dozens
    of warm floating firefly lights, a winding mossy path, magical and calm."
17. **zone-11-ice** — "A frozen wonderland: smooth ice hills in pale blue and
    white, sparkling icicles, a frozen lake reflecting colour, gentle falling
    snowflakes, a soft green-and-purple aurora ribbon across the sky."
18. **zone-12-clouds** — "A kingdom in the clouds: bouncy rounded cloud
    platforms in white and pale pink, short rainbow bridges connecting them,
    golden sunbeams, tiny floating islands with grass tufts, dreamy pastel
    sky."
19. **zone-13-moon** — "A cheerful moon base: pale grey moon surface with
    round craters, glowing glass dome habitats in violet and pink, a planted
    flag shape, Earth rising small and blue in the starry sky, footprint
    trails in the moon dust."
20. **zone-14-upside** — "An upside-down land: a mirrored world where a
    second grassy ground hangs from the sky with houses and round trees
    dangling downward, waterfalls flowing upward, floating rocks drifting
    between the two grounds, doorways at funny angles. Dreamlike, silly,
    and wonder-filled."
21. **zone-15-neon** (older kids) — "A synthwave neon city at night: dark
    indigo skyline of rounded skyscrapers with glowing violet and pink neon
    edges, a shining grid road fading to the horizon, floating holographic
    rings and arrows, a big low retro sun striped pink and gold. Cool,
    energetic, arcade-like."
22. **zone-16-dragon** (older kids) — "Dragon peaks at dusk: jagged
    dark-violet mountain spires wrapped in mist, a giant cliff-side nest
    holding three glowing golden eggs, dragon-shaped rock silhouettes,
    scorch marks and drifting embers, torch-lit stone steps winding up the
    tallest peak. Epic but friendly."
23. **zone-17-pirate** — "A shipwreck treasure cove: a tilted cartoon pirate
    ship half-beached on golden sand, an open treasure chest spilling glowing
    coins, palm trees, a rope bridge to a small lookout rock shaped like a
    skull (smiling, not scary), turquoise lagoon water, sunset sky."
24. **zone-18-glitch** (older kids) — "The glitch dimension: a playful
    video-game world breaking apart — floating pixel cubes and voxel blocks,
    checkerboard ground tearing into stripes of static, rainbow scan-lines,
    chunks of landscape hovering at odd angles, a big friendly 8-bit style
    sun. Digital, mischievous, exciting."
25. **zone-19-galaxy** — "Galaxy gardens, a cosmic finale: swirling nebula
    beds in pink, violet and gold arranged like flower gardens, small planets
    budding on curving light stems, shooting stars, deep indigo space behind.
    Magical, triumphant, endlessly playful."

Drop E, requested by the kids. It shipped as zones 10–11, ahead of B–D;
later drops take the next free numbers.

26. **zone-10-puppy** ✅ shipped: "Puppy Land" 🐶. **The one exception to
    the no-creatures rule**, by request: the style block's last line
    becomes "No people, no text, no letters, no logos, no watermark."
    Prompt: "A cheerful puppy playland: a sunny grassy park with rounded
    hedges, colourful doghouses with pointed roofs, giant cartoon bones,
    bouncy tennis balls, a paw-print trail winding through, fluffy clouds.
    Three or four adorable round cartoon puppies with floppy ears and big
    happy eyes play around the left and right edges: one chasing a ball,
    one peeking out of a doghouse, one leaping for a frisbee in mid-air,
    one rolling in the grass. Keep the puppies near the sides and the
    middle of the scene open. Playful, sweet and bright." Edge line: *"…
    toward a plain pale cream-lavender mist …; the very top and very
    bottom rows should be pale."* "Keep them near the sides" worked first
    time, so the path runs over open grass. Cheer: "Woof woof! Who wants to
    play fetch?"
27. **zone-11-waterpark** ✅ shipped: "Splash Water Park" 💦. "A sunny
    water park: twisting water slides in pink, violet and yellow curving
    down at the left and right sides, sparkling turquoise splash pools,
    fountains spraying arcs of water, floating rubber rings, a big tipping
    splash bucket on a tower, palm trees, water droplets glittering in the
    sun. Fun and refreshing, with nobody in the water." Cheer: "Splash!
    Last one down the slide is a soggy noodle!"

Measured seams: canyon top `#FDF0E9` / puppy bottom `#FAEFF1`, and puppy
top `#FAEEF2` / water park bottom `#F6EEFD`. Both images were pale at the
edges as asked, so neither needed a haze pass.

Each drop grows the map by six steps per zone (zones 1–11 are live today,
66 steps). The lap system and the hero migration (`migrateMap()`) carry
over automatically.

## Tips for consistent results

- Generate all six zones in ONE session/chat so the tool keeps the style.
- If a tool adds text or creatures, append: "absolutely no letters or words
  anywhere in the image".
- Ask for 2–3 variants per prompt and pick the most on-palette one.
- Keep the same seed (Midjourney: `--seed`) or reference the first accepted
  image ("in the same style as this") for the rest of the set.

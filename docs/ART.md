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
| `art/adventure-volcano.png` | Adventure card | 1:1 | 768×768 |
| `art/adventure-sea.png` | Adventure card | 1:1 | 768×768 |
| `art/adventure-space.png` | Adventure card | 1:1 | 768×768 |
| `art/adventure-surprise.png` | Adventure card | 1:1 | 768×768 |
| `art/dance-party.png` | Dance overlay backdrop | 4:5 portrait | 1024×1280 |
| `art/celebration.png` | Level-up backdrop | 1:1 | 1024×1024 |
| `art/app-icon.png` | Painted app icon | 1:1 | 1024×1024 |
| `art/zone-7-caves.png` … `art/zone-19-galaxy.png` | Expansion zones (backlog) | 3:2 landscape | 1080×720 |

PNG or JPG (PNG preferred). Keep each file under ~400 KB if possible
(export at 80–85% quality) — the whole app currently weighs ~200 KB, and
the service worker precaches everything for offline use.

## Copy-paste prompts

**Status: prompt set below delivered ✅ (done) — first images being generated.**
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

13. **zone-7-caves** (underground) — "A magical underground crystal cave:
    deep violet rock walls, clusters of glowing pink and turquoise crystals,
    softly glowing round mushrooms along the floor, gentle light shafts from
    a hole above, sparkling mineral dust in the air. Cosy and wonder-filled,
    not dark or scary."
14. **zone-8-jungle** — "A friendly dinosaur-age jungle: giant ferns and
    rounded prehistoric leaves in layered greens, a smoking volcano far in
    the background, big cartoon dinosaur footprints pressed into a mud path,
    hanging vines, warm dappled light."
15. **zone-9-canyon** — "A playful bubblegum canyon: rounded rock towers in
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

When these land in `art/`, the map grows from 6 to 19 zones (36 → 114 steps)
and the lap system carries over automatically.

## Tips for consistent results

- Generate all six zones in ONE session/chat so the tool keeps the style.
- If a tool adds text or creatures, append: "absolutely no letters or words
  anywhere in the image".
- Ask for 2–3 variants per prompt and pick the most on-palette one.
- Keep the same seed (Midjourney: `--seed`) or reference the first accepted
  image ("in the same style as this") for the rest of the set.

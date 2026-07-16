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

PNG or JPG (PNG preferred). Keep each file under ~400 KB if possible
(export at 80–85% quality) — the whole app currently weighs ~200 KB, and
the service worker precaches everything for offline use.

## Copy-paste prompts

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

## Tips for consistent results

- Generate all six zones in ONE session/chat so the tool keeps the style.
- If a tool adds text or creatures, append: "absolutely no letters or words
  anywhere in the image".
- Ask for 2–3 variants per prompt and pick the most on-palette one.
- Keep the same seed (Midjourney: `--seed`) or reference the first accepted
  image ("in the same style as this") for the rest of the set.

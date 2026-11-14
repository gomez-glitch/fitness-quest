# Art drop folder

Upload generated PNGs here (**Add file → Upload files** on GitHub), then ask
Claude to integrate them into the app.

- File names, sizes, and the full set of image-generation prompts:
  see [`docs/ART.md`](../docs/ART.md)
- Expected first batch: `zone-1-meadow.png` … `zone-6-castle.png`,
  `hero-banner.png`, `adventure-*.png`, `dance-party.png`,
  `celebration.png`, `app-icon.png`
- Shipped so far: the six journey zones (`zone-*.webp`) and seven adventure
  badges (`adventure-*.webp`), all WebP, converted with the pipeline in
  `docs/ART.md`
- Keep files small: art is cached as it's viewed, not precached, so size
  matters mainly for the first load

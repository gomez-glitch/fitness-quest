# Art drop folder

Upload generated PNGs here (**Add file → Upload files** on GitHub), then ask
Claude to integrate them into the app.

- File names, sizes, and the full set of image-generation prompts:
  see [`docs/ART.md`](../docs/ART.md)
- Expected first batch: `zone-1-meadow.png` … `zone-6-castle.png`,
  `hero-banner.png`, `adventure-*.png`, `dance-party.png`,
  `celebration.png`, `app-icon.png`
- Keep files under ~400 KB each where possible (the service worker
  precaches everything for offline play)

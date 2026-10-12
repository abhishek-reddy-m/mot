# Casa Blanca Hotels — vertical promo

A 25-second, 1080×1920, 30 fps promo built with [Remotion](https://www.remotion.dev/).
Everything is generated from code: the visuals, and a soundtrack synthesized
in `scripts/make-audio.ts` (no samples, no stock music).

Output: `out/casa-blanca-promo.mp4`. Contact sheet of every scene: `out/contact-sheet.jpg`.

## Build

```bash
cd promo
npm install
npm run build      # fonts -> audio -> stills -> master render -> delivery encode
```

Individual steps:

| Command          | Does                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `npm run fonts`  | Copies woff2 files from `@fontsource/*` into `public/fonts`          |
| `npm run audio`  | Synthesizes `public/audio/soundtrack.wav` and prints a mix report     |
| `npm run stills` | Renders the last frame of every scene to `out/stills` + contact sheet |
| `npm run render` | Renders `out/master.mp4`, then 2-pass encodes the 10 Mb/s delivery    |
| `npm run studio` | Opens Remotion Studio for scrubbing                                  |

Pass extra frame numbers to check mid-animation frames:
`node scripts/render-stills.ts 33 452`.

## Structure

- `src/facts.ts` holds every product fact and line of copy, each with the file
  in the app it comes from. Change the URL, pricing line or platforms here.
- `src/timeline.ts` is the beat grid (120 BPM, 15 frames per beat), the scene
  list and the per-scene cue sheets. Both the video and the audio synth read
  it, so every sound effect lands on the frame of its visual.
- `src/scenes/` has one file per scene. `src/mockups/ui.tsx` rebuilds the app's
  shadcn/ui primitives with its real Tailwind colors and Inter.
- `src/components/` holds the shared motion pieces: masked line rise,
  highlighter, hairline rule, odometer, flip ticker, film grain and HUD.

## Story

| #   | Beats | Scene                                                                   |
| --- | ----- | ----------------------------------------------------------------------- |
| 01  | 4     | Cold open: the property page books an Ocean Suite                       |
| 02  | 4     | "Yes, it's _another_ booking site." / "We know. There are dozens."      |
| 03  | 2     | "But." — music stops, sub impact                                        |
| 04  | 8     | 01 / Nightly rates — "Priced _nightly._", odometer stay breakdown (drop) |
| 05  | 8     | 02 / Live availability — "Live _counts._", per-night ticker             |
| 06  | 8     | 03 / Self-serve changes — "Plans _change._", before/after split         |
| 07  | 8     | 04 / Front desk + housekeeping — "Runs the _hotel._", scan wipe         |
| 08  | 8     | CTA: "_Another_ booking site. Just better.", final chord rings out      |

## Notes

- Rates, room names, inventory and the lowest price ($199.99) come from
  `prisma/seed.js`; production data may differ. The availability counts in
  scene 05 are illustrative. The weekend rate applies the 1.25 weekend factor
  from `scripts/seed-data.js` to the Ocean Suite base rate.
- The seed's room photos are Unsplash links, which aren't bundled here; the
  room card uses a flat drawing in their place.
- `scripts/browser.ts` points Remotion at a preinstalled Chrome headless shell
  when one exists; otherwise Remotion downloads its own.

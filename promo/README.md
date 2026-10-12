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

---

# Ad 2 — "Let me check" (for hotel and motel owners)

An 80-second vertical story ad aimed at independent hotel and motel owners
(the people who'd run this system), not guests. Output:
`out/casa-blanca-let-me-check.mp4`; review sheets: `out/call-sheet-*.jpg`.

**Story.** 11:47 PM, the front desk phone rings. A guest wants a room for
Friday; the owner says "let me check" and puts them on hold while the ledger
shows Room 12 booked twice, housekeeping texts "is 104 clean??", and the rates
note says $299 every night. The guest hangs up to book somewhere else. Then the
tape rewinds to 11:47: same guest, but the hotel has its own booking site.
The guest books in seconds, and each problem from the hold is crossed out and
fixed on screen (per-night availability, the rate calendar's weekend button,
housekeeping on the phone), followed by the front desk dashboard, self-serve
date changes and per-role logins. It ends at 11:47 PM again, with no call,
and the booking waiting in the Bookings list at 7:02 AM.

**Sound.** Dialogue and narration are synthesized offline with Kokoro-82M
(Apache-2.0); the caller is band-limited like a phone line. The score and
every effect (ringtone, hold music through the phone, busy tone, tape rewind,
UI taps, the warm 100 BPM groove, the final chord) are synthesized in
`scripts/make-call-audio.ts`. Burned-in captions follow each spoken word,
for muted autoplay.

Every claim maps to app code in `src/call/claims.md`.

## Build

```bash
npm run call:build   # fonts -> mix -> review stills -> render
```

| Command               | Does                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run call:voice`  | Re-records the voice lines (needs the Kokoro setup below); usually not needed |
| `npm run call:audio`  | Mixes voice + score + effects into `public/call/mix.wav`; `MIX_REPORT=1` prints per-scene levels |
| `npm run call:stills` | Two stills per scene + contact sheets in `out/`                          |
| `npm run call:render` | Renders `out/call-master.mp4`, then remuxes the delivery file           |

The voice lines in `public/call/vo/` and their word timings in
`src/call/vo.ts` are committed, so only `call:voice` needs the TTS model.
Edit lines in `src/call/script.json`; the timeline (`src/call/timeline.ts`)
re-times every scene from the new line lengths.

Kokoro setup for `call:voice`:

```bash
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx==0.6.1 soundfile
# model: onnx-community/Kokoro-82M-v1.0-ONNX, onnx/model_quantized.onnx
#   (sha256 fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478)
# voices: the voices/*.bin files of the kokoro-js npm package, packed into
#   voices.npz as arrays of shape (510, 1, 256), keyed by voice name
.venv/bin/python -I scripts/make-voice.py --model model_quantized.onnx --voices voices.npz
```

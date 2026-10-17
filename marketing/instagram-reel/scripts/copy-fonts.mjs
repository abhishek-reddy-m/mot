// Copies the woff2 files the video needs out of the @fontsource packages into
// public/fonts so Remotion can load them with staticFile() — no network fetch
// at render time. Keep in sync with src/fonts.ts.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'public', 'fonts');
fs.mkdirSync(out, {recursive: true});

const files = [
  // HotelOne's own type (src/app/layout.tsx): Inter for UI, Fraunces for display and the wordmark
  ...['400', '500', '600', '700', '800'].map((w) => ['inter', `inter-latin-${w}-normal.woff2`]),
  ...['400', '600', '700', '900'].flatMap((w) => [
    ['fraunces', `fraunces-latin-${w}-normal.woff2`],
    ['fraunces', `fraunces-latin-${w}-italic.woff2`],
  ]),
  // Video type system
  ['inter-tight', 'inter-tight-latin-700-normal.woff2'],
  ['inter-tight', 'inter-tight-latin-800-normal.woff2'],
  ['inter-tight', 'inter-tight-latin-900-normal.woff2'],
  ['instrument-serif', 'instrument-serif-latin-400-italic.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2'],
];

for (const [pkg, file] of files) {
  const src = path.join(root, 'node_modules', '@fontsource', pkg, 'files', file);
  fs.copyFileSync(src, path.join(out, file));
}
console.log(`Copied ${files.length} font files to public/fonts`);

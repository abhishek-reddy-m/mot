// Copies the woff2 files the video needs out of the @fontsource packages into
// public/fonts so Remotion can load them with staticFile() — no network fetch
// at render time.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'public', 'fonts');
fs.mkdirSync(out, {recursive: true});

const files = [
  // Video type system
  ['inter-tight', 'inter-tight-latin-800-normal.woff2'],
  ['inter-tight', 'inter-tight-latin-700-normal.woff2'],
  ['instrument-serif', 'instrument-serif-latin-400-italic.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2'],
  // The app's own fonts (src/app/layout.tsx), used in product mockups
  ['inter', 'inter-latin-400-normal.woff2'],
  ['inter', 'inter-latin-500-normal.woff2'],
  ['inter', 'inter-latin-600-normal.woff2'],
  ['inter', 'inter-latin-700-normal.woff2'],
  ['dancing-script', 'dancing-script-latin-700-normal.woff2'],
  ['montserrat', 'montserrat-latin-500-normal.woff2'],
  ['montserrat', 'montserrat-latin-600-normal.woff2'],
  // "Let me check" ad
  ['bricolage-grotesque', 'bricolage-grotesque-latin-500-normal.woff2'],
  ['bricolage-grotesque', 'bricolage-grotesque-latin-700-normal.woff2'],
  ['bricolage-grotesque', 'bricolage-grotesque-latin-800-normal.woff2'],
  ['caveat', 'caveat-latin-600-normal.woff2'],
  ['caveat', 'caveat-latin-700-normal.woff2'],
];

for (const [pkg, file] of files) {
  const src = path.join(root, 'node_modules', '@fontsource', pkg, 'files', file);
  fs.copyFileSync(src, path.join(out, file));
}
console.log(`Copied ${files.length} font files to public/fonts`);

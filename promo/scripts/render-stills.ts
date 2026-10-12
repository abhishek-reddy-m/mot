// Renders one still per scene (its last, fully settled frame) to out/stills,
// plus a contact sheet, for checking layout and line breaks before the full
// render. Extra absolute frames can be passed as arguments:
//   node scripts/render-stills.ts 30 75 140
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {SCENES} from '../src/timeline.ts';
import {browserExecutable} from './browser.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'out', 'stills');
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts')});
const inputProps = {withAudio: false};
const composition = await selectComposition({serveUrl, id: 'Promo', inputProps, browserExecutable});

const jobs: Array<{frame: number; file: string}> = SCENES.map((s) => ({
  frame: s.from + s.duration - 3,
  file: `${String(s.index + 1).padStart(2, '0')}-${s.id}.png`,
}));
for (const arg of process.argv.slice(2)) {
  const frame = Number(arg);
  if (Number.isInteger(frame)) jobs.push({frame, file: `frame-${String(frame).padStart(3, '0')}.png`});
}

for (const job of jobs) {
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    frame: job.frame,
    output: path.join(outDir, job.file),
    imageFormat: 'png',
    browserExecutable,
  });
  console.log(`frame ${job.frame} -> out/stills/${job.file}`);
}

// 4x2 contact sheet of the scene stills.
const sceneFiles = jobs.slice(0, SCENES.length).map((j) => path.join(outDir, j.file));
const args = sceneFiles.flatMap((f) => ['-i', f]);
const scaled = sceneFiles.map((_, i) => `[${i}:v]scale=540:960[s${i}]`).join(';');
const stacked = sceneFiles.map((_, i) => `[s${i}]`).join('');
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  ...args,
  '-filter_complex',
  `${scaled};${stacked}xstack=inputs=${sceneFiles.length}:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0`,
  '-q:v',
  '3',
  path.join(root, 'out', 'contact-sheet.jpg'),
]);
console.log('contact sheet -> out/contact-sheet.jpg');

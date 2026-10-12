// Stills for reviewing the "Let me check" ad: two frames per scene (mid-action
// and settled) into out/call-stills, plus a contact sheet. Extra absolute
// frames can be passed as arguments.
//   node scripts/render-call-stills.ts [frame ...]
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {SCENES} from '../src/call/timeline.ts';
import {browserExecutable} from './browser.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'out', 'call-stills');
fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts')});
const inputProps = {withAudio: false};
const composition = await selectComposition({serveUrl, id: 'CallAd', inputProps, browserExecutable});

const extra = process.argv.slice(2).map(Number).filter(Number.isInteger);
const jobs = extra.length
  ? extra.map((frame) => ({frame, file: `frame-${String(frame).padStart(4, '0')}.png`}))
  : SCENES.flatMap((s, i) => [
      {frame: s.from + Math.round(s.duration * 0.45), file: `${String(i + 1).padStart(2, '0')}a-${s.id}.png`},
      {frame: s.from + s.duration - 3, file: `${String(i + 1).padStart(2, '0')}b-${s.id}.png`},
    ]);

for (const job of jobs) {
  await renderStill({composition, serveUrl, inputProps, frame: job.frame, output: path.join(outDir, job.file), imageFormat: 'png', browserExecutable});
  console.log(`frame ${job.frame} -> out/call-stills/${job.file}`);
}

// Contact sheets, 7 stills per row, 2 rows per sheet.
const files = jobs.map((j) => path.join(outDir, j.file));
const perSheet = 14;
for (let s = 0; s * perSheet < files.length; s++) {
  const group = files.slice(s * perSheet, (s + 1) * perSheet);
  while (group.length < perSheet) group.push(group[group.length - 1]);
  const inputs = group.flatMap((f) => ['-i', f]);
  const scaled = group.map((_, i) => `[${i}:v]scale=360:640[s${i}]`).join(';');
  const row = (r: number) => group.slice(r * 7, r * 7 + 7).map((_, i) => `[s${r * 7 + i}]`).join('') + `hstack=inputs=7[r${r}]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${scaled};${row(0)};${row(1)};[r0][r1]vstack=inputs=2`, '-q:v', '3', path.join(root, 'out', `call-sheet-${s + 1}.jpg`)]);
  console.log(`contact sheet -> out/call-sheet-${s + 1}.jpg`);
}

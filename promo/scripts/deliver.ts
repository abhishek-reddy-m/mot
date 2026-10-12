// Encodes the high-quality master (out/master.mp4) into the delivery file
// (out/casa-blanca-promo.mp4): 2-pass H.264 at a fixed 10 Mb/s with grain
// tuning, AAC copied from the master. Then prints a mix check of the result.
//   node scripts/deliver.ts
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const master = path.join(root, 'out', 'master.mp4');
const out = path.join(root, 'out', 'casa-blanca-promo.mp4');
const passlog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'x264-')), 'pass');

const video = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'grain', '-b:v', '10M', '-maxrate', '14M', '-bufsize', '20M'];
const common = ['-y', '-loglevel', 'error', '-i', master, ...video, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-passlogfile', passlog];

execFileSync('ffmpeg', [...common, '-pass', '1', '-an', '-f', 'mp4', os.devNull], {stdio: 'inherit'});
execFileSync('ffmpeg', [...common, '-pass', '2', '-c:a', 'copy', '-movflags', '+faststart', out], {stdio: 'inherit'});

const mb = fs.statSync(out).size / 1e6;
console.log(`delivery -> ${path.relative(root, out)} (${mb.toFixed(1)} MB)`);

// Loudness and true peak of the delivered audio (after AAC). ffmpeg reports on stderr.
const {stderr} = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {
  encoding: 'utf8',
});
const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
const integrated = summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];
const truePeak = summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1];
console.log(`audio: integrated ${integrated} LUFS, true peak ${truePeak} dBTP`);
if (truePeak !== undefined && Number(truePeak) > -1) {
  console.error('true peak above -1 dBTP: lower CEILING in scripts/make-audio.ts');
  process.exitCode = 1;
}

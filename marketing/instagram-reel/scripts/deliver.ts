// Encodes a high-quality master into a delivery file: 2-pass H.264 at a fixed
// bitrate (grain tuning for the grainy promo), AAC copied from the master.
// Then prints a loudness/true-peak check of the result.
//   node scripts/deliver.ts [master] [output] [bitrate|copy] [tune]
//   defaults: out/master.mp4 out/casa-blanca-promo.mp4 10M grain
// "copy" keeps the master's streams and only moves the index to the front
// (faststart), for masters that are already compact.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [masterArg, outArg, bitrate = '10M', tune = 'grain'] = process.argv.slice(2);
const master = path.resolve(root, masterArg ?? 'out/master.mp4');
const out = path.resolve(root, outArg ?? 'out/casa-blanca-promo.mp4');
const passlog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'x264-')), 'pass');

const mbps = parseFloat(bitrate);
const video = ['-c:v', 'libx264', '-preset', 'slow', '-tune', tune, '-b:v', bitrate, '-maxrate', `${mbps * 1.4}M`, '-bufsize', `${mbps * 2}M`];
const common = ['-y', '-loglevel', 'error', '-i', master, ...video, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-passlogfile', passlog];

if (bitrate === 'copy') {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-c', 'copy', '-movflags', '+faststart', out], {stdio: 'inherit'});
} else {
  execFileSync('ffmpeg', [...common, '-pass', '1', '-an', '-f', 'mp4', os.devNull], {stdio: 'inherit'});
  execFileSync('ffmpeg', [...common, '-pass', '2', '-c:a', 'copy', '-movflags', '+faststart', out], {stdio: 'inherit'});
}

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

import fs from 'node:fs';
import {Config} from '@remotion/cli/config';
import {browserExecutable} from './scripts/browser.ts';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('aac');
Config.setAudioBitrate('256k');
Config.setOverwriteOutput(true);

if (browserExecutable && fs.existsSync(browserExecutable)) {
  Config.setBrowserExecutable(browserExecutable);
}

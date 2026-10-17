// Use a preinstalled Chrome headless shell when one is available (CI/cloud
// containers), otherwise let Remotion download its own.
import fs from 'node:fs';

const candidates = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
];

export const browserExecutable: string | null =
  candidates.find((p): p is string => Boolean(p && fs.existsSync(p))) ?? null;

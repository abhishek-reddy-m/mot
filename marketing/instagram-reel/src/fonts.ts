import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Keep in sync with scripts/copy-fonts.mjs.
const FONTS: Array<{family: string; file: string; weight: string; style?: string}> = [
  ...['400', '500', '600', '700', '800'].map((w) => ({family: 'Inter', file: `inter-latin-${w}-normal.woff2`, weight: w})),
  ...['400', '600', '700', '900'].flatMap((w) => [
    {family: 'Fraunces', file: `fraunces-latin-${w}-normal.woff2`, weight: w},
    {family: 'Fraunces', file: `fraunces-latin-${w}-italic.woff2`, weight: w, style: 'italic'},
  ]),
  {family: 'Inter Tight', file: 'inter-tight-latin-700-normal.woff2', weight: '700'},
  {family: 'Inter Tight', file: 'inter-tight-latin-800-normal.woff2', weight: '800'},
  {family: 'Inter Tight', file: 'inter-tight-latin-900-normal.woff2', weight: '900'},
  {family: 'Instrument Serif', file: 'instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-400-normal.woff2', weight: '400'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-500-normal.woff2', weight: '500'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-700-normal.woff2', weight: '700'},
];

let loaded = false;

export const loadFonts = () => {
  if (loaded) return;
  loaded = true;
  for (const f of FONTS) {
    loadFont({family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight, style: f.style ?? 'normal'});
  }
};

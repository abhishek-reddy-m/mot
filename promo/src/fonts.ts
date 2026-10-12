import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

const FONTS: Array<{family: string; file: string; weight: string; style?: string}> = [
  {family: 'Inter Tight', file: 'inter-tight-latin-800-normal.woff2', weight: '800'},
  {family: 'Inter Tight', file: 'inter-tight-latin-700-normal.woff2', weight: '700'},
  {family: 'Instrument Serif', file: 'instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-400-normal.woff2', weight: '400'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-500-normal.woff2', weight: '500'},
  {family: 'JetBrains Mono', file: 'jetbrains-mono-latin-700-normal.woff2', weight: '700'},
  {family: 'Inter', file: 'inter-latin-400-normal.woff2', weight: '400'},
  {family: 'Inter', file: 'inter-latin-500-normal.woff2', weight: '500'},
  {family: 'Inter', file: 'inter-latin-600-normal.woff2', weight: '600'},
  {family: 'Inter', file: 'inter-latin-700-normal.woff2', weight: '700'},
  {family: 'Dancing Script', file: 'dancing-script-latin-700-normal.woff2', weight: '700'},
  {family: 'Montserrat', file: 'montserrat-latin-500-normal.woff2', weight: '500'},
  {family: 'Montserrat', file: 'montserrat-latin-600-normal.woff2', weight: '600'},
];

let loaded = false;

export const loadFonts = () => {
  if (loaded) return;
  loaded = true;
  for (const f of FONTS) {
    loadFont({
      family: f.family,
      url: staticFile(`fonts/${f.file}`),
      weight: f.weight,
      style: f.style ?? 'normal',
    });
  }
};

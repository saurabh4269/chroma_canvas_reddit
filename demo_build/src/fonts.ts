import {loadFont as loadFredoka} from '@remotion/google-fonts/Fredoka';
import {loadFont as loadNunito} from '@remotion/google-fonts/Nunito';

const fredoka = loadFredoka('normal', {
  weights: ['500', '600', '700'],
  subsets: ['latin'],
});

const nunito = loadNunito('normal', {
  weights: ['500', '600', '700', '800'],
  subsets: ['latin'],
});

export const displayFont = fredoka.fontFamily;
export const bodyFont = nunito.fontFamily;

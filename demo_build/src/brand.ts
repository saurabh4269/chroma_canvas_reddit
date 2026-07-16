import {bodyFont, displayFont} from './fonts';

/**
 * Sunny launch palette — reinterpreted from warm game-promo cues:
 * GEC Warm Sunny (#ff9340→#eff244), HueHive sky/coral/yellow,
 * Tile promo warmth + Fossil Frenzy bright arcade energy.
 */
export const BRAND = {
  sky: '#7EC8F0',
  skyDeep: '#4BA3D9',
  skyWash: '#D6F0FF',
  sun: '#FFE566',
  sunHot: '#FFC14A',
  coral: '#FF6F61',
  coralSoft: '#FF8A70',
  cream: '#FFF8F0',
  ink: '#1A2744',
  inkSoft: '#2C3E5C',
  foam: '#FFFFFF',
  muted: '#5A6B86',
  success: '#2BB673',
  glass: 'rgba(255, 248, 240, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.7)',
} as const;

export const FONT = {
  display: displayFont,
  body: bodyFont,
} as const;

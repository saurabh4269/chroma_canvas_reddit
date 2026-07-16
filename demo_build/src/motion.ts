import {Easing, interpolate} from 'remotion';

export const progress = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const fadeIn = (frame: number, start: number, duration = 20) =>
  progress(frame, start, duration);

export const slideUp = (frame: number, start: number, distance = 60) => {
  const p = progress(frame, start, 24);
  return interpolate(p, [0, 1], [distance, 0]);
};

export const scaleIn = (frame: number, start: number) => {
  const p = progress(frame, start, 28);
  return interpolate(p, [0, 1], [0.88, 1]);
};

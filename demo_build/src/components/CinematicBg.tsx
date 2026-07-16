import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND} from '../brand';

/** Soft daylight stage: sky wash, drifting sun, warm horizon — no purple glow. */
export const CinematicBg = () => {
  const frame = useCurrentFrame();
  const sunDrift = interpolate(frame, [0, 300], [0, 18], {
    extrapolateRight: 'clamp',
  });
  const orbPulse = interpolate(Math.sin(frame / 22), [-1, 1], [0.92, 1.08]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(168deg, ${BRAND.skyDeep} 0%, ${BRAND.sky} 28%, ${BRAND.skyWash} 58%, #FFE8C8 82%, ${BRAND.coralSoft} 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 160 + sunDrift,
          top: 80 - sunDrift * 0.35,
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.sun} 0%, ${BRAND.sunHot}88 28%, transparent 68%)`,
          transform: `scale(${orbPulse})`,
          filter: 'blur(1px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -80,
          bottom: -120,
          width: 520,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.coral}33 0%, transparent 70%)`,
          filter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 90% 70% at 50% 45%, transparent 40%, rgba(26,39,68,0.12) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

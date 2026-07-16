import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {fadeIn, progress} from '../motion';

export const ColdOpen = () => {
  const frame = useCurrentFrame();
  const titleOpacity = fadeIn(frame, 12, 26);
  const subOpacity = fadeIn(frame, 40, 22);
  const badgeOpacity = fadeIn(frame, 72, 18);
  const titleScale = interpolate(titleOpacity, [0, 1], [0.9, 1]);
  const sunPulse = interpolate(Math.sin(frame / 16), [-1, 1], [0.96, 1.06]);

  return (
    <AbsoluteFill>
      <CinematicBg />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '28%',
          width: 420,
          height: 420,
          marginLeft: -210,
          marginTop: -210,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.sun}55 0%, transparent 68%)`,
          transform: `scale(${sunPulse})`,
        }}
      />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 120}}>
        <div style={{textAlign: 'center', maxWidth: 1500}}>
          <div
            style={{
              opacity: badgeOpacity,
              display: 'inline-block',
              marginBottom: 28,
              padding: '10px 22px',
              borderRadius: 999,
              background: BRAND.foam,
              color: BRAND.inkSoft,
              fontFamily: FONT.body,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: 0.5,
              boxShadow: '0 10px 28px rgba(26,39,68,0.12)',
            }}
          >
            Games with a Hook · Reddit Devvit
          </div>
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${interpolate(titleOpacity, [0, 1], [36, 0])}px) scale(${titleScale})`,
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 118,
              color: BRAND.ink,
              letterSpacing: -3,
              textShadow: `0 10px 0 ${BRAND.sun}, 0 22px 50px rgba(26,39,68,0.18)`,
            }}
          >
            Chroma Canvas
          </div>
          <div
            style={{
              opacity: subOpacity,
              marginTop: 32,
              fontFamily: FONT.body,
              fontWeight: 700,
              fontSize: 48,
              lineHeight: 1.28,
              color: BRAND.inkSoft,
            }}
          >
            Every death becomes a platform.
            <br />
            Every comment reshapes tomorrow.
          </div>
          <div
            style={{
              opacity: fadeIn(frame, 88, 18),
              marginTop: 36,
              fontFamily: FONT.body,
              fontWeight: 800,
              fontSize: 34,
              color: BRAND.coral,
            }}
          >
            Daily precision platformer · sunny community climbs
          </div>
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 88,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: interpolate(progress(frame, 100, 30), [0, 1], [0, 0.85]),
          fontFamily: FONT.body,
          fontWeight: 600,
          fontSize: 28,
          color: BRAND.muted,
        }}
      >
        Phaser 3 · Devvit Web · Community corpses
      </div>
    </AbsoluteFill>
  );
};

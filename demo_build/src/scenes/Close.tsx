import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {fadeIn, progress} from '../motion';

export const Close = () => {
  const frame = useCurrentFrame();
  const ring = interpolate(progress(frame, 16, 70), [0, 1], [0.7, 1.35]);
  const ctaPop = interpolate(fadeIn(frame, 70, 20), [0, 1], [0.92, 1]);

  return (
    <AbsoluteFill>
      <CinematicBg />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          width: 560,
          height: 560,
          marginLeft: -280,
          marginTop: -280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.sun}55 0%, ${BRAND.coral}22 40%, transparent 70%)`,
          transform: `scale(${ring})`,
        }}
      />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 120}}>
        <div style={{textAlign: 'center'}}>
          <div
            style={{
              opacity: fadeIn(frame, 10, 24),
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 104,
              color: BRAND.ink,
              textShadow: `0 10px 0 ${BRAND.sun}, 0 22px 48px rgba(26,39,68,0.16)`,
              letterSpacing: -2,
            }}
          >
            Chroma Canvas
          </div>
          <div
            style={{
              opacity: fadeIn(frame, 32, 20),
              marginTop: 26,
              fontFamily: FONT.body,
              fontWeight: 800,
              fontSize: 48,
              color: BRAND.inkSoft,
            }}
          >
            Play today&apos;s level on Reddit
          </div>
          <div
            style={{
              opacity: fadeIn(frame, 52, 18),
              marginTop: 28,
              fontFamily: FONT.body,
              fontWeight: 700,
              fontSize: 34,
              color: BRAND.muted,
            }}
          >
            r/chroma_canvas_dev · developers.reddit.com/apps/chroma-canvas
          </div>
          <div
            style={{
              opacity: fadeIn(frame, 70, 22),
              transform: `scale(${ctaPop})`,
              marginTop: 48,
              display: 'inline-block',
              padding: '20px 52px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${BRAND.coral} 0%, ${BRAND.sunHot} 55%, ${BRAND.sun} 100%)`,
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 36,
              color: BRAND.ink,
              boxShadow: `0 14px 0 ${BRAND.coral}66, 0 24px 48px rgba(255,111,97,0.35)`,
            }}
          >
            Games with a Hook · Devvit Web
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

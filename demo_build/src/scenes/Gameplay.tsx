import {AbsoluteFill, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {BRAND, FONT} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {fadeIn, progress} from '../motion';
import {GAMEPLAY_VIDEO, FPS} from '../storyboard';

const OVERLAYS = [
  {
    start: 1.6,
    end: 4.4,
    title: 'Daily Level #42',
    sub: '127 have fallen · Chromatic streak',
  },
  {
    start: 5.0,
    end: 10.8,
    title: 'Corpses are platforms',
    sub: 'Climb the community that failed before you',
  },
  {
    start: 12.2,
    end: 16.8,
    title: 'Petrified → Comment My Death',
    sub: 'Your fall becomes someone else\'s foothold',
  },
  {
    start: 18.4,
    end: 22.6,
    title: 'Orb delivered',
    sub: 'Beat the daily · climb the leaderboard',
  },
] as const;

export const Gameplay = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const overlay = OVERLAYS.find((o) => t >= o.start && t <= o.end);
  const overlayOpacity = overlay
    ? interpolate(
        t,
        [overlay.start, overlay.start + 0.35, overlay.end - 0.35, overlay.end],
        [0, 1, 1, 0],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
      )
    : 0;

  const warmGrade = interpolate(progress(frame, 0, 30), [0, 1], [0.35, 0.18]);

  return (
    <AbsoluteFill style={{backgroundColor: BRAND.skyDeep}}>
      <CinematicBg />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '56px 80px 128px',
        }}
      >
        <div
          style={{
            width: 1680,
            height: 900,
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: `0 36px 80px rgba(26,39,68,0.28), 0 0 0 4px ${BRAND.foam}cc, 0 0 0 10px ${BRAND.sun}66`,
            transform: `scale(${interpolate(fadeIn(frame, 0, 18), [0, 1], [0.96, 1])})`,
            opacity: fadeIn(frame, 0, 14),
            background: BRAND.ink,
            position: 'relative',
          }}
        >
          <Video
            src={staticFile(GAMEPLAY_VIDEO)}
            muted
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
          {/* Warm daylight grade over gameplay — soft sun wash, not purple */}
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, rgba(255,229,102,${warmGrade * 0.45}) 0%, transparent 28%, transparent 62%, rgba(255,111,97,${warmGrade * 0.35}) 100%)`,
              mixBlendMode: 'soft-light',
            }}
          />
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, transparent 52%, rgba(26,39,68,0.22) 100%)',
            }}
          />
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 88,
          opacity: fadeIn(frame, 6, 16),
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 22px',
          borderRadius: 999,
          background: BRAND.glass,
          border: `2px solid ${BRAND.glassBorder}`,
          boxShadow: '0 12px 28px rgba(26,39,68,0.12)',
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.sun}, ${BRAND.coral})`,
          }}
        />
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 34,
            color: BRAND.ink,
            letterSpacing: -0.5,
          }}
        >
          Chroma Canvas
        </div>
      </div>

      {overlay ? (
        <div
          style={{
            position: 'absolute',
            left: 96,
            right: 96,
            bottom: 56,
            opacity: overlayOpacity,
            transform: `translateY(${interpolate(overlayOpacity, [0, 1], [28, 0])}px)`,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              maxWidth: 1400,
              padding: '24px 36px',
              borderRadius: 24,
              background: BRAND.glass,
              border: `2px solid ${BRAND.sunHot}`,
              boxShadow: `0 18px 48px rgba(26,39,68,0.16), 0 6px 0 ${BRAND.coral}44`,
            }}
          >
            <div
              style={{
                fontFamily: FONT.display,
                fontWeight: 700,
                fontSize: 52,
                color: BRAND.coral,
                marginBottom: 8,
              }}
            >
              {overlay.title}
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize: 34,
                color: BRAND.inkSoft,
              }}
            >
              {overlay.sub}
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

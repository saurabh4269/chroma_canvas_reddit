import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {fadeIn, progress} from '../motion';

const STEPS = [
  {time: 0, label: 'A new precision level drops every day'},
  {time: 35, label: 'Carry the Chroma Orb. One life. No checkpoints.'},
  {time: 70, label: 'Death petrifies you into a platform for everyone else'},
  {time: 105, label: 'Top-voted !hazard comments rewrite tomorrow\'s traps'},
];

export const Mechanism = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <CinematicBg />
      <AbsoluteFill style={{padding: '100px 120px'}}>
        <div
          style={{
            opacity: fadeIn(frame, 4, 16),
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 82,
            color: BRAND.ink,
            marginBottom: 18,
            textShadow: `0 6px 0 ${BRAND.sun}99`,
          }}
        >
          The hook
        </div>
        <div
          style={{
            opacity: fadeIn(frame, 10, 14),
            fontFamily: FONT.body,
            fontWeight: 600,
            fontSize: 34,
            color: BRAND.inkSoft,
            marginBottom: 36,
          }}
        >
          One sunny climb. One fragile orb. A whole subreddit under your feet.
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
          {STEPS.map((step, i) => {
            const active = frame >= step.time;
            const opacity = active ? fadeIn(frame, step.time, 14) : 0.22;
            const x = active
              ? interpolate(progress(frame, step.time, 18), [0, 1], [36, 0])
              : 36;
            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `translateX(${x}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  padding: '22px 30px',
                  borderRadius: 22,
                  background: active ? BRAND.glass : 'rgba(255,255,255,0.38)',
                  border: `2px solid ${active ? BRAND.sunHot : 'rgba(255,255,255,0.45)'}`,
                  boxShadow: active
                    ? '0 16px 40px rgba(26,39,68,0.12)'
                    : 'none',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: active
                      ? `linear-gradient(135deg, ${BRAND.coral}, ${BRAND.sunHot})`
                      : BRAND.skyWash,
                    color: active ? BRAND.foam : BRAND.muted,
                    fontFamily: FONT.display,
                    fontWeight: 700,
                    fontSize: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: active ? `0 8px 0 ${BRAND.coral}55` : 'none',
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: 700,
                    fontSize: 38,
                    color: active ? BRAND.ink : BRAND.muted,
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

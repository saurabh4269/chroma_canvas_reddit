import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT} from '../brand';
import {fadeIn, scaleIn} from '../motion';

type HeadlineProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  align?: 'left' | 'center';
};

export const Headline = ({
  title,
  subtitle,
  accent = BRAND.coral,
  align = 'center',
}: HeadlineProps) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, 8, 22);
  const y = interpolate(fadeIn(frame, 8, 24), [0, 1], [48, 0]);
  const scale = scaleIn(frame, 8);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        padding: '100px 120px',
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px) scale(${scale})`,
          textAlign: align,
          maxWidth: 1500,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.05,
            color: accent,
            letterSpacing: -1.5,
            textShadow: `0 8px 0 ${BRAND.sun}66, 0 18px 40px rgba(26,39,68,0.18)`,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginTop: 28,
              fontFamily: FONT.body,
              fontWeight: 600,
              fontSize: 48,
              lineHeight: 1.25,
              color: BRAND.inkSoft,
              maxWidth: 1200,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

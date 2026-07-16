import {Img, interpolate, useCurrentFrame} from 'remotion';
import {BRAND, FONT} from '../brand';
import {fadeIn, progress} from '../motion';

type BrowserFrameProps = {
  screenshot: string;
  url?: string;
  zoom?: number;
  focusX?: number;
  focusY?: number;
  callout?: string;
  enterDelay?: number;
};

export const BrowserFrame = ({
  screenshot,
  url = 'reddit.com/r/chroma_canvas_dev',
  zoom = 1,
  focusX = 50,
  focusY = 50,
  callout,
  enterDelay = 0,
}: BrowserFrameProps) => {
  const frame = useCurrentFrame();
  const enter = fadeIn(frame, enterDelay, 24);
  const scale = interpolate(fadeIn(frame, enterDelay, 28), [0, 1], [0.92, 1]);
  const driftZoom = interpolate(
    progress(frame, enterDelay + 30, 120),
    [0, 1],
    [1, zoom],
  );

  return (
    <div
      style={{
        opacity: enter,
        transform: `scale(${scale})`,
        width: 1560,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: BRAND.foam,
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: `0 36px 80px rgba(26,39,68,0.18), 0 0 0 3px ${BRAND.sun}99`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 18px',
            background: `linear-gradient(90deg, ${BRAND.skyWash}, ${BRAND.cream})`,
            borderBottom: `1px solid ${BRAND.sun}66`,
          }}
        >
          <div style={{display: 'flex', gap: 8}}>
            {['#FF6F61', '#FFC14A', '#2BB673'].map((c) => (
              <div
                key={c}
                style={{width: 12, height: 12, borderRadius: '50%', background: c}}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              marginLeft: 12,
              background: BRAND.foam,
              borderRadius: 10,
              padding: '8px 16px',
              fontFamily: FONT.body,
              fontWeight: 600,
              fontSize: 18,
              color: BRAND.muted,
              border: `1px solid ${BRAND.sky}55`,
            }}
          >
            {url}
          </div>
        </div>
        <div style={{height: 760, overflow: 'hidden', background: BRAND.cream}}>
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `scale(${driftZoom})`,
              transformOrigin: `${focusX}% ${focusY}%`,
            }}
          >
            <Img
              src={screenshot}
              style={{width: '100%', height: '100%', objectFit: 'cover'}}
            />
          </div>
        </div>
      </div>
      {callout ? (
        <div
          style={{
            marginTop: 24,
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 42,
            color: BRAND.coral,
            textAlign: 'center',
            opacity: fadeIn(frame, enterDelay + 40, 20),
            textShadow: `0 3px 0 ${BRAND.sun}88`,
          }}
        >
          {callout}
        </div>
      ) : null}
    </div>
  );
};

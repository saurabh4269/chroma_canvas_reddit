import {AbsoluteFill, Img, interpolate, useCurrentFrame} from 'remotion';
import {staticFile} from 'remotion';
import {BRAND, FONT} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {BrowserFrame} from '../components/BrowserFrame';
import {fadeIn, progress} from '../motion';

export const Corpses = () => {
  const frame = useCurrentFrame();
  const showMenu = frame > 100;

  return (
    <AbsoluteFill>
      <CinematicBg />
      <AbsoluteFill style={{padding: '90px 100px'}}>
        <div
          style={{
            opacity: fadeIn(frame, 8, 20),
            fontFamily: FONT.display,
            fontSize: 80,
            color: BRAND.coral,
            marginBottom: 20,
          }}
        >
          Die once — help everyone forever
        </div>
        <div
          style={{
            opacity: fadeIn(frame, 24, 18),
            fontFamily: FONT.body,
            fontSize: 44,
            color: BRAND.inkSoft,
            marginBottom: 32,
            maxWidth: 1100,
          }}
        >
          Your Snoovatar petrifies at the exact spot you fell. Tomorrow's climbers
          walk across your corpse.
        </div>
        <div style={{display: 'flex', gap: 40, alignItems: 'flex-start'}}>
          <div style={{flex: 1.2, opacity: interpolate(showMenu ? 0 : 1, [0, 1], [1, 0])}}>
            <BrowserFrame
              screenshot={staticFile('screenshots/04-death.png')}
              url="chroma-canvas · game over"
              zoom={1.15}
              focusX={50}
              focusY={35}
              enterDelay={20}
            />
          </div>
          <div
            style={{
              flex: 0.8,
              opacity: showMenu ? fadeIn(frame, 100, 24) : 0,
              transform: `translateX(${interpolate(showMenu ? progress(frame, 100, 24) : 0, [0, 1], [60, 0])}px)`,
            }}
          >
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: `0 24px 80px #00000066`,
                border: `1px solid ${BRAND.sunHot}88`,
              }}
            >
              <Img
                src={staticFile('screenshots/02-main-menu.png')}
                style={{width: '100%', display: 'block'}}
              />
            </div>
            <div
              style={{
                marginTop: 20,
                fontFamily: FONT.body,
                fontSize: 36,
                color: BRAND.coral,
                textAlign: 'center',
              }}
            >
              Streak · flair · daily leaderboard
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

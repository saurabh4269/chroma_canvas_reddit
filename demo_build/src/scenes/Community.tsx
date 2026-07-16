import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {BRAND, FONT} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {BrowserFrame} from '../components/BrowserFrame';
import {fadeIn} from '../motion';

export const Community = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <CinematicBg />
      <AbsoluteFill style={{padding: '84px 100px'}}>
        <div
          style={{
            opacity: fadeIn(frame, 8, 20),
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 72,
            color: BRAND.ink,
            marginBottom: 12,
            textShadow: `0 5px 0 ${BRAND.sun}aa`,
          }}
        >
          Community-authored traps
        </div>
        <div
          style={{
            opacity: fadeIn(frame, 22, 18),
            fontFamily: FONT.body,
            fontWeight: 700,
            fontSize: 38,
            color: BRAND.inkSoft,
            marginBottom: 24,
          }}
        >
          Top-voted <span style={{color: BRAND.coral}}>!hazard</span> comments become
          tomorrow&apos;s spikes and movers
        </div>
        <BrowserFrame
          screenshot={staticFile('screenshots/06-reddit-subreddit.png')}
          url="r/chroma_canvas_dev · daily post + !hazard comments"
          zoom={1.1}
          focusX={50}
          focusY={28}
          callout="Players design the gauntlet in the comments"
          enterDelay={28}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

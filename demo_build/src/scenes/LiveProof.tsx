import {AbsoluteFill, staticFile} from 'remotion';
import {BRAND} from '../brand';
import {CinematicBg} from '../components/CinematicBg';
import {BrowserFrame} from '../components/BrowserFrame';
import {Headline} from '../components/Headline';

export const LiveProof = () => (
  <AbsoluteFill>
    <CinematicBg />
    <AbsoluteFill style={{paddingTop: 80}}>
      <Headline
        title="One tap from the Reddit feed"
        subtitle="Inline splash → expanded Phaser game"
        accent={BRAND.coral}
      />
    </AbsoluteFill>
    <AbsoluteFill style={{justifyContent: 'flex-end', paddingBottom: 60}}>
      <BrowserFrame
        screenshot={staticFile('screenshots/01-splash.png')}
        url="reddit.com · Chroma Canvas inline view"
        zoom={1.08}
        focusX={50}
        focusY={45}
        callout="Daily level · live corpse count · one-tap Play"
        enterDelay={35}
      />
    </AbsoluteFill>
  </AbsoluteFill>
);

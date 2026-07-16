import {AbsoluteFill, interpolate, staticFile} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {Audio} from '@remotion/media';
import {ColdOpen} from './scenes/ColdOpen';
import {Mechanism} from './scenes/Mechanism';
import {Gameplay} from './scenes/Gameplay';
import {Community} from './scenes/Community';
import {Close} from './scenes/Close';
import {SCENES, TOTAL_FRAMES, TRANSITION_FRAMES} from './storyboard';

const timing = linearTiming({durationInFrames: TRANSITION_FRAMES});

export const Demo = () => {
  return (
    <AbsoluteFill>
      <Audio
        src={staticFile('audio/score.wav')}
        volume={(frame) =>
          interpolate(
            frame,
            [0, 28, TOTAL_FRAMES - 55, TOTAL_FRAMES - 1],
            [0, 0.4, 0.4, 0],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          )
        }
      />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES[0].durationInFrames}>
          <ColdOpen />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES[1].durationInFrames}>
          <Mechanism />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={timing}
        />
        <TransitionSeries.Sequence durationInFrames={SCENES[2].durationInFrames}>
          <Gameplay />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES[3].durationInFrames}>
          <Community />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={timing}
        />
        <TransitionSeries.Sequence durationInFrames={SCENES[4].durationInFrames}>
          <Close />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

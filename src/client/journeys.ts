import { telemetry } from '@devvit/analytics/client/reddit';

const swallow = (promise: Promise<unknown>) => {
  void promise.catch(() => undefined);
};

export const reportAppReady = () => {
  swallow(telemetry.appReady());
};

export const reportJourneyStart = () => {
  swallow(telemetry.startJourney());
};

export const reportJourneyProgress = (
  progress: number,
  action = 'checkpoint',
  actionDetails?: string
) => {
  swallow(
    telemetry.progress({
      progress,
      action,
      ...(actionDetails !== undefined ? { actionDetails } : {}),
    })
  );
};

export const reportJourneyInteraction = (action: string, actionDetails?: string) => {
  swallow(
    telemetry.interaction({
      action,
      ...(actionDetails !== undefined ? { actionDetails } : {}),
    })
  );
};

export const reportJourneyEnd = (options: {
  complete: boolean;
  win?: boolean;
  score?: number;
}) => {
  swallow(
    telemetry.endJourney({
      complete: options.complete,
      ...(options.win !== undefined
        ? { game: { win: options.win, score: options.score ?? 0 } }
        : {}),
    })
  );
};

import { Hono } from 'hono';
import { telemetry } from '@devvit/analytics/server/reddit';
import {
  TELEMETRY_DEFAULT_CLIENT_BASE_PATH,
  TELEMETRY_JOURNEY_ENDPOINTS,
  TELEMETRY_UNSPECIFIED_RECEIPT,
  type TelemetryJourneyEndRequest,
  type TelemetryJourneyInteractionRequest,
  type TelemetryJourneyProgressRequest,
} from '@devvit/analytics/shared/reddit';

const invalidReceipt = {
  status: 'JOURNEY_RECEIPT_INVALID' as const,
  message: 'Invalid: Event payload was not recorded.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const toProgressRequest = (
  body: unknown
): { value: TelemetryJourneyProgressRequest } | { error: string } => {
  if (!isRecord(body)) return { error: 'Expected a JSON object body.' };

  const journeyId = body.journeyId;
  const progress = body.progress;
  const action = body.action;
  const actionDetails = body.actionDetails;

  if (!isNonEmptyString(journeyId)) return { error: 'journeyId is required.' };
  if (!isNumber(progress)) return { error: 'progress must be a number between 0 and 1.' };
  if (progress < 0 || progress > 1) return { error: 'progress must be between 0 and 1.' };
  if (action !== undefined && !isNonEmptyString(action)) {
    return { error: 'action must be a non-empty string.' };
  }
  if (actionDetails !== undefined && !isNonEmptyString(actionDetails)) {
    return { error: 'actionDetails must be a non-empty string.' };
  }

  return {
    value: {
      journeyId,
      progress,
      ...(action !== undefined ? { action } : {}),
      ...(actionDetails !== undefined ? { actionDetails } : {}),
    },
  };
};

const toInteractionRequest = (
  body: unknown
): { value: TelemetryJourneyInteractionRequest } | { error: string } => {
  if (!isRecord(body)) return { error: 'Expected a JSON object body.' };

  const journeyId = body.journeyId;
  const action = body.action;
  const actionDetails = body.actionDetails;

  if (journeyId !== undefined && typeof journeyId !== 'string') {
    return { error: 'journeyId must be a string.' };
  }
  if (!isNonEmptyString(action)) return { error: 'action is required.' };
  if (actionDetails !== undefined && !isNonEmptyString(actionDetails)) {
    return { error: 'actionDetails must be a non-empty string.' };
  }

  return {
    value: {
      action,
      ...(isNonEmptyString(journeyId) ? { journeyId } : {}),
      ...(actionDetails !== undefined ? { actionDetails } : {}),
    },
  };
};

const toEndRequest = (
  body: unknown
): { value: TelemetryJourneyEndRequest } | { error: string } => {
  if (!isRecord(body)) return { error: 'Expected a JSON object body.' };

  const journeyId = body.journeyId;
  const complete = body.complete;
  const game = body.game;

  if (!isNonEmptyString(journeyId)) return { error: 'journeyId is required.' };
  if (complete !== undefined && typeof complete !== 'boolean') {
    return { error: 'complete must be a boolean.' };
  }
  if (game !== undefined) {
    if (!isRecord(game)) return { error: 'game must be an object.' };
    if (game.win !== undefined && typeof game.win !== 'boolean') {
      return { error: 'game.win must be a boolean.' };
    }
    if (game.score !== undefined && !isNumber(game.score)) {
      return { error: 'game.score must be a number.' };
    }
  }

  const result: TelemetryJourneyEndRequest = { journeyId };
  if (complete !== undefined) result.complete = complete;
  if (game !== undefined) {
    const gameWin = game.win;
    const gameScore = game.score;
    result.game = {
      win: typeof gameWin === 'boolean' ? gameWin : false,
      score: typeof gameScore === 'number' ? gameScore : 0,
    };
  }

  return { value: result };
};

const base = TELEMETRY_DEFAULT_CLIENT_BASE_PATH;

export const telemetryRoutes = new Hono();

telemetryRoutes.post(`${base}${TELEMETRY_JOURNEY_ENDPOINTS.start}`, async (c) => {
  try {
    const response = await telemetry.startJourney();
    if (!isNonEmptyString(response.journeyId)) {
      return c.json(
        { error: 'Telemetry journey id missing', receipt: TELEMETRY_UNSPECIFIED_RECEIPT },
        500
      );
    }
    return c.json(response);
  } catch (error) {
    console.error('Telemetry start error:', error);
    return c.json(
      { error: 'Internal server error', receipt: TELEMETRY_UNSPECIFIED_RECEIPT },
      500
    );
  }
});

telemetryRoutes.post(`${base}${TELEMETRY_JOURNEY_ENDPOINTS.progress}`, async (c) => {
  try {
    const request = toProgressRequest(await c.req.json());
    if ('error' in request) {
      return c.json({ error: request.error, receipt: invalidReceipt }, 400);
    }
    const response = await telemetry.journeyProgress(request.value);
    return c.json(response);
  } catch (error) {
    console.error('Telemetry progress error:', error);
    return c.json(
      { error: 'Internal server error', receipt: TELEMETRY_UNSPECIFIED_RECEIPT },
      500
    );
  }
});

telemetryRoutes.post(`${base}${TELEMETRY_JOURNEY_ENDPOINTS.interaction}`, async (c) => {
  try {
    const request = toInteractionRequest(await c.req.json());
    if ('error' in request) {
      return c.json({ error: request.error, receipt: invalidReceipt }, 400);
    }
    const response = await telemetry.journeyInteraction({
      journeyId: request.value.journeyId ?? '',
      action: request.value.action,
      actionDetails: request.value.actionDetails ?? '',
    });
    return c.json(response);
  } catch (error) {
    console.error('Telemetry interaction error:', error);
    return c.json(
      { error: 'Internal server error', receipt: TELEMETRY_UNSPECIFIED_RECEIPT },
      500
    );
  }
});

telemetryRoutes.post(`${base}${TELEMETRY_JOURNEY_ENDPOINTS.end}`, async (c) => {
  try {
    const request = toEndRequest(await c.req.json());
    if ('error' in request) {
      return c.json({ error: request.error, receipt: invalidReceipt }, 400);
    }
    const response = await telemetry.endJourney({
      journeyId: request.value.journeyId,
      complete: request.value.complete ?? false,
      ...(request.value.game !== undefined ? { game: request.value.game } : {}),
    });
    return c.json(response);
  } catch (error) {
    console.error('Telemetry end error:', error);
    return c.json(
      { error: 'Internal server error', receipt: TELEMETRY_UNSPECIFIED_RECEIPT },
      500
    );
  }
});

telemetryRoutes.post(`${base}${TELEMETRY_JOURNEY_ENDPOINTS.appReady}`, async (c) => {
  try {
    const response = await telemetry.appReady();
    return c.json(response);
  } catch (error) {
    console.error('Telemetry app ready error:', error);
    return c.json(
      { error: 'Internal server error', receipt: TELEMETRY_UNSPECIFIED_RECEIPT },
      500
    );
  }
});

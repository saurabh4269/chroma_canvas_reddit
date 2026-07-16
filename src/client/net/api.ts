import type {
  CommentActionResponse,
  CommentHazardRequest,
  DeathRequest,
  DeathResponse,
  HistoryResponse,
  InitResponse,
  SubscribeResponse,
  WinRequest,
  WinResponse,
} from '../../shared/api';

const parseJson = async <T>(res: Response): Promise<T> => {
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
};

export const fetchInit = (): Promise<InitResponse> =>
  fetch('/api/init').then((r) => parseJson<InitResponse>(r));

export const fetchHistory = (): Promise<HistoryResponse> =>
  fetch('/api/history').then((r) => parseJson<HistoryResponse>(r));

export const postDeath = (body: DeathRequest): Promise<DeathResponse> =>
  fetch('/api/death', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => parseJson<DeathResponse>(r));

export const postWin = (body: WinRequest): Promise<WinResponse> =>
  fetch('/api/win', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => parseJson<WinResponse>(r));

export const postSubscribe = (): Promise<SubscribeResponse> =>
  fetch('/api/subscribe', { method: 'POST' }).then((r) =>
    parseJson<SubscribeResponse>(r)
  );

export const postCommentDeath = (): Promise<CommentActionResponse> =>
  fetch('/api/comment-death', { method: 'POST' }).then((r) =>
    parseJson<CommentActionResponse>(r)
  );

export const postCommentHazard = (
  body: CommentHazardRequest
): Promise<CommentActionResponse> =>
  fetch('/api/comment-hazard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => parseJson<CommentActionResponse>(r));

import { ApiError } from './client';

/**
 * The backend refuses an entry identical to one recorded in the last few
 * minutes (same party, amount, mode and day) with 409 POSSIBLE_DUPLICATE —
 * most likely a double click or a retried request. The UI should show the
 * message and, only if the user confirms it really is a second entry,
 * resend the same body with `confirmDuplicate: true`.
 */
export function isPossibleDuplicate(error: unknown): error is ApiError {
  return error instanceof ApiError && error.statusCode === 409 && error.errorName === 'POSSIBLE_DUPLICATE';
}

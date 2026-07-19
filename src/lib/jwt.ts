// Decodes a JWT's payload without verifying its signature — only ever used
// client-side to read our own just-issued access token's `exp` so we know
// when to proactively refresh it. The server is the sole source of truth
// for validity; this is purely a scheduling hint.
function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** The token's `exp` claim in epoch milliseconds, or null if unreadable. */
export function getTokenExpiryMs(token: string): number | null {
  const payload = decodePayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

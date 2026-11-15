// Session maintenance: automatic token refresh on expiry.
//
// The arena server answers 401 (oauth_token_expired) when the access token
// expires and expects the client to call POST /api/auth/refresh with the
// refresh_token. This module centralizes that recovery path:
//   - authFetch wraps every authenticated binding call; on a 401 it tries a
//     single refresh (single-flight across concurrent calls) and retries once.
//   - When the refresh fails (refresh_token missing/invalid/expired, or the
//     auth server is unreachable), it dispatches SESSION_EXPIRED_EVENT and
//     re-throws; App listens for the event and returns to the login screen.

import { RefreshToken, SetToken } from '../wailsjs/go/main/App';

export const SESSION_EXPIRED_EVENT = 'mca:session-expired';

// isUnauthorizedError detects the server's 401 envelopes (expired or invalid
// token). The Go layer surfaces them as plain error strings.
export function isUnauthorizedError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes('401') || msg.includes('unauthorized') || msg.includes('oauth_token_expired');
}

let refreshInFlight: Promise<boolean> | null = null;

// refreshSession attempts to exchange the stored refresh_token for a fresh
// token pair. Returns true when the session was restored. Concurrent callers
// share one in-flight attempt.
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return false;
      }

      const resp = await RefreshToken(refreshToken);
      // The binding resolves to the TokenResponse (access_token,
      // refresh_token, ...); tolerate an envelope shape as well.
      const data = resp?.data ?? resp;
      if (!data?.access_token) {
        return false;
      }

      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      await SetToken(data.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// authFetch runs an authenticated binding call. On a 401 it refreshes the
// session once and retries; if the refresh fails it signals session expiry
// (App returns to the login screen) and re-throws the original error.
export async function authFetch<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (!isUnauthorizedError(err)) {
      throw err;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw err;
    }

    return await call();
  }
}

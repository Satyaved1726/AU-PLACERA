/**
 * AU Placera - Centralized Application URL Helper
 *
 * Provides the canonical application URL for authentication redirects:
 * - Local development: dynamically resolves to window.location.origin (e.g., http://localhost:5173)
 * - Production: uses VITE_APP_URL environment variable, or non-localhost browser origin,
 *   falling back to the official production domain https://auplacera.vercel.app.
 */

export function getAppUrl(): string {
  // 1. In browser development mode, use local origin (e.g. 5173), but strictly block localhost:3000
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    if (!window.location.origin.includes(':3000')) {
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  // 2. Check explicitly configured Vite environment variable
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes(':3000')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. In production browser runtime, use current host if deployed
  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  // 4. Default canonical production domain
  return 'https://auplacera.vercel.app';
}

/**
 * Returns the full redirect URL for password recovery
 */
export function getResetPasswordRedirectUrl(): string {
  return `${getAppUrl()}/reset-password`;
}

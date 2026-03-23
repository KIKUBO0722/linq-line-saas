/**
 * Returns the API base URL.
 *
 * - Server-side (SSR): always returns the full URL so server-to-server requests work.
 * - Client-side on localhost: returns the full URL for direct dev server connection.
 * - Client-side in production: returns '' (empty string) so requests use relative URLs
 *   and go through Vercel rewrites, making cookies first-party (same-origin).
 */
export function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || '';

  // Server-side rendering: use full URL for server-to-server requests
  if (typeof window === 'undefined') {
    return configured || 'http://localhost:3601';
  }

  // Client-side on localhost: use full URL (direct connection, same-origin on localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return configured || 'http://localhost:3601';
  }

  // Client-side in production: use relative URL (through Vercel rewrites)
  // This ensures cookies are first-party and not blocked as third-party cookies
  return '';
}

/**
 * Returns the full API URL for OAuth redirects.
 *
 * OAuth flows require the browser to redirect to the API server directly
 * (not through Vercel rewrites), so we always return the full URL.
 */
export function getOAuthBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3601';
}

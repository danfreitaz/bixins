// Next.js may construct request.url using its internal listen hostname.
// The browser's Host header describes the public origin; never trust a
// client-supplied x-forwarded-host as an authorization shortcut.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

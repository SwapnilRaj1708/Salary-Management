/** Reads one cookie from a Cookie header. Express 5 has no built-in cookie parsing. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const pair of header?.split(';') ?? []) {
    const [key, ...value] = pair.trim().split('=');
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join('='));
    } catch {
      return undefined; // A malformed escape is a missing cookie, not a server error.
    }
  }
  return undefined;
}

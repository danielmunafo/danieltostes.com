export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true;
  if (!origin) return false;
  return allowed.includes(origin);
}

export function corsHeadersFor(origin: string | undefined): HeadersInit {
  const allowed = getAllowedOrigins();
  const value =
    allowed.length === 0
      ? (origin ?? "*")
      : origin && allowed.includes(origin)
        ? origin
        : (allowed[0] ?? "");
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
  };
}

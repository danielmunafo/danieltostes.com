let hasLoggedMissingAllowedOrigin = false;

function isProductionLambda(): boolean {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    if (isProductionLambda()) {
      if (!hasLoggedMissingAllowedOrigin) {
        hasLoggedMissingAllowedOrigin = true;
        console.warn(
          "[recruiter-api] ALLOWED_ORIGIN is unset in Lambda; denying cross-origin requests"
        );
      }
      return false;
    }
    return true;
  }
  if (!origin) return false;
  return allowed.includes(origin);
}

export function corsHeadersFor(origin: string | undefined): HeadersInit {
  const allowed = getAllowedOrigins();
  const isAllowlistConfigured = allowed.length > 0;
  const value =
    !isAllowlistConfigured && !isProductionLambda()
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

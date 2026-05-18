const OPENAI_API_KEY_JSON_FIELDS = [
  "OPENAI_API_KEY",
  "openai_api_key",
  "openaiApiKey",
] as const;

/**
 * Resolves an OpenAI API key from Secrets Manager `SecretString`.
 * Supports a plain `sk-…` string (SETUP.md default) or JSON objects such as
 * `{"OPENAI_API_KEY":"sk-…"}` (common when reusing a site-wide secret).
 */
export function parseOpenAiApiKeyFromSecret(secretString: string): string {
  const trimmed = secretString.trim();
  if (!trimmed) {
    throw new Error("Secret has empty SecretString");
  }

  const isJsonObject = trimmed.startsWith("{");
  if (!isJsonObject) {
    return trimmed;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Secret looks like JSON but failed to parse");
  }

  if (typeof parsed === "string" && parsed.trim().length > 0) {
    return parsed.trim();
  }

  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    for (const fieldName of OPENAI_API_KEY_JSON_FIELDS) {
      const value = record[fieldName];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    throw new Error(
      `JSON secret must include one of: ${OPENAI_API_KEY_JSON_FIELDS.join(", ")}`
    );
  }

  throw new Error("Unsupported secret JSON shape");
}

const MAX_EXTRA_QUERIES = 5;

const LANGUAGE_PATTERNS: readonly RegExp[] = [
  /\b(german|deutsch|french|spanish|italian|portuguese|mandarin|japanese)\b/gi,
  /\b(fluent|native|bilingual)\b/gi,
];

const STACK_PATTERNS: readonly RegExp[] = [
  /\b(golang|go\s+production|production\s+go)\b/gi,
  /\b(staff|senior)\s+(\w+)\s+(engineer|developer|backend)\b/gi,
];

const EMPLOYMENT_PATTERNS: readonly RegExp[] = [
  /\b(freelance|contractor|full[- ]time|employee only)\b/gi,
];

const LOCATION_PATTERNS: readonly RegExp[] = [
  /\b(hybrid|onsite|on-site|office)\b/gi,
  /\b(berlin|vienna|munich|london|amsterdam)\b/gi,
];

const AUTHORIZATION_PATTERNS: readonly RegExp[] = [
  /\b(visa|work authorization|right to work|work permit)\b/gi,
];

const METADATA_QUERY =
  "languages work permits employment location authorization fluency";

function collectMatches(text: string, patterns: readonly RegExp[]): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      found.push(...matches.map((m) => m.trim()));
    }
  }
  return found;
}

/**
 * Builds conservative extra retrieval queries so language/permits/stack metadata
 * is not drowned out by strong backend evidence chunks.
 */
export function buildJdHardGateRetrievalQueries(jdText: string): string[] {
  const queries = new Set<string>([METADATA_QUERY]);
  const trimmed = jdText.trim();
  if (!trimmed) return [...queries];

  const languageHits = collectMatches(trimmed, LANGUAGE_PATTERNS);
  if (languageHits.length > 0) {
    queries.add(
      `spoken languages fluency ${[...new Set(languageHits)].slice(0, 4).join(" ")}`
    );
  }

  const stackHits = collectMatches(trimmed, STACK_PATTERNS);
  if (stackHits.length > 0) {
    queries.add(
      `production ${[...new Set(stackHits)].slice(0, 4).join(" ")} experience portfolio`
    );
  }

  const employmentHits = collectMatches(trimmed, EMPLOYMENT_PATTERNS);
  if (employmentHits.length > 0) {
    queries.add(
      `employment type ${[...new Set(employmentHits)].slice(0, 3).join(" ")}`
    );
  }

  const locationHits = collectMatches(trimmed, LOCATION_PATTERNS);
  if (locationHits.length > 0) {
    queries.add(
      `location hybrid onsite ${[...new Set(locationHits)].slice(0, 4).join(" ")}`
    );
  }

  const authHits = collectMatches(trimmed, AUTHORIZATION_PATTERNS);
  if (authHits.length > 0) {
    queries.add(
      `work authorization visa ${[...new Set(authHits)].slice(0, 3).join(" ")}`
    );
  }

  return [...queries].slice(0, MAX_EXTRA_QUERIES + 1);
}

const MAX_EXTRA_QUERIES = 6;
const MAX_TERMS_PER_QUERY = 6;

const LANGUAGE_PATTERNS: readonly RegExp[] = [
  /\b(?:english|german|deutsch|french|spanish|italian|portuguese|mandarin|japanese|dutch|polish|swedish|norwegian|danish)\b/gi,
  /\b(?:fluent|native|bilingual|professional proficiency|working proficiency|business fluency|excellent communication skills|written and oral|written and spoken)\b/gi,
  /\b(?:communication skills|communicate clearly|stakeholder communication|cross[-\s]?functional communication)\b/gi,
];

const STACK_PATTERNS: readonly RegExp[] = [
  /\b(?:typescript|node\.js|nodejs|react|next\.js|nextjs|aws|kubernetes|terraform|cypress|ci\/cd|monorepo|data engineering|machine learning|ai|ml)\b/gi,
  /\b(?:backend|frontend|full[-\s]?stack|web applications?|cloud[-\s]?native|infrastructure as code|container orchestration)\b/gi,
  /\b(?:staff|senior|lead|principal)\s+(?:\w+\s+){0,3}(?:engineer|developer|backend|frontend|full[-\s]?stack)\b/gi,
];

const EMPLOYMENT_PATTERNS: readonly RegExp[] = [
  /\b(?:freelance|contractor|contract|b2b|consultant|full[-\s]?time|part[-\s]?time|permanent|employee only|employment type)\b/gi,
];

const LOCATION_PATTERNS: readonly RegExp[] = [
  /\b(?:remote|hybrid|onsite|on-site|office|relocation|timezone|time zone|within\s+\d+\s+hours?)\b/gi,
  /\b(?:berlin|vienna|munich|london|amsterdam|lisbon|porto|madrid|barcelona|paris|europe|eu|emea|cet|cest)\b/gi,
];

const AUTHORIZATION_PATTERNS: readonly RegExp[] = [
  /\b(?:visa|work authorization|right to work|work permit|sponsorship|without sponsorship|eligible to work|eu citizen|european union)\b/gi,
];

const OWNERSHIP_PATTERNS: readonly RegExp[] = [
  /\b(?:ownership|drive projects independently|independently|autonomy|from concept to deployment|end[-\s]?to[-\s]?end|taking full ownership)\b/gi,
];

const PROCESS_PATTERNS: readonly RegExp[] = [
  /\b(?:agile|trunk[-\s]?based development|daily releases|code reviews?|constructive code reviews?|e2e tests?|strict typing|linting|formatting)\b/gi,
];

const METADATA_QUERY =
  "languages communication work authorization employment type location remote hybrid availability";

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

function uniqueTerms(
  matches: string[],
  maxTerms = MAX_TERMS_PER_QUERY
): string {
  return [...new Set(matches.map((match) => match.toLowerCase()))]
    .slice(0, maxTerms)
    .join(" ");
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
      `spoken languages english fluency communication ${uniqueTerms(languageHits)}`
    );
  }

  const stackHits = collectMatches(trimmed, STACK_PATTERNS);
  if (stackHits.length > 0) {
    queries.add(
      `production experience technical stack ${uniqueTerms(stackHits)} portfolio evidence`
    );
  }

  const employmentHits = collectMatches(trimmed, EMPLOYMENT_PATTERNS);
  if (employmentHits.length > 0) {
    queries.add(
      `employment availability contract remote ${uniqueTerms(employmentHits)}`
    );
  }

  const locationHits = collectMatches(trimmed, LOCATION_PATTERNS);
  if (locationHits.length > 0) {
    queries.add(`location remote hybrid timezone ${uniqueTerms(locationHits)}`);
  }

  const authHits = collectMatches(trimmed, AUTHORIZATION_PATTERNS);
  if (authHits.length > 0) {
    queries.add(
      `work authorization visa permit sponsorship ${uniqueTerms(authHits)}`
    );
  }

  const ownershipHits = collectMatches(trimmed, OWNERSHIP_PATTERNS);
  if (ownershipHits.length > 0) {
    queries.add(
      `ownership autonomy independent delivery ${uniqueTerms(ownershipHits)}`
    );
  }

  const processHits = collectMatches(trimmed, PROCESS_PATTERNS);
  if (processHits.length > 0) {
    queries.add(
      `engineering culture agile testing code review ci cd ${uniqueTerms(processHits)}`
    );
  }

  return [...queries].slice(0, MAX_EXTRA_QUERIES + 1);
}

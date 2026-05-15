import type { RecruiterNavLocale } from "./constants.js";

export const RECRUITER_NAV_LOCALE_WRITING_LABEL: Record<
  RecruiterNavLocale,
  string
> = {
  en: "English",
  "pt-BR": "Brazilian Portuguese",
  es: "Spanish",
  it: "Italian",
};

/** Localized "Source" label for `### …` headers in retrieved excerpt blocks. */
export const RECRUITER_CHUNK_SOURCE_LABEL: Record<RecruiterNavLocale, string> =
  {
    en: "Source",
    "pt-BR": "Fonte",
    es: "Fuente",
    it: "Fonte",
  };

/**
 * Markdown headings and table labels for the stage-1 evidence brief. Must match
 * the visitor's site locale so rendered markdown stays in-language (the analyst
 * prompt user turn also requests `RECRUITER_NAV_LOCALE_WRITING_LABEL`).
 */
export type RecruiterEvidenceBriefLabels = {
  readonly headingAlignmentSummary: string;
  readonly headingRequirementCoverage: string;
  readonly headingHighSignalMatches: string;
  readonly headingRelevantProjectEvidence: string;
  readonly headingPotentialConcerns: string;
  readonly headingDeepDiveInterview: string;
  readonly headingOffTopicInput: string;
  readonly offTopicBodyLine: string;
  readonly tableColRequirement: string;
  readonly tableColEvidenceLevel: string;
  readonly tableColNotes: string;
  readonly tableExampleRequirementHint: string;
  readonly tableExampleNotesHint: string;
  readonly termDirectTable: string;
  readonly termAdjacentTable: string;
  readonly termNotEvidencedTable: string;
  readonly termDirectEvidenceDef: string;
  readonly termAdjacentEvidenceDef: string;
  readonly termNotEvidencedDef: string;
};

/**
 * Markdown headings and table labels for the pre-analyst **evidence evaluator**
 * (`streamText` inside thinking markers). Output must match the visitor's site
 * locale; headings are single-sourced here for prompts and user-turn hints.
 */
export type RecruiterEvidenceEvaluatorLabels = {
  readonly headingRequirementCoverage: string;
  readonly tableColRequirement: string;
  readonly tableColImportance: string;
  readonly tableColEvidenceLevel: string;
  readonly tableColNotes: string;
  readonly termMustHaveTable: string;
  readonly termNiceToHaveTable: string;
  readonly termDirectTable: string;
  readonly termAdjacentTable: string;
  readonly termNotEvidencedTable: string;
  readonly termContradictoryTable: string;
  readonly termDirectEvidenceDef: string;
  readonly termAdjacentEvidenceDef: string;
  readonly termNotEvidencedDef: string;
  readonly termContradictoryEvidenceDef: string;
  readonly headingMatchScoreGuidance: string;
  readonly recommendedMatchStrengthLabel: string;
  readonly reasonLabel: string;
  readonly scoreCapsAppliedLabel: string;
  readonly headingSemanticSimilarityWarning: string;
  /** Match guidance: evidence confidence (High/Medium/Low) separate from fit score. */
  readonly evidenceConfidenceLabel: string;
  readonly evidenceConfidenceReasonLabel: string;
};

export const RECRUITER_EVIDENCE_EVALUATOR_LABELS: Record<
  RecruiterNavLocale,
  RecruiterEvidenceEvaluatorLabels
> = {
  en: {
    headingRequirementCoverage: "Requirement Coverage",
    tableColRequirement: "Requirement",
    tableColImportance: "Importance",
    tableColEvidenceLevel: "Evidence Level",
    tableColNotes: "Notes",
    termMustHaveTable: "Must-have",
    termNiceToHaveTable: "Nice-to-have",
    termDirectTable: "Direct",
    termAdjacentTable: "Adjacent",
    termNotEvidencedTable: "Not evidenced",
    termContradictoryTable: "Contradictory",
    termDirectEvidenceDef: "Direct evidence",
    termAdjacentEvidenceDef: "Adjacent evidence",
    termNotEvidencedDef: "Not evidenced",
    termContradictoryEvidenceDef:
      "Contradictory evidence (excerpts conflict with the requirement or each other)",
    headingMatchScoreGuidance: "Match Score Guidance",
    recommendedMatchStrengthLabel: "Recommended match strength",
    reasonLabel: "Reason",
    scoreCapsAppliedLabel: "Score caps applied",
    headingSemanticSimilarityWarning: "Misleading similarity check",
    evidenceConfidenceLabel: "Evidence confidence",
    evidenceConfidenceReasonLabel: "Evidence confidence reason",
  },
  "pt-BR": {
    headingRequirementCoverage: "Cobertura dos requisitos",
    tableColRequirement: "Requisito",
    tableColImportance: "Importância",
    tableColEvidenceLevel: "Nível de evidência",
    tableColNotes: "Observações",
    termMustHaveTable: "Obrigatório",
    termNiceToHaveTable: "Desejável",
    termDirectTable: "Direto",
    termAdjacentTable: "Adjacente",
    termNotEvidencedTable: "Não evidenciado",
    termContradictoryTable: "Contraditório",
    termDirectEvidenceDef: "Evidência direta",
    termAdjacentEvidenceDef: "Evidência adjacente",
    termNotEvidencedDef: "Não evidenciado",
    termContradictoryEvidenceDef:
      "Evidência contraditória (trechos conflitam com o requisito ou entre si)",
    headingMatchScoreGuidance: "Orientação de pontuação de aderência",
    recommendedMatchStrengthLabel: "Pontuação de aderência recomendada",
    reasonLabel: "Motivo",
    scoreCapsAppliedLabel: "Limites de pontuação aplicados",
    headingSemanticSimilarityWarning: "Verificação de similaridade enganosa",
    evidenceConfidenceLabel: "Confiança nas evidências",
    evidenceConfidenceReasonLabel: "Motivo da confiança nas evidências",
  },
  es: {
    headingRequirementCoverage: "Cobertura de requisitos",
    tableColRequirement: "Requisito",
    tableColImportance: "Importancia",
    tableColEvidenceLevel: "Nivel de evidencia",
    tableColNotes: "Notas",
    termMustHaveTable: "Imprescindible",
    termNiceToHaveTable: "Deseable",
    termDirectTable: "Directo",
    termAdjacentTable: "Adyacente",
    termNotEvidencedTable: "Sin evidencia",
    termContradictoryTable: "Contradictorio",
    termDirectEvidenceDef: "Evidencia directa",
    termAdjacentEvidenceDef: "Evidencia adyacente",
    termNotEvidencedDef: "Sin evidencia",
    termContradictoryEvidenceDef:
      "Evidencia contradictoria (los extractos se contradicen con el requisito o entre sí)",
    headingMatchScoreGuidance: "Guía de puntuación de encaje",
    recommendedMatchStrengthLabel: "Puntuación de encaje recomendada",
    reasonLabel: "Motivo",
    scoreCapsAppliedLabel: "Límites de puntuación aplicados",
    headingSemanticSimilarityWarning: "Comprobación de similitud engañosa",
    evidenceConfidenceLabel: "Confianza en la evidencia",
    evidenceConfidenceReasonLabel: "Motivo de la confianza en la evidencia",
  },
  it: {
    headingRequirementCoverage: "Copertura dei requisiti",
    tableColRequirement: "Requisito",
    tableColImportance: "Priorità",
    tableColEvidenceLevel: "Livello di evidenza",
    tableColNotes: "Note",
    termMustHaveTable: "Must-have",
    termNiceToHaveTable: "Nice-to-have",
    termDirectTable: "Diretto",
    termAdjacentTable: "Adiacente",
    termNotEvidencedTable: "Non evidenziato",
    termContradictoryTable: "Contraddittorio",
    termDirectEvidenceDef: "Evidenza diretta",
    termAdjacentEvidenceDef: "Evidenza adiacente",
    termNotEvidencedDef: "Non evidenziato",
    termContradictoryEvidenceDef:
      "Evidenza contraddittoria (estratti in conflitto con il requisito o tra loro)",
    headingMatchScoreGuidance: "Guida al punteggio di aderenza",
    recommendedMatchStrengthLabel: "Punteggio di aderenza consigliato",
    reasonLabel: "Motivo",
    scoreCapsAppliedLabel: "Tetti di punteggio applicati",
    headingSemanticSimilarityWarning: "Controllo su similarità fuorviante",
    evidenceConfidenceLabel: "Confidenza nelle evidenze",
    evidenceConfidenceReasonLabel: "Motivo della confidenza nelle evidenze",
  },
};

export const RECRUITER_EVIDENCE_BRIEF_LABELS: Record<
  RecruiterNavLocale,
  RecruiterEvidenceBriefLabels
> = {
  en: {
    headingAlignmentSummary: "Candidate Alignment Summary",
    headingRequirementCoverage: "Requirement Coverage",
    headingHighSignalMatches: "High-Signal Matches",
    headingRelevantProjectEvidence: "Relevant Project Evidence",
    headingPotentialConcerns: "Potential Concerns or Missing Evidence",
    headingDeepDiveInterview: "Suggested Deep-Dive Interview Areas",
    headingOffTopicInput: "Off-topic input",
    offTopicBodyLine:
      "This assistant only analyzes job descriptions and recruiter messages; paste role or recruiting context to continue.",
    tableColRequirement: "Requirement",
    tableColEvidenceLevel: "Evidence Level",
    tableColNotes: "Notes",
    tableExampleRequirementHint: "requirement from the JD",
    tableExampleNotesHint: "short justification",
    termDirectTable: "Direct",
    termAdjacentTable: "Adjacent",
    termNotEvidencedTable: "Not evidenced",
    termDirectEvidenceDef: "Direct evidence",
    termAdjacentEvidenceDef: "Adjacent evidence",
    termNotEvidencedDef: "Not evidenced",
  },
  "pt-BR": {
    headingAlignmentSummary: "Resumo de alinhamento do candidato",
    headingRequirementCoverage: "Cobertura dos requisitos",
    headingHighSignalMatches: "Correspondências de alto sinal",
    headingRelevantProjectEvidence: "Evidências relevantes de projetos",
    headingPotentialConcerns: "Pontos de atenção ou lacunas de evidência",
    headingDeepDiveInterview:
      "Áreas sugeridas para aprofundamento em entrevista",
    headingOffTopicInput: "Entrada fora do tópico",
    offTopicBodyLine:
      "Este assistente analisa apenas descrições de vaga e mensagens de recrutadores; cole o contexto da vaga ou do recrutamento para continuar.",
    tableColRequirement: "Requisito",
    tableColEvidenceLevel: "Nível de evidência",
    tableColNotes: "Observações",
    tableExampleRequirementHint: "requisito extraído da vaga",
    tableExampleNotesHint: "breve justificativa",
    termDirectTable: "Direto",
    termAdjacentTable: "Adjacente",
    termNotEvidencedTable: "Não evidenciado",
    termDirectEvidenceDef: "Evidência direta",
    termAdjacentEvidenceDef: "Evidência adjacente",
    termNotEvidencedDef: "Não evidenciado",
  },
  es: {
    headingAlignmentSummary: "Resumen de alineación del candidato",
    headingRequirementCoverage: "Cobertura de requisitos",
    headingHighSignalMatches: "Coincidencias de alto valor",
    headingRelevantProjectEvidence: "Evidencia de proyectos relevantes",
    headingPotentialConcerns: "Posibles vacíos o falta de evidencia",
    headingDeepDiveInterview: "Áreas sugeridas para profundizar en entrevista",
    headingOffTopicInput: "Entrada fuera de contexto",
    offTopicBodyLine:
      "Este asistente solo analiza descripciones de puesto y mensajes de reclutadores; pegue el contexto del rol o de selección para continuar.",
    tableColRequirement: "Requisito",
    tableColEvidenceLevel: "Nivel de evidencia",
    tableColNotes: "Notas",
    tableExampleRequirementHint: "requisito de la descripción de puesto",
    tableExampleNotesHint: "breve justificación",
    termDirectTable: "Directo",
    termAdjacentTable: "Adyacente",
    termNotEvidencedTable: "Sin evidencia",
    termDirectEvidenceDef: "Evidencia directa",
    termAdjacentEvidenceDef: "Evidencia adyacente",
    termNotEvidencedDef: "Sin evidencia",
  },
  it: {
    headingAlignmentSummary: "Sintesi dell'allineamento del candidato",
    headingRequirementCoverage: "Copertura dei requisiti",
    headingHighSignalMatches: "Corrispondenze ad alto segnale",
    headingRelevantProjectEvidence: "Evidenze di progetto pertinenti",
    headingPotentialConcerns: "Possibili criticità o mancanza di evidenze",
    headingDeepDiveInterview: "Aree suggerite per approfondimenti in colloquio",
    headingOffTopicInput: "Input fuori tema",
    offTopicBodyLine:
      "Questo assistente analizza solo descrizioni di ruolo e messaggi dei recruiter; incolla il contesto della posizione o del recruiting per continuare.",
    tableColRequirement: "Requisito",
    tableColEvidenceLevel: "Livello di evidenza",
    tableColNotes: "Note",
    tableExampleRequirementHint: "requisito dalla descrizione di ruolo",
    tableExampleNotesHint: "breve motivazione",
    termDirectTable: "Diretto",
    termAdjacentTable: "Adiacente",
    termNotEvidencedTable: "Non evidenziato",
    termDirectEvidenceDef: "Evidenza diretta",
    termAdjacentEvidenceDef: "Evidenza adiacente",
    termNotEvidencedDef: "Non evidenziato",
  },
};

/** Labels for the interests evaluator markdown (server-side only; not streamed), all four nav locales. */
export type RecruiterInterestsAlignmentLabels = {
  readonly headingPreferenceAlignment: string;
  readonly headingPreferenceDealbreakers: string;
  readonly headingPreferenceRecommendation: string;
  readonly tableColDimension: string;
  readonly tableColInferredFromJd: string;
  readonly tableColAlignment: string;
  readonly tableColNotes: string;
  readonly termAligned: string;
  readonly termDiscuss: string;
  readonly termUnknown: string;
  readonly termMisaligned: string;
  readonly termDealbreaker: string;
  readonly preferenceScoreLinePrefix: string;
  readonly noDealbreakersLine: string;
};

export const RECRUITER_INTERESTS_ALIGNMENT_LABELS: Record<
  RecruiterNavLocale,
  RecruiterInterestsAlignmentLabels
> = {
  en: {
    headingPreferenceAlignment: "Preference Alignment",
    headingPreferenceDealbreakers: "Preference Dealbreakers",
    headingPreferenceRecommendation: "Preference Recommendation",
    tableColDimension: "Dimension",
    tableColInferredFromJd: "Inferred from JD",
    tableColAlignment: "Alignment",
    tableColNotes: "Notes",
    termAligned: "Aligned",
    termDiscuss: "Discuss",
    termUnknown: "Unknown",
    termMisaligned: "Misaligned",
    termDealbreaker: "Dealbreaker",
    preferenceScoreLinePrefix: "Preference alignment score",
    noDealbreakersLine: "No explicit dealbreaker detected.",
  },
  "pt-BR": {
    headingPreferenceAlignment: "Alinhamento de preferências",
    headingPreferenceDealbreakers: "Bloqueios de preferência",
    headingPreferenceRecommendation: "Recomendação de preferências",
    tableColDimension: "Dimensão",
    tableColInferredFromJd: "Inferido da vaga",
    tableColAlignment: "Alinhamento",
    tableColNotes: "Observações",
    termAligned: "Alinhado",
    termDiscuss: "A discutir",
    termUnknown: "Desconhecido",
    termMisaligned: "Desalinhado",
    termDealbreaker: "Bloqueante",
    preferenceScoreLinePrefix: "Pontuação de alinhamento de preferências",
    noDealbreakersLine: "Nenhum bloqueio explícito detectado.",
  },
  es: {
    headingPreferenceAlignment: "Alineación de preferencias",
    headingPreferenceDealbreakers: "Requisitos innegociables (preferencias)",
    headingPreferenceRecommendation: "Recomendación de preferencias",
    tableColDimension: "Dimensión",
    tableColInferredFromJd: "Inferido de la oferta",
    tableColAlignment: "Alineación",
    tableColNotes: "Notas",
    termAligned: "Alineado",
    termDiscuss: "A conversar",
    termUnknown: "Desconocido",
    termMisaligned: "Desalineado",
    termDealbreaker: "Bloqueante",
    preferenceScoreLinePrefix: "Puntuación de alineación de preferencias",
    noDealbreakersLine: "No se detectó ningún bloqueo explícito.",
  },
  it: {
    headingPreferenceAlignment: "Allineamento delle preferenze",
    headingPreferenceDealbreakers: "Preferenze bloccanti",
    headingPreferenceRecommendation: "Raccomandazione sulle preferenze",
    tableColDimension: "Dimensione",
    tableColInferredFromJd: "Ricavato dalla job description",
    tableColAlignment: "Allineamento",
    tableColNotes: "Note",
    termAligned: "Allineato",
    termDiscuss: "Da chiarire",
    termUnknown: "Sconosciuto",
    termMisaligned: "Non allineato",
    termDealbreaker: "Bloccante",
    preferenceScoreLinePrefix: "Punteggio di allineamento preferenze",
    noDealbreakersLine: "Nessun blocco esplicito rilevato.",
  },
};

/** Level-1 markdown titles for the streamed recruiter-facing executive brief (stage 2). */
export type RecruiterExecutiveBriefHeadings = {
  readonly verdict: string;
  readonly scores: string;
  readonly whyMatches: string;
  readonly mainRisks: string;
  readonly whyNotHigher: string;
  readonly practicalFitRisks: string;
  readonly interviewFocus: string;
  readonly bestPositioning: string;
};

export const RECRUITER_EXECUTIVE_BRIEF_HEADINGS: Record<
  RecruiterNavLocale,
  RecruiterExecutiveBriefHeadings
> = {
  en: {
    verdict: "Verdict",
    scores: "Scores",
    whyMatches: "Why It Matches",
    mainRisks: "Main Risks",
    whyNotHigher: "Why Not Higher?",
    practicalFitRisks: "Practical Fit Risks",
    interviewFocus: "Recommended Interview Focus",
    bestPositioning: "Best Positioning Angle",
  },
  "pt-BR": {
    verdict: "Veredito",
    scores: "Pontuações",
    whyMatches: "Por que faz sentido",
    mainRisks: "Principais riscos",
    whyNotHigher: "Por que não é maior?",
    practicalFitRisks: "Riscos práticos de aderência",
    interviewFocus: "Foco sugerido para entrevista",
    bestPositioning: "Melhor ângulo de posicionamento",
  },
  es: {
    verdict: "Veredicto",
    scores: "Puntuaciones",
    whyMatches: "Por qué encaja",
    mainRisks: "Principales riesgos",
    whyNotHigher: "¿Por qué no es mayor?",
    practicalFitRisks: "Riesgos prácticos de encaje",
    interviewFocus: "Enfoque recomendado para la entrevista",
    bestPositioning: "Mejor ángulo de posicionamiento",
  },
  it: {
    verdict: "Verdetto",
    scores: "Punteggi",
    whyMatches: "Perché è in linea",
    mainRisks: "Rischi principali",
    whyNotHigher: "Perché non più alto?",
    practicalFitRisks: "Rischi pratici di aderenza",
    interviewFocus: "Focus consigliato per il colloquio",
    bestPositioning: "Miglior angolo di posizionamento",
  },
};

/**
 * Risk severity prefixes for `# Main Risks` bullets in the recruiter pitch
 * (bold label + colon + description). Must match portfolio writing language.
 */
export type RecruiterRiskSeverityLabels = {
  readonly major: string;
  readonly moderate: string;
  readonly minor: string;
  readonly minorToModerate: string;
};

export const RECRUITER_RISK_SEVERITY_LABELS: Record<
  RecruiterNavLocale,
  RecruiterRiskSeverityLabels
> = {
  en: {
    major: "Major",
    moderate: "Moderate",
    minor: "Minor",
    minorToModerate: "Minor-to-moderate",
  },
  "pt-BR": {
    major: "Maior",
    moderate: "Moderada",
    minor: "Menor",
    minorToModerate: "Menor a moderada",
  },
  es: {
    major: "Mayor",
    moderate: "Moderado",
    minor: "Menor",
    minorToModerate: "De menor a moderado",
  },
  it: {
    major: "Maggiore",
    moderate: "Moderato",
    minor: "Minore",
    minorToModerate: "Da minore a moderato",
  },
};

/** Allowed evidence-confidence tokens in evaluator + pitch (per visitor locale). */
export type RecruiterEvidenceConfidenceTokens = {
  readonly high: string;
  readonly medium: string;
  readonly low: string;
};

export const RECRUITER_EVIDENCE_CONFIDENCE_TOKENS: Record<
  RecruiterNavLocale,
  RecruiterEvidenceConfidenceTokens
> = {
  en: { high: "High", medium: "Medium", low: "Low" },
  "pt-BR": { high: "Alta", medium: "Média", low: "Baixa" },
  es: { high: "Alta", medium: "Media", low: "Baja" },
  it: { high: "Alta", medium: "Media", low: "Bassa" },
};

/** Hiring recommendation label the pitch must choose exactly one of (localized). */
export type RecruiterRecommendationLabels = {
  readonly strongPursue: string;
  readonly pursue: string;
  readonly maybeValidate: string;
  readonly weakFit: string;
  readonly skip: string;
};

export const RECRUITER_RECOMMENDATION_LABELS: Record<
  RecruiterNavLocale,
  RecruiterRecommendationLabels
> = {
  en: {
    strongPursue: "Strong pursue",
    pursue: "Pursue",
    maybeValidate: "Maybe / validate first",
    weakFit: "Weak fit",
    skip: "Skip",
  },
  "pt-BR": {
    strongPursue: "Forte priorização",
    pursue: "Priorizar",
    maybeValidate: "Talvez / validar antes",
    weakFit: "Baixa aderência",
    skip: "Não seguir",
  },
  es: {
    strongPursue: "Impulsar con fuerza",
    pursue: "Impulsar",
    maybeValidate: "Tal vez / validar antes",
    weakFit: "Encaje débil",
    skip: "Descartar",
  },
  it: {
    strongPursue: "Forte spinta",
    pursue: "Procedere",
    maybeValidate: "Forse / validare prima",
    weakFit: "Scarso aderenza",
    skip: "Saltare",
  },
};

/** Appended `## References` block (post-stream), localized like the pitch. */
export type RecruiterReferencesLabels = {
  readonly heading: string;
  readonly intro: string;
  readonly sourceLabel: string;
  /** Primary signal for vector match quality (replaces raw % as headline). */
  readonly supportLevelLabel: string;
  readonly supportStrong: string;
  readonly supportModerate: string;
  readonly supportWeakManual: string;
  readonly supportUnsupportedManual: string;
  /** Secondary line, e.g. "Similarity (secondary): 51%". */
  readonly similaritySecondaryLabel: string;
  /** Legacy label; retained for compatibility with older tests/copy. */
  readonly matchScoreLabel: string;
  /** Use `{threshold}` as placeholder for the formatted threshold percentage. */
  readonly matchScoreBelowThresholdSuffix: string;
  readonly noVectorMatchCaveat: string;
  readonly portfolioSourceFallback: string;
  /** Heading for the gap-claims subsection (items not evidenced in portfolio). */
  readonly notEvidencedHeading: string;
};

export const RECRUITER_REFERENCES_LABELS: Record<
  RecruiterNavLocale,
  RecruiterReferencesLabels
> = {
  en: {
    heading: "References",
    intro:
      "Per-claim closest portfolio excerpt (vector retrieval). Support level summarizes match quality; verify critical claims manually:",
    sourceLabel: "Source",
    supportLevelLabel: "Support level",
    supportStrong: "Strong",
    supportModerate: "Moderate",
    supportWeakManual: "Weak — manual review",
    supportUnsupportedManual: "Unsupported — manual review",
    similaritySecondaryLabel: "Similarity (secondary)",
    matchScoreLabel: "Match score",
    matchScoreBelowThresholdSuffix:
      "below confidence threshold ({threshold}), please double check",
    noVectorMatchCaveat:
      "Lacking vector matching evidence — please double check",
    portfolioSourceFallback: "Portfolio source",
    notEvidencedHeading: "Not Evidenced in Retrieved Portfolio Excerpts",
  },
  "pt-BR": {
    heading: "Referências",
    intro:
      "Trecho mais próximo do portfólio por similaridade vetorial, por afirmação. O nível de suporte resume a qualidade da correspondência; confira manualmente o que for crítico:",
    sourceLabel: "Fonte",
    supportLevelLabel: "Nível de suporte",
    supportStrong: "Forte",
    supportModerate: "Moderado",
    supportWeakManual: "Fraco — revisão manual",
    supportUnsupportedManual: "Sem suporte — revisão manual",
    similaritySecondaryLabel: "Similaridade (secundária)",
    matchScoreLabel: "Pontuação de correspondência",
    matchScoreBelowThresholdSuffix:
      "abaixo do limiar de confiança ({threshold}), confira manualmente",
    noVectorMatchCaveat:
      "Sem evidência de correspondência vetorial — confira manualmente",
    portfolioSourceFallback: "Fonte do portfólio",
    notEvidencedHeading: "Não evidenciado nos trechos do portfólio recuperados",
  },
  es: {
    heading: "Referencias",
    intro:
      "Extracto más cercano del portafolio por similitud vectorial, por afirmación. El nivel de soporte resume la calidad de la coincidencia; verifique manualmente lo crítico:",
    sourceLabel: "Fuente",
    supportLevelLabel: "Nivel de soporte",
    supportStrong: "Fuerte",
    supportModerate: "Moderado",
    supportWeakManual: "Débil — revisión manual",
    supportUnsupportedManual: "Sin soporte — revisión manual",
    similaritySecondaryLabel: "Similitud (secundaria)",
    matchScoreLabel: "Puntuación de coincidencia",
    matchScoreBelowThresholdSuffix:
      "por debajo del umbral de confianza ({threshold}), verifique manualmente",
    noVectorMatchCaveat:
      "Sin evidencia de coincidencia vectorial — verifique manualmente",
    portfolioSourceFallback: "Fuente del portafolio",
    notEvidencedHeading:
      "No evidenciado en los extractos del portafolio recuperados",
  },
  it: {
    heading: "Riferimenti",
    intro:
      "Estratto più vicino nel portfolio per similarità vettoriale, per affermazione. Il livello di supporto riassume la qualità della corrispondenza; verificare manualmente quanto critico:",
    sourceLabel: "Fonte",
    supportLevelLabel: "Livello di supporto",
    supportStrong: "Forte",
    supportModerate: "Moderato",
    supportWeakManual: "Debole — revisione manuale",
    supportUnsupportedManual: "Non supportato — revisione manuale",
    similaritySecondaryLabel: "Similarità (secondaria)",
    matchScoreLabel: "Punteggio di corrispondenza",
    matchScoreBelowThresholdSuffix:
      "sotto la soglia di confidenza ({threshold}), verificare manualmente",
    noVectorMatchCaveat:
      "Nessuna evidenza di corrispondenza vettoriale — verificare manualmente",
    portfolioSourceFallback: "Fonte del portfolio",
    notEvidencedHeading:
      "Non evidenziato negli estratti del portfolio recuperati",
  },
};

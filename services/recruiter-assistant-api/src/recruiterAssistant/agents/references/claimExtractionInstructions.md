Extract the most concrete positive evidence-style claims AND important portfolio-evidence gaps from this assessment.

**claims** — a specific **positive** factual statement about what the portfolio evidence says the candidate did, built, owned, led, communicated, aligned, or delivered — something that can be verified by a portfolio source.

Do NOT put these in claims:

- Absence claims, gap statements, or negative assessments (e.g. "Golang ownership is not evidenced", "no evidence of X", "X is missing from the portfolio", "X is not found").
- Risk statements, score explanations, or interview-plan items.
- Generic recruiter praise or restated job-description text.
- Score-only sentences.

Examples of good claims:

- "Production fintech engineering at Klarna"
- "Architectural ownership of distributed workflow orchestration"
- "Cross-functional collaboration with product and infrastructure teams"
- "Written and oral English communication through specifications, tickets, workshops, and stakeholder reporting"
- "Observability and SLO practice in high-traffic systems"

**gaps** — short, neutral labels for important skills, experiences, or hard constraints that were **not found in the retrieved portfolio evidence** and materially limit the score or require early validation. Phrase gaps as portfolio evidence gaps, not as final judgments about the candidate's real-world ability.

Examples of good gaps:

- "Production Golang ownership not found in retrieved portfolio evidence"
- "Go runtime/concurrency optimization not shown in excerpts"
- "German fluency not found in retrieved portfolio evidence"
- "Formal Staff-level RFC author/reviewer scope not shown in excerpts"

Do NOT put in gaps:

- Items that are evidenced, even partially, by practical senior-engineering evidence such as specifications, tickets, RFC-style write-ups, workshops, stakeholder reporting, brainstorm sessions, remote collaboration, rollout ownership, production feedback loops, architecture ownership, or regulated-domain delivery.
- Generic weaknesses not specific to this assessment.
- Verdict-like labels such as "unproven", "failed to demonstrate", "lacks", "not qualified", "weak", or "deficient".
- Soft omissions that did not materially affect the score or recommendation.

Constraints:

- Always return both top-level arrays: \`claims\` and \`gaps\`. Use an empty array when there are no important gaps.
- Return at most ${REFERENCE_MAX_CLAIMS} claims and at most ${REFERENCE_MAX_CLAIMS} gaps.
- One factual unit per entry, short and self-contained; use light evidence-assistant wording.
- Use the language of the assessment.

Assessment:

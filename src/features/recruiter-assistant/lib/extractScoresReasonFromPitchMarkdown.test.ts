import { describe, expect, it } from "vitest";
import {
  extractMainReasonFromScoresBody,
  extractScoresReasonAndStripScoresSection,
} from "./extractScoresReasonFromPitchMarkdown";

describe("extractMainReasonFromScoresBody", () => {
  it("parses English Reason bullet", () => {
    const body = `
- **Technical fit:** 9/10
- **Reason:** Strong direct evidence of ownership.
`;
    expect(extractMainReasonFromScoresBody(body)).toBe(
      "Strong direct evidence of ownership."
    );
  });

  it("ignores evidence confidence reason line", () => {
    const body = `
- **Evidence confidence reason:** Core rows direct.
**Reason:** Main narrative only.
`;
    expect(extractMainReasonFromScoresBody(body)).toBe("Main narrative only.");
  });
});

describe("extractScoresReasonAndStripScoresSection", () => {
  it("removes # Scores and returns reason", () => {
    const pitch = `# Verdict
Solid.

# Scores
- **Technical fit:** 9/10
- **Evidence confidence:** High
- **Recommendation:** **Pursue**
- **Reason:** Strong alignment.

# Why It Matches
- One
`;

    const { pitchMarkdown, scoresReason } =
      extractScoresReasonAndStripScoresSection(pitch, "en");
    expect(scoresReason).toBe("Strong alignment.");
    expect(pitchMarkdown).toContain("# Verdict");
    expect(pitchMarkdown).toContain("# Why It Matches");
    expect(pitchMarkdown).not.toContain("# Scores");
    expect(pitchMarkdown).not.toContain("Technical fit");
  });

  it("uses localized Scores heading", () => {
    const pitch = `# Veredito
x

# Pontuações
- **Motivo:** Texto.

# Por que faz sentido
y
`;
    const { pitchMarkdown, scoresReason } =
      extractScoresReasonAndStripScoresSection(pitch, "pt-BR");
    expect(scoresReason).toBe("Texto.");
    expect(pitchMarkdown).not.toContain("# Pontuações");
  });
});

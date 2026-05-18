import { describe, expect, it } from "vitest";
import {
  hasBestPositioningAngleSectionFinished,
  hasBestPositioningAngleSectionStarted,
  hasScoresSectionFinished,
  splitBriefingMarkdown,
  splitExecutiveBriefMarkdown,
  splitPitchAndReferencesMarkdown,
  trimPitchMarkdownBeforeMatchProfileReady,
} from "./split-briefing-markdown";

describe("hasBestPositioningAngleSectionStarted", () => {
  it("is false before the localized h1 line is complete", () => {
    expect(
      hasBestPositioningAngleSectionStarted(
        "# Verdict\nGo\n\n# Best Positioning",
        "en"
      )
    ).toBe(false);
  });

  it("is true once the English heading line is present", () => {
    expect(
      hasBestPositioningAngleSectionStarted(
        "# Verdict\n\n# Best Positioning Angle\n\nParagraph.",
        "en"
      )
    ).toBe(true);
  });

  it("uses Italian heading for it locale", () => {
    expect(
      hasBestPositioningAngleSectionStarted(
        "# Verdetto\n\n# Miglior angolo di posizionamento\n",
        "it"
      )
    ).toBe(true);
  });
});

describe("hasScoresSectionFinished", () => {
  it("is false while the Scores section is still streaming", () => {
    expect(
      hasScoresSectionFinished(
        "# Verdict\nGo\n\n# Scores\n- **Technical fit:** 9/10",
        "en"
      )
    ).toBe(false);
  });

  it("is true once the next h1 after Scores has started", () => {
    expect(
      hasScoresSectionFinished(
        "# Verdict\n\n# Scores\n- **Technical fit:** 9/10\n\n# Why It Matches\n- a",
        "en"
      )
    ).toBe(true);
  });
});

describe("hasBestPositioningAngleSectionFinished", () => {
  it("is false while Best Positioning Angle body is still streaming", () => {
    expect(
      hasBestPositioningAngleSectionFinished(
        "# Verdict\n\n# Best Positioning Angle\n\nOpening paragraph.",
        "en"
      )
    ).toBe(false);
  });

  it("is true once references follow the section", () => {
    expect(
      hasBestPositioningAngleSectionFinished(
        "# Verdict\n\n# Best Positioning Angle\n\nParagraph.\n\n## References\n",
        "en"
      )
    ).toBe(true);
  });
});

describe("trimPitchMarkdownBeforeMatchProfileReady", () => {
  it("keeps verdict content before Scores begins", () => {
    const md = "# Verdict\nStrong fit.\n\n# Scores\n- **Technical fit:** 9/10";
    expect(trimPitchMarkdownBeforeMatchProfileReady(md, "en")).toBe(
      "# Verdict\nStrong fit."
    );
  });

  it("returns the full pitch when Scores has not started", () => {
    const md = "# Verdict\nStrong fit.";
    expect(trimPitchMarkdownBeforeMatchProfileReady(md, "en")).toBe(md);
  });
});

describe("splitPitchAndReferencesMarkdown", () => {
  it("splits pitch from localized references heading", () => {
    const md = `# Verdict\nGo\n\n## References\n\nIntro\n\n1. **x**`;
    const out = splitPitchAndReferencesMarkdown(md, "en");
    expect(out.pitchMarkdown).toContain("# Verdict");
    expect(out.referencesMarkdown).toContain("## References");
    expect(out.pitchMarkdown).not.toContain("## References");
  });

  it("does not split when the references heading appears only in pitch prose", () => {
    const md = `# Verdict\nSee ## References below for sources.\n\nMore pitch.`;
    const out = splitPitchAndReferencesMarkdown(md, "en");
    expect(out.referencesMarkdown).toBeNull();
    expect(out.pitchMarkdown).toBe(md);
  });

  it("uses Italian references heading for it locale", () => {
    const md = `Body\n\n## Riferimenti\n\nMore`;
    const out = splitPitchAndReferencesMarkdown(md, "it");
    expect(out.pitchMarkdown.trim()).toBe("Body");
    expect(out.referencesMarkdown).toContain("## Riferimenti");
  });
});

describe("splitExecutiveBriefMarkdown", () => {
  it("splits on single-hash headings and ignores level-2", () => {
    const md = `# Verdict\nOne\n\n# Scores\n- a\n\n## References\n(not split here)`;
    const out = splitExecutiveBriefMarkdown(md);
    expect(out).not.toBeNull();
    expect(out!.sections.map((s) => s.title)).toEqual(["Verdict", "Scores"]);
    expect(out!.sections[1].body).toContain("- a");
    expect(out!.sections[1].body).toContain("## References");
  });
});

describe("splitBriefingMarkdown", () => {
  it("returns null when there are no level-2 headings", () => {
    expect(splitBriefingMarkdown("Hello\n\nworld.")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(splitBriefingMarkdown("  ")).toBeNull();
  });

  it("splits intro and sections on ## headings", () => {
    const md = `Opening paragraph one.

## Candidate Fit Assessment

Fit body here.

## Match Strength

8/10 because reasons.`;
    const out = splitBriefingMarkdown(md);
    expect(out).not.toBeNull();
    expect(out!.intro).toContain("Opening paragraph");
    expect(out!.sections).toHaveLength(2);
    expect(out!.sections[0].title).toBe("Candidate Fit Assessment");
    expect(out!.sections[0].body).toContain("Fit body");
    expect(out!.sections[1].title).toBe("Match Strength");
    expect(out!.sections[1].body).toContain("8/10");
  });

  it("handles section with no body", () => {
    const md = `## Title Only`;
    const out = splitBriefingMarkdown(md);
    expect(out).not.toBeNull();
    expect(out!.intro).toBe("");
    expect(out!.sections).toEqual([{ title: "Title Only", body: "" }]);
  });
});

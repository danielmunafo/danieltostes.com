import { describe, expect, it } from "vitest";
import {
  RECRUITER_INTERESTS_ALIGNMENT_LABELS,
  RECRUITER_NAV_LOCALES,
} from "../src/constants.js";

const REQUIRED_KEYS = [
  "headingPreferenceAlignment",
  "headingPreferenceDealbreakers",
  "headingPreferenceRecommendation",
  "tableColDimension",
  "tableColInferredFromJd",
  "tableColAlignment",
  "tableColNotes",
  "termAligned",
  "termDiscuss",
  "termUnknown",
  "termMisaligned",
  "termDealbreaker",
  "preferenceScoreLinePrefix",
  "noDealbreakersLine",
] as const;

describe("RECRUITER_INTERESTS_ALIGNMENT_LABELS", () => {
  it("defines every required key for each nav locale", () => {
    for (const locale of RECRUITER_NAV_LOCALES) {
      const labels = RECRUITER_INTERESTS_ALIGNMENT_LABELS[locale];
      for (const key of REQUIRED_KEYS) {
        expect(typeof labels[key]).toBe("string");
        expect(labels[key].trim().length).toBeGreaterThan(0);
      }
    }
  });
});

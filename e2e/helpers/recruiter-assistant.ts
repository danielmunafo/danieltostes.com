import { expect, type Locator, type Page } from "@playwright/test";
import {
  getRecruiterTestEnv,
  RECRUITER_E2E_TEST_TIMEOUT_MS,
} from "../recruiter-test-env";
import type { RecruiterMatchExpectation } from "./recruiter-assistant-expectations";

const RECRUITER_E2E_LOCALE = "en";

export const RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY =
  "danieltostes.recruiterAssistant.termsAccepted.v4" as const;

export const RECRUITER_E2E_PIPELINE_TIMEOUT_MS = RECRUITER_E2E_TEST_TIMEOUT_MS;

const ASSISTANT_HEADING = /AI Recruiter Assistant/i;
const JOB_DESCRIPTION_PROMPT = /paste the job description/i;
const SEND_BUTTON = "Send";
const ASSESSMENT_SUMMARY_HEADING = "Assessment summary";
const TECHNICAL_FIT_LABEL = "Technical fit";
const EVIDENCE_CONFIDENCE_LABEL = "Evidence confidence";
const RECOMMENDATION_LABEL = "Recommendation";
const EVIDENCE_REVIEW_LABEL = "Evidence review";
const ROLE_CONTEXT_LABEL = "Role Context";
const JOB_DESCRIPTION_SECTION = "Job description";
const BRIEFING_SECTION_HEADING = "Candidate fit briefing";
const COPY_BRIEFING_BUTTON = "Copy";
const UNAVAILABLE_ALERT = /Assistant is not configured/i;

function recruiterE2eSetupHint(): string {
  const { sitePort, apiPort, siteOrigin, recruiterApiBaseUrl } =
    getRecruiterTestEnv();
  return (
    `Start the recruiter stack (see .env.test): API :${apiPort}, site :${sitePort}, ` +
    `ALLOWED_ORIGIN=${siteOrigin}, NEXT_PUBLIC_RECRUITER_API_URL=${recruiterApiBaseUrl}, ` +
    "or run npm run test:e2e:recruiter:stack."
  );
}

const RECRUITER_CHAT_POST_TIMEOUT_MS = 30_000;

function recruiterConversationLog(page: Page): Locator {
  return page.getByRole("log");
}

function isRecruiterChatPostResponse(response: {
  request: () => { method: () => string };
  url: () => string;
}): boolean {
  const isPost = response.request().method() === "POST";
  const url = response.url();
  const { apiPort, recruiterApiBaseUrl } = getRecruiterTestEnv();
  const apiHost = recruiterApiBaseUrl.replace(/^https?:\/\//, "");
  return (
    isPost &&
    (url.includes(apiHost) ||
      url.includes(`127.0.0.1:${apiPort}`) ||
      url.includes(`localhost:${apiPort}`) ||
      url.includes("/recruiter"))
  );
}

export async function prepareRecruiterAssistantPage(page: Page): Promise<void> {
  await page.addInitScript((storageKey: string) => {
    window.sessionStorage.setItem(storageKey, "1");
  }, RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY);

  await page.goto(`/${RECRUITER_E2E_LOCALE}`);
  await expect(
    page.getByRole("heading", { name: ASSISTANT_HEADING })
  ).toBeVisible();

  const assistantSection = page.locator("#section-assistant");
  await assistantSection.scrollIntoViewIfNeeded();
  await expect(assistantSection).toBeInViewport();

  const unavailableAlert = page.getByText(UNAVAILABLE_ALERT);
  if (await unavailableAlert.isVisible()) {
    throw new Error(recruiterE2eSetupHint());
  }
}

export async function submitJobDescription(
  page: Page,
  jobDescription: string
): Promise<void> {
  const prompt = page.getByRole("textbox", { name: JOB_DESCRIPTION_PROMPT });
  await expect(prompt).toBeVisible();
  await prompt.fill(jobDescription);
  const chatPost = page.waitForResponse(isRecruiterChatPostResponse, {
    timeout: RECRUITER_CHAT_POST_TIMEOUT_MS,
  });
  await page.getByRole("button", { name: SEND_BUTTON }).click();
  try {
    await chatPost;
  } catch {
    throw new Error(
      `${recruiterE2eSetupHint()} No recruiter API POST within ${RECRUITER_CHAT_POST_TIMEOUT_MS}ms after Send.`
    );
  }
}

/** Stack that wraps the assessment summary heading and summary cards. */
function assessmentSummaryRegion(page: Page): Locator {
  return recruiterConversationLog(page)
    .getByRole("heading", { name: ASSESSMENT_SUMMARY_HEADING })
    .locator("xpath=..");
}

export async function waitForRecruiterPipelineComplete(
  page: Page
): Promise<void> {
  const log = recruiterConversationLog(page);

  // Scope to the message log — the composer shows the same "Job description"
  // heading while the textarea is filled, before any message is submitted.
  await expect(
    log.getByRole("heading", { name: JOB_DESCRIPTION_SECTION })
  ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });

  try {
    await expect(
      log.getByRole("button", { name: ROLE_CONTEXT_LABEL })
    ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });
  } catch (error) {
    const isSendStillVisible = await page
      .getByRole("button", { name: SEND_BUTTON })
      .isVisible();
    if (isSendStillVisible) {
      throw new Error(
        `${recruiterE2eSetupHint()} Pipeline stuck at composer (Send still visible). Original: ${String(error)}`
      );
    }
    throw error;
  }

  await expect(
    log.getByRole("heading", { name: BRIEFING_SECTION_HEADING })
  ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });

  // Collapsible panels use ButtonBase titles, not heading roles.
  await expect(
    log.getByRole("button", { name: EVIDENCE_REVIEW_LABEL })
  ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });

  // Loaded chart UI only (skeleton / pitch markdown must not satisfy this).
  await expect(
    log
      .filter({
        has: log.getByRole("heading", { name: ASSESSMENT_SUMMARY_HEADING }),
      })
      .filter({ has: log.getByText(TECHNICAL_FIT_LABEL) })
  ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });

  const summary = assessmentSummaryRegion(page);
  await expect(
    summary.getByRole("heading", { name: ASSESSMENT_SUMMARY_HEADING })
  ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });
  await expect(summary.getByText(TECHNICAL_FIT_LABEL)).toBeVisible({
    timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS,
  });
  await expect(summary.getByText(EVIDENCE_CONFIDENCE_LABEL)).toBeVisible({
    timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS,
  });
  await expect(summary.getByText(RECOMMENDATION_LABEL)).toBeVisible({
    timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS,
  });

  // Briefing complete: copy is available; composer is dismissed (Send is not shown).
  await expect(
    page.getByRole("button", { name: COPY_BRIEFING_BUTTON })
  ).toBeVisible({ timeout: RECRUITER_E2E_PIPELINE_TIMEOUT_MS });
}

export type ParsedMatchProfile = {
  technicalFit: number;
  evidenceConfidence: string;
  recommendation: string;
};

export async function readMatchProfile(
  page: Page
): Promise<ParsedMatchProfile> {
  const summary = assessmentSummaryRegion(page);
  const technicalFitText = await summary
    .getByText(/^\d+\/10$/)
    .first()
    .textContent();
  const technicalFitMatch = technicalFitText?.match(/^(\d+)\/10$/);
  const technicalFit = technicalFitMatch
    ? Number(technicalFitMatch[1])
    : Number.NaN;

  const confidenceCandidates = ["High", "Medium", "Low"] as const;
  let evidenceConfidence = "";
  for (const label of confidenceCandidates) {
    const locator = summary.getByText(label, { exact: true });
    if ((await locator.count()) > 0) {
      evidenceConfidence = label;
      break;
    }
  }

  const recommendationLabels = [
    "Strong pursue",
    "Pursue",
    "Maybe / validate first",
    "Weak fit",
    "Skip",
  ] as const;
  let recommendation = "";
  for (const label of recommendationLabels) {
    const locator = summary.getByText(label, { exact: true });
    if ((await locator.count()) > 0) {
      recommendation = label;
      break;
    }
  }

  return { technicalFit, evidenceConfidence, recommendation };
}

function isMatchProfileWithinBands(
  profile: ParsedMatchProfile,
  expectation: RecruiterMatchExpectation
): boolean {
  const isTechnicalFitInRange =
    profile.technicalFit >= expectation.technicalFitMin &&
    profile.technicalFit <= expectation.technicalFitMax;
  const isConfidenceAllowed = expectation.evidenceConfidences.includes(
    profile.evidenceConfidence
  );
  const isRecommendationAllowed = expectation.recommendations.includes(
    profile.recommendation
  );
  return (
    isTechnicalFitInRange && isConfidenceAllowed && isRecommendationAllowed
  );
}

export async function expectMatchProfileBands(
  page: Page,
  expectation: RecruiterMatchExpectation
): Promise<void> {
  const profile = await readMatchProfile(page);
  const isWithinBands = isMatchProfileWithinBands(profile, expectation);
  expect(
    isWithinBands,
    `Match profile ${JSON.stringify(profile)} outside bands ${JSON.stringify(expectation)}`
  ).toBe(true);
}

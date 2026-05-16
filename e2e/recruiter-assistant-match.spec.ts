import { test } from "@playwright/test";
import {
  BAD_MATCH_FISKALY_STYLE_JD,
  BAD_MATCH_GERMAN_INTERVIEW_ENGINEER_JD,
  BAD_MATCH_PYTHON_EVALUATOR_JD,
  COMPLETE_MISMATCH_ML_AUDITOR_JD,
  OK_BACKEND_PLATFORM_JD,
  PERFECTION_STAFF_PLATFORM_JD,
} from "./fixtures/job-descriptions";
import { RECRUITER_MATCH_EXPECTATIONS } from "./helpers/recruiter-assistant-expectations";
import {
  expectMatchProfileBands,
  prepareRecruiterAssistantPage,
  submitJobDescription,
  waitForRecruiterPipelineComplete,
} from "./helpers/recruiter-assistant";

const isRecruiterE2eSkipped = process.env.SKIP_RECRUITER_E2E === "1";

test.describe.configure({ mode: "serial" });

test.describe("recruiter assistant match scenarios", () => {
  test.skip(isRecruiterE2eSkipped, "SKIP_RECRUITER_E2E=1");

  test.beforeEach(async ({ page }) => {
    await prepareRecruiterAssistantPage(page);
  });

  test("perfection — strong portfolio-aligned staff platform role", async ({
    page,
  }) => {
    const jobDescription = PERFECTION_STAFF_PLATFORM_JD;
    await submitJobDescription(page, jobDescription);
    await waitForRecruiterPipelineComplete(page);
    await expectMatchProfileBands(
      page,
      RECRUITER_MATCH_EXPECTATIONS.perfection
    );
  });

  test("ok — backend platform fit with JVM-primary gaps", async ({ page }) => {
    const jobDescription = OK_BACKEND_PLATFORM_JD;
    await submitJobDescription(page, jobDescription);
    await waitForRecruiterPipelineComplete(page);
    await expectMatchProfileBands(page, RECRUITER_MATCH_EXPECTATIONS.ok);
  });

  test("bad match — Go and German must-haves block strong fit", async ({
    page,
  }) => {
    const jobDescription = BAD_MATCH_FISKALY_STYLE_JD;
    await submitJobDescription(page, jobDescription);
    await waitForRecruiterPipelineComplete(page);
    await expectMatchProfileBands(page, RECRUITER_MATCH_EXPECTATIONS.badMatch);
  });

  test("bad match — Python-primary evaluator contractor (US)", async ({
    page,
  }) => {
    const jobDescription = BAD_MATCH_PYTHON_EVALUATOR_JD;
    await submitJobDescription(page, jobDescription);
    await waitForRecruiterPipelineComplete(page);
    await expectMatchProfileBands(page, RECRUITER_MATCH_EXPECTATIONS.badMatch);
  });

  test("bad match — German C2 required for interview engineer contractor", async ({
    page,
  }) => {
    const jobDescription = BAD_MATCH_GERMAN_INTERVIEW_ENGINEER_JD;
    await submitJobDescription(page, jobDescription);
    await waitForRecruiterPipelineComplete(page);
    await expectMatchProfileBands(page, RECRUITER_MATCH_EXPECTATIONS.badMatch);
  });

  test("complete mismatch — ML model auditor role", async ({ page }) => {
    const jobDescription = COMPLETE_MISMATCH_ML_AUDITOR_JD;
    await submitJobDescription(page, jobDescription);
    await waitForRecruiterPipelineComplete(page);
    await expectMatchProfileBands(
      page,
      RECRUITER_MATCH_EXPECTATIONS.completeMismatch
    );
  });
});

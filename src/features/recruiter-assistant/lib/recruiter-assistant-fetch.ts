import { recordBadIntentRejection } from "./bad-prompt-strikes";
import { mergeRecruiterChatRequestBody } from "./merge-recruiter-chat-request-body";
import {
  notifyRecruiterCaptchaFailed,
  recruiterRecaptchaTokenSlot,
} from "./recruiter-assistant-fetch-session";

export const RECRUITER_BAD_INTENT_ERROR_CODES = [
  "off_topic",
  "intent_unclear",
] as const;

export type RecruiterBadIntentErrorCode =
  (typeof RECRUITER_BAD_INTENT_ERROR_CODES)[number];

export function isRecruiterBadIntentError(error: Error): boolean {
  return RECRUITER_BAD_INTENT_ERROR_CODES.includes(
    error.message as RecruiterBadIntentErrorCode
  );
}

function parseRecruiterApiErrorCode(res: Response, body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return "";
}

export async function recruiterAssistantFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const recaptchaToken = recruiterRecaptchaTokenSlot.current;
  let requestInit = init;
  if (typeof init?.body === "string") {
    requestInit = {
      ...init,
      body: mergeRecruiterChatRequestBody(init.body, recaptchaToken),
    };
  }

  const res = await fetch(input, requestInit);

  if (res.status === 403) {
    let body: unknown;
    try {
      body = await res.clone().json();
    } catch {
      return res;
    }
    const errorCode = parseRecruiterApiErrorCode(res, body);
    if (errorCode === "captcha_failed") {
      notifyRecruiterCaptchaFailed();
    }
    return res;
  }

  if (res.status !== 400 && res.status !== 413) {
    return res;
  }
  let body: unknown;
  try {
    body = await res.clone().json();
  } catch {
    return res;
  }
  const errorCode = parseRecruiterApiErrorCode(res, body);
  if (
    RECRUITER_BAD_INTENT_ERROR_CODES.includes(
      errorCode as RecruiterBadIntentErrorCode
    )
  ) {
    recordBadIntentRejection();
    throw new Error(errorCode);
  }
  return res;
}

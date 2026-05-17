import { convertToCoreMessages, type Message } from "ai";
import {
  MAX_CHAT_HISTORY_JSON_CHARS,
  RECRUITER_NAV_LOCALE_WRITING_LABEL,
  parseRecruiterNavLocale,
} from "../../constants.js";
import { recruiterChatBodySchema } from "../../http/chatBodySchema.js";
import { isOriginAllowed } from "../../http/cors.js";
import { clientErrorResponse } from "../../http/errors.js";
import {
  decodeLambdaHttpBody,
  getClientIp,
  getMethod,
  getRequestOrigin,
  type LambdaHttpEvent,
} from "../../http/lambdaHttpEvent.js";
import { getLastUserText } from "../../lastUserText.js";
import { runInputGuard } from "../../security/inputGuard.js";
import { checkRateLimit } from "../../security/rateLimit.js";
import { verifyRecaptcha } from "../../security/verifyRecaptcha.js";
import type { RecruiterRequestValidationResult } from "../types.js";

const PARSE_SCOPE = "handleChatRequest";

/**
 * POST chat validation: rate limit, JSON, schema, captcha, locale, messages, input guard.
 * Caller handles OPTIONS and non-POST before invoking this.
 */
export async function parseAndValidateRecruiterRequest(
  event: LambdaHttpEvent
): Promise<RecruiterRequestValidationResult> {
  const origin = getRequestOrigin(event);
  const method = getMethod(event);

  if (method !== "POST") {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(405, "method_not_allowed", origin, {
        scope: PARSE_SCOPE,
        fields: { method },
      }),
    };
  }

  if (!isOriginAllowed(origin)) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(403, "forbidden_origin", origin, {
        scope: PARSE_SCOPE,
        fields: { origin: origin ?? "(missing)" },
      }),
    };
  }

  const clientIp = getClientIp(event);
  const nowMs = Date.now();
  if (!checkRateLimit(clientIp, nowMs)) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(429, "rate_limited", origin, {
        scope: PARSE_SCOPE,
        fields: { clientIp },
      }),
    };
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(decodeLambdaHttpBody(event));
  } catch (err) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(400, "invalid_json", origin, {
        scope: PARSE_SCOPE,
        err,
      }),
    };
  }

  const parsed = recruiterChatBodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(400, "invalid_body", origin, {
        scope: PARSE_SCOPE,
        fields: { issues: parsed.error.flatten() },
      }),
    };
  }

  const messagesJsonLength = JSON.stringify(parsed.data.messages).length;
  if (messagesJsonLength > MAX_CHAT_HISTORY_JSON_CHARS) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(413, "payload_too_large", origin, {
        scope: PARSE_SCOPE,
        fields: {
          messagesJsonLength,
          maxChars: MAX_CHAT_HISTORY_JSON_CHARS,
        },
      }),
    };
  }

  const captcha = await verifyRecaptcha({
    token: parsed.data.recaptchaToken,
    remoteIp: clientIp,
  });
  if (!captcha.ok) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(403, "captcha_failed", origin, {
        scope: PARSE_SCOPE,
        fields: { reason: captcha.reason },
      }),
    };
  }

  const navLocale = parseRecruiterNavLocale(
    parsed.data.locale ?? parsed.data.language
  );
  const portfolioLanguage = RECRUITER_NAV_LOCALE_WRITING_LABEL[navLocale];

  let uiMessages: Message[];
  try {
    uiMessages = parsed.data.messages as unknown as Message[];
  } catch (err) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(400, "invalid_messages", origin, {
        scope: PARSE_SCOPE,
        err,
      }),
    };
  }

  const lastUser = getLastUserText(uiMessages);
  const guarded = runInputGuard(lastUser);
  if (!guarded.ok) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(400, guarded.reason, origin, {
        scope: PARSE_SCOPE,
        fields: { userTextChars: lastUser.length },
      }),
    };
  }

  let coreMessages;
  try {
    coreMessages = convertToCoreMessages(uiMessages);
  } catch (err) {
    return {
      ok: false,
      origin,
      response: clientErrorResponse(400, "invalid_message_shape", origin, {
        scope: PARSE_SCOPE,
        err,
      }),
    };
  }

  return {
    ok: true,
    value: {
      origin,
      clientIp,
      navLocale,
      portfolioLanguage,
      uiMessages,
      coreMessages,
      guardedText: guarded.text,
    },
  };
}

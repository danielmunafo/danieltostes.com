import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToCoreMessages,
  createDataStreamResponse,
  embed,
  formatDataStreamPart,
  generateText,
  streamText,
  type Message,
} from "ai";
import {
  CHAT_MODEL,
  EMBEDDING_MODEL,
  EVIDENCE_BRIEF_MAX_TOKENS,
  EVIDENCE_EVALUATOR_MAX_TOKENS,
  INTERESTS_ALIGNMENT_MAX_TOKENS,
  MAX_CHAT_HISTORY_JSON_CHARS,
  RAG_TOP_K,
  RECRUITER_NAV_LOCALE_WRITING_LABEL,
  RECRUITER_PITCH_MAX_TOKENS,
  recruiterStreamTextSmoothTransform,
  THINKING_CLOSE_MARKER,
  THINKING_OPEN_MARKER,
  isRecruiterOffTopicBriefMarkdown,
  parseRecruiterNavLocale,
} from "./constants.js";
import { loadEmbeddingsFile } from "./embeddings/loadEmbeddings.js";
import {
  loadInterestsPack,
  shouldOmitInterestsOutputMarkdown,
} from "./interests/loadInterestsPack.js";
import { recruiterChatBodySchema } from "./http/chatBodySchema.js";
import { corsHeadersFor, isOriginAllowed } from "./http/cors.js";
import {
  clientErrorResponse,
  internalErrorResponse,
  logInternalServerError,
  logStreamError,
} from "./http/errors.js";
import {
  decodeLambdaHttpBody,
  getClientIp,
  getMethod,
  getRequestOrigin,
  type LambdaHttpEvent,
} from "./http/lambdaHttpEvent.js";
import { getLastUserText } from "./lastUserText.js";
import {
  buildEvidenceEvaluatorSystemPrompt,
  buildEvidenceEvaluatorUserPrompt,
} from "./rag/evaluatorPrompt.js";
import {
  buildInterestsEvaluatorSystemPrompt,
  buildInterestsEvaluatorUserPrompt,
} from "./rag/interestsPrompt.js";
import {
  buildEvidenceAnalystSystemPrompt,
  buildEvidenceAnalystUserPrompt,
  buildRecruiterPitchSystemPrompt,
  formatPortfolioChunks,
} from "./rag/prompt.js";
import { buildReferencesMarkdown } from "./rag/references.js";
import {
  filterChunksByNavigationLocale,
  retrieveTopK,
} from "./rag/retrieve.js";
import { getOpenAiApiKey } from "./secrets/openaiKey.js";
import { runIntentGate } from "./security/intentGate.js";
import { runInputGuard } from "./security/inputGuard.js";
import { logInfo } from "./logging/logger.js";
import { checkRateLimit } from "./security/rateLimit.js";

/**
 * Core HTTP handler: returns a Web `Response` (streaming body for POST / chat).
 */
export async function handleChatRequest(
  event: LambdaHttpEvent
): Promise<Response> {
  const method = getMethod(event);
  const origin = getRequestOrigin(event);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
  }

  if (method !== "POST") {
    return clientErrorResponse(405, "method_not_allowed", origin, {
      scope: "handleChatRequest",
      fields: { method },
    });
  }

  if (!isOriginAllowed(origin)) {
    return clientErrorResponse(403, "forbidden_origin", origin, {
      scope: "handleChatRequest",
      fields: { origin: origin ?? "(missing)" },
    });
  }

  const clientIp = getClientIp(event);
  const nowMs = Date.now();
  if (!checkRateLimit(clientIp, nowMs)) {
    return clientErrorResponse(429, "rate_limited", origin, {
      scope: "handleChatRequest",
      fields: { clientIp },
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(decodeLambdaHttpBody(event));
  } catch (err) {
    return clientErrorResponse(400, "invalid_json", origin, {
      scope: "handleChatRequest",
      err,
    });
  }

  const parsed = recruiterChatBodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return clientErrorResponse(400, "invalid_body", origin, {
      scope: "handleChatRequest",
      fields: { issues: parsed.error.flatten() },
    });
  }

  const messagesJsonLength = JSON.stringify(parsed.data.messages).length;
  if (messagesJsonLength > MAX_CHAT_HISTORY_JSON_CHARS) {
    return clientErrorResponse(413, "payload_too_large", origin, {
      scope: "handleChatRequest",
      fields: {
        messagesJsonLength,
        maxChars: MAX_CHAT_HISTORY_JSON_CHARS,
      },
    });
  }

  const navLocale = parseRecruiterNavLocale(
    parsed.data.locale ?? parsed.data.language
  );
  const portfolioLanguage = RECRUITER_NAV_LOCALE_WRITING_LABEL[navLocale];

  let uiMessages: Message[];
  try {
    uiMessages = parsed.data.messages as unknown as Message[];
  } catch (err) {
    return clientErrorResponse(400, "invalid_messages", origin, {
      scope: "handleChatRequest",
      err,
    });
  }

  const lastUser = getLastUserText(uiMessages);
  const guarded = runInputGuard(lastUser);
  if (!guarded.ok) {
    return clientErrorResponse(400, guarded.reason, origin, {
      scope: "handleChatRequest",
      fields: { userTextChars: lastUser.length },
    });
  }

  let coreMessages;
  try {
    coreMessages = convertToCoreMessages(uiMessages);
  } catch (err) {
    return clientErrorResponse(400, "invalid_message_shape", origin, {
      scope: "handleChatRequest",
      err,
    });
  }

  try {
    const apiKey = await getOpenAiApiKey();
    const openai = createOpenAI({ apiKey });

    const intent = await runIntentGate(openai, guarded.text);
    if (!intent.ok) {
      return clientErrorResponse(400, intent.reason, origin);
    }

    return createDataStreamResponse({
      headers: corsHeadersFor(origin),
      onError: (err) => {
        logStreamError("handleChatRequest.stream", err);
        return "stream_error";
      },
      execute: async (dataStream) => {
        dataStream.write(
          formatDataStreamPart("text", `${THINKING_OPEN_MARKER}\n`)
        );

        const embeddingsFile = await loadEmbeddingsFile();
        const interestsPack = await loadInterestsPack();
        const chunksForNavLocale = filterChunksByNavigationLocale(
          embeddingsFile.chunks,
          navLocale
        );
        const { embedding } = await embed({
          model: openai.embedding(EMBEDDING_MODEL),
          value: guarded.text,
        });
        const topChunks = retrieveTopK(
          chunksForNavLocale,
          embedding,
          RAG_TOP_K
        );
        const sourceExcerpts = formatPortfolioChunks(topChunks, navLocale);

        const evidenceEvaluatorUserPrompt = buildEvidenceEvaluatorUserPrompt(
          navLocale,
          guarded.text,
          sourceExcerpts
        );

        const evaluatorResult = streamText({
          model: openai(CHAT_MODEL),
          system: buildEvidenceEvaluatorSystemPrompt(navLocale),
          prompt: evidenceEvaluatorUserPrompt,
          maxTokens: EVIDENCE_EVALUATOR_MAX_TOKENS,
          experimental_transform: recruiterStreamTextSmoothTransform,
        });
        evaluatorResult.mergeIntoDataStream(dataStream, {
          experimental_sendFinish: false,
        });
        const evaluationMarkdown = (await evaluatorResult.text).trim();

        dataStream.write(formatDataStreamPart("text", "\n\n---\n\n"));

        const canRunInterests =
          Boolean(interestsPack?.criteriaMarkdown.trim()) &&
          !isRecruiterOffTopicBriefMarkdown(evaluationMarkdown);

        if (canRunInterests && interestsPack) {
          const { text: rawInterests } = await generateText({
            model: openai(CHAT_MODEL),
            system: buildInterestsEvaluatorSystemPrompt(navLocale),
            prompt: buildInterestsEvaluatorUserPrompt(
              navLocale,
              guarded.text,
              interestsPack.criteriaMarkdown
            ),
            maxTokens: INTERESTS_ALIGNMENT_MAX_TOKENS,
          });
          const trimmedInterests = rawInterests.trim();
          if (!shouldOmitInterestsOutputMarkdown(trimmedInterests)) {
            logInfo(
              "interestsEvaluator",
              "interests output omitted from client response",
              {
                navLocale,
                chars: trimmedInterests.length,
              }
            );
          }
        }

        const evidenceAnalystUserPrompt = buildEvidenceAnalystUserPrompt(
          navLocale,
          guarded.text,
          sourceExcerpts,
          evaluationMarkdown
        );

        const briefResult = streamText({
          model: openai(CHAT_MODEL),
          system: buildEvidenceAnalystSystemPrompt(navLocale),
          prompt: evidenceAnalystUserPrompt,
          maxTokens: EVIDENCE_BRIEF_MAX_TOKENS,
          experimental_transform: recruiterStreamTextSmoothTransform,
        });
        briefResult.mergeIntoDataStream(dataStream, {
          experimental_sendFinish: false,
        });
        const evidenceAnalystText = (await briefResult.text).trim();

        const evidenceBriefParts = [
          evaluationMarkdown || "(No evaluator output.)",
          evidenceAnalystText || "(No analyst brief produced.)",
        ];
        const evidenceBriefForPitch = evidenceBriefParts.join("\n\n---\n\n");

        dataStream.write(
          formatDataStreamPart("text", `\n${THINKING_CLOSE_MARKER}\n\n`)
        );

        const pitchResult = streamText({
          model: openai(CHAT_MODEL),
          system: buildRecruiterPitchSystemPrompt(
            evidenceBriefForPitch,
            sourceExcerpts,
            portfolioLanguage,
            navLocale
          ),
          messages: coreMessages,
          maxTokens: RECRUITER_PITCH_MAX_TOKENS,
          experimental_transform: recruiterStreamTextSmoothTransform,
        });
        pitchResult.mergeIntoDataStream(dataStream, {
          experimental_sendStart: false,
        });

        const assistantText = await pitchResult.text;
        const referencesMd = await buildReferencesMarkdown(
          openai,
          assistantText,
          chunksForNavLocale,
          navLocale
        );
        if (referencesMd) {
          dataStream.write(
            formatDataStreamPart("text", `\n\n${referencesMd}\n`)
          );
        }
      },
    });
  } catch (err) {
    logInternalServerError("handleChatRequest", err);
    return internalErrorResponse(origin);
  }
}

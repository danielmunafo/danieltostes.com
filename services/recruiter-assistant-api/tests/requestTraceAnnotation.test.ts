import { createDataStreamResponse, parseDataStreamPart } from "ai";
import { describe, expect, it, vi } from "vitest";
import { createRecruiterAssistantStreamResponse } from "../src/recruiterAssistant/createRecruiterAssistantStreamResponse.js";
import { runRecruiterAssistantPipeline } from "../src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.js";
import {
  REQUEST_TRACE_ANNOTATION_TYPE,
  writeRequestTraceAnnotation,
} from "../src/recruiterAssistant/stream/requestTraceAnnotation.js";
import * as loggerModule from "../src/logging/logger.js";
import type {
  RecruiterAssistantDependencies,
  ValidRecruiterRequest,
} from "../src/recruiterAssistant/types.js";
import { createRequestTrace } from "../src/tracing/requestTrace.js";

vi.mock(
  "../src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.js",
  () => ({
    runRecruiterAssistantPipeline: vi.fn(async () => undefined),
  })
);

function parseDataStreamText(
  text: string
): ReturnType<typeof parseDataStreamPart>[] {
  return text
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => parseDataStreamPart(line));
}

describe("request trace stream annotation", () => {
  it("writes the trace id as a message annotation, not a text part", async () => {
    const response = createDataStreamResponse({
      execute: (dataStream) => {
        writeRequestTraceAnnotation(dataStream, "trace-123");
      },
    });

    const parts = parseDataStreamText(await response.text());
    const textValue = parts
      .filter((part) => part.type === "text")
      .map((part) => part.value)
      .join("");

    expect(textValue).not.toContain("trace-123");
    expect(parts).toContainEqual({
      type: "message_annotations",
      value: [
        {
          type: REQUEST_TRACE_ANNOTATION_TYPE,
          requestId: "trace-123",
        },
      ],
    });
  });

  it("emits the active backend trace id before running the assistant pipeline", async () => {
    const logInfoSpy = vi
      .spyOn(loggerModule, "logInfo")
      .mockImplementation(() => {});
    try {
      const request: ValidRecruiterRequest = {
        origin: undefined,
        clientIp: "127.0.0.1",
        navLocale: "en",
        portfolioLanguage: "English",
        uiMessages: [],
        coreMessages: [],
        guardedText: "Senior TypeScript role",
      };
      const dependencies = {
        openai: (() => undefined) as RecruiterAssistantDependencies["openai"],
      };
      const trace = createRequestTrace("trace-abc", { navLocale: "en" });

      const response = createRecruiterAssistantStreamResponse({
        request,
        dependencies,
        trace,
      });

      const parts = parseDataStreamText(await response.text());

      expect(runRecruiterAssistantPipeline).toHaveBeenCalledOnce();
      expect(parts[0]).toEqual({
        type: "message_annotations",
        value: [
          {
            type: REQUEST_TRACE_ANNOTATION_TYPE,
            requestId: "trace-abc",
          },
        ],
      });
    } finally {
      logInfoSpy.mockRestore();
      vi.mocked(runRecruiterAssistantPipeline).mockClear();
    }
  });
});

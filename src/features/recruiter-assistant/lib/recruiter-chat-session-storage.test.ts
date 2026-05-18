import { describe, expect, it } from "vitest";
import {
  parseRecruiterChatSessionSnapshot,
  RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION,
} from "./recruiter-chat-session-storage";

const validSnapshot = {
  version: RECRUITER_CHAT_SESSION_SNAPSHOT_VERSION,
  messages: [
    {
      id: "msg-1",
      role: "user",
      content: "Senior engineer role",
      parts: [{ type: "text", text: "Senior engineer role" }],
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "Briefing body",
      parts: [{ type: "text", text: "Briefing body" }],
    },
  ],
  input: "",
  thinkingEvidenceByMessageId: { "msg-2": "Evidence notes" },
  messagesScrollTop: 120,
  windowScrollY: 400,
  latestEvidencePanelOpen: true,
  isLatestJobContextPanelOpen: false,
  composerExitPhase: "hidden",
} as const;

describe("parseRecruiterChatSessionSnapshot", () => {
  it("parses a valid snapshot", () => {
    const parsed = parseRecruiterChatSessionSnapshot(
      JSON.stringify(validSnapshot)
    );
    expect(parsed).toEqual(validSnapshot);
  });

  it("rejects malformed JSON", () => {
    expect(parseRecruiterChatSessionSnapshot("{")).toBeNull();
  });

  it("rejects unsupported versions", () => {
    expect(
      parseRecruiterChatSessionSnapshot(
        JSON.stringify({ ...validSnapshot, version: 99 })
      )
    ).toBeNull();
  });

  it("rejects invalid messages", () => {
    expect(
      parseRecruiterChatSessionSnapshot(
        JSON.stringify({
          ...validSnapshot,
          messages: [{ id: "", role: "user" }],
        })
      )
    ).toBeNull();
  });
});

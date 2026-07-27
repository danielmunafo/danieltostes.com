import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { RECRUITER_USER_MESSAGE_MAX_CHARS } from "../constants/request-contract";
import { RecruiterAssistantUiProvider } from "../context/RecruiterAssistantUiContext";
import { RecruiterChat } from "./RecruiterChat";

const { handleSubmitMock } = vi.hoisted(() => ({
  handleSubmitMock: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => {
    const [input, setInput] = useState("");

    return {
      messages: [],
      input,
      handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
      },
      handleSubmit: handleSubmitMock,
      status: "ready",
      setInput,
      setMessages: vi.fn(),
      reload: vi.fn(),
      stop: vi.fn(),
    };
  },
}));

vi.mock("../lib/api-url", () => ({
  getRecruiterApiBaseUrl: () => "https://example.test/recruiter",
}));

vi.mock("../hooks/useRecruiterChatSessionPersistence", () => ({
  readRecruiterChatSessionBoot: () => null,
  thinkingEvidenceMapFromSessionBoot: () => new Map(),
  useRecruiterChatSessionPersistence: () => undefined,
}));

async function renderRecruiterChat() {
  await act(async () => {
    renderWithProviders(
      <RecruiterAssistantUiProvider>
        <RecruiterChat />
      </RecruiterAssistantUiProvider>
    );
    await Promise.resolve();
  });
}

describe("RecruiterChat input length", () => {
  beforeEach(() => {
    handleSubmitMock.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("disables submission and explains an oversized job description", async () => {
    await renderRecruiterChat();
    const input = screen.getByRole("textbox");
    const oversizedInput = "x".repeat(RECRUITER_USER_MESSAGE_MAX_CHARS + 3_896);

    fireEvent.change(input, { target: { value: oversizedInput } });

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(
      "Job description is too long (12,088/8,192 characters). Remove 3,896 characters to send."
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();

    fireEvent.submit(input.closest("form")!);
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    expect(handleSubmitMock).not.toHaveBeenCalled();
  });

  it("allows submission at the exact API character limit", async () => {
    await renderRecruiterChat();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, {
      target: { value: "x".repeat(RECRUITER_USER_MESSAGE_MAX_CHARS) },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "false");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    });
  });
});

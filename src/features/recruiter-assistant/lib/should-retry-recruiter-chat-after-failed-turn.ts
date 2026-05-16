/** True when the last turn failed and the user can resend from the composer. */
export function shouldRetryRecruiterChatAfterFailedTurn(
  status: string,
  messages: readonly { role: string }[],
  input: string
): boolean {
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return false;
  }
  if (status !== "error") {
    return false;
  }
  return messages[messages.length - 1]?.role === "user";
}

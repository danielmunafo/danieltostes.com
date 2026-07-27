import { RECRUITER_USER_MESSAGE_MAX_CHARS } from "../constants/request-contract";

export interface RecruiterUserMessageValidation {
  characterCount: number;
  charactersOverLimit: number;
  isTooLong: boolean;
}

export function getRecruiterUserMessageValidation(
  input: string
): RecruiterUserMessageValidation {
  const characterCount = input.trim().length;
  const charactersOverLimit = Math.max(
    0,
    characterCount - RECRUITER_USER_MESSAGE_MAX_CHARS
  );

  return {
    characterCount,
    charactersOverLimit,
    isTooLong: charactersOverLimit > 0,
  };
}

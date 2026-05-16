import { z } from "zod";
import { MAX_CHAT_MESSAGES } from "../constants.js";

const recruiterChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.union([z.string(), z.array(z.unknown())]).optional(),
    parts: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const recruiterChatBodySchema = z.object({
  messages: z.array(recruiterChatMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
  /** BCP-47 site locale (`en`, `pt-BR`, `es`, `it`). Preferred. */
  locale: z.string().optional(),
  /** Alias for `locale` (same values). */
  language: z.string().optional(),
  /** reCAPTCHA v2 response token from the browser widget. */
  recaptchaToken: z.string().min(1).optional(),
});

export type RecruiterChatBody = z.infer<typeof recruiterChatBodySchema>;

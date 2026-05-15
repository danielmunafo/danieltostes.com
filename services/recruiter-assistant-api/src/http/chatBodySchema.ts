import { z } from "zod";

export const recruiterChatBodySchema = z.object({
  messages: z.array(z.record(z.unknown())).min(1),
  /** BCP-47 site locale (`en`, `pt-BR`, `es`, `it`). Preferred. */
  locale: z.string().optional(),
  /** Alias for `locale` (same values). */
  language: z.string().optional(),
});

export type RecruiterChatBody = z.infer<typeof recruiterChatBodySchema>;

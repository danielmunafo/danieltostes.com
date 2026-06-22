import { z } from "zod";

// strip non-printable ASCII control chars (mirrors inputGuard pattern)
const CONTROL_CHAR_REGEX = /[--]/;

export const feedbackBodySchema = z.object({
  requestId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  timestamp: z.string().datetime(),
  questionHash: z.string().length(16),
  responseHash: z.string().length(16),
  questionText: z.string().max(12000),
  responseText: z.string().max(100000),
  rating: z.enum(["positive", "negative"]),
  reason: z
    .enum(["wrong_fit", "off_topic", "missing_context", "too_long", "other"])
    .optional(),
  comment: z
    .string()
    .max(200)
    .refine((s) => !CONTROL_CHAR_REGEX.test(s), { message: "invalid_chars" })
    .optional(),
  locale: z.string().max(10),
  schemaVersion: z.literal("2"),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

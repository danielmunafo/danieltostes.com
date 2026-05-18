import pino from "pino";

const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

/** Structured JSON logs (CloudWatch / local dev). */
export const logger = pino({
  name: "recruiter-api",
  level: process.env.LOG_LEVEL?.trim() || (isLambda ? "info" : "debug"),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type LogFields = Record<string, unknown>;

export function logWarn(
  scope: string,
  message: string,
  fields?: LogFields
): void {
  logger.warn({ scope, ...fields }, message);
}

export function logInfo(
  scope: string,
  message: string,
  fields?: LogFields
): void {
  logger.info({ scope, ...fields }, message);
}

export function logError(
  scope: string,
  message: string,
  err?: unknown,
  fields?: LogFields
): void {
  logger.error({ scope, err, ...fields }, message);
}

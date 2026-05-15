import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({});

let cachedKey: string | null = null;

/**
 * Resolves the OpenAI API key: OPENAI_API_KEY env, or Secrets Manager via OPENAI_SECRET_ARN.
 */
export async function getOpenAiApiKey(): Promise<string> {
  const direct = process.env.OPENAI_API_KEY?.trim();
  if (direct) return direct;

  const arn = process.env.OPENAI_SECRET_ARN?.trim();
  if (!arn) {
    throw new Error("Set OPENAI_API_KEY or OPENAI_SECRET_ARN");
  }
  if (cachedKey) return cachedKey;

  const res = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: arn })
  );
  const secretString = res.SecretString?.trim();
  if (!secretString) {
    throw new Error("Secret has no SecretString");
  }
  cachedKey = secretString;
  return cachedKey;
}

/** Tests only. */
export function resetOpenAiKeyCacheForTests(): void {
  cachedKey = null;
}

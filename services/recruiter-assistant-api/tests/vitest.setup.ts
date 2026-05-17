import { beforeAll } from "vitest";
import { ensureGoldenLlamaIndexEnv } from "./helpers/goldenLlamaIndexEnv.js";

beforeAll(async () => {
  await ensureGoldenLlamaIndexEnv();
});

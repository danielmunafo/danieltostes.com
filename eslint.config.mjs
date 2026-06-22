import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/search-index.json",
    "playwright-report/**",
    "test-results/**",
    "services/recruiter-assistant-api/dist/**",
    "services/recruiter-assistant-api/embeddings/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;

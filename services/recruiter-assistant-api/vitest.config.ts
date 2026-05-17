import { defineConfig } from "vitest/config";

function mdTextPlugin() {
  return {
    name: "md-text",
    transform(code: string, id: string) {
      if (id.endsWith(".md")) {
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [mdTextPlugin()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

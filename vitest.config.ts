import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["vitest/**/*.test.ts", "vitest/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["app/actions/**/*.ts", "lib/**/*.ts", "src/music/**/*.ts"],
      thresholds: {
        branches: 66,
        functions: 66,
        lines: 66,
        statements: 66,
      },
    },
  },
});

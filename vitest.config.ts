import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["vitest/**/*.test.ts", "vitest/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: false,
  },
});

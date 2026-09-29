import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "native/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**/*.ts", "packages/contracts/src/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: { statements: 90, branches: 90 },
    },
  },
});

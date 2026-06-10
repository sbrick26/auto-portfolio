import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: false,
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "content/**", "components/**"],
      reporter: ["text-summary"],
      // Ratchet these up as coverage grows; CI fails if we slip below.
      thresholds: { lines: 80, functions: 78, statements: 78, branches: 70 },
    },
  },
});

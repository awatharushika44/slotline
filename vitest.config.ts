
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],

    // Prevent test files from interfering with each other
    // when they share the same test database.
    fileParallelism: false,

    // Load environment variables before importing test modules.
    setupFiles: ["./tests/integration/setup-env.ts"],
  },
});


import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@kv/contracts": path.resolve(__dirname, "../contracts/src/index.ts"),
    },
  },
});

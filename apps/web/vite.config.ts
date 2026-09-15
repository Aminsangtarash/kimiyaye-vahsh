import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@kv/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
    },
  },
  server: { port: 5173 },
  publicDir: path.resolve(__dirname, "../../assets"),
});

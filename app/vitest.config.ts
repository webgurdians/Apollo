import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "src"),
      "@contracts": path.resolve(templateRoot, "contracts"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
      "@db": path.resolve(templateRoot, "db"),
    },
  },
  test: {
    environment: "node",
    include: ["api/**/*.test.ts", "api/**/*.spec.ts"],
    env: {
      DATABASE_URL: ":memory:",
      NODE_ENV: "test",
      KIMI_AUTH_URL: "http://localhost",
      KIMI_OPEN_URL: "http://localhost",
      APP_SECRET: "test-secret-key-for-testing-only",
    },
  },
});

import { defineConfig } from "vitest/config";
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  test: {
    include: ["src/core/**/*.test.ts", "src/notations/**/*.test.ts", "src/viewer/**/*.test.ts", "tests/bpmn-semantics.test.ts", "tests/epc-semantics.test.ts", "tests/model-input.test.ts", "tests/bridge.test.ts"],
    exclude: ["node_modules/**", "server/**"],
  },
});

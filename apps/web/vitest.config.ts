import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "react/jsx-runtime": fileURLToPath(
        new URL("./node_modules/react/jsx-runtime.js", import.meta.url),
      ),
      "react/jsx-dev-runtime": fileURLToPath(
        new URL("./node_modules/react/jsx-dev-runtime.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "app/**/*.test.ts",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
    ],
  },
});

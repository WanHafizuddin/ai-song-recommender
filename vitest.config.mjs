import { defineConfig, configDefaults } from "vitest/config";

// The backend suite runs in the default Node environment. The React client in
// client/ has its own Vitest config (jsdom); exclude it here so `npm test`
// (backend) does not sweep in the client's .jsx tests.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "client/**"],
  },
});

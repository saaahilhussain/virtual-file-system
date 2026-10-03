import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "upload-recovery.demo.js",
  outputDir: "./demo-results",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 1080, height: 760 },
    video: { mode: "on", size: { width: 1080, height: 760 } },
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    env: { VITE_BACKEND_BASE_URI: "http://127.0.0.1:4175/demo-api" },
  },
});

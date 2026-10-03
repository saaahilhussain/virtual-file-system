import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: { ignored: ["**/demo-results/**", "**/playwright-report/**"] },
  },
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
    env: { VITE_BACKEND_BASE_URI: "https://api.example.test" },
    restoreMocks: true,
    unstubGlobals: true,
  },
});

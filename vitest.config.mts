import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only.ts"),
    },
  },
  test: {
    // Uji integrasi memakai PGlite sungguhan; beri waktu untuk migrasi awal.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});

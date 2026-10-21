import { defineConfig } from "drizzle-kit";

// `npm run db:generate` membuat berkas SQL di ./drizzle dari lib/db/schema.ts.
// Migrasi dijalankan oleh scripts/migrate.ts (Neon memakai connection string *unpooled*).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});

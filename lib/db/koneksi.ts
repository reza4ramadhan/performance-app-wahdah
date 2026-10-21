// Pembuat koneksi tanpa "server-only", supaya bisa dipakai skrip (migrate, seed, impor).

import { mkdirSync } from "node:fs";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

export const FOLDER_MIGRASI = path.join(process.cwd(), "drizzle");
/** IKP_PGLITE_DIR bisa diisi untuk memisahkan basis data uji dari basis data pengembangan. */
export const FOLDER_PGLITE = process.env.IKP_PGLITE_DIR ? path.resolve(process.env.IKP_PGLITE_DIR) : path.join(process.cwd(), "data", "pglite");

/** Neon bila `url` diisi; selain itu PGlite lokal yang langsung dimigrasi. */
export async function buatDb(url: string | undefined): Promise<{ db: Db; tutup: () => Promise<void>; jenis: "neon" | "pglite" }> {
  if (url) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: url });
    return { db: drizzleNeon({ client: pool, schema }), tutup: () => pool.end(), jenis: "neon" };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  mkdirSync(path.dirname(FOLDER_PGLITE), { recursive: true });
  const client = new PGlite(FOLDER_PGLITE);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: FOLDER_MIGRASI });
  return { db: db as unknown as Db, tutup: () => client.close(), jenis: "pglite" };
}

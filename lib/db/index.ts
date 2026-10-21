// Koneksi basis data untuk aplikasi.
// - Produksi (Cloudways): DATABASE_URL = connection string Neon *pooled*. Driver WebSocket mendukung transaksi.
// - Pengembangan lokal tanpa DATABASE_URL: PGlite (PostgreSQL tertanam) di ./data/pglite, migrasi otomatis.

import "server-only";
import { buatDb, type Db } from "./koneksi";
import * as schema from "./schema";

const global_ = globalThis as unknown as { __ikpDb?: Promise<Db> };

/** Satu koneksi per proses (bertahan saat hot reload). */
export function getDb(): Promise<Db> {
  global_.__ikpDb ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url && process.env.NODE_ENV === "production" && !process.env.IKP_IZINKAN_PGLITE) {
      throw new Error("DATABASE_URL belum diatur. Isi dengan connection string Neon (pooled).");
    }
    return (await buatDb(url)).db;
  })().catch((e) => {
    global_.__ikpDb = undefined;
    throw e;
  });
  return global_.__ikpDb;
}

export { schema, type Db };

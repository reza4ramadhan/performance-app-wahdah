// npm run db:migrate
// Neon: pakai DATABASE_URL_UNPOOLED (direkomendasikan untuk migrasi), jatuh ke DATABASE_URL.
// Tanpa keduanya: PGlite lokal di ./data/pglite.

import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { buatDb, FOLDER_MIGRASI } from "../lib/db/koneksi";
import { sinkronKatalog } from "../lib/ikp/sinkron";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  const { db, tutup, jenis } = await buatDb(url);
  if (jenis === "neon") await migrate(db, { migrationsFolder: FOLDER_MIGRASI });
  await sinkronKatalog(db);
  console.log(`Migrasi selesai (${jenis}). Katalog indikator disinkronkan.`);
  await tutup();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

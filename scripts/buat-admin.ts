// Akun Admin pertama di basis data baru:
//   npm run buat-admin -- --nama "Nama Lengkap" --nip 1234 --password "rahasia-sementara" [--hp 0812…] [--kantor makassar]
// Login pertama wajib mengganti password.

import "./env";
import { parseArgs } from "node:util";
import { buatAkun, buatAuth } from "../lib/auth-config";
import { buatDb } from "../lib/db/koneksi";
import { pegawai, peranSistem } from "../lib/db/schema";

async function main() {
  const { values: a } = parseArgs({
    options: { nama: { type: "string" }, nip: { type: "string" }, hp: { type: "string" }, password: { type: "string" }, kantor: { type: "string", default: "makassar" } },
  });
  if (!a.nama || !(a.nip || a.hp) || !a.password) throw new Error("Wajib: --nama, --nip atau --hp, --password");
  if (a.password.length < 8) throw new Error("Password minimal 8 karakter.");

  const { db, tutup } = await buatDb(process.env.DATABASE_URL);
  const [pg] = await db
    .insert(pegawai)
    .values({ nama: a.nama, nip: a.nip ?? null, noHp: a.hp ?? null, kantor: a.kantor === "jakarta" ? "jakarta" : "makassar", statusKepegawaian: "Mutafarrigh" })
    .returning();
  await db.insert(peranSistem).values({ pegawaiId: pg.id, peran: "admin" });
  await buatAkun(buatAuth(db), { pegawaiId: pg.id, nama: pg.nama, username: (a.nip ?? a.hp)!, password: a.password });
  console.log(`Admin dibuat: ${pg.nama} (login: ${a.nip ?? a.hp}). Wajib ganti password saat login pertama.`);
  await tutup();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

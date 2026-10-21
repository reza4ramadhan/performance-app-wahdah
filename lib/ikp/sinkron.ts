import { sql } from "drizzle-orm";
import type { Db } from "../db/koneksi";
import { indikator } from "../db/schema";
import { KATALOG } from "./katalog";

/**
 * Salin katalog indikator ke tabel `indikator`.
 * Baris baru memakai nilai default; baris lama hanya diperbarui nama/peran/tipe —
 * standar, tenggat, verifikator, dan status aktif yang sudah dikalibrasi Admin tidak ditimpa.
 */
export async function sinkronKatalog(db: Db) {
  await db
    .insert(indikator)
    .values(
      KATALOG.map((d) => ({
        kode: d.kode,
        peranKerja: d.peran,
        nama: d.nama,
        tipe: d.tipe,
        standarCapaian: d.standar,
        tenggat: d.tenggat,
        verifikatorPeran: d.verifikator,
        fase: 1,
        aktif: d.aktif,
      })),
    )
    .onConflictDoUpdate({
      target: indikator.kode,
      set: { nama: sql`excluded.nama`, peranKerja: sql`excluded.peran_kerja`, tipe: sql`excluded.tipe` },
    });
}

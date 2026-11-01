// Jumlah antrean per menu untuk lencana navigasi. Setiap hitungan sama dengan isi halaman tujuannya.

import "server-only";
import { and, count, eq, inArray, lte } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import type { Sesi } from "../sesi";
import { hariIni, keUtc, tambahHari } from "../waktu";
import { jumlahAntrean } from "./antrean";
import { jumlahTugasMenunggu, jumlahUsulanMenunggu, kondisiTugasPenugasan } from "./tugas";

/** Hanya menu yang ada di `hrefs` yang dihitung; hasilnya dikunci dengan href menu tersebut. */
export async function jumlahMengantre(sesi: Sesi, hrefs: ReadonlySet<string>): Promise<Record<string, number>> {
  const db = await getDb();
  const pnIds = sesi.amanahPn.map((p) => p.id);
  const pnTugas = sesi.amanahPn.filter((p) => p.peranKerja === "SBK" || p.peranKerja === "SK").map((p) => p.id);
  const hitung: Record<string, () => Promise<number>> = {
    // Item saya yang belum diajukan atau dikembalikan (filter "Aktif" di /item).
    "/item": async () => {
      if (!pnIds.length) return 0;
      const [r] = await db.select({ n: count() }).from(s.item).where(and(inArray(s.item.penugasanId, pnIds), inArray(s.item.status, ["terbuka", "ditolak"])));
      return r.n;
    },
    // Tugas khusus "Perlu dikerjakan" di /tugas: tenggat sampai sepekan ke depan, termasuk yang sudah lewat.
    "/tugas": async () => {
      if (!pnTugas.length) return 0;
      const cakrawala = keUtc(tambahHari(hariIni(sesi.kantor), 8), sesi.kantor);
      const [r] = await db
        .select({ n: count() })
        .from(s.tugasKhususJadwal)
        .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
        .where(and(kondisiTugasPenugasan(pnTugas, ["belum", "dikerjakan", "ditolak"]), lte(s.tugasKhususJadwal.tenggat, cakrawala)));
      return r.n;
    },
    "/verifikasi": () => jumlahAntrean(sesi),
    // Tugas staf yang diajukan selesai dan usulan Staf Khusus, keduanya menunggu keputusan saya.
    "/tim/tugas": async () => (await Promise.all([jumlahTugasMenunggu(sesi.pegawaiId), jumlahUsulanMenunggu(sesi.pegawaiId)])).reduce((a, n) => a + n, 0),
  };
  const kunci = Object.keys(hitung).filter((h) => hrefs.has(h));
  const nilai = await Promise.all(kunci.map((h) => hitung[h]()));
  return Object.fromEntries(kunci.map((h, i) => [h, nilai[i]]));
}

// Jumlah antrean per menu untuk lencana navigasi. Setiap hitungan sama dengan isi halaman tujuannya.

import "server-only";
import { and, count, eq, inArray, lte } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { hrefMenu, menuUntuk } from "../menu";
import type { Sesi } from "../sesi";
import { hariIni, keUtc, tambahHari } from "../waktu";
import { jumlahAntrean } from "./antrean";
import { jumlahTugasMenunggu, jumlahUsulanMenunggu, kondisiTugasPenugasan } from "./tugas";

/**
 * Hanya menu yang ada di `hrefs` yang dihitung; hasilnya dikunci dengan href menu tersebut.
 * `cakupTim`: tugas & usulan staf dibatasi ke tim amanah aktif (halaman /tim/tugas sendiri menampilkan semuanya).
 */
export async function jumlahMengantre(sesi: Sesi, hrefs: ReadonlySet<string>, cakupTim = false): Promise<Record<string, number>> {
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
    "/tim/tugas": async () => {
      const tim = cakupTim ? sesi.tim.map((b) => b.id) : undefined;
      if (tim && !tim.length) return 0;
      const n = await Promise.all([jumlahTugasMenunggu(sesi.pegawaiId, tim), jumlahUsulanMenunggu(sesi.pegawaiId, tim)]);
      return n[0] + n[1];
    },
  };
  const kunci = Object.keys(hitung).filter((h) => hrefs.has(h));
  const nilai = await Promise.all(kunci.map((h) => hitung[h]()));
  return Object.fromEntries(kunci.map((h, i) => [h, nilai[i]]));
}

/**
 * Total antrean tiap amanah (kartu Pindah Amanah), dikunci dengan id penugasan wakil amanah. Jalur Keuangan &
 * Sekretariat tidak dihitung karena tidak ikut amanah: antreannya tetap tampil apa pun amanah yang aktif.
 */
export async function jumlahPerAmanah(sesi: Sesi): Promise<Map<string, number>> {
  const peran = new Set([...sesi.peran].filter((p) => p !== "keuangan" && p !== "sekretariat"));
  const hasil = await Promise.all(
    sesi.daftarAmanah.map(async (grup) => {
      const ids = new Set(grup.map((p) => p.id));
      const s2: Sesi = { ...sesi, peran, amanah: grup[0], amanahPn: grup, tim: sesi.binaan.filter((b) => b.amanahId !== null && ids.has(b.amanahId)) };
      const { grup: menu, tabBawah } = menuUntuk(s2);
      const n = await jumlahMengantre(s2, hrefMenu(menu, tabBawah), true);
      return [grup[0].id, Object.values(n).reduce((a, x) => a + x, 0)] as const;
    }),
  );
  return new Map(hasil);
}

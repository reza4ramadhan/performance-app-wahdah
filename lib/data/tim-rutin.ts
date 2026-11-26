// Data segmen Tim koordinator unit tugas rutin N–R (docs/rombak-v2/05, mockup KR-1): tiga angka, usulan, dan
// staf hari ini (set tugas + selesai/total).

import "server-only";
import { and, count, eq, gte, inArray, lt } from "drizzle-orm";
import { idKoordinator, koordinatorAtauWakil } from "../akses";
import { getDb, schema as s } from "../db";
import type { Sesi } from "../sesi";
import { setBerlaku } from "../set-tugas";
import { hariIni, keUtc, periodeDari, tambahHari } from "../waktu";
import { jumlahAntrean } from "./antrean";
import { pastikanRutin, stafRutin } from "./set-tugas";
import { daftarTugas, jumlahTugasMenunggu, jumlahUsulanMenunggu, kondisiTugasPenugasan } from "./tugas";

export const unitRutin = (sesi: Pick<Sesi, "penugasan">) => sesi.penugasan.filter((p) => p.peranKerja === "KSBK" && p.polaKerja === "rutin");

export async function muatTimRutin(sesi: Sesi) {
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const unit = unitRutin(sesi).map((u) => u.unitId);
  const staf = (await stafRutin(db, unit, periodeDari(today))).filter((x) => koordinatorAtauWakil(sesi, x.koordinatorId) && x.pegawaiId !== sesi.pegawaiId);
  const pnIds = staf.map((x) => x.penugasanId);
  await pastikanRutin(db, pnIds, sesi.kantor);
  const [tugas, pasang, set, nItem, nTugas, nUsulan] = await Promise.all([
    pnIds.length ? daftarTugas(and(kondisiTugasPenugasan(pnIds), gte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, -14), sesi.kantor)), lt(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, 1), sesi.kantor))), 3000) : Promise.resolve([]),
    pnIds.length ? db.select().from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, pnIds)) : Promise.resolve([]),
    unit.length ? db.select({ id: s.setTugas.id, nama: s.setTugas.nama }).from(s.setTugas).where(and(inArray(s.setTugas.unitId, unit), eq(s.setTugas.aktif, true))) : Promise.resolve([]),
    jumlahAntrean(sesi),
    jumlahTugasMenunggu(idKoordinator(sesi)),
    jumlahUsulanMenunggu(idKoordinator(sesi)),
  ]);
  const namaSet = new Map(set.map((x) => [x.id, x.nama]));
  const mulaiHari = keUtc(today, sesi.kantor);
  const kini = Date.now();
  const baris = staf.map((x) => {
    const milik = tugas.filter((t) => t.penugasanId === x.penugasanId);
    const hariIniT = milik.filter((t) => t.setTugasItemId && t.tenggat >= mulaiHari);
    const selesai = hariIniT.filter((t) => t.status === "diajukan" || t.status === "disetujui").length;
    const setId = setBerlaku(
      pasang.filter((p) => p.penugasanId === x.penugasanId),
      today,
    );
    return {
      pegawaiId: x.pegawaiId,
      penugasanId: x.penugasanId,
      nama: x.nama,
      set: setId ? (namaSet.get(setId) ?? null) : null,
      total: hariIniT.length,
      selesai,
      lewat: milik.filter((t) => t.lewat).length,
      /** Sudah ada tugas yang jatuh tempo hari ini tetapi belum satu pun ditandai selesai. */
      belumMulai: hariIniT.some((t) => t.tenggat.getTime() < kini) && selesai === 0,
    };
  });
  const [setCount] = unit.length ? await db.select({ n: count() }).from(s.setTugas).where(and(inArray(s.setTugas.unitId, unit), eq(s.setTugas.aktif, true))) : [{ n: 0 }];
  return {
    staf: baris.sort((a, b) => b.lewat - a.lewat || Number(b.belumMulai) - Number(a.belumMulai) || a.nama.localeCompare(b.nama)),
    perluDiperiksa: nItem + nTugas,
    terlambat: baris.reduce((a, x) => a + x.lewat, 0),
    belumMulai: baris.filter((x) => x.belumMulai).length,
    usulan: nUsulan,
    jumlahSet: setCount.n,
  };
}

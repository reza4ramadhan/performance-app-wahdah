// Data segmen Tim koordinator (docs/rombak-v2/04 bagian A.1, mockup Kor-1): tiga angka, kartu konfirmasi rencana,
// pintasan, dan daftar staf dengan beban tugas pekan ini dari semua unit.

import "server-only";
import { and, count, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { TANGGAL_BATAS_INPUT, bulanWajibKegiatan } from "../kegiatan-wajib";
import { plotBerlaku } from "../plot";
import type { Sesi } from "../sesi";
import { rentangPekan } from "../tugas-saya";
import { hariIni, keUtc, periodeDari, rentangPeriode, tambahHari, tanggalLokal } from "../waktu";
import { kondisiPenugasanBerlaku } from "./ikp";
import { daftarItem } from "./item";
import { kontrolStaf } from "./kontrol-staf";
import { daftarTugas } from "./tugas";
import { petaBidang, unitDalamBidang } from "./unit";

/** Unit yang saya koordinasikan (KSBK, termasuk sebagai wakil). */
export const unitKoordinator = (sesi: Pick<Sesi, "penugasan">) => sesi.penugasan.filter((p) => p.peranKerja === "KSBK");

/**
 * Beban pekan ini per pegawai, dari semua penugasannya (lintas unit): item terbuka/ditolak dan delegasi yang belum
 * selesai dengan tenggat s.d. Minggu ini (termasuk yang terlambat). `unit`: nama unit tempat tugas itu berada.
 */
export async function bebanPekanIni(pegawaiIds: string[], kantor: Sesi["kantor"]) {
  const peta = new Map<string, { n: number; terlambat: number; unit: Set<string> }>();
  if (!pegawaiIds.length) return peta;
  const db = await getDb();
  const today = hariIni(kantor);
  const akhir = rentangPekan(today).akhir;
  const pn = await db
    .select({ id: s.penugasan.id, pegawaiId: s.penugasan.pegawaiId })
    .from(s.penugasan)
    .where(and(inArray(s.penugasan.pegawaiId, pegawaiIds), inArray(s.penugasan.peranKerja, ["SBK", "SK"]), kondisiPenugasanBerlaku(periodeDari(today))));
  const ids = pn.map((p) => p.id);
  if (!ids.length) return peta;
  const [item, tugas] = await Promise.all([
    daftarItem(and(inArray(s.item.penugasanId, ids), inArray(s.item.status, ["terbuka", "ditolak"])), { kantor, batas: 2000 }),
    daftarTugas(and(inArray(s.tugasKhusus.penugasanId, ids), inArray(s.tugasKhususJadwal.status, ["belum", "dikerjakan", "ditolak"]), lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(akhir, 1), kantor))), 2000),
  ]);
  const tambah = (pegawaiId: string, unit: string, lewat: boolean) => {
    const x = peta.get(pegawaiId) ?? peta.set(pegawaiId, { n: 0, terlambat: 0, unit: new Set() }).get(pegawaiId)!;
    x.n++;
    if (lewat) x.terlambat++;
    x.unit.add(unit);
  };
  for (const i of item) {
    const keluar = !!i.kegiatanStatus && !["jalan", "geser"].includes(i.kegiatanStatus);
    if (!keluar && !i.pendingDana && i.tenggat && i.tenggat <= akhir) tambah(i.pemilikId, i.unitNama, i.lewat);
  }
  const unitPn = new Map((await db.select({ id: s.penugasan.id, nama: s.unit.nama }).from(s.penugasan).innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId)).where(inArray(s.penugasan.id, ids))).map((r) => [r.id, r.nama]));
  for (const t of tugas) if (tanggalLokal(t.tenggat, t.kantor) <= akhir) tambah(t.stafId, unitPn.get(t.penugasanId) ?? "", t.lewat);
  return peta;
}

/** Rencana kegiatan bulan yang sedang dikonfirmasi: bulan depan mulai tgl 25, selain itu bulan ini. */
export async function ringkasRencana(sesi: Sesi) {
  const today = hariIni(sesi.kantor);
  const periode = bulanWajibKegiatan(today).at(-1)!;
  const unit = unitKoordinator(sesi).map((p) => p.unitId);
  if (!unit.length) return null;
  const db = await getDb();
  const { awal, akhir } = rentangPeriode(periode);
  const rows = await db
    .select({ status: s.kegiatan.status, n: count() })
    .from(s.kegiatan)
    .where(and(inArray(s.kegiatan.unitId, unit), gte(s.kegiatan.tanggal, awal), lte(s.kegiatan.tanggal, akhir)))
    .groupBy(s.kegiatan.status);
  const total = rows.filter((r) => r.status !== "tunda").reduce((a, r) => a + r.n, 0);
  const belum = rows.find((r) => r.status === "rencana")?.n ?? 0;
  return { periode, total, dikonfirmasi: total - belum, belum, batas: `${periode}-${String(TANGGAL_BATAS_INPUT).padStart(2, "0")}` };
}

/** Departemen (SKUO) unit saya yang belum punya PJ hari ini. */
export async function departemenTanpaPj(sesi: Sesi) {
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  let n = 0;
  for (const u of unitKoordinator(sesi)) {
    const skuo = (await unitDalamBidang(db, u.unitId)).filter((x) => x !== u.unitId);
    if (!skuo.length) continue;
    const plot = plotBerlaku(await db.select().from(s.plotSkuo).where(eq(s.plotSkuo.unitId, u.unitId)), today);
    n += skuo.filter((x) => !plot.some((p) => p.skuoId === x)).length;
  }
  return n;
}

export async function muatTimKoordinator(sesi: Sesi) {
  const db = await getDb();
  const [k, rencana, tanpaPj, [delegasi]] = await Promise.all([
    kontrolStaf(sesi),
    ringkasRencana(sesi),
    departemenTanpaPj(sesi),
    db
      .select({ n: count() })
      .from(s.tugasKhususJadwal)
      .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
      .where(and(eq(s.tugasKhusus.dibuatOleh, sesi.pegawaiId), inArray(s.tugasKhususJadwal.status, ["belum", "dikerjakan", "ditolak"]))),
  ]);
  const beban = await bebanPekanIni(
    k.staf.map((t) => t.pegawaiId),
    sesi.kantor,
  );
  const pnStaf = await db
    .select({ pegawaiId: s.penugasan.pegawaiId, unitNama: s.unit.nama, unitId: s.unit.id })
    .from(s.penugasan)
    .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
    .where(and(inArray(s.penugasan.pegawaiId, k.staf.map((t) => t.pegawaiId).concat("-")), inArray(s.penugasan.peranKerja, ["SBK", "SK"]), kondisiPenugasanBerlaku(periodeDari(hariIni(sesi.kantor)))));
  const unitSaya = new Set(unitKoordinator(sesi).map((p) => p.unitId));
  const [pending] = await db
    .select({ n: count() })
    .from(s.item)
    .where(and(inArray(s.item.penugasanId, sesi.tim.map((b) => b.id).concat("-")), eq(s.item.indikatorKode, "SBK-2b"), inArray(s.item.status, ["terbuka", "ditolak"]), isNotNull(s.item.pendingDanaSejak), isNull(s.item.danaCairPada)));
  const bidang = await petaBidang(db);
  const diUnitSaya = (unitId: string) => unitSaya.has(bidang.get(unitId) ?? unitId);

  return {
    ...k,
    rencana,
    tanpaPj,
    delegasiBerjalan: delegasi.n,
    pendingDana: pending?.n ?? 0,
    perluDiperiksa: k.antrean.filter((i) => i.pemilikId !== sesi.pegawaiId).length + k.tugasMenunggu.length,
    terlambat: k.staf.reduce((a, t) => a + t.lewat, 0),
    stafRingkas: k.staf.map((t) => ({
      pegawaiId: t.pegawaiId,
      nama: t.nama,
      k1: t.k1,
      lewat: t.lewat,
      pekanIni: beban.get(t.pegawaiId)?.n ?? 0,
      unitLain: [...new Set(pnStaf.filter((p) => p.pegawaiId === t.pegawaiId && !diUnitSaya(p.unitId)).map((p) => p.unitNama))],
    })),
  };
}

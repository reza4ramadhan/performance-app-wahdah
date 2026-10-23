// Memuat data satu periode dari basis data lalu menjalankan mesin hitung (lib/ikp).
// Skor berjalan dihitung on-the-fly dari item; hasil_ikp hanya ditulis saat periode dikunci/disahkan.

import "server-only";
import { and, count, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb, schema as s, type Db } from "../db";
import { hitungIkp, type HasilIkp, type MasukanIkp } from "../ikp/hitung";
import type { ParamIndikator } from "../ikp/k1";
import { KATALOG } from "../ikp/katalog";
import { PARAMETER, type StatusPeriode } from "../ikp/tipe";
import { geserHariKerja, keUtc, rentangPeriode, type Kantor } from "../waktu";
import { petaBidang } from "./unit";

export async function liburPerKantor(db: Db) {
  const rows = await db.select().from(s.hariLibur);
  const set = (k: Kantor) => new Set(rows.filter((r) => !r.kantor || r.kantor === k).map((r) => r.tanggal));
  const cache = { makassar: set("makassar"), jakarta: set("jakarta") };
  return (k: Kantor) => cache[k];
}

export async function paramIndikator(db: Db): Promise<Map<string, ParamIndikator>> {
  const rows = await db.select().from(s.indikator);
  const m = new Map<string, ParamIndikator>();
  for (const d of KATALOG) {
    const r = rows.find((x) => x.kode === d.kode);
    m.set(d.kode, { kode: d.kode, standar: r?.standarCapaian ?? d.standar, tenggat: r ? r.tenggat : d.tenggat, aktif: r?.aktif ?? d.aktif, verifikator: r?.verifikatorPeran ?? d.verifikator });
  }
  return m;
}

/** Penugasan yang berlaku dalam periode. */
export const kondisiPenugasanBerlaku = (periode: string) =>
  and(lte(s.penugasan.periodeMulai, periode), or(isNull(s.penugasan.periodeSelesai), gte(s.penugasan.periodeSelesai, periode)));

/** Batas verifikasi: akhir hari kerja ke-5 setelah bulan berakhir (Bagian 5.3). */
export function batasVerifikasi(periode: string, libur: (k: Kantor) => ReadonlySet<string>) {
  const tgl = geserHariKerja(rentangPeriode(periode).akhir, PARAMETER.batasVerifikasiHariKerja, libur("jakarta"));
  return keUtc(tgl, "jakarta", "23:59");
}

export async function muatMasukanIkp(db: Db, periode: string, sekarang = new Date(), status: StatusPeriode = "berjalan"): Promise<MasukanIkp> {
  const { awal, akhir } = rentangPeriode(periode);
  const libur = await liburPerKantor(db);
  const batas = batasVerifikasi(periode, libur);
  const lewatBatas = sekarang > batas || status === "kalibrasi" || status === "sementara" || status === "disahkan";

  const [pegawai, penugasan, param, bidang] = await Promise.all([
    db.select().from(s.pegawai).where(eq(s.pegawai.aktif, true)),
    db.select().from(s.penugasan).where(kondisiPenugasanBerlaku(periode)),
    paramIndikator(db),
    petaBidang(db),
  ]);
  const kantorOf = new Map(pegawai.map((p) => [p.id, p.kantor as Kantor]));
  const pnAktif = penugasan.filter((p) => kantorOf.has(p.pegawaiId));
  const pnIds = pnAktif.map((p) => p.id);

  const [item, kegiatan, tugas, jurnal, uji, absensi, k3, pd, k4] = await Promise.all([
    pnIds.length ? db.select().from(s.item).where(and(eq(s.item.periodeId, periode), inArray(s.item.penugasanId, pnIds))) : [],
    db.select().from(s.kegiatan).where(and(gte(s.kegiatan.tanggal, awal), lte(s.kegiatan.tanggal, akhir))),
    db
      .select({ jadwal: s.tugasKhususJadwal, penugasanId: s.tugasKhusus.penugasanId })
      .from(s.tugasKhususJadwal)
      .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
      .where(eq(s.tugasKhususJadwal.periodeId, periode)),
    db.select({ pegawaiId: s.jurnal.pegawaiId, n: count() }).from(s.jurnal).where(and(gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir))).groupBy(s.jurnal.pegawaiId),
    db.select().from(s.ujiPetikArsip).where(eq(s.ujiPetikArsip.periodeId, periode)),
    db.select().from(s.absensi).where(eq(s.absensi.periodeId, periode)),
    db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.periodeId, periode), eq(s.penilaianK3.status, "dikirim"))),
    db.selectDistinct({ pegawaiId: s.pengembanganDiri.pegawaiId }).from(s.pengembanganDiri).where(and(gte(s.pengembanganDiri.tanggal, awal), lte(s.pengembanganDiri.tanggal, akhir))),
    db
      .select({ pegawaiId: s.k4Pengusul.pegawaiId, poin: s.k4Pengajuan.poin })
      .from(s.k4Pengajuan)
      .innerJoin(s.k4Pengusul, eq(s.k4Pengusul.k4Id, s.k4Pengajuan.id))
      .where(and(eq(s.k4Pengajuan.periodeId, periode), inArray(s.k4Pengajuan.status, ["ditetapkan", "disahkan"]))),
  ]);

  const poinK4 = new Map<string, number>();
  for (const r of k4) poinK4.set(r.pegawaiId, (poinK4.get(r.pegawaiId) ?? 0) + (r.poin ?? 0));

  return {
    k1: {
      periode,
      sekarang,
      batasVerifikasi: lewatBatas ? batas : null,
      libur,
      param,
      penugasan: pnAktif.map((p) => ({ id: p.id, pegawaiId: p.pegawaiId, peran: p.peranKerja, unitId: p.unitId, bidangId: bidang.get(p.unitId) ?? null, kantor: kantorOf.get(p.pegawaiId)! })),
      item: item.map((i) => ({
        id: i.id,
        penugasanId: i.penugasanId,
        indikatorKode: i.indikatorKode,
        kegiatanId: i.kegiatanId,
        masuk: i.tglMasuk,
        selesai: i.tglSelesai,
        status: i.status,
        diajukanPada: i.diajukanPada,
        diverifikasiPada: i.diverifikasiPada,
        dibuatPada: i.dibuatPada,
        data: i.data,
      })),
      kegiatan: kegiatan.map((k) => ({ id: k.id, unitId: k.unitId, tanggal: k.tanggal, perluSpp: k.perluSpp, perluSpb: k.perluSpb, dibuatPada: k.dibuatPada, penanggungJawabId: k.penanggungJawabId, skuoId: k.skuoId })),
      tugas: tugas.map(({ jadwal: j, penugasanId }) => ({ penugasanId, tenggat: j.tenggat, status: j.status, selesaiPada: j.selesaiPada, diverifikasiPada: j.diverifikasiPada })),
      jurnal: new Map(jurnal.map((j) => [j.pegawaiId, j.n])),
      ujiPetik: uji.map((u) => ({ unitId: u.unitId, jumlahDiuji: u.jumlahDiuji, jumlahSesuai: u.jumlahSesuai })),
    },
    pegawai: pegawai.map((p) => ({ id: p.id, nama: p.nama, kantor: p.kantor as Kantor })),
    penugasan: pnAktif.map((p) => ({ id: p.id, pegawaiId: p.pegawaiId, peran: p.peranKerja, unitId: p.unitId, koordinatorId: p.koordinatorId, bobotAlokasi: p.bobotAlokasi })),
    absensi: absensi.map((a) => ({ pegawaiId: a.pegawaiId, hariKerjaWajib: a.hariKerjaWajib, hadir: a.hadir, hadirTepatWaktu: a.hadirTepatWaktu, izinSakit: a.izinSakit, sanksiBerat: a.sanksiBerat })),
    k3: k3.map((k) => ({ penugasanId: k.penugasanId, penilaiId: k.penilaiId, skor: k.skor })),
    adaLogPengembanganDiri: new Set(pd.map((p) => p.pegawaiId)),
    poinK4,
  };
}

export async function periodeAtauBaru(db: Db, id: string) {
  const [p] = await db.select().from(s.periode).where(eq(s.periode.id, id));
  if (p) return p;
  const [baru] = await db.insert(s.periode).values({ id }).onConflictDoNothing().returning();
  return baru ?? (await db.select().from(s.periode).where(eq(s.periode.id, id)))[0];
}

/** IKP satu periode: snapshot bila sudah dikunci/disahkan, selain itu dihitung dari data terbaru. */
export async function hasilPeriode(periode: string, sekarang = new Date()): Promise<{ hasil: HasilIkp[]; status: StatusPeriode; snapshot: boolean }> {
  const db = await getDb();
  const p = await periodeAtauBaru(db, periode);
  if (p.status === "sementara" || p.status === "disahkan") {
    const snap = await db.select().from(s.hasilIkp).where(eq(s.hasilIkp.periodeId, periode));
    if (snap.length) return { hasil: snap.map((r) => r.rincian as HasilIkp), status: p.status, snapshot: true };
  }
  return { hasil: hitungIkp(await muatMasukanIkp(db, periode, sekarang, p.status)), status: p.status, snapshot: false };
}

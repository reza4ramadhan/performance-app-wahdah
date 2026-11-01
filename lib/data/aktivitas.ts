// Aktivitas K1 dalam rentang tanggal: item indikator dicatat, tugas khusus diselesaikan, dan jurnal.

import "server-only";
import { and, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { isHariKerja, hariIni, keUtc, periodeDari, tambahHari, tanggalLokal, type Kantor } from "../waktu";
import { liburPerKantor } from "./ikp";
import { petaBidang } from "./unit";

export type AktivitasPegawai = {
  id: string;
  nama: string;
  bidang: { id: string; nama: string }[];
  item: number;
  tugas: number;
  jurnal: number;
  /** Tanggal berbeda yang punya aktivitas. */
  hariAktif: number;
  /** Hari kerja dalam rentang, sampai hari ini. */
  hariKerja: number;
};

export type AktivitasBidang = { id: string; nama: string; pegawai: number; aktif: number; item: number; tugas: number; jurnal: number };

export const beraktivitas = (p: Pick<AktivitasPegawai, "item" | "tugas" | "jurnal">) => p.item + p.tugas + p.jurnal > 0;

export async function aktivitasK1(awal: string, akhir: string) {
  const db = await getDb();
  const [pn, unit, bidangOf, libur] = await Promise.all([
    db
      .select({ id: s.penugasan.id, pegawaiId: s.penugasan.pegawaiId, unitId: s.penugasan.unitId, peran: s.penugasan.peranKerja, nama: s.pegawai.nama, kantor: s.pegawai.kantor })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(
        and(
          eq(s.pegawai.aktif, true),
          lte(s.penugasan.periodeMulai, periodeDari(akhir)),
          or(isNull(s.penugasan.periodeSelesai), gte(s.penugasan.periodeSelesai, periodeDari(awal))),
        ),
      ),
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit),
    petaBidang(db),
    liburPerKantor(db),
  ]);
  // Sama dengan dashboard kantor: Kepala Kantor & WaKa tidak dinilai K1.
  const dinilai = pn.filter((p) => p.peran !== "KAKAN" && p.peran !== "WAKA");
  const pnIds = dinilai.map((p) => p.id);
  const pegawaiIds = [...new Set(dinilai.map((p) => p.pegawaiId))];
  const pemilik = new Map(dinilai.map((p) => [p.id, p.pegawaiId]));
  const kantorOf = new Map(dinilai.map((p) => [p.pegawaiId, p.kantor as Kantor]));
  const namaOf = new Map(dinilai.map((p) => [p.pegawaiId, p.nama]));

  // Batas UTC selebar mungkin (00.00 WITA s.d. 24.00 WIB); tanggal lokal disaring per pegawai di bawah.
  const dari = keUtc(awal, "makassar");
  const sampai = keUtc(tambahHari(akhir, 1), "jakarta");
  const [item, tugas, jurnal] = await Promise.all([
    pnIds.length
      ? db
          .select({ pn: s.item.penugasanId, t: s.item.dibuatPada })
          .from(s.item)
          .where(and(inArray(s.item.penugasanId, pnIds), gte(s.item.dibuatPada, dari), lt(s.item.dibuatPada, sampai)))
      : [],
    pnIds.length
      ? db
          .select({ pn: s.tugasKhusus.penugasanId, t: s.tugasKhususJadwal.selesaiPada })
          .from(s.tugasKhususJadwal)
          .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
          .where(and(inArray(s.tugasKhusus.penugasanId, pnIds), gte(s.tugasKhususJadwal.selesaiPada, dari), lt(s.tugasKhususJadwal.selesaiPada, sampai)))
      : [],
    pegawaiIds.length
      ? db
          .select({ pegawaiId: s.jurnal.pegawaiId, d: s.jurnal.tanggal })
          .from(s.jurnal)
          .where(and(inArray(s.jurnal.pegawaiId, pegawaiIds), gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir)))
      : [],
  ]);

  const hit = new Map<string, { item: number; tugas: number; jurnal: number; hari: Set<string> }>();
  const ambil = (id: string) => hit.get(id) ?? hit.set(id, { item: 0, tugas: 0, jurnal: 0, hari: new Set() }).get(id)!;
  const catat = (jenis: "item" | "tugas" | "jurnal", id: string, d: string) => {
    if (d < awal || d > akhir) return;
    const h = ambil(id);
    h[jenis]++;
    h.hari.add(d);
  };
  for (const r of item) {
    const id = pemilik.get(r.pn)!;
    catat("item", id, tanggalLokal(r.t, kantorOf.get(id)!));
  }
  for (const r of tugas) {
    const id = pemilik.get(r.pn)!;
    if (r.t) catat("tugas", id, tanggalLokal(r.t, kantorOf.get(id)!));
  }
  for (const r of jurnal) catat("jurnal", r.pegawaiId, r.d);

  const hariKerjaKantor = (k: Kantor) => {
    const batas = akhir < hariIni(k) ? akhir : hariIni(k);
    let n = 0;
    for (let t = awal; t <= batas; t = tambahHari(t, 1)) if (isHariKerja(t, libur(k))) n++;
    return n;
  };
  const hariKerja = { makassar: hariKerjaKantor("makassar"), jakarta: hariKerjaKantor("jakarta") };

  // Bidang kerja: bidang induk unit penugasan; unit pendukung & staf khusus berdiri sendiri.
  const namaUnit = new Map(unit.map((u) => [u.id, u.nama]));
  const bidangPegawai = new Map<string, Map<string, string>>();
  for (const p of dinilai) {
    const b = bidangOf.get(p.unitId) ?? p.unitId;
    (bidangPegawai.get(p.pegawaiId) ?? bidangPegawai.set(p.pegawaiId, new Map()).get(p.pegawaiId)!).set(b, namaUnit.get(b) ?? "—");
  }

  const pegawai: AktivitasPegawai[] = pegawaiIds
    .map((id) => {
      const h = hit.get(id);
      return {
        id,
        nama: namaOf.get(id)!,
        bidang: [...bidangPegawai.get(id)!].map(([bid, nama]) => ({ id: bid, nama })).sort((a, b) => a.nama.localeCompare(b.nama)),
        item: h?.item ?? 0,
        tugas: h?.tugas ?? 0,
        jurnal: h?.jurnal ?? 0,
        hariAktif: h?.hari.size ?? 0,
        hariKerja: hariKerja[kantorOf.get(id)!],
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));

  // Pegawai rangkap dihitung di setiap bidang tempat ia bertugas.
  const perBidang = new Map<string, AktivitasBidang>();
  for (const p of pegawai)
    for (const b of p.bidang) {
      const x = perBidang.get(b.id) ?? perBidang.set(b.id, { id: b.id, nama: b.nama, pegawai: 0, aktif: 0, item: 0, tugas: 0, jurnal: 0 }).get(b.id)!;
      x.pegawai++;
      if (beraktivitas(p)) x.aktif++;
      x.item += p.item;
      x.tugas += p.tugas;
      x.jurnal += p.jurnal;
    }

  return {
    pegawai,
    bidang: [...perBidang.values()].sort((a, b) => a.nama.localeCompare(b.nama)),
    total: { pegawai: pegawai.length, aktif: pegawai.filter(beraktivitas).length, item: sum(pegawai, "item"), tugas: sum(pegawai, "tugas"), jurnal: sum(pegawai, "jurnal") },
  };
}

const sum = (xs: AktivitasPegawai[], k: "item" | "tugas" | "jurnal") => xs.reduce((a, x) => a + x[k], 0);

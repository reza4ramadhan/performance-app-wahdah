// Data tim untuk koordinator: anggota, status pengisian hari ini, antrean verifikasi.

import "server-only";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb, schema as s, type Db } from "../db";
import type { Sesi } from "../sesi";
import { hariIni, keUtc, periodeDari, tambahHari, type Kantor } from "../waktu";
import { kondisiPenugasanBerlaku } from "./ikp";
import { unitDalamBidang } from "./unit";

export type AnggotaTim = {
  pegawaiId: string;
  nama: string;
  kantor: Kantor;
  penugasan: { id: string; peranKerja: string; unitNama: string; unitId: string; koordinatorId: string | null }[];
  isiHariIni: boolean;
};

/**
 * Anggota tim amanah aktif (bulan berjalan), dikelompokkan per pegawai. Penugasan saya sendiri (rangkap jabatan)
 * tidak ikut: item miliknya muncul di antrean verifikasi.
 */
export async function anggotaTim(sesi: Pick<Sesi, "pegawaiId" | "kantor" | "tim">): Promise<AnggotaTim[]> {
  const binaan = sesi.tim.filter((b) => b.pegawaiId !== sesi.pegawaiId).map((b) => b.id);
  if (!binaan.length) return [];
  const db = await getDb();
  const kantor = sesi.kantor;
  const periode = periodeDari(hariIni(kantor));
  const rows = await db
    .select({ pn: s.penugasan, nama: s.pegawai.nama, kantor: s.pegawai.kantor, unitNama: s.unit.nama })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
    .where(and(inArray(s.penugasan.id, binaan), eq(s.pegawai.aktif, true), kondisiPenugasanBerlaku(periode)));
  if (!rows.length) return [];

  const ids = [...new Set(rows.map((r) => r.pn.pegawaiId))];
  const pnIds = rows.map((r) => r.pn.id);
  const today = hariIni(kantor);
  // Rentang "hari ini" dibuat lebar (WIB & WITA) lalu dicocokkan per pegawai.
  const dari = keUtc(today, "makassar");
  const sampai = keUtc(tambahHari(today, 1), "jakarta");
  const [item, jurnal] = await Promise.all([
    db.select({ pn: s.item.penugasanId, t: s.item.dibuatPada }).from(s.item).where(and(inArray(s.item.penugasanId, pnIds), gte(s.item.dibuatPada, dari), lt(s.item.dibuatPada, sampai))),
    db.select({ p: s.jurnal.pegawaiId }).from(s.jurnal).where(and(inArray(s.jurnal.pegawaiId, ids), eq(s.jurnal.tanggal, today))),
  ]);
  const pnKe = new Map(rows.map((r) => [r.pn.id, r.pn.pegawaiId]));
  const isi = new Set([...item.map((i) => pnKe.get(i.pn)!), ...jurnal.map((j) => j.p)]);

  return ids.map((id) => {
    const milik = rows.filter((r) => r.pn.pegawaiId === id);
    return {
      pegawaiId: id,
      nama: milik[0].nama,
      kantor: milik[0].kantor as Kantor,
      penugasan: milik.map((r) => ({ id: r.pn.id, peranKerja: r.pn.peranKerja, unitNama: r.unitNama, unitId: r.pn.unitId, koordinatorId: r.pn.koordinatorId })),
      isiHariIni: isi.has(id),
    };
  });
}

export type StafBidang = { id: string; nama: string; /** Nama SKUO tempat ia ditugaskan (kosong bila langsung di bidang). */ skuo: string[] };

/** Staf SBK sebuah bidang pada satu periode: yang ditugaskan di bidang itu atau di SKUO di bawahnya. Satu baris per pegawai. */
export async function stafBidang(db: Db, bidangId: string, periode: string): Promise<StafBidang[]> {
  const unitIds = await unitDalamBidang(db, bidangId);
  if (!unitIds.length) return [];
  const rows = await db
    .select({ id: s.pegawai.id, nama: s.pegawai.nama, unitId: s.unit.id, unitNama: s.unit.nama })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
    .where(and(inArray(s.penugasan.unitId, unitIds), eq(s.penugasan.peranKerja, "SBK"), eq(s.pegawai.aktif, true), kondisiPenugasanBerlaku(periode)))
    .orderBy(asc(s.pegawai.nama), asc(s.unit.nama));
  const per = new Map<string, StafBidang>();
  for (const r of rows) {
    const x = per.get(r.id) ?? per.set(r.id, { id: r.id, nama: r.nama, skuo: [] }).get(r.id)!;
    if (r.unitId !== bidangId) x.skuo.push(r.unitNama);
  }
  return [...per.values()];
}

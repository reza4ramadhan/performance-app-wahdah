// Data tim untuk koordinator: anggota, status pengisian hari ini, antrean verifikasi.

import "server-only";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { hariIni, keUtc, periodeDari, tambahHari, type Kantor } from "../waktu";
import { kondisiPenugasanBerlaku } from "./ikp";

export type AnggotaTim = { pegawaiId: string; nama: string; kantor: Kantor; penugasan: { id: string; peranKerja: string; unitNama: string; unitId: string }[]; isiHariIni: boolean };

/** Penugasan yang koordinatornya = pegawai ini (bulan berjalan), dikelompokkan per pegawai. */
export async function anggotaTim(koordinatorId: string, kantor: Kantor): Promise<AnggotaTim[]> {
  const db = await getDb();
  const periode = periodeDari(hariIni(kantor));
  const rows = await db
    .select({ pn: s.penugasan, nama: s.pegawai.nama, kantor: s.pegawai.kantor, unitNama: s.unit.nama })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
    .where(and(eq(s.penugasan.koordinatorId, koordinatorId), eq(s.pegawai.aktif, true), kondisiPenugasanBerlaku(periode)));
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
      penugasan: milik.map((r) => ({ id: r.pn.id, peranKerja: r.pn.peranKerja, unitNama: r.unitNama, unitId: r.pn.unitId })),
      isiHariIni: isi.has(id),
    };
  });
}

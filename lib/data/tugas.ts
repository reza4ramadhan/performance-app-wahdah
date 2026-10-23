// Query tugas khusus untuk layar staf, pemberi tugas, dan dashboard.

import "server-only";
import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema as s } from "../db";
import type { FrekuensiTugas, StatusTugas } from "../ikp/tipe";
import type { Kantor } from "../waktu";

export type BarisTugas = {
  /** Id jadwal. */
  id: string;
  tugasId: string;
  judul: string;
  uraian: string | null;
  frekuensi: FrekuensiTugas;
  tenggat: Date;
  status: StatusTugas;
  persen: number;
  catatan: string | null;
  linkBukti: string | null;
  selesaiPada: Date | null;
  alasanTolak: string | null;
  periodeId: string;
  penugasanId: string;
  stafId: string;
  stafNama: string;
  kantor: Kantor;
  pemberiId: string;
  pemberiNama: string;
  /** Belum selesai dan tenggat sudah lewat. */
  lewat: boolean;
};

const pemberi = alias(s.pegawai, "pemberi");

export async function daftarTugas(where: SQL | undefined, batas = 300): Promise<BarisTugas[]> {
  const db = await getDb();
  const rows = await db
    .select({ j: s.tugasKhususJadwal, t: s.tugasKhusus, stafId: s.pegawai.id, stafNama: s.pegawai.nama, kantor: s.pegawai.kantor, pemberiNama: pemberi.nama })
    .from(s.tugasKhususJadwal)
    .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
    .innerJoin(s.penugasan, eq(s.penugasan.id, s.tugasKhusus.penugasanId))
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .innerJoin(pemberi, eq(pemberi.id, s.tugasKhusus.dibuatOleh))
    .where(where)
    .orderBy(asc(s.tugasKhususJadwal.tenggat))
    .limit(batas);
  const kini = Date.now();
  return rows.map((r) => ({
    id: r.j.id,
    tugasId: r.t.id,
    judul: r.t.judul,
    uraian: r.t.uraian,
    frekuensi: r.t.frekuensi,
    tenggat: r.j.tenggat,
    status: r.j.status,
    persen: r.j.persen,
    catatan: r.j.catatan,
    linkBukti: r.j.linkBukti,
    selesaiPada: r.j.selesaiPada,
    alasanTolak: r.j.alasanTolak,
    periodeId: r.j.periodeId,
    penugasanId: r.t.penugasanId,
    stafId: r.stafId,
    stafNama: r.stafNama,
    kantor: r.kantor as Kantor,
    pemberiId: r.t.dibuatOleh,
    pemberiNama: r.pemberiNama,
    lewat: (r.j.status === "belum" || r.j.status === "dikerjakan" || r.j.status === "ditolak") && r.j.tenggat.getTime() < kini,
  }));
}

/** Jadwal milik penugasan tertentu, opsional dibatasi status. */
export const kondisiTugasPenugasan = (penugasanIds: string[], status?: StatusTugas[]) =>
  and(inArray(s.tugasKhusus.penugasanId, penugasanIds.length ? penugasanIds : ["-"]), status ? inArray(s.tugasKhususJadwal.status, status) : undefined);

/** Jadwal yang menunggu verifikasi pemberi tugas ini. */
export const kondisiTugasMenunggu = (pemberiId: string) => and(eq(s.tugasKhusus.dibuatOleh, pemberiId), eq(s.tugasKhususJadwal.status, "diajukan"));

// Siapa menilai K3 siapa pada satu periode (plan.md Bagian 7, aturan rangkap jabatan).

import "server-only";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { penilaiK3 } from "../akses";
import { schema as s, type Db } from "../db";
import type { PeranKerja } from "../ikp/tipe";
import { kondisiPenugasanBerlaku } from "./ikp";
import { petaWaka } from "./unit";

export type PenugasanDinilai = { id: string; pegawaiId: string; nama: string; peranKerja: PeranKerja; unitNama: string; penilaiId: string | null };

/** Penugasan yang dinilai K3 pada periode itu (tanpa KAKAN/WAKA), beserta penilai efektifnya. */
export async function penugasanDinilai(db: Db, periode: string, pegawaiId?: string): Promise<PenugasanDinilai[]> {
  const [rows, waka] = await Promise.all([
    db
      .select({ pn: s.penugasan, nama: s.pegawai.nama, unitNama: s.unit.nama })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
      .where(and(kondisiPenugasanBerlaku(periode), notInArray(s.penugasan.peranKerja, ["KAKAN", "WAKA"]), eq(s.pegawai.aktif, true), pegawaiId ? eq(s.penugasan.pegawaiId, pegawaiId) : undefined))
      .orderBy(asc(s.pegawai.nama)),
    petaWaka(db),
  ]);
  return rows.map(({ pn, nama, unitNama }) => ({ id: pn.id, pegawaiId: pn.pegawaiId, nama, peranKerja: pn.peranKerja, unitNama, penilaiId: penilaiK3(pn, waka.get(pn.unitId) ?? null) }));
}

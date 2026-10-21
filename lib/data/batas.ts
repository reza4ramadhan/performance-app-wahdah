// Jendela edit log (plan.md 5.1): isi/ubah sampai 2 hari kerja ke belakang, kecuali dibuka Admin.

import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { schema as s, type Db } from "../db";
import { PARAMETER, type StatusPeriode } from "../ikp/tipe";
import { geserHariKerja, hariIni, type Kantor } from "../waktu";
import { liburPerKantor } from "./ikp";

/** Tanggal paling awal yang masih boleh diisi/diubah oleh pegawai ini. */
export async function tanggalPalingAwal(db: Db, pegawaiId: string, kantor: Kantor, sekarang = new Date()) {
  const libur = await liburPerKantor(db);
  const normal = geserHariKerja(hariIni(kantor, sekarang), -PARAMETER.batasEditHariKerja, libur(kantor));
  const buka = await db
    .select({ dari: s.bukaKunci.dariTanggal })
    .from(s.bukaKunci)
    .where(and(eq(s.bukaKunci.pegawaiId, pegawaiId), gt(s.bukaKunci.berlakuSampai, sekarang)));
  return [normal, ...buka.map((b) => b.dari)].sort()[0];
}

/** Periode yang masih menerima input pegawai. */
export const periodeTerbuka = (status: StatusPeriode | undefined) => status === undefined || status === "berjalan" || status === "verifikasi";

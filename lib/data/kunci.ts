// Snapshot IKP saat periode dikunci (sementara) dan disahkan (akhir). Bukan Server Action.

import "server-only";
import { eq } from "drizzle-orm";
import { schema as s, type Db } from "../db";
import { hitungIkp } from "../ikp/hitung";
import type { StatusPeriode } from "../ikp/tipe";
import { muatMasukanIkp } from "./ikp";

export async function tulisSnapshot(db: Db, periode: string, versi: "sementara" | "akhir", status: StatusPeriode) {
  const hasil = hitungIkp(await muatMasukanIkp(db, periode, new Date(), status));
  await db.transaction(async (tx) => {
    await tx.delete(s.hasilIkp).where(eq(s.hasilIkp.periodeId, periode));
    if (hasil.length)
      await tx.insert(s.hasilIkp).values(
        hasil.map((h) => ({
          periodeId: periode,
          pegawaiId: h.pegawaiId,
          rincian: h,
          k1: h.k1,
          k2: h.k2,
          k3: h.k3,
          k4: h.k4,
          ikp: h.ikp,
          ikpAkhir: h.ikpAkhir,
          predikat: h.predikat,
          syaratMinimum: h.syaratMinimum.memenuhi,
          versi,
        })),
      );
  });
  return hasil;
}

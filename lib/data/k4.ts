// K4: utilitas server (bukan Server Action — tidak boleh dipanggil langsung dari klien).

import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema as s, type Db } from "../db";
import { PARAMETER } from "../ikp/tipe";
import { geserHariKerja, hariIni, periodeBerikut, periodeDari, rentangPeriode, type Kantor } from "../waktu";
import { liburPerKantor } from "./ikp";

/** Periode yang masih boleh diajukan: bulan ini, dan bulan lalu sampai 5 hari kerja setelah bulan berakhir. */
export async function periodeK4Terbuka(kantor: Kantor) {
  const db = await getDb();
  const libur = await liburPerKantor(db);
  const today = hariIni(kantor);
  const kini = periodeDari(today);
  const lalu = periodeBerikut(kini, -1);
  const batas = geserHariKerja(rentangPeriode(lalu).akhir, PARAMETER.batasVerifikasiHariKerja, libur(kantor));
  return today <= batas ? [lalu, kini] : [kini];
}

/** Total poin yang sudah diterima inovasi yang sama di tingkat-tingkat sebelumnya (rantai induk). */
export async function poinSebelumnya(db: Db, indukId: string | null) {
  let total = 0;
  for (let induk = indukId, langkah = 0; induk && langkah < 10; langkah++) {
    const [r] = await db.select().from(s.k4Pengajuan).where(eq(s.k4Pengajuan.id, induk));
    if (!r) break;
    if (r.status === "ditetapkan" || r.status === "disahkan") total += r.poin ?? 0;
    induk = r.inovasiIndukId;
  }
  return total;
}

/** Dipanggil saat IKP disahkan: K4 yang ditetapkan ikut disahkan. */
export async function sahkanK4Periode(db: Db, periodeId: string) {
  await db.update(s.k4Pengajuan).set({ status: "disahkan" }).where(and(eq(s.k4Pengajuan.periodeId, periodeId), inArray(s.k4Pengajuan.status, ["ditetapkan"])));
}

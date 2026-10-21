// Rekap jurnal per bidang/SKUO (Excel): semua entri jurnal satu periode dengan pemberi tugas.

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { pimpinan } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { bukuExcel, responsExcel } from "@/lib/ekspor";
import { bacaSesi } from "@/lib/sesi";
import { rentangPeriode } from "@/lib/waktu";

export async function GET(req: Request) {
  const sesi = await bacaSesi();
  if (!sesi || !pimpinan(sesi)) return new Response("Tidak berhak", { status: 403 });
  const periode = new URL(req.url).searchParams.get("periode") ?? "";
  if (!/^\d{4}-\d{2}$/.test(periode)) return new Response("Periode tidak valid", { status: 400 });
  const { awal, akhir } = rentangPeriode(periode);
  const db = await getDb();
  const rows = await db
    .select({ j: s.jurnal, nama: s.pegawai.nama, unit: s.unit.nama })
    .from(s.jurnal)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.jurnal.pegawaiId))
    .leftJoin(s.unit, eq(s.unit.id, s.jurnal.unitId))
    .where(and(gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, akhir)))
    .orderBy(asc(s.unit.nama), asc(s.jurnal.tanggal));

  const buf = await bukuExcel(
    `Jurnal ${periode}`,
    [
      { header: "Bidang/SKUO", key: "unit", width: 26 },
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "Pegawai", key: "nama", width: 26 },
      { header: "Uraian", key: "uraian", width: 60 },
      { header: "Pemberi tugas", key: "pemberi", width: 22 },
      { header: "Link", key: "link", width: 30 },
    ],
    rows.map((r) => ({ unit: r.unit ?? "(tanpa bidang)", tanggal: r.j.tanggal, nama: r.nama, uraian: r.j.uraian, pemberi: r.j.pemberiTugas ?? "", link: r.j.link ?? "" })),
  );
  return responsExcel(buf, `rekap-jurnal-${periode}.xlsx`);
}

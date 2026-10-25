// Rekap IKP bulanan (Excel): pegawai, status kepegawaian, penugasan, K1 per penugasan, K1–K4, IKP,
// IKP Akhir, predikat, penanda syarat minimum, status verifikasi.

import { and, eq, inArray } from "drizzle-orm";
import { pimpinan } from "@/lib/akses";
import { getDb, schema as s } from "@/lib/db";
import { hasilPeriode } from "@/lib/data/ikp";
import { unitPenugasan } from "@/lib/ikp/hitung";
import { bukuExcel, bulat2, responsExcel } from "@/lib/ekspor";
import { LABEL_STATUS_PERIODE } from "@/lib/ikp/tipe";
import { bacaSesi } from "@/lib/sesi";

export async function GET(req: Request) {
  const sesi = await bacaSesi();
  if (!sesi || !pimpinan(sesi)) return new Response("Tidak berhak", { status: 403 });
  const periode = new URL(req.url).searchParams.get("periode") ?? "";
  if (!/^\d{4}-\d{2}$/.test(periode)) return new Response("Periode tidak valid", { status: 400 });

  const db = await getDb();
  const [{ hasil, status }, pegawai, unit, belumVerif] = await Promise.all([
    hasilPeriode(periode),
    db.select().from(s.pegawai),
    db.select().from(s.unit),
    db
      .select({ pegawaiId: s.penugasan.pegawaiId })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(and(eq(s.item.periodeId, periode), inArray(s.item.status, ["diajukan"]))),
  ]);
  const pg = new Map(pegawai.map((p) => [p.id, p]));
  const namaUnit = new Map(unit.map((u) => [u.id, u.nama]));
  const tertunda = new Map<string, number>();
  for (const r of belumVerif) tertunda.set(r.pegawaiId, (tertunda.get(r.pegawaiId) ?? 0) + 1);

  const buf = await bukuExcel(
    `IKP ${periode}`,
    [
      { header: "Nama", key: "nama", width: 28 },
      { header: "NIP", key: "nip", width: 12 },
      { header: "Status kepegawaian", key: "status", width: 16 },
      { header: "Kantor", key: "kantor", width: 11 },
      { header: "Penugasan (K1 per penugasan)", key: "penugasan", width: 48 },
      { header: "K1", key: "k1" },
      { header: "K2", key: "k2" },
      { header: "K3", key: "k3" },
      { header: "K4", key: "k4" },
      { header: "IKP", key: "ikp" },
      { header: "IKP Akhir", key: "ikpAkhir" },
      { header: "Predikat", key: "predikat", width: 16 },
      { header: "Syarat minimum", key: "syarat", width: 30 },
      { header: "Item belum diverifikasi", key: "tertunda", width: 12 },
      { header: "Catatan", key: "catatan", width: 40 },
    ],
    hasil.map((h) => ({
      nama: h.nama,
      nip: pg.get(h.pegawaiId)?.nip ?? "",
      status: pg.get(h.pegawaiId)?.statusKepegawaian ?? "",
      kantor: pg.get(h.pegawaiId)?.kantor === "jakarta" ? "Jakarta" : "Makassar",
      penugasan: h.penugasan.map((p) => `${p.peran} ${unitPenugasan(p).map((u) => namaUnit.get(u)).join(" & ")}${p.k1 !== null ? ` (${bulat2(p.k1)})` : ""}${p.bobotAlokasi ? ` [${p.bobotAlokasi}%]` : ""}`).join("; "),
      k1: bulat2(h.k1),
      k2: bulat2(h.k2),
      k3: bulat2(h.k3),
      k4: bulat2(h.k4),
      ikp: bulat2(h.ikp),
      ikpAkhir: bulat2(h.ikpAkhir),
      predikat: h.predikat ?? "",
      syarat: h.syaratMinimum.memenuhi ? "Memenuhi" : `Tidak memenuhi syarat insentif: ${h.syaratMinimum.alasan.join(", ")}`,
      tertunda: tertunda.get(h.pegawaiId) ?? 0,
      catatan: [h.kategori === "pimpinan" ? "IKP = K2 (pimpinan)" : h.kategori === "kepala_unit" ? "IKP = 0,5 K2 + 0,5 K3" : "", ...h.kekurangan].filter(Boolean).join("; "),
    })),
  );
  return responsExcel(buf, `rekap-ikp-${periode}-${LABEL_STATUS_PERIODE[status].toLowerCase().replace(/\s+/g, "-")}.xlsx`);
}

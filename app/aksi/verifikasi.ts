"use server";

import { eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { bolehVerifikasiItem } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { paramIndikator } from "@/lib/data/ikp";
import { wajibSesi } from "@/lib/sesi";

/**
 * Setujui atau tolak satu/banyak item (plan.md Bagian 8 butir 9–10).
 * Alasan wajib saat menolak. Konflik kepentingan dicek per item.
 */
export async function verifikasiItem(ids: string[], keputusan: "setuju" | "tolak", alasan?: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!ids.length) return gagal("Pilih item terlebih dahulu.");
  if (keputusan === "tolak" && !alasan?.trim()) return gagal("Tulis alasan penolakan.", { alasan: "Alasan wajib diisi." });

  const db = await getDb();
  const [rows, param, periode] = await Promise.all([
    db
      .select({ item: s.item, pemilikId: s.penugasan.pegawaiId, koordinatorId: s.penugasan.koordinatorId })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(inArray(s.item.id, ids)),
    paramIndikator(db),
    db.select().from(s.periode),
  ]);

  const ditolak: string[] = [];
  let n = 0;
  for (const r of rows) {
    const verifikator = param.get(r.item.indikatorKode)?.verifikator ?? "koordinator";
    const boleh = bolehVerifikasiItem(sesi, { pemilikId: r.pemilikId, koordinatorId: r.koordinatorId, verifikator });
    if (!boleh.boleh) {
      ditolak.push(boleh.alasan);
      continue;
    }
    if (r.item.status !== "diajukan") continue;
    const st = periode.find((p) => p.id === r.item.periodeId)?.status;
    if (st === "sementara" || st === "disahkan") {
      ditolak.push("Periode sudah dikunci.");
      continue;
    }
    const sesudah = {
      status: keputusan === "setuju" ? ("disetujui" as const) : ("ditolak" as const),
      verifikatorId: sesi.pegawaiId,
      diverifikasiPada: new Date(),
      alasanTolak: keputusan === "tolak" ? alasan!.trim() : null,
    };
    await db.update(s.item).set(sesudah).where(eq(s.item.id, r.item.id));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: keputusan === "setuju" ? "setujui" : "tolak", entitas: "item", entitasId: r.item.id, sebelum: { status: r.item.status }, sesudah, alasan: sesudah.alasanTolak });
    n++;
  }
  refresh();
  if (!n) return gagal(ditolak[0] ?? "Tidak ada item yang bisa diproses.");
  const kata = keputusan === "setuju" ? "disetujui" : "ditolak";
  return berhasil(ditolak.length ? `${n} item ${kata}; ${ditolak.length} dilewati.` : `${n} item ${kata}.`);
}

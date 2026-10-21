"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, periodeDari } from "@/lib/waktu";

const skemaDtr = z
  .array(z.object({ uraian: z.string().trim().min(3, "Uraian terlalu pendek").max(200), frekuensi: z.enum(["harian", "mingguan"]) }))
  .min(3, "DTR berisi 3–5 tugas rutin.")
  .max(5, "DTR berisi 3–5 tugas rutin.");

/** Staf Khusus mengajukan DTR bulan ini (menggantikan usulan yang belum disetujui). */
export async function ajukanDtr(penugasanId: string, tugas: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const pn = sesi.penugasan.find((p) => p.id === penugasanId && p.peranKerja === "SK");
  if (!pn) return gagal("DTR hanya untuk penugasan Staf Khusus.");
  const p = skemaDtr.safeParse(tugas);
  if (!p.success) return gagal(p.error.issues[0].message);
  const db = await getDb();
  const periode = periodeDari(hariIni(sesi.kantor));
  const ada = await db.select().from(s.dtrTugas).where(and(eq(s.dtrTugas.penugasanId, pn.id), eq(s.dtrTugas.periodeId, periode)));
  if (ada.some((t) => t.disetujuiOleh)) return gagal("DTR bulan ini sudah disetujui atasan. Minta atasan bila perlu diubah.");
  await db.delete(s.dtrTugas).where(and(eq(s.dtrTugas.penugasanId, pn.id), eq(s.dtrTugas.periodeId, periode)));
  await db.insert(s.dtrTugas).values(p.data.map((t) => ({ penugasanId: pn.id, periodeId: periode, ...t })));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ajukan", entitas: "dtr", entitasId: pn.id, sebelum: ada, sesudah: p.data });
  refresh();
  return berhasil("DTR diajukan. Menunggu persetujuan atasan.");
}

/** Centang / batal centang tugas DTR untuk satu tanggal (dalam jendela 2 hari kerja). */
export async function centangDtr(tugasId: string, tanggal: string, selesai: boolean): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [t] = await db.select().from(s.dtrTugas).where(eq(s.dtrTugas.id, tugasId));
  if (!t || !sesi.penugasan.some((p) => p.id === t.penugasanId)) return gagal("Tugas tidak ditemukan.");
  if (!t.disetujuiOleh) return gagal("DTR belum disetujui atasan.");
  const awal = await tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor);
  if (tanggal < awal || tanggal > hariIni(sesi.kantor)) return gagal("Tanggal di luar jendela isian.");
  const [lama] = await db.select().from(s.dtrCek).where(and(eq(s.dtrCek.dtrTugasId, tugasId), eq(s.dtrCek.tanggal, tanggal)));
  if (lama?.disetujui) return gagal("Sudah disetujui atasan.");
  if (selesai) {
    await db.insert(s.dtrCek).values({ dtrTugasId: tugasId, tanggal, selesai: true }).onConflictDoUpdate({ target: [s.dtrCek.dtrTugasId, s.dtrCek.tanggal], set: { selesai: true } });
  } else if (lama) {
    await db.delete(s.dtrCek).where(eq(s.dtrCek.id, lama.id));
  }
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: selesai ? "centang" : "batal-centang", entitas: "dtr_cek", entitasId: tugasId, sesudah: { tanggal, selesai } });
  refresh();
  return berhasil(selesai ? "Dicentang." : "Centang dibatalkan.");
}

async function wajibAtasan(penugasanId: string) {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [pn] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, penugasanId));
  if (!pn || pn.koordinatorId !== sesi.pegawaiId || pn.pegawaiId === sesi.pegawaiId) return null;
  return { sesi, db, pn };
}

/** Atasan menyetujui DTR yang diajukan. */
export async function setujuiDtr(penugasanId: string, periode: string): Promise<HasilAksi> {
  const a = await wajibAtasan(penugasanId);
  if (!a) return gagal("Hanya atasan Staf Khusus ini yang bisa menyetujui.");
  await a.db
    .update(s.dtrTugas)
    .set({ disetujuiOleh: a.sesi.pegawaiId, disetujuiPada: new Date() })
    .where(and(eq(s.dtrTugas.penugasanId, penugasanId), eq(s.dtrTugas.periodeId, periode), isNull(s.dtrTugas.disetujuiOleh)));
  await catatAudit(a.db, { aktorId: a.sesi.pegawaiId, aksi: "setujui", entitas: "dtr", entitasId: penugasanId, sesudah: { periode } });
  refresh();
  return berhasil("DTR disetujui.");
}

/** Atasan menyetujui centang DTR (semua yang belum disetujui untuk penugasan ini). */
export async function setujuiCekDtr(penugasanId: string, periode: string): Promise<HasilAksi> {
  const a = await wajibAtasan(penugasanId);
  if (!a) return gagal("Hanya atasan Staf Khusus ini yang bisa menyetujui.");
  const tugas = await a.db.select({ id: s.dtrTugas.id }).from(s.dtrTugas).where(and(eq(s.dtrTugas.penugasanId, penugasanId), eq(s.dtrTugas.periodeId, periode)));
  if (!tugas.length) return gagal("Belum ada DTR.");
  const hasil = await a.db
    .update(s.dtrCek)
    .set({ disetujui: true })
    .where(and(inArray(s.dtrCek.dtrTugasId, tugas.map((t) => t.id)), eq(s.dtrCek.disetujui, false), eq(s.dtrCek.selesai, true)))
    .returning({ id: s.dtrCek.id });
  await catatAudit(a.db, { aktorId: a.sesi.pegawaiId, aksi: "setujui-centang", entitas: "dtr_cek", entitasId: penugasanId, sesudah: { jumlah: hasil.length } });
  refresh();
  return berhasil(`${hasil.length} centang disetujui.`);
}

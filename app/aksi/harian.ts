"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { tanggalPalingAwal } from "@/lib/data/batas";
import { wajibSesi, type Sesi } from "@/lib/sesi";
import { hariIni } from "@/lib/waktu";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

async function cekTanggal(sesi: Sesi, tanggal: string) {
  const db = await getDb();
  const awal = await tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor);
  if (tanggal > hariIni(sesi.kantor)) return "Tanggal tidak boleh di masa depan.";
  if (tanggal < awal) return `Hanya bisa diisi sampai 2 hari kerja ke belakang (paling awal ${awal}).`;
  return null;
}

const skemaJurnal = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal."),
  uraian: z.string().trim().min(3, "Tulis uraian singkat pekerjaan.").max(500),
  unitId: z.string().optional(),
  pemberiTugas: z.string().trim().max(120).optional(),
  link: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Link harus alamat lengkap (https://…)." })]).optional(),
});

export async function simpanJurnal(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaJurnal.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian jurnal.", galatDari(p.error));
  const g = await cekTanggal(sesi, p.data.tanggal);
  if (g) return gagal(g, { tanggal: g });
  const db = await getDb();
  const [baru] = await db
    .insert(s.jurnal)
    .values({ pegawaiId: sesi.pegawaiId, tanggal: p.data.tanggal, uraian: p.data.uraian, unitId: p.data.unitId || null, pemberiTugas: p.data.pemberiTugas || null, link: p.data.link || null })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "jurnal", entitasId: baru.id, sesudah: baru });
  refresh();
  return berhasil("Jurnal tersimpan.");
}

export async function hapusJurnal(id: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [row] = await db.select().from(s.jurnal).where(and(eq(s.jurnal.id, id), eq(s.jurnal.pegawaiId, sesi.pegawaiId)));
  if (!row) return gagal("Jurnal tidak ditemukan.");
  const g = await cekTanggal(sesi, row.tanggal);
  if (g) return gagal("Jurnal lebih dari 2 hari kerja ke belakang sudah terkunci.");
  await db.delete(s.jurnal).where(eq(s.jurnal.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "jurnal", entitasId: id, sebelum: row });
  refresh();
  return berhasil("Jurnal dihapus.");
}

const skemaPd = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal."),
  judul: z.string().trim().min(3, "Isi judul bacaan atau materi.").max(200),
  durasiMenit: z.coerce.number({ error: "Isi durasi dalam menit." }).int().min(5, "Minimal 5 menit.").max(600, "Maksimal 600 menit."),
  ringkasan: z.string().trim().min(5, "Tulis ringkasan satu kalimat.").max(300),
});

export async function simpanPengembanganDiri(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaPd.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const g = await cekTanggal(sesi, p.data.tanggal);
  if (g) return gagal(g, { tanggal: g });
  const db = await getDb();
  const [baru] = await db.insert(s.pengembanganDiri).values({ pegawaiId: sesi.pegawaiId, ...p.data }).returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "pengembangan_diri", entitasId: baru.id, sesudah: baru });
  refresh();
  return berhasil("Catatan pengembangan diri tersimpan.");
}

export async function hapusPengembanganDiri(id: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [row] = await db.select().from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.id, id), eq(s.pengembanganDiri.pegawaiId, sesi.pegawaiId)));
  if (!row) return gagal("Catatan tidak ditemukan.");
  if (await cekTanggal(sesi, row.tanggal)) return gagal("Catatan lebih dari 2 hari kerja ke belakang sudah terkunci.");
  await db.delete(s.pengembanganDiri).where(eq(s.pengembanganDiri.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "pengembangan_diri", entitasId: id, sebelum: row });
  refresh();
  return berhasil("Catatan dihapus.");
}

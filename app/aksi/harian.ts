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

const jam = (pesan: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, pesan);
const skemaTanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal.");

/** Satu poin jurnal: uraian dan rentang jam pengerjaannya (waktu kantor). */
const skemaPoinJurnal = z
  .object({
    uraian: z.string().trim().min(3, "Tulis uraian singkat pekerjaan.").max(500),
    jamMulai: jam("Isi jam mulai."),
    jamSelesai: jam("Isi jam selesai."),
    unitId: z.string().optional(),
    pemberiTugas: z.string().trim().max(120).optional(),
    link: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Link harus alamat lengkap (https://…)." })]).optional(),
  })
  .refine((x) => x.jamSelesai > x.jamMulai, { path: ["jamSelesai"], message: "Jam selesai harus setelah jam mulai." });

const nilaiJurnal = (x: z.infer<typeof skemaPoinJurnal>) => ({
  uraian: x.uraian,
  jamMulai: x.jamMulai,
  jamSelesai: x.jamSelesai,
  unitId: x.unitId || null,
  pemberiTugas: x.pemberiTugas || null,
  link: x.link || null,
});

export async function simpanJurnal(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaPoinJurnal.and(z.object({ tanggal: skemaTanggal })).safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian jurnal.", galatDari(p.error));
  const g = await cekTanggal(sesi, p.data.tanggal);
  if (g) return gagal(g, { tanggal: g });
  const db = await getDb();
  const [baru] = await db
    .insert(s.jurnal)
    .values({ pegawaiId: sesi.pegawaiId, tanggal: p.data.tanggal, ...nilaiJurnal(p.data) })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "jurnal", entitasId: baru.id, sesudah: baru });
  refresh();
  return berhasil("Jurnal tersimpan.");
}

const KOLOM_POIN = ["uraian", "jamMulai", "jamSelesai", "unitId", "pemberiTugas", "link"] as const;
const MAKS_POIN = 30;

/** Banyak poin jurnal untuk satu tanggal. Baris yang seluruhnya kosong dilewati; satu baris salah membatalkan semuanya. */
export async function simpanJurnalSekaligus(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const tanggal = skemaTanggal.safeParse(fd.get("tanggal"));
  if (!tanggal.success) return gagal("Periksa isian jurnal.", { tanggal: "Isi tanggal." });
  const kolom = Object.fromEntries(KOLOM_POIN.map((k) => [k, fd.getAll(k).map(String)]));
  const baris = kolom.uraian
    .map((_, i) => Object.fromEntries(KOLOM_POIN.map((k) => [k, kolom[k][i] ?? ""])))
    .map((x, i) => ({ i, x }))
    .filter(({ x }) => x.uraian.trim() || x.jamMulai || x.jamSelesai || x.pemberiTugas.trim() || x.link.trim());
  if (!baris.length) return gagal("Isi minimal satu poin jurnal.", { "uraian.0": "Tulis uraian singkat pekerjaan." });
  if (baris.length > MAKS_POIN) return gagal(`Maksimal ${MAKS_POIN} poin sekali simpan.`);

  const galat: Record<string, string> = {};
  const poin: z.infer<typeof skemaPoinJurnal>[] = [];
  for (const { i, x } of baris) {
    const p = skemaPoinJurnal.safeParse(x);
    if (p.success) poin.push(p.data);
    else for (const [k, v] of Object.entries(galatDari(p.error))) galat[`${k}.${i}`] = v;
  }
  if (Object.keys(galat).length) return gagal("Periksa poin yang ditandai.", galat);
  const g = await cekTanggal(sesi, tanggal.data);
  if (g) return gagal(g, { tanggal: g });

  const db = await getDb();
  const rows = await db
    .insert(s.jurnal)
    .values(poin.map((x) => ({ pegawaiId: sesi.pegawaiId, tanggal: tanggal.data, ...nilaiJurnal(x) })))
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "jurnal", entitasId: rows[0].id, sesudah: { tanggal: tanggal.data, jumlah: rows.length, id: rows.map((r) => r.id) } });
  refresh();
  return berhasil(rows.length > 1 ? `${rows.length} poin jurnal tersimpan.` : "Jurnal tersimpan.");
}

/** Ubah jurnal sendiri selama tanggal lama dan barunya masih dalam jendela 2 hari kerja. */
export async function ubahJurnal(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaPoinJurnal.and(z.object({ id: z.string().min(1), tanggal: skemaTanggal })).safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian jurnal.", galatDari(p.error));
  const db = await getDb();
  const [row] = await db.select().from(s.jurnal).where(and(eq(s.jurnal.id, p.data.id), eq(s.jurnal.pegawaiId, sesi.pegawaiId)));
  if (!row) return gagal("Jurnal tidak ditemukan.");
  if (await cekTanggal(sesi, row.tanggal)) return gagal("Jurnal lebih dari 2 hari kerja ke belakang sudah terkunci.");
  const g = await cekTanggal(sesi, p.data.tanggal);
  if (g) return gagal(g, { tanggal: g });
  const [baru] = await db
    .update(s.jurnal)
    .set({ tanggal: p.data.tanggal, ...nilaiJurnal(p.data) })
    .where(eq(s.jurnal.id, row.id))
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ubah", entitas: "jurnal", entitasId: row.id, sebelum: row, sesudah: baru });
  refresh();
  return berhasil("Jurnal diperbarui.");
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

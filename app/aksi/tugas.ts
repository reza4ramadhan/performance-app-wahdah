"use server";

// Tugas khusus: koordinator penugasan memberi tugas ber-tenggat; staf memperbarui progres;
// pemberi tugas memverifikasi yang ditandai selesai.

import { and, eq, inArray, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { periodeTerbuka } from "@/lib/data/batas";
import { kondisiPenugasanBerlaku, liburPerKantor } from "@/lib/data/ikp";
import { getDb, schema as s } from "@/lib/db";
import { FREKUENSI_TUGAS } from "@/lib/ikp/tipe";
import { MAKS_JADWAL, tanggalJadwal } from "@/lib/ikp/tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, keUtc, periodeDari, type Kantor } from "@/lib/waktu";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal.");
const link = z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Link harus alamat lengkap (https://…)." }).max(1000)]);

/** Status beberapa periode sekaligus. */
async function statusPeriode(periodeIds: string[]) {
  const db = await getDb();
  const rows = periodeIds.length ? await db.select().from(s.periode).where(inArray(s.periode.id, periodeIds)) : [];
  return (id: string) => rows.find((p) => p.id === id)?.status;
}

// ── Pemberi tugas ─────────────────────────────────────────────────────────────

const skemaTugas = z
  .object({
    penugasanId: z.string().min(1, "Pilih staf."),
    judul: z.string().trim().min(3, "Isi judul tugas.").max(200),
    uraian: z.string().trim().max(1000).optional(),
    frekuensi: z.enum(FREKUENSI_TUGAS, "Pilih frekuensi."),
    tanggalMulai: tanggal,
    tanggalAkhir: z.string().optional(),
    jamTenggat: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Isi jam tenggat."),
  })
  .refine((x) => x.frekuensi === "sekali" || /^\d{4}-\d{2}-\d{2}$/.test(x.tanggalAkhir ?? ""), { path: ["tanggalAkhir"], message: "Isi tanggal berakhir untuk tugas berulang." })
  .refine((x) => x.frekuensi === "sekali" || x.tanggalAkhir! >= x.tanggalMulai, { path: ["tanggalAkhir"], message: "Tanggal berakhir tidak boleh sebelum tanggal mulai." });

export async function simpanTugasKhusus(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaTugas.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian tugas.", galatDari(p.error));
  const x = p.data;

  const db = await getDb();
  const [pn] = await db
    .select({ pn: s.penugasan, kantor: s.pegawai.kantor })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .where(and(eq(s.penugasan.id, x.penugasanId), kondisiPenugasanBerlaku(periodeDari(hariIni(sesi.kantor)))));
  if (!pn || pn.pn.koordinatorId !== sesi.pegawaiId || pn.pn.pegawaiId === sesi.pegawaiId || !["SBK", "SK"].includes(pn.pn.peranKerja))
    return gagal("Periksa staf.", { penugasanId: "Tugas khusus hanya bisa diberikan kepada SBK atau Staf Khusus yang Anda koordinasikan." });

  const kantor = pn.kantor as Kantor;
  if (x.tanggalMulai < hariIni(kantor)) return gagal("Periksa tanggal.", { tanggalMulai: "Tanggal tidak boleh di masa lalu." });
  const akhir = x.frekuensi === "sekali" ? x.tanggalMulai : x.tanggalAkhir!;
  const daftar = tanggalJadwal(x.frekuensi, x.tanggalMulai, akhir, (await liburPerKantor(db))(kantor));
  if (!daftar.length) return gagal("Periksa tanggal.", { tanggalAkhir: "Tidak ada hari kerja dalam rentang ini." });
  if (daftar.length > MAKS_JADWAL) return gagal("Periksa tanggal.", { tanggalAkhir: `Rentang terlalu panjang (maks. ${MAKS_JADWAL} jadwal). Buat ulang untuk periode berikutnya.` });
  const status = await statusPeriode([...new Set(daftar.map(periodeDari))]);
  if (!daftar.every((d) => periodeTerbuka(status(periodeDari(d))))) return gagal("Periode tugas itu sudah dikunci.");

  const [t] = await db
    .insert(s.tugasKhusus)
    .values({ penugasanId: pn.pn.id, judul: x.judul, uraian: x.uraian || null, frekuensi: x.frekuensi, tanggalMulai: x.tanggalMulai, tanggalAkhir: akhir, jamTenggat: x.jamTenggat, dibuatOleh: sesi.pegawaiId })
    .returning();
  await db.insert(s.tugasKhususJadwal).values(daftar.map((d) => ({ tugasId: t.id, periodeId: periodeDari(d), tenggat: keUtc(d, kantor, x.jamTenggat) })));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "tugas_khusus", entitasId: t.id, sesudah: { ...t, jadwal: daftar.length } });
  refresh();
  return berhasil(daftar.length > 1 ? `Tugas tersimpan dengan ${daftar.length} jadwal.` : "Tugas tersimpan.");
}

/** Hapus tugas: jadwal yang sudah disetujui tetap tersimpan, sisanya dihapus. */
export async function hapusTugasKhusus(tugasId: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [t] = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.id, tugasId));
  if (!t || t.dibuatOleh !== sesi.pegawaiId) return gagal("Tugas tidak ditemukan.");
  const jadwal = await db.select().from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.tugasId, tugasId));
  const status = await statusPeriode([...new Set(jadwal.map((j) => j.periodeId))]);
  const hapus = jadwal.filter((j) => j.status !== "disetujui" && periodeTerbuka(status(j.periodeId)));
  const sisa = jadwal.length - hapus.length;
  if (hapus.length) await db.delete(s.tugasKhususJadwal).where(inArray(s.tugasKhususJadwal.id, hapus.map((j) => j.id)));
  if (!sisa) await db.delete(s.tugasKhusus).where(eq(s.tugasKhusus.id, tugasId));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "tugas_khusus", entitasId: tugasId, sebelum: { ...t, jadwal: jadwal.length }, sesudah: { tersisa: sisa } });
  refresh();
  return berhasil(sisa ? `Tugas dihentikan. ${sisa} jadwal yang sudah selesai tetap tercatat.` : "Tugas dihapus.");
}

/** Setujui atau tolak jadwal yang ditandai selesai. Hanya pemberi tugas (atau koordinator penugasan saat ini). */
export async function verifikasiTugas(ids: string[], keputusan: "setuju" | "tolak", alasan?: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!ids.length) return gagal("Pilih tugas terlebih dahulu.");
  if (keputusan === "tolak" && !alasan?.trim()) return gagal("Tulis alasan penolakan.", { alasan: "Alasan wajib diisi." });
  const db = await getDb();
  const rows = await db
    .select({ j: s.tugasKhususJadwal, pemberiId: s.tugasKhusus.dibuatOleh, koordinatorId: s.penugasan.koordinatorId, pemilikId: s.penugasan.pegawaiId })
    .from(s.tugasKhususJadwal)
    .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
    .innerJoin(s.penugasan, eq(s.penugasan.id, s.tugasKhusus.penugasanId))
    .where(inArray(s.tugasKhususJadwal.id, ids));
  // Seperti item: verifikasi masih boleh sampai IKP sementara dikunci.
  const status = await statusPeriode([...new Set(rows.map((r) => r.j.periodeId))]);
  const dikunci = (id: string) => status(id) === "sementara" || status(id) === "disahkan";

  let n = 0;
  const dilewati: string[] = [];
  for (const r of rows) {
    if (r.pemilikId === sesi.pegawaiId) {
      dilewati.push("Tidak bisa memverifikasi tugas sendiri.");
      continue;
    }
    if (r.pemberiId !== sesi.pegawaiId && r.koordinatorId !== sesi.pegawaiId) {
      dilewati.push("Hanya pemberi tugas yang bisa memverifikasi.");
      continue;
    }
    if (r.j.status !== "diajukan") continue;
    if (dikunci(r.j.periodeId)) {
      dilewati.push("Periode sudah dikunci.");
      continue;
    }
    const sesudah =
      keputusan === "setuju"
        ? { status: "disetujui" as const, verifikatorId: sesi.pegawaiId, diverifikasiPada: new Date(), alasanTolak: null }
        : { status: "ditolak" as const, verifikatorId: sesi.pegawaiId, diverifikasiPada: new Date(), alasanTolak: alasan!.trim(), persen: Math.min(r.j.persen, 99) };
    await db.update(s.tugasKhususJadwal).set(sesudah).where(eq(s.tugasKhususJadwal.id, r.j.id));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: keputusan === "setuju" ? "setujui" : "tolak", entitas: "tugas_khusus_jadwal", entitasId: r.j.id, sebelum: { status: r.j.status }, sesudah, alasan: alasan?.trim() || null });
    n++;
  }
  refresh();
  if (!n) return gagal(dilewati[0] ?? "Tidak ada tugas yang bisa diproses.");
  const kata = keputusan === "setuju" ? "disetujui" : "ditolak";
  return berhasil(dilewati.length ? `${n} tugas ${kata}; ${dilewati.length} dilewati.` : `${n} tugas ${kata}.`);
}

// ── Staf ──────────────────────────────────────────────────────────────────────

const skemaProgres = z.discriminatedUnion("status", [
  z.object({ status: z.literal("dikerjakan"), persen: z.coerce.number<string | number>().int("Persentase harus bilangan bulat.").min(1, "Isi persentase 1–99.").max(99, "Isi persentase 1–99."), catatan: z.string().trim().max(500).optional(), linkBukti: link.optional() }),
  z.object({ status: z.literal("selesai"), catatan: z.string().trim().max(500).optional(), linkBukti: link.optional() }),
]);

/** Staf memperbarui satu jadwal: sementara dikerjakan (wajib persentase) atau selesai (diajukan ke pemberi tugas). */
export async function perbaruiTugas(jadwalId: string, input: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaProgres.safeParse(input);
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const [r] = await db
    .select({ j: s.tugasKhususJadwal, penugasanId: s.tugasKhusus.penugasanId })
    .from(s.tugasKhususJadwal)
    .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
    .where(eq(s.tugasKhususJadwal.id, jadwalId));
  if (!r || !sesi.penugasan.some((x) => x.id === r.penugasanId)) return gagal("Tugas tidak ditemukan.");
  if (r.j.status === "disetujui") return gagal("Tugas ini sudah disetujui.");
  if (r.j.status === "diajukan") return gagal("Tugas ini sedang menunggu verifikasi pemberi tugas.");
  if (!periodeTerbuka((await statusPeriode([r.j.periodeId]))(r.j.periodeId))) return gagal("Periode tugas ini sudah dikunci.");

  const x = p.data;
  const umum = { catatan: x.catatan || null, linkBukti: x.linkBukti || null, diubahPada: new Date(), alasanTolak: null };
  const sesudah =
    x.status === "dikerjakan"
      ? { ...umum, status: "dikerjakan" as const, persen: x.persen, selesaiPada: null }
      : { ...umum, status: "diajukan" as const, persen: 100, selesaiPada: new Date() };
  await db.update(s.tugasKhususJadwal).set(sesudah).where(and(eq(s.tugasKhususJadwal.id, jadwalId), ne(s.tugasKhususJadwal.status, "disetujui")));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: x.status === "selesai" ? "ajukan" : "progres", entitas: "tugas_khusus_jadwal", entitasId: jadwalId, sebelum: { status: r.j.status, persen: r.j.persen }, sesudah });
  refresh();
  return berhasil(x.status === "selesai" ? "Ditandai selesai. Menunggu verifikasi pemberi tugas." : `Progres ${x.persen}% tersimpan.`);
}

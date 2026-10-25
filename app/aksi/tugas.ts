"use server";

// Tugas khusus: koordinator penugasan memberi tugas ber-tenggat; staf memperbarui progres;
// pemberi tugas memverifikasi yang ditandai selesai. Staf Khusus juga bisa mengusulkan tugas; usulan yang
// disetujui atasannya otomatis menjadi tugas khusus.

import { and, eq, inArray, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { periodeTerbuka } from "@/lib/data/batas";
import { kondisiPenugasanBerlaku, liburPerKantor } from "@/lib/data/ikp";
import { getDb, schema as s, type Db } from "@/lib/db";
import { FREKUENSI_TUGAS, type FrekuensiTugas } from "@/lib/ikp/tipe";
import { MAKS_JADWAL, MAKS_USULAN, pecahDaftarJudul, tanggalJadwal } from "@/lib/ikp/tugas";
import { wajibSesi } from "@/lib/sesi";
import { hariIni, keUtc, periodeDari, tambahHari, type Kantor } from "@/lib/waktu";

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

const isianTugas = {
  uraian: z.string().trim().max(1000).optional(),
  frekuensi: z.enum(FREKUENSI_TUGAS, "Pilih frekuensi."),
  tanggalMulai: tanggal,
  tanggalAkhir: z.string().optional(),
  jamTenggat: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Isi jam tenggat."),
};
const judulTugas = z.string().trim().min(3, "Isi judul tugas.").max(200);

/** Tugas berulang wajib punya tanggal berakhir yang tidak mendahului tanggal mulai. */
const denganRentang = <T extends z.ZodType<{ frekuensi: FrekuensiTugas; tanggalMulai: string; tanggalAkhir?: string }>>(skema: T) =>
  skema
    .refine((x) => x.frekuensi === "sekali" || /^\d{4}-\d{2}-\d{2}$/.test(x.tanggalAkhir ?? ""), { path: ["tanggalAkhir"], message: "Isi tanggal berakhir untuk tugas berulang." })
    .refine((x) => x.frekuensi === "sekali" || x.tanggalAkhir! >= x.tanggalMulai, { path: ["tanggalAkhir"], message: "Tanggal berakhir tidak boleh sebelum tanggal mulai." });

const skemaTugas = denganRentang(z.object({ penugasanId: z.string().min(1, "Pilih staf."), judul: judulTugas, ...isianTugas }));

type RencanaTugas = { judul: string; uraian?: string | null; frekuensi: FrekuensiTugas; tanggalMulai: string; tanggalAkhir?: string; jamTenggat: string };

/** Tanggal-tanggal jadwal yang sah untuk rencana tugas, atau galat per field. */
async function rencanaJadwal(db: Db, kantor: Kantor, x: Omit<RencanaTugas, "judul" | "uraian" | "jamTenggat">): Promise<{ daftar: string[] } | Extract<HasilAksi, { ok: false }>> {
  if (x.tanggalMulai < hariIni(kantor)) return { ok: false, pesan: "Periksa tanggal.", galat: { tanggalMulai: "Tanggal tidak boleh di masa lalu." } };
  const akhir = x.frekuensi === "sekali" ? x.tanggalMulai : x.tanggalAkhir!;
  const daftar = tanggalJadwal(x.frekuensi, x.tanggalMulai, akhir, (await liburPerKantor(db))(kantor));
  if (!daftar.length) return { ok: false, pesan: "Periksa tanggal.", galat: { tanggalAkhir: "Tidak ada hari kerja dalam rentang ini." } };
  if (daftar.length > MAKS_JADWAL) return { ok: false, pesan: "Periksa tanggal.", galat: { tanggalAkhir: `Rentang terlalu panjang (maks. ${MAKS_JADWAL} jadwal). Buat ulang untuk periode berikutnya.` } };
  const status = await statusPeriode([...new Set(daftar.map(periodeDari))]);
  if (!daftar.every((d) => periodeTerbuka(status(periodeDari(d))))) return { ok: false, pesan: "Periode tugas itu sudah dikunci." };
  return { daftar };
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Simpan tugas khusus beserta jadwalnya. `oleh` menjadi pemberi tugas (verifikator jadwal). */
async function simpanTugas(db: Db | Tx, penugasanId: string, kantor: Kantor, x: RencanaTugas, daftar: string[], oleh: string) {
  const [t] = await db
    .insert(s.tugasKhusus)
    .values({ penugasanId, judul: x.judul, uraian: x.uraian || null, frekuensi: x.frekuensi, tanggalMulai: x.tanggalMulai, tanggalAkhir: x.frekuensi === "sekali" ? x.tanggalMulai : x.tanggalAkhir!, jamTenggat: x.jamTenggat, dibuatOleh: oleh })
    .returning();
  await db.insert(s.tugasKhususJadwal).values(daftar.map((d) => ({ tugasId: t.id, periodeId: periodeDari(d), tenggat: keUtc(d, kantor, x.jamTenggat) })));
  await catatAudit(db, { aktorId: oleh, aksi: "buat", entitas: "tugas_khusus", entitasId: t.id, sesudah: { ...t, jadwal: daftar.length } });
  return t;
}

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
  const r = await rencanaJadwal(db, kantor, x);
  if (!("daftar" in r)) return r;
  await simpanTugas(db, pn.pn.id, kantor, x, r.daftar, sesi.pegawaiId);
  refresh();
  return berhasil(r.daftar.length > 1 ? `Tugas tersimpan dengan ${r.daftar.length} jadwal.` : "Tugas tersimpan.");
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

// ── Usulan tugas (Staf Khusus) ────────────────────────────────────────────────

const skemaUsulan = denganRentang(
  z.object({ penugasanId: z.string().min(1), cara: z.enum(["satu", "banyak"]), judul: z.string().optional(), daftarJudul: z.string().optional(), ...isianTugas }),
);

/** Staf Khusus mengusulkan satu tugas, atau banyak tugas sekaligus dengan frekuensi dan tenggat yang sama. */
export async function ajukanUsulanTugas(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaUsulan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian usulan.", galatDari(p.error));
  const x = p.data;
  const pn = sesi.penugasan.find((q) => q.id === x.penugasanId && q.peranKerja === "SK");
  if (!pn) return gagal("Usulan tugas hanya untuk amanah Staf Khusus.");
  if (!pn.koordinatorId || pn.koordinatorId === sesi.pegawaiId) return gagal("Amanah ini belum punya atasan yang bisa menyetujui usulan. Hubungi Admin.");

  const kolom = x.cara === "satu" ? "judul" : "daftarJudul";
  const daftarJudul = x.cara === "satu" ? [x.judul?.trim() ?? ""].filter(Boolean) : pecahDaftarJudul(x.daftarJudul ?? "");
  if (!daftarJudul.length) return gagal("Periksa isian usulan.", { [kolom]: x.cara === "satu" ? "Isi judul tugas." : "Tulis minimal satu tugas, satu per baris." });
  if (daftarJudul.length > MAKS_USULAN) return gagal("Periksa isian usulan.", { [kolom]: `Maksimal ${MAKS_USULAN} tugas sekali kirim.` });
  for (const j of daftarJudul) {
    const cek = judulTugas.safeParse(j);
    if (!cek.success) return gagal("Periksa isian usulan.", { [kolom]: x.cara === "satu" ? cek.error.issues[0].message : `“${j}”: judul harus 3–200 karakter.` });
  }

  const db = await getDb();
  const r = await rencanaJadwal(db, sesi.kantor, x);
  if (!("daftar" in r)) return r;
  const kelompok = crypto.randomUUID();
  const rows = await db
    .insert(s.usulanTugas)
    .values(
      daftarJudul.map((judul) => ({
        penugasanId: pn.id,
        kelompok,
        judul,
        uraian: x.cara === "satu" ? x.uraian || null : null,
        frekuensi: x.frekuensi,
        tanggalMulai: x.tanggalMulai,
        tanggalAkhir: x.frekuensi === "sekali" ? x.tanggalMulai : x.tanggalAkhir!,
        jamTenggat: x.jamTenggat,
      })),
    )
    .returning({ id: s.usulanTugas.id });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ajukan", entitas: "usulan_tugas", entitasId: kelompok, sesudah: { judul: daftarJudul, frekuensi: x.frekuensi, jumlah: rows.length } });
  refresh();
  return berhasil(rows.length > 1 ? `${rows.length} usulan tugas terkirim ke atasan.` : "Usulan tugas terkirim ke atasan.");
}

/** Staf menarik usulan yang belum diputuskan. */
export async function batalkanUsulan(usulanId: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [u] = await db.select().from(s.usulanTugas).where(eq(s.usulanTugas.id, usulanId));
  if (!u || !sesi.penugasan.some((p) => p.id === u.penugasanId)) return gagal("Usulan tidak ditemukan.");
  if (u.status !== "diajukan") return gagal("Usulan ini sudah diputuskan atasan.");
  await db.delete(s.usulanTugas).where(and(eq(s.usulanTugas.id, usulanId), eq(s.usulanTugas.status, "diajukan")));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "batal", entitas: "usulan_tugas", entitasId: usulanId, sebelum: u });
  refresh();
  return berhasil("Usulan dibatalkan.");
}

/**
 * Atasan (koordinator penugasan) menyetujui atau menolak usulan. Yang disetujui langsung menjadi tugas khusus
 * dengan atasan sebagai pemberi tugas. Usulan berulang yang mulainya sudah lewat dijadwalkan sejak hari ini.
 */
export async function putuskanUsulan(ids: string[], keputusan: "setuju" | "tolak", alasan?: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!ids.length) return gagal("Pilih usulan terlebih dahulu.");
  if (keputusan === "tolak" && !alasan?.trim()) return gagal("Tulis alasan penolakan.", { alasan: "Alasan wajib diisi." });
  const db = await getDb();
  const rows = await db
    .select({ u: s.usulanTugas, pn: s.penugasan, kantor: s.pegawai.kantor })
    .from(s.usulanTugas)
    .innerJoin(s.penugasan, eq(s.penugasan.id, s.usulanTugas.penugasanId))
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .where(inArray(s.usulanTugas.id, ids));

  let n = 0;
  const dilewati: string[] = [];
  for (const { u, pn, kantor } of rows) {
    if (pn.pegawaiId === sesi.pegawaiId) {
      dilewati.push("Tidak bisa memutuskan usulan sendiri.");
      continue;
    }
    if (pn.koordinatorId !== sesi.pegawaiId) {
      dilewati.push("Hanya atasan Staf Khusus ini yang bisa memutuskan usulannya.");
      continue;
    }
    if (u.status !== "diajukan") continue;
    const putusan = { diputusOleh: sesi.pegawaiId, diputusPada: new Date() };

    if (keputusan === "tolak") {
      const sesudah = { ...putusan, status: "ditolak" as const, alasanTolak: alasan!.trim() };
      await db.update(s.usulanTugas).set(sesudah).where(and(eq(s.usulanTugas.id, u.id), eq(s.usulanTugas.status, "diajukan")));
      await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "tolak", entitas: "usulan_tugas", entitasId: u.id, sebelum: { status: u.status }, sesudah, alasan: alasan!.trim() });
      n++;
      continue;
    }

    const k = kantor as Kantor;
    let mulai = u.tanggalMulai;
    while (u.frekuensi !== "sekali" && mulai < hariIni(k)) mulai = tambahHari(mulai, u.frekuensi === "harian" ? 1 : 7);
    const rencana = { ...u, tanggalMulai: mulai };
    const r = await rencanaJadwal(db, k, rencana);
    if (!("daftar" in r)) {
      dilewati.push(`“${u.judul}”: ${Object.values(r.galat ?? {})[0] ?? r.pesan}`);
      continue;
    }
    const jadi = await db.transaction(async (tx) => {
      // Kunci status lebih dulu supaya persetujuan ganda tidak membuat tugas dua kali.
      const [kunci] = await tx
        .update(s.usulanTugas)
        .set({ ...putusan, status: "disetujui", alasanTolak: null })
        .where(and(eq(s.usulanTugas.id, u.id), eq(s.usulanTugas.status, "diajukan")))
        .returning({ id: s.usulanTugas.id });
      if (!kunci) return false;
      const t = await simpanTugas(tx, pn.id, k, rencana, r.daftar, sesi.pegawaiId);
      await tx.update(s.usulanTugas).set({ tugasId: t.id }).where(eq(s.usulanTugas.id, u.id));
      await catatAudit(tx, { aktorId: sesi.pegawaiId, aksi: "setujui", entitas: "usulan_tugas", entitasId: u.id, sebelum: { status: u.status }, sesudah: { status: "disetujui", tugasId: t.id } });
      return true;
    });
    if (jadi) n++;
  }
  refresh();
  if (!n) return gagal(dilewati[0] ?? "Tidak ada usulan yang bisa diproses.");
  const kata = keputusan === "setuju" ? "disetujui dan masuk daftar tugas staf" : "ditolak";
  return berhasil(dilewati.length ? `${n} usulan ${kata}; ${dilewati.length} dilewati (${dilewati[0]}).` : `${n} usulan ${kata}.`);
}

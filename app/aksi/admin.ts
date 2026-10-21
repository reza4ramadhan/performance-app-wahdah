"use server";

import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { buatAkun, resetPassword } from "@/lib/auth";
import { getDb, schema as s } from "@/lib/db";
import { PERAN_KERJA, PERAN_SISTEM } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const nomor = (x: string) => x.trim().replace(/[\s.-]/g, "").replace(/^\+62/, "0");
const opsional = z.string().trim().optional().transform((v) => (v ? v : undefined));

/** Password sementara yang mudah dibacakan: 3 kata acak + 2 angka. */
function passwordSementara() {
  const kata = ["amanah", "ikhlas", "sabar", "tekun", "jujur", "rapi", "sigap", "teliti", "ramah", "tegas"];
  return `${kata[randomInt(kata.length)]}-${kata[randomInt(kata.length)]}-${randomInt(10, 99)}`;
}

// ── Pegawai & akun ────────────────────────────────────────────────────────────

const skemaPegawai = z.object({
  nama: z.string().trim().min(3, "Isi nama lengkap."),
  nip: opsional,
  noHp: opsional,
  statusKepegawaian: z.enum(["Mutafarrigh", "Muta'awin", "Kontrak"]),
  kantor: z.enum(["makassar", "jakarta"]),
});

export async function tambahPegawai(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPegawai.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const nip = p.data.nip ? nomor(p.data.nip) : undefined;
  const noHp = p.data.noHp ? nomor(p.data.noHp) : undefined;
  if (!nip && !noHp) return gagal("Isi NIP atau No. HP untuk login.", { nip: "Isi NIP atau No. HP." });
  const peran = fd.getAll("peran").map(String).filter((x): x is (typeof PERAN_SISTEM)[number] => (PERAN_SISTEM as readonly string[]).includes(x) && x !== "pegawai");

  const db = await getDb();
  const bentrok = await db.select({ id: s.pegawai.id }).from(s.pegawai).where(nip ? eq(s.pegawai.nip, nip) : eq(s.pegawai.noHp, noHp!));
  if (bentrok.length) return gagal("NIP/No. HP sudah dipakai pegawai lain.");
  const [pg] = await db.insert(s.pegawai).values({ ...p.data, nip: nip ?? null, noHp: noHp ?? null }).returning();
  if (peran.length) await db.insert(s.peranSistem).values(peran.map((x) => ({ pegawaiId: pg.id, peran: x })));
  const pw = passwordSementara();
  await buatAkun({ pegawaiId: pg.id, nama: pg.nama, username: (nip ?? noHp)!, password: pw });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "pegawai", entitasId: pg.id, sesudah: { ...pg, peran } });
  refresh();
  return berhasil(`Akun dibuat. Login: ${nip ?? noHp} · password sementara: ${pw}`);
}

export async function ubahPegawai(id: string, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPegawai.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const [lama] = await db.select().from(s.pegawai).where(eq(s.pegawai.id, id));
  if (!lama) return gagal("Pegawai tidak ditemukan.");
  const peran = fd.getAll("peran").map(String).filter((x): x is (typeof PERAN_SISTEM)[number] => (PERAN_SISTEM as readonly string[]).includes(x) && x !== "pegawai");
  if (id === sesi.pegawaiId && !peran.includes("admin")) return gagal("Anda tidak bisa mencabut peran Admin milik sendiri.");
  const aktif = fd.get("aktif") === "on";
  const [baru] = await db
    .update(s.pegawai)
    .set({ ...p.data, nip: p.data.nip ? nomor(p.data.nip) : null, noHp: p.data.noHp ? nomor(p.data.noHp) : null, aktif })
    .where(eq(s.pegawai.id, id))
    .returning();
  await db.delete(s.peranSistem).where(eq(s.peranSistem.pegawaiId, id));
  if (peran.length) await db.insert(s.peranSistem).values(peran.map((x) => ({ pegawaiId: id, peran: x })));
  if (!aktif && lama.aktif) {
    const akun = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.pegawaiId, id));
    for (const a of akun) await db.delete(s.session).where(eq(s.session.userId, a.id));
  }
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ubah", entitas: "pegawai", entitasId: id, sebelum: lama, sesudah: { ...baru, peran } });
  refresh();
  return berhasil("Data pegawai tersimpan.");
}

export async function resetPasswordPegawai(pegawaiId: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const [akun] = await db.select({ id: s.user.id, username: s.user.displayUsername }).from(s.user).where(eq(s.user.pegawaiId, pegawaiId));
  if (!akun) return gagal("Pegawai ini belum punya akun.");
  const pw = passwordSementara();
  await resetPassword(akun.id, pw);
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "reset-password", entitas: "akun", entitasId: akun.id });
  return berhasil(`Password sementara untuk ${akun.username}: ${pw} (wajib diganti saat login).`);
}

const skemaBuka = z.object({
  dariTanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal."),
  hari: z.coerce.number().int().min(1).max(14),
  alasan: z.string().trim().min(5, "Alasan wajib dicatat."),
});

/** Buka kunci jendela edit 2 hari kerja untuk satu pegawai (tercatat di audit log). */
export async function bukaKunciEdit(pegawaiId: string, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaBuka.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const berlakuSampai = new Date(Date.now() + p.data.hari * 86_400_000);
  const [b] = await db.insert(s.bukaKunci).values({ pegawaiId, dariTanggal: p.data.dariTanggal, berlakuSampai, alasan: p.data.alasan, olehId: sesi.pegawaiId }).returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buka-kunci", entitas: "pegawai", entitasId: pegawaiId, sesudah: b, alasan: p.data.alasan });
  refresh();
  return berhasil(`Pegawai bisa mengisi sejak ${p.data.dariTanggal} selama ${p.data.hari} hari.`);
}

// ── Unit ──────────────────────────────────────────────────────────────────────

const skemaUnit = z.object({
  jenis: z.enum(["kantor", "bidang", "skuo", "unit_pendukung", "staf_khusus"]),
  nama: z.string().trim().min(2, "Isi nama unit."),
  indukId: opsional,
  wakaId: opsional,
});

export async function simpanUnit(id: string | null, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaUnit.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const nilai = { ...p.data, indukId: p.data.indukId ?? null, wakaId: p.data.wakaId ?? null };
  const [u] = id ? await db.update(s.unit).set(nilai).where(eq(s.unit.id, id)).returning() : await db.insert(s.unit).values(nilai).returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: id ? "ubah" : "buat", entitas: "unit", entitasId: u.id, sesudah: u });
  refresh();
  return berhasil(id ? "Unit diperbarui." : "Unit ditambahkan.");
}

// ── Penugasan ─────────────────────────────────────────────────────────────────

const periode = z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM.");
const skemaPenugasan = z.object({
  pegawaiId: z.string().min(1, "Pilih pegawai."),
  peranKerja: z.enum(PERAN_KERJA),
  unitId: z.string().min(1, "Pilih unit."),
  koordinatorId: opsional,
  periodeMulai: periode,
  periodeSelesai: z.union([periode, z.literal("")]).optional(),
  bobotAlokasi: z.union([z.literal(""), z.coerce.number().min(1).max(100)]).optional(),
});

export async function tambahPenugasan(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPenugasan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  if (p.data.koordinatorId && p.data.koordinatorId === p.data.pegawaiId) return gagal("Koordinator tidak boleh pegawai itu sendiri.", { koordinatorId: "Pilih koordinator lain." });
  const db = await getDb();
  const [pn] = await db
    .insert(s.penugasan)
    .values({
      pegawaiId: p.data.pegawaiId,
      peranKerja: p.data.peranKerja,
      unitId: p.data.unitId,
      koordinatorId: p.data.koordinatorId ?? null,
      periodeMulai: p.data.periodeMulai,
      periodeSelesai: p.data.periodeSelesai || null,
      bobotAlokasi: typeof p.data.bobotAlokasi === "number" ? p.data.bobotAlokasi : null,
    })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "penugasan", entitasId: pn.id, sesudah: pn });
  refresh();
  return berhasil("Penugasan ditambahkan.");
}

/** Akhiri penugasan pada periode tertentu (riwayat tetap utuh). */
export async function akhiriPenugasan(id: string, periodeSelesai: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  if (!/^\d{4}-\d{2}$/.test(periodeSelesai)) return gagal("Periode tidak valid.");
  const db = await getDb();
  const [lama] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, id));
  if (!lama) return gagal("Penugasan tidak ditemukan.");
  await db.update(s.penugasan).set({ periodeSelesai }).where(eq(s.penugasan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "akhiri", entitas: "penugasan", entitasId: id, sebelum: lama, sesudah: { periodeSelesai } });
  refresh();
  return berhasil("Penugasan diakhiri.");
}

export async function ubahKoordinator(id: string, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const koordinatorId = String(fd.get("koordinatorId") || "") || null;
  const bobot = String(fd.get("bobotAlokasi") || "");
  const db = await getDb();
  const [lama] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, id));
  if (!lama) return gagal("Penugasan tidak ditemukan.");
  if (koordinatorId === lama.pegawaiId) return gagal("Koordinator tidak boleh pegawai itu sendiri.");
  await db.update(s.penugasan).set({ koordinatorId, bobotAlokasi: bobot ? Number(bobot) : null }).where(eq(s.penugasan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ubah", entitas: "penugasan", entitasId: id, sebelum: lama, sesudah: { koordinatorId, bobot } });
  refresh();
  return berhasil("Penugasan diperbarui.");
}

// ── Indikator, hari libur, periode ────────────────────────────────────────────

const skemaIndikator = z.object({
  standar: z.coerce.number().min(1, "1–100").max(100, "1–100"),
  tenggat: z.union([z.literal(""), z.coerce.number().int().min(0).max(500)]).optional(),
  verifikator: z.enum(["koordinator", "keuangan", "sekretariat"]),
});

export async function ubahIndikator(kode: string, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaIndikator.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const [lama] = await db.select().from(s.indikator).where(eq(s.indikator.kode, kode));
  if (!lama) return gagal("Indikator tidak ditemukan.");
  const nilai = { standarCapaian: p.data.standar / 100, tenggat: typeof p.data.tenggat === "number" ? p.data.tenggat : null, verifikatorPeran: p.data.verifikator, aktif: fd.get("aktif") === "on" };
  await db.update(s.indikator).set(nilai).where(eq(s.indikator.kode, kode));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ubah", entitas: "indikator", entitasId: kode, sebelum: lama, sesudah: nilai });
  refresh();
  return berhasil(`${kode} diperbarui.`);
}

export async function tambahLibur(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = z
    .object({ tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal."), keterangan: z.string().trim().min(3, "Isi keterangan."), kantor: z.enum(["", "makassar", "jakarta"]) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  await db.insert(s.hariLibur).values({ tanggal: p.data.tanggal, keterangan: p.data.keterangan, kantor: p.data.kantor || null }).onConflictDoNothing();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "hari_libur", entitasId: p.data.tanggal, sesudah: p.data });
  refresh();
  return berhasil("Hari libur ditambahkan.");
}

export async function hapusLibur(tanggal: string, kantor: string | null): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const semua = await db.select().from(s.hariLibur).where(eq(s.hariLibur.tanggal, tanggal));
  const target = semua.find((h) => (h.kantor ?? null) === kantor);
  if (!target) return gagal("Hari libur tidak ditemukan.");
  await db.delete(s.hariLibur).where(and(eq(s.hariLibur.tanggal, tanggal), kantor ? eq(s.hariLibur.kantor, kantor as "makassar" | "jakarta") : isNull(s.hariLibur.kantor)));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "hari_libur", entitasId: tanggal, sebelum: target });
  refresh();
  return berhasil("Hari libur dihapus.");
}

export async function buatPeriode(id: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  if (!/^\d{4}-\d{2}$/.test(id)) return gagal("Periode tidak valid.");
  const db = await getDb();
  const [p] = await db.insert(s.periode).values({ id }).onConflictDoNothing().returning();
  if (!p) return gagal("Periode sudah ada.");
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "periode", entitasId: id });
  refresh();
  return berhasil("Periode dibuat.");
}

/** Versi form untuk FormAksi (pesan password sementara tetap tampil). */
export async function resetPasswordForm(pegawaiId: string): Promise<HasilAksi> {
  return resetPasswordPegawai(pegawaiId);
}

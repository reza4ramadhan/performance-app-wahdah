"use server";

import { randomInt } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { buatAkun, resetPassword } from "@/lib/auth";
import { getDb, schema as s, type Db } from "@/lib/db";
import { kondisiPenugasanBerlaku } from "@/lib/data/ikp";
import { petaBidang, petaWaka } from "@/lib/data/unit";
import { PERAN_KERJA, PERAN_MANUAL, STATUS_KEPEGAWAIAN, type PeranManual } from "@/lib/ikp/tipe";
import { wajibPeran } from "@/lib/sesi";
import { hariIni, periodeDari } from "@/lib/waktu";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const nomor = (x: string) => x.trim().replace(/[\s.-]/g, "").replace(/^\+62/, "0");
const opsional = z.string().trim().optional().transform((v) => (v ? v : undefined));

/** Password sementara yang mudah dibacakan: 3 kata acak + 2 angka. */
function passwordSementara() {
  const kata = ["amanah", "ikhlas", "sabar", "tekun", "jujur", "rapi", "sigap", "teliti", "ramah", "tegas"];
  return `${kata[randomInt(kata.length)]}-${kata[randomInt(kata.length)]}-${randomInt(10, 99)}`;
}

// ── Pegawai & akun ────────────────────────────────────────────────────────────

/** Hanya peran fungsi; peran koordinator/WaKa/Kepala Kantor diturunkan dari penugasan. */
const peranDari = (fd: FormData) => fd.getAll("peran").map(String).filter((x): x is PeranManual => (PERAN_MANUAL as readonly string[]).includes(x));

const skemaPegawai = z.object({
  nama: z.string().trim().min(3, "Isi nama lengkap."),
  nip: opsional,
  noHp: opsional,
  statusKepegawaian: z.enum(STATUS_KEPEGAWAIAN),
  kantor: z.enum(["makassar", "jakarta"]),
});

export async function tambahPegawai(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPegawai.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const nip = p.data.nip ? nomor(p.data.nip) : undefined;
  const noHp = p.data.noHp ? nomor(p.data.noHp) : undefined;
  if (!nip && !noHp) return gagal("Isi NIP atau No. HP untuk login.", { nip: "Isi NIP atau No. HP." });
  const peran = peranDari(fd);

  const db = await getDb();
  const bentrok = await db.select({ id: s.pegawai.id }).from(s.pegawai).where(nip ? eq(s.pegawai.nip, nip) : eq(s.pegawai.noHp, noHp!));
  if (bentrok.length) return gagal("NIP/No. HP sudah dipakai pegawai lain.");
  const login = (nip ?? noHp)!;
  if (await loginTerpakai(db, login)) return gagal(`Login ${login} sudah dipakai akun lain.`);
  const [pg] = await db.insert(s.pegawai).values({ ...p.data, nip: nip ?? null, noHp: noHp ?? null }).returning();
  if (peran.length) await db.insert(s.peranSistem).values(peran.map((x) => ({ pegawaiId: pg.id, peran: x })));
  const pw = passwordSementara();
  try {
    await buatAkun({ pegawaiId: pg.id, nama: pg.nama, username: login, password: pw });
  } catch (e) {
    // Jangan tinggalkan pegawai tanpa akun; peran ikut terhapus (cascade).
    await db.delete(s.pegawai).where(eq(s.pegawai.id, pg.id));
    console.error("Gagal membuat akun pegawai baru", e);
    return gagal("Gagal membuat akun login. Pegawai tidak disimpan, coba lagi.");
  }
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "pegawai", entitasId: pg.id, sesudah: { ...pg, peran } });
  refresh();
  return berhasil(`Akun dibuat. Login: ${login} · password sementara: ${pw}`);
}

/** Username Better Auth disimpan huruf kecil dan unik. */
async function loginTerpakai(db: Db, login: string) {
  const ada = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.username, login.toLowerCase()));
  return ada.length > 0;
}

/** Buat akun untuk pegawai yang belum punya (mis. pembuatan akun dulu gagal). Username = NIP, atau No. HP. */
export async function buatAkunPegawai(pegawaiId: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const [pg] = await db.select().from(s.pegawai).where(eq(s.pegawai.id, pegawaiId));
  if (!pg) return gagal("Pegawai tidak ditemukan.");
  const sudah = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.pegawaiId, pegawaiId));
  if (sudah.length) return gagal("Pegawai ini sudah punya akun.");
  const login = pg.nip ?? pg.noHp;
  if (!login) return gagal("Isi NIP atau No. HP lalu simpan dulu.");
  if (await loginTerpakai(db, login)) return gagal(`Login ${login} sudah dipakai akun lain.`);
  const pw = passwordSementara();
  const akun = await buatAkun({ pegawaiId: pg.id, nama: pg.nama, username: login, password: pw });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat-akun", entitas: "akun", entitasId: akun.id });
  refresh();
  return berhasil(`Akun dibuat. Login: ${login} · password sementara: ${pw} (wajib diganti saat login).`);
}

export async function ubahPegawai(id: string, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPegawai.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const [lama] = await db.select().from(s.pegawai).where(eq(s.pegawai.id, id));
  if (!lama) return gagal("Pegawai tidak ditemukan.");
  const peran = peranDari(fd);
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
  if (p.data.jenis === "skuo") {
    const [induk] = p.data.indukId ? await db.select({ jenis: s.unit.jenis }).from(s.unit).where(eq(s.unit.id, p.data.indukId)) : [];
    if (induk?.jenis !== "bidang") return gagal("Periksa isian.", { indukId: "SKUO harus berada di bawah sebuah bidang." });
  }
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
  unitId: opsional,
  koordinatorId: opsional,
  periodeMulai: periode,
  periodeSelesai: z.union([periode, z.literal("")]).optional(),
  bobotAlokasi: z.union([z.literal(""), z.coerce.number().min(1).max(100)]).optional(),
});

/** Unit berjenis Kantor (puncak struktur); dibuat bila belum ada. */
async function unitKantor(db: Db, aktorId: string) {
  const [ada] = await db.select({ id: s.unit.id }).from(s.unit).where(eq(s.unit.jenis, "kantor")).limit(1);
  if (ada) return ada.id;
  const [u] = await db.insert(s.unit).values({ jenis: "kantor", nama: "Kantor Pusat" }).returning();
  await catatAudit(db, { aktorId, aksi: "buat", entitas: "unit", entitasId: u.id, sesudah: u });
  return u.id;
}

/** KSBK yang berlaku di bidang induk unit ini pada periode itu. */
async function ksbkBidang(db: Db, unitId: string, periode: string) {
  const bidangId = (await petaBidang(db)).get(unitId);
  if (!bidangId) return [];
  const rows = await db
    .select({ pegawaiId: s.penugasan.pegawaiId })
    .from(s.penugasan)
    .where(and(eq(s.penugasan.unitId, bidangId), eq(s.penugasan.peranKerja, "KSBK"), kondisiPenugasanBerlaku(periode)));
  return rows.map((r) => r.pegawaiId);
}

/** Koordinator bawaan bila Admin tidak memilih: SBK → KSBK bidang induknya; KSBK/KU → WaKa unitnya. */
async function koordinatorBawaan(db: Db, pn: { peranKerja: string; unitId: string; periode: string }) {
  if (pn.peranKerja === "SBK") return (await ksbkBidang(db, pn.unitId, pn.periode))[0] ?? null;
  if (pn.peranKerja === "KSBK" || pn.peranKerja === "KU") return (await petaWaka(db)).get(pn.unitId) ?? null;
  return null;
}

/** Koordinator = pegawai itu sendiri hanya untuk rangkap jabatan: SBK yang juga KSBK bidang tersebut. */
async function cekKoordinatorSendiri(db: Db, pn: { pegawaiId: string; peranKerja: string; unitId: string; periode: string }) {
  if (pn.peranKerja === "SBK" && (await ksbkBidang(db, pn.unitId, pn.periode)).includes(pn.pegawaiId)) return null;
  return "Koordinator hanya boleh pegawai itu sendiri bila ia SBK yang juga KSBK bidang tersebut (rangkap jabatan).";
}

export async function tambahPenugasan(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPenugasan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  // Kepala Kantor dan WaKa membawahi seluruh kantor: unitnya selalu unit berjenis Kantor.
  const unitId = p.data.peranKerja === "KAKAN" || p.data.peranKerja === "WAKA" ? await unitKantor(db, sesi.pegawaiId) : p.data.unitId;
  if (!unitId) return gagal("Periksa isian.", { unitId: "Pilih unit." });
  const dasar = { pegawaiId: p.data.pegawaiId, peranKerja: p.data.peranKerja, unitId, periode: p.data.periodeMulai };
  const koordinatorId = p.data.koordinatorId ?? (await koordinatorBawaan(db, dasar));
  if (koordinatorId === p.data.pegawaiId) {
    const galat = await cekKoordinatorSendiri(db, dasar);
    if (galat) return gagal(galat, { koordinatorId: "Pilih koordinator lain." });
  }
  const [pn] = await db
    .insert(s.penugasan)
    .values({
      pegawaiId: p.data.pegawaiId,
      peranKerja: p.data.peranKerja,
      unitId,
      koordinatorId,
      periodeMulai: p.data.periodeMulai,
      periodeSelesai: p.data.periodeSelesai || null,
      bobotAlokasi: typeof p.data.bobotAlokasi === "number" ? p.data.bobotAlokasi : null,
    })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "penugasan", entitasId: pn.id, sesudah: pn });
  refresh();
  return berhasil(!p.data.koordinatorId && koordinatorId ? "Penugasan ditambahkan; koordinator diisi otomatis." : "Penugasan ditambahkan.");
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

/** Ubah peran, unit, koordinator, masa berlaku, dan bobot satu penugasan (pegawainya tetap). */
export async function ubahPenugasan(id: string, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const p = skemaPenugasan.omit({ pegawaiId: true }).safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  if (p.data.periodeSelesai && p.data.periodeSelesai < p.data.periodeMulai) return gagal("Periksa isian.", { periodeSelesai: "Tidak boleh sebelum Mulai." });
  const db = await getDb();
  const [lama] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, id));
  if (!lama) return gagal("Penugasan tidak ditemukan.");
  const unitId = p.data.peranKerja === "KAKAN" || p.data.peranKerja === "WAKA" ? await unitKantor(db, sesi.pegawaiId) : p.data.unitId;
  if (!unitId) return gagal("Periksa isian.", { unitId: "Pilih unit." });
  const kini = periodeDari(hariIni(sesi.kantor));
  const dasar = { pegawaiId: lama.pegawaiId, peranKerja: p.data.peranKerja, unitId, periode: p.data.periodeMulai > kini ? p.data.periodeMulai : kini };
  const koordinatorId = p.data.koordinatorId ?? (await koordinatorBawaan(db, dasar));
  if (koordinatorId === lama.pegawaiId) {
    const galat = await cekKoordinatorSendiri(db, dasar);
    if (galat) return gagal(galat, { koordinatorId: "Pilih koordinator lain." });
  }
  const baru = {
    peranKerja: p.data.peranKerja,
    unitId,
    koordinatorId,
    periodeMulai: p.data.periodeMulai,
    periodeSelesai: p.data.periodeSelesai || null,
    bobotAlokasi: typeof p.data.bobotAlokasi === "number" ? p.data.bobotAlokasi : null,
  };
  await db.update(s.penugasan).set(baru).where(eq(s.penugasan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ubah", entitas: "penugasan", entitasId: id, sebelum: lama, sesudah: baru });
  refresh();
  return berhasil("Penugasan diperbarui.");
}

/** Hapus penugasan yang salah input. Yang sudah punya item/tugas/usulan harus diakhiri, bukan dihapus (riwayat IKP ikut terhapus). */
export async function hapusPenugasan(id: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("admin");
  const db = await getDb();
  const [lama] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, id));
  if (!lama) return gagal("Penugasan tidak ditemukan.");
  const [[a], [b], [c]] = await Promise.all([
    db.select({ n: count() }).from(s.item).where(eq(s.item.penugasanId, id)),
    db.select({ n: count() }).from(s.tugasKhusus).where(eq(s.tugasKhusus.penugasanId, id)),
    db.select({ n: count() }).from(s.usulanTugas).where(eq(s.usulanTugas.penugasanId, id)),
  ]);
  if (a.n + b.n + c.n > 0) return gagal("Penugasan ini sudah punya item atau tugas. Gunakan “Akhiri” agar riwayatnya tetap utuh.");
  await db.delete(s.penugasan).where(eq(s.penugasan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "penugasan", entitasId: id, sebelum: lama });
  refresh();
  return berhasil("Penugasan dihapus.");
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

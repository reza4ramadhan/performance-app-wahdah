"use server";

// Set Tugas, Atur Tugas Staf, dan usulan tugas rutin (docs/rombak-v2/03 & 05). Perubahan berlaku mulai besok:
// generator hanya menulis ulang jadwal setelah hari ini (lib/data/set-tugas.ts).

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { koordinatorAtauWakil } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s, type Db } from "@/lib/db";
import { kondisiPenugasanBerlaku } from "@/lib/data/ikp";
import { pemakaiSet, regenerasiRutin } from "@/lib/data/set-tugas";
import { seninDari } from "@/lib/set-tugas";
import { wajibSesi, type Sesi } from "@/lib/sesi";
import { hariIni, periodeDari, tambahHari } from "@/lib/waktu";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Isi jam tenggat.");

/** Koordinator (atau wakil) unit ini, atau Admin. */
const pengelola = (sesi: Sesi, unitId: string) => sesi.peran.has("admin") || sesi.penugasan.some((p) => p.peranKerja === "KSBK" && p.unitId === unitId);

async function setMilik(db: Db, sesi: Sesi, setId: string) {
  const [x] = await db.select().from(s.setTugas).where(eq(s.setTugas.id, setId));
  return x && pengelola(sesi, x.unitId) ? x : null;
}

/** Regenerasi untuk semua staf yang memakai set ini; perubahan berlaku besok. */
async function terbitkanUlang(db: Db, setId: string) {
  return regenerasiRutin(db, await pemakaiSet(db, setId));
}

// ── Set Tugas ─────────────────────────────────────────────────────────────────

export async function simpanSetTugas(id: string | null, unitId: string, nama: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const n = nama.trim();
  if (n.length < 3) return gagal("Isi nama set tugas.", { nama: "Minimal 3 huruf." });
  const db = await getDb();
  if (id) {
    const x = await setMilik(db, sesi, id);
    if (!x) return gagal("Set tugas tidak ditemukan.");
    await db.update(s.setTugas).set({ nama: n }).where(eq(s.setTugas.id, id));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ubah", entitas: "set_tugas", entitasId: id, sebelum: { nama: x.nama }, sesudah: { nama: n } });
    refresh();
    return berhasil("Nama set tugas tersimpan.", id);
  }
  if (!pengelola(sesi, unitId)) return gagal("Hanya koordinator unit ini yang bisa membuat set tugas.");
  const [baru] = await db.insert(s.setTugas).values({ unitId, nama: n, dibuatOleh: sesi.pegawaiId }).returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "set_tugas", entitasId: baru.id, sesudah: baru });
  refresh();
  return berhasil("Set tugas dibuat. Tambahkan tugasnya.", baru.id);
}

/** Duplikat: salin set beserta tugas aktifnya, tanpa pemakai. */
export async function duplikatSetTugas(id: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const x = await setMilik(db, sesi, id);
  if (!x) return gagal("Set tugas tidak ditemukan.");
  const [baru] = await db.insert(s.setTugas).values({ unitId: x.unitId, nama: `${x.nama} (salinan)`, gantiHariJam: x.gantiHariJam, dibuatOleh: sesi.pegawaiId }).returning();
  const item = await db.select().from(s.setTugasItem).where(and(eq(s.setTugasItem.setTugasId, id), eq(s.setTugasItem.aktif, true)));
  if (item.length) await db.insert(s.setTugasItem).values(item.map((i) => ({ judul: i.judul, uraian: i.uraian, frekuensi: i.frekuensi, hari: i.hari, jamTenggat: i.jamTenggat, linkWajib: i.linkWajib, urutan: i.urutan, setTugasId: baru.id })));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "duplikat", entitas: "set_tugas", entitasId: baru.id, sebelum: { dari: id } });
  refresh();
  return berhasil("Set tugas diduplikasi.", baru.id);
}

/** Aturan tugas lewat tengah malam: hanya Admin (docs/rombak-v2/05 Keputusan). */
export async function aturGantiHari(id: string, jamGanti: string | null): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!sesi.peran.has("admin")) return gagal("Hanya Admin yang mengatur tugas lewat tengah malam.");
  if (jamGanti && !jam.safeParse(jamGanti).success) return gagal("Format jam HH:MM.");
  const db = await getDb();
  const [x] = await db.select().from(s.setTugas).where(eq(s.setTugas.id, id));
  if (!x) return gagal("Set tugas tidak ditemukan.");
  await db.update(s.setTugas).set({ gantiHariJam: jamGanti || null }).where(eq(s.setTugas.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ganti-hari", entitas: "set_tugas", entitasId: id, sebelum: { gantiHariJam: x.gantiHariJam }, sesudah: { gantiHariJam: jamGanti } });
  await terbitkanUlang(db, id);
  refresh();
  return berhasil(jamGanti ? `Tugas sebelum pukul ${jamGanti} dijadwalkan pada hari berikutnya, mulai besok.` : "Semua tugas dijadwalkan pada hari yang sama, mulai besok.");
}

const skemaItem = z
  .object({
    judul: z.string().trim().min(3, "Isi judul tugas.").max(200),
    uraian: z.string().trim().max(1000).optional(),
    frekuensi: z.enum(["harian", "pekanan"], "Pilih frekuensi."),
    hari: z.coerce.number().int().min(0).max(6).optional(),
    jamTenggat: jam,
    linkWajib: z.literal("on").optional(),
  })
  .refine((x) => x.frekuensi === "harian" || x.hari !== undefined, { path: ["hari"], message: "Pilih hari." });

/**
 * Tambah atau ubah satu tugas dalam set. Ubah = tugas lama dinonaktifkan dan versi baru dibuat, sehingga tugas hari
 * ini yang sudah terbit tidak berubah; mulai besok staf menerima versi baru.
 */
export async function simpanItemSet(setId: string, itemId: string | null, _: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaItem.safeParse(Object.fromEntries([...fd].filter(([, v]) => v !== "")));
  if (!p.success) return gagal("Periksa isian tugas.", galatDari(p.error));
  const db = await getDb();
  const x = await setMilik(db, sesi, setId);
  if (!x) return gagal("Set tugas tidak ditemukan.");
  const nilai = { setTugasId: setId, judul: p.data.judul, uraian: p.data.uraian || null, frekuensi: p.data.frekuensi, hari: p.data.frekuensi === "pekanan" ? p.data.hari! : null, jamTenggat: p.data.jamTenggat, linkWajib: p.data.linkWajib === "on" };
  let urutan = 0;
  let asalId: string | null = null;
  if (itemId) {
    const [lama] = await db.select().from(s.setTugasItem).where(and(eq(s.setTugasItem.id, itemId), eq(s.setTugasItem.setTugasId, setId)));
    if (!lama) return gagal("Tugas tidak ditemukan.");
    urutan = lama.urutan;
    asalId = lama.asalId ?? lama.id;
    await db.update(s.setTugasItem).set({ aktif: false }).where(eq(s.setTugasItem.id, itemId));
  } else {
    urutan = (await db.select({ id: s.setTugasItem.id }).from(s.setTugasItem).where(eq(s.setTugasItem.setTugasId, setId))).length;
  }
  const [baru] = await db.insert(s.setTugasItem).values({ ...nilai, urutan, asalId }).returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: itemId ? "ubah" : "buat", entitas: "set_tugas_item", entitasId: baru.id, sebelum: itemId ? { id: itemId } : undefined, sesudah: baru });
  const n = (await pemakaiSet(db, setId)).length;
  await terbitkanUlang(db, setId);
  refresh();
  return berhasil(n ? `Tersimpan. Berlaku mulai besok untuk ${n} staf pemakai set ini.` : "Tugas tersimpan.");
}

export async function hapusItemSet(setId: string, itemId: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  if (!(await setMilik(db, sesi, setId))) return gagal("Set tugas tidak ditemukan.");
  await db.update(s.setTugasItem).set({ aktif: false }).where(and(eq(s.setTugasItem.id, itemId), eq(s.setTugasItem.setTugasId, setId)));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "set_tugas_item", entitasId: itemId });
  await terbitkanUlang(db, setId);
  refresh();
  return berhasil("Tugas dihapus dari set mulai besok. Riwayat tetap tersimpan.");
}

// ── Atur Tugas Staf ───────────────────────────────────────────────────────────

/**
 * Pasang set tugas untuk satu staf pada pekan ini atau pekan depan. Pekan berikutnya otomatis berlanjut.
 * Pekan ini: berlaku mulai besok (tugas hari ini yang sudah terbit tidak berubah).
 */
export async function aturSetStaf(penugasanId: string, setTugasId: string | null, pekan: "ini" | "depan"): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const [pn] = await db.select().from(s.penugasan).where(and(eq(s.penugasan.id, penugasanId), kondisiPenugasanBerlaku(periodeDari(today))));
  if (!pn || pn.peranKerja !== "SK" || !koordinatorAtauWakil(sesi, pn.koordinatorId) || pn.pegawaiId === sesi.pegawaiId) return gagal("Hanya staf tugas rutin yang Anda koordinasikan.");
  if (setTugasId) {
    const [x] = await db.select().from(s.setTugas).where(eq(s.setTugas.id, setTugasId));
    if (!x || x.unitId !== pn.unitId || !x.aktif) return gagal("Set tugas bukan milik unit staf ini.");
  }
  const senin = seninDari(today);
  const pekanMulai = pekan === "ini" ? senin : tambahHari(senin, 7);
  await db.insert(s.setTugasStaf).values({ penugasanId, setTugasId, pekanMulai, dibuatOleh: sesi.pegawaiId });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "atur", entitas: "set_tugas_staf", entitasId: penugasanId, sesudah: { setTugasId, pekanMulai } });
  await regenerasiRutin(db, [penugasanId]);
  refresh();
  return berhasil(pekan === "ini" ? "Tersimpan. Berlaku mulai besok." : "Tersimpan untuk pekan depan.");
}

// ── Usulan tugas rutin ────────────────────────────────────────────────────────

const skemaUsulan = z
  .object({
    penugasanId: z.string().min(1),
    judul: z.string().trim().min(3, "Isi judul tugas.").max(200),
    setTugasId: z.string().min(1, "Pilih set tugas."),
    frekuensi: z.enum(["harian", "pekanan"], "Pilih frekuensi."),
    hari: z.coerce.number().int().min(0).max(6).optional(),
    jamTenggat: jam,
    alasan: z.string().trim().min(5, "Tulis alasan singkat.").max(500),
  })
  .refine((x) => x.frekuensi === "harian" || x.hari !== undefined, { path: ["hari"], message: "Pilih hari." });

/** Staf tugas rutin mengusulkan tugas ke set tugas unitnya. */
export async function ajukanUsulanRutin(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaUsulan.safeParse(Object.fromEntries([...fd].filter(([, v]) => v !== "")));
  if (!p.success) return gagal("Periksa isian usulan.", galatDari(p.error));
  const x = p.data;
  const pn = sesi.penugasan.find((q) => q.id === x.penugasanId && q.peranKerja === "SK");
  if (!pn) return gagal("Usulan tugas rutin hanya untuk staf tugas rutin.");
  if (!pn.koordinatorId || pn.koordinatorId === sesi.pegawaiId) return gagal("Unit ini belum punya koordinator. Hubungi Admin.");
  const db = await getDb();
  const [set] = await db.select().from(s.setTugas).where(eq(s.setTugas.id, x.setTugasId));
  if (!set || set.unitId !== pn.unitId) return gagal("Pilih set tugas di unit Anda.", { setTugasId: "Set tugas tidak ditemukan." });
  const today = hariIni(sesi.kantor);
  const [u] = await db
    .insert(s.usulanTugas)
    .values({ penugasanId: pn.id, kelompok: crypto.randomUUID(), judul: x.judul, uraian: x.alasan, frekuensi: x.frekuensi, hari: x.frekuensi === "pekanan" ? x.hari! : null, tanggalMulai: today, tanggalAkhir: today, jamTenggat: x.jamTenggat, setTugasId: x.setTugasId })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ajukan", entitas: "usulan_tugas", entitasId: u.id, sesudah: u });
  refresh();
  return berhasil("Usulan terkirim ke koordinator.");
}

/**
 * Koordinator memutuskan usulan rutin. Setuju: tugas masuk ke set pilihan koordinator (boleh berbeda dari pilihan
 * staf) dan berlaku mulai besok untuk semua pemakai set itu. Tolak: alasan wajib.
 */
export async function putuskanUsulanRutin(usulanId: string, keputusan: "setuju" | "tolak", opsi: { setTugasId?: string; alasan?: string } = {}): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [r] = await db.select({ u: s.usulanTugas, pn: s.penugasan }).from(s.usulanTugas).innerJoin(s.penugasan, eq(s.penugasan.id, s.usulanTugas.penugasanId)).where(eq(s.usulanTugas.id, usulanId));
  if (!r || !koordinatorAtauWakil(sesi, r.pn.koordinatorId) || r.pn.pegawaiId === sesi.pegawaiId) return gagal("Usulan tidak ditemukan.");
  if (r.u.status !== "diajukan") return gagal("Usulan ini sudah diputuskan.");
  const putusan = { diputusOleh: sesi.pegawaiId, diputusPada: new Date() };
  if (keputusan === "tolak") {
    if (!opsi.alasan?.trim()) return gagal("Tulis alasan penolakan.", { alasan: "Alasan wajib diisi." });
    await db.update(s.usulanTugas).set({ ...putusan, status: "ditolak", alasanTolak: opsi.alasan.trim() }).where(eq(s.usulanTugas.id, usulanId));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "tolak", entitas: "usulan_tugas", entitasId: usulanId, alasan: opsi.alasan.trim() });
    refresh();
    return berhasil("Usulan ditolak.");
  }
  const setId = opsi.setTugasId || r.u.setTugasId;
  if (!setId) return gagal("Pilih set tugas tujuan.");
  const [set] = await db.select().from(s.setTugas).where(eq(s.setTugas.id, setId));
  if (!set || set.unitId !== r.pn.unitId) return gagal("Set tugas bukan milik unit ini.");
  const n = (await db.select({ id: s.setTugasItem.id }).from(s.setTugasItem).where(eq(s.setTugasItem.setTugasId, setId))).length;
  const [it] = await db
    .insert(s.setTugasItem)
    .values({ setTugasId: setId, judul: r.u.judul, frekuensi: r.u.frekuensi === "pekanan" ? "pekanan" : "harian", hari: r.u.hari, jamTenggat: r.u.jamTenggat, urutan: n })
    .returning();
  await db.update(s.usulanTugas).set({ ...putusan, status: "disetujui", setTugasId: setId }).where(eq(s.usulanTugas.id, usulanId));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "setujui", entitas: "usulan_tugas", entitasId: usulanId, sesudah: { setTugasId: setId, item: it.id } });
  const pemakai = await pemakaiSet(db, setId);
  await regenerasiRutin(db, pemakai);
  refresh();
  return berhasil(`Disetujui dan masuk ke ${set.nama}. Berlaku mulai besok${pemakai.length ? ` untuk ${pemakai.length} staf` : ""}.`);
}

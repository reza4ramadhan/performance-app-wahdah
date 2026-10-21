"use server";

import { and, count, eq, gte, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { bolehNilaiK3 } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { kondisiPenugasanBerlaku } from "@/lib/data/ikp";
import { NILAI_K3, type SkorK3 } from "@/lib/ikp/tipe";
import { wajibSesi, type Sesi } from "@/lib/sesi";
import { hariIni, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal.");

/** KSBK (atau Admin) untuk unit ini. */
const pengelolaUnit = (sesi: Sesi, unitId: string) => sesi.peran.has("admin") || sesi.penugasan.some((p) => p.peranKerja === "KSBK" && p.unitId === unitId);

async function periodeStatus(periode: string) {
  const db = await getDb();
  const [p] = await db.select({ status: s.periode.status }).from(s.periode).where(eq(s.periode.id, periode));
  return p?.status ?? "berjalan";
}

// ── Kegiatan bulanan ──────────────────────────────────────────────────────────

const skemaKegiatan = z.object({
  unitId: z.string().min(1),
  nama: z.string().trim().min(3, "Isi nama kegiatan.").max(200),
  tanggal,
  skuoId: z.string().optional(),
  penanggungJawabId: z.string().optional(),
  perluSpp: z.literal("on").optional(),
  perluSpb: z.literal("on").optional(),
});

export async function simpanKegiatan(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaKegiatan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian kegiatan.", galatDari(p.error));
  if (!pengelolaUnit(sesi, p.data.unitId)) return gagal("Hanya KSBK bidang ini yang bisa menginput kegiatan.");
  const periode = periodeDari(p.data.tanggal);
  if (["sementara", "disahkan"].includes(await periodeStatus(periode))) return gagal("Periode kegiatan itu sudah dikunci.");

  const db = await getDb();
  const staf = await db.select({ n: count() }).from(s.penugasan).where(and(eq(s.penugasan.unitId, p.data.unitId), eq(s.penugasan.peranKerja, "SBK"), kondisiPenugasanBerlaku(periode)));
  if (staf[0].n > 1 && (p.data.perluSpp || p.data.perluSpb) && !p.data.penanggungJawabId)
    return gagal("Pilih penanggung jawab.", { penanggungJawabId: "Bidang ini punya lebih dari satu staf; tentukan siapa yang menangani SPP/SPB dan pengingat." });

  const [k] = await db
    .insert(s.kegiatan)
    .values({
      unitId: p.data.unitId,
      nama: p.data.nama,
      tanggal: p.data.tanggal,
      skuoId: p.data.skuoId || null,
      penanggungJawabId: p.data.penanggungJawabId || null,
      perluSpp: !!p.data.perluSpp,
      perluSpb: !!p.data.perluSpb,
      dibuatOleh: sesi.pegawaiId,
    })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "kegiatan", entitasId: k.id, sesudah: k });
  refresh();
  return berhasil("Kegiatan tersimpan.");
}

export async function hapusKegiatan(id: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [k] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, id));
  if (!k || !pengelolaUnit(sesi, k.unitId)) return gagal("Kegiatan tidak ditemukan.");
  const [{ n }] = await db.select({ n: count() }).from(s.item).where(eq(s.item.kegiatanId, id));
  if (n) return gagal(`Kegiatan sudah dipakai ${n} item, tidak bisa dihapus.`);
  await db.delete(s.kegiatan).where(eq(s.kegiatan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "kegiatan", entitasId: id, sebelum: k });
  refresh();
  return berhasil("Kegiatan dihapus.");
}

/** Salin kegiatan bulan lalu ke bulan ini (tanggal sama, dibatasi akhir bulan). */
export async function salinKegiatanBulanLalu(unitId: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!pengelolaUnit(sesi, unitId)) return gagal("Hanya KSBK bidang ini yang bisa menyalin kegiatan.");
  const db = await getDb();
  const kini = periodeDari(hariIni(sesi.kantor));
  const lalu = rentangPeriode(periodeBerikut(kini, -1));
  const { akhir } = rentangPeriode(kini);
  const sumber = await db.select().from(s.kegiatan).where(and(eq(s.kegiatan.unitId, unitId), gte(s.kegiatan.tanggal, lalu.awal), lte(s.kegiatan.tanggal, lalu.akhir)));
  if (!sumber.length) return gagal("Tidak ada kegiatan bulan lalu.");
  await db.insert(s.kegiatan).values(
    sumber.map((k) => {
      const tgl = `${kini}-${k.tanggal.slice(8)}`;
      return { unitId, nama: k.nama, tanggal: tgl > akhir ? akhir : tgl, skuoId: k.skuoId, perluSpp: k.perluSpp, perluSpb: k.perluSpb, penanggungJawabId: k.penanggungJawabId, dibuatOleh: sesi.pegawaiId, sumber: "salin" as const };
    }),
  );
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "salin", entitas: "kegiatan", entitasId: unitId, sesudah: { jumlah: sumber.length } });
  refresh();
  return berhasil(`${sumber.length} kegiatan disalin. Periksa dan sesuaikan tanggalnya.`);
}

// ── Catatan perilaku ──────────────────────────────────────────────────────────

const skemaCatatan = z.object({
  pegawaiId: z.string().min(1, "Pilih staf."),
  tanggal,
  nilaiK3: z.enum(NILAI_K3).optional().or(z.literal("")),
  catatan: z.string().trim().min(5, "Tulis catatan singkat.").max(500),
});

export async function simpanCatatan(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaCatatan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  if (p.data.pegawaiId === sesi.pegawaiId) return gagal("Tidak bisa mencatat perilaku diri sendiri.");
  const db = await getDb();
  const [pn] = await db.select({ id: s.penugasan.id }).from(s.penugasan).where(and(eq(s.penugasan.pegawaiId, p.data.pegawaiId), eq(s.penugasan.koordinatorId, sesi.pegawaiId)));
  if (!pn) return gagal("Staf ini bukan anggota tim Anda.");
  await db.insert(s.catatanPerilaku).values({ penilaiId: sesi.pegawaiId, pegawaiId: p.data.pegawaiId, tanggal: p.data.tanggal, nilaiK3: p.data.nilaiK3 || null, catatan: p.data.catatan });
  refresh();
  return berhasil("Catatan tersimpan. Akan tampil saat menilai K3.");
}

// ── Penilaian K3 ──────────────────────────────────────────────────────────────

export async function simpanK3(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const penugasanId = String(fd.get("penugasanId"));
  const periodeId = String(fd.get("periodeId"));
  const kirim = fd.get("kirim") === "1";
  const db = await getDb();
  const [pn] = await db.select().from(s.penugasan).where(eq(s.penugasan.id, penugasanId));
  if (!pn) return gagal("Penugasan tidak ditemukan.");
  const boleh = bolehNilaiK3(sesi, pn);
  if (!boleh.boleh) return gagal(boleh.alasan);
  const st = await periodeStatus(periodeId);
  if (st === "sementara" || st === "disahkan") return gagal("Periode sudah dikunci.");

  const { awal, akhir } = rentangPeriode(periodeId);
  const [log] = await db.select({ n: count() }).from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.pegawaiId, pn.pegawaiId), gte(s.pengembanganDiri.tanggal, awal), lte(s.pengembanganDiri.tanggal, akhir)));

  const skor = {} as SkorK3;
  const contoh: Partial<Record<keyof SkorK3, string>> = {};
  const galat: Record<string, string> = {};
  for (const n of NILAI_K3) {
    const v = Number(fd.get(`skor-${n}`));
    if (!Number.isInteger(v) || v < 1 || v > 5) galat[`skor-${n}`] = "Pilih skor 1–5.";
    skor[n] = v;
    let c = String(fd.get(`contoh-${n}`) ?? "").trim();
    // Log kosong adalah buktinya sendiri: skor ≤ 2 untuk pengembangan diri tidak perlu contoh tambahan.
    if (!c && n === "pengembanganDiri" && log.n === 0 && v <= 2) c = "Log pengembangan diri bulan ini kosong.";
    if (c) contoh[n] = c.slice(0, 500);
    if (kirim && [1, 2, 5].includes(v) && !c) galat[`contoh-${n}`] = `Skor ${v} wajib disertai contoh perilaku.`;
  }
  if (log.n === 0 && skor.pengembanganDiri > 2) galat["skor-pengembanganDiri"] = "Log pengembangan diri bulan ini kosong: skor maksimal 2.";
  if (Object.keys(galat).length) return gagal("Periksa kembali penilaian.", galat);

  const status = kirim ? ("dikirim" as const) : ("draf" as const);
  const [lama] = await db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.periodeId, periodeId), eq(s.penilaianK3.penugasanId, penugasanId), eq(s.penilaianK3.penilaiId, sesi.pegawaiId)));
  const [baru] = await db
    .insert(s.penilaianK3)
    .values({ periodeId, penugasanId, penilaiId: sesi.pegawaiId, skor, contoh, status, diubahPada: new Date() })
    .onConflictDoUpdate({ target: [s.penilaianK3.periodeId, s.penilaianK3.penugasanId, s.penilaianK3.penilaiId], set: { skor, contoh, status, diubahPada: new Date() } })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: kirim ? "kirim" : "simpan-draf", entitas: "penilaian_k3", entitasId: baru.id, sebelum: lama, sesudah: baru });
  refresh();
  return berhasil(kirim ? "Penilaian K3 dikirim." : "Draf penilaian tersimpan.");
}

// ── Uji petik arsip (KSBK-1e) ─────────────────────────────────────────────────

const skemaUji = z
  .object({
    unitId: z.string().min(1),
    periodeId: z.string().regex(/^\d{4}-\d{2}$/),
    jumlahDiuji: z.coerce.number().int().min(10, "Minimal 10 dokumen diuji."),
    jumlahSesuai: z.coerce.number().int().min(0),
    catatan: z.string().trim().max(500).optional(),
  })
  .refine((x) => x.jumlahSesuai <= x.jumlahDiuji, { path: ["jumlahSesuai"], message: "Tidak boleh melebihi jumlah diuji." });

export async function simpanUjiPetik(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaUji.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  if (!pengelolaUnit(sesi, p.data.unitId)) return gagal("Hanya KSBK bidang ini yang bisa mengisi uji petik.");
  if (["kalibrasi", "sementara", "disahkan"].includes(await periodeStatus(p.data.periodeId))) return gagal("Periode sudah melewati batas verifikasi.");
  const db = await getDb();
  await db
    .insert(s.ujiPetikArsip)
    .values({ ...p.data, catatan: p.data.catatan || null, dibuatOleh: sesi.pegawaiId })
    .onConflictDoUpdate({ target: [s.ujiPetikArsip.periodeId, s.ujiPetikArsip.unitId], set: { jumlahDiuji: p.data.jumlahDiuji, jumlahSesuai: p.data.jumlahSesuai, catatan: p.data.catatan || null } });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "simpan", entitas: "uji_petik_arsip", entitasId: p.data.unitId, sesudah: p.data });
  refresh();
  return berhasil("Uji petik tersimpan.");
}

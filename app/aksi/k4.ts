"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { bolehProsesIkpPegawai, penilaiK3 } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s, type Db } from "@/lib/db";
import { periodeK4Terbuka, poinSebelumnya } from "@/lib/data/k4";
import { petaWaka } from "@/lib/data/unit";
import { poinK4Bersih } from "@/lib/ikp/hitung";
import { POIN_K4, type TingkatK4 } from "@/lib/ikp/tipe";
import { wajibPeran, wajibSesi } from "@/lib/sesi";

const skema = z.object({
  periodeId: z.string().regex(/^\d{4}-\d{2}$/),
  judul: z.string().trim().min(5, "Judul inovasi terlalu pendek.").max(200),
  uraian: z.string().trim().max(1000).optional(),
  tingkatUsulan: z.enum(["I", "II", "III", "IV"], { error: "Pilih tingkat yang diusulkan." }),
  linkBukti: z.url({ protocol: /^https?$/, error: "Link bukti harus alamat lengkap (https://…)." }),
  penugasanId: z.string().min(1, "Pilih amanah yang terkait."),
  rekan: z.array(z.string()).max(2, "Maksimal 3 pengusul termasuk Anda."),
  inovasiIndukId: z.string().optional(),
});

export async function ajukanK4(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skema.safeParse({ ...Object.fromEntries(fd), penugasanId: String(fd.get("penugasanId") || sesi.amanah?.id || ""), rekan: fd.getAll("rekan").map(String).filter(Boolean), inovasiIndukId: String(fd.get("inovasiIndukId") || "") || undefined });
  if (!p.success) return gagal("Periksa isian.", Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])));
  if (!(await periodeK4Terbuka(sesi.kantor)).includes(p.data.periodeId)) return gagal("Batas pengajuan K4 untuk periode itu sudah lewat.");
  if (!sesi.penugasan.some((x) => x.id === p.data.penugasanId)) return gagal("Pilih amanah Anda.", { penugasanId: "Amanah tidak ditemukan." });
  const rekan = [...new Set(p.data.rekan.filter((r) => r !== sesi.pegawaiId))];
  const db = await getDb();
  if (p.data.inovasiIndukId) {
    const [induk] = await db.select().from(s.k4Pengusul).where(and(eq(s.k4Pengusul.k4Id, p.data.inovasiIndukId), eq(s.k4Pengusul.pegawaiId, sesi.pegawaiId)));
    if (!induk) return gagal("Inovasi sebelumnya tidak ditemukan.");
  }
  const [k4] = await db
    .insert(s.k4Pengajuan)
    .values({ periodeId: p.data.periodeId, judul: p.data.judul, uraian: p.data.uraian || null, tingkatUsulan: p.data.tingkatUsulan, linkBukti: p.data.linkBukti, penugasanId: p.data.penugasanId, inovasiIndukId: p.data.inovasiIndukId ?? null, diajukanOleh: sesi.pegawaiId })
    .returning();
  await db.insert(s.k4Pengusul).values([sesi.pegawaiId, ...rekan].map((pegawaiId) => ({ k4Id: k4.id, pegawaiId })));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "ajukan", entitas: "k4", entitasId: k4.id, sesudah: { ...k4, rekan } });
  refresh();
  return berhasil("Inovasi diajukan. Atasan langsung akan memeriksa.");
}

/**
 * Atasan langsung pengajuan K4: penilai K3 amanah yang dipilih (koordinatornya, atau WaKa bila ia koordinator
 * dirinya sendiri). Pengajuan lama tanpa amanah: koordinator penugasan mana pun milik pengusul.
 */
async function atasanK4(db: Db, k4: { diajukanOleh: string; penugasanId: string | null }) {
  if (k4.penugasanId) {
    const [[pn], waka] = await Promise.all([db.select().from(s.penugasan).where(eq(s.penugasan.id, k4.penugasanId)), petaWaka(db)]);
    const atasan = pn ? penilaiK3(pn, waka.get(pn.unitId) ?? null) : null;
    return atasan ? [atasan] : [];
  }
  const rows = await db.select({ id: s.penugasan.koordinatorId }).from(s.penugasan).where(eq(s.penugasan.pegawaiId, k4.diajukanOleh));
  return rows.map((r) => r.id).filter((x): x is string => !!x && x !== k4.diajukanOleh);
}

/** Atasan langsung memeriksa: lanjutkan ke WaKa atau tolak. */
export async function periksaK4(id: string, lanjut: boolean, catatan?: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [k4] = await db.select().from(s.k4Pengajuan).where(eq(s.k4Pengajuan.id, id));
  if (!k4 || k4.status !== "diajukan") return gagal("Pengajuan tidak ditemukan atau sudah diperiksa.");
  const pengusul = await db.select({ id: s.k4Pengusul.pegawaiId }).from(s.k4Pengusul).where(eq(s.k4Pengusul.k4Id, id));
  if (pengusul.some((p) => p.id === sesi.pegawaiId)) return gagal("Tidak bisa memeriksa inovasi milik sendiri.");
  if (!(await atasanK4(db, k4)).includes(sesi.pegawaiId)) return gagal("Hanya atasan langsung pengusul untuk amanah ini yang bisa memeriksa.");
  if (!lanjut && !catatan?.trim()) return gagal("Tulis alasan penolakan.");
  await db.update(s.k4Pengajuan).set({ status: lanjut ? "diperiksa" : "ditolak", catatan: catatan?.trim() || null }).where(eq(s.k4Pengajuan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: lanjut ? "periksa" : "tolak", entitas: "k4", entitasId: id, alasan: catatan });
  refresh();
  return berhasil(lanjut ? "Diteruskan ke WaKa untuk penetapan tingkat." : "Pengajuan ditolak.");
}

/** WaKa menetapkan tingkat & poin. Poin bersih = poin tingkat − poin tertinggi yang pernah diterima inovasi yang sama. */
export async function tetapkanK4(id: string, tingkat: TingkatK4, poinTingkat: number, catatan?: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("waka");
  const db = await getDb();
  const [k4] = await db.select().from(s.k4Pengajuan).where(eq(s.k4Pengajuan.id, id));
  if (!k4 || (k4.status !== "diperiksa" && k4.status !== "ditetapkan")) return gagal("Pengajuan belum diperiksa atasan.");
  const pengusul = await db.select({ id: s.k4Pengusul.pegawaiId }).from(s.k4Pengusul).where(eq(s.k4Pengusul.k4Id, id));
  for (const p of pengusul) {
    const b = bolehProsesIkpPegawai(sesi, p.id);
    if (!b.boleh) return gagal(b.alasan);
  }
  if (!(POIN_K4[tingkat] as readonly number[]).includes(poinTingkat)) return gagal("Poin tidak sesuai tingkat.");

  // Naik tingkat untuk inovasi yang sama hanya menambah selisih poin.
  const poin = poinK4Bersih(poinTingkat, [await poinSebelumnya(db, k4.inovasiIndukId)]);
  await db.update(s.k4Pengajuan).set({ status: "ditetapkan", tingkatDitetapkan: tingkat, poin, catatan: catatan?.trim() || k4.catatan }).where(eq(s.k4Pengajuan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "tetapkan", entitas: "k4", entitasId: id, sebelum: k4, sesudah: { tingkat, poinTingkat, poin } });
  refresh();
  return berhasil(poin < poinTingkat ? `Ditetapkan tingkat ${tingkat}: ${poin} poin (selisih dari tingkat sebelumnya).` : `Ditetapkan tingkat ${tingkat}: ${poin} poin.`);
}

export async function tolakK4Waka(id: string, catatan: string): Promise<HasilAksi> {
  const sesi = await wajibPeran("waka");
  if (!catatan.trim()) return gagal("Tulis alasan penolakan.");
  const db = await getDb();
  await db.update(s.k4Pengajuan).set({ status: "ditolak", catatan: catatan.trim() }).where(and(eq(s.k4Pengajuan.id, id), ne(s.k4Pengajuan.status, "disahkan")));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "tolak", entitas: "k4", entitasId: id, alasan: catatan });
  refresh();
  return berhasil("Pengajuan ditolak.");
}

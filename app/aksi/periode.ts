"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { bolehKelolaPeriode, bolehProsesIkpPegawai, punya } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { periodeAtauBaru } from "@/lib/data/ikp";
import { sahkanK4Periode } from "@/lib/data/k4";
import { tulisSnapshot } from "@/lib/data/kunci";
import { LABEL_STATUS_PERIODE, type StatusPeriode } from "@/lib/ikp/tipe";
import { wajibSesi } from "@/lib/sesi";

/**
 * Alur status (plan.md 5.3): berjalan → verifikasi → kalibrasi → sementara → disahkan.
 * Sekretariat menjalankan langkah sampai "sementara" (hitung & kunci); Kepala Kantor mengesahkan.
 * "sementara → kalibrasi" dipakai bila perlu membuka kembali sebelum disahkan.
 */
const LANGKAH: Record<string, { dari: StatusPeriode; ke: StatusPeriode; aksi: "kunci" | "sahkan" }> = {
  verifikasi: { dari: "berjalan", ke: "verifikasi", aksi: "kunci" },
  kalibrasi: { dari: "verifikasi", ke: "kalibrasi", aksi: "kunci" },
  sementara: { dari: "kalibrasi", ke: "sementara", aksi: "kunci" },
  buka: { dari: "sementara", ke: "kalibrasi", aksi: "kunci" },
  disahkan: { dari: "sementara", ke: "disahkan", aksi: "sahkan" },
};

export async function ubahStatusPeriode(periodeId: string, langkah: keyof typeof LANGKAH): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const l = LANGKAH[langkah];
  if (!l) return gagal("Langkah tidak dikenal.");
  const izin = bolehKelolaPeriode(sesi, l.aksi);
  if (!izin.boleh) return gagal(izin.alasan);

  const db = await getDb();
  const p = await periodeAtauBaru(db, periodeId);
  if (p.status !== l.dari) return gagal(`Periode berstatus ${LABEL_STATUS_PERIODE[p.status]}, bukan ${LABEL_STATUS_PERIODE[l.dari]}.`);

  if (l.ke === "sementara") {
    const hasil = await tulisSnapshot(db, periodeId, "sementara", "sementara");
    const kurang = hasil.filter((h) => h.ikp === null).length;
    await db.update(s.periode).set({ status: "sementara", dikunciPada: new Date() }).where(eq(s.periode.id, periodeId));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "kunci-sementara", entitas: "periode", entitasId: periodeId, sesudah: { pegawai: hasil.length, belumLengkap: kurang } });
    refresh();
    return berhasil(kurang ? `IKP sementara dikunci. ${kurang} pegawai belum lengkap datanya.` : "IKP sementara dikunci dan bisa dilihat pegawai.");
  }
  if (l.ke === "disahkan") {
    await sahkanK4Periode(db, periodeId);
    await tulisSnapshot(db, periodeId, "akhir", "disahkan");
    await db.update(s.periode).set({ status: "disahkan", disahkanOleh: sesi.pegawaiId, disahkanPada: new Date() }).where(eq(s.periode.id, periodeId));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "sahkan", entitas: "periode", entitasId: periodeId });
    refresh();
    return berhasil("IKP akhir disahkan. Skor dibekukan.");
  }

  await db.update(s.periode).set({ status: l.ke }).where(eq(s.periode.id, periodeId));
  if (langkah === "buka") await db.delete(s.hasilIkp).where(eq(s.hasilIkp.periodeId, periodeId));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: `status-${l.ke}`, entitas: "periode", entitasId: periodeId, sebelum: { status: p.status }, sesudah: { status: l.ke } });
  refresh();
  return berhasil(`Periode sekarang: ${LABEL_STATUS_PERIODE[l.ke]}.`);
}

/** Kalibrasi K3: WaKa/Kepala Kantor mengembalikan penilaian ke penilai dengan catatan. */
export async function kembalikanK3(penilaianId: string, catatan: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!punya(sesi, "waka", "kepala")) return gagal("Hanya WaKa atau Kepala Kantor yang melakukan kalibrasi.");
  if (!catatan.trim()) return gagal("Tulis catatan untuk penilai.");
  const db = await getDb();
  const [row] = await db
    .select({ k: s.penilaianK3, pegawaiId: s.penilaianK3.pegawaiId })
    .from(s.penilaianK3)
    .where(eq(s.penilaianK3.id, penilaianId));
  if (!row) return gagal("Penilaian tidak ditemukan.");
  const b = bolehProsesIkpPegawai(sesi, row.pegawaiId);
  if (!b.boleh) return gagal(b.alasan);
  const [per] = await db.select().from(s.periode).where(eq(s.periode.id, row.k.periodeId));
  if (per && (per.status === "sementara" || per.status === "disahkan")) return gagal("Periode sudah dikunci.");
  await db.update(s.penilaianK3).set({ status: "dikembalikan", catatanKalibrasi: catatan.trim() }).where(and(eq(s.penilaianK3.id, penilaianId)));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "kembalikan", entitas: "penilaian_k3", entitasId: penilaianId, sebelum: row.k, alasan: catatan });
  refresh();
  return berhasil("Penilaian dikembalikan ke penilai.");
}

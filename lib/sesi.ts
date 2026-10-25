// Data Access Layer sesi: satu-satunya tempat membaca siapa yang sedang login.
// Dipanggil di dalam <Suspense> (Cache Components) dan di awal setiap Server Action.

import "server-only";
import { and, eq, gte, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Aktor } from "./akses";
import { getAuth } from "./auth";
import { getDb, schema as s } from "./db";
import { amanahPengampu, COOKIE_AMANAH, pilihAmanah } from "./amanah";
import type { PeranKerja, PeranSistem } from "./ikp/tipe";
import { bidangDari, leluhurDari, wakaDari } from "./unit";
import { hariIni, periodeBerikut, periodeDari, type Kantor } from "./waktu";

export type Sesi = Aktor & {
  userId: string;
  nama: string;
  kantor: Kantor;
  harusGantiPassword: boolean;
  /** Penugasan yang berlaku bulan ini. `bidangId`: bidang unit itu (SKUO → bidang induknya), null bila di luar bidang. */
  penugasan: { id: string; peranKerja: PeranKerja; unitId: string; unitNama: string; bidangId: string | null; koordinatorId: string | null }[];
  /**
   * Penugasan orang lain (atau milik sendiri bila rangkap) yang saya koordinasikan atau K3-nya saya nilai,
   * berlaku bulan ini atau bulan lalu (verifikasi bulan lalu masih berjalan sampai hari kerja ke-5).
   */
  binaan: Binaan[];
  /** Amanah (penugasan) aktif yang dipilih lewat "Pindah Amanah"; null bila belum punya penugasan. */
  amanah: Sesi["penugasan"][number] | null;
  /** Binaan yang dibawahi amanah aktif. Menu dan halaman tim memakai ini, bukan seluruh binaan. */
  tim: Binaan[];
};

/** `amanahId`: amanah saya yang membawahi penugasan ini (lib/amanah.ts amanahPengampu). */
type Binaan = { id: string; pegawaiId: string; peranKerja: PeranKerja; unitId: string; koordinatorId: string | null; amanahId: string | null };

/** Peran sistem dari penugasan: koordinator bila punya binaan, WaKa/Kepala Kantor dari peran kerja. */
export function peranTurunan(penugasan: readonly { peranKerja: PeranKerja }[], binaan: readonly unknown[]): PeranSistem[] {
  return [
    ...(binaan.length ? (["koordinator"] as const) : []),
    ...(penugasan.some((p) => p.peranKerja === "WAKA") ? (["waka"] as const) : []),
    ...(penugasan.some((p) => p.peranKerja === "KAKAN") ? (["kepala"] as const) : []),
  ];
}

export const bacaSesi = cache(async (): Promise<Sesi | null> => {
  // Baca header dulu: prerender berhenti di sini, jadi build tidak pernah menyentuh basis data.
  const h = await headers();
  const auth = await getAuth();
  const data = await auth.api.getSession({ headers: h });
  const pegawaiId = (data?.user as { pegawaiId?: string } | undefined)?.pegawaiId;
  if (!data || !pegawaiId) return null;

  const db = await getDb();
  const [pg] = await db.select().from(s.pegawai).where(eq(s.pegawai.id, pegawaiId));
  if (!pg || !pg.aktif) return null;

  const kantor = pg.kantor as Kantor;
  const periode = periodeDari(hariIni(kantor));
  const [unit, jar] = await Promise.all([db.select({ id: s.unit.id, jenis: s.unit.jenis, indukId: s.unit.indukId, wakaId: s.unit.wakaId }).from(s.unit), cookies()]);
  const bidang = bidangDari(unit);
  const unitWakaSaya = [...wakaDari(unit)].filter(([, w]) => w === pg.id).map(([u]) => u);
  const [peran, pn, semuaBinaan] = await Promise.all([
    db.select({ peran: s.peranSistem.peran }).from(s.peranSistem).where(eq(s.peranSistem.pegawaiId, pg.id)),
    db
      .select({ id: s.penugasan.id, peranKerja: s.penugasan.peranKerja, unitId: s.penugasan.unitId, unitNama: s.unit.nama, koordinatorId: s.penugasan.koordinatorId })
      .from(s.penugasan)
      .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
      .where(
        and(
          eq(s.penugasan.pegawaiId, pg.id),
          lte(s.penugasan.periodeMulai, periode),
          or(isNull(s.penugasan.periodeSelesai), gte(s.penugasan.periodeSelesai, periode)),
        ),
      ),
    db
      .select({ id: s.penugasan.id, pegawaiId: s.penugasan.pegawaiId, peranKerja: s.penugasan.peranKerja, unitId: s.penugasan.unitId, koordinatorId: s.penugasan.koordinatorId })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(
        and(
          eq(s.pegawai.aktif, true),
          lte(s.penugasan.periodeMulai, periode),
          or(isNull(s.penugasan.periodeSelesai), gte(s.penugasan.periodeSelesai, periodeBerikut(periode, -1))),
          or(
            eq(s.penugasan.koordinatorId, pg.id),
            // Rangkap jabatan: koordinator = dirinya sendiri, K3-nya dinilai WaKa unit tersebut.
            unitWakaSaya.length ? and(eq(s.penugasan.koordinatorId, s.penugasan.pegawaiId), ne(s.penugasan.pegawaiId, pg.id), inArray(s.penugasan.unitId, unitWakaSaya)) : undefined,
          ),
        ),
      ),
  ]);

  const penugasan = pn.map((p) => ({ ...p, bidangId: bidang.get(p.unitId) ?? null }));
  const amanah = pilihAmanah(penugasan, jar.get(COOKIE_AMANAH)?.value);
  const pengampu = amanahPengampu(penugasan, semuaBinaan, leluhurDari(unit));
  const binaan = semuaBinaan.map((b) => ({ ...b, amanahId: pengampu.get(b.id) ?? null }));

  return {
    userId: data.user.id,
    pegawaiId: pg.id,
    nama: pg.nama,
    kantor,
    harusGantiPassword: Boolean((data.user as { harusGantiPassword?: boolean }).harusGantiPassword),
    peran: new Set<PeranSistem>(["pegawai", ...peran.map((p) => p.peran), ...peranTurunan(pn, binaan)]),
    penugasan,
    binaan,
    amanah,
    tim: binaan.filter((b) => b.amanahId === amanah?.id),
  };
});

/** Wajib login (dan sudah mengganti password awal). */
export async function wajibSesi(): Promise<Sesi> {
  const sesi = await bacaSesi();
  if (!sesi) redirect("/masuk");
  if (sesi.harusGantiPassword) redirect("/ganti-password");
  return sesi;
}

/** Wajib salah satu peran sistem; selain itu kembali ke beranda. */
export async function wajibPeran(...peran: PeranSistem[]): Promise<Sesi> {
  const sesi = await wajibSesi();
  if (!peran.some((p) => sesi.peran.has(p))) redirect("/?akses=ditolak");
  return sesi;
}

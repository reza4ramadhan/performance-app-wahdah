// Data Access Layer sesi: satu-satunya tempat membaca siapa yang sedang login.
// Dipanggil di dalam <Suspense> (Cache Components) dan di awal setiap Server Action.

import "server-only";
import { and, eq, isNull, lte, or, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Aktor } from "./akses";
import { getAuth } from "./auth";
import { getDb, schema as s } from "./db";
import { petaBidang } from "./data/unit";
import type { PeranKerja, PeranSistem } from "./ikp/tipe";
import { hariIni, periodeDari, type Kantor } from "./waktu";

export type Sesi = Aktor & {
  userId: string;
  nama: string;
  kantor: Kantor;
  harusGantiPassword: boolean;
  /** Penugasan yang berlaku bulan ini. `bidangId`: bidang unit itu (SKUO → bidang induknya), null bila di luar bidang. */
  penugasan: { id: string; peranKerja: PeranKerja; unitId: string; unitNama: string; bidangId: string | null; koordinatorId: string | null }[];
};

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
  const [peran, pn, bidang] = await Promise.all([
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
    petaBidang(db),
  ]);

  return {
    userId: data.user.id,
    pegawaiId: pg.id,
    nama: pg.nama,
    kantor,
    harusGantiPassword: Boolean((data.user as { harusGantiPassword?: boolean }).harusGantiPassword),
    peran: new Set<PeranSistem>(["pegawai", ...peran.map((p) => p.peran)]),
    penugasan: pn.map((p) => ({ ...p, bidangId: bidang.get(p.unitId) ?? null })),
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

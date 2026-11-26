// Penugasan rangkap. Rombak v2: "Pindah Amanah" dihapus; semua penugasan tampil dalam satu daftar berlabel unit.
// Yang tersisa: pengelompokan penugasan untuk K1 gabungan (peran kerja sama di bidang yang sama = satu K1) dan
// pemilihan peran tertinggi, yang menentukan set menu.

import type { PeranKerja } from "./ikp/tipe";

/** Urutan peran: yang membawahi orang lain lebih dulu. */
const URUTAN: PeranKerja[] = ["WAKA", "KAKAN", "KSBK", "KU", "SK", "SBK"];

type Amanah = { id: string; peranKerja: PeranKerja; unitId: string; bidangId?: string | null };

/** Kunci K1 gabungan: peran kerja + bidang (unit itu sendiri bila di luar bidang). Penugasan berkunci sama = satu K1. */
export function kunciAmanah(p: { peranKerja: PeranKerja; unitId: string; bidangId?: string | null }) {
  return `${p.peranKerja}:${p.bidangId ?? p.unitId}`;
}

/** Kelompokkan penugasan per kunci K1 gabungan, mengikuti urutan kemunculan pertama. */
export function kelompokAmanah<T extends Amanah>(penugasan: readonly T[]): T[][] {
  const grup = new Map<string, T[]>();
  for (const p of penugasan) (grup.get(kunciAmanah(p)) ?? grup.set(kunciAmanah(p), []).get(kunciAmanah(p))!).push(p);
  return [...grup.values()];
}

/** "SBK · 8.1 Departemen A, 8.3 Departemen B" */
export const labelAmanah = (grup: readonly { peranKerja: PeranKerja; unitNama: string }[]) => `${grup[0].peranKerja} · ${grup.map((p) => p.unitNama).join(", ")}`;

/** Penugasan dengan peran tertinggi; set menu mengikuti peran ini. */
export function peranTertinggi<T extends Amanah>(penugasan: readonly T[]): T | null {
  return [...penugasan].sort((a, b) => URUTAN.indexOf(a.peranKerja) - URUTAN.indexOf(b.peranKerja))[0] ?? null;
}

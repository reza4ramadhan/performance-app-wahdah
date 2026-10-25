// "Pindah Amanah": pegawai yang rangkap jabatan bekerja dalam satu amanah aktif pada satu waktu.
// Satu amanah = penugasan dengan peran kerja yang sama di bidang yang sama (mis. SBK di dua SKUO satu bidang):
// tidak perlu pindah, dan K1-nya dihitung gabungan. Pindah hanya bila perannya beda atau bidangnya beda.
// Fungsi murni; sesi (lib/sesi.ts) membaca pilihan dari cookie lalu memanggil fungsi di sini.

import type { PeranKerja } from "./ikp/tipe";

export const COOKIE_AMANAH = "amanah";

/** Urutan amanah bawaan: yang membawahi orang lain lebih dulu. */
const URUTAN: PeranKerja[] = ["WAKA", "KAKAN", "KSBK", "KU", "SK", "SBK"];

type Amanah = { id: string; peranKerja: PeranKerja; unitId: string; bidangId?: string | null };

/** Kunci amanah: peran kerja + bidang (unit itu sendiri bila di luar bidang). Penugasan berkunci sama = satu amanah. */
export function kunciAmanah(p: { peranKerja: PeranKerja; unitId: string; bidangId?: string | null }) {
  return `${p.peranKerja}:${p.bidangId ?? p.unitId}`;
}

/** Kelompokkan penugasan menjadi amanah, mengikuti urutan kemunculan pertama. */
export function kelompokAmanah<T extends Amanah>(penugasan: readonly T[]): T[][] {
  const grup = new Map<string, T[]>();
  for (const p of penugasan) (grup.get(kunciAmanah(p)) ?? grup.set(kunciAmanah(p), []).get(kunciAmanah(p))!).push(p);
  return [...grup.values()];
}

/** "SBK · 8.1 Departemen A, 8.3 Departemen B" */
export const labelAmanah = (grup: readonly { peranKerja: PeranKerja; unitNama: string }[]) => `${grup[0].peranKerja} · ${grup.map((p) => p.unitNama).join(", ")}`;

/** Amanah aktif: pilihan di cookie bila masih berlaku, selain itu menurut urutan bawaan. */
export function pilihAmanah<T extends Amanah>(penugasan: readonly T[], dipilih: string | undefined): T | null {
  return penugasan.find((p) => p.id === dipilih) ?? [...penugasan].sort((a, b) => URUTAN.indexOf(a.peranKerja) - URUTAN.indexOf(b.peranKerja))[0] ?? null;
}

/**
 * Membagi binaan (penugasan yang saya koordinasikan atau K3-nya saya nilai) ke amanah yang membawahinya:
 * KSBK/KU → binaan di unitnya atau di bawahnya; WaKa/Kepala Kantor → sisanya. Binaan yang tidak tertampung
 * (mis. atasan Staf Khusus, atau penugasan bulan lalu setelah rotasi) jatuh ke amanah bawaan agar antrean
 * verifikasi tidak hilang.
 *
 * @param leluhur unitId → himpunan dirinya dan semua leluhurnya (lib/unit.ts leluhurDari).
 */
export function amanahPengampu(penugasan: readonly Amanah[], binaan: readonly { id: string; unitId: string }[], leluhur: ReadonlyMap<string, ReadonlySet<string>>): Map<string, string> {
  const bawaan = pilihAmanah(penugasan, undefined);
  const peta = new Map<string, string>();
  if (!bawaan) return peta;
  const unitKerja = penugasan.filter((p) => p.peranKerja === "KSBK" || p.peranKerja === "KU");
  const pimpinan = penugasan.find((p) => p.peranKerja === "WAKA" || p.peranKerja === "KAKAN");
  for (const b of binaan) {
    const atas = leluhur.get(b.unitId);
    const pengampu = unitKerja.find((p) => atas?.has(p.unitId)) ?? pimpinan ?? bawaan;
    peta.set(b.id, pengampu.id);
  }
  return peta;
}

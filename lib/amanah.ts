// "Pindah Amanah": pegawai yang rangkap jabatan bekerja dalam satu penugasan aktif pada satu waktu.
// Fungsi murni; sesi (lib/sesi.ts) membaca pilihan dari cookie lalu memanggil fungsi di sini.

import type { PeranKerja } from "./ikp/tipe";

export const COOKIE_AMANAH = "amanah";

/** Urutan amanah bawaan: yang membawahi orang lain lebih dulu. */
const URUTAN: PeranKerja[] = ["WAKA", "KAKAN", "KSBK", "KU", "SK", "SBK"];

type Amanah = { id: string; peranKerja: PeranKerja; unitId: string };

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

// Aturan hak akses & konflik kepentingan (plan.md Bagian 4 & 11).
// Fungsi murni supaya bisa diuji; Server Action wajib memanggilnya sebelum menulis.

import type { Verifikator } from "./ikp/katalog";
import { PERAN_PIMPINAN, type PeranSistem } from "./ikp/tipe";

export type Aktor = { pegawaiId: string; peran: ReadonlySet<PeranSistem> };

export type Keputusan = { boleh: true } | { boleh: false; alasan: string };
const ya: Keputusan = { boleh: true };
const tidak = (alasan: string): Keputusan => ({ boleh: false, alasan });

export const punya = (a: Aktor, ...peran: PeranSistem[]) => peran.some((p) => a.peran.has(p));
export const pimpinan = (a: Aktor) => punya(a, ...PERAN_PIMPINAN);

/**
 * Verifikasi item: verifikator sesuai indikator. Item milik sendiri hanya boleh diverifikasi bila ia
 * sendiri koordinator penugasan itu (rangkap jabatan, mis. KSBK yang juga SBK di SKUO bidangnya).
 */
export function bolehVerifikasiItem(a: Aktor, item: { pemilikId: string; koordinatorId: string | null; verifikator: Verifikator }): Keputusan {
  const rangkap = item.verifikator === "koordinator" && item.koordinatorId === a.pegawaiId;
  if (item.pemilikId === a.pegawaiId && !rangkap) return tidak("Tidak bisa memverifikasi item milik sendiri.");
  switch (item.verifikator) {
    case "koordinator":
      return item.koordinatorId === a.pegawaiId ? ya : tidak("Hanya koordinator penugasan ini yang bisa memverifikasi.");
    case "keuangan":
      return punya(a, "keuangan") ? ya : tidak("Item ini diverifikasi oleh Keuangan.");
    case "sekretariat":
      return punya(a, "sekretariat") ? ya : tidak("Item ini diverifikasi oleh Sekretariat.");
  }
}

/**
 * Penilai K3 sebuah penugasan: koordinatornya, kecuali bila koordinator = pegawai itu sendiri
 * (rangkap jabatan); maka penilaian naik ke WaKa unit/bidangnya.
 */
export function penilaiK3(pn: { pegawaiId: string; koordinatorId: string | null }, wakaUnit: string | null): string | null {
  if (pn.koordinatorId !== pn.pegawaiId) return pn.koordinatorId;
  return wakaUnit && wakaUnit !== pn.pegawaiId ? wakaUnit : null;
}

/** Penilaian K3: hanya penilai salah satu penugasan pegawai itu, tidak untuk diri sendiri. */
export function bolehNilaiK3(a: Aktor, pegawaiId: string, penilai: readonly (string | null)[]): Keputusan {
  if (pegawaiId === a.pegawaiId) return tidak("Tidak bisa menilai K3 diri sendiri.");
  return penilai.includes(a.pegawaiId) ? ya : tidak("Hanya koordinator penugasan pegawai ini yang bisa menilai K3.");
}

/** Melihat data pegawai lain: diri sendiri, anggota tim, atau pimpinan/Sekretariat/Admin. */
export function bolehLihatPegawai(a: Aktor, targetId: string, timIds: ReadonlySet<string>): Keputusan {
  if (targetId === a.pegawaiId || pimpinan(a) || timIds.has(targetId)) return ya;
  return tidak("Anda tidak berhak melihat data pegawai ini.");
}

/**
 * Petugas Sekretariat / Admin tidak boleh memproses IKP dirinya sendiri (Bagian 4).
 * Dipakai untuk aksi per pegawai (mis. kalibrasi, koreksi absensi, penetapan K4).
 */
export function bolehProsesIkpPegawai(a: Aktor, targetId: string): Keputusan {
  if (targetId === a.pegawaiId) return tidak("Data IKP Anda sendiri harus diproses petugas lain.");
  return ya;
}

/** Mengunci / mengesahkan periode. */
export function bolehKelolaPeriode(a: Aktor, aksi: "kunci" | "sahkan"): Keputusan {
  if (aksi === "sahkan") return punya(a, "kepala") ? ya : tidak("Hanya Kepala Kantor yang bisa mengesahkan IKP.");
  return punya(a, "sekretariat") ? ya : tidak("Hanya Sekretariat yang bisa menghitung dan mengunci IKP.");
}

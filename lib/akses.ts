// Aturan hak akses & konflik kepentingan (plan.md Bagian 4 & 11).
// Fungsi murni supaya bisa diuji; Server Action wajib memanggilnya sebelum menulis.

import type { Verifikator } from "./ikp/katalog";
import { PERAN_PIMPINAN, type PeranSistem } from "./ikp/tipe";

/**
 * `wakilDari`: koordinator yang saya wakili (Wakil Koordinator unit B, F, K). Wakil berhak memverifikasi seperti
 * koordinatornya, tetapi tidak mengisi K3 (penilai K3 tetap `koordinatorId` penugasan).
 */
export type Aktor = { pegawaiId: string; peran: ReadonlySet<PeranSistem>; wakilDari?: ReadonlySet<string> };

/** Saya koordinator (atau wakil koordinator) penugasan berkoordinator `koordinatorId`. */
export const koordinatorAtauWakil = (a: Aktor, koordinatorId: string | null) => !!koordinatorId && (koordinatorId === a.pegawaiId || !!a.wakilDari?.has(koordinatorId));

/** Id koordinator yang hak verifikasinya saya pegang: diri sendiri + koordinator yang saya wakili (untuk kueri SQL). */
export const idKoordinator = (a: Aktor) => [a.pegawaiId, ...(a.wakilDari ?? [])];

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
      return koordinatorAtauWakil(a, item.koordinatorId) ? ya : tidak("Hanya koordinator (atau wakilnya) penugasan ini yang bisa memverifikasi.");
    case "keuangan":
      return punya(a, "keuangan") ? ya : tidak("Item ini diverifikasi oleh Keuangan.");
    case "admin":
      return punya(a, "admin") ? ya : tidak("Item ini diverifikasi oleh Admin.");
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

/** Melihat data pegawai lain: diri sendiri, anggota tim, atau pimpinan/Admin. */
export function bolehLihatPegawai(a: Aktor, targetId: string, timIds: ReadonlySet<string>): Keputusan {
  if (targetId === a.pegawaiId || pimpinan(a) || timIds.has(targetId)) return ya;
  return tidak("Anda tidak berhak melihat data pegawai ini.");
}

/**
 * Aturan saling periksa: Admin tidak memproses IKP dirinya sendiri (unggah absensi, penetapan K4, kalibrasi);
 * datanya diproses salah satu Admin lain.
 */
export function bolehProsesIkpPegawai(a: Aktor, targetId: string): Keputusan {
  if (targetId === a.pegawaiId) return tidak("Data IKP Anda sendiri harus diproses petugas lain.");
  return ya;
}

/**
 * Mengunci / mengesahkan periode. Selama akun Kepala Kantor ditunda, Admin juga mengesahkan (IKP yang dikunci
 * Admin menjadi final). Saling periksa: Admin yang mengunci IKP sementara tidak boleh mengesahkannya sendiri,
 * agar IKP (termasuk datanya sendiri) selalu diperiksa Admin kedua. `pengunci`: pegawai yang mengunci sementara.
 */
export function bolehKelolaPeriode(a: Aktor, aksi: "kunci" | "sahkan", ctx: { pengunci?: string | null } = {}): Keputusan {
  if (aksi === "sahkan") {
    if (punya(a, "kepala")) return ya;
    if (!punya(a, "admin")) return tidak("Hanya Admin yang bisa mengesahkan IKP.");
    return ctx.pengunci && ctx.pengunci === a.pegawaiId ? tidak("Anda yang mengunci IKP ini. Pengesahan dilakukan Admin lain (saling periksa).") : ya;
  }
  return punya(a, "admin") ? ya : tidak("Hanya Admin yang bisa menghitung dan mengunci IKP.");
}

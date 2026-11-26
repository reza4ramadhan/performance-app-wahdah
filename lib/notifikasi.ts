// Aturan notifikasi (docs/rombak-v2/02–04 bagian B). Fungsi murni: cron dan aksi menghitung keadaan,
// fungsi di sini memutuskan apakah dan apa yang dikirim.

import { TANGGAL_BATAS_INPUT, TANGGAL_INGAT_BULAN_DEPAN } from "./kegiatan-wajib";
import { labelPeriode, labelTanggal, periodeBerikut, periodeDari } from "./waktu";

export type Pesan = { title: string; body: string; url: string; tag: string };

/** Jam pengingat harian (waktu setempat). Jadwal cron di README mengikuti angka ini. */
export const JAM_PENGINGAT = "15:00";

export type KeadaanHarian = {
  /** Pola kerja staf: administrasi (SBK), rutin (SK), atau bukan staf (koordinator saja). */
  pola: "administrasi" | "rutin" | null;
  /** Ada item/jurnal/tugas selesai yang dicatat hari ini. */
  adaAktivitas: boolean;
  /** Tugas (item/rutin/delegasi) bertenggat hari ini yang belum ditandai selesai. */
  belumHariIni: number;
  /** Tugas yang sudah lewat tenggat dan belum selesai. */
  terlambat: number;
};

/**
 * Pengingat 15.00.
 * - Staf Administrasi: bila belum ada aktivitas hari ini, atau masih ada tugas hari ini / terlambat.
 * - Staf Tugas Rutin: bila masih ada tugas hari ini yang belum ditandai selesai (atau terlambat).
 * - Koordinator tanpa penugasan staf: hanya bila ada tugas pribadi yang belum selesai.
 */
export function pesanPengingat(k: KeadaanHarian, hariIni: string): Pesan | null {
  const tag = `harian-${hariIni}`;
  const sisa = [k.belumHariIni && `${k.belumHariIni} tugas hari ini belum selesai`, k.terlambat && `${k.terlambat} terlambat`].filter(Boolean).join(", ");
  if (k.pola === "administrasi" && !k.adaAktivitas) return { title: "Belum ada aktivitas hari ini", body: sisa ? `${sisa[0].toUpperCase()}${sisa.slice(1)}. Tandai yang sudah selesai atau catat pekerjaan hari ini.` : "Catat pekerjaan atau jurnal hari ini. Cukup 3 menit.", url: "/", tag };
  if (!sisa) return null;
  if (k.pola === "rutin") return { title: "Tugas rutin belum ditandai selesai", body: `${sisa[0].toUpperCase()}${sisa.slice(1)}.`, url: "/", tag };
  return { title: "Masih ada tugas yang belum selesai", body: `${sisa[0].toUpperCase()}${sisa.slice(1)}.`, url: k.pola ? "/" : "/?segmen=saya", tag };
}

/**
 * Bulan rencana yang sedang wajib dikonfirmasi: mulai tgl 25 untuk bulan depan, sampai tgl 5 bulan itu
 * (batas konfirmasi). Di luar rentang itu null.
 */
export function periodeKonfirmasi(hariIni: string): { periode: string; batas: string } | null {
  const d = Number(hariIni.slice(8, 10));
  const kini = periodeDari(hariIni);
  const periode = d >= TANGGAL_INGAT_BULAN_DEPAN ? periodeBerikut(kini, 1) : d <= TANGGAL_BATAS_INPUT ? kini : null;
  return periode ? { periode, batas: `${periode}-${String(TANGGAL_BATAS_INPUT).padStart(2, "0")}` } : null;
}

export function pesanRencana(belum: number, p: { periode: string; batas: string }, hariIni: string): Pesan | null {
  if (!belum) return null;
  const bulan = labelPeriode(p.periode).split(" ")[0];
  const lewat = hariIni > p.batas;
  return {
    title: lewat ? `Rencana ${bulan} melewati batas` : `Konfirmasi rencana ${bulan}`,
    body: `${belum} kegiatan belum dikonfirmasi (Jalan, Geser, Tunda, atau Batal) · batas ${labelTanggal(p.batas)}.`,
    url: `/tim/kegiatan?periode=${p.periode}`,
    tag: `rencana-${p.periode}-${hariIni}`,
  };
}

export function pesanMenunggu(n: number, hariIni: string): Pesan | null {
  if (!n) return null;
  return { title: "Pekerjaan staf menunggu diperiksa", body: `${n} pekerjaan menunggu lebih dari 1 hari kerja. Yang belum diperiksa belum dihitung ke skor staf.`, url: "/tim/verifikasi", tag: `verif-${hariIni}` };
}

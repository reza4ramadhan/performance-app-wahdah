// Jadwal tugas khusus: tanggal-tanggal tenggat dari frekuensi dan rentang tanggal. Fungsi murni.

import type { FrekuensiTugas } from "./tipe";
import { isHariKerja, tambahHari } from "../waktu";

/** Batas jumlah jadwal per tugas (± 3 bulan tugas harian). */
export const MAKS_JADWAL = 66;

/** Sekali = tanggal mulai; harian = tiap hari kerja; pekanan = tiap 7 hari sejak tanggal mulai. */
export function tanggalJadwal(frekuensi: FrekuensiTugas, mulai: string, akhir: string, libur: ReadonlySet<string>): string[] {
  if (frekuensi === "sekali") return [mulai];
  const hasil: string[] = [];
  for (let t = mulai; t <= akhir; t = tambahHari(t, frekuensi === "harian" ? 1 : 7)) if (frekuensi === "pekanan" || isHariKerja(t, libur)) hasil.push(t);
  return hasil;
}

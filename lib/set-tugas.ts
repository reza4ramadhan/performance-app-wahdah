// Set Tugas (docs/rombak-v2/03 & 05): jadwal tugas rutin harian dari susunan Atur Tugas Staf per pekan.
// Fungsi murni; lib/data/set-tugas.ts memuat data, memanggil ini, lalu menulis tugas_khusus_jadwal.

import { hariDalamPekan, isHariKerja, tambahHari } from "./waktu";
import { rentangPekan } from "./tugas-saya";

export type ItemRutin = { id: string; frekuensi: "harian" | "pekanan"; hari: number | null; jamTenggat: string; aktif: boolean };
export type Pemasangan = { setTugasId: string | null; pekanMulai: string; dibuatPada: Date };
export type JadwalRutin = { itemId: string; setTugasId: string; /** hari tugas */ tanggal: string; /** tanggal tenggat (bisa esok hari untuk shift malam) */ tenggat: string; jam: string };

export const LABEL_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

/** Senin pekan tanggal ini. */
export const seninDari = (tanggal: string) => rentangPekan(tanggal).awal;

/**
 * Set Tugas yang berlaku pada `tanggal`: baris Atur Tugas Staf terbaru dengan pekan mulai ≤ Senin pekan itu
 * (auto carry-over). Dua baris untuk pekan yang sama: yang dibuat terakhir menang.
 */
export function setBerlaku(pasang: readonly Pemasangan[], tanggal: string): string | null {
  const senin = seninDari(tanggal);
  let pilih: Pemasangan | null = null;
  for (const p of pasang) {
    if (p.pekanMulai > senin) continue;
    if (!pilih || p.pekanMulai > pilih.pekanMulai || (p.pekanMulai === pilih.pekanMulai && p.dibuatPada > pilih.dibuatPada)) pilih = p;
  }
  return pilih?.setTugasId ?? null;
}

/**
 * Jadwal rutin satu staf untuk rentang [dari, sampai]. Harian = setiap hari kerja; pekanan = pada hari yang dipilih.
 * `gantiHari` per set (aturan Admin): tugas berjam < jam itu bertenggat pada hari berikutnya (shift malam).
 */
export function jadwalRutin(p: {
  dari: string;
  sampai: string;
  libur: ReadonlySet<string>;
  pasang: readonly Pemasangan[];
  item: ReadonlyMap<string, readonly ItemRutin[]>;
  gantiHari?: ReadonlyMap<string, string | null>;
}): JadwalRutin[] {
  const hasil: JadwalRutin[] = [];
  for (let d = p.dari; d <= p.sampai; d = tambahHari(d, 1)) {
    const set = setBerlaku(p.pasang, d);
    if (!set) continue;
    const batas = p.gantiHari?.get(set) ?? null;
    for (const i of p.item.get(set) ?? []) {
      if (!i.aktif) continue;
      const jatuh = i.frekuensi === "harian" ? isHariKerja(d, p.libur) : hariDalamPekan(d) === i.hari;
      if (!jatuh) continue;
      hasil.push({ itemId: i.id, setTugasId: set, tanggal: d, tenggat: batas && i.jamTenggat < batas ? tambahHari(d, 1) : d, jam: i.jamTenggat });
    }
  }
  return hasil;
}

/** Ujung jadwal yang disiapkan: Minggu pekan depan (agar pratinjau Besok dan susunan pekan depan sudah terbit). */
export const ujungJadwal = (hariIni: string) => tambahHari(rentangPekan(hariIni).akhir, 7);

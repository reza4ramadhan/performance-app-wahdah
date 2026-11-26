// Jendela akhir bulan (rombak v2): pengajuan K4 dan Kartu Penilaian hanya dibuka ≤ 5 hari kerja setelah bulan berakhir.

import { PARAMETER } from "./ikp/tipe";
import { geserHariKerja, periodeBerikut, periodeDari, rentangPeriode, tambahHari } from "./waktu";

/**
 * `periode`: bulan yang sedang dinilai bila jendela terbuka (bulan lalu), selain itu null.
 * `awal`/`akhir`: rentang jendela yang sedang berjalan, atau jendela berikutnya bila sedang tertutup.
 */
export function jendelaAkhirBulan(hariIni: string, libur: ReadonlySet<string>): { periode: string | null; awal: string; akhir: string } {
  const kini = periodeDari(hariIni);
  const lalu = periodeBerikut(kini, -1);
  const batasLalu = geserHariKerja(rentangPeriode(lalu).akhir, PARAMETER.batasVerifikasiHariKerja, libur);
  if (hariIni <= batasLalu) return { periode: lalu, awal: rentangPeriode(kini).awal, akhir: batasLalu };
  const akhirKini = rentangPeriode(kini).akhir;
  return { periode: null, awal: tambahHari(akhirKini, 1), akhir: geserHariKerja(akhirKini, PARAMETER.batasVerifikasiHariKerja, libur) };
}

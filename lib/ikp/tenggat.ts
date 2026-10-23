// Tenggat item untuk ditampilkan ke pegawai (sisa waktu) — mengikuti aturan hitung di k1.ts.

import { PARAMETER } from "./tipe";
import { geserHariKerja, hariKerjaAntara, rentangPeriode, tambahHari, tanggalLokal, type Kantor } from "../waktu";

export type TenggatItem = { tanggal: string; jam?: Date } | null;

export function tenggatItem(
  i: { indikatorKode: string; tglMasuk: Date; periodeId: string; data?: Record<string, string> },
  kegiatanTanggal: string | null,
  tenggat: number | null,
  libur: ReadonlySet<string>,
  kantor: Kantor,
): TenggatItem {
  const t = tenggat ?? 0;
  const masuk = tanggalLokal(i.tglMasuk, kantor);
  switch (i.indikatorKode) {
    case "SBK-1":
      return { tanggal: geserHariKerja(masuk, t, libur) };
    case "SBK-5":
      return { tanggal: geserHariKerja(kegiatanTanggal ?? masuk, t, libur) };
    case "SBK-2a":
      return kegiatanTanggal ? { tanggal: geserHariKerja(kegiatanTanggal, -t, libur) } : null;
    case "SBK-2b":
      return kegiatanTanggal ? { tanggal: tambahHari(kegiatanTanggal, t) } : null;
    case "SBK-3": {
      const h = PARAMETER.pengingatHMinus[Number(i.data?.ke ?? 1) - 1] ?? PARAMETER.pengingatHMinus.at(-1)!;
      return kegiatanTanggal ? { tanggal: tambahHari(kegiatanTanggal, -h) } : null;
    }
    case "SBK-4":
      return kegiatanTanggal ? { tanggal: tambahHari(kegiatanTanggal, -t) } : null;
    case "KSBK-3":
      return { tanggal: geserHariKerja(rentangPeriode(i.periodeId).akhir, t, libur) };
    default:
      return null;
  }
}

/** "Hari ini", "Besok", "2 hari kerja lagi", "Lewat 1 hari kerja". */
export function labelSisa(tenggat: string, hariIni: string, libur: ReadonlySet<string>): { teks: string; nada: "netral" | "gold" | "flame" } {
  if (tenggat === hariIni) return { teks: "Tenggat hari ini", nada: "gold" };
  const n = hariKerjaAntara(hariIni, tenggat, libur);
  if (tenggat < hariIni) return { teks: `Lewat ${Math.max(1, -n)} hari kerja`, nada: "flame" };
  if (n <= 1) return { teks: "Tenggat besok", nada: "gold" };
  return { teks: `${n} hari kerja lagi`, nada: "netral" };
}

// Tenggat item untuk ditampilkan ke pegawai (sisa waktu) — mengikuti aturan hitung di k1.ts.

import { PARAMETER } from "./tipe";
import { geserHariKerja, hariIni, hariKerjaAntara, rentangPeriode, tambahHari, tanggalLokal, type Kantor } from "../waktu";

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

/** Label sisa tenggat; `pokok`/`rincian` memecah teks jadi dua baris untuk kolom tenggat di daftar. */
export type SisaTenggat = { teks: string; nada: "netral" | "gold" | "flame"; pokok: string; rincian: string };

/** "Tenggat hari ini", "Tenggat besok", "2 hari kerja lagi", "Lewat 1 hari kerja". */
export function labelSisa(tenggat: string, hariIni: string, libur: ReadonlySet<string>): SisaTenggat {
  if (tenggat === hariIni) return { teks: "Tenggat hari ini", nada: "gold", pokok: "Hari ini", rincian: "tenggat" };
  const n = hariKerjaAntara(hariIni, tenggat, libur);
  if (tenggat < hariIni) {
    const lewat = Math.max(1, -n);
    return { teks: `Lewat ${lewat} hari kerja`, nada: "flame", pokok: `Lewat ${lewat}`, rincian: "hari kerja" };
  }
  if (n <= 1) return { teks: "Tenggat besok", nada: "gold", pokok: "Besok", rincian: "tenggat" };
  return { teks: `${n} hari kerja lagi`, nada: "netral", pokok: String(n), rincian: "hari kerja" };
}

/** Sisa waktu tenggat tugas khusus (berjam): "45 menit lagi", "5 jam lagi", "Tenggat besok", "3 hari lagi". */
export function labelSisaTugas(tenggat: Date, kantor: Kantor, kini: number): { teks: string; nada: "netral" | "gold" | "flame" } {
  const menit = Math.floor((tenggat.getTime() - kini) / 60_000);
  if (menit < 0) return { teks: "Lewat tenggat", nada: "flame" };
  const hari = Math.round((Date.parse(tanggalLokal(tenggat, kantor)) - Date.parse(hariIni(kantor, new Date(kini)))) / 86_400_000);
  if (hari === 0) return { teks: menit < 60 ? `${Math.max(1, menit)} menit lagi` : `${Math.floor(menit / 60)} jam lagi`, nada: "gold" };
  if (hari === 1) return { teks: "Tenggat besok", nada: "gold" };
  return { teks: `${hari} hari lagi`, nada: "netral" };
}

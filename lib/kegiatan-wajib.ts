// Kewajiban KSBK menginput kegiatan SKUO bulanan (plan.md Bagian 5: paling lambat tanggal 5).
// Fungsi murni; pemanggil menyerahkan jumlah kegiatan per bidang dan periode.

import { periodeBerikut, periodeDari } from "./waktu";

/** Tanggal batas input kegiatan tiap bulan. */
export const TANGGAL_BATAS_INPUT = 5;
/** Mulai tanggal ini, kegiatan bulan depan ikut diingatkan supaya batas tanggal 5 tidak terlewat. */
export const TANGGAL_INGAT_BULAN_DEPAN = 25;

export type KegiatanBelumDiinput = {
  unitId: string;
  periode: string;
  /** YYYY-MM-DD */
  batas: string;
  /** Hari kalender dari hari ini sampai batas; negatif bila batas sudah lewat. */
  sisaHari: number;
};

/** Bulan yang wajib sudah punya kegiatan pada `hariIni`: bulan berjalan, dan mulai tanggal 25 juga bulan depan. */
export function bulanWajibKegiatan(hariIni: string): string[] {
  const kini = periodeDari(hariIni);
  return Number(hariIni.slice(8, 10)) >= TANGGAL_INGAT_BULAN_DEPAN ? [kini, periodeBerikut(kini, 1)] : [kini];
}

const hariKe = (tgl: string) => {
  const [y, m, d] = tgl.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/**
 * Pasangan bidang × bulan wajib yang belum punya satu kegiatan pun, bulan terdekat lebih dulu.
 * `jumlah(unitId, periode)` = banyak kegiatan bidang itu yang dilaksanakan dalam periode tersebut.
 */
export function kegiatanBelumDiinput(hariIni: string, unitIds: string[], jumlah: (unitId: string, periode: string) => number): KegiatanBelumDiinput[] {
  return bulanWajibKegiatan(hariIni).flatMap((periode) =>
    unitIds
      .filter((u) => jumlah(u, periode) === 0)
      .map((unitId) => {
        const batas = `${periode}-${String(TANGGAL_BATAS_INPUT).padStart(2, "0")}`;
        return { unitId, periode, batas, sisaHari: hariKe(batas) - hariKe(hariIni) };
      }),
  );
}

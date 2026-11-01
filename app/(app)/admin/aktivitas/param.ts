// Filter halaman Aktivitas K1 dari URL; dipakai bersama halaman layar dan halaman cetak.

import { beraktivitas, type AktivitasPegawai, type AktivitasBidang } from "@/lib/data/aktivitas";
import { labelPeriode, labelTanggal, labelTanggalPanjang, periodeDari, rentangTanggal, type JenisRentang } from "@/lib/waktu";

export type Param = { rentang: JenisRentang; tanggal: string; tampil: "nama" | "bidang"; status: "semua" | "aktif" | "belum"; bidang?: string };

export function bacaParam(sp: Record<string, string | string[] | undefined>, today: string): Param {
  const tgl = String(sp.tanggal);
  return {
    rentang: sp.rentang === "pekan" || sp.rentang === "bulan" ? sp.rentang : "hari",
    tanggal: /^\d{4}-\d{2}-\d{2}$/.test(tgl) && tgl <= today ? tgl : today,
    tampil: sp.tampil === "bidang" ? "bidang" : "nama",
    status: sp.status === "aktif" || sp.status === "belum" ? sp.status : "semua",
    bidang: typeof sp.bidang === "string" && sp.bidang ? sp.bidang : undefined,
  };
}

export const cariParam = (p: Param) =>
  new URLSearchParams({ rentang: p.rentang, tanggal: p.tanggal, tampil: p.tampil, status: p.status, ...(p.bidang ? { bidang: p.bidang } : {}) });

export function labelRentang(p: Param) {
  const { awal, akhir } = rentangTanggal(p.rentang, p.tanggal);
  if (p.rentang === "hari") return labelTanggalPanjang(awal);
  if (p.rentang === "pekan") return `${labelTanggal(awal)} – ${labelTanggal(akhir, true)}`;
  return labelPeriode(periodeDari(awal));
}

export const LABEL_STATUS: Record<Param["status"], string> = { semua: "Semua", aktif: "Beraktivitas", belum: "Belum ada" };

/** Pegawai di bidang terpilih (bila ada), lalu disaring status aktivitasnya. */
export function saringPegawai(pegawai: AktivitasPegawai[], bidang: AktivitasBidang[], p: Param) {
  const filterBidang = p.bidang ? bidang.find((b) => b.id === p.bidang) : undefined;
  const dalamBidang = filterBidang ? pegawai.filter((x) => x.bidang.some((b) => b.id === filterBidang.id)) : pegawai;
  const tampil = dalamBidang.filter((x) => p.status === "semua" || beraktivitas(x) === (p.status === "aktif"));
  return { filterBidang, dalamBidang, tampil };
}

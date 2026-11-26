// Tab Tugas · Saya (docs/rombak-v2/02 butir 1.1–1.5): satu daftar gabungan dari checklist kegiatan, delegasi
// koordinator, dan item yang dicatat sendiri, dikelompokkan menurut tenggat. Fungsi murni supaya bisa diuji.

import { tambahHari } from "./waktu";

export type JenisTugasSaya = "item" | "delegasi";
export type StatusTugasSaya = "buka" | "ditolak" | "menunggu" | "disetujui";

export type BarisTugasSaya = {
  id: string;
  jenis: JenisTugasSaya;
  /** Apa yang harus dilakukan, mis. "Kirim pengingat ke-2". */
  judul: string;
  /** Nama kegiatan / pemberi tugas. */
  konteks: string | null;
  unitId: string;
  unitNama: string;
  /** Tenggat (YYYY-MM-DD) di zona kantor; null = tanpa tenggat tanggal (mis. SPB yang pending). */
  tenggat: string | null;
  /** "15.00" bila tenggat berjam (delegasi). */
  jam: string | null;
  /** Terlambat: belum selesai dan tenggat sudah lewat. */
  lewat: boolean;
  status: StatusTugasSaya;
  alasanTolak: string | null;
  /** SPB pending dana. */
  pending: boolean;
  /** Waktu ditandai selesai (untuk "Selesai minggu ini"). */
  selesaiPada: Date | null;
  href: string;
};

export type KelompokTugasSaya = {
  perbaiki: BarisTugasSaya[];
  terlambat: BarisTugasSaya[];
  hariIni: BarisTugasSaya[];
  pekanIni: BarisTugasSaya[];
  nanti: BarisTugasSaya[];
  pending: BarisTugasSaya[];
  selesai: { menunggu: BarisTugasSaya[]; disetujui: BarisTugasSaya[] };
};

/** Senin dan Minggu pekan berjalan (YYYY-MM-DD). */
export function rentangPekan(hariIni: string): { awal: string; akhir: string } {
  const hari = new Date(`${hariIni}T00:00:00Z`).getUTCDay(); // 0 = Minggu
  const awal = tambahHari(hariIni, -((hari + 6) % 7));
  return { awal, akhir: tambahHari(awal, 6) };
}

const urutTenggat = (a: BarisTugasSaya, b: BarisTugasSaya) => (a.tenggat ?? "9999").localeCompare(b.tenggat ?? "9999") || (a.jam ?? "99").localeCompare(b.jam ?? "99") || a.judul.localeCompare(b.judul);

/**
 * Pengelompokan: Perlu diperbaiki (ditolak) selalu paling atas; lalu Terlambat, Hari ini, Pekan ini (s.d. Minggu),
 * Nanti (sesudahnya atau tanpa tenggat). SPB pending punya bagian sendiri. Yang sudah diajukan/disetujui pekan ini
 * masuk Selesai minggu ini. `selesaiSejak`: awal pekan dalam UTC.
 */
export function kelompokkanTugasSaya(baris: readonly BarisTugasSaya[], hariIni: string, selesaiSejak: Date): KelompokTugasSaya {
  const { akhir } = rentangPekan(hariIni);
  const k: KelompokTugasSaya = { perbaiki: [], terlambat: [], hariIni: [], pekanIni: [], nanti: [], pending: [], selesai: { menunggu: [], disetujui: [] } };
  for (const b of [...baris].sort(urutTenggat)) {
    if (b.status === "ditolak") k.perbaiki.push(b);
    else if (b.status === "menunggu" || b.status === "disetujui") {
      if (b.selesaiPada && b.selesaiPada >= selesaiSejak) k.selesai[b.status].push(b);
    } else if (b.pending) k.pending.push(b);
    else if (b.lewat || (b.tenggat !== null && b.tenggat < hariIni)) k.terlambat.push(b);
    else if (b.tenggat === hariIni) k.hariIni.push(b);
    else if (b.tenggat !== null && b.tenggat <= akhir) k.pekanIni.push(b);
    else k.nanti.push(b);
  }
  return k;
}

/** Unit unik di daftar (untuk chip filter staf rangkap). */
export function unitDari(baris: readonly { unitId: string; unitNama: string }[]) {
  return [...new Map(baris.map((b) => [b.unitId, b.unitNama])).entries()].map(([id, nama]) => ({ id, nama }));
}

/** "A · Dakwah, Kaderisasi & PSDM" → "A · Dakwah": label pendek unit untuk chip. */
export const unitPendek = (nama: string) => nama.split(/[,&]/)[0].trim();

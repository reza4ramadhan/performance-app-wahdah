import type { Indikator } from "./types";

// Katalog K1. Kode dan struktur mengikuti PRD M2.1; nama, target, dan sumber data
// masih isian sementara dan HARUS dicocokkan dengan teks Draf 3 (plan.md 3.1).
export const KATALOG_AWAL: Indikator[] = [
  { kode: "SBK-1", peran: "SBK", nama: "Penyelesaian tugas bulanan sesuai rencana kerja", target: 90, sumberData: "Rekap tugas koordinator", fase: 1 },
  { kode: "SBK-2a", peran: "SBK", nama: "LPJ diserahkan tepat waktu", target: 100, sumberData: "Data LPJ Keuangan", fase: 1, verifikasiKeuangan: true },
  { kode: "SBK-2b", peran: "SBK", nama: "Input SPP/SPB Simakpro tepat waktu", target: 95, sumberData: "Log Simakpro", fase: 1, verifikasiKeuangan: true },
  { kode: "SBK-3", peran: "SBK", nama: "Surat diproses sesuai tenggat", target: 90, sumberData: "Buku agenda surat", fase: 1 },
  { kode: "SBK-4", peran: "SBK", nama: "Kegiatan PKA terlaksana dan terlapor", target: 90, sumberData: "Rekap PKA", fase: 1 },
  { kode: "SBK-5", peran: "SBK", nama: "Dokumen kerja terarsip", target: 95, sumberData: "Arsip bidang", fase: 1 },

  {
    kode: "KSBK-1",
    peran: "KSBK",
    nama: "Pengelolaan bidang",
    target: 90,
    sumberData: "Laporan bidang",
    fase: 1,
    subTugas: [
      { kode: "a", nama: "Rencana kerja bulanan diterbitkan" },
      { kode: "b", nama: "Realisasi anggaran sesuai RKA" },
      { kode: "c", nama: "Rapat koordinasi bidang" },
      { kode: "d", nama: "Tindak lanjut arahan pimpinan" },
      { kode: "e", nama: "Bukti K1 staf diunggah tepat waktu" },
    ],
  },
  { kode: "KSBK-2", peran: "KSBK", nama: "Rata-rata K1 staf bidang", target: 100, sumberData: "Dihitung otomatis", fase: 1, turunan: "rata-rata-k1-staf" },
  { kode: "KSBK-3", peran: "KSBK", nama: "Laporan bulanan bidang diserahkan", target: 100, sumberData: "Arsip Sekretariat", fase: 1, penyebutKecil: true },

  { kode: "KU-1", peran: "KU", nama: "Layanan unit diselesaikan sesuai standar", target: 90, sumberData: "Checklist Layanan Umum", fase: 1 },
  { kode: "KU-2", peran: "KU", nama: "Rata-rata K1 staf unit", target: 100, sumberData: "Dihitung otomatis", fase: 1, turunan: "rata-rata-k1-staf" },
  { kode: "KU-3", peran: "KU", nama: "Laporan bulanan unit diserahkan", target: 100, sumberData: "Arsip Sekretariat", fase: 1, penyebutKecil: true },

  {
    kode: "SK-1",
    peran: "SK",
    nama: "Daftar Tugas Rutin (DTR) terlaksana",
    target: 95,
    sumberData: "DTR disetujui atasan",
    fase: 1,
    // Sementara generik; nanti diisi dari DTR per pegawai (M2.2).
    subTugas: [
      { kode: "1", nama: "Tugas rutin 1" },
      { kode: "2", nama: "Tugas rutin 2" },
      { kode: "3", nama: "Tugas rutin 3" },
    ],
  },
  { kode: "SK-2", peran: "SK", nama: "Laporan kejadian dibuat", target: 100, sumberData: "Buku jaga", fase: 1 },
  { kode: "SK-3", peran: "SK", nama: "Patroli/jaga sesuai jadwal", target: 95, sumberData: "Jadwal jaga", fase: 1 },

  { kode: "SLA-SURAT", peran: "SBK", nama: "SLA surat e-office", target: 90, sumberData: "e-office", fase: 2 },
];

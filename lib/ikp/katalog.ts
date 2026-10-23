// Katalog indikator K1 (plan.md Bagian 6, dengan revisi Kegiatan SKUO / Tugas Khusus / Jurnal).
// Kode ini menyimpan bentuk form dan cara hitung; angka yang bisa dikalibrasi (standar, tenggat,
// verifikator, aktif) juga disalin ke tabel `indikator` agar Admin bisa mengubahnya tanpa rilis ulang.

import type { PeranKerja } from "./tipe";

/** item = dicatat per item; turunan = dari data lain; tugas = dari tugas khusus; tambahan = poin di atas rata-rata K1. */
export type TipeIndikator = "item" | "turunan" | "tugas" | "tambahan";
export type Verifikator = "koordinator" | "keuangan" | "sekretariat";
export type SatuanTenggat = "hari_kerja" | "hari" | "jam";

export type FieldItem =
  | { nama: string; label: string; jenis: "teks"; wajib?: boolean; contoh?: string }
  | { nama: string; label: string; jenis: "pilihan"; opsi: string[]; wajib?: boolean }
  | { nama: string; label: string; jenis: "skuo"; wajib?: boolean };

export type BentukItem = {
  /** Keterkaitan item dengan kegiatan bulanan bidang. */
  kegiatan: "wajib" | "opsional" | "tidak";
  /** Field waktu mulai; null = dicatat saat item dibuat. */
  masuk: { label: string; jenis: "tanggal" | "waktu" } | null;
  selesai: { label: string; jenis: "tanggal" | "waktu" };
  field: FieldItem[];
};

export type DefinisiIndikator = {
  kode: string;
  peran: PeranKerja;
  nama: string;
  /** Label chip di form + Catat. */
  pendek: string;
  tipe: TipeIndikator;
  /** Standar capaian sebagai pecahan, mis. 0,9 = 90%. */
  standar: number;
  tenggat: number | null;
  satuanTenggat: SatuanTenggat | null;
  verifikator: Verifikator;
  aktif: boolean;
  /** Item dibuat sistem dari kegiatan KSBK; staf tidak mencatatnya lewat + Catat. */
  otomatis?: boolean;
  /** Penjelasan cara hitung untuk layar Progres. */
  aturan: string;
  item?: BentukItem;
  sub?: { kode: string; nama: string; aturan: string }[];
};

const JENIS_LAYANAN = ["Media", "Zoom", "Sertifikat", "Konsumsi", "Akomodasi"];

export const KATALOG: DefinisiIndikator[] = [
  // ── Staf Bidang Kerja ──
  {
    kode: "SBK-1",
    peran: "SBK",
    nama: "Permintaan surat selesai ≤ 1 hari kerja",
    pendek: "Surat",
    tipe: "item",
    standar: 0.9,
    tenggat: 1,
    satuanTenggat: "hari_kerja",
    verifikator: "koordinator",
    aktif: true,
    aturan: "Target = permintaan surat diterima. Realisasi = selesai ≤ 1 hari kerja dan disetujui KSBK.",
    item: {
      kegiatan: "tidak",
      masuk: { label: "Tanggal diterima", jenis: "tanggal" },
      selesai: { label: "Tanggal selesai", jenis: "tanggal" },
      field: [
        { nama: "perihal", label: "Perihal", jenis: "teks", wajib: true, contoh: "Undangan rapat koordinasi" },
        { nama: "skuo", label: "SKUO pemohon", jenis: "skuo" },
      ],
    },
  },
  {
    kode: "SBK-2a",
    peran: "SBK",
    nama: "SPP diinput tepat waktu",
    pendek: "SPP",
    tipe: "item",
    standar: 0.9,
    tenggat: 3, // Bagian 13.1 — angka belum ditetapkan pedoman.
    satuanTenggat: "hari_kerja",
    verifikator: "koordinator", // Keuangan menyusul setelah perannya diperbaiki.
    aktif: true,
    otomatis: true,
    aturan: "Target = kegiatan SKUO bulan ini yang butuh SPP. Realisasi = SPP diinput paling lambat H-3 hari kerja sebelum kegiatan dan disetujui KSBK.",
    item: {
      kegiatan: "wajib",
      masuk: null,
      selesai: { label: "Tanggal input di SIMAKPRO", jenis: "tanggal" },
      field: [{ nama: "nomor", label: "No. SPP", jenis: "teks" }],
    },
  },
  {
    kode: "SBK-2b",
    peran: "SBK",
    nama: "SPB diinput ≤ 7 hari setelah kegiatan",
    pendek: "SPB",
    tipe: "item",
    standar: 0.9,
    tenggat: 7,
    satuanTenggat: "hari",
    verifikator: "koordinator",
    aktif: true,
    otomatis: true,
    aturan: "Target = kegiatan SKUO bulan ini yang butuh SPB. Realisasi = SPB diinput ≤ 7 hari setelah kegiatan dan disetujui KSBK.",
    item: {
      kegiatan: "wajib",
      masuk: null,
      selesai: { label: "Tanggal input SPB", jenis: "tanggal" },
      field: [{ nama: "nomor", label: "No. SPB", jenis: "teks" }],
    },
  },
  {
    kode: "SBK-3",
    peran: "SBK",
    nama: "Pengingat kegiatan terkirim tepat waktu",
    pendek: "Pengingat",
    tipe: "item",
    standar: 1,
    tenggat: null, // tetap: PARAMETER.pengingatHMinus
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    otomatis: true,
    aturan: "Target = 2 pengingat per kegiatan SKUO bulan ini. Realisasi = pengingat ke-1 terkirim paling lambat H-6 dan ke-2 paling lambat H-2, disetujui KSBK.",
    item: {
      kegiatan: "wajib",
      masuk: null,
      selesai: { label: "Tanggal kirim", jenis: "tanggal" },
      field: [{ nama: "saluran", label: "Saluran", jenis: "pilihan", opsi: ["Grup", "Pesan pribadi"], wajib: true }],
    },
  },
  {
    kode: "SBK-4",
    peran: "SBK",
    nama: "Layanan umum siap sebelum kegiatan",
    pendek: "Layanan",
    tipe: "item",
    standar: 0.95,
    tenggat: 0,
    satuanTenggat: "hari",
    verifikator: "koordinator",
    aktif: true,
    aturan: "Target = permintaan layanan diajukan. Realisasi = siap paling lambat hari pelaksanaan kegiatan.",
    item: {
      kegiatan: "wajib",
      masuk: null,
      selesai: { label: "Tanggal siap", jenis: "tanggal" },
      field: [{ nama: "jenis", label: "Jenis layanan", jenis: "pilihan", opsi: JENIS_LAYANAN, wajib: true }],
    },
  },
  {
    kode: "SBK-5",
    peran: "SBK",
    nama: "Dokumen diarsipkan ≤ 3 hari kerja",
    pendek: "Arsip",
    tipe: "item",
    standar: 0.9,
    tenggat: 3,
    satuanTenggat: "hari_kerja",
    verifikator: "koordinator",
    aktif: true,
    aturan: "Target = dokumen wajib arsip yang dicatat. Realisasi = diarsipkan ≤ 3 hari kerja setelah kegiatan (atau setelah diterima bila tanpa kegiatan) dan disetujui KSBK.",
    item: {
      kegiatan: "opsional",
      masuk: { label: "Tanggal diterima", jenis: "tanggal" },
      selesai: { label: "Tanggal diarsipkan", jenis: "tanggal" },
      field: [
        { nama: "jenis", label: "Jenis dokumen", jenis: "pilihan", opsi: ["Notulensi", "Dokumen kegiatan"], wajib: true },
        { nama: "judul", label: "Judul dokumen", jenis: "teks", wajib: true },
      ],
    },
  },
  {
    kode: "SBK-TK",
    peran: "SBK",
    nama: "Tugas khusus selesai (tambahan)",
    pendek: "Tugas khusus",
    tipe: "tambahan",
    standar: 1,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    aturan: "+0,15 poin per tugas khusus yang selesai sebelum tenggat dan disetujui pemberi tugas, maks. 5 poin. K1 tetap maks. 100.",
  },
  {
    kode: "SBK-JR",
    peran: "SBK",
    nama: "Jurnal diisi (tambahan)",
    pendek: "Jurnal",
    tipe: "tambahan",
    standar: 1,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    aturan: "+0,15 poin per entri jurnal bulan ini, maks. 5 poin. K1 tetap maks. 100.",
  },

  // ── Koordinator Staf Bidang Kerja ──
  {
    kode: "KSBK-1",
    peran: "KSBK",
    nama: "Pengendalian kerja bidang",
    pendek: "Pengendalian",
    tipe: "turunan",
    standar: 0.9,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    aturan: "Rata-rata skor 1a, 1c–1e, masing-masing dibatasi 100. Dihitung dari jejak waktu di aplikasi.",
    sub: [
      { kode: "a", nama: "Draf surat diperiksa ≤ 1 hari kerja", aturan: "Item SBK-1 staf yang diverifikasi ≤ 1 hari kerja setelah ditandai selesai." },
      // 1b (SPP/SPB tidak dikembalikan Keuangan) nonaktif sampai verifikasi Keuangan berjalan lagi.
      { kode: "c", nama: "Kegiatan bulanan diinput ≤ tanggal 5", aturan: "100 bila kegiatan bulan ini diinput paling lambat tanggal 5, selain itu 0." },
      { kode: "d", nama: "Layanan diajukan ≤ H-3", aturan: "Item SBK-4 staf yang dibuat paling lambat 3 hari sebelum kegiatan." },
      { kode: "e", nama: "Uji petik arsip sesuai", aturan: "Dokumen lengkap dan sesuai indeks ÷ dokumen yang diuji (min. 10)." },
    ],
  },
  {
    kode: "KSBK-2",
    peran: "KSBK",
    nama: "Rata-rata K1 staf bidang",
    pendek: "K1 staf",
    tipe: "turunan",
    standar: 0.85,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    aturan: "Rata-rata K1 staf di bidangnya (tanpa dirinya) ÷ 85 × 100, maksimal 100.",
  },
  {
    kode: "KSBK-3",
    peran: "KSBK",
    nama: "Laporan bidang bulanan tepat waktu",
    pendek: "Laporan bidang",
    tipe: "item",
    standar: 1,
    tenggat: 5,
    satuanTenggat: "hari_kerja",
    verifikator: "sekretariat",
    aktif: true,
    aturan: "Satu laporan per bulan, diserahkan ≤ 5 hari kerja setelah bulan berakhir dan diverifikasi Sekretariat.",
    item: {
      kegiatan: "tidak",
      masuk: null,
      selesai: { label: "Tanggal diserahkan", jenis: "tanggal" },
      field: [],
    },
  },

  // ── Staf Khusus ──
  {
    kode: "SK-TK",
    peran: "SK",
    nama: "Tugas khusus selesai tepat waktu",
    pendek: "Tugas khusus",
    tipe: "tugas",
    standar: 0.9,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    aturan: "Target = tugas khusus yang jatuh tempo bulan ini. Realisasi = selesai sebelum tenggat dan disetujui atasan.",
  },
  {
    kode: "SK-JR",
    peran: "SK",
    nama: "Jurnal diisi (tambahan)",
    pendek: "Jurnal",
    tipe: "tambahan",
    standar: 1,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: true,
    aturan: "+0,15 poin per entri jurnal bulan ini, maks. 5 poin. K1 tetap maks. 100.",
  },

  // ── Kepala Unit Pendukung: ditunda sampai setelah uji coba (Bagian 6.4) ──
  {
    kode: "KU-1",
    peran: "KU",
    nama: "Indikator Kepala Unit Pendukung (ditunda)",
    pendek: "KU",
    tipe: "item",
    standar: 0.9,
    tenggat: null,
    satuanTenggat: null,
    verifikator: "koordinator",
    aktif: false,
    aturan: "Belum aktif selama uji coba.",
  },
];

export const indikatorDari = (kode: string) => KATALOG.find((i) => i.kode === kode);

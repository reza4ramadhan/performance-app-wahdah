// Tipe domain IKP. Mengikuti entitas data di PRD Bagian 6.

export type Peran = "SBK" | "KSBK" | "KU" | "SK";

export type StatusKepegawaian = "Mutafarrigh" | "Muta'awin" | "Kontrak";

export type JabatanPimpinan = "Kepala Kantor" | "Wakil Kepala Kantor I" | "Wakil Kepala Kantor II";

export type Pegawai = {
  id: string;
  nama: string;
  status: StatusKepegawaian;
  tempatTugas: "Makassar" | "Jakarta";
  aktif: boolean;
  /** Pimpinan sementara hanya punya K2; IKP & tunjangan tidak dihitung (PRD Bagian 4). */
  pimpinan?: JabatanPimpinan;
};

export type JenisUnit = "Bidang Kerja" | "Unit Pendukung" | "Staf Khusus";

export type Unit = {
  id: string;
  nama: string;
  jenis: JenisUnit;
};

export type Penugasan = {
  id: string;
  pegawaiId: string;
  peran: Peran;
  unitId: string;
  /** Bobot alokasi tertulis Kepala Kantor (mis. 60). Kosong = rata-rata sederhana. */
  alokasi?: number;
  /** Pegawai penilai K3 / koordinator penugasan ini. */
  penilaiId?: string;
};

export type Indikator = {
  kode: string;
  peran: Peran;
  /** Kosong = berlaku untuk semua unit dengan peran ini. Diisi = khusus unit (indikator KU). */
  unitId?: string;
  nama: string;
  /** Target dalam persen (realisasi = pembilang/penyebut × 100). */
  target: number;
  sumberData: string;
  fase: 1 | 2;
  /** Indikator biner/penyebut kecil, dipantau saat kalibrasi. */
  penyebutKecil?: boolean;
  /** Sub-tugas yang diinput terpisah lalu dirata-rata (KSBK-1 (a)–(e), SK-1 dari DTR). */
  subTugas?: { kode: string; nama: string }[];
  /** Dihitung otomatis oleh mesin, bukan diinput (KSBK-2). */
  turunan?: "rata-rata-k1-staf";
  /** Butuh verifikasi Keuangan (SBK-2a/2b, KSBK-1(b)). */
  verifikasiKeuangan?: boolean;
};

export type Realisasi = {
  penugasanId: string;
  indikatorKode: string;
  subKode?: string;
  pembilang: number;
  penyebut: number;
  terverifikasi?: boolean;
  bukti?: string;
};

export type Absensi = {
  pegawaiId: string;
  hariKerjaWajib: number;
  hadir: number;
  tepatWaktu: number;
  izinSakitSah: number;
  sanksiDisiplinBerat?: boolean;
};

export const NILAI_K3 = [
  "amanah",
  "profesional",
  "kerjaSama",
  "disiplin",
  "akhlak",
  "pengembanganDiri",
] as const;

export type NilaiK3 = (typeof NILAI_K3)[number];

export const LABEL_NILAI_K3: Record<NilaiK3, string> = {
  amanah: "Amanah",
  profesional: "Profesional",
  kerjaSama: "Kerja sama",
  disiplin: "Disiplin",
  akhlak: "Akhlak",
  pengembanganDiri: "Pengembangan diri",
};

export type SkorK3 = {
  penugasanId: string;
  penilaiId: string;
  skor: Record<NilaiK3, number>;
  /** Contoh perilaku per nilai; wajib untuk skor 1, 2, 5. */
  contoh: Partial<Record<NilaiK3, string>>;
};

export type Parameter = {
  versi: string;
  bobot: { k1: number; k2: number; k3: number };
  bobotK2: { hadir: number; tepat: number };
  k4Maks: number;
  batasSkorIndikator: number;
  ambangKehadiran: number;
  plafonTunjangan: number;
  /** null = belum diputuskan (tidak ada ambang). */
  ambangIkpMinimum: number | null;
  predikat: { min: number; label: Predikat }[];
};

export type Predikat = "Sangat Baik" | "Baik" | "Cukup" | "Perlu Perbaikan" | "Kurang";

export type StatusPeriode =
  | "Draf"
  | "Dibuka"
  | "Pengumpulan bukti"
  | "Verifikasi"
  | "Diumumkan"
  | "Masa keberatan"
  | "Disahkan"
  | "Tunjangan diterbitkan";

export type InputPeriode = {
  parameter: Parameter;
  pegawai: Pegawai[];
  units: Unit[];
  penugasan: Penugasan[];
  indikator: Indikator[];
  realisasi: Realisasi[];
  absensi: Absensi[];
  skorK3: SkorK3[];
  /** pegawaiId → apakah log pengembangan diri diunggah bulan ini. */
  logPengembanganDiri: Record<string, boolean>;
  /** pegawaiId → poin K4 yang sudah disahkan. */
  k4Disahkan: Record<string, number>;
};

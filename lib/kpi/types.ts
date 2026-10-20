// Tipe domain IKP — mengikuti entitas data PRD Bagian 6.

export type Peran = "SBK" | "KSBK" | "KU" | "SK";

export const LABEL_PERAN: Record<Peran, string> = {
  SBK: "Staf Bidang Kerja",
  KSBK: "Koordinator Bidang Kerja",
  KU: "Kepala Unit",
  SK: "Staf Khusus",
};

export type Pegawai = {
  id: string;
  nama: string;
  status: "Mutafarrigh" | "Muta'awin" | "Kontrak";
  tempatTugas: "Makassar" | "Jakarta";
  aktif: boolean;
  /** Pimpinan sementara hanya punya K2; IKP & tunjangan belum dihitung (PRD Bagian 4). */
  pimpinan?: "Kepala Kantor" | "Wakil Kepala Kantor I" | "Wakil Kepala Kantor II";
};

export type Unit = {
  id: string;
  nama: string;
  jenis: "Bidang Kerja" | "Unit Pendukung" | "Staf Khusus";
};

export type Penugasan = {
  id: string;
  pegawaiId: string;
  peran: Peran;
  unitId: string;
  /** Bobot alokasi tertulis Kepala Kantor (mis. 60). Kosong = rata-rata sederhana. */
  alokasi?: number;
  /** Penilai K3 / koordinator penugasan ini. */
  penilaiId?: string;
};

export type Indikator = {
  kode: string;
  peran: Peran;
  /** Diisi bila indikator khusus satu unit (indikator KU). */
  unitId?: string;
  nama: string;
  /** Target dalam persen; realisasi = pembilang ÷ penyebut × 100. */
  target: number;
  sumberData: string;
  fase: 1 | 2;
  /** Indikator biner / penyebut kecil — dipantau saat kalibrasi. */
  penyebutKecil?: boolean;
  /** Sub-tugas diinput terpisah lalu dirata-rata (KSBK-1 (a)–(e), SK-1 dari DTR). */
  subTugas?: { kode: string; nama: string }[];
  /** Dihitung mesin dari K1 staf di unit yang sama (KSBK-2, KU-2). */
  turunan?: "rata-rata-k1-staf";
  /** Perlu verifikasi Keuangan (SBK-2a/2b, KSBK-1(b)). */
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

export const NILAI_K3 = ["amanah", "profesional", "kerjaSama", "disiplin", "akhlak", "pengembanganDiri"] as const;
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
  /** Contoh perilaku; wajib untuk skor 1, 2, 5. */
  contoh: Partial<Record<NilaiK3, string>>;
};

export type Predikat = "Sangat Baik" | "Baik" | "Cukup" | "Perlu Perbaikan" | "Kurang";
export const DAFTAR_PREDIKAT: Predikat[] = ["Sangat Baik", "Baik", "Cukup", "Perlu Perbaikan", "Kurang"];

export type Parameter = {
  versi: string;
  bobot: { k1: number; k2: number; k3: number };
  bobotK2: { hadir: number; tepat: number };
  k4Maks: number;
  batasSkorIndikator: number;
  ambangKehadiran: number;
  plafonTunjangan: number;
  /** null = belum diputuskan. */
  ambangIkpMinimum: number | null;
  /** Batas bawah tiap predikat, urut dari tertinggi. */
  predikat: { min: number; label: Predikat }[];
};

export type StatusPeriode =
  | "Draf"
  | "Dibuka"
  | "Pengumpulan bukti"
  | "Verifikasi"
  | "Diumumkan"
  | "Masa keberatan"
  | "Disahkan"
  | "Tunjangan diterbitkan";

/** Semua masukan mesin hitung untuk satu periode. */
export type InputPeriode = {
  parameter: Parameter;
  pegawai: Pegawai[];
  units: Unit[];
  penugasan: Penugasan[];
  indikator: Indikator[];
  realisasi: Realisasi[];
  absensi: Absensi[];
  skorK3: SkorK3[];
  /** pegawaiId → log pengembangan diri diunggah bulan ini. */
  logPengembanganDiri: Record<string, boolean>;
  /** pegawaiId → poin K4 yang sudah disahkan. */
  k4Disahkan: Record<string, number>;
};

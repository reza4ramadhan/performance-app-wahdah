// Kosakata domain IKP (plan.md Bagian 3, 4, 7).

export const PERAN_KERJA = ["SBK", "KSBK", "KU", "SK", "KAKAN", "WAKA"] as const;
export type PeranKerja = (typeof PERAN_KERJA)[number];

export const LABEL_PERAN_KERJA: Record<PeranKerja, string> = {
  SBK: "Staf Bidang Kerja",
  KSBK: "Koordinator Staf Bidang Kerja",
  KU: "Kepala Unit Pendukung",
  SK: "Staf Khusus",
  KAKAN: "Kepala Kantor",
  WAKA: "Wakil Kepala Kantor",
};

export const PERAN_SISTEM = ["pegawai", "koordinator", "waka", "kepala", "sekretariat", "personalia", "keuangan", "admin"] as const;
export type PeranSistem = (typeof PERAN_SISTEM)[number];

export const LABEL_PERAN_SISTEM: Record<PeranSistem, string> = {
  pegawai: "Pegawai",
  koordinator: "Koordinator",
  waka: "Wakil Kepala Kantor",
  kepala: "Kepala Kantor",
  sekretariat: "Sekretariat",
  personalia: "Personalia",
  keuangan: "Keuangan",
  admin: "Admin",
};

/** Peran fungsi yang dicentang Admin. Koordinator, WaKa, dan Kepala Kantor diturunkan dari penugasan (lib/sesi.ts). */
export const PERAN_MANUAL = ["sekretariat", "personalia", "keuangan", "admin"] as const satisfies readonly PeranSistem[];
export type PeranManual = (typeof PERAN_MANUAL)[number];

/** Peran yang melihat data seluruh kantor. */
export const PERAN_PIMPINAN: PeranSistem[] = ["waka", "kepala", "sekretariat", "admin"];

export const STATUS_ITEM = ["terbuka", "diajukan", "disetujui", "ditolak"] as const;
export type StatusItem = (typeof STATUS_ITEM)[number];

export const LABEL_STATUS_ITEM: Record<StatusItem, string> = {
  terbuka: "Terbuka",
  diajukan: "Menunggu verifikasi",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const STATUS_TUGAS = ["belum", "dikerjakan", "diajukan", "disetujui", "ditolak"] as const;
export type StatusTugas = (typeof STATUS_TUGAS)[number];

export const LABEL_STATUS_TUGAS: Record<StatusTugas, string> = {
  belum: "Belum dikerjakan",
  dikerjakan: "Sementara dikerjakan",
  diajukan: "Menunggu verifikasi",
  disetujui: "Selesai",
  ditolak: "Ditolak",
};

export const FREKUENSI_TUGAS = ["sekali", "harian", "pekanan"] as const;
export type FrekuensiTugas = (typeof FREKUENSI_TUGAS)[number];

export const LABEL_FREKUENSI_TUGAS: Record<FrekuensiTugas, string> = { sekali: "Sekali", harian: "Harian", pekanan: "Pekanan" };

export const STATUS_PERIODE =["berjalan", "verifikasi", "kalibrasi", "sementara", "disahkan"] as const;
export type StatusPeriode = (typeof STATUS_PERIODE)[number];

export const LABEL_STATUS_PERIODE: Record<StatusPeriode, string> = {
  berjalan: "Berjalan",
  verifikasi: "Verifikasi",
  kalibrasi: "Kalibrasi",
  sementara: "IKP sementara",
  disahkan: "Disahkan",
};

export const NILAI_K3 = ["akhlak", "profesional", "inovatif", "kolaboratif", "rasaMemiliki", "pengembanganDiri"] as const;
export type NilaiK3 = (typeof NILAI_K3)[number];

export const LABEL_NILAI_K3: Record<NilaiK3, string> = {
  akhlak: "Akhlak",
  profesional: "Profesional",
  inovatif: "Inovatif",
  kolaboratif: "Kolaboratif",
  rasaMemiliki: "Rasa memiliki",
  pengembanganDiri: "Pengembangan diri",
};

export type SkorK3 = Record<NilaiK3, number>;

export type Predikat = "Sangat Baik" | "Baik" | "Cukup" | "Perlu Perbaikan" | "Kurang";
export const DAFTAR_PREDIKAT: Predikat[] = ["Sangat Baik", "Baik", "Cukup", "Perlu Perbaikan", "Kurang"];

export function predikatDari(ikpAkhir: number): Predikat {
  if (ikpAkhir >= 90) return "Sangat Baik";
  if (ikpAkhir >= 80) return "Baik";
  if (ikpAkhir >= 70) return "Cukup";
  if (ikpAkhir >= 60) return "Perlu Perbaikan";
  return "Kurang";
}

/** Poin K4 per tingkat (Bagian 7). Tingkat III bisa 15 atau 20 sesuai penetapan WaKa. */
export const POIN_K4 = { I: [5], II: [10], III: [15, 20], IV: [25] } as const;
export type TingkatK4 = keyof typeof POIN_K4;
export const K4_MAKS = 25;

export const STATUS_K4 = ["diajukan", "diperiksa", "ditetapkan", "ditolak", "disahkan"] as const;
export type StatusK4 = (typeof STATUS_K4)[number];

/** Parameter rumus yang bisa berubah setelah kalibrasi. */
export const PARAMETER = {
  bobot: { k1: 0.5, k2: 0.25, k3: 0.25 },
  bobotK2: { hadir: 0.6, tepat: 0.4 },
  ambangKehadiran: 85,
  volumeKecil: 3,
  /** Poin tambahan K1 per tugas khusus selesai / per jurnal, dan batas per jenis. K1 tetap maks. 100. */
  tambahan: { poin: 0.15, maks: 5 },
  /** Pengingat kegiatan (SBK-3): pengingat ke-1 paling lambat H-6, ke-2 paling lambat H-2 (hari kalender). */
  pengingatHMinus: [6, 2],
  /** Hari kerja terakhir untuk mengisi/mengubah log ke belakang. */
  batasEditHariKerja: 2,
  /** Batas verifikasi setelah bulan berakhir. */
  batasVerifikasiHariKerja: 5,
  /** Ambang 20% pegawai penerima K4. */
  peringatanK4: 0.2,
} as const;

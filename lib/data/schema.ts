import type { HasilPegawai } from "../kpi/engine";
import type { Absensi, Indikator, Parameter, Pegawai, Penugasan, Realisasi, SkorK3, StatusPeriode, Unit } from "../kpi/types";

/** Alur bulanan (PRD Bagian 6). Status hanya maju satu langkah. */
export const URUTAN_STATUS: StatusPeriode[] = [
  "Draf",
  "Dibuka",
  "Pengumpulan bukti",
  "Verifikasi",
  "Diumumkan",
  "Masa keberatan",
  "Disahkan",
  "Tunjangan diterbitkan",
];

export const STATUS_TERKUNCI: StatusPeriode[] = ["Disahkan", "Tunjangan diterbitkan"];

export type Periode = {
  /** YYYY-MM */
  id: string;
  status: StatusPeriode;
  /** Versi parameter yang dikunci untuk periode ini. */
  parameterVersi: string;
  /** Hasil dibekukan saat disahkan. */
  hasilBeku?: HasilPegawai[];
  disahkanPada?: string;
};

/** Penugasan berlaku per periode (M1.3). */
export type PenugasanBerlaku = Penugasan & { mulai: string; selesai?: string };

type PerPeriode<T> = T & { periodeId: string };

export type LogPengembanganDiri = { pegawaiId: string; tanggal: string; judul: string; durasiMenit: number; ringkasan: string };

export type AuditEntry = {
  waktu: string;
  pelaku: string;
  aksi: string;
  periodeId?: string;
  objek: string;
  lama?: unknown;
  baru?: unknown;
  alasan?: string;
};

export type Db = {
  parameter: Parameter[];
  periode: Periode[];
  pegawai: Pegawai[];
  units: Unit[];
  penugasan: PenugasanBerlaku[];
  indikator: Indikator[];
  realisasi: PerPeriode<Realisasi>[];
  absensi: PerPeriode<Absensi>[];
  skorK3: PerPeriode<SkorK3>[];
  logPengembanganDiri: PerPeriode<LogPengembanganDiri>[];
  k4: PerPeriode<{ pegawaiId: string; poin: number }>[];
  audit: AuditEntry[];
};

import type { HasilPegawai } from "../kpi/engine";
import type {
  Absensi,
  Indikator,
  Parameter,
  Pegawai,
  Penugasan,
  Realisasi,
  SkorK3,
  StatusPeriode,
  Unit,
} from "../kpi/types";

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
  /** Format YYYY-MM. */
  id: string;
  status: StatusPeriode;
  /** Versi parameter dikunci saat periode dibuka. */
  parameterVersi: string;
  /** Hasil dibekukan saat disahkan; perubahan setelahnya hanya lewat koreksi tercatat. */
  hasilBeku?: HasilPegawai[];
  disahkanPada?: string;
};

/** Penugasan berlaku per periode (PRD M1.3). */
export type PenugasanBerlaku = Penugasan & { mulai: string; selesai?: string };

type PerPeriode<T> = T & { periodeId: string };

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
  logPengembanganDiri: PerPeriode<{ pegawaiId: string; judul: string; tanggal: string; durasiMenit: number; ringkasan: string }>[];
  k4: PerPeriode<{ pegawaiId: string; poin: number }>[];
  audit: AuditEntry[];
};

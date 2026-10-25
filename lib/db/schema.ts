// Skema basis data (plan.md Bagian 10.1). Drizzle ORM, PostgreSQL.

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SkorK3 } from "../ikp/tipe";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const dibuat = () => timestamp("dibuat_pada", { withTimezone: true }).notNull().defaultNow();
const tz = (nama: string) => timestamp(nama, { withTimezone: true });
/** numeric presisi penuh, dibaca sebagai number. */
const angka = (nama: string) => numeric(nama, { mode: "number" });

// ── Pegawai, akun, peran ──────────────────────────────────────────────────────

export const pegawai = pgTable("pegawai", {
  id: id(),
  nama: text("nama").notNull(),
  nip: text("nip").unique(),
  noHp: text("no_hp").unique(),
  statusKepegawaian: text("status_kepegawaian").notNull().default("Kontrak"),
  kantor: text("kantor", { enum: ["makassar", "jakarta"] }).notNull().default("makassar"),
  aktif: boolean("aktif").notNull().default(true),
  dibuatPada: dibuat(),
});

export const peranSistem = pgTable(
  "peran_sistem",
  {
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    /** Hanya peran fungsi; koordinator/WaKa/Kepala Kantor diturunkan dari penugasan. */
    peran: text("peran", { enum: ["sekretariat", "personalia", "keuangan", "admin"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.pegawaiId, t.peran] })],
);

// Tabel Better Auth (nama model default: user, session, account, verification, rateLimit).
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  pegawaiId: text("pegawai_id").references(() => pegawai.id, { onDelete: "cascade" }),
  harusGantiPassword: boolean("harus_ganti_password").notNull().default(true),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: tz("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: tz("access_token_expires_at"),
  refreshTokenExpiresAt: tz("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: tz("expires_at").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ── Struktur kantor ───────────────────────────────────────────────────────────

export const unit = pgTable("unit", {
  id: id(),
  jenis: text("jenis", { enum: ["kantor", "bidang", "skuo", "unit_pendukung", "staf_khusus"] }).notNull(),
  nama: text("nama").notNull(),
  indukId: text("induk_id"),
  /** WaKa yang membawahi unit ini (Bagian 13.7: ditetapkan manual oleh Admin). */
  wakaId: text("waka_id").references(() => pegawai.id),
});

export const penugasan = pgTable(
  "penugasan",
  {
    id: id(),
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    peranKerja: text("peran_kerja", { enum: ["SBK", "KSBK", "KU", "SK", "KAKAN", "WAKA"] }).notNull(),
    unitId: text("unit_id").notNull().references(() => unit.id),
    /** Verifikator item & penilai K3 penugasan ini. */
    koordinatorId: text("koordinator_id").references(() => pegawai.id),
    periodeMulai: text("periode_mulai").notNull(),
    periodeSelesai: text("periode_selesai"),
    bobotAlokasi: angka("bobot_alokasi"),
  },
  (t) => [index("penugasan_pegawai_idx").on(t.pegawaiId), index("penugasan_koordinator_idx").on(t.koordinatorId)],
);

export const periode = pgTable("periode", {
  /** YYYY-MM */
  id: text("id").primaryKey(),
  status: text("status", { enum: ["berjalan", "verifikasi", "kalibrasi", "sementara", "disahkan"] }).notNull().default("berjalan"),
  dikunciPada: tz("dikunci_pada"),
  disahkanOleh: text("disahkan_oleh").references(() => pegawai.id),
  disahkanPada: tz("disahkan_pada"),
});

export const indikator = pgTable("indikator", {
  /** Kode, mis. SBK-1. Bentuk form & cara hitung ada di lib/ikp/katalog.ts. */
  kode: text("kode").primaryKey(),
  peranKerja: text("peran_kerja").notNull(),
  nama: text("nama").notNull(),
  tipe: text("tipe", { enum: ["item", "turunan", "tugas", "tambahan"] }).notNull(),
  standarCapaian: angka("standar_capaian").notNull(),
  tenggat: integer("tenggat"),
  verifikatorPeran: text("verifikator_peran", { enum: ["koordinator", "keuangan", "sekretariat"] }).notNull(),
  fase: integer("fase").notNull().default(1),
  aktif: boolean("aktif").notNull().default(true),
});

export const hariLibur = pgTable(
  "hari_libur",
  {
    tanggal: date("tanggal").notNull(),
    keterangan: text("keterangan").notNull(),
    /** null = berlaku di semua kantor. */
    kantor: text("kantor", { enum: ["makassar", "jakarta"] }),
  },
  (t) => [uniqueIndex("hari_libur_unik").on(t.tanggal, sql`coalesce(${t.kantor}, '')`)],
);

// ── Input harian ──────────────────────────────────────────────────────────────

export const kegiatan = pgTable(
  "kegiatan",
  {
    id: id(),
    unitId: text("unit_id").notNull().references(() => unit.id),
    skuoId: text("skuo_id").references(() => unit.id),
    nama: text("nama").notNull(),
    tanggal: date("tanggal").notNull(),
    perluSpp: boolean("perlu_spp").notNull().default(false),
    perluSpb: boolean("perlu_spb").notNull().default(false),
    /** Staf penanggung jawab SPP/SPB/pengingat; null = semua SBK di unit. */
    penanggungJawabId: text("penanggung_jawab_id").references(() => pegawai.id),
    dibuatOleh: text("dibuat_oleh").notNull().references(() => pegawai.id),
    dibuatPada: dibuat(),
    sumber: text("sumber", { enum: ["manual", "impor", "salin"] }).notNull().default("manual"),
  },
  (t) => [index("kegiatan_unit_tanggal_idx").on(t.unitId, t.tanggal)],
);

export const item = pgTable(
  "item",
  {
    id: id(),
    penugasanId: text("penugasan_id").notNull().references(() => penugasan.id, { onDelete: "cascade" }),
    indikatorKode: text("indikator_kode").notNull().references(() => indikator.kode),
    kegiatanId: text("kegiatan_id").references(() => kegiatan.id),
    periodeId: text("periode_id").notNull(),
    /** Field khusus per indikator, divalidasi Zod di lib/ikp/form-item.ts. */
    data: jsonb("data").$type<Record<string, string>>().notNull().default({}),
    tglMasuk: tz("tgl_masuk").notNull(),
    tglSelesai: tz("tgl_selesai"),
    linkBukti: text("link_bukti"),
    status: text("status", { enum: ["terbuka", "diajukan", "disetujui", "ditolak"] }).notNull().default("terbuka"),
    diajukanPada: tz("diajukan_pada"),
    verifikatorId: text("verifikator_id").references(() => pegawai.id),
    diverifikasiPada: tz("diverifikasi_pada"),
    alasanTolak: text("alasan_tolak"),
    dibuatOleh: text("dibuat_oleh").notNull().references(() => pegawai.id),
    dibuatPada: dibuat(),
    /** ID dari perangkat untuk mencegah item ganda saat draf luring dikirim ulang. */
    idKlien: text("id_klien").unique(),
  },
  (t) => [index("item_penugasan_periode_idx").on(t.penugasanId, t.periodeId), index("item_status_idx").on(t.status)],
);

export const jurnal = pgTable(
  "jurnal",
  {
    id: id(),
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    tanggal: date("tanggal").notNull(),
    uraian: text("uraian").notNull(),
    unitId: text("unit_id").references(() => unit.id),
    pemberiTugas: text("pemberi_tugas"),
    link: text("link"),
    dibuatPada: dibuat(),
  },
  (t) => [index("jurnal_pegawai_tanggal_idx").on(t.pegawaiId, t.tanggal)],
);

export const pengembanganDiri = pgTable(
  "pengembangan_diri",
  {
    id: id(),
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    tanggal: date("tanggal").notNull(),
    judul: text("judul").notNull(),
    durasiMenit: integer("durasi_menit").notNull(),
    ringkasan: text("ringkasan").notNull(),
    dibuatPada: dibuat(),
  },
  (t) => [index("pd_pegawai_tanggal_idx").on(t.pegawaiId, t.tanggal)],
);

/** Tugas dari koordinator penugasan kepada staf (SBK / Staf Khusus), sekali atau berulang. */
export const tugasKhusus = pgTable(
  "tugas_khusus",
  {
    id: id(),
    penugasanId: text("penugasan_id").notNull().references(() => penugasan.id, { onDelete: "cascade" }),
    judul: text("judul").notNull(),
    uraian: text("uraian"),
    frekuensi: text("frekuensi", { enum: ["sekali", "harian", "pekanan"] }).notNull(),
    tanggalMulai: date("tanggal_mulai").notNull(),
    /** Sama dengan tanggal mulai untuk tugas sekali. */
    tanggalAkhir: date("tanggal_akhir").notNull(),
    /** "HH:MM" di zona kantor staf. */
    jamTenggat: text("jam_tenggat").notNull(),
    dibuatOleh: text("dibuat_oleh").notNull().references(() => pegawai.id),
    dibuatPada: dibuat(),
  },
  (t) => [index("tugas_khusus_penugasan_idx").on(t.penugasanId)],
);

/** Satu kejadian tugas khusus (satu untuk tugas sekali, satu per hari kerja / pekan untuk tugas berulang). */
export const tugasKhususJadwal = pgTable(
  "tugas_khusus_jadwal",
  {
    id: id(),
    tugasId: text("tugas_id").notNull().references(() => tugasKhusus.id, { onDelete: "cascade" }),
    periodeId: text("periode_id").notNull(),
    tenggat: tz("tenggat").notNull(),
    status: text("status", { enum: ["belum", "dikerjakan", "diajukan", "disetujui", "ditolak"] }).notNull().default("belum"),
    persen: integer("persen").notNull().default(0),
    catatan: text("catatan"),
    linkBukti: text("link_bukti"),
    /** Waktu staf menandai selesai (waktu server). */
    selesaiPada: tz("selesai_pada"),
    verifikatorId: text("verifikator_id").references(() => pegawai.id),
    diverifikasiPada: tz("diverifikasi_pada"),
    alasanTolak: text("alasan_tolak"),
    diubahPada: tz("diubah_pada"),
  },
  (t) => [index("tugas_jadwal_tugas_idx").on(t.tugasId), index("tugas_jadwal_periode_idx").on(t.periodeId, t.status)],
);

// ── Penilaian ─────────────────────────────────────────────────────────────────

export const catatanPerilaku = pgTable("catatan_perilaku", {
  id: id(),
  penilaiId: text("penilai_id").notNull().references(() => pegawai.id),
  pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
  tanggal: date("tanggal").notNull(),
  nilaiK3: text("nilai_k3"),
  catatan: text("catatan").notNull(),
  dibuatPada: dibuat(),
});

export const penilaianK3 = pgTable(
  "penilaian_k3",
  {
    id: id(),
    periodeId: text("periode_id").notNull(),
    /** Satu penilaian per pegawai per penilai, walau penilai itu mengoordinasikan beberapa penugasannya. */
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    penilaiId: text("penilai_id").notNull().references(() => pegawai.id),
    skor: jsonb("skor").$type<SkorK3>().notNull(),
    contoh: jsonb("contoh").$type<Partial<Record<keyof SkorK3, string>>>().notNull().default({}),
    status: text("status", { enum: ["draf", "dikirim", "dikembalikan"] }).notNull().default("draf"),
    catatanKalibrasi: text("catatan_kalibrasi"),
    diubahPada: tz("diubah_pada").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("k3_pegawai_unik").on(t.periodeId, t.pegawaiId, t.penilaiId)],
);

export const absensi = pgTable(
  "absensi",
  {
    periodeId: text("periode_id").notNull(),
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    hariKerjaWajib: integer("hari_kerja_wajib").notNull(),
    hadir: integer("hadir").notNull(),
    hadirTepatWaktu: integer("hadir_tepat_waktu").notNull(),
    izinSakit: integer("izin_sakit").notNull().default(0),
    sanksiBerat: boolean("sanksi_berat").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.periodeId, t.pegawaiId] })],
);

export const k4Pengajuan = pgTable("k4_pengajuan", {
  id: id(),
  periodeId: text("periode_id").notNull(),
  judul: text("judul").notNull(),
  uraian: text("uraian"),
  tingkatUsulan: text("tingkat_usulan", { enum: ["I", "II", "III", "IV"] }).notNull(),
  tingkatDitetapkan: text("tingkat_ditetapkan", { enum: ["I", "II", "III", "IV"] }),
  /** Poin bersih setelah dikurangi poin tingkat sebelumnya untuk inovasi yang sama. */
  poin: integer("poin"),
  linkBukti: text("link_bukti").notNull(),
  /** Amanah pengusul yang terkait; atasannya yang memeriksa. Kosong untuk pengajuan sebelum aturan rangkap. */
  penugasanId: text("penugasan_id").references(() => penugasan.id, { onDelete: "set null" }),
  /** Pengajuan terdahulu untuk inovasi yang sama (naik tingkat). */
  inovasiIndukId: text("inovasi_induk_id"),
  status: text("status", { enum: ["diajukan", "diperiksa", "ditetapkan", "ditolak", "disahkan"] }).notNull().default("diajukan"),
  catatan: text("catatan"),
  diajukanOleh: text("diajukan_oleh").notNull().references(() => pegawai.id),
  dibuatPada: dibuat(),
});

export const k4Pengusul = pgTable(
  "k4_pengusul",
  {
    k4Id: text("k4_id").notNull().references(() => k4Pengajuan.id, { onDelete: "cascade" }),
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.k4Id, t.pegawaiId] })],
);

export const ujiPetikArsip = pgTable(
  "uji_petik_arsip",
  {
    id: id(),
    periodeId: text("periode_id").notNull(),
    unitId: text("unit_id").notNull().references(() => unit.id),
    jumlahDiuji: integer("jumlah_diuji").notNull(),
    jumlahSesuai: integer("jumlah_sesuai").notNull(),
    catatan: text("catatan"),
    dibuatOleh: text("dibuat_oleh").notNull().references(() => pegawai.id),
    dibuatPada: dibuat(),
  },
  (t) => [uniqueIndex("uji_petik_unik").on(t.periodeId, t.unitId)],
);

/** Snapshot IKP saat periode dikunci (sementara) dan disahkan. */
export const hasilIkp = pgTable(
  "hasil_ikp",
  {
    periodeId: text("periode_id").notNull(),
    pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
    rincian: jsonb("rincian").notNull(),
    k1: angka("k1"),
    k2: angka("k2"),
    k3: angka("k3"),
    k4: angka("k4"),
    ikp: angka("ikp"),
    ikpAkhir: angka("ikp_akhir"),
    predikat: text("predikat"),
    syaratMinimum: boolean("syarat_minimum").notNull(),
    versi: text("versi", { enum: ["sementara", "akhir"] }).notNull(),
    dihitungPada: tz("dihitung_pada").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.periodeId, t.pegawaiId] })],
);

// ── Infrastruktur ─────────────────────────────────────────────────────────────

export const pushSubscription = pgTable("push_subscription", {
  id: id(),
  pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
  dibuatPada: dibuat(),
});

/** Izin Admin untuk mengubah log lebih dari 2 hari kerja ke belakang (Bagian 5.1). */
export const bukaKunci = pgTable("buka_kunci", {
  id: id(),
  pegawaiId: text("pegawai_id").notNull().references(() => pegawai.id, { onDelete: "cascade" }),
  dariTanggal: date("dari_tanggal").notNull(),
  berlakuSampai: tz("berlaku_sampai").notNull(),
  alasan: text("alasan").notNull(),
  olehId: text("oleh_id").notNull().references(() => pegawai.id),
  dibuatPada: dibuat(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    aktorId: text("aktor_id"),
    aksi: text("aksi").notNull(),
    entitas: text("entitas").notNull(),
    entitasId: text("entitas_id"),
    sebelum: jsonb("sebelum"),
    sesudah: jsonb("sesudah"),
    alasan: text("alasan"),
    waktu: tz("waktu").notNull().defaultNow(),
  },
  (t) => [index("audit_entitas_idx").on(t.entitas, t.entitasId)],
);

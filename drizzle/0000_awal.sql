CREATE TABLE "absensi" (
	"periode_id" text NOT NULL,
	"pegawai_id" text NOT NULL,
	"hari_kerja_wajib" integer NOT NULL,
	"hadir" integer NOT NULL,
	"hadir_tepat_waktu" integer NOT NULL,
	"izin_sakit" integer DEFAULT 0 NOT NULL,
	"sanksi_berat" boolean DEFAULT false NOT NULL,
	CONSTRAINT "absensi_periode_id_pegawai_id_pk" PRIMARY KEY("periode_id","pegawai_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"aktor_id" text,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text,
	"sebelum" jsonb,
	"sesudah" jsonb,
	"alasan" text,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buka_kunci" (
	"id" text PRIMARY KEY NOT NULL,
	"pegawai_id" text NOT NULL,
	"dari_tanggal" date NOT NULL,
	"berlaku_sampai" timestamp with time zone NOT NULL,
	"alasan" text NOT NULL,
	"oleh_id" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catatan_perilaku" (
	"id" text PRIMARY KEY NOT NULL,
	"penilai_id" text NOT NULL,
	"pegawai_id" text NOT NULL,
	"tanggal" date NOT NULL,
	"nilai_k3" text,
	"catatan" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dtr_cek" (
	"id" text PRIMARY KEY NOT NULL,
	"dtr_tugas_id" text NOT NULL,
	"tanggal" date NOT NULL,
	"selesai" boolean DEFAULT true NOT NULL,
	"disetujui" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dtr_tugas" (
	"id" text PRIMARY KEY NOT NULL,
	"penugasan_id" text NOT NULL,
	"periode_id" text NOT NULL,
	"uraian" text NOT NULL,
	"frekuensi" text NOT NULL,
	"disetujui_oleh" text,
	"disetujui_pada" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hari_libur" (
	"tanggal" date NOT NULL,
	"keterangan" text NOT NULL,
	"kantor" text
);
--> statement-breakpoint
CREATE TABLE "hasil_ikp" (
	"periode_id" text NOT NULL,
	"pegawai_id" text NOT NULL,
	"rincian" jsonb NOT NULL,
	"k1" numeric,
	"k2" numeric,
	"k3" numeric,
	"k4" numeric,
	"ikp" numeric,
	"ikp_akhir" numeric,
	"predikat" text,
	"syarat_minimum" boolean NOT NULL,
	"versi" text NOT NULL,
	"dihitung_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hasil_ikp_periode_id_pegawai_id_pk" PRIMARY KEY("periode_id","pegawai_id")
);
--> statement-breakpoint
CREATE TABLE "indikator" (
	"kode" text PRIMARY KEY NOT NULL,
	"peran_kerja" text NOT NULL,
	"nama" text NOT NULL,
	"tipe" text NOT NULL,
	"standar_capaian" numeric NOT NULL,
	"tenggat" integer,
	"verifikator_peran" text NOT NULL,
	"fase" integer DEFAULT 1 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" text PRIMARY KEY NOT NULL,
	"penugasan_id" text NOT NULL,
	"indikator_kode" text NOT NULL,
	"kegiatan_id" text,
	"periode_id" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tgl_masuk" timestamp with time zone NOT NULL,
	"tgl_selesai" timestamp with time zone,
	"link_bukti" text,
	"status" text DEFAULT 'terbuka' NOT NULL,
	"diajukan_pada" timestamp with time zone,
	"verifikator_id" text,
	"diverifikasi_pada" timestamp with time zone,
	"alasan_tolak" text,
	"dibuat_oleh" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"id_klien" text,
	CONSTRAINT "item_id_klien_unique" UNIQUE("id_klien")
);
--> statement-breakpoint
CREATE TABLE "jurnal" (
	"id" text PRIMARY KEY NOT NULL,
	"pegawai_id" text NOT NULL,
	"tanggal" date NOT NULL,
	"uraian" text NOT NULL,
	"unit_id" text,
	"pemberi_tugas" text,
	"link" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "k4_pengajuan" (
	"id" text PRIMARY KEY NOT NULL,
	"periode_id" text NOT NULL,
	"judul" text NOT NULL,
	"uraian" text,
	"tingkat_usulan" text NOT NULL,
	"tingkat_ditetapkan" text,
	"poin" integer,
	"link_bukti" text NOT NULL,
	"inovasi_induk_id" text,
	"status" text DEFAULT 'diajukan' NOT NULL,
	"catatan" text,
	"diajukan_oleh" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "k4_pengusul" (
	"k4_id" text NOT NULL,
	"pegawai_id" text NOT NULL,
	CONSTRAINT "k4_pengusul_k4_id_pegawai_id_pk" PRIMARY KEY("k4_id","pegawai_id")
);
--> statement-breakpoint
CREATE TABLE "kegiatan" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"skuo_id" text,
	"nama" text NOT NULL,
	"tanggal" date NOT NULL,
	"perlu_spp" boolean DEFAULT false NOT NULL,
	"perlu_spb" boolean DEFAULT false NOT NULL,
	"penanggung_jawab_id" text,
	"dibuat_oleh" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"sumber" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pegawai" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"nip" text,
	"no_hp" text,
	"status_kepegawaian" text DEFAULT 'Kontrak' NOT NULL,
	"kantor" text DEFAULT 'makassar' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pegawai_nip_unique" UNIQUE("nip"),
	CONSTRAINT "pegawai_no_hp_unique" UNIQUE("no_hp")
);
--> statement-breakpoint
CREATE TABLE "pengembangan_diri" (
	"id" text PRIMARY KEY NOT NULL,
	"pegawai_id" text NOT NULL,
	"tanggal" date NOT NULL,
	"judul" text NOT NULL,
	"durasi_menit" integer NOT NULL,
	"ringkasan" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penilaian_k3" (
	"id" text PRIMARY KEY NOT NULL,
	"periode_id" text NOT NULL,
	"penugasan_id" text NOT NULL,
	"penilai_id" text NOT NULL,
	"skor" jsonb NOT NULL,
	"contoh" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draf' NOT NULL,
	"catatan_kalibrasi" text,
	"diubah_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penugasan" (
	"id" text PRIMARY KEY NOT NULL,
	"pegawai_id" text NOT NULL,
	"peran_kerja" text NOT NULL,
	"unit_id" text NOT NULL,
	"koordinator_id" text,
	"periode_mulai" text NOT NULL,
	"periode_selesai" text,
	"bobot_alokasi" numeric
);
--> statement-breakpoint
CREATE TABLE "peran_sistem" (
	"pegawai_id" text NOT NULL,
	"peran" text NOT NULL,
	CONSTRAINT "peran_sistem_pegawai_id_peran_pk" PRIMARY KEY("pegawai_id","peran")
);
--> statement-breakpoint
CREATE TABLE "periode" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'berjalan' NOT NULL,
	"dikunci_pada" timestamp with time zone,
	"disahkan_oleh" text,
	"disahkan_pada" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"pegawai_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "uji_petik_arsip" (
	"id" text PRIMARY KEY NOT NULL,
	"periode_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"jumlah_diuji" integer NOT NULL,
	"jumlah_sesuai" integer NOT NULL,
	"catatan" text,
	"dibuat_oleh" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" text PRIMARY KEY NOT NULL,
	"jenis" text NOT NULL,
	"nama" text NOT NULL,
	"induk_id" text,
	"waka_id" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"pegawai_id" text,
	"harus_ganti_password" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buka_kunci" ADD CONSTRAINT "buka_kunci_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buka_kunci" ADD CONSTRAINT "buka_kunci_oleh_id_pegawai_id_fk" FOREIGN KEY ("oleh_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catatan_perilaku" ADD CONSTRAINT "catatan_perilaku_penilai_id_pegawai_id_fk" FOREIGN KEY ("penilai_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catatan_perilaku" ADD CONSTRAINT "catatan_perilaku_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dtr_cek" ADD CONSTRAINT "dtr_cek_dtr_tugas_id_dtr_tugas_id_fk" FOREIGN KEY ("dtr_tugas_id") REFERENCES "public"."dtr_tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dtr_tugas" ADD CONSTRAINT "dtr_tugas_penugasan_id_penugasan_id_fk" FOREIGN KEY ("penugasan_id") REFERENCES "public"."penugasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dtr_tugas" ADD CONSTRAINT "dtr_tugas_disetujui_oleh_pegawai_id_fk" FOREIGN KEY ("disetujui_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hasil_ikp" ADD CONSTRAINT "hasil_ikp_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_penugasan_id_penugasan_id_fk" FOREIGN KEY ("penugasan_id") REFERENCES "public"."penugasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_indikator_kode_indikator_kode_fk" FOREIGN KEY ("indikator_kode") REFERENCES "public"."indikator"("kode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_kegiatan_id_kegiatan_id_fk" FOREIGN KEY ("kegiatan_id") REFERENCES "public"."kegiatan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_verifikator_id_pegawai_id_fk" FOREIGN KEY ("verifikator_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal" ADD CONSTRAINT "jurnal_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal" ADD CONSTRAINT "jurnal_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "k4_pengajuan" ADD CONSTRAINT "k4_pengajuan_diajukan_oleh_pegawai_id_fk" FOREIGN KEY ("diajukan_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "k4_pengusul" ADD CONSTRAINT "k4_pengusul_k4_id_k4_pengajuan_id_fk" FOREIGN KEY ("k4_id") REFERENCES "public"."k4_pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "k4_pengusul" ADD CONSTRAINT "k4_pengusul_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_skuo_id_unit_id_fk" FOREIGN KEY ("skuo_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_penanggung_jawab_id_pegawai_id_fk" FOREIGN KEY ("penanggung_jawab_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengembangan_diri" ADD CONSTRAINT "pengembangan_diri_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penilaian_k3" ADD CONSTRAINT "penilaian_k3_penugasan_id_penugasan_id_fk" FOREIGN KEY ("penugasan_id") REFERENCES "public"."penugasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penilaian_k3" ADD CONSTRAINT "penilaian_k3_penilai_id_pegawai_id_fk" FOREIGN KEY ("penilai_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penugasan" ADD CONSTRAINT "penugasan_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penugasan" ADD CONSTRAINT "penugasan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penugasan" ADD CONSTRAINT "penugasan_koordinator_id_pegawai_id_fk" FOREIGN KEY ("koordinator_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peran_sistem" ADD CONSTRAINT "peran_sistem_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periode" ADD CONSTRAINT "periode_disahkan_oleh_pegawai_id_fk" FOREIGN KEY ("disahkan_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uji_petik_arsip" ADD CONSTRAINT "uji_petik_arsip_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uji_petik_arsip" ADD CONSTRAINT "uji_petik_arsip_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_waka_id_pegawai_id_fk" FOREIGN KEY ("waka_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entitas_idx" ON "audit_log" USING btree ("entitas","entitas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dtr_cek_unik" ON "dtr_cek" USING btree ("dtr_tugas_id","tanggal");--> statement-breakpoint
CREATE UNIQUE INDEX "hari_libur_unik" ON "hari_libur" USING btree ("tanggal",coalesce("kantor", ''));--> statement-breakpoint
CREATE INDEX "item_penugasan_periode_idx" ON "item" USING btree ("penugasan_id","periode_id");--> statement-breakpoint
CREATE INDEX "item_status_idx" ON "item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jurnal_pegawai_tanggal_idx" ON "jurnal" USING btree ("pegawai_id","tanggal");--> statement-breakpoint
CREATE INDEX "kegiatan_unit_tanggal_idx" ON "kegiatan" USING btree ("unit_id","tanggal");--> statement-breakpoint
CREATE INDEX "pd_pegawai_tanggal_idx" ON "pengembangan_diri" USING btree ("pegawai_id","tanggal");--> statement-breakpoint
CREATE UNIQUE INDEX "k3_unik" ON "penilaian_k3" USING btree ("periode_id","penugasan_id","penilai_id");--> statement-breakpoint
CREATE INDEX "penugasan_pegawai_idx" ON "penugasan" USING btree ("pegawai_id");--> statement-breakpoint
CREATE INDEX "penugasan_koordinator_idx" ON "penugasan" USING btree ("koordinator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uji_petik_unik" ON "uji_petik_arsip" USING btree ("periode_id","unit_id");
CREATE TABLE "tugas_khusus" (
	"id" text PRIMARY KEY NOT NULL,
	"penugasan_id" text NOT NULL,
	"judul" text NOT NULL,
	"uraian" text,
	"frekuensi" text NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_akhir" date NOT NULL,
	"jam_tenggat" text NOT NULL,
	"dibuat_oleh" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tugas_khusus_jadwal" (
	"id" text PRIMARY KEY NOT NULL,
	"tugas_id" text NOT NULL,
	"periode_id" text NOT NULL,
	"tenggat" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'belum' NOT NULL,
	"persen" integer DEFAULT 0 NOT NULL,
	"catatan" text,
	"link_bukti" text,
	"selesai_pada" timestamp with time zone,
	"verifikator_id" text,
	"diverifikasi_pada" timestamp with time zone,
	"alasan_tolak" text,
	"diubah_pada" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tugas_khusus" ADD CONSTRAINT "tugas_khusus_penugasan_id_penugasan_id_fk" FOREIGN KEY ("penugasan_id") REFERENCES "public"."penugasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_khusus" ADD CONSTRAINT "tugas_khusus_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_khusus_jadwal" ADD CONSTRAINT "tugas_khusus_jadwal_tugas_id_tugas_khusus_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas_khusus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_khusus_jadwal" ADD CONSTRAINT "tugas_khusus_jadwal_verifikator_id_pegawai_id_fk" FOREIGN KEY ("verifikator_id") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tugas_khusus_penugasan_idx" ON "tugas_khusus" USING btree ("penugasan_id");--> statement-breakpoint
CREATE INDEX "tugas_jadwal_tugas_idx" ON "tugas_khusus_jadwal" USING btree ("tugas_id");--> statement-breakpoint
CREATE INDEX "tugas_jadwal_periode_idx" ON "tugas_khusus_jadwal" USING btree ("periode_id","status");--> statement-breakpoint
-- Revisi K1: SPP/SPB diverifikasi KSBK (Keuangan menyusul); pengingat memakai tenggat H-6 & H-2 tetap.
UPDATE "indikator" SET "verifikator_peran" = 'koordinator' WHERE "kode" IN ('SBK-2a', 'SBK-2b');--> statement-breakpoint
UPDATE "indikator" SET "tenggat" = NULL WHERE "kode" = 'SBK-3';--> statement-breakpoint
-- Indikator Staf Khusus lama (DTR, kejadian, layanan) diganti Tugas Khusus.
DELETE FROM "item" WHERE "indikator_kode" IN ('SK-1', 'SK-2', 'SK-3');--> statement-breakpoint
DELETE FROM "indikator" WHERE "kode" IN ('SK-1', 'SK-2', 'SK-3');

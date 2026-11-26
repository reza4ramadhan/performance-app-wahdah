CREATE TABLE "plot_skuo" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"skuo_id" text NOT NULL,
	"pegawai_id" text NOT NULL,
	"utama" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"berlaku_mulai" date NOT NULL,
	"dibuat_oleh" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "pending_dana_sejak" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "dana_cair_pada" date;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "dana_cair_oleh" text;--> statement-breakpoint
ALTER TABLE "jurnal" ADD COLUMN "durasi_menit" integer;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD COLUMN "status" text DEFAULT 'jalan' NOT NULL;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD COLUMN "tanggal_rencana" date;--> statement-breakpoint
ALTER TABLE "kegiatan" ADD COLUMN "alasan_batal" text;--> statement-breakpoint
ALTER TABLE "penugasan" ADD COLUMN "wakil" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "pola_kerja" text;--> statement-breakpoint
ALTER TABLE "plot_skuo" ADD CONSTRAINT "plot_skuo_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plot_skuo" ADD CONSTRAINT "plot_skuo_skuo_id_unit_id_fk" FOREIGN KEY ("skuo_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plot_skuo" ADD CONSTRAINT "plot_skuo_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plot_skuo" ADD CONSTRAINT "plot_skuo_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plot_skuo_unit_idx" ON "plot_skuo" USING btree ("unit_id","skuo_id");--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_dana_cair_oleh_pegawai_id_fk" FOREIGN KEY ("dana_cair_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Rombak v2 (docs/rombak-v2/rencana-implementasi.md 1.1): peran Sekretariat dilebur ke Admin.
INSERT INTO "peran_sistem" ("pegawai_id", "peran") SELECT "pegawai_id", 'admin' FROM "peran_sistem" WHERE "peran" = 'sekretariat' ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "peran_sistem" WHERE "peran" = 'sekretariat';--> statement-breakpoint
UPDATE "indikator" SET "verifikator_peran" = 'admin' WHERE "verifikator_peran" = 'sekretariat';--> statement-breakpoint
-- 1.2: pola kerja unit. Bidang & SKUO = administrasi (A–M); unit pendukung & staf khusus = rutin (N–R).
UPDATE "unit" SET "pola_kerja" = 'administrasi' WHERE "jenis" IN ('bidang', 'skuo');--> statement-breakpoint
UPDATE "unit" SET "pola_kerja" = 'rutin' WHERE "jenis" IN ('unit_pendukung', 'staf_khusus');

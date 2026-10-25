CREATE TABLE "usulan_tugas" (
	"id" text PRIMARY KEY NOT NULL,
	"penugasan_id" text NOT NULL,
	"kelompok" text NOT NULL,
	"judul" text NOT NULL,
	"uraian" text,
	"frekuensi" text NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_akhir" date NOT NULL,
	"jam_tenggat" text NOT NULL,
	"status" text DEFAULT 'diajukan' NOT NULL,
	"alasan_tolak" text,
	"diputus_oleh" text,
	"diputus_pada" timestamp with time zone,
	"tugas_id" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usulan_tugas" ADD CONSTRAINT "usulan_tugas_penugasan_id_penugasan_id_fk" FOREIGN KEY ("penugasan_id") REFERENCES "public"."penugasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usulan_tugas" ADD CONSTRAINT "usulan_tugas_diputus_oleh_pegawai_id_fk" FOREIGN KEY ("diputus_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usulan_tugas" ADD CONSTRAINT "usulan_tugas_tugas_id_tugas_khusus_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas_khusus"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usulan_tugas_penugasan_idx" ON "usulan_tugas" USING btree ("penugasan_id","status");
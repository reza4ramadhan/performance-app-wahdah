CREATE TABLE "absensi_hari" (
	"pegawai_id" text NOT NULL,
	"tanggal" date NOT NULL,
	"jenis" text NOT NULL,
	"diunggah_oleh" text,
	CONSTRAINT "absensi_hari_pegawai_id_tanggal_pk" PRIMARY KEY("pegawai_id","tanggal")
);
--> statement-breakpoint
CREATE TABLE "set_tugas" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"nama" text NOT NULL,
	"ganti_hari_jam" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_oleh" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_tugas_item" (
	"id" text PRIMARY KEY NOT NULL,
	"set_tugas_id" text NOT NULL,
	"judul" text NOT NULL,
	"uraian" text,
	"frekuensi" text NOT NULL,
	"hari" integer,
	"jam_tenggat" text NOT NULL,
	"link_wajib" boolean DEFAULT false NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"asal_id" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_tugas_staf" (
	"id" text PRIMARY KEY NOT NULL,
	"penugasan_id" text NOT NULL,
	"set_tugas_id" text,
	"pekan_mulai" date NOT NULL,
	"dibuat_oleh" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tugas_khusus" ADD COLUMN "set_tugas_item_id" text;--> statement-breakpoint
ALTER TABLE "usulan_tugas" ADD COLUMN "set_tugas_id" text;--> statement-breakpoint
ALTER TABLE "usulan_tugas" ADD COLUMN "hari" integer;--> statement-breakpoint
ALTER TABLE "absensi_hari" ADD CONSTRAINT "absensi_hari_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi_hari" ADD CONSTRAINT "absensi_hari_diunggah_oleh_pegawai_id_fk" FOREIGN KEY ("diunggah_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_tugas" ADD CONSTRAINT "set_tugas_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_tugas" ADD CONSTRAINT "set_tugas_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_tugas_item" ADD CONSTRAINT "set_tugas_item_set_tugas_id_set_tugas_id_fk" FOREIGN KEY ("set_tugas_id") REFERENCES "public"."set_tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_tugas_staf" ADD CONSTRAINT "set_tugas_staf_penugasan_id_penugasan_id_fk" FOREIGN KEY ("penugasan_id") REFERENCES "public"."penugasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_tugas_staf" ADD CONSTRAINT "set_tugas_staf_set_tugas_id_set_tugas_id_fk" FOREIGN KEY ("set_tugas_id") REFERENCES "public"."set_tugas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_tugas_staf" ADD CONSTRAINT "set_tugas_staf_dibuat_oleh_pegawai_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."pegawai"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "set_tugas_item_set_idx" ON "set_tugas_item" USING btree ("set_tugas_id");--> statement-breakpoint
CREATE INDEX "set_tugas_staf_pn_idx" ON "set_tugas_staf" USING btree ("penugasan_id","pekan_mulai");
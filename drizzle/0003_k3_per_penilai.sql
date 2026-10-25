-- K3 kini satu penilaian per pegawai per penilai (rangkap jabatan tidak dinilai dua kali).
ALTER TABLE "penilaian_k3" ADD COLUMN "pegawai_id" text;--> statement-breakpoint
UPDATE "penilaian_k3" k SET "pegawai_id" = p."pegawai_id" FROM "penugasan" p WHERE p."id" = k."penugasan_id";--> statement-breakpoint
-- Penilai yang sama untuk beberapa penugasan satu pegawai: simpan yang terakhir diubah.
DELETE FROM "penilaian_k3" k USING "penilaian_k3" b
WHERE k."periode_id" = b."periode_id" AND k."pegawai_id" = b."pegawai_id" AND k."penilai_id" = b."penilai_id"
  AND (k."diubah_pada" < b."diubah_pada" OR (k."diubah_pada" = b."diubah_pada" AND k."id" < b."id"));--> statement-breakpoint
ALTER TABLE "penilaian_k3" ALTER COLUMN "pegawai_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "penilaian_k3" ADD CONSTRAINT "penilaian_k3_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Koordinator, WaKa, dan Kepala Kantor kini diturunkan dari penugasan.
DELETE FROM "peran_sistem" WHERE "peran" IN ('pegawai', 'koordinator', 'waka', 'kepala');

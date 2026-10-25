ALTER TABLE "penilaian_k3" DROP CONSTRAINT "penilaian_k3_penugasan_id_penugasan_id_fk";
--> statement-breakpoint
DROP INDEX "k3_unik";--> statement-breakpoint
CREATE UNIQUE INDEX "k3_pegawai_unik" ON "penilaian_k3" USING btree ("periode_id","pegawai_id","penilai_id");--> statement-breakpoint
ALTER TABLE "penilaian_k3" DROP COLUMN "penugasan_id";
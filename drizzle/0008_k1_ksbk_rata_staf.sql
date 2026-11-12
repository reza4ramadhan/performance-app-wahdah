-- K1 KSBK = rata-rata K1 staf (KSBK-2). Pengendalian (KSBK-1) dan laporan bidang (KSBK-3) dinonaktifkan;
-- Admin bisa mengaktifkannya lagi lewat menu Indikator.
UPDATE "indikator" SET "aktif" = false WHERE "kode" IN ('KSBK-1', 'KSBK-3');

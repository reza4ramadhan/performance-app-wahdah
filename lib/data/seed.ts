import { KATALOG_AWAL } from "../kpi/katalog";
import { PARAMETER_DRAF_3 } from "../kpi/parameter";
import type { NilaiK3 } from "../kpi/types";
import type { Db } from "./schema";

// Data contoh untuk pengembangan. Nama-nama fiktif; data asli diimpor dari lembar Nama STRUKTUR KPWI.

const skor = (amanah: number, profesional: number, kerjaSama: number, disiplin: number, akhlak: number, pengembanganDiri: number): Record<NilaiK3, number> => ({
  amanah, profesional, kerjaSama, disiplin, akhlak, pengembanganDiri,
});

const P = "2026-10";

export function seed(): Db {
  return {
    parameter: [PARAMETER_DRAF_3],
    periode: [{ id: P, status: "Pengumpulan bukti", parameterVersi: PARAMETER_DRAF_3.versi }],
    units: [
      { id: "bk1", nama: "Bidang 1", jenis: "Bidang Kerja" },
      { id: "bk2", nama: "Bidang 2", jenis: "Bidang Kerja" },
      { id: "setjen", nama: "Kesetjenan", jenis: "Bidang Kerja" },
      { id: "lu", nama: "Layanan Umum", jenis: "Unit Pendukung" },
      { id: "sk", nama: "Staf Khusus Keamanan", jenis: "Staf Khusus" },
    ],
    pegawai: [
      { id: "kk", nama: "Contoh Kepala Kantor", status: "Mutafarrigh", tempatTugas: "Makassar", aktif: true, pimpinan: "Kepala Kantor" },
      { id: "wk1", nama: "Contoh Wakil Kepala I", status: "Mutafarrigh", tempatTugas: "Makassar", aktif: true, pimpinan: "Wakil Kepala Kantor I" },
      { id: "p01", nama: "Ahmad Contoh", status: "Mutafarrigh", tempatTugas: "Makassar", aktif: true },
      { id: "p02", nama: "Budi Contoh", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
      { id: "p03", nama: "Citra Contoh", status: "Muta'awin", tempatTugas: "Makassar", aktif: true },
      { id: "p04", nama: "Dani Contoh", status: "Mutafarrigh", tempatTugas: "Jakarta", aktif: true },
      { id: "p05", nama: "Eka Contoh", status: "Kontrak", tempatTugas: "Jakarta", aktif: true },
      { id: "p06", nama: "Fajar Contoh", status: "Mutafarrigh", tempatTugas: "Makassar", aktif: true },
      { id: "p07", nama: "Gita Contoh", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
      { id: "p08", nama: "Hasan Contoh", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
    ],
    penugasan: [
      { id: "t01", pegawaiId: "p01", peran: "KSBK", unitId: "bk1", penilaiId: "wk1", mulai: P },
      { id: "t02", pegawaiId: "p02", peran: "SBK", unitId: "bk1", penilaiId: "p01", mulai: P },
      { id: "t03", pegawaiId: "p03", peran: "SBK", unitId: "bk1", penilaiId: "p01", mulai: P, alokasi: 60 },
      { id: "t04", pegawaiId: "p03", peran: "SBK", unitId: "bk2", penilaiId: "p04", mulai: P, alokasi: 40 },
      { id: "t05", pegawaiId: "p04", peran: "KSBK", unitId: "bk2", penilaiId: "wk1", mulai: P },
      { id: "t06", pegawaiId: "p05", peran: "SBK", unitId: "bk2", penilaiId: "p04", mulai: P },
      { id: "t07", pegawaiId: "p06", peran: "KU", unitId: "lu", penilaiId: "wk1", mulai: P },
      { id: "t08", pegawaiId: "p07", peran: "SBK", unitId: "lu", penilaiId: "p06", mulai: P },
      { id: "t09", pegawaiId: "p08", peran: "SK", unitId: "sk", penilaiId: "p06", mulai: P },
    ],
    indikator: KATALOG_AWAL,
    realisasi: [
      // Budi (SBK Bidang 1)
      { periodeId: P, penugasanId: "t02", indikatorKode: "SBK-1", pembilang: 9, penyebut: 10 },
      { periodeId: P, penugasanId: "t02", indikatorKode: "SBK-2a", pembilang: 2, penyebut: 2, terverifikasi: true },
      { periodeId: P, penugasanId: "t02", indikatorKode: "SBK-2b", pembilang: 5, penyebut: 6, terverifikasi: true },
      { periodeId: P, penugasanId: "t02", indikatorKode: "SBK-3", pembilang: 14, penyebut: 15 },
      { periodeId: P, penugasanId: "t02", indikatorKode: "SBK-4", pembilang: 0, penyebut: 0 },
      { periodeId: P, penugasanId: "t02", indikatorKode: "SBK-5", pembilang: 18, penyebut: 20 },
      // Citra (rangkap Bidang 1 & 2)
      { periodeId: P, penugasanId: "t03", indikatorKode: "SBK-1", pembilang: 8, penyebut: 10 },
      { periodeId: P, penugasanId: "t03", indikatorKode: "SBK-3", pembilang: 9, penyebut: 10 },
      { periodeId: P, penugasanId: "t04", indikatorKode: "SBK-1", pembilang: 4, penyebut: 4 },
      { periodeId: P, penugasanId: "t04", indikatorKode: "SBK-5", pembilang: 7, penyebut: 10 },
      // Ahmad (KSBK Bidang 1)
      { periodeId: P, penugasanId: "t01", indikatorKode: "KSBK-1", subKode: "a", pembilang: 1, penyebut: 1 },
      { periodeId: P, penugasanId: "t01", indikatorKode: "KSBK-1", subKode: "b", pembilang: 85, penyebut: 100, terverifikasi: false },
      { periodeId: P, penugasanId: "t01", indikatorKode: "KSBK-1", subKode: "c", pembilang: 3, penyebut: 4 },
      { periodeId: P, penugasanId: "t01", indikatorKode: "KSBK-1", subKode: "d", pembilang: 5, penyebut: 5 },
      { periodeId: P, penugasanId: "t01", indikatorKode: "KSBK-1", subKode: "e", pembilang: 2, penyebut: 2 },
      { periodeId: P, penugasanId: "t01", indikatorKode: "KSBK-3", pembilang: 1, penyebut: 1 },
      // Eka (SBK Bidang 2)
      { periodeId: P, penugasanId: "t06", indikatorKode: "SBK-1", pembilang: 6, penyebut: 10 },
      { periodeId: P, penugasanId: "t06", indikatorKode: "SBK-3", pembilang: 5, penyebut: 8 },
      // Gita (staf Layanan Umum)
      { periodeId: P, penugasanId: "t08", indikatorKode: "SBK-1", pembilang: 10, penyebut: 10 },
      { periodeId: P, penugasanId: "t08", indikatorKode: "SBK-5", pembilang: 19, penyebut: 20 },
      // Fajar (KU Layanan Umum)
      { periodeId: P, penugasanId: "t07", indikatorKode: "KU-1", pembilang: 27, penyebut: 30 },
      { periodeId: P, penugasanId: "t07", indikatorKode: "KU-3", pembilang: 1, penyebut: 1 },
      // Hasan (Staf Khusus)
      { periodeId: P, penugasanId: "t09", indikatorKode: "SK-1", subKode: "1", pembilang: 30, penyebut: 31 },
      { periodeId: P, penugasanId: "t09", indikatorKode: "SK-1", subKode: "2", pembilang: 28, penyebut: 31 },
      { periodeId: P, penugasanId: "t09", indikatorKode: "SK-1", subKode: "3", pembilang: 31, penyebut: 31 },
      { periodeId: P, penugasanId: "t09", indikatorKode: "SK-2", pembilang: 0, penyebut: 0 },
      { periodeId: P, penugasanId: "t09", indikatorKode: "SK-3", pembilang: 58, penyebut: 62 },
    ],
    absensi: [
      { periodeId: P, pegawaiId: "kk", hariKerjaWajib: 22, hadir: 21, tepatWaktu: 20, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "wk1", hariKerjaWajib: 22, hadir: 22, tepatWaktu: 21, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "p01", hariKerjaWajib: 22, hadir: 21, tepatWaktu: 19, izinSakitSah: 1 },
      { periodeId: P, pegawaiId: "p02", hariKerjaWajib: 22, hadir: 20, tepatWaktu: 17, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "p03", hariKerjaWajib: 22, hadir: 19, tepatWaktu: 19, izinSakitSah: 2 },
      { periodeId: P, pegawaiId: "p04", hariKerjaWajib: 22, hadir: 22, tepatWaktu: 22, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "p05", hariKerjaWajib: 22, hadir: 17, tepatWaktu: 12, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "p06", hariKerjaWajib: 22, hadir: 21, tepatWaktu: 20, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "p07", hariKerjaWajib: 22, hadir: 22, tepatWaktu: 21, izinSakitSah: 0 },
      { periodeId: P, pegawaiId: "p08", hariKerjaWajib: 26, hadir: 25, tepatWaktu: 25, izinSakitSah: 0 },
    ],
    skorK3: [
      { periodeId: P, penugasanId: "t01", penilaiId: "wk1", skor: skor(4, 4, 4, 4, 4, 3), contoh: {} },
      { periodeId: P, penugasanId: "t02", penilaiId: "p01", skor: skor(4, 4, 3, 4, 4, 3), contoh: {} },
      { periodeId: P, penugasanId: "t03", penilaiId: "p01", skor: skor(5, 4, 4, 4, 4, 4), contoh: { amanah: "Mengembalikan sisa kas kegiatan tanpa diminta." } },
      { periodeId: P, penugasanId: "t04", penilaiId: "p04", skor: skor(4, 4, 4, 3, 4, 3), contoh: {} },
      { periodeId: P, penugasanId: "t05", penilaiId: "wk1", skor: skor(4, 5, 4, 4, 4, 4), contoh: { profesional: "Menyusun SOP bidang yang dipakai bidang lain." } },
      { periodeId: P, penugasanId: "t06", penilaiId: "p04", skor: skor(3, 3, 3, 2, 3, 3), contoh: { disiplin: "Tiga kali terlambat menyerahkan laporan pekanan." } },
      { periodeId: P, penugasanId: "t07", penilaiId: "wk1", skor: skor(4, 4, 4, 4, 4, 4), contoh: {} },
      { periodeId: P, penugasanId: "t08", penilaiId: "p06", skor: skor(4, 4, 5, 4, 4, 4), contoh: { kerjaSama: "Membantu bidang lain menyiapkan acara di luar jam kerja." } },
      // t09 (Hasan) sengaja belum dinilai.
    ],
    logPengembanganDiri: [
      { periodeId: P, pegawaiId: "p01", judul: "Kajian manajemen organisasi", tanggal: "2026-10-08", durasiMenit: 90, ringkasan: "Materi delegasi tugas." },
      { periodeId: P, pegawaiId: "p03", judul: "Pelatihan Excel lanjutan", tanggal: "2026-10-14", durasiMenit: 120, ringkasan: "Pivot table untuk rekap." },
      { periodeId: P, pegawaiId: "p04", judul: "Webinar tata kelola arsip", tanggal: "2026-10-10", durasiMenit: 60, ringkasan: "Klasifikasi arsip digital." },
      { periodeId: P, pegawaiId: "p06", judul: "Kursus K3 gedung", tanggal: "2026-10-21", durasiMenit: 180, ringkasan: "Prosedur evakuasi." },
      { periodeId: P, pegawaiId: "p07", judul: "Membaca buku pelayanan prima", tanggal: "2026-10-05", durasiMenit: 120, ringkasan: "Standar layanan tamu." },
    ],
    k4: [{ periodeId: P, pegawaiId: "p04", poin: 5 }],
    audit: [],
  };
}

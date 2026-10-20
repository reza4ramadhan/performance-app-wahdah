import { KATALOG_AWAL } from "../kpi/katalog";
import { PARAMETER_DRAF_3 } from "../kpi/parameter";
import type { NilaiK3 } from "../kpi/types";
import type { Db } from "./schema";

// Data contoh untuk pengembangan. Semua nama fiktif; data asli diimpor dari lembar Nama STRUKTUR KPWI (M1.1).

const P = "2026-10";

const k3 = (a: number, p: number, ks: number, d: number, ak: number, pd: number): Record<NilaiK3, number> => ({
  amanah: a, profesional: p, kerjaSama: ks, disiplin: d, akhlak: ak, pengembanganDiri: pd,
});

const r = (penugasanId: string, indikatorKode: string, pembilang: number, penyebut: number, extra: { subKode?: string; terverifikasi?: boolean } = {}) => ({
  periodeId: P, penugasanId, indikatorKode, pembilang, penyebut, ...extra,
});

const abs = (pegawaiId: string, hariKerjaWajib: number, hadir: number, tepatWaktu: number, izinSakitSah = 0) => ({
  periodeId: P, pegawaiId, hariKerjaWajib, hadir, tepatWaktu, izinSakitSah,
});

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
      // Budi — SBK Bidang 1
      r("t02", "SBK-1", 9, 10), r("t02", "SBK-2a", 2, 2, { terverifikasi: true }), r("t02", "SBK-2b", 5, 6, { terverifikasi: true }),
      r("t02", "SBK-3", 14, 15), r("t02", "SBK-4", 0, 0), r("t02", "SBK-5", 18, 20),
      // Citra — rangkap Bidang 1 (60%) & Bidang 2 (40%)
      r("t03", "SBK-1", 8, 10), r("t03", "SBK-3", 9, 10), r("t04", "SBK-1", 4, 4), r("t04", "SBK-5", 7, 10),
      // Ahmad — KSBK Bidang 1
      r("t01", "KSBK-1", 1, 1, { subKode: "a" }), r("t01", "KSBK-1", 85, 100, { subKode: "b", terverifikasi: false }),
      r("t01", "KSBK-1", 3, 4, { subKode: "c" }), r("t01", "KSBK-1", 5, 5, { subKode: "d" }), r("t01", "KSBK-1", 2, 2, { subKode: "e" }),
      r("t01", "KSBK-3", 1, 1),
      // Eka — SBK Bidang 2
      r("t06", "SBK-1", 6, 10), r("t06", "SBK-3", 5, 8),
      // Gita — staf Layanan Umum; Fajar — KU Layanan Umum
      r("t08", "SBK-1", 10, 10), r("t08", "SBK-5", 19, 20), r("t07", "KU-1", 27, 30), r("t07", "KU-3", 1, 1),
      // Hasan — Staf Khusus
      r("t09", "SK-1", 30, 31, { subKode: "1" }), r("t09", "SK-1", 28, 31, { subKode: "2" }), r("t09", "SK-1", 31, 31, { subKode: "3" }),
      r("t09", "SK-2", 0, 0), r("t09", "SK-3", 58, 62),
    ],
    absensi: [
      abs("kk", 22, 21, 20), abs("wk1", 22, 22, 21), abs("p01", 22, 21, 19, 1), abs("p02", 22, 20, 17), abs("p03", 22, 19, 19, 2),
      abs("p04", 22, 22, 22), abs("p05", 22, 17, 12), abs("p06", 22, 21, 20), abs("p07", 22, 22, 21), abs("p08", 26, 25, 25),
    ],
    skorK3: [
      { periodeId: P, penugasanId: "t01", penilaiId: "wk1", skor: k3(4, 4, 4, 4, 4, 3), contoh: {} },
      { periodeId: P, penugasanId: "t02", penilaiId: "p01", skor: k3(4, 4, 3, 4, 4, 3), contoh: {} },
      { periodeId: P, penugasanId: "t03", penilaiId: "p01", skor: k3(5, 4, 4, 4, 4, 4), contoh: { amanah: "Mengembalikan sisa kas kegiatan tanpa diminta." } },
      { periodeId: P, penugasanId: "t04", penilaiId: "p04", skor: k3(4, 4, 4, 3, 4, 3), contoh: {} },
      { periodeId: P, penugasanId: "t05", penilaiId: "wk1", skor: k3(4, 5, 4, 4, 4, 4), contoh: { profesional: "Menyusun SOP bidang yang dipakai bidang lain." } },
      { periodeId: P, penugasanId: "t06", penilaiId: "p04", skor: k3(3, 3, 3, 2, 3, 3), contoh: { disiplin: "Tiga kali terlambat menyerahkan laporan pekanan." } },
      { periodeId: P, penugasanId: "t07", penilaiId: "wk1", skor: k3(4, 4, 4, 4, 4, 4), contoh: {} },
      { periodeId: P, penugasanId: "t08", penilaiId: "p06", skor: k3(4, 4, 5, 4, 4, 4), contoh: { kerjaSama: "Membantu bidang lain menyiapkan acara di luar jam kerja." } },
      // t09 (Hasan) sengaja belum dinilai.
    ],
    logPengembanganDiri: [
      { periodeId: P, pegawaiId: "p01", tanggal: "2026-10-08", judul: "Kajian manajemen organisasi", durasiMenit: 90, ringkasan: "Delegasi tugas." },
      { periodeId: P, pegawaiId: "p03", tanggal: "2026-10-14", judul: "Pelatihan Excel lanjutan", durasiMenit: 120, ringkasan: "Pivot table untuk rekap." },
      { periodeId: P, pegawaiId: "p04", tanggal: "2026-10-10", judul: "Webinar tata kelola arsip", durasiMenit: 60, ringkasan: "Klasifikasi arsip digital." },
      { periodeId: P, pegawaiId: "p06", tanggal: "2026-10-21", judul: "Kursus K3 gedung", durasiMenit: 180, ringkasan: "Prosedur evakuasi." },
      { periodeId: P, pegawaiId: "p07", tanggal: "2026-10-05", judul: "Buku pelayanan prima", durasiMenit: 120, ringkasan: "Standar layanan tamu." },
    ],
    k4: [{ periodeId: P, pegawaiId: "p04", poin: 5 }],
    audit: [],
  };
}

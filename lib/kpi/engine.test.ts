import { describe, expect, it } from "vitest";
import { hitungK2, hitungPeriode, tentukanPredikat, validasiSkorK3 } from "./engine";
import { PARAMETER_DRAF_3 as P } from "./parameter";
import type { Indikator, InputPeriode, NilaiK3, SkorK3 } from "./types";

const semua = (v: number): Record<NilaiK3, number> => ({
  amanah: v, profesional: v, kerjaSama: v, disiplin: v, akhlak: v, pengembanganDiri: v,
});

const KATALOG: Indikator[] = [
  { kode: "A", peran: "SBK", nama: "A", target: 100, sumberData: "-", fase: 1 },
  { kode: "B", peran: "SBK", nama: "B", target: 80, sumberData: "-", fase: 1 },
  { kode: "F2", peran: "SBK", nama: "Fase 2", target: 100, sumberData: "-", fase: 2 },
  { kode: "K-1", peran: "KSBK", nama: "K", target: 100, sumberData: "-", fase: 1 },
  { kode: "K-2", peran: "KSBK", nama: "Rata staf", target: 100, sumberData: "-", fase: 1, turunan: "rata-rata-k1-staf" },
  {
    kode: "K-S", peran: "KSBK", nama: "Sub", target: 100, sumberData: "-", fase: 1,
    subTugas: [{ kode: "a", nama: "a" }, { kode: "b", nama: "b" }, { kode: "c", nama: "c" }],
  },
];

function dasar(): InputPeriode {
  return {
    parameter: P,
    pegawai: [
      { id: "s1", nama: "Staf 1", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
      { id: "s2", nama: "Staf 2", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
      { id: "k", nama: "Koordinator", status: "Mutafarrigh", tempatTugas: "Makassar", aktif: true },
      { id: "x", nama: "Nonaktif", status: "Kontrak", tempatTugas: "Jakarta", aktif: false },
    ],
    units: [
      { id: "b1", nama: "Bidang 1", jenis: "Bidang Kerja" },
      { id: "b2", nama: "Bidang 2", jenis: "Bidang Kerja" },
    ],
    penugasan: [
      { id: "p-s1", pegawaiId: "s1", peran: "SBK", unitId: "b1", penilaiId: "k" },
      { id: "p-s2", pegawaiId: "s2", peran: "SBK", unitId: "b1", penilaiId: "k" },
      { id: "p-k", pegawaiId: "k", peran: "KSBK", unitId: "b1", penilaiId: "s1" },
    ],
    indikator: KATALOG,
    realisasi: [
      { penugasanId: "p-s1", indikatorKode: "A", pembilang: 9, penyebut: 10 }, // 90
      { penugasanId: "p-s1", indikatorKode: "B", pembilang: 9, penyebut: 10 }, // 90/80 → dibatasi 100
      { penugasanId: "p-s2", indikatorKode: "A", pembilang: 7, penyebut: 10 }, // 70
      { penugasanId: "p-s2", indikatorKode: "B", pembilang: 0, penyebut: 0 }, // penyebut nol
      { penugasanId: "p-k", indikatorKode: "K-1", pembilang: 8, penyebut: 10 }, // 80
    ],
    absensi: [
      { pegawaiId: "s1", hariKerjaWajib: 22, hadir: 20, tepatWaktu: 18, izinSakitSah: 2 }, // hadir 100, tepat 90 → 96
      { pegawaiId: "s2", hariKerjaWajib: 22, hadir: 17, tepatWaktu: 17, izinSakitSah: 0 }, // hadir 77,27
      { pegawaiId: "k", hariKerjaWajib: 20, hadir: 20, tepatWaktu: 20, izinSakitSah: 0 },
    ],
    skorK3: [
      { penugasanId: "p-s1", penilaiId: "k", skor: semua(4), contoh: {} },
      { penugasanId: "p-s2", penilaiId: "k", skor: semua(3), contoh: {} },
      { penugasanId: "p-k", penilaiId: "s1", skor: semua(4), contoh: {} },
    ],
    logPengembanganDiri: { s1: true, s2: true, k: true },
    k4Disahkan: { s1: 5 },
  };
}

const cari = (inp: InputPeriode, id: string) => hitungPeriode(inp).find((h) => h.pegawaiId === id)!;

describe("hitungPeriode", () => {
  it("menghitung K1–K4, IKP, predikat, dan tunjangan sesuai rumus", () => {
    const s1 = cari(dasar(), "s1");
    expect(s1.k1).toBeCloseTo(95);
    expect(s1.k2).toBeCloseTo(96);
    expect(s1.k3).toBeCloseTo(80);
    expect(s1.ikp).toBeCloseTo(91.5); // 47,5 + 24 + 20
    expect(s1.ikpAkhir).toBeCloseTo(96.5);
    expect(s1.predikat).toBe("Sangat Baik");
    expect(s1.tunjangan).toBe(1_447_500);
  });

  it("melewati pegawai nonaktif dan indikator Fase 2", () => {
    const hasil = hitungPeriode(dasar());
    expect(hasil.some((h) => h.pegawaiId === "x")).toBe(false);
    expect(hasil[0].penugasan[0].indikator.some((i) => i.kode === "F2")).toBe(false);
  });

  it("mengeluarkan indikator berpenyebut nol dari rata-rata K1", () => {
    const s2 = cari(dasar(), "s2");
    expect(s2.k1).toBeCloseTo(70);
    expect(s2.penugasan[0].indikator.find((i) => i.kode === "B")).toMatchObject({ dikecualikan: true, alasan: "Penyebut nol" });
  });

  it("menggugurkan tunjangan bila kehadiran < 85% atau ada sanksi berat", () => {
    expect(cari(dasar(), "s2")).toMatchObject({ tunjangan: 0, syarat: { lolos: false } });
    const inp = dasar();
    inp.absensi[0].sanksiDisiplinBerat = true;
    expect(cari(inp, "s1").syarat.alasan).toContain("Ada sanksi disiplin berat");
  });

  it("menerapkan ambang IKP minimum bila diisi", () => {
    const inp = dasar();
    inp.parameter = { ...P, ambangIkpMinimum: 97 };
    expect(cari(inp, "s1").tunjangan).toBe(0);
  });

  it("KSBK-2 = rata-rata K1 staf di bidangnya, tanpa K1 KSBK itu sendiri", () => {
    const inp = dasar();
    inp.penugasan.push({ id: "p-k-staf", pegawaiId: "k", peran: "SBK", unitId: "b1", penilaiId: "s1" });
    inp.realisasi.push({ penugasanId: "p-k-staf", indikatorKode: "A", pembilang: 1, penyebut: 10 });
    const k = cari(inp, "k");
    const ksbk = k.penugasan.find((p) => p.peran === "KSBK")!;
    expect(ksbk.indikator.find((i) => i.kode === "K-2")!.realisasi).toBeCloseTo(82.5); // (95 + 70) / 2
    expect(ksbk.k1).toBeCloseTo((80 + 82.5) / 2);
  });

  it("sub-tugas dirata-rata, yang kosong dikecualikan", () => {
    const inp = dasar();
    inp.realisasi.push(
      { penugasanId: "p-k", indikatorKode: "K-S", subKode: "a", pembilang: 1, penyebut: 1 },
      { penugasanId: "p-k", indikatorKode: "K-S", subKode: "b", pembilang: 1, penyebut: 2 },
    );
    const ks = cari(inp, "k").penugasan[0].indikator.find((i) => i.kode === "K-S")!;
    expect(ks.skor).toBeCloseTo(75);
    expect(ks.sub![2].dikecualikan).toBe(true);
  });

  it("K1 gabungan memakai alokasi tertulis; K3 dirata-rata dari semua koordinator", () => {
    const inp = dasar();
    inp.penugasan[0].alokasi = 60;
    inp.penugasan.push({ id: "p-s1-b2", pegawaiId: "s1", peran: "SBK", unitId: "b2", penilaiId: "k", alokasi: 40 });
    inp.realisasi.push({ penugasanId: "p-s1-b2", indikatorKode: "A", pembilang: 5, penyebut: 10 });
    inp.skorK3.push({ penugasanId: "p-s1-b2", penilaiId: "k", skor: semua(3), contoh: {} });
    const s1 = cari(inp, "s1");
    expect(s1.k1).toBeCloseTo(0.6 * 95 + 0.4 * 50);
    expect(s1.k3).toBeCloseTo(70);
  });

  it("membatasi pengembangan diri 2 tanpa log", () => {
    const inp = dasar();
    inp.logPengembanganDiri.s1 = false;
    expect(cari(inp, "s1").k3).toBeCloseTo(((4 * 5 + 2) / 6) * 20);
  });

  it("membatasi K4 pada 25 dan tunjangan pada IKP Akhir 100", () => {
    const inp = dasar();
    inp.k4Disahkan.s1 = 40;
    expect(cari(inp, "s1")).toMatchObject({ k4: 25, tunjangan: 1_500_000 });
    expect(cari(inp, "s1").ikpAkhir).toBeCloseTo(116.5);
  });

  it("pimpinan hanya mendapat K2", () => {
    const inp = dasar();
    inp.pegawai[2].pimpinan = "Kepala Kantor";
    expect(cari(inp, "k")).toMatchObject({ hanyaK2: true, k2: 100, ikp: null, tunjangan: null });
  });

  it("tidak menghitung IKP bila K3 atau absensi belum ada", () => {
    const inp = dasar();
    inp.skorK3 = inp.skorK3.filter((s) => s.penugasanId !== "p-s1");
    inp.absensi = inp.absensi.filter((a) => a.pegawaiId !== "s1");
    const s1 = cari(inp, "s1");
    expect(s1.ikp).toBeNull();
    expect(s1.kekurangan).toEqual(["Rekap absensi belum diunggah", "Skor K3 belum lengkap dari semua koordinator"]);
  });

  it("mengabaikan skor K3 yang tidak sah", () => {
    const inp = dasar();
    inp.skorK3[0] = { ...inp.skorK3[0], skor: semua(5) };
    const s1 = cari(inp, "s1");
    expect(s1.k3).toBeNull();
    expect(s1.peringatan).toContain("Skor K3 tidak sah dan diabaikan.");
  });
});

describe("aturan pendukung", () => {
  it("pita predikat", () => {
    expect([90, 89.99, 80, 70, 60, 59.99].map((n) => tentukanPredikat(n, P))).toEqual([
      "Sangat Baik", "Baik", "Baik", "Cukup", "Perlu Perbaikan", "Kurang",
    ]);
  });

  it("izin/sakit sah keluar dari penyebut kehadiran", () => {
    expect(hitungK2({ pegawaiId: "x", hariKerjaWajib: 22, hadir: 19, tepatWaktu: 19, izinSakitSah: 3 }, P)!.hadirPersen).toBe(100);
    expect(hitungK2({ pegawaiId: "x", hariKerjaWajib: 2, hadir: 0, tepatWaktu: 0, izinSakitSah: 2 }, P)).toBeNull();
  });

  it("skor K3 1/2/5 wajib contoh; penilai ≠ yang dinilai", () => {
    const s: SkorK3 = { penugasanId: "p", penilaiId: "a", skor: { ...semua(3), amanah: 5 }, contoh: {} };
    expect(validasiSkorK3(s, "b")).toHaveLength(1);
    expect(validasiSkorK3({ ...s, contoh: { amanah: "Mengembalikan uang lebih" } }, "b")).toHaveLength(0);
    expect(validasiSkorK3({ ...s, contoh: { amanah: "x" } }, "a")).toEqual(["Penilai tidak boleh menilai dirinya sendiri."]);
  });
});

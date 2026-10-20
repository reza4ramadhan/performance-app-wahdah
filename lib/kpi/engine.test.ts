import { describe, expect, it } from "vitest";
import { hitungK2, hitungPeriode, tentukanPredikat, validasiSkorK3 } from "./engine";
import { PARAMETER_DRAF_3 as P } from "./parameter";
import type { Indikator, InputPeriode, NilaiK3, SkorK3 } from "./types";

const semua = (v: number): Record<NilaiK3, number> => ({
  amanah: v, profesional: v, kerjaSama: v, disiplin: v, akhlak: v, pengembanganDiri: v,
});

const IND: Indikator[] = [
  { kode: "A", peran: "SBK", nama: "A", target: 100, sumberData: "-", fase: 1 },
  { kode: "B", peran: "SBK", nama: "B", target: 80, sumberData: "-", fase: 1 },
  { kode: "K-1", peran: "KSBK", nama: "K", target: 100, sumberData: "-", fase: 1 },
  { kode: "K-2", peran: "KSBK", nama: "Rata staf", target: 100, sumberData: "-", fase: 1, turunan: "rata-rata-k1-staf" },
];

function dasar(): InputPeriode {
  return {
    parameter: P,
    pegawai: [
      { id: "s1", nama: "Staf 1", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
      { id: "s2", nama: "Staf 2", status: "Kontrak", tempatTugas: "Makassar", aktif: true },
      { id: "k", nama: "Koordinator", status: "Mutafarrigh", tempatTugas: "Makassar", aktif: true },
    ],
    units: [{ id: "b1", nama: "Bidang 1", jenis: "Bidang Kerja" }, { id: "b2", nama: "Bidang 2", jenis: "Bidang Kerja" }],
    penugasan: [
      { id: "p-s1", pegawaiId: "s1", peran: "SBK", unitId: "b1", penilaiId: "k" },
      { id: "p-s2", pegawaiId: "s2", peran: "SBK", unitId: "b1", penilaiId: "k" },
      { id: "p-k", pegawaiId: "k", peran: "KSBK", unitId: "b1", penilaiId: "s1" },
    ],
    indikator: IND,
    realisasi: [
      { penugasanId: "p-s1", indikatorKode: "A", pembilang: 9, penyebut: 10 }, // 90
      { penugasanId: "p-s1", indikatorKode: "B", pembilang: 9, penyebut: 10 }, // 90/80 → 100 (batas)
      { penugasanId: "p-s2", indikatorKode: "A", pembilang: 7, penyebut: 10 }, // 70
      { penugasanId: "p-s2", indikatorKode: "B", pembilang: 0, penyebut: 0 }, // penyebut nol → keluar
      { penugasanId: "p-k", indikatorKode: "K-1", pembilang: 8, penyebut: 10 }, // 80
    ],
    absensi: [
      { pegawaiId: "s1", hariKerjaWajib: 22, hadir: 20, tepatWaktu: 18, izinSakitSah: 2 }, // hadir 100, tepat 90 → K2 96
      { pegawaiId: "s2", hariKerjaWajib: 22, hadir: 17, tepatWaktu: 17, izinSakitSah: 0 }, // hadir 77,27 → gugur
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

const cari = (h: ReturnType<typeof hitungPeriode>, id: string) => h.find((x) => x.pegawaiId === id)!;

describe("mesin hitung IKP", () => {
  it("menghitung IKP, IKP Akhir, predikat, dan tunjangan sesuai rumus", () => {
    const s1 = cari(hitungPeriode(dasar()), "s1");
    expect(s1.k1).toBeCloseTo(95); // (90 + 100) / 2
    expect(s1.k2).toBeCloseTo(96); // 0,6×100 + 0,4×90
    expect(s1.k3).toBeCloseTo(80); // 4 × 20
    expect(s1.ikp).toBeCloseTo(91.5); // 47,5 + 24 + 20
    expect(s1.ikpAkhir).toBeCloseTo(96.5);
    expect(s1.predikat).toBe("Sangat Baik");
    expect(s1.tunjangan).toBe(1_447_500);
  });

  it("mengeluarkan indikator berpenyebut nol dari rata-rata K1", () => {
    const s2 = cari(hitungPeriode(dasar()), "s2");
    expect(s2.k1).toBeCloseTo(70);
    expect(s2.penugasan[0].indikator.find((i) => i.kode === "B")!.dikecualikan).toBe(true);
  });

  it("menggugurkan tunjangan bila kehadiran < 85%", () => {
    const s2 = cari(hitungPeriode(dasar()), "s2");
    expect(s2.syarat.lolos).toBe(false);
    expect(s2.tunjangan).toBe(0);
  });

  it("KSBK-2 = rata-rata K1 staf di bidangnya, dihitung setelah staf", () => {
    const k = cari(hitungPeriode(dasar()), "k");
    const k2 = k.penugasan[0].indikator.find((i) => i.kode === "K-2")!;
    expect(k2.realisasi).toBeCloseTo(82.5); // (95 + 70) / 2
    expect(k.k1).toBeCloseTo((80 + 82.5) / 2);
  });

  it("KSBK-2 tidak memasukkan K1 KSBK itu sendiri bila ia juga staf di bidang yang sama", () => {
    const inp = dasar();
    inp.penugasan.push({ id: "p-k-staf", pegawaiId: "k", peran: "SBK", unitId: "b1", penilaiId: "s1" });
    inp.realisasi.push({ penugasanId: "p-k-staf", indikatorKode: "A", pembilang: 1, penyebut: 10 });
    const k = cari(hitungPeriode(inp), "k");
    const k2 = k.penugasan.find((p) => p.peran === "KSBK")!.indikator.find((i) => i.kode === "K-2")!;
    expect(k2.realisasi).toBeCloseTo(82.5);
  });

  it("K1 gabungan memakai alokasi tertulis bila ada", () => {
    const inp = dasar();
    inp.penugasan.push({ id: "p-s1-b2", pegawaiId: "s1", peran: "SBK", unitId: "b2", penilaiId: "k", alokasi: 40 });
    inp.penugasan[0].alokasi = 60;
    inp.realisasi.push({ penugasanId: "p-s1-b2", indikatorKode: "A", pembilang: 5, penyebut: 10 });
    inp.skorK3.push({ penugasanId: "p-s1-b2", penilaiId: "k", skor: semua(3), contoh: {} });
    const s1 = cari(hitungPeriode(inp), "s1");
    expect(s1.k1).toBeCloseTo(0.6 * 95 + 0.4 * 50);
    expect(s1.k3).toBeCloseTo((80 + 60) / 2);
  });

  it("membatasi skor pengembangan diri 2 bila log tidak diunggah", () => {
    const inp = dasar();
    inp.logPengembanganDiri.s1 = false;
    const s1 = cari(hitungPeriode(inp), "s1");
    expect(s1.k3).toBeCloseTo(((4 * 5 + 2) / 6) * 20);
  });

  it("membatasi tunjangan pada IKP Akhir 100 dan K4 pada 25", () => {
    const inp = dasar();
    inp.k4Disahkan.s1 = 40;
    const s1 = cari(hitungPeriode(inp), "s1");
    expect(s1.k4).toBe(25);
    expect(s1.ikpAkhir).toBeCloseTo(116.5);
    expect(s1.tunjangan).toBe(1_500_000);
  });

  it("pimpinan hanya mendapat K2, tanpa IKP dan tunjangan", () => {
    const inp = dasar();
    inp.pegawai[2].pimpinan = "Kepala Kantor";
    const k = cari(hitungPeriode(inp), "k");
    expect(k.k2).toBeCloseTo(100);
    expect(k.ikp).toBeNull();
    expect(k.tunjangan).toBeNull();
  });

  it("tidak menghitung IKP bila K3 belum lengkap", () => {
    const inp = dasar();
    inp.skorK3 = inp.skorK3.filter((s) => s.penugasanId !== "p-s1");
    const s1 = cari(hitungPeriode(inp), "s1");
    expect(s1.ikp).toBeNull();
    expect(s1.kekurangan.length).toBeGreaterThan(0);
  });
});

describe("aturan pendukung", () => {
  it("pita predikat", () => {
    expect(tentukanPredikat(90, P)).toBe("Sangat Baik");
    expect(tentukanPredikat(89.99, P)).toBe("Baik");
    expect(tentukanPredikat(70, P)).toBe("Cukup");
    expect(tentukanPredikat(60, P)).toBe("Perlu Perbaikan");
    expect(tentukanPredikat(59.99, P)).toBe("Kurang");
  });

  it("izin/sakit sah dikeluarkan dari penyebut kehadiran", () => {
    expect(hitungK2({ pegawaiId: "x", hariKerjaWajib: 22, hadir: 19, tepatWaktu: 19, izinSakitSah: 3 }, P)!.hadirPersen).toBe(100);
  });

  it("skor K3 1, 2, 5 wajib contoh perilaku dan penilai ≠ yang dinilai", () => {
    const s: SkorK3 = { penugasanId: "p", penilaiId: "a", skor: { ...semua(3), amanah: 5 }, contoh: {} };
    expect(validasiSkorK3(s, "b")).toHaveLength(1);
    expect(validasiSkorK3({ ...s, contoh: { amanah: "Mengembalikan uang lebih" } }, "b")).toHaveLength(0);
    expect(validasiSkorK3({ ...s, contoh: { amanah: "x" } }, "a")).toHaveLength(1);
  });
});

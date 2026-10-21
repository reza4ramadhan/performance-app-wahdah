import { describe, expect, it } from "vitest";
import { hitungIkp, hitungK2, hitungK3, poinK4Bersih, type MasukanIkp } from "./hitung";
import { hitungK1, paramDefault, skorIndikator, type ItemK1, type KonteksK1 } from "./k1";
import { predikatDari, type SkorK3 } from "./tipe";
import { keUtc } from "../waktu";

const w = (tgl: string, jam = "10:00") => keUtc(tgl, "makassar", jam);
const semua = (v: number): SkorK3 => ({ akhlak: v, profesional: v, inovatif: v, kolaboratif: v, rasaMemiliki: v, pengembanganDiri: v });

let n = 0;
function item(p: Partial<ItemK1> & Pick<ItemK1, "penugasanId" | "indikatorKode">): ItemK1 {
  return { id: `i${n++}`, kegiatanId: null, masuk: w("2026-10-01"), selesai: null, status: "terbuka", diajukanPada: null, diverifikasiPada: null, dibuatPada: w("2026-10-01"), ...p };
}
const setuju = (tglMasuk: string, tglSelesai: string, tglVerif = tglSelesai) => ({
  masuk: w(tglMasuk),
  selesai: w(tglSelesai),
  status: "disetujui" as const,
  diajukanPada: w(tglSelesai),
  diverifikasiPada: w(tglVerif),
});

/** Bidang b1: A & B staf SBK, K koordinator (KSBK). S staf khusus. Oktober 2026, "hari ini" 21 Okt. */
function konteks(): KonteksK1 {
  return {
    periode: "2026-10",
    sekarang: w("2026-10-21", "12:00"),
    batasVerifikasi: null,
    libur: () => new Set<string>(),
    param: paramDefault(),
    penugasan: [
      { id: "pA", pegawaiId: "A", peran: "SBK", unitId: "b1", kantor: "makassar" },
      { id: "pB", pegawaiId: "B", peran: "SBK", unitId: "b1", kantor: "makassar" },
      { id: "pK", pegawaiId: "K", peran: "KSBK", unitId: "b1", kantor: "makassar" },
      { id: "pS", pegawaiId: "S", peran: "SK", unitId: "sk", kantor: "makassar" },
    ],
    kegiatan: [
      // g1 Jumat 23 Okt, PJ = A. g2 Rabu 28 Okt, tanpa PJ (berlaku untuk semua SBK).
      { id: "g1", unitId: "b1", tanggal: "2026-10-23", perluSpp: true, perluSpb: true, dibuatPada: w("2026-10-03"), penanggungJawabId: "A" },
      { id: "g2", unitId: "b1", tanggal: "2026-10-28", perluSpp: true, perluSpb: false, dibuatPada: w("2026-10-07"), penanggungJawabId: null },
    ],
    item: [
      // SBK-1 A: Jumat→Senin (1 HK ✓), Senin→Rabu (2 HK ✗), hari sama ✓, masih terbuka.
      item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-16", "2026-10-19", "2026-10-20") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-19", "2026-10-21", "2026-10-23") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-21", "2026-10-21") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-1", masuk: w("2026-10-21") }),
      // SBK-2a A: SPP g1 diinput 19 Okt (batas H-3 HK = 20 Okt) ✓; g2 belum.
      item({ penugasanId: "pA", indikatorKode: "SBK-2a", kegiatanId: "g1", ...setuju("2026-10-19", "2026-10-19") }),
      // SBK-3 A: g1 dua pengingat ✓; g2 satu ✗.
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g1", ...setuju("2026-10-20", "2026-10-20") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g1", ...setuju("2026-10-22", "2026-10-22") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g2", ...setuju("2026-10-21", "2026-10-21") }),
      // SBK-4 A: dibuat 15 Okt (≤ H-3), siap 22 Okt ✓.
      item({ penugasanId: "pA", indikatorKode: "SBK-4", kegiatanId: "g1", ...setuju("2026-10-15", "2026-10-22"), dibuatPada: w("2026-10-15") }),
      // SK-2 S: lapor 23 jam ✓, 30 jam ✗.
      item({ penugasanId: "pS", indikatorKode: "SK-2", masuk: w("2026-10-05", "10:00"), selesai: w("2026-10-06", "09:00"), status: "disetujui", diverifikasiPada: w("2026-10-06") }),
      item({ penugasanId: "pS", indikatorKode: "SK-2", masuk: w("2026-10-07", "10:00"), selesai: w("2026-10-08", "16:00"), status: "disetujui", diverifikasiPada: w("2026-10-08") }),
    ],
    dtrTugas: [
      { id: "d1", penugasanId: "pS", frekuensi: "harian", disetujui: true },
      { id: "d2", penugasanId: "pS", frekuensi: "mingguan", disetujui: true },
      { id: "d3", penugasanId: "pS", frekuensi: "harian", disetujui: false },
    ],
    dtrCek: [
      ...["01", "02", "05", "06", "07", "08", "09", "12", "13", "14", "15", "16"].map((d) => ({ tugasId: "d1", tanggal: `2026-10-${d}`, selesai: true, disetujui: true })),
      { tugasId: "d1", tanggal: "2026-10-19", selesai: true, disetujui: false }, // belum disetujui atasan
      ...["2026-10-01", "2026-10-07", "2026-10-14"].map((t) => ({ tugasId: "d2", tanggal: t, selesai: true, disetujui: true })),
    ],
    ujiPetik: [{ unitId: "b1", jumlahDiuji: 10, jumlahSesuai: 9 }],
  };
}

const ind = (h: ReturnType<typeof hitungK1>, pn: string, kode: string) => h.get(pn)!.indikator.find((i) => i.kode === kode)!;

describe("skor indikator", () => {
  it("min(100; capaian ÷ standar × 100); target 0 dikecualikan", () => {
    expect(skorIndikator(10, 9, 0.9).skor).toBeCloseTo(100);
    expect(skorIndikator(10, 8, 0.9).skor).toBeCloseTo(88.89, 2);
    expect(skorIndikator(4, 4, 0.9).skor).toBe(100);
    expect(skorIndikator(0, 0, 0.9).skor).toBeNull();
  });
});

describe("K1 dari item", () => {
  const h = hitungK1(konteks());

  it("SBK-1: tenggat 1 hari kerja melewati akhir pekan; item terbuka tetap dihitung di target", () => {
    expect(ind(h, "pA", "SBK-1")).toMatchObject({ target: 4, realisasi: 2, volumeKecil: false });
    expect(ind(h, "pA", "SBK-1").skor).toBeCloseTo((0.5 / 0.9) * 100);
  });

  it("SBK-2a: target dari kegiatan KSBK; penanggung jawab membatasi siapa yang ditarget", () => {
    expect(ind(h, "pA", "SBK-2a")).toMatchObject({ target: 2, realisasi: 1 });
    expect(ind(h, "pB", "SBK-2a")).toMatchObject({ target: 1, realisasi: 0, skor: 0 });
  });

  it("SBK-3: kegiatan dengan ≥ 2 pengingat sebelum hari H", () => {
    expect(ind(h, "pA", "SBK-3")).toMatchObject({ target: 2, realisasi: 1, skor: 50 });
  });

  it("SBK-4 volume kecil ditandai; SBK-5 tanpa item dikecualikan", () => {
    expect(ind(h, "pA", "SBK-4")).toMatchObject({ target: 1, realisasi: 1, skor: 100, volumeKecil: true });
    expect(ind(h, "pA", "SBK-5")).toMatchObject({ dikecualikan: true, skor: null });
  });

  it("K1 penugasan = rata-rata indikator dengan target > 0", () => {
    const skor = h.get("pA")!.indikator.filter((i) => !i.dikecualikan).map((i) => i.skor!);
    expect(skor).toHaveLength(5);
    expect(h.get("pA")!.k1).toBeCloseTo(skor.reduce((a, b) => a + b) / 5);
  });

  it("KSBK-1: sub a–e dari jejak waktu; KSBK-2 dari K1 staf ÷ 85; KSBK-3 belum jatuh tempo", () => {
    const k1 = ind(h, "pK", "KSBK-1");
    expect(k1.sub!.map((s) => [s.target, s.realisasi])).toEqual([[3, 2], [1, 1], [1, 1], [1, 1], [10, 9]]);
    expect(k1.skor).toBeCloseTo(((2 / 3 / 0.9) * 100 + 400) / 5);

    const rataStaf = (h.get("pA")!.k1! + h.get("pB")!.k1!) / 2;
    expect(ind(h, "pK", "KSBK-2").skor).toBeCloseTo(Math.min(100, rataStaf / 0.85));
    expect(ind(h, "pK", "KSBK-3")).toMatchObject({ dikecualikan: true, alasan: "Belum jatuh tempo" });
  });

  it("SK-1 DTR: harian per hari kerja, mingguan per pekan; hanya cek yang disetujui", () => {
    // 1–21 Okt: 15 hari kerja dalam 4 pekan. Harian 12/15, mingguan 3/4.
    expect(ind(h, "pS", "SK-1")).toMatchObject({ target: 19, realisasi: 15 });
  });

  it("SK-2: dilaporkan ≤ 24 jam", () => {
    expect(ind(h, "pS", "SK-2")).toMatchObject({ target: 2, realisasi: 1, skor: 50 });
  });

  it("item disetujui setelah batas verifikasi tidak dihitung; kewajiban bulanan jadi jatuh tempo", () => {
    const ctx = { ...konteks(), batasVerifikasi: w("2026-10-20", "23:00") };
    const h2 = hitungK1(ctx);
    expect(ind(h2, "pA", "SBK-1").realisasi).toBe(1); // item ketiga baru diverifikasi 21 Okt
    expect(ind(h2, "pK", "KSBK-3")).toMatchObject({ target: 1, realisasi: 0, skor: 0 });
  });
});

describe("IKP bulanan", () => {
  function masukan(): MasukanIkp {
    const k1 = konteks();
    k1.penugasan.push(
      { id: "pU", pegawaiId: "U", peran: "KU", unitId: "lu", kantor: "makassar" },
      { id: "pKK", pegawaiId: "KK", peran: "KAKAN", unitId: "kantor", kantor: "makassar" },
    );
    return {
      k1,
      pegawai: ["A", "B", "K", "S", "U", "KK"].map((id) => ({ id, nama: id, kantor: "makassar" as const })),
      penugasan: k1.penugasan.map((p) => ({ id: p.id, pegawaiId: p.pegawaiId, peran: p.peran, unitId: p.unitId, koordinatorId: "K", bobotAlokasi: null })),
      absensi: [
        { pegawaiId: "A", hariKerjaWajib: 22, hadir: 20, hadirTepatWaktu: 18, izinSakit: 0, sanksiBerat: false },
        { pegawaiId: "B", hariKerjaWajib: 22, hadir: 16, hadirTepatWaktu: 16, izinSakit: 0, sanksiBerat: false },
        { pegawaiId: "U", hariKerjaWajib: 20, hadir: 20, hadirTepatWaktu: 20, izinSakit: 0, sanksiBerat: false },
        { pegawaiId: "KK", hariKerjaWajib: 20, hadir: 19, hadirTepatWaktu: 19, izinSakit: 1, sanksiBerat: false },
      ],
      k3: [
        { penugasanId: "pA", penilaiId: "K", skor: semua(4) },
        { penugasanId: "pB", penilaiId: "K", skor: semua(3) },
        { penugasanId: "pU", penilaiId: "W", skor: semua(3) },
      ],
      adaLogPengembanganDiri: new Set(["A", "U"]),
      poinK4: new Map([["A", 30]]),
    };
  }
  const cari = (m: MasukanIkp, id: string) => hitungIkp(m).find((h) => h.pegawaiId === id)!;

  it("IKP = 0,5 K1 + 0,25 K2 + 0,25 K3; K4 dibatasi 25; predikat dari IKP Akhir", () => {
    const a = cari(masukan(), "A");
    expect(a.k2).toBeCloseTo(0.6 * (20 / 22) * 100 + 0.4 * 90);
    expect(a.k3).toBe(80);
    expect(a.ikp).toBeCloseTo(0.5 * a.k1! + 0.25 * a.k2! + 0.25 * 80);
    expect(a.k4).toBe(25);
    expect(a.ikpAkhir).toBeCloseTo(a.ikp! + 25);
    expect(a.predikat).toBe(predikatDari(a.ikpAkhir!));
    expect(a.syaratMinimum.memenuhi).toBe(true);
  });

  it("pengembangan diri dibatasi 2 tanpa log; kehadiran < 85% ditandai", () => {
    const b = cari(masukan(), "B");
    expect(b.k3).toBeCloseTo(((3 * 5 + 2) / 6) * 20);
    expect(b.syaratMinimum).toEqual({ memenuhi: false, alasan: ["Kehadiran di bawah 85%"] });
  });

  it("Kepala Kantor: IKP = K2; Kepala Unit Pendukung: 0,5 K2 + 0,5 K3", () => {
    expect(cari(masukan(), "KK")).toMatchObject({ kategori: "pimpinan", ikp: 97, k3: null, predikat: "Sangat Baik" });
    const u = cari(masukan(), "U");
    expect(u.kategori).toBe("kepala_unit");
    expect(u.ikp).toBeCloseTo(0.5 * 100 + 0.5 * 60);
  });

  it("IKP kosong bila absensi atau K3 belum ada, dengan daftar kekurangan", () => {
    const k = cari(masukan(), "K");
    expect(k.ikp).toBeNull();
    expect(k.kekurangan).toEqual(["Rekap absensi belum diunggah", "Penilaian K3 belum lengkap"]);
  });

  it("K1 memakai bobot alokasi tertulis bila semua penugasan berbobot", () => {
    const m = masukan();
    m.penugasan.find((p) => p.id === "pA")!.bobotAlokasi = 60;
    m.penugasan.push({ id: "pA2", pegawaiId: "A", peran: "SK", unitId: "sk", koordinatorId: "K", bobotAlokasi: 40 });
    m.k1.penugasan.push({ id: "pA2", pegawaiId: "A", peran: "SK", unitId: "sk", kantor: "makassar" });
    m.k1.item.push({ id: "x", penugasanId: "pA2", indikatorKode: "SK-2", kegiatanId: null, masuk: w("2026-10-05"), selesai: w("2026-10-05", "11:00"), status: "disetujui", diajukanPada: null, diverifikasiPada: w("2026-10-05"), dibuatPada: w("2026-10-05") });
    m.k3.push({ penugasanId: "pA2", penilaiId: "K", skor: semua(5) });
    const a = cari(m, "A");
    const [pa, pa2] = a.penugasan;
    expect(a.k1).toBeCloseTo((0.6 * pa.k1! + 0.4 * pa2.k1!) / 1);
    expect(a.k3).toBeCloseTo((80 + 100) / 2);
  });
});

describe("aturan pendukung", () => {
  it("K2 dan K3", () => {
    expect(hitungK2({ pegawaiId: "x", hariKerjaWajib: 0, hadir: 0, hadirTepatWaktu: 0, izinSakit: 0, sanksiBerat: false })).toBeNull();
    expect(hitungK3(semua(5), false).k3).toBeCloseTo(((5 * 5 + 2) / 6) * 20);
  });

  it("K4 naik tingkat hanya menambah selisih", () => {
    expect(poinK4Bersih(10, [])).toBe(10);
    expect(poinK4Bersih(15, [10])).toBe(5);
    expect(poinK4Bersih(10, [10])).toBe(0);
  });

  it("pita predikat", () => {
    expect([90, 89.99, 80, 70, 60, 59.99].map(predikatDari)).toEqual(["Sangat Baik", "Baik", "Baik", "Cukup", "Perlu Perbaikan", "Kurang"]);
  });
});

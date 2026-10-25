import { describe, expect, it } from "vitest";
import { hitungIkp, hitungK2, hitungK3, poinK4Bersih, type MasukanIkp } from "./hitung";
import { hitungK1, paramDefault, skorIndikator, type ItemK1, type KonteksK1, type TugasK1 } from "./k1";
import { pecahDaftarJudul, tanggalJadwal } from "./tugas";
import { predikatDari, type SkorK3 } from "./tipe";
import { keUtc } from "../waktu";

const w = (tgl: string, jam = "10:00") => keUtc(tgl, "makassar", jam);
const semua = (v: number): SkorK3 => ({ akhlak: v, profesional: v, inovatif: v, kolaboratif: v, rasaMemiliki: v, pengembanganDiri: v });

let n = 0;
function item(p: Partial<ItemK1> & Pick<ItemK1, "penugasanId" | "indikatorKode">): ItemK1 {
  return { id: `i${n++}`, kegiatanId: null, masuk: w("2026-10-01"), selesai: null, status: "terbuka", diajukanPada: null, diverifikasiPada: null, dibuatPada: w("2026-10-01"), data: {}, ...p };
}
const setuju = (tglMasuk: string, tglSelesai: string, tglVerif = tglSelesai) => ({
  masuk: w(tglMasuk),
  selesai: w(tglSelesai),
  status: "disetujui" as const,
  diajukanPada: w(tglSelesai),
  diverifikasiPada: w(tglVerif),
});
/** Jadwal tugas khusus; `selesai` = waktu ditandai selesai. */
function tugas(penugasanId: string, tenggat: string, status: TugasK1["status"], selesai?: string): TugasK1 {
  return { penugasanId, tenggat: w(tenggat, "15:00"), status, selesaiPada: selesai ? w(selesai.slice(0, 10), selesai.slice(11) || "14:00") : null, diverifikasiPada: status === "disetujui" ? w(tenggat, "17:00") : null };
}

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
      // g1 Jumat 23 Okt & g2 Rabu 28 Okt: PJ = A. g0 Rabu 7 Okt & g3 Senin 26 Okt: PJ = B.
      { id: "g1", unitId: "b1", tanggal: "2026-10-23", perluSpp: true, perluSpb: true, dibuatPada: w("2026-10-03"), penanggungJawabId: "A" },
      { id: "g2", unitId: "b1", tanggal: "2026-10-28", perluSpp: true, perluSpb: false, dibuatPada: w("2026-10-07"), penanggungJawabId: "A" },
      { id: "g0", unitId: "b1", tanggal: "2026-10-07", perluSpp: false, perluSpb: false, dibuatPada: w("2026-10-03"), penanggungJawabId: "B" },
      { id: "g3", unitId: "b1", tanggal: "2026-10-26", perluSpp: false, perluSpb: false, dibuatPada: w("2026-10-07"), penanggungJawabId: "B" },
    ],
    item: [
      // SBK-1 A: Jumat→Senin (1 HK ✓), Senin→Rabu (2 HK ✗), hari sama ✓, masih terbuka.
      item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-16", "2026-10-19", "2026-10-20") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-19", "2026-10-21", "2026-10-23") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-21", "2026-10-21") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-1", masuk: w("2026-10-21") }),
      // SBK-2a A: SPP g1 diinput 19 Okt (batas H-3 HK = 20 Okt) ✓; g2 belum.
      item({ penugasanId: "pA", indikatorKode: "SBK-2a", kegiatanId: "g1", ...setuju("2026-10-19", "2026-10-19") }),
      // SBK-3 A: g1 ke-1 16 Okt (≤ H-6 = 17 Okt ✓), ke-2 22 Okt (> H-2 = 21 Okt ✗); g2 ke-1 21 Okt (≤ 22 Okt ✓), ke-2 belum.
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g1", data: { ke: "1" }, ...setuju("2026-10-16", "2026-10-16") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g1", data: { ke: "2" }, ...setuju("2026-10-22", "2026-10-22") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g2", data: { ke: "1" }, ...setuju("2026-10-21", "2026-10-21") }),
      item({ penugasanId: "pA", indikatorKode: "SBK-3", kegiatanId: "g2", data: { ke: "2" } }),
      // SBK-4 A: dibuat 15 Okt (≤ H-3), siap 22 Okt ✓.
      item({ penugasanId: "pA", indikatorKode: "SBK-4", kegiatanId: "g1", ...setuju("2026-10-15", "2026-10-22"), dibuatPada: w("2026-10-15") }),
      // SBK-5 B: arsip g0 (batas 3 HK setelah 7 Okt = 12 Okt) ✓ dan ✗; arsip tanpa kegiatan 2 HK ✓.
      item({ penugasanId: "pB", indikatorKode: "SBK-5", kegiatanId: "g0", ...setuju("2026-10-08", "2026-10-12") }),
      item({ penugasanId: "pB", indikatorKode: "SBK-5", kegiatanId: "g0", ...setuju("2026-10-08", "2026-10-13") }),
      item({ penugasanId: "pB", indikatorKode: "SBK-5", ...setuju("2026-10-13", "2026-10-15") }),
    ],
    tugas: [
      // A: tepat & disetujui ✓; terlambat ✗; belum diverifikasi ✗.
      tugas("pA", "2026-10-10", "disetujui", "2026-10-10T14:00"),
      tugas("pA", "2026-10-12", "disetujui", "2026-10-13T09:00"),
      tugas("pA", "2026-10-14", "diajukan", "2026-10-14T10:00"),
      // S: 5–7 Okt tepat ✓; 8 Okt terlambat; 9 Okt belum (lewat); 26 Okt diselesaikan lebih awal (belum diverifikasi); 27 Okt belum jatuh tempo.
      tugas("pS", "2026-10-05", "disetujui", "2026-10-05"),
      tugas("pS", "2026-10-06", "disetujui", "2026-10-06"),
      tugas("pS", "2026-10-07", "disetujui", "2026-10-07"),
      tugas("pS", "2026-10-08", "disetujui", "2026-10-08T16:30"),
      tugas("pS", "2026-10-09", "belum"),
      tugas("pS", "2026-10-26", "diajukan", "2026-10-20"),
      tugas("pS", "2026-10-27", "dikerjakan"),
    ],
    jurnal: new Map([["A", 40], ["B", 2], ["S", 10]]),
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

describe("K1 Staf Bidang Kerja: Kegiatan SKUO + Surat", () => {
  const h = hitungK1(konteks());

  it("SBK-1: tenggat 1 hari kerja melewati akhir pekan; item terbuka tetap dihitung di target", () => {
    expect(ind(h, "pA", "SBK-1")).toMatchObject({ target: 4, realisasi: 2, volumeKecil: false });
    expect(ind(h, "pA", "SBK-1").skor).toBeCloseTo((0.5 / 0.9) * 100);
  });

  it("SBK-2a: target dari kegiatan yang butuh SPP milik penanggung jawab", () => {
    expect(ind(h, "pA", "SBK-2a")).toMatchObject({ target: 2, realisasi: 1 });
    expect(ind(h, "pB", "SBK-2a")).toMatchObject({ target: 0, dikecualikan: true });
  });

  it("SBK-3: dua pengingat per kegiatan, ke-1 ≤ H-6 dan ke-2 ≤ H-2, dinilai sendiri-sendiri", () => {
    expect(ind(h, "pA", "SBK-3")).toMatchObject({ target: 4, realisasi: 2, skor: 50 });
    expect(ind(h, "pB", "SBK-3")).toMatchObject({ target: 4, realisasi: 0, skor: 0 });
  });

  it("SBK-4 volume kecil ditandai; SBK-5 tanpa item dikecualikan", () => {
    expect(ind(h, "pA", "SBK-4")).toMatchObject({ target: 1, realisasi: 1, skor: 100, volumeKecil: true });
    expect(ind(h, "pA", "SBK-5")).toMatchObject({ dikecualikan: true, skor: null });
  });

  it("SBK-5: arsip kegiatan ≤ 3 hari kerja setelah kegiatan; arsip lain ≤ 3 hari kerja setelah diterima", () => {
    expect(ind(h, "pB", "SBK-5")).toMatchObject({ target: 3, realisasi: 2 });
  });
});

describe("K1 Staf Bidang Kerja: poin tambahan", () => {
  const h = hitungK1(konteks());

  it("tugas khusus: 0,15 per tugas yang selesai sebelum tenggat dan disetujui", () => {
    expect(ind(h, "pA", "SBK-TK")).toMatchObject({ target: 1, realisasi: 1, tambahan: true, dikecualikan: false });
    expect(ind(h, "pA", "SBK-TK").skor).toBeCloseTo(0.15);
  });

  it("jurnal: 0,15 per entri, maks. 5", () => {
    expect(ind(h, "pA", "SBK-JR")).toMatchObject({ target: 40, skor: 5, tambahan: true });
    expect(ind(h, "pB", "SBK-JR").skor).toBeCloseTo(0.3);
  });

  it("K1 = min(100; rata-rata indikator pokok + poin tambahan)", () => {
    const a = h.get("pA")!;
    const pokok = a.indikator.filter((i) => !i.tambahan && !i.dikecualikan).map((i) => i.skor!);
    expect(pokok).toHaveLength(5); // SBK-1, 2a, 2b, 3, 4
    expect(a.pokok).toBeCloseTo(pokok.reduce((x, y) => x + y) / 5);
    expect(a.tambahan).toBeCloseTo(5.15);
    expect(a.k1).toBeCloseTo(a.pokok! + 5.15);
  });

  it("K1 tidak melewati 100, dan tanpa indikator pokok poin tambahan tidak membentuk K1", () => {
    const ctx = konteks();
    ctx.penugasan = [
      { id: "pA", pegawaiId: "A", peran: "SBK", unitId: "b1", kantor: "makassar" },
      { id: "pC", pegawaiId: "C", peran: "SBK", unitId: "b2", kantor: "makassar" },
    ];
    ctx.kegiatan = [];
    ctx.item = [item({ penugasanId: "pA", indikatorKode: "SBK-1", ...setuju("2026-10-19", "2026-10-19") })];
    ctx.jurnal = new Map([["A", 10], ["C", 20]]);
    const h2 = hitungK1(ctx);
    expect(h2.get("pA")).toMatchObject({ pokok: 100, k1: 100 });
    expect(h2.get("pC")).toMatchObject({ pokok: null, k1: null });
    expect(h2.get("pC")!.tambahan).toBeCloseTo(3);
  });
});

describe("K1 koordinator & Staf Khusus", () => {
  const h = hitungK1(konteks());

  it("KSBK-1: sub a, c, d, e dari jejak waktu (1b nonaktif); KSBK-2 dari K1 staf ÷ 85; KSBK-3 belum jatuh tempo", () => {
    const k1 = ind(h, "pK", "KSBK-1");
    expect(k1.sub!.map((s) => [s.kode, s.target, s.realisasi])).toEqual([["KSBK-1a", 3, 2], ["KSBK-1c", 1, 1], ["KSBK-1d", 1, 1], ["KSBK-1e", 10, 9]]);
    expect(k1.skor).toBeCloseTo(((2 / 3 / 0.9) * 100 + 300) / 4);

    const rataStaf = (h.get("pA")!.k1! + h.get("pB")!.k1!) / 2;
    expect(ind(h, "pK", "KSBK-2").skor).toBeCloseTo(Math.min(100, rataStaf / 0.85));
    expect(ind(h, "pK", "KSBK-3")).toMatchObject({ dikecualikan: true, alasan: "Belum jatuh tempo" });
  });

  it("SK-TK: tugas jatuh tempo (lewat tenggat atau sudah diselesaikan) jadi target; realisasi tepat waktu & disetujui", () => {
    expect(ind(h, "pS", "SK-TK")).toMatchObject({ target: 6, realisasi: 3 });
    expect(ind(h, "pS", "SK-JR").skor).toBeCloseTo(1.5);
    expect(h.get("pS")!.k1).toBeCloseTo(((3 / 6) / 0.9) * 100 + 1.5);
  });

  it("SBK di SKUO ikut bidang induknya; staf dengan dua SKUO satu bidang punya satu K1 gabungan", () => {
    // C memegang dua SKUO di bawah b1 (s1, s2). g1 (SKUO s2) dan g2 (SKUO s9 yang tidak ia pegang) dengan PJ = C.
    const ctx = konteks();
    ctx.penugasan.push(
      { id: "pC1", pegawaiId: "C", peran: "SBK", unitId: "s1", bidangId: "b1", kantor: "makassar" },
      { id: "pC2", pegawaiId: "C", peran: "SBK", unitId: "s2", bidangId: "b1", kantor: "makassar" },
    );
    ctx.kegiatan = ctx.kegiatan.map((k) => (k.id === "g1" || k.id === "g2" ? { ...k, penanggungJawabId: "C", skuoId: k.id === "g1" ? "s2" : "s9" } : k));
    ctx.item.push(
      item({ penugasanId: "pC2", indikatorKode: "SBK-2a", kegiatanId: "g1", ...setuju("2026-10-19", "2026-10-19") }),
      // Surat dicatat di SKUO mana pun tetap masuk K1 yang sama.
      item({ penugasanId: "pC1", indikatorKode: "SBK-1", ...setuju("2026-10-19", "2026-10-19") }),
      item({ penugasanId: "pC2", indikatorKode: "SBK-1", ...setuju("2026-10-19", "2026-10-23") }),
    );
    const h2 = hitungK1(ctx);
    expect(h2.get("pC1")).toBe(h2.get("pC2"));
    expect(h2.get("pC1")!.penugasanIds).toEqual(["pC1", "pC2"]);
    expect(ind(h2, "pC1", "SBK-2a")).toMatchObject({ target: 2, realisasi: 1 }); // g1 & g2, masing-masing sekali
    expect(ind(h2, "pC1", "SBK-1")).toMatchObject({ target: 2, realisasi: 1 });
    expect(ind(h2, "pA", "SBK-2a").target).toBe(0);
    expect(ind(h2, "pK", "KSBK-2").target).toBe(3); // A, B, C (sekali)
  });

  it("SBK di dua bidang berbeda: K1 tetap terpisah", () => {
    const ctx = konteks();
    ctx.penugasan.push({ id: "pA9", pegawaiId: "A", peran: "SBK", unitId: "b9", kantor: "makassar" });
    const h2 = hitungK1(ctx);
    expect(h2.get("pA")!.penugasanIds).toEqual(["pA"]);
    expect(h2.get("pA9")!.penugasanIds).toEqual(["pA9"]);
    expect(h2.get("pA")!.k1).toBeCloseTo(hitungK1(konteks()).get("pA")!.k1!);
  });

  it("item & tugas disetujui setelah batas verifikasi tidak dihitung; kewajiban bulanan jadi jatuh tempo", () => {
    const ctx = { ...konteks(), batasVerifikasi: w("2026-10-20", "23:00") };
    ctx.tugas = ctx.tugas.map((t) => (t.penugasanId === "pA" ? { ...t, diverifikasiPada: w("2026-10-21") } : t));
    const h2 = hitungK1(ctx);
    expect(ind(h2, "pA", "SBK-1").realisasi).toBe(1); // item ketiga baru diverifikasi 21 Okt
    expect(ind(h2, "pA", "SBK-TK").skor).toBe(0);
    expect(ind(h2, "pK", "KSBK-3")).toMatchObject({ target: 1, realisasi: 0, skor: 0 });
    expect(ind(h2, "pS", "SK-TK").target).toBe(7); // bulan ditutup: semua jadwal jatuh tempo
  });
});

describe("jadwal tugas khusus", () => {
  it("sekali = satu tanggal; harian = tiap hari kerja; pekanan = tiap 7 hari", () => {
    const libur = new Set(["2026-10-22"]);
    expect(tanggalJadwal("sekali", "2026-10-21", "2026-10-30", libur)).toEqual(["2026-10-21"]);
    expect(tanggalJadwal("harian", "2026-10-21", "2026-10-26", libur)).toEqual(["2026-10-21", "2026-10-23", "2026-10-26"]);
    expect(tanggalJadwal("pekanan", "2026-10-07", "2026-10-28", libur)).toEqual(["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]);
  });

  it("usulan sekaligus: satu baris satu tugas, nomor/butir dibuang, baris kosong dan ganda dilewati", () => {
    expect(pecahDaftarJudul("1. Patroli gedung\r\n- Cek CCTV\n\n  • Laporan piket  \n2) Cek CCTV\n* Kunci gerbang")).toEqual(["Patroli gedung", "Cek CCTV", "Laporan piket", "Kunci gerbang"]);
    expect(pecahDaftarJudul("  \n ")).toEqual([]);
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
      // K mengoordinasikan semua penugasan; penugasannya sendiri dan Kepala Unit dinilai WaKa "W".
      penugasan: k1.penugasan.map((p) => ({ id: p.id, pegawaiId: p.pegawaiId, peran: p.peran, unitId: p.unitId, koordinatorId: "K", penilaiK3Id: p.pegawaiId === "K" || p.id === "pU" ? "W" : "K", bobotAlokasi: null })),
      absensi: [
        { pegawaiId: "A", hariKerjaWajib: 22, hadir: 20, hadirTepatWaktu: 18, izinSakit: 0, sanksiBerat: false },
        { pegawaiId: "B", hariKerjaWajib: 22, hadir: 16, hadirTepatWaktu: 16, izinSakit: 0, sanksiBerat: false },
        { pegawaiId: "U", hariKerjaWajib: 20, hadir: 20, hadirTepatWaktu: 20, izinSakit: 0, sanksiBerat: false },
        { pegawaiId: "KK", hariKerjaWajib: 20, hadir: 19, hadirTepatWaktu: 19, izinSakit: 1, sanksiBerat: false },
      ],
      k3: [
        { pegawaiId: "A", penilaiId: "K", skor: semua(4) },
        { pegawaiId: "B", penilaiId: "K", skor: semua(3) },
        { pegawaiId: "U", penilaiId: "W", skor: semua(3) },
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
    m.penugasan.push({ id: "pA2", pegawaiId: "A", peran: "SK", unitId: "sk", koordinatorId: "K2", penilaiK3Id: "K2", bobotAlokasi: 40 });
    m.k1.penugasan.push({ id: "pA2", pegawaiId: "A", peran: "SK", unitId: "sk", kantor: "makassar" });
    m.k1.tugas.push(tugas("pA2", "2026-10-05", "disetujui", "2026-10-05"));
    m.k3.push({ pegawaiId: "A", penilaiId: "K2", skor: semua(5) });
    const a = cari(m, "A");
    const [pa, pa2] = a.penugasan;
    expect(a.k1).toBeCloseTo((0.6 * pa.k1! + 0.4 * pa2.k1!) / 1);
    expect(a.k3).toBeCloseTo((80 + 100) / 2);
  });

  it("rangkap jabatan: penilai yang sama di dua penugasan cukup menilai sekali dan dihitung sekali", () => {
    const m = masukan();
    // A juga SBK di SKUO dengan koordinator dirinya sendiri; K3 penugasan itu naik ke penilai yang sama.
    m.penugasan.push({ id: "pA2", pegawaiId: "A", peran: "SBK", unitId: "skuo", koordinatorId: "A", penilaiK3Id: "K", bobotAlokasi: null });
    const a = cari(m, "A");
    expect(a.k3).toBe(80);
    expect(a.penugasan.map((p) => p.k3)).toEqual([80, 80]);
    expect(a.ikp).not.toBeNull();
  });

  it("rangkap SBK di dua SKUO satu bidang: satu baris K1, dihitung sekali dalam rata-rata K1", () => {
    const m = masukan();
    for (const [id, unitId] of [["pA1", "s1"], ["pA2", "s2"]] as const) {
      m.k1.penugasan.push({ id, pegawaiId: "A", peran: "SBK", unitId, bidangId: "b9", kantor: "makassar" });
      m.penugasan.push({ id, pegawaiId: "A", peran: "SBK", unitId, koordinatorId: "K", penilaiK3Id: "K", bobotAlokasi: null });
    }
    m.k1.item.push(item({ penugasanId: "pA2", indikatorKode: "SBK-1", ...setuju("2026-10-19", "2026-10-23") }));
    const a = cari(m, "A");
    expect(a.penugasan.map((p) => [p.penugasanId, p.penugasanIds, p.unitIds])).toEqual([
      ["pA", undefined, undefined],
      ["pA1", ["pA1", "pA2"], ["s1", "s2"]],
    ]);
    expect(a.k1).toBeCloseTo((a.penugasan[0].k1! + a.penugasan[1].k1!) / 2);
  });

  it("penugasan tanpa penilai K3 ditandai", () => {
    const m = masukan();
    m.penugasan.find((p) => p.id === "pA")!.penilaiK3Id = null;
    expect(cari(m, "A").kekurangan).toContain("Ada penugasan tanpa penilai K3");
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

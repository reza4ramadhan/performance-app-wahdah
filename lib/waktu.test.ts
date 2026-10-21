import { describe, expect, it } from "vitest";
import { labelSisa, tenggatItem } from "./ikp/tenggat";
import {
  geserHariKerja,
  hariKerjaAntara,
  hariKerjaPeriode,
  isHariKerja,
  jamLokal,
  keUtc,
  periodeBerikut,
  rentangPeriode,
  seninPekan,
  tanggalLokal,
} from "./waktu";

// Oktober 2026: 1 Okt = Kamis. 17–18 Okt = Sabtu–Minggu.
const LIBUR = new Set(["2026-10-20"]); // Selasa, libur contoh

describe("zona waktu kantor", () => {
  it("instan yang sama bisa jatuh di tanggal berbeda antara WIB dan WITA", () => {
    const t = new Date("2026-10-20T16:30:00Z"); // 00:30 WITA 21 Okt, 23:30 WIB 20 Okt
    expect(tanggalLokal(t, "makassar")).toBe("2026-10-21");
    expect(tanggalLokal(t, "jakarta")).toBe("2026-10-20");
    expect(jamLokal(t, "jakarta")).toBe("23:30");
  });

  it("keUtc kebalikan dari tanggalLokal + jamLokal", () => {
    const t = keUtc("2026-10-21", "makassar", "08:15");
    expect(t.toISOString()).toBe("2026-10-21T00:15:00.000Z");
    expect(tanggalLokal(t, "makassar")).toBe("2026-10-21");
    expect(jamLokal(t, "makassar")).toBe("08:15");
  });
});

describe("hari kerja", () => {
  it("Sabtu, Minggu, dan hari libur bukan hari kerja", () => {
    expect(isHariKerja("2026-10-17", LIBUR)).toBe(false);
    expect(isHariKerja("2026-10-18", LIBUR)).toBe(false);
    expect(isHariKerja("2026-10-20", LIBUR)).toBe(false);
    expect(isHariKerja("2026-10-19", LIBUR)).toBe(true);
  });

  it("hariKerjaAntara: hari sama 0, melewati akhir pekan dan libur", () => {
    expect(hariKerjaAntara("2026-10-16", "2026-10-16", LIBUR)).toBe(0);
    expect(hariKerjaAntara("2026-10-16", "2026-10-19", LIBUR)).toBe(1); // Jumat → Senin
    expect(hariKerjaAntara("2026-10-19", "2026-10-21", LIBUR)).toBe(1); // Selasa libur
    expect(hariKerjaAntara("2026-10-21", "2026-10-19", LIBUR)).toBe(-1);
  });

  it("geserHariKerja maju dan mundur", () => {
    expect(geserHariKerja("2026-10-16", 1, LIBUR)).toBe("2026-10-19");
    expect(geserHariKerja("2026-10-21", -2, LIBUR)).toBe("2026-10-16");
  });

  it("hari kerja dalam periode, opsional dibatasi tanggal", () => {
    expect(hariKerjaPeriode("2026-10", LIBUR)).toHaveLength(21); // 22 hari kerja − 1 libur
    expect(hariKerjaPeriode("2026-10", LIBUR, "2026-10-02")).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("senin pekan", () => {
    expect(seninPekan("2026-10-21")).toBe("2026-10-19");
    expect(seninPekan("2026-10-18")).toBe("2026-10-12");
  });
});

describe("periode", () => {
  it("rentang dan periode berikut", () => {
    expect(rentangPeriode("2026-02")).toEqual({ awal: "2026-02-01", akhir: "2026-02-28" });
    expect(periodeBerikut("2026-12")).toBe("2027-01");
    expect(periodeBerikut("2026-01", -1)).toBe("2025-12");
  });
});


describe("tenggat item", () => {
  const L = new Set<string>();
  it("SBK-1 masuk Jumat → tenggat Senin; SBK-2a H-3 hari kerja sebelum kegiatan", () => {
    expect(tenggatItem({ indikatorKode: "SBK-1", tglMasuk: keUtc("2026-10-16", "makassar", "09:00"), periodeId: "2026-10" }, null, 1, L, "makassar")).toEqual({ tanggal: "2026-10-19" });
    expect(tenggatItem({ indikatorKode: "SBK-2a", tglMasuk: new Date(), periodeId: "2026-10" }, "2026-10-23", 3, L, "makassar")).toEqual({ tanggal: "2026-10-20" });
  });
  it("label sisa", () => {
    expect(labelSisa("2026-10-21", "2026-10-21", L).teks).toBe("Tenggat hari ini");
    expect(labelSisa("2026-10-22", "2026-10-21", L).teks).toBe("Tenggat besok");
    expect(labelSisa("2026-10-26", "2026-10-21", L).teks).toBe("3 hari kerja lagi");
    expect(labelSisa("2026-10-19", "2026-10-21", L)).toEqual({ teks: "Lewat 2 hari kerja", nada: "flame" });
  });
});

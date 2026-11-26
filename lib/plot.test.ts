import { describe, expect, it } from "vitest";
import { pjDariPlot, plotBerlaku, type BarisPlot } from "./plot";

const b = (skuoId: string, pegawaiId: string, berlakuMulai: string, o: Partial<BarisPlot> = {}): BarisPlot => ({ skuoId, pegawaiId, berlakuMulai, utama: false, aktif: true, dibuatPada: new Date(`${berlakuMulai}T00:00:00Z`), ...o });

describe("plot staf ke departemen", () => {
  it("satu staf ber-plot otomatis menjadi PJ; beberapa staf memakai PJ utama", () => {
    expect(pjDariPlot([b("s1", "A", "2026-12-01")], "s1", "2026-12-10")).toBe("A");
    expect(pjDariPlot([b("s1", "A", "2026-12-01"), b("s1", "B", "2026-12-01")], "s1", "2026-12-10")).toBeNull();
    expect(pjDariPlot([b("s1", "A", "2026-12-01"), b("s1", "B", "2026-12-01", { utama: true })], "s1", "2026-12-10")).toBe("B");
    expect(pjDariPlot([b("s2", "A", "2026-12-01")], "s1", "2026-12-10")).toBeNull();
  });

  it("perubahan plot di tengah bulan hanya berlaku untuk kegiatan sesudah tanggal berlakunya", () => {
    const plot = [b("s1", "A", "2026-12-01"), b("s1", "A", "2026-12-15", { aktif: false }), b("s1", "B", "2026-12-15")];
    expect(pjDariPlot(plot, "s1", "2026-12-10")).toBe("A");
    expect(pjDariPlot(plot, "s1", "2026-12-20")).toBe("B");
    expect(plotBerlaku(plot, "2026-11-30")).toEqual([]);
  });
});

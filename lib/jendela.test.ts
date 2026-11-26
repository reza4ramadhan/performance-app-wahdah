import { describe, expect, it } from "vitest";
import { jendelaAkhirBulan } from "./jendela";

describe("jendela akhir bulan", () => {
  const libur = new Set<string>();
  it("terbuka ≤ 5 hari kerja setelah bulan berakhir, untuk bulan lalu", () => {
    // 30 Nov 2026 Senin → 5 hari kerja setelahnya = Senin 7 Des.
    expect(jendelaAkhirBulan("2026-12-03", libur)).toEqual({ periode: "2026-11", awal: "2026-12-01", akhir: "2026-12-07" });
    expect(jendelaAkhirBulan("2026-12-07", libur).periode).toBe("2026-11");
  });
  it("tertutup di luar jendela; menunjukkan jendela berikutnya", () => {
    expect(jendelaAkhirBulan("2026-11-26", libur)).toEqual({ periode: null, awal: "2026-12-01", akhir: "2026-12-07" });
    expect(jendelaAkhirBulan("2026-12-08", libur).periode).toBeNull();
  });
});

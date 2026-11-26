import { describe, expect, it } from "vitest";
import { jadwalRutin, setBerlaku, ujungJadwal, type ItemRutin, type Pemasangan } from "./set-tugas";

const pasang = (setTugasId: string | null, pekanMulai: string, jam = "08:00"): Pemasangan => ({ setTugasId, pekanMulai, dibuatPada: new Date(`${pekanMulai}T${jam}:00Z`) });
const item = (id: string, o: Partial<ItemRutin> = {}): ItemRutin => ({ id, frekuensi: "harian", hari: null, jamTenggat: "08:00", aktif: true, ...o });

describe("Set Tugas", () => {
  it("susunan pekan lalu otomatis berlanjut; yang terbaru untuk pekan yang sama menang", () => {
    const p = [pasang("pagi", "2026-11-16"), pasang("malam", "2026-11-30"), pasang("gerbang", "2026-11-30", "09:00")];
    expect(setBerlaku(p, "2026-11-26")).toBe("pagi"); // pekan 23 Nov: tidak diubah → berlanjut
    expect(setBerlaku(p, "2026-12-02")).toBe("gerbang");
    expect(setBerlaku(p, "2026-11-13")).toBeNull();
    expect(setBerlaku([pasang("pagi", "2026-11-16"), pasang(null, "2026-11-23")], "2026-11-26")).toBeNull();
  });

  it("harian = hari kerja; pekanan pada hari terpilih; tugas lewat tengah malam bertenggat esok hari", () => {
    const j = jadwalRutin({
      dari: "2026-11-26", // Kamis
      sampai: "2026-11-30", // Senin
      libur: new Set(["2026-11-27"]),
      pasang: [pasang("malam", "2026-11-23")],
      item: new Map([["malam", [item("patroli", { jamTenggat: "22:00" }), item("tutup", { jamTenggat: "05:00" }), item("apar", { frekuensi: "pekanan", hari: 6, jamTenggat: "11:00" }), item("lama", { aktif: false })]]]),
      gantiHari: new Map([["malam", "06:00"]]),
    });
    expect(j.filter((x) => x.itemId === "patroli").map((x) => x.tanggal)).toEqual(["2026-11-26", "2026-11-30"]);
    expect(j.find((x) => x.itemId === "tutup" && x.tanggal === "2026-11-26")?.tenggat).toBe("2026-11-27");
    expect(j.filter((x) => x.itemId === "apar").map((x) => x.tanggal)).toEqual(["2026-11-28"]);
    expect(j.some((x) => x.itemId === "lama")).toBe(false);
  });

  it("ujung jadwal = Minggu pekan depan", () => {
    expect(ujungJadwal("2026-11-26")).toBe("2026-12-06");
  });
});

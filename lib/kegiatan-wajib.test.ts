import { describe, expect, it } from "vitest";
import { bulanWajibKegiatan, kegiatanBelumDiinput } from "./kegiatan-wajib";

describe("kewajiban input kegiatan SKUO", () => {
  it("bulan ini saja sebelum tanggal 25; mulai tanggal 25 juga bulan depan", () => {
    expect(bulanWajibKegiatan("2026-11-24")).toEqual(["2026-11"]);
    expect(bulanWajibKegiatan("2026-11-25")).toEqual(["2026-11", "2026-12"]);
    expect(bulanWajibKegiatan("2026-12-28")).toEqual(["2026-12", "2027-01"]);
  });

  it("hanya bidang × bulan tanpa kegiatan; sisa hari negatif bila batas tgl 5 lewat", () => {
    const ada = new Set(["b1|2026-11"]);
    const kosong = kegiatanBelumDiinput("2026-11-27", ["b1", "b2"], (u, p) => (ada.has(`${u}|${p}`) ? 3 : 0));
    expect(kosong).toEqual([
      { unitId: "b2", periode: "2026-11", batas: "2026-11-05", sisaHari: -22 },
      { unitId: "b1", periode: "2026-12", batas: "2026-12-05", sisaHari: 8 },
      { unitId: "b2", periode: "2026-12", batas: "2026-12-05", sisaHari: 8 },
    ]);
  });
});

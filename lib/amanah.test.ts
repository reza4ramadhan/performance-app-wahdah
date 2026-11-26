import { describe, expect, it } from "vitest";
import { kelompokAmanah, peranTertinggi } from "./amanah";

describe("penugasan rangkap", () => {
  const ksbk = { id: "pKsbk", peranKerja: "KSBK" as const, unitId: "b1" };
  const sbk = { id: "pSbk", peranKerja: "SBK" as const, unitId: "skuo1" };

  it("set menu mengikuti peran tertinggi", () => {
    expect(peranTertinggi([sbk, ksbk])?.id).toBe("pKsbk");
    expect(peranTertinggi([sbk])?.id).toBe("pSbk");
    expect(peranTertinggi([])).toBeNull();
  });

  it("peran sama di bidang yang sama = satu K1 gabungan; beda peran atau beda bidang = terpisah", () => {
    const sbkSkuo1 = { id: "a", peranKerja: "SBK" as const, unitId: "skuo1", bidangId: "b1" };
    const sbkBidang1 = { id: "b", peranKerja: "SBK" as const, unitId: "b1", bidangId: "b1" };
    const sbkBidang2 = { id: "c", peranKerja: "SBK" as const, unitId: "b2", bidangId: "b2" };
    const ksbkBidang1 = { id: "d", peranKerja: "KSBK" as const, unitId: "b1", bidangId: "b1" };
    const ids = (g: { id: string }[][]) => g.map((x) => x.map((p) => p.id));
    expect(ids(kelompokAmanah([sbkSkuo1, sbkBidang1]))).toEqual([["a", "b"]]);
    expect(ids(kelompokAmanah([sbkSkuo1, sbkBidang2]))).toEqual([["a"], ["c"]]);
    expect(ids(kelompokAmanah([sbkSkuo1, ksbkBidang1, sbkBidang1]))).toEqual([["a", "b"], ["d"]]);
  });
});

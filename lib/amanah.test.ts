import { describe, expect, it } from "vitest";
import { amanahPengampu, kelompokAmanah, pilihAmanah } from "./amanah";
import { leluhurDari } from "./unit";

// Kantor → Bidang 1 → SKUO 1; Kantor → Bidang 2; Staf Khusus di bawah Kantor.
const unit = [
  { id: "kantor", jenis: "kantor", indukId: null },
  { id: "b1", jenis: "bidang", indukId: "kantor" },
  { id: "skuo1", jenis: "skuo", indukId: "b1" },
  { id: "b2", jenis: "bidang", indukId: "kantor" },
  { id: "sk", jenis: "staf_khusus", indukId: "kantor" },
];
const leluhur = leluhurDari(unit);

describe("pindah amanah", () => {
  const ksbk = { id: "pKsbk", peranKerja: "KSBK" as const, unitId: "b1" };
  const sbk = { id: "pSbk", peranKerja: "SBK" as const, unitId: "skuo1" };

  it("amanah bawaan mendahulukan yang membawahi orang; pilihan cookie dipakai bila masih berlaku", () => {
    expect(pilihAmanah([sbk, ksbk], undefined)?.id).toBe("pKsbk");
    expect(pilihAmanah([sbk, ksbk], "pSbk")?.id).toBe("pSbk");
    expect(pilihAmanah([sbk, ksbk], "penugasan-lama")?.id).toBe("pKsbk");
    expect(pilihAmanah([], undefined)).toBeNull();
  });

  it("peran sama di bidang yang sama = satu amanah; beda peran atau beda bidang = pindah amanah", () => {
    const sbkSkuo1 = { id: "a", peranKerja: "SBK" as const, unitId: "skuo1", bidangId: "b1" };
    const sbkBidang1 = { id: "b", peranKerja: "SBK" as const, unitId: "b1", bidangId: "b1" };
    const sbkBidang2 = { id: "c", peranKerja: "SBK" as const, unitId: "b2", bidangId: "b2" };
    const ksbkBidang1 = { id: "d", peranKerja: "KSBK" as const, unitId: "b1", bidangId: "b1" };
    const ids = (g: { id: string }[][]) => g.map((x) => x.map((p) => p.id));
    expect(ids(kelompokAmanah([sbkSkuo1, sbkBidang1]))).toEqual([["a", "b"]]);
    expect(ids(kelompokAmanah([sbkSkuo1, sbkBidang2]))).toEqual([["a"], ["c"]]);
    expect(ids(kelompokAmanah([sbkSkuo1, ksbkBidang1, sbkBidang1]))).toEqual([["a", "b"], ["d"]]);
  });

  it("binaan dibagi ke amanah KSBK menurut unit; sisanya ke amanah bawaan", () => {
    const peta = amanahPengampu(
      [sbk, ksbk],
      [
        { id: "staf-skuo", unitId: "skuo1" },
        { id: "diri-sendiri", unitId: "skuo1" },
        { id: "staf-khusus", unitId: "sk" },
      ],
      leluhur,
    );
    expect(peta.get("staf-skuo")).toBe("pKsbk");
    expect(peta.get("diri-sendiri")).toBe("pKsbk");
    expect(peta.get("staf-khusus")).toBe("pKsbk");
  });

  it("KSBK rangkap dua bidang: binaan terpisah per bidang; WaKa menampung sisanya", () => {
    const ksbk2 = { id: "pKsbk2", peranKerja: "KSBK" as const, unitId: "b2" };
    const waka = { id: "pWaka", peranKerja: "WAKA" as const, unitId: "kantor" };
    const peta = amanahPengampu([ksbk, ksbk2, waka], [{ id: "x", unitId: "skuo1" }, { id: "y", unitId: "b2" }, { id: "z", unitId: "sk" }], leluhur);
    expect([peta.get("x"), peta.get("y"), peta.get("z")]).toEqual(["pKsbk", "pKsbk2", "pWaka"]);
  });
});

import { describe, expect, it } from "vitest";
import { kelompokkanTugasSaya, rentangPekan, unitPendek, type BarisTugasSaya } from "./tugas-saya";

const b = (id: string, o: Partial<BarisTugasSaya> = {}): BarisTugasSaya => ({
  id,
  jenis: "item",
  judul: id,
  konteks: null,
  unitId: "a",
  unitNama: "A",
  tenggat: null,
  jam: null,
  lewat: false,
  status: "buka",
  alasanTolak: null,
  pending: false,
  selesaiPada: null,
  href: `/item/${id}`,
  ...o,
});

describe("Tugas · Saya", () => {
  // Kamis 26 Nov 2026; pekan Senin 23 – Minggu 29 Nov.
  const hari = "2026-11-26";
  const sejak = new Date("2026-11-22T16:00:00Z");

  it("rentang pekan Senin–Minggu", () => {
    expect(rentangPekan(hari)).toEqual({ awal: "2026-11-23", akhir: "2026-11-29" });
    expect(rentangPekan("2026-11-29")).toEqual({ awal: "2026-11-23", akhir: "2026-11-29" });
    expect(rentangPekan("2026-11-23").awal).toBe("2026-11-23");
  });

  it("dikelompokkan: diperbaiki, terlambat, hari ini, pekan ini, nanti, pending dana, selesai minggu ini", () => {
    const k = kelompokkanTugasSaya(
      [
        b("tolak", { status: "ditolak", tenggat: "2026-11-20" }),
        b("lewat", { tenggat: "2026-11-25" }),
        b("delegasi-lewat", { jenis: "delegasi", tenggat: hari, lewat: true }),
        b("hari", { tenggat: hari }),
        b("sabtu", { tenggat: "2026-11-28" }),
        b("senin", { tenggat: "2026-11-30" }),
        b("tanpa", {}),
        b("spb", { pending: true }),
        b("menunggu", { status: "menunggu", selesaiPada: new Date("2026-11-24T02:00:00Z") }),
        b("disetujui-lama", { status: "disetujui", selesaiPada: new Date("2026-11-10T02:00:00Z") }),
      ],
      hari,
      sejak,
    );
    const ids = (x: BarisTugasSaya[]) => x.map((y) => y.id);
    expect(ids(k.perbaiki)).toEqual(["tolak"]);
    expect(ids(k.terlambat)).toEqual(["lewat", "delegasi-lewat"]);
    expect(ids(k.hariIni)).toEqual(["hari"]);
    expect(ids(k.pekanIni)).toEqual(["sabtu"]);
    expect(ids(k.nanti)).toEqual(["senin", "tanpa"]);
    expect(ids(k.pending)).toEqual(["spb"]);
    expect(ids(k.selesai.menunggu)).toEqual(["menunggu"]);
    expect(k.selesai.disetujui).toEqual([]);
  });

  it("label pendek unit", () => {
    expect(unitPendek("A · Dakwah, Kaderisasi & PSDM")).toBe("A · Dakwah");
    expect(unitPendek("J · Pusat-Pusat")).toBe("J · Pusat-Pusat");
  });
});

import { describe, expect, it } from "vitest";
import { bolehKelolaPeriode, bolehLihatPegawai, bolehNilaiK3, bolehProsesIkpPegawai, bolehVerifikasiItem, penilaiK3, type Aktor } from "./akses";
import type { PeranSistem } from "./ikp/tipe";

const aktor = (pegawaiId: string, ...peran: PeranSistem[]): Aktor => ({ pegawaiId, peran: new Set<PeranSistem>(["pegawai", ...peran]) });

describe("konflik kepentingan", () => {
  it("item milik sendiri tidak bisa diverifikasi, termasuk oleh Keuangan dan Admin", () => {
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "k", koordinatorId: "x", verifikator: "koordinator" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("f", "keuangan"), { pemilikId: "f", koordinatorId: "x", verifikator: "keuangan" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("s", "admin"), { pemilikId: "s", koordinatorId: "s", verifikator: "admin" }).boleh).toBe(false);
  });

  it("rangkap jabatan: koordinator penugasan miliknya sendiri boleh memverifikasi item itu", () => {
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "k", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(true);
  });

  it("verifikator harus sesuai indikator", () => {
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "a", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(true);
    expect(bolehVerifikasiItem(aktor("k2", "koordinator"), { pemilikId: "a", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "a", koordinatorId: "k", verifikator: "keuangan" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("f", "keuangan"), { pemilikId: "a", koordinatorId: "k", verifikator: "keuangan" }).boleh).toBe(true);
  });

  it("K3 hanya oleh penilai penugasan, tidak untuk diri sendiri", () => {
    expect(bolehNilaiK3(aktor("k"), "a", ["k"]).boleh).toBe(true);
    expect(bolehNilaiK3(aktor("k"), "k", ["k"]).boleh).toBe(false);
    expect(bolehNilaiK3(aktor("x", "waka"), "a", ["k"]).boleh).toBe(false);
  });

  it("KSBK yang juga staf di bidang lain dinilai koordinator bidang tersebut", () => {
    expect(penilaiK3({ pegawaiId: "k", koordinatorId: "k2" }, "w")).toBe("k2");
    expect(bolehNilaiK3(aktor("k2"), "k", ["w", "k2"]).boleh).toBe(true);
  });

  it("rangkap jabatan di bidang sendiri: K3 naik ke WaKa", () => {
    expect(penilaiK3({ pegawaiId: "k", koordinatorId: "k" }, "w")).toBe("w");
    expect(penilaiK3({ pegawaiId: "k", koordinatorId: "k" }, null)).toBeNull();
    expect(penilaiK3({ pegawaiId: "w", koordinatorId: "w" }, "w")).toBeNull();
  });

  it("Admin tidak memproses IKP dirinya sendiri", () => {
    expect(bolehProsesIkpPegawai(aktor("s", "admin"), "s").boleh).toBe(false);
    expect(bolehProsesIkpPegawai(aktor("s", "admin"), "a").boleh).toBe(true);
  });

  it("Wakil Koordinator memverifikasi seperti koordinatornya, tetapi tidak menilai K3", () => {
    const wakil: Aktor = { ...aktor("w", "koordinator"), wakilDari: new Set(["k"]) };
    expect(bolehVerifikasiItem(wakil, { pemilikId: "a", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(true);
    expect(bolehVerifikasiItem(wakil, { pemilikId: "a", koordinatorId: "k9", verifikator: "koordinator" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(wakil, { pemilikId: "w", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(false);
    expect(bolehNilaiK3(wakil, "a", ["k"]).boleh).toBe(false);
  });
});

describe("hak lihat dan periode", () => {
  it("pegawai hanya melihat dirinya; koordinator melihat tim; pimpinan melihat semua", () => {
    expect(bolehLihatPegawai(aktor("a"), "b", new Set()).boleh).toBe(false);
    expect(bolehLihatPegawai(aktor("a"), "a", new Set()).boleh).toBe(true);
    expect(bolehLihatPegawai(aktor("k", "koordinator"), "b", new Set(["b"])).boleh).toBe(true);
    expect(bolehLihatPegawai(aktor("w", "waka"), "b", new Set()).boleh).toBe(true);
  });

  it("Admin mengunci; pengesahan oleh Admin lain (saling periksa) atau Kepala Kantor", () => {
    expect(bolehKelolaPeriode(aktor("s", "admin"), "kunci").boleh).toBe(true);
    expect(bolehKelolaPeriode(aktor("a"), "kunci").boleh).toBe(false);
    expect(bolehKelolaPeriode(aktor("s", "admin"), "sahkan", { pengunci: "s" }).boleh).toBe(false);
    expect(bolehKelolaPeriode(aktor("s2", "admin"), "sahkan", { pengunci: "s" }).boleh).toBe(true);
    expect(bolehKelolaPeriode(aktor("kk", "kepala"), "sahkan", { pengunci: "kk" }).boleh).toBe(true);
    expect(bolehKelolaPeriode(aktor("a", "koordinator"), "sahkan").boleh).toBe(false);
  });
});

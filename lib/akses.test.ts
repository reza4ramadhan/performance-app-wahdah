import { describe, expect, it } from "vitest";
import { bolehKelolaPeriode, bolehLihatPegawai, bolehNilaiK3, bolehProsesIkpPegawai, bolehVerifikasiItem, type Aktor } from "./akses";
import type { PeranSistem } from "./ikp/tipe";

const aktor = (pegawaiId: string, ...peran: PeranSistem[]): Aktor => ({ pegawaiId, peran: new Set<PeranSistem>(["pegawai", ...peran]) });

describe("konflik kepentingan", () => {
  it("tidak ada yang bisa memverifikasi item miliknya sendiri, termasuk Keuangan dan Sekretariat", () => {
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "k", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("f", "keuangan"), { pemilikId: "f", koordinatorId: "x", verifikator: "keuangan" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("s", "sekretariat"), { pemilikId: "s", koordinatorId: "x", verifikator: "sekretariat" }).boleh).toBe(false);
  });

  it("verifikator harus sesuai indikator", () => {
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "a", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(true);
    expect(bolehVerifikasiItem(aktor("k2", "koordinator"), { pemilikId: "a", koordinatorId: "k", verifikator: "koordinator" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("k", "koordinator"), { pemilikId: "a", koordinatorId: "k", verifikator: "keuangan" }).boleh).toBe(false);
    expect(bolehVerifikasiItem(aktor("f", "keuangan"), { pemilikId: "a", koordinatorId: "k", verifikator: "keuangan" }).boleh).toBe(true);
  });

  it("K3 hanya oleh koordinator penugasan, tidak untuk diri sendiri", () => {
    expect(bolehNilaiK3(aktor("k"), { pegawaiId: "a", koordinatorId: "k" }).boleh).toBe(true);
    expect(bolehNilaiK3(aktor("k"), { pegawaiId: "k", koordinatorId: "k" }).boleh).toBe(false);
    expect(bolehNilaiK3(aktor("x", "waka"), { pegawaiId: "a", koordinatorId: "k" }).boleh).toBe(false);
  });

  it("KSBK yang juga staf di bidang lain dinilai koordinator bidang tersebut", () => {
    // Penugasan SBK milik KSBK "k" di bidang lain dengan koordinator "k2".
    expect(bolehNilaiK3(aktor("k2"), { pegawaiId: "k", koordinatorId: "k2" }).boleh).toBe(true);
    expect(bolehNilaiK3(aktor("k"), { pegawaiId: "k", koordinatorId: "k2" }).boleh).toBe(false);
  });

  it("Sekretariat tidak memproses IKP dirinya sendiri", () => {
    expect(bolehProsesIkpPegawai(aktor("s", "sekretariat"), "s").boleh).toBe(false);
    expect(bolehProsesIkpPegawai(aktor("s", "sekretariat"), "a").boleh).toBe(true);
  });
});

describe("hak lihat dan periode", () => {
  it("pegawai hanya melihat dirinya; koordinator melihat tim; pimpinan melihat semua", () => {
    expect(bolehLihatPegawai(aktor("a"), "b", new Set()).boleh).toBe(false);
    expect(bolehLihatPegawai(aktor("a"), "a", new Set()).boleh).toBe(true);
    expect(bolehLihatPegawai(aktor("k", "koordinator"), "b", new Set(["b"])).boleh).toBe(true);
    expect(bolehLihatPegawai(aktor("w", "waka"), "b", new Set()).boleh).toBe(true);
  });

  it("hanya Sekretariat mengunci, hanya Kepala Kantor mengesahkan", () => {
    expect(bolehKelolaPeriode(aktor("s", "sekretariat"), "kunci").boleh).toBe(true);
    expect(bolehKelolaPeriode(aktor("s", "sekretariat"), "sahkan").boleh).toBe(false);
    expect(bolehKelolaPeriode(aktor("kk", "kepala"), "sahkan").boleh).toBe(true);
  });
});

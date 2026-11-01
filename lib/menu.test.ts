import { describe, expect, it } from "vitest";
import type { PeranKerja, PeranSistem } from "./ikp/tipe";
import { hrefMenu, lencanaTab, menuUntuk } from "./menu";

type Sesi = Parameters<typeof menuUntuk>[0];
const sesi = (peranKerja: PeranKerja | null, peran: PeranSistem[] = [], timKerja: PeranKerja[] = []): Sesi => ({
  peran: new Set<PeranSistem>(["pegawai", ...peran]),
  amanah: peranKerja ? ({ peranKerja } as Sesi["amanah"]) : null,
  tim: timKerja.map((p, i) => ({ id: `b${i}`, pegawaiId: `p${i}`, peranKerja: p, unitId: "u", koordinatorId: "k", amanahId: "a" })),
});
/** Lencana tab untuk sesi, dengan semua menu yang ada di sesi itu dianggap punya `n` antrean. */
const tab = (s: Sesi, jumlah: Record<string, number>) => {
  const { grup, tabBawah } = menuUntuk(s);
  const ada = hrefMenu(grup, tabBawah);
  return lencanaTab(tabBawah, grup, Object.fromEntries(Object.entries(jumlah).filter(([h]) => ada.has(h))));
};

describe("lencana navigasi bawah", () => {
  it("SBK: item di tab Item, tugas khusus (tanpa tab) di Hari Ini", () => {
    expect(tab(sesi("SBK"), { "/item": 3, "/tugas": 2 })).toEqual({ "/item": 3, "/": 2 });
  });

  it("Staf Khusus: tugas khusus di tab Tugas", () => {
    expect(tab(sesi("SK"), { "/item": 9, "/tugas": 2 })).toEqual({ "/tugas": 2 });
  });

  it("KSBK: verifikasi dan tugas staf di tabnya sendiri, item laporan bidang di Hari Ini", () => {
    expect(tab(sesi("KSBK", ["koordinator"], ["SBK"]), { "/item": 1, "/verifikasi": 4, "/tim/tugas": 2 })).toEqual({ "/": 1, "/verifikasi": 4, "/tim/tugas": 2 });
  });

  it("koordinator lain: antrean verifikasi dan tugas staf terkumpul di tab Tim", () => {
    expect(tab(sesi("WAKA", ["koordinator", "waka"], ["SK"]), { "/item": 1, "/verifikasi": 4, "/tim/tugas": 2 })).toEqual({ "/item": 1, "/tim": 6 });
  });

  it("Keuangan tanpa tim: verifikasi di tab Kelola", () => {
    const s = sesi("SBK", ["keuangan"]);
    expect(menuUntuk(s).tabBawah.find((t) => t.href === "/tim")?.label).toBe("Kelola");
    expect(tab(s, { "/verifikasi": 5 })).toEqual({ "/tim": 5 });
  });
});

import { describe, expect, it } from "vitest";
import type { PeranKerja, PeranSistem } from "./ikp/tipe";
import { hrefMenu, lencanaTab, menuUntuk } from "./menu";

type Sesi = Parameters<typeof menuUntuk>[0];
const sesi = (peranKerja: PeranKerja | null, peran: PeranSistem[] = [], timKerja: PeranKerja[] = []): Sesi => ({
  peran: new Set<PeranSistem>(["pegawai", ...peran]),
  amanah: peranKerja ? ({ peranKerja } as Sesi["amanah"]) : null,
  tim: timKerja.map((p, i) => ({ id: `b${i}`, pegawaiId: `p${i}`, peranKerja: p, unitId: "u", koordinatorId: "k" })),
});
/** Lencana tab untuk sesi, dengan semua menu yang ada di sesi itu dianggap punya `n` antrean. */
const tab = (s: Sesi, jumlah: Record<string, number>) => {
  const { grup, tabBawah } = menuUntuk(s);
  const ada = hrefMenu(grup, tabBawah);
  return lencanaTab(tabBawah, grup, Object.fromEntries(Object.entries(jumlah).filter(([h]) => ada.has(h))));
};

describe("lencana navigasi bawah", () => {
  it("staf (SBK & SK): 4 tab Tugas · Jurnal · Progres · Akun, + Catat bukan di navigasi", () => {
    for (const p of ["SBK", "SK"] as const) {
      const m = menuUntuk(sesi(p));
      expect(m.tabBawah.map((t) => t.label)).toEqual(["Tugas", "Jurnal", "Progres", "Akun"]);
      expect(m).toMatchObject({ catat: false, mengambang: false });
    }
    expect(menuUntuk(sesi("SK")).grup[0].item.map((i) => i.href)).toContain("/tugas/usulan");
    expect(menuUntuk(sesi("SBK")).grup[0].item.map((i) => i.href)).not.toContain("/tugas/usulan");
  });

  it("koordinator unit: antrean verifikasi, delegasi, dan jadwal terkumpul di tab Tugas", () => {
    expect(tab(sesi("KSBK", ["koordinator"], ["SBK"]), { "/verifikasi": 4, "/tim/tugas": 2, "/tim/kegiatan": 1 })).toEqual({ "/": 7 });
  });

  it("koordinator lain: antrean verifikasi dan tugas staf terkumpul di tab Tim", () => {
    expect(tab(sesi("WAKA", ["koordinator", "waka"], ["SK"]), { "/item": 1, "/verifikasi": 4, "/tim/tugas": 2 })).toEqual({ "/item": 1, "/tim": 6 });
  });

  it("Keuangan tanpa tim: verifikasi di tab Kelola", () => {
    const s = sesi("KU", ["keuangan"]);
    expect(menuUntuk(s).tabBawah.find((t) => t.href === "/tim")?.label).toBe("Kelola");
    expect(tab(s, { "/verifikasi": 5 })).toEqual({ "/tim": 5 });
  });
});

describe("menu KSBK", () => {
  const m = menuUntuk(sesi("KSBK", ["koordinator"], ["SBK"]));

  it("4 tab sama dengan staf, tanpa + Catat di navigasi", () => {
    expect(m.tabBawah.map((t) => t.label)).toEqual(["Tugas", "Jurnal", "Progres", "Akun"]);
    expect(m).toMatchObject({ catat: false, mengambang: false });
  });

  it("sidebar: Utama lalu Tim (Verifikasi, Jadwal, Delegasi, Manage tim)", () => {
    expect(m.grup.map((g) => g.judul)).toEqual(["Utama", "Tim"]);
    expect(m.grup[1].item.map((x) => x.href)).toEqual(["/tim/verifikasi", "/tim/kegiatan", "/tim/tugas", "/tim/plot"]);
  });

  it("fungsi lain tetap tampil (Admin), termasuk kuasa sementara; menu Kantor hanya untuk pimpinan", () => {
    const m = menuUntuk(sesi("KSBK", ["koordinator", "admin"], ["SBK"]));
    expect(m.grup.map((g) => g.judul)).toEqual(["Utama", "Tim", "Admin"]);
    expect(m.grup.at(-1)!.item.map((i) => i.href)).toEqual(expect.arrayContaining(["/kantor/rekap", "/absensi", "/kantor/k4"]));
  });
});

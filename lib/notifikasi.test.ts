import { describe, expect, it } from "vitest";
import { periodeKonfirmasi, pesanPengingat, pesanRencana } from "./notifikasi";

const hari = "2026-11-26";

describe("pengingat 15.00", () => {
  it("staf administrasi: diingatkan bila belum ada aktivitas, atau masih ada tugas hari ini", () => {
    expect(pesanPengingat({ pola: "administrasi", adaAktivitas: false, belumHariIni: 0, terlambat: 0 }, hari)?.title).toBe("Belum ada aktivitas hari ini");
    expect(pesanPengingat({ pola: "administrasi", adaAktivitas: true, belumHariIni: 0, terlambat: 0 }, hari)).toBeNull();
    expect(pesanPengingat({ pola: "administrasi", adaAktivitas: true, belumHariIni: 2, terlambat: 1 }, hari)?.body).toBe("2 tugas hari ini belum selesai, 1 terlambat.");
  });

  it("staf tugas rutin: hanya bila masih ada tugas yang belum ditandai selesai", () => {
    expect(pesanPengingat({ pola: "rutin", adaAktivitas: false, belumHariIni: 0, terlambat: 0 }, hari)).toBeNull();
    expect(pesanPengingat({ pola: "rutin", adaAktivitas: true, belumHariIni: 3, terlambat: 0 }, hari)).toMatchObject({ title: "Tugas rutin belum ditandai selesai", body: "3 tugas hari ini belum selesai." });
  });

  it("koordinator tanpa penugasan staf: hanya untuk tugas pribadinya", () => {
    expect(pesanPengingat({ pola: null, adaAktivitas: false, belumHariIni: 0, terlambat: 0 }, hari)).toBeNull();
    expect(pesanPengingat({ pola: null, adaAktivitas: false, belumHariIni: 1, terlambat: 0 }, hari)?.url).toBe("/?segmen=saya");
  });
});

describe("pengingat konfirmasi rencana", () => {
  it("sejak tanggal 25 untuk bulan depan, sampai batas tanggal 5", () => {
    expect(periodeKonfirmasi("2026-11-24")).toBeNull();
    expect(periodeKonfirmasi("2026-11-25")).toEqual({ periode: "2026-12", batas: "2026-12-05" });
    expect(periodeKonfirmasi("2026-12-05")).toEqual({ periode: "2026-12", batas: "2026-12-05" });
    expect(periodeKonfirmasi("2026-12-06")).toBeNull();
    expect(periodeKonfirmasi("2026-12-28")?.periode).toBe("2027-01");
  });

  it("pesan hanya bila ada yang belum dikonfirmasi", () => {
    const p = periodeKonfirmasi("2026-11-26")!;
    expect(pesanRencana(0, p, "2026-11-26")).toBeNull();
    expect(pesanRencana(3, p, "2026-11-26")).toMatchObject({ title: "Konfirmasi rencana Desember", url: "/tim/kegiatan?periode=2026-12" });
  });
});

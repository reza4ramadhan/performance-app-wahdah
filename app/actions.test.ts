import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/data/schema";

vi.mock("next/cache", () => ({ refresh: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));

const dir = mkdtempSync(path.join(tmpdir(), "ikp-"));
vi.spyOn(process, "cwd").mockReturnValue(dir);

const db = (): Db => JSON.parse(readFileSync(path.join(dir, "data", "db.json"), "utf8"));
const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.set(k, v);
  return fd;
};

let A: typeof import("./actions");
beforeAll(async () => {
  A = await import("./actions");
});

const skorHasan = (amanah: string) =>
  form({
    periodeId: "2026-10", penugasanId: "t09",
    "skor-amanah": amanah, "skor-profesional": "4", "skor-kerjaSama": "4",
    "skor-disiplin": "4", "skor-akhlak": "4", "skor-pengembanganDiri": "4",
  });

describe("server actions", () => {
  it("K3: menolak skor 5 tanpa contoh, menyimpan skor sah, dan mencatat audit", async () => {
    const tolak = await A.simpanSkorK3(null, skorHasan("5"));
    expect(tolak).toMatchObject({ ok: false });
    expect(tolak!.galat![0]).toMatch(/contoh perilaku/);

    expect(await A.simpanSkorK3(null, skorHasan("4"))).toMatchObject({ ok: true });
    expect(db().skorK3.some((s) => s.penugasanId === "t09")).toBe(true);
    expect(db().audit.at(-1)?.aksi).toBe("ubah-k3");
  });

  it("K1: menyimpan, menghapus, dan menolak isian setengah", async () => {
    const r = await A.simpanRealisasi(null, form({
      periodeId: "2026-10", penugasanId: "t06",
      "pembilang|SBK-4|": "3", "penyebut|SBK-4|": "4",
      "pembilang|SBK-1|": "", "penyebut|SBK-1|": "",
    }));
    expect(r).toEqual({ ok: true, pesan: "2 indikator tersimpan.", galat: undefined });
    const rows = db().realisasi.filter((x) => x.penugasanId === "t06");
    expect(rows.find((x) => x.indikatorKode === "SBK-4")?.pembilang).toBe(3);
    expect(rows.some((x) => x.indikatorKode === "SBK-1")).toBe(false);

    const ulang = await A.simpanRealisasi(null, form({ periodeId: "2026-10", penugasanId: "t06", "pembilang|SBK-4|": "3", "penyebut|SBK-4|": "4" }));
    expect(ulang?.pesan).toBe("Tidak ada perubahan.");

    const setengah = await A.simpanRealisasi(null, form({ periodeId: "2026-10", penugasanId: "t06", "pembilang|SBK-5|": "1", "penyebut|SBK-5|": "" }));
    expect(setengah?.ok).toBe(false);
  });

  it("K2: menolak seluruh impor bila ada baris tidak sah", async () => {
    const buruk = "pegawai_id;hari_kerja_wajib;hadir;tepat_waktu;izin_sakit_sah\np02;22;22;22;0\nzz;22;23;1;0";
    const r = await A.imporAbsensi(null, form({ periodeId: "2026-10", teks: buruk }));
    expect(r?.ok).toBe(false);
    expect(r!.galat!.length).toBeGreaterThanOrEqual(2);
    expect(db().absensi.find((a) => a.pegawaiId === "p02")?.hadir).toBe(20);

    const baik = "pegawai_id,hari_kerja_wajib,hadir,tepat_waktu,izin_sakit_sah\np02,22,22,22,0";
    expect(await A.imporAbsensi(null, form({ periodeId: "2026-10", teks: baik }))).toMatchObject({ ok: true });
    expect(db().absensi.find((a) => a.pegawaiId === "p02")?.hadir).toBe(22);
  });

  it("status: pengesahan membekukan hasil dan mengunci periode", async () => {
    const maju = () => A.majukanStatus(null, form({ periodeId: "2026-10" }));
    for (const s of ["Verifikasi", "Diumumkan", "Masa keberatan", "Disahkan"]) {
      expect(await maju()).toMatchObject({ ok: true });
      expect(db().periode[0].status).toBe(s);
    }
    expect(db().periode[0].hasilBeku?.length).toBeGreaterThan(0);
    expect(await A.simpanSkorK3(null, skorHasan("3"))).toMatchObject({ ok: false, pesan: "Periode sudah disahkan dan terkunci." });
  });
});

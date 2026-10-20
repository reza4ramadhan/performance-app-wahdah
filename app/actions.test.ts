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
  it("menolak skor 5 tanpa contoh perilaku, lalu menyimpan skor sah dengan jejak audit", async () => {
    const tolak = await A.simpanSkorK3(null, skorHasan("5"));
    expect(tolak?.ok).toBe(false);
    expect(tolak?.galat?.[0]).toMatch(/contoh perilaku/);

    const ok = await A.simpanSkorK3(null, skorHasan("4"));
    expect(ok?.ok).toBe(true);
    expect(db().skorK3.some((s) => s.penugasanId === "t09")).toBe(true);
    expect(db().audit.at(-1)?.aksi).toBe("ubah-k3");
  });

  it("menyimpan dan menghapus realisasi K1", async () => {
    const r = await A.simpanRealisasi(null, form({
      periodeId: "2026-10", penugasanId: "t06",
      "pembilang|SBK-4|": "3", "penyebut|SBK-4|": "4",
      "pembilang|SBK-1|": "", "penyebut|SBK-1|": "",
    }));
    expect(r?.ok).toBe(true);
    const rows = db().realisasi.filter((x) => x.penugasanId === "t06");
    expect(rows.find((x) => x.indikatorKode === "SBK-4")?.pembilang).toBe(3);
    expect(rows.some((x) => x.indikatorKode === "SBK-1")).toBe(false);

    const setengah = await A.simpanRealisasi(null, form({ periodeId: "2026-10", penugasanId: "t06", "pembilang|SBK-5|": "1", "penyebut|SBK-5|": "" }));
    expect(setengah?.ok).toBe(false);
  });

  it("menolak seluruh impor absensi bila ada baris tidak sah", async () => {
    const teks = "pegawai_id;hari_kerja_wajib;hadir;tepat_waktu;izin_sakit_sah\np02;22;22;22;0\nzz;22;23;1;0";
    const r = await A.imporAbsensi(null, form({ periodeId: "2026-10", teks }));
    expect(r?.ok).toBe(false);
    expect(r?.galat?.length).toBeGreaterThanOrEqual(2);
    expect(db().absensi.find((a) => a.pegawaiId === "p02")?.hadir).toBe(20);

    const ok = await A.imporAbsensi(null, form({ periodeId: "2026-10", teks: "pegawai_id,hari_kerja_wajib,hadir,tepat_waktu,izin_sakit_sah\np02,22,22,22,0" }));
    expect(ok?.ok).toBe(true);
    expect(db().absensi.find((a) => a.pegawaiId === "p02")?.hadir).toBe(22);
  });

  it("membekukan hasil saat disahkan dan mengunci periode", async () => {
    const fd = () => form({ periodeId: "2026-10" });
    for (let i = 0; i < 3; i++) expect((await A.majukanStatus(null, fd()))?.ok).toBe(true);
    expect(db().periode[0].status).toBe("Masa keberatan");
    expect((await A.majukanStatus(null, fd()))?.ok).toBe(true);
    const p = db().periode[0];
    expect(p.status).toBe("Disahkan");
    expect(p.hasilBeku?.length).toBeGreaterThan(0);

    const ubah = await A.simpanSkorK3(null, skorHasan("3"));
    expect(ubah).toEqual({ ok: false, pesan: "Periode sudah disahkan dan terkunci.", galat: [] });
  });
});

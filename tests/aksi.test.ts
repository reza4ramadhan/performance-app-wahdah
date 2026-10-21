// Uji integrasi Server Action terhadap PostgreSQL tertanam (PGlite) sungguhan.
// Sesi dipalsukan; aturan akses, validasi, dan penulisan basis data berjalan apa adanya.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { PeranSistem } from "@/lib/ikp/tipe";
import type { Sesi } from "@/lib/sesi";
import { geserHariKerja, hariIni, periodeBerikut, periodeDari, tambahHari } from "@/lib/waktu";

process.env.IKP_PGLITE_DIR = mkdtempSync(path.join(tmpdir(), "ikp-uji-"));

let sesiAktif: Sesi | null = null;
vi.mock("next/cache", () => ({ refresh: () => {}, revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`redirect:${u}`);
  },
}));
vi.mock("@/lib/sesi", () => ({
  bacaSesi: async () => sesiAktif,
  wajibSesi: async () => {
    if (!sesiAktif) throw new Error("redirect:/masuk");
    return sesiAktif;
  },
  wajibPeran: async (...p: PeranSistem[]) => {
    if (!sesiAktif || !p.some((x) => sesiAktif!.peran.has(x))) throw new Error("redirect:/");
    return sesiAktif;
  },
}));

const { getDb, schema: s } = await import("@/lib/db");
const { sinkronKatalog } = await import("@/lib/ikp/sinkron");
const item = await import("@/app/aksi/item");
const verif = await import("@/app/aksi/verifikasi");
const tim = await import("@/app/aksi/tim");
const periode = await import("@/app/aksi/periode");
const absensi = await import("@/app/aksi/absensi");
const { eq } = await import("drizzle-orm");

const today = hariIni("makassar");
const P = periodeDari(today);
const id: Record<string, string> = {};
const pn: Record<string, string> = {};

function sebagai(pegawai: string, peran: PeranSistem[] = [], penugasan: { id: string; peranKerja: "SBK" | "KSBK"; unitId: string; koordinatorId: string | null }[] = []) {
  sesiAktif = {
    userId: `u-${pegawai}`,
    pegawaiId: id[pegawai],
    nama: pegawai,
    kantor: "makassar",
    harusGantiPassword: false,
    peran: new Set<PeranSistem>(["pegawai", ...peran]),
    penugasan: penugasan.map((p) => ({ ...p, unitNama: "Bidang Uji" })),
  };
}

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of [v].flat()) f.append(k, x);
  return f;
};

beforeAll(async () => {
  const db = await getDb();
  await sinkronKatalog(db);
  const [u] = await db.insert(s.unit).values({ jenis: "bidang", nama: "Bidang Uji" }).returning();
  for (const [nama, nip] of [["staf", "1"], ["staf2", "2"], ["koord", "3"], ["koord2", "4"], ["keu", "5"], ["sekr", "6"], ["kepala", "7"], ["pers", "8"]]) {
    const [p] = await db.insert(s.pegawai).values({ nama, nip }).returning();
    id[nama] = p.id;
  }
  const tambah = async (k: string, pegawai: string, peranKerja: "SBK" | "KSBK", koordinator: string | null) => {
    const [x] = await db.insert(s.penugasan).values({ pegawaiId: id[pegawai], peranKerja, unitId: u.id, koordinatorId: koordinator ? id[koordinator] : null, periodeMulai: periodeBerikut(P, -1) }).returning();
    pn[k] = x.id;
  };
  await tambah("staf", "staf", "SBK", "koord");
  await tambah("staf2", "staf2", "SBK", "koord");
  await tambah("koord", "koord", "KSBK", "kepala");
  await tambah("pers", "pers", "SBK", "koord");
  id.unit = u.id;
  await db.insert(s.periode).values({ id: P });
});

const pnStaf = () => ({ id: pn.staf, peranKerja: "SBK" as const, unitId: id.unit, koordinatorId: id.koord });

describe("item harian", () => {
  it("menyimpan item selesai sebagai 'diajukan' dan tidak membuat ganda saat draf luring dikirim ulang", async () => {
    sebagai("staf", [], [pnStaf()]);
    const isi = { idKlien: "klien-0001", penugasanId: pn.staf, indikatorKode: "SBK-1", masuk: today, selesai: today, linkBukti: "https://drive.google.com/x", data: { perihal: "Undangan rapat" } };
    const r = await item.simpanItem(isi);
    expect(r).toMatchObject({ ok: true });
    expect((await item.simpanItem(isi)).ok).toBe(true);
    const db = await getDb();
    const rows = await db.select().from(s.item).where(eq(s.item.idKlien, "klien-0001"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "diajukan", periodeId: P });
    id.item = rows[0].id;
  });

  it("menolak selesai tanpa link bukti, field wajib kosong, dan tanggal di luar jendela 2 hari kerja", async () => {
    sebagai("staf", [], [pnStaf()]);
    const lama = geserHariKerja(today, -3, new Set());
    const r = await item.simpanItem({ idKlien: "klien-0002", penugasanId: pn.staf, indikatorKode: "SBK-1", masuk: lama, selesai: today, data: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.galat ?? {})).toEqual(expect.arrayContaining(["linkBukti", "data.perihal", "masuk"]));
  });

  it("menolak tanggal di masa depan dan indikator di luar peran", async () => {
    sebagai("staf", [], [pnStaf()]);
    const besok = await item.simpanItem({ idKlien: "klien-0003", penugasanId: pn.staf, indikatorKode: "SBK-1", masuk: tambahHari(today, 1), data: { perihal: "x" } });
    expect(besok.ok).toBe(false);
    const salahPeran = await item.simpanItem({ idKlien: "klien-0004", penugasanId: pn.staf, indikatorKode: "KSBK-3", selesai: today, linkBukti: "https://x.id", data: {} });
    expect(salahPeran).toMatchObject({ ok: false, pesan: "Indikator ini tidak berlaku untuk penugasan Anda." });
  });
});

describe("verifikasi & konflik kepentingan", () => {
  it("pemilik dan koordinator lain tidak bisa memverifikasi; koordinator penugasan bisa", async () => {
    sebagai("staf", ["koordinator"], [pnStaf()]);
    expect((await verif.verifikasiItem([id.item], "setuju")).ok).toBe(false);
    sebagai("koord2", ["koordinator"]);
    expect((await verif.verifikasiItem([id.item], "setuju")).ok).toBe(false);
    sebagai("koord", ["koordinator"]);
    expect((await verif.verifikasiItem([id.item], "tolak")).ok).toBe(false); // alasan wajib
    expect(await verif.verifikasiItem([id.item], "setuju")).toMatchObject({ ok: true });
    const db = await getDb();
    const [row] = await db.select().from(s.item).where(eq(s.item.id, id.item));
    expect(row).toMatchObject({ status: "disetujui", verifikatorId: id.koord });
    const audit = await db.select().from(s.auditLog).where(eq(s.auditLog.entitasId, id.item));
    expect(audit.map((a) => a.aksi)).toEqual(expect.arrayContaining(["buat", "setujui"]));
  });

  it("item yang disetujui tidak bisa diubah atau dihapus pemiliknya", async () => {
    sebagai("staf", [], [pnStaf()]);
    expect((await item.hapusItem(id.item)).ok).toBe(false);
    expect((await item.ubahItem(id.item, { masuk: today, data: { perihal: "y" } })).ok).toBe(false);
  });
});

describe("penilaian K3", () => {
  const skor = (o: Record<string, string>) => ({ "skor-akhlak": "4", "skor-profesional": "4", "skor-inovatif": "4", "skor-kolaboratif": "4", "skor-rasaMemiliki": "4", "skor-pengembanganDiri": "2", ...o });

  it("skor 5 tanpa contoh ditolak saat dikirim; pengembangan diri > 2 tanpa log ditolak", async () => {
    sebagai("koord", ["koordinator"]);
    const r = await tim.simpanK3(null, fd({ penugasanId: pn.staf, periodeId: P, kirim: "1", ...skor({ "skor-akhlak": "5", "skor-pengembanganDiri": "4" }) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.galat ?? {})).toEqual(expect.arrayContaining(["contoh-akhlak", "skor-pengembanganDiri"]));
    expect(await tim.simpanK3(null, fd({ penugasanId: pn.staf, periodeId: P, kirim: "1", ...skor({ "skor-akhlak": "5", "contoh-akhlak": "Mengembalikan kelebihan dana" }) }))).toMatchObject({ ok: true });
  });

  it("tidak bisa menilai diri sendiri, dan bukan koordinatornya tidak bisa menilai", async () => {
    sebagai("koord", ["koordinator"]);
    expect((await tim.simpanK3(null, fd({ penugasanId: pn.koord, periodeId: P, kirim: "1", ...skor({}) }))).ok).toBe(false);
    sebagai("koord2", ["koordinator"]);
    expect((await tim.simpanK3(null, fd({ penugasanId: pn.staf2, periodeId: P, kirim: "1", ...skor({}) }))).ok).toBe(false);
  });
});

describe("absensi", () => {
  it("Personalia tidak bisa menyimpan baris absensinya sendiri", async () => {
    sebagai("pers", ["personalia"]);
    const baris = [
      { baris: 2, identitas: "1", pegawaiId: id.staf, nama: "staf", hariKerjaWajib: 22, hadir: 20, hadirTepatWaktu: 19, izinSakit: 1, sanksiBerat: false, galat: [] },
      { baris: 3, identitas: "8", pegawaiId: id.pers, nama: "pers", hariKerjaWajib: 22, hadir: 22, hadirTepatWaktu: 22, izinSakit: 0, sanksiBerat: false, galat: [] },
    ];
    const r = await absensi.simpanAbsensi(P, baris);
    expect(r.ok).toBe(true);
    const db = await getDb();
    const rows = await db.select().from(s.absensi).where(eq(s.absensi.periodeId, P));
    expect(rows.map((x) => x.pegawaiId)).toEqual([id.staf]);
  });
});

describe("status periode", () => {
  it("hanya Sekretariat mengunci, hanya Kepala Kantor mengesahkan; setelah sah input ditolak", async () => {
    sebagai("staf", [], [pnStaf()]);
    expect((await periode.ubahStatusPeriode(P, "verifikasi")).ok).toBe(false);
    sebagai("sekr", ["sekretariat"]);
    for (const l of ["verifikasi", "kalibrasi", "sementara"]) expect(await periode.ubahStatusPeriode(P, l)).toMatchObject({ ok: true });
    expect((await periode.ubahStatusPeriode(P, "disahkan")).ok).toBe(false);
    sebagai("kepala", ["kepala"]);
    expect(await periode.ubahStatusPeriode(P, "disahkan")).toMatchObject({ ok: true });

    const db = await getDb();
    const snap = await db.select().from(s.hasilIkp).where(eq(s.hasilIkp.periodeId, P));
    expect(snap.length).toBeGreaterThan(0);
    expect(snap.every((r) => r.versi === "akhir")).toBe(true);

    sebagai("staf", [], [pnStaf()]);
    const r = await item.simpanItem({ idKlien: "klien-0099", penugasanId: pn.staf, indikatorKode: "SBK-1", masuk: today, data: { perihal: "terlambat" } });
    expect(r).toMatchObject({ ok: false, pesan: "Periode item ini sudah dikunci." });
  });
});

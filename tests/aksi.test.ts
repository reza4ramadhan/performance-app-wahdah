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
const harian = await import("@/app/aksi/harian");
const tugas = await import("@/app/aksi/tugas");
const k4 = await import("@/app/aksi/k4");
const admin = await import("@/app/aksi/admin");
const { tanggalJadwal } = await import("@/lib/ikp/tugas");
const { and, eq, inArray } = await import("drizzle-orm");

const today = hariIni("makassar");
const P = periodeDari(today);
const id: Record<string, string> = {};
const pn: Record<string, string> = {};

function sebagai(pegawai: string, peran: PeranSistem[] = [], penugasan: { id: string; peranKerja: "SBK" | "KSBK" | "SK"; unitId: string; bidangId?: string; koordinatorId: string | null }[] = []) {
  const milik = penugasan.map((p) => ({ ...p, unitNama: "Bidang Uji", bidangId: p.bidangId ?? p.unitId, polaKerja: p.peranKerja === "SK" ? ("rutin" as const) : ("administrasi" as const) }));
  sesiAktif = {
    userId: `u-${pegawai}`,
    pegawaiId: id[pegawai],
    nama: pegawai,
    kantor: "makassar",
    harusGantiPassword: false,
    peran: new Set<PeranSistem>(["pegawai", ...peran]),
    penugasan: milik,
    binaan: [],
    amanah: milik[0] ?? null,
    amanahPn: milik,
    tim: [],
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

describe("jurnal", () => {
  const poin = (o: Record<string, string> = {}) => ({ tanggal: today, uraian: "Mendampingi tamu", durasiMenit: "90", ...o });

  it("wajib durasi (menit); tersimpan bersama uraian dan link", async () => {
    sebagai("staf", [], [pnStaf()]);
    expect(await harian.simpanJurnal(null, fd(poin({ durasiMenit: "" })))).toMatchObject({ ok: false, galat: { durasiMenit: expect.any(String) } });
    expect(await harian.simpanJurnal(null, fd(poin({ durasiMenit: "2" })))).toMatchObject({ ok: false, galat: { durasiMenit: "Minimal 5 menit." } });
    expect(await harian.simpanJurnal(null, fd(poin()))).toMatchObject({ ok: true });
    const db = await getDb();
    const [row] = await db.select().from(s.jurnal).where(eq(s.jurnal.pegawaiId, id.staf));
    expect(row).toMatchObject({ durasiMenit: 90, jamMulai: null });
  });

  it("isi sekaligus: baris kosong dilewati, satu baris salah membatalkan semuanya", async () => {
    sebagai("staf2", [], [{ ...pnStaf(), id: pn.staf2 }]);
    const banyak = (durasi2: string) => fd({ tanggal: today, uraian: ["Rapat panitia", "Menyusun notulen", ""], durasiMenit: ["120", durasi2, "30"], link: ["", "", ""] });
    expect(await harian.simpanJurnalSekaligus(null, banyak("abc"))).toMatchObject({ ok: false, galat: { "durasiMenit.1": expect.any(String) } });
    const db = await getDb();
    expect(await db.select().from(s.jurnal).where(eq(s.jurnal.pegawaiId, id.staf2))).toHaveLength(0);
    expect(await harian.simpanJurnalSekaligus(null, banyak("45"))).toMatchObject({ ok: true, pesan: "2 entri jurnal tersimpan." });
    const rows = await db.select().from(s.jurnal).where(eq(s.jurnal.pegawaiId, id.staf2));
    expect(rows.map((r) => [r.uraian, r.durasiMenit]).sort()).toEqual([
      ["Menyusun notulen", 45],
      ["Rapat panitia", 120],
    ]);
    expect((await harian.simpanJurnalSekaligus(null, fd({ tanggal: today, uraian: [""], durasiMenit: ["30"], link: [""] }))).ok).toBe(false);
  });

  it("hanya pemilik yang mengubah, dan hanya dalam jendela 2 hari kerja", async () => {
    const db = await getDb();
    const [j] = await db.select().from(s.jurnal).where(eq(s.jurnal.pegawaiId, id.staf));
    sebagai("staf2", [], [{ ...pnStaf(), id: pn.staf2 }]);
    expect(await harian.ubahJurnal(null, fd(poin({ id: j.id, uraian: "Diubah orang lain" })))).toMatchObject({ ok: false, pesan: "Jurnal tidak ditemukan." });

    sebagai("staf", [], [pnStaf()]);
    expect(await harian.ubahJurnal(null, fd(poin({ id: j.id, uraian: "Mendampingi tamu pimpinan", durasiMenit: "60" })))).toMatchObject({ ok: true });
    const [baru] = await db.select().from(s.jurnal).where(eq(s.jurnal.id, j.id));
    expect(baru).toMatchObject({ uraian: "Mendampingi tamu pimpinan", durasiMenit: 60 });
    const lama = geserHariKerja(today, -3, new Set());
    expect(await harian.ubahJurnal(null, fd(poin({ id: j.id, tanggal: lama })))).toMatchObject({ ok: false, galat: { tanggal: expect.any(String) } });

    const [terkunci] = await db.insert(s.jurnal).values({ pegawaiId: id.staf, tanggal: lama, uraian: "Jurnal lama" }).returning();
    expect(await harian.ubahJurnal(null, fd(poin({ id: terkunci.id })))).toMatchObject({ ok: false, pesan: "Jurnal lebih dari 2 hari kerja ke belakang sudah terkunci." });
  });
});

describe("Pending SPB", () => {
  it("staf menandai SPB pending; koordinator mengonfirmasi tanggal cair; tenggat berjalan lagi dari tanggal cair", async () => {
    const db = await getDb();
    const [spb] = await db.insert(s.item).values({ penugasanId: pn.staf, indikatorKode: "SBK-2b", periodeId: P, tglMasuk: new Date(), status: "terbuka", dibuatOleh: id.koord }).returning();
    const [surat] = await db.insert(s.item).values({ penugasanId: pn.staf, indikatorKode: "SBK-1", periodeId: P, tglMasuk: new Date(), status: "terbuka", dibuatOleh: id.staf }).returning();

    sebagai("staf", [], [pnStaf()]);
    expect(await item.tandaiPendingSpb(surat.id, "")).toMatchObject({ ok: false, pesan: "Pending dana hanya untuk SPB." });
    expect(await item.tandaiPendingSpb(spb.id, "Dana DPP belum tersedia")).toMatchObject({ ok: true });
    expect((await db.select().from(s.item).where(eq(s.item.id, spb.id)))[0].pendingDanaSejak).not.toBeNull();
    // Staf tidak bisa mengonfirmasi dana cair untuk SPB-nya sendiri.
    expect((await item.konfirmasiDanaCair(spb.id, today)).ok).toBe(false);

    sebagai("koord2", ["koordinator"]);
    expect((await item.konfirmasiDanaCair(spb.id, today)).ok).toBe(false);
    sebagai("koord", ["koordinator"]);
    expect(await item.konfirmasiDanaCair(spb.id, tambahHari(today, 1))).toMatchObject({ ok: false, pesan: "Tanggal cair tidak boleh di masa depan." });
    expect(await item.konfirmasiDanaCair(spb.id, today)).toMatchObject({ ok: true });
    const [sesudah] = await db.select().from(s.item).where(eq(s.item.id, spb.id));
    expect(sesudah).toMatchObject({ danaCairPada: today, danaCairOleh: id.koord });

    // Setelah cair, tanda pending tidak bisa diubah lagi.
    sebagai("staf", [], [pnStaf()]);
    expect((await item.tandaiPendingSpb(spb.id, "", true)).ok).toBe(false);
    await db.delete(s.item).where(inArray(s.item.id, [spb.id, surat.id]));
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
    const r = await tim.simpanK3(null, fd({ pegawaiId: id.staf, periodeId: P, kirim: "1", ...skor({ "skor-akhlak": "5", "skor-pengembanganDiri": "4" }) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.galat ?? {})).toEqual(expect.arrayContaining(["contoh-akhlak", "skor-pengembanganDiri"]));
    expect(await tim.simpanK3(null, fd({ pegawaiId: id.staf, periodeId: P, kirim: "1", ...skor({ "skor-akhlak": "5", "contoh-akhlak": "Mengembalikan kelebihan dana" }) }))).toMatchObject({ ok: true });
  });

  it("tidak bisa menilai diri sendiri, dan bukan koordinatornya tidak bisa menilai", async () => {
    sebagai("koord", ["koordinator"]);
    expect((await tim.simpanK3(null, fd({ pegawaiId: id.koord, periodeId: P, kirim: "1", ...skor({}) }))).ok).toBe(false);
    sebagai("koord2", ["koordinator"]);
    expect((await tim.simpanK3(null, fd({ pegawaiId: id.staf2, periodeId: P, kirim: "1", ...skor({}) }))).ok).toBe(false);
  });
});

describe("kegiatan SKUO & item otomatis", () => {
  it("SKUO dan penanggung jawab wajib; PJ harus staf bidang; item otomatis masuk ke PJ", async () => {
    const db = await getDb();
    const [skuo] = await db.insert(s.unit).values({ jenis: "skuo", nama: "Departemen Uji", indukId: id.unit }).returning();
    const [pg] = await db.insert(s.pegawai).values({ nama: "stafSkuo", nip: "9" }).returning();
    const [x] = await db.insert(s.penugasan).values({ pegawaiId: pg.id, peranKerja: "SBK", unitId: skuo.id, koordinatorId: id.koord, periodeMulai: P }).returning();
    id.skuo = skuo.id;

    sebagai("koord", ["koordinator"], [{ id: pn.koord, peranKerja: "KSBK", unitId: id.unit, koordinatorId: id.kepala }]);
    const isi = { unitId: id.unit, nama: "Daurah Uji", tanggal: today, perluSppSpb: "on" };
    expect(await tim.simpanKegiatan(null, fd(isi))).toMatchObject({ ok: false, galat: { skuoId: expect.any(String) } });
    // PJ kosong dan departemen belum punya plot di Manage tim: koordinator diminta memilih.
    expect(await tim.simpanKegiatan(null, fd({ ...isi, skuoId: skuo.id }))).toMatchObject({ ok: false, galat: { penanggungJawabId: expect.any(String) } });
    expect(await tim.simpanKegiatan(null, fd({ ...isi, skuoId: skuo.id, penanggungJawabId: id.kepala }))).toMatchObject({ ok: false, galat: { penanggungJawabId: expect.any(String) } });
    const [skuoLain] = await db.insert(s.unit).values({ jenis: "skuo", nama: "Departemen Lain", indukId: null }).returning();
    expect(await tim.simpanKegiatan(null, fd({ ...isi, penanggungJawabId: pg.id, skuoId: skuoLain.id }))).toMatchObject({ ok: false, galat: { skuoId: expect.any(String) } });
    expect(await tim.simpanKegiatan(null, fd({ ...isi, penanggungJawabId: pg.id, skuoId: skuo.id }))).toMatchObject({ ok: true });

    const [keg] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.nama, "Daurah Uji"));
    expect(keg).toMatchObject({ penanggungJawabId: pg.id, skuoId: skuo.id, perluSpp: true, perluSpb: true });
    const otomatis = await db.select().from(s.item).where(eq(s.item.kegiatanId, keg.id));
    expect(otomatis.map((i) => `${i.indikatorKode}${i.data.ke ?? ""}`).sort()).toEqual(["SBK-2a", "SBK-2b", "SBK-31", "SBK-32"]);
    expect(otomatis.every((i) => i.penugasanId === x.id && i.status === "terbuka")).toBe(true);

    // Staf menyelesaikan item otomatis, tetapi tidak bisa mencatatnya sendiri, mengganti kegiatannya, atau menghapusnya.
    sesiAktif = { ...sesiAktif!, pegawaiId: pg.id, peran: new Set(["pegawai"]), penugasan: [{ id: x.id, peranKerja: "SBK", unitId: skuo.id, unitNama: "Departemen Uji", bidangId: id.unit, koordinatorId: id.koord, polaKerja: "administrasi" }] };
    expect((await item.simpanItem({ idKlien: "klien-skuo-1", penugasanId: x.id, indikatorKode: "SBK-2a", kegiatanId: keg.id, selesai: today, linkBukti: "https://x.id", data: { nomor: "SPP-1" } })).ok).toBe(false);
    const spp = otomatis.find((i) => i.indikatorKode === "SBK-2a")!;
    const pengingat = otomatis.find((i) => i.data.ke === "2")!;
    expect(await item.selesaikanItem(spp.id, today, "https://x.id")).toMatchObject({ ok: true });
    expect(await item.ubahItem(pengingat.id, { kegiatanId: null, selesai: today, linkBukti: "https://x.id", data: { saluran: "Grup" } })).toMatchObject({ ok: true });
    const [p2] = await db.select().from(s.item).where(eq(s.item.id, pengingat.id));
    expect(p2).toMatchObject({ status: "diajukan", kegiatanId: keg.id, data: { ke: "2", saluran: "Grup" } });
    expect((await item.hapusItem(otomatis.find((i) => i.data.ke === "1")!.id)).ok).toBe(false);
    // Layanan & arsip tetap dicatat staf; arsip boleh tanpa kegiatan.
    expect(await item.simpanItem({ idKlien: "klien-skuo-2", penugasanId: x.id, indikatorKode: "SBK-5", masuk: today, data: { jenis: "Notulensi", judul: "Notulensi rapat" } })).toMatchObject({ ok: true });

    // SPP sekarang diverifikasi KSBK, bukan Keuangan.
    sebagai("keu", ["keuangan"]);
    expect((await verif.verifikasiItem([spp.id], "setuju")).ok).toBe(false);
    sebagai("koord", ["koordinator"]);
    expect(await verif.verifikasiItem([spp.id], "setuju")).toMatchObject({ ok: true });
  });

  it("kegiatan yang sudah dikerjakan tidak bisa dihapus; yang belum disentuh terhapus bersama item otomatisnya", async () => {
    const db = await getDb();
    sebagai("koord", ["koordinator"], [{ id: pn.koord, peranKerja: "KSBK", unitId: id.unit, koordinatorId: id.kepala }]);
    const [daurah] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.nama, "Daurah Uji"));
    expect((await tim.hapusKegiatan(daurah.id)).ok).toBe(false);

    // PJ lintas SKUO: staf bidang menangani kegiatan SKUO Departemen Uji.
    expect(await tim.simpanKegiatan(null, fd({ unitId: id.unit, nama: "Rapat Uji", tanggal: today, skuoId: id.skuo, penanggungJawabId: id.staf }))).toMatchObject({ ok: true });
    const [rapat] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.nama, "Rapat Uji"));
    const itemRapat = await db.select().from(s.item).where(eq(s.item.kegiatanId, rapat.id));
    expect(itemRapat.map((i) => i.indikatorKode)).toEqual(["SBK-3", "SBK-3"]); // tanpa SPP & SPB
    expect(itemRapat.every((i) => i.penugasanId === pn.staf)).toBe(true);
    expect(await tim.hapusKegiatan(rapat.id)).toMatchObject({ ok: true });
    expect(await db.select().from(s.item).where(eq(s.item.kegiatanId, rapat.id))).toHaveLength(0);
  });

  it("PJ kosong diambil dari plot Manage tim; kegiatan berstatus rencana tidak menerbitkan checklist", async () => {
    const db = await getDb();
    const { buatItemOtomatis } = await import("@/lib/data/kegiatan");
    await db.insert(s.plotSkuo).values({ unitId: id.unit, skuoId: id.skuo, pegawaiId: id.staf, utama: true, berlakuMulai: `${P}-01` });
    sebagai("koord", ["koordinator"], [{ id: pn.koord, peranKerja: "KSBK", unitId: id.unit, koordinatorId: id.kepala }]);
    expect(await tim.simpanKegiatan(null, fd({ unitId: id.unit, nama: "Kajian Plot", tanggal: today, skuoId: id.skuo }))).toMatchObject({ ok: true });
    const [kajian] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.nama, "Kajian Plot"));
    expect(kajian).toMatchObject({ penanggungJawabId: id.staf, status: "jalan" });
    expect(await db.select().from(s.item).where(eq(s.item.kegiatanId, kajian.id))).toHaveLength(2);

    const [rencana] = await db
      .insert(s.kegiatan)
      .values({ unitId: id.unit, nama: "Rencana SIMAKPRO", tanggal: today, skuoId: id.skuo, penanggungJawabId: id.staf, dibuatOleh: id.koord, sumber: "rencana", status: "rencana" })
      .returning();
    expect(await buatItemOtomatis(db, [rencana], id.koord)).toBe(0);
    await db.delete(s.item).where(eq(s.item.kegiatanId, kajian.id));
    await db.delete(s.kegiatan).where(inArray(s.kegiatan.id, [kajian.id, rencana.id]));
    await db.delete(s.plotSkuo);
  });

  it("kegiatan lama tanpa item otomatis: diisi dari kartu dashboard, item dilengkapi tanpa ganda", async () => {
    const db = await getDb();
    const { buatItemOtomatis } = await import("@/lib/data/kegiatan");
    // Kegiatan dibuat sebelum item otomatis ada; pengingat sempat dicatat manual tanpa nomor.
    const [lama] = await db
      .insert(s.kegiatan)
      .values({ unitId: id.unit, nama: "Kegiatan Lama", tanggal: today, skuoId: id.skuo, penanggungJawabId: id.staf, perluSpp: true, perluSpb: true, dibuatOleh: id.koord })
      .returning();
    await db.insert(s.item).values({ penugasanId: pn.staf, indikatorKode: "SBK-3", kegiatanId: lama.id, periodeId: P, data: { saluran: "Grup" }, tglMasuk: new Date(), status: "terbuka", dibuatOleh: id.staf });

    sebagai("staf", [], [{ id: pn.staf, peranKerja: "SBK", unitId: id.unit, koordinatorId: id.koord }]);
    const isian = { selesai: today, linkBukti: "https://x.id", data: { nomor: "SPB-9" } };
    expect(await item.isiItemKegiatan(lama.id, "SBK-4", null, isian)).toMatchObject({ ok: false });
    expect(await item.isiItemKegiatan(lama.id, "SBK-2b", null, isian)).toMatchObject({ ok: true });

    const semua = await db.select().from(s.item).where(eq(s.item.kegiatanId, lama.id));
    expect(semua.map((i) => `${i.indikatorKode}${i.data.ke ?? ""}`).sort()).toEqual(["SBK-2a", "SBK-2b", "SBK-31", "SBK-32"]);
    expect(semua.find((i) => i.indikatorKode === "SBK-2b")).toMatchObject({ status: "diajukan", data: { nomor: "SPB-9" } });
    expect(semua.find((i) => i.data.saluran === "Grup")?.data.ke).toBe("1");
    expect(await buatItemOtomatis(db, [lama], id.koord)).toBe(0);

    // Bukan penanggung jawab: tidak bisa mengisi.
    sebagai("staf2", [], [{ id: pn.staf2, peranKerja: "SBK", unitId: id.unit, koordinatorId: id.koord }]);
    expect(await item.isiItemKegiatan(lama.id, "SBK-2a", null, isian)).toMatchObject({ ok: false });
  });
});

describe("tugas khusus", () => {
  const pnStafTugas = () => ({ id: pn.staf, peranKerja: "SBK" as const, unitId: id.unit, koordinatorId: id.koord });
  const isi = (o: Record<string, string> = {}) => ({ penugasanId: pn.staf, judul: "Menyiapkan bahan rapat", frekuensi: "sekali", tanggalMulai: today, jamTenggat: "23:59", ...o });

  it("hanya koordinator penugasan yang bisa memberi tugas; tugas berulang membuat satu jadwal per hari kerja", async () => {
    sebagai("koord2", ["koordinator"]);
    expect(await tugas.simpanTugasKhusus(null, fd(isi()))).toMatchObject({ ok: false, galat: { penugasanId: expect.any(String) } });
    sebagai("koord", ["koordinator"]);
    expect(await tugas.simpanTugasKhusus(null, fd(isi({ frekuensi: "harian" })))).toMatchObject({ ok: false, galat: { tanggalAkhir: expect.any(String) } });
    expect(await tugas.simpanTugasKhusus(null, fd(isi({ tanggalMulai: tambahHari(today, -1) })))).toMatchObject({ ok: false, galat: { tanggalMulai: expect.any(String) } });
    expect(await tugas.simpanTugasKhusus(null, fd(isi()))).toMatchObject({ ok: true });
    const akhir = tambahHari(today, 9);
    expect(await tugas.simpanTugasKhusus(null, fd(isi({ judul: "Patroli arsip", frekuensi: "harian", tanggalAkhir: akhir })))).toMatchObject({ ok: true });

    const db = await getDb();
    const [harian] = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.judul, "Patroli arsip"));
    const jadwal = await db.select().from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.tugasId, harian.id));
    expect(jadwal).toHaveLength(tanggalJadwal("harian", today, akhir, new Set()).length);
  });

  it("staf: sementara dikerjakan wajib persentase; selesai diajukan ke pemberi tugas", async () => {
    const db = await getDb();
    const [t] = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.judul, "Menyiapkan bahan rapat"));
    const [j] = await db.select().from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.tugasId, t.id));
    id.jadwal = j.id;

    sebagai("staf2", [], [{ id: pn.staf2, peranKerja: "SBK", unitId: id.unit, koordinatorId: id.koord }]);
    expect((await tugas.perbaruiTugas(j.id, { status: "selesai" })).ok).toBe(false);
    sebagai("staf", [], [pnStafTugas()]);
    expect(await tugas.perbaruiTugas(j.id, { status: "dikerjakan", persen: "" })).toMatchObject({ ok: false, galat: { persen: expect.any(String) } });
    expect(await tugas.perbaruiTugas(j.id, { status: "dikerjakan", persen: "100" })).toMatchObject({ ok: false, galat: { persen: expect.any(String) } });
    expect(await tugas.perbaruiTugas(j.id, { status: "dikerjakan", persen: "40", catatan: "Menunggu data" })).toMatchObject({ ok: true });
    expect((await db.select().from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.id, j.id)))[0]).toMatchObject({ status: "dikerjakan", persen: 40 });
    expect(await tugas.perbaruiTugas(j.id, { status: "selesai", linkBukti: "https://drive.google.com/x" })).toMatchObject({ ok: true });
    const [sesudah] = await db.select().from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.id, j.id));
    expect(sesudah).toMatchObject({ status: "diajukan", persen: 100 });
    expect(sesudah.selesaiPada).not.toBeNull();
    expect((await tugas.perbaruiTugas(j.id, { status: "dikerjakan", persen: "50" })).ok).toBe(false); // sedang diverifikasi
  });

  it("hanya pemberi tugas yang memverifikasi; jadwal yang disetujui tetap tercatat saat tugas dihapus", async () => {
    sebagai("staf", ["koordinator"], [pnStafTugas()]);
    expect((await tugas.verifikasiTugas([id.jadwal], "setuju")).ok).toBe(false);
    sebagai("koord2", ["koordinator"]);
    expect((await tugas.verifikasiTugas([id.jadwal], "setuju")).ok).toBe(false);
    sebagai("koord", ["koordinator"]);
    expect((await tugas.verifikasiTugas([id.jadwal], "tolak")).ok).toBe(false); // alasan wajib
    expect(await tugas.verifikasiTugas([id.jadwal], "setuju")).toMatchObject({ ok: true });

    const db = await getDb();
    const [harian] = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.judul, "Patroli arsip"));
    expect(await tugas.hapusTugasKhusus(harian.id)).toMatchObject({ ok: true, pesan: "Tugas dihapus." });
    const [sekali] = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.judul, "Menyiapkan bahan rapat"));
    expect(await tugas.hapusTugasKhusus(sekali.id)).toMatchObject({ ok: true });
    expect(await db.select().from(s.tugasKhususJadwal).where(and(eq(s.tugasKhususJadwal.tugasId, sekali.id), eq(s.tugasKhususJadwal.status, "disetujui")))).toHaveLength(1);
  });

  it("koordinator bisa memberi banyak tugas sekaligus; satu baris salah membatalkan semuanya", async () => {
    const db = await getDb();
    const milikStaf2 = async () => db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.penugasanId, pn.staf2));
    const akhir = tambahHari(today, 9);
    const banyak = (daftarJudul: string) => isi({ penugasanId: pn.staf2, cara: "banyak", judul: "", daftarJudul, frekuensi: "harian", tanggalAkhir: akhir });

    sebagai("koord2", ["koordinator"]);
    expect((await tugas.simpanTugasKhusus(null, fd(banyak("Rekap undangan\nArsip notulensi")))).ok).toBe(false);
    sebagai("koord", ["koordinator"]);
    expect(await tugas.simpanTugasKhusus(null, fd(banyak("Rekap undangan\nab")))).toMatchObject({ ok: false, galat: { daftarJudul: expect.stringContaining("ab") } });
    expect(await tugas.simpanTugasKhusus(null, fd(banyak(Array.from({ length: 31 }, (_, i) => `Tugas ke-${i + 1}`).join("\n"))))).toMatchObject({ ok: false, galat: { daftarJudul: expect.any(String) } });
    expect(await milikStaf2()).toHaveLength(0);

    const n = tanggalJadwal("harian", today, akhir, new Set()).length;
    expect(await tugas.simpanTugasKhusus(null, fd(banyak("1. Rekap undangan\n2. Arsip notulensi\n- Rekap undangan\n3. Cek inventaris")))).toMatchObject({
      ok: true,
      pesan: `3 tugas tersimpan dengan ${n} jadwal masing-masing.`,
    });
    const tk = await milikStaf2();
    expect(tk.map((t) => t.judul).sort()).toEqual(["Arsip notulensi", "Cek inventaris", "Rekap undangan"]);
    expect(tk.every((t) => t.dibuatOleh === id.koord && t.frekuensi === "harian" && t.uraian === null)).toBe(true);
    expect(await db.select().from(s.tugasKhususJadwal).where(inArray(s.tugasKhususJadwal.tugasId, tk.map((t) => t.id)))).toHaveLength(3 * n);
  });
});

describe("usulan tugas Staf Khusus", () => {
  const pnSk = () => ({ id: pn.sk, peranKerja: "SK" as const, unitId: id.unitSk, koordinatorId: id.koord });
  const isi = (o: Record<string, string> = {}) => ({ penugasanId: pn.sk, cara: "satu", judul: "Patroli keamanan gedung", frekuensi: "sekali", tanggalMulai: today, jamTenggat: "23:59", ...o });
  const usulanSk = async () => (await getDb()).select().from(s.usulanTugas).where(eq(s.usulanTugas.penugasanId, pn.sk));

  beforeAll(async () => {
    const db = await getDb();
    const [u] = await db.insert(s.unit).values({ jenis: "staf_khusus", nama: "Keamanan" }).returning();
    const [p] = await db.insert(s.pegawai).values({ nama: "sk", nip: "sk-uji" }).returning();
    const [x] = await db.insert(s.penugasan).values({ pegawaiId: p.id, peranKerja: "SK", unitId: u.id, koordinatorId: id.koord, periodeMulai: periodeBerikut(P, -1) }).returning();
    id.sk = p.id;
    id.unitSk = u.id;
    pn.sk = x.id;
  });

  it("hanya amanah Staf Khusus yang bisa mengusulkan; satu per satu atau sekaligus banyak", async () => {
    sebagai("staf", [], [{ id: pn.staf, peranKerja: "SBK", unitId: id.unit, koordinatorId: id.koord }]);
    expect((await tugas.ajukanUsulanTugas(null, fd(isi({ penugasanId: pn.staf })))).ok).toBe(false);

    sebagai("sk", [], [pnSk()]);
    expect(await tugas.ajukanUsulanTugas(null, fd(isi({ tanggalMulai: tambahHari(today, -1) })))).toMatchObject({ ok: false, galat: { tanggalMulai: expect.any(String) } });
    expect(await tugas.ajukanUsulanTugas(null, fd(isi({ cara: "banyak", judul: "", daftarJudul: " \n " })))).toMatchObject({ ok: false, galat: { daftarJudul: expect.any(String) } });
    expect(await tugas.ajukanUsulanTugas(null, fd(isi({ cara: "banyak", daftarJudul: "Patroli\nab" })))).toMatchObject({ ok: false, galat: { daftarJudul: expect.stringContaining("ab") } });
    expect(await tugas.ajukanUsulanTugas(null, fd(isi({ uraian: "Keliling gedung pagi dan sore" })))).toMatchObject({ ok: true });

    const akhir = tambahHari(today, 9);
    const banyak = isi({ cara: "banyak", judul: "", daftarJudul: "1. Cek CCTV\n2. Laporan piket\n- Cek CCTV", frekuensi: "harian", tanggalAkhir: akhir });
    expect(await tugas.ajukanUsulanTugas(null, fd(banyak))).toMatchObject({ ok: true, pesan: "2 usulan tugas terkirim ke atasan." });

    const rows = await usulanSk();
    expect(rows.map((u) => u.judul).sort()).toEqual(["Cek CCTV", "Laporan piket", "Patroli keamanan gedung"]);
    const kiriman = rows.filter((u) => u.frekuensi === "harian");
    expect(new Set(kiriman.map((u) => u.kelompok)).size).toBe(1);
    expect(kiriman[0]).toMatchObject({ status: "diajukan", tanggalAkhir: akhir, uraian: null });
  });

  it("hanya atasan yang memutuskan; usulan disetujui otomatis masuk daftar tugas dengan atasan sebagai pemberi tugas", async () => {
    const rows = await usulanSk();
    const kiriman = rows.filter((u) => u.frekuensi === "harian").map((u) => u.id);
    const satu = rows.find((u) => u.frekuensi === "sekali")!;
    const dataTugas = await import("@/lib/data/tugas");
    expect(await dataTugas.jumlahUsulanMenunggu(id.koord)).toBe(3);
    expect((await dataTugas.daftarUsulan(dataTugas.kondisiUsulanMenunggu(id.koord))).map((u) => u.stafNama)).toEqual(["sk", "sk", "sk"]);

    sebagai("sk", ["koordinator"], [pnSk()]);
    expect((await tugas.putuskanUsulan(kiriman, "setuju")).ok).toBe(false);
    sebagai("koord2", ["koordinator"]);
    expect((await tugas.putuskanUsulan(kiriman, "setuju")).ok).toBe(false);
    sebagai("koord", ["koordinator"]);
    expect((await tugas.putuskanUsulan([satu.id], "tolak")).ok).toBe(false); // alasan wajib
    expect(await tugas.putuskanUsulan(kiriman, "setuju")).toMatchObject({ ok: true });
    expect((await tugas.putuskanUsulan(kiriman, "setuju")).ok).toBe(false); // tidak membuat tugas dua kali
    expect(await tugas.putuskanUsulan([satu.id], "tolak", "Sudah termasuk tugas piket")).toMatchObject({ ok: true });

    const db = await getDb();
    const sesudah = await usulanSk();
    expect(sesudah.find((u) => u.id === satu.id)).toMatchObject({ status: "ditolak", alasanTolak: "Sudah termasuk tugas piket", diputusOleh: id.koord, tugasId: null });
    const disetujui = sesudah.filter((u) => kiriman.includes(u.id));
    expect(disetujui.every((u) => u.status === "disetujui" && u.tugasId)).toBe(true);

    const tk = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.penugasanId, pn.sk));
    expect(tk).toHaveLength(2);
    expect(tk.every((t) => t.dibuatOleh === id.koord && t.frekuensi === "harian")).toBe(true);
    const jadwal = await db.select().from(s.tugasKhususJadwal).where(inArray(s.tugasKhususJadwal.tugasId, tk.map((t) => t.id)));
    expect(jadwal).toHaveLength(2 * tanggalJadwal("harian", today, tambahHari(today, 9), new Set()).length);

    // Jadwal dari usulan diverifikasi atasan seperti tugas biasa.
    sebagai("sk", [], [pnSk()]);
    expect(await tugas.perbaruiTugas(jadwal[0].id, { status: "selesai" })).toMatchObject({ ok: true });
    sebagai("koord", ["koordinator"]);
    expect(await tugas.verifikasiTugas([jadwal[0].id], "setuju")).toMatchObject({ ok: true });

    // Dashboard Staf Khusus: selesai / menunggu dihitung dari jadwal bulan ini.
    const ringkas = await dataTugas.ringkasTugas([pn.sk], P);
    expect(ringkas).toMatchObject({ disetujui: 1, diajukan: 0 });
    expect(Object.values(ringkas).reduce((a, n) => a + n, 0)).toBe(jadwal.filter((j) => j.periodeId === P).length);
    expect(await dataTugas.jumlahUsulanMenunggu(id.koord)).toBe(0);

    // Usulan yang disetujui untuk bulan-bulan berikutnya tetap tampil di daftar tugas staf.
    const jauh = tambahHari(today, 60);
    sebagai("sk", [], [pnSk()]);
    expect(await tugas.ajukanUsulanTugas(null, fd(isi({ judul: "Rekap absensi dosen", frekuensi: "pekanan", tanggalMulai: jauh, tanggalAkhir: tambahHari(jauh, 14) })))).toMatchObject({ ok: true });
    const [rekap] = (await usulanSk()).filter((u) => u.judul === "Rekap absensi dosen");
    sebagai("koord", ["koordinator"]);
    expect(await tugas.putuskanUsulan([rekap.id], "setuju")).toMatchObject({ ok: true });
    const { keUtc } = await import("@/lib/waktu");
    const akanDatang = await dataTugas.tugasAkanDatang([pn.sk], keUtc(tambahHari(today, 8), "makassar"));
    expect(akanDatang.find((x) => x.tugas.judul === "Rekap absensi dosen")).toMatchObject({ sisa: 2, tugas: { status: "belum", periodeId: periodeDari(jauh) } });
  });

  it("staf hanya bisa membatalkan usulan yang belum diputuskan", async () => {
    sebagai("sk", [], [pnSk()]);
    expect(await tugas.ajukanUsulanTugas(null, fd(isi({ judul: "Usulan yang dibatalkan" })))).toMatchObject({ ok: true });
    const rows = await usulanSk();
    const baru = rows.find((u) => u.judul === "Usulan yang dibatalkan")!;
    const diputus = rows.find((u) => u.status === "ditolak")!;
    expect((await tugas.batalkanUsulan(diputus.id)).ok).toBe(false);
    sebagai("staf", [], [{ id: pn.staf, peranKerja: "SBK", unitId: id.unit, koordinatorId: id.koord }]);
    expect((await tugas.batalkanUsulan(baru.id)).ok).toBe(false);
    sebagai("sk", [], [pnSk()]);
    expect(await tugas.batalkanUsulan(baru.id)).toMatchObject({ ok: true });
    expect((await usulanSk()).some((u) => u.id === baru.id)).toBe(false);
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

describe("rangkap jabatan", () => {
  // koord2 = KSBK "Bidang Rangkap" sekaligus SBK di SKUO-nya dengan koordinator dirinya sendiri; WaKa bidang = "kepala".
  const skor = { "skor-akhlak": "4", "skor-profesional": "4", "skor-inovatif": "4", "skor-kolaboratif": "4", "skor-rasaMemiliki": "4", "skor-pengembanganDiri": "2" };
  beforeAll(async () => {
    const db = await getDb();
    const [b] = await db.insert(s.unit).values({ jenis: "bidang", nama: "Bidang Rangkap", wakaId: id.kepala }).returning();
    const [k] = await db.insert(s.unit).values({ jenis: "skuo", nama: "SKUO Rangkap", indukId: b.id }).returning();
    id.bidangR = b.id;
    id.skuoR = k.id;
    const [ksbk] = await db.insert(s.penugasan).values({ pegawaiId: id.koord2, peranKerja: "KSBK", unitId: b.id, koordinatorId: id.kepala, periodeMulai: P }).returning();
    const [sbk] = await db.insert(s.penugasan).values({ pegawaiId: id.koord2, peranKerja: "SBK", unitId: k.id, koordinatorId: id.koord2, periodeMulai: P }).returning();
    pn.ksbkR = ksbk.id;
    pn.sbkR = sbk.id;
  });
  const pnSbkR = () => ({ id: pn.sbkR, peranKerja: "SBK" as const, unitId: id.skuoR, bidangId: id.bidangR, koordinatorId: id.koord2 });

  it("KSBK boleh memverifikasi item SBK miliknya sendiri; tercatat diverifikasi sendiri", async () => {
    sebagai("koord2", ["koordinator"], [pnSbkR()]);
    const r = await item.simpanItem({ idKlien: "klien-r001", penugasanId: pn.sbkR, indikatorKode: "SBK-1", masuk: today, selesai: today, linkBukti: "https://drive.google.com/r", data: { perihal: "Surat rangkap" } });
    expect(r).toMatchObject({ ok: true });
    const db = await getDb();
    const [row] = await db.select().from(s.item).where(eq(s.item.idKlien, "klien-r001"));
    expect(await verif.verifikasiItem([row.id], "setuju")).toMatchObject({ ok: true });
    const [sesudah] = await db.select().from(s.item).where(eq(s.item.id, row.id));
    expect(sesudah).toMatchObject({ status: "disetujui", verifikatorId: id.koord2 });
  });

  it("K3 tidak bisa dinilai sendiri; WaKa menilai sekali untuk kedua amanah", async () => {
    sebagai("koord2", ["koordinator"]);
    expect((await tim.simpanK3(null, fd({ pegawaiId: id.koord2, periodeId: P, kirim: "1", ...skor }))).ok).toBe(false);
    sebagai("kepala", ["kepala", "koordinator"]);
    expect(await tim.simpanK3(null, fd({ pegawaiId: id.koord2, periodeId: P, kirim: "1", ...skor }))).toMatchObject({ ok: true });
    expect(await tim.simpanK3(null, fd({ pegawaiId: id.koord2, periodeId: P, kirim: "1", ...skor }))).toMatchObject({ ok: true });
    const db = await getDb();
    const rows = await db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.pegawaiId, id.koord2), eq(s.penilaianK3.periodeId, P)));
    expect(rows).toHaveLength(1);
    expect(rows[0].penilaiId).toBe(id.kepala);
  });

  it("K4 untuk amanah yang ia koordinasikan sendiri diperiksa WaKa, bukan koordinator lain", async () => {
    sebagai("koord2", ["koordinator"], [pnSbkR()]);
    // Rombak v2: pengajuan hanya untuk bulan lalu dalam jendela akhir bulan; bulan berjalan selalu ditolak.
    const r = await k4.ajukanK4(null, fd({ periodeId: P, penugasanId: pn.sbkR, judul: "Arsip digital SKUO", tingkatUsulan: "I", linkBukti: "https://drive.google.com/k4" }));
    expect(r).toMatchObject({ ok: false, pesan: "Batas pengajuan K4 untuk periode itu sudah lewat." });
    const db = await getDb();
    const [row] = await db
      .insert(s.k4Pengajuan)
      .values({ periodeId: P, judul: "Arsip digital SKUO", tingkatUsulan: "I", linkBukti: "https://drive.google.com/k4", penugasanId: pn.sbkR, diajukanOleh: id.koord2 })
      .returning();
    await db.insert(s.k4Pengusul).values({ k4Id: row.id, pegawaiId: id.koord2 });
    expect(row.penugasanId).toBe(pn.sbkR);
    sebagai("koord", ["koordinator"]);
    expect((await k4.periksaK4(row.id, true)).ok).toBe(false);
    sebagai("kepala", ["kepala", "koordinator"]);
    expect(await k4.periksaK4(row.id, true)).toMatchObject({ ok: true });
  });
});

describe("koordinator A–M (rombak v2)", () => {
  const koord = () => {
    sebagai("koord", ["koordinator"], [{ id: pn.koord, peranKerja: "KSBK", unitId: id.unit, koordinatorId: id.kepala }]);
    sesiAktif = { ...sesiAktif!, tim: [pn.staf, pn.staf2].map((x, i) => ({ id: x, pegawaiId: [id.staf, id.staf2][i], peranKerja: "SBK" as const, unitId: id.unit, koordinatorId: id.koord })) };
  };
  const nanti = geserHariKerja(today, 3, new Set());

  it("konfirmasi rencana: checklist terbit saat Jalan; Geser memindah tanggal; Tunda menyalin ke bulan depan; Batal wajib alasan", async () => {
    const db = await getDb();
    const keg = (nama: string) =>
      db.insert(s.kegiatan).values({ unitId: id.unit, skuoId: id.skuo, nama, tanggal: nanti, perluSpp: true, perluSpb: true, penanggungJawabId: id.staf, dibuatOleh: id.koord, sumber: "rencana", status: "rencana" }).returning().then((r) => r[0]);
    const a = await keg("Rencana A");
    const b = await keg("Rencana B");
    koord();
    expect(await db.select().from(s.item).where(eq(s.item.kegiatanId, a.id))).toHaveLength(0);
    expect(await tim.ubahStatusKegiatan(a.id, { status: "jalan" })).toMatchObject({ ok: true });
    expect(await db.select().from(s.item).where(eq(s.item.kegiatanId, a.id))).toHaveLength(4);

    const baru = tambahHari(nanti, 1);
    expect(await tim.ubahStatusKegiatan(a.id, { status: "geser", tanggal: baru })).toMatchObject({ ok: true });
    expect((await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, a.id)))[0]).toMatchObject({ status: "geser", tanggal: baru, tanggalRencana: nanti });

    expect((await tim.ubahStatusKegiatan(a.id, { status: "batal", alasan: "" })).ok).toBe(false);
    expect(await tim.ubahStatusKegiatan(a.id, { status: "batal", alasan: "Digabung ke kegiatan lain" })).toMatchObject({ ok: true });
    expect((await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, a.id)))[0]).toMatchObject({ status: "batal", alasanBatal: "Digabung ke kegiatan lain" });

    expect(await tim.ubahStatusKegiatan(b.id, { status: "tunda" })).toMatchObject({ ok: true });
    const salinan = await db.select().from(s.kegiatan).where(and(eq(s.kegiatan.nama, "Rencana B"), eq(s.kegiatan.status, "rencana")));
    expect(salinan).toHaveLength(1);
    expect(salinan[0].tanggal > nanti).toBe(true);
    expect((await tim.ubahStatusKegiatan(b.id, { status: "jalan" })).ok).toBe(false);

    // Koordinator lain tidak bisa mengubah.
    sebagai("koord2", ["koordinator"]);
    expect((await tim.ubahStatusKegiatan(salinan[0].id, { status: "jalan" })).ok).toBe(false);
  });

  it("Manage tim: PJ utama menerima kegiatan yang belum berjalan dan belum disentuh", async () => {
    const db = await getDb();
    koord();
    const [k] = await db.insert(s.kegiatan).values({ unitId: id.unit, skuoId: id.skuo, nama: "Kajian Plot 2", tanggal: nanti, penanggungJawabId: id.staf2, dibuatOleh: id.koord }).returning();
    const { buatItemOtomatis } = await import("@/lib/data/kegiatan");
    await buatItemOtomatis(db, [k], id.koord);
    expect((await tim.simpanPlot(id.unit, id.skuo, [id.staf, id.staf2], null)).ok).toBe(false); // PJ utama wajib bila > 1 staf
    expect(await tim.simpanPlot(id.unit, id.skuo, [id.staf, id.staf2], id.staf)).toMatchObject({ ok: true });
    expect((await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, k.id)))[0].penanggungJawabId).toBe(id.staf);
    const items = await db.select().from(s.item).where(eq(s.item.kegiatanId, k.id));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.penugasanId === pn.staf)).toBe(true);
    expect(await tim.simpanPlot(id.unit, id.skuo, [id.staf, id.staf2], id.staf)).toMatchObject({ ok: true, pesan: "Tidak ada perubahan." });
    await db.delete(s.plotSkuo);
  });

  it("delegasi ke beberapa staf dengan link wajib; Setujui semua yang tepat waktu", async () => {
    const db = await getDb();
    koord();
    const r = await tugas.kirimDelegasi(null, fd({ penugasanId: [pn.staf, pn.staf2], judul: "Rekap peserta kajian", tanggal: nanti, jamTenggat: "15:00", linkWajib: "on" }));
    expect(r).toMatchObject({ ok: true, pesan: "Tugas dikirim ke 2 staf." });
    const t = await db.select().from(s.tugasKhusus).where(eq(s.tugasKhusus.judul, "Rekap peserta kajian"));
    expect(t).toHaveLength(2);
    expect(t.every((x) => x.linkWajib && x.dibuatOleh === id.koord)).toBe(true);
    expect((await tugas.kirimDelegasi(null, fd({ penugasanId: [pn.koord], judul: "Untuk diri sendiri", tanggal: nanti, jamTenggat: "15:00" }))).ok).toBe(false);

    const [j] = await db.select({ id: s.tugasKhususJadwal.id }).from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.tugasId, t.find((x) => x.penugasanId === pn.staf)!.id));
    sebagai("staf", [], [pnStaf()]);
    expect(await tugas.perbaruiTugas(j.id, { status: "selesai", catatan: "", linkBukti: "" })).toMatchObject({ ok: false, pesan: "Tugas ini meminta link bukti." });
    expect(await tugas.perbaruiTugas(j.id, { status: "selesai", catatan: "", linkBukti: "https://x.id/rekap" })).toMatchObject({ ok: true });

    koord();
    expect(await verif.setujuiSemuaTepatWaktu()).toMatchObject({ ok: true });
    expect((await db.select().from(s.tugasKhususJadwal).where(eq(s.tugasKhususJadwal.id, j.id)))[0].status).toBe("disetujui");
  });
});

describe("Set Tugas & Atur Tugas Staf (rombak v2)", () => {
  const st = () => import("@/app/aksi/set-tugas");
  const koordRutin = () => sebagai("koord", ["koordinator"], [{ id: "pn-koord-rutin", peranKerja: "KSBK", unitId: id.unitSk, koordinatorId: null }]);
  const besok = tambahHari(today, 1);
  const jadwalSk = async () => {
    const db = await getDb();
    return db
      .select({ j: s.tugasKhususJadwal, judul: s.tugasKhusus.judul, item: s.tugasKhusus.setTugasItemId })
      .from(s.tugasKhususJadwal)
      .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
      .where(and(eq(s.tugasKhusus.penugasanId, pn.sk)));
  };

  it("set dipasang ke staf: jadwal rutin terbit mulai besok; ubah tugas berlaku besok, hari ini tidak berubah", async () => {
    const { simpanSetTugas, simpanItemSet, aturSetStaf } = await st();
    koordRutin();
    const r = await simpanSetTugas(null, id.unitSk, "Keamanan shift pagi");
    expect(r.ok).toBe(true);
    const setId = (r as { id: string }).id;
    id.setPagi = setId;
    expect(await simpanItemSet(setId, null, null, fd({ judul: "Patroli area kantor", frekuensi: "harian", jamTenggat: "08:00", linkWajib: "on" }))).toMatchObject({ ok: true });

    sebagai("koord2", ["koordinator"]);
    expect((await aturSetStaf(pn.sk, setId, "ini")).ok).toBe(false);
    koordRutin();
    expect(await aturSetStaf(pn.sk, setId, "ini")).toMatchObject({ ok: true });
    const awal = (await jadwalSk()).filter((x) => x.item);
    expect(awal.length).toBeGreaterThan(0);
    expect(awal.every((x) => x.j.tenggat > new Date(`${today}T23:59:59+08:00`))).toBe(true);
    expect(awal.every((x) => x.judul === "Patroli area kantor")).toBe(true);

    // Staf menyelesaikan jadwal pertama; ubah judul tidak menghapus jadwal yang sudah disentuh.
    const db = await getDb();
    const pertama = awal.sort((a, b) => +a.j.tenggat - +b.j.tenggat)[0];
    await db.update(s.tugasKhususJadwal).set({ status: "diajukan", selesaiPada: new Date() }).where(eq(s.tugasKhususJadwal.id, pertama.j.id));
    const [it] = await db.select().from(s.setTugasItem).where(eq(s.setTugasItem.setTugasId, setId));
    expect(await simpanItemSet(setId, it.id, null, fd({ judul: "Patroli gedung & parkir", frekuensi: "harian", jamTenggat: "08:00" }))).toMatchObject({ ok: true, pesan: expect.stringContaining("1 staf") });
    const sesudah = await jadwalSk();
    expect(sesudah.find((x) => x.j.id === pertama.j.id)?.j.status).toBe("diajukan");
    const baru = sesudah.filter((x) => x.item && x.j.status === "belum");
    expect(baru.length).toBeGreaterThan(0);
    expect(baru.every((x) => x.judul === "Patroli gedung & parkir")).toBe(true);
    // Tidak ada jadwal ganda pada tenggat yang sama.
    const tenggat = sesudah.filter((x) => x.item).map((x) => x.j.tenggat.getTime());
    expect(new Set(tenggat).size).toBe(tenggat.length);
    expect(besok > today).toBe(true);
  });

  it("susunan tanpa set menghentikan jadwal mulai besok", async () => {
    const { aturSetStaf } = await st();
    koordRutin();
    expect(await aturSetStaf(pn.sk, null, "ini")).toMatchObject({ ok: true });
    expect((await jadwalSk()).filter((x) => x.item && x.j.status === "belum")).toHaveLength(0);
    expect(await aturSetStaf(pn.sk, id.setPagi, "ini")).toMatchObject({ ok: true });
  });

  it("usulan staf masuk ke set pilihan koordinator", async () => {
    const { ajukanUsulanRutin, putuskanUsulanRutin } = await st();
    sebagai("sk", [], [{ id: pn.sk, peranKerja: "SK", unitId: id.unitSk, koordinatorId: id.koord }]);
    expect((await ajukanUsulanRutin(null, fd({ penugasanId: pn.sk, judul: "Cek APAR", setTugasId: id.setPagi, frekuensi: "pekanan", jamTenggat: "11:00", alasan: "Belum ada yang memeriksa" }))).ok).toBe(false); // hari wajib
    expect(await ajukanUsulanRutin(null, fd({ penugasanId: pn.sk, judul: "Cek APAR", setTugasId: id.setPagi, frekuensi: "pekanan", hari: "5", jamTenggat: "11:00", alasan: "Belum ada yang memeriksa" }))).toMatchObject({ ok: true });
    const db = await getDb();
    const [u] = await db.select().from(s.usulanTugas).where(and(eq(s.usulanTugas.penugasanId, pn.sk), eq(s.usulanTugas.judul, "Cek APAR")));
    koordRutin();
    expect((await putuskanUsulanRutin(u.id, "tolak")).ok).toBe(false);
    expect(await putuskanUsulanRutin(u.id, "setuju", { setTugasId: id.setPagi })).toMatchObject({ ok: true });
    const item = await db.select().from(s.setTugasItem).where(and(eq(s.setTugasItem.setTugasId, id.setPagi), eq(s.setTugasItem.judul, "Cek APAR")));
    expect(item).toMatchObject([{ frekuensi: "pekanan", hari: 5, jamTenggat: "11:00" }]);
  });
});

describe("admin penugasan", () => {
  it("Kepala Kantor dan WaKa tidak perlu memilih unit: otomatis unit Kantor; peran lain wajib unit", async () => {
    sebagai("sekr", ["admin"]);
    expect(await admin.tambahPenugasan(null, fd({ pegawaiId: id.kepala, peranKerja: "KAKAN", periodeMulai: P }))).toMatchObject({ ok: true });
    expect(await admin.tambahPenugasan(null, fd({ pegawaiId: id.keu, peranKerja: "WAKA", periodeMulai: P }))).toMatchObject({ ok: true });
    const db = await getDb();
    const rows = await db.select({ jenis: s.unit.jenis, unitId: s.unit.id }).from(s.penugasan).innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId)).where(inArray(s.penugasan.peranKerja, ["KAKAN", "WAKA"]));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.jenis === "kantor" && r.unitId === rows[0].unitId)).toBe(true);
    const r = await admin.tambahPenugasan(null, fd({ pegawaiId: id.staf, peranKerja: "SBK", periodeMulai: P }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.galat).toMatchObject({ unitId: "Pilih unit." });
  });
});

describe("status periode", () => {
  it("Admin mengunci, Admin lain (atau Kepala Kantor) mengesahkan; setelah sah input ditolak", async () => {
    sebagai("staf", [], [pnStaf()]);
    expect((await periode.ubahStatusPeriode(P, "verifikasi")).ok).toBe(false);
    sebagai("sekr", ["admin"]);
    for (const l of ["verifikasi", "kalibrasi", "sementara"]) expect(await periode.ubahStatusPeriode(P, l)).toMatchObject({ ok: true });
    // Saling periksa: pengunci tidak mengesahkan sendiri.
    expect((await periode.ubahStatusPeriode(P, "disahkan")).ok).toBe(false);
    sebagai("kepala", ["admin"]);
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

describe("aktivitas K1", () => {
  it("menghitung item, tugas selesai, dan jurnal per pegawai & bidang dalam rentang, menurut zona kantor", async () => {
    const { aktivitasK1 } = await import("@/lib/data/aktivitas");
    const db = await getDb();
    const [bidang] = await db.insert(s.unit).values({ jenis: "bidang", nama: "Bidang Aktivitas" }).returning();
    const [skuo] = await db.insert(s.unit).values({ jenis: "skuo", nama: "SKUO Aktivitas", indukId: bidang.id }).returning();
    const pg = async (nama: string, nip: string, peranKerja: "SBK" | "WAKA") => {
      const [p] = await db.insert(s.pegawai).values({ nama, nip }).returning();
      const [x] = await db.insert(s.penugasan).values({ pegawaiId: p.id, peranKerja, unitId: skuo.id, periodeMulai: "2020-03", periodeSelesai: "2020-03" }).returning();
      return { pegawaiId: p.id, pnId: x.id };
    };
    const rajin = await pg("Aktif Satu", "901", "SBK");
    const diam = await pg("Pasif Satu", "902", "SBK");
    await pg("Waka Satu", "903", "WAKA");
    const item = (t: string) => ({ penugasanId: rajin.pnId, indikatorKode: "SBK-1", periodeId: "2020-03", tglMasuk: new Date(t), dibuatOleh: rajin.pegawaiId, dibuatPada: new Date(t) });
    // 2 Mar 09.00 WITA (masuk), 8 Mar 23.30 WITA (masuk), 9 Mar 00.30 WITA (di luar pekan).
    await db.insert(s.item).values([item("2020-03-02T01:00:00Z"), item("2020-03-08T15:30:00Z"), item("2020-03-08T16:30:00Z")]);
    const [tk] = await db.insert(s.tugasKhusus).values({ penugasanId: rajin.pnId, judul: "Tugas", frekuensi: "sekali", tanggalMulai: "2020-03-03", tanggalAkhir: "2020-03-03", jamTenggat: "16:00", dibuatOleh: rajin.pegawaiId }).returning();
    await db.insert(s.tugasKhususJadwal).values({ tugasId: tk.id, periodeId: "2020-03", tenggat: new Date("2020-03-03T08:00:00Z"), status: "diajukan", selesaiPada: new Date("2020-03-03T07:00:00Z") });
    await db.insert(s.jurnal).values([
      { pegawaiId: rajin.pegawaiId, tanggal: "2020-03-02", uraian: "Rapat" },
      { pegawaiId: rajin.pegawaiId, tanggal: "2020-03-10", uraian: "Di luar pekan" },
    ]);

    const r = await aktivitasK1("2020-03-02", "2020-03-08");
    const x = r.pegawai.filter((p) => p.bidang.some((b) => b.id === bidang.id));
    expect(x.map((p) => p.nama)).toEqual(["Aktif Satu", "Pasif Satu"]);
    expect(x[0]).toMatchObject({ item: 2, tugas: 1, jurnal: 1, hariAktif: 3, hariKerja: 5, bidang: [{ id: bidang.id, nama: "Bidang Aktivitas" }] });
    expect(x[1]).toMatchObject({ item: 0, tugas: 0, jurnal: 0, hariAktif: 0 });
    expect(r.bidang.find((b) => b.id === bidang.id)).toMatchObject({ pegawai: 2, aktif: 1, item: 2, tugas: 1, jurnal: 1 });

    const hari = await aktivitasK1("2020-03-09", "2020-03-09");
    expect(hari.pegawai.find((p) => p.id === rajin.pegawaiId)).toMatchObject({ item: 1, tugas: 0, jurnal: 0 });
    expect(hari.pegawai.find((p) => p.id === diam.pegawaiId)?.item).toBe(0);
  });
});

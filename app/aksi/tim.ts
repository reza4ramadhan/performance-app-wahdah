"use server";

import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { bolehNilaiK3 } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { penugasanDinilai } from "@/lib/data/k3";
import { buatItemOtomatis, itemBelumDisentuh, pjKegiatan } from "@/lib/data/kegiatan";
import { stafBidang } from "@/lib/data/tim";
import { unitDalamBidang } from "@/lib/data/unit";
import { NILAI_K3, type SkorK3 } from "@/lib/ikp/tipe";
import { wajibSesi, type Sesi } from "@/lib/sesi";
import { bulanBerikutnya } from "@/lib/kegiatan-wajib";
import { beritahu } from "@/lib/push";
import { plotBerlaku } from "@/lib/plot";
import { hariIni, labelPeriode, labelTanggal, periodeBerikut, periodeDari, rentangPeriode } from "@/lib/waktu";

const galatDari = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal.");

/** KSBK (atau Admin) untuk unit ini. */
const pengelolaUnit = (sesi: Sesi, unitId: string) => sesi.peran.has("admin") || sesi.penugasan.some((p) => p.peranKerja === "KSBK" && p.unitId === unitId);

async function periodeStatus(periode: string) {
  const db = await getDb();
  const [p] = await db.select({ status: s.periode.status }).from(s.periode).where(eq(s.periode.id, periode));
  return p?.status ?? "berjalan";
}

// ── Kegiatan bulanan ──────────────────────────────────────────────────────────

const skemaKegiatan = z.object({
  unitId: z.string().min(1),
  nama: z.string().trim().min(3, "Isi nama kegiatan.").max(200),
  tanggal,
  skuoId: z.string().min(1, "Pilih SKUO."),
  /** Kosong = diambil dari plot Manage tim (PJ utama departemen). */
  penanggungJawabId: z.string().optional(),
  // SPP dan SPB satu paket: satu centang mengisi keduanya.
  perluSppSpb: z.literal("on").optional(),
});

export async function simpanKegiatan(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaKegiatan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian kegiatan.", galatDari(p.error));
  if (!pengelolaUnit(sesi, p.data.unitId)) return gagal("Hanya KSBK bidang ini yang bisa menginput kegiatan.");
  const periode = periodeDari(p.data.tanggal);
  if (["sementara", "disahkan"].includes(await periodeStatus(periode))) return gagal("Periode kegiatan itu sudah dikunci.");

  const db = await getDb();
  if (p.data.skuoId === p.data.unitId || !(await unitDalamBidang(db, p.data.unitId)).includes(p.data.skuoId))
    return gagal("Periksa SKUO.", { skuoId: "SKUO ini tidak berada di bawah bidang tersebut." });
  // Penanggung jawab boleh staf SKUO lain di bidang yang sama (saling backup); ia yang dinilai.
  // Bila tidak dipilih, diambil dari plot Manage tim (PJ utama departemen pada tanggal kegiatan).
  const pj = p.data.penanggungJawabId || (await pjKegiatan(db, p.data.unitId, p.data.skuoId, p.data.tanggal));
  if (!pj) return gagal("Pilih penanggung jawab.", { penanggungJawabId: "Departemen ini belum punya PJ utama di Manage tim. Pilih penanggung jawab." });
  const staf = await stafBidang(db, p.data.unitId, periode);
  if (!staf.some((x) => x.id === pj))
    return gagal("Periksa penanggung jawab.", { penanggungJawabId: "Penanggung jawab bukan staf bidang ini pada periode kegiatan." });

  const [k] = await db
    .insert(s.kegiatan)
    .values({
      unitId: p.data.unitId,
      nama: p.data.nama,
      tanggal: p.data.tanggal,
      skuoId: p.data.skuoId,
      penanggungJawabId: pj,
      perluSpp: !!p.data.perluSppSpb,
      perluSpb: !!p.data.perluSppSpb,
      dibuatOleh: sesi.pegawaiId,
    })
    .returning();
  const n = await buatItemOtomatis(db, [k], sesi.pegawaiId);
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "kegiatan", entitasId: k.id, sesudah: { ...k, itemOtomatis: n } });
  if (n) await beritahu([pj], { title: "Checklist kegiatan baru", body: `${k.nama} · ${labelTanggal(k.tanggal)}: ${n} tugas masuk ke Tugas Anda.`, url: "/", tag: `kegiatan-${k.id}` }, sesi.pegawaiId);
  refresh();
  return berhasil(`Kegiatan tersimpan. ${n} tugas masuk ke penanggung jawab.`);
}

// ── Konfirmasi rencana (rombak v2, mockup Kor-3) ─────────────────────────────

const skemaStatusKegiatan = z.discriminatedUnion("status", [
  z.object({ status: z.literal("jalan") }),
  z.object({ status: z.literal("geser"), tanggal }),
  z.object({ status: z.literal("tunda") }),
  z.object({ status: z.literal("batal"), alasan: z.string().trim().min(3, "Tulis alasan batal.").max(300) }),
]);

/**
 * Status satu kegiatan: Jalan · Geser (tanggal baru) · Ditunda (masuk rencana bulan berikutnya) · Batal (alasan wajib).
 * Checklist staf dibuat saat Jalan/Geser. Tunda/Batal: item terbuka tetap tersimpan tetapi keluar dari target
 * (K1 hanya menghitung kegiatan jalan/geser). Geser: tenggat checklist ikut bergeser karena dibaca dari tanggal kegiatan.
 */
export async function ubahStatusKegiatan(id: string, input: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaStatusKegiatan.safeParse(input);
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  const db = await getDb();
  const [k] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, id));
  if (!k || !pengelolaUnit(sesi, k.unitId)) return gagal("Kegiatan tidak ditemukan.");
  if (k.status === "tunda") return gagal("Kegiatan ini sudah ditunda ke bulan berikutnya; ubah salinannya di rencana bulan itu.");
  const x = p.data;
  const tanggalBaru = x.status === "geser" ? x.tanggal : k.tanggal;
  for (const per of new Set([periodeDari(k.tanggal), periodeDari(tanggalBaru)]))
    if (["sementara", "disahkan"].includes(await periodeStatus(per))) return gagal("Periode kegiatan itu sudah dikunci.");
  if (x.status === "geser" && x.tanggal === k.tanggal) return gagal("Pilih tanggal baru.", { tanggal: "Tanggal baru sama dengan tanggal semula." });

  const sesudah = {
    status: x.status,
    tanggal: tanggalBaru,
    tanggalRencana: x.status === "geser" ? (k.tanggalRencana ?? k.tanggal) : k.tanggalRencana,
    alasanBatal: x.status === "batal" ? x.alasan : null,
  };
  const [baru] = await db.update(s.kegiatan).set(sesudah).where(eq(s.kegiatan.id, id)).returning();
  let pesan = "Status tersimpan.";
  if (x.status === "geser") {
    // Item kegiatan ikut pindah periode bila tanggalnya pindah bulan.
    await db.update(s.item).set({ periodeId: periodeDari(tanggalBaru) }).where(and(eq(s.item.kegiatanId, id), inArray(s.item.status, ["terbuka", "ditolak"])));
  }
  if (x.status === "jalan" || x.status === "geser") {
    const n = await buatItemOtomatis(db, [baru], sesi.pegawaiId);
    pesan = n ? `Tersimpan. ${n} checklist masuk ke PJ.` : "Tersimpan.";
  }
  if (x.status === "tunda") {
    const tgl = bulanBerikutnya(k.tanggal);
    await db.insert(s.kegiatan).values({
      unitId: k.unitId,
      skuoId: k.skuoId,
      nama: k.nama,
      tanggal: tgl,
      tanggalRencana: tgl,
      perluSpp: k.perluSpp,
      perluSpb: k.perluSpb,
      penanggungJawabId: k.penanggungJawabId,
      dibuatOleh: sesi.pegawaiId,
      sumber: "rencana",
      status: "rencana",
    });
    pesan = `Ditunda. Masuk rencana ${labelPeriode(periodeDari(tgl))} untuk dikonfirmasi lagi.`;
  }
  if (x.status === "batal") pesan = "Kegiatan dibatalkan. Checklist yang belum selesai keluar dari target.";
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: `status-${x.status}`, entitas: "kegiatan", entitasId: id, sebelum: { status: k.status, tanggal: k.tanggal }, sesudah, alasan: x.status === "batal" ? x.alasan : undefined });
  // PJ diberi tahu bila checklist-nya terbit, bergeser, atau keluar dari target.
  const kabar = {
    jalan: k.status === "rencana" ? { title: "Checklist kegiatan baru", body: `${k.nama} · ${labelTanggal(k.tanggal)}: pengingat${k.perluSpp ? ", SPP, dan SPB" : ""} masuk ke Tugas Anda.` } : null,
    geser: { title: "Tanggal kegiatan bergeser", body: `${k.nama} pindah ke ${labelTanggal(tanggalBaru)}. Tenggat checklist ikut bergeser.` },
    tunda: { title: "Kegiatan ditunda", body: `${k.nama} ditunda ke bulan berikutnya. Checklist yang belum selesai keluar dari target.` },
    batal: { title: "Kegiatan dibatalkan", body: `${k.nama} batal. Checklist yang belum selesai keluar dari target.` },
  }[x.status];
  if (kabar) await beritahu([k.penanggungJawabId], { ...kabar, url: "/", tag: `kegiatan-${id}` }, sesi.pegawaiId);
  refresh();
  return berhasil(pesan);
}

// ── Manage tim: plot staf ke departemen (rombak v2, mockup Kor-5) ─────────────

/**
 * Atur staf yang melayani satu departemen (SKUO) dan PJ utamanya, berlaku mulai hari ini. Kegiatan departemen itu
 * yang belum berjalan dan checklist-nya belum disentuh pindah ke PJ baru; yang sudah berjalan tetap pada PJ lama.
 */
export async function simpanPlot(unitId: string, skuoId: string, pegawaiIds: string[], utamaId: string | null): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!pengelolaUnit(sesi, unitId)) return gagal("Hanya koordinator unit ini yang bisa mengatur tim.");
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  if (!(await unitDalamBidang(db, unitId)).includes(skuoId) || skuoId === unitId) return gagal("Departemen tidak berada di unit ini.");
  const staf = new Set((await stafBidang(db, unitId, periode)).map((x) => x.id));
  const pilih = [...new Set(pegawaiIds)];
  if (pilih.some((x) => !staf.has(x))) return gagal("Hanya staf unit ini (sesuai SK) yang bisa diplot.");
  const utama = utamaId && pilih.includes(utamaId) ? utamaId : pilih.length === 1 ? pilih[0] : null;
  if (pilih.length > 1 && !utama) return gagal("Pilih PJ utama bila departemen dilayani lebih dari satu staf.");

  const lama = plotBerlaku(await db.select().from(s.plotSkuo).where(and(eq(s.plotSkuo.unitId, unitId), eq(s.plotSkuo.skuoId, skuoId))), today);
  const baris: (typeof s.plotSkuo.$inferInsert)[] = [];
  for (const l of lama) if (!pilih.includes(l.pegawaiId)) baris.push({ unitId, skuoId, pegawaiId: l.pegawaiId, utama: false, aktif: false, berlakuMulai: today, dibuatOleh: sesi.pegawaiId });
  for (const id of pilih) {
    const l = lama.find((x) => x.pegawaiId === id);
    if (!l || l.utama !== (id === utama)) baris.push({ unitId, skuoId, pegawaiId: id, utama: id === utama, aktif: true, berlakuMulai: today, dibuatOleh: sesi.pegawaiId });
  }
  if (!baris.length) return berhasil("Tidak ada perubahan.");
  await db.insert(s.plotSkuo).values(baris);

  // Pindahkan kegiatan yang belum berjalan (hari ini atau sesudahnya) ke PJ utama baru, bila checklist belum disentuh.
  let pindah = 0;
  const pjLama = lama.find((l) => l.utama)?.pegawaiId ?? (lama.length === 1 ? lama[0].pegawaiId : null);
  if (utama && utama !== pjLama) {
    const kegiatan = await db.select().from(s.kegiatan).where(and(eq(s.kegiatan.unitId, unitId), eq(s.kegiatan.skuoId, skuoId), gte(s.kegiatan.tanggal, today), inArray(s.kegiatan.status, ["rencana", "jalan", "geser"])));
    for (const k of kegiatan) {
      if (k.penanggungJawabId === utama) continue;
      const item = await db.select().from(s.item).where(eq(s.item.kegiatanId, k.id));
      if (item.some((i) => !itemBelumDisentuh(i))) continue;
      if (item.length) await db.delete(s.item).where(inArray(s.item.id, item.map((i) => i.id)));
      const [b] = await db.update(s.kegiatan).set({ penanggungJawabId: utama }).where(eq(s.kegiatan.id, k.id)).returning();
      await buatItemOtomatis(db, [b], sesi.pegawaiId);
      await beritahu([utama], { title: "Anda menjadi PJ kegiatan", body: `${k.nama} · ${labelTanggal(k.tanggal)}: checklistnya masuk ke Tugas Anda.`, url: "/", tag: `kegiatan-${k.id}` }, sesi.pegawaiId);
      pindah++;
    }
  }
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "plot", entitas: "plot_skuo", entitasId: skuoId, sebelum: lama, sesudah: { staf: pilih, utama, kegiatanPindah: pindah } });
  refresh();
  return berhasil(pindah ? `Plot tersimpan. ${pindah} kegiatan yang belum berjalan pindah ke PJ baru.` : "Plot tersimpan.");
}

export async function hapusKegiatan(id: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const db = await getDb();
  const [k] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, id));
  if (!k || !pengelolaUnit(sesi, k.unitId)) return gagal("Kegiatan tidak ditemukan.");
  const item = await db.select().from(s.item).where(eq(s.item.kegiatanId, id));
  const dikerjakan = item.filter((i) => !itemBelumDisentuh(i));
  if (dikerjakan.length) return gagal(`Kegiatan sudah dikerjakan staf (${dikerjakan.length} item), tidak bisa dihapus.`);
  if (item.length) await db.delete(s.item).where(inArray(s.item.id, item.map((i) => i.id)));
  await db.delete(s.kegiatan).where(eq(s.kegiatan.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "kegiatan", entitasId: id, sebelum: k });
  refresh();
  return berhasil("Kegiatan dihapus.");
}

/** Salin kegiatan bulan lalu ke bulan ini (tanggal sama, dibatasi akhir bulan). */
export async function salinKegiatanBulanLalu(unitId: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!pengelolaUnit(sesi, unitId)) return gagal("Hanya KSBK bidang ini yang bisa menyalin kegiatan.");
  const db = await getDb();
  const kini = periodeDari(hariIni(sesi.kantor));
  const lalu = rentangPeriode(periodeBerikut(kini, -1));
  const { akhir } = rentangPeriode(kini);
  // Hanya kegiatan SKUO dengan penanggung jawab yang masih staf bidang ini.
  const staf = new Set((await stafBidang(db, unitId, kini)).map((x) => x.id));
  const sumber = (await db.select().from(s.kegiatan).where(and(eq(s.kegiatan.unitId, unitId), gte(s.kegiatan.tanggal, lalu.awal), lte(s.kegiatan.tanggal, lalu.akhir)))).filter(
    (k) => k.skuoId && k.penanggungJawabId && staf.has(k.penanggungJawabId),
  );
  if (!sumber.length) return gagal("Tidak ada kegiatan bulan lalu yang bisa disalin.");
  const baru = await db
    .insert(s.kegiatan)
    .values(
      sumber.map((k) => {
        const tgl = `${kini}-${k.tanggal.slice(8)}`;
        return { unitId, nama: k.nama, tanggal: tgl > akhir ? akhir : tgl, skuoId: k.skuoId, perluSpp: k.perluSpp, perluSpb: k.perluSpb, penanggungJawabId: k.penanggungJawabId, dibuatOleh: sesi.pegawaiId, sumber: "salin" as const };
      }),
    )
    .returning();
  const n = await buatItemOtomatis(db, baru, sesi.pegawaiId);
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "salin", entitas: "kegiatan", entitasId: unitId, sesudah: { jumlah: baru.length, itemOtomatis: n } });
  refresh();
  return berhasil(`${baru.length} kegiatan disalin. Periksa dan sesuaikan tanggalnya.`);
}

// ── Catatan perilaku ──────────────────────────────────────────────────────────

const skemaCatatan = z.object({
  pegawaiId: z.string().min(1, "Pilih staf."),
  tanggal,
  nilaiK3: z.enum(NILAI_K3).optional().or(z.literal("")),
  catatan: z.string().trim().min(5, "Tulis catatan singkat.").max(500),
});

export async function simpanCatatan(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaCatatan.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  if (p.data.pegawaiId === sesi.pegawaiId) return gagal("Tidak bisa mencatat perilaku diri sendiri.");
  if (!sesi.binaan.some((b) => b.pegawaiId === p.data.pegawaiId)) return gagal("Staf ini bukan anggota tim Anda.");
  const db = await getDb();
  await db.insert(s.catatanPerilaku).values({ penilaiId: sesi.pegawaiId, pegawaiId: p.data.pegawaiId, tanggal: p.data.tanggal, nilaiK3: p.data.nilaiK3 || null, catatan: p.data.catatan });
  refresh();
  return berhasil("Catatan tersimpan. Akan tampil saat menilai K3.");
}

// ── Penilaian K3 ──────────────────────────────────────────────────────────────

export async function simpanK3(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const pegawaiId = String(fd.get("pegawaiId"));
  const periodeId = String(fd.get("periodeId"));
  const kirim = fd.get("kirim") === "1";
  if (!/^\d{4}-\d{2}$/.test(periodeId)) return gagal("Periode tidak valid.");
  const db = await getDb();
  const amanah = await penugasanDinilai(db, periodeId, pegawaiId);
  if (!amanah.length) return gagal("Penugasan tidak ditemukan.");
  const boleh = bolehNilaiK3(sesi, pegawaiId, amanah.map((p) => p.penilaiId));
  if (!boleh.boleh) return gagal(boleh.alasan);
  const st = await periodeStatus(periodeId);
  if (st === "sementara" || st === "disahkan") return gagal("Periode sudah dikunci.");

  const { awal, akhir } = rentangPeriode(periodeId);
  const [log] = await db.select({ n: count() }).from(s.pengembanganDiri).where(and(eq(s.pengembanganDiri.pegawaiId, pegawaiId), gte(s.pengembanganDiri.tanggal, awal), lte(s.pengembanganDiri.tanggal, akhir)));

  const skor = {} as SkorK3;
  const contoh: Partial<Record<keyof SkorK3, string>> = {};
  const galat: Record<string, string> = {};
  for (const n of NILAI_K3) {
    const v = Number(fd.get(`skor-${n}`));
    if (!Number.isInteger(v) || v < 1 || v > 5) galat[`skor-${n}`] = "Pilih skor 1–5.";
    skor[n] = v;
    let c = String(fd.get(`contoh-${n}`) ?? "").trim();
    // Log kosong adalah buktinya sendiri: skor ≤ 2 untuk pengembangan diri tidak perlu contoh tambahan.
    if (!c && n === "pengembanganDiri" && log.n === 0 && v <= 2) c = "Log pengembangan diri bulan ini kosong.";
    if (c) contoh[n] = c.slice(0, 500);
    if (kirim && [1, 2, 5].includes(v) && !c) galat[`contoh-${n}`] = `Skor ${v} wajib disertai contoh perilaku.`;
  }
  if (log.n === 0 && skor.pengembanganDiri > 2) galat["skor-pengembanganDiri"] = "Log pengembangan diri bulan ini kosong: skor maksimal 2.";
  if (Object.keys(galat).length) return gagal("Periksa kembali penilaian.", galat);

  const status = kirim ? ("dikirim" as const) : ("draf" as const);
  const [lama] = await db.select().from(s.penilaianK3).where(and(eq(s.penilaianK3.periodeId, periodeId), eq(s.penilaianK3.pegawaiId, pegawaiId), eq(s.penilaianK3.penilaiId, sesi.pegawaiId)));
  const [baru] = await db
    .insert(s.penilaianK3)
    .values({ periodeId, pegawaiId, penilaiId: sesi.pegawaiId, skor, contoh, status, diubahPada: new Date() })
    .onConflictDoUpdate({ target: [s.penilaianK3.periodeId, s.penilaianK3.pegawaiId, s.penilaianK3.penilaiId], set: { skor, contoh, status, diubahPada: new Date() } })
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: kirim ? "kirim" : "simpan-draf", entitas: "penilaian_k3", entitasId: baru.id, sebelum: lama, sesudah: baru });
  refresh();
  return berhasil(kirim ? "Penilaian K3 dikirim." : "Draf penilaian tersimpan.");
}

// ── Uji petik arsip (KSBK-1e) ─────────────────────────────────────────────────

const skemaUji = z
  .object({
    unitId: z.string().min(1),
    periodeId: z.string().regex(/^\d{4}-\d{2}$/),
    jumlahDiuji: z.coerce.number().int().min(10, "Minimal 10 dokumen diuji."),
    jumlahSesuai: z.coerce.number().int().min(0),
    catatan: z.string().trim().max(500).optional(),
  })
  .refine((x) => x.jumlahSesuai <= x.jumlahDiuji, { path: ["jumlahSesuai"], message: "Tidak boleh melebihi jumlah diuji." });

export async function simpanUjiPetik(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaUji.safeParse(Object.fromEntries(fd));
  if (!p.success) return gagal("Periksa isian.", galatDari(p.error));
  if (!pengelolaUnit(sesi, p.data.unitId)) return gagal("Hanya KSBK bidang ini yang bisa mengisi uji petik.");
  if (["kalibrasi", "sementara", "disahkan"].includes(await periodeStatus(p.data.periodeId))) return gagal("Periode sudah melewati batas verifikasi.");
  const db = await getDb();
  await db
    .insert(s.ujiPetikArsip)
    .values({ ...p.data, catatan: p.data.catatan || null, dibuatOleh: sesi.pegawaiId })
    .onConflictDoUpdate({ target: [s.ujiPetikArsip.periodeId, s.ujiPetikArsip.unitId], set: { jumlahDiuji: p.data.jumlahDiuji, jumlahSesuai: p.data.jumlahSesuai, catatan: p.data.catatan || null } });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "simpan", entitas: "uji_petik_arsip", entitasId: p.data.unitId, sesudah: p.data });
  refresh();
  return berhasil("Uji petik tersimpan.");
}

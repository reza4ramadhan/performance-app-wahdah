"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { refresh } from "next/cache";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { periodeTerbuka, tanggalPalingAwal } from "@/lib/data/batas";
import { buatItemOtomatis } from "@/lib/data/kegiatan";
import { paramIndikator } from "@/lib/data/ikp";
import { periksaIsian, skemaItem, type IsianItem } from "@/lib/ikp/form-item";
import { indikatorDari } from "@/lib/ikp/katalog";
import { wajibSesi, type Sesi } from "@/lib/sesi";
import { hariIni, jamLokal, keUtc, periodeDari, tambahHari, tanggalLokal, type Kantor } from "@/lib/waktu";

/** "2026-10-21" atau "2026-10-21T08:15" di zona kantor → Date UTC. */
function keWaktu(nilai: string, kantor: Kantor) {
  const [tgl, jam] = nilai.split("T");
  return keUtc(tgl, kantor, jam ?? "12:00");
}

async function cekPeriode(periodeId: string) {
  const db = await getDb();
  const [p] = await db.select({ status: s.periode.status }).from(s.periode).where(eq(s.periode.id, periodeId));
  return periodeTerbuka(p?.status);
}

/** Validasi umum + hitung kolom turunan. Dipakai saat membuat dan mengubah item. */
async function siapkan(sesi: Sesi, x: IsianItem, tanggalLama: string[] = []) {
  const pn = sesi.penugasan.find((p) => p.id === x.penugasanId);
  if (!pn) return { error: gagal("Penugasan tidak ditemukan untuk akun ini.") } as const;
  const def = indikatorDari(x.indikatorKode);
  const db = await getDb();
  const param = (await paramIndikator(db)).get(x.indikatorKode);
  if (!def || def.peran !== pn.peranKerja || !param?.aktif) return { error: gagal("Indikator ini tidak berlaku untuk penugasan Anda.") } as const;

  const { galat } = periksaIsian(x);
  let kegiatan: typeof s.kegiatan.$inferSelect | undefined;
  if (x.kegiatanId) {
    [kegiatan] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, x.kegiatanId));
    if (!kegiatan || kegiatan.unitId !== (pn.bidangId ?? pn.unitId)) galat.kegiatanId = "Kegiatan bukan milik bidang penugasan ini.";
  }

  // Jendela edit 2 hari kerja: hanya tanggal yang baru diisi/diubah yang diperiksa.
  const awal = await tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor);
  const besok = tambahHari(hariIni(sesi.kantor), 1);
  for (const [kunci, nilai] of [["masuk", x.masuk], ["selesai", x.selesai]] as const) {
    if (!nilai || tanggalLama.includes(nilai)) continue;
    const tgl = nilai.slice(0, 10);
    if (tgl < awal) galat[kunci] = `Hanya bisa diisi sampai 2 hari kerja ke belakang (paling awal ${awal}). Minta Admin membuka kunci bila perlu.`;
    if (tgl >= besok) galat[kunci] = "Tanggal tidak boleh di masa depan.";
  }
  if (Object.keys(galat).length) return { error: gagal("Periksa kembali isian Anda.", galat as Record<string, string>) } as const;

  const masuk = x.masuk ? keWaktu(x.masuk, sesi.kantor) : x.selesai ? keWaktu(x.selesai, sesi.kantor) : new Date();
  const selesai = x.selesai ? keWaktu(x.selesai, sesi.kantor) : null;
  const periodeId = kegiatan ? periodeDari(kegiatan.tanggal) : periodeDari(tanggalLokal(masuk, sesi.kantor));
  if (!(await cekPeriode(periodeId))) return { error: gagal("Periode item ini sudah dikunci.") } as const;

  const data = Object.fromEntries(Object.entries(x.data).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
  return { ok: { db, masuk, selesai, periodeId, data, linkBukti: x.linkBukti?.trim() || null } } as const;
}

export async function simpanItem(input: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const p = skemaItem.safeParse(input);
  if (!p.success) return gagal("Isian tidak lengkap.");
  const x = p.data;
  if (indikatorDari(x.indikatorKode)?.otomatis) return gagal("Item ini dibuat otomatis dari kegiatan KSBK. Buka item tersebut untuk menandainya selesai.");
  const r = await siapkan(sesi, x);
  if (!r.ok) return r.error!;
  const { db, masuk, selesai, periodeId, data, linkBukti } = r.ok;

  const status = selesai ? "diajukan" : "terbuka";
  const [baru] = await db
    .insert(s.item)
    .values({
      penugasanId: x.penugasanId,
      indikatorKode: x.indikatorKode,
      kegiatanId: x.kegiatanId || null,
      periodeId,
      data,
      tglMasuk: masuk,
      tglSelesai: selesai,
      linkBukti,
      status,
      diajukanPada: selesai ? new Date() : null,
      dibuatOleh: sesi.pegawaiId,
      idKlien: x.idKlien,
    })
    .onConflictDoNothing({ target: s.item.idKlien })
    .returning();
  // id_klien sudah ada = draf luring yang terkirim ulang; anggap berhasil.
  if (!baru) return berhasil("Item sudah tersimpan.");
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "buat", entitas: "item", entitasId: baru.id, sesudah: baru });
  refresh();
  return berhasil(status === "diajukan" ? "Item tersimpan dan diajukan untuk verifikasi." : "Item tersimpan sebagai terbuka.", baru.id);
}

async function itemMilik(sesi: Sesi, id: string) {
  const db = await getDb();
  const [row] = await db.select().from(s.item).where(eq(s.item.id, id));
  if (!row || !sesi.penugasan.some((p) => p.id === row.penugasanId)) return null;
  return row;
}

const isianDari = (row: typeof s.item.$inferSelect, kantor: Kantor) => {
  const def = indikatorDari(row.indikatorKode)!;
  const fmt = (d: Date | null, jenis: "tanggal" | "waktu") =>
    d ? (jenis === "tanggal" ? tanggalLokal(d, kantor) : `${tanggalLokal(d, kantor)}T${jamLokal(d, kantor)}`) : null;
  return {
    masuk: def.item?.masuk ? fmt(row.tglMasuk, def.item.masuk.jenis) : null,
    selesai: def.item ? fmt(row.tglSelesai, def.item.selesai.jenis) : null,
  };
};

/** Ubah item sendiri yang belum disetujui (termasuk memperbaiki item yang ditolak). */
export async function ubahItem(id: string, input: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const row = await itemMilik(sesi, id);
  if (!row) return gagal("Item tidak ditemukan.");
  if (row.status === "disetujui") return gagal("Item yang sudah disetujui tidak bisa diubah.");
  // Item otomatis tetap terikat pada kegiatan dan urutan pengingatnya.
  const kunci = indikatorDari(row.indikatorKode)?.otomatis ? { kegiatanId: row.kegiatanId } : {};
  const p = skemaItem.safeParse({ ...(input as object), ...kunci, penugasanId: row.penugasanId, indikatorKode: row.indikatorKode, idKlien: row.idKlien ?? row.id });
  if (p.success && row.data.ke) p.data.data.ke = row.data.ke;
  if (!p.success) return gagal("Isian tidak lengkap.");
  const lama = isianDari(row, sesi.kantor);
  const r = await siapkan(sesi, p.data, [lama.masuk, lama.selesai].filter((v): v is string => !!v));
  if (!r.ok) return r.error!;
  const { db, masuk, selesai, periodeId, data, linkBukti } = r.ok;

  const status = selesai ? "diajukan" : "terbuka";
  const [baru] = await db
    .update(s.item)
    .set({ kegiatanId: p.data.kegiatanId || null, periodeId, data, tglMasuk: masuk, tglSelesai: selesai, linkBukti, status, diajukanPada: selesai ? new Date() : null, alasanTolak: null, verifikatorId: null, diverifikasiPada: null })
    .where(eq(s.item.id, id))
    .returning();
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: row.status === "ditolak" ? "perbaiki" : "ubah", entitas: "item", entitasId: id, sebelum: row, sesudah: baru });
  refresh();
  return berhasil(status === "diajukan" ? "Item diajukan untuk verifikasi." : "Perubahan tersimpan.", id);
}

/**
 * Isi pekerjaan otomatis dari kartu kegiatan di dashboard (Pengingat, SPP, SPB).
 * Bila itemnya belum ada (kegiatan dibuat sebelum item otomatis), item kegiatan dilengkapi dulu.
 */
export async function isiItemKegiatan(kegiatanId: string, kode: string, ke: string | null, input: unknown): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!indikatorDari(kode)?.otomatis) return gagal("Pekerjaan ini dicatat lewat + Catat.");
  const db = await getDb();
  const [k] = await db.select().from(s.kegiatan).where(eq(s.kegiatan.id, kegiatanId));
  if (!k || k.penanggungJawabId !== sesi.pegawaiId) return gagal("Kegiatan tidak ditemukan.");
  if (!(await cekPeriode(periodeDari(k.tanggal)))) return gagal("Periode kegiatan ini sudah dikunci.");
  await buatItemOtomatis(db, [k], sesi.pegawaiId);
  const milik = await db
    .select()
    .from(s.item)
    .where(and(eq(s.item.kegiatanId, k.id), eq(s.item.indikatorKode, kode), inArray(s.item.penugasanId, sesi.penugasan.map((p) => p.id).concat("-"))));
  const row = milik.find((i) => (i.data.ke ?? "") === (ke ?? ""));
  if (!row) return gagal("Pekerjaan ini tidak berlaku untuk kegiatan tersebut.");
  return ubahItem(row.id, input);
}

/** Tandai selesai: tanggal selesai + link bukti wajib. */
export async function selesaikanItem(id: string, selesaiNilai: string, linkBukti: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const row = await itemMilik(sesi, id);
  if (!row) return gagal("Item tidak ditemukan.");
  const lama = isianDari(row, sesi.kantor);
  return ubahItem(id, { masuk: lama.masuk, selesai: selesaiNilai, linkBukti, kegiatanId: row.kegiatanId, data: row.data });
}

export async function hapusItem(id: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const row = await itemMilik(sesi, id);
  if (!row) return gagal("Item tidak ditemukan.");
  if (row.status === "disetujui") return gagal("Item yang sudah disetujui tidak bisa dihapus.");
  if (indikatorDari(row.indikatorKode)?.otomatis) return gagal("Item otomatis dari kegiatan tidak bisa dihapus. Minta KSBK menghapus kegiatannya bila batal.");
  const db = await getDb();
  const awal = await tanggalPalingAwal(db, sesi.pegawaiId, sesi.kantor);
  if (tanggalLokal(row.dibuatPada, sesi.kantor) < awal) return gagal("Item lebih dari 2 hari kerja ke belakang sudah terkunci.");
  if (!(await cekPeriode(row.periodeId))) return gagal("Periode item ini sudah dikunci.");
  await db.delete(s.item).where(eq(s.item.id, id));
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "hapus", entitas: "item", entitasId: id, sebelum: row });
  refresh();
  return berhasil("Item dihapus.");
}

/** Pilihan untuk form + Catat: kegiatan bidang (bulan lalu s.d. 2 bulan ke depan) dan SKUO. */
export async function ambilPilihanCatat(penugasanId: string) {
  const sesi = await wajibSesi();
  const pn = sesi.penugasan.find((p) => p.id === penugasanId);
  if (!pn) return { kegiatan: [], skuo: [] };
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const [kegiatan, skuo] = await Promise.all([
    db
      .select({ id: s.kegiatan.id, nama: s.kegiatan.nama, tanggal: s.kegiatan.tanggal })
      .from(s.kegiatan)
      .where(and(eq(s.kegiatan.unitId, pn.bidangId ?? pn.unitId), gte(s.kegiatan.tanggal, tambahHari(today, -35)), lte(s.kegiatan.tanggal, tambahHari(today, 60))))
      .orderBy(s.kegiatan.tanggal),
    db.select({ id: s.unit.id, nama: s.unit.nama }).from(s.unit).where(inArray(s.unit.jenis, ["skuo", "bidang", "unit_pendukung"])).orderBy(s.unit.nama),
  ]);
  return { kegiatan, skuo };
}

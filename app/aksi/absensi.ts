"use server";

import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { bacaCsv, normalkanKolom, validasiAbsensi, type BarisAbsensi } from "@/lib/absensi";
import { bolehProsesIkpPegawai } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { wajibPeran } from "@/lib/sesi";

async function bacaBerkas(berkas: File) {
  if (/\.xlsx$/i.test(berkas.name)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await berkas.arrayBuffer()) as never);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const judul: string[] = [];
    ws.getRow(1).eachCell((c, i) => (judul[i] = String(c.text ?? "")));
    const rows: Record<string, string>[] = [];
    ws.eachRow((r, n) => {
      if (n === 1) return;
      const o: Record<string, string> = {};
      r.eachCell({ includeEmpty: true }, (c, i) => (o[judul[i] ?? `kolom${i}`] = String(c.text ?? "")));
      if (Object.values(o).some((v) => v.trim())) rows.push(o);
    });
    return normalkanKolom(rows);
  }
  return bacaCsv(await berkas.text());
}

export type HasilPratinjau = { ok: boolean; pesan: string; baris: BarisAbsensi[]; galatUmum: string[] } | null;

/** Langkah 1: unggah → pratinjau dan validasi (belum disimpan). */
export async function pratinjauAbsensi(_: HasilPratinjau, fd: FormData): Promise<HasilPratinjau> {
  await wajibPeran("personalia", "admin");
  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || !berkas.size) return { ok: false, pesan: "Pilih berkas CSV atau Excel.", baris: [], galatUmum: [] };
  if (berkas.size > 2_000_000) return { ok: false, pesan: "Berkas terlalu besar (maks. 2 MB).", baris: [], galatUmum: [] };
  const db = await getDb();
  const pegawai = await db.select({ id: s.pegawai.id, nama: s.pegawai.nama, nip: s.pegawai.nip, noHp: s.pegawai.noHp }).from(s.pegawai).where(eq(s.pegawai.aktif, true));
  try {
    const { baris, galatUmum } = validasiAbsensi(await bacaBerkas(berkas), pegawai);
    const bermasalah = baris.filter((b) => b.galat.length).length;
    return { ok: !galatUmum.length, pesan: galatUmum.length ? galatUmum[0] : `${baris.length} baris dibaca, ${bermasalah} bermasalah.`, baris, galatUmum };
  } catch {
    return { ok: false, pesan: "Berkas tidak bisa dibaca. Pastikan formatnya CSV atau .xlsx.", baris: [], galatUmum: [] };
  }
}

/** Langkah 2: simpan baris yang sah (divalidasi ulang di server). */
export async function simpanAbsensi(periodeId: string, baris: BarisAbsensi[]): Promise<HasilAksi> {
  const sesi = await wajibPeran("personalia", "admin");
  if (!/^\d{4}-\d{2}$/.test(periodeId)) return gagal("Pilih periode.");
  const db = await getDb();
  const [p] = await db.select({ status: s.periode.status }).from(s.periode).where(eq(s.periode.id, periodeId));
  if (p && (p.status === "sementara" || p.status === "disahkan")) return gagal("Periode sudah dikunci.");
  const pegawai = await db.select({ id: s.pegawai.id, nama: s.pegawai.nama, nip: s.pegawai.nip, noHp: s.pegawai.noHp }).from(s.pegawai).where(eq(s.pegawai.aktif, true));
  // Validasi ulang dari angka, bukan dari hasil pratinjau klien.
  const ulang = validasiAbsensi(
    baris.map((b) => ({ nip: b.identitas, no_hp: b.identitas, hari_kerja_wajib: String(b.hariKerjaWajib), hadir: String(b.hadir), hadir_tepat_waktu: String(b.hadirTepatWaktu), izin_sakit: String(b.izinSakit), sanksi_berat: b.sanksiBerat ? "1" : "" })),
    pegawai,
  ).baris.filter((b) => !b.galat.length && b.pegawaiId);

  const dilewati: string[] = [];
  let n = 0;
  for (const b of ulang) {
    const izin = bolehProsesIkpPegawai(sesi, b.pegawaiId!);
    if (!izin.boleh) {
      dilewati.push(b.nama ?? b.identitas);
      continue;
    }
    const nilai = { hariKerjaWajib: b.hariKerjaWajib, hadir: b.hadir, hadirTepatWaktu: b.hadirTepatWaktu, izinSakit: b.izinSakit, sanksiBerat: b.sanksiBerat };
    await db
      .insert(s.absensi)
      .values({ periodeId, pegawaiId: b.pegawaiId!, ...nilai })
      .onConflictDoUpdate({ target: [s.absensi.periodeId, s.absensi.pegawaiId], set: nilai });
    n++;
  }
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "unggah", entitas: "absensi", entitasId: periodeId, sesudah: { jumlah: n, dilewati } });
  refresh();
  return berhasil(dilewati.length ? `${n} baris tersimpan. Baris Anda sendiri dilewati; minta Admin lain mengunggahnya (saling periksa).` : `${n} baris absensi tersimpan.`);
}

const JENIS_ABSEN = ["izin", "sakit", "cuti"] as const;

/**
 * Absensi per hari (rombak v2, 1.11): CSV/Excel berkolom nip (atau no_hp), tanggal (YYYY-MM-DD), jenis
 * (izin/sakit/cuti). Tugas rutin pada tanggal itu keluar dari target SK-TK. Baris milik Admin sendiri dilewati
 * (saling periksa); periode yang sudah dikunci tidak bisa diubah.
 */
export async function simpanAbsensiHari(_: HasilAksi | null, fd: FormData): Promise<HasilAksi> {
  const sesi = await wajibPeran("personalia", "admin");
  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || !berkas.size) return gagal("Pilih berkas CSV atau Excel.");
  if (berkas.size > 2_000_000) return gagal("Berkas terlalu besar (maks. 2 MB).");
  let rows: Record<string, string>[];
  try {
    rows = await bacaBerkas(berkas);
  } catch {
    return gagal("Berkas tidak bisa dibaca. Pastikan formatnya CSV atau .xlsx.");
  }
  const db = await getDb();
  const [pegawai, periode] = await Promise.all([db.select({ id: s.pegawai.id, nip: s.pegawai.nip, noHp: s.pegawai.noHp }).from(s.pegawai).where(eq(s.pegawai.aktif, true)), db.select().from(s.periode)]);
  const nomor = (x = "") => x.trim().replace(/[\s.-]/g, "").replace(/^\+62/, "0");
  const cari = new Map<string, string>();
  for (const p of pegawai) {
    if (p.nip) cari.set(nomor(p.nip), p.id);
    if (p.noHp) cari.set(nomor(p.noHp), p.id);
  }
  const kunci = new Set(periode.filter((p) => p.status === "sementara" || p.status === "disahkan").map((p) => p.id));
  const galat: string[] = [];
  const sah: { pegawaiId: string; tanggal: string; jenis: (typeof JENIS_ABSEN)[number] }[] = [];
  let sendiri = 0;
  rows.forEach((r, i) => {
    const id = cari.get(nomor(r.nip || r.no_hp || r.identitas));
    const tanggal = (r.tanggal ?? "").trim();
    const jenis = (r.jenis ?? "").trim().toLowerCase() as (typeof JENIS_ABSEN)[number];
    if (!id) return void galat.push(`Baris ${i + 2}: pegawai tidak ditemukan`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return void galat.push(`Baris ${i + 2}: tanggal harus YYYY-MM-DD`);
    if (!JENIS_ABSEN.includes(jenis)) return void galat.push(`Baris ${i + 2}: jenis harus izin, sakit, atau cuti`);
    if (kunci.has(tanggal.slice(0, 7))) return void galat.push(`Baris ${i + 2}: periode sudah dikunci`);
    if (!bolehProsesIkpPegawai(sesi, id).boleh) return void sendiri++;
    sah.push({ pegawaiId: id, tanggal, jenis });
  });
  for (const x of sah)
    await db.insert(s.absensiHari).values({ ...x, diunggahOleh: sesi.pegawaiId }).onConflictDoUpdate({ target: [s.absensiHari.pegawaiId, s.absensiHari.tanggal], set: { jenis: x.jenis, diunggahOleh: sesi.pegawaiId } });
  await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: "unggah", entitas: "absensi_hari", sesudah: { jumlah: sah.length, galat: galat.length, sendiri } });
  refresh();
  if (!sah.length) return gagal(galat[0] ?? (sendiri ? "Baris Anda sendiri harus diunggah Admin lain (saling periksa)." : "Tidak ada baris yang sah."));
  const catatan = [galat.length && `${galat.length} baris bermasalah (mis. ${galat[0]})`, sendiri && `${sendiri} baris milik Anda dilewati`].filter(Boolean).join("; ");
  return berhasil(`${sah.length} hari izin/sakit/cuti tersimpan.${catatan ? ` ${catatan}.` : ""}`);
}

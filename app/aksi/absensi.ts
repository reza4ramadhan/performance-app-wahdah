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
  await wajibPeran("personalia");
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
  const sesi = await wajibPeran("personalia");
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
  return berhasil(dilewati.length ? `${n} baris tersimpan. Baris Anda sendiri dilewati; minta petugas lain mengunggahnya.` : `${n} baris absensi tersimpan.`);
}

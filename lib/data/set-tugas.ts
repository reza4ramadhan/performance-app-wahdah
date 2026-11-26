// Generator Set Tugas → tugas_khusus / tugas_khusus_jadwal (docs/rombak-v2/rencana-implementasi.md 2.3).
// Setiap perubahan set atau susunan meregenerasi hanya tanggal SETELAH hari ini: tugas hari ini yang sudah terbit
// tidak berubah. Jadwal yang sudah disentuh staf (dikerjakan/diajukan/disetujui/ditolak) tidak pernah dihapus.

import "server-only";
import { and, eq, gte, inArray, isNotNull, max } from "drizzle-orm";
import { schema as s, type Db } from "../db";
import { jadwalRutin, ujungJadwal, type ItemRutin } from "../set-tugas";
import { hariIni, keUtc, periodeDari, tambahHari, tanggalLokal, type Kantor } from "../waktu";
import { kondisiPenugasanBerlaku, liburPerKantor } from "./ikp";

/**
 * Regenerasi jadwal rutin penugasan-penugasan ini mulai `dari` (bawaan: besok) sampai ujung jadwal.
 * Pemberi tugas (verifikator) = koordinator penugasan. Mengembalikan jumlah jadwal yang dibuat.
 */
export async function regenerasiRutin(db: Db, penugasanIds: string[], dari?: string): Promise<number> {
  if (!penugasanIds.length) return 0;
  const [pn, pasang, libur, periode] = await Promise.all([
    db
      .select({ id: s.penugasan.id, koordinatorId: s.penugasan.koordinatorId, kantor: s.pegawai.kantor })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(inArray(s.penugasan.id, penugasanIds)),
    db.select().from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, penugasanIds)),
    liburPerKantor(db),
    db.select().from(s.periode),
  ]);
  const setIds = [...new Set(pasang.map((p) => p.setTugasId).filter((x): x is string => !!x))];
  const [set, item] = setIds.length
    ? await Promise.all([db.select().from(s.setTugas).where(inArray(s.setTugas.id, setIds)), db.select().from(s.setTugasItem).where(inArray(s.setTugasItem.setTugasId, setIds))])
    : [[], []];
  const itemPerSet = new Map<string, ItemRutin[]>();
  for (const i of item) (itemPerSet.get(i.setTugasId) ?? itemPerSet.set(i.setTugasId, []).get(i.setTugasId)!).push(i);
  const gantiHari = new Map(set.filter((x) => x.aktif).map((x) => [x.id, x.gantiHariJam]));
  for (const x of set) if (!x.aktif) itemPerSet.delete(x.id);
  const itemById = new Map(item.map((i) => [i.id, i]));
  /** Garis versi tugas: versi pertama. Jadwal yang sudah dikerjakan pada tanggal itu tidak diterbitkan lagi untuk versi baru. */
  const asal = (itemId: string | null) => (itemId ? (itemById.get(itemId)?.asalId ?? itemId) : "");
  const terkunci = new Set(periode.filter((p) => p.status === "sementara" || p.status === "disahkan").map((p) => p.id));

  let dibuat = 0;
  for (const p of pn) {
    // Tanpa koordinator tidak ada yang memeriksa; jadwal tidak diterbitkan.
    const pemberi = p.koordinatorId;
    if (!pemberi) continue;
    const kantor = p.kantor as Kantor;
    const today = hariIni(kantor);
    const mulai = dari && dari > today ? dari : tambahHari(today, 1);
    const sampai = ujungJadwal(today);
    const rencana = jadwalRutin({ dari: mulai, sampai, libur: libur(kantor), pasang: pasang.filter((x) => x.penugasanId === p.id), item: itemPerSet, gantiHari }).filter((r) => !terkunci.has(periodeDari(r.tanggal)));

    await db.transaction(async (tx) => {
      // Tugas induk per (penugasan, item set).
      const induk = await tx.select().from(s.tugasKhusus).where(and(eq(s.tugasKhusus.penugasanId, p.id), isNotNull(s.tugasKhusus.setTugasItemId)));
      const indukPerItem = new Map(induk.map((t) => [t.setTugasItemId!, t]));
      const batasMulai = keUtc(mulai, kantor);
      const lama = induk.length ? await tx.select().from(s.tugasKhususJadwal).where(and(inArray(s.tugasKhususJadwal.tugasId, induk.map((t) => t.id)), gte(s.tugasKhususJadwal.tenggat, batasMulai))) : [];
      const hapus = lama.filter((j) => j.status === "belum");
      if (hapus.length) await tx.delete(s.tugasKhususJadwal).where(inArray(s.tugasKhususJadwal.id, hapus.map((j) => j.id)));
      const itemDariTugas = new Map(induk.map((t) => [t.id, t.setTugasItemId]));
      const tetap = new Set(lama.filter((j) => j.status !== "belum").map((j) => `${asal(itemDariTugas.get(j.tugasId) ?? null)}|${tanggalLokal(j.tenggat, kantor)}`));

      const baru: (typeof s.tugasKhususJadwal.$inferInsert)[] = [];
      for (const r of rencana) {
        const it = itemById.get(r.itemId)!;
        let t = indukPerItem.get(r.itemId);
        if (!t) {
          [t] = await tx
            .insert(s.tugasKhusus)
            .values({ penugasanId: p.id, judul: it.judul, uraian: it.uraian, frekuensi: it.frekuensi, tanggalMulai: mulai, tanggalAkhir: sampai, jamTenggat: it.jamTenggat, linkWajib: it.linkWajib, setTugasItemId: it.id, dibuatOleh: pemberi })
            .returning();
          indukPerItem.set(r.itemId, t);
        }
        const tenggat = keUtc(r.tenggat, kantor, r.jam);
        if (tetap.has(`${asal(r.itemId)}|${r.tenggat}`)) continue;
        baru.push({ tugasId: t.id, periodeId: periodeDari(r.tanggal), tenggat });
      }
      if (baru.length) await tx.insert(s.tugasKhususJadwal).values(baru);
      const terpakai = [...new Set(rencana.map((r) => r.itemId))].map((id) => indukPerItem.get(id)!.id);
      if (terpakai.length) await tx.update(s.tugasKhusus).set({ tanggalAkhir: sampai }).where(inArray(s.tugasKhusus.id, terpakai));
      dibuat += baru.length;
    });
  }
  return dibuat;
}

/**
 * Pastikan jadwal rutin sudah terbit sampai ujung jadwal (dipanggil saat halaman Tugas dibuka dan oleh cron).
 * Hanya penugasan yang punya susunan Set Tugas dan jadwalnya belum mencapai ujung yang diregenerasi.
 */
export async function pastikanRutin(db: Db, penugasanIds: string[], kantor: Kantor) {
  if (!penugasanIds.length) return 0;
  const punya = await db.selectDistinct({ id: s.setTugasStaf.penugasanId }).from(s.setTugasStaf).where(inArray(s.setTugasStaf.penugasanId, penugasanIds));
  if (!punya.length) return 0;
  const ujung = ujungJadwal(hariIni(kantor));
  const akhir = await db
    .select({ pn: s.tugasKhusus.penugasanId, t: max(s.tugasKhususJadwal.tenggat) })
    .from(s.tugasKhususJadwal)
    .innerJoin(s.tugasKhusus, eq(s.tugasKhusus.id, s.tugasKhususJadwal.tugasId))
    .where(and(inArray(s.tugasKhusus.penugasanId, punya.map((p) => p.id)), isNotNull(s.tugasKhusus.setTugasItemId)))
    .groupBy(s.tugasKhusus.penugasanId);
  const kurang = punya.map((p) => p.id).filter((id) => {
    const t = akhir.find((a) => a.pn === id)?.t;
    return !t || tanggalLokal(new Date(t), kantor) < tambahHari(ujung, -2);
  });
  return kurang.length ? regenerasiRutin(db, kurang) : 0;
}

/** Penugasan yang memakai set ini pada pekan berjalan atau sesudahnya (untuk regenerasi setelah set diubah). */
export async function pemakaiSet(db: Db, setTugasId: string) {
  const rows = await db.selectDistinct({ id: s.setTugasStaf.penugasanId }).from(s.setTugasStaf).where(eq(s.setTugasStaf.setTugasId, setTugasId));
  return rows.map((r) => r.id);
}

/** Staf tugas rutin (penugasan SK berlaku pada periode ini) di unit-unit ini — untuk Atur Tugas Staf. */
export async function stafRutin(db: Db, unitIds: string[], periode: string) {
  if (!unitIds.length) return [];
  return db
    .select({ penugasanId: s.penugasan.id, pegawaiId: s.pegawai.id, nama: s.pegawai.nama, unitId: s.penugasan.unitId, koordinatorId: s.penugasan.koordinatorId })
    .from(s.penugasan)
    .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
    .where(and(inArray(s.penugasan.unitId, unitIds), eq(s.penugasan.peranKerja, "SK"), eq(s.pegawai.aktif, true), kondisiPenugasanBerlaku(periode)))
    .orderBy(s.pegawai.nama);
}

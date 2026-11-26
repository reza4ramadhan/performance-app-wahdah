"use server";

import { eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { bolehVerifikasiItem } from "@/lib/akses";
import { berhasil, gagal, type HasilAksi } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { getDb, schema as s } from "@/lib/db";
import { paramIndikator } from "@/lib/data/ikp";
import { wajibSesi } from "@/lib/sesi";

/**
 * Setujui atau tolak satu/banyak item (plan.md Bagian 8 butir 9–10).
 * Alasan wajib saat menolak. Konflik kepentingan dicek per item.
 */
export async function verifikasiItem(ids: string[], keputusan: "setuju" | "tolak", alasan?: string): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  if (!ids.length) return gagal("Pilih item terlebih dahulu.");
  if (keputusan === "tolak" && !alasan?.trim()) return gagal("Tulis alasan penolakan.", { alasan: "Alasan wajib diisi." });

  const db = await getDb();
  const [rows, param, periode] = await Promise.all([
    db
      .select({ item: s.item, pemilikId: s.penugasan.pegawaiId, koordinatorId: s.penugasan.koordinatorId })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(inArray(s.item.id, ids)),
    paramIndikator(db),
    db.select().from(s.periode),
  ]);

  const ditolak: string[] = [];
  let n = 0;
  for (const r of rows) {
    const verifikator = param.get(r.item.indikatorKode)?.verifikator ?? "koordinator";
    const boleh = bolehVerifikasiItem(sesi, { pemilikId: r.pemilikId, koordinatorId: r.koordinatorId, verifikator });
    if (!boleh.boleh) {
      ditolak.push(boleh.alasan);
      continue;
    }
    if (r.item.status !== "diajukan") continue;
    const st = periode.find((p) => p.id === r.item.periodeId)?.status;
    if (st === "sementara" || st === "disahkan") {
      ditolak.push("Periode sudah dikunci.");
      continue;
    }
    const sesudah = {
      status: keputusan === "setuju" ? ("disetujui" as const) : ("ditolak" as const),
      verifikatorId: sesi.pegawaiId,
      diverifikasiPada: new Date(),
      alasanTolak: keputusan === "tolak" ? alasan!.trim() : null,
    };
    await db.update(s.item).set(sesudah).where(eq(s.item.id, r.item.id));
    await catatAudit(db, { aktorId: sesi.pegawaiId, aksi: keputusan === "setuju" ? "setujui" : "tolak", entitas: "item", entitasId: r.item.id, sebelum: { status: r.item.status }, sesudah, alasan: sesudah.alasanTolak });
    n++;
  }
  refresh();
  if (!n) return gagal(ditolak[0] ?? "Tidak ada item yang bisa diproses.");
  const kata = keputusan === "setuju" ? "disetujui" : "ditolak";
  return berhasil(ditolak.length ? `${n} item ${kata}; ${ditolak.length} dilewati.` : `${n} item ${kata}.`);
}

/**
 * Setujui semua yang tepat waktu (rombak v2): semua item dan delegasi di antrean saya yang selesai sebelum
 * tenggatnya. Yang terlambat tidak ikut dan diperiksa satu per satu. Tiap item tetap dicek hak aksesnya.
 */
export async function setujuiSemuaTepatWaktu(): Promise<HasilAksi> {
  const sesi = await wajibSesi();
  const [{ kondisiAntrean }, { daftarItem }, { daftarTugas, kondisiTugasMenunggu }, { tepatWaktuItem }, { verifikasiTugas }] = await Promise.all([
    import("@/lib/data/antrean"),
    import("@/lib/data/item"),
    import("@/lib/data/tugas"),
    import("@/lib/data/kontrol-staf"),
    import("./tugas"),
  ]);
  const [item, tugas] = await Promise.all([daftarItem(await kondisiAntrean(sesi), { kantor: sesi.kantor, batas: 500 }), daftarTugas(kondisiTugasMenunggu(sesi.pegawaiId), 500)]);
  // Item tanpa tenggat tanggal (mis. laporan) dianggap tepat waktu; milik sendiri tidak ikut persetujuan massal.
  const itemTepat = item.filter((i) => i.pemilikId !== sesi.pegawaiId && tepatWaktuItem(i, sesi) !== false).map((i) => i.id);
  const tugasTepat = tugas.filter((t) => t.selesaiPada && t.selesaiPada <= t.tenggat).map((t) => t.id);
  if (!itemTepat.length && !tugasTepat.length) return gagal("Tidak ada pekerjaan tepat waktu yang menunggu.");
  const hasil = await Promise.all([itemTepat.length ? verifikasiItem(itemTepat, "setuju") : null, tugasTepat.length ? verifikasiTugas(tugasTepat, "setuju") : null]);
  const sisa = item.length + tugas.length - itemTepat.length - tugasTepat.length;
  const gagalSemua = hasil.every((h) => !h || !h.ok);
  if (gagalSemua) return gagal(hasil.find((h) => h && !h.ok)?.pesan ?? "Tidak ada yang bisa disetujui.");
  return berhasil(`${itemTepat.length + tugasTepat.length} pekerjaan disetujui.${sisa ? ` ${sisa} lainnya (terlambat) diperiksa satu per satu.` : ""}`);
}

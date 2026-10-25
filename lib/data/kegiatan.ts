// Item otomatis dari kegiatan SKUO: pengingat ke-1 & ke-2, serta SPP & SPB bila kegiatan butuh SPP/SPB.
// Masuk ke penugasan penanggung jawab sebagai item terbuka; staf tinggal menandai selesai.

import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { schema as s, type Db } from "../db";
import { pemikulKegiatan } from "../ikp/k1";
import { indikatorDari } from "../ikp/katalog";
import { PARAMETER } from "../ikp/tipe";
import { periodeDari } from "../waktu";
import { kondisiPenugasanBerlaku, paramIndikator } from "./ikp";
import { unitDalamBidang } from "./unit";

type Kegiatan = typeof s.kegiatan.$inferSelect;

/** Isian item otomatis untuk satu kegiatan (tanpa penugasan). */
export function rancanganItemOtomatis(k: Pick<Kegiatan, "perluSpp" | "perluSpb">) {
  return [
    ...PARAMETER.pengingatHMinus.map((_, n) => ({ indikatorKode: "SBK-3", data: { ke: String(n + 1) } })),
    ...(k.perluSpp ? [{ indikatorKode: "SBK-2a", data: {} }] : []),
    ...(k.perluSpb ? [{ indikatorKode: "SBK-2b", data: {} }] : []),
  ];
}

const samaRancangan = (i: { indikatorKode: string; data: Record<string, string> }, r: { indikatorKode: string; data: Record<string, string> }) =>
  i.indikatorKode === r.indikatorKode && (i.data.ke ?? "") === (r.data.ke ?? "");

/**
 * Lengkapi item otomatis kegiatan: buat yang belum ada di penugasan pemikulnya. Aman dipanggil berulang,
 * jadi dipakai juga untuk kegiatan lama yang dibuat sebelum item otomatis ada. Pengingat lama yang dicatat
 * manual tanpa nomor diberi nomor yang masih kosong (urut tanggal kirim). Mengembalikan jumlah item yang dibuat.
 */
export async function buatItemOtomatis(db: Db, kegiatan: Kegiatan[], aktorId: string) {
  const param = await paramIndikator(db);
  const ada = kegiatan.length ? await db.select().from(s.item).where(inArray(s.item.kegiatanId, kegiatan.map((k) => k.id))) : [];
  const nilai: (typeof s.item.$inferInsert)[] = [];
  for (const k of kegiatan) {
    if (!k.penanggungJawabId) continue;
    const unitIds = await unitDalamBidang(db, k.unitId);
    const calon = await db
      .select({ id: s.penugasan.id, unitId: s.penugasan.unitId })
      .from(s.penugasan)
      .where(
        and(
          eq(s.penugasan.pegawaiId, k.penanggungJawabId),
          eq(s.penugasan.peranKerja, "SBK"),
          inArray(s.penugasan.unitId, unitIds.length ? unitIds : ["-"]),
          kondisiPenugasanBerlaku(periodeDari(k.tanggal)),
        ),
      );
    const pn = pemikulKegiatan(calon, k);
    if (!pn) continue;
    const milik = ada.filter((i) => i.kegiatanId === k.id && i.penugasanId === pn.id);
    const keKosong = PARAMETER.pengingatHMinus.map((_, n) => String(n + 1)).filter((ke) => !milik.some((i) => i.indikatorKode === "SBK-3" && i.data.ke === ke));
    const tanpaKe = milik.filter((i) => i.indikatorKode === "SBK-3" && !i.data.ke).sort((a, b) => +(a.tglSelesai ?? a.dibuatPada) - +(b.tglSelesai ?? b.dibuatPada));
    for (const i of tanpaKe) {
      const ke = keKosong.shift();
      if (!ke) break;
      i.data = { ...i.data, ke };
      await db.update(s.item).set({ data: i.data }).where(eq(s.item.id, i.id));
    }
    for (const r of rancanganItemOtomatis(k)) {
      if (!param.get(r.indikatorKode)?.aktif || milik.some((i) => samaRancangan(i, r))) continue;
      nilai.push({ ...r, penugasanId: pn.id, kegiatanId: k.id, periodeId: periodeDari(k.tanggal), tglMasuk: new Date(), status: "terbuka", dibuatOleh: aktorId });
    }
  }
  if (nilai.length) await db.insert(s.item).values(nilai);
  return nilai.length;
}

/** Item kegiatan yang belum disentuh staf (otomatis, masih terbuka, belum ada tanggal selesai/bukti) boleh ikut terhapus. */
export const itemBelumDisentuh = (i: typeof s.item.$inferSelect) =>
  !!indikatorDari(i.indikatorKode)?.otomatis && i.status === "terbuka" && !i.tglSelesai && !i.linkBukti;

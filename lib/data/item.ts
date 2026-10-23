// Query item untuk layar pegawai, koordinator, dan verifikator.

import "server-only";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { indikatorDari } from "../ikp/katalog";
import { labelSisa, tenggatItem } from "../ikp/tenggat";
import type { StatusItem } from "../ikp/tipe";
import { hariIni, type Kantor } from "../waktu";
import { liburPerKantor, paramIndikator } from "./ikp";

export type BarisItem = {
  id: string;
  judul: string;
  indikatorKode: string;
  indikatorPendek: string;
  status: StatusItem;
  pemilikId: string;
  pemilikNama: string;
  penugasanId: string;
  unitNama: string;
  kegiatanId: string | null;
  kegiatanNama: string | null;
  tglMasuk: Date;
  tglSelesai: Date | null;
  linkBukti: string | null;
  alasanTolak: string | null;
  diajukanPada: Date | null;
  data: Record<string, string>;
  sisa: { teks: string; nada: "netral" | "gold" | "flame" } | null;
  lewat: boolean;
};

/** Judul ringkas item: perihal/judul/uraian, atau nama kegiatan. */
export function judulItem(kode: string, data: Record<string, string>, kegiatan: string | null) {
  const pokok = data.perihal || data.judul || data.uraian;
  const def = indikatorDari(kode);
  if (pokok) return pokok;
  if (kegiatan) return `${def?.pendek ?? kode}${data.ke ? ` ${data.ke}` : ""} · ${kegiatan}`;
  return def?.nama ?? kode;
}

export async function daftarItem(where: SQL | undefined, opsi: { kantor: Kantor; batas?: number } = { kantor: "makassar" }): Promise<BarisItem[]> {
  const db = await getDb();
  const [rows, libur, param] = await Promise.all([
    db
      .select({
        item: s.item,
        pemilikId: s.pegawai.id,
        pemilikNama: s.pegawai.nama,
        kantor: s.pegawai.kantor,
        unitNama: s.unit.nama,
        kegiatanNama: s.kegiatan.nama,
        kegiatanTanggal: s.kegiatan.tanggal,
      })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .innerJoin(s.unit, eq(s.unit.id, s.penugasan.unitId))
      .leftJoin(s.kegiatan, eq(s.kegiatan.id, s.item.kegiatanId))
      .where(where)
      .orderBy(desc(s.item.dibuatPada))
      .limit(opsi.batas ?? 300),
    liburPerKantor(db),
    paramIndikator(db),
  ]);
  return rows.map((r) => {
    const kantor = r.kantor as Kantor;
    const today = hariIni(kantor);
    const t = r.item.status === "terbuka" || r.item.status === "ditolak" ? tenggatItem(r.item, r.kegiatanTanggal, param.get(r.item.indikatorKode)?.tenggat ?? null, libur(kantor), kantor) : null;
    const sisa = t ? labelSisa(t.tanggal, today, libur(kantor)) : null;
    return {
      id: r.item.id,
      judul: judulItem(r.item.indikatorKode, r.item.data, r.kegiatanNama),
      indikatorKode: r.item.indikatorKode,
      indikatorPendek: indikatorDari(r.item.indikatorKode)?.pendek ?? r.item.indikatorKode,
      status: r.item.status,
      pemilikId: r.pemilikId,
      pemilikNama: r.pemilikNama,
      penugasanId: r.item.penugasanId,
      unitNama: r.unitNama,
      kegiatanId: r.item.kegiatanId,
      kegiatanNama: r.kegiatanNama,
      tglMasuk: r.item.tglMasuk,
      tglSelesai: r.item.tglSelesai,
      linkBukti: r.item.linkBukti,
      alasanTolak: r.item.alasanTolak,
      diajukanPada: r.item.diajukanPada,
      data: r.item.data,
      sisa,
      lewat: sisa?.nada === "flame",
    };
  });
}

/** Item milik penugasan tertentu. */
export const kondisiItemPenugasan = (penugasanIds: string[], status?: StatusItem[]) =>
  and(inArray(s.item.penugasanId, penugasanIds.length ? penugasanIds : ["-"]), status ? inArray(s.item.status, status) : undefined);

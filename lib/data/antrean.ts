// Antrean verifikasi untuk satu aktor (koordinator, Keuangan, Sekretariat).

import "server-only";
import { and, eq, inArray, ne, or, type SQL } from "drizzle-orm";
import type { ItemAntrean } from "@/components/app/verifikasi-massal";
import { getDb, schema as s } from "../db";
import type { Sesi } from "../sesi";
import { hariIni, hariKerjaAntara, labelTanggal, tanggalLokal } from "../waktu";
import { paramIndikator } from "./ikp";
import type { BarisItem } from "./item";

/**
 * Kondisi SQL: item berstatus diajukan yang verifikatornya aktor ini. Item milik sendiri hanya masuk lewat
 * jalur koordinator (rangkap jabatan: ia koordinator penugasannya sendiri), tidak lewat Keuangan/Sekretariat.
 */
export async function kondisiAntrean(sesi: Sesi): Promise<SQL | undefined> {
  const db = await getDb();
  const param = [...(await paramIndikator(db)).values()];
  const kode = (v: string) => param.filter((p) => p.verifikator === v).map((p) => p.kode);
  const jalur: SQL[] = [];
  const ko = kode("koordinator");
  // Jalur koordinator mengikuti amanah aktif: hanya penugasan yang dibawahi amanah itu.
  const tim = sesi.tim.map((b) => b.id);
  if (ko.length && tim.length) jalur.push(and(eq(s.penugasan.koordinatorId, sesi.pegawaiId), inArray(s.penugasan.id, tim), inArray(s.item.indikatorKode, ko))!);
  const bukanMilikSaya = ne(s.penugasan.pegawaiId, sesi.pegawaiId);
  if (sesi.peran.has("keuangan") && kode("keuangan").length) jalur.push(and(bukanMilikSaya, inArray(s.item.indikatorKode, kode("keuangan")))!);
  if (sesi.peran.has("sekretariat") && kode("sekretariat").length) jalur.push(and(bukanMilikSaya, inArray(s.item.indikatorKode, kode("sekretariat")))!);
  if (!jalur.length) return eq(s.item.id, "-");
  return and(eq(s.item.status, "diajukan"), or(...jalur));
}

/** Baris antrean untuk VerifikasiMassal, yang paling lama diajukan lebih dulu. */
export function barisAntrean(items: BarisItem[], sesi: Pick<Sesi, "pegawaiId" | "kantor">, libur: ReadonlySet<string>): ItemAntrean[] {
  const today = hariIni(sesi.kantor);
  return [...items]
    .sort((a, b) => (a.diajukanPada?.getTime() ?? 0) - (b.diajukanPada?.getTime() ?? 0))
    .map((i) => ({
      id: i.id,
      judul: i.judul,
      pemilik: i.pemilikNama,
      kode: i.indikatorKode,
      pendek: i.indikatorPendek,
      diajukan: i.diajukanPada ? labelTanggal(tanggalLokal(i.diajukanPada, sesi.kantor)) : "—",
      selesai: i.tglSelesai ? labelTanggal(tanggalLokal(i.tglSelesai, sesi.kantor)) : "—",
      linkBukti: i.linkBukti,
      milikSendiri: i.pemilikId === sesi.pegawaiId,
      lambat: !!i.diajukanPada && hariKerjaAntara(tanggalLokal(i.diajukanPada, sesi.kantor), today, libur) > 1,
    }));
}

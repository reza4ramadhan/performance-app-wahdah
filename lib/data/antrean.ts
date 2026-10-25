// Antrean verifikasi untuk satu aktor (koordinator, Keuangan, Sekretariat).

import "server-only";
import { and, eq, inArray, ne, or, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import type { Sesi } from "../sesi";
import { paramIndikator } from "./ikp";

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

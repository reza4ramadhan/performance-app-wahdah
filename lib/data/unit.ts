// Hierarki unit: Bidang → Departemen/Lembaga (SKUO). SBK ditugaskan di level SKUO,
// tetapi kegiatan bulanan dan koordinasi KSBK berlaku per bidang.

import "server-only";
import { schema as s, type Db } from "../db";
import { bidangDari, wakaDari } from "../unit";

export { bidangDari, wakaDari };

export async function petaBidang(db: Db) {
  return bidangDari(await db.select({ id: s.unit.id, jenis: s.unit.jenis, indukId: s.unit.indukId }).from(s.unit));
}

export async function petaWaka(db: Db) {
  return wakaDari(await db.select({ id: s.unit.id, jenis: s.unit.jenis, indukId: s.unit.indukId, wakaId: s.unit.wakaId }).from(s.unit));
}

/** Id bidang itu sendiri beserta semua SKUO/unit di bawahnya. */
export async function unitDalamBidang(db: Db, bidangId: string) {
  return [...(await petaBidang(db))].filter(([, b]) => b === bidangId).map(([u]) => u);
}

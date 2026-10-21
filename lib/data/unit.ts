// Hierarki unit: Bidang → Departemen/Lembaga (SKUO). SBK ditugaskan di level SKUO,
// tetapi kegiatan bulanan dan koordinasi KSBK berlaku per bidang.

import "server-only";
import { schema as s, type Db } from "../db";

type UnitInduk = { id: string; jenis: string; indukId: string | null };

/** unitId → id bidang (unit itu sendiri bila bidang, selain itu leluhur bidang terdekat). */
export function bidangDari(unit: UnitInduk[]): Map<string, string> {
  const per = new Map(unit.map((u) => [u.id, u]));
  const peta = new Map<string, string>();
  for (const u of unit) {
    const dilihat = new Set<string>();
    for (let x: UnitInduk | undefined = u; x && !dilihat.has(x.id); x = x.indukId ? per.get(x.indukId) : undefined) {
      dilihat.add(x.id);
      if (x.jenis === "bidang") {
        peta.set(u.id, x.id);
        break;
      }
    }
  }
  return peta;
}

export async function petaBidang(db: Db) {
  return bidangDari(await db.select({ id: s.unit.id, jenis: s.unit.jenis, indukId: s.unit.indukId }).from(s.unit));
}

/** Id bidang itu sendiri beserta semua SKUO/unit di bawahnya. */
export async function unitDalamBidang(db: Db, bidangId: string) {
  return [...(await petaBidang(db))].filter(([, b]) => b === bidangId).map(([u]) => u);
}

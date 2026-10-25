// Pohon unit (fungsi murni): Kantor → Bidang → SKUO, beserta WaKa yang membawahinya.

export type UnitInduk = { id: string; jenis: string; indukId: string | null };

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

/** unitId → himpunan unit itu sendiri beserta semua leluhurnya. */
export function leluhurDari(unit: UnitInduk[]): Map<string, Set<string>> {
  const per = new Map(unit.map((u) => [u.id, u]));
  const peta = new Map<string, Set<string>>();
  for (const u of unit) {
    const atas = new Set<string>();
    for (let x: UnitInduk | undefined = u; x && !atas.has(x.id); x = x.indukId ? per.get(x.indukId) : undefined) atas.add(x.id);
    peta.set(u.id, atas);
  }
  return peta;
}

/** unitId → WaKa yang membawahinya: waka_id unit itu, atau leluhur terdekat yang punya. */
export function wakaDari(unit: (UnitInduk & { wakaId: string | null })[]): Map<string, string | null> {
  const per = new Map(unit.map((u) => [u.id, u]));
  const peta = new Map<string, string | null>();
  for (const u of unit) {
    const dilihat = new Set<string>();
    let waka: string | null = null;
    for (let x: (typeof unit)[number] | undefined = u; x && !dilihat.has(x.id); x = x.indukId ? per.get(x.indukId) : undefined) {
      dilihat.add(x.id);
      if (x.wakaId) {
        waka = x.wakaId;
        break;
      }
    }
    peta.set(u.id, waka);
  }
  return peta;
}


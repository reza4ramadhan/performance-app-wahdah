// Agregat dashboard kantor (plan.md Bagian 8 butir 15).

import "server-only";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { idPenugasan } from "../ikp/hitung";
import { rataRata } from "../ikp/k1";
import { PARAMETER } from "../ikp/tipe";
import { hariIni, hariKerjaPeriode, periodeDari, rentangPeriode, tanggalLokal, type Kantor } from "../waktu";
import { hasilPeriode, kondisiPenugasanBerlaku, liburPerKantor, paramIndikator } from "./ikp";

export async function ringkasanKantor(kantorPengguna: Kantor) {
  const db = await getDb();
  const today = hariIni(kantorPengguna);
  const periode = periodeDari(today);
  const { awal } = rentangPeriode(periode);
  const libur = await liburPerKantor(db);

  const [unit, pn, { hasil }, param] = await Promise.all([
    db.select().from(s.unit).where(inArray(s.unit.jenis, ["bidang", "unit_pendukung", "staf_khusus"])).orderBy(s.unit.nama),
    db
      .select({ id: s.penugasan.id, pegawaiId: s.penugasan.pegawaiId, unitId: s.penugasan.unitId, peran: s.penugasan.peranKerja, koordinatorId: s.penugasan.koordinatorId, kantor: s.pegawai.kantor })
      .from(s.penugasan)
      .innerJoin(s.pegawai, eq(s.pegawai.id, s.penugasan.pegawaiId))
      .where(and(eq(s.pegawai.aktif, true), kondisiPenugasanBerlaku(periode))),
    hasilPeriode(periode),
    paramIndikator(db),
  ]);
  const dinilai = pn.filter((p) => p.peran !== "KAKAN" && p.peran !== "WAKA");
  const pegawaiIds = [...new Set(dinilai.map((p) => p.pegawaiId))];
  const kantorOf = new Map(dinilai.map((p) => [p.pegawaiId, p.kantor as Kantor]));

  // Hari terisi per pegawai: item dibuat (tanggal lokal) atau jurnal.
  const [itemHari, jurnalHari, antrean] = await Promise.all([
    pegawaiIds.length
      ? db
          .select({ pegawaiId: s.penugasan.pegawaiId, t: s.item.dibuatPada })
          .from(s.item)
          .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
          .where(and(inArray(s.penugasan.pegawaiId, pegawaiIds), gte(s.item.dibuatPada, new Date(`${awal}T00:00:00+08:00`))))
      : [],
    pegawaiIds.length ? db.select({ pegawaiId: s.jurnal.pegawaiId, d: s.jurnal.tanggal }).from(s.jurnal).where(and(inArray(s.jurnal.pegawaiId, pegawaiIds), gte(s.jurnal.tanggal, awal), lte(s.jurnal.tanggal, today))) : [],
    db
      .select({ koordinatorId: s.penugasan.koordinatorId, kode: s.item.indikatorKode, n: sql<number>`count(*)::int`, tertua: sql<Date>`min(${s.item.diajukanPada})` })
      .from(s.item)
      .innerJoin(s.penugasan, eq(s.penugasan.id, s.item.penugasanId))
      .where(eq(s.item.status, "diajukan"))
      .groupBy(s.penugasan.koordinatorId, s.item.indikatorKode),
  ]);
  const terisi = new Map<string, Set<string>>();
  const tandai = (id: string, d: string) => (terisi.get(id) ?? terisi.set(id, new Set()).get(id)!).add(d);
  for (const r of itemHari) tandai(r.pegawaiId, tanggalLokal(r.t, kantorOf.get(r.pegawaiId) ?? "makassar"));
  for (const r of jurnalHari) tandai(r.pegawaiId, r.d);

  const k1PerPn = new Map(hasil.flatMap((h) => h.penugasan.flatMap((p) => idPenugasan(p).map((id) => [id, p.k1] as const))));

  const perUnit = unit
    .map((u) => {
      const anggota = [...new Set(dinilai.filter((p) => p.unitId === u.id).map((p) => p.pegawaiId))];
      if (!anggota.length) return null;
      const hariIniTerisi = anggota.filter((id) => terisi.get(id)?.has(hariIni(kantorOf.get(id)!))).length;
      let slot = 0;
      let isi = 0;
      for (const id of anggota) {
        const hk = hariKerjaPeriode(periode, libur(kantorOf.get(id)!), hariIni(kantorOf.get(id)!));
        slot += hk.length;
        isi += hk.filter((d) => terisi.get(id)?.has(d)).length;
      }
      const k1 = rataRata(dinilai.filter((p) => p.unitId === u.id).map((p) => k1PerPn.get(p.id)).filter((x): x is number => x !== null && x !== undefined));
      return { id: u.id, nama: u.nama, anggota: anggota.length, hariIni: hariIniTerisi, bulan: slot ? isi / slot : null, k1 };
    })
    .filter((x) => x !== null);

  // Antrean verifikasi per koordinator (hanya indikator yang diverifikasi koordinator).
  const verifKoordinator = new Set([...param.values()].filter((p) => p.verifikator === "koordinator").map((p) => p.kode));
  const perKoordinator = new Map<string, { n: number; tertua: Date | null }>();
  for (const a of antrean) {
    if (!a.koordinatorId || !verifKoordinator.has(a.kode)) continue;
    const x = perKoordinator.get(a.koordinatorId) ?? { n: 0, tertua: null };
    x.n += a.n;
    const t = a.tertua ? new Date(a.tertua) : null;
    if (t && (!x.tertua || t < x.tertua)) x.tertua = t;
    perKoordinator.set(a.koordinatorId, x);
  }
  const namaKoordinator = perKoordinator.size
    ? await db.select({ id: s.pegawai.id, nama: s.pegawai.nama }).from(s.pegawai).where(inArray(s.pegawai.id, [...perKoordinator.keys()]))
    : [];
  const antreanKeuangan = antrean.filter((a) => param.get(a.kode)?.verifikator === "keuangan").reduce((x, a) => x + a.n, 0);
  const antreanSekretariat = antrean.filter((a) => param.get(a.kode)?.verifikator === "sekretariat").reduce((x, a) => x + a.n, 0);

  // Perbandingan beban rangkap: rata-rata K1 untuk pegawai dengan 1/2/3+ penugasan ber-K1.
  const rangkap = [1, 2, 3].map((n) => {
    const grup = hasil.filter((h) => h.kategori === "umum" && h.k1 !== null && (n === 3 ? h.penugasan.length >= 3 : h.penugasan.length === n));
    return { n, jumlah: grup.length, k1: rataRata(grup.map((h) => h.k1!)) };
  });

  const umum = hasil.filter((h) => h.kategori !== "pimpinan");
  const penerimaK4 = umum.filter((h) => h.k4 > 0).length;

  return {
    periode,
    today,
    perUnit,
    koordinator: [...perKoordinator].map(([id, v]) => ({ id, nama: namaKoordinator.find((x) => x.id === id)?.nama ?? "—", ...v })).sort((a, b) => b.n - a.n),
    antreanKeuangan,
    antreanSekretariat,
    rangkap,
    totalPegawai: pegawaiIds.length,
    isiHariIni: pegawaiIds.filter((id) => terisi.get(id)?.has(hariIni(kantorOf.get(id)!))).length,
    k1Kantor: rataRata(umum.map((h) => h.k1).filter((x): x is number => x !== null)),
    k4: { penerima: penerimaK4, total: umum.length, peringatan: umum.length > 0 && penerimaK4 / umum.length > PARAMETER.peringatanK4 },
  };
}

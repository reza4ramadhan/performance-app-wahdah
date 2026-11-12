// Data kontrol staf untuk KSBK: K1 tiap SBK binaan, pekerjaan yang menunggu persetujuan, dan yang lewat tenggat.
// Dipakai Beranda KSBK, halaman detail staf, dan mode periksa.

import "server-only";
import { and, lte } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { idPenugasan } from "../ikp/hitung";
import { rataRata, type HasilIndikator } from "../ikp/k1";
import type { Sesi } from "../sesi";
import { hariIni, keUtc, periodeDari, tambahHari, tanggalLokal } from "../waktu";
import { kondisiAntrean } from "./antrean";
import { hasilPeriode, liburPerKantor, paramIndikator } from "./ikp";
import { daftarItem, kondisiItemPenugasan, type BarisItem } from "./item";
import { anggotaTim } from "./tim";
import { daftarTugas, jumlahUsulanMenunggu, kondisiTugasMenunggu, kondisiTugasPenugasan, type BarisTugas } from "./tugas";

export type StafKontrol = {
  pegawaiId: string;
  nama: string;
  isiHariIni: boolean;
  unit: string[];
  k1: number | null;
  indikator: HasilIndikator[];
  itemMenunggu: BarisItem[];
  tugasMenunggu: BarisTugas[];
  /** Item + tugas yang menunggu persetujuan saya. */
  menunggu: number;
  itemLewat: BarisItem[];
  tugasLewat: BarisTugas[];
  /** Item + tugas yang lewat tenggat dan belum selesai. */
  lewat: number;
};

/** Pita K1 terhadap acuan (85): dipakai warna batang dan angka. */
export type Pita = "baik" | "sedang" | "rendah" | "kosong";
export const pitaK1 = (k1: number | null, acuan: number): Pita => (k1 === null ? "kosong" : k1 >= acuan ? "baik" : k1 >= 70 ? "sedang" : "rendah");

export async function kontrolStaf(sesi: Sesi) {
  const db = await getDb();
  const today = hariIni(sesi.kantor);
  const periode = periodeDari(today);
  const pnSaya = sesi.amanahPn.map((p) => p.id);

  const [tim, { hasil }, param, libur, antrean, tugasMenunggu, usulanMenunggu] = await Promise.all([
    anggotaTim(sesi),
    hasilPeriode(periode),
    paramIndikator(db),
    liburPerKantor(db),
    kondisiAntrean(sesi).then((k) => daftarItem(k, { kantor: sesi.kantor, batas: 300 })),
    daftarTugas(kondisiTugasMenunggu(sesi.pegawaiId)),
    jumlahUsulanMenunggu(sesi.pegawaiId),
  ]);

  // SBK binaan amanah ini; staf yang rangkap SKUO di bidang yang sama tampil sekali (K1-nya gabungan).
  const sbk = tim.map((t) => ({ ...t, sbk: t.penugasan.filter((p) => p.peranKerja === "SBK") })).filter((t) => t.sbk.length);
  const pnStaf = sbk.flatMap((t) => t.sbk.map((p) => p.id));
  const [itemStaf, tugasStaf] = await Promise.all([
    pnStaf.length ? daftarItem(kondisiItemPenugasan(pnStaf, ["terbuka", "ditolak"]), { kantor: sesi.kantor, batas: 400 }) : Promise.resolve([]),
    pnStaf.length
      ? daftarTugas(and(kondisiTugasPenugasan(pnStaf, ["belum", "dikerjakan", "ditolak"]), lte(s.tugasKhususJadwal.tenggat, keUtc(tambahHari(today, 1), sesi.kantor))), 100)
      : Promise.resolve([]),
  ]);

  const acuan = (param.get("KSBK-2")?.standar ?? 0.85) * 100;
  const staf: StafKontrol[] = sbk
    .map((t) => {
      const ids = new Set(t.sbk.map((p) => p.id));
      const h = hasil.find((x) => x.pegawaiId === t.pegawaiId)?.penugasan.find((p) => idPenugasan(p).some((id) => ids.has(id)));
      const itemMenunggu = antrean.filter((i) => i.pemilikId === t.pegawaiId);
      const tugas = tugasMenunggu.filter((x) => x.stafId === t.pegawaiId);
      const itemLewat = itemStaf.filter((i) => i.pemilikId === t.pegawaiId && i.lewat);
      const tugasLewat = tugasStaf.filter((x) => x.stafId === t.pegawaiId && x.lewat);
      return {
        pegawaiId: t.pegawaiId,
        nama: t.nama,
        isiHariIni: t.isiHariIni,
        unit: t.sbk.map((p) => p.unitNama),
        k1: h?.k1 ?? null,
        indikator: h?.indikator ?? [],
        itemMenunggu,
        tugasMenunggu: tugas,
        menunggu: itemMenunggu.length + tugas.length,
        itemLewat,
        tugasLewat,
        lewat: itemLewat.length + tugasLewat.length,
      };
    })
    // Yang menunggu persetujuan dulu, lalu yang lewat tenggat, lalu K1 terendah; yang belum punya K1 di akhir.
    .sort((a, b) => Number(b.menunggu > 0) - Number(a.menunggu > 0) || Number(b.lewat > 0) - Number(a.lewat > 0) || (a.k1 ?? Infinity) - (b.k1 ?? Infinity) || a.nama.localeCompare(b.nama));

  const k1Saya = hasil.find((x) => x.pegawaiId === sesi.pegawaiId)?.penugasan.find((p) => idPenugasan(p).some((id) => pnSaya.includes(id)));
  return {
    periode,
    hariIni: today,
    param,
    libur: libur(sesi.kantor),
    acuan,
    staf,
    /** K1 resmi KSBK; sebelum hasil tersedia, rata-rata K1 staf. */
    k1: k1Saya?.k1 ?? rataRata(staf.map((t) => t.k1).filter((k): k is number => k !== null)),
    /** Semua item antrean verifikasi saya (termasuk yang bukan milik SBK binaan). */
    antrean,
    tugasMenunggu,
    usulanMenunggu,
  };
}

/** Selesai tepat waktu? null bila tidak ada tenggat atau tanggal selesai. */
export function tepatWaktuItem(i: BarisItem, sesi: Pick<Sesi, "kantor">) {
  if (!i.tenggat || !i.tglSelesai) return null;
  return tanggalLokal(i.tglSelesai, sesi.kantor) <= i.tenggat;
}
